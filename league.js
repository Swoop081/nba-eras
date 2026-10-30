/* NBA Eras league state: contracts, stats, ageing, retirement, draft and free agency.
   Everything lives in save.lg so it is saved with the season. Pure functions. */
(function (root) {
  var W = { sco: .39, sht: .10, ft: .04, ply: .08, tov: .04, orb: .05, drb: .07, stl: .07, blk: .05, fou: .03, dur: .08 };
  var SKILLS = ['sco', 'sht', 'ft', 'tpt', 'ply', 'tov', 'orb', 'drb', 'stl', 'blk', 'fou', 'dur'];
  var KNOWN_SALARY = { 'joe-fulks': 8000, 'tom-king': 16500 };
  var CAP = { 1946: 55000 };
  var MIN_ROSTER = 9, MAX_ROSTER = 15, OPENING_ROSTER = 12;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round100(v) { return Math.round(v / 100) * 100; }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) * 1.15; }

  function ovrOf(r) {
    var w = 0;
    Object.keys(W).forEach(function (k) { w += W[k] * r[k]; });
    return Math.round(35 + 0.6 * w);
  }

  function salaryFor(ovr) { return round100(1500 + Math.max(0, ovr - 45) * 140); }

  function capFor(year) {
    var ks = Object.keys(CAP).map(Number).sort(function (a, b) { return a - b; }), c = CAP[ks[0]];
    ks.forEach(function (k) { if (k <= year) c = CAP[k]; });
    return c;
  }

  /* ---------- creation ---------- */
  function init(save, players, teams) {
    var lg = { rev: 0, cap: capFor(save.year), players: [], stats: {}, history: [], year: save.year, draft: null, off: null };
    players.forEach(function (p) {
      var q = JSON.parse(JSON.stringify(p));
      q.team = p.teamId; delete q.teamId;
      q.status = 'active';
      q.salary = KNOWN_SALARY[q.id] || salaryFor(q.ratings.ovr);
      q.known = !!KNOWN_SALARY[q.id];
      q.yrs = 1 + Math.floor(Math.random() * 3);
      var age = q.age || 26;
      q.pot = clamp(Math.round(q.ratings.ovr + Math.max(0, 27 - age) * 1.2 + rnd(0, 4)), q.ratings.ovr, 99);
      lg.players.push(q);
      logDeal(save, q, 'Original deal', q.team);
    });
    teams.forEach(function (t) {
      var list = lg.players.filter(function (p) { return p.team === t.id; });
      var pay = list.reduce(function (a, p) { return a + p.salary; }, 0);
      var fixed = list.filter(function (p) { return p.known; }).reduce(function (a, p) { return a + p.salary; }, 0);
      var limit = lg.cap - 1500;
      if (pay > limit) {
        var f = (limit - fixed) / (pay - fixed);
        list.forEach(function (p) { if (!p.known) p.salary = Math.max(1000, round100(p.salary * f)); });
      }
    });
    /* Opening night: every club carries the same number of players. Extras go to the free-agent pool; short clubs sign from it. */
    teams.forEach(function (t) {
      lg.players.filter(function (p) { return p.team === t.id; })
        .sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; })
        .slice(OPENING_ROSTER).forEach(function (p) { p.team = null; });
    });
    var guard = 0, short = true;
    while (short && guard++ < 40) {
      short = false;
      teams.forEach(function (t) {
        var list = lg.players.filter(function (p) { return p.team === t.id; });
        if (list.length >= OPENING_ROSTER) return;
        short = true;
        var pay = list.reduce(function (a, p) { return a + p.salary; }, 0);
        var fa = lg.players.filter(function (p) { return !p.team && p.status === 'active'; })
          .sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; })[0];
        if (!fa) { short = false; return; }
        fa.team = t.id; fa.yrs = 1 + Math.floor(Math.random() * 2);
        fa.salary = Math.min(fa.salary, Math.max(1000, lg.cap - pay));
      });
    }
    save.lg = lg;
    ensurePicks(save, teams);
  }

  function active(save) { return save.lg.players.filter(function (p) { return p.status === 'active'; }); }
  function rosterOf(save, id) { return save.lg.players.filter(function (p) { return p.status === 'active' && p.team === id; }); }
  function payroll(save, id) { return rosterOf(save, id).reduce(function (a, p) { return a + p.salary; }, 0); }
  function byId(save, id) { return save.lg.players.filter(function (p) { return p.id === id; })[0]; }
  function bump(save) { save.lg.rev++; }

  /* ---------- season stats ---------- */
  var STAT_KEYS = ['min', 'pts', 'ast', 'trb', 'stl', 'blk', 'tov', 'pf', 'fg', 'fga', 'ft', 'fta'];
  /* meta {h, a, hs, as, nh, day}: lines before index nh are the home side. Game logs are kept for the user's players only. */
  function accumulate(save, lines, meta) {
    var st = save.lg.stats;
    lines.forEach(function (l, i) {
      var x = st[l.id] || (st[l.id] = { g: 0, min: 0, pts: 0, ast: 0, trb: 0, stl: 0, blk: 0, tov: 0, pf: 0, fg: 0, fga: 0, ft: 0, fta: 0 });
      var played = l.s.min > 0 || l.s.fga > 0 || l.s.fta > 0 || l.s.pts > 0;
      if (played) x.g++;
      STAT_KEYS.forEach(function (k) { x[k] = (x[k] || 0) + (l.s[k] || 0); });
      if (meta && played) {
        var home = i < meta.nh, tid = home ? meta.h : meta.a;
        noteHigh(save, l, tid, home ? meta.a : meta.h, meta.day);
        if (tid === save.myId) {
          (x.log || (x.log = [])).push([meta.day || 0, home ? meta.a : meta.h, home ? 1 : 0, home ? meta.hs : meta.as, home ? meta.as : meta.hs,
            l.s.min || 0, l.s.pts || 0, l.s.ast || 0, l.s.trb || 0, l.s.stl || 0, l.s.blk || 0, l.s.tov || 0, l.s.pf || 0, l.s.fg || 0, l.s.fga || 0, l.s.ft || 0, l.s.fta || 0]);
        }
      }
    });
  }

  function leaders(save, key, n, minG) {
    var st = save.lg.stats;
    return Object.keys(st).map(function (id) {
      var p = byId(save, id), x = st[id];
      return { p: p, g: x.g, v: x.g ? x[key] / x.g : 0, total: x[key] };
    }).filter(function (r) { return r.p && r.g >= (minG || 15); })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, n || 5);
  }

  /* ---------- ageing ---------- */
  function ageDelta(age) {
    if (age <= 20) return 4.5; if (age === 21) return 3.5; if (age === 22) return 2.5; if (age === 23) return 1.5;
    if (age === 24) return 1; if (age === 25) return 0.5; if (age <= 28) return 0; if (age === 29) return -0.5;
    if (age === 30) return -1; if (age === 31) return -1.5; if (age === 32) return -2; if (age === 33) return -2.5;
    return -3.5;
  }

  /* Ages everyone a year, changes ratings, retires the old. Returns a report for the user's team. */
  function progress(save, myId) {
    var report = { mine: [], retired: [], leagueRetired: 0 };
    save.lg.players.forEach(function (p) {
      if (p.status !== 'active') return;
      var before = p.ratings.ovr, age = p.age || 26;
      p.prev = JSON.parse(JSON.stringify(p.ratings)); p.prevPot = p.pot;
      (p.ovrHist || (p.ovrHist = [])).push({ y: save.year, o: before, a: age });
      p.age = age + 1;
      var d = ageDelta(age + 1) + (age + 1 <= 25 ? (p.pot - before) * 0.2 : 0) + gauss() * 1.3;
      var dr = d / 0.6;
      SKILLS.forEach(function (k) {
        if (p.ratings[k] === undefined) return;
        var v = p.ratings[k] + dr + gauss() * 2.2;
        if (k === 'dur' && age + 1 > 30) v -= 1.5;
        p.ratings[k] = clamp(Math.round(v), 12, 99);
      });
      p.ratings.ovr = ovrOf(p.ratings);
      if (p.p0 === undefined) p.p0 = 0;
      var pr = 0;
      if (p.age >= 33) pr = (p.age - 32) * 0.16 + (p.ratings.ovr < 55 ? 0.15 : 0);
      if (p.age >= 38) pr = 0.92;
      if (Math.random() < pr) {
        p.status = 'retired';
        if (p.team === myId) report.retired.push({ p: p, ovr: before });
        else report.leagueRetired++;
        p.retiredTeam = p.team; p.team = null;
      } else if (p.team === myId) {
        report.mine.push({ p: p, from: before, to: p.ratings.ovr });
      }
    });
    bump(save);
    return report;
  }

  /* ---------- contracts ---------- */
  function ask(save, p, trust) {
    var f = 1.04 - ((trust === undefined ? 50 : trust) - 50) / 400;
    return Math.max(1000, round100(salaryFor(p.ratings.ovr) * f));
  }

  function expiring(save, teamId) {
    return rosterOf(save, teamId).filter(function (p) { return p.yrs <= 0; });
  }

  function newSeasonContracts(save) {
    save.lg.players.forEach(function (p) { if (p.status === 'active' && p.team) p.yrs = Math.max(0, p.yrs - 1); });
  }

  function logDeal(save, p, how, teamId) {
    var d = p.deals || (p.deals = []);
    d.push({ y: save.year, s: p.salary, n: p.yrs, t: teamId === undefined ? p.team : teamId, h: how });
    if (d.length > 14) d.shift();
  }

  function sign(save, p, teamId, salary, years) {
    var how = p.team === teamId && p.status === 'active' ? 'Re-signed' : 'Signed';
    p.team = teamId; p.salary = salary; p.yrs = years; p.status = 'active';
    logDeal(save, p, how);
    bump(save);
  }

  function release(save, p) { p.team = null; if (p.status === 'rights') p.status = 'active'; bump(save); }
  function rightsOf(save, id) { return save.lg.players.filter(function (p) { return p.status === 'rights' && p.team === id; }); }
  function signRights(save, p) { p.status = 'active'; bump(save); }

  /* AI teams re-sign most players with expiring deals; the rest hit free agency. */
  function aiReSign(save, teams, myId) {
    teams.forEach(function (t) {
      if (t.id === myId) return;
      rosterOf(save, t.id).forEach(function (p) {
        if (p.yrs > 0) return;
        if (p.ratings.ovr >= 50 && Math.random() < 0.8) { p.salary = salaryFor(p.ratings.ovr); p.yrs = 1 + Math.floor(Math.random() * 3); logDeal(save, p, 'Re-signed'); }
        else { p.team = null; }
      });
    });
    bump(save);
  }

  function freeAgents(save) {
    return save.lg.players.filter(function (p) { return p.status === 'active' && !p.team; })
      .sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
  }

  /* AI clubs trim to the roster limit and fill up from the free-agent pool. */
  function aiRosterPass(save, teams, myId) {
    teams.forEach(function (t) {
      if (t.id === myId) return;
      var list = rosterOf(save, t.id).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
      list.slice(MAX_ROSTER).forEach(function (p) { p.team = null; });
    });
    teams.forEach(function (t) {
      if (t.id === myId) return;
      var guard = 0;
      while (rosterOf(save, t.id).length < MIN_ROSTER + 2 && guard++ < 10) {
        var fa = freeAgents(save).filter(function (p) { return payroll(save, t.id) + salaryFor(p.ratings.ovr) <= save.lg.cap; })[0];
        if (!fa) break;
        sign(save, fa, t.id, salaryFor(fa.ratings.ovr), 1 + Math.floor(Math.random() * 2));
      }
    });
    bump(save);
  }

  /* ---------- draft ---------- */
  var FIRST = ['Bob', 'Jack', 'Bill', 'Jim', 'Tom', 'Dick', 'Joe', 'Ed', 'Frank', 'Hank', 'Don', 'Ray', 'Ken', 'Walt', 'Al', 'Gene', 'Paul', 'Lou', 'Red', 'Chuck', 'Ted', 'Stan', 'Norm', 'Art', 'Harry', 'Mike', 'Gus', 'Lenny', 'Mel', 'Sam'];
  var LAST = ['Anderson', 'Brennan', 'Carlson', 'Dugan', 'Elliott', 'Foley', 'Grady', 'Hanlon', 'Irwin', 'Jarvis', 'Kowalski', 'Lindgren', 'Moran', 'Novak', 'Olsen', 'Pruitt', 'Quinn', 'Reilly', 'Sullivan', 'Tierney', 'Underwood', 'Vance', 'Walsh', 'Yates', 'Zeller', 'Barlow', 'Cody', 'Dwyer', 'Egan', 'Fitch', 'Gorman', 'Hurley', 'Ivers', 'Judd', 'Kane', 'Lowry', 'Maddox', 'Nolan', 'Oakes', 'Pace'];
  var COLLEGES = ['Notre Dame', 'Kentucky', 'Illinois', 'Duke', 'Indiana', 'Ohio State', 'Utah', 'Holy Cross', 'Bradley', 'DePaul', 'Oklahoma A&M', 'NYU', 'St. John\'s', 'Kansas', 'Wisconsin', 'Purdue', 'Colorado', 'Villanova', 'La Salle', 'Penn State'];
  var BIAS = {
    G: { ply: 12, tov: 10, stl: 10, tpt: 6, ft: 6, sco: 0, sht: 0, orb: -14, drb: -12, blk: -18, fou: 0, dur: 0 },
    F: { ply: 0, tov: 0, stl: 0, tpt: 0, ft: 0, sco: 2, sht: 0, orb: 0, drb: 0, blk: 0, fou: 0, dur: 0 },
    C: { ply: -12, tov: -6, stl: -8, tpt: -12, ft: -6, sco: -2, sht: -2, orb: 12, drb: 14, blk: 16, fou: -4, dur: 0 }
  };

  function makePlayer(base, target, age, pot) {
    var arch = /C/.test(base.pos) && !/G/.test(base.pos) ? 'C' : /G/.test(base.pos) && !/F/.test(base.pos) ? 'G' : (/G/.test(base.pos) ? 'G' : 'F');
    var L = (target - 35) / 0.6, r = {};
    SKILLS.forEach(function (k) { r[k] = clamp(Math.round(L + BIAS[arch][k] + gauss() * 5), 12, 99); });
    for (var i = 0; i < 4; i++) {
      var shift = (target - ovrOf(r)) / 0.6;
      SKILLS.forEach(function (k) { r[k] = clamp(Math.round(r[k] + shift), 12, 99); });
    }
    r.ovr = ovrOf(r);
    var hgt = arch === 'C' ? Math.round(rnd(77, 84)) : arch === 'G' ? Math.round(rnd(69, 75)) : Math.round(rnd(73, 79));
    return {
      id: base.id, name: base.name, pos: base.pos.replace('/', '-'), college: base.college, age: age, hgt: hgt,
      g: 0, pts: 0, ast: 0, fg: 0, fga: 0, ft: 0, fta: 0, pf: 0, stints: [], ratings: r, pot: Math.max(r.ovr, pot),
      team: null, status: 'prospect', salary: 0, yrs: 0, rookie: true, realPick: base.realPick
    };
  }

  function makeClass(year, real, total) {
    var seen = {}, list = [];
    (real || []).forEach(function (rp) {
      var target = clamp(Math.round(62 - (rp.realPick - 1) * 0.28 + gauss() * 2), 44, 66);
      var age = Math.round(rnd(21, 24));
      var pot = rp.pot !== undefined ? rp.pot : target + Math.round(rnd(4, 14));
      list.push(makePlayer(rp, target, age, pot));
      seen[rp.id] = 1;
    });
    var n = 0;
    while (list.length < total) {
      var name = pick(FIRST) + ' ' + pick(LAST), id = name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ +/g, '-');
      if (seen[id] || n++ > 500) continue;
      seen[id] = 1;
      var target = clamp(Math.round(rnd(40, 56) + gauss() * 2), 38, 60);
      list.push(makePlayer({ id: id, name: name, pos: pick(['G', 'G', 'F', 'F', 'F/C', 'C', 'G/F']), college: pick(COLLEGES) }, target, Math.round(rnd(21, 24)), target + Math.round(rnd(3, 14))));
    }
    list.forEach(function (p) {
      p.scout = { ovr: clamp(Math.round(p.ratings.ovr + gauss() * 3), 30, 95), pot: clamp(Math.round(p.pot + gauss() * 6), 35, 99) };
      p.board = p.scout.ovr * 0.5 + p.scout.pot * 0.5;
    });
    return list;
  }

  /* Reverse order of record, champions last. */
  function draftOrder(save, teams, rounds, first) {
    var rec = save.rec, firstIds = first || [];
    var zero = { w: 0, l: 0 };
    var order = teams.map(function (t) { return t.id; }).sort(function (a, b) {
      var fa = firstIds.indexOf(a) >= 0 ? 0 : 1, fb = firstIds.indexOf(b) >= 0 ? 0 : 1;
      if (fa !== fb) return fa - fb;
      var ca = a === save.champion ? 1 : 0, cb = b === save.champion ? 1 : 0;
      if (ca !== cb) return ca - cb;
      var ra = rec[a] || zero, rb = rec[b] || zero;
      var pa = ra.w / Math.max(1, ra.w + ra.l), pb = rb.w / Math.max(1, rb.w + rb.l);
      return pa - pb;
    });
    var picks = [];
    for (var r = 1; r <= rounds; r++) order.forEach(function (id, i) { picks.push({ round: r, pick: picks.length + 1, team: id, player: null }); });
    return picks;
  }

  function startDraft(save, teams, real, rounds) {
    var pool = makeClass(save.year + 1, real, teams.length * rounds + 12);
    var dp = draftOrder(save, teams, rounds);
    dp.forEach(function (sl) {
      var k = (save.lg.picks || []).filter(function (x) { return x.y === save.year + 1 && x.r === sl.round && x.o === sl.team; })[0];
      if (k && k.t !== sl.team) { sl.orig = sl.team; sl.team = k.t; }
    });
    save.lg.draft = { year: save.year + 1, rounds: rounds, pool: pool, picks: dp, at: 0 };
  }

  /* Players from folded clubs go into a pool that the surviving and new clubs pick from. */
  function startDispersal(save, teams, foldedIds, newIds, rounds) {
    var pool = save.lg.players.filter(function (p) { return p.status === 'active' && p.team && foldedIds.indexOf(p.team) >= 0; });
    pool.forEach(function (p) {
      p.formerTeam = p.team; p.team = null; p.status = 'prospect';
      p.scout = { ovr: p.ratings.ovr, pot: p.pot };
      p.board = p.ratings.ovr * 0.5 + p.pot * 0.5;
    });
    var r = Math.max(1, Math.min(rounds, Math.ceil(pool.length / teams.length)));
    save.lg.draft = { kind: 'dispersal', year: save.year + 1, rounds: r, pool: pool, picks: draftOrder(save, teams, r, newIds), at: 0 };
    bump(save);
  }

  /* A new club's roster: experienced players from elsewhere. */
  function makeVeterans(save, teamId, n, lo, hi) {
    var used = {};
    save.lg.players.forEach(function (p) { used[p.id] = 1; });
    var made = 0, guard = 0;
    while (made < n && guard++ < 400) {
      var name = pick(FIRST) + ' ' + pick(LAST), id = name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ +/g, '-');
      if (used[id]) continue;
      used[id] = 1;
      var target = clamp(Math.round(rnd(lo, hi)), 40, 80);
      var p = makePlayer({ id: id, name: name, pos: pick(['G', 'G', 'F', 'F', 'F/C', 'C', 'G/F']), college: 'Pro' }, target, Math.round(rnd(24, 31)), target + Math.round(rnd(0, 4)));
      p.status = 'active'; p.team = teamId; p.salary = salaryFor(target); p.yrs = 2; p.rookie = false; delete p.realPick;
      save.lg.players.push(p);
      made++;
    }
    bump(save);
  }

  function draftAvailable(save) {
    var d = save.lg.draft;
    return d.pool.filter(function (p) { return p.status === 'prospect'; }).sort(function (a, b) { return b.board - a.board; });
  }

  function makePick(save, p) {
    var d = save.lg.draft, slot = d.picks[d.at];
    p.status = slot.team === save.myId ? 'rights' : 'active'; p.team = slot.team;
    if (d.kind === 'dispersal') { p.salary = salaryFor(p.ratings.ovr); p.yrs = 2; }
    else { p.salary = Math.max(1000, salaryFor(p.ratings.ovr) - 500); p.yrs = 2; p.draftedYear = d.year; p.draftPick = slot.pick; }
    logDeal(save, p, d.kind === 'dispersal' ? 'Dispersal pick' : 'Drafted, pick ' + slot.pick, slot.team);
    slot.player = p.id;
    if (!byId(save, p.id)) save.lg.players.push(p);
    d.at++;
    bump(save);
    return slot;
  }

  function aiPick(save) {
    var d = save.lg.draft;
    var best = draftAvailable(save).slice(0, 6);
    var scored = best.map(function (p) { return { p: p, v: p.board + rnd(-4, 4) }; }).sort(function (a, b) { return b.v - a.v; });
    return makePick(save, scored[0].p);
  }

  /* ---------- trades ---------- */
  function tradeValue(p) {
    var o = p.ratings.ovr, age = p.age || 26;
    var v = Math.pow(Math.max(0, o - 38), 2) / 12;
    if (age <= 25) v += Math.max(0, p.pot - o) * (26 - age) * 0.3;
    if (age >= 29) v *= Math.max(0.35, 1 - (age - 28) * 0.1);
    v *= 1 + (p.imp || 0) * 1.5;
    v += (salaryFor(o) - p.salary) / 250;
    return Math.max(1, v);
  }

  function sum(list, f) { return list.reduce(function (a, p) { return a + f(p); }, 0); }

  /* me gives `give` players to `them` and gets `get`. Returns { ok, reason, ratio }. */
  function evaluateTrade(save, meId, themId, give, get, maxRoster, ex) {
    ex = ex || { gain: 0, loss: 0, n: 0 };
    if (!give.length && !get.length && !ex.n) return { ok: false, reason: 'Pick at least one player.', ratio: 0 };
    var cap = save.lg.cap;
    var meN = rosterOf(save, meId).length - give.length + get.length;
    var themN = rosterOf(save, themId).length + give.length - get.length;
    if (meN < 8) return { ok: false, reason: 'You would have only ' + meN + ' players. You need at least 8.', ratio: 0 };
    if (meN > maxRoster && give.length < get.length) return { ok: false, reason: 'You would have ' + meN + ' players. The limit is ' + maxRoster + '.', ratio: 0 };
    if (themN < 8) return { ok: false, reason: 'They would be left with ' + themN + ' players.', ratio: 0 };
    if (themN > maxRoster && give.length > get.length) return { ok: false, reason: 'They have no room for that many players.', ratio: 0 };
    var inMe = sum(get, function (p) { return p.salary; }), outMe = sum(give, function (p) { return p.salary; });
    var mePay = payroll(save, meId) - outMe + inMe, themPay = payroll(save, themId) + outMe - inMe;
    if (mePay > cap && inMe > outMe) return { ok: false, reason: 'That would put you $' + (mePay - cap).toLocaleString('en-US') + ' over the $' + cap.toLocaleString('en-US') + ' cap. Send out more salary.', ratio: 0 };
    if (themPay > cap && outMe > inMe) return { ok: false, reason: 'They would be $' + (themPay - cap).toLocaleString('en-US') + ' over the cap. Take back more salary.', ratio: 0 };
    var gain = sum(give, tradeValue) + ex.gain, loss = sum(get, tradeValue) + ex.loss;
    var ratio = loss > 0 ? gain / loss : 9;
    if (ratio < 1.1) return { ok: false, reason: ratio >= 0.9 ? 'Close, but they want a little more.' : 'They do not think that is fair.', ratio: ratio, close: ratio >= 0.9 };
    return { ok: true, reason: 'They accept.', ratio: ratio };
  }

  function executeTrade(save, meId, themId, give, get, giveK, getK) {
    (giveK || []).forEach(function (k) { k.t = themId; });
    (getK || []).forEach(function (k) { k.t = meId; });
    give.forEach(function (p) { p.team = themId; logDeal(save, p, 'Traded', themId); });
    get.forEach(function (p) { p.team = meId; logDeal(save, p, 'Traded', meId); });
    bump(save);
  }

  /* The cheapest extra player (or pair) from my roster that would make the deal work. */
  function suggestAdd(save, meId, themId, give, get, maxRoster, ex) {
    var chosen = give.map(function (p) { return p.id; });
    var pool = rosterOf(save, meId).filter(function (p) { return chosen.indexOf(p.id) < 0; })
      .sort(function (a, b) { return tradeValue(a) - tradeValue(b); });
    var i, j, r;
    for (i = 0; i < pool.length; i++) {
      r = evaluateTrade(save, meId, themId, give.concat([pool[i]]), get, maxRoster, ex);
      if (r.ok) return [pool[i]];
    }
    var best = null, bestV = 1e9;
    for (i = 0; i < pool.length; i++) {
      for (j = i + 1; j < pool.length; j++) {
        r = evaluateTrade(save, meId, themId, give.concat([pool[i], pool[j]]), get, maxRoster, ex);
        var v = tradeValue(pool[i]) + tradeValue(pool[j]);
        if (r.ok && v < bestV) { best = [pool[i], pool[j]]; bestV = v; }
      }
    }
    return best;
  }

  /* ---------- injuries ---------- */
  function healthy(save, id) {
    var all = rosterOf(save, id), ok = all.filter(function (p) { return !(p.inj > 0); });
    return ok.length >= 5 ? ok : all;
  }
  /* Each player who took the floor has a small chance of getting hurt; sturdier players less so. */
  function rollInjuries(save, lines, teamId) {
    var hurt = [];
    lines.forEach(function (ln) {
      if (!(ln.s.pos > 0)) return;
      var p = byId(save, ln.id);
      if (!p || p.inj > 0) return;
      var dur = p.ratings.dur || 60;
      if (Math.random() < 0.0055 * (1.6 - dur / 100)) {
        var r = Math.random();
        var n = r < 0.55 ? 2 + Math.floor(Math.random() * 4) : r < 0.85 ? 6 + Math.floor(Math.random() * 7) : r < 0.97 ? 13 + Math.floor(Math.random() * 13) : 30 + Math.floor(Math.random() * 30);
        p.inj = n;
        (p.injHist || (p.injHist = [])).push({ y: save.year, d: save.day || 0, n: n, t: teamId });
        hurt.push({ id: p.id, name: p.name, team: teamId, games: n });
      }
    });
    if (hurt.length) bump(save);
    return hurt;
  }
  function tickInjuries(save, teamId) {
    var any = false;
    rosterOf(save, teamId).forEach(function (p) { if (p.inj > 0) { p.inj--; any = true; } });
    if (any) bump(save);
  }



  /* ---------- draft picks as assets (rounds 1 and 2 are tradeable) ---------- */
  function ensurePicks(save, teams) {
    var L = save.lg;
    L.picks = (L.picks || []).filter(function (k) { return k.y > save.year; });
    for (var y = save.year + 1; y <= save.year + 2; y++) {
      for (var r = 1; r <= 2; r++) {
        teams.forEach(function (t) {
          if (!L.picks.some(function (k) { return k.y === y && k.r === r && k.o === t.id; })) L.picks.push({ y: y, r: r, o: t.id, t: t.id });
        });
      }
    }
  }
  function picksOf(save, id) {
    return (save.lg.picks || []).filter(function (k) { return k.t === id; }).sort(function (a, b) { return a.y - b.y || a.r - b.r; });
  }
  function pickValue(save, k) {
    var r = save.rec[k.o] || { w: 0, l: 0 }, g = r.w + r.l;
    var wp = g ? r.w / g : 0.5;
    var soon = k.y === save.year + 1;
    if (!soon) wp = 0.5 + (wp - 0.5) * 0.4;
    var base = k.r === 1 ? 55 : 14;
    return base * (1.5 - wp) * (soon ? 1 : 0.8);
  }
  function pickId(k) { return 'pk-' + k.y + '-' + k.r + '-' + k.o; }
  function pickLabel(k, teams) { return k.y + ' round ' + k.r + ' pick' + (k.o !== k.t ? ' (from ' + cityOf(teams, k.o) + ')' : ''); }


  /* ---------- records: game highs, season highs, champions ---------- */
  var GAME_KEYS = ['pts', 'ast', 'trb', 'fg', 'ft', 'stl', 'blk'];
  function recs(save) {
    var r = save.lg.rec || (save.lg.rec = {});
    r.game = r.game || {}; r.season = r.season || {}; r.team = r.team || {};
    return r;
  }
  function pushTop(list, e, n) {
    list.push(e);
    list.sort(function (a, b) { return b.v - a.v; });
    if (list.length > n) list.length = n;
  }
  function noteHigh(save, l, tid, oid, day) {
    var r = recs(save);
    GAME_KEYS.forEach(function (k) {
      var v = l.s[k] || 0;
      if (v <= 0) return;
      var list = r.game[k] || (r.game[k] = []);
      if (list.length >= 10 && v <= list[list.length - 1].v) return;
      pushTop(list, { v: v, id: l.id, name: l.name, t: tid, o: oid, y: save.year, d: day || 0 }, 10);
    });
  }
  function noteTeamGame(save, hId, aId, hs, as) {
    var r = recs(save);
    [[hId, aId, hs, as], [aId, hId, as, hs]].forEach(function (g) {
      pushTop(r.team.score || (r.team.score = []), { v: g[2], t: g[0], o: g[1], y: save.year, d: save.day || 0 }, 10);
    });
    var w = hs > as ? [hId, aId] : [aId, hId];
    pushTop(r.team.margin || (r.team.margin = []), { v: Math.abs(hs - as), t: w[0], o: w[1], y: save.year, d: save.day || 0, sc: Math.max(hs, as) + '-' + Math.min(hs, as) }, 10);
  }
  function noteSeason(save) {
    var r = recs(save), need = Math.round(save.days.length * 0.3);
    Object.keys(save.lg.stats).forEach(function (id) {
      var x = save.lg.stats[id], p = byId(save, id);
      if (!p || !x.g) return;
      var base = { id: id, name: p.name, t: p.team, y: save.year };
      if (x.g >= need) {
        pushTop(r.season.ppg || (r.season.ppg = []), Object.assign({ v: +(x.pts / x.g).toFixed(1) }, base), 10);
        pushTop(r.season.apg || (r.season.apg = []), Object.assign({ v: +(x.ast / x.g).toFixed(1) }, base), 10);
      }
      pushTop(r.season.pts || (r.season.pts = []), Object.assign({ v: x.pts }, base), 10);
      pushTop(r.season.ast || (r.season.ast = []), Object.assign({ v: x.ast }, base), 10);
    });
  }
  /* Everything the records screen needs, computed from the save. */
  function recordsView(save) {
    var r = recs(save), champs = {}, byYear = [];
    (save.lg.history || []).forEach(function (h) {
      if (!h.champion) return;
      (champs[h.champion] || (champs[h.champion] = [])).push(h.year);
      byYear.push(h);
    });
    var teamTitles = Object.keys(champs).map(function (id) { return { id: id, n: champs[id].length, years: champs[id].sort() }; })
      .sort(function (a, b) { return b.n - a.n || a.years[a.years.length - 1] - b.years[b.years.length - 1]; });
    var career = {};
    save.lg.players.forEach(function (p) {
      var t = { g: 0, pts: 0, ast: 0, fg: 0, fga: 0, ft: 0, fta: 0 };
      (p.career || []).forEach(function (c) { Object.keys(t).forEach(function (k) { t[k] += c[k] || 0; }); });
      var cur = save.lg.stats[p.id];
      if (cur && cur.g) Object.keys(t).forEach(function (k) { t[k] += cur[k] || 0; });
      if (t.g) career[p.id] = { p: p, t: t };
    });
    var rows = Object.keys(career).map(function (id) { return career[id]; });
    function top(f, n, min) {
      return rows.filter(function (x) { return !min || x.t.g >= min; }).map(function (x) { return { p: x.p, v: f(x.t) }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, n || 10);
    }
    var playerTitles = save.lg.players.map(function (p) {
      var yrs = (p.awards || []).filter(function (a) { return a.a === 'League champion'; }).map(function (a) { return a.y; });
      return { p: p, n: yrs.length, years: yrs };
    }).filter(function (x) { return x.n; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 10);
    var honours = {};
    save.lg.players.forEach(function (p) {
      (p.awards || []).forEach(function (a) {
        if (a.a !== 'Most Valuable Player' && a.a !== 'Scoring champion' && a.a !== 'Assists leader') return;
        var h = honours[a.a] || (honours[a.a] = []);
        h.push({ y: a.y, p: p });
      });
    });
    Object.keys(honours).forEach(function (k) { honours[k].sort(function (a, b) { return b.y - a.y; }); });
    return {
      rec: r, teamTitles: teamTitles, byYear: byYear.sort(function (a, b) { return b.year - a.year; }), playerTitles: playerTitles, honours: honours,
      career: {
        pts: top(function (t) { return t.pts; }), ast: top(function (t) { return t.ast; }), g: top(function (t) { return t.g; }),
        ppg: top(function (t) { return t.g ? t.pts / t.g : 0; }, 10, 20), fg: top(function (t) { return t.fga ? 100 * t.fg / t.fga : 0; }, 10, 100), ft: top(function (t) { return t.fta ? 100 * t.ft / t.fta : 0; }, 10, 100)
      }
    };
  }

  /* ---------- AI clubs: trades, signings, offers ---------- */
  function wire(save, text) {
    var w = save.lg.wire || (save.lg.wire = []);
    w.push({ d: save.day || 0, y: save.year, t: text });
    if (w.length > 40) w.shift();
  }
  function cityOf(teams, id) { var t = teams.filter(function (x) { return x.id === id; })[0]; return t ? t.city : id; }
  function lastOf(n) { var a = n.split(' '); return a[a.length - 1]; }

  /* One day of league business between the other clubs. */
  function aiMoves(save, myId, teams) {
    if (save.phase !== 'regular' || save.day > save.days.length * 0.75) return;
    var others = teams.filter(function (t) { return t.id !== myId; });
    if (others.length < 2) return;
    if (Math.random() < 0.1) {
      var a = others[Math.floor(Math.random() * others.length)], b = others[Math.floor(Math.random() * others.length)];
      if (a.id !== b.id) {
        var pa = rosterOf(save, a.id).sort(function (x, y) { return y.ratings.ovr - x.ratings.ovr; }).slice(2, 9);
        var pb = rosterOf(save, b.id).sort(function (x, y) { return y.ratings.ovr - x.ratings.ovr; }).slice(2, 9);
        var done = false;
        pa.sort(function () { return Math.random() - 0.5; }).forEach(function (x) {
          if (done) return;
          pb.forEach(function (y) {
            if (done || x.inj > 0 || y.inj > 0) return;
            var vx = tradeValue(x), vy = tradeValue(y);
            if (Math.abs(vx - vy) / Math.max(vx, vy) > 0.2) return;
            var payA = payroll(save, a.id) - x.salary + y.salary, payB = payroll(save, b.id) - y.salary + x.salary;
            if (payA > save.lg.cap || payB > save.lg.cap) return;
            x.team = b.id; y.team = a.id;
            logDeal(save, x, 'Traded', b.id); logDeal(save, y, 'Traded', a.id);
            wire(save, a.city + ' send ' + x.name + ' to ' + b.city + ' for ' + y.name + '.');
            done = true;
          });
        });
      }
    }
    if (Math.random() < 0.12) {
      var t = others[Math.floor(Math.random() * others.length)];
      var roster = rosterOf(save, t.id), hurt = roster.filter(function (p) { return p.inj > 3; }).length;
      if (roster.length < MAX_ROSTER && (roster.length < 13 || hurt >= 2)) {
        var fa = freeAgents(save).filter(function (p) { return p.ratings.ovr >= 45 && payroll(save, t.id) + salaryFor(p.ratings.ovr) <= save.lg.cap; })[0];
        if (fa) {
          sign(save, fa, t.id, salaryFor(fa.ratings.ovr), 1);
          wire(save, t.city + ' sign free agent ' + fa.name + (hurt >= 2 ? ' to cover injuries.' : '.'));
        }
      }
    }
    bump(save);
  }

  /* A trade proposal from another club: they want one of my rotation players and give a comparable one. */
  function makeOffer(save, myId, teams) {
    var mine = rosterOf(save, myId).sort(function (x, y) { return y.ratings.ovr - x.ratings.ovr; });
    if (mine.length < 10) return null;
    var want = mine.slice(2, 8)[Math.floor(Math.random() * 6)];
    if (!want) return null;
    var cand = teams.filter(function (t) { return t.id !== myId; }).sort(function () { return Math.random() - 0.5; });
    for (var i = 0; i < cand.length; i++) {
      var list = rosterOf(save, cand[i].id).filter(function (p) { return !p.inj; });
      var vw = tradeValue(want);
      var give = list.filter(function (p) {
        var v = tradeValue(p);
        return v >= vw * 0.8 && v <= vw * 1.2 && Math.abs(p.ratings.ovr - want.ratings.ovr) >= 0 && p.id !== want.id;
      }).sort(function () { return Math.random() - 0.5; })[0];
      if (!give) continue;
      var payMe = payroll(save, myId) - want.salary + give.salary;
      if (payMe > save.lg.cap) continue;
      return { themId: cand[i].id, city: cand[i].city, team: cand[i].name, want: want, give: give };
    }
    return null;
  }

  /* Player returns from injury early, or sits out the full time, or the club signs cover. */
  function injuryChoice(save, id, mode, myId) {
    var p = byId(save, id);
    if (!p) return 'He is no longer with the club.';
    var name = lastOf(p.name);
    if (mode === 'rush') {
      if (p.inj <= 0) return name + ' is already fit.';
      var cut = Math.max(1, Math.floor(p.inj * 0.5));
      p.inj -= cut;
      if (Math.random() < 0.3) {
        var more = 4 + Math.floor(Math.random() * 5);
        p.inj += more + cut;
        (p.injHist || (p.injHist = [])).push({ y: save.year, d: save.day || 0, n: more, t: myId });
        bump(save);
        return 'Setback. ' + name + ' aggravated it and is out ' + p.inj + ' games.';
      }
      bump(save);
      return name + ' is back ' + cut + ' games early, ' + p.inj + ' to go.';
    }
    if (mode === 'sign') {
      var roster = rosterOf(save, myId);
      var fa = freeAgents(save).filter(function (q) { return payroll(save, myId) + salaryFor(q.ratings.ovr) <= save.lg.cap; })[0];
      if (roster.length >= MAX_ROSTER) return 'Your roster is full. Release someone first.';
      if (!fa) return 'Nobody affordable is available.';
      sign(save, fa, myId, salaryFor(fa.ratings.ovr), 1);
      return 'Signed ' + fa.name + ' (' + fa.ratings.ovr + ') on a one-year deal.';
    }
    if (p.inj > 0) p.inj = Math.max(0, p.inj - 1);
    bump(save);
    return name + ' will heal properly. No risks.';
  }

  function doOffer(save, myId, themId, giveId, getId) {
    var a = byId(save, giveId), b = byId(save, getId);
    if (!a || !b || a.team !== myId || b.team !== themId) return 'The offer is off. The situation changed.';
    executeTrade(save, myId, themId, [a], [b]);
    return 'Traded ' + a.name + ' for ' + b.name + '.';
  }

  root.League = {
    ensurePicks: ensurePicks, picksOf: picksOf, pickValue: pickValue, pickId: pickId, pickLabel: pickLabel,
    noteTeamGame: noteTeamGame, noteSeason: noteSeason, recordsView: recordsView,
    wire: wire, aiMoves: aiMoves, makeOffer: makeOffer, injuryChoice: injuryChoice, doOffer: doOffer,
    healthy: healthy, rollInjuries: rollInjuries, tickInjuries: tickInjuries,
    tradeValue: tradeValue, evaluateTrade: evaluateTrade, executeTrade: executeTrade, suggestAdd: suggestAdd,
    init: init, active: active, rosterOf: rosterOf, rightsOf: rightsOf, signRights: signRights, payroll: payroll, byId: byId, accumulate: accumulate, leaders: leaders,
    progress: progress, ask: ask, expiring: expiring, newSeasonContracts: newSeasonContracts, sign: sign, release: release,
    aiReSign: aiReSign, freeAgents: freeAgents, aiRosterPass: aiRosterPass, startDraft: startDraft, draftAvailable: draftAvailable,
    makePick: makePick, startDispersal: startDispersal, makeVeterans: makeVeterans, aiPick: aiPick, salaryFor: salaryFor, capFor: capFor, MIN_ROSTER: MIN_ROSTER, MAX_ROSTER: MAX_ROSTER, ovrOf: ovrOf
  };
})(window);
