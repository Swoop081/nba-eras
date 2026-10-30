/* NBA Eras match engine: possession-by-possession sim driven by player ratings.
   Pure functions, no DOM. Exposed as window.Engine. */
(function (root) {
  // Which box-score columns existed, by season start year (first year the stat was recorded).
  var COLUMNS = [
    { key: 'pts', label: 'PTS', from: 1946 },
    { key: 'fg', label: 'FG', from: 1946, pair: ['fg', 'fga'] },
    { key: 'ft', label: 'FT', from: 1946, pair: ['ft', 'fta'] },
    { key: 'ast', label: 'AST', from: 1946 },
    { key: 'pf', label: 'PF', from: 1946 },
    { key: 'trb', label: 'REB', from: 1950 },
    { key: 'min', label: 'MIN', from: 1951 },
    { key: 'orb', label: 'OREB', from: 1973 },
    { key: 'drb', label: 'DREB', from: 1973 },
    { key: 'stl', label: 'STL', from: 1973 },
    { key: 'blk', label: 'BLK', from: 1973 },
    { key: 'tov', label: 'TOV', from: 1977 },
    { key: 'tp', label: '3P', from: 1979, pair: ['tp', 'tpa'] }
  ];

  // Tuned so 1946-47 lands near a 28% FG league scoring about 68 a night.
  var PARAMS = {
    1946: { use: 0.9, poss: 86, fg: 0.2, threes: false, tov: 0.14, foul: 0.20, orb: 0.30 }
  };

  function params(year) {
    var keys = Object.keys(PARAMS).map(Number).sort(function (a, b) { return a - b; });
    var best = keys[0];
    keys.forEach(function (k) { if (k <= year) best = k; });
    return PARAMS[best];
  }

  function columnsFor(year) {
    return COLUMNS.filter(function (c) { return c.from <= year; });
  }

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

  var SHARE = [1, 1, 1, 1, 1, 0.7, 0.5, 0.35];

  function prep(players) {
    var top = players.slice().sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; }).slice(0, SHARE.length);
    return top.map(function (p, i) {
      return {
        p: p, share: SHARE[i],
        s: { pts: 0, fg: 0, fga: 0, ft: 0, fta: 0, tp: 0, tpa: 0, ast: 0, pf: 0, orb: 0, drb: 0, trb: 0, stl: 0, blk: 0, tov: 0, min: 0 }
      };
    });
  }

  /* Hidden impact (defence, leadership) the box score cannot show; a club plays to the average of its rotation. */
  function teamImp(T) {
    var t = 0, w = 0;
    T.forEach(function (x) { t += (x.p.imp || 0) * x.share; w += x.share; });
    return w ? t / w : 0;
  }

  function pick(r, list, weight) {
    var tot = 0, i, w = [];
    for (i = 0; i < list.length; i++) { w[i] = Math.max(0.01, weight(list[i])); tot += w[i]; }
    var x = r() * tot;
    for (i = 0; i < list.length; i++) { x -= w[i]; if (x <= 0) return list[i]; }
    return list[list.length - 1];
  }

  function avg(list, f) {
    var t = 0, w = 0;
    list.forEach(function (x) { t += f(x) * x.share; w += x.share; });
    return t / w;
  }

  function none() { return {}; }

  function possession(r, O, D, pr, st, mo, md) {
    mo = mo || none(); md = md || none();
    var ev = st.ev = { who: null, kind: 'miss', pts: 0 };
    var tovAdj = (50 - avg(O, function (x) { return x.p.ratings.tov; })) / 400 + (avg(D, function (x) { return x.p.ratings.stl; }) - 50) / 500;
    tovAdj += (mo.tovAdd || 0) + (md.oppTovAdd || 0);
    if (r() < pr.tov + tovAdj) {
      var loser = pick(r, O, function (x) { return x.share * (110 - x.p.ratings.tov); });
      loser.s.tov++;
      ev.who = loser.p.name; ev.kind = 'tov';
      if (r() < 0.55) {
        var thief = pick(r, D, function (x) { return x.share * x.p.ratings.stl * x.p.ratings.stl; });
        thief.s.stl++; ev.stl = thief.p.name;
      }
      return 0;
    }
    var shooter = pick(r, O, function (x) {
      var s = x.p.ratings.sco;
      return x.share * Math.pow(s, pr.use || 2) * (mo.focus === x.p.id ? (mo.focusW || 6) : 1);
    });
    ev.who = shooter.p.name;
    var pts = 0;
    var fouled = r() < pr.foul + (md.foulAdd || 0);
    if (fouled) {
      pick(r, D, function (x) { return x.share * (110 - x.p.ratings.fou); }).s.pf++;
      if (r() > 0.74) fouled = false; // a loose-ball or non-shooting foul: no free throws
    }
    var q = pr.fg * (0.62 + 0.0095 * shooter.p.ratings.sht + 0.0030 * shooter.p.ratings.sco);
    q *= 1 - (avg(D, function (x) { return x.p.ratings.blk; }) - 45) / 700;
    q += (50 - avg(D, function (x) { return (x.p.ratings.drb + x.p.ratings.stl) / 2; })) / 900;
    q *= (mo.fgMul || 1) * (md.oppFgMul || 1);
    if (st.eo || st.ed) q *= Math.exp((st.eo || 0) - (st.ed || 0));
    var three = pr.threes && r() < 0.15 + shooter.p.ratings.tpt / 500;
    if (three) { q = q * 0.78; }
    var made = r() < q;
    if (fouled) {
      var n = made ? 1 : (three ? 3 : 2);
      shooter.s.fga += made ? 1 : 0;
      ev.kind = 'foul'; ev.fta = 0; ev.ftm = 0;
      for (var i = 0; i < n; i++) {
        shooter.s.fta++; ev.fta++;
        if (r() < 0.38 + 0.4 * shooter.p.ratings.ft / 100) { shooter.s.ft++; shooter.s.pts++; pts++; ev.ftm++; }
      }
      if (made) { shooter.s.fg++; shooter.s.pts += three ? 3 : 2; pts += three ? 3 : 2; ev.and1 = true; }
      ev.pts = pts;
      return pts;
    }
    shooter.s.fga++;
    if (three) shooter.s.tpa++;
    if (made) {
      var v = three ? 3 : 2;
      shooter.s.fg++; if (three) shooter.s.tp++;
      shooter.s.pts += v; pts += v;
      ev.kind = 'made'; ev.pts = v; ev.three = three;
      if (r() < 0.72 * (0.2 + 0.4 * shooter.p.ratings.ply / 100)) {
        var passer = pick(r, O.filter(function (x) { return x !== shooter; }), function (x) { return x.share * x.p.ratings.ply * x.p.ratings.ply; });
        passer.s.ast++; ev.ast = passer.p.name;
      }
      return pts;
    }
    if (r() < 0.07 + avg(D, function (x) { return x.p.ratings.blk; }) / 900) {
      var blocker = pick(r, D, function (x) { return x.share * x.p.ratings.blk * x.p.ratings.blk; });
      blocker.s.blk++; ev.blk = blocker.p.name;
    }
    var offRebP = pr.orb * (0.85 + (avg(O, function (x) { return x.p.ratings.orb; }) - avg(D, function (x) { return x.p.ratings.drb; })) / 250);
    if (r() < offRebP) {
      var reb = pick(r, O, function (x) { return x.share * x.p.ratings.orb * x.p.ratings.orb; });
      reb.s.orb++;
      var first = ev;
      var more = possession(r, O, D, pr, st, mo, md);
      st.ev.second = true;
      return pts + more;
    }
    pick(r, D, function (x) { return x.share * x.p.ratings.drb * x.p.ratings.drb; }).s.drb++;
    return pts;
  }

  /* ---------- stepwise game, so the match screen can pause for decisions ---------- */
  function start(home, away, year, seed, edges) {
    var pr = params(year);
    var perQ = Math.round(pr.poss / 4);
    var prep0H = prep(home), prep0A = prep(away);
    return {
      pr: pr, r: rng(seed || Math.floor(Math.random() * 1e9)), H: prep0H, A: prep0A, year: year,
      perQ: perQ, limit: perQ, q: 0, k: 0, n: 0, qh: 0, qa: 0, hs: 0, as: 0, quarters: [], ot: 0, over: false,
      mods: { H: {}, A: {} }, st: {}, edge: edges || { H: teamImp(prep0H), A: teamImp(prep0A) }
    };
  }

  function live(g, side) { var m = g.mods[side]; return m && m.until > g.n ? m : none(); }

  /* One exchange: home possession then away possession. Returns both events. */
  function step(g) {
    var mH = live(g, 'H'), mA = live(g, 'A');
    g.st.eo = g.edge.H || 0; g.st.ed = g.edge.A || 0;
    var a = possession(g.r, g.H, g.A, g.pr, g.st, mH, mA);
    var evA = { side: 'home', pts: a, ev: g.st.ev };
    g.st.eo = g.edge.A || 0; g.st.ed = g.edge.H || 0;
    var b = possession(g.r, g.A, g.H, g.pr, g.st, mA, mH);
    var evB = { side: 'away', pts: b, ev: g.st.ev };
    g.qh += a; g.qa += b; g.hs += a; g.as += b; g.k++; g.n++;
    if (g.k >= g.limit) {
      g.quarters.push([g.qh, g.qa]);
      g.qh = 0; g.qa = 0; g.k = 0; g.q++;
      if (g.q >= 4) {
        if (g.hs === g.as && g.ot < 6) { g.ot++; g.limit = Math.round(g.perQ / 2); }
        else g.over = true;
      }
    }
    return [evA, evB];
  }

  function finalize(g) {
    if (g.hs === g.as) {
      g.hs++; g.H[0].s.pts++; g.H[0].s.ft++; g.H[0].s.fta++;
      if (g.quarters.length) g.quarters[g.quarters.length - 1][0]++;
    }
    [g.H, g.A].forEach(function (T) {
      var tw = 0;
      T.forEach(function (x) { tw += x.share; });
      T.forEach(function (x) {
        x.s.trb = x.s.orb + x.s.drb;
        x.s.min = Math.round(240 * x.share / tw);
      });
    });
    function lines(T) { return T.map(function (x) { return { id: x.p.id, name: x.p.name, pos: x.p.pos, s: x.s }; }); }
    return { quarters: g.quarters, home: g.hs, away: g.as, homeLines: lines(g.H), awayLines: lines(g.A) };
  }

  function simulate(home, away, year, seed, edges) {
    var g = start(home, away, year, seed, edges);
    while (!g.over) step(g);
    return finalize(g);
  }

  root.Engine = { simulate: simulate, columnsFor: columnsFor, params: params, start: start, step: step, finalize: finalize };
})(window);
