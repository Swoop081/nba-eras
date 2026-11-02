/* NBA Eras season logic: schedule, standings, playoffs. Pure data in, data out.
   A season state is plain JSON so it can be saved in localStorage. */
(function (root) {
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roundRobin(ids) {
    var t = ids.slice();
    if (t.length % 2) t.push(null);
    var n = t.length, rounds = [];
    for (var r = 0; r < n - 1; r++) {
      var games = [];
      for (var i = 0; i < n / 2; i++) {
        var a = t[i], b = t[n - 1 - i];
        if (a && b) games.push(r % 2 ? [a, b] : [b, a]);
      }
      rounds.push(games);
      t.splice(1, 0, t.pop());
    }
    return rounds;
  }

  function shuffle(list, r) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var x = list[i]; list[i] = list[j]; list[j] = x;
    }
    return list;
  }

  /* Real calendar: group the dated games into days; two generated rounds fill the games the Cup decides. */
  function fromSchedule(ids, sched, r) {
    var by = {}, order = [];
    sched.games.forEach(function (g) { if (!by[g.d]) { by[g.d] = []; order.push(g.d); } by[g.d].push(g); });
    order.sort();
    var days = [], dates = [], meta = [], cupAt = -1;
    order.forEach(function (d) {
      if (cupAt < 0 && d >= '2026-12-04') cupAt = days.length;
      days.push(by[d].map(function (g) { return [g.h, g.a]; }));
      dates.push(d);
      meta.push(by[d].map(function (g) { return g.lab ? [g.lab, g.sub || '', g.arena || '', g.city || ''] : (g.city ? ['', '', g.arena || '', g.city] : 0); }));
    });
    if (cupAt > 0) {
      var fill = shuffle(roundRobin(ids), r).slice(0, 1).concat(shuffle(roundRobin(ids), r).slice(0, 1));
      [0, 1].forEach(function (k) {
        days.splice(cupAt + k, 0, fill[k]); meta.splice(cupAt + k, 0, fill[k].map(function () { return 0; }));
        dates.splice(cupAt + k, 0, k ? '2026-12-08' : '2026-12-05');
      });
    }
    return { days: days, dates: dates, meta: meta };
  }

  function create(eraId, year, teams, myId, gamesPerTeam, sched) {
    var ids = teams.map(function (t) { return t.id; });
    var r = rng(Math.floor(Math.random() * 1e9));
    var copies = Math.max(1, Math.ceil(gamesPerTeam / (ids.length - 1)));
    var days = [];
    for (var c = 0; c < copies; c++) {
      var base = roundRobin(ids).map(function (g) {
        return c % 2 ? g.map(function (m) { return [m[1], m[0]]; }) : g;
      });
      shuffle(base, r);
      days = days.concat(base);
    }
    var rounds = ids.length % 2 === 0 ? gamesPerTeam : Math.ceil(gamesPerTeam * ids.length / (ids.length - 1));
    if (days.length > rounds) days = days.slice(0, rounds);
    var cal = sched && sched.games && sched.games.length ? fromSchedule(ids, sched, r) : null;
    if (cal) days = cal.days;
    var division = {}, rec = {};
    teams.forEach(function (t) { division[t.id] = t.division; rec[t.id] = { w: 0, l: 0 }; });
    return {
      v: 1, fmt: (root.Rules ? root.Rules.get(year).kind : 'top'), eraId: eraId, year: year, myId: myId, ids: ids, division: division,
      days: days, day: 0, results: [], rec: rec, dates: cal ? cal.dates : null, gmeta: cal ? cal.meta : null,
      phase: 'regular', playoffs: null, champion: null
    };
  }

  function pct(rec) { var g = rec.w + rec.l; return g ? rec.w / g : 0; }

  function standings(state) {
    var out = {};
    state.ids.forEach(function (id) {
      var d = state.division[id];
      (out[d] = out[d] || []).push({ id: id, w: state.rec[id].w, l: state.rec[id].l });
    });
    Object.keys(out).forEach(function (d) {
      out[d].sort(function (a, b) { return pct(b) - pct(a) || b.w - a.w; });
      var lead = out[d][0];
      out[d].forEach(function (t) { t.gb = ((lead.w - t.w) + (t.l - lead.l)) / 2; });
    });
    return out;
  }

  var ROUNDS = [
    { name: 'Division semifinals', best: 3 },
    { name: 'Division finals', best: 5 },
    { name: 'Finals', best: 7 }
  ];
  var HOME_PATTERN = {
    3: [0, 1, 0],
    5: [0, 0, 1, 1, 0],
    7: [0, 0, 1, 1, 0, 1, 0]
  };

  /* Name and length of a playoff round. Older saves have no stored plan and use the three-round default. */
  function roundInfo(state, r) {
    var po = state.playoffs;
    if (po && po.names) return { name: po.names[r], best: po.best[r] };
    return ROUNDS[r];
  }

  function ranked(state, ids) {
    return ids.slice().sort(function (a, b) {
      return pct(state.rec[b]) - pct(state.rec[a]) || state.rec[b].w - state.rec[a].w;
    });
  }
  function ser(state, a, b, sa, sb, best, label, div) {
    return { a: a, b: b, sa: sa, sb: sb, w: [0, 0], winner: null, best: best, label: label, div: div };
  }

  /* Playoff formats follow the real rules of the day (see rules.js) when the league is shaped to fit them,
     otherwise the top 8 of 10+ teams, or top 4 of a small league, seeded by record. */
  function startPlayoffs(state) {
    var st = standings(state), divs = Object.keys(st), kind = state.fmt || 'top';
    var order, names, best, round = null, extra = {};
    if (kind === 'ladder47' && divs.length === 2 && divs.every(function (d) { return st[d].length >= 3; })) {
      var E = st[divs[0]].map(function (t) { return t.id; }), W = st[divs[1]].map(function (t) { return t.id; });
      round = [
        ser(state, E[0], W[0], 1, 1, 7, 'Semifinal'),
        ser(state, E[1], E[2], 2, 3, 3, 'Runners-up', divs[0]),
        ser(state, W[1], W[2], 2, 3, 3, 'Runners-up', divs[1])
      ];
      names = ['Semifinals and runners-up', 'Runners-up final', 'Finals'];
    } else if (kind === 'semi4' && divs.length === 2 && state.ids.length >= 4) {
      var champs = divs.map(function (d) { return st[d][0].id; });
      var rest = ranked(state, state.ids.filter(function (id) { return champs.indexOf(id) < 0; })).slice(0, 2);
      round = [ser(state, champs[0], champs[1], 1, 2, 7, 'Division champions'), ser(state, rest[0], rest[1], 3, 4, 7, 'Next best records')];
      names = ['Semifinals', 'Finals'];
    } else if (kind === 'nba' && divs.length === 2 && divs.every(function (d) { return st[d].length >= 8; })) {
      round = [];
      divs.forEach(function (d) {
        var t = st[d].map(function (x) { return x.id; });
        [[1, 8], [4, 5], [2, 7], [3, 6]].forEach(function (p) { round.push(ser(state, t[p[0] - 1], t[p[1] - 1], p[0], p[1], 7, null, d)); });
      });
      names = ['First round', 'Conference semifinals', 'Conference finals', 'Finals'];
    } else if (kind === 'nba12' && divs.length === 2 && divs.every(function (d) { return st[d].length >= 6; })) {
      round = [];
      divs.forEach(function (d) {
        var t = st[d].map(function (x) { return x.id; });
        function bye(i) { return { a: t[i - 1], b: t[i - 1], sa: i, sb: i, w: [1, 0], winner: t[i - 1], best: 1, div: d, bye: true }; }
        round.push(bye(1), ser(state, t[3], t[4], 4, 5, 3, null, d), bye(2), ser(state, t[2], t[5], 3, 6, 3, null, d));
      });
      names = ['First round', 'Conference semifinals', 'Conference finals', 'Finals'];
    } else if (kind === 'div3' && divs.length === 2 && divs.every(function (d) { return st[d].length >= 3; })) {
      round = [];
      divs.forEach(function (d) {
        var t = st[d].map(function (x) { return x.id; });
        round.push({ a: t[0], b: t[0], sa: 1, sb: 1, w: [1, 0], winner: t[0], best: 1, div: d, bye: true });
        round.push(ser(state, t[1], t[2], 2, 3, 5, null, d));
      });
      names = ['First round', 'Division finals', 'Finals'];
    } else if (kind === 'div4x' && divs.length === 2 && divs.every(function (d) { return st[d].length >= 4; })) {
      round = [];
      divs.forEach(function (d) {
        var t = st[d].map(function (x) { return x.id; });
        round.push(ser(state, t[0], t[3], 1, 4, 7, null, d));
        round.push(ser(state, t[1], t[2], 2, 3, 7, null, d));
      });
      names = ['Division semifinals', 'Division finals', 'Finals'];
    } else if (kind === 'div4' && divs.length === 2 && divs.every(function (d) { return st[d].length >= 4; })) {
      round = [];
      divs.forEach(function (d) {
        var t = st[d].map(function (x) { return x.id; });
        round.push(ser(state, t[0], t[3], 1, 4, 3, null, d));
        round.push(ser(state, t[1], t[2], 2, 3, 3, null, d));
      });
      names = ['Division semifinals', 'Division finals', 'Finals'];
    }
    if (!round) {
      var rk = ranked(state, state.ids);
      var q = state.ids.length >= 10 ? 8 : 4;
      order = q === 8 ? [[1, 8], [4, 5], [2, 7], [3, 6]] : [[1, 4], [2, 3]];
      round = order.map(function (p) { return ser(state, rk[p[0] - 1], rk[p[1] - 1], p[0], p[1], q === 8 ? 3 : 5); });
      names = q === 8 ? ['Quarterfinals', 'Semifinals', 'Finals'] : ['Semifinals', 'Finals'];
      best = q === 8 ? [3, 5, 7] : [5, 7];
      kind = 'top';
    } else {
      if (kind === 'nba12') best = [3, 7, 7, 7];
      else best = names.length === 4 ? [(root.Rules && root.Rules.get(state.year).firstBest) || 7, 7, 7, 7] : names.length === 3 ? [3, 3, 7] : [7, 7];
      if (state.fmt === 'ladder47') best = [3, 3, 7];
      if (state.fmt === 'div4') best = [3, 3, 7];
      if (kind === 'div3') best = [5, 7, 7];
      if (kind === 'div4x') best = [7, 7, 7];
    }
    state.playoffs = { kind: kind, round: 0, rounds: [round], names: names, best: best };
    state.phase = 'playoffs';
  }

  function today(state) {
    if (state.phase === 'regular') {
      return (state.days[state.day] || []).map(function (g) { return { home: g[0], away: g[1] }; });
    }
    if (state.phase !== 'playoffs') return [];
    var po = state.playoffs, list = [];
    po.rounds[po.round].forEach(function (s, i) {
      if (s.winner) return;
      var best = s.best || roundInfo(state, po.round).best;
      var n = s.w[0] + s.w[1];
      var aHome = HOME_PATTERN[best][n] === 0;
      list.push({ home: aHome ? s.a : s.b, away: aHome ? s.b : s.a, series: i, round: po.round });
    });
    return list;
  }

  /* Winners of neighbouring series meet in the next round; the better seed is series side a. */
  function advance(state) {
    var po = state.playoffs, cur = po.rounds[po.round];
    if (cur.some(function (s) { return !s.winner; })) return;
    if (po.kind === 'ladder47' && po.round < 2) {
      if (po.round === 0) {
        po.semiWinner = cur[0].winner;
        po.rounds.push([ser(state, cur[1].winner, cur[2].winner, 1, 2, 3, 'Runners-up final')]);
      } else {
        po.rounds.push([ser(state, po.semiWinner, cur[0].winner, 1, 2, 7, null)]);
      }
      po.round++;
      return;
    }
    if (cur.length === 1) { state.champion = cur[0].winner; state.phase = 'done'; return; }
    var next = [];
    for (var i = 0; i < cur.length; i += 2) {
      var x = cur[i], y = cur[i + 1];
      var sx = x.winner === x.a ? x.sa : x.sb, sy = y.winner === y.a ? y.sa : y.sb;
      var first = sx <= sy;
      next.push({ best: po.best[po.round + 1], div: x.div, a: first ? x.winner : y.winner, b: first ? y.winner : x.winner, sa: Math.min(sx, sy), sb: Math.max(sx, sy), w: [0, 0], winner: null });
    }
    po.rounds.push(next);
    po.round++;
  }

  /* results: [{home, away, hs, as, series?}] for the games returned by today() */
  function record(state, results) {
    if (state.phase === 'regular') {
      results.forEach(function (g) {
        state.results.push({ d: state.day, h: g.home, a: g.away, hs: g.hs, as: g.as });
        var win = g.hs > g.as ? g.home : g.away, lose = win === g.home ? g.away : g.home;
        state.rec[win].w++; state.rec[lose].l++;
      });
      state.day++;
      if (state.day >= state.days.length) startPlayoffs(state);
      return;
    }
    var po = state.playoffs;
    results.forEach(function (g) {
      var s = po.rounds[po.round][g.series], need = Math.ceil((s.best || roundInfo(state, po.round).best) / 2);
      var win = g.hs > g.as ? g.home : g.away;
      s.w[win === s.a ? 0 : 1]++;
      if (s.w[0] === need) s.winner = s.a;
      if (s.w[1] === need) s.winner = s.b;
    });
    advance(state);
  }

  function myNext(state) {
    return today(state).filter(function (g) { return g.home === state.myId || g.away === state.myId; })[0] || null;
  }

  function inPlayoffs(state, id) {
    if (!state.playoffs) return false;
    if (state.playoffs.semiWinner === id && state.playoffs.round === 1) return true;
    return state.playoffs.rounds[state.playoffs.round].some(function (s) {
      return !s.winner && (s.a === id || s.b === id);
    });
  }

  root.Season = {
    create: create, today: today, record: record, standings: standings, myNext: myNext,
    inPlayoffs: inPlayoffs, ROUNDS: ROUNDS, roundInfo: roundInfo, pct: pct
  };
})(window);
