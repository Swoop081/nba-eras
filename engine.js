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
    1946: { use: 0.9, poss: 86, fg: 0.2, threes: false, tov: 0.14, foul: 0.20, orb: 0.30 },
    // 2026-27: about 100 possessions, 37 threes a night at 36%, 47% from the field.
    2000: { use: 0.8, poss: 100, fg: 0.36, fb: 1.0, fsh: 0.0045, fsc: 0.0013, threes: true, tpBase: 0.14, tpDiv: 220, tpq: 0.78, tov: 0.135, foul: 0.165, orb: 0.25, ftb: 0.58, ftm: 0.32, astp: 1.7 }
  };

  /* Seasons fitted to real league averages (data/era-params.json) override the two hand-tuned entries. */
  function register(map) { Object.keys(map || {}).forEach(function (y) { PARAMS[y] = map[y]; }); }

  /* Rule changes the manager has made (three-point line, shot clock, whistle) reshape the league's numbers. */
  var RULES = {}, RCACHE = {};
  function setRules(r) { RULES = r || {}; RCACHE = {}; }

  function params(year) {
    var keys = Object.keys(PARAMS).map(Number).sort(function (a, b) { return a - b; });
    var best = keys[0];
    keys.forEach(function (k) { if (k <= year) best = k; });
    var base = PARAMS[best], R = RULES;
    if (!R.three && !R.clock && !R.whistle && !R.parity) return base;
    var key = best + '|' + (R.three || '') + (R.clock || '') + (R.whistle || '') + (R.parity || '');
    if (RCACHE[key]) return RCACHE[key];
    var p = Object.assign({}, base);
    if (R.three === 'off') p.threes = false;
    else if (R.three === 'deep' && p.threes) { p.tpBase = p.tpBase * 0.82; p.tpq = p.tpq * 1.04; }
    else if (R.three === 'short' && p.threes) { p.tpBase = p.tpBase * 1.2; p.tpq = p.tpq * 0.97; }
    if (R.clock === 'short') p.poss = p.poss * 1.07; else if (R.clock === 'long') p.poss = p.poss * 0.93;
    if (R.parity === 'tight') p.comp = (p.comp || 1) * 0.78; else if (R.parity === 'wide') p.comp = (p.comp || 1) * 1.18;
    if (R.whistle === 'tight') p.foul = p.foul * 1.25; else if (R.whistle === 'loose') p.foul = p.foul * 0.8;
    return (RCACHE[key] = p);
  }

  var MODERN_ORDER = ['min', 'pts', 'trb', 'ast', 'stl', 'blk', 'tov', 'fg', 'tp', 'ft', 'pf'];
  function columnsFor(year) {
    var cols = COLUMNS.filter(function (c) { return c.from <= year; });
    if (year < 1979) return cols;
    /* today's box score: minutes first, then the headline numbers, shooting splits last */
    return MODERN_ORDER.map(function (k) { return cols.filter(function (c) { return c.key === k; })[0]; }).filter(Boolean);
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

  /* stars take a bigger share of the shots, but their efficiency flattens out above the 60s */
  var USEADD = -0.15;
  function soft(v) { return v > 60 ? 60 + (v - 60) * SOFT : v; }
  var SOFT = 0.8;
  var SHARE = [1, 1, 1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5];

  /* Real leagues are tighter than raw ratings suggest: comp pulls every skill toward 55 so rating gaps decide fewer games. */
  var SKILLS = ['sco', 'sht', 'ft', 'tpt', 'ply', 'tov', 'orb', 'drb', 'stl', 'blk', 'fou'];
  function squash(p, c) {
    var R = {};
    for (var k in p.ratings) R[k] = p.ratings[k];
    SKILLS.forEach(function (s) { if (R[s] !== undefined) R[s] = 55 + c * (R[s] - 55); });
    var q = Object.create(p); q.ratings = R; return q;
  }

  function prep(players, pr) {
    var c = pr && pr.comp !== undefined && pr.comp !== 1 ? pr.comp : 0;
    // the coach's rotation order (slot) wins when it is set; otherwise the best play the most
    var top = players.slice().sort(function (a, b) { return (a.slot !== undefined && b.slot !== undefined) ? a.slot - b.slot : b.ratings.ovr - a.ratings.ovr; }).slice(0, SHARE.length);
    return top.map(function (p, i) {
      return {
        p: c ? squash(p, c) : p, share: SHARE[i],
        s: { pos: 0, pts: 0, fg: 0, fga: 0, ft: 0, fta: 0, tp: 0, tpa: 0, ast: 0, pf: 0, orb: 0, drb: 0, trb: 0, stl: 0, blk: 0, tov: 0, min: 0 }
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
  var NOI = {};
  function ni(x) { return x.ins || NOI; }
  function nd(x) { return x.dins || NOI; }
  function cntd(list, k) { var n = 0; list.forEach(function (x) { if (nd(x)[k]) n++; }); return n; }
  function cnt(list, k) { var n = 0; list.forEach(function (x) { if (ni(x)[k]) n++; }); return n; }

  function possession(r, O, D, pr, st, mo, md) {
    mo = mo || none(); md = md || none();
    var ev = st.ev = { who: null, kind: 'miss', pts: 0 };
    var tovAdj = (50 - avg(O, function (x) { return x.p.ratings.tov; })) / 400 + (avg(D, function (x) { return x.p.ratings.stl; }) - 50) / 500;
    tovAdj += (mo.tovAdd || 0) + (md.oppTovAdd || 0) + 0.012 * cnt(D, 'press') + 0.01 * cntd(O, 'deny') + 0.008 * cntd(O, 'double');
    if (r() < pr.tov + tovAdj) {
      var loser = pick(r, O, function (x) { return x.share * (110 - x.p.ratings.tov); });
      loser.s.tov++;
      ev.who = loser.p.name; ev.kind = 'tov';
      if (r() < 0.55) {
        var thief = pick(r, D, function (x) { return x.share * x.p.ratings.stl * x.p.ratings.stl * (ni(x).press ? 2 : 1); });
        thief.s.stl++; ev.stl = thief.p.name;
      }
      return 0;
    }
    var dbl = cntd(O, 'double') > 0;
    var shooter = pick(r, O, function (x) {
      var s = x.p.ratings.sco;
      return x.share * Math.pow(s, mo.flat ? 0.15 : ((pr.use || 2) + USEADD)) * (mo.focus === x.p.id ? (mo.focusW || 6) : 1) * (md.double === x.p.id ? 0.45 : 1) * (ni(x).use || 1) * (nd(x).double ? 0.45 : 1) * (nd(x).deny ? 0.6 : 1) * (dbl && !nd(x).double ? 1.12 : 1);
    });
    ev.who = shooter.p.name;
    var pts = 0;
    var si = ni(shooter), sd = nd(shooter);
    var fouled = r() < pr.foul + (md.foulAdd || 0) + (si.rim ? 0.035 : 0) + (sd.double ? 0.015 : 0) + 0.01 * cnt(D, 'press') + 0.006 * cnt(D, 'paint');
    if (fouled) {
      pick(r, D, function (x) { return x.share * (110 - x.p.ratings.fou) * (md.protect === x.p.id ? 0.35 : 1) * (ni(x).press || ni(x).paint ? 1.35 : 1); }).s.pf++;
      if (r() > 0.74) fouled = false; // a loose-ball or non-shooting foul: no free throws
    }
    var q = pr.fg * ((pr.fb !== undefined ? pr.fb : 0.62) + (pr.fsh || 0.0095) * soft(shooter.p.ratings.sht) + (pr.fsc || 0.0030) * soft(shooter.p.ratings.sco));
    q *= 1 - (avg(D, function (x) { return x.p.ratings.blk; }) - 45) / 700;
    q += (50 - avg(D, function (x) { return (x.p.ratings.drb + x.p.ratings.stl) / 2; })) / 900;
    q *= 1 - 0.02 * D.reduce(function (t, x) { return t + (ni(x).paint ? x.p.ratings.blk / 70 : 0); }, 0);
    q *= (si.rim ? 1.015 : 1) * (si.use > 1.5 ? 0.985 : 1) * (mo.fgMul || 1) * (md.oppFgMul || 1) * (md.double === shooter.p.id ? 0.93 : 1);
    if (st.eo || st.ed) q *= Math.exp((st.eo || 0) - (st.ed || 0));
    var three = mo.force3 ? mo.force3 === 3 : pr.threes && r() < Math.max(0, (pr.tpBase !== undefined ? pr.tpBase + shooter.p.ratings.tpt / pr.tpDiv : 0.15 + shooter.p.ratings.tpt / 500) + (si.tp || 0) + (sd.sag ? 0.12 : 0) - (si.rim ? 0.12 : 0));
    if (three) { q = q * (pr.tpq || 0.78); }
    q *= (sd.double ? 0.94 : 1) * (sd.sag ? (three ? 1.06 : 0.97) : 1) * (1 - (sd.match || 0)) * (dbl && !sd.double ? 1.02 : 1);
    if (pr.threes) q *= 0.982;
    var made = r() < q;
    if (fouled) {
      var n = made ? 1 : (three ? 3 : 2);
      shooter.s.fga += made ? 1 : 0;
      if (made && three) { shooter.s.tpa++; shooter.s.tp++; }
      ev.kind = 'foul'; ev.fta = 0; ev.ftm = 0;
      for (var i = 0; i < n; i++) {
        shooter.s.fta++; ev.fta++;
        if (r() < (pr.ftb !== undefined ? pr.ftb : 0.38) + (pr.ftm !== undefined ? pr.ftm : 0.4) * shooter.p.ratings.ft / 100) { shooter.s.ft++; shooter.s.pts++; pts++; ev.ftm++; }
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
      if (r() < (pr.astp || 0.72) * (pr.threes ? 0.84 : 1) * (mo.astMul || 1) * (0.2 + 0.4 * shooter.p.ratings.ply / 100)) {
        var passer = pick(r, O.filter(function (x) { return x !== shooter; }), function (x) { return x.share * x.p.ratings.ply * x.p.ratings.ply * (ni(x).pass || 1); });
        passer.s.ast++; ev.ast = passer.p.name;
      }
      return pts;
    }
    if (r() < 0.07 + avg(D, function (x) { return x.p.ratings.blk; }) / 900) {
      var blocker = pick(r, D, function (x) { return x.share * x.p.ratings.blk * x.p.ratings.blk * (ni(x).paint ? 2.2 : 1); });
      blocker.s.blk++; ev.blk = blocker.p.name;
    }
    var offRebP = pr.orb * (0.85 + (avg(O, function (x) { return x.p.ratings.orb; }) - avg(D, function (x) { return x.p.ratings.drb; })) / 250) + 0.014 * cnt(O, 'crash') - 0.01 * cnt(D, 'crash');
    if (r() < offRebP) {
      var reb = pick(r, O, function (x) { return x.share * x.p.ratings.orb * x.p.ratings.orb * (ni(x).crash ? 1.9 : 1); });
      reb.s.orb++;
      var first = ev;
      var more = possession(r, O, D, pr, st, mo, md);
      st.ev.second = true;
      return pts + more;
    }
    pick(r, D, function (x) { return x.share * x.p.ratings.drb * x.p.ratings.drb * (ni(x).crash ? 1.9 : 1); }).s.drb++;
    return pts;
  }

  /* Who is on the floor: the best five start; the bench spells them in a window each quarter. */
  /* minutes each rotation slot plays in a normal game; the coach can change these (plan.mins) */
  var DEFMIN = [34, 33, 31, 29, 27, 24, 21, 17, 13, 11];
  function targets(plan, n) {
    var base = (plan && plan.mins && plan.mins.length ? plan.mins : DEFMIN).slice(0, n), mn = plan && plan.minutes, tot = 0, i;
    while (base.length < n) base.push(4);
    for (i = 0; i < n; i++) {
      if (mn === 'heavy') base[i] *= i < 5 ? 1.1 : 0.7;
      else if (mn === 'deep') base[i] = 24 + (base[i] - 24) * 0.55;
      base[i] = Math.max(0, Math.min(42, base[i]));
      tot += base[i];
    }
    var f = tot ? 240 / tot : 1;
    return base.map(function (m) { return Math.min(42, m * f); });
  }
  /* A rotation by need: every 1.5 minutes the five furthest behind their minutes target take the floor. */
  function lineupIdx(g, T, side) {
    var n = T.length;
    if (n <= 5) return T.map(function (x, i) { return i; });
    var base = [0, 1, 2, 3, 4];
    var diff = Math.abs(g.hs - g.as), late = g.q >= 3 && diff <= 8;
    var rest = (g.rest && g.rest[side]) || {};
    function out(i) { return T[i].s.pf >= 6 || (rest[T[i].p.id] || 0) > g.n; }
    if (n >= 7 && g.q < 4 && !late) {
      var S = (g.seg = g.seg || {})[side] = (g.seg || {})[side] || { k: -1, idx: base, played: T.map(function () { return 0; }), tg: targets(g.plan && g.plan[side], n) };
      var segIdx = Math.min(31, g.q * 8 + Math.floor((g.k / g.limit) * 8));
      if (segIdx !== S.k) {
        S.k = segIdx;
        var need = T.map(function (x, i) { return { i: i, v: S.tg[i] / 1.5 * (segIdx + 1) / 32 - S.played[i] - i * 0.001 }; });
        need = need.filter(function (o) { return !out(o.i); }).sort(function (a, b) { return b.v - a.v; });
        var pick5 = need.slice(0, 5).map(function (o) { return o.i; });
        if (!pick5.some(function (i) { return i < 3; })) { var best = need.filter(function (o) { return o.i < 3; })[0]; if (best) pick5[4] = best.i; }
        S.idx = pick5; pick5.forEach(function (i) { S.played[i]++; });
      }
      base = S.idx.slice();
      while (base.length < 5) base.push(0);
    }
    /* a player you chose to ride stays on the floor while the plan lasts */
    var gm = g.mods && g.mods[side];
    if (gm && gm.until > g.n && gm.focus) {
      var fi = -1;
      T.forEach(function (x, i) { if (x.p.id === gm.focus) fi = i; });
      if (fi >= 0 && !out(fi) && base.indexOf(fi) < 0) {
        base = base.slice();
        var worst = 0;
        base.forEach(function (b, k) { if (b > base[worst]) worst = k; });
        base[worst] = fi;
      }
    }
    var res = [];
    base.forEach(function (i) {
      if (!out(i)) { res.push(i); return; }
      for (var j = 0; j < n; j++) if (!out(j) && base.indexOf(j) < 0 && res.indexOf(j) < 0) { res.push(j); return; }
      res.push(i);
    });
    return res;
  }
  function setLineups(g) {
    g.onHi = lineupIdx(g, g.H, 'H'); g.onAi = lineupIdx(g, g.A, 'A');
    g.onH = g.onHi.map(function (i) { return g.H[i]; });
    g.onA = g.onAi.map(function (i) { return g.A[i]; });
  }

  /* ---------- stepwise game, so the match screen can pause for decisions ---------- */
  function start(home, away, year, seed, edges, plan) {
    var pr = params(year);
    var perQ = pr.poss / 4;
    plan = plan || {};
    perQ *= 1 + 0.07 * (((plan.H && plan.H.pace) || 0) + ((plan.A && plan.A.pace) || 0));
    var prep0H = prep(home, pr), prep0A = prep(away, pr);
    var g = {
      pr: pr, r: rng(seed || Math.floor(Math.random() * 1e9)), H: prep0H, A: prep0A, year: year,
      perQ: perQ, limit: 0, q: 0, k: 0, n: 0, qh: 0, qa: 0, hs: 0, as: 0, quarters: [], ot: 0, over: false,
      plan: plan, pm: { H: planMods(plan.H), A: planMods(plan.A) }, mods: { H: {}, A: {} }, rest: { H: {}, A: {} }, st: {}, onH: [], onA: [], edge: edges || { H: teamImp(prep0H), A: teamImp(prep0A) }
    };
    g.limit = Math.floor(perQ + g.r());
    setLineups(g);
    return g;
  }

  /* the coach's game plan: pace, style and how hard the starters work. Always on for your side. */
  function planMods(p) {
    if (!p) return null;
    var o = { fgMul: 1, oppFgMul: 1, astMul: 1, tovAdd: 0, foulAdd: 0 }, pc = p.pace || 0;
    o.tovAdd += 0.012 * pc; o.fgMul *= 1 - 0.01 * pc;
    if (p.focus === 'inside') { o.fgMul *= 1.012; o.foulAdd += 0.02; o.tovAdd += 0.004; }
    else if (p.focus === 'ball') { o.astMul *= 1.2; o.fgMul *= 1.008; o.tovAdd += 0.006; }
    else if (p.focus === 'defence') { o.oppFgMul *= 0.972; o.fgMul *= 0.988; o.foulAdd += 0.012; }
    return o;
  }
  function live(g, side) {
    var m = g.mods[side], on = m && m.until > g.n, pm = g.pm && g.pm[side];
    if (!pm) return on ? m : none();
    if (!on) return pm;
    var r = Object.assign({}, m);
    r.fgMul = (m.fgMul || 1) * pm.fgMul; r.oppFgMul = (m.oppFgMul || 1) * pm.oppFgMul; r.astMul = (m.astMul || 1) * pm.astMul;
    r.tovAdd = (m.tovAdd || 0) + pm.tovAdd; r.foulAdd = (m.foulAdd || 0) + pm.foulAdd;
    return r;
  }

  /* One exchange: home possession then away possession. Returns both events. */
  function step(g) {
    var mH = live(g, 'H'), mA = live(g, 'A');
    setLineups(g);
    g.onH.forEach(function (x) { x.s.pos++; }); g.onA.forEach(function (x) { x.s.pos++; });
    var hca = g.neutral ? 0 : (g.pr.hca !== undefined ? g.pr.hca : 0.012);
    g.st.eo = (g.edge.H || 0) + hca; g.st.ed = g.edge.A || 0;
    var a = possession(g.r, g.onH, g.onA, g.pr, g.st, mH, mA);
    var evA = { side: 'home', pts: a, ev: g.st.ev };
    g.st.eo = (g.edge.A || 0) - hca; g.st.ed = g.edge.H || 0;
    var b = possession(g.r, g.onA, g.onH, g.pr, g.st, mA, mH);
    var evB = { side: 'away', pts: b, ev: g.st.ev };
    g.qh += a; g.qa += b; g.hs += a; g.as += b; g.k++; g.n++;
    if (g.k >= g.limit) {
      g.quarters.push([g.qh, g.qa]);
      g.qh = 0; g.qa = 0; g.k = 0; g.q++; g.limit = Math.floor(g.perQ + g.r());
      if (g.q >= 4) {
        if (g.hs === g.as && g.ot < 6) { g.ot++; g.limit = Math.max(4, Math.round(g.perQ / 2)); }
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
      T.forEach(function (x) { tw += x.s.pos; });
      T.forEach(function (x) {
        x.s.trb = x.s.orb + x.s.drb;
        x.s.min = tw ? Math.round(240 * x.s.pos / tw) : 0;
      });
    });
    function lines(T) { return T.map(function (x) { return { id: x.p.id, name: x.p.name, pos: x.p.pos, s: x.s }; }); }
    return { quarters: g.quarters, home: g.hs, away: g.as, homeLines: lines(g.H), awayLines: lines(g.A) };
  }

  function simulate(home, away, year, seed, edges, plan) {
    var g = start(home, away, year, seed, edges, plan);
    while (!g.over) step(g);
    return finalize(g);
  }

  root.Engine = { DEFMIN: DEFMIN, simulate: simulate, columnsFor: columnsFor, params: params, register: register, setRules: setRules, start: start, step: step, finalize: finalize };
})(window);
