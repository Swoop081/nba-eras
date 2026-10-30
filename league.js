/* NBA Eras league state: contracts, stats, ageing, retirement, draft and free agency.
   Everything lives in save.lg so it is saved with the season. Pure functions. */
(function (root) {
  var W = { sco: .39, sht: .10, ft: .04, ply: .08, tov: .04, orb: .05, drb: .07, stl: .07, blk: .05, fou: .03, dur: .08 };
  var SKILLS = ['sco', 'sht', 'ft', 'tpt', 'ply', 'tov', 'orb', 'drb', 'stl', 'blk', 'fou', 'dur'];
  var KNOWN_SALARY = { 'joe-fulks': 8000, 'tom-king': 16500 };
  var CAP = { 1946: 55000 };
  var MIN_ROSTER = 9, MAX_ROSTER = 15;

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
    save.lg = lg;
  }

  function active(save) { return save.lg.players.filter(function (p) { return p.status === 'active'; }); }
  function rosterOf(save, id) { return save.lg.players.filter(function (p) { return p.status === 'active' && p.team === id; }); }
  function payroll(save, id) { return rosterOf(save, id).reduce(function (a, p) { return a + p.salary; }, 0); }
  function byId(save, id) { return save.lg.players.filter(function (p) { return p.id === id; })[0]; }
  function bump(save) { save.lg.rev++; }

  /* ---------- season stats ---------- */
  function accumulate(save, lines) {
    var st = save.lg.stats;
    lines.forEach(function (l) {
      var x = st[l.id] || (st[l.id] = { g: 0, pts: 0, ast: 0, trb: 0, stl: 0, blk: 0, tov: 0, pf: 0, fg: 0, fga: 0, ft: 0, fta: 0 });
      if (l.s.min > 0 || l.s.fga > 0 || l.s.fta > 0 || l.s.pts > 0) x.g++;
      ['pts', 'ast', 'trb', 'stl', 'blk', 'tov', 'pf', 'fg', 'fga', 'ft', 'fta'].forEach(function (k) { x[k] += l.s[k] || 0; });
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

  function sign(save, p, teamId, salary, years) {
    p.team = teamId; p.salary = salary; p.yrs = years; p.status = 'active';
    bump(save);
  }

  function release(save, p) { p.team = null; bump(save); }

  /* AI teams re-sign most players with expiring deals; the rest hit free agency. */
  function aiReSign(save, teams, myId) {
    teams.forEach(function (t) {
      if (t.id === myId) return;
      rosterOf(save, t.id).forEach(function (p) {
        if (p.yrs > 0) return;
        if (p.ratings.ovr >= 50 && Math.random() < 0.8) { p.salary = salaryFor(p.ratings.ovr); p.yrs = 1 + Math.floor(Math.random() * 3); }
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
  function draftOrder(save, teams, rounds) {
    var rec = save.rec;
    var order = teams.map(function (t) { return t.id; }).sort(function (a, b) {
      var ca = a === save.champion ? 1 : 0, cb = b === save.champion ? 1 : 0;
      if (ca !== cb) return ca - cb;
      var pa = (rec[a].w) / Math.max(1, rec[a].w + rec[a].l), pb = (rec[b].w) / Math.max(1, rec[b].w + rec[b].l);
      return pa - pb;
    });
    var picks = [];
    for (var r = 1; r <= rounds; r++) order.forEach(function (id, i) { picks.push({ round: r, pick: picks.length + 1, team: id, player: null }); });
    return picks;
  }

  function startDraft(save, teams, real, rounds) {
    var pool = makeClass(save.year + 1, real, teams.length * rounds + 12);
    save.lg.draft = { year: save.year + 1, rounds: rounds, pool: pool, picks: draftOrder(save, teams, rounds), at: 0 };
  }

  function draftAvailable(save) {
    var d = save.lg.draft;
    return d.pool.filter(function (p) { return p.status === 'prospect'; }).sort(function (a, b) { return b.board - a.board; });
  }

  function makePick(save, p) {
    var d = save.lg.draft, slot = d.picks[d.at];
    p.status = 'active'; p.team = slot.team; p.salary = Math.max(1000, salaryFor(p.ratings.ovr) - 500); p.yrs = 2;
    p.draftedYear = d.year; p.draftPick = slot.pick;
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

  root.League = {
    init: init, active: active, rosterOf: rosterOf, payroll: payroll, byId: byId, accumulate: accumulate, leaders: leaders,
    progress: progress, ask: ask, expiring: expiring, newSeasonContracts: newSeasonContracts, sign: sign, release: release,
    aiReSign: aiReSign, freeAgents: freeAgents, aiRosterPass: aiRosterPass, startDraft: startDraft, draftAvailable: draftAvailable,
    makePick: makePick, aiPick: aiPick, salaryFor: salaryFor, capFor: capFor, MIN_ROSTER: MIN_ROSTER, MAX_ROSTER: MAX_ROSTER, ovrOf: ovrOf
  };
})(window);
