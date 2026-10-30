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
    1946: { poss: 86, fg: 0.185, threes: false, tov: 0.14, foul: 0.20, orb: 0.30 }
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

  function possession(r, O, D, pr, st) {
    var tovAdj = (50 - avg(O, function (x) { return x.p.ratings.tov; })) / 400 + (avg(D, function (x) { return x.p.ratings.stl; }) - 50) / 500;
    if (r() < pr.tov + tovAdj) {
      var loser = pick(r, O, function (x) { return x.share * (110 - x.p.ratings.tov); });
      loser.s.tov++;
      if (r() < 0.55) pick(r, D, function (x) { return x.share * x.p.ratings.stl * x.p.ratings.stl; }).s.stl++;
      return 0;
    }
    var shooter = pick(r, O, function (x) { var s = x.p.ratings.sco; return x.share * s * s; });
    var defender = pick(r, D, function (x) { return x.share; });
    var pts = 0;
    var fouled = r() < pr.foul;
    if (fouled) {
      pick(r, D, function (x) { return x.share * (110 - x.p.ratings.fou); }).s.pf++;
    }
    var q = pr.fg * (0.62 + 0.0095 * shooter.p.ratings.sht + 0.0030 * shooter.p.ratings.sco);
    q *= 1 - (avg(D, function (x) { return x.p.ratings.blk; }) - 45) / 700;
    q += (50 - avg(D, function (x) { return (x.p.ratings.drb + x.p.ratings.stl) / 2; })) / 900;
    var three = pr.threes && r() < 0.15 + shooter.p.ratings.tpt / 500;
    if (three) { q = q * 0.78; }
    var made = r() < q;
    if (fouled) {
      var n = made ? 1 : (three ? 3 : 2);
      shooter.s.fga += made ? 1 : 0;
      for (var i = 0; i < n; i++) {
        shooter.s.fta++;
        if (r() < 0.38 + 0.4 * shooter.p.ratings.ft / 100) { shooter.s.ft++; shooter.s.pts++; pts++; }
      }
      if (made) { shooter.s.fg++; shooter.s.pts += three ? 3 : 2; pts += three ? 3 : 2; }
      return pts;
    }
    shooter.s.fga++;
    if (three) shooter.s.tpa++;
    if (made) {
      var v = three ? 3 : 2;
      shooter.s.fg++; if (three) shooter.s.tp++;
      shooter.s.pts += v; pts += v;
      if (r() < 0.2 + 0.4 * shooter.p.ratings.ply / 100) {
        var passer = pick(r, O.filter(function (x) { return x !== shooter; }), function (x) { return x.share * x.p.ratings.ply * x.p.ratings.ply; });
        passer.s.ast++;
      }
      return pts;
    }
    if (r() < 0.07 + avg(D, function (x) { return x.p.ratings.blk; }) / 900) {
      pick(r, D, function (x) { return x.share * x.p.ratings.blk * x.p.ratings.blk; }).s.blk++;
    }
    var offRebP = pr.orb * (0.85 + (avg(O, function (x) { return x.p.ratings.orb; }) - avg(D, function (x) { return x.p.ratings.drb; })) / 250);
    if (r() < offRebP) {
      pick(r, O, function (x) { return x.share * x.p.ratings.orb * x.p.ratings.orb; }).s.orb++;
      return pts + possession(r, O, D, pr, st);
    }
    pick(r, D, function (x) { return x.share * x.p.ratings.drb * x.p.ratings.drb; }).s.drb++;
    return pts;
  }

  function simulate(home, away, year, seed) {
    var r = rng(seed || Math.floor(Math.random() * 1e9));
    var pr = params(year);
    var H = prep(home), A = prep(away);
    var q = [], hs = 0, as = 0;
    var perQ = Math.round(pr.poss / 4);
    for (var i = 0; i < 4; i++) {
      var qh = 0, qa = 0;
      for (var k = 0; k < perQ; k++) {
        qh += possession(r, H, A, pr);
        qa += possession(r, A, H, pr);
      }
      hs += qh; as += qa;
      q.push([qh, qa]);
    }
    var ot = 0;
    while (hs === as && ot < 6) {
      var oh = 0, oa = 0;
      for (var m = 0; m < Math.round(perQ / 2); m++) { oh += possession(r, H, A, pr); oa += possession(r, A, H, pr); }
      hs += oh; as += oa; q.push([oh, oa]); ot++;
    }
    if (hs === as) { hs++; H[0].s.pts++; H[0].s.ft++; H[0].s.fta++; q[q.length - 1][0]++; }
    var weights = function (T) { var t = 0; T.forEach(function (x) { t += x.share; }); return t; };
    [H, A].forEach(function (T) {
      var tw = weights(T);
      T.forEach(function (x) {
        x.s.trb = x.s.orb + x.s.drb;
        x.s.min = Math.round(240 * x.share / tw);
      });
    });
    function lines(T) { return T.map(function (x) { return { id: x.p.id, name: x.p.name, pos: x.p.pos, s: x.s }; }); }
    return { quarters: q, home: hs, away: as, homeLines: lines(H), awayLines: lines(A) };
  }

  root.Engine = { simulate: simulate, columnsFor: columnsFor, params: params };
})(window);
