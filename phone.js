/* The present day arrives on your phone. Banners drop in while you play: scores, insiders, fans, the group chat.
   Most are colour. The ones built from what is really happening to your club (a slump, a rumour, a free agent,
   a losing streak) stay pinned in the header until you answer, and what you decide comes back later. */
(function (root) {
  var src = null, timer = null, allowed = false, last = '', lastApp = '';
  var OK = { 'screen-season': 1, 'screen-events': 1, 'screen-off': 1, 'screen-trade': 1, 'screen-roster': 1, 'screen-records': 1, 'screen-player': 1 };

  var recent = [];
  function rnd(a) {
    var pool = a;
    if (a.length > 1 && typeof a[0] === 'string') { pool = a.filter(function (x) { return recent.indexOf(x) < 0; }); if (!pool.length) pool = a; }
    var v = pool[Math.floor(Math.random() * pool.length)];
    if (typeof v === 'string' && v.length > 14) { recent.push(v); if (recent.length > 140) recent.shift(); }
    return v;
  }
  function setSource(s) { src = s; }
  function nm(id) { var t = src.team(id); return t ? t.name : id; }
  function last3(name) { return String(name).split(' ').slice(-1)[0]; }

  function maker() {
    var save = src.save(); if (!save || !save.lg) return null;
    var me = save.myId, recs = save.rec || {};
    var live = save.lg.players.filter(function (p) { return p.team && p.status === 'active'; });
    var stars = live.filter(function (p) { return p.ratings.ovr >= 76; });
    var mid = live.filter(function (p) { return p.team !== me && p.ratings.ovr >= 62 && p.ratings.ovr < 78; });
    var outs = [];
    var res = (save.results || []).slice(-15);
    if (res.length) outs.push(function () {
      var r = rnd(res), hw = r.hs > r.as;
      return { app: 'Scores', c: '#34C759', g: 'F', title: 'FINAL', text: nm(hw ? r.h : r.a) + ' ' + Math.max(r.hs, r.as) + ', ' + nm(hw ? r.a : r.h) + ' ' + Math.min(r.hs, r.as) };
    });
    if (stars.length) outs.push(function () {
      var p = rnd(stars), t = src.team(p.team);
      return { app: 'Clips', c: '#8E3AF0', g: '▶', title: 'New clip', text: p.name + ' (' + (t ? t.name : '') + ') ' + rnd(['with the dunk of the night', 'hits a step-back from the logo', 'blocks it into the third row', 'has the whole arena on its feet', 'is not human right now']) };
    });
    if (mid.length) outs.push(function () {
      var p = rnd(mid), t = src.team(p.team);
      return { app: 'Breaking', c: '#D8232A', g: '!', title: lead(), text: 'Sources: the ' + (t ? t.name : 'club') + ' have been fielding calls about ' + p.name + (/\.$/.test(p.name) ? '' : '.') + ' Nothing close, per league sources.' };
    });
    var rec = recs[me];
    if (rec) outs.push(function () {
      var gp = rec.w + rec.l, hot = gp > 3 && rec.w / gp >= 0.6, cold = gp > 3 && rec.w / gp <= 0.4;
      var msg = hot ? rnd(['Bandwagon is full. Sorry, no more seats.', 'OK this team is actually good??', 'Run it back. Do not touch the roster.', 'Tell me you are not loving this group. I will wait.', 'The arena was shaking tonight.', 'Playoff basketball in November. I am not ready.'])
        : cold ? rnd(['Fire everybody. Starting with the GM.', 'Is the front office even watching these games', 'Tank or trade. Pick one.', 'I stayed for the whole game and I want a refund.', 'Somebody explain the rotations to me. Please.', 'This is not a slump, this is who they are.'])
        : rnd(['Honestly cannot tell what this team is yet', 'Need one more shooter. Just one.', 'Defence wins. Offence sells tickets. We have neither.', 'Good in spurts. Great in none. Fix the middle.', 'Feels like one move away from something real.', 'Eight and eight and I have never felt so average.']);
      return { app: 'Mentions', c: '#F4511E', g: '@', title: rnd(['@section104_', '@hoopsfan88', '@upperbowl_dave', '@courtside_kay', '@lateshiftlarry']), text: msg };
    });
    outs.push(function () {
      return { app: 'Messages', c: '#34C759', g: 'C', title: 'Coach', text: rnd(['Film at 10. Bring coffee.', 'Boss, we need to talk about the second unit.', 'Starters look gassed. Thinking about a rest day.', 'Saw the tape. Their bigs hurt us on the glass.', 'We are getting beat in transition. Need a minute with you.', 'Thinking about a smaller lineup for the next one. Thoughts?', 'Practice was sharp today. The group is listening.', 'Their guards keep getting to the rim. We can fix it.']) };
    });
    outs.push(function () {
      return { app: 'Group chat', c: '#5E5CE6', g: '★', title: 'Front office', text: rnd(['Scouting: three names worth a look before the deadline.', 'Ticket sales are up this week.', 'Owner is asking about the cap sheet again.', 'Agent for a free agent called twice. Want me to ping back?']) };
    });
    var st = null; try { st = root.Season.standings(save); } catch (e) { st = null; }
    if (st) outs.push(function () {
      var d = rnd(Object.keys(st)), row = st[d][0];
      return { app: 'Scores', c: '#34C759', g: 'F', title: d + ' standings', text: nm(row.id) + ' lead at ' + row.w + '-' + row.l + '.' };
    });
    return outs;
  }

  function handle() { return rnd(['@section104_', '@hoopsfan88', '@upperbowl_dave', '@courtside_kay', '@lateshiftlarry', '@hardwood_hank']); }

  /* posts about your own club that you can do something about */
  function actionable() {
    var save = src.save(); if (!save || !save.lg || !root.Events || save.phase !== 'regular') return null;
    var m = root.Events.mood(save);
    if (m.cool.act > 0 || save.pinned) return null;
    var me = save.myId, rec = save.rec[me] || { w: 0, l: 0 }, gp = rec.w + rec.l;
    var ros = save.lg.players.filter(function (p) { return p.team === me && p.status === 'active' && !(p.inj > 0); }).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    var stats = save.lg.stats || {}, outs = [];
    function st(p) { return stats[p.id] || { g: 0, fg: 0, fga: 0, pts: 0 }; }
    var slump = ros.slice(0, 8).filter(function (p) { var s = st(p); return s.g >= 8 && s.fga >= 60 && s.fg / s.fga < 0.39 && p.ratings.ovr >= 58 && !m.tweak[p.id]; });
    if (slump.length) outs.push(function () {
      var p = rnd(slump), s = st(p);
      return { app: 'Mentions', c: '#F4511E', g: '@', title: handle(), text: p.name + ' is ' + s.fg + '-for-' + s.fga + ' this season and still getting starter minutes. What is the front office doing?', act: { type: 'slump', pid: p.id } };
    });
    var bench = ros.slice(6, 11).filter(function (p) { var s = st(p); return s.g >= 8 && s.fga >= 40 && s.fg / s.fga >= 0.5 && !m.tweak[p.id]; });
    if (bench.length) outs.push(function () {
      var p = rnd(bench), s = st(p);
      return { app: 'Mentions', c: '#F4511E', g: '@', title: handle(), text: p.name + ' is shooting ' + Math.round(100 * s.fg / s.fga) + '% off the bench. Why is he not playing more?', act: { type: 'bench', pid: p.id } };
    });
    if (m.streak <= -3 && gp >= 6) outs.push(function () {
      return { app: 'Mentions', c: '#F4511E', g: '@', title: handle(), text: 'Another loss. ' + (-m.streak) + ' straight. Somebody has to answer for this.', act: { type: 'pressure' } };
    });
    var exp = ros.slice(0, 6).filter(function (p) { return p.yrs <= 1 && p.ratings.ovr >= 62 && !m.asked; });
    if (exp.length && gp >= 10) outs.push(function () {
      var p = rnd(exp); m.asked = true;
      return { app: 'Messages', c: '#5E5CE6', g: '\u2605', title: p.name, text: '"Boss, my contract is up soon. I want to stay. Can we talk about an extension?"', act: { type: 'extend', pid: p.id } };
    });
    if (save.owner && save.day >= save.days.length * 0.5 && !save.ownerPromise && !save.ownerNagged) {
      var pace = rec.w / Math.max(1, gp);
      if ((save.owner.k === 'title' && pace < 0.6) || (save.owner.k === 'playoffs' && pace < 0.5) || (save.owner.k === 'wins' && rec.w < save.owner.n * (gp / (save.days.length || 82)) * 0.9)) outs.push(function () {
        save.ownerNagged = true;
        return { app: 'Messages', c: '#5E5CE6', g: 'O', title: 'Owner', text: 'We are behind pace for "' + save.owner.text.toLowerCase() + '". What is the plan?', act: { type: 'owner' } };
      });
    }
    var mid = save.lg.players.filter(function (p) { return p.team && p.team !== me && p.status === 'active' && p.ratings.ovr >= 62 && p.ratings.ovr < 82; });
    if (mid.length && save.day < save.days.length * 0.7 && root.League && root.League.shopReason) {
      var cand = mid.map(function (p) { return { p: p, why: root.League.shopReason(save, p) }; }).filter(function (c) { return c.why; });
      if (cand.length) outs.push(function () {
        var c = rnd(cand), p = c.p, t = src.team(p.team);
        return { app: 'Breaking', c: '#D8232A', g: '!', title: lead(), text: 'The ' + (t ? t.name : 'club') + ' are fielding calls on ' + p.name + ' (' + (p.age || '') + ', ' + p.ratings.ovr + ' overall): ' + c.why + '.', act: { type: 'shop', pid: p.id, tid: p.team } };
      });
    }
    var cap = save.lg.cap, pay = ros.concat(save.lg.players.filter(function (p) { return p.team === me && p.inj > 0; })).reduce(function (a, p) { return a + (p.salary || 0); }, 0);
    var floor = ros[7] ? ros[7].ratings.ovr : 50;
    var fa = (root.League && root.League.freeAgents ? root.League.freeAgents(save) : []).filter(function (p) { return p.ratings.ovr >= floor + 2 && root.League.canSign(save, me, root.League.salaryFor(p.ratings.ovr)); })[0];
    if (fa && save.lg.players.filter(function (p) { return p.team === me && p.status === 'active'; }).length < 15) outs.push(function () {
      return { app: 'Messages', c: '#5E5CE6', g: '\u2605', title: 'Agent', text: fa.name + ' (' + fa.ratings.ovr + ' overall, ' + (fa.pos || '') + ') is available and wants a call back today.', act: { type: 'fa', pid: fa.id } };
    });
    return outs.length ? rnd(outs)() : null;
  }

  function lead() { return root.Social && root.Social.lead ? (root.Social.has(src.save().year) ? root.Social.lead(src.save().year) : 'League Insider') : 'League Insider'; }

  function host() {
    var h = document.getElementById('phone-banners');
    if (!h) { h = document.createElement('div'); h.id = 'phone-banners'; document.body.appendChild(h); }
    return h;
  }
  /* notifications get their own row inside the header of the screen being shown, so they never cover anything */
  function place(id) {
    var h = host(), bar = document.querySelector('#' + id + ' .bar');
    if (bar && h.parentNode !== bar) { h.textContent = ''; bar.appendChild(h); }
    h.hidden = !bar;
  }

  function social() { var s = src && src.save(); return !!(s && root.Social && root.Social.has(s.year)); }
  /* before the social-media era the same news arrives the way it did then */
  function era(n) {
    if (!n || social()) return n;
    var map = { Mentions: ['Fan mail', 'L'], Breaking: ['Wire', 'W'], Clips: ['Highlights', 'H'] }, m = map[n.app];
    if (m) { n.app = m[0]; n.g = m[1]; }
    if (n.title && n.title[0] === '@') n.title = 'A season-ticket holder';
    if (n.title === 'League Insider') n.title = 'The wire';
    return n;
  }

  function buzz(n) {
    if (!n) return;
    n = era(n);
    if (social()) { try { root.Social.fromBanner(src.save(), n); } catch (e) {} }
    var h = host();
    while (h.children.length > 0) h.removeChild(h.firstChild);
    var b = document.createElement('div'); b.className = 'pb';
    var ic = document.createElement('span'); ic.className = 'pb-ic'; ic.style.background = n.c; ic.textContent = n.g;
    var tx = document.createElement('div'); tx.className = 'pb-tx';
    var top = document.createElement('small'); top.textContent = n.app.toUpperCase() + ' · now';
    var t = document.createElement('b'); t.textContent = n.title;
    var p = document.createElement('span'); p.textContent = n.text;
    tx.appendChild(top); tx.appendChild(t); tx.appendChild(p);
    if (n.note) { var q = document.createElement('em'); q.textContent = n.note; tx.appendChild(q); }
    b.appendChild(ic); b.appendChild(tx);
    var gone = false;
    function go() { if (gone) return; gone = true; b.classList.add('out'); setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 300); }
    if (n.act) {
      b.classList.add('act');
      var tag = document.createElement('i'); tag.className = 'pb-act'; tag.textContent = 'Respond'; b.appendChild(tag);
      var sv = src.save();
      if (sv && !n.pinnedAt) { n.pinnedAt = sv.day; sv.pinned = n; if (src.persist) src.persist(); }
      b.addEventListener('click', function () {
        if (src.respond) src.respond(n, function () { var s2 = src.save(); if (s2) { s2.pinned = null; if (src.persist) src.persist(); } go(); });
      });
    } else if (n.note) {
      b.classList.add('res');
      b.addEventListener('click', go);
    } else b.addEventListener('click', go);
    var y0 = null;
    b.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    b.addEventListener('touchmove', function (e) { if (y0 !== null && y0 - e.touches[0].clientY > 14) { if (b._swipe) b._swipe(); else go(); } }, { passive: true });
    h.appendChild(b);
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
    if (!n.act) setTimeout(go, n.note ? 6500 : 3600);
    else { var t0 = b; t0._swipe = function () { var s3 = src.save(); if (s3) { s3.pinned = null; if (src.persist) src.persist(); } go(); }; }
  }

  function one() {
    if (!allowed || !src) return;
    if (document.querySelector('#phone-banners .pb.res')) return;
    var sv = src.save();
    if (sv && sv.pinned) {
      if (sv.day > (sv.pinned.pinnedAt || 0) + 8) { sv.pinned = null; if (src.persist) src.persist(); }
      else { if (!document.querySelector('#phone-banners .pb')) buzz(sv.pinned); return; }
    }
    if (sv && root.Events && root.Events.mood) {
      var mm = root.Events.mood(sv);
      if (mm.posts.length) { buzz(mm.posts.shift()); if (src.persist) src.persist(); return; }
      if (sv.phase === 'regular' && Math.random() < 0.55) {
        var a = actionable();
        if (a) { mm.cool.act = 4; buzz(a); return; }
      }
    }
    var outs = maker(); if (!outs || !outs.length) return;
    var n = null, guard = 0;
    do { n = rnd(outs)(); } while (n && (n.text === last || n.app === lastApp) && guard++ < 8);
    last = n ? n.text : ''; lastApp = n ? n.app : '';
    buzz(n);
  }

  function loop() {
    clearTimeout(timer);
    if (!allowed) return;
    timer = setTimeout(function () { one(); loop(); }, 6000 + Math.random() * 7000);
  }

  function stop() { allowed = false; clearTimeout(timer); var h = document.getElementById('phone-banners'); if (h) { h.textContent = ''; h.hidden = true; } }

  function onScreen(id) {
    var modern = document.body.dataset.modern === '1';
    if (!modern || !OK[id] || !src || !src.save()) { stop(); return; }
    var was = allowed;
    allowed = true;
    place(id);
    var sp = src.save(); if (sp && sp.pinned && !document.querySelector('#phone-banners .pb')) setTimeout(function () { if (sp.pinned && !document.querySelector('#phone-banners .pb')) buzz(sp.pinned); }, 400);
    if (!was || id === 'screen-season') {
      setTimeout(one, 1100);
      if (id === 'screen-season') setTimeout(one, 2800);
    }
    loop();
  }

  root.Phone = { setSource: setSource, onScreen: onScreen, stop: stop, buzz: buzz };
})(window);
