/* The present day arrives on your phone. Banners drop in while you play: scores, insiders, fans, the group chat.
   Most are colour. The ones built from what is really happening to your club (a slump, a rumour, a free agent,
   a losing streak) stay pinned in the header until you answer, and what you decide comes back later. */
(function (root) {
  var src = null, timer = null, allowed = false, last = '', lastApp = '';
  var OK = { 'screen-season': 1, 'screen-events': 1, 'screen-off': 1, 'screen-trade': 1, 'screen-roster': 1, 'screen-records': 1, 'screen-club': 1 };

  var recent = [], seenTexts = [];
  function rnd(a) {
    var pool = a;
    if (a.length > 1 && typeof a[0] === 'string') { pool = a.filter(function (x) { return recent.indexOf(x) < 0; }); if (!pool.length) pool = a; }
    var v = pool[Math.floor(Math.random() * pool.length)];
    if (typeof v === 'string' && v.length > 14) { recent.push(v); if (recent.length > 140) recent.shift(); }
    return v;
  }
  function setSource(s) { src = s; }
  function nm(id) { var t = src.team(id); return t ? t.name : id; }
  function last3(name) { var a = String(name).split(' ').filter(Boolean); while (a.length > 1 && /^(jr|sr|ii|iii|iv|v)\.?$/i.test(a[a.length - 1])) a.pop(); return a[a.length - 1]; }

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
    var gpAny = (save.rec && save.rec[me]) ? save.rec[me].w + save.rec[me].l : 0;
    if (stars.length && gpAny >= 1) outs.push(function () {
      var p = rnd(stars), t = src.team(p.team);
      return { app: 'Clips', c: '#8E3AF0', g: '▶', title: 'New clip', text: p.name + ' (' + (t ? t.name : '') + ') ' + rnd(['with the dunk of the night', 'hits a step-back from the logo', 'blocks it into the third row', 'has the whole arena on its feet', 'is not human right now']) };
    });
    if (mid.length) outs.push(function () {
      var p = rnd(mid), t = src.team(p.team);
      return { app: 'Breaking', c: '#D8232A', g: '!', title: lead(), text: rnd(['Sources: the ' + (t ? t.name : 'club') + ' have been fielding calls about ' + p.name + (/\.$/.test(p.name) ? '' : '.') + ' Nothing close, per league sources.', 'League sources: teams have checked in with the ' + (t ? t.name : 'club') + ' on ' + p.name + '. No talks yet.', 'Heard around the league: ' + p.name + ' is on a few shortlists. The ' + (t ? t.name : 'club') + ' are not listening yet.', 'Executives say ' + p.name + ' keeps coming up in conversations with the ' + (t ? t.name : 'club') + '. Nothing imminent.', 'The ' + (t ? t.name : 'club') + ' have fielded exploratory calls on ' + p.name + ', sources say. No deal close.', 'Rival GMs are monitoring ' + p.name + '. The ' + (t ? t.name : 'club') + ' say he is not available.']) };
    });
    var rec = recs[me], gp0 = rec ? rec.w + rec.l : 0;
    if (rec && gp0 >= 3) outs.push(function () {
      var gp = rec.w + rec.l, hot = gp > 3 && rec.w / gp >= 0.6, cold = gp > 3 && rec.w / gp <= 0.4;
      var msg = hot ? rnd(['Bandwagon is full. Sorry, no more seats.', 'OK this team is actually good??', 'Run it back. Do not touch the roster.', 'Tell me you are not loving this group. I will wait.', 'The arena was shaking tonight.', 'Playoff basketball in November. I am not ready.'])
        : cold ? rnd(['Fire everybody. Starting with the GM.', 'Is the front office even watching these games', 'Tank or trade. Pick one.', 'I stayed for the whole game and I want a refund.', 'Somebody explain the rotations to me. Please.', 'This is not a slump, this is who they are.'])
        : rnd(['Honestly cannot tell what this team is yet', 'Need one more shooter. Just one.', 'Defence wins. Offence sells tickets. We have neither.', 'Good in spurts. Great in none. Fix the middle.', 'Feels like one move away from something real.', 'Eight and eight and I have never felt so average.']);
      return { app: 'Mentions', c: '#F4511E', g: '@', title: rnd(['@section104_', '@hoopsfan88', '@upperbowl_dave', '@courtside_kay', '@lateshiftlarry']), text: msg };
    });
    outs.push(function () {
      return { app: 'Messages', c: '#34C759', g: 'C', title: 'Coach', text: rnd(gp0 < 3 ? ['Film at 10. Bring coffee.', 'Practice was sharp today. The group is listening.', 'Good energy in camp. Everyone is healthy.', 'Veterans are setting the tone. I like where we are.', 'Rookies are picking up the playbook faster than I thought.', 'Conditioning numbers came back strong. Nobody is hiding.', 'Long day, good day. We defended for two straight hours.', 'Competition for the last rotation spot is real. That is healthy.', 'Starting five is clicking in the half court.', 'Nobody asked for a day off. That tells me something.'] : ['Film at 10. Bring coffee.', 'Saw the tape. Their bigs hurt us on the glass.', 'Practice was sharp today. The group is listening.', 'Their guards keep getting to the rim. We can fix it.', 'We gave away too many easy ones. Walk-through at 9.', 'Bench unit is carrying us in the second quarter. Worth noting.', 'Closing lineups need work. Come see me.', 'The group is tired but locked in. Light day tomorrow.', 'Turnovers are the whole story this week. We clean it up.', 'Ball movement was the best it has been all year.', 'We are living at the line and they are not. Defence first.', 'Proud of how they responded after that one.', 'I want more pace. Let us talk about it in the morning.', 'Film shows we are getting open threes. They will fall.']) };
    });
    outs.push(function () {
      return { app: 'Group chat', c: '#5E5CE6', g: '★', title: 'Front office', text: rnd(gp0 >= 3 ? ['Ticket sales are up this week.', 'Merch sales are up since the last homestand.'] : ['Season ticket renewals are ahead of last year.', 'Ticket sales are steady this week.']) };
    });
    var st = null; try { st = root.Season.standings(save); } catch (e) { st = null; }
    if (st && (save.results || []).length >= 8) outs.push(function () {
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
    if (false && save.owner && save.day >= save.days.length * 0.5 && !save.ownerPromise && !save.ownerNagged) {
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
        var gmn = root.GMS && root.GMS[p.team];
        if (gmn) return { app: 'Messages', c: '#5E5CE6', g: gmn[0], title: gmn, text: rnd(['We are listening on ' + p.name + ' (' + p.ratings.ovr + ' overall): ' + c.why + '. If you want him, call me.', p.name + ' (' + p.ratings.ovr + ') is available for the right price: ' + c.why + '. Interested?', 'Between us, ' + p.name + ' could move. ' + c.why + '. Want to talk?']), act: { type: 'shop', pid: p.id, tid: p.team } };
        return { app: 'Breaking', c: '#D8232A', g: '!', title: lead(), text: 'The ' + (t ? t.name : 'club') + ' are fielding calls on ' + p.name + ' (' + (p.age || '') + ', ' + p.ratings.ovr + ' overall): ' + c.why + '.', act: { type: 'shop', pid: p.id, tid: p.team } };
      });
    }
    if (save.day < save.days.length * 0.7 && root.League && root.League.tradeValue) {
      var floor6 = ros[5] ? ros[5].ratings.ovr : 55, seenT = {}, scout = save.lg.players.filter(function (p) { return p.team && p.team !== me && p.status === 'active' && !(p.inj > 0) && p.ratings.ovr >= floor6 + 3 && p.ratings.ovr <= 80 && (p.age || 26) <= 32; })
        .sort(function (a, b) { return (b.ratings.ovr + (b.pot || 0) * 0.2) - (a.ratings.ovr + (a.pot || 0) * 0.2); }).filter(function (p) { if (seenT[p.team]) return false; seenT[p.team] = 1; return true; });
      var pickS = scout.slice(8, 40);
      if (pickS.length >= 3) outs.push(function () {
        var three = []; while (three.length < 3 && pickS.length) three.push(pickS.splice(Math.floor(Math.random() * pickS.length), 1)[0]);
        return { app: 'Group chat', c: '#5E5CE6', g: '\u2605', title: 'Front office', text: 'Scouting: three names worth a look before the deadline. ' + three.map(function (p) { var t = src.team(p.team); return p.name + ' (' + (t ? t.name : '') + ', ' + p.ratings.ovr + ')'; }).join(', ') + '.', act: { type: 'scout', pids: three.map(function (p) { return p.id; }) } };
      });
    }
    if (root.GMS && save.day < save.days.length * 0.8 && ros.length >= 3) {
      var otherT = Object.keys(root.GMS).filter(function (id) { return id !== me && src.team(id); });
      if (otherT.length) {
        outs.push(function () {
          var tid = rnd(otherT), gm = root.GMS[tid], tt = src.team(tid), mine = ros.slice(0, 6), pl = rnd(mine);
          return { app: 'Messages', c: '#5E5CE6', g: gm[0], title: gm, text: rnd(['We have always liked ' + pl.name + '. If you ever move him, ' + (tt ? tt.city : 'we') + ' would be on the phone first.', 'What would it take to get ' + pl.name + ' (' + pl.ratings.ovr + ')? Call me when you have a minute.', 'I am building around a core and ' + pl.name + ' fits. Open to a conversation?']), act: { type: 'shop', pid: pl.id, tid: tid } };
        });
        outs.push(function () {
          var tid = rnd(otherT), gm = root.GMS[tid], tt = src.team(tid);
          return { app: 'Messages', c: '#5E5CE6', g: gm[0], title: gm, text: rnd(['Our scouts are high on this year\u2019s draft class. I would talk pick swaps if you are open.', 'Draft board is getting clearer. If you want to move a pick, ' + (tt ? tt.city : 'we') + ' will listen.', 'Quiet around the league, but I am working the phones before the deadline. You should too.']), act: { type: 'shop', pid: null, tid: tid } };
        });
      }
    }
    var cap = save.lg.cap, pay = ros.concat(save.lg.players.filter(function (p) { return p.team === me && p.inj > 0; })).reduce(function (a, p) { return a + (p.salary || 0); }, 0);
    var floor = ros[7] ? ros[7].ratings.ovr : 50;
    var fa = (root.League && root.League.freeAgents ? root.League.freeAgents(save) : []).filter(function (p) { return p.ratings.ovr >= floor + 2 && root.League.canSign(save, me, root.League.salaryFor(p.ratings.ovr)); })[0];
    if (fa && save.lg.players.filter(function (p) { return p.team === me && p.status === 'active'; }).length < 15) outs.push(function () {
      return { app: 'Messages', c: '#5E5CE6', g: '\u2605', title: 'Agent', text: fa.name + ' (' + fa.ratings.ovr + ' overall, ' + (fa.pos || '') + ') is available and wants a call back today.', act: { type: 'fa', pid: fa.id } };
    });
    var CT = [
      { k: 'unit', text: 'Boss, we need to talk about the second unit. They are giving games away.' },
      { k: 'rest', text: 'The starters look gassed. I want to rest a few of them. Your call.' },
      { k: 'glass', text: 'Their bigs keep beating us on the glass. I want to change how we play it. Got a minute?' },
      { k: 'fast', text: 'We are getting beat in transition. I need to talk about our floor balance.' },
      { k: 'small', text: 'I am thinking about going smaller for a stretch. Thoughts?' }
    ];
    if (gp >= 3 && !(save.coachTalked && save.day - save.coachTalked < 14)) outs.push(function () {
      save.coachTalked = save.day || 1; var c = rnd(CT), s = save.coach && save.coach.staff[me], hc = s && s.hc;
      return { app: 'Messages', c: '#34C759', g: 'C', title: hc ? hc.n : 'Coach', text: c.text, act: { type: 'coach', topic: c.k } };
    });
    var payNow = save.lg.players.filter(function (p) { return p.team === me && p.status === 'active'; }).reduce(function (a, p) { return a + (p.salary || 0); }, 0);
    if (false && gp >= 4 && !(save.ownerTalked && save.day - save.ownerTalked < 30) && payNow > cap * 1.05) outs.push(function () {
      save.ownerTalked = save.day || 1;
      return { app: 'Messages', c: '#5E5CE6', g: 'O', title: 'Owner', text: 'Payroll is ' + root.League.money(payNow, cap) + ' and the cap is ' + root.League.money(cap, cap) + '. I want to talk about it.', act: { type: 'ownercap' } };
    });
    /* never repeat a line the player has recently seen */
    var seen = seenTexts, pick = null;
    for (var tries = 0; outs.length && tries < 25; tries++) {
      var c = rnd(outs)();
      if (c && seen.indexOf(c.text) < 0) { pick = c; break; }
      if (!pick && c) pick = c;
    }
    if (pick && seen.indexOf(pick.text) >= 0) return null;
    if (pick) { seen.push(pick.text); if (seen.length > 40) seen.shift(); }
    return pick;
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
    if (n.title === 'ESPN Insider') { ic.textContent = ''; ic.classList.add('photo'); }
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
