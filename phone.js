/* The present day arrives on your phone. Banners drop in while you play: scores, insiders, fans, the group chat.
   They are flavour only; nothing here changes the save. */
(function (root) {
  var src = null, timer = null, allowed = false, last = '', lastApp = '';
  var OK = { 'screen-season': 1, 'screen-events': 1, 'screen-off': 1, 'screen-trade': 1, 'screen-roster': 1, 'screen-records': 1, 'screen-player': 1 };

  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
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
      return { app: 'Breaking', c: '#D8232A', g: '!', title: 'League Insider', text: 'Sources: the ' + (t ? t.name : 'club') + ' have been fielding calls about ' + p.name + (/\.$/.test(p.name) ? '' : '.') + ' Nothing close, per league sources.' };
    });
    var rec = recs[me];
    if (rec) outs.push(function () {
      var gp = rec.w + rec.l, hot = gp > 3 && rec.w / gp >= 0.6, cold = gp > 3 && rec.w / gp <= 0.4;
      var msg = hot ? rnd(['Bandwagon is full. Sorry, no more seats.', 'OK this team is actually good??', 'Run it back. Do not touch the roster.'])
        : cold ? rnd(['Fire everybody. Starting with the GM.', 'Is the front office even watching these games', 'Tank or trade. Pick one.'])
        : rnd(['Honestly cannot tell what this team is yet', 'Need one more shooter. Just one.', 'Defence wins. Offence sells tickets. We have neither.']);
      return { app: 'Mentions', c: '#F4511E', g: '@', title: rnd(['@section104_', '@hoopsfan88', '@upperbowl_dave', '@courtside_kay', '@lateshiftlarry']), text: msg };
    });
    outs.push(function () {
      return { app: 'Messages', c: '#34C759', g: 'C', title: 'Coach', text: rnd(['Film at 10. Bring coffee.', 'Boss, we need to talk about the second unit.', 'Starters look gassed. Thinking about a rest day.', 'Saw the tape. Their bigs hurt us on the glass.']) };
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

  function host() {
    var h = document.getElementById('phone-banners');
    if (!h) { h = document.createElement('div'); h.id = 'phone-banners'; document.body.appendChild(h); }
    return h;
  }

  function buzz(n) {
    if (!n) return;
    var h = host();
    while (h.children.length > 0) h.removeChild(h.firstChild);
    var b = document.createElement('div'); b.className = 'pb';
    var ic = document.createElement('span'); ic.className = 'pb-ic'; ic.style.background = n.c; ic.textContent = n.g;
    var tx = document.createElement('div'); tx.className = 'pb-tx';
    var top = document.createElement('small'); top.textContent = n.app.toUpperCase() + ' · now';
    var t = document.createElement('b'); t.textContent = n.title;
    var p = document.createElement('span'); p.textContent = n.text;
    tx.appendChild(top); tx.appendChild(t); tx.appendChild(p);
    b.appendChild(ic); b.appendChild(tx);
    var gone = false;
    function go() { if (gone) return; gone = true; b.classList.add('out'); setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 300); }
    b.addEventListener('click', go);
    var y0 = null;
    b.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    b.addEventListener('touchmove', function (e) { if (y0 !== null && y0 - e.touches[0].clientY > 14) go(); }, { passive: true });
    h.appendChild(b);
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
    setTimeout(go, 3600);
  }

  function one() {
    if (!allowed || !src) return;
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

  function stop() { allowed = false; clearTimeout(timer); var h = document.getElementById('phone-banners'); if (h) h.textContent = ''; }

  function onScreen(id) {
    var modern = document.body.dataset.modern === '1';
    if (!modern || !OK[id] || !src || !src.save()) { stop(); return; }
    var was = allowed;
    allowed = true;
    if (!was || id === 'screen-season') {
      setTimeout(one, 1100);
      if (id === 'screen-season') setTimeout(one, 2800);
    }
    loop();
  }

  root.Phone = { setSource: setSource, onScreen: onScreen, stop: stop, buzz: buzz };
})(window);
