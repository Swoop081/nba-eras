/* NBA Eras coaching staff: a head coach plus an offensive and a defensive assistant for every club (2026-27 saves only).
   Coaches carry four ratings: off, def, dev (grows young players), mot (motivation and leadership).
   Staff shift every player's skill ratings a few percent, so a good staff is worth roughly a few wins. */
(function (root) {
  'use strict';
  var FIRST = ['Marcus', 'Daryl', 'Terrence', 'Gordon', 'Hector', 'Wesley', 'Andre', 'Curtis', 'Victor', 'Elliot', 'Raymond', 'Samir', 'Julian', 'Lamar', 'Desmond', 'Corey', 'Mateo', 'Ivan', 'Theo', 'Warren', 'Reggie', 'Calvin', 'Nate', 'Brent', 'Omar', 'Felix', 'Dominic', 'Jerome', 'Stuart', 'Nico'];
  var LAST = ['Whitfield', 'Okafor', 'Delgado', 'Brennan', 'Castellano', 'Hargrove', 'Mbeki', 'Lindqvist', 'Rourke', 'Tanaka', 'Valdez', 'Prescott', 'Abernathy', 'Sorensen', 'Ibarra', 'Calloway', 'Fitzgerald', 'Nakamura', 'Duarte', 'Holloway', 'Kowalski', 'Mercer', 'Adeyemi', 'Lockhart', 'Navarro', 'Pemberton', 'Strand', 'Villanueva', 'Whitaker', 'Yoon'];
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, Math.round(v))); }
  function slug(n) { return n.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  /* before 1990 the unnamed assistants carry the names of their day */
  var FIRST70 = ['Frank', 'Bill', 'Jim', 'Bob', 'Tom', 'Dick', 'Ray', 'Walt', 'Don', 'Gene', 'Hal', 'Lou', 'Ed', 'Jack', 'Larry', 'Al', 'Joe', 'Ken', 'Mike', 'Red', 'Sam', 'Vern', 'Bud', 'Chuck', 'Norm', 'Pete', 'Stan', 'Wayne', 'Dave', 'Marv'];
  var LAST70 = ['Kowalski', 'Mahoney', 'Delaney', 'Ferraro', 'Hutchins', 'Lombardi', 'Brannigan', 'Whitaker', 'Donahue', 'Petrosky', 'Gallagher', 'Sorensen', 'Maddox', 'Rizzo', 'Calloway', 'Tarkanian', 'Bellamy', 'Novak', 'Hargrove', 'McAllister', 'Prescott', 'Santoro', 'Jankowski', 'Fitzgerald', 'Teague', 'Wilkerson', 'Albright', 'Costello', 'Dunbar', 'Pruitt'];
  var YEAR = 2026;
  function made(r, role, tag) {
    var old = YEAR < 1990, F = old ? FIRST70 : FIRST, Lz = old ? LAST70 : LAST;
    var n = F[Math.floor(r() * F.length)] + ' ' + Lz[Math.floor(r() * Lz.length)];
    var o = role === 'ao', d = role === 'ad', hc = role === 'hc';
    var c = { id: slug(n) + '-' + tag, n: n, age: 38 + Math.floor(r() * 24), role: role,
      off: clamp(58 + (r() - 0.5) * 26 + (hc ? 4 : 0), 30, 90), def: clamp(58 + (r() - 0.5) * 26 + (hc ? 4 : 0),30, 90),
      dev: clamp(56 + (r() - 0.5) * 30, 30, 90), mot: clamp(58 + (r() - 0.5) * 28, 30, 90) };
    return c;
  }
  /* a real assistant: a name, or [name, wiki, off, def, dev, mot]; unrated ones get stable estimates */
  function real_(x, tid) {
    var row = typeof x === 'string' ? [x] : x, r = rng(hash(row[0] + tid));
    function v(i, base) { return typeof row[i] === 'number' ? row[i] : clamp(base + (r() - 0.5) * 20, 35, 82); }
    return { id: slug(row[0]), n: row[0], wiki: row[1] || row[0].replace(/ /g, '_'), age: 48, role: 'ao', real: 1, off: v(2, 58), def: v(3, 58), dev: v(4, 58), mot: v(5, 58) };
  }
  function build(save, data, teamIds) {
    YEAR = save.year;
    var st = {}, extra = [];
    teamIds.forEach(function (id) {
      var r = rng(hash(id + 'staff')), row = data && data.hc && data.hc[id], s = {};
      if (row) s.hc = { id: slug(row[0]), n: row[0], wiki: row[1], age: 52, role: 'hc', real: 1, off: row[2], def: row[3], dev: row[4], mot: row[5] };
      else s.hc = made(r, 'hc', id.slice(0, 3));
      var list = (data && data.asst && data.asst[id]) || [];
      if (!list.length) { var lg = [data && data.ao && data.ao[id], data && data.ad && data.ad[id]].filter(Boolean); list = lg; }
      var real = list.map(function (x) { return real_(x, id); });
      s.ao = real[0] || made(r, 'ao', id.slice(0, 3) + 'o');
      s.ad = real[1] || made(r, 'ad', id.slice(0, 3) + 'd');
      s.ao.role = 'ao'; s.ad.role = 'ad';
      real.slice(2).forEach(function (c) { extra.push(c); });
      st[id] = s;
    });
    var pr = rng(hash('pool' + save.year)), pool = [];
    for (var i = 0; i < 18; i++) pool.push(made(pr, i % 3 === 0 ? 'hc' : i % 3 === 1 ? 'ao' : 'ad', 'f' + i));
    extra.forEach(function (c) { c.role = 'ao'; });
    save.coach = { staff: st, pool: extra.concat(pool), since: {} };
  }
  function staff(save, id) { return save.coach && save.coach.staff[id]; }
  function score(c) { return c ? (c.off + c.def + c.dev + c.mot) / 4 : 50; }

  var OFFK = ['sco', 'sht', 'tpt', 'ft', 'ply', 'tov'], DEFK = ['stl', 'blk', 'drb', 'orb', 'fou'];
  /* how much the staff lifts or drags the team's offensive and defensive ratings (a fraction, e.g. 0.02 = 2%) */
  function bonus(save, id, trust) {
    var s = staff(save, id); if (!s) return null;
    var hc = s.hc || { off: 50, def: 50, mot: 50 }, ao = s.ao || { off: 50 }, ad = s.ad || { def: 50 };
    var k = trust === undefined ? 1 : 0.5 + Math.max(0, Math.min(100, trust)) / 100;
    var m = ((hc.mot || 50) - 60) / 100 * 0.03;
    var ao_ = ((ao.off || 50) + (ad.off || 50)) / 2, ad_ = ((ao.def || 50) + (ad.def || 50)) / 2;
    return { off: ((0.5 * hc.off + 0.5 * ao_ - 60) / 100 * 0.08 + m) * k, def: ((0.5 * hc.def + 0.5 * ad_ - 60) / 100 * 0.08 + m) * k };
  }
  function apply(save, id, players, trust) {
    var b = bonus(save, id, trust); if (!b) return players;
    return players.map(function (p) {
      var r = {};
      Object.keys(p.ratings).forEach(function (k) {
        var f = OFFK.indexOf(k) >= 0 ? 1 + b.off : DEFK.indexOf(k) >= 0 ? 1 + b.def : 1;
        r[k] = (k === 'ovr' || k === 'dur') ? p.ratings[k] : Math.min(99, p.ratings[k] * f);
      });
      return Object.assign({}, p, { ratings: r });
    });
  }
  /* extra growth points for young players from a good developer */
  function devBonus(save, id) {
    var s = staff(save, id); if (!s || !s.hc) return 0;
    var d = 0.6 * s.hc.dev + 0.4 * ((s.ao ? s.ao.dev : 55) + (s.ad ? s.ad.dev : 55)) / 2;
    return (d - 60) / 60;
  }

  function leadership(p) {
    var r = p.ratings, yrs = (p.ovrHist || []).length;
    return 0.34 * (r.ply || 50) + 0.24 * (r.tov || 50) + 0.14 * (r.fou || 50) + 0.14 * Math.min(100, yrs * 7 + 20) + 0.14 * Math.min(100, (p.peakOvr || r.ovr) + 20);
  }
  /* a retired player with the head for it joins the coaching pool */
  function fromRetired(save, p) {
    if (!save.coach) return null;
    var L = leadership(p), r = p.ratings;
    if (L < 62 || (p.age || 30) > 44) return null;
    var c = { id: slug(p.name) + '-c', pid: p.id, n: p.name, age: p.age || 36, role: 'ao', ex: 1,
      off: clamp(38 + (r.sco + r.sht + r.ply) / 3 * 0.4 + (L - 60) * 0.5, 30, 88), def: clamp(38 + (r.stl + r.blk + r.drb) / 3 * 0.4 + (L - 60) * 0.5, 30, 88),
      dev: clamp(40 + (L - 55) * 1.1, 30, 90), mot: clamp(45 + (L - 55) * 1.3, 30, 92) };
    save.coach.pool.push(c);
    return c;
  }
  function bestFor(pool, role) {
    var key = role !== 'hc' ? function (c) { return (c.off + c.def) * 0.7 + c.dev * 0.3 + c.mot * 0.3; } : function (c) { return score(c) + c.mot * 0.2; };
    return pool.slice().sort(function (a, b) { return key(b) - key(a); })[0];
  }
  function fire(save, teamId, role) {
    var s = staff(save, teamId); if (!s || !s[role]) return null;
    var c = s[role]; s[role] = null; c.age = c.age || 50; save.coach.pool.push(c); return c;
  }
  function hire(save, teamId, role, c) {
    var s = staff(save, teamId); if (!s) return false;
    var i = save.coach.pool.indexOf(c); if (i < 0) return false;
    save.coach.pool.splice(i, 1);
    if (s[role]) save.coach.pool.push(s[role]);
    c.role = role; s[role] = c; save.coach.since[teamId + role] = save.year; return true;
  }
  function teamName(id) { return id.split('-').map(function (w) { return w[0].toUpperCase() + w.slice(1); }).join(' '); }
  function sack(save, id, why) {
    var C = save.coach, out = fire(save, id, 'hc');
    if (!out) return false;
    var nw = bestFor(C.pool.filter(function (c) { return c !== out; }), 'hc');
    if (nw) hire(save, id, 'hc', nw);
    var f = C.fy && C.fy.y === save.year ? C.fy : (C.fy = { y: save.year, n: 0 }); f.n++;
    C.since[id + 'hcd'] = (save.year * 1000) + (save.day || 0);
    if (root.League && root.League.wire) root.League.wire(save, teamName(id) + ' ' + (why || 'fire') + ' head coach ' + out.n + (nw ? ' and name ' + nw.n + ' to replace him.' : '.'));
    return true;
  }
  /* In-season: AI clubs that badly underperform their roster, or sink far below .500, can fire the head coach. About a third of the league's yearly changes happen mid-season. */
  function inSeason(save, myId, strength) {
    if (!save.coach || save.phase !== 'regular') return;
    var C = save.coach, f = C.fy && C.fy.y === save.year ? C.fy : (C.fy = { y: save.year, n: 0 });
    if (f.n >= 4) return;
    var now = save.year * 1000 + (save.day || 0);
    Object.keys(C.staff).forEach(function (id) {
      if (id === myId || !C.staff[id].hc || f.n >= 4) return;
      var r = save.rec && save.rec[id]; if (!r) return;
      var g = r.w + r.l; if (g < 20) return;
      if (C.since[id + 'hcd'] && now - C.since[id + 'hcd'] < 60) return;
      var wp = r.w / g, exp = strength && strength[id] !== undefined ? strength[id] : 0.5;
      var gap = exp - wp, pressure = (wp < 0.3 ? 0.5 : wp < 0.38 ? 0.25 : 0) + Math.max(0, gap - 0.12) * 2;
      if (pressure > 0 && Math.random() < 0.012 * pressure * 4) sack(save, id, wp < 0.3 ? 'fire' : 'part ways with');
    });
  }
  /* after each season: ages, small rating drift, AI clubs fire weak head coaches and refill empty chairs */
  function offseason(save, myId, rec) {
    if (!save.coach) return;
    var C = save.coach, news = [];
    function drift(c) { c.age = (c.age || 50) + 1; ['off', 'def', 'dev', 'mot'].forEach(function (k) { c[k] = clamp(c[k] + (Math.random() - 0.5) * 4 + (c.age < 45 ? 0.6 : c.age > 62 ? -0.8 : 0), 25, 95); }); }
    Object.keys(C.staff).forEach(function (id) { ['hc', 'ao', 'ad'].forEach(function (r) { if (C.staff[id][r]) drift(C.staff[id][r]); }); });
    C.pool.forEach(drift);
    C.pool = C.pool.filter(function (c) { return c.age < 66 && !(c.age > 58 && Math.random() < 0.3); });
    var recOf = rec || {};
    Object.keys(C.staff).forEach(function (id) {
      if (id === myId) return;
      var s = C.staff[id], r = recOf[id], wp = r && r.w + r.l ? r.w / (r.w + r.l) : 0.5;
      var fy = C.fy && C.fy.y === save.year ? C.fy.n : 0;
      if (s.hc && fy < 8 && Math.random() < (wp < 0.3 ? 0.4 : wp < 0.4 ? 0.2 : wp < 0.5 ? 0.04 : 0.01)) {
        var out = fire(save, id, 'hc'), nw = bestFor(C.pool.filter(function (c) { return c !== out; }), 'hc');
        if (!C.fy || C.fy.y !== save.year) C.fy = { y: save.year, n: 0 }; C.fy.n++;
        if (nw) { hire(save, id, 'hc', nw); if (root.League && root.League.wire) root.League.wire(save, id.split('-').map(function (w) { return w[0].toUpperCase() + w.slice(1); }).join(' ') + ' part ways with ' + out.n + ' and hire ' + nw.n + ' as head coach.'); }
      }
      ['hc', 'ao', 'ad'].forEach(function (rl) { if (!s[rl]) { var b = bestFor(C.pool, rl); if (b) hire(save, id, rl, b); } });
    });
    while (C.pool.length < 14) C.pool.push(made(Math.random, ['hc', 'ao', 'ad'][C.pool.length % 3], 'n' + Math.floor(Math.random() * 99999)));
  }
  function owned(save, myId) { var s = staff(save, myId); return s ? [['hc', 'Head coach'], ['ao', 'Assistant coach'], ['ad', 'Assistant coach']].map(function (x) { return { role: x[0], label: x[1], c: s[x[0]] }; }) : []; }

  root.Coach = { build: build, staff: staff, bonus: bonus, apply: apply, devBonus: devBonus, fromRetired: fromRetired, leadership: leadership, fire: fire, hire: hire, offseason: offseason, inSeason: inSeason, sack: sack, owned: owned, bestFor: bestFor, score: score, slug: slug };
})(typeof window !== 'undefined' ? window : globalThis);
