/* NBA Eras league state: contracts, stats, ageing, retirement, draft and free agency.
   Everything lives in save.lg so it is saved with the season. Pure functions. */
(function (root) {
  var W = { sco: .39, sht: .10, ft: .04, ply: .08, tov: .04, orb: .05, drb: .07, stl: .07, blk: .05, fou: .03, dur: .08 };
  var SKILLS = ['sco', 'sht', 'ft', 'tpt', 'ply', 'tov', 'orb', 'drb', 'stl', 'blk', 'fou', 'dur'];
  var KNOWN_SALARY = { 'joe-fulks': 8000, 'tom-king': 16500 };
  var CAP = { 1946: 55000, 1951: 80000, 1956: 110000, 1961: 170000, 1966: 280000, 1970: 600000, 1974: 1200000, 1977: 2000000, 1979: 3500, 1984: 3600, 1985: 4233, 1986: 4945, 1987: 6164, 1988: 7232, 1989: 9802, 1990: 11871, 1991: 11871, 1992: 12500, 1993: 14000, 1994: 15175, 1995: 15964, 1996: 24400, 1997: 26900, 1998: 30000, 1999: 34000, 2000: 35500, 2001: 42500, 2002: 40300, 2003: 43800, 2004: 43900, 2005: 49500, 2006: 53100, 2007: 55600,
    2008: 58700, 2009: 57700, 2010: 58000, 2011: 58000, 2012: 58000, 2013: 58700, 2014: 63100, 2015: 70000, 2016: 94100, 2017: 99100, 2018: 101900, 2019: 109100, 2020: 109100,
    2021: 112400, 2022: 123700, 2023: 136000, 2024: 140600, 2025: 154600, 2026: 165000 };
  var SCALE = 1;
  var MIN_ROSTER = 9, MAX_ROSTER = 15, OPENING_ROSTER = 12;
  /* The modern game counts money in thousands of dollars (a $165,000 cap is $165 million); the founding era counts dollars. */
  var MODERN = false, MINSAL = 1000;
  function setEra(year) {
    MODERN = year >= 1979;
    SCALE = MODERN ? capFor(year) / 165000 : capFor(year) / 55000;
    MINSAL = MODERN ? Math.max(60, Math.round(1300 * SCALE / 10) * 10) : Math.round(1000 * SCALE / 100) * 100;
    MIN_ROSTER = MODERN ? (year >= 1996 ? 13 : 11) : 9;
    OPENING_ROSTER = MODERN ? (year >= 1996 ? 15 : 13) : 12;
    if (root.League) root.League.MIN_ROSTER = MIN_ROSTER;
  }
  function money(n, cap) {
    if (MODERN) return '$' + (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'M';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(2).replace(/0$/, '') + 'M';
    return '$' + n.toLocaleString('en-US');
  }
  function draftRounds() { return MODERN ? 2 : 5; }

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

  function salaryFor(ovr) {
    if (MODERN) return round100(MINSAL + Math.pow(Math.max(0, ovr - 44) / 44, 2.1) * 52000 * SCALE);
    return round100((1500 + Math.max(0, ovr - 45) * 140) * SCALE);
  }

  function capFor(year) {
    var ks = Object.keys(CAP).map(Number).sort(function (a, b) { return a - b; }), c = CAP[ks[0]];
    ks.forEach(function (k) { if (k <= year) c = CAP[k]; });
    return c;
  }

  /* ---------- creation ---------- */
  /* Opening night: every club carries the same number of players. Extras go to the free-agent pool; short clubs sign from it. */
  function openingRosters(lg, teams) {
    teams.forEach(function (t) {
      lg.players.filter(function (p) { return p.team === t.id && p.status === 'active'; })
        .sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; })
        .slice(OPENING_ROSTER).forEach(function (p) { p.team = null; });
    });
    var guard = 0, short = true;
    while (short && guard++ < 40) {
      short = false;
      teams.forEach(function (t) {
        var list = lg.players.filter(function (p) { return p.team === t.id && p.status === 'active'; });
        if (list.length >= OPENING_ROSTER) return;
        short = true;
        var pay = list.reduce(function (a, p) { return a + p.salary; }, 0);
        var fa = lg.players.filter(function (p) { return !p.team && p.status === 'active'; })
          .sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; })[0];
        if (!fa) { short = false; return; }
        fa.team = t.id; fa.yrs = 1 + Math.floor(Math.random() * 2);
        fa.salary = Math.min(fa.salary, Math.max(MINSAL, lg.cap - pay));
      });
    }
  }

  /* How much room a player still has to grow: big for teenagers, small for stars in their mid-twenties. */
  function potGap(age) { return age <= 19 ? 14 : age === 20 ? 12 : age === 21 ? 10 : age === 22 ? 8 : age === 23 ? 6 : age === 24 ? 4 : age === 25 ? 3 : age === 26 ? 1.5 : 0; }
  function potFor(ovr, age) { return clamp(Math.round(ovr + potGap(age) * (1 - Math.max(0, ovr - 50) / 100) + rnd(-2, 3)), ovr, 99); }

  /* Older saves had inflated potentials; trim them once, and never raise a rating. */
  function tune(save) {
    if (!save.lg || save.lg.tuned) return;
    save.lg.tuned = 1;
    save.lg.players.forEach(function (p) {
      if (p.status !== 'active' || p.pot === undefined) return;
      var cap = p.ratings.ovr + Math.ceil(potGap(p.age || 26) * (1 - Math.max(0, p.ratings.ovr - 50) / 100)) + 4;
      if (p.pot > cap) p.pot = Math.max(p.ratings.ovr, cap);
    });
  }

  /* Older saves guessed every salary from the rating. Swap in the real contracts once, for players whose deal has not changed since the start. */
  function realContracts(save, players) {
    if (!save.lg || save.lg.realC || save.year !== 2026 || save.off || save.phase === 'done') return;
    save.lg.realC = 1;
    var map = {};
    (players || []).forEach(function (p) { if (p.contract) map[p.id] = p.contract; });
    save.lg.players.forEach(function (p) {
      var c = map[p.id];
      if (!c || p.status !== 'active') return;
      if ((p.deals || []).some(function (d) { return d.h && d.h !== 'Original deal' && d.h !== 'Traded'; })) return;
      p.salary = c.s; p.yrs = Math.max(1, c.y - (save.year === 2026 ? 0 : 0)); p.opt = c.o; p.known = true;
    });
    bump(save);
  }

  /* Young players with real upside are the foundation of a club and are not shopped or given away. */
  function franchise(p) {
    var age = p.age || 26;
    return (age <= 23 && p.pot >= 74) || (age <= 25 && (p.pot >= 80 || p.ratings.ovr >= 74));
  }
  /* A believable reason for a club to move a player, or null when he is not available. */
  function shopReason(save, p) {
    if (!p.team || franchise(p)) return null;
    var age = p.age || 26, mode = clubMode(save, p.team), top = rosterOf(save, p.team).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    var rank = top.indexOf(p), over = p.salary > salaryFor(p.ratings.ovr) * 1.25 && p.salary > 0;
    if (age >= 31 && mode === 'rebuild') return 'a rebuilding club looking to get younger';
    if (p.yrs <= 1 && age >= 27 && mode !== 'win') return 'an expiring contract on a club not planning to re-sign';
    if (over && rank >= 1) return 'a contract the club wants off the books';
    if (rank >= 3 && age >= 26 && p.ratings.ovr >= 66) return 'surplus on a deep roster';
    if (mode === 'win' && rank >= 2 && age >= 27 && p.ratings.ovr >= 66) return 'a contender shopping depth for a bigger piece';
    return null;
  }

  /* In-season form. Every ten games, what a player has really produced nudges his rating, rookies most of all
     because the game has no earlier NBA numbers for them. */
  function formCheck(save) {
    var day = save.day || 0;
    if (day < 12 || day - (save.lg.formDay || 0) < 10) return 0;
    save.lg.formDay = day;
    var st = save.lg.stats, rows = [];
    save.lg.players.forEach(function (p) {
      var x = st[p.id];
      if (p.status !== 'active' || !p.team || !x || x.g < 8 || !x.min || x.min / x.g < 12) return;
      var eff = (x.pts + x.trb + x.ast + x.stl + x.blk - (x.fga - x.fg) - (x.fta - x.ft) - x.tov) / x.min * 36;
      rows.push({ p: p, e: eff, o: p.ratings.ovr, w: Math.min(1, x.g / 25) });
    });
    if (rows.length < 40) return 0;
    var n = rows.length, mo = 0, me = 0;
    rows.forEach(function (r) { mo += r.o; me += r.e; }); mo /= n; me /= n;
    var sxy = 0, sxx = 0;
    rows.forEach(function (r) { sxy += (r.o - mo) * (r.e - me); sxx += (r.o - mo) * (r.o - mo); });
    var slope = sxx ? sxy / sxx : 0.3;
    if (slope < 0.1) return 0;
    var changed = 0;
    rows.forEach(function (r) {
      var p = r.p, age = p.age || 26, rookie = !!p.rookie || p.draftedYear === save.year;
      var resid = (r.e - (me + slope * (r.o - mo))) / slope;
      var step = Math.max(-1.6, Math.min(1.6, resid * 0.12 * r.w * (rookie ? 2 : 1)));
      step += age <= 22 ? 0.25 : age >= 32 ? -0.2 : 0;
      var room = rookie ? 10 : 6, used = p.formAdj || 0;
      if (Math.abs(used + step) > room) step = Math.sign(step) * Math.max(0, room - Math.abs(used)) * (Math.sign(used) === Math.sign(step) ? 1 : 0) || 0;
      if (Math.abs(step) < 0.35) return;
      var dr = step / 0.6;
      SKILLS.forEach(function (k) { if (p.ratings[k] !== undefined) p.ratings[k] = clamp(Math.round(p.ratings[k] + dr + gauss() * 0.6), 12, 99); });
      var before = p.ratings.ovr;
      p.ratings.ovr = ovrOf(p.ratings);
      p.formAdj = used + (p.ratings.ovr - before);
      if (p.ratings.ovr > p.pot) p.pot = Math.min(99, p.ratings.ovr + (age <= 22 ? 2 : 0));
      else if (age <= 23 && p.ratings.ovr - before >= 2) p.pot = Math.min(99, p.pot + 1);
      else if (age <= 23 && p.ratings.ovr - before <= -2) p.pot = Math.max(p.ratings.ovr, p.pot - 1);
      if (p.ratings.ovr !== before) changed++;
    });
    bump(save);
    return changed;
  }

  function init(save, players, teams, dead) {
    setEra(save.year);
    var lg = { rev: 0, cap: capFor(save.year), dead: dead ? JSON.parse(JSON.stringify(dead)) : {}, players: [], stats: {}, history: [], year: save.year, draft: null, off: null };
    players.forEach(function (p) {
      var q = JSON.parse(JSON.stringify(p));
      q.team = p.teamId; delete q.teamId;
      q.status = 'active';
      q.salary = KNOWN_SALARY[q.id] || salaryFor(q.ratings.ovr);
      q.known = !!KNOWN_SALARY[q.id];
      q.yrs = 1 + Math.floor(Math.random() * 3);
      if (q.contract) { q.salary = q.contract.s; q.yrs = Math.max(1, q.contract.y); q.opt = q.contract.o; q.known = true; delete q.contract; }
      var age = q.age || 26;
      q.pot = potFor(q.ratings.ovr, age);
      lg.players.push(q);
      logDeal(save, q, 'Original deal', q.team);
    });
    teams.forEach(function (t) {
      var list = lg.players.filter(function (p) { return p.team === t.id; });
      var pay = list.reduce(function (a, p) { return a + p.salary; }, 0);
      var fixed = list.filter(function (p) { return p.known; }).reduce(function (a, p) { return a + p.salary; }, 0);
      var limit = MODERN ? Math.round(lg.cap * 0.9) : lg.cap - Math.round(1500 * SCALE);
      if (pay > limit) {
        var f = (limit - fixed) / (pay - fixed);
        list.forEach(function (p) { if (!p.known) p.salary = Math.max(MINSAL, round100(p.salary * f)); });
      }
    });
    save.lg = lg;
    // unsigned veterans, so a short club can fill its roster on opening night
    // the free-agent pool is only real players: the clubs' extras beyond the opening-night limit
    openingRosters(lg, teams);
    ensurePicks(save, teams);
  }

  function active(save) { return save.lg.players.filter(function (p) { return p.status === 'active'; }); }
  function rosterOf(save, id) { return save.lg.players.filter(function (p) { return p.status === 'active' && p.team === id; }); }
  function deadOf(save, id) { return ((save.lg.dead || {})[id] || []).reduce(function (a, x) { return a + x.s; }, 0); }
  function payroll(save, id) { return rosterOf(save, id).reduce(function (a, p) { return a + p.salary; }, 0) + deadOf(save, id); }
  function byId(save, id) { return save.lg.players.filter(function (p) { return p.id === id; })[0]; }
  function bump(save) { save.lg.rev++; }

  /* ---------- season stats ---------- */
  var STAT_KEYS = ['min', 'pts', 'ast', 'trb', 'stl', 'blk', 'tov', 'pf', 'fg', 'fga', 'ft', 'fta', 'tp', 'tpa'];
  /* meta {h, a, hs, as, nh, day}: lines before index nh are the home side. Game logs are kept for the user's players only. */
  function accumulate(save, lines, meta) {
    var st = save.lg.stats;
    lines.forEach(function (l, i) {
      var x = st[l.id] || (st[l.id] = { g: 0, min: 0, pts: 0, ast: 0, trb: 0, stl: 0, blk: 0, tov: 0, pf: 0, fg: 0, fga: 0, ft: 0, fta: 0 });
      var played = l.s.min > 0 || l.s.fga > 0 || l.s.fta > 0 || l.s.pts > 0;
      if (played) { x.g++; var rc = x.rc || (x.rc = []); rc.push([l.s.pts || 0, l.s.fg || 0, l.s.fga || 0, l.s.trb || 0, l.s.ast || 0]); if (rc.length > 6) rc.shift(); }
      STAT_KEYS.forEach(function (k) { x[k] = (x[k] || 0) + (l.s[k] || 0); });
      if (meta && played) {
        var home = i < meta.nh, tid = home ? meta.h : meta.a;
        noteHigh(save, l, tid, home ? meta.a : meta.h, meta.day);
        var aw = save.lg.aw || (save.lg.aw = { wk: {}, mo: {} });
        ['wk', 'mo'].forEach(function (k) {
          var o = aw[k][l.id] || (aw[k][l.id] = { g: 0, pts: 0, trb: 0, ast: 0, stl: 0, blk: 0, w: 0, tid: tid });
          o.g++; o.pts += l.s.pts || 0; o.trb += l.s.trb || 0; o.ast += l.s.ast || 0; o.stl += l.s.stl || 0; o.blk += l.s.blk || 0; o.tid = tid;
          if (home ? meta.hs > meta.as : meta.as > meta.hs) o.w++;
        });
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
      var d = ageDelta(age + 1) + (age + 1 <= 25 ? (p.pot - before) * 0.2 : 0) + gauss() * 1.3 + (p.team && root.Coach && age + 1 <= 27 ? root.Coach.devBonus(save, p.team) * 0.9 : 0);
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
        if (root.Coach) try { root.Coach.fromRetired(save, p); } catch (e) {}
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
    return Math.max(MINSAL, round100(salaryFor(p.ratings.ovr) * f));
  }

  function expiring(save, teamId) {
    return rosterOf(save, teamId).filter(function (p) { return p.yrs <= 0; });
  }

  function newSeasonContracts(save) {
    save.lg.players.forEach(function (p) { if (p.status === 'active' && p.team) p.yrs = Math.max(0, p.yrs - 1); });
    var dd = save.lg.dead || {};
    Object.keys(dd).forEach(function (t) { dd[t] = dd[t].map(function (x) { return { n: x.n, s: x.s, y: x.y - 1 }; }).filter(function (x) { return x.y > 0; }); });
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

  /* Over the cap, a club can still sign players for about the minimum. */
  function canSign(save, teamId, salary) { return payroll(save, teamId) + salary <= save.lg.cap || salary <= MINSAL * 1.6; }

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
        var fa = freeAgents(save).filter(function (p) { return canSign(save, t.id, salaryFor(p.ratings.ovr)); })[0];
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
  var FIRST_M = ['Jalen', 'Marcus', 'Tyrese', 'Darius', 'Cameron', 'Isaiah', 'Malik', 'Jaylen', 'Terrence', 'Devin', 'Caleb', 'Andre', 'Xavier', 'Elijah', 'Jamal', 'Trey', 'Kobe', 'Nolan', 'Brandon', 'Jordan', 'Micah', 'Dante', 'Zion', 'Amari', 'Khalil', 'Tyler', 'Jaden', 'Cole', 'Noah', 'Ethan', 'Mason', 'Rayan', 'Mouhamed', 'Luka', 'Nikola', 'Matteo', 'Leo', 'Ousmane', 'Theo', 'Yuki'];
  var LAST_M = ['Washington', 'Carter', 'Brooks', 'Henderson', 'Coleman', 'Bryant', 'Ellis', 'Foster', 'Gaines', 'Holloway', 'Ingram', 'Jenkins', 'Knox', 'Lawson', 'Mitchell', 'Newton', 'Okafor', 'Powell', 'Reese', 'Sanders', 'Thornton', 'Vaughn', 'Wallace', 'Young', 'Zimmerman', 'Banks', 'Crawford', 'Diallo', 'Edwards', 'Fields', 'Graham', 'Hayes', 'Isaac', 'Jovanovic', 'Kovac', 'Lindqvist', 'Moreau', 'Nunez', 'Petrovic', 'Rossi'];
  var COLLEGES_M = ['Duke', 'Kentucky', 'Kansas', 'UConn', 'Houston', 'Arizona', 'Gonzaga', 'Tennessee', 'Auburn', 'Alabama', 'Purdue', 'Baylor', 'UCLA', 'Michigan State', 'Texas', 'Florida', 'North Carolina', 'Creighton', 'Overseas', 'G League Ignite'];
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
    var n = 0, k0 = list.length;
    while (list.length < total) {
      var fn = MODERN ? pick(FIRST_M) : pick(FIRST), ln = MODERN ? pick(LAST_M) : pick(LAST);
      var name = fn + ' ' + ln, id = name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ +/g, '-');
      if (seen[id] || n++ > 500) continue;
      seen[id] = 1;
      var rank = list.length - k0, target, age, pot;
      if (MODERN) {
        target = rank < 14 ? clamp(Math.round(71 - rank * 1.1 + gauss() * 2), 54, 73) : clamp(Math.round(rnd(42, 55) + gauss() * 2), 38, 58);
        age = Math.round(rnd(19, 22));
        pot = target + Math.round(rank < 14 ? rnd(8, 17) : rnd(3, 12));
      } else {
        target = clamp(Math.round(rnd(40, 56) + gauss() * 2), 38, 60);
        age = Math.round(rnd(21, 24));
        pot = target + Math.round(rnd(3, 14));
      }
      list.push(makePlayer({ id: id, name: name, pos: pick(['G', 'G', 'F', 'F', 'F/C', 'C', 'G/F']), college: MODERN ? pick(COLLEGES_M) : pick(COLLEGES) }, target, age, pot));
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
      var name = MODERN ? pick(FIRST_M) + ' ' + pick(LAST_M) : pick(FIRST) + ' ' + pick(LAST), id = name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ +/g, '-');
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
    else { p.salary = Math.max(MINSAL, salaryFor(p.ratings.ovr) - (MODERN ? Math.round(1000 * SCALE) : Math.round(500 * SCALE))); p.yrs = 2; p.draftedYear = d.year; p.draftPick = slot.pick; }
    logDeal(save, p, d.kind === 'dispersal' ? 'Dispersal pick' : 'Drafted, pick ' + slot.pick, slot.team);
    slot.player = p.id;
    if (!byId(save, p.id)) save.lg.players.push(p);
    d.at++;
    if (root.Social && d.kind !== 'dispersal') root.Social.draftPick(save, p, slot);
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
  /* A club's mood: contenders want help now, rebuilders want youth and picks. Based on the table once the season is under way, otherwise on the roster. */
  function clubMode(save, id) {
    var r = save.rec && save.rec[id], gp = r ? r.w + r.l : 0;
    if (gp >= 12) { var pc = r.w / gp; return pc >= 0.58 ? 'win' : pc <= 0.38 ? 'rebuild' : 'mid'; }
    var top = rosterOf(save, id).map(function (p) { return p.ratings.ovr; }).sort(function (a, b) { return b - a; }).slice(0, 8);
    var avg = top.length ? top.reduce(function (a, b) { return a + b; }, 0) / top.length : 55;
    var all = save.ids.map(function (t) { var q = rosterOf(save, t).map(function (p) { return p.ratings.ovr; }).sort(function (a, b) { return b - a; }).slice(0, 8); return q.length ? q.reduce(function (a, b) { return a + b; }, 0) / q.length : 0; }).sort(function (a, b) { return b - a; });
    var rank = all.indexOf(all.filter(function (v) { return v <= avg; })[0]);
    return rank >= 0 && rank < save.ids.length * 0.3 ? 'win' : rank > save.ids.length * 0.7 ? 'rebuild' : 'mid';
  }

  function tradeValue(p, mode) {
    var o = p.ratings.ovr, age = p.age || 26;
    var up = age <= 25 ? Math.max(0, p.pot - o) * (age <= 21 ? 0.7 : age <= 23 ? 0.5 : 0.3) * (mode === 'win' ? 0.7 : mode === 'rebuild' ? 1.3 : 1) : 0;
    var v = Math.pow(Math.max(0, o + up - 38), 2) / 12;
    var eff = o + up;
    if (eff > 72) v *= 1 + Math.pow(eff - 72, 2) / 25;
    if (age <= 25) v += Math.max(0, p.pot - o) * (26 - age) * 0.3 * (mode === 'win' ? 0.4 : mode === 'rebuild' ? 1.6 : 1);
    if (franchise(p)) v *= (age <= 23 && p.pot >= 74) ? 2.4 : 1.5;
    if (age >= 29) v *= Math.max(0.35, 1 - (age - 28) * (mode === 'win' ? 0.05 : mode === 'rebuild' ? 0.16 : 0.1));
    if (mode === 'win' && o >= 70) v *= 1.15;
    v *= 1 + (p.imp || 0) * 1.5;
    v += (salaryFor(o) - p.salary) / (MODERN ? 1000 : 250 * SCALE);
    return Math.max(1, v);
  }

  /* Star value, 0.5 to 5, on one scale for the whole league: players and picks are ranked by the same trade value the AI uses. */
  var starCache = { rev: -1, key: '', list: [] };
  function starsVal(save, v) {
    var k = save.lg.rev + ':' + save.year;
    if (starCache.key !== k) {
      starCache = { key: k, list: save.lg.players.filter(function (p) { return p.status === 'active'; }).map(function (p) { return tradeValue(p); }).sort(function (a, b) { return b - a; }) };
    }
    var l = starCache.list, n = 0;
    while (n < l.length && l[n] > v) n++;
    var scale = l.length / 450, cuts = [[12, 5], [25, 4.5], [50, 4], [90, 3.5], [150, 3], [220, 2.5], [300, 2], [380, 1.5], [450, 1]];
    for (var i = 0; i < cuts.length; i++) if (n < cuts[i][0] * scale) return cuts[i][1];
    return 0.5;
  }
  function starsOf(save, p) {
    var st = starsVal(save, tradeValue(p));
    if (franchise(p)) st = Math.max(st, (p.age || 26) <= 23 && p.pot >= 74 ? 4 : 3.5);
    return st;
  }

  /* Clubs pay for quality, not quantity: each extra piece in a package counts for less than the one before. */
  function bundle(vals) { return vals.slice().sort(function (a, b) { return b - a; }).reduce(function (s, v, i) { return s + v * Math.pow(0.8, i); }, 0); }
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
    if (mePay > cap && !matchOk(inMe, outMe, cap)) return { ok: false, reason: 'That would put you ' + money(mePay - cap, cap) + ' over the ' + money(cap, cap) + ' cap. Over the cap you can take back at most 125% of the salary you send, plus a little. Send out more salary.', ratio: 0 };
    if (themPay > cap && !matchOk(outMe, inMe, cap)) return { ok: false, reason: 'They would be ' + money(themPay - cap, cap) + ' over the cap. Take back more salary so it matches within 125%.', ratio: 0 };
    var mode = clubMode(save, themId);
    var core = get.filter(franchise)[0];
    var gain = bundle(give.map(function (p) { return tradeValue(p, mode); }).concat(ex.gainL || (ex.gain ? [ex.gain] : [])));
    var loss = bundle(get.map(function (p) { return tradeValue(p, mode); }).concat(ex.lossL || (ex.loss ? [ex.loss] : [])));
    var ratio = loss > 0 ? gain / loss : 9;
    var flat = loss > 0 ? bundle(give.map(function (p) { return tradeValue(p); }).concat(ex.gainL || (ex.gain ? [ex.gain] : []))) / bundle(get.map(function (p) { return tradeValue(p); }).concat(ex.lossL || (ex.loss ? [ex.loss] : []))) : 9;
    if (ratio < 1.1 && core) {
      var cn = core.name.split(' ').slice(-1)[0], lines = ratio < 0.45 ? [
        'You are joking. ' + cn + ' is the cornerstone of this franchise, and that is not close.',
        'We are building around ' + cn + '. Call back with a massive haul, not this.'
      ] : ratio < 0.8 ? [
        cn + ' is our franchise player. It would take a massive haul to even have the conversation, and this is not it.',
        'We do not move a ' + (core.age || 21) + '-year-old like ' + cn + ' for a package like that. Think much bigger.'
      ] : [
        'Now you are getting closer, but ' + cn + ' is our cornerstone. We would need a real star and picks to move him.',
        'Still short. ' + cn + ' is the guy we are building around, so it has to be a massive offer.'
      ];
      return { ok: false, reason: lines[Math.floor(Math.random() * lines.length)], ratio: ratio, close: ratio >= 0.9 };
    }
    if (ratio < 1.1) {
      var why = '';
      if (flat >= 1.1) why = mode === 'win' ? ' They are contending and want players who help now, not prospects.' : mode === 'rebuild' ? ' They are rebuilding and will not take older players.' : '';
      else if (mode === 'win' && get.some(function (p) { return p.ratings.ovr >= 70; })) why = ' They are in a title race and will not give up a core player cheaply.';
      else if (mode === 'rebuild' && give.every(function (p) { return (p.age || 26) >= 29; })) why = ' They want youth or picks back.';
      return { ok: false, reason: (ratio >= 0.9 ? 'Close, but they want a little more.' : 'They do not think that is fair.') + why, ratio: ratio, close: ratio >= 0.9 };
    }
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

  /* ---------- trade finder ---------- */
  /* Over the cap a club may take back at most 125% of the salary it sends, plus a little. */
  function matchOk(inn, out, cap) { return inn <= out * 1.25 + cap * 0.0006; }
  function tctx(save, meId, themId, max) {
    return { cap: save.lg.cap, mode: clubMode(save, themId), max: max, meN: rosterOf(save, meId).length, themN: rosterOf(save, themId).length, mePay: payroll(save, meId), themPay: payroll(save, themId) };
  }
  /* How the AI sees a package: the value ratio, and the first rule it breaks (empty when legal). */
  function assess(save, c, d) {
    var gn = d.give.length, tn = d.get.length;
    var meN = c.meN - gn + tn, themN = c.themN + gn - tn;
    var inMe = sum(d.get, function (p) { return p.salary; }), outMe = sum(d.give, function (p) { return p.salary; });
    var gain = bundle(d.give.map(function (p) { return tradeValue(p, c.mode); }).concat(d.giveK.map(function (k) { return pickValue(save, k); })));
    var loss = bundle(d.get.map(function (p) { return tradeValue(p, c.mode); }).concat(d.getK.map(function (k) { return pickValue(save, k); })));
    var r = loss > 0 ? gain / loss : 9, why = '';
    if (meN < Math.min(12, c.meN)) why = 'meMin';
    else if (themN < Math.min(12, c.themN)) why = 'themMin';
    else if (meN > c.max && gn < tn) why = 'meRoster';
    else if (themN > c.max && gn > tn) why = 'themRoster';
    else if (c.mePay - outMe + inMe > c.cap && !matchOk(inMe, outMe, c.cap)) why = 'meCap';
    else if (c.themPay + outMe - inMe > c.cap && !matchOk(outMe, inMe, c.cap)) why = 'themCap';
    return { r: r, why: why, ok: !why && r >= 1.1, inMe: inMe, outMe: outMe };
  }
  function lowest(list, f) { return list.slice().sort(function (a, b) { return tradeValue(a) - tradeValue(b); }).filter(f || function () { return true; })[0]; }
  /* Adds fillers to either side until the package is legal (and, if asked, until it is fair for them). */
  function complete(save, c, d, mine, theirs, addValue, keep) {
    for (var it = 0; it < 14; it++) {
      var a = assess(save, c, d);
      if (a.ok) return a;
      if (d.get.length > 5 || d.give.length > 5) return null;
      var usedM = d.give.map(function (p) { return p.id; }), usedT = d.get.map(function (p) { return p.id; });
      var freeM = mine.filter(function (p) { return usedM.indexOf(p.id) < 0; }), freeT = theirs.filter(function (p) { return usedT.indexOf(p.id) < 0; });
      var x = null;
      if (!a.why) {
        if (!addValue) return null;
        var pool = freeM.map(function (p) { return { p: p, v: tradeValue(p, c.mode) }; }).concat(picksOf(save, d.meId).filter(function (k) { return d.giveK.indexOf(k) < 0; }).map(function (k) { return { k: k, v: pickValue(save, k) }; }));
        if (!pool.length) return null;
        var need = null, best = null;
        pool.forEach(function (o) {
          var t = { give: d.give.concat(o.p ? [o.p] : []), giveK: d.giveK.concat(o.k ? [o.k] : []), get: d.get, getK: d.getK };
          var rr = assess(save, c, t).r;
          if (rr >= 1.1 && (!need || o.v < need.v)) need = o;
          if (!best || o.v > best.v) best = o;
        });
        x = need || best;
        if (x.p) d.give.push(x.p); else d.giveK.push(x.k);
        continue;
      }
      if (a.why === 'themRoster' || a.why === 'meMin') x = lowest(freeT);
      else if (a.why === 'meRoster' || a.why === 'themMin') x = lowest(freeM);
      else if (a.why === 'meCap') {
        var needOut = (a.inMe - c.cap * 0.0006) / 1.25 - a.outMe;
        x = lowest(freeM, function (p) { return p.salary >= needOut; }) || freeM.slice().sort(function (p, q) { return q.salary - p.salary; })[0];
      } else if (a.why === 'themCap') {
        var needIn = (a.outMe - c.cap * 0.0006) / 1.25 - a.inMe;
        x = lowest(freeT, function (p) { return p.salary >= needIn; }) || freeT.slice().sort(function (p, q) { return q.salary - p.salary; })[0];
      }
      if (!x) return null;
      if (a.why === 'themRoster' || a.why === 'meMin' || a.why === 'themCap') d.get.push(x); else d.give.push(x);
    }
    return null;
  }
  /* Drop anything that is no longer needed, most valuable first, as long as the deal still works. */
  function prune(save, c, d, keepGet) {
    function tryDrop(list, isKeep) {
      list.slice().sort(function (a, b) { return (b.salary !== undefined ? tradeValue(b) : pickValue(save, b)) - (a.salary !== undefined ? tradeValue(a) : pickValue(save, a)); }).forEach(function (x) {
        if (isKeep && isKeep(x)) return;
        var i = list.indexOf(x); list.splice(i, 1);
        if (!assess(save, c, d).ok) list.splice(i, 0, x);
      });
    }
    tryDrop(d.give); tryDrop(d.giveK);
    tryDrop(d.get, function (p) { return keepGet.indexOf(p.id) >= 0; });
  }
  function dealKey(d) { return d.give.map(function (p) { return p.id; }).sort().join(',') + '|' + d.giveK.map(function (k) { return k.y + k.r + k.o; }).sort().join(','); }
  function subsets(n, maxK, fn, topN) {
    var i, j, k, t = topN || n;
    for (i = 0; i < n; i++) fn([i]);
    if (maxK >= 2) for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) fn([i, j]);
    if (maxK >= 3) for (i = 0; i < t; i++) for (j = i + 1; j < t; j++) for (k = j + 1; k < t; k++) fn([i, j, k]);
  }
  /* I put players and picks on the block; every club says the best thing it would give back, salary fillers included. */
  function findOffers(save, meId, give, giveK, max) {
    var out = [];
    save.ids.forEach(function (tid) {
      if (tid === meId) return;
      var c = tctx(save, meId, tid, max), mine = rosterOf(save, meId), theirs = rosterOf(save, tid);
      var A = theirs.map(function (p) { return { p: p, v: tradeValue(p) }; }).concat(picksOf(save, tid).map(function (k) { return { k: k, v: pickValue(save, k) }; }));
      var best = null;
      A.sort(function (a, b) { return b.v - a.v; });
      subsets(A.length, 3, function (ix) {
        var d = { meId: meId, give: give.slice(), giveK: giveK.slice(), get: [], getK: [] }, nv = 0;
        ix.forEach(function (i) { if (A[i].p) d.get.push(A[i].p); else d.getK.push(A[i].k); nv += A[i].v; });
        var a0 = assess(save, c, d);
        if (a0.r < 1.1) return;
        if (!complete(save, c, d, mine, theirs, false)) return;
        if (!best || nv > best.nv) best = { tid: tid, give: d.give, giveK: d.giveK, get: d.get, getK: d.getK, nv: nv };
      }, 8);
      if (best) out.push(best);
    });
    return out.sort(function (a, b) { return b.nv - a.nv; });
  }
  /* I ask for players and picks; a club says up to three packages from my side it would take, extra players on both sides if needed. */
  function findPackages(save, meId, themId, wantP, wantK, max, limit) {
    var c = tctx(save, meId, themId, max), mine = rosterOf(save, meId), theirs = rosterOf(save, themId), found = {}, list = [];
    var keepGet = wantP.map(function (p) { return p.id; });
    var A = mine.map(function (p) { return { p: p, v: tradeValue(p) }; }).concat(picksOf(save, meId).map(function (k) { return { k: k, v: pickValue(save, k) }; }));
    function add(d) {
      var key = dealKey(d); if (found[key]) return; found[key] = 1;
      var cost = sum(d.give, function (p) { return tradeValue(p); }) + sum(d.giveK, function (k) { return pickValue(save, k); });
      var lead = d.give.concat(d.giveK).sort(function (a, b) { return (b.salary !== undefined ? tradeValue(b) : pickValue(save, b)) - (a.salary !== undefined ? tradeValue(a) : pickValue(save, a)); })[0];
      list.push({ give: d.give, giveK: d.giveK, get: d.get, getK: d.getK, cost: cost, lead: lead ? (lead.id || lead.y + '-' + lead.r) : '' });
    }
    function fresh(give, giveK) { return { meId: meId, give: give, giveK: giveK, get: wantP.slice(), getK: wantK.slice() }; }
    subsets(A.length, 3, function (ix) {
      var g = [], gk = [];
      ix.forEach(function (i) { if (A[i].p) g.push(A[i].p); else gk.push(A[i].k); });
      var d = fresh(g, gk);
      if (assess(save, c, d).r < 1.1) return;
      if (complete(save, c, d, mine, theirs, false)) add(d);
    });
    if (list.length < (limit || 3)) {
      // big asks: build up from my best assets, adding players, picks and fillers on both sides
      var seeds = A.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 6);
      seeds.forEach(function (sd) {
        var d = fresh(sd.p ? [sd.p] : [], sd.k ? [sd.k] : []);
        if (complete(save, c, d, mine, theirs, true)) { prune(save, c, d, keepGet); add(d); }
      });
    }
    list.sort(function (a, b) { return a.cost - b.cost; });
    var pick = [], leads = {};
    function sub(a, b) { return a.give.every(function (p) { return b.give.indexOf(p) >= 0; }) && a.giveK.every(function (k) { return b.giveK.indexOf(k) >= 0; }); }
    list.forEach(function (f) {
      if (pick.length >= (limit || 3) || leads[f.lead] || pick.some(function (q) { return sub(q, f); })) return;
      leads[f.lead] = 1; pick.push(f);
    });
    list.forEach(function (f) {
      if (pick.length >= (limit || 3) || pick.indexOf(f) >= 0 || pick.some(function (q) { return sub(q, f); })) return;
      pick.push(f);
    });
    return pick;
  }

  /* ---------- injuries ---------- */
  function healthy(save, id) {
    var all = rosterOf(save, id), ok = all.filter(function (p) { return !(p.inj > 0); });
    return ok.length >= 5 ? ok : all;
  }
  /* Each player who took the floor has a small chance of getting hurt; sturdier players less so. */
  function rollInjuries(save, lines, teamId, mul) {
    var hurt = [];
    lines.forEach(function (ln) {
      if (!(ln.s.pos > 0)) return;
      var p = byId(save, ln.id);
      if (!p || p.inj > 0) return;
      var dur = p.ratings.dur || 60;
      if (Math.random() < 0.0055 * (mul || 1) * (1.6 - dur / 100)) {
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
    for (var y = save.year + 1; y <= save.year + 4; y++) {
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
    return base * (1.5 - wp) * (soon ? 1 : k.y >= save.year + 3 ? 0.65 : 0.8);
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
        var fa = freeAgents(save).filter(function (p) { return p.ratings.ovr >= 45 && canSign(save, t.id, salaryFor(p.ratings.ovr)); })[0];
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
      var fa = freeAgents(save).filter(function (q) { return canSign(save, myId, salaryFor(q.ratings.ovr)); })[0];
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
    tradeValue: tradeValue, clubMode: clubMode, shopReason: shopReason, canSign: canSign, realContracts: realContracts, starsOf: starsOf, starsVal: starsVal, franchise: franchise, tune: tune, formCheck: formCheck, potFor: potFor, evaluateTrade: evaluateTrade, findOffers: findOffers, findPackages: findPackages, executeTrade: executeTrade, suggestAdd: suggestAdd,
    init: init, openingRosters: openingRosters, active: active, rosterOf: rosterOf, rightsOf: rightsOf, signRights: signRights, payroll: payroll, deadOf: deadOf, byId: byId, accumulate: accumulate, leaders: leaders,
    progress: progress, ask: ask, expiring: expiring, newSeasonContracts: newSeasonContracts, sign: sign, release: release,
    aiReSign: aiReSign, freeAgents: freeAgents, aiRosterPass: aiRosterPass, startDraft: startDraft, draftAvailable: draftAvailable,
    makePick: makePick, startDispersal: startDispersal, makeVeterans: makeVeterans, aiPick: aiPick, salaryFor: salaryFor, capFor: capFor, setEra: setEra, money: money, draftRounds: draftRounds, MIN_ROSTER: MIN_ROSTER, MAX_ROSTER: MAX_ROSTER, ovrOf: ovrOf
  };
})(window);
