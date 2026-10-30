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

  function create(eraId, year, teams, myId, gamesPerTeam) {
    var ids = teams.map(function (t) { return t.id; });
    var r = rng(Math.floor(Math.random() * 1e9));
    var copies = Math.max(1, Math.round(gamesPerTeam / (ids.length - 1)));
    var days = [];
    for (var c = 0; c < copies; c++) {
      var base = roundRobin(ids).map(function (g) {
        return c % 2 ? g.map(function (m) { return [m[1], m[0]]; }) : g;
      });
      shuffle(base, r);
      days = days.concat(base);
    }
    var division = {}, rec = {};
    teams.forEach(function (t) { division[t.id] = t.division; rec[t.id] = { w: 0, l: 0 }; });
    return {
      v: 1, eraId: eraId, year: year, myId: myId, ids: ids, division: division,
      days: days, day: 0, results: [], rec: rec,
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

  /* Top 8 of 10+ teams, or top 4 of a small league, seeded by record. */
  function startPlayoffs(state) {
    var ranked = state.ids.slice().sort(function (a, b) {
      return pct(state.rec[b]) - pct(state.rec[a]) || state.rec[b].w - state.rec[a].w;
    });
    var q = state.ids.length >= 10 ? 8 : 4;
    var order = q === 8 ? [[1, 8], [4, 5], [2, 7], [3, 6]] : [[1, 4], [2, 3]];
    var round = order.map(function (p) {
      return { a: ranked[p[0] - 1], b: ranked[p[1] - 1], sa: p[0], sb: p[1], w: [0, 0], winner: null };
    });
    state.playoffs = {
      round: 0, rounds: [round],
      names: q === 8 ? ['Quarterfinals', 'Semifinals', 'Finals'] : ['Semifinals', 'Finals'],
      best: q === 8 ? [3, 5, 7] : [5, 7]
    };
    state.phase = 'playoffs';
  }

  function today(state) {
    if (state.phase === 'regular') {
      return (state.days[state.day] || []).map(function (g) { return { home: g[0], away: g[1] }; });
    }
    if (state.phase !== 'playoffs') return [];
    var po = state.playoffs, best = roundInfo(state, po.round).best, list = [];
    po.rounds[po.round].forEach(function (s, i) {
      if (s.winner) return;
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
    if (cur.length === 1) { state.champion = cur[0].winner; state.phase = 'done'; return; }
    var next = [];
    for (var i = 0; i < cur.length; i += 2) {
      var x = cur[i], y = cur[i + 1];
      var sx = x.winner === x.a ? x.sa : x.sb, sy = y.winner === y.a ? y.sa : y.sb;
      var first = sx <= sy;
      next.push({ div: x.div, a: first ? x.winner : y.winner, b: first ? y.winner : x.winner, sa: Math.min(sx, sy), sb: Math.max(sx, sy), w: [0, 0], winner: null });
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
    var po = state.playoffs, need = Math.ceil(roundInfo(state, po.round).best / 2);
    results.forEach(function (g) {
      var s = po.rounds[po.round][g.series];
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
    return state.playoffs.rounds[state.playoffs.round].some(function (s) {
      return !s.winner && (s.a === id || s.b === id);
    });
  }

  root.Season = {
    create: create, today: today, record: record, standings: standings, myNext: myNext,
    inPlayoffs: inPlayoffs, ROUNDS: ROUNDS, roundInfo: roundInfo, pct: pct
  };
})(window);
