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
      if (cupAt < 0 && d >= ((sched.cup && sched.cup.from) || '2026-12-04')) cupAt = days.length;
      days.push(by[d].map(function (g) { return [g.h, g.a]; }));
      dates.push(d);
      meta.push(by[d].map(function (g) { return g.lab ? [g.lab, g.sub || '', g.arena || '', g.city || ''] : (g.city ? ['', '', g.arena || '', g.city] : 0); }));
    });
    var cup = null;
    if (cupAt > 0) {
      (sched.cup && sched.cup.days ? sched.cup.days : ['2026-12-05', '2026-12-08', '2026-12-11']).map(function (x) { return [x]; }).forEach(function (d, k) {
        days.splice(cupAt + k, 0, []); meta.splice(cupAt + k, 0, []); dates.splice(cupAt + k, 0, d[0]);
      });
      cup = { at: cupAt, groups: cupGroups(sched) };
    }
    return { days: days, dates: dates, meta: meta, cup: cup };
  }

  /* the 6 Cup groups are the connected sets of group-play games */
  function cupGroups(sched) {
    var adj = {};
    sched.games.forEach(function (g) {
      if (!/Group/.test(g.lab || '')) return;
      (adj[g.h] = adj[g.h] || {})[g.a] = 1; (adj[g.a] = adj[g.a] || {})[g.h] = 1;
    });
    var seen = {}, out = [];
    Object.keys(adj).forEach(function (t) {
      if (seen[t]) return;
      var comp = [], st = [t]; seen[t] = 1;
      while (st.length) { var x = st.pop(); comp.push(x); Object.keys(adj[x]).forEach(function (y) { if (!seen[y]) { seen[y] = 1; st.push(y); } }); }
      out.push(comp);
    });
    return out;
  }

  function cupTable(state) {
    var t = {};
    state.cup.groups.forEach(function (g) { g.forEach(function (id) { t[id] = { id: id, w: 0, l: 0, pd: 0 }; }); });
    state.results.forEach(function (r) {
      if (!r.cg || !t[r.h] || !t[r.a]) return;
      var hw = r.hs > r.as;
      t[hw ? r.h : r.a].w++; t[hw ? r.a : r.h].l++;
      t[r.h].pd += r.hs - r.as; t[r.a].pd -= r.hs - r.as;
    });
    return t;
  }
  function cupSort(a, b) { return b.w - a.w || b.pd - a.pd; }

  function pairUp(ids, state, r) {
    var best = null;
    for (var tries = 0; tries < 40; tries++) {
      var l = shuffle(ids.slice(), r), g = [], clash = 0;
      for (var i = 0; i + 1 < l.length; i += 2) {
        var h = r() < 0.5;
        g.push(h ? [l[i], l[i + 1]] : [l[i + 1], l[i]]);
        if (state.results.some(function (x) { return (x.h === l[i] && x.a === l[i + 1]) || (x.h === l[i + 1] && x.a === l[i]); })) clash++;
      }
      if (!best || clash < best.c) best = { g: g, c: clash };
      if (!clash) break;
    }
    return best.g;
  }

  function cupStep(state) {
    var c = state.cup, k = state.day - c.at, r = rng(Math.floor(Math.random() * 1e9));
    if (k === 0) {
      var tab = cupTable(state), winners = [], seconds = [];
      c.groups.forEach(function (g) {
        var l = g.map(function (id) { return tab[id]; }).sort(cupSort);
        winners.push(l[0].id); seconds.push(l[1]);
      });
      var conf = {};
      winners.forEach(function (id) { (conf[state.division[id]] = conf[state.division[id]] || []).push(id); });
      Object.keys(conf).forEach(function (cf) {
        var wc = seconds.filter(function (t) { return state.division[t.id] === cf; }).sort(cupSort)[0];
        if (wc) conf[cf].push(wc.id);
      });
      var q = [];
      c.seed = {};
      Object.keys(conf).forEach(function (cf) {
        var l = conf[cf].map(function (id) { return tab[id]; }).sort(cupSort);
        l.forEach(function (t, i) { c.seed[t.id] = i + 1; });
        var o = l.map(function (t) { return t.id; });
        [[0, 3], [1, 2]].forEach(function (p) { q.push([o[p[0]], o[p[1]]]); });
        if (o.length === 4) return;
      });
      c.q = q.reduce(function (a, x) { return a.concat(x); }, []);
      c.qf = q;
      var out = state.ids.filter(function (id) { return c.q.indexOf(id) < 0; });
      var fill = pairUp(out, state, r);
      state.days[state.day] = q.concat(fill);
      state.gmeta[state.day] = q.map(function () { return ['NBA Cup - Quarterfinal', '', '', '']; }).concat(fill.map(function () { return 0; }));
    } else if (k === 1) {
      var w = [], lost = [];
      c.qf.forEach(function (m) {
        var res = lastResult(state, m[0], m[1]);
        w.push(res.hs > res.as ? m[0] : m[1]); lost.push(res.hs > res.as ? m[1] : m[0]);
      });
      c.sf = [];
      // two semifinals: each side of the bracket (by order of quarterfinals) keeps its winners together
      var half = w.length / 2;
      for (var i = 0; i < w.length; i += 2) c.sf.push(c.seed[w[i]] <= c.seed[w[i + 1]] ? [w[i], w[i + 1]] : [w[i + 1], w[i]]);
      var flat = c.sf.reduce(function (a, x) { return a.concat(x); }, []);
      var rest = state.ids.filter(function (id) { return flat.indexOf(id) < 0; });
      var fill2 = pairUp(rest, state, r);
      state.days[state.day] = c.sf.concat(fill2);
      state.gmeta[state.day] = c.sf.map(function () { return ['NBA Cup - Semifinal', '', '', '']; }).concat(fill2.map(function () { return 0; }));
    } else if (k === 2) {
      var fin = c.sf.map(function (m) { var res = lastResult(state, m[0], m[1]); return res.hs > res.as ? m[0] : m[1]; });
      c.final = fin;
      state.days[state.day] = [fin];
      state.gmeta[state.day] = [['NBA Cup - Championship', '', 'Hinkle Fieldhouse', 'Indianapolis']];
    } else if (k === 3) {
      var res2 = lastResult(state, c.final[0], c.final[1]);
      c.champ = res2.hs > res2.as ? c.final[0] : c.final[1];
    }
  }
  function lastResult(state, a, b) {
    for (var i = state.results.length - 1; i >= 0; i--) {
      var x = state.results[i];
      if ((x.h === a && x.a === b) || (x.h === b && x.a === a)) return x.h === a ? x : { hs: x.as, as: x.hs };
    }
    return { hs: 1, as: 0 };
  }

  /* what the Cup screen shows: group tables, the eight in the bracket, and each knockout game's score */
  function cupView(state) {
    var c = state.cup; if (!c) return null;
    var tab = cupTable(state), q = c.q || [];
    var groups = c.groups.map(function (g, i) {
      var rows = g.map(function (id) { return tab[id]; }).sort(cupSort);
      return { n: i + 1, conf: state.division[g[0]], rows: rows };
    });
    function game(day, a, b) {
      for (var i = state.results.length - 1; i >= 0; i--) {
        var x = state.results[i];
        if (x.d === day && ((x.h === a && x.a === b) || (x.h === b && x.a === a))) return { a: a, b: b, as: x.h === a ? x.hs : x.as, bs: x.h === a ? x.as : x.hs };
      }
      return { a: a, b: b };
    }
    var rounds = [];
    if (c.qf) rounds.push({ name: 'Quarterfinals', games: c.qf.map(function (m) { return game(c.at, m[0], m[1]); }) });
    if (c.sf) rounds.push({ name: 'Semifinals', games: c.sf.map(function (m) { return game(c.at + 1, m[0], m[1]); }) });
    if (c.final) rounds.push({ name: 'Championship', games: [game(c.at + 2, c.final[0], c.final[1])] });
    return { groups: groups, q: q, rounds: rounds, champ: c.champ || null, seed: c.seed || {} };
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
      v: 1, fmt: (root.Rules ? root.Rules.get(year).kind : 'top'), fin232: !!(root.Rules && root.Rules.get(year).fin232), rpo: root.Rules ? (root.Rules.get(year).po || null) : null, playin: !!(root.Rules && root.Rules.get(year).playin), eraId: eraId, year: year, myId: myId, ids: ids, division: division,
      days: days, day: 0, results: [], rec: rec, dates: cal ? cal.dates : null, gmeta: cal ? cal.meta : null, cup: cal ? cal.cup : null,
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
    1: [0],
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
    var P = state.rpo;
    if (kind === 'nba50' && divs.length === 3 && divs.every(function (d) { return st[d].length >= 4; })) {
      round = [];
      divs.forEach(function (d) { var t = st[d].map(function (x) { return x.id; }); round.push(ser(state, t[0], t[3], 1, 4, 3, null, d), ser(state, t[1], t[2], 2, 3, 3, null, d)); });
      names = ['Division semifinals', 'Division finals', 'Semifinal', 'Finals'];
      best = [3, 3, 3, 7];
    } else if (kind === 'grp' && P && divs.length === 2 && divs.every(function (d) { return st[d].length >= P.q; })) {
      var q = P.q, S = 1; while (S < q) S *= 2;
      var ord = S === 8 ? [1, 8, 4, 5, 2, 7, 3, 6] : S === 4 ? [1, 4, 2, 3] : [1, 2];
      var lay = function (d, t) {
        var out = [];
        for (var i = 0; i < ord.length; i += 2) {
          var a = ord[i], b = ord[i + 1];
          if (b > q) out.push({ a: t[a - 1], b: t[a - 1], sa: a, sb: a, w: [1, 0], winner: t[a - 1], best: 1, div: d, bye: true });
          else out.push(ser(state, t[a - 1], t[b - 1], a, b, P.best[0], null, d));
        }
        return out;
      };
      var nr = Math.log(S) / Math.LN2 + 1;
      names = nr === 4 ? ['First round', 'Conference semifinals', 'Conference finals', 'Finals'] : nr === 3 ? ['Division semifinals', 'Division finals', 'Finals'] : ['Division finals', 'Finals'];
      best = P.best.slice(0, nr);
      if (state.playin && q === 8 && divs.every(function (d) { return st[d].length >= 10; })) {
        round = [];
        var direct = {};
        divs.forEach(function (d) {
          var t = st[d].map(function (x) { return x.id; });
          direct[d] = t.slice(0, 6);
          round.push(ser(state, t[6], t[7], 7, 8, 1, 'Play-in', d), ser(state, t[8], t[9], 9, 10, 1, 'Play-in', d));
        });
        extra.playin = { stage: 1, direct: direct, divs: divs };
        names = ['Play-in', 'Play-in final'].concat(names); best = [1, 1].concat(best);
      } else {
        round = [];
        divs.forEach(function (d) { round = round.concat(lay(d, st[d].map(function (x) { return x.id; }))); });
      }
    } else if (kind === 'ladder47' && divs.length === 2 && divs.every(function (d) { return st[d].length >= 3; })) {
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
    } else if (kind === 'grp' || kind === 'nba50') {
      /* best, names set above */
    } else {
      if (kind === 'nba12') best = [3, 7, 7, 7];
      else best = names.length === 4 ? [(root.Rules && root.Rules.get(state.year).firstBest) || 7, 7, 7, 7] : names.length === 3 ? [3, 3, 7] : [7, 7];
      if (state.fmt === 'ladder47') best = [3, 3, 7];
      if (state.fmt === 'div4') best = [3, 3, 7];
      if (kind === 'div3') best = [5, 7, 7];
      if (kind === 'div4x') best = [7, 7, 7];
    }
    state.playoffs = { kind: kind, round: 0, rounds: [round], names: names, best: best };
    if (extra.playin) state.playoffs.playin = extra.playin;
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
      var aHome = (s.f232 ? [0, 0, 1, 1, 1, 0, 0] : HOME_PATTERN[best])[n] === 0;
      list.push({ home: aHome ? s.a : s.b, away: aHome ? s.b : s.a, series: i, round: po.round });
    });
    return list;
  }

  /* Winners of neighbouring series meet in the next round; the better seed is series side a. */
  function advance(state) {
    var po = state.playoffs, cur = po.rounds[po.round];
    if (cur.some(function (s) { return !s.winner; })) return;
    if (po.playin && po.playin.stage) {
      var pi = po.playin;
      if (pi.stage === 1) {
        var nx = [];
        pi.divs.forEach(function (d, k) { var a = cur[2 * k], b = cur[2 * k + 1]; nx.push(ser(state, a.winner === a.a ? a.b : a.a, b.winner, 8, 9, 1, 'Play-in final', d)); pi['s7' + k] = a.winner; });
        po.rounds.push(nx); po.round++; pi.stage = 2; return;
      }
      var fr = [];
      pi.divs.forEach(function (d, k) {
        var t = pi.direct[d].concat([pi['s7' + k], cur[k].winner]);
        [[1, 8], [4, 5], [2, 7], [3, 6]].forEach(function (pp) { fr.push(ser(state, t[pp[0] - 1], t[pp[1] - 1], pp[0], pp[1], po.best[2], null, d)); });
      });
      po.rounds.push(fr); po.round++; pi.stage = 0; return;
    }
    if (po.kind === 'nba50' && po.round === 1) {
      var ws = cur.map(function (x) { return x.winner; }), rk = ranked(state, ws), top = rk[0], oth = rk.slice(1);
      po.rounds.push([{ a: top, b: top, sa: 1, sb: 1, w: [1, 0], winner: top, best: 1, bye: true }, ser(state, oth[0], oth[1], 2, 3, 3, 'Semifinal')]);
      po.round++; return;
    }
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
    if (next.length === 1 && state.fin232) next[0].f232 = true;
    po.rounds.push(next);
    po.round++;
  }

  /* results: [{home, away, hs, as, series?}] for the games returned by today() */
  function record(state, results) {
    if (state.phase === 'regular') {
      results.forEach(function (g) {
        var cg = 0, m = state.gmeta && state.gmeta[state.day];
        (state.days[state.day] || []).forEach(function (x, i) { if (x[0] === g.home && x[1] === g.away && m && m[i] && /Group/.test(m[i][0] || '')) cg = 1; });
        state.results.push({ d: state.day, h: g.home, a: g.away, hs: g.hs, as: g.as, cg: cg });
        if (state.cup && state.day === state.cup.at + 2) return; // the Cup final is not a regular-season game
        var win = g.hs > g.as ? g.home : g.away, lose = win === g.home ? g.away : g.home;
        state.rec[win].w++; state.rec[lose].l++;
      });
      state.day++;
      if (state.cup && state.day >= state.cup.at && state.day <= state.cup.at + 3) cupStep(state);
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
    inPlayoffs: inPlayoffs, ROUNDS: ROUNDS, roundInfo: roundInfo, pct: pct, cupView: cupView
  };
})(window);
