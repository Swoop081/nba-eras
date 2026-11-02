(function () {
  'use strict';

  var body = document.body;

  /* ---------- tiny helpers ---------- */
  var store = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem('nbaEras.' + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('nbaEras.' + k, JSON.stringify(v)); } catch (e) {}
    }
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- screens ---------- */
  var screens = document.querySelectorAll('.screen');
  /* The present day is painted in your club's colours. */
  function lum(hex) {
    var h = String(hex || '#888').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
    var c = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function teamTheme() {
    var st = document.body.style;
    var t = null;
    if (document.body.dataset.modern === '1') { try { t = save ? teamById(save.myId) : (typeof selected !== 'undefined' ? selected : null); } catch (e) { t = null; } }
    if (!t || !t.colors) { ['--team', '--team2', '--on'].forEach(function (k) { st.removeProperty(k); }); return; }
    var a = t.colors[0], b = t.colors[1] || '#FFFFFF';
    // very dark team colours (Nets, Spurs) would vanish on a dark page, so lift to the second colour
    if (lum(a) < 0.04) { var tmp = a; a = lum(b) > 0.04 ? b : '#8E93A3'; b = tmp; }
    st.setProperty('--team', a); st.setProperty('--team2', b);
    st.setProperty('--on', lum(a) > 0.32 ? '#0A0B10' : '#FFFFFF');
  }
  function show(id) {
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    if (typeof Phone !== 'undefined' && Phone.onScreen) Phone.onScreen(id);
    teamTheme();
    var target = document.getElementById(id);
    target.classList.add('active');
    target.scrollTop = 0;
    body.dataset.screen = id;
    if (id !== 'screen-title') { body.classList.remove('flicker'); if (body.dataset.menu !== 'show') finishIntro(); }
    pageifyScreen(id);
  }

  var backs = document.querySelectorAll('[data-back]');
  for (var b = 0; b < backs.length; b++) {
    backs[b].addEventListener('click', function (e) {
      show(e.currentTarget.getAttribute('data-back'));
    });
  }

  /* ---------- settings ---------- */
  var eraFilterBox = document.getElementById('era-filter');
  var introBox = document.getElementById('intro-anim');

  function applyEraFilter(on) {
    body.dataset.eraFilter = on ? 'on' : 'off';
  }
  eraFilterBox.checked = store.get('eraFilter', true);
  introBox.checked = store.get('intro', true);
  applyEraFilter(eraFilterBox.checked);

  /* The vintage black-and-white look belongs to the old eras; the present day is always in colour. */
  function eraLook(era) { applyEraFilter(era && era.current ? false : eraFilterBox.checked); body.dataset.modern = era && era.current ? '1' : '0'; if (!(era && era.current)) Phone.stop(); }
  function modernUI() { return body.dataset.modern === '1'; }
  body.dataset.modern = '1'; applyEraFilter(false);
  eraFilterBox.addEventListener('change', function () {
    store.set('eraFilter', eraFilterBox.checked);
    eraLook(currentEra);
  });
  introBox.addEventListener('change', function () {
    store.set('intro', introBox.checked);
  });

  /* ---------- logo fallback ---------- */
  var logo = document.getElementById('logo');
  var wordmark = document.getElementById('wordmark');
  function useWordmark() {
    logo.hidden = true;
    wordmark.hidden = false;
  }
  logo.addEventListener('error', useWordmark);
  if (logo.complete && logo.naturalWidth === 0) useWordmark();

  /* ---------- grain ---------- */
  var canvas = document.getElementById('grain');
  var ctx = canvas.getContext('2d');
  var gw = 0, gh = 0, lastGrain = 0;

  function sizeGrain() {
    gw = Math.ceil(window.innerWidth / 3);
    gh = Math.ceil(window.innerHeight / 3);
    canvas.width = gw;
    canvas.height = gh;
  }
  function drawGrain(t) {
    window.requestAnimationFrame(drawGrain);
    if (t - lastGrain < 70) return;
    lastGrain = t;
    var level = parseFloat(getComputedStyle(body).getPropertyValue('--grain')) || 0;
    if (level === 0) return;
    var img = ctx.createImageData(gw, gh);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = Math.random() > 0.5 ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = Math.random() * 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  sizeGrain();
  window.addEventListener('resize', sizeGrain);
  window.requestAnimationFrame(drawGrain);

  /* ---------- intro: modern -> 90s TV -> black and white ---------- */
  var timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function setPhase(p) { body.dataset.phase = p; }
  var flickT = null;
  function flick() {
    if (body.dataset.screen !== 'screen-title') return;
    body.classList.add('flicker');
    clearTimeout(flickT);
    flickT = setTimeout(function () { body.classList.remove('flicker'); }, 700);
  }
  function finishIntro() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
    clearTimeout(flickT);
    body.classList.remove('flicker');
    setPhase('modern');
    body.dataset.menu = 'show';
  }
  function playIntro() {
    if (reduceMotion || !store.get('intro', true)) {
      finishIntro();
      return;
    }
    body.dataset.menu = 'hide';
    setPhase('modern');
    later(flick, 2200);
    later(function () { setPhase('nineties'); }, 2550);
    later(flick, 5000);
    later(function () { setPhase('bw'); }, 5350);
    // after the black and white, one more flicker and back to the colour start screen, where it stays
    later(flick, 6700);
    later(function () { setPhase('modern'); }, 7050);
    later(function () { body.dataset.menu = 'show'; }, 7500);
  }

  document.getElementById('screen-title').addEventListener('click', function () {
    if (body.dataset.menu !== 'show') finishIntro();
  });

  /* ---------- title menu ---------- */
  document.getElementById('btn-new').addEventListener('click', function () {
    show('screen-era');
  });
  document.getElementById('btn-settings').addEventListener('click', function () {
    show('screen-settings');
  });

  /* ---------- era select ---------- */
  var ERAS = [
    { id: '1946', years: '1946-47', title: 'The Founding Season', blurb: 'The Basketball Association of America, the league the NBA counts as its first. 11 teams, 60 games, no shot clock and a $55,000 team salary cap.', open: true, teams: 'data/teams-1946.json', players: 'data/players-1946.json' },
    { id: '1946s2', years: '1947-48', title: 'Season Two', blurb: 'Start on opening night of 1947-48. The real 1946-47 season is on the record, four clubs have folded and the Baltimore Bullets have joined. See who improved and who declined.', open: true, second: true, teams: 'data/teams-1946.json', players: 'data/players-1946.json' },
    { years: '1950s-60s', title: 'The Shot Clock Era', blurb: 'Locked for now' },
    { years: '1970s', title: 'The Colour TV Era', blurb: 'Locked for now' },
    { years: '1980s', title: 'The Cable Era', blurb: 'Locked for now' },
    { years: '1990s-2000s', title: 'The Multimedia Era', blurb: 'Locked for now' },
    { id: '2026', years: '2026-27', title: 'The Present Day', blurb: 'Opening night of the current NBA season. 30 teams, 82 games, the three-point line, a 16-team playoff and a salary cap. Real rosters; build forward from here.', open: true, current: true, teams: 'data/teams-2026.json', players: 'data/players-2026.json' },
    { id: '2025', logo: '2026', years: '2025-26', title: 'Last Season', blurb: 'Opening night of 2025-26, one year back. Real rosters as they were.', open: true, current: true, teams: 'data/teams-2025.json', players: 'data/players-2025.json' }
  ];

  /* Every season back to 1951-52, built from the real box scores: opening night, real rosters, the league as it stood. */
  (function () {
    var CH = { 1950: 'Royals', 1951: 'Lakers', 1952: 'Lakers', 1953: 'Lakers', 1954: 'Nationals', 1955: 'Warriors', 1956: 'Celtics', 1957: 'Hawks', 1958: 'Celtics', 1959: 'Celtics', 1960: 'Celtics',
      1961: 'Celtics', 1962: 'Celtics', 1963: 'Celtics', 1964: 'Celtics', 1965: 'Celtics', 1966: '76ers', 1967: 'Celtics', 1968: 'Celtics', 1969: 'Knicks', 1970: 'Bucks', 1971: 'Lakers', 1972: 'Knicks',
      1973: 'Celtics', 1974: 'Warriors', 1975: 'Celtics', 1976: 'Trail Blazers', 1977: 'Bullets', 1978: 'SuperSonics', 1979: 'Lakers', 1980: 'Celtics', 1981: 'Lakers', 1982: '76ers', 1983: 'Celtics', 1984: 'Lakers', 1985: 'Celtics', 1986: 'Lakers', 1987: 'Lakers', 1988: 'Pistons', 1989: 'Pistons', 1990: 'Bulls', 1991: 'Bulls', 1992: 'Bulls', 1993: 'Rockets', 1994: 'Rockets', 1995: 'Bulls', 1996: 'Bulls', 1997: 'Bulls', 1998: 'Spurs', 1999: 'Lakers', 2000: 'Lakers', 2001: 'Lakers', 2002: 'Spurs', 2003: 'Pistons', 2004: 'Spurs', 2005: 'Heat', 2006: 'Spurs',
      2007: 'Celtics', 2008: 'Lakers', 2009: 'Lakers', 2010: 'Mavericks', 2011: 'Heat', 2012: 'Heat', 2013: 'Spurs', 2014: 'Warriors', 2015: 'Cavaliers', 2016: 'Warriors', 2017: 'Warriors',
      2018: 'Raptors', 2019: 'Lakers', 2020: 'Bucks', 2021: 'Warriors', 2022: 'Nuggets', 2023: 'Celtics' };
    for (var y = 2024; y >= 1951; y--) {
      var yrs = y + '-' + String((y + 1) % 100).replace(/^(\d)$/, '0$1');
      ERAS.push({ id: String(y), logo: '2026', years: yrs, title: 'Defending: ' + CH[y - 1], blurb: 'Opening night, real rosters as they were.', open: true, current: true, teams: 'data/teams-' + y + '.json', players: 'data/players-' + y + '.json' });
    }
  })();

  var eraList = document.getElementById('era-list');
  var eraBlurbs = {};
  var eraDecade = '2020';
  var decTabs = el('div', 'dec-tabs');
  eraList.parentNode.insertBefore(decTabs, eraList);
  function eraBlurb(era) { return eraBlurbs[era.id] && era.id !== '2026' ? eraBlurbs[era.id] : era.blurb; }
  function buildEraList() {
    eraList.textContent = '';
    ERAS.filter(function (era) { return era.current && String(Math.floor(+era.id / 10) * 10) === eraDecade; }).forEach(function (era) {
      var card = el('button', 'card era');
      card.type = 'button';
      card.appendChild(el('span', 'year', era.years));
      var text = el('span');
      text.appendChild(el('strong', null, era.title));
      text.appendChild(el('span', 'meta', eraBlurb(era)));
      card.appendChild(text);
      card.addEventListener('click', function () { openTeams(era); });
      eraList.appendChild(card);
    });
  }
  (function () {
    var decs = [];
    ERAS.forEach(function (era) { if (era.current) { var d = String(Math.floor(+era.id / 10) * 10); if (decs.indexOf(d) < 0) decs.push(d); } });
    decs.forEach(function (d) {
      var b = el('button', d === eraDecade ? 'on' : '', d + 's');
      b.type = 'button';
      b.addEventListener('click', function () {
        eraDecade = d;
        Array.prototype.forEach.call(decTabs.children, function (x) { x.classList.toggle('on', x === b); });
        buildEraList();
      });
      decTabs.appendChild(b);
    });
    buildEraList();
    fetch('data/era-blurbs.json').then(function (r) { return r.json(); }).then(function (j) { eraBlurbs = j; buildEraList(); }).catch(function () {});
  })();

  /* ---------- team select ---------- */
  var teamList = document.getElementById('team-list');
  var teamSub = document.getElementById('team-sub');
  var dock = document.getElementById('team-dock');
  var takeBtn = document.getElementById('btn-take');
  var selected = null;
  var currentEra = null;
  var seasons = {};

  function ordinal(n) {
    return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th';
  }
  function initials(team) {
    var words = team.city.replace('.', '').split(' ');
    if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
    return team.city.slice(0, 2).toUpperCase();
  }
  function luminance(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var bl = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  }
  /* An original placeholder crest in the team's colours (a roundel with a
     monogram), shown until a real logo file is added. */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text) n.textContent = text;
    return n;
  }
  function crest(team, big) {
    var main = team.colors[0];
    var trim = team.colors[1];
    var svg = svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
    svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 48, fill: main, stroke: trim, 'stroke-width': 4 }));
    svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 39, fill: 'none', stroke: trim, 'stroke-width': 1.6 }));
    var letters = svgEl('text', {
      x: 50, y: big ? 60 : 62, 'text-anchor': 'middle', fill: trim,
      'font-family': 'Georgia, "Times New Roman", serif', 'font-weight': 700,
      'font-size': big ? 28 : 34
    }, initials(team));
    svg.appendChild(letters);
    if (big) {
      var pathId = 'arc-' + team.id;
      var defs = svgEl('defs', {});
      defs.appendChild(svgEl('path', { id: pathId, d: 'M 17 50 A 33 33 0 0 1 83 50', fill: 'none' }));
      svg.appendChild(defs);
      var arc = svgEl('text', {
        fill: trim, 'font-family': 'Georgia, "Times New Roman", serif', 'font-weight': 700,
        'font-size': 8.5, 'letter-spacing': 1.2, 'text-anchor': 'middle'
      });
      var tp = svgEl('textPath', { href: '#' + pathId, startOffset: '50%' }, team.city.toUpperCase());
      arc.appendChild(tp);
      svg.appendChild(arc);
      svg.appendChild(svgEl('text', {
        x: 50, y: 78, 'text-anchor': 'middle', fill: trim,
        'font-family': 'Georgia, "Times New Roman", serif', 'font-size': 8, 'letter-spacing': 1.5
      }, team.name.toUpperCase().slice(0, 12)));
    }
    return svg;
  }
  function makeBadge(team, big) {
    var badge = el('span', 'badge' + (big ? ' big' : ''));
    badge.style.background = 'transparent';
    badge.style.borderColor = 'transparent';
    badge.setAttribute('aria-hidden', 'true');
    badge.appendChild(crest(team, big));
    applyLogo(badge, team);
    return badge;
  }

  /* Looks for assets/logos/<team-id>-<era>.png or .svg first (for example
     chicago-stags-1946.png), then assets/logos/<team-id>.png or .svg.
     If none exists the coloured initials badge stays. */
  function applyLogo(badge, team) {
    var base = 'assets/logos/' + team.id;
    var era = currentEra ? (currentEra.logo || currentEra.id.replace(/s\d+$/, '')) : '';
    var urls = [];
    if (era) urls.push(base + '-' + era + '.png', base + '-' + era + '.svg');
    // the generic file may be a vintage logo, so the present day only uses a file made for it
    if (!(currentEra && currentEra.current)) urls.push(base + '.png', base + '.svg');
    // private use: the present day can show the NBA's own logo straight from its CDN
    if (currentEra && currentEra.current && team.nbaId) urls.push('https://cdn.nba.com/logos/nba/' + team.nbaId + '/primary/L/logo.svg');
    var i = 0;
    var img = new Image();
    img.alt = '';
    img.onload = function () {
      badge.textContent = '';
      badge.style.background = 'transparent';
      badge.style.borderColor = 'transparent';
      badge.classList.add('has-logo');
      badge.appendChild(img);
    };
    img.onerror = function () { next(); };
    function next() {
      if (i < urls.length) img.src = urls[i++];
    }
    next();
  }

  /* The present day: franchises are swipeable cards, East and West, no endless list. */
  function renderRails(data) {
    teamList.textContent = '';
    teamList.className = 'rails';
    var ranked = data.teams.slice().sort(function (a, b) { return b.rating - a.rating; });
    ranked.forEach(function (t, i) { t.rank = i + 1; });
    var count = el('span', 'rail-count');
    var rail = el('div', 'rail');
    var cardEls = [];
    function pick(card, team) {
      selected = team;
      teamTheme();
      takeBtn.textContent = 'Take over the ' + team.city + ' ' + team.name;
      dock.hidden = false;
      var idx = cardEls.indexOf(card);
      count.textContent = (idx + 1) + ' of ' + cardEls.length;
    }
    function build() {
      rail.textContent = '';
      cardEls = [];
      var list = data.teams.slice().sort(function (a, b) { return a.city < b.city ? -1 : 1; });
      list.forEach(function (team) {
        var c = el('article', 'fcard');
        c.style.setProperty('--c', team.colors ? team.colors[0] : '#888');
        var top = el('div', 'fc-top');
        top.appendChild(makeBadge(team, false));
        applyLogo(top.firstChild, team);
        var right = el('div', 'fc-right');
        var nm = el('div', 'fc-name');
        nm.appendChild(el('small', null, team.city));
        var nb = el('b', null, team.name);
        nb.style.fontSize = Math.min(46, Math.floor(122 / (team.name.length * 0.46))) + 'px';
        nm.appendChild(nb);
        right.appendChild(nm);
        var stats = el('div', 'fc-stats');
        [['Rating', String(team.rating)], [currentEra && (currentEra.current || currentEra.second) ? 'Last year' : 'Record', team.isNew ? '\u2013' : (team.w || 0) + '-' + (team.l || 0)], ['Avg age', team.avgAge.toFixed(1)]].forEach(function (x) {
          var d = el('div');
          d.appendChild(el('small', null, x[0]));
          d.appendChild(el('b', null, x[1]));
          stats.appendChild(d);
        });
        right.appendChild(stats);
        top.appendChild(right);
        c.appendChild(top);
        var out = team.rank <= 6 ? 'Contender' : team.rank <= 14 ? 'Playoff team' : team.rank <= 22 ? 'On the bubble' : 'Rebuilding';
        var ol = el('div', 'fc-out', out);
        c.appendChild(ol);
        var trio = el('div', 'fc-trio');
        team.top.forEach(function (p, i) {
          var cell = el('div', 'fc-p' + (i === 0 ? ' lead' : ''));
          cell.appendChild(makeAvatar(p));
          cell.appendChild(el('b', null, String(p.ovr)));
          cell.appendChild(el('span', null, lastName(p.name)));
          cell.appendChild(el('small', null, (p.pos || '') + ' \u00B7 ' + (p.age || '')));
          var ss = el('div', 'fc-ps');
          (p.best || []).forEach(function (x) { var q = el('div'); q.appendChild(el('b', null, x[1])); q.appendChild(el('small', null, x[0])); ss.appendChild(q); });
          cell.appendChild(ss);
          trio.appendChild(cell);
        });
        c.appendChild(trio);
        c._team = team;
        rail.appendChild(c);
        cardEls.push(c);
      });
      rail.scrollLeft = 0;
      if (cardEls.length) pick(cardEls[0], cardEls[0]._team);
    }
    var tick = null;
    rail.addEventListener('scroll', function () {
      clearTimeout(tick);
      tick = setTimeout(function () {
        var mid = rail.scrollLeft + rail.clientWidth / 2, best = null, bd = 1e9;
        cardEls.forEach(function (c) { var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = c; } });
        if (best && best._team !== selected) pick(best, best._team);
      }, 60);
    });
    var head = el('div', 'rail-head');
    head.appendChild(count);
    teamList.appendChild(head);
    teamList.appendChild(rail);
    build();
  }

  /* each player's three headline numbers: points first, then the two per-game areas he ranks highest in around the league */
  function bestStatsIndex(list) {
    var pool = list.filter(function (p) { return p.prev && p.prev.mpg >= 18 && p.prev.g >= 20; });
    var defs = [['RPG', 'trb', 1], ['APG', 'ast', 1], ['SPG', 'stl', 1], ['BPG', 'blk', 1]];
    var sorted = {};
    defs.forEach(function (d) { sorted[d[1]] = pool.map(function (p) { return p.prev[d[1]] || 0; }).sort(function (a, b) { return a - b; }); });
    var byId = {};
    list.forEach(function (p) { if (p.prev) byId[p.id] = p; });
    function pct(key, v) { var a = sorted[key], lo = 0; while (lo < a.length && a[lo] < v) lo++; return a.length ? lo / a.length : 0; }
    return function (p) {
      var q = byId[p.id]; if (!q) return fallbackBest(p);
      var v = q.prev, out = [['PPG', v.pts.toFixed(1)]];
      var cand = defs.map(function (d) { var raw = v[d[2] === 1 ? d[1] : d[1]]; return { l: d[0], k: d[1], raw: raw || 0, s: pct(d[1], raw || 0), m: d[2] }; });
      cand.sort(function (a, b) { return b.s - a.s; });
      cand.slice(0, 2).forEach(function (c) { out.push([c.l, c.m === 100 ? (c.raw * (c.raw < 1.5 ? 100 : 1)).toFixed(1).replace(/\.0$/, '') + '' : c.raw.toFixed(1)]); });
      return out;
    };
  }
  function fallbackBest(p) { return [['OVR', String(p.ratings ? p.ratings.ovr : p.ovr)]]; }
  function renderTeams(data) {
    if (data.current) { renderRails(data); return; }
    teamList.className = 'list';
    teamList.textContent = '';
    data.divisions.forEach(function (div) {
      var teams = data.teams.filter(function (t) { return t.division === div; });
      if (data.current) teams.sort(function (a, c) { return a.city < c.city ? -1 : a.city > c.city ? 1 : a.name < c.name ? -1 : 1; });
      else teams.sort(function (a, c) { return c.w - a.w; });
      teamList.appendChild(el('p', 'group-title', div + (data.current ? ' conference' : ' division')));
      teams.forEach(function (team) {
        var rank = 1;
        teams.forEach(function (o) { if (o.w > team.w) rank++; });
        var card = el('button', 'card team');
        card.type = 'button';
        if (team.colors) card.style.setProperty('--c', team.colors[0]);
        card.appendChild(makeBadge(team, false));
        var text = el('span');
        text.appendChild(el('strong', null, team.city + ' ' + team.name));
        if (data.current) text.appendChild(el('span', 'meta', team.note || ''));
        else text.appendChild(el('span', 'meta', team.isNew ? 'New club this season' : (data.second ? 'Last season: ' : 'In history: ') + team.w + '-' + team.l + (data.second ? '' : ', ' + ordinal(rank) + ' in the ' + div)));
        if (data.current) { /* no history to show on opening night */ }
        else if (team.id === data.champion) text.appendChild(el('span', 'tag', data.second ? 'Reigning champions' : 'Won the first title'));
        else if (team.id === data.runnerUp) text.appendChild(el('span', 'tag', 'Lost the final'));
        card.appendChild(text);
        card.addEventListener('click', function () {
          var all = teamList.querySelectorAll('.card');
          for (var i = 0; i < all.length; i++) all[i].classList.remove('selected');
          card.classList.add('selected');
          selected = team;
          teamTheme();
          takeBtn.textContent = 'Take over the ' + team.city + ' ' + team.name;
          dock.hidden = false;
        });
        teamList.appendChild(card);
      });
    });
  }

  /* Opening night of the second season, built from the real first season: history is recorded, clubs fold and join, rosters are rebuilt. */
  function buildSeasonTwo(cb, fail) {
    var base = ERAS.filter(function (e) { return e.id === '1946'; })[0];
    Promise.all([fetch(base.teams).then(function (r) { return r.json(); }), fetch(base.players).then(function (r) { return r.json(); }), fetch('data/draft-1947.json').then(function (r) { return r.ok ? r.json() : { prospects: [] }; }).catch(function () { return { prospects: [] }; })])
      .then(function (res) {
        var data = res[0], pl = res[1], draft = res[2];
        seasons['1946'] = data; seasons['1946s2'] = data;
        playersByEra['1946'] = pl;
        var keep = currentEra; currentEra = base;
        building = true;
        try {
          var tmp = 'philadelphia-warriors';
          save = Season.create('1946', 1946, data.teams, tmp, 60);
          League.init(save, pl.players, data.teams);
          ensureTm();
          data.teams.forEach(function (t) { save.rec[t.id] = { w: t.w, l: t.l }; });
          save.lg.players.forEach(function (p) {
            if (p.g > 0) save.lg.stats[p.id] = { g: p.g, min: 0, pts: p.pts || 0, ast: p.ast || 0, trb: 0, stl: 0, blk: 0, tov: 0, pf: p.pf || 0, fg: p.fg || 0, fga: p.fga || 0, ft: p.ft || 0, fta: p.fta || 0 };
          });
          save.phase = 'done'; save.champion = data.champion;
          startOffseason(true);
          // only facts we know stay as honours: the title and the scoring and assist leaders
          save.lg.players.forEach(function (p) {
            if (p.awards) p.awards = p.awards.filter(function (x) { return x.a !== 'Most Valuable Player' && x.a.indexOf('All-League') < 0; });
          });
          save.lg.history.forEach(function (h) { h.mvp = null; });
          save.lg.players.forEach(function (p) { (p.career || []).forEach(function (c) { c.real = true; }); });
          applyFates();
          save.myId = null;
          var d = save.lg.draft;
          function finishPool() {
            d.pool.forEach(function (p) {
              if (p.status !== 'prospect') return;
              p.status = 'active'; p.team = null; p.salary = League.salaryFor(p.ratings.ovr); p.yrs = 1;
              if (!League.byId(save, p.id)) save.lg.players.push(p);
            });
          }
          while (d && d.at < d.picks.length) League.aiPick(save);
          if (d) finishPool();
          var teams = save.ids.map(teamById);
          League.aiReSign(save, teams, null);
          League.startDraft(save, teams, draft.prospects, 5);
          d = save.lg.draft;
          while (d.at < d.picks.length) League.aiPick(save);
          finishPool();
          League.aiRosterPass(save, teams, null);
          League.openingRosters(save.lg, teams);
          save.off = null;
        } catch (e) { building = false; currentEra = keep; if (fail) fail(e); return; }
        building = false; currentEra = keep;
        cb(save);
      }).catch(function (e) { if (fail) fail(e); });
  }
  var s2 = null;

  function openTeams(era) {
    if (era.second) {
      currentEra = era; selected = null; dock.hidden = true;
      teamSub.textContent = era.years;
      show('screen-team');
      teamList.textContent = 'Building the 1947-48 league: ageing the players, folding four clubs, running the dispersal and the draft...';
      buildSeasonTwo(function (sv) {
        s2 = sv;
        var data = {
          divisions: ['Eastern', 'Western'], second: true, champion: seasons['1946'].champion, runnerUp: seasons['1946'].runnerUp,
          teams: sv.ids.map(function (id) { var t = Object.assign({}, sv.tm[id]); var old = seasons['1946'].teams.filter(function (x) { return x.id === id; })[0]; t.w = old ? old.w : 0; t.l = old ? old.l : 0; t.isNew = !old; return t; })
        };
        teamSub.textContent = era.years + ' \u00B7 ' + data.teams.length + ' teams';
        renderTeams(data);
      }, function () { teamList.textContent = 'Could not build the league. Open the game from its web address, not as a local file.'; });
      return;
    }
    currentEra = era;
    eraLook(era);
    selected = null;
    dock.hidden = true;
    teamSub.textContent = era.years;
    show('screen-team');
    if (era.current) {
      teamList.textContent = 'Loading the league...';
      Promise.all([fetch(era.teams).then(function (r) { return r.json(); }), new Promise(function (ok) { loadPlayers(ok); }), (era.id === '2026' ? fetch('data/players-2025.json').then(function (r) { return r.json(); }).catch(function () { return { players: [] }; }) : Promise.resolve({ players: [] }))])
        .then(function (res) {
          var data = res[0], pl = res[1], real = bestStatsIndex(era.id === '2026' ? res[2].players : pl.players);
          data.current = true;
          data.teams.forEach(function (t) {
            var list = pl.players.filter(function (p) { return p.teamId === t.id; }).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
            t.top = list.slice(0, 3).map(function (p) { return { id: p.id, name: p.name, pos: p.pos, age: p.age, ovr: p.ratings.ovr, best: real(p) }; });
            var eight = list.slice(0, 8);
            t.rating = eight.length ? Math.round(eight.reduce(function (a, p) { return a + p.ratings.ovr; }, 0) / eight.length) : 0;
            t.avgAge = eight.length ? Math.round(10 * eight.reduce(function (a, p) { return a + (p.age || 26); }, 0) / eight.length) / 10 : 0;
            t.young = list.filter(function (p) { return (p.age || 26) <= 23 && p.ratings.ovr >= 60; }).length;
            t.note = list.length ? list[0].name + ' (' + list[0].ratings.ovr + ')' + (list[1] ? ', ' + list[1].name + ' (' + list[1].ratings.ovr + ')' : '') : '';
          });
          seasons[era.id] = data;
          teamSub.textContent = era.years + ' \u00B7 ' + data.teams.length + ' teams';
          renderTeams(data);
        })
        .catch(function () { teamList.textContent = 'Could not load the league data. Open the game from its web address, not as a local file.'; });
      return;
    }
    if (seasons[era.id]) {
      teamSub.textContent = era.years + ' · ' + seasons[era.id].teams.length + ' teams';
      renderTeams(seasons[era.id]);
      return;
    }
    teamList.textContent = 'Loading teams...';
    fetch(era.teams)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        seasons[era.id] = data;
        teamSub.textContent = era.years + ' · ' + data.teams.length + ' teams';
        renderTeams(data);
      })
      .catch(function () {
        teamList.textContent = 'Could not load the team data. Open the game from its web address, not as a local file.';
      });
  }

  takeBtn.addEventListener('click', function () {
    if (!selected) return;
    var holder = document.getElementById('ready-badge');
    holder.textContent = '';
    holder.style.background = 'transparent';
    holder.style.borderColor = 'transparent';
    holder.appendChild(crest(selected, true));
    applyLogo(holder, selected);
    document.getElementById('ready-name').textContent = selected.city + ' ' + selected.name;
    document.getElementById('ready-line').textContent = currentEra.current
      ? 'Opening night of ' + currentEra.years + ' is next.'
      : currentEra.second
      ? (selected.isNew ? 'A brand new club for the 1947-48 season. Opening night is next.' : 'Last season this club went ' + selected.w + '-' + selected.l + '. Opening night of 1947-48 is next.')
      : 'In real history this team went ' + selected.w + '-' + selected.l + '. What will you do differently?';
    store.set('team', selected.id);
    if (currentEra.second || currentEra.current) { var ob = document.getElementById('fates-box'); if (ob) ob.parentNode.removeChild(ob); } else buildFatesBox();
    show('screen-ready');
  });

  /* ---------- roster ---------- */
  var playersByEra = {};
  function loadPlayers(cb) {
    var era = currentEra;
    if (playersByEra[era.id]) { cb(playersByEra[era.id]); return; }
    fetch(era.players)
      .then(function (r) {
        if (!r.ok) throw new Error('missing');
        return r.json();
      })
      .then(function (d) { playersByEra[era.id] = d; cb(d); })
      .catch(function () { cb(null); });
  }

  function playerInitials(name) {
    var parts = name.split(' ');
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function level(v) { return v >= 75 ? 'hi' : v >= 55 ? 'mid' : 'lo'; }

  var COACHDATA = null;
  /* jersey numbers: real ones for this season, and every club's retired numbers kept off the floor */
  (function () {
    var nums = {}, ret = {};
    function wire() { League.setNumbers(nums, function (t) { return ret[FRANCHISE[t] || t] || []; }); }
    wire();
    fetch('data/jersey-numbers-2026.json').then(function (r) { return r.json(); }).then(function (d) { var m = {}; Object.keys(d).forEach(function (t) { m[t] = {}; Object.keys(d[t]).forEach(function (n) { m[t][League.normName(n)] = d[t][n]; }); }); nums = m; wire(); return fetch('data/jersey-numbers-extra.json'); }).then(function (r) { return r.json(); }).then(function (d) { Object.keys(d).forEach(function (t) { nums[t] = nums[t] || {}; Object.keys(d[t]).forEach(function (n) { nums[t][League.normName(n)] = d[t][n]; }); }); wire(); }).catch(function () {});
    fetch('data/franchise-history.json').then(function (r) { return r.json(); }).then(function (d) { Object.keys(d).forEach(function (t) { ret[t] = d[t].retired.filter(function (x) { return /^(00|\d{1,2})$/.test(x.n); }).map(function (x) { return x.n; }); }); wire(); }).catch(function () {});
  })();
  fetch('data/coaches-2026.json').then(function (r) { return r.json(); }).then(function (d) { COACHDATA = d; }).catch(function () {});
  var NBAIDS = {};
  fetch('data/nba-ids.json').then(function (r) { return r.json(); }).then(function (d) { NBAIDS = Object.assign(d, NBAIDS); }).catch(function () {});
  fetch('data/nba-ids-extra.json').then(function (r) { return r.json(); }).then(function (d) { NBAIDS = Object.assign(NBAIDS, d); }).catch(function () {});
  fetch('data/era-params.json').then(function (r) { return r.json(); }).then(function (d) { Engine.register(d); }).catch(function () {});

  /* Uses assets/players/<player-id>.jpg (or .png / .webp) when present; assets/photos works too. */
  function makeAvatar(p) {
    var wrap = el('span', 'avatar');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.appendChild(el('span', null, playerInitials(p.name)));
    var exts = [];
    ['players', 'photos', 'coaches'].forEach(function (d) { ['webp', 'png', 'jpg'].forEach(function (e) { exts.push(d + '/' + p.id + '.' + e); }); });
    var i = 0;
    var img = new Image();
    img.onload = function () { wrap.textContent = ''; wrap.appendChild(img); };
    img.onerror = function () { next(); };
    function next() {
      if (i < exts.length) img.src = 'assets/' + exts[i++];
      else if (i === exts.length && NBAIDS[p.id]) { i++; img.src = 'https://cdn.nba.com/headshots/nba/latest/1040x760/' + NBAIDS[p.id] + '.png'; }
    }
    next();
    return wrap;
  }

  function ratingRow(label, value) {
    var row = el('div', 'bar-row');
    row.appendChild(el('span', null, label));
    var track = el('span', 'track');
    var fill = el('span', 'fill ' + level(value));
    fill.style.width = value + '%';
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', 'num', String(value)));
    return row;
  }

  /* ---------- player profile ---------- */
  var PV = null;
  var PTABS = ['Overview', 'Season', 'Game log', 'Shooting', 'Ratings', 'Career', 'Contract', 'Injuries', 'Awards'];
  var RGROUPS = [
    ['Offence', [['Scoring', 'sco'], ['Shooting', 'sht'], ['Free throws', 'ft'], ['Three-pointers', 'tpt'], ['Playmaking', 'ply'], ['Ball security', 'tov'], ['Off. rebounding', 'orb']]],
    ['Defence', [['Def. rebounding', 'drb'], ['Steals', 'stl'], ['Blocks', 'blk'], ['Discipline', 'fou']]],
    ['Physical', [['Durability', 'dur']]]
  ];
  function pctS(a, b) { return b ? (100 * a / b).toFixed(1) + '%' : '–'; }
  function f1(a, g) { return g ? (a / g).toFixed(1) : '–'; }
  function statsOf(p) {
    var x = save.lg.stats[p.id];
    if (x && x.g) return { src: 'season', label: seasonLabel(save.year), x: x };
    if (p.g) return { src: 'last', label: 'last season', x: { g: p.g, pts: p.pts || 0, ast: p.ast || 0, fg: p.fg || 0, fga: p.fga || 0, ft: p.ft || 0, fta: p.fta || 0, pf: p.pf || 0 } };
    return null;
  }
  /* PTS / REB / AST, then the two things this player is best at */
  function statBoxes(x) {
    var g = x.g || 1, out = [['PTS', f1(x.pts, x.g)]];
    if (x.trb !== undefined && (x.trb > 0 || x.src !== 'last')) out.push(['REB', f1(x.trb, x.g)]);
    out.push(['AST', f1(x.ast, x.g)]);
    var c = [];
    if (x.stl > 0) c.push({ s: (x.stl / g) / 1.3, b: ['STL', f1(x.stl, x.g)] });
    if (x.blk > 0) c.push({ s: (x.blk / g) / 1.2, b: ['BLK', f1(x.blk, x.g)] });
    if (x.fga / g >= 3) c.push({ s: (x.fg / x.fga) / 0.5, b: ['FG%', pctS(x.fg, x.fga)] });
    if (x.tpa / g >= 2) c.push({ s: (x.tp / x.tpa) / 0.37, b: ['3P%', pctS(x.tp, x.tpa)] });
    if (x.fta / g >= 2) c.push({ s: (x.ft / x.fta) / 0.82, b: ['FT%', pctS(x.ft, x.fta)] });
    if ((x.tp || 0) / g >= 2.2) c.push({ s: ((x.tp || 0) / g) / 2.4, b: ['3PM', f1(x.tp, x.g)] });
    if (x.trb / g >= 9 || x.ast / g >= 7) c.push({ s: 0.5, b: ['FG%', pctS(x.fg, x.fga)] });
    c.sort(function (a, b) { return b.s - a.s; });
    var seen = {};
    c.forEach(function (k) { if (out.length < 5 && !seen[k.b[0]]) { seen[k.b[0]] = 1; out.push(k.b); } });
    while (out.length < 4) out.push(['FG%', pctS(x.fg, x.fga)]);
    return out;
  }
  function leagueAvg() {
    var t = { fg: 0, fga: 0, ft: 0, fta: 0, pts: 0 }, st = save.lg.stats;
    Object.keys(st).forEach(function (id) { ['fg', 'fga', 'ft', 'fta', 'pts'].forEach(function (k) { t[k] += st[id][k] || 0; }); });
    return t;
  }
  function seg(options, cur, pick) {
    var w = el('div', 'seg');
    options.forEach(function (o) {
      var b = el('button', o === cur ? 'on' : '', o);
      b.type = 'button';
      b.addEventListener('click', function () { pick(o); });
      w.appendChild(b);
    });
    return w;
  }
  function dataTable(heads, rows, meIdx) {
    var scroll = el('div', 'boxwrap'), table = el('table', 'box');
    var thead = el('thead'), hr = el('tr');
    heads.forEach(function (h) { hr.appendChild(el('th', null, h)); });
    thead.appendChild(hr); table.appendChild(thead);
    var tb = el('tbody');
    rows.forEach(function (r, i) {
      var tr = el('tr', r.cls || (i === meIdx ? 'me' : null));
      (r.cells || r).forEach(function (c) { tr.appendChild(el('td', null, String(c))); });
      tb.appendChild(tr);
    });
    table.appendChild(tb); scroll.appendChild(table);
    return scroll;
  }
  function boxes(items) {
    var g = el('div', 'kpis');
    items.forEach(function (it) {
      var b = el('div', 'kpi');
      b.appendChild(el('b', null, it[1]));
      b.appendChild(el('span', null, it[0]));
      g.appendChild(b);
    });
    return g;
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function lineChart(vals, avg, fmt, tight, unit) {
    var W = 340, H = 150, L = 30, R = 8, T = 10, B = 18;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img' });
    var hi = Math.max.apply(null, vals.concat(avg || 0)), lo = Math.min.apply(null, vals.concat(avg === undefined ? (tight ? 999 : 0) : avg, tight ? 999 : 0));
    if (tight) { lo = Math.floor(lo - 2); hi = Math.ceil(hi + 2); }
    if (hi === lo) hi = lo + 1;
    function X(i) { return L + (vals.length < 2 ? (W - L - R) / 2 : i * (W - L - R) / (vals.length - 1)); }
    function Y(v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); }
    [lo, (lo + hi) / 2, hi].forEach(function (v) {
      svg.appendChild(svgEl('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'grid' }));
      var t = svgEl('text', { x: L - 4, y: Y(v) + 3, class: 'axis', 'text-anchor': 'end' }); t.textContent = fmt ? fmt(v) : Math.round(v); svg.appendChild(t);
    });
    if (avg !== undefined) {
      svg.appendChild(svgEl('line', { x1: L, x2: W - R, y1: Y(avg), y2: Y(avg), class: 'avg' }));
    }
    svg.appendChild(svgEl('polyline', { points: vals.map(function (v, i) { return X(i) + ',' + Y(v); }).join(' '), class: 'ln' }));
    vals.forEach(function (v, i) { svg.appendChild(svgEl('circle', { cx: X(i), cy: Y(v), r: vals.length > 30 ? 1.8 : 3, class: 'dot' })); });
    var a = svgEl('text', { x: L, y: H - 4, class: 'axis' }); a.textContent = (unit || 'Game') + ' 1'; svg.appendChild(a);
    var z = svgEl('text', { x: W - R, y: H - 4, class: 'axis', 'text-anchor': 'end' }); z.textContent = (unit || 'Game') + ' ' + vals.length; svg.appendChild(z);
    return svg;
  }
  function pairBars(a, b) {
    var W = 340, H = 140, L = 24, T = 8, B = 18, n = a.length;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img' });
    var hi = Math.max.apply(null, a.concat(1)), bw = (W - L - 6) / n;
    function Y(v) { return T + (H - T - B) * (1 - v / hi); }
    [0, hi].forEach(function (v) {
      svg.appendChild(svgEl('line', { x1: L, x2: W - 6, y1: Y(v), y2: Y(v), class: 'grid' }));
      var t = svgEl('text', { x: L - 4, y: Y(v) + 3, class: 'axis', 'text-anchor': 'end' }); t.textContent = v; svg.appendChild(t);
    });
    a.forEach(function (v, i) {
      var x = L + i * bw + bw * 0.12;
      svg.appendChild(svgEl('rect', { x: x, y: Y(v), width: bw * 0.76, height: Y(0) - Y(v), class: 'bar-a' }));
      svg.appendChild(svgEl('rect', { x: x, y: Y(b[i]), width: bw * 0.76, height: Y(0) - Y(b[i]), class: 'bar-b' }));
    });
    return svg;
  }
  function legend(items) {
    var l = el('div', 'legend');
    items.forEach(function (it) { var s = el('span'); s.appendChild(el('i', it[0])); s.appendChild(document.createTextNode(it[1])); l.appendChild(s); });
    return l;
  }
  function oppName(id) { var t = teamById(id); return t ? t.city : '?'; }

  function openPlayer(p, team) {
    PV = { id: p.id, team: team, tab: 'Overview', sub: {} };
    renderPlayer();
    show('screen-player');
  }
  function renderPlayer() {
    var p = League.byId(save, PV.id), team = PV.team;
    document.getElementById('player-title').textContent = p.name;
    document.getElementById('player-sub').textContent = (p.pos || '') + (p.hgt ? ' · ' + Math.floor(p.hgt / 12) + '\'' + (p.hgt % 12) + '"' : '') + ' · age ' + (p.age || '?') + (team ? ' · ' + team.city : '');
    var tabs = document.getElementById('player-tabs');
    tabs.textContent = '';
    PTABS.forEach(function (t) {
      var b = el('button', t === PV.tab ? 'on' : '', t);
      b.type = 'button';
      b.addEventListener('click', function () { PV.tab = t; renderPlayer(); document.getElementById('screen-player').scrollTop = 0; });
      tabs.appendChild(b);
    });
    var body = document.getElementById('player-body');
    body.textContent = '';
    var head = el('div', 'stat-card phead');
    head.appendChild(makeAvatar(p));
    var tx = el('span');
    tx.appendChild(el('strong', null, money(p.salary) + ' · ' + (p.yrs <= 0 ? 'expiring' : p.yrs + (p.yrs === 1 ? ' yr' : ' yrs') + ' left')));
    tx.appendChild(starsEl(League.starsOf(save, p)));
    tx.appendChild(el('span', 'meta', 'Potential ' + p.pot + (p.inj > 0 ? ' · injured, out ' + p.inj : '')));
    head.appendChild(tx);
    head.appendChild(el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr)));
    body.appendChild(head);
    var fn = { 'Overview': pvOverview, 'Season': pvSeason, 'Game log': pvLog, 'Shooting': pvShooting, 'Ratings': pvRatings, 'Career': pvCareer, 'Contract': pvContract, 'Injuries': pvInjuries, 'Awards': pvAwards }[PV.tab];
    fn(body, p, team);
  }
  function pvSub(name, def) { return PV.sub[name] || def; }
  function pvSetSub(name, v) { PV.sub[name] = v; renderPlayer(); }

  function pvOverview(body, p, team) {
    var s = statsOf(p);
    body.appendChild(el('div', 'group-title', s ? 'Averages · ' + s.label : 'Averages'));
    if (s) {
      var x = s.x;
      body.appendChild(boxes(statBoxes(Object.assign({ src: s.src }, x))));
    } else body.appendChild(el('p', 'sub', 'No games on record yet.'));
    var x2 = save.lg.stats[p.id];
    if (x2 && x2.log && x2.log.length) {
      body.appendChild(el('div', 'group-title', 'Last five games'));
      var rows = x2.log.slice(-5).reverse().map(function (g) { return [(g[2] ? 'vs ' : 'at ') + oppName(g[1]), (g[3] > g[4] ? 'W ' : 'L ') + g[3] + '-' + g[4], g[6] + ' pts', g[7] + ' ast', g[13] + '/' + g[14] + ' FG']; });
      body.appendChild(dataTable(['Game', 'Result', 'PTS', 'AST', 'FG'], rows));
    }
    body.appendChild(el('div', 'group-title', 'Contract'));
    var cc = el('div', 'stat-card');
    cc.appendChild(el('p', 'sub', money(p.salary) + ' a year · ' + (p.yrs <= 0 ? 'expires this off-season' : p.yrs + (p.yrs === 1 ? ' year' : ' years') + ' remaining')));
    cc.appendChild(el('p', 'sub', 'Market value about ' + money(League.salaryFor(p.ratings.ovr)) + (p.draftedYear ? ' · drafted ' + p.draftedYear + (p.draftPick ? ' (pick ' + p.draftPick + ')' : '') : '')));
    body.appendChild(cc);
    if (team && team.id === save.myId) {
      var rel = el('button', 'btn ghost wide', 'Release ' + p.name);
      rel.type = 'button';
      var armed = false;
      rel.addEventListener('click', function () {
        if (League.rosterOf(save, team.id).length <= 5) { rel.textContent = 'You need at least 5 players'; return; }
        if (!armed) { armed = true; rel.textContent = 'Tap again to release ' + p.name; return; }
        League.release(save, p); persist(); renderRoster(team); show('screen-roster');
      });
      body.appendChild(rel);
    }
  }

  function pvSeason(body, p) {
    var s = statsOf(p);
    var mode = pvSub('season', 'Per game');
    body.appendChild(seg(['Per game', 'Totals', 'Per 48 min'], mode, function (o) { pvSetSub('season', o); }));
    if (!s) { body.appendChild(el('p', 'sub', 'No games on record yet.')); return; }
    var x = s.x, g = x.g, hasMin = !!x.min, full = s.src === 'season';
    function v(k) {
      var t = x[k] || 0;
      if (mode === 'Totals') return String(t);
      if (mode === 'Per game') return f1(t, g);
      return hasMin ? (t * 48 / x.min).toFixed(1) : '–';
    }
    body.appendChild(el('div', 'group-title', s.label + ' · ' + g + ' games'));
    var rows = [['Games', g]];
    if (full) rows.push(['Minutes', mode === 'Per game' ? f1(x.min, g) : mode === 'Totals' ? x.min : '48.0']);
    rows.push(['Points', v('pts')], ['Assists', v('ast')]);
    if (full) rows.push(['Rebounds', v('trb')], ['Steals', v('stl')], ['Blocks', v('blk')], ['Turnovers', v('tov')]);
    rows.push(['Fouls', v('pf')], ['FG made', v('fg')], ['FG attempts', v('fga')], ['FG%', pctS(x.fg, x.fga)], ['FT made', v('ft')], ['FT attempts', v('fta')], ['FT%', pctS(x.ft, x.fta)]);
    body.appendChild(dataTable(['Stat', mode], rows));
    if (full) {
      var lead = {};
      ['pts', 'ast'].forEach(function (k) {
        var all = League.leaders(save, k, 500, 1), idx = -1;
        all.forEach(function (r, i) { if (r.p.id === p.id) idx = i; });
        if (idx >= 0) lead[k] = idx + 1;
      });
      var bits = [];
      if (lead.pts) bits.push('#' + lead.pts + ' in the league in scoring');
      if (lead.ast) bits.push('#' + lead.ast + ' in assists');
      if (bits.length) body.appendChild(el('p', 'sub', bits.join(' · ')));
    } else body.appendChild(el('p', 'sub how', 'Last season’s real record only lists these figures. Rebounds, steals, blocks and turnovers are tracked once you play.'));
  }

  function pvLog(body, p, team) {
    var x = save.lg.stats[p.id], log = x && x.log ? x.log : [];
    var mode = pvSub('log', 'All');
    body.appendChild(seg(['All', 'Last 5', 'Home', 'Away'], mode, function (o) { pvSetSub('log', o); }));
    if (!log.length) { body.appendChild(el('p', 'sub', team && team.id === save.myId ? 'No games yet. Each game you and the league play is logged here.' : 'Game logs are kept for your own players.')); return; }
    var list = log.map(function (g, i) { return { g: g, n: i + 1 }; });
    if (mode === 'Last 5') list = list.slice(-5);
    if (mode === 'Home') list = list.filter(function (r) { return r.g[2]; });
    if (mode === 'Away') list = list.filter(function (r) { return !r.g[2]; });
    var rows = list.slice().reverse().map(function (r) {
      var g = r.g;
      return [r.n, (g[2] ? 'vs ' : 'at ') + oppName(g[1]), (g[3] > g[4] ? 'W ' : 'L ') + g[3] + '-' + g[4], g[5], g[6], g[7], g[8], g[13] + '-' + g[14], g[15] + '-' + g[16], g[12]];
    });
    var n = list.length, sum = function (i) { return list.reduce(function (a, r) { return a + r.g[i]; }, 0); };
    rows.push({ cls: 'me', cells: ['', 'Average', n ? list.filter(function (r) { return r.g[3] > r.g[4]; }).length + '-' + list.filter(function (r) { return r.g[3] < r.g[4]; }).length : '', f1(sum(5), n), f1(sum(6), n), f1(sum(7), n), f1(sum(8), n), f1(sum(13), n) + '-' + f1(sum(14), n), f1(sum(15), n) + '-' + f1(sum(16), n), f1(sum(12), n)] });
    body.appendChild(dataTable(['#', 'Opp', 'Result', 'Min', 'Pts', 'Ast', 'Reb', 'FG', 'FT', 'PF'], rows));
    var hi = list.reduce(function (m, r) { return r.g[6] > m.g[6] ? r : m; }, list[0]);
    body.appendChild(el('p', 'sub', 'Season high ' + hi.g[6] + ' points, game ' + hi.n + ' ' + (hi.g[2] ? 'vs ' : 'at ') + oppName(hi.g[1]) + '.'));
  }

  function pvShooting(body, p, team) {
    var s = statsOf(p), mode = pvSub('shoot', 'Efficiency');
    body.appendChild(seg(['Efficiency', 'Trend', 'Mix'], mode, function (o) { pvSetSub('shoot', o); }));
    if (!s) { body.appendChild(el('p', 'sub', 'No games on record yet.')); return; }
    var x = s.x, la = leagueAvg(), log = (save.lg.stats[p.id] || {}).log || [];
    if (mode === 'Efficiency') {
      var fgp = x.fga ? 100 * x.fg / x.fga : 0, ftp = x.fta ? 100 * x.ft / x.fta : 0;
      var lfg = la.fga ? 100 * la.fg / la.fga : fgp, lft = la.fta ? 100 * la.ft / la.fta : ftp;
      function cmp(label, mine, avgv, max) {
        var box = el('div', 'cmp');
        box.appendChild(el('div', 'cmp-h', label + ' · ' + mine.toFixed(1) + (avgv ? ' vs league ' + avgv.toFixed(1) : '')));
        var tr = el('span', 'track'), f = el('span', 'fill good'); f.style.width = Math.min(100, 100 * mine / max) + '%'; tr.appendChild(f);
        if (avgv) { var m = el('i', 'mark'); m.style.left = Math.min(100, 100 * avgv / max) + '%'; tr.appendChild(m); }
        box.appendChild(tr);
        return box;
      }
      body.appendChild(cmp('Field goal %', fgp, la.fga ? lfg : 0, 60));
      body.appendChild(cmp('Free throw %', ftp, la.fta ? lft : 0, 100));
      var ppS = x.fga ? x.pts / x.fga : 0, ts = (x.fga + 0.44 * x.fta) ? 100 * x.pts / (2 * (x.fga + 0.44 * x.fta)) : 0;
      body.appendChild(boxes([['Shots / game', f1(x.fga, x.g)], ['FT tries / game', f1(x.fta, x.g)], ['Pts per shot', ppS.toFixed(2)], ['True shooting', ts.toFixed(1) + '%']]));
      body.appendChild(el('p', 'sub how', 'The mark on each bar is the league average this season.'));
    } else if (mode === 'Trend') {
      if (log.length < 2) { body.appendChild(el('p', 'sub how', 'Trends appear after two games with your club.')); return; }
      body.appendChild(el('div', 'group-title', 'Points per game'));
      body.appendChild(lineChart(log.map(function (g) { return g[6]; }), x.pts / x.g));
      var roll = [];
      for (var i = 0; i < log.length; i++) {
        var a = 0, b = 0; for (var j = Math.max(0, i - 4); j <= i; j++) { a += log[j][13]; b += log[j][14]; }
        roll.push(b ? 100 * a / b : 0);
      }
      body.appendChild(el('div', 'group-title', 'FG% over the last five games'));
      body.appendChild(lineChart(roll, x.fga ? 100 * x.fg / x.fga : 0, function (v) { return Math.round(v) + '%'; }));
      body.appendChild(el('p', 'sub how', 'The dashed line is his season average.'));
    } else {
      var two = x.fg * 2, ft = x.ft, tot = two + ft || 1;
      body.appendChild(el('div', 'group-title', 'Where the points come from'));
      var bar = el('div', 'mixbar');
      var b1 = el('span', 'm1'); b1.style.width = (100 * two / tot) + '%'; b1.textContent = Math.round(100 * two / tot) + '%';
      var b2 = el('span', 'm2'); b2.style.width = (100 * ft / tot) + '%'; b2.textContent = Math.round(100 * ft / tot) + '%';
      bar.appendChild(b1); bar.appendChild(b2); body.appendChild(bar);
      body.appendChild(legend([['m1', 'Field goals'], ['m2', 'Free throws']]));
      if (log.length >= 2) {
        var last = log.slice(-12);
        body.appendChild(el('div', 'group-title', 'Shots taken and made, last ' + last.length));
        body.appendChild(pairBars(last.map(function (g) { return g[14]; }), last.map(function (g) { return g[13]; })));
        body.appendChild(legend([['ba', 'Attempts'], ['bb', 'Made']]));
      }
    }
  }

  function pvRatings(body, p) {
    var mode = pvSub('rat', 'All');
    body.appendChild(seg(['All', 'Offence', 'Defence', 'Physical'], mode, function (o) { pvSetSub('rat', o); }));
    function grp(q) { var s = q.pos || ''; return s.indexOf('G') >= 0 ? 'G' : s.indexOf('C') >= 0 ? 'C' : 'F'; }
    var pool = save.lg.players.filter(function (q) { return q.status === 'active' && grp(q) === grp(p); });
    function avg(k) { return pool.length ? pool.reduce(function (a, q) { return a + (q.ratings[k] || 0); }, 0) / pool.length : 0; }
    var r0 = ratingRow('Overall', p.ratings.ovr), r1 = ratingRow('Potential', p.pot);
    r0.className += ' wide3'; r1.className += ' wide3';
    body.appendChild(r0); body.appendChild(r1);
    RGROUPS.forEach(function (g) {
      if (mode !== 'All' && mode !== g[0]) return;
      body.appendChild(el('div', 'group-title', g[0]));
      g[1].forEach(function (r) {
        var row = ratingRow(r[0], p.ratings[r[1]]);
        row.className += ' wide3';
        if (p.prev && p.prev[r[1]] !== undefined) { var dv = p.ratings[r[1]] - p.prev[r[1]]; row.firstChild.textContent = r[0] + ' ' + (dv > 0 ? '\u25B2' + dv : dv < 0 ? '\u25BC' + Math.abs(dv) : '\u2013'); row.firstChild.className = dv > 0 ? 'up' : dv < 0 ? 'down' : ''; }
        var d = Math.round(p.ratings[r[1]] - avg(r[1]));
        row.lastChild.textContent = p.ratings[r[1]] + ' (' + (d > 0 ? '+' : '') + d + ')';
        body.appendChild(row);
      });
    });
    if (p.prev) body.appendChild(el('p', 'sub how', 'Arrows show the change since last season. Overall went from ' + p.prev.ovr + ' to ' + p.ratings.ovr + '.'));
    body.appendChild(el('p', 'sub how', 'The number in brackets is the gap to the average ' + ({ G: 'guard', F: 'forward', C: 'centre' }[grp(p)]) + ' in the league.'));
  }

  function pvContract(body, p) {
    var tm = function (id) { return id ? oppName(id) : 'Free agent'; };
    body.appendChild(el('div', 'group-title', 'Current deal'));
    body.appendChild(boxes([['Salary', money(p.salary)], ['Years left', p.yrs <= 0 ? 'Expiring' : String(p.yrs)], ['Worth', money(League.salaryFor(p.ratings.ovr))], ['Cap share', Math.round(100 * p.salary / save.lg.cap) + '%']]));
    var diff = p.salary - League.salaryFor(p.ratings.ovr);
    if (p.opt === 'player' || p.opt === 'team') body.appendChild(el('p', 'sub', (p.opt === 'player' ? 'Player option' : 'Team option') + ' in his final season.'));
    body.appendChild(el('p', 'sub', diff > 400 ? 'Paid about ' + money(diff) + ' above his market value.' : diff < -400 ? 'A bargain: ' + money(-diff) + ' below his market value.' : 'Paid close to his market value.'));
    if (p.team === save.myId) {
      var trust = Events.pm(save, p.id).t;
      body.appendChild(el('p', 'sub', 'Asking about ' + money(League.ask(save, p, trust)) + ' a year at his next contract' + (trust < 40 ? ', and he is unhappy with you.' : '.')));
    }
    var deals = (p.deals || []).slice().reverse();
    body.appendChild(el('div', 'group-title', 'Contract history'));
    if (!deals.length) { body.appendChild(el('p', 'sub', 'No contract history yet.')); return; }
    body.appendChild(dataTable(['Year', 'Club', 'Deal', 'Salary', 'Yrs'], deals.map(function (d) { return [seasonLabel(d.y), tm(d.t), d.h, money(d.s), d.n]; })));
  }

  function pvInjuries(body, p) {
    var dur = p.ratings.dur || 60, hist = p.injHist || [];
    body.appendChild(el('div', 'group-title', 'Status'));
    var cc = el('div', 'stat-card');
    cc.appendChild(el('p', 'sub', p.inj > 0 ? 'Injured. Out for ' + p.inj + (p.inj === 1 ? ' more game.' : ' more games.') : 'Healthy and available.'));
    body.appendChild(cc);
    var missed = hist.reduce(function (a, h) { return a + h.n; }, 0);
    body.appendChild(boxes([['Durability', String(dur)], ['Injuries', String(hist.length)], ['Games out', String(missed)], ['Risk', dur >= 75 ? 'Low' : dur >= 45 ? 'Average' : 'High']]));
    body.appendChild(el('div', 'group-title', 'History'));
    if (!hist.length) { body.appendChild(el('p', 'sub', 'No injuries on record.')); return; }
    body.appendChild(dataTable(['Season', 'Game', 'Out', 'Severity'], hist.slice().reverse().map(function (h) {
      return [seasonLabel(h.y), h.d ? 'day ' + h.d : '\u2013', h.n + ' games', h.n < 6 ? 'Minor' : h.n < 13 ? 'Moderate' : h.n < 30 ? 'Serious' : 'Season-threatening'];
    })));
    body.appendChild(el('p', 'sub how', 'Durability is the rating that keeps him on the floor. Lower numbers get hurt more often.'));
  }

  function pvAwards(body, p) {
    var aw = (p.awards || []).slice().reverse();
    var count = function (n) { return aw.filter(function (x) { return x.a === n; }).length; };
    body.appendChild(boxes([['Titles', String(count('League champion'))], ['MVP', String(count('Most Valuable Player'))], ['All-League', String(count('All-League First Team') + count('All-League Second Team'))], ['Leader', String(count('Scoring champion') + count('Assists leader'))]]));
    body.appendChild(el('div', 'group-title', 'Honours'));
    if (!aw.length) { body.appendChild(el('p', 'sub how', 'No honours yet. They are handed out when each season ends: MVP, scoring and assist titles, All-League teams and the championship.')); return; }
    body.appendChild(dataTable(['Season', 'Honour'], aw.map(function (x) { return [seasonLabel(x.y), x.a]; })));
  }

  function pvCareer(body, p) {
    var mode = pvSub('career', 'Per game');
    body.appendChild(seg(['Per game', 'Totals'], mode, function (o) { pvSetSub('career', o); }));
    var rows = [];
    function row(label, t, x) {
      var g = x.g;
      var f = function (k) { return mode === 'Totals' ? String(x[k] || 0) : f1(x[k] || 0, g); };
      rows.push([label, t, g, f('pts'), f('ast'), pctS(x.fg, x.fga), pctS(x.ft, x.fta)]);
    }
    if (p.g && !(p.career || []).some(function (c) { return c.real; })) row('Real 1946-47', '', { g: p.g, pts: p.pts || 0, ast: p.ast || 0, fg: p.fg || 0, fga: p.fga || 0, ft: p.ft || 0, fta: p.fta || 0 });
    (p.career || []).forEach(function (c) { row(seasonLabel(c.y), c.t ? oppName(c.t) : '', c); });
    var cur = save.lg.stats[p.id];
    if (cur && cur.g) row(seasonLabel(save.year), p.team ? oppName(p.team) : '', cur);
    if (!rows.length) { body.appendChild(el('p', 'sub', 'No seasons on record yet.')); return; }
    body.appendChild(dataTable(['Season', 'Team', 'GP', 'PTS', 'AST', 'FG%', 'FT%'], rows));
    var oh = (p.ovrHist || []).map(function (h) { return h.o; }).concat([p.ratings.ovr]);
    if (oh.length >= 2) {
      body.appendChild(el('div', 'group-title', 'Overall rating by season'));
      body.appendChild(lineChart(oh, undefined, function (v) { return Math.round(v); }, true, 'Season'));
      body.appendChild(el('p', 'sub', 'Started at ' + oh[0] + ', now ' + oh[oh.length - 1] + ' (' + (oh[oh.length - 1] - oh[0] >= 0 ? '+' : '') + (oh[oh.length - 1] - oh[0]) + ').'));
    }
    var all = { g: 0, pts: 0, ast: 0, fg: 0, fga: 0, ft: 0, fta: 0 };
    (p.career || []).forEach(function (c) { Object.keys(all).forEach(function (k) { all[k] += c[k] || 0; }); });
    if (cur && cur.g) Object.keys(all).forEach(function (k) { all[k] += cur[k] || 0; });
    if (all.g) body.appendChild(boxes([['Games', String(all.g)], ['Points', String(all.pts)], ['Assists', String(all.ast)], ['Career FG%', pctS(all.fg, all.fga)]]));
    if (p.draftedYear) body.appendChild(el('p', 'sub', 'Drafted ' + p.draftedYear + (p.draftPick ? ', pick ' + p.draftPick : '') + '.'));
  }

  function renderRoster(team) {
    var list = document.getElementById('roster-list');
    list.textContent = '';
    var bd = document.getElementById('roster-badge');
    bd.textContent = '';
    bd.appendChild(teamBadge(team));
    document.getElementById('roster-title').textContent = team.city + ' ' + team.name;
    var squad = team.id === save.myId ? rotOrder(team.id) : League.rosterOf(save, team.id).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    if (team.id === save.myId && modernUI()) {
      var starters = squad.slice(0, 5).sort(function (u, v) { return slotRank(u) - slotRank(v); });
      squad = starters.concat(squad.slice(5));
    }
    var pay = League.payroll(save, team.id);
    if (team.id === save.myId && save.phase !== 'done') {
      var fab = el('button', 'btn wide fa-open', 'Free agents \u00B7 ' + League.freeAgents(save).length); fab.type = 'button';
      fab.addEventListener('click', function () { openFAList(team); });
      var dcb = el('button', 'btn wide fa-open', 'Depth chart'); dcb.type = 'button';
      dcb.addEventListener('click', function () { openDepth(team); });
      var brow = el('div', 'roster-btns');
      brow.appendChild(dcb); brow.appendChild(fab);
      list.appendChild(brow);
    }
    document.getElementById('roster-sub').textContent = squad.length + ' players \u00B7 ' + money(pay) + ' of ' + money(save.lg.cap) + ' cap \u00B7 offence ' + offRating(team.id) + ' \u00B7 defence ' + defRating(team.id);
    squad.forEach(function (p) {
      var holder = el('div', 'player');
      var card = el('button', 'card');
      card.type = 'button';
      card.appendChild(makeAvatar(p));
      var text = el('span');
      text.appendChild(el('strong', null, (team.id === save.myId ? (modernUI() ? (squad.indexOf(p) < 5 ? '' : ordinal(squad.indexOf(p) + 1) + ' \u00B7 ') : (squad.indexOf(p) < 5 ? 'S' : '') + (squad.indexOf(p) + 1) + ' \u00B7 ') : '') + p.name));
      text.appendChild(starsEl(League.starsOf(save, p)));
      text.appendChild(el('span', 'meta', (p.no !== undefined ? '#' + p.no + ' \u00B7 ' : '') + (p.pos ? p.pos + ' \u00B7 ' : '') + (p.hgt ? Math.floor(p.hgt / 12) + '\'' + (p.hgt % 12) + '\" \u00B7 ' : '') + 'Age ' + (p.age || '?') + (p.tw ? ' \u00B7 Two-way' : '') + (isRookie(p) ? ' \u00B7 Rookie' : '')));
      if (p.inj > 0) text.appendChild(el('span', 'meta injured', 'Injured \u00B7 out ' + p.inj + (p.inj === 1 ? ' more game' : ' more games')));
      card.appendChild(text);
      card.appendChild(el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr)));
      var detail = el('button', 'detail quick');
      detail.type = 'button';
      detail.hidden = true;
      var s = statsOf(p);
      detail.appendChild(el('div', 'group-title', s ? 'Averages \u00B7 ' + s.label : 'No games yet'));
      if (s) detail.appendChild(boxes(statBoxes(Object.assign({ src: s.src }, s.x))));
      detail.appendChild(el('div', 'quick-k', money(p.salary) + ' \u00B7 ' + (p.yrs <= 0 ? 'expiring' : p.yrs + (p.yrs === 1 ? ' year' : ' years') + ' left') + ' \u00B7 potential ' + p.pot));
      if (team.id === save.myId) {
        var mv = el('div', 'dock-row');
        [['Move up', -1], ['Move down', 1]].forEach(function (m) {
          var mb = el('span', 'btn small', m[0]);
          mb.addEventListener('click', function (ev) { ev.stopPropagation(); moveRot(team, p, m[1]); });
          mv.appendChild(mb);
        });
        detail.appendChild(mv);
      }
      detail.appendChild(el('div', 'quick-go', 'Tap for full profile \u203A'));
      detail.addEventListener('click', function () { openPlayer(p, team); });
      card.addEventListener('click', function () {
        detail.hidden = !detail.hidden;
        holder.classList.toggle('open', !detail.hidden);
      });
      holder.appendChild(card);
      holder.appendChild(detail);
      list.appendChild(holder);
    });
    list.appendChild(el('p', 'sub how', 'Tap a player for his averages and contract, tap again for the full profile. Salaries are estimates except where the record is known (Joe Fulks earned $8,000).'));
  }

  /* ---------- match ---------- */
  var matchTimer = null;
  function teamBadge(team) {
    var b = makeBadge(team, false);
    applyLogo(b, team);
    return b;
  }

  /* the five starters read PG to C, then the bench in order */
  function startersFirst(lines) {
    if (!lines || lines.length < 6 || lines[0].ply === undefined) return lines;
    var f = lines.slice(0, 5).sort(function (u, v) { return slotRank({ pos: u.pos, ratings: { ply: u.ply } }) - slotRank({ pos: v.pos, ratings: { ply: v.ply } }); });
    return f.concat(lines.slice(5));
  }
  function boxTable(team, lines, cols, won) {
    var wrap = el('div');
    wrap.appendChild(el('h3', 'box-title', team.city + ' ' + team.name));
    var scroll = el('div', 'boxwrap');
    var table = el('table', 'box' + (cols.length > 9 ? ' wide' : ''));
    var thead = el('thead'), hr = el('tr');
    hr.appendChild(el('th', null, 'Player'));
    cols.forEach(function (c) { hr.appendChild(el('th', null, c.label)); });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el('tbody');
    var topPts = Math.max.apply(null, lines.map(function (l) { return l.s.pts; }));
    var totals = {};
    lines.forEach(function (l) {
      var tr = el('tr');
      tr.appendChild(el('td', null, cols.length > 9 ? l.name.split(' ')[0][0] + '. ' + lastName(l.name) : l.name));
      cols.forEach(function (c) {
        var v = c.pair ? l.s[c.pair[0]] + '-' + l.s[c.pair[1]] : String(l.s[c.key]);
        tr.appendChild(el('td', c.key === 'pts' && l.s.pts === topPts && topPts > 0 ? 'top' : null, v));
        (c.pair || [c.key]).forEach(function (k) { totals[k] = (totals[k] || 0) + l.s[k]; });
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    var tfoot = el('tfoot'), fr = el('tr');
    fr.appendChild(el('td', null, 'Team'));
    cols.forEach(function (c) {
      fr.appendChild(el('td', null, c.pair ? totals[c.pair[0]] + '-' + totals[c.pair[1]] : String(totals[c.key])));
    });
    tfoot.appendChild(fr);
    table.appendChild(tfoot);
    scroll.appendChild(table);
    wrap.appendChild(scroll);
    return wrap;
  }

  function renderMatch(me, opp, res, year, label, instant) {
    clearTimeout(matchTimer);
    var bodyEl = document.getElementById('match-body');
    var dockEl = document.getElementById('match-dock');
    bodyEl.textContent = '';
    dockEl.hidden = true;
    document.getElementById('match-title').textContent = me.city + ' vs ' + opp.city;
    document.getElementById('match-sub').textContent = label || seasonLabel(save.year);
    var nq = res.quarters.length;
    var board = el('div', 'board');
    board.style.setProperty('--qs', nq);
    var head = el('div', 'board-row head');
    head.appendChild(el('span'));
    head.appendChild(el('span'));
    res.quarters.forEach(function (q, i) { head.appendChild(el('span', 'q', i < 4 ? String(i + 1) : 'OT')); });
    head.appendChild(el('span', 'tot', 'T'));
    board.appendChild(head);
    var rows = [[me, 0, res.home], [opp, 1, res.away]].map(function (t) {
      var row = el('div', 'board-row');
      row.appendChild(teamBadge(t[0]));
      row.appendChild(el('strong', null, t[0].name));
      var cells = res.quarters.map(function () { return el('span', 'q', '·'); });
      cells.forEach(function (c) { row.appendChild(c); });
      var tot = el('span', 'tot', '0');
      row.appendChild(tot);
      board.appendChild(row);
      return { row: row, cells: cells, tot: tot, idx: t[1], final: t[2] };
    });
    bodyEl.appendChild(board);
    var running = [0, 0];
    var qi = 0;
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      rows.forEach(function (r) { r.tot.textContent = r.final; });
      var homeWon = res.home > res.away;
      rows[homeWon ? 0 : 1].row.classList.add('win');
      bodyEl.appendChild(el('p', 'sub', (homeWon ? 'Win' : 'Loss') + ' for ' + me.city + ', ' + res.home + '-' + res.away + '.'));
      var cols = Engine.columnsFor(year);
      if (res.calls && res.calls.length) {
        var cb = el('div', 'box');
        cb.appendChild(el('h3', 'box-title', 'Your calls'));
        res.calls.forEach(function (c) {
          var r = el('div', 'call ' + (c.net >= 3 ? 'good' : c.net <= -3 ? 'bad' : 'flat'));
          r.appendChild(el('b', null, '\u201C' + c.label + '\u201D' + (c.q ? ' \u00B7 ' + c.q : '')));
          r.appendChild(el('span', null, me.city + ' ' + c.my + ', ' + opp.city + ' ' + c.op + ' over the stretch. ' + c.verdict));
          if (c.line) r.appendChild(el('small', null, c.line));
          cb.appendChild(r);
        });
        bodyEl.appendChild(cb);
      }
      (function () {
        var best = null, bs = -1e9;
        [[res.homeLines, me, res.home > res.away], [res.awayLines, opp, res.away > res.home]].forEach(function (t) {
          t[0].forEach(function (l) {
            var s = l.s, gs = s.pts + 0.4 * s.fg - 0.7 * s.fga - 0.4 * (s.fta - s.ft) + 0.7 * s.orb + 0.3 * s.drb + s.stl + 0.7 * s.ast + 0.7 * s.blk - 0.4 * s.pf - s.tov + (t[2] ? 3 : 0);
            if (gs > bs) { bs = gs; best = { l: l, t: t[1] }; }
          });
        });
        if (!best) return;
        var s = best.l.s, card = el('div', 'potg');
        card.appendChild(el('small', 'potg-k', 'Player of the game'));
        var row = el('div', 'potg-row');
        row.appendChild(makeAvatar({ id: best.l.id, name: best.l.name }));
        var tx = el('div');
        tx.appendChild(el('b', null, best.l.name));
        tx.appendChild(el('span', null, best.t.city));
        row.appendChild(tx);
        card.appendChild(row);
        var parts = [[s.pts, 'PTS']];
        if (year >= 1950) parts.push([s.orb + s.drb, 'REB']);
        parts.push([s.ast, 'AST']);
        if (year >= 1973) { if (s.stl >= 2) parts.push([s.stl, 'STL']); if (s.blk >= 2) parts.push([s.blk, 'BLK']); }
        parts.push([s.fg + '-' + s.fga, 'FG']);
        var gr = el('div', 'potg-st');
        parts.slice(0, 5).forEach(function (k) { var c = el('div'); c.appendChild(el('b', null, String(k[0]))); c.appendChild(el('small', null, k[1])); gr.appendChild(c); });
        card.appendChild(gr);
        bodyEl.appendChild(card);
      })();
      bodyEl.appendChild(boxTable(me, startersFirst(res.homeLines), cols));
      bodyEl.appendChild(boxTable(opp, startersFirst(res.awayLines), cols));
      if (cols.length <= 9) bodyEl.appendChild(el('p', 'sub how', 'This box score only shows what the league recorded in ' + seasonLabel(save.year) + '. Later eras add rebounds, steals, blocks and more.'));
      dockEl.hidden = false;
    }
    function step() {
      if (qi >= nq) { finish(); return; }
      rows.forEach(function (r) {
        var v = res.quarters[qi][r.idx];
        r.cells[qi].textContent = v;
        running[r.idx] += v;
        r.tot.textContent = running[r.idx];
      });
      qi++;
      matchTimer = setTimeout(step, reduceMotion ? 0 : 1100);
    }
    board.addEventListener('click', function () { clearTimeout(matchTimer); qi = nq; rows.forEach(function (r, i) { res.quarters.forEach(function (q, k) { r.cells[k].textContent = q[r.idx]; }); }); finish(); }, { once: true });
    if (instant) { qi = nq; rows.forEach(function (r) { res.quarters.forEach(function (q, k) { r.cells[k].textContent = q[r.idx]; }); }); finish(); return; }
    matchTimer = setTimeout(step, reduceMotion ? 0 : 600);
  }




  /* ---------- franchise fates choice ---------- */
  var DOOMED = { 'cleveland-rebels': 1, 'detroit-falcons': 1, 'pittsburgh-ironmen': 1, 'toronto-huskies': 1 };
  function buildFatesBox() {
    var card = document.querySelector('#screen-ready .ready-card');
    var old = document.getElementById('fates-box');
    if (old) old.parentNode.removeChild(old);
    var box = el('div', 'fates');
    box.id = 'fates-box';
    box.appendChild(el('div', 'group-title', 'Franchise history'));
    var doomed = selected && DOOMED[selected.id];
    box.appendChild(el('p', 'sub', 'At the end of each season with real league changes you choose to keep history or change it.' + (doomed ? ' In real history your franchise folds after 1946-47.' : '')));
    card.insertBefore(box, document.getElementById('btn-play'));
  }

  /* ---------- season ---------- */
  var save = null;
  var pendingAfterMatch = false;
  var rosterCache = {};
  var building = false;
  function persist() { if (!building) store.set('save', save); }
  function recText(id, r, s) { var p = save && save.lastRec && save.lastRec[id]; return r.w + r.l || !p ? r.w + '-' + r.l : (s ? 'LY ' : 'Last year ') + p.w + '-' + p.l; }
  Phone.setSource({ save: function () { return save; }, team: function (id) { try { return teamById(id); } catch (e) { return null; } }, persist: function () { persist(); }, respond: function (n, done) { respondTo(n, done); } });

  /* A pinned post you can answer. What you pick changes real numbers, and a few games later the fans notice. */
  function respondTo(n, done) {
    var a = n.act, m = Events.mood(save), p = a.pid ? League.byId(save, a.pid) : null, ros = rosterOf(save.myId);
    var st = p && save.lg.stats ? save.lg.stats[p.id] : null;
    function follow(kind, g, base) {
      if (!st) return;
      m.follow.push({ pid: p.id, name: p.name, kind: kind, n: g, g0: st.g, pts0: st.pts, fg0: st.fg, fga0: st.fga, base: base });
    }
    function ppg() { return st && st.g ? st.pts / st.g : 8; }
    function react(kind, extra) { if (Social.has(save.year)) Social.react(save, kind, Object.assign({ name: p ? p.name : '' }, extra || {})); }
    function fx(o) { return Events.apply(save, { choices: [{ fx: o }], pid: p ? p.id : null, who: p ? p.name : '' }, 0, ros); }
    var opts = [], title = n.text;
    if (a.type === 'slump') {
      opts.push(['Stand by ' + lastName(p.name), function () { var r = fx({ s: { m: 5, t: 4 }, fans: -1 }); follow('backed', 6, ppg()); react('backed'); return r; }]);
      opts.push(['Cut his minutes', function () { m.tweak[p.id] = { f: 0.9, g: 6 }; var r = fx({ s: { m: -5, t: -3 }, coach: 2 }); follow('shake', 6, ppg()); react('cut'); return r + ' \u00B7 fewer minutes for 6 games'; }]);
      opts.push(['Sit him one game', function () { m.tweak[p.id] = { f: 0.55, g: 1 }; react('sit'); return fx({ s: { m: -3, t: -1 }, fans: 1 }) + ' \u00B7 out of the rotation tonight'; }]);
    } else if (a.type === 'bench') {
      opts.push(['Give ' + lastName(p.name) + ' more minutes', function () { m.tweak[p.id] = { f: 1.07, g: 8 }; var r = fx({ s: { m: 6, t: 4, promise: true }, fans: 1 }); follow('minutes', 6, ppg()); react('minutes'); return r + ' \u00B7 bigger role for 8 games'; }]);
      opts.push(['Keep the rotation', function () { return fx({ s: { m: -2, t: -1 }, coach: 2 }); }]);
    } else if (a.type === 'pressure') {
      opts.push(['Own it publicly', function () { return fx({ fans: 4, team: { m: -1 } }); }]);
      opts.push(['Back the players', function () { return fx({ team: { m: 4 }, fans: -3 }); }]);
      opts.push(['Shake up the roster', function () { m.fans = Math.min(100, m.fans + 2); persist(); openTrade('season'); return 'Fans +2 \u00B7 the phones are open'; }]);
    } else if (a.type === 'shop') {
      var t = teamById(a.tid);
      opts.push(['Call the ' + (t ? t.name : 'club') + '\u2019 GM', function () { openTrade('season'); trade.partner = a.tid; renderTrade(); return ''; }]);
      opts.push(['Not interested', function () { return ''; }]);
    } else if (a.type === 'scout') {
      (a.pids || []).forEach(function (id) {
        var q = League.byId(save, id); if (!q) return;
        var tq = teamById(q.team);
        opts.push([q.name + ' (' + q.ratings.ovr + ', ' + (tq ? tq.city : '') + ')', function () { openTrade('season'); trade.partner = q.team; trade.view = 'pkgRes'; trade.want = { p: [q], k: [] }; renderTrade(); return ''; }]);
      });
    } else if (a.type === 'extend') {
      var ask = Math.round(League.salaryFor(p.ratings.ovr) * 1.1), pay = League.payroll(save, save.myId);
      opts.push(['Extend 3 years at ' + money(ask), function () {
        if (pay - p.salary + ask > save.lg.cap * 1.3) return 'The owner will not take the payroll that high.';
        p.salary = ask; p.yrs = Math.max(p.yrs, 0) + 3; League.bump && League.bump(save); rosterCache = {}; persist();
        react('extend', { years: 3, salary: money(ask), payroll: money(League.payroll(save, save.myId)) });
        return fx({ s: { m: 8, t: 8 }, fans: 2 }) + ' \u00B7 ' + p.name + ' signs through ' + (save.year + p.yrs);
      }]);
      opts.push(['Talk in the summer', function () { return fx({ s: { m: -2, t: -3 } }); }]);
    } else if (a.type === 'owner') {
      opts.push(['Promise to turn it around', function () { react('owner'); save.ownerPromise = true; save.ownerTrust = Math.min(100, (save.ownerTrust || 60) + 3); return 'Owner trust +3 \u00B7 he will hold you to it'; }]);
      opts.push(['Ask for patience', function () { save.ownerTrust = Math.max(0, (save.ownerTrust || 60) - 2); return 'Owner trust -2'; }]);
      opts.push(['Cut payroll to show good faith', function () { save.ownerTrust = Math.min(100, (save.ownerTrust || 60) + 5); m.coach = Math.max(0, m.coach - 3); return 'Owner trust +5 \u00B7 coach trust -3'; }]);
    } else if (a.type === 'coach') {
      var CTALK = {
        unit: [['Give the bench more run', { team: { m: 2 }, coach: 3 }, function () { ros.slice(5, 10).forEach(function (q) { m.tweak[q.id] = { f: 1.04, g: 6 }; }); return 'Bench gets a longer look for 6 games'; }], ['Tighten the rotation', { team: { m: -1 }, coach: -2 }], ['Your call, coach', { coach: 4 }]],
        rest: [['Rest a few starters', { team: { m: 3 }, coach: 3 }], ['Keep them out there', { team: { m: -2 }, coach: -2, fans: 1 }]],
        glass: [['Back the coach\u2019s plan', { team: { m: 1 }, coach: 4 }], ['Stay the course', { coach: -2 }]],
        fast: [['Let him run his system', { team: { m: 1 }, coach: 4 }], ['Keep the current system', { coach: -2, team: { m: 1 } }]],
        small: [['Try it', { team: { m: 2 }, coach: 3 }], ['Stay big', { coach: -1 }]]
      }[a.topic] || [];
      CTALK.forEach(function (o) { opts.push([o[0], function () { var r = fx(o[1]); return (o[2] ? o[2]() + ' \u00B7 ' : '') + r; }]); });
    } else if (a.type === 'ownercap') {
      opts.push(['Promise to trim payroll', function () { save.ownerTrust = Math.min(100, (save.ownerTrust || 60) + 3); save.ownerPromise = true; return 'Owner trust +3 \u00B7 he will watch the payroll'; }]);
      opts.push(['Explain the roster plan', function () { save.ownerTrust = Math.min(100, (save.ownerTrust || 60) + 1); return 'Owner trust +1'; }]);
      opts.push(['The roster comes first', function () { save.ownerTrust = Math.max(0, (save.ownerTrust || 60) - 2); m.coach = Math.min(100, m.coach + 2); return 'Owner trust -2 \u00B7 coach trust +2'; }]);
    } else if (a.type === 'fa') {
      var sal = League.salaryFor(p.ratings.ovr);
      opts.push(['Sign for ' + money(sal) + ' (1 yr)', function () {
        if (ros.length >= League.MAX_ROSTER) return 'Roster is full.';
        League.sign(save, p, save.myId, sal, 1); rosterCache = {}; persist();
        react('sign', { salary: money(sal) });
        return fx({ fans: 2, team: { m: 1 } }) + ' \u00B7 ' + p.name + ' signed';
      }]);
      opts.push(['Pass', function () { return ''; }]);
    }
    hubSheet(n.title, function (sh, close) {
      sh.appendChild(el('p', 'sub', title));
      opts.forEach(function (o) {
        var b = el('button', 'btn wide', o[0]); b.type = 'button';
        b.addEventListener('click', function () {
          close(); var note = o[1](); persist(); done();
          if (note) Phone.buzz({ app: 'Result', c: '#34C759', g: '\u2713', title: o[0], text: '', note: note });
        });
        sh.appendChild(b);
      });
      var later = el('button', 'btn wide ghost', 'Ignore'); later.type = 'button';
      later.addEventListener('click', function () { close(); done(); });
      sh.appendChild(later);
    });
  }
  function teamById(id) {
    if (save && save.tm && save.tm[id]) return save.tm[id];
    return seasons[currentEra.id].teams.filter(function (t) { return t.id === id; })[0];
  }
  function ensureTm() {
    if (save.tm) return;
    save.tm = {};
    seasons[currentEra.id].teams.forEach(function (t) { save.tm[t.id] = t; });
  }
  function rosterOf(id) {
    if (rosterCache.rev !== save.lg.rev) rosterCache = { rev: save.lg.rev };
    if (!rosterCache[id]) rosterCache[id] = League.rosterOf(save, id);
    return rosterCache[id];
  }
  function gamesFor(id) {
    return save.days.filter(function (d) { return d.some(function (g) { return g[0] === id || g[1] === id; }); }).length;
  }
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function dateTag() {
    if (!save || save.phase !== 'regular' || !save.dates || !save.dates[save.day]) return '';
    var d = save.dates[save.day].split('-'), m = save.gmeta && save.gmeta[save.day], lab = '';
    (save.days[save.day] || []).forEach(function (g, i) { if ((g[0] === save.myId || g[1] === save.myId) && m && m[i] && m[i][0]) lab = m[i][0]; });
    return ' \u00B7 ' + MON[+d[1] - 1] + ' ' + (+d[2]) + (lab ? ' \u00B7 ' + lab.replace('NBA Cup - ', 'Cup \u00B7 ') : '');
  }
  function seasonLabel(y) { return y + '-' + String(y + 1).slice(2); }
  function divTitle(d) { return d + (save && ((eraStart(save.eraId) || {}).current) ? ' Conference' : ' Division'); }
  function money(n) { return League.money(n, save && save.lg ? save.lg.cap : 0); }
  function teamRating(id) {
    var r = rosterOf(id).map(function (p) { return p.ratings.ovr; }).sort(function (a, b) { return b - a; }).slice(0, 8);
    return r.length ? Math.round(r.reduce(function (a, b) { return a + b; }, 0) / r.length) : 0;
  }
  /* Strength of a set of players: the average of the best eight. */
  function strengthOf(list) {
    var r = list.map(function (p) { return p.ratings.ovr; }).sort(function (a, b) { return b - a; }).slice(0, 8);
    return r.length ? r.reduce(function (a, b) { return a + b; }, 0) / r.length : 0;
  }
  /* Chance of winning the title, from how every club's top eight compare. Pass a roster to see a what-if. */
  function titleOdds(id, listOverride) {
    var tot = 0, mine = 0;
    save.ids.forEach(function (tid) {
      var s = strengthOf(tid === id && listOverride ? listOverride : rosterOf(tid));
      var w = Math.exp(0.62 * s);
      tot += w;
      if (tid === id) mine = w;
    });
    return tot ? Math.round(1000 * mine / tot) / 10 : 0;
  }
  function oddsShift(id, add, drop) {
    var base = rosterOf(id), list = base.filter(function (q) { return !drop || q.id !== drop.id; });
    if (add) list = list.concat([add]);
    var d = Math.round((titleOdds(id, list) - titleOdds(id)) * 10) / 10;
    return (d > 0 ? '+' : d < 0 ? '\u2212' : '') + Math.abs(d).toFixed(1) + '% title';
  }
  function pctText(v) { return (v < 10 ? v.toFixed(1) : String(Math.round(v))) + '%'; }
  function sideRating(id, w) {
    var top = rosterOf(id).slice().sort(function (x, y) { return y.ratings.ovr - x.ratings.ovr; }).slice(0, 8);
    if (!top.length) return 0;
    var tot = 0;
    top.forEach(function (p) { var v = 0; Object.keys(w).forEach(function (k) { v += (p.ratings[k] || 0) * w[k]; }); tot += v; });
    return Math.round(tot / top.length);
  }
  function offRating(id) { return sideRating(id, { sco: 0.4, sht: 0.25, ft: 0.1, ply: 0.15, orb: 0.1 }); }
  function defRating(id) { return sideRating(id, { drb: 0.35, stl: 0.25, blk: 0.25, fou: 0.15 }); }
  /* Your rotation: the order you set, then everyone else by overall. The first five start. */
  /* Who starts: the real opening-week fives in 2026-27, otherwise the best five that still make a lineup (no five centres, no five guards). */
  function isBig(p) { return p.pos === 'C' || p.pos === 'F-C'; }
  function isGuard(p) { return p.pos === 'G' || p.pos === 'G-F'; }
  function defaultOrder(list) {
    var byOvr = list.slice().sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    var st = save.year === 2026 ? byOvr.filter(function (p) { return p.st; }).slice(0, 5) : [];
    byOvr.forEach(function (p) {
      if (st.length >= 5 || st.indexOf(p) >= 0) return;
      var nb = st.filter(isBig).length, ng = st.filter(isGuard).length;
      if ((isBig(p) && nb >= 2) || (isGuard(p) && ng >= 3) || (!isBig(p) && !isGuard(p) && st.length - nb - ng >= 3)) return;
      st.push(p);
    });
    byOvr.forEach(function (p) { if (st.length < 5 && st.indexOf(p) < 0) st.push(p); });
    st.sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    var rest = byOvr.filter(function (p) { return st.indexOf(p) < 0; });
    if (save.year === 2026) rest.sort(function (a, b) { return (b.mp !== undefined ? b.mp : 3 + (b.ratings.ovr - 40) * 0.55) - (a.mp !== undefined ? a.mp : 3 + (a.ratings.ovr - 40) * 0.55); });
    return st.concat(rest);
  }
  function rotOrder(id) {
    var ros = League.rosterOf(save, id), hurt = ros.filter(function (p) { return p.inj > 0; });
    var all = defaultOrder(ros.filter(function (p) { return !(p.inj > 0); })).concat(hurt.sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; }));
    if (id !== save.myId || !save.rot || !save.rot.length) return all;
    var out = [];
    save.rot.forEach(function (pid) { var p = all.filter(function (q) { return q.id === pid; })[0]; if (p) out.push(p); });
    all.forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); });
    return out;
  }
  function openDepth(team) {
    save.plan = save.plan || { pace: 0, focus: '', minutes: '' };
    var ord = rotOrder(team.id).filter(function (p) { return !(p.inj > 0); }).slice(0, 10);
    function cur() { var m = (save.plan.mins && save.plan.mins.slice()) || Engine.defaultMins(ord); while (m.length < 10) m.push(4); return m; }
    hubSheet('Depth chart', function (sh, close) {
      sh.classList.add('tall');
      var box = el('div', 'dc-list'); sh.appendChild(box);
      function draw() {
        box.textContent = '';
        var m = cur(), tot = 0;
        ord.forEach(function (p, i) { tot += m[i]; });
        var show = ord.map(function (p, i) { return i; });
        var five = show.slice(0, 5).sort(function (u, v) { return slotRank(ord[u]) - slotRank(ord[v]); });
        show = five.concat(show.slice(5));
        show.forEach(function (i, pos) {
          var p = ord[i];
          var row = el('div', 'dc-row');
          row.appendChild(el('span', 'dc-n', String(pos + 1)));
          row.appendChild(makeAvatar(p));
          var nm = el('span', 'dc-name'); nm.appendChild(el('strong', null, p.name)); nm.appendChild(el('span', 'meta', (p.pos || '') + ' \u00B7 ' + p.ratings.ovr));
          row.appendChild(nm);
          var ctl = el('span', 'dc-ctl');
          [['\u2212', -1], ['+', 1]].forEach(function (b) {
            var bt = el('button', 'dc-b', b[0]); bt.type = 'button';
            bt.addEventListener('click', function () { var mm = cur(); mm[i] = Math.max(0, Math.min(42, mm[i] + b[1])); save.plan.mins = mm; persist(); draw(); });
            ctl.appendChild(bt);
            if (b[1] < 0) ctl.appendChild(el('span', 'dc-min', String(m[i])));
          });
          row.appendChild(ctl);
          box.appendChild(row);
        });
        var foot = el('div', 'dc-foot');
        foot.appendChild(el('span', 'dc-tot' + (tot === 240 ? '' : ' off'), tot + ' / 240'));
        var rs = el('button', 'btn small', 'Reset'); rs.type = 'button';
        rs.addEventListener('click', function () { save.plan.mins = null; persist(); draw(); });
        foot.appendChild(rs);
        box.appendChild(foot);
      }
      draw();
    });
  }
  function moveRot(team, p, d) {
    var ord = rotOrder(team.id), i = ord.indexOf(p), j = i + d;
    if (j < 0 || j >= ord.length) return;
    ord.splice(i, 1); ord.splice(j, 0, p);
    save.rot = ord.map(function (q) { return q.id; });
    persist(); rosterCache = {};
    renderRoster(team);
  }
  function rosterFor(id) {
    var h = League.healthy(save, id);
    if (id !== save.myId) { var co = defaultOrder(h), cp = {}; co.forEach(function (p, i) { cp[p.id] = i; }); return Coach.apply(save, id, h).map(function (p) { return Object.assign({}, p, { slot: cp[p.id] }); }); }
    var ord = rotOrder(id), pos = {};
    ord.forEach(function (p, i) { pos[p.id] = i; });
    return Coach.apply(save, id, Events.moraleRoster(save, h), Events.mood(save).coach).map(function (p) { return Object.assign({}, p, { slot: pos[p.id] === undefined ? 99 : pos[p.id] }); });
  }
  function injMul() { var m = save.plan && save.plan.minutes; return m === 'heavy' ? 1.7 : m === 'deep' ? 0.75 : 1; }
  function simGame(g) {
    var pl = {};
    if (save.plan) { if (g.home === save.myId) pl.H = save.plan; else if (g.away === save.myId) pl.A = save.plan; }
    var r = Engine.simulate(rosterFor(g.home), rosterFor(g.away), save.year, undefined, undefined, pl);
    if (save.phase === 'regular') League.accumulate(save, r.homeLines.concat(r.awayLines), { h: g.home, a: g.away, hs: r.home, as: r.away, nh: r.homeLines.length, day: save.day });
    var inj = League.rollInjuries(save, r.homeLines, g.home, g.home === save.myId ? injMul() : 1).concat(League.rollInjuries(save, r.awayLines, g.away, g.away === save.myId ? injMul() : 1));
    League.tickInjuries(save, g.home); League.tickInjuries(save, g.away);
    return { home: g.home, away: g.away, hs: r.home, as: r.away, series: g.series, lines: { h: r.homeLines, a: r.awayLines }, inj: inj };
  }
  function simDay() {
    var results = Season.today(save).map(simGame);
    results.forEach(function (g) {
      if (g.home !== save.myId && g.away !== save.myId) return;
      var us = g.home === save.myId ? g.hs : g.as, them = g.home === save.myId ? g.as : g.hs;
      Events.afterGame(save, teamById(save.myId), null, rosterOf(save.myId), us > them);
    });
    if (save.phase === 'regular') results.forEach(function (g) { League.noteTeamGame(save, g.home, g.away, g.hs, g.as); });
    Season.record(save, results);
    League.aiMoves(save, save.myId, save.ids.map(teamById));
    if (typeof Coach !== 'undefined' && save.coach && save.phase === 'regular' && (save.day || 0) % 4 === 0) {
      var strength = {};
      save.ids.forEach(function (id) {
        var top = League.rosterOf(save, id).map(function (p) { return p.ratings.ovr; }).sort(function (a, b) { return b - a; }).slice(0, 8);
        strength[id] = Math.max(0.12, Math.min(0.85, 0.5 + (top.reduce(function (a, b) { return a + b; }, 0) / (top.length || 1) - 58) * 0.022));
      });
      Coach.inSeason(save, save.myId, strength);
    }
    rosterCache = {};
    if (League.formCheck(save)) rosterCache = {};
    if (Social.has(save.year)) Social.day(save, results, results.reduce(function (acc, g) { return acc.concat(g.inj || []); }, []));
    if (save.phase !== 'regular') save.pd = (save.pd || 0) + 1;
    cupNews();
    awardsCheck();
    yearEndCheck();
    return results;
    // a day without our game still gets its scores, shown on the hub until the next day is played
    var mineToday = results.some(function (g) { return g.home === save.myId || g.away === save.myId; });
    save.rest = null;
    if (!mineToday && results.length) {
      save.rest = { tok: save.day + '|' + (save.pd || 0) + '|' + save.phase, games: results.map(function (g) {
        var all = (g.lines.h || []).map(function (x) { return [x, g.home]; }).concat((g.lines.a || []).map(function (x) { return [x, g.away]; })).sort(function (p, q) { return q[0].s.pts - p[0].s.pts; });
        var win = g.hs > g.as, w = win ? g.home : g.away, l = win ? g.away : g.home, top = all[0];
        return { wid: w, lid: l, ws: win ? g.hs : g.as, ls: win ? g.as : g.hs, tn: top ? lastName(top[0].name) : '', tp: top ? top[0].s.pts : 0, tt: top ? top[1] : null };
      }) };
    }
  }
  /* NBA Cup headlines: who made the eight, each round, the champion */
  function cupNews() {
    var c = save && save.cup; if (!c || save.phase === 'done') return;
    var m = Events.mood(save), me = save.myId, mine = function (ids) { return ids && ids.indexOf(me) >= 0; };
    var nm = function (id) { var t = teamById(id); return t ? t.city : id; };
    c.news = c.news || {};
    function post(k, text, good) {
      if (c.news[k]) return; c.news[k] = 1;
      (m.posts || (m.posts = [])).push({ app: 'Breaking', c: '#C9A227', g: '\u2605', title: 'NBA Cup', text: text, good: good });
      (save.lg.wire || (save.lg.wire = [])).push({ d: save.day, y: save.year, t: text });
    }
    var w2 = function (list) { return list.map(nm).join(', ').replace(/, ([^,]*)$/, ' and $1'); };
    if (c.q && save.day >= c.at && !c.news.q) post('q', mine(c.q) ? 'You are in. ' + nm(me) + ' are through to the Cup quarterfinals.' : 'The Cup field is set: ' + w2(c.q) + '. ' + nm(me) + ' are out.', mine(c.q));
    if (c.sf && save.day >= c.at + 2) post('sf', 'Cup semifinals: ' + c.sf.map(function (x) { return nm(x[0]) + ' v ' + nm(x[1]); }).join(' and ') + '.', mine(c.sf.reduce(function (a, x) { return a.concat(x); }, [])));
    if (c.final && save.day >= c.at + 2 && !c.champ) post('f', 'The Cup final is set: ' + nm(c.final[0]) + ' v ' + nm(c.final[1]) + ' in Indianapolis.', mine(c.final));
    if (c.champ) post('c', nm(c.champ) + ' win the NBA Cup.', c.champ === me);
  }
  function eraStart(id) { return ERAS.filter(function (e) { return e.id === id; })[0]; }

  function startSeason() {
    if (currentEra.second) {
      if (!s2) return;
      save = s2; s2 = null;
      save.myId = selected.id;
      var old = seasons['1946'].teams.filter(function (x) { return x.id === selected.id; })[0];
      save.lg.history.forEach(function (h) { h.rec = old ? old.w + '-' + old.l : ''; });
      currentEra = ERAS.filter(function (e) { return e.id === '1946'; })[0];
      startNextSeason();
      return;
    }
    var data = seasons[currentEra.id];
    loadPlayers(function (pl) {
      if (!pl) return;
      var go = function (sched) {
      rosterCache = {};
      save = Season.create(currentEra.id, parseInt(currentEra.years, 10), data.teams, selected.id, data.games || 60, sched);
      Engine.setRules({});
      League.init(save, pl.players, data.teams, pl.dead);
      if (currentEra.current) { Coach.build(save, COACHDATA, save.ids); }
      if (currentEra.current) { save.lastRec = {}; data.teams.forEach(function (t) { save.lastRec[t.id] = { w: t.w, l: t.l }; }); }
      ensureTm();
      persist();
      renderSeason();
      show('screen-season');
      };
      if (currentEra.current && parseInt(currentEra.years, 10) === 2026) {
        fetch('data/schedule-2026.json').then(function (r) { return r.json(); }).then(go).catch(function () { go(null); });
      } else go(null);
    });
  }



  /* ---------- power rankings: form first, standings kept as a factor ---------- */
  var bulk = false;
  function dateText(d) { var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], p = String(d).split('-'); return p.length === 3 ? m[+p[1] - 1] + ' ' + (+p[2]) : String(d); }
  function powerRank() {
    var d = save.day, ids = save.ids.slice(), l10 = {};
    ids.forEach(function (id) { l10[id] = { n: 0, w: 0, m: 0 }; });
    for (var i = save.results.length - 1; i >= 0; i--) {
      var r = save.results[i];
      [[r.h, r.hs - r.as], [r.a, r.as - r.hs]].forEach(function (x) { var o = l10[x[0]]; if (o && o.n < 10) { o.n++; if (x[1] > 0) o.w++; o.m += x[1]; } });
    }
    var prev = save.lg.pr ? save.lg.pr.rank : null, rows = ids.map(function (id) {
      var rc = save.rec[id], gp = rc.w + rc.l, base = gp ? rc.w / gp : 0.5, o = l10[id];
      var form = o.n ? 0.7 * (o.w / o.n) + 0.3 * ((Math.max(-15, Math.min(15, o.m / o.n)) + 15) / 30) : 0.5;
      var rn = Math.max(0, Math.min(1, (teamRating(id) - 55) / 25)), k = Math.min(1, gp / 10), wS = 0.25 * k, wF = 0.4 * k;
      var ahead = [];
      for (var j = d; j < Math.min(save.days.length, d + 7); j++) (save.days[j] || []).forEach(function (g) { if (g[0] === id) ahead.push({ o: g[1], h: 1 }); else if (g[1] === id) ahead.push({ o: g[0], h: 0 }); });
      return { id: id, sc: wS * base + wF * form + (1 - wS - wF) * rn, w: rc.w, l: rc.l, l10: o.n ? o.w + '-' + (o.n - o.w) : '', ahead: ahead };
    }).sort(function (x, y) { return y.sc - x.sc; });
    var rank = {};
    rows.forEach(function (r, i) { r.rank = i + 1; rank[r.id] = i + 1; r.move = prev && prev[r.id] ? prev[r.id] - r.rank : 0; });
    return { d: d, rows: rows, rank: rank };
  }
  function prList(pr) {
    var box = el('div', 'pr-list');
    pr.rows.forEach(function (r) {
      var t = teamById(r.id), row = el('div', 'pr-row' + (r.id === save.myId ? ' me' : ''));
      row.appendChild(el('b', 'pr-k', String(r.rank)));
      row.appendChild(el('span', 'pr-mv ' + (r.move > 0 ? 'up' : r.move < 0 ? 'dn' : ''), r.move > 0 ? '▲' + r.move : r.move < 0 ? '▼' + (-r.move) : '–'));
      var bd = teamBadge(t); bd.classList.add('sm'); row.appendChild(bd);
      var mid = el('span', 'pr-mid'); mid.appendChild(el('b', null, t.city));
      mid.appendChild(el('small', null, r.w + '-' + r.l + (r.l10 ? ' · L10 ' + r.l10 : '')));
      row.appendChild(mid);
      var ah = el('span', 'pr-ah');
      if (!r.ahead.length) ah.appendChild(el('small', null, 'Off'));
      r.ahead.slice(0, 5).forEach(function (g) { var c = el('span', 'pr-g' + (g.h ? '' : ' aw')); var ob = teamBadge(teamById(g.o)); ob.classList.add('sm'); c.appendChild(ob); c.appendChild(el('i', null, g.h ? 'vs' : '@')); ah.appendChild(c); });
      row.appendChild(ah);
      box.appendChild(row);
    });
    return box;
  }


  /* ---------- year-end awards, kept for every season in the save ---------- */
  function perfScore(o, win) { return (o.pts + 1.2 * o.trb + 1.5 * o.ast + 1.5 * o.stl + 1.2 * o.blk - o.tov) / o.g * (0.7 + 0.6 * win); }
  function yearEnd() { var ya = save.lg.ya || (save.lg.ya = []), e = ya.filter(function (x) { return x.y === save.year; })[0]; return e; }
  function yearEndCheck() {
    if (!save || !save.lg || !save.lg.stats) return;
    var e = yearEnd();
    if (save.phase !== 'regular' && !e) {
      var st = save.lg.stats, rows = [];
      save.lg.players.forEach(function (p) {
        var o = st[p.id]; if (!o || !p.team || p.status !== 'active') return;
        var rc = save.rec[p.team]; if (!rc) return; var gp = rc.w + rc.l; if (!gp || o.g < Math.max(8, gp * 0.5)) return;
        var win = rc.w / gp, ordR = rosterOf(p.team).slice().sort(function (x, y) { return y.ratings.ovr - x.ratings.ovr; }).indexOf(p);
        var rk = isRookie(p);
        rows.push({ p: p, o: o, tid: p.team, win: win, sc: perfScore(o, win), rk: rk, bench: ordR >= 5 && (o.min || 0) / o.g >= 14,
          df: (2.2 * (o.stl || 0) + 2.2 * (o.blk || 0) + 0.4 * (o.trb || 0)) / o.g * (0.8 + 0.4 * win) * (0.6 + ((p.ratings.stl || 50) + (p.ratings.blk || 50)) / 250) });
      });
      var card = function (r) { return { id: r.p.id, name: r.p.name, tid: r.tid, line: (r.o.pts / r.o.g).toFixed(1) + ' pts · ' + (r.o.trb / r.o.g).toFixed(1) + ' reb · ' + (r.o.ast / r.o.g).toFixed(1) + ' ast' }; };
      var top = function (list, key, n, f) { return list.filter(f || function () { return true; }).sort(function (x, y) { return y[key] - x[key]; }).slice(0, n); };
      var y = { y: save.year, label: seasonLabel(save.year) };
      // a panel of 100 voters, each with a little noise: MVP ballots go five deep at 10-7-5-3-1, the rest three deep at 5-3-1
      var gauss = function () { return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 0.58; };
      var vote = function (cands, scoreFn, mk, pts) {
        cands = cands.slice().sort(function (x, z) { return scoreFn(z) - scoreFn(x); }).slice(0, 10);
        if (!cands.length) return [];
        var mx = Math.max(1e-6, scoreFn(cands[0])), tally = cands.map(function () { return { p: 0, f: 0 }; });
        for (var v = 0; v < 100; v++) {
          var bias = gauss() * 0.04;
          cands.map(function (c, i) { return [scoreFn(c) / mx + gauss() * 0.06 + (c.win !== undefined ? bias * (c.win - 0.5) * 2 : 0), i]; }).sort(function (x, z) { return z[0] - x[0]; }).slice(0, pts.length).forEach(function (r, k) { tally[r[1]].p += pts[k]; if (k === 0) tally[r[1]].f++; });
        }
        return cands.map(function (c, i) { var o = mk(c); o.pts = tally[i].p; o.fp = tally[i].f; return o; }).sort(function (x, z) { return z.pts - x.pts; }).slice(0, 3);
      };
      var M5 = [10, 7, 5, 3, 1], M3 = [5, 3, 1];
      y.t = {
        mvp: vote(rows, function (r) { return r.sc; }, card, M5),
        dpoy: vote(rows, function (r) { return r.df; }, card, M3),
        roy: vote(rows.filter(function (r) { return r.rk; }), function (r) { return r.sc; }, card, M3),
        smoy: vote(rows.filter(function (r) { return r.bench; }), function (r) { return r.sc; }, card, M3),
        mip: vote(rows.filter(function (r) { return !r.rk && (r.p.formAdj || 0) > 0; }), function (r) { return Math.max(0.01, (r.p.formAdj || 0) * 3 + r.sc * 0.1); }, card, M3)
      };
      var gains = [];
      save.ids.forEach(function (id) { var lr = save.lastRec && save.lastRec[id], rc = save.rec[id]; if (!lr || !rc.w) return; gains.push({ id: id, g: rc.w / (rc.w + rc.l) - lr.w / Math.max(1, lr.w + lr.l) + 0.5 }); });
      y.t.coy = vote(gains, function (g) { return g.g; }, function (g) { var s = Coach.staff(save, g.id), t = teamById(g.id); return { id: '', name: (s && s.hc && s.hc.n) || t.city + ' head coach', tid: g.id, line: save.rec[g.id].w + '-' + save.rec[g.id].l }; }, M3);
      ['mvp', 'dpoy', 'roy', 'smoy', 'mip', 'coy'].forEach(function (k) { y[k] = y.t[k][0] || null; });
      var an = top(rows, 'sc', 15).map(card); y.allnba = [an.slice(0, 5), an.slice(5, 10), an.slice(10, 15)];
      var ad = top(rows, 'df', 10).map(card); y.alldef = [ad.slice(0, 5), ad.slice(5, 10)];
      var ar = top(rows, 'sc', 10, function (r) { return r.rk; }).map(card); y.allrook = [ar.slice(0, 5), ar.slice(5, 10)];
      (save.lg.ya = save.lg.ya || []).push(y); e = y;
      (save.lg.awq || (save.lg.awq = [])).push({ kind: 'ye', y: save.year });
    }
    if (save.phase === 'done' && save.champion) {
      e = yearEnd();
      if (e && !e.fmvp) {
        var st2 = save.lg.stats, bestP = null, bs = -1;
        rosterOf(save.champion).forEach(function (p) { var o = st2[p.id]; if (!o || !o.g) return; var sc = perfScore(o, 0.6); if (sc > bs) { bs = sc; bestP = p; } });
        if (bestP) { e.fmvp = { id: bestP.id, name: bestP.name, tid: save.champion, line: 'NBA champions' }; (save.lg.awq || (save.lg.awq = [])).push({ kind: 'ye', y: save.year, keys: ['fmvp'] }); }
      }
    }
  }
  var TROPHY = '<svg viewBox="0 0 100 120" aria-hidden="true"><defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0" stop-color="#8a6a1f"/><stop offset=".45" stop-color="#f6dc86"/><stop offset="1" stop-color="#9c7a26"/></linearGradient></defs><path d="M26 8h48v30c0 20-12 32-24 32S26 58 26 38z" fill="url(#tg)"/><path d="M26 16H10c0 22 8 32 22 34M74 16h16c0 22-8 32-22 34" fill="none" stroke="url(#tg)" stroke-width="6" stroke-linecap="round"/><rect x="44" y="68" width="12" height="22" fill="url(#tg)"/><rect x="30" y="90" width="40" height="10" rx="2" fill="url(#tg)"/><rect x="22" y="100" width="56" height="12" rx="3" fill="#5b4510"/><path d="M36 14v28" stroke="#fff6cf" stroke-width="3" opacity=".55" stroke-linecap="round"/></svg>';
  var AWNAMES = { mvp: 'Most Valuable Player', dpoy: 'Defensive Player of the Year', roy: 'Rookie of the Year', smoy: 'Sixth Man of the Year', mip: 'Most Improved Player', coy: 'Coach of the Year', fmvp: 'Finals MVP' };
  function awardShow(pages, onDone) {
    var ov = el('div', 'aw-full'), track = el('div', 'aw-track'), dots = el('div', 'aw-dots'), n = pages.length, cur = 0;
    pages.forEach(function (pg, i) {
      var t = teamById(pg.win.tid) || { colors: ['#C8102E'] }, page = el('section', 'aw-page');
      page.style.setProperty('--tc', (t.colors && t.colors[0]) || '#C8102E'); page.style.setProperty('--team', (t.colors && t.colors[0]) || '#C8102E'); page.style.setProperty('--ink', '#fff');
      page.appendChild(el('small', 'aw-cap', seasonLabel(pg.y)));
      page.appendChild(el('h2', 'aw-title', pg.name));
      var tr = el('div', 'aw-trophy'); tr.innerHTML = TROPHY;
      var im = new Image(); im.onload = function () { tr.textContent = ''; tr.appendChild(im); }; im.src = 'assets/trophies/' + pg.key + '.webp';
      page.appendChild(tr);
      var big = el('div', 'aw-big');
      if (pg.win.id) { var av = makeAvatar({ id: pg.win.id, name: pg.win.name }); av.classList.add('aw-bigph'); big.appendChild(av); }
      else { var tb = teamBadge(t.id ? t : teamById(pg.win.tid)); tb.classList.add('aw-bigph'); big.appendChild(tb); }
      page.appendChild(big);
      page.appendChild(el('b', 'aw-wn', pg.win.name));
      var tm = teamById(pg.win.tid);
      page.appendChild(el('span', 'aw-wt', (tm ? tm.city + ' ' + tm.name : '') + ' · ' + pg.win.line));
      if (pg.win.pts) page.appendChild(el('span', 'aw-vt', pg.win.pts + ' points \u00B7 ' + pg.win.fp + ' first-place vote' + (pg.win.fp === 1 ? '' : 's')));
      if (pg.run && pg.run.length) {
        var rr = el('div', 'aw-run');
        pg.run.forEach(function (c, k) {
          var cd = el('div', 'aw-r');
          cd.appendChild(el('small', null, k === 0 ? '2nd' : '3rd'));
          if (c.id) { var a2 = makeAvatar({ id: c.id, name: c.name }); a2.classList.add('aw-rph'); cd.appendChild(a2); } else { var b2 = teamBadge(teamById(c.tid)); b2.classList.add('aw-rph'); cd.appendChild(b2); }
          cd.appendChild(el('b', null, c.name));
          cd.appendChild(el('span', null, ((teamById(c.tid) || {}).city || '') + ' · ' + c.line));
          rr.appendChild(cd);
        });
        page.appendChild(rr);
      }
      track.appendChild(page);
      dots.appendChild(el('i', i === 0 ? 'on' : ''));
    });
    var btn = el('button', 'btn primary wide aw-next', n > 1 ? 'Next' : 'Done'); btn.type = 'button';
    function go(i) { track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); }
    btn.addEventListener('click', function () { if (cur < n - 1) go(cur + 1); else { ov.remove(); if (onDone) onDone(); } });
    track.addEventListener('scroll', function () {
      cur = Math.round(track.scrollLeft / track.clientWidth);
      Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === cur); });
      btn.textContent = cur < n - 1 ? 'Next' : 'Done';
    });
    ov.appendChild(track); ov.appendChild(dots); ov.appendChild(btn);
    document.body.appendChild(ov);
  }
  function yearEndPop(a) {
    var e = (save.lg.ya || []).filter(function (x) { return x.y === a.y; })[0]; if (!e) return;
    var keys = a.keys || ['mvp', 'dpoy', 'roy', 'smoy', 'mip', 'coy'], pages = [];
    keys.forEach(function (k) {
      var list = (e.t && e.t[k]) || (e[k] ? [e[k]] : []); if (!list.length) return;
      pages.push({ key: k, name: AWNAMES[k], y: e.y, win: list[0], run: list.slice(1, 3) });
    });
    if (pages.length) awardShow(pages, function () { setTimeout(awardsPop, 250); });
  }

  /* ---------- weekly and monthly awards ---------- */
  function confOf(tid) { var d = save.division[tid] || ''; return /east/i.test(d) ? 'East' : /west/i.test(d) ? 'West' : 'League'; }
  var ROOK26 = {}; ['AJ Dybantsa', 'Darryn Peterson', 'Cameron Boozer', 'Caleb Wilson', 'Keaton Wagler', 'Mikel Brown Jr.', 'Darius Acuff Jr.', 'Kingston Flemings', 'Morez Johnson Jr.', 'Brayden Burries', 'Yaxel Lendeborg', 'Aday Mara', 'Nate Ament', 'Hannes Steinbach', 'Dailyn Swain', 'Bennett Stirtz', 'Ebuka Okorie', 'Christian Anderson Jr.', 'Allen Graves', 'Jayden Quaintance', 'Karim Lopez', 'Labaron Philon Jr.', 'Zuby Ejiofor', 'Cameron Carr', 'Sergio De Larrea', 'Tarris Reed Jr.', 'Chris Cenac Jr.', 'Joshua Jefferson', 'Alex Karaban', 'Koa Peat', 'Bruce Thornton', 'Richie Saunders', 'Isaiah Evans', 'Meleek Thomas', 'Trevon Brazile', 'Baba Miller', 'Ryan Conwell', 'Braden Smith', 'Jack Kayil', 'Dillon Mitchell', 'Otega Oweh', "Ja'Kobi Gillespie", 'Tyler Bilodeau', 'Maliq Brown', 'Emanuel Sharp', 'Felix Okpara', 'Tyler Nickel', 'Tobi Lawal', 'Bryce Hopkins', 'Jaden Bradley', 'Izaiyah Nelson', 'Henri Veesaar', 'Ugonna Onyenso', 'Lajae Jones', 'Nick Martinelli', 'Vsevolod Ishchenko', 'Narcisse Ngoy', 'Jaron Pierre Jr.', 'Trey Kaufman-Renn', 'Malique Lewis'].forEach(function (n) { ROOK26[n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()] = 1; });
  function isRookie(p) {
    if (p.rookie || p.draftedYear === save.year) return true;
    return save.eraId === '2026' && save.year === 2026 && !!ROOK26[String(p.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()];
  }
  function pickAwards(bucket, minG, rookieOnly) {
    var best = {};
    Object.keys(bucket).forEach(function (id) {
      var o = bucket[id]; if (o.g < minG) return;
      var p = save.lg.players.filter(function (q) { return q.id === id; })[0]; if (!p) return;
      if (rookieOnly && !isRookie(p)) return;
      var sc = (o.pts + 1.2 * o.trb + 1.5 * o.ast + o.stl + o.blk) / o.g * (0.85 + 0.3 * o.w / o.g), c = confOf(o.tid);
      if (!best[c] || sc > best[c].sc) best[c] = { sc: sc, p: p, o: o, c: c };
    });
    return ['East', 'West', 'League'].filter(function (c) { return best[c]; }).map(function (c) { var b = best[c], o = b.o; return { conf: c, p: b.p, tid: o.tid, line: (o.pts / o.g).toFixed(1) + ' pts · ' + (o.trb / o.g).toFixed(1) + ' reb · ' + (o.ast / o.g).toFixed(1) + ' ast', rec: o.w + '-' + (o.g - o.w) }; });
  }
  function award(title, cards, per) {
    var h = save.lg.awh || (save.lg.awh = []);
    for (var i = h.length - 1; i >= 0; i--) if (h[i].y !== save.year) h.splice(i, 1);
    h.push({ y: save.year, day: save.day, date: (save.dates && save.dates[save.day - 1]) || '', title: title, cards: cards.map(function (c) { return { conf: c.conf, id: c.p.id, name: c.p.name, tid: c.tid, line: c.line, rec: c.rec }; }) });
    if (!bulk) (save.lg.awq || (save.lg.awq = [])).push({ title: title, cards: cards });
  }
  function awardsCheck() {
    if (!save || save.phase !== 'regular' || !save.lg.aw) return;
    var aw = save.lg.aw, last = save.lg.awLast || (save.lg.awLast = { wk: 0, mo: '' }), q = save.lg.awq || (save.lg.awq = []), d = save.day;
    if (d >= 7 && d - last.wk >= 7) {
      last.wk = d;
      var wk = pickAwards(aw.wk, 2, false);
      if (wk.length) award('Players of the Week', wk, 'Week');
      aw.wk = {};
    }
    if (d >= 10 && d % 7 === 3 && last.pr !== d) {
      last.pr = d;
      var pr = powerRank(); save.lg.pr = { d: pr.d, rows: pr.rows, rank: pr.rank };
      if (!bulk) q.push({ kind: 'pr' });
    }
    var dt = save.dates && save.dates[d], pd = save.dates && save.dates[d - 1];
    var newMonth = dt && pd ? dt.slice(0, 7) !== pd.slice(0, 7) : (!dt && d >= 30 && d - (last.moDay || 0) >= 30);
    if (newMonth && d - (last.moDay || 0) >= 10) {
      last.moDay = d;
      var mo = pickAwards(aw.mo, 5, false), rk = pickAwards(aw.mo, 4, true);
      if (mo.length) award('Players of the Month', mo, 'Month');
      if (rk.length) award('Rookies of the Month', rk, 'Month');
      aw.mo = {};
    }
  }
  function awardsPop() {
    var q = save && save.lg && save.lg.awq;
    if (!q || !q.length || document.querySelector('.sheet-ov') || document.body.dataset.screen !== 'screen-season') return;
    var a = q.shift(); persist();
    if (a.kind === 'ye') { yearEndPop(a); return; }
    if (a.kind === 'pr') {
      if (!save.lg.pr) return;
      hubSheet('Power rankings', function (sh, close) {
        sh.classList.add('tall');
        sh.appendChild(prList(save.lg.pr));
        var b = el('button', 'btn wide', 'Done'); b.type = 'button'; b.addEventListener('click', close); sh.appendChild(b);
      }, function () { setTimeout(awardsPop, 250); });
      return;
    }
    hubSheet(a.title, function (sh, close) {
      var grid = el('div', 'awards');
      a.cards.forEach(function (c) {
        var t = teamById(c.tid), card = el('div', 'aw-card');
        card.appendChild(el('small', 'aw-conf', c.conf === 'League' ? 'League' : c.conf === 'East' ? 'Eastern Conference' : 'Western Conference'));
        var ph = makeAvatar({ id: c.p.id, name: c.p.name }); ph.classList.add('aw-ph'); card.appendChild(ph);
        card.appendChild(el('b', 'aw-n', c.p.name));
        var tm = el('span', 'aw-t'); if (t) { var bd = teamBadge(t); bd.classList.add('sm'); tm.appendChild(bd); tm.appendChild(document.createTextNode(t.city)); } card.appendChild(tm);
        card.appendChild(el('span', 'aw-l', c.line));
        card.appendChild(el('small', 'aw-r', 'Team ' + c.rec + ' in the period'));
        grid.appendChild(card);
      });
      sh.appendChild(grid);
      var b = el('button', 'btn wide', 'Done'); b.type = 'button'; b.addEventListener('click', close); sh.appendChild(b);
    }, function () { setTimeout(awardsPop, 250); });
  }

  /* a night without our game: the front page leads with the marquee matchup between the best clubs playing */
  function restPage(rs) {
    var pct = function (id) { var r = save.rec[id]; return r.w + r.l ? r.w / (r.w + r.l) : 0.5; };
    var best = null, bs = -1;
    rs.forEach(function (g) { var s = pct(g.home) + pct(g.away) + (teamRating(g.home) + teamRating(g.away)) / 1000; if (s > bs) { bs = s; best = g; } });
    if (!best) return;
    var hw = best.hs > best.as, wid = hw ? best.home : best.away, lid = hw ? best.away : best.home;
    var me = teamById(wid), opp = teamById(lid);
    var dayGames = rs.map(function (g) { return { home: g.home, away: g.away, hs: g.hs, as: g.as, lines: g.lines }; });
    var inj = rs.reduce(function (acc, g) { return acc.concat(g.inj || []); }, []);
    var before = {};
    save.pending = [Events.restPaper(save, { me: me, opp: opp, res: { homeLines: hw ? best.lines.h : best.lines.a, awayLines: hw ? best.lines.a : best.lines.h }, us: Math.max(best.hs, best.as), them: Math.min(best.hs, best.as), label: 'Marquee game', seriesLine: '', day: { games: dayGames, inj: inj }, before: before, teamOf: teamById, standing: '' })];
  }

  /* the free-agent pool, open any time during the season */
  function openFAList(team) {
    hubSheet('Free agents', function (sh, close) {
      sh.classList.add('tall');
      var box = el('div', 'pr-list fa-list');
      function draw() {
        box.textContent = '';
        var n = League.rosterOf(save, team.id).length, pool = League.freeAgents(save).slice(0, 40);
        sh.querySelector('h3').textContent = 'Free agents · ' + n + '/' + League.MAX_ROSTER;
        if (!pool.length) box.appendChild(el('p', 'sub', 'The pool is empty.'));
        pool.forEach(function (p) {
          var row = el('div', 'fa-row');
          row.appendChild(makeAvatar(p));
          var tx = el('span'); tx.appendChild(el('b', null, p.name)); if (isRookie(p)) tx.appendChild(el('em', 'rk-tag', 'R'));
          tx.appendChild(el('small', null, (p.pos || '') + ' · ' + p.age + ' · ovr ' + p.ratings.ovr + ' · pot ' + p.pot));
          row.appendChild(tx);
          var ask = League.salaryFor(p.ratings.ovr), can = n < League.MAX_ROSTER && League.canSign(save, team.id, ask);
          var b = el('button', 'btn small', can ? money(ask) : (n >= League.MAX_ROSTER ? 'Full' : 'Cap')); b.type = 'button'; b.disabled = !can;
          b.addEventListener('click', function () { League.sign(save, p, team.id, ask, 1); Social.faSigned && Social.faSigned(save, p, money(ask), 1); rosterCache = {}; persist(); draw(); renderRoster(team); });
          row.appendChild(b);
          box.appendChild(row);
        });
      }
      draw();
      sh.appendChild(box);
      var d = el('button', 'btn wide', 'Done'); d.type = 'button'; d.addEventListener('click', close); sh.appendChild(d);
    });
  }

  /* the scoreboard for a day our club did not play */
  function restScores() {
    var r = save.rest; if (!r || !r.games || !r.games.length) return;
    hubSheet('Around the league', function (sh, close) {
      var box = el('div', 'lgp rest-scores');
      r.games.forEach(function (g) {
        var w = teamById(g.wid), l = teamById(g.lid); if (!w || !l) return;
        var row = el('div', 'lg-row'), s = el('span', 'lg-g');
        var wn = el('b', 'lg-w', w.city); wn.style.color = (w.colors && w.colors[0]) || '';
        s.appendChild(wn); s.appendChild(el('b', 'lg-n', ' ' + g.ws)); s.appendChild(el('span', 'lg-l', ', ' + l.city + ' ' + g.ls));
        row.appendChild(s);
        if (g.tn) { var tp = el('span', 'lg-t'), tn = el('i', null, g.tn), tt = g.tt && teamById(g.tt); if (tt && tt.colors) tn.style.color = tt.colors[0]; tp.appendChild(tn); tp.appendChild(el('b', null, ' ' + g.tp)); row.appendChild(tp); }
        box.appendChild(row);
      });
      sh.appendChild(box);
      var b = el('button', 'btn wide', 'Done'); b.type = 'button'; b.addEventListener('click', close); sh.appendChild(b);
    });
  }
  function playNext() {
    if (save.pending && save.pending.length) { openEvents(); return; }
    var mine = Season.myNext(save);
    if (!mine) {
      var rs = simDay();
      if (modernUI() && rs && rs.length) { try { restPage(rs); } catch (err) { save.pending = []; } }
      persist();
      if (save.pending && save.pending.length) openEvents(); else renderSeason();
      return;
    }
    var oppId = mine.home === save.myId ? mine.away : mine.home;
    var me = teamById(save.myId), opp = teamById(oppId);
    var label = save.phase === 'regular'
      ? 'Game ' + (save.rec[me.id].w + save.rec[me.id].l + 1) + ' · ' + (mine.home === me.id ? 'home' : 'away')
      : Season.roundInfo(save, mine.round).name;
    openPregame(me, opp, mine, label);
  }


  /* ---------- tonight: starters and keys to the game ---------- */
  var PREVSTATS = {};
  fetch('data/players-2025.json').then(function (r) { return r.json(); }).then(function (d) { (d.players || []).forEach(function (p) { if (p.prev) PREVSTATS[p.id] = p.prev; }); }).catch(function () {});
  /* what a player is averaging: this season once he has a few games, otherwise last season (the saved one, then the real one) */
  function statOf(p) {
    var x = save && save.lg && save.lg.stats && save.lg.stats[p.id];
    if (x && x.g >= 4) return { ls: false, g: x.g, pts: x.pts / x.g, trb: x.trb / x.g, ast: x.ast / x.g, stl: (x.stl || 0) / x.g, blk: (x.blk || 0) / x.g };
    var c = p.career && p.career.length ? p.career[p.career.length - 1] : null;
    if (c && c.g >= 10) return { ls: true, g: c.g, pts: c.pts / c.g, trb: c.trb / c.g, ast: c.ast / c.g, stl: (c.stl || 0) / c.g, blk: (c.blk || 0) / c.g };
    var q = p.ls || PREVSTATS[p.id];
    if (q && q.g >= 10) return { ls: true, g: q.g, pts: q.pts, trb: q.trb, ast: q.ast, stl: q.stl || 0, blk: q.blk || 0 };
    if (x && x.g) return { ls: false, g: x.g, pts: x.pts / x.g, trb: x.trb / x.g, ast: x.ast / x.g, stl: (x.stl || 0) / x.g, blk: (x.blk || 0) / x.g };
    return null;
  }
  /* the two numbers worth quoting for him, points first */
  function statPair(s, p) {
    var big = /C|F/.test(p.pos || '') && !/^G$/.test(p.pos || '');
    var opts = [['blocks', s.blk, 1.5, 0], ['steals', s.stl, 1.6, 0], ['assists', s.ast, 5, 1], ['rebounds', s.trb, 7, 1]].filter(function (o) { return o[1] >= o[2]; });
    var pick = opts.sort(function (u, v) { return v[1] / v[2] - u[1] / u[2]; })[0] || (big ? ['rebounds', s.trb] : ['assists', s.ast]);
    return [['points', s.pts], [pick[0], pick[1]]];
  }
  function statText(p, verbs) {
    var s = statOf(p); if (!s) return null;
    var pr = statPair(s, p), t = pr[0][1].toFixed(1) + ' ' + pr[0][0] + ' and ' + pr[1][1].toFixed(1) + ' ' + pr[1][0];
    return { s: s, t: t, now: (s.ls ? 'averaged ' : 'is averaging ') + t + (s.ls ? ' last season' : '') };
  }
  var POSV = { 'G': 1.2, 'G-F': 2.4, 'F': 3.4, 'F-C': 4.3, 'C': 5 };
  function slotRank(p) { return (POSV[p.pos] || 3) - ((p.ratings.ply || 50) - 50) / 200; }
  var KEYTPL = {
    hot: [
      function (c) { return c.n + ' is averaging ' + c.a3 + ' points over his last three, against ' + c.pp + ' on the season.'; },
      function (c) { return c.n + ' has scored ' + c.list + ' in his last three. Nobody has slowed him down.'; },
      function (c) { return c.t + ' come in with ' + c.n + ' on a run, ' + c.a3 + ' a night over his last three.'; },
      function (c) { return 'Watch ' + c.n + '. ' + c.a3 + ' points a game lately is well above his ' + c.pp + '.'; }
    ],
    slump: [
      function (c) { return c.n + ' is ' + c.fg + '-for-' + c.fga + ' over his last ' + c.gs + ' games. Something has to give.'; },
      function (c) { return c.n + ' has hit only ' + c.fg + ' of ' + c.fga + ' shots lately, and ' + c.t + ' need him sharper.'; },
      function (c) { return 'The shot is not falling for ' + c.n + ': ' + c.fg + '/' + c.fga + ' from the floor lately.'; },
      function (c) { return c.t + ' have a scorer in a hole: ' + c.n + ' is shooting ' + c.pct + '% over his last ' + c.gs + '.'; }
    ],
    board: [
      function (c) { return c.n + ' has averaged ' + c.a3 + ' rebounds over his last three. ' + (c.us ? 'The glass is yours to take.' : 'Box him out.'); },
      function (c) { return 'The glass belongs to ' + c.n + ' right now, ' + c.a3 + ' boards a night in his last three.'; }
    ],
    dime: [
      function (c) { return c.n + ' is running the show: ' + c.a3 + ' assists a game across his last three.'; },
      function (c) { return 'Everything goes through ' + c.n + ' lately. ' + c.a3 + ' assists a night over his last three.'; }
    ],
    streak: [
      function (c) { return c.t + ' have ' + (c.w ? 'won ' : 'lost ') + c.k + ' straight' + (c.w ? '.' : ' and need a response.'); },
      function (c) { return c.k + ' ' + (c.w ? 'wins' : 'losses') + ' in a row for ' + c.t + (c.w ? '. Confidence is high.' : '. The mood is heavy.'); },
      function (c) { return c.t + ' ' + (c.w ? 'are riding a ' + c.k + '-game winning streak.' : 'have dropped ' + c.k + ' on the bounce.'); }
    ],
    hurt: [
      function (c) { return c.t + ' are without ' + c.n + (c.out > 1 ? ' (out ' + c.out + ' more games)' : '') + '. Expect the rotation to shuffle.'; },
      function (c) { return c.n + ' is not playing for ' + c.t + ', which changes how they defend and score.'; },
      function (c) { return 'No ' + c.n + ' tonight. ' + c.t + ' will lean on their bench.'; }
    ],
    meet: [
      function (c) { return c.w + ' took the first meeting ' + c.sc + '. This is the rematch.'; },
      function (c) { return 'Last time, ' + c.w + ' won ' + c.sc + '. Both sides remember it.'; },
      function (c) { return 'These two met on ' + c.when + ', and ' + c.w + ' came out on top ' + c.sc + '.'; }
    ],
    rank: [
      function (c) { return c.t + ' ' + c.verb + ' ' + c.v + ' a night, ' + c.ord + ' in the league.'; },
      function (c) { return 'Numbers to know: ' + c.t + ' ' + c.verb + ' ' + c.v + ' a night, ' + c.ord + ' overall.'; },
      function (c) { return c.ord + ' in the league in ' + c.what + ': ' + c.t + ' at ' + c.v + '.'; }
    ],
    edge: [
      function (c) { return c.n + ' ' + c.ln + ', while ' + c.m + ' ' + c.lm + '. Feed him early.'; },
      function (c) { return 'The mismatch to attack: ' + c.n + ' (' + c.ln + ') against ' + c.m + '.'; },
      function (c) { return c.n + ' should get his way against ' + c.m + ', who ' + c.lm + '.'; }
    ],
    short: [
      function (c) { return c.n + ' is the one to stop: he ' + c.ln + '. ' + c.m + ' draws the assignment.'; },
      function (c) { return c.m + ' has the tough job against ' + c.n + ', who ' + c.ln + '.'; }
    ],
    home: [
      function (c) { return c.good ? c.t + ' are ' + c.rec + ' ' + c.where + '. It is a real edge.' : c.t + ' are just ' + c.rec + ' ' + c.where + ' and have not found their feet.'; },
      function (c) { return c.good ? (c.where === 'at home' ? c.t + ' have been hard to beat in their own building (' + c.rec + ').' : c.t + ' travel well, ' + c.rec + ' on the road.') : (c.where === 'at home' ? 'Home has not been kind to ' + c.t + ' (' + c.rec + ').' : c.t + ' struggle away from home (' + c.rec + ').'); }
    ],
    star: [
      function (c) { return c.n + ' is ' + c.t + '\u2019s engine, ' + c.v + '.'; },
      function (c) { return 'Everything runs through ' + c.n + ' for ' + c.t + ': ' + c.v + '.'; },
      function (c) { return c.t + ' will look for ' + c.n + ' early (' + c.v + ').'; },
      function (c) { return c.n + ' sets the tone for ' + c.t + ', ' + c.v + '.'; }
    ],
    rim: [
      function (c) { return c.n + ' ' + c.vb + ' ' + c.b + ' blocks a game' + (c.ls ? ' last season' : '') + '. ' + (c.us ? 'Anyone driving on you will think twice.' : 'Think twice before driving the lane.'); },
      function (c) { return 'The rim belongs to ' + c.n + ' (' + c.b + ' blocks ' + (c.ls ? 'a game last season' : 'a game') + '). ' + (c.us ? 'Keep him home and the paint stays closed.' : 'Pull him out or go around.'); }
    ],
    pest: [
      function (c) { return c.n + ' ' + c.vb + ' ' + c.s + ' steals a game' + (c.ls ? ' last season' : '') + '. ' + (c.us ? 'Pressure the ball and he will turn it into points.' : 'Protect the ball on his side.'); },
      function (c) { return c.us ? c.n + ' has ' + c.s + ' steals a game' + (c.ls ? ' to his name last season' : '') + '. Passing lanes belong to him.' : 'Careful with the pass near ' + c.n + ', who has ' + c.s + ' steals a game' + (c.ls ? ' to his name last season.' : '.'); }
    ],
    stand: [
      function (c) { return c.line; },
      function (c) { return c.line + ' Every game moves the line.'; }
    ],
    rookie: [
      function (c) { return c.n + ', ' + c.age + ', is putting up ' + c.line + ' as a rookie. The league is paying attention.'; },
      function (c) { return 'Rookie watch: ' + c.n + ' is at ' + c.line + ' and starting to look like a problem.'; }
    ],
    close: [
      function (c) { return c.t + ' are ' + c.rec + ' in games decided by five or fewer. Expect one possession to matter.'; },
      function (c) { return 'Close games have defined ' + c.t + ': ' + c.rec + ' in one-possession finishes.'; }
    ],
    last: [
      function (c) { return c.t + ' come off a ' + c.m + '-point ' + (c.won ? 'win' : 'loss') + (c.won ? ', and the bench was resting by the fourth.' : ' and will want to bounce back.'); },
      function (c) { return c.t + ' were ' + (c.won ? 'comfortable' : 'beaten up') + ' last time out, a ' + c.m + '-point margin.'; }
    ],
    series: [
      function (c) { return c.line + '.'; },
      function (c) { return c.line + '. Nothing is settled.'; }
    ]
  };
  var KEYBASE = { star: 3, stand: 3, series: 12, hot: 9, slump: 8, streak: 7, hurt: 8, board: 5, dime: 5, meet: 5, rank: 6, rim: 6, pest: 4, edge: 5, short: 5, home: 4, rookie: 5, close: 3, last: 4 };

  function pregameKeys(me, opp, mine, label, starters) {
    var pg = save.pg || (save.pg = { n: 0, k: {}, t: {}, s: {} });
    var f = formAll(), c = [], st = save.lg.stats;
    function tm(t) { return t.city; }
    function add(kind, subj, extra) { c.push({ kind: kind, subj: kind + ':' + subj, c: extra, score: (KEYBASE[kind] || 4) + Math.random() * 2.5 }); }
    function ptsOf(p) { var x = st[p.id]; return x && x.g ? x.pts / x.g : 0; }
    starters.forEach(function (row) {
      [[row.p, me], [row.o, opp]].forEach(function (pr) {
        var p = pr[0], t = pr[1], x = st[p.id];
        if (!x || !x.rc || x.rc.length < 3 || x.g < 8) return;
        var l3 = x.rc.slice(-3), pp = x.pts / x.g;
        var a3 = l3.reduce(function (a, g) { return a + g[0]; }, 0) / 3;
        if (a3 >= 18 && a3 - pp >= 6 && a3 >= pp * 1.28) add('hot', p.id, { n: lastName(p.name), t: tm(t), a3: a3.toFixed(1), pp: pp.toFixed(1), list: l3.map(function (g) { return g[0]; }).join(', ').replace(/, (\d+)$/, ' and $1') });
        var l4 = x.rc.slice(-4), fg = l4.reduce(function (a, g) { return a + g[1]; }, 0), fga = l4.reduce(function (a, g) { return a + g[2]; }, 0);
        if (fga >= 28 && fg / fga <= 0.37 && x.fga && x.fg / x.fga >= 0.42) add('slump', p.id, { n: lastName(p.name), t: tm(t), fg: fg, fga: fga, gs: l4.length, pct: Math.round(100 * fg / fga) });
        var r3 = l3.reduce(function (a, g) { return a + g[3]; }, 0) / 3;
        if (r3 >= 11 && r3 - x.trb / x.g >= 2.5) add('board', p.id, { us: t === me, n: lastName(p.name), a3: r3.toFixed(1) });
        var d3 = l3.reduce(function (a, g) { return a + g[4]; }, 0) / 3;
        if (d3 >= 8 && d3 - x.ast / x.g >= 2.5) add('dime', p.id, { n: lastName(p.name), a3: d3.toFixed(1) });
        if ((p.rookie || p.draftedYear === save.year) && x.g >= 6 && pp >= 8) add('rookie', p.id, { n: lastName(p.name), age: p.age, line: pp.toFixed(1) + ' points and ' + (x.trb / x.g).toFixed(1) + ' rebounds' });
      });
    });
    [[me, opp], [opp, me]].forEach(function (pr) {
      var t = pr[0], res = f[t.id] && f[t.id].res || [];
      if (res.length >= 3) {
        var last = res[res.length - 1], k = 0;
        for (var i = res.length - 1; i >= 0 && res[i] === last; i--) k++;
        if (k >= 3) add('streak', t.id, { t: tm(t), k: k, w: !!last });
        var rr = f[t.id], mg = rr.margin && rr.margin[rr.margin.length - 1];
        if (rr.margin && Math.abs(mg) >= 18) add('last', t.id, { t: tm(t), m: Math.abs(mg), won: mg > 0 });
        var cl = rr.close || { w: 0, l: 0 };
        if (cl.w + cl.l >= 6 && Math.abs(cl.w - cl.l) >= 3) add('close', t.id, { t: tm(t), rec: cl.w + '-' + cl.l });
        var hm = rr.home, aw = rr.away, here = (mine && mine.home === t.id);
        var sp = here ? hm : aw;
        if (sp && sp.w + sp.l >= 5 && (sp.w / (sp.w + sp.l) >= 0.75 || sp.w / (sp.w + sp.l) <= 0.25)) add('home', t.id, { t: tm(t), rec: sp.w + '-' + sp.l, where: here ? 'at home' : 'on the road', good: sp.w > sp.l });
      }
      var inj = League.rosterOf(save, t.id).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
      var ph = inj.slice(0, 4).filter(function (p) { return p.inj > 0; })[0];
      if (ph) add('hurt', ph.id, { t: tm(t), n: ph.name, out: ph.inj });
    });
    var teams = save.ids.filter(function (id) { return f[id] && f[id].g >= 6; });
    [[opp, me], [me, opp]].forEach(function (pr) {
      var t = pr[0], x = f[t.id]; if (!x || x.g < 6) return;
      var pa = teams.slice().sort(function (a, b) { return f[a].pa / f[a].g - f[b].pa / f[b].g; }), pf = teams.slice().sort(function (a, b) { return f[b].pf / f[b].g - f[a].pf / f[a].g; });
      var ip = pa.indexOf(t.id), io = pf.indexOf(t.id), n = teams.length;
      function ord(i) { var k = i + 1; return k + (k % 10 === 1 && k !== 11 ? 'st' : k % 10 === 2 && k !== 12 ? 'nd' : k % 10 === 3 && k !== 13 ? 'rd' : 'th'); }
      if (ip <= 3) add('rank', 'd' + t.id, { t: tm(t), verb: 'allow just', v: (x.pa / x.g).toFixed(1), ord: ord(ip), what: 'points allowed' });
      else if (ip >= n - 4) add('rank', 'd' + t.id, { t: tm(t), verb: 'give up', v: (x.pa / x.g).toFixed(1), ord: ord(ip), what: 'points allowed' });
      if (io <= 3) add('rank', 'o' + t.id, { t: tm(t), verb: 'score', v: (x.pf / x.g).toFixed(1), ord: ord(io), what: 'scoring' });
      else if (io >= n - 4) add('rank', 'o' + t.id, { t: tm(t), verb: 'average', v: (x.pf / x.g).toFixed(1), ord: ord(io), what: 'scoring' });
    });
    if (save.phase === 'regular') {
      var prev = (save.results || []).filter(function (r) { return (r.h === me.id && r.a === opp.id) || (r.h === opp.id && r.a === me.id); }).pop();
      if (prev) { var wn = prev.hs > prev.as ? prev.h : prev.a; add('meet', opp.id, { w: tm(teamById(wn)), sc: Math.max(prev.hs, prev.as) + '-' + Math.min(prev.hs, prev.as), when: 'game ' + (prev.d + 1) }); }
    } else if (mine && mine.series !== undefined) {
      var sr = save.playoffs.rounds[mine.round][mine.series], mi = sr.a === me.id ? 0 : 1, mw = sr.w[mi], ow = sr.w[1 - mi];
      add('series', 'x', { line: (mw === ow ? 'Series tied ' + mw + '-' + ow : mw > ow ? tm(me) + ' lead ' + mw + '-' + ow : tm(opp) + ' lead ' + ow + '-' + mw) });
    }
    starters.forEach(function (row) {
      var d = row.p.ratings.ovr - row.o.ratings.ovr, sp = statText(row.p), so = statText(row.o);
      if (!sp || !so) return;
      if (d >= 6) add('edge', row.p.id, { n: lastName(row.p.name), ln: sp.now, m: lastName(row.o.name), lm: so.now });
      else if (d <= -6) add('short', row.o.id, { n: lastName(row.o.name), ln: so.now, m: lastName(row.p.name) });
    });
    starters.forEach(function (row) {
      [row.p, row.o].forEach(function (p) {
        var s = statOf(p); if (!s) return;
        var us = p === row.p;
        var nm = lastName(p.name), vb = s.ls ? 'averaged' : 'averages';
        if (s.blk >= 1.8) add('rim', p.id, { us: us, n: nm, b: s.blk.toFixed(1), vb: vb, ls: s.ls });
        else if (s.stl >= 1.8) add('pest', p.id, { us: us, n: nm, s: s.stl.toFixed(1), vb: vb, ls: s.ls });
      });
    });
    [[me, 1], [opp, 0]].forEach(function (pr) {
      var t = pr[0], r = League.rosterOf(save, t.id).filter(function (p) { return !(p.inj > 0); }), best = null, bp = 0;
      r.forEach(function (p) { var x = st[p.id]; if (x && x.g >= 4 && x.pts / x.g > bp) { bp = x.pts / x.g; best = p; } });
      if (best) { var xb = st[best.id]; add('star', best.id, { t: tm(t), n: lastName(best.name), v: bp.toFixed(1) + ' points and ' + (xb.trb / xb.g).toFixed(1) + ' rebounds a night' }); }
      else {
        var cands = r.map(function (p) { return { p: p, s: statOf(p) }; }).filter(function (z) { return z.s; }).sort(function (u, v) { return v.s.pts - u.s.pts; })[0];
        if (cands) add('star', cands.p.id, { t: tm(t), n: lastName(cands.p.name), v: cands.s.pts.toFixed(1) + ' points and ' + cands.s.trb.toFixed(1) + ' rebounds a night' + (cands.s.ls ? ' last season' : '') });
      }
    });
    if (save.phase === 'regular') {
      var stn = Season.standings(save), dv = save.division[me.id], rows = stn[dv], at = 0;
      rows.forEach(function (r, k) { if (r.id === me.id) at = k; });
      var rm = save.rec[me.id], gp = rm.w + rm.l;
      if (gp >= 5) {
        var lead = rows[0], gap = at ? (lead.w - rm.w + rm.l - lead.l) / 2 : 0;
        var o2 = save.rec[opp.id], line = at === 0 ? tm(me) + ' sit first in the division at ' + rm.w + '-' + rm.l + ', with ' + opp.city + ' (' + o2.w + '-' + o2.l + ') next on the schedule.' : tm(me) + ' are ' + (at + 1) + (at === 1 ? 'nd' : at === 2 ? 'rd' : 'th') + ' in the division, ' + gap + ' back of ' + teamById(lead.id).city + '.';
        add('stand', 'x', { line: line });
      }
    }
    pg.n++;
    var cool = c.filter(function (k) { return pg.s[k.subj] && pg.n - pg.s[k.subj] < 12; }).sort(function (a2, b2) { return pg.s[a2.subj] - pg.s[b2.subj]; });
    c = c.filter(function (k) { return !(pg.s[k.subj] && pg.n - pg.s[k.subj] < 12); });
    c.forEach(function (k) { var lastK = pg.k[k.kind]; if (lastK && pg.n - lastK < 4) k.score -= 5; });
    c.sort(function (a, b) { return b.score - a.score; });
    var out = [], kinds = {}, subj = {};
    c.concat(cool).forEach(function (k) { if (out.length < 3 && !kinds[k.kind] && !subj[k.subj]) { kinds[k.kind] = 1; subj[k.subj] = 1; out.push(k); } });
    return out.map(function (k) {
      var pool = KEYTPL[k.kind], best = 0, bv = 1e9;
      pool.forEach(function (fn, i) { var u = pg.t[k.kind + i] || -99, v = u + Math.random(); if (v < bv) { bv = v; best = i; } });
      pg.t[k.kind + best] = pg.n; pg.k[k.kind] = pg.n; pg.s[k.subj] = pg.n;
      return pool[best](k.c);
    });
  }

  function openPregame(me, opp, mine, label) {
    var g = Engine.start(rosterFor(me.id), rosterFor(opp.id), save.year, undefined, undefined, { H: save.plan || null });
    var sh = g.onH.map(function (m) { return m.p; }).sort(function (u, v) { return slotRank(u) - slotRank(v); }), sa = g.onA.map(function (m) { return m.p; }).sort(function (u, v) { return slotRank(u) - slotRank(v); });
    var starters = sh.map(function (p, i) { return { p: p, o: sa[i] }; });
    var keys = pregameKeys(me, opp, mine, label, starters);
    persist();
    document.getElementById('pg-title').textContent = me.id === mine.home ? 'Tonight at home' : 'Tonight on the road';
    document.getElementById('pg-sub').textContent = label + ' · ' + Events.dateFor(save);
    var body = document.getElementById('pg-body');
    body.textContent = '';
    var f = formAll();
    var vs = el('div', 'pg-vs');
    [me, opp].forEach(function (t, i) {
      var box = el('div', 'pg-team' + (i ? ' r' : ''));
      box.appendChild(teamBadge(t));
      var tx = el('span');
      tx.appendChild(el('strong', null, t.city));
      var rc = save.rec[t.id], res = f[t.id] ? f[t.id].res : [];
      tx.appendChild(el('span', 'meta', (save.phase === 'regular' ? recText(t.id, rc) : '') + (res.length ? ' \u00B7 ' + streakOf(res) : '')));
      box.appendChild(tx);
      vs.appendChild(box);
      if (!i) vs.appendChild(el('b', 'pg-at', mine && mine.home === me.id ? 'v' : 'at'));
    });
    body.appendChild(vs);
    var st = save.lg.stats;
    function side(p, r) {
      var x = st[p.id], b = el('div', 'pg-p' + (r ? ' r' : ''));
      var av = makeAvatar(p); b.appendChild(av);
      var tx = el('span');
      tx.appendChild(el('strong', null, lastName(p.name)));
      var sx = statOf(p), line = sx ? sx.pts.toFixed(1) + ' pts \u00B7 ' + (statPair(sx, p)[1][1]).toFixed(1) + ' ' + ({ points: 'pts', blocks: 'blk', steals: 'stl', assists: 'ast', rebounds: 'reb' })[statPair(sx, p)[1][0]] : '';
      var hot = x && x.rc && x.rc.length >= 3 && (function () { var a = x.rc.slice(-3).reduce(function (s, g2) { return s + g2[0]; }, 0) / 3; return a - x.pts / x.g >= 6 && a >= 18; })();
      var cold = x && x.rc && x.rc.length >= 4 && (function () { var l4 = x.rc.slice(-4), fg = 0, fa = 0; l4.forEach(function (g2) { fg += g2[1]; fa += g2[2]; }); return fa >= 28 && fg / fa <= 0.37 && x.fg / x.fga >= 0.42; })();
      var m = el('span', 'meta' + (hot ? ' hot' : cold ? ' cold' : ''), (p.pos || '') + (line ? ' · ' + line : '') + (hot ? ' · hot' : cold ? ' · cold' : ''));
      tx.appendChild(m);
      b.appendChild(tx);
      return b;
    }
    starters.forEach(function (row) {
      var r = el('div', 'pg-row');
      r.appendChild(side(row.p, false));
      var d = row.p.ratings.ovr - row.o.ratings.ovr;
      var mid = el('span', 'pg-mid');
      mid.appendChild(el('b', 'ovr ' + level(row.p.ratings.ovr), String(row.p.ratings.ovr)));
      mid.appendChild(el('i', d > 1 ? 'up' : d < -1 ? 'dn' : '', d > 0 ? '+' + d : String(d)));
      mid.appendChild(el('b', 'ovr ' + level(row.o.ratings.ovr), String(row.o.ratings.ovr)));
      r.appendChild(mid);
      r.appendChild(side(row.o, true));
      body.appendChild(r);
    });
    var kt = el('div', 'pg-keys');
    kt.appendChild(el('h3', 'box-title', 'Keys to the game'));
    keys.forEach(function (k, i) {
      var c = el('p', 'pg-key');
      c.appendChild(el('b', null, String(i + 1)));
      c.appendChild(el('span', null, k));
      kt.appendChild(c);
    });
    if (!keys.length) { var q = el('p', 'pg-key'); q.appendChild(el('b', null, '1')); q.appendChild(el('span', null, 'Nothing stands out yet. Both sides are still finding their identity.')); kt.appendChild(q); }
    body.appendChild(kt);
    document.getElementById('btn-tip').onclick = function () { startLive(me, opp, mine, label); };
    show('screen-pregame');
  }

  /* Records the finished game, plays the rest of the day, and builds the event stack. */
  function completeGame(res, mine, me, opp, label) {
    var mineResult = {
      home: mine.home, away: mine.away, series: mine.series,
      hs: mine.home === me.id ? res.home : res.away,
      as: mine.home === me.id ? res.away : res.home
    };
    if (save.phase === 'regular') League.accumulate(save, res.homeLines.concat(res.awayLines), { h: mine.home, a: mine.away, hs: res.home, as: res.away, nh: res.homeLines.length, day: save.day });
    var others = Season.today(save).filter(function (g) {
      return g.home !== me.id && g.away !== me.id;
    }).map(simGame);
    var myInj = League.rollInjuries(save, res.homeLines, me.id, injMul()).concat(League.rollInjuries(save, res.awayLines, opp.id));
    League.tickInjuries(save, me.id); League.tickInjuries(save, opp.id);
    var before = {}, stb = Season.standings(save);
    Object.keys(stb).forEach(function (d) { before[d] = stb[d][0].id; });
    if (save.phase === 'regular') others.concat([mineResult]).forEach(function (g) { League.noteTeamGame(save, g.home, g.away, g.hs, g.as); });
    Season.record(save, others.concat([mineResult]));
    League.aiMoves(save, me.id, save.ids.map(teamById));
    rosterCache = {};
    if (save.phase !== 'regular') save.pd = (save.pd || 0) + 1;
    var us = res.home, them = res.away, won = us > them;
    var seriesLine = '';
    if (mine.series !== undefined) {
      var sr = save.playoffs.rounds[mine.round][mine.series];
      var mi = sr.a === me.id ? 0 : 1, mw = sr.w[mi], ow = sr.w[1 - mi];
      seriesLine = sr.winner ? (sr.winner === me.id ? me.city + ' win the series ' + mw + '-' + ow : me.city + ' are eliminated, ' + ow + '-' + mw)
        : mw > ow ? me.city + ' lead the series ' + mw + '-' + ow : mw < ow ? opp.city + ' lead the series ' + ow + '-' + mw : 'Series tied ' + mw + '-' + ow;
    }
    Events.afterGame(save, me, mineResult, rosterOf(me.id), won);
    var others2 = save.ids.map(teamById).filter(function (t) { return t.id !== me.id && t.id !== opp.id; });
    var dayGames = others.map(function (g) { return { home: g.home, away: g.away, hs: g.hs, as: g.as, lines: g.lines }; });
    dayGames.unshift({ home: mine.home, away: mine.away, hs: mineResult.hs, as: mineResult.as, mine: true, lines: mine.home === me.id ? { h: res.homeLines, a: res.awayLines } : { h: res.awayLines, a: res.homeLines } });
    var dayInj = myInj.concat(others.reduce(function (acc, g) { return acc.concat(g.inj || []); }, []));
    if (League.formCheck(save)) rosterCache = {};
    if (Social.has(save.year)) Social.day(save, dayGames, dayInj);
    cupNews();
    awardsCheck();
    yearEndCheck();
    save.pending = Events.generate(save, { me: me, opp: opp, res: res, us: us, them: them, rosterMe: rosterOf(me.id), rosterAll: League.rosterOf(save, me.id), label: label, seriesLine: seriesLine, others: others2, myInj: myInj, day: { games: dayGames, inj: dayInj }, before: before, teamOf: teamById, standing: standingLine(me.id) });
    persist();
    renderMatch(me, opp, res, save.year, label, true);
    show('screen-match');
  }

  /* One sentence on where the club sits after the game. */
  function standingLine(id) {
    var d = save.division[id], rows = Season.standings(save)[d], i = 0;
    rows.forEach(function (r, k) { if (r.id === id) i = k; });
    var me = rows[i], city = teamById(id).city;
    if (i === 0) return rows.length > 1 && rows[1].gb ? 'The result leaves ' + city + ' alone in first place in the ' + d + ' Division, ' + (rows[1].gb === 1 ? 'a game' : rows[1].gb + ' games') + ' clear.' : 'The result leaves ' + city + ' tied for first in the ' + divTitle(d) + '.';
    if (!me.gb) return 'The result leaves ' + city + ' level with ' + teamById(rows[0].id).city + ' at the top of the ' + divTitle(d) + '.';
    return 'The result leaves ' + city + ' ' + (me.gb === 1 ? 'a game' : me.gb + ' games') + ' behind ' + teamById(rows[0].id).city + ' in the ' + divTitle(d) + '.';
  }

  /* ---------- live match ---------- */
  var lv = null;
  var COURT_SPOTS = [[50, 41], [15, 52], [85, 52], [30, 80], [70, 80]];
  var OPP_SPOTS = [[50, 12], [29, 27], [71, 27], [36, 59], [64, 59]];
  var FULL_SVG = '<svg class="lines" viewBox="0 12 100 88" preserveAspectRatio="none" aria-hidden="true"><rect x="1.5" y="1.5" width="97" height="97"/><rect x="34" y="60" width="32" height="38.5" class="key"/><circle cx="50" cy="60" r="11"/><path d="M6 98.5V72A47.5 50.6 0 0 1 94 72V98.5"/><path d="M41 91h18"/><circle cx="50" cy="90" r="2"/><path d="M42 82.5a8 8 0 0 0 16 0" stroke-dasharray="1.5 1.5"/></svg>';
  /* a zone look: guards outside the arc, wings at the elbows of the key, the centre under the ring; the opponent's man sits beside each */
  /* the floor is cropped a little past the three-point line, so everything is placed on the 12%-100% band */
  function band(list) { return list.map(function (q) { return [q[0], Math.round((q[1] - 12) / 0.88 * 10) / 10]; }); }
  function fieldY(y) { return Math.round((5.66 + (100 - y) * 0.3726) * 10) / 10; }
  var ME_FULL = band([[33, 31], [67, 31], [76, 66], [24, 66], [50, 80]]);
  ME_FULL[0][1] = ME_FULL[1][1] = 30.4; /* guards stand on the three-point line */
  var OP_FULL = band([[18, 31], [82, 31], [91, 76], [9, 76], [66, 86]]);
  OP_FULL[0][1] = OP_FULL[1][1] = 27;
  function rankOrder(list) { return list.map(function (m, i) { return i; }).sort(function (u, v) { return slotRank(list[u].p) - slotRank(list[v].p); }); }
  var COURT_SVG = '<svg class="lines" viewBox="0 0 100 90" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="86"/><rect x="34" y="2" width="32" height="38"/><circle cx="50" cy="40" r="10"/><path d="M12 2v14a38 38 0 0 0 76 0V2"/><circle cx="50" cy="9" r="2.4"/><path d="M44 5h12"/></svg>';

  /* Puts the opponent's portrait inside the little circle when we have one. */
  function attachFace(node, p) {
    var exts = ['webp', 'png', 'jpg'], k = 0, img = new Image();
    node.classList.remove('face');
    node.textContent = lastName(p.name).slice(0, 3).toUpperCase();
    node.dataset.pid = p.id;
    var lab = el('span', 'opn', lastName(p.name));
    node.appendChild(lab);
    if (node._pp) node.appendChild(node._pp);
    img.onload = function () { if (node.dataset.pid !== p.id) return; node.textContent = ''; node.classList.add('face'); node.appendChild(img); node.appendChild(lab); if (node._pp) node.appendChild(node._pp); };
    img.onerror = function () { if (k < exts.length) img.src = 'assets/players/' + p.id + '.' + exts[k++]; };
    img.onerror();
  }

  function lastName(n) { var p = n.split(' ').filter(Boolean); while (p.length > 1 && /^(jr|sr|ii|iii|iv|v)\.?$/i.test(p[p.length - 1])) p.pop(); return p[p.length - 1]; }
  function periodLabel(g) { return g.q < 4 ? 'Q' + (g.q + 1) : (g.q === 4 ? 'OT' : 'OT' + (g.q - 3)); }
  function clockText(g) {
    var total = g.q < 4 ? 12 : 5, secs = Math.round((1 - g.k / g.limit) * total * 60);
    return Math.floor(secs / 60) + ':' + ('0' + (secs % 60)).slice(-2);
  }

  /* timers that wait while a player sheet is open, then carry on where they left off */
  function later(fn, ms) {
    return setTimeout(function () { if (lv && lv.paused) lv.held = fn; else fn(); }, ms);
  }
  function resumeLive() {
    if (!lv || !lv.paused) return;
    lv.paused = false;
    var f = lv.held; lv.held = null;
    if (f && !lv.skip) f();
  }
  function openLivePlayer(p, mine) {
    if (!lv || lv.skip || lv.g.over || lv.paused) return;
    var g = lv.g, row = (mine ? g.H : g.A).filter(function (x) { return x.p.id === p.id; })[0], s = row ? row.s : null;
    lv.paused = true;
    var done = false;
    function end() { if (done) return; done = true; resumeLive(); }
    hubSheet(p.name, function (sh, close) {
      sh.classList.add('lp');
      var top = el('div', 'lp-top');
      top.appendChild(makeAvatar(p));
      var tx = el('div');
      tx.appendChild(el('b', null, (p.pos || '') + (p.age ? ' \u00B7 age ' + p.age : '')));
      tx.appendChild(el('small', null, (mine ? lv.me : lv.opp).city));
      top.appendChild(tx);
      sh.appendChild(top);
      if (s) {
        var box = el('div', 'lp-grid');
        [['PTS', s.pts], ['REB', s.orb + s.drb], ['AST', s.ast], ['STL', s.stl], ['BLK', s.blk], ['TO', s.tov], ['FG', s.fg + '-' + s.fga], ['3PT', s.tp + '-' + s.tpa], ['FT', s.ft + '-' + s.fta], ['PF', s.pf]].forEach(function (k) {
          var c = el('div'); c.appendChild(el('b', null, String(k[1]))); c.appendChild(el('small', null, k[0])); box.appendChild(c);
        });
        sh.appendChild(box);
      }
      var sa = statOf(p);
      if (sa) sh.appendChild(el('p', 'sub', (sa.ls ? 'Last season: ' : 'This season: ') + sa.pts.toFixed(1) + ' pts \u00B7 ' + sa.trb.toFixed(1) + ' reb \u00B7 ' + sa.ast.toFixed(1) + ' ast'));
      var b = el('button', 'btn primary wide', 'Back to the game'); b.type = 'button';
      b.addEventListener('click', function () { close(); });
      sh.appendChild(b);
    }, end);
  }

  /* ---------- live orders: per-player instructions that take hold at the next dead ball ---------- */
  var ORDERS = {
    hunt:   { l: 'Hunt shots',        s: function (r) { return r.sco; },                                   ins: { use: 1.8 } },
    threes: { l: 'Look for 3s',       s: function (r) { return r.tpt * 0.7 + r.sht * 0.3; },              ins: { tp: 0.2, use: 1.15 } },
    rim:    { l: 'Attack the rim',    s: function (r, p) { return r.sco * 0.8 + ((p.hgt || 0) >= 80 ? 8 : 0); }, ins: { rim: 1, use: 1.3 } },
    run:    { l: 'Run the offence',   s: function (r) { return r.ply; },                                   ins: { pass: 1.9, use: 0.7 } },
    share:  { l: 'Take fewer shots',  s: function (r) { return 90 - r.sco; },                              ins: { use: 0.5 } },
    paint:  { l: 'Protect the paint', s: function (r, p) { return r.blk + ((p.hgt || 0) >= 82 ? 8 : 0); }, ins: { paint: 1 } },
    crash:  { l: 'Crash the boards',  s: function (r) { return Math.max(r.orb, r.drb); },                  ins: { crash: 1 } },
    press:  { l: 'Pressure the ball', s: function (r) { return r.stl; },                                   ins: { press: 1 } }
  };
  function orderChoices(p) {
    var r = p.ratings || {};
    return Object.keys(ORDERS).map(function (k) { return { k: k, v: ORDERS[k].s(r, p) }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, 5).map(function (x) { return x.k; });
  }
  function slotPlayer(i) { return lv.g.onH[slotIdx(lv.g.onH)[i]]; }
  var DORDERS = {
    double: { l: 'Double team',   d: { double: 1 } },
    sag:    { l: 'Sag off',       d: { sag: 1 } },
    deny:   { l: 'Deny the ball', d: { deny: 1 } }
  };
  function swapDefenders() {
    return lv.g.onH.slice().sort(function (u, v) { var f = function (x) { return x.p.ratings.stl + x.p.ratings.blk + x.p.ratings.ovr; }; return f(v) - f(u); }).slice(0, 2);
  }
  function orderLabel(key) {
    if (ORDERS[key]) return ORDERS[key].l;
    if (DORDERS[key]) return DORDERS[key].l;
    if (key.indexOf('sw:') === 0) { var r = lv.g.H.filter(function (x) { return x.p.id === key.slice(3); })[0]; return 'Switch: ' + (r ? lastName(r.p.name) : '') + ' guards him'; }
    return key;
  }
  function dinsFor(key) {
    if (DORDERS[key]) return Object.assign({}, DORDERS[key].d);
    var r = lv.g.H.filter(function (x) { return x.p.id === key.slice(3); })[0];
    if (!r) return null;
    var m = (r.p.ratings.stl + r.p.ratings.blk + r.p.ratings.ovr) / 3;
    return { match: Math.max(0.01, Math.min(0.05, (m - 45) / 1000)) };
  }
  /* each order is tracked from the moment it takes hold, so the recap can say whether it paid off */
  function snap(r) { var t = r.s; return { pts: t.pts, fg: t.fg, fga: t.fga, tp: t.tp, tpa: t.tpa, reb: t.orb + t.drb, tov: t.tov, blk: t.blk, stl: t.stl }; }
  function openRec(kk, key, row, opp) {
    lv.act[kk] = { key: key, row: row, opp: opp, s0: snap(row), my0: lv.g.hs, op0: lv.g.as, n0: lv.g.n, q: periodLabel(lv.g) };
  }
  function closeRec(kk) {
    var a = lv.act[kk]; if (!a) return;
    delete lv.act[kk];
    if (lv.g.n - a.n0 < 5) return;
    var my = lv.g.hs - a.my0, op = lv.g.as - a.op0, net = my - op, t = snap(a.row), n = lastName(a.row.p.name);
    var d = function (k) { return t[k] - a.s0[k]; };
    var verdict = net >= 3 ? 'It worked.' : net <= -3 ? 'It backfired.' : 'A wash.';
    var line = a.opp
      ? n + ': ' + d('pts') + ' pts on ' + d('fg') + '-' + d('fga') + ' shooting' + (d('pts') <= 3 ? ' \u2014 shut down' : d('pts') >= 10 ? ' \u2014 still got his' : '')
      : /^(threes)$/.test(a.key) ? n + ': ' + d('tp') + '-' + d('tpa') + ' from three'
      : a.key === 'crash' ? n + ': ' + d('reb') + ' boards'
      : a.key === 'paint' ? n + ': ' + d('blk') + ' blocks'
      : a.key === 'press' ? n + ': ' + d('stl') + ' steals'
      : n + ': ' + d('pts') + ' pts on ' + d('fg') + '-' + d('fga') + ' shooting';
    lv.calls.push({ label: n + ': ' + orderLabel(a.key).toLowerCase(), my: my, op: op, net: net, verdict: verdict, q: a.q, line: line });
  }
  function applyOrders() {
    var g = lv.g, any = false;
    Object.keys(lv.queue).forEach(function (kk) {
      var q = lv.queue[kk], opp = kk.charAt(0) === 'o', pid = opp ? kk.slice(1) : kk;
      var row = (opp ? g.A : g.H).filter(function (x) { return x.p.id === pid; })[0];
      delete lv.queue[kk];
      if (!row) return;
      any = true;
      if (q.bench) {
        g.rest.H[pid] = g.n + 10;
        tickerLine('Sub: ' + lastName(row.p.name) + ' to the bench', 'sys');
        return;
      }
      if (opp) {
        closeRec(kk);
        row.dins = q.key ? dinsFor(q.key) : null;
        if (q.key) openRec(kk, q.key, row, true);
        if (q.key) lv.orders[kk] = q.key; else delete lv.orders[kk];
        tickerLine(lastName(row.p.name) + ': ' + (q.key ? orderLabel(q.key).toLowerCase() : 'back to normal'), 'sys');
        return;
      }
      closeRec(pid);
      row.ins = q.key ? Object.assign({}, ORDERS[q.key].ins) : null;
      if (q.key) openRec(pid, q.key, row, false);
      if (q.key) lv.orders[pid] = q.key; else delete lv.orders[pid];
      tickerLine(lastName(row.p.name) + ': ' + (q.key ? ORDERS[q.key].l.toLowerCase() : 'back to normal'), 'sys');
    });
    if (any) { syncCourt(); refreshDetail(); renderRail(); }
  }
  function toggleOrder(kk, key) {
    var q = lv.queue[kk];
    if (q && !q.bench && q.key === key) delete lv.queue[kk];
    else if (!q && lv.orders[kk] === key) lv.queue[kk] = { key: '' };
    else lv.queue[kk] = { key: key };
    refreshDetail(); renderRail();
  }
  function toggleBench(pid) {
    if (lv.queue[pid] && lv.queue[pid].bench) delete lv.queue[pid]; else lv.queue[pid] = { bench: true };
    refreshDetail(); renderRail();
  }
  function renderRail() {
    var rail = document.getElementById('live-rail');
    if (!rail || !lv || !lv.g) return;
    rail.textContent = '';
    lv.rail = [];
    for (var i = 0; i < 5; i++) {
      var row = slotPlayer(i), p = row.p;
      var c = el('button', 'lr' + (lv.sel === p.id && !lv.selA ? ' on' : '') + (lv.queue[p.id] ? ' q' : '') + (lv.orders[p.id] ? ' o' : ''));
      c.type = 'button';
      c.appendChild(makeAvatar(p));
      c.appendChild(el('b', null, lastName(p.name)));
      var pts = el('span', 'lr-pts', String(row.s.pts));
      c.appendChild(pts);
      var sub = el('small', null, row.s.orb + row.s.drb + ' reb \u00B7 ' + row.s.ast + ' ast');
      c.appendChild(sub);
      (function (id) { c.addEventListener('click', function () { selectPlayer(id); }); })(p.id);
      rail.appendChild(c);
      lv.rail.push({ pts: pts, sub: sub, pid: p.id });
    }
  }
  function selectPlayer(pid) {
    if (!lv || lv.skip) return;
    if (lv.pickFn) { lv.pickFn(pid); return; }
    var same = lv.sel === pid && !lv.selA;
    lv.selA = false;
    lv.sel = same ? null : pid;
    renderRail(); renderDetail();
  }
  function selectOpp(pid) {
    if (!lv || lv.skip || lv.pickFn) return;
    if (lv.sel === pid && lv.selA) { lv.sel = null; lv.selA = false; }
    else { lv.sel = pid; lv.selA = true; }
    renderRail(); renderDetail();
  }
  function renderDetail() {
    var box = document.getElementById('pdetail'), tk = document.getElementById('ticker');
    if (!box) return;
    lv.det = null;
    if (!lv.sel) { box.hidden = true; tk.hidden = false; box.textContent = ''; return; }
    var opp = !!lv.selA, side = opp ? lv.g.A : lv.g.H;
    var row = side.filter(function (x) { return x.p.id === lv.sel; })[0];
    if (!row) { lv.sel = null; lv.selA = false; renderDetail(); return; }
    var p = row.p, kk = opp ? 'o' + p.id : p.id;
    tk.hidden = true; box.hidden = false; box.textContent = '';
    var head = el('div', 'pd-head');
    head.appendChild(el('b', null, p.name));
    head.appendChild(el('small', null, (p.pos || '') + ' \u00B7 ' + (opp ? lv.opp.city : (p.ratings ? p.ratings.ovr + ' ovr' : ''))));
    var x = el('button', 'pd-x', '\u00D7'); x.type = 'button';
    x.addEventListener('click', function () { lv.sel = null; lv.selA = false; renderRail(); renderDetail(); });
    head.appendChild(x);
    box.appendChild(head);
    var grid = el('div', 'pd-grid'), cells = {};
    ['PTS', 'REB', 'AST', 'FG', '3PT', 'STL', 'BLK', 'TO', 'FT', 'PF'].forEach(function (k) {
      var c = el('div'); var v = el('b', null, '0'); c.appendChild(v); c.appendChild(el('small', null, k)); grid.appendChild(c); cells[k] = v;
    });
    box.appendChild(grid);
    var chips = el('div', 'pd-chips'), cm = {}, bn = null;
    if (opp) {
      var keys = ['double', 'sag', 'deny'].concat(swapDefenders().map(function (r) { return 'sw:' + r.p.id; }));
      keys.forEach(function (k) {
        var b = el('button', 'pd-chip', orderLabel(k)); b.type = 'button';
        b.addEventListener('click', function () { toggleOrder(kk, k); });
        chips.appendChild(b); cm[k] = b;
      });
    } else {
      orderChoices(p).forEach(function (k) {
        var b = el('button', 'pd-chip', ORDERS[k].l); b.type = 'button';
        b.addEventListener('click', function () { toggleOrder(kk, k); });
        chips.appendChild(b); cm[k] = b;
      });
      bn = el('button', 'pd-chip bench', 'Bench'); bn.type = 'button';
      bn.disabled = lv.g.H.length <= 5;
      bn.addEventListener('click', function () { toggleBench(p.id); });
      chips.appendChild(bn);
    }
    box.appendChild(chips);
    lv.det = { row: row, kk: kk, cells: cells, chips: cm, bench: bn };
    refreshDetail();
  }
  function refreshDetail() {
    var d = lv && lv.det; if (!d) return;
    var s = d.row.s, kk = d.kk, q = lv.queue[kk];
    var v = { PTS: s.pts, REB: s.orb + s.drb, AST: s.ast, FG: s.fg + '-' + s.fga, '3PT': s.tp + '-' + s.tpa, STL: s.stl, BLK: s.blk, TO: s.tov, FT: s.ft + '-' + s.fta, PF: s.pf };
    Object.keys(v).forEach(function (k) { d.cells[k].textContent = v[k]; });
    Object.keys(d.chips).forEach(function (k) {
      var on = !q && lv.orders[kk] === k, qd = q && !q.bench && q.key === k;
      d.chips[k].className = 'pd-chip' + (on ? ' on' : '') + (qd ? ' q' : '');
    });
    if (d.bench) {
      d.bench.className = 'pd-chip bench' + (q && q.bench ? ' q' : '');
      d.bench.textContent = q && q.bench ? 'Subbing next' : 'Bench';
    }
  }

  function startLive(me, opp, mine, label) {
    var g = Engine.start(rosterFor(me.id), rosterFor(opp.id), save.year, undefined, undefined, { H: save.plan || null });
    lv = { g: g, me: me, opp: opp, mine: mine, label: label, da: 0, db: 0, hist: [], feed: [], fq: {}, fo: {}, count: 0, tovM: 0, tovO: 0, plan: null, calls: [], lastKind: '', done: {}, lastDec: -99, timer: null, skip: false, orders: {}, queue: {}, act: {}, sel: null, dead: true };
    var top = document.getElementById('live-top');
    top.textContent = '';
    [[me, 'a', false], [opp, 'b', true]].forEach(function (t, i) {
      var box = el('div', 'lt-team' + (t[2] ? ' r' : ''));
      box.appendChild(teamBadge(t[0]));
      var tx = el('span');
      tx.appendChild(el('strong', null, t[0].name));
      var sc = el('span', 'sc', '0');
      sc.id = 'lv-' + t[1];
      tx.appendChild(sc);
      box.appendChild(tx);
      top.appendChild(box);
      if (i === 0) {
        var mid = el('div', 'lt-mid');
        var cl = el('b', null, '12:00'); cl.id = 'lv-clock';
        var pr = el('small', null, 'Q1'); pr.id = 'lv-period';
        mid.appendChild(cl); mid.appendChild(pr);
        top.appendChild(mid);
      }
    });
    var court = document.getElementById('court');
    court.textContent = '';
    var full = modernUI(), field = court;
    court.innerHTML = full ? '' : COURT_SVG;
    court.classList.toggle('full', full);
    if (full) {
      var home = mine && mine.home === me.id ? me : opp;
      court.style.setProperty('--home', (home.colors && home.colors[0]) || '#C8102E');
      court.style.setProperty('--home2', (home.colors && home.colors[1]) || '#fff');
      // a full-length floor at true proportions: the live action is the top half, the far end fades out
      court.textContent = '';
      field = el('div', 'cfield');
      court.classList.remove('real', 'whole'); court.classList.add('loading');
      court.appendChild(field);
      // one picture of the whole floor, border and all; the old two-halves build is the fallback
      (function () {
        var im = new Image();
        im.onload = function () { field.style.backgroundImage = 'url(' + im.src + ')'; court.classList.add('real', 'whole'); court.classList.remove('loading'); };
        im.onerror = function () {
          ['t', 'b'].forEach(function (k) { var h = el('div', 'ch ' + k); h.innerHTML = FULL_SVG; field.appendChild(h); });
          var h2 = new Image(), k2 = 0, exts = ['webp', 'png', 'jpg'];
          h2.onload = function () {
            Array.prototype.forEach.call(field.querySelectorAll('.ch'), function (h) { h.style.backgroundImage = 'url(' + h2.src + ')'; });
            court.classList.add('real'); court.classList.remove('loading');
          };
          h2.onerror = function () { k2++; if (k2 < exts.length) h2.src = 'assets/courts/' + home.id + '.' + exts[k2]; else court.classList.remove('loading'); };
          h2.src = 'assets/courts/' + home.id + '.' + exts[0];
        };
        // the City Edition floor goes down for about a quarter of the home dates between November and March
        var kind = 'full', dt = save && save.phase === 'regular' && save.dates && save.dates[save.day];
        var gm = save && save.phase === 'regular' && save.gmeta && save.gmeta[save.day], gi = -1;
        if (gm) (save.days[save.day] || []).forEach(function (x, i) { if (x[0] === home.id) gi = i; });
        if (gm && gi >= 0 && gm[gi] && /Cup/.test(gm[gi][0] || '')) kind = 'cup';
        else if (dt && dt >= '2026-11-01' && dt < '2027-04-01' && home.id) {
          var hh = 0, key = home.id + dt;
          for (var q = 0; q < key.length; q++) hh = (hh * 31 + key.charCodeAt(q)) >>> 0;
          if (hh % 100 < 24) kind = 'city';
        }
        if (kind === 'city' || kind === 'cup') {
          var im2 = new Image();
          im2.onload = function () { field.style.backgroundImage = 'url(' + im2.src + ')'; court.classList.add('real', 'whole'); court.classList.remove('loading'); };
          im2.onerror = function () { im.src = 'assets/courts/full/' + home.id + '.webp'; };
          im2.src = 'assets/courts/' + kind + '/' + home.id + '.webp';
        } else im.src = 'assets/courts/full/' + home.id + '.webp';
      })();
    }
    lv.pl = []; lv.op = [];
    lv.ids = [];
    var oH = full ? rankOrder(g.onH) : [0, 1, 2, 3, 4], oA = full ? rankOrder(g.onA) : [0, 1, 2, 3, 4];
    COURT_SPOTS.forEach(function (sp, i) {
      var p = g.onH[oH[i]].p, o = g.onA[oA[i]].p;
      lv.ids.push(p.id + '|' + o.id);
      var d = el('div', 'op');
      attachFace(d, o);
      d.style.left = (full ? OP_FULL : OPP_SPOTS)[i][0] + '%';
      d.style.top = (full ? fieldY(OP_FULL[i][1]) : OPP_SPOTS[i][1]) + '%';
      (function (i2) { d.addEventListener('click', function () { if (lv.pickFn) return; if (full) selectOpp(lv.g.onA[slotIdx(lv.g.onA)[i2]].p.id); else openLivePlayer(lv.g.onA[slotIdx(lv.g.onA)[i2]].p, false); }); })(i);
      d.dataset.bx = parseFloat(d.style.left); d.dataset.by = parseFloat(d.style.top);
      field.appendChild(d); lv.op.push(d);
      var b = el('button', 'pl');
      b.type = 'button';
      if (full) sp = ME_FULL[i];
      b.style.left = sp[0] + '%'; b.style.top = (full ? fieldY(sp[1]) : sp[1]) + '%';
      b.dataset.bx = parseFloat(b.style.left); b.dataset.by = parseFloat(b.style.top);
      b.appendChild(makeAvatar(p));
      b.appendChild(el('span', 'nm', lastName(p.name)));
      var pp = el('span', 'pp', '0'); b.appendChild(pp);
      (function (i2) { b.addEventListener('click', function () { if (full) selectPlayer(slotPlayer(i2).p.id); else { if (b.classList.contains('pick')) return; openLivePlayer(lv.g.onH[slotIdx(lv.g.onH)[i2]].p, true); } }); })(i);
      field.appendChild(b); lv.pl.push({ el: b, pp: pp });
    });
    lv.rank = full;
    renderRail(); renderDetail();
    document.getElementById('ticker').textContent = '';
    tickerLine('Tip-off. ' + me.city + ' v ' + opp.city + '.', 'sys');
    document.getElementById('live-dock').textContent = '';
    skipButton();
    show('screen-live');
    lv.timer = later(liveTick, 900);
  }

  /* teams swap ends after the break: the floor turns round and everyone is mirrored */
  function flipCourt() {
    var court = document.getElementById('court');
    if (!court || !court.classList.contains('full') || lv.flipped || court.querySelector('.cfield')) return;
    lv.flipped = true;
    court.classList.add('flip');
    Array.prototype.forEach.call(court.querySelectorAll('.pl, .op'), function (e) {
      e.style.left = (100 - parseFloat(e.style.left)) + '%';
      e.style.top = (100 - parseFloat(e.style.top)) + '%';
    });
  }

  function skipButton() {
    var dock = document.getElementById('live-dock');
    dock.textContent = '';
    var b = el('button', 'btn primary wide', 'Skip to the final buzzer');
    b.type = 'button';
    b.addEventListener('click', function () {
      clearTimeout(lv.timer);
      lv.skip = true;
      while (!lv.g.over) Engine.step(lv.g);
      finishLive();
    });
    dock.appendChild(b);
  }

  function tickerLine(text, cls) {
    var t = document.getElementById('ticker');
    var line = el('div', 'tk' + (cls ? ' ' + cls : ''), text);
    t.insertBefore(line, t.firstChild);
    while (t.children.length > 9) t.removeChild(t.lastChild);
  }

  function evText(ev, mine) {
    var who = lastName(ev.who || '');
    if (ev.kind === 'made') return who + ' scores ' + ev.pts + (ev.ast ? ', assist ' + lastName(ev.ast) : '');
    if (ev.kind === 'tov') return who + ' turns it over' + (ev.stl ? ', stolen by ' + lastName(ev.stl) : '');
    if (ev.kind === 'foul') return who + ' is fouled, ' + ev.ftm + ' of ' + ev.fta + ' at the line' + (ev.and1 ? ' and the bucket' : '');
    return who + ' misses' + (ev.blk ? ', blocked by ' + lastName(ev.blk) : '');
  }

  /* Keeps the court dots in step with whoever the sim has on the floor. */
  function slotIdx(list) { return lv.rank ? rankOrder(list) : [0, 1, 2, 3, 4]; }
  function syncCourt() {
    var g = lv.g, oH = slotIdx(g.onH), oA = slotIdx(g.onA);
    for (var i = 0; i < 5; i++) {
      var p = g.onH[oH[i]].p, o = g.onA[oA[i]].p, key = p.id + '|' + o.id;
      if (lv.ids[i] === key) continue;
      var slot = lv.pl[i], old = lv.ids[i].split('|');
      lv.ids[i] = key;
      if (old[0] !== p.id) {
        slot.el.textContent = '';
        slot.el.appendChild(makeAvatar(p));
        slot.el.appendChild(el('span', 'nm', lastName(p.name)));
        slot.pp = el('span', 'pp', String(g.onH[oH[i]].s.pts));
        slot.el.appendChild(slot.pp);
        slot.el.classList.remove('flash'); void slot.el.offsetWidth; slot.el.classList.add('flash');
      }
      if (old[1] !== o.id) attachFace(lv.op[i], o);
    }
    if (lv.rail && lv.rail.some(function (c, i) { return c.pid !== g.onH[oH[i]].p.id; })) { if (lv.sel && !lv.selA && !g.onH.some(function (x) { return x.p.id === lv.sel; })) { lv.sel = null; renderRail(); renderDetail(); } else renderRail(); }
  }

  /* players drift and step into their shots: the shooter moves to where he'd take it from and his man follows */
  var FT_PCT = 100 / 106, OOB_PCT = 5.66;
  function arcFt(xPct) { var dx = (xPct - 50) * 0.5; return Math.abs(dx) >= 22 ? 14 : 5.25 + Math.sqrt(Math.max(0, 23.75 * 23.75 - dx * dx)); }
  function ftToTop(ft) { return OOB_PCT + ft * FT_PCT; }
  function place(node, x, y) { node.style.left = x.toFixed(1) + '%'; node.style.top = y.toFixed(1) + '%'; }
  function moveCourt(mineSide, idx, ev, evObj) {
    return;
    var offs = mineSide ? lv.pl.map(function (p) { return p.el; }) : lv.op, defs = mineSide ? lv.op : lv.pl.map(function (p) { return p.el; });
    var j = function (v) { return (Math.random() - 0.5) * v; };
    offs.concat(defs).forEach(function (n) { place(n, parseFloat(n.dataset.bx) + j(3), parseFloat(n.dataset.by) + j(1.6)); });
    if (idx < 0 || idx > 4 || ev.kind === 'tov') return;
    var o = offs[idx], bx = parseFloat(o.dataset.bx), by = parseFloat(o.dataset.by), tx, ty;
    var made = ev.kind === 'made', three = ev.three;
    if (three) {
      tx = Math.max(7, Math.min(93, bx + (bx < 50 ? -6 : 6)));
      ty = ftToTop(arcFt(tx) + 1.6);
    } else if (made || ev.kind === 'foul') {
      tx = 50 + (bx - 50) * 0.6 + j(6); ty = ftToTop(10 + Math.random() * 5);
    } else {
      tx = 50 + (bx - 50) * 0.6; ty = ftToTop(9 + Math.random() * 9);
    }
    place(o, tx, ty);
    var d = defs[idx];
    place(d, tx + (tx < 50 ? 7 : -7), ty - 2.4);
    if (ev.ast) {
      var pidx = -1, list = mineSide ? lv.g.onH : lv.g.onA, ord = slotIdx(list);
      for (var i = 0; i < 5; i++) if (list[i].p.name === ev.ast) pidx = ord.indexOf(i);
      if (pidx >= 0 && pidx !== idx) { var pn = offs[pidx]; place(pn, parseFloat(pn.dataset.bx) + (tx < 50 ? -3 : 3), parseFloat(pn.dataset.by) - 3); }
    }
  }

  function showPoss(evObj, mineSide) {
    var g = lv.g, ev = evObj.ev;
    syncCourt();
    var list = mineSide ? g.onH : g.onA;
    var idx = -1;
    var ord = slotIdx(list);
    for (var i = 0; i < 5; i++) if (list[i].p.name === ev.who) idx = ord.indexOf(i);
    lv.pl.forEach(function (p) { p.el.classList.remove('ball'); });
    lv.op.forEach(function (o) { o.classList.remove('ball'); });
    if (idx >= 0) (mineSide ? lv.pl[idx].el : lv.op[idx]).classList.add('ball');
    if (mineSide && idx >= 0) {
      var node = lv.pl[idx].el;
      node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash');
      if (evObj.pts > 0) {
        var pop = el('span', 'pop', '+' + evObj.pts);
        node.appendChild(pop);
        setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 950);
      } else if (ev.kind === 'tov') {
        var bad = el('span', 'pop bad', 'TO');
        node.appendChild(bad);
        setTimeout(function () { if (bad.parentNode) bad.parentNode.removeChild(bad); }, 950);
      }
    }
    if (evObj.pts > 0 || ev.kind === 'tov' || ev.kind === 'foul' || ev.blk) {
      tickerLine((mineSide ? '' : lv.opp.city + ': ') + evText(ev, mineSide), mineSide ? 'me' : '');
    }
  }

  function updateLive() {
    var g = lv.g;
    document.getElementById('lv-a').textContent = lv.da;
    document.getElementById('lv-b').textContent = lv.db;
    document.getElementById('lv-clock').textContent = clockText(g);
    document.getElementById('lv-period').textContent = periodLabel(g);
    var oh = slotIdx(g.onH);
    for (var i = 0; i < 5; i++) { lv.pl[i].pp.textContent = g.onH[oh[i]].s.pts; var rc = lv.rail && lv.rail[i]; if (rc) { var rs = g.onH[oh[i]].s; rc.pts.textContent = rs.pts; rc.sub.textContent = (rs.orb + rs.drb) + ' reb \u00B7 ' + rs.ast + ' ast'; } }
    refreshDetail();
  }

  /* ---------- timeout decisions: situational, each with its own trade-off ---------- */
  function sumFeed(n, key) { var t = 0; lv.feed.slice(-n).forEach(function (f) { t += f[key]; }); return t; }
  function feedBy(n, who, side) {
    var t = 0;
    lv.feed.slice(-n).forEach(function (f) { if (side === 'm' ? f.mw === who : f.ow === who) t += side === 'm' ? f.mp : f.op; });
    return t;
  }

  /* the only thing that stops the game: the last shot of a game you can still win */
  function decisionDue() {
    var g = lv.g, diff = g.hs - g.as;
    if (g.over || g.q < 3 || g.k !== g.limit - 1 || diff > 0 || diff < -3) return null;
    var key = 'clutch' + g.q;
    if (lv.done[key]) return null;
    lv.done[key] = 1;
    return { kind: 'clutch' };
  }

  function hotLine(x) { return x.s.pts + ' pts, ' + x.s.fg + '-' + x.s.fga; }
  function bestOn(list, f) { return list.slice().sort(function (a, b) { return f(b) - f(a); })[0]; }

  function buildOptions(spec) {
    var g = lv.g, W = 12, me = lv.me.city, opp = lv.opp.city;
    var top = bestOn(g.onH, function (x) { return x.s.pts + x.p.ratings.sco / 100; });
    var big = bestOn(g.onH, function (x) { return x.p.hgt || 0; });
    var guard = bestOn(g.onH, function (x) { return x.p.ratings.ply; });
    var oppTop = bestOn(g.onA, function (x) { return x.s.pts + x.p.ratings.sco / 100; });
    var k = spec.kind, x = spec.x, ln = x ? lastName(x.p.name) : '';
    var out = { title: '', opts: [] };
    function o(t, s, mods, extra) { out.opts.push({ t: t, s: s, mods: mods || {}, extra: extra || {}, win: W }); }
    if (k === 'foul') {
      var left = 6 - x.s.pf;
      out.title = ln + ' has ' + x.s.pf + ' fouls. ' + (left === 1 ? 'One more and he is out.' : left + ' more and he is out.');
      o('Keep ' + ln + ' in', hotLine(x) + ' · full strength, but he could foul out', {});
      o('Sit ' + ln + ' down', 'Bench steps in for a stretch, then he returns', {}, { rest: x.p.id, restN: 12 });
      o('Tell ' + ln + ' to play it safe', 'Fewer fouls on him, softer defence', { protect: x.p.id, oppFgMul: 1.06 });
    } else if (k === 'myHot') {
      out.title = ln + ' has scored ' + spec.v + ' in the last few minutes.';
      o('Ride ' + ln, hotLine(x) + ' · call his number again', { focus: x.p.id, focusW: 2.8, fgMul: 1.03 });
      o('Keep it balanced', 'Move the ball, more assists, defence expects ' + ln, { flat: 1, astMul: 1.4, fgMul: 1.02 });
      o('Run the clock', 'Fewer risks, fewer mistakes, a slower game', { tovAdd: -0.04, fgMul: 0.98 });
    } else if (k === 'oppHot') {
      var on = lastName(x.p.name);
      out.title = on + ' has ' + spec.v + ' on you in a hurry.';
      o('Double-team ' + on, 'He gets fewer shots, others get open, more fouls', { double: x.p.id, foulAdd: 0.03, oppTovAdd: 0.05, oppFgMul: 0.96 });
      o('Switch the defence', 'Put your best man on him · tougher all round', { oppFgMul: 0.9 });
      o('Outscore him', 'Race them: ' + me + ' shoot faster, sloppier', { fgMul: 1.11, tovAdd: 0.02 });
    } else if (k === 'run') {
      out.title = opp + ' have outscored you ' + spec.v + ' points in the last six trips.';
      o('Take the timeout', 'Settle the boys down · tougher defence, safer passes', { oppFgMul: 0.9, tovAdd: -0.02 });
      o('Press full court', 'Steals and turnovers, but more fouls', { oppTovAdd: 0.08, foulAdd: 0.05 });
      o('Stay with the plan', 'No changes, trust the club', {});
    } else if (k === 'cold') {
      out.title = ln + ' is ' + x.s.fg + ' for ' + x.s.fga + ' tonight.';
      o('Stay with ' + ln, 'Trust the shooter · he is due', { focus: x.p.id, focusW: 1.6 });
      o('Run plays for the others', 'Spread the shots and the passes', { flat: 1, astMul: 1.3 });
      o('Sit ' + ln + ' down', 'A few minutes on the bench to clear his head', {}, { rest: x.p.id, restN: 8 });
    } else if (k === 'sloppy') {
      out.title = 'Four turnovers in the last few minutes. The bench is muttering.';
      o('Slow it down', 'Safe passes, fewer shots, fewer mistakes', { tovAdd: -0.06, fgMul: 0.97 });
      o('Keep running', 'Fast and loose, mistakes and all', { fgMul: 1.04, tovAdd: 0.02 });
      o(lastName(guard.p.name) + ' takes charge', 'Your best passer runs the offence', { focus: guard.p.id, focusW: 1.8, tovAdd: -0.03 });
    } else if (k === 'half') {
      var lead = g.hs - g.as;
      out.title = 'Halftime. ' + (lead > 0 ? me + ' lead by ' + lead + '.' : lead < 0 ? me + ' trail by ' + (-lead) + '.' : 'All square.') + ' What do you say to them?';
      out.win = 16;
      W = 16;
      o(lead < 0 ? 'Challenge them' : 'Keep the foot down', 'Fire them up · sharper shooting, but more fouls and mistakes', { fgMul: 1.1, foulAdd: 0.03, tovAdd: 0.012 });
      o('Adjust the defence', 'Tighten up on ' + lastName(oppTop.p.name) + ' and the rest', { oppFgMul: 0.92 });
      o('Stay calm', 'Quiet words · cleaner ball, steady shooting', { tovAdd: -0.04, fgMul: 1.01 });
    } else if (k === 'late') {
      out.title = 'Four minutes left and it is close. ' + me + ' ' + g.hs + ', ' + opp + ' ' + g.as + '.';
      o('Ride ' + lastName(top.p.name), hotLine(top) + ' · put the ball in his hands', { focus: top.p.id, focusW: 2.5, fgMul: 1.02 });
      o('Press for a steal', 'Gamble on turnovers, but more fouls', { oppTovAdd: 0.07, foulAdd: 0.06 });
      o('Slow it down', 'Work for the good shot, protect the ball', { tovAdd: -0.05, fgMul: 0.98 });
    } else {
      var pool = [
        ['Pound it inside to ' + lastName(big.p.name), 'The tallest man on the floor gets the ball', { focus: big.p.id, focusW: 2.2 }],
        ['Push the pace', 'Fast breaks, but more turnovers', { fgMul: 1.1, tovAdd: 0.02 }],
        ['Tighten the defence', 'Tougher on them, a few more fouls', { oppFgMul: 0.93, foulAdd: 0.04 }],
        ['Slow it down', 'Cleaner ball, fewer shots', { tovAdd: -0.04, fgMul: 0.99 }],
        ['Let ' + lastName(guard.p.name) + ' run things', 'Your best passer sets up the others', { focus: guard.p.id, focusW: 1.8, astMul: 1.25 }],
        ['Crash the boards', 'More second chances, a little less defence', { fgMul: 1.02, oppFgMul: 1.03, astMul: 0.9 }]
      ];
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      out.title = 'Timeout. ' + me + ' ' + g.hs + ', ' + opp + ' ' + g.as + '. What is the plan?';
      pool.slice(0, 3).forEach(function (p) { o(p[0], p[1], p[2]); });
    }
    return out;
  }

  function showDecision(spec) {
    var g = lv.g, dock = document.getElementById('live-dock');
    dock.textContent = '';
    syncCourt();
    var when = periodLabel(g) + ' ' + clockText(g) + ' · ' + lv.me.city + ' ' + g.hs + ', ' + lv.opp.city + ' ' + g.as;
    if (spec.kind === 'clutch') {
      tickerLine('Final possession.', 'sys');
      dock.appendChild(el('p', 'dec-title', when));
      lv.pl.forEach(function (p) { p.el.classList.add('pick'); });
      lv.sel = null; renderRail(); renderDetail();
      Array.prototype.forEach.call(document.querySelectorAll('.lr'), function (c) { c.classList.add('pick'); });
      lv.pickFn = function (pid) {
        var hp = g.onH.filter(function (x) { return x.p.id === pid; })[0];
        if (!hp) return;
        lv.pickFn = null;
        lv.pl.forEach(function (q) { q.el.classList.remove('pick'); });
        Array.prototype.forEach.call(document.querySelectorAll('.lr'), function (c) { c.classList.remove('pick'); });
        dock.textContent = '';
        dock.appendChild(el('p', 'dec-title', lastName(hp.p.name) + ' gets the ball'));
        [2, 3].forEach(function (v) {
          var r = g.hs - g.as + v, b = el('button', 'btn opt' + (v === 3 ? ' primary' : ''));
          b.type = 'button';
          b.appendChild(el('span', null, 'Take the ' + v));
          b.appendChild(el('small', null, r > 0 ? 'wins it' : r === 0 ? 'ties it' : 'not enough'));
          b.disabled = r < 0;
          b.addEventListener('click', function () {
            g.mods.H = { focus: hp.p.id, focusW: 60, fgMul: 1.02, force3: v, until: g.n + 1 };
            tickerLine('Ball to ' + lastName(hp.p.name) + ', going for ' + v + '...', 'sys');
            skipButton();
            lv.timer = later(liveTick, 700);
          });
          dock.appendChild(b);
        });
      };
      return;
    }
    var built = buildOptions(spec);
    tickerLine(spec.kind === 'half' ? 'Halftime.' : 'Timeout.', 'sys');
    if (spec.kind === 'half') flipCourt();
    if (spec.kind === 'half') {
      var rep = el('div', 'half-rep');
      [[lv.me, g.H, g.hs], [lv.opp, g.A, g.as]].forEach(function (t, i) {
        var col = el('div', 'hr-col' + (i ? ' r' : ''));
        var hd = el('b', null, t[0].city + ' ' + t[2]); col.appendChild(hd);
        [['pts', 'PTS', function (s) { return s.pts; }], ['reb', 'REB', function (s) { return s.orb + s.drb; }], ['ast', 'AST', function (s) { return s.ast; }]].forEach(function (k) {
          var best = t[1].slice().sort(function (u, v) { return k[2](v.s) - k[2](u.s); })[0];
          var row = el('span', 'hr-row');
          row.appendChild(el('i', null, k[1]));
          row.appendChild(el('em', null, best && k[2](best.s) > 0 ? lastName(best.p.name) : '\u2013'));
          row.appendChild(el('b', null, best ? String(k[2](best.s)) : '0'));
          col.appendChild(row);
        });
        rep.appendChild(col);
      });
      dock.appendChild(rep);
    }
    dock.appendChild(el('p', 'dec-title', built.title + ' ' + (spec.kind === 'half' || spec.kind === 'tempo' ? '' : '(' + when + ')')));
    var stk = stakesLine();
    if (stk) dock.appendChild(el('p', 'dec-ctx', stk));
    built.opts.forEach(function (o, i) {
      var b = el('button', 'btn opt' + (i === 0 ? ' primary' : ''));
      b.type = 'button';
      b.appendChild(el('span', null, o.t));
      b.appendChild(el('small', null, o.s));
      b.addEventListener('click', function () {
        var m = scaleMods(o.mods); m.until = g.n + (built.win || o.win);
        /* the room has a say: a happy player is locked in, an unhappy one forces it, and he remembers whether you trusted him */
        if (m.focus) {
          var fm = Events.pm(save, m.focus), fp = g.onH.filter(function (x) { return x.p.id === m.focus; })[0];
          if (fm.m >= 72) { m.fgMul = (m.fgMul || 1) * 1.02; if (fp) tickerLine(lastName(fp.p.name) + ' is locked in.', 'sys'); }
          else if (fm.m < 42) { m.tovAdd = (m.tovAdd || 0) + 0.03; if (fp) tickerLine(lastName(fp.p.name) + ' is frustrated and may force it.', 'sys'); }
          fm.m = Math.min(100, fm.m + 2); fm.t = Math.min(100, fm.t + 1);
        }
        if (o.extra.rest) { var rm = Events.pm(save, o.extra.rest); rm.m = Math.max(0, rm.m - 2); }
        g.mods.H = m;
        if (o.extra.rest) g.rest.H[o.extra.rest] = g.n + o.extra.restN;
        var fx0 = m.focus ? g.H.filter(function (x) { return x.p.id === m.focus; })[0] : null;
        lv.plan = { label: o.t, n1: g.n + (built.win || o.win), my0: lv.da, op0: lv.db, tm0: lv.tovM, to0: lv.tovO, q: periodLabel(g) + ' ' + clockText(g), fx: fx0, fpts0: fx0 ? fx0.s.pts : 0, ffg0: fx0 ? fx0.s.fg : 0, ffga0: fx0 ? fx0.s.fga : 0 };
        tickerLine('Plan: ' + o.t + '.', 'sys');
        skipButton();
        lv.timer = later(liveTick, 500);
      });
      dock.appendChild(b);
    });
  }

  /* Plans are short and the sim is noisy, so the levers are scaled up to be felt inside a dozen trips. */
  function scaleMods(src) {
    var m = Object.assign({}, src);
    ['fgMul', 'oppFgMul'].forEach(function (k) { if (m[k]) m[k] = 1 + (m[k] - 1) * 3.4; });
    ['tovAdd', 'oppTovAdd'].forEach(function (k) { if (m[k]) m[k] = m[k] * 2.5; });
    if (m.foulAdd) m.foulAdd = m.foulAdd * 1.6;
    return m;
  }

  /* what is riding on this game, in one line */
  function stakesLine() {
    var me = save.myId, rec = save.rec[me];
    if (save.phase === 'playoffs' && save.playoffs) {
      var s = save.playoffs.rounds[save.playoffs.round].filter(function (x) { return x.a === me || x.b === me; })[0];
      if (s) {
        var mine = s.a === me ? s.w[0] : s.w[1], theirs = s.a === me ? s.w[1] : s.w[0], need = Math.ceil((s.best || 7) / 2);
        return 'Game ' + (mine + theirs + 1) + ' \u00B7 ' + (mine === theirs ? 'series tied ' + mine + '-' + theirs : mine > theirs ? 'you lead ' + mine + '-' + theirs : 'you trail ' + theirs + '-' + mine) + (theirs === need - 1 ? ' \u00B7 facing elimination' : mine === need - 1 ? ' \u00B7 a win closes it out' : '');
      }
    }
    if (save.phase === 'regular' && rec) {
      var st = Season.standings(save), dv = save.tm[me].division, rank = 0;
      (st[dv] || []).forEach(function (t, i) { if (t.id === me) rank = i + 1; });
      var left = gamesFor(me) - rec.w - rec.l;
      return rec.w + '-' + rec.l + ' \u00B7 ' + ordinal(rank) + ' in the ' + dv + ' \u00B7 ' + left + ' games left' + (save.owner ? ' \u00B7 owner wants: ' + save.owner.text.toLowerCase() : '');
    }
    return '';
  }

  function checkPlan() {
    var g = lv.g, p = lv.plan;
    if (!p || g.n < p.n1) return;
    lv.plan = null;
    var my = lv.da - p.my0, op = lv.db - p.op0, net = my - op;
    var verdict = net >= 3 ? 'It worked.' : net <= -3 ? 'It backfired.' : 'A wash.';
    var fl = '';
    if (p.fx) {
      var fp = p.fx.s.pts - p.fpts0, ffg = p.fx.s.fg - p.ffg0, ffa = p.fx.s.fga - p.ffga0;
      fl = lastName(p.fx.p.name) + ': ' + fp + ' pts on ' + ffg + '-' + ffa + ' shooting' + (fp >= 9 ? ' \u2014 he delivered' : fp <= 3 ? ' \u2014 he did not deliver' : '');
      if (fp >= 9 && net < 3) verdict = 'He produced, the rest did not follow.';
      else if (fp <= 3 && net > -3) verdict = 'It did not pay off.';
    }
    lv.calls.push({ label: p.label, my: my, op: op, net: net, verdict: verdict, q: p.q, line: fl });
    var cm = Events.mood(save);
    cm.coach = Math.max(0, Math.min(100, cm.coach + (net >= 3 ? 1 : net <= -3 ? -1 : 0)));
    var tm = lv.tovM - p.tm0, to = lv.tovO - p.to0;
    tickerLine('"' + p.label + '": ' + lv.me.city + ' ' + my + ', ' + lv.opp.city + ' ' + op + ' since. Giveaways: you ' + tm + ', them ' + to + '. ' + verdict, 'sys');
  }

  function checkFouledOut() {
    var g = lv.g;
    g.H.concat(g.A).forEach(function (x) {
      if (x.s.pf >= 6 && !lv.fo[x.p.id]) { lv.fo[x.p.id] = 1; tickerLine(x.p.name + ' fouls out.', 'sys'); }
    });
  }

  function liveTick() {
    var g = lv.g;
    var due = decisionDue();
    if (lv.dead || due) applyOrders();
    if (due) { updateLive(); showDecision(due); return; }
    var evs = Engine.step(g);
    lv.dead = evs[0].ev.kind !== 'miss' || evs[1].ev.kind !== 'miss' || g.k === 0;
    lv.da += evs[0].pts; lv.db += evs[1].pts;
    lv.hist.push(evs[1].pts - evs[0].pts);
    lv.feed.push({ mw: evs[0].ev.who, mp: evs[0].pts, mt: evs[0].ev.kind === 'tov', ow: evs[1].ev.who, op: evs[1].pts, ot: evs[1].ev.kind === 'tov' });
    if (lv.feed.length > 16) lv.feed.shift();
    if (evs[0].ev.kind === 'tov') lv.tovM++;
    if (evs[1].ev.kind === 'tov') lv.tovO++;
    showPoss(evs[0], true);
    checkFouledOut();
    updateLive();
    lv.timer = later(function () {
      showPoss(evs[1], false);
      checkPlan();
      updateLive();
      if (g.over) {
        tickerLine('Final buzzer.', 'sys');
        lv.timer = later(finishLive, 1100);
      } else {
        lv.timer = later(liveTick, reduceMotion ? 60 : 200);
      }
    }, reduceMotion ? 40 : 170);
  }

  function finishLive() {
    clearTimeout(lv.timer);
    Object.keys(lv.act).forEach(closeRec);
    var res = Engine.finalize(lv.g);
    checkPlan();
    res.calls = lv.calls;
    completeGame(res, lv.mine, lv.me, lv.opp, lv.label);
  }

  function simDays(n) {
    var guard = 0;
    save.pending = [];
    bulk = n > 1;
    while (save.phase === 'regular' && n-- > 0 && guard++ < 200) simDay();
    bulk = false;
    persist();
    renderSeason();
  }

  function simPlayoffs() {
    var guard = 0;
    save.pending = [];
    bulk = true;
    while (save.phase === 'playoffs' && guard++ < 100) simDay();
    bulk = false;
    persist();
    renderSeason();
  }

  /* Horizontal swipe pages with a title and dots. */
  function carousel(pages) {
    var wrap = el('div', 'car');
    var head = el('div', 'car-head');
    var title = el('h3', 'box-title', pages[0].title);
    var dots = el('span', 'dots');
    head.appendChild(title);
    head.appendChild(dots);
    var track = el('div', 'car-track');
    pages.forEach(function (pg, i) {
      var s = el('div', 'car-page');
      var n = pg.node;
      var h3 = n.querySelector && n.querySelector('h3.box-title');
      if (h3) h3.remove();
      s.appendChild(n);
      track.appendChild(s);
      dots.appendChild(el('i', i === 0 ? 'on' : ''));
    });
    track.addEventListener('scroll', function () {
      var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      title.textContent = pages[Math.min(pages.length - 1, i)].title;
      Array.prototype.forEach.call(dots.children, function (d, k) { d.className = k === i ? 'on' : ''; });
    });
    wrap.appendChild(head);
    wrap.appendChild(track);
    if (pages.length > 1) head.appendChild(el('small', 'swipe', 'swipe \u203A'));
    return wrap;
  }

  function standingsTable(div, rows) {
    var wrap = el('div');
    wrap.appendChild(el('h3', 'box-title', divTitle(div)));
    var scroll = el('div', 'boxwrap');
    var table = el('table', 'box');
    var thead = el('thead'), hr = el('tr');
    ['Team', 'W', 'L', 'GB'].forEach(function (h) { hr.appendChild(el('th', null, h)); });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tb = el('tbody');
    rows.forEach(function (r, i) {
      var tr = el('tr', r.id === save.myId ? 'me' : null);
      var t = teamById(r.id);
      var tdn = el('td', 'tn');
      if (modernUI()) { tdn.appendChild(el('span', 'pos', String(i + 1))); var sb = teamBadge(t); sb.className += ' sm'; tdn.appendChild(sb); tdn.appendChild(document.createTextNode(t.city)); }
      else tdn.textContent = (i + 1) + '. ' + t.city;
      tr.appendChild(tdn);
      tr.appendChild(el('td', null, String(r.w)));
      tr.appendChild(el('td', null, String(r.l)));
      tr.appendChild(el('td', null, r.gb ? String(r.gb) : '-'));
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    scroll.appendChild(table);
    wrap.appendChild(scroll);
    return wrap;
  }


  /* ---------- team page: banners and retired numbers in the rafters ---------- */
  var FRANCHISE = { 'minneapolis-lakers': 'los-angeles-lakers', 'syracuse-nationals': 'philadelphia-76ers', 'philadelphia-warriors': 'golden-state-warriors', 'san-francisco-warriors': 'golden-state-warriors', 'rochester-royals': 'sacramento-kings', 'cincinnati-royals': 'sacramento-kings', 'kansas-cityomaha-kings': 'sacramento-kings', 'kansas-city-kings': 'sacramento-kings', 'fort-wayne-pistons': 'detroit-pistons', 'milwaukee-hawks': 'atlanta-hawks', 'st-louis-hawks': 'atlanta-hawks', 'tri-cities-blackhawks': 'atlanta-hawks', 'baltimore-bullets': 'washington-wizards', 'capital-bullets': 'washington-wizards', 'washington-bullets': 'washington-wizards', 'chicago-packers': 'washington-wizards', 'chicago-zephyrs': 'washington-wizards', 'buffalo-braves': 'la-clippers', 'san-diego-clippers': 'la-clippers', 'san-diego-rockets': 'houston-rockets', 'seattle-supersonics': 'oklahoma-city-thunder', 'new-jersey-nets': 'brooklyn-nets', 'new-york-nets': 'brooklyn-nets', 'new-orleans-jazz': 'utah-jazz', 'charlotte-bobcats': 'charlotte-hornets', 'new-orleans-hornets': 'new-orleans-pelicans', 'vancouver-grizzlies': 'memphis-grizzlies' };
  var LINEAGE = {
    'los-angeles-lakers': 'Minneapolis Lakers 1948–60 · Los Angeles Lakers 1960–',
    'atlanta-hawks': 'Tri-Cities Blackhawks 1949–51 · Milwaukee Hawks 1951–55 · St. Louis Hawks 1955–68 · Atlanta Hawks 1968–',
    'golden-state-warriors': 'Philadelphia Warriors 1946–62 · San Francisco Warriors 1962–71 · Golden State Warriors 1971–',
    'philadelphia-76ers': 'Syracuse Nationals 1949–63 · Philadelphia 76ers 1963–',
    'sacramento-kings': 'Rochester Royals 1948–57 · Cincinnati Royals 1957–72 · Kansas City Kings 1972–85 · Sacramento Kings 1985–',
    'detroit-pistons': 'Fort Wayne Pistons 1948–57 · Detroit Pistons 1957–',
    'washington-wizards': 'Chicago Packers 1961–63 · Baltimore Bullets 1963–73 · Washington Bullets 1973–97 · Washington Wizards 1997–',
    'la-clippers': 'Buffalo Braves 1970–78 · San Diego Clippers 1978–84 · Los Angeles Clippers 1984–',
    'houston-rockets': 'San Diego Rockets 1967–71 · Houston Rockets 1971–',
    'oklahoma-city-thunder': 'Seattle SuperSonics 1967–2008 · Oklahoma City Thunder 2008–',
    'brooklyn-nets': 'New Jersey Americans 1967 · New York Nets 1968–77 · New Jersey Nets 1977–2012 · Brooklyn Nets 2012–',
    'utah-jazz': 'New Orleans Jazz 1974–79 · Utah Jazz 1979–',
    'charlotte-hornets': 'Charlotte Hornets 1988–2002 · Charlotte Bobcats 2004–14 · Charlotte Hornets 2014–',
    'new-orleans-pelicans': 'New Orleans Hornets 2002–13 · New Orleans Pelicans 2013–',
    'memphis-grizzlies': 'Vancouver Grizzlies 1995–2001 · Memphis Grizzlies 2001–'
  };
  var JERSEYS = {
    'los-angeles-lakers': { body: '#FDB927', trim: '#552583', ink: '#552583', num: '#FFFFFF', numStroke: '#552583' },
    'san-antonio-spurs': { body: '#F1F1EE', trim: '#151515', ink: '#151515', num: '#151515', panel: 1, years: { SILAS13: '1973-81', GERVIN44: '1974-85*', MOORE0: '1980-90', MOORE00: '1980-90', ROBINSON50: '1989-03*', ELLIOTT32: '1989-01', JOHNSON6: '1991-01', BOWEN12: '2001-09', DUNCAN21: '1997-16*', 'GIN\u00D3BILI20': '2002-18', GINOBILI20: '2002-18', PARKER9: '2001-18' } }
  };
  var FHIST = null;
  function loadFHist(cb) {
    if (FHIST) { cb(FHIST); return; }
    fetch('data/franchise-history.json').then(function (r) { return r.json(); }).then(function (d) { FHIST = d; cb(d); }).catch(function () { FHIST = {}; cb(FHIST); });
  }
  function modernId(id) { return FRANCHISE[id] || id; }
  function openTeamPage() {
    if (!save) return;
    loadFHist(function () { renderTeamPage(); show('screen-club'); });
  }
  function renderTeamPage() {
    var me = teamById(save.myId), mid = modernId(save.myId), fh = (FHIST && FHIST[mid]) || { champs: [], retired: [] };
    var body = document.getElementById('club-body'); body.textContent = '';
    document.getElementById('club-title').textContent = me.city + ' ' + me.name;
    var c1 = (me.colors && me.colors[0]) || '#C8102E', c2 = (me.colors && me.colors[1]) || '#FFFFFF';
    var abaYrs = (mid === 'brooklyn-nets' || mid === 'indiana-pacers') ? 1976 : 0;
    var titles = (fh.champs || []).filter(function (y) { return y <= save.year; }).map(function (y) { return { y: y, aba: (abaYrs && y <= abaYrs) || (mid === 'los-angeles-lakers' && y === 1948), lgn: mid === 'los-angeles-lakers' && y === 1948 ? 'NBL' : 'ABA' }; });
    (save.lg.history || []).forEach(function (h) { if (h.champion === save.myId && h.year >= save.year) titles.push({ y: h.year + 1, you: true }); });
    titles.sort(function (a, b) { return b.y - a.y; });
    var nba = titles.filter(function (t) { return !t.aba; }).length;
    document.getElementById('club-sub').textContent = titles.length ? (nba + ' championship' + (nba === 1 ? '' : 's') + (titles.length > nba ? ' + ' + (titles.length - nba) + (mid === 'los-angeles-lakers' ? ' NBL' : ' ABA') : '')) : 'Still chasing the first banner';
    var rafters = el('div', 'rafters');
    rafters.style.setProperty('--c1', c1); rafters.style.setProperty('--c2', c2);
    rafters.appendChild(el('div', 'rf-beam'));
    var lab1 = el('h3', 'rf-label', 'Championship banners'); rafters.appendChild(lab1);
    var row1 = el('div', 'rf-row banners');
    if (!titles.length) row1.appendChild(el('p', 'rf-empty', 'The rafters are bare. Hang the first one.'));
    titles.forEach(function (t) {
      var b = el('div', 'bn' + (t.aba ? ' aba' : '') + (t.you ? ' new' : ''));
      b.appendChild(el('i', 'rope'));
      var cl = el('div', 'cloth');
      cl.appendChild(el('small', null, t.aba ? t.lgn : 'NBA'));
      cl.appendChild(el('b', null, String(t.y)));
      cl.appendChild(el('small', null, 'CHAMPIONS'));
      b.appendChild(cl); row1.appendChild(b);
    });
    rafters.appendChild(row1);
    rafters.appendChild(el('div', 'rf-beam low'));
    rafters.appendChild(el('h3', 'rf-label', 'Retired numbers'));
    var ret = (fh.retired || []).filter(function (r) { return r.p && r.p !== 'Player' && r.n !== 'No.' && /^(\d{1,2})(\s\d)?$/.test(String(r.n).trim()) && r.p !== 'Kasim Reed' && (!r.y || r.y <= save.year); });
    var row2 = el('div', 'rf-row jerseys');
    if (!ret.length) row2.appendChild(el('p', 'rf-empty', 'No number has been retired yet.'));
    ret.sort(function (a, b) { return (b.y || 0) - (a.y || 0) || parseInt(a.n, 10) - parseInt(b.n, 10); }).forEach(function (r) {
      var j = el('div', 'jy'); j.appendChild(el('i', 'rope'));
      var nm = r.p.replace(/\s*\(.*$/, '').replace(/\s*\[.*$/, '').trim(), sur = nm.split(' ').slice(-1)[0].toUpperCase();
      if (/^(jr|sr|ii|iii|iv)\.?$/i.test(sur)) sur = nm.split(' ').slice(-2)[0].toUpperCase();
      var nm1 = /^(\d{1,2})(\s\d)?$/.exec(String(r.n).trim()), isNum = !!nm1, num = isNum ? nm1[1] : '';
      var st = { bg: '#FFFFFF', fg: c1, trim: c1, mark: me.city.toUpperCase() + ' ' + me.name.toUpperCase() };
      // some banners hang in their own colours: the real ones differ by era and player
      if (mid === 'atlanta-hawks') {
        if (sur === 'PETTIT') st = { bg: '#14234F', fg: '#FFFFFF', trim: '#C8102E', mark: 'ST. LOUIS HAWKS', nm: '#FFFFFF' };
        else if (sur === 'MARAVICH') st = { bg: '#FFFFFF', fg: '#3AA6DC', trim: '#3AA6DC', mark: 'ATLANTA HAWKS' };
        else if (!isNum) st = { bg: '#E03A3E', fg: '#FFFFFF', trim: '#FFFFFF', mark: '', nm: '#FFFFFF' };
        else st = { bg: '#FFFFFF', fg: '#E03A3E', trim: '#E03A3E', mark: 'ATLANTA HAWKS' };
      } else if (!isNum) st = { bg: c1, fg: c2, trim: c2, mark: '', nm: c2 };
      var JS = JERSEYS[mid] || { body: c1, trim: c2, ink: c2, num: c2 };
      if (isNum) {
        var gid = 'ar' + Math.floor(Math.random() * 1e9), s2 = sur.replace('&', '&amp;'), fz = s2.length > 10 ? 10 : s2.length > 7 ? 12 : 14;
        var yrs = JS.years && JS.years[sur + num] || '', hof = yrs && /\*$/.test(yrs), ytxt = yrs.replace(/\*$/, '');
        var svg = '<svg class="jsv" viewBox="0 0 120 150" aria-hidden="true"><defs><path id="' + gid + '" d="M30 52 Q60 36 90 52"/></defs>' +
          '<path d="M34 4 L48 4 Q60 30 72 4 L86 4 Q88 40 104 56 L100 142 Q60 150 20 142 L16 56 Q32 40 34 4 Z" fill="' + JS.body + '"/>';
        if (JS.panel) svg += '<path d="M16 56 Q32 40 34 4 L40 4 Q38 44 26 60 L28 142 L20 142 Z M104 56 Q88 40 86 4 L80 4 Q82 44 94 60 L92 142 L100 142 Z" fill="' + JS.trim + '"/>';
        svg += '<path d="M34 4 L48 4 Q60 30 72 4 L86 4" fill="none" stroke="' + JS.trim + '" stroke-width="3.5"/>' +
          '<path d="M34 4 Q32 40 16 56 M86 4 Q88 40 104 56" stroke="' + JS.trim + '" stroke-width="3.5" fill="none"/>' +
          (JS.panel ? '' : '<path d="M17 60 L21 140 M103 60 L99 140" stroke="' + JS.trim + '" stroke-width="2.5" fill="none"/>') +
          '<text font-family="Big Shoulders Display,Impact,sans-serif" font-weight="800" font-size="' + fz + '" letter-spacing="1" fill="' + JS.ink + '" text-anchor="middle"><textPath href="#' + gid + '" startOffset="50%">' + s2 + '</textPath></text>' +
          '<text x="60" y="' + (ytxt ? 94 : num.length > 1 ? 106 : 108) + '" text-anchor="middle" font-family="Big Shoulders Display,Impact,sans-serif" font-weight="800" font-size="' + (num.length > 1 ? 46 : 54) + '" fill="' + JS.num + '"' + (JS.numStroke ? ' stroke="' + JS.numStroke + '" stroke-width="3" paint-order="stroke"' : '') + '>' + num + '</text>';
        if (ytxt) svg += '<text x="60" y="116" text-anchor="middle" font-family="Big Shoulders Display,Impact,sans-serif" font-weight="800" font-size="11" fill="' + JS.ink + '">' + ytxt + '</text>' + (hof ? '<text x="60" y="128" text-anchor="middle" font-family="Big Shoulders Display,Impact,sans-serif" font-weight="700" font-size="6.5" letter-spacing=".5" fill="' + JS.ink + '">HALL OF FAME</text>' : '');
        j.insertAdjacentHTML('beforeend', svg + '</svg>');
        // a real photographed jersey, once supplied, replaces the drawn one: assets/jerseys/<team>/<number>.webp
        (function (jj) {
          var im = new Image(); im.className = 'jim';
          im.onload = function () { var sv = jj.querySelector('.jsv'); if (sv) sv.remove(); jj.appendChild(im); };
          im.src = 'assets/jerseys/' + mid + '/' + num + '.webp';
        })(j);
        row2.appendChild(j); return;
      }
      var bn = el('div', 'rb');
      bn.style.cssText = 'background:' + st.bg + ';border-color:' + st.trim + ';color:' + st.fg;
      if (st.mark) bn.appendChild(el('small', 'rbm', st.mark));
      if (num) { var nb = el('b', 'rbn', num); nb.style.fontSize = num.length > 1 ? '44px' : '50px'; bn.appendChild(nb); }
      var sn = el('span', 'rbs', num ? sur : nm.toUpperCase()); if (st.nm) sn.style.color = st.nm; else if (st.fg) sn.style.color = st.fg;
      bn.appendChild(sn);
      var lg = teamBadge(me); lg.classList.add('rbl'); bn.appendChild(lg);
      j.appendChild(bn);
      row2.appendChild(j);
    });
    rafters.appendChild(row2);
    body.appendChild(rafters);
    var info = el('div', 'tp-info');
    info.appendChild(el('h3', 'box-title', 'Franchise'));
    var lin = LINEAGE[mid];
    info.appendChild(el('p', 'sub', lin || (me.city + ' ' + me.name)));
    var yrs = (save.lg.history || []).length;
    var mine = (save.lg.history || []).filter(function (h) { return h.champion === save.myId; }).length;
    info.appendChild(el('p', 'sub', 'Your tenure: ' + yrs + ' season' + (yrs === 1 ? '' : 's') + ' completed, ' + mine + ' title' + (mine === 1 ? '' : 's') + '.'));
    body.appendChild(info);
  }
  document.getElementById('season-title').addEventListener('click', openTeamPage);

  /* ---------- records and history ---------- */
  var RV = { tab: 'Champions' };
  var RTABS = ['Power', 'Awards', 'Cup', 'Champions', 'My legacy', 'Game highs', 'Season highs', 'Career', 'Honours'];
  function openRecords() { RV.tab = RV.tab || 'Champions'; if (save.cup && save.dates && save.day >= save.cup.at - 14 && save.day <= save.cup.at + 10) RV.tab = 'Cup'; renderRecords(); show('screen-records'); }
  function renderRecords() {
    var v = League.recordsView(save), body = document.getElementById('records-body'), tabs = document.getElementById('records-tabs');
    tabs.textContent = ''; body.textContent = '';
    RTABS.forEach(function (t) {
      var b = el('button', t === RV.tab ? 'on' : '', t); b.type = 'button';
      b.addEventListener('click', function () { RV.tab = t; renderRecords(); document.getElementById('screen-records').scrollTop = 0; });
      tabs.appendChild(b);
    });
    var city = function (id) { var t = id && teamById(id); return t ? t.city : '\u2013'; };
    function section(title, heads, rows, empty) {
      body.appendChild(el('h3', 'box-title', title));
      if (!rows.length) { body.appendChild(el('p', 'sub', empty || 'Nothing on record yet.')); return; }
      body.appendChild(dataTable(heads, rows));
    }
    function plr(p) { return p.name; }
    if (RV.tab === 'Power') {
      if (!save.lg.pr) { body.appendChild(el('p', 'sub', 'The first power rankings come out after a few games.')); return; }
      body.appendChild(prList(save.lg.pr)); return;
    }
    if (RV.tab === 'Awards') {
      var ya = (save.lg.ya || []).slice().reverse();
      [['mvp', 'Most Valuable Player'], ['fmvp', 'Finals MVP'], ['dpoy', 'Defensive Player of the Year'], ['roy', 'Rookie of the Year'], ['smoy', 'Sixth Man of the Year'], ['mip', 'Most Improved Player'], ['coy', 'Coach of the Year']].forEach(function (k) {
        var rows = ya.filter(function (e) { return e[k[0]]; }).map(function (e) { var c = e[k[0]]; return { cells: [e.label, c.name, (teamById(c.tid) || { city: '\u2013' }).city] }; });
        if (rows.length) section(k[1], ['Season', 'Winner', 'Team'], rows);
      });
      [['allnba', 'All-NBA', ['First', 'Second', 'Third']], ['alldef', 'All-Defensive', ['First', 'Second']], ['allrook', 'All-Rookie', ['First', 'Second']]].forEach(function (k) {
        var rows = [];
        ya.forEach(function (e) { (e[k[0]] || []).forEach(function (tm, i) { if (tm.length) rows.push({ cells: [e.label + ' \u00B7 ' + k[2][i], tm.map(function (c) { return c.name; }).join(', ')] }); }); });
        if (rows.length) section(k[1], ['Team', 'Players'], rows);
      });
      var ah = (save.lg.awh || []).filter(function (x) { return x.y === save.year; }).reverse();
      if (!ah.length) { if (!ya.length) body.appendChild(el('p', 'sub', 'Awards will be listed here as the season goes on.')); return; }
      body.appendChild(el('h3', 'box-title', 'This season: weekly and monthly'));
      var lastT = '';
      ah.forEach(function (x) {
        body.appendChild(el('h3', 'box-title', x.title + (x.date ? ' \u00B7 ' + dateText(x.date) : '')));
        x.cards.forEach(function (c) {
          var t = teamById(c.tid), row = el('div', 'aw-row');
          row.appendChild(makeAvatar({ id: c.id, name: c.name }));
          var tx = el('span'); tx.appendChild(el('b', null, c.name)); tx.appendChild(el('small', null, (t ? t.city : '') + ' \u00B7 ' + (c.conf === 'League' ? 'League' : c.conf))); row.appendChild(tx);
          row.appendChild(el('em', null, c.line));
          body.appendChild(row);
        });
      });
      return;
    }
    if (RV.tab === 'Cup') {
      var cv = Season.cupView(save);
      if (!cv) { body.appendChild(el('p', 'sub', 'There is no NBA Cup in this season.')); return; }
      var tm2 = function (id) { var t = teamById(id); return t ? t.city : id; };
      if (cv.champ) {
        var cc = el('div', 'cup-champ'); var cb = teamBadge(teamById(cv.champ)); cc.appendChild(cb);
        var ct = el('div', 'cct'); ct.appendChild(el('small', null, 'NBA Cup champions')); ct.appendChild(el('b', null, tm2(cv.champ))); cc.appendChild(ct);
        body.appendChild(cc);
      }
      cv.rounds.slice().reverse().forEach(function (r) {
        body.appendChild(el('h3', 'box-title', r.name));
        var wrap = el('div', 'cup-games');
        r.games.forEach(function (g) {
          var row = el('div', 'cup-g');
          [[g.a, g.as, g.bs], [g.b, g.bs, g.as]].forEach(function (x) {
            var side = el('div', 'cs' + (x[1] != null && x[1] > x[2] ? ' w' : '') + (x[0] === save.myId ? ' me' : ''));
            var bd = teamBadge(teamById(x[0])); bd.className += ' sm'; side.appendChild(bd);
            side.appendChild(el('span', null, tm2(x[0]) + (cv.seed[x[0]] ? ' (' + cv.seed[x[0]] + ')' : '')));
            side.appendChild(el('b', null, x[1] != null ? String(x[1]) : ''));
            row.appendChild(side);
          });
          wrap.appendChild(row);
        });
        body.appendChild(wrap);
      });
      cv.groups.forEach(function (g) {
        body.appendChild(el('h3', 'box-title', g.conf.replace('ern', '') + ' Group ' + ((g.n - 1) % 3 + 1)));
        body.appendChild(dataTable(['Club', 'W', 'L', 'PD'], g.rows.map(function (t, i) {
          var r2 = [tm2(t.id) + (cv.q.indexOf(t.id) >= 0 ? ' \u2713' : ''), t.w, t.l, (t.pd > 0 ? '+' : '') + t.pd]; if (t.id === save.myId) r2.cls = 'me'; return r2;
        })));
      });
      body.appendChild(el('p', 'sub', 'Group winners and the best runner-up in each conference reach the quarterfinals.'));
      return;
    }
    if (RV.tab === 'Champions') {
      section('Most championships', ['#', 'Club', 'Titles', 'Years'], v.teamTitles.map(function (x, i) { return [i + 1, city(x.id), x.n, x.years.map(function (y) { return seasonLabel(y).slice(-5); }).join(', ')]; }), 'No champions yet. The first one is crowned at the end of this season.');
      section('Most titles by a player', ['#', 'Player', 'Titles'], v.playerTitles.map(function (x, i) { return [i + 1, plr(x.p), x.n]; }), 'No player has won a title yet.');
      section('Champions by year', ['Season', 'Champion', 'Your club'], v.byYear.map(function (h) { return [seasonLabel(h.year), city(h.champion), h.rec || '']; }));
    } else if (RV.tab === 'My legacy') {
      var hs = (save.lg.history || []).filter(function (h) { return h.me; }), W = 0, L = 0, T = 0, P = 0, best = null;
      hs.forEach(function (h) {
        var m = /^(\d+)-(\d+)$/.exec(h.rec || ''); if (m) { W += +m[1]; L += +m[2]; var pc = +m[1] / Math.max(1, +m[1] + +m[2]); if (!best || pc > best.pc) best = { pc: pc, rec: h.rec, y: h.year }; }
        if (h.champion === h.me) T++;
        if (h.po) P++;
      });
      var tile = el('div', 'stat-card');
      [['Titles', T], ['Seasons', hs.length], ['Playoffs', P], ['Record', W + '-' + L], ['Best', best ? best.rec + ' (' + seasonLabel(best.y).slice(-5) + ')' : '\u2013']].forEach(function (k) {
        var r = el('div', 'row'); r.style.justifyContent = 'space-between'; r.appendChild(el('span', null, k[0])); r.appendChild(el('strong', null, String(k[1]))); tile.appendChild(r);
      });
      body.appendChild(tile);
      section('Your seasons', ['Season', 'Record', 'Result'], hs.slice().reverse().map(function (h) { return [seasonLabel(h.year), h.rec, h.champion === h.me ? 'Champions' : h.po ? 'Playoffs' : 'Missed']; }), 'Your first season is still to be played.');
    } else if (RV.tab === 'Game highs') {
      var names = { pts: 'Most points in a game', ast: 'Most assists in a game', trb: 'Most rebounds in a game', fg: 'Most field goals in a game', ft: 'Most free throws in a game', stl: 'Most steals in a game', blk: 'Most blocks in a game' };
      Object.keys(names).forEach(function (k) {
        var list = (v.rec.game[k] || []).slice(0, 5);
        section(names[k], ['#', 'Player', k.toUpperCase(), 'Opp', 'Season'], list.map(function (e, i) { return [i + 1, e.name, e.v, city(e.o), seasonLabel(e.y).slice(-5)]; }), 'Tracked from this save onward.');
      });
      section('Most points by a team', ['#', 'Club', 'Pts', 'Opp', 'Season'], (v.rec.team.score || []).slice(0, 5).map(function (e, i) { return [i + 1, city(e.t), e.v, city(e.o), seasonLabel(e.y).slice(-5)]; }));
      section('Biggest margin of victory', ['#', 'Winner', 'Score', 'Opp', 'Season'], (v.rec.team.margin || []).slice(0, 5).map(function (e, i) { return [i + 1, city(e.t), e.sc + ' (+' + e.v + ')', city(e.o), seasonLabel(e.y).slice(-5)]; }));
    } else if (RV.tab === 'Season highs') {
      var sn = { ppg: 'Points per game', apg: 'Assists per game', pts: 'Total points in a season', ast: 'Total assists in a season' };
      Object.keys(sn).forEach(function (k) {
        section(sn[k], ['#', 'Player', k === 'ppg' || k === 'apg' ? 'Avg' : 'Total', 'Club', 'Season'], (v.rec.season[k] || []).slice(0, 10).map(function (e, i) { return [i + 1, e.name, e.v, city(e.t), seasonLabel(e.y).slice(-5)]; }), 'Filled in when each season ends.');
      });
    } else if (RV.tab === 'Career') {
      [['Career points', v.career.pts, function (x) { return x; }], ['Career assists', v.career.ast, function (x) { return x; }], ['Games played', v.career.g, function (x) { return x; }], ['Points per game (20+ games)', v.career.ppg, function (x) { return x.toFixed(1); }], ['Field goal % (100+ shots)', v.career.fg, function (x) { return x.toFixed(1) + '%'; }], ['Free throw % (100+ tries)', v.career.ft, function (x) { return x.toFixed(1) + '%'; }]].forEach(function (c) {
        section(c[0], ['#', 'Player', 'Value', 'Club'], c[1].map(function (e, i) { return [i + 1, e.p.name, c[2](e.v), e.p.team ? city(e.p.team) : (e.p.status === 'retired' ? 'Retired' : 'Free agent')]; }));
      });
    } else {
      ['Most Valuable Player', 'Scoring champion', 'Assists leader'].forEach(function (k) {
        section(k + 's', ['Season', 'Player'], (v.honours[k] || []).map(function (h) { return [seasonLabel(h.y), h.p.name]; }), 'Awarded when each season ends.');
      });
    }
  }

  /* ---------- owner ---------- */
  function ensureOwner() {
    if (save.ownerTrust === undefined) save.ownerTrust = 60;
    if (save.owner) { if (!save.owner.side) addSideGoals(); return; }
    var ids = save.ids.slice().sort(function (x, y) { return teamRating(y) - teamRating(x); });
    var rank = ids.indexOf(save.myId) + 1, n = ids.length, g = gamesFor(save.myId);
    if (rank <= 2) save.owner = { k: 'title', lvl: 3, text: 'Win the championship' };
    else if (rank <= Math.ceil(n * 0.6)) save.owner = { k: 'playoffs', lvl: 2, text: 'Make the playoffs' };
    else save.owner = { k: 'wins', lvl: 1, n: Math.round(g * 0.4), text: 'Win ' + Math.round(g * 0.4) + ' games and show some pride' };
    addSideGoals();
  }
  /* smaller asks on top of the big one; each is judged at the end of the year */
  function addSideGoals() {
    var me = save.myId, cap = save.lg.cap, pay = League.payroll(save, me), ros = League.rosterOf(save, me);
    var young = ros.filter(function (p) { return (p.age || 26) <= 23; }).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; })[0];
    var pool = [];
    var lim = Math.max(Math.round(pay * 1.04), Math.round(cap * 0.92));
    pool.push({ id: 'payroll', v: lim, text: 'Keep payroll under ' + money(lim) });
    if (young) pool.push({ id: 'youth', v: Math.min(90, young.ratings.ovr + 3), text: 'Grow a player 23 or younger to ' + Math.min(90, young.ratings.ovr + 3) + ' overall' });
    pool.push({ id: 'fans', v: 60, text: 'Keep fan interest above 60' });
    pool.push({ id: 'home', v: 0.6, text: 'Win 60% of your home games' });
    pool.push({ id: 'road', v: 0.5, text: 'Finish .500 or better on the road' });
    pool.push({ id: 'close', v: 0, text: 'Win more close games than you lose' });
    var prev = save.ownerPrev || [];
    pool = pool.filter(function (g) { return prev.indexOf(g.id) < 0; });
    var out = [];
    while (out.length < 2 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    save.owner.side = out;
  }
  function sideStatus(g) {
    var me = save.myId, f = formAll()[me] || { home: { w: 0, l: 0 }, away: { w: 0, l: 0 }, close: { w: 0, l: 0 } };
    function rate(r) { var n = r.w + r.l; return n ? r.w / n : 0; }
    if (g.id === 'payroll') { var pay = League.payroll(save, me); return { ok: pay <= g.v, now: money(pay) + ' of ' + money(g.v) }; }
    if (g.id === 'youth') { var y = League.rosterOf(save, me).filter(function (p) { return (p.age || 26) <= 23; }).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; })[0]; return { ok: !!y && y.ratings.ovr >= g.v, now: y ? y.name + ' at ' + y.ratings.ovr : 'no one yet' }; }
    if (g.id === 'fans') { var fv = Events.summary(save, League.rosterOf(save, me)).fans; return { ok: fv >= g.v, now: 'now ' + Math.round(fv) }; }
    if (g.id === 'home') return { ok: rate(f.home) >= g.v && f.home.w + f.home.l >= 5, now: f.home.w + '-' + f.home.l + ' at home' };
    if (g.id === 'road') return { ok: rate(f.away) >= g.v && f.away.w + f.away.l >= 5, now: f.away.w + '-' + f.away.l + ' away' };
    return { ok: f.close.w > f.close.l, now: f.close.w + '-' + f.close.l + ' close' };
  }
  function sideBlock(box) {
    if (!save.owner || !save.owner.side) return;
    save.owner.side.forEach(function (g) {
      var s = sideStatus(g), row = el('p', 'sub side ' + (s.ok ? 'ok' : ''));
      row.appendChild(el('b', null, s.ok ? '\u2713 ' : '\u25CB '));
      row.appendChild(document.createTextNode(g.text + ' \u00B7 ' + s.now));
      box.appendChild(row);
    });
  }
  function madePlayoffs() {
    var po = save.playoffs;
    if (!po) return false;
    return po.rounds.some(function (round) { return round.some(function (s) { return s.a === save.myId || s.b === save.myId; }); }) || po.semiWinner === save.myId;
  }
  function judgeOwner() {
    ensureOwner();
    var rec = save.rec[save.myId], champ = save.champion === save.myId, made = madePlayoffs();
    var got = champ ? 3 : made ? 2 : (save.owner.k === 'wins' && rec.w >= save.owner.n ? 1.5 : 1);
    var want = save.owner.lvl, d;
    if (got > want) d = 12 + 8 * (got - want);
    else if (got === want) d = 10;
    else d = -(14 + 7 * (want - got));
    var sides = (save.owner.side || []).map(function (g) { var s = sideStatus(g); return { text: g.text, ok: s.ok, now: s.now }; });
    sides.forEach(function (s) { d += s.ok ? 3 : -3; });
    save.ownerPrev = (save.owner.side || []).map(function (g) { return g.id; });
    var before = save.ownerTrust, kept = '';
    if (save.ownerPromise) { d += got >= want ? 6 : -9; kept = got >= want ? ' You kept your promise.' : ' You broke your promise.'; save.ownerPromise = false; }
    save.ownerTrust = Math.max(0, Math.min(100, before + d));
    var fired = save.ownerTrust <= 0 || (save.ownerTrust <= 15 && d < 0 && before <= 30);
    var msg = got > want ? 'The owner is delighted. You beat his goal.' : got === want ? 'The owner is satisfied. You met his goal.' : 'The owner is unhappy. You missed his goal.';
    msg += kept;
    if (fired) msg = 'The owner has lost patience. You are dismissed.';
    return { goal: save.owner.text, delta: d, trust: save.ownerTrust, fired: fired, msg: msg, sides: sides };
  }

  /* ---------- season recap ---------- */
  function buildRecap() {
    var me = save.myId, rows = Season.standings(save)[save.division[me]], pos = 0;
    rows.forEach(function (r, i) { if (r.id === me) pos = i + 1; });
    var best = null, worst = null;
    save.results.forEach(function (r) {
      if (r.h !== me && r.a !== me) return;
      var us = r.h === me ? r.hs : r.as, them = r.h === me ? r.as : r.hs, m = us - them;
      var opp = r.h === me ? r.a : r.h;
      if (!best || m > best.m) best = { m: m, us: us, them: them, opp: opp };
      if (!worst || m < worst.m) worst = { m: m, us: us, them: them, opp: opp };
    });
    var star = null;
    rosterOf(me).forEach(function (p) {
      var x = save.lg.stats[p.id];
      (x && x.log || []).forEach(function (g, i) { if (!star || g[6] > star.pts) star = { name: p.name, pts: g[6], opp: g[1], n: i + 1 }; });
    });
    var lead = function (k) {
      var b = null;
      rosterOf(me).forEach(function (p) { var x = save.lg.stats[p.id]; if (x && x.g >= 10 && (!b || x[k] / x.g > b.v)) b = { name: p.name, v: x[k] / x.g }; });
      return b;
    };
    var po = save.champion === me ? 'Champions' : madePlayoffs() ? 'Reached the playoffs' : 'Missed the playoffs';
    return {
      pos: pos, div: save.division[me], po: po,
      best: best && { us: best.us, them: best.them, opp: best.opp }, worst: worst && { us: worst.us, them: worst.them, opp: worst.opp },
      star: star, pts: lead('pts'), ast: lead('ast')
    };
  }

  function bracketView() {
    var wrap = el('div', 'bracket');
    save.playoffs.rounds.forEach(function (round, ri) {
      var col = el('div', 'br-col');
      col.appendChild(el('div', 'group-title', Season.roundInfo(save, ri).name));
      round.forEach(function (s) {
        if (s.bye) return;
        var card = el('div', 'br-s');
        [s.a, s.b].forEach(function (id, k) {
          var row = el('div', 'br-t' + (s.winner === id ? ' win' : '') + (s.winner && s.winner !== id ? ' out' : '') + (id === save.myId ? ' me' : ''));
          row.appendChild(el('span', null, teamById(id).city));
          row.appendChild(el('b', null, String(s.w[k])));
          card.appendChild(row);
        });
        card.appendChild(el('small', null, 'Best of ' + (s.best || Season.roundInfo(save, ri).best) + (s.label ? ' \u00B7 ' + s.label : '')));
        col.appendChild(card);
      });
      wrap.appendChild(col);
    });
    return wrap;
  }

  /* ---------- no vertical scrolling: long lists become swipeable pages ---------- */
  var PAGED = ['era-list', 'roster-list', 'trade-body', 'off-body', 'records-body', 'player-body', 'match-body', 'ev-body'];
  function pageify(box) {
    if (!modernUI() || box._busy || !box.offsetParent) return;
    var tl = box.id === 'trade-body' ? box.querySelector(':scope > .tlist') : null;
    if (tl) { pageify(tl); return; }
    var kids = Array.prototype.slice.call(box.children).filter(function (k) { return !k.classList.contains('pgr'); });
    if (!kids.length) return;
    box._busy = true;
    var gap = 8, avail = box.clientHeight - 48;
    var units = [], carry = [];
    kids.forEach(function (k) {
      carry.push(k);
      var head = k.classList.contains('group-title') || k.classList.contains('box-title') || k.tagName === 'H3';
      if (!head) { units.push(carry); carry = []; }
    });
    if (carry.length) units.push(carry);
    var pages = [], cur = [], h = 0;
    units.forEach(function (u) {
      var uh = u.reduce(function (a, k) { return a + k.offsetHeight + gap; }, 0);
      if (cur.length && h + uh > avail) { pages.push(cur); cur = []; h = 0; }
      cur = cur.concat(u); h += uh;
    });
    if (cur.length) pages.push(cur);
    if (pages.length > 1) {
      var pgr = el('div', 'pgr'), track = el('div', 'pgr-track'), dots = el('div', 'pgr-dots');
      pages.forEach(function (list, i) {
        var pg = el('section', 'pg');
        if (list.length === 1 && list[0].offsetHeight > avail) pg.classList.add('tall');
        list.forEach(function (k) { pg.appendChild(k); });
        track.appendChild(pg);
        dots.appendChild(el('i', ''));
      });
      var tick = null;
      function mark() {
        var w = track.firstChild ? track.firstChild.offsetWidth : 1, i = Math.round(track.scrollLeft / (w + 10));
        box._pi = i;
        Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); });
      }
      track.addEventListener('scroll', function () { clearTimeout(tick); tick = setTimeout(mark, 40); });
      pgr.appendChild(track); pgr.appendChild(dots);
      box.appendChild(pgr);
      // real layout is known now: push anything that does not fit down to the next page
      var pgs = Array.prototype.slice.call(track.children);
      for (var pi = 0; pi < pgs.length; pi++) {
        var pgx = pgs[pi];
        while (pgx.children.length > 1 && pgx.scrollHeight > pgx.clientHeight + 1) {
          if (!pgs[pi + 1]) { var np = el('section', 'pg'); track.appendChild(np); dots.appendChild(el('i', '')); pgs.push(np); }
          pgs[pi + 1].insertBefore(pgx.lastChild, pgs[pi + 1].firstChild);
        }
      }
      pages.length = pgs.length;
      var want = Math.min(box._pi || 0, pages.length - 1);
      track.scrollLeft = want * (track.firstChild.offsetWidth + 10);
      dots.children[want].classList.add('on');
    }
    box._busy = false;
  }
  function pageifyScreen(id) {
    var sc = document.getElementById(id);
    if (!sc) return;
    (typeof PAGED !== 'undefined' ? PAGED : []).forEach(function (bid) { var b = sc.querySelector('#' + bid); if (b) requestAnimationFrame(function () { pageify(b); }); });
  }
  PAGED.forEach(function (bid) {
    var b = document.getElementById(bid);
    if (!b) return;
    new MutationObserver(function () {
      if (b._busy) return;
      b._pi = b._pi || 0;
      requestAnimationFrame(function () { pageify(b); });
    }).observe(b, { childList: true });
  });

  /* ---------- the present-day hub: one screen, no scrolling ---------- */
  var hubTab = 'table';
  var DETAILS = ['basic', 'standard', 'nerd'];
  function ui() {
    var u = store.get('ui', null) || {};
    if (DETAILS.indexOf(u.detail) < 0) u.detail = 'standard';
    if (!u.tabs || !u.tabs.length) u.tabs = ['table', 'leaders', 'team'];
    if (!u.cats) u.cats = null;
    return u;
  }
  function saveUi(u) { store.set('ui', u); }
  var TABS = { table: 'Standings', leaders: 'Leaders', team: 'Team' };

  function formAll() {
    var f = {};
    save.ids.forEach(function (id) { f[id] = { w: 0, l: 0, pf: 0, pa: 0, g: 0, res: [], home: { w: 0, l: 0 }, away: { w: 0, l: 0 }, close: { w: 0, l: 0 } }; });
    (save.results || []).forEach(function (r) {
      [[r.h, r.hs, r.as, true], [r.a, r.as, r.hs, false]].forEach(function (x) {
        var t = f[x[0]]; if (!t) return;
        var won = x[1] > x[2];
        t.g++; t.pf += x[1]; t.pa += x[2]; t.res.push(won ? 1 : 0); t.margin = t.margin || []; t.margin.push(x[1] - x[2]);
        (x[3] ? t.home : t.away)[won ? 'w' : 'l']++;
        if (Math.abs(x[1] - x[2]) <= 5) t.close[won ? 'w' : 'l']++;
      });
    });
    return f;
  }
  function streakOf(res) {
    if (!res.length) return '-';
    var last = res[res.length - 1], n = 0;
    for (var i = res.length - 1; i >= 0 && res[i] === last; i--) n++;
    return (last ? 'W' : 'L') + n;
  }

  /* a horizontally swipeable rail of pages with dots */
  function hubRail(pages) {
    var wrap = el('div', 'hrail');
    var track = el('div', 'hrail-track');
    var dots = el('div', 'hrail-dots');
    pages.forEach(function (pg, i) {
      var c = el('section', 'hpage');
      c.appendChild(el('h3', 'hp-title', pg.title));
      c.appendChild(pg.node);
      track.appendChild(c);
      dots.appendChild(el('i', i === 0 ? 'on' : ''));
    });
    var tick = null;
    track.addEventListener('scroll', function () {
      clearTimeout(tick);
      tick = setTimeout(function () {
        var i = Math.round(track.scrollLeft / (track.firstChild.offsetWidth + 10));
        Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); });
      }, 50);
    });
    wrap.appendChild(track);
    if (pages.length > 1) wrap.appendChild(dots);
    return wrap;
  }

  function leaderDefs(detail) {
    var gp = (save.rec[save.myId].w + save.rec[save.myId].l), qual = Math.max(1, Math.min(15, Math.floor(gp * 0.5)));
    var pct = function (a, b, min) { return function (x) { return x[b] >= min ? 100 * x[a] / x[b] : -1; }; };
    var all = [
      { id: 'pts', t: 'Points', lvl: 0, f: function (x) { return x.pts / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { id: 'ast', t: 'Assists', lvl: 0, f: function (x) { return x.ast / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { id: 'trb', t: 'Rebounds', lvl: 0, f: function (x) { return x.trb / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { id: 'stl', t: 'Steals', lvl: 1, f: function (x) { return x.stl / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { id: 'blk', t: 'Blocks', lvl: 1, f: function (x) { return x.blk / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { id: 'fgp', t: 'Field goal %', lvl: 1, f: pct('fg', 'fga', qual * 3), fmt: function (v) { return v.toFixed(1) + '%'; } },
      { id: 'ftp', t: 'Free throw %', lvl: 1, f: pct('ft', 'fta', qual), fmt: function (v) { return v.toFixed(1) + '%'; } },
      { id: 'tpm', t: 'Threes made', lvl: 2, f: function (x) { return (x.tp || 0) / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { id: 'tpp', t: 'Three-point %', lvl: 2, f: pct('tp', 'tpa', qual * 2), fmt: function (v) { return v.toFixed(1) + '%'; } },
      { id: 'ts', t: 'True shooting %', lvl: 2, f: function (x) { var d = 2 * (x.fga + 0.44 * x.fta); return x.fga >= qual * 3 && d ? 100 * x.pts / d : -1; }, fmt: function (v) { return v.toFixed(1) + '%'; } },
      { id: 'min', t: 'Minutes', lvl: 2, f: function (x) { return x.min / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { id: 'tov', t: 'Turnovers', lvl: 2, f: function (x) { return x.tov / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { id: 'eff', t: 'Efficiency', lvl: 2, f: function (x) { return (x.pts + x.trb + x.ast + x.stl + x.blk - (x.fga - x.fg) - (x.fta - x.ft) - x.tov) / x.g; }, fmt: function (v) { return v.toFixed(1); } }
    ];
    return { all: all, qual: qual, level: DETAILS.indexOf(detail) };
  }

  function hubLeaders(u) {
    var d = leaderDefs(u.detail);
    var show = d.all.filter(function (c) { return u.cats ? u.cats.indexOf(c.id) >= 0 : c.lvl <= d.level; });
    var n = u.detail === 'nerd' ? 7 : u.detail === 'basic' ? 4 : 5;
    var pages = [];
    show.forEach(function (c) {
      var rows = Object.keys(save.lg.stats).map(function (id) {
        var x = save.lg.stats[id], p = League.byId(save, id);
        return p && x.g >= d.qual ? { p: p, v: c.f(x), g: x.g } : null;
      }).filter(function (r) { return r && r.v >= 0; }).sort(function (a, b) { return b.v - a.v; }).slice(0, n);
      var box = el('div', 'lb');
      if (!rows.length) box.appendChild(el('p', 'sub', 'Fills in after a few games.'));
      var top = rows.length ? rows[0].v || 1 : 1;
      rows.forEach(function (r, i) {
        var line = el('button', 'lb-row' + (r.p.team === save.myId ? ' mine' : ''));
        line.type = 'button';
        line.appendChild(el('span', 'rk', String(i + 1)));
        line.appendChild(makeAvatar(r.p));
        var tx = el('span', 'who');
        tx.appendChild(el('b', null, r.p.name));
        var tm = r.p.team ? teamById(r.p.team) : null;
        tx.appendChild(el('small', null, (tm ? tm.city : 'Free agent') + (u.detail === 'nerd' ? ' · ' + r.g + ' g' : '')));
        line.appendChild(tx);
        var val = el('span', 'val');
        val.appendChild(el('b', null, c.fmt(r.v)));
        var bar = el('i'); bar.style.width = Math.max(6, Math.round(100 * r.v / top)) + '%';
        val.appendChild(bar);
        line.appendChild(val);
        line.addEventListener('click', function () { openPlayer(r.p, tm); });
        box.appendChild(line);
      });
      pages.push({ title: c.t, node: box });
    });
    if (!pages.length) return el('p', 'sub', 'No categories selected.');
    return hubRail(pages);
  }

  function hubTable(u, f) {
    var st = Season.standings(save), me = save.myId;
    var divs = Object.keys(st).sort(function (x, y) {
      var mx = st[x].some(function (r) { return r.id === me; }), my = st[y].some(function (r) { return r.id === me; });
      return mx === my ? 0 : mx ? -1 : 1;
    });
    var lvl = DETAILS.indexOf(u.detail);
    var pages = [];
    if (save.playoffs) pages.push({ title: 'Playoffs', node: bracketView() });
    divs.forEach(function (d) {
      var tb = el('table', 'ht');
      var hr = el('tr'); var cols = ['', 'W', 'L', 'GB'];
      if (lvl >= 1) cols.push('L10', 'Strk');
      if (lvl >= 2) cols.push('PF', 'PA');
      cols.forEach(function (h, i) { hr.appendChild(el('th', i === 0 ? 'tn' : null, h)); });
      var th = el('thead'); th.appendChild(hr); tb.appendChild(th);
      var body = el('tbody');
      st[d].forEach(function (r, i) {
        var t = teamById(r.id), x = f[r.id] || { res: [], g: 0, pf: 0, pa: 0 };
        var tr = el('tr', r.id === me ? 'me' : null);
        tr.dataset.rank = String(i + 1);
        var tdn = el('td', 'tn');
        tdn.appendChild(el('span', 'pos', String(i + 1)));
        var sb = teamBadge(t); sb.className += ' sm'; tdn.appendChild(sb);
        tdn.appendChild(document.createTextNode(t.city));
        tr.appendChild(tdn);
        tr.appendChild(el('td', null, String(r.w)));
        tr.appendChild(el('td', null, String(r.l)));
        tr.appendChild(el('td', null, r.gb ? String(r.gb) : '-'));
        if (lvl >= 1) {
          var l10 = x.res.slice(-10), w10 = l10.reduce(function (a, b) { return a + b; }, 0);
          tr.appendChild(el('td', null, l10.length ? w10 + '-' + (l10.length - w10) : '-'));
          tr.appendChild(el('td', null, streakOf(x.res)));
        }
        if (lvl >= 2) {
          tr.appendChild(el('td', null, x.g ? (x.pf / x.g).toFixed(1) : '-'));
          tr.appendChild(el('td', null, x.g ? (x.pa / x.g).toFixed(1) : '-'));
        }
        if (i === 5 || i === 9) tr.classList.add('cut');
        body.appendChild(tr);
      });
      tb.appendChild(body);
      pages.push({ title: divTitle(d), node: tb });
    });
    return hubRail(pages);
  }

  function spark(vals, w, h) {
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('class', 'spark');
    if (vals.length < 2) return svg;
    var mx = Math.max(10, Math.max.apply(null, vals.map(Math.abs)));
    var pts = vals.map(function (v, i) { return [i * (w / (vals.length - 1)), h / 2 - (v / mx) * (h / 2 - 3)]; });
    var zero = document.createElementNS(ns, 'line');
    zero.setAttribute('x1', 0); zero.setAttribute('x2', w); zero.setAttribute('y1', h / 2); zero.setAttribute('y2', h / 2); zero.setAttribute('class', 'z');
    svg.appendChild(zero);
    var pl = document.createElementNS(ns, 'polyline');
    pl.setAttribute('points', pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '));
    pl.setAttribute('class', 'ln');
    svg.appendChild(pl);
    return svg;
  }
  function stat(label, value, sub) {
    var d = el('div', 'hs');
    d.appendChild(el('small', null, label));
    d.appendChild(el('b', null, value));
    if (sub) d.appendChild(el('em', null, sub));
    return d;
  }
  function rankOf(vals, mine, high) {
    var r = 1; vals.forEach(function (v) { if (high ? v > mine : v < mine) r++; });
    return r;
  }

  function hubTeam(u, f) {
    var me = save.myId, x = f[me], lvl = DETAILS.indexOf(u.detail), rec = save.rec[me];
    var pages = [];
    var form = el('div', 'hf');
    var top = el('div', 'hs-row');
    top.appendChild(stat('Record', rec.w + '-' + rec.l, rec.w + rec.l ? Math.round(100 * rec.w / (rec.w + rec.l)) + '% wins' : 'Opening night'));
    top.appendChild(stat('Streak', streakOf(x.res), 'Last 10: ' + (function () { var l = x.res.slice(-10), w = l.reduce(function (a, b) { return a + b; }, 0); return l.length ? w + '-' + (l.length - w) : '-'; })()));
    var diff = x.g ? (x.pf - x.pa) / x.g : 0;
    top.appendChild(stat('Margin', x.g ? (diff > 0 ? '+' : '') + diff.toFixed(1) : '-', 'per game'));
    form.appendChild(top);
    var dots = el('div', 'hdots');
    x.res.slice(-10).forEach(function (r) { dots.appendChild(el('i', r ? 'w' : 'l', r ? 'W' : 'L')); });
    if (!x.res.length) dots.appendChild(el('small', null, 'No games played yet'));
    form.appendChild(dots);
    if (lvl >= 1) { var sp = spark(x.margin || [], 300, 110); form.appendChild(sp); }
    pages.push({ title: 'Form', node: form });

    var rt = el('div', 'hr');
    var ids = save.ids;
    [['Overall', teamRating], ['Offence', offRating], ['Defence', defRating]].forEach(function (c) {
      var vals = ids.map(function (id) { return c[1](id); }), mine = c[1](me), avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      var row = el('div', 'rt-row');
      row.appendChild(el('span', null, c[0]));
      var tr = el('span', 'track');
      var fl = el('span', 'fill ' + level(mine)); fl.style.width = Math.min(100, mine) + '%';
      tr.appendChild(fl);
      var mk = el('i', 'avg'); mk.style.left = Math.min(100, avg) + '%'; tr.appendChild(mk);
      row.appendChild(tr);
      row.appendChild(el('b', null, String(mine)));
      row.appendChild(el('small', null, '#' + rankOf(vals, mine, true)));
      rt.appendChild(row);
    });
    form.appendChild(rt);

    if (lvl >= 1) {
      var sc = el('div', 'hs-grid');
      var pfs = ids.map(function (id) { var t = f[id]; return t.g ? t.pf / t.g : 0; }), pas = ids.map(function (id) { var t = f[id]; return t.g ? t.pa / t.g : 0; });
      var ppg = x.g ? x.pf / x.g : 0, opp = x.g ? x.pa / x.g : 0;
      sc.appendChild(stat('Points for', x.g ? ppg.toFixed(1) : '-', x.g ? '#' + rankOf(pfs, ppg, true) + ' in the league' : ''));
      sc.appendChild(stat('Points against', x.g ? opp.toFixed(1) : '-', x.g ? '#' + rankOf(pas, opp, false) + ' fewest' : ''));
      if (lvl >= 2) {
        sc.appendChild(stat('Home', x.home.w + '-' + x.home.l));
        sc.appendChild(stat('Away', x.away.w + '-' + x.away.l));
        sc.appendChild(stat('Close games', x.close.w + '-' + x.close.l, 'within 5 points'));
        var pay = League.payroll(save, me);
        sc.appendChild(stat('Cap room', money(save.lg.cap - pay), money(pay) + ' payroll'));
      }
      pages.push({ title: 'Scoring', node: sc });
    }
    return hubRail(pages.concat(hubClub(u)));
  }

  function hubClub(u) {
    var me = teamById(save.myId);
    ensureOwner();
    var pages = [];
    var ow = el('div', 'hc');
    ow.appendChild(el('p', 'goal', save.owner.text + '.'));
    sideBlock(ow);
    ow.appendChild(ratingRow('Owner trust', save.ownerTrust));
    var sm = Events.summary(save, rosterOf(me.id));
    ow.appendChild(ratingRow('Team morale', sm.morale));
    if (u.detail !== 'basic') { ow.appendChild(ratingRow('Fan interest', sm.fans)); ow.appendChild(ratingRow('Coach trust', sm.coach)); }
    if (save.coach) pages.push({ title: 'Coaching staff', node: staffNode() });
    pages.push({ title: 'The owner', node: ow });
    var mo = Events.mood(save);
    var feed = el('div', 'hc feed');
    var items = [];
    (save.lg.wire || []).filter(function (w) { return w.y === save.year; }).slice(-3).reverse().forEach(function (w) { items.push([w.t, 'Game day ' + w.d]); });
    mo.news.slice(-3).reverse().forEach(function (n) { items.push([n.text, n.date]); });
    items.slice(0, 5).forEach(function (it) { var d = el('div', 'fi', it[0]); d.appendChild(el('small', null, it[1])); feed.appendChild(d); });
    if (!items.length) feed.appendChild(el('p', 'sub', 'Quiet so far.'));
    pages.push({ title: 'Around the league', node: feed });
    var mine = save.results.filter(function (r) { return r.h === me.id || r.a === me.id; }).slice(-5).reverse();
    var rg = el('div', 'hc');
    mine.forEach(function (r) {
      var home = r.h === me.id, us = home ? r.hs : r.as, them = home ? r.as : r.hs, o = teamById(home ? r.a : r.h);
      var line = el('div', 'gm ' + (us > them ? 'w' : 'l'));
      line.appendChild(el('b', null, us > them ? 'W' : 'L'));
      var sb = teamBadge(o); sb.className += ' sm'; line.appendChild(sb);
      line.appendChild(el('span', null, (home ? 'vs ' : 'at ') + o.city));
      line.appendChild(el('em', null, us + '-' + them));
      rg.appendChild(line);
    });
    if (!mine.length) rg.appendChild(el('p', 'sub', 'No games yet.'));
    pages.push({ title: 'Recent games', node: rg });
    return pages;
  }


  /* ---------- coaching staff ---------- */
  function coachRatings(c) {
    var d = el('span', 'cr');
    [['OFF', c.off], ['DEF', c.def], ['DEV', c.dev], ['MOT', c.mot]].forEach(function (x) { var s = el('i'); s.appendChild(document.createTextNode(x[0] + ' ')); s.appendChild(el('b', null, String(x[1]))); d.appendChild(s); });
    return d;
  }
  function coachRow(c, label, onTap, extra) {
    var r = el(onTap ? 'button' : 'div', 'coach-row'); if (onTap) r.type = 'button';
    r.appendChild(makeAvatar({ id: c.pid || c.id, name: c.n }));
    var t = el('span', 'cm');
    t.appendChild(el('b', null, c.n));
    t.appendChild(el('small', null, (label ? label + ' · ' : '') + (c.ex ? 'ex-player · ' : '') + 'age ' + c.age));
    r.appendChild(t); r.appendChild(coachRatings(c));
    if (extra) r.appendChild(extra);
    if (onTap) r.addEventListener('click', onTap);
    return r;
  }
  function staffNode() {
    var box = el('div', 'hc staff'), b = Coach.bonus(save, save.myId, Events.mood(save).coach);
    Coach.owned(save, save.myId).forEach(function (o) {
      if (o.c) box.appendChild(coachRow(o.c, o.label, function () { openCoachSheet(o.role); }));
      else { var e = el('button', 'coach-row empty', 'Hire a ' + o.label.toLowerCase()); e.type = 'button'; e.addEventListener('click', function () { openCoachSheet(o.role); }); box.appendChild(e); }
    });
    if (b) { var f = function (v) { return (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%'; }; box.appendChild(el('p', 'staff-fx', 'Offence ' + f(b.off) + ' · Defence ' + f(b.def))); }
    return box;
  }
  function openCoachSheet(role) {
    var label = { hc: 'Head coach', ao: 'Assistant coach', ad: 'Assistant coach' }[role], cur = Coach.staff(save, save.myId)[role];
    hubSheet(label, function (sh, close) {
      if (cur) {
        sh.appendChild(coachRow(cur, '', null));
        var fb = el('button', 'btn small', 'Fire ' + cur.n); fb.type = 'button';
        fb.addEventListener('click', function () {
          Coach.fire(save, save.myId, role);
          if (role === 'hc') Events.apply(save, { choices: [{ fx: { team: { m: -2 } } }], pid: null, who: '' }, 0, rosterOf(save.myId));
          rosterCache = {}; persist(); close(); openCoachSheet(role); refreshHub();
        });
        sh.appendChild(fb);
      }
      sh.appendChild(el('h3', 'box-title', cur ? 'Replace with' : 'Available'));
      var pool = Coach.bestFor ? save.coach.pool.slice().sort(function (x, y) {
        var k = role !== 'hc' ? function (c) { return (c.off + c.def) * 0.7 + c.dev * 0.3 + c.mot * 0.3; } : function (c) { return Coach.score(c) + c.mot * 0.2; };
        return k(y) - k(x);
      }).slice(0, 5) : [];
      pool.forEach(function (c) {
        var hb = el('button', 'btn small primary', 'Hire'); hb.type = 'button';
        hb.addEventListener('click', function (e) {
          e.stopPropagation();
          Coach.hire(save, save.myId, role, c);
          if (role === 'hc') Events.mood(save).coach = 50;
          rosterCache = {}; persist(); close(); refreshHub();
        });
        sh.appendChild(coachRow(c, c.role === 'hc' ? 'HC' : 'Assistant', null, hb));
      });
      if (!pool.length) sh.appendChild(el('p', 'sub', 'No coaches are available right now.'));
    });
  }
  function refreshHub() { try { renderSeason(); } catch (e) {} }

  function hubSheet(title, build, onClose) {
    var ov = el('div', 'sheet-ov');
    var sh = el('div', 'sheet');
    sh.appendChild(el('h3', null, title));
    build(sh, function () { ov.remove(); if (onClose) onClose(); });
    ov.addEventListener('click', function (e) { if (e.target === ov) { ov.remove(); if (onClose) onClose(); } });
    ov.appendChild(sh);
    document.body.appendChild(ov);
  }

  /* ---------- the feed: an X-style timeline of everything around the league ---------- */
  var FEEDTAB = 'All';
  var FEEDROLES = { All: null, Insiders: ['insider', 'scout', 'agent'], Teams: ['team'], Cap: ['cap', 'stats'], Fans: ['fan'], Players: ['player'], DMs: ['dm'] };
  function openFeed() {
    FEEDTAB = FEEDTAB || 'All';
    Social.feed(save);
    renderFeed();
    show('screen-feed');
    Social.markRead(save);
    var fbEl = document.querySelector('#screen-season .feedbtn');
    if (fbEl) { fbEl.classList.remove('dot'); fbEl.dataset.n = '0'; }
    persist();
  }
  function fmtN(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n); }
  var FEEDSVG = {
    rp: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    rt: '<svg viewBox="0 0 24 24"><path d="M5 9l3-3 3 3M8 6v9a2 2 0 002 2h6M19 15l-3 3-3-3M16 18V9a2 2 0 00-2-2H8"/></svg>',
    lk: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.600-7 10-7 10z"/></svg>',
    vw: '<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>'
  };
  function feedAvatar(p) {
    var a;
    if (p.pid) {
      var pl = League.byId(save, p.pid);
      a = pl ? makeAvatar(pl) : el('span', 'avatar', '?');
    } else if (p.tid && save.tm[p.tid]) {
      a = teamBadge(save.tm[p.tid]);
    } else {
      a = el('span', 'avatar fa', (p.g || (p.who || '?')[0]).toString().slice(0, 2));
      if (p.c) a.style.background = p.c;
    }
    a.classList.add('fa-av');
    return a;
  }
  function renderFeed() {
    var tabs = document.getElementById('feed-tabs'), body = document.getElementById('feed-body');
    tabs.textContent = ''; body.textContent = '';
    document.getElementById('feed-sub').textContent = Events.dateFor(save);
    Object.keys(FEEDROLES).forEach(function (t) {
      var b = el('button', t === FEEDTAB ? 'on' : '', t); b.type = 'button';
      b.addEventListener('click', function () { FEEDTAB = t; renderFeed(); });
      tabs.appendChild(b);
    });
    var roles = FEEDROLES[FEEDTAB], list = (save.feed || []).filter(function (p) { return !roles || roles.indexOf(p.role) >= 0; });
    if (!list.length) { body.appendChild(el('p', 'sub', 'Quiet for now. Play a few games.')); return; }
    list.slice(0, 80).forEach(function (p) {
      var c = el('article', 'fp fp-' + p.role);
      c.appendChild(feedAvatar(p));
      var main = el('div', 'fp-main');
      var head = el('div', 'fp-head');
      head.appendChild(el('b', null, p.who));
      if (p.v) { var vk = el('i', 'fp-v'); vk.textContent = '\u2713'; head.appendChild(vk); }
      head.appendChild(el('span', null, '@' + p.h + ' \u00B7 ' + (p.d === (save.phase === 'regular' ? save.day : 200 + (save.pd || 0)) ? p.m + 'h' : p.dl)));
      main.appendChild(head);
      if (p.role === 'dm') main.appendChild(el('small', 'fp-dm', 'Direct message'));
      main.appendChild(el('p', 'fp-t', p.t));
      if (p.score) main.appendChild(el('span', 'fp-score ' + p.score, p.score === 'W' ? 'Win' : 'Loss'));
      if (save.pinned && save.pinned.feedId === p.id) {
        var rb = el('button', 'btn small primary fp-respond', 'Respond'); rb.type = 'button';
        rb.addEventListener('click', function () { respondTo(save.pinned, function () { save.pinned = null; persist(); renderFeed(); }); });
        main.appendChild(rb);
      }
      var eg = el('div', 'fp-eng');
      [['rp', p.rp], ['rt', p.rt], ['lk', p.lk], ['vw', p.lk * 14 + 300]].forEach(function (x) {
        var s = el('span'); s.innerHTML = FEEDSVG[x[0]] + '<em>' + fmtN(x[1]) + '</em>'; eg.appendChild(s);
      });
      main.appendChild(eg);
      c.appendChild(main);
      body.appendChild(c);
    });
  }

  /* the coach's game plan: style, pace and how hard the starters play. It runs in every game you sim or play. */
  function openPlan() {
    hubSheet('Game plan', function (sh, close) {
      save.plan = save.plan || { pace: 0, focus: '', minutes: '' };
      var pl = save.plan;
      [['pace', 'Pace', [[1, 'Run'], [0, 'Balanced'], [-1, 'Grind']]],
       ['focus', 'Style', [['inside', 'Inside'], ['', 'Balanced'], ['ball', 'Ball movement'], ['defence', 'Lock down']]],
       ['minutes', 'Starters', [['heavy', 'Heavy minutes'], ['', 'Normal'], ['deep', 'Share the load']]]].forEach(function (rr) {
        sh.appendChild(el('p', 'sh-l', rr[1]));
        var row = el('div', 'chips');
        rr[2].forEach(function (it) {
          var b = el('button', (pl[rr[0]] || 0) === it[0] || (!pl[rr[0]] && it[0] === '') ? 'on' : '', it[1]); b.type = 'button';
          b.addEventListener('click', function () {
            pl[rr[0]] = it[0]; persist();
            Array.prototype.forEach.call(row.children, function (x) { x.classList.toggle('on', x === b); });
          });
          row.appendChild(b);
        });
        sh.appendChild(row);
      });
      var d = el('button', 'btn primary wide', 'Done'); d.type = 'button'; d.addEventListener('click', close); sh.appendChild(d);
    });
  }

  function customise() {
    hubSheet('Customise', function (sh, close) {
      var u = ui();
      if (save.eraId !== '1946') {
        save.rules = save.rules || {};
        [['three', 'Three-point line', [['', 'Standard'], ['short', 'Closer'], ['deep', 'Deeper'], ['off', 'Abolished']]],
         ['clock', 'Shot clock', [['short', '20 sec'], ['', '24 sec'], ['long', '30 sec']]],
         ['parity', 'Parity', [['tight', 'Tighter'], ['', 'As real'], ['wide', 'Superteams']]],
         ['whistle', 'Officiating', [['tight', 'Tight'], ['', 'Normal'], ['loose', 'Let them play']]]].forEach(function (rr) {
          sh.appendChild(el('p', 'sh-l', rr[1]));
          var row = el('div', 'chips');
          rr[2].forEach(function (it) {
            var b = el('button', (save.rules[rr[0]] || '') === it[0] ? 'on' : '', it[1]); b.type = 'button';
            b.addEventListener('click', function () {
              if (it[0]) save.rules[rr[0]] = it[0]; else delete save.rules[rr[0]];
              Engine.setRules(save.rules); persist();
              Array.prototype.forEach.call(row.children, function (x) { x.classList.toggle('on', x === b); });
            });
            row.appendChild(b);
          });
          sh.appendChild(row);
        });
      }
      function chips(label, items, isOn, toggle) {
        sh.appendChild(el('p', 'sh-l', label));
        var row = el('div', 'chips');
        items.forEach(function (it) {
          var b = el('button', isOn(it[0]) ? 'on' : '', it[1]); b.type = 'button';
          b.addEventListener('click', function () { toggle(it[0]); saveUi(u); b.classList.toggle('on', isOn(it[0])); });
          row.appendChild(b);
        });
        sh.appendChild(row);
      }
      sh.appendChild(el('p', 'sh-l', 'Stat detail'));
      var seg = el('div', 'chips');
      [['basic', 'Basic'], ['standard', 'Standard'], ['nerd', 'Everything']].forEach(function (d) {
        var b = el('button', u.detail === d[0] ? 'on' : '', d[1]); b.type = 'button';
        b.addEventListener('click', function () {
          u.detail = d[0]; u.cats = null; saveUi(u);
          Array.prototype.forEach.call(seg.children, function (x) { x.classList.toggle('on', x === b); });
          catRow.remove(); catRow = buildCats(); sh.insertBefore(catRow, done);
        });
        seg.appendChild(b);
      });
      sh.appendChild(seg);
      chips('Tabs', Object.keys(TABS).map(function (k) { return [k, TABS[k]]; }), function (k) { return u.tabs.indexOf(k) >= 0; }, function (k) {
        var i = u.tabs.indexOf(k);
        if (i >= 0) { if (u.tabs.length > 1) u.tabs.splice(i, 1); } else u.tabs.push(k);
        u.tabs.sort(function (a, b) { return Object.keys(TABS).indexOf(a) - Object.keys(TABS).indexOf(b); });
      });
      function buildCats() {
        var wrap = el('div');
        var d = leaderDefs(u.detail);
        var cur = u.cats || d.all.filter(function (c) { return c.lvl <= d.level; }).map(function (c) { return c.id; });
        wrap.appendChild(el('p', 'sh-l', 'Leader categories'));
        var row = el('div', 'chips');
        d.all.forEach(function (c) {
          var b = el('button', cur.indexOf(c.id) >= 0 ? 'on' : '', c.t); b.type = 'button';
          b.addEventListener('click', function () {
            var i = cur.indexOf(c.id);
            if (i >= 0) { if (cur.length > 1) cur.splice(i, 1); } else cur.push(c.id);
            u.cats = cur.slice(); saveUi(u); b.classList.toggle('on', cur.indexOf(c.id) >= 0);
          });
          row.appendChild(b);
        });
        wrap.appendChild(row);
        return wrap;
      }
      var catRow = buildCats();
      sh.appendChild(catRow);
      var done = el('button', 'btn primary wide', 'Done'); done.type = 'button';
      done.addEventListener('click', function () { close(); renderSeason(); });
      sh.appendChild(done);
    });
  }

  function renderHub() {
    var me = teamById(save.myId), rec = save.rec[me.id], u = ui();
    var bodyEl = document.getElementById('season-body');
    bodyEl.textContent = '';
    bodyEl.className = 'hub';
    var titleEl = document.getElementById('season-title');
    titleEl.textContent = me.city + ' ' + me.name;
    document.getElementById('season-sub').textContent = seasonLabel(save.year) + ' · ' + (rec.w + rec.l ? rec.w + '-' + rec.l : recText(me.id, rec, 1)) + ' · ' + money(League.payroll(save, me.id)) + (save.phase === 'done' ? '' : ' · Title ' + pctText(titleOdds(me.id)));
    var hdr = document.querySelector('#screen-season .bar');
    var gear = hdr.querySelector('.gear');
    if (!gear) {
      gear = el('button', 'gear', '⚙'); gear.type = 'button'; gear.setAttribute('aria-label', 'Customise');
      hdr.appendChild(gear);
    }
    gear.onclick = customise;
    var fb = hdr.querySelector('.feedbtn');
    if (Social.has(save.year)) {
      if (!fb) { fb = el('button', 'feedbtn', '\u2709'); fb.type = 'button'; fb.setAttribute('aria-label', 'Feed'); hdr.insertBefore(fb, gear); }
      fb.onclick = openFeed;
      var un = Social.unread(save);
      fb.classList.toggle('dot', un > 0);
      fb.dataset.n = un > 9 ? '9+' : String(un);
    } else if (fb) fb.remove();
    document.getElementById('season-dock').hidden = true;

    var next = Season.myNext(save), reg = save.phase === 'regular', done = save.phase === 'done';
    var f = formAll();

    /* the next game */
    var hero = el('div', 'hh');
    if (done) {
      var champ = teamById(save.champion);
      hero.classList.add('champ');
      var cb = teamBadge(champ); hero.appendChild(cb);
      var tx = el('div', 'hh-t');
      tx.appendChild(el('b', null, champ.city + ' ' + champ.name));
      tx.appendChild(el('small', null, champ.id === me.id ? 'You won the title' : 'Champions of ' + seasonLabel(save.year)));
      hero.appendChild(tx);
    } else if (next) {
      var oppId = next.home === me.id ? next.away : next.home, opp = teamById(oppId), orec = save.rec[oppId];
      var head = el('div', 'hh-when', reg ? 'Game ' + (rec.w + rec.l + 1) + ' of ' + gamesFor(me.id) + dateTag() : Season.roundInfo(save, next.round).name);
      hero.appendChild(head);
      var vs = el('div', 'hh-vs');
      [[me, rec, 'mine'], [opp, orec, '']].forEach(function (x, i) {
        if (i === 1) vs.appendChild(el('span', 'at', next.home === me.id ? 'vs' : 'at'));
        var s = el('div', 'hh-side ' + x[2]);
        s.appendChild(teamBadge(x[0]));
        var t = el('div');
        t.appendChild(el('b', null, x[0].city));
        t.appendChild(el('small', null, recText(x[0].id, x[1])));
        s.appendChild(t);
        vs.appendChild(s);
      });
      hero.appendChild(vs);
      var chipsEl = el('div', 'hh-cmp');
      var cmps = [['OVR', teamRating(me.id), teamRating(oppId)]];
      if (u.detail !== 'basic') cmps.push(['OFF', offRating(me.id), offRating(oppId)], ['DEF', defRating(me.id), defRating(oppId)]);
      cmps.forEach(function (c) {
        var d = el('span', c[1] >= c[2] ? 'up' : 'dn');
        d.appendChild(el('small', null, c[0]));
        d.appendChild(el('b', null, c[1] + ' – ' + c[2]));
        chipsEl.appendChild(d);
      });
      hero.appendChild(chipsEl);
    } else {
      var msg = reg ? 'Rest day' : Season.inPlayoffs(save, me.id) ? 'Your club is resting' : 'Out of the playoffs';
      hero.appendChild(el('div', 'hh-when', msg));
    }
    bodyEl.appendChild(hero);

    /* tabs */
    var tabs = u.tabs.filter(function (k) { return TABS[k]; });
    if (tabs.indexOf(hubTab) < 0) hubTab = tabs[0];
    var tabBar = el('div', 'htabs');
    var panel = el('div', 'hpanel');
    function showTab(k) {
      hubTab = k;
      Array.prototype.forEach.call(tabBar.children, function (b) { b.classList.toggle('on', b.dataset.k === k); });
      panel.textContent = '';
      var node = k === 'table' ? hubTable(u, f) : k === 'leaders' ? hubLeaders(u) : hubTeam(u, f);
      panel.appendChild(node);
      requestAnimationFrame(fitRows);
    }
    function fitRows() {
      var tbs = panel.querySelectorAll('table.ht');
      for (var t = 0; t < tbs.length; t++) {
        var tb = tbs[t], rows = tb.tBodies[0].rows, avail = panel.clientHeight, rh = 26;
        var max = Math.max(5, Math.floor((avail - 66) / rh));
        for (var i = 0; i < rows.length; i++) rows[i].hidden = false;
        if (rows.length > max) {
          var keep = max - 1;
          for (var j = 0; j < rows.length; j++) {
            var mineRow = rows[j].classList.contains('me');
            rows[j].hidden = !(j < keep || (mineRow && j >= keep && j === rows.length - 1) || (mineRow && j >= keep));
          }
          // always leave room for the user's own row
          var shown = 0; for (var k2 = 0; k2 < rows.length; k2++) if (!rows[k2].hidden) shown++;
          if (shown > max) for (var m = rows.length - 1; m >= 0 && shown > max; m--) if (!rows[m].hidden && !rows[m].classList.contains('me')) { rows[m].hidden = true; shown--; }
        }
      }
    }
    tabs.forEach(function (k) {
      var b = el('button', k === hubTab ? 'on' : '', TABS[k]); b.type = 'button'; b.dataset.k = k;
      b.addEventListener('click', function () { showTab(k); });
      tabBar.appendChild(b);
    });
    bodyEl.appendChild(tabBar);
    bodyEl.appendChild(panel);

    /* the bar at the bottom */
    var dk = el('div', 'hdock');
    var play = el('button', 'btn primary wide', done ? (save.off ? 'Continue the off-season' : 'Begin the off-season') : next ? 'Play game' : (reg ? 'Sim today' : 'Sim the playoffs'));
    play.type = 'button';
    play.addEventListener('click', function () {
      if (done) { if (!save.off) startOffseason(); else openOff(); }
      else if (!next && !reg) simPlayoffs(); else playNext();
    });
    dk.appendChild(play);
    var row = el('div', 'hd-row');
    function nav(label, fn) { var b = el('button', 'btn', label); b.type = 'button'; b.addEventListener('click', fn); row.appendChild(b); }
    nav('Roster', function () { renderRoster(me); show('screen-roster'); });
    nav('Plan', openPlan);
    nav('Trades', function () { openTrade('season'); });
    nav('Records', openRecords);
    if (reg) nav('Sim', function () {
      hubSheet('Sim', function (sh, close) {
        [['Sim a week', function () { simDays(7); }], ['Sim to the playoffs', function () { simDays(500); }]].forEach(function (a) {
          var b = el('button', 'btn wide', a[0]); b.type = 'button';
          b.addEventListener('click', function () { close(); a[1](); });
          sh.appendChild(b);
        });
      });
    });
    dk.appendChild(row);
    bodyEl.appendChild(dk);
    showTab(hubTab);
    setTimeout(awardsPop, 400);
  }

  function renderSeason() {
    if (modernUI()) { renderHub(); return; }
    var me = teamById(save.myId);
    var rec = save.rec[me.id];
    var bodyEl = document.getElementById('season-body');
    bodyEl.textContent = '';
    document.getElementById('season-title').textContent = me.city + ' ' + me.name;
    var sub = seasonLabel(save.year) + ' · ' + recText(me.id, rec) + ' · payroll ' + money(League.payroll(save, me.id));
    document.getElementById('season-sub').textContent = sub;

    var next = Season.myNext(save);
    var nextBtn = document.getElementById('btn-next');
    var weekBtn = document.getElementById('btn-simweek');
    var restBtn = document.getElementById('btn-simrest');
    var reg = save.phase === 'regular';
    document.getElementById('season-dock').hidden = save.phase === 'done';
    weekBtn.hidden = !reg;
    restBtn.hidden = !reg;
    restBtn.parentNode.hidden = !reg;
    nextBtn.textContent = next ? 'Play game' : (reg ? 'Sim today' : 'Sim the playoffs');
    nextBtn.onclick = function () { if (!next && !reg) simPlayoffs(); else playNext(); };

    var card = el('div', 'stat-card');
    if (save.phase === 'done') {
      var champ = teamById(save.champion);
      card.className = 'stat-card champ';
      var cb = teamBadge(champ); cb.className += ' big'; cb.style.margin = '0 auto';
      card.appendChild(cb);
      card.appendChild(el('h3', null, champ.city + ' ' + champ.name));
      card.appendChild(el('p', 'sub', champ.id === me.id ? 'You won the title. The new league champions.' : 'Champions of ' + seasonLabel(save.year) + '. Your season is over.'));
      var ob = el('button', 'btn primary wide', save.off ? 'Continue the off-season' : 'Begin the off-season');
      ob.type = 'button';
      ob.addEventListener('click', function () { if (!save.off) startOffseason(); else openOff(); });
      card.appendChild(ob);
    } else if (next) {
      var oppId = next.home === me.id ? next.away : next.home;
      var opp = teamById(oppId);
      if (modernUI()) {
        card.className = 'stat-card hero';
        var oprec2 = save.rec[oppId];
        card.appendChild(el('div', 'hero-when', save.phase === 'regular' ? 'Game ' + (rec.w + rec.l + 1) + ' of ' + gamesFor(me.id) + dateTag() : Season.roundInfo(save, next.round).name));
        var vs = el('div', 'hero-vs');
        function side(t, r, here) {
          var c = el('div', 'hero-side' + (here ? ' mine' : ''));
          c.appendChild(teamBadge(t));
          c.appendChild(el('b', null, t.city));
          c.appendChild(el('small', null, recText(t.id, r)));
          return c;
        }
        vs.appendChild(side(me, rec, true));
        vs.appendChild(el('span', 'hero-at', next.home === me.id ? 'vs' : 'at'));
        vs.appendChild(side(opp, oprec2, false));
        card.appendChild(vs);
        [['Overall', teamRating(me.id), teamRating(oppId)], ['Offence', offRating(me.id), offRating(oppId)], ['Defence', defRating(me.id), defRating(oppId)]].forEach(function (x) {
          var r = el('div', 'hero-cmp');
          r.appendChild(el('span', 'n' + (x[1] >= x[2] ? ' lead' : ''), String(x[1])));
          var mid = el('span', 'mid');
          var tot = Math.max(1, x[1] + x[2]);
          var l = el('i', 'l'); l.style.width = Math.round(100 * x[1] / tot) + '%';
          var rr = el('i', 'r'); rr.style.width = Math.round(100 * x[2] / tot) + '%';
          mid.appendChild(l); mid.appendChild(rr);
          var lab = el('em', null, x[0]);
          var col = el('span', 'col'); col.appendChild(lab); col.appendChild(mid);
          r.appendChild(col);
          r.appendChild(el('span', 'n' + (x[2] > x[1] ? ' lead' : ''), String(x[2])));
          card.appendChild(r);
        });
      } else {
      var row = el('div', 'row');
      row.appendChild(teamBadge(opp));
      var tx = el('span');
      tx.appendChild(el('strong', null, (next.home === me.id ? 'vs ' : 'at ') + opp.city + ' ' + opp.name));
      var oprec = save.rec[oppId];
      tx.appendChild(el('span', 'meta', oprec.w + '-' + oprec.l + ' · team rating ' + teamRating(oppId) + ' vs your ' + teamRating(me.id)));
      tx.appendChild(el('span', 'meta', 'Offence ' + offRating(oppId) + ' vs ' + offRating(me.id) + ' · defence ' + defRating(oppId) + ' vs ' + defRating(me.id)));
      row.appendChild(tx);
      card.appendChild(el('div', 'group-title', save.phase === 'regular' ? 'Next game · ' + (rec.w + rec.l + 1) + ' of ' + gamesFor(me.id) + dateTag() : Season.roundInfo(save, next.round).name));
      card.appendChild(row);
      }
    } else {
      card.appendChild(el('div', 'group-title', save.phase === 'regular' ? 'Rest day' : Season.inPlayoffs(save, me.id) ? 'Waiting' : 'Out of the playoffs'));
      card.appendChild(el('p', 'sub', save.phase === 'regular' ? 'No game for your team today.' : Season.inPlayoffs(save, me.id) ? 'Your club is resting while the other series finish.' : 'Your season is over. Sim the rest of the playoffs to crown a champion.'));
    }
    bodyEl.appendChild(card);
    if (save.playoffs) {
      bodyEl.appendChild(el('h3', 'box-title', 'Playoff bracket'));
      bodyEl.appendChild(bracketView());
    }

    ensureOwner();
    var oc = el('div', 'stat-card');
    oc.appendChild(el('div', 'group-title', 'The owner wants'));
    oc.appendChild(el('p', 'sub', save.owner.text + '.'));
    sideBlock(oc);
    oc.appendChild(ratingRow('Owner trust', save.ownerTrust));
    bodyEl.appendChild(oc);
    var st = Season.standings(save);
    var divs = Object.keys(st).sort(function (x, y) {
      var mx = st[x].some(function (r) { return r.id === me.id; }), my = st[y].some(function (r) { return r.id === me.id; });
      return mx === my ? 0 : mx ? -1 : 1;
    });
    bodyEl.appendChild(carousel(divs.map(function (d) { return { title: divTitle(d), node: standingsTable(d, st[d]) }; })));

    var gp = rec.w + rec.l, qual = Math.max(1, Math.min(15, Math.floor(gp * 0.5)));
    var cats = [
      { t: 'Points', f: function (x) { return x.pts / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { t: 'Assists', f: function (x) { return x.ast / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { t: 'Field goal %', f: function (x) { return x.fga >= qual * 3 ? 100 * x.fg / x.fga : -1; }, fmt: function (v) { return v.toFixed(1) + '%'; } },
      { t: 'Free throw %', f: function (x) { return x.fta >= qual ? 100 * x.ft / x.fta : -1; }, fmt: function (v) { return v.toFixed(1) + '%'; } },
      { t: 'Free throws made', f: function (x) { return x.ft / x.g; }, fmt: function (v) { return v.toFixed(1); } },
      { t: 'Fouls', f: function (x) { return x.pf / x.g; }, fmt: function (v) { return v.toFixed(1); } }
    ];
    var pages = [];
    cats.forEach(function (c) {
      var rows = Object.keys(save.lg.stats).map(function (id) {
        var x = save.lg.stats[id], p = League.byId(save, id);
        return p && x.g >= qual ? { p: p, v: c.f(x), g: x.g } : null;
      }).filter(function (r) { return r && r.v >= 0; }).sort(function (a2, b2) { return b2.v - a2.v; }).slice(0, 3);
      if (!rows.length) return;
      var box = el('div', 'stat-card lead');
      rows.forEach(function (r, i) {
        var line = el('button', 'lead-row');
        line.type = 'button';
        line.appendChild(el('span', 'rk', String(i + 1)));
        line.appendChild(makeAvatar(r.p));
        var tx = el('span', 'who');
        tx.appendChild(el('strong', null, r.p.name));
        tx.appendChild(el('small', null, (r.p.team ? teamById(r.p.team).city : 'Free agent') + ' \u00B7 ' + r.g + ' games'));
        line.appendChild(tx);
        line.appendChild(el('b', 'val', c.fmt(r.v)));
        line.addEventListener('click', function () { openPlayer(r.p, r.p.team ? teamById(r.p.team) : null); });
        box.appendChild(line);
      });
      pages.push({ title: c.t + ' leaders', node: box });
    });
    if (pages.length) bodyEl.appendChild(carousel(pages));
    else {
      bodyEl.appendChild(el('h3', 'box-title', 'League leaders'));
      bodyEl.appendChild(el('p', 'sub how', 'Leaders appear once the season gets going.'));
    }
    var wr = (save.lg.wire || []).filter(function (w) { return w.y === save.year; }).slice(-4).reverse();
    if (wr.length) {
      bodyEl.appendChild(el('h3', 'box-title', 'League wire'));
      var wc = el('div', 'stat-card headlines');
      wr.forEach(function (w) { var d = el('div', null, w.t); d.appendChild(el('small', null, 'Game day ' + w.d)); wc.appendChild(d); });
      bodyEl.appendChild(wc);
    }
    var mo = Events.mood(save), sm = Events.summary(save, rosterOf(me.id));
    bodyEl.appendChild(el('h3', 'box-title', 'Clubhouse'));
    var cc = el('div', 'stat-card meter');
    cc.appendChild(ratingRow('Team morale', sm.morale));
    cc.appendChild(ratingRow('Fan interest', sm.fans));
    cc.appendChild(ratingRow('Coach trust', sm.coach));
    bodyEl.appendChild(cc);
    if (mo.news.length) {
      bodyEl.appendChild(el('h3', 'box-title', 'From the papers'));
      var hc = el('div', 'stat-card headlines');
      mo.news.slice(-3).reverse().forEach(function (n) {
        var d = el('div', null, n.text);
        d.appendChild(el('small', null, n.date));
        hc.appendChild(d);
      });
      bodyEl.appendChild(hc);
    }

    var mine = save.results.filter(function (r) { return r.h === me.id || r.a === me.id; }).slice(-5).reverse();
    if (mine.length) {
      bodyEl.appendChild(el('h3', 'box-title', 'Recent games'));
      var rc = el('div', 'stat-card');
      mine.forEach(function (r) {
        var home = r.h === me.id, us = home ? r.hs : r.as, them = home ? r.as : r.hs;
        var o = teamById(home ? r.a : r.h);
        var line = el('div', 'series');
        line.appendChild(el('span', null, (home ? 'vs ' : 'at ') + o.city));
        line.appendChild(el('b', null, (us > them ? 'W ' : 'L ') + us + '-' + them));
        rc.appendChild(line);
      });
      bodyEl.appendChild(rc);
    }

    var rb = el('button', 'btn wide', 'View roster');
    rb.type = 'button';
    rb.addEventListener('click', function () {
      renderRoster(me);
      show('screen-roster');
    });
    bodyEl.appendChild(rb);
    var tb = el('button', 'btn wide', 'Trades');
    tb.type = 'button';
    tb.addEventListener('click', function () { openTrade('season'); });
    bodyEl.appendChild(tb);
    var hb = el('button', 'btn wide', 'Records & history');
    hb.type = 'button';
    hb.addEventListener('click', openRecords);
    bodyEl.appendChild(hb);
  }


  /* ---------- daily events ---------- */
  var RADIO_SVG = '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><rect x="8" y="26" width="64" height="40" rx="6"/><circle cx="28" cy="46" r="11"/><circle cx="28" cy="46" r="4"/><path d="M46 38h18M46 46h18M46 54h18"/><path d="M30 26l-8-14M50 26l8-14"/><path d="M62 8c4 3 6 7 6 11M68 4c6 4 9 10 9 16" opacity=".6"/></svg>';

  function openEvents() {
    if (!save.pending || !save.pending.length) { renderSeason(); show('screen-season'); return; }
    renderEvent(save.pending[0]);
    show('screen-events');
  }

  function nextEvent() {
    save.pending.shift();
    persist();
    openEvents();
  }

  /* A full front page. The photo is the day's best performer who has a portrait, from any club. */
  function renderPaper(ev) {
    var pg = el('article', 'paper');
    var M = modernUI();
    var mast = el('header', 'pp-mast');
    if (M) {
      pg.className = 'paper phone-feed';
      var ic = el('span', 'ph-ic', 'C');
      mast.appendChild(ic);
      var mt = el('div', 'ph-who');
      mt.appendChild(el('b', null, 'Courtside'));
      mt.appendChild(el('small', null, 'Game recap \u00B7 now'));
      mast.appendChild(mt);
    } else {
      mast.appendChild(el('div', 'pp-name', ev.paper));
      mast.appendChild(el('div', 'pp-meta', ev.date + ' \u00B7 ' + ev.edition + ' EDITION \u00B7 TWO CENTS'));
    }
    pg.appendChild(mast);
    pg.appendChild(el('h2', 'pp-head', ev.head));
    pg.appendChild(el('p', 'pp-deck', ev.deck));
    function photoFig(list, text) {
      var fig = el('figure', 'pp-photo');
      fig.hidden = true;
      var cap = el('figcaption', 'pp-cap');
      var tryNext = function (i) {
        if (i >= list.length) return;
        var c = list[i], exts = ['webp', 'png', 'jpg'], k = 0, img = new Image();
        img.onload = function () {
          fig.textContent = '';
          fig.appendChild(img);
          cap.textContent = text(c);
          fig.appendChild(cap);
          fig.hidden = false;
        };
        img.onerror = function () { k++; if (k < exts.length) img.src = 'assets/players/' + c.id + '.' + exts[k]; else tryNext(i + 1); };
        img.alt = c.name;
        img.src = 'assets/players/' + c.id + '.' + exts[0];
      };
      tryNext(0);
      return fig;
    }
    pg.appendChild(photoFig(ev.photos || [], function (c) { return c.name + ' of ' + c.team + ', ' + c.pts + ' points.'; }));
    ev.story.forEach(function (t) { pg.appendChild(el('p', 'pp-p', t)); });
    function section(title, nodes) {
      if (!nodes.length) return;
      var s = el('section', 'pp-sec');
      s.appendChild(el('h3', null, title));
      nodes.forEach(function (n) { s.appendChild(n); });
      pg.appendChild(s);
    }
    if (ev.feat) {
      var featNodes = [];
      if (ev.featPhoto) featNodes.push(photoFig([ev.featPhoto], function (c) { return c.name + ' of ' + c.team + '.'; }));
      featNodes.push(el('p', 'pp-p', ev.feat));
      section(M ? 'Highlight' : 'Feat of the day', featNodes);
    }
    section(M ? 'Around the league' : 'Around the circuit', ev.scores.map(function (g) {
      var r = el('div', 'pp-score');
      r.appendChild(el('span', null, g.w + ' ' + g.ws + ', ' + g.l + ' ' + g.ls));
      r.appendChild(el('small', null, g.top));
      return r;
    }));
    section(M ? 'Breaking' : 'On the wire', ev.briefs.map(function (b) {
      var p = el('p', 'pp-p');
      p.appendChild(el('b', null, b.h + '. '));
      p.appendChild(document.createTextNode(b.t));
      return p;
    }));
    section(M ? 'Injury report' : 'Injury list', (ev.injuries || []).map(function (t) { return el('p', 'pp-p', t); }));
    section(M ? 'Standings' : 'The standing', ev.table.map(function (d) {
      var box = el('div', 'pp-tab');
      box.appendChild(el('b', null, d.div));
      d.rows.forEach(function (r) {
        var row = el('div', 'pp-row' + (r.me ? ' me' : ''));
        row.appendChild(el('span', null, r.city));
        row.appendChild(el('span', null, r.w + '-' + r.l));
        box.appendChild(row);
      });
      return box;
    }));
    if (M) {
      // the recap is a swipeable feed, not a long page
      var kids = Array.prototype.slice.call(pg.children), pages = [];
      function grab(pred) { var out = kids.filter(pred); out.forEach(function (k) { kids.splice(kids.indexOf(k), 1); }); return out; }
      var first = grab(function (k) { return k.classList.contains('pp-mast') || k.classList.contains('pp-head') || k.classList.contains('pp-deck') || k.classList.contains('pp-photo'); });
      var story = grab(function (k) { return k.classList.contains('pp-p'); });
      function wrap(list) { var d = el('div', 'rc phone-feed'); list.forEach(function (n) { d.appendChild(n); }); return d; }
      function tcol(id) {
        var t = id ? teamById(id) : null, c = t && t.colors ? t.colors : [];
        for (var i = 0; i < c.length; i++) { try { if (luminance(c[i]) > 0.3) return c[i]; } catch (e) {} }
        return '#fff';
      }
      function seg(labels, pick) {
        var w = el('div', 'seg');
        labels.forEach(function (l, i) {
          var b = el('button', i ? '' : 'on', l); b.type = 'button';
          b.addEventListener('click', function () { Array.prototype.forEach.call(w.children, function (x, k) { x.classList.toggle('on', k === i); }); pick(i); });
          w.appendChild(b);
        });
        return w;
      }
      function sm(id) { var t = id ? teamById(id) : null; return t ? teamBadge(t) : el('span', 'badge'); }
      // 1. the story, all of it on the first page
      var pg1 = wrap(first.concat(story)); pg1.classList.add('article');
      pages.push({ title: '', node: pg1 });
      // 2. the night's best performances from every game
      if (ev.perf && ev.perf.length) {
        var pf = wrap([]); pf.classList.add('perf');
        ev.perf.forEach(function (x) {
          var r = el('div', 'pf-row');
          r.appendChild(makeAvatar({ id: x.id, name: x.name }));
          var mid = el('div', 'pf-mid');
          var nm = el('b', null, x.name); mid.appendChild(nm);
          var sub = el('small'); sub.appendChild(sm(x.tid)); sub.appendChild(document.createTextNode(x.team + (x.tag ? ' · ' + x.tag : '')));
          mid.appendChild(sub);
          r.appendChild(mid);
          var st = el('div', 'pf-st');
          st.appendChild(el('b', null, String(x.pts)));
          st.appendChild(el('small', null, x.reb + ' reb · ' + x.ast + ' ast · ' + x.fg + '-' + x.fga));
          r.appendChild(st);
          pf.appendChild(r);
        });
        pages.push({ title: 'Top performers', node: pf });
      }
      // 3. box score: our club first, tap the other name to switch
      if (ev.boxFull && ev.boxFull.length) {
        var bx = wrap([]); bx.classList.add('bxp');
        var bxBody = el('div', 'bx-body');
        function showBox(i) {
          var t = ev.boxFull[i];
          bxBody.textContent = '';
          var top = Math.max.apply(null, t.rows.map(function (r) { return r.pts; }));
          bxBody.appendChild(dataTable(['Player', 'PTS', 'REB', 'AST', 'FG'], t.rows.map(function (r) { return { cls: r.pts === top ? 'me' : '', cells: [r.name, r.pts, r.reb, r.ast, r.fg] }; })));
        }
        bx.appendChild(seg(ev.boxFull.map(function (t) { return t.city; }), showBox));
        bx.appendChild(bxBody);
        showBox(0);
        pages.push({ title: 'Box score', node: bx });
      }
      // 4. around the league, with the key names and numbers picked out
      if (ev.scores && ev.scores.length) {
        var lg = wrap([]); lg.classList.add('lgp');
        ev.scores.forEach(function (g) {
          var r = el('div', 'lg-row');
          var l = el('span', 'lg-g');
          var wn = el('b', 'lg-w', g.w); wn.style.color = tcol(g.wid);
          l.appendChild(wn);
          l.appendChild(el('b', 'lg-n', ' ' + g.ws));
          l.appendChild(el('span', 'lg-l', ', ' + g.l + ' ' + g.ls));
          r.appendChild(l);
          if (g.topName) {
            var tp = el('span', 'lg-t');
            var tn = el('i', null, g.topName); tn.style.color = tcol(g.topTid);
            tp.appendChild(tn);
            tp.appendChild(el('b', null, ' ' + g.topPts));
            r.appendChild(tp);
          }
          lg.appendChild(r);
        });
        pages.push({ title: 'Around the league', node: lg });
      }
      // 5. breaking: every entry carries a club logo or a player photo
      var bk = [];
      (ev.briefs || []).slice(0, 4).forEach(function (b) { bk.push({ h: b.h, t: b.t, tid: b.tid, pid: b.pid, inj: false }); });
      (ev.injuries || []).forEach(function (t, i) { var ids = (ev.injIds || [])[i] || {}; if (bk.length < 6) bk.push({ h: 'Injury', t: t, tid: ids.tid, pid: ids.pid, inj: true }); });
      if (bk.length) {
        var bp = wrap([]); bp.classList.add('bkp');
        bk.forEach(function (b) {
          var r = el('div', 'bk-row' + (b.inj ? ' inj' : ''));
          var ic;
          if (b.pid) ic = makeAvatar({ id: b.pid, name: b.t });
          else if (b.tid) ic = sm(b.tid);
          else ic = el('span', 'bk-dot');
          ic.classList.add('bk-ic');
          r.appendChild(ic);
          var tx = el('div', 'bk-tx');
          var hh = el('b', null, b.h); if (b.tid && !b.inj) hh.style.color = tcol(b.tid);
          tx.appendChild(hh);
          tx.appendChild(el('span', null, b.t));
          r.appendChild(tx);
          bp.appendChild(r);
        });
        pages.push({ title: 'Breaking', node: bp });
      }
      // 6. standings: our conference in full, tap to see the other
      var groups = ev.tableFull || [];
      if (groups.length) {
        var sp = wrap([]); sp.classList.add('stp');
        var sBody = el('div', 'st-body');
        var gname = function (d) { return d.replace(/ern$/, '').replace(/ Division$/, ''); };
        function showSt(i) {
          var gr = groups[i]; sBody.textContent = '';
          gr.rows.forEach(function (r, k) {
            var row = el('div', 'st-row' + (r.me ? ' me' : ''));
            row.appendChild(el('span', 'st-k', String(k + 1)));
            row.appendChild(sm(r.id));
            row.appendChild(el('span', 'st-c', r.city));
            row.appendChild(el('span', 'st-w', r.w + '-' + r.l));
            row.appendChild(el('span', 'st-gb', k === 0 || !r.gb ? '–' : String(r.gb)));
            sBody.appendChild(row);
          });
        }
        sp.appendChild(seg(groups.map(function (g) { return gname(g.div); }), showSt));
        sp.appendChild(sBody);
        showSt(0);
        pages.push({ title: 'Standings', node: sp });
      }
      var rail = hubRail(pages);
      rail.classList.add('recap');
      var site = el('div', 'site');
      var sbar = el('div', 'site-bar');
      sbar.appendChild(el('span', 'site-lock', '\u25CF'));
      sbar.appendChild(el('span', 'site-url', 'courtside.com/recap/' + (ev.slug || 'game')));
      site.appendChild(sbar);
      var snav = el('div', 'site-nav'), strack = rail.querySelector('.hrail-track');
      pages.forEach(function (pg, i) {
        var tb = el('button', i === 0 ? 'on' : '', pg.title || 'Recap'); tb.type = 'button';
        tb.addEventListener('click', function () { strack.scrollTo({ left: i * (strack.firstChild.offsetWidth + 10), behavior: 'smooth' }); });
        snav.appendChild(tb);
      });
      strack.addEventListener('scroll', function () {
        var i = Math.round(strack.scrollLeft / (strack.firstChild.offsetWidth + 10));
        Array.prototype.forEach.call(snav.children, function (b, k) { b.classList.toggle('on', k === i); if (k === i) b.scrollIntoView({ inline: 'center', block: 'nearest' }); });
      });
      site.appendChild(snav);
      site.appendChild(rail);
      return site;
    }
    return pg;
  }

  /* The present day: every item arrives as something on the phone. */
  function handleOf(name) { return '@' + String(name || 'fan').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 16) + (name && name.length % 7 > 3 ? '' : String(10 + (String(name).length * 7) % 89)); }
  function phoneHead(card, app, color, glyph, who, sub) {
    var h = el('div', 'ph-head');
    var ic = el('span', 'ph-ic', glyph); ic.style.background = color;
    h.appendChild(ic);
    var w = el('div', 'ph-who');
    w.appendChild(el('b', null, who));
    w.appendChild(el('small', null, app + (sub ? ' \u00B7 ' + sub : '') + ' \u00B7 now'));
    h.appendChild(w);
    card.appendChild(h);
  }
  function engage(card, seed) {
    var n = 40 + (seed * 37) % 900;
    var row = el('div', 'ph-eng');
    row.appendChild(el('span', null, '\u21BB ' + Math.round(n * 0.4)));
    row.appendChild(el('span', null, '\u2661 ' + n));
    row.appendChild(el('span', null, '\u2197'));
    card.appendChild(row);
  }
  function phoneEvent(card, ev) {
    card.classList.add('ph');
    var seed = String(ev.text || ev.head || '').length;
    if (ev.kind === 'news') {
      phoneHead(card, 'Hoops', '#1D9BF0', 'H', ev.source.replace(/^The /, ''), handleOf(ev.source));
      card.appendChild(el('p', 'ph-text', ev.head));
      card.appendChild(el('p', 'ph-sub', ev.sub));
      engage(card, seed);
    } else if (ev.kind === 'radio') {
      phoneHead(card, 'Clips', '#8E3AF0', '\u25B6', 'Broadcast clip', '@' + 'gamenight');
      var clip = el('div', 'ph-clip');
      clip.appendChild(el('span', 'ph-play', '\u25B6'));
      clip.appendChild(el('span', 'ph-cap', '\u201C' + ev.text + '\u201D'));
      card.appendChild(clip);
      engage(card, seed);
    } else if (ev.kind === 'fans') {
      phoneHead(card, 'Mentions', '#F4511E', '@', ev.name, handleOf(ev.name));
      card.appendChild(el('p', 'ph-text', ev.text));
      engage(card, seed);
    } else if (ev.kind === 'rumour') {
      phoneHead(card, 'Breaking', '#D8232A', '!', 'League Insider', '@leagueinsider');
      card.appendChild(el('p', 'ph-text', ev.text));
      engage(card, seed + 5);
    } else {
      var pl = ev.pid ? rosterOf(save.myId).filter(function (p) { return p.id === ev.pid; })[0] : null;
      var who = ev.pid ? ev.who : ev.coach ? 'Coach' : 'Group chat';
      if (ev.cslug) {
        var hch = el('div', 'ph-head');
        hch.appendChild(makeAvatar({ id: ev.cslug, name: ev.who }));
        var hw = el('div', 'ph-who');
        hw.appendChild(el('b', null, 'Coach ' + lastName(ev.who)));
        hw.appendChild(el('small', null, 'Messages \u00B7 Head coach \u00B7 now'));
        hch.appendChild(hw);
        card.appendChild(hch);
      } else if (pl) {
        var h = el('div', 'ph-head');
        h.appendChild(makeAvatar(pl));
        var w = el('div', 'ph-who');
        w.appendChild(el('b', null, ev.who));
        w.appendChild(el('small', null, 'Messages \u00B7 ' + (pl.pos ? pl.pos + ' \u00B7 ' : '') + 'ovr ' + pl.ratings.ovr + ' \u00B7 now'));
        h.appendChild(w);
        card.appendChild(h);
      } else {
        phoneHead(card, 'Messages', ev.coach ? '#34C759' : '#5E5CE6', ev.coach ? 'C' : '\u2605', who, '');
      }
      var b = el('p', 'ph-bubble', ev.text.replace(/^Coach: \u201C?"?/, '').replace(/"$/, ''));
      card.appendChild(b);
    }
  }

  function renderEvent(ev) {
    var bodyEl = document.getElementById('ev-body');
    var dock = document.getElementById('ev-dock');
    bodyEl.textContent = '';
    dock.textContent = '';
    document.getElementById('ev-title').textContent = modernUI() ? 'Notifications' : 'Today';
    document.getElementById('ev-sub').textContent = Events.dateFor(save) + ' · ' + save.pending.length + (modernUI() ? (save.pending.length === 1 ? ' unread' : ' unread') : (save.pending.length === 1 ? ' item' : ' items') + ' left');
    var card = el('div', 'ev ev-' + ev.kind);
    if (ev.kind === 'paper') {
      card = renderPaper(ev);
    } else if (modernUI() && ev.kind !== 'talk') {
      phoneEvent(card, ev);
    } else if (ev.kind === 'news') {
      card.appendChild(el('div', 'kicker', ev.source));
      card.appendChild(el('h3', 'head', ev.head));
      card.appendChild(el('p', 'dateline', ev.dateline + ' \u2014 ' + ev.sub));
    } else if (ev.kind === 'radio') {
      card.appendChild(el('div', 'kicker', 'On the radio'));
      var row = el('div', 'radio');
      var icon = el('span'); icon.innerHTML = RADIO_SVG;
      row.appendChild(icon.firstChild);
      var bubble = el('div', 'bubble');
      bubble.appendChild(el('span', 'buzz', '\u201C' + ev.text + '\u201D'));
      row.appendChild(bubble);
      card.appendChild(row);
      card.appendChild(el('p', 'sig', '\u2014 ' + ev.source));
    } else if (ev.kind === 'fans') {
      card.appendChild(el('div', 'kicker', 'Letters to the editor'));
      card.appendChild(el('p', 'letter', '\u201C' + ev.text + '\u201D'));
      card.appendChild(el('p', 'sig', '\u2014 ' + ev.name));
    } else if (ev.kind === 'rumour') {
      card.appendChild(el('div', 'kicker', 'Telegram'));
      card.appendChild(el('p', 'telegram', ev.text));
    } else if (ev.kind === 'talk' && modernUI()) {
      phoneEvent(card, ev);
    } else if (ev.kind === 'talk') {
      card.appendChild(el('div', 'kicker', ev.pid ? 'A word, boss?' : ev.coach ? 'The coach' : 'The clubhouse'));
      if (ev.pid) {
        var who = el('div', 'talk');
        var pl = rosterOf(save.myId).filter(function (p) { return p.id === ev.pid; })[0];
        who.appendChild(makeAvatar(pl));
        var nm = el('span'); nm.appendChild(el('strong', null, ev.who));
        nm.appendChild(el('span', 'meta', (pl.pos ? pl.pos + ' \u00B7 ' : '') + 'ovr ' + pl.ratings.ovr));
        who.appendChild(nm);
        card.appendChild(who);
      }
      card.appendChild(el('p', 'quote', ev.text));
    }
    bodyEl.appendChild(card);
    var mine = rosterOf(save.myId);
    if (ev.choices) {
      ev.choices.forEach(function (c, i) {
        var b = el('button', 'btn wide' + (i === 0 ? ' primary' : ''), c.label);
        b.type = 'button';
        b.addEventListener('click', function () {
          var note = Events.apply(save, ev, i, mine);
          rosterCache = {};
          persist();
          dock.textContent = '';
          bodyEl.appendChild(el('p', 'note', note));
          var nb = el('button', 'btn primary wide', 'Continue');
          nb.type = 'button';
          nb.addEventListener('click', nextEvent);
          dock.appendChild(nb);
        });
        dock.appendChild(b);
      });
    } else {
      var nb = el('button', 'btn primary wide', save.pending.length > 1 ? 'Next' : 'Back to the season');
      nb.type = 'button';
      nb.addEventListener('click', nextEvent);
      dock.appendChild(nb);
    }
  }



  /* ---------- trades ---------- */
  var trade = null;

  function tradeWindow() {
    if (save.phase === 'playoffs' || save.phase === 'done' && !save.off) return 'The league is closed to trades during the playoffs.';
    if (save.phase === 'regular' && save.day > save.days.length * 0.75) return 'The trade deadline has passed.';
    return '';
  }

  function openTrade(returnTo) {
    var closed = tradeWindow();
    if (!save.lg.picks) League.ensurePicks(save, save.ids.map(teamById));
    trade = { back: returnTo, partner: null, give: {}, get: {}, msg: '', tab: 'send', view: '' };
    document.getElementById('trade-back').onclick = function () {
      if (trade.view === 'shopRes') { trade.view = 'shopPick'; renderTrade(); return; }
      if (trade.view === 'shopPick') { trade.view = ''; trade.give = {}; renderTrade(); return; }
      if (trade.view === 'pkgRes') { trade.view = ''; renderTrade(); return; }
      if (trade.partner) { trade.partner = null; renderTrade(); return; }
      if (trade.back === 'off') { renderOff(); show('screen-off'); } else { renderSeason(); show('screen-season'); }
    };
    if (closed) trade.closed = closed;
    renderTrade();
    show('screen-trade');
  }

  function tradeRow(p, selected, onTap) {
    var row = personRow(p, [(p.pos || '') + ' · ' + p.age + ' · ' + money(p.salary) + ' · ' + (p.yrs <= 0 ? 'exp.' : p.yrs + 'y') + ' · pot ' + p.pot], el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr)));
    row.classList.add('pickable');
    row.style.cursor = 'pointer';
    if (selected) row.classList.add('selected');
    row.addEventListener('click', onTap);
    return row;
  }

  function pickRow(k, teams, selected, onTap) {
    var row = el('button', 'card pickable pickchip' + (selected ? ' selected' : ''));
    row.type = 'button';
    var tx = el('span');
    tx.appendChild(el('strong', null, League.pickLabel(k, teams)));
    tx.appendChild(starsEl(League.starsVal(save, League.pickValue(save, k))));
    tx.appendChild(el('span', 'meta', (k.r === 1 ? '1st round' : '2nd round') + ' \u00B7 worth ~' + Math.round(League.pickValue(save, k))));
    row.appendChild(tx);
    row.addEventListener('click', onTap);
    return row;
  }

  function tradeMax() { return save.phase === 'done' ? 18 : 15; }

  function renderTrade() {
    var body = document.getElementById('trade-body'), dock = document.getElementById('trade-dock');
    body.textContent = '';
    dock.textContent = '';
    var me = teamById(save.myId);
    document.getElementById('trade-title').textContent = trade.partner ? 'Trade with ' + teamById(trade.partner).city : 'Trades';
    document.getElementById('trade-sub').textContent = 'Your payroll ' + money(League.payroll(save, me.id)) + ' of ' + money(save.lg.cap);
    if (trade.closed) {
      body.appendChild(el('p', 'note', trade.closed));
      return;
    }
    if (trade.view === 'shopPick' || trade.view === 'shopRes' || trade.view === 'pkgRes') { renderFinder(body, dock, me); return; }
    if (!trade.partner) {
      var shopBtn = el('button', 'btn primary wide', 'Shop my players and picks');
      shopBtn.type = 'button';
      shopBtn.addEventListener('click', function () { trade.view = 'shopPick'; trade.give = {}; trade.msg = ''; renderTrade(); });
      body.appendChild(shopBtn);
      if (trade.msg) { body.appendChild(el('p', 'dec-title', trade.msg)); trade.msg = ''; }
      body.appendChild(el('p', 'sub how', 'Pick a club to trade with.'));
      save.ids.filter(function (id) { return id !== me.id; }).forEach(function (id) {
        var t = teamById(id), pl = League.rosterOf(save, id);
        var top = pl.map(function (p) { return p.ratings.ovr; }).sort(function (a, b) { return b - a; }).slice(0, 8);
        var avg = top.length ? Math.round(top.reduce(function (a, b) { return a + b; }, 0) / top.length) : 0;
        var c = el('button', 'card');
        c.type = 'button';
        c.appendChild(teamBadge(t));
        var tx = el('span');
        tx.appendChild(el('strong', null, t.city + ' ' + t.name));
        tx.appendChild(el('span', 'meta', ({ win: 'Contending', rebuild: 'Rebuilding', mid: 'In the middle' })[League.clubMode(save, id)] + ' · ' + pl.length + ' players · rating ' + avg + ' · payroll ' + money(League.payroll(save, id))));
        c.appendChild(tx);
        c.addEventListener('click', function () { trade.partner = id; trade.give = {}; trade.get = {}; trade.msg = ''; trade.tab = 'send'; renderTrade(); });
        body.appendChild(c);
      });
      return;
    }
    var mine = League.rosterOf(save, me.id).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    var theirs = League.rosterOf(save, trade.partner).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    function chosen(list, map) { return list.filter(function (p) { return map[p.id]; }); }
    var give = chosen(mine, trade.give), get = chosen(theirs, trade.get);
    var allT = save.ids.map(teamById);
    var myK = League.picksOf(save, me.id), theirK = League.picksOf(save, trade.partner);
    var giveK = myK.filter(function (k) { return trade.give[League.pickId(k)]; }), getK = theirK.filter(function (k) { return trade.get[League.pickId(k)]; });
    var ex = { gain: giveK.reduce(function (s, k) { return s + League.pickValue(save, k); }, 0), loss: getK.reduce(function (s, k) { return s + League.pickValue(save, k); }, 0), gainL: giveK.map(function (k) { return League.pickValue(save, k); }), lossL: getK.map(function (k) { return League.pickValue(save, k); }), n: giveK.length + getK.length };
    var res = League.evaluateTrade(save, me.id, trade.partner, give, get, tradeMax(), ex);
    var pct = Math.max(0, Math.min(100, Math.round((give.length || get.length || ex.n ? res.ratio / 1.1 : 0) * 100)));
    var sendN = give.length + giveK.length, getN = get.length + getK.length;
    var tabs = el('div', 'ttabs');
    [['send', 'You send' + (sendN ? ' (' + sendN + ')' : '')], ['get', 'You get' + (getN ? ' (' + getN + ')' : '')]].forEach(function (t) {
      var bt = el('button', trade.tab === t[0] ? 'on' : '', t[1]);
      bt.type = 'button';
      bt.addEventListener('click', function () { trade.tab = t[0]; renderTrade(); });
      tabs.appendChild(bt);
    });
    body.appendChild(tabs);
    var meterRow = el('div', 'tmeter');
    meterRow.appendChild(el('span', null, 'Their interest'));
    var bar = el('div', 'tbar'), fill = el('i');
    fill.style.width = Math.min(100, pct) + '%';
    bar.appendChild(fill);
    meterRow.appendChild(bar);
    body.appendChild(meterRow);
    if (give.length || get.length) {
      var after = mine.filter(function (p) { return !trade.give[p.id]; }).concat(get);
      var r0 = Math.round(strengthOf(mine)), r1 = Math.round(strengthOf(after)), o0 = titleOdds(me.id), o1 = titleOdds(me.id, after);
      var dl = el('p', 'tdelta');
      dl.appendChild(el('span', null, 'Rating ' + r0 + ' \u2192 '));
      dl.appendChild(el('b', r1 > r0 ? 'up' : r1 < r0 ? 'dn' : '', String(r1)));
      dl.appendChild(el('span', null, ' · Title ' + pctText(o0) + ' \u2192 '));
      dl.appendChild(el('b', o1 > o0 ? 'up' : o1 < o0 ? 'dn' : '', pctText(o1)));
      dock.appendChild(dl);
    }
    dock.appendChild(el('p', res.ok && !trade.msg ? 'dec-title tmsg' : 'note tmsg', trade.msg || (give.length || get.length || ex.n ? res.reason : 'Tap players on both tabs to build a deal.')));
    var list = el('div', 'tlist');
    function toggle(map, id) { if (map[id]) delete map[id]; else map[id] = 1; trade.msg = ''; renderTrade(); }
    var isSend = trade.tab !== 'get', plist = isSend ? mine : theirs, kl = isSend ? myK : theirK, map = isSend ? trade.give : trade.get;
    plist.forEach(function (p) { list.appendChild(tradeRow(p, !!map[p.id], function () { toggle(map, p.id); })); });
    if (kl.length) {
      list.appendChild(el('h3', 'box-title', 'Draft picks'));
      var chips = el('div', 'tpicks');
      kl.forEach(function (k) { chips.appendChild(pickRow(k, allT, !!map[League.pickId(k)], function () { toggle(map, League.pickId(k)); })); });
      list.appendChild(chips);
    }
    body.appendChild(list);
    var btnRow = el('div', 'dock-row');
    var send = el('button', 'btn primary', 'Propose trade');
    send.type = 'button';
    send.disabled = !give.length && !get.length && !ex.n;
    send.addEventListener('click', function () {
      var r = League.evaluateTrade(save, me.id, trade.partner, give, get, tradeMax(), ex);
      if (!r.ok) { trade.msg = r.reason; renderTrade(); return; }
      var line = commitTrade(trade.partner, give, get, giveK, getK);
      trade.give = {}; trade.get = {};
      trade.msg = 'Deal done. ' + line.replace('Trade: ', '');
      renderTrade();
    });
    btnRow.appendChild(send);
    var ask = el('button', 'btn', 'What would it take?');
    ask.type = 'button';
    ask.addEventListener('click', function () {
      if (!give.length && !get.length && !ex.n) return;
      if (res.ok) { trade.msg = 'The deal already works for them.'; renderTrade(); return; }
      var add = League.suggestAdd(save, me.id, trade.partner, give, get, tradeMax(), ex);
      if (add) { trade.msg = 'They would do it if you add ' + add.map(function (p) { return p.name + ' (' + p.ratings.ovr + ' overall, ' + money(p.salary) + ')'; }).join(' and ') + '.'; }
      else { trade.msg = 'Nothing on your roster would make this work. Ask for less.'; }
      renderTrade();
    });
    btnRow.appendChild(ask);
    var pk = el('button', 'btn', 'Find packages');
    pk.type = 'button';
    pk.disabled = !get.length && !getK.length;
    pk.addEventListener('click', function () { trade.view = 'pkgRes'; trade.want = { p: get, k: getK }; renderTrade(); });
    btnRow.appendChild(pk);
    dock.appendChild(btnRow);
  }


  /* Carries out a legal deal: moves the assets, resets morale, tells the feed. Returns the headline. */
  function commitTrade(partnerId, give, get, giveK, getK) {
    var me = teamById(save.myId), them = teamById(partnerId);
    League.executeTrade(save, me.id, partnerId, give, get, giveK, getK);
    give.concat(get).forEach(function (p) { var x = Events.pm(save, p.id); x.m = 55; x.t = 45; });
    var names = function (pl, pk) { return pl.map(function (p) { return lastName(p.name); }).concat(pk.map(function (k) { return k.y + ' R' + k.r + ' pick'; })).join(', '); };
    var line = 'Trade: ' + me.city + ' send ' + (names(give, giveK) || 'nobody') + ' to ' + them.city + ' for ' + (names(get, getK) || 'nothing');
    var mo = Events.mood(save);
    if (Social.has(save.year)) Social.react(save, 'trade', { text: line.replace(/^Trade: /, '') + '.' });
    mo.news.push({ text: line, date: Events.dateFor(save) });
    if (mo.news.length > 12) mo.news.shift();
    rosterCache = {};
    persist();
    return line;
  }

  function assetBlock(title, players, picks) {
    var box = el('div', 'tf-side');
    box.appendChild(el('small', null, title));
    var allT = save.ids.map(teamById);
    players.forEach(function (p) {
      var r = el('div', 'tf-row');
      r.appendChild(makeAvatar(p));
      var tx = el('span', 'tf-tx');
      tx.appendChild(el('b', null, p.name));
      tx.appendChild(el('small', null, (p.pos || '') + ' · ' + p.age + ' · ' + money(p.salary) + ' · ' + (p.yrs <= 0 ? 'exp.' : p.yrs + 'y')));
      r.appendChild(tx);
      r.appendChild(el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr)));
      box.appendChild(r);
    });
    picks.forEach(function (k) {
      var r = el('div', 'tf-row pk');
      r.appendChild(el('span', 'tf-pk', 'R' + k.r));
      var tx = el('span', 'tf-tx');
      tx.appendChild(el('b', null, League.pickLabel(k, allT)));
      tx.appendChild(el('small', null, 'worth ~' + Math.round(League.pickValue(save, k))));
      r.appendChild(tx);
      box.appendChild(r);
    });
    return box;
  }

  function renderFinder(body, dock, me) {
    var mine = League.rosterOf(save, me.id).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    var myK = League.picksOf(save, me.id), allT = save.ids.map(teamById);
    var cap = save.lg.cap;
    function accept(partner, give, get, giveK, getK, btn) {
      var ex = { gain: giveK.reduce(function (s, k) { return s + League.pickValue(save, k); }, 0), loss: getK.reduce(function (s, k) { return s + League.pickValue(save, k); }, 0), gainL: giveK.map(function (k) { return League.pickValue(save, k); }), lossL: getK.map(function (k) { return League.pickValue(save, k); }), n: giveK.length + getK.length };
      var r = League.evaluateTrade(save, me.id, partner, give, get, tradeMax(), ex);
      if (!r.ok) { trade.msg = r.reason; trade.view = trade.view === 'pkgRes' ? 'pkgRes' : 'shopPick'; renderTrade(); return; }
      var line = commitTrade(partner, give, get, giveK, getK);
      trade.give = {}; trade.get = {}; trade.view = ''; trade.partner = null;
      trade.msg = 'Deal done. ' + line.replace('Trade: ', '');
      renderTrade();
    }
    function adjustBtn(partner, give, get, giveK, getK) {
      var b = el('button', 'btn tf-adj', 'Adjust the deal'); b.type = 'button';
      b.addEventListener('click', function () {
        trade.partner = partner; trade.view = ''; trade.give = {}; trade.get = {}; trade.msg = ''; trade.tab = 'send';
        give.forEach(function (p) { trade.give[p.id] = 1; }); giveK.forEach(function (k) { trade.give[League.pickId(k)] = 1; });
        get.forEach(function (p) { trade.get[p.id] = 1; }); getK.forEach(function (k) { trade.get[League.pickId(k)] = 1; });
        renderTrade();
      });
      return b;
    }
    function payAfter(give, get, giveK) {
      var d = get.reduce(function (s, p) { return s + p.salary; }, 0) - give.reduce(function (s, p) { return s + p.salary; }, 0);
      return League.payroll(save, me.id) + d;
    }
    if (trade.view === 'shopPick') {
      document.getElementById('trade-title').textContent = 'Shop';
      var list = el('div', 'tlist');
      mine.forEach(function (p) { list.appendChild(tradeRow(p, !!trade.give[p.id], function () { if (trade.give[p.id]) delete trade.give[p.id]; else trade.give[p.id] = 1; renderTrade(); })); });
      if (myK.length) {
        list.appendChild(el('h3', 'box-title', 'Draft picks'));
        var chips = el('div', 'tpicks');
        myK.forEach(function (k) { chips.appendChild(pickRow(k, allT, !!trade.give[League.pickId(k)], function () { var id = League.pickId(k); if (trade.give[id]) delete trade.give[id]; else trade.give[id] = 1; renderTrade(); })); });
        list.appendChild(chips);
      }
      body.appendChild(list);
      var n = Object.keys(trade.give).length;
      if (trade.msg) dock.appendChild(el('p', 'note tmsg', trade.msg));
      var go = el('button', 'btn primary wide', n ? 'Find offers (' + n + ')' : 'Find offers');
      go.type = 'button'; go.disabled = !n;
      go.addEventListener('click', function () { trade.msg = ''; trade.view = 'shopRes'; renderTrade(); });
      dock.appendChild(go);
      return;
    }
    if (trade.view === 'shopRes') {
      document.getElementById('trade-title').textContent = 'Offers';
      var give = mine.filter(function (p) { return trade.give[p.id]; }), giveK = myK.filter(function (k) { return trade.give[League.pickId(k)]; });
      var offers = League.findOffers(save, me.id, give, giveK, tradeMax());
      var list2 = el('div', 'tlist');
      if (!offers.length) list2.appendChild(el('p', 'note', 'No club has anything that works for that. Try adding more.'));
      offers.forEach(function (o) {
        var t = teamById(o.tid), card = el('div', 'tf-offer');
        var hd = el('div', 'tf-head');
        hd.appendChild(teamBadge(t));
        var ht = el('span', 'tf-tx');
        ht.appendChild(el('b', null, t.city + ' ' + t.name));
        ht.appendChild(el('small', null, ({ win: 'Contending', rebuild: 'Rebuilding', mid: 'In the middle' })[League.clubMode(save, o.tid)]));
        hd.appendChild(ht);
        var ab = el('button', 'btn primary', 'Accept'); ab.type = 'button';
        ab.addEventListener('click', function () { accept(o.tid, o.give, o.get, o.giveK, o.getK, ab); });
        hd.appendChild(ab);
        card.appendChild(hd);
        card.appendChild(assetBlock('You send', o.give, o.giveK));
        card.appendChild(assetBlock('You get', o.get, o.getK));
        card.appendChild(adjustBtn(o.tid, o.give, o.get, o.giveK, o.getK));
        card.appendChild(el('small', 'tf-pay', 'Your payroll after ' + money(payAfter(o.give, o.get)) + (payAfter(o.give, o.get) > cap ? ' · over the cap' : '')));
        list2.appendChild(card);
      });
      body.appendChild(list2);
      return;
    }
    // packages for the players and picks I asked for
    var t2 = teamById(trade.partner), want = trade.want || { p: [], k: [] };
    document.getElementById('trade-title').textContent = 'Packages from ' + t2.city;
    var pk = League.findPackages(save, me.id, trade.partner, want.p, want.k, tradeMax(), 3);
    var list3 = el('div', 'tlist');
    if (!pk.length) list3.appendChild(el('p', 'note', 'They would not do that for anything you can send within the roster and cap rules.'));
    pk.forEach(function (o, i) {
      var card = el('div', 'tf-offer');
      var hd = el('div', 'tf-head');
      var ht = el('span', 'tf-tx');
      ht.appendChild(el('b', null, 'Offer ' + (i + 1)));
      ht.appendChild(el('small', null, 'Payroll after ' + money(payAfter(o.give, o.get))));
      hd.appendChild(ht);
      var ab = el('button', 'btn primary', 'Accept'); ab.type = 'button';
      ab.addEventListener('click', function () { accept(trade.partner, o.give, o.get, o.giveK, o.getK, ab); });
      hd.appendChild(ab);
      card.appendChild(hd);
      card.appendChild(assetBlock('You send', o.give, o.giveK));
      card.appendChild(assetBlock('You get', o.get, o.getK));
      card.appendChild(adjustBtn(trade.partner, o.give, o.get, o.giveK, o.getK));
      list3.appendChild(card);
    });
    body.appendChild(list3);
  }

  /* ---------- off-season ---------- */
  var offSel = null;

  function valueOf(p) {
    var st = save.lg.stats[p.id], rc = p.team ? save.rec[p.team] : null;
    var wp = rc ? rc.w / Math.max(1, rc.w + rc.l) : 0.4;
    return (st.pts + 1.5 * st.ast + 0.7 * st.trb) / st.g * (0.7 + 0.6 * wp);
  }
  function titleLeader() {
    var best = null;
    Object.keys(save.lg.stats).forEach(function (id) {
      var p = League.byId(save, id), x = save.lg.stats[id];
      if (p && (!best || x.pts > best.pts)) best = { name: p.name, pts: x.pts };
    });
    return best;
  }
  function allLeague() {
    var list = League.leaders(save, 'pts', 60, Math.round(save.days.length * 0.4)).map(function (r) { return { p: r.p, v: valueOf(r.p) }; });
    list.sort(function (a, b) { return b.v - a.v; });
    list = list.slice(0, 10).map(function (x) { return { id: x.p.id, name: x.p.name, team: x.p.team }; });
    return { first: list.slice(0, 5), second: list.slice(5, 10) };
  }

  function startOffseason(silent) {
    var me = teamById(save.myId);
    var best = null;
    League.leaders(save, 'pts', 20, 15).forEach(function (r) {
      var st = save.lg.stats[r.p.id], rc = r.p.team ? save.rec[r.p.team] : null;
      var wp = rc ? rc.w / Math.max(1, rc.w + rc.l) : 0.4;
      var v = (st.pts + 1.5 * st.ast + 0.7 * st.trb) / st.g * (0.7 + 0.6 * wp);
      if (!best || v > best.v) best = { p: r.p, v: v };
    });
    var review = {
      champion: save.champion, rec: save.rec[me.id].w + '-' + save.rec[me.id].l,
      pts: League.leaders(save, 'pts', 3, 15).map(function (r) { return { id: r.p.id, name: r.p.name, v: r.v.toFixed(1) }; }),
      ast: League.leaders(save, 'ast', 3, 15).map(function (r) { return { id: r.p.id, name: r.p.name, v: r.v.toFixed(1) }; }),
      mvp: best ? { id: best.p.id, name: best.p.name } : null,
      title: titleLeader(), allLeague: allLeague(), recap: buildRecap(), owner: judgeOwner()
    };
    save.lg.history.push({ year: save.year, champion: save.champion, rec: review.rec, mvp: review.mvp ? review.mvp.name : null, me: save.myId, po: madePlayoffs() });
    (function () {
      function award(id, name) { var q = League.byId(save, id); if (q) (q.awards || (q.awards = [])).push({ y: save.year, a: name }); }
      if (review.mvp) award(review.mvp.id, 'Most Valuable Player');
      if (review.pts[0]) award(review.pts[0].id, 'Scoring champion');
      if (review.ast[0]) award(review.ast[0].id, 'Assists leader');
      review.allLeague.first.forEach(function (x) { award(x.id, 'All-League First Team'); });
      review.allLeague.second.forEach(function (x) { award(x.id, 'All-League Second Team'); });
      if (save.champion) save.lg.players.forEach(function (q) {
        var x = save.lg.stats[q.id];
        if (q.status === 'active' && q.team === save.champion && x && x.g) award(q.id, 'League champion');
      });
    })();
    League.noteSeason(save);
    Object.keys(save.lg.stats).forEach(function (id) {
      var x = save.lg.stats[id], p = League.byId(save, id);
      if (!p || !x.g) return;
      var c = { y: save.year, t: p.team || null };
      ['g', 'min', 'pts', 'ast', 'trb', 'stl', 'blk', 'tov', 'pf', 'fg', 'fga', 'ft', 'fta'].forEach(function (k) { c[k] = x[k] || 0; });
      (p.career || (p.career = [])).push(c);
    });
    var rep = League.progress(save, me.id);
    League.newSeasonContracts(save);
    Coach.offseason(save, me.id, save.rec);
    save.off = {
      step: 'review', review: review, leagueRetired: rep.leagueRetired,
      dev: rep.mine.map(function (x) { return { id: x.p.id, name: x.p.name, from: x.from, to: x.to, age: x.p.age }; }),
      retired: rep.retired.map(function (x) { return { id: x.p.id, name: x.p.name, ovr: x.ovr }; })
    };
    var hist = History.get(save.year).filter(function (d) {
      if (d.join.length || d.fold.length || Object.keys(d.move || {}).length) return true;
      return Object.keys(d.rename || {}).some(function (k) { return !!clubBySlug(k); });
    });
    if (hist.length) save.off.fates = hist.map(function (d) { return { id: d.id, choice: 'history', res: {}, applied: false }; });
    rosterCache = {};
    if (silent) return;
    persist();
    openOff();
  }

  function openOff() { renderOff(); show('screen-off'); }
  function offStep(step) { save.off.step = step; persist(); renderOff(); show('screen-off'); }

  function offHeader(title, sub) {
    document.getElementById('off-title').textContent = title;
    document.getElementById('off-sub').textContent = sub || '';
  }

  function offDock(label, fn, disabled) {
    var dock = document.getElementById('off-dock');
    dock.textContent = '';
    var b = el('button', 'btn primary wide', label);
    b.type = 'button';
    b.disabled = !!disabled;
    b.addEventListener('click', fn);
    dock.appendChild(b);
    return dock;
  }

  function starsEl(v) {
    var w = el('span', 'stars');
    w.title = v + ' of 5';
    for (var i = 1; i <= 5; i++) w.appendChild(el('i', v >= i ? 'f' : v >= i - 0.5 ? 'h' : '', '\u2605'));
    return w;
  }
  function personRow(p, metaLines, right) {
    var row = el('div', 'card');
    row.appendChild(makeAvatar(p));
    var tx = el('span');
    tx.appendChild(el('strong', null, p.name));
    if (p.ratings && p.status === 'active') tx.appendChild(starsEl(League.starsOf(save, p)));
    if (p.status === 'active' && isRookie(p)) tx.appendChild(el('em', 'rk-tag', 'R'));
    metaLines.forEach(function (m) { tx.appendChild(el('span', 'meta', m)); });
    row.appendChild(tx);
    if (right) row.appendChild(right);
    return row;
  }

  function hgtText(p) { return p.hgt ? Math.floor(p.hgt / 12) + '\'' + (p.hgt % 12) + '"' : ''; }

  function renderOff() {
    var body = document.getElementById('off-body');
    body.textContent = '';
    document.getElementById('off-dock').textContent = '';
    var step = save.off.step, me = teamById(save.myId);
    if (step === 'review') return offReview(body, me);
    if (step === 'dev') return offDev(body, me);
    if (step === 'fates') return offFates(body, me);
    if (step === 'newclub') return offNewClub(body, me);
    if (step === 'contracts') return offContracts(body, me);
    if (step === 'draft' || step === 'dispersal') return offDraft(body, me);
    if (step === 'fa') return offFA(body, me);
    return offReady(body, me);
  }

  function ordinalN(n) { return n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'); }

  function offReview(body, me) {
    var r = save.off.review, champ = teamById(r.champion);
    offHeader(seasonLabel(save.year) + ' review', 'Off-season · step 1 of 5');
    var card = el('div', 'stat-card');
    card.appendChild(el('div', 'group-title', 'Champions'));
    var row = el('div', 'row');
    row.appendChild(teamBadge(champ));
    row.appendChild(el('strong', null, champ.city + ' ' + champ.name));
    card.appendChild(row);
    card.appendChild(el('p', 'sub', 'Your record: ' + r.rec + (r.champion === me.id ? ' · you won the title' : '')));
    body.appendChild(card);
    if (r.recap) {
      var rc = r.recap, sc = el('div', 'stat-card');
      sc.appendChild(el('div', 'group-title', 'Your season'));
      sc.appendChild(el('p', 'sub', ordinalN(rc.pos) + ' in the ' + divTitle(rc.div) + ' \u00B7 ' + rc.po));
      if (rc.best) sc.appendChild(el('p', 'sub', 'Best win: ' + rc.best.us + '-' + rc.best.them + ' over ' + teamById(rc.best.opp).city));
      if (rc.worst && rc.worst.us < rc.worst.them) sc.appendChild(el('p', 'sub', 'Worst loss: ' + rc.worst.us + '-' + rc.worst.them + ' to ' + teamById(rc.worst.opp).city));
      if (rc.star) sc.appendChild(el('p', 'sub', 'Big night: ' + rc.star.name + ' scored ' + rc.star.pts + ' against ' + teamById(rc.star.opp).city));
      if (rc.pts) sc.appendChild(el('p', 'sub', 'Team leaders: ' + rc.pts.name + ' ' + rc.pts.v.toFixed(1) + ' pts' + (rc.ast ? ' \u00B7 ' + rc.ast.name + ' ' + rc.ast.v.toFixed(1) + ' ast' : '')));
      body.appendChild(sc);
    }
    if (r.owner) {
      var ow = el('div', 'stat-card');
      ow.appendChild(el('div', 'group-title', 'The owner'));
      ow.appendChild(el('p', 'sub', 'His goal: ' + r.owner.goal + '.'));
      (r.owner.sides || []).forEach(function (s) { ow.appendChild(el('p', 'sub side' + (s.ok ? ' ok' : ''), (s.ok ? '\u2713 ' : '\u2717 ') + s.text + ' \u00B7 ' + s.now)); });
      ow.appendChild(el('p', 'sub', r.owner.msg + ' (trust ' + (r.owner.delta > 0 ? '+' : '') + r.owner.delta + ')'));
      ow.appendChild(ratingRow('Owner trust', r.owner.trust));
      body.appendChild(ow);
      if (r.owner.fired) {
        body.appendChild(el('h3', 'box-title', 'Clubs that want you'));
        body.appendChild(el('p', 'sub how', 'Word travels fast. Three owners want to talk. Your new club starts with its own roster and a fresh start with the owner.'));
        if (!r.offers) {
          r.offers = save.ids.filter(function (id) { return id !== me.id; }).sort(function () { return Math.random() - 0.5; }).slice(0, 3);
          persist();
        }
        r.offers.forEach(function (id) {
          var t = teamById(id), c = el('button', 'card');
          c.type = 'button';
          c.appendChild(teamBadge(t));
          var tx = el('span');
          tx.appendChild(el('strong', null, t.city + ' ' + t.name));
          tx.appendChild(el('span', 'meta', save.rec[id].w + '-' + save.rec[id].l + ' last season \u00B7 team rating ' + teamRating(id) + ' \u00B7 payroll ' + money(League.payroll(save, id))));
          c.appendChild(tx);
          c.addEventListener('click', function () {
            League.rightsOf(save, me.id).forEach(function (p) { League.release(save, p); });
            save.myId = id;
            save.ownerTrust = 50;
            save.owner = null;
            var mo = Events.mood(save);
            mo.fans = 50; mo.coach = 50; mo.streak = 0;
            save.off.dev = [];
            r.owner.fired = false;
            r.owner.msg = 'You took over the ' + t.city + ' ' + t.name + '.';
            r.owner.trust = 50;
            r.offers = null;
            rosterCache = {};
            persist();
            renderOff();
          });
          body.appendChild(c);
        });
        offDock('Choose a club above', function () {}, true);
        return;
      }
    }
    function board(title, rows, unit) {
      if (!rows.length) return;
      body.appendChild(el('h3', 'box-title', title));
      var c = el('div', 'stat-card headlines');
      rows.forEach(function (x) { c.appendChild(el('div', null, x.name + ' · ' + x.v + unit)); });
      body.appendChild(c);
    }
    board('Scoring leaders', r.pts, ' per game');
    board('Assist leaders', r.ast, ' per game');
    if (r.title) {
      body.appendChild(el('h3', 'box-title', 'Scoring title'));
      var tc = el('div', 'stat-card headlines');
      tc.appendChild(el('div', null, r.title.name + ' \u00B7 ' + r.title.pts + ' points (the title goes to total points)'));
      body.appendChild(tc);
    }
    if (r.allLeague && r.allLeague.first.length) {
      [['First team', r.allLeague.first], ['Second team', r.allLeague.second]].forEach(function (g) {
        if (!g[1].length) return;
        body.appendChild(el('h3', 'box-title', (save.year < 1950 ? 'All-BAA ' : 'All-League ') + g[0]));
        var ac = el('div', 'stat-card headlines');
        g[1].forEach(function (x) { ac.appendChild(el('div', null, x.name + (x.team && teamById(x.team) ? ' \u00B7 ' + teamById(x.team).city : ''))); });
        body.appendChild(ac);
      });
    }
    if (r.mvp) {
      body.appendChild(el('h3', 'box-title', 'Player of the year'));
      var c = el('div', 'stat-card headlines');
      c.appendChild(el('div', null, r.mvp.name));
      body.appendChild(c);
    }
    offDock('Player development', function () { offStep('dev'); });
  }

  function offDev(body, me) {
    offHeader('Player development', 'Everyone is a year older');
    var d = save.off;
    if (d.retired.length) {
      body.appendChild(el('h3', 'box-title', 'Retired'));
      d.retired.forEach(function (x) {
        body.appendChild(personRow(League.byId(save, x.id), ['Retired at ' + (League.byId(save, x.id).age) + ' · was ' + x.ovr + ' overall']));
      });
    }
    body.appendChild(el('h3', 'box-title', 'Your roster'));
    d.dev.slice().sort(function (a, b) { return b.to - a.to; }).forEach(function (x) {
      var p = League.byId(save, x.id), diff = x.to - x.from;
      var tag = el('span', 'ovr ' + (diff > 0 ? 'hi' : diff < 0 ? 'lo' : 'mid'), (diff > 0 ? '+' : '') + diff);
      body.appendChild(personRow(p, ['Age ' + p.age + ' · ' + x.from + ' → ' + x.to + ' overall', 'Potential ' + p.pot], tag));
    });
    body.appendChild(el('p', 'sub', d.leagueRetired + ' players on other clubs retired.'));
    offDock(save.off.fates ? 'League news' : 'Contracts', function () { offStep(save.off.fates ? 'fates' : 'contracts'); });
  }


  function fateDef(f) { return History.get(save.year).filter(function (d) { return d.id === f.id; })[0]; }
  function slugOf(t) { return (t.city + ' ' + t.name).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/ +/g, '-'); }
  function clubBySlug(key) {
    for (var i = 0; i < save.ids.length; i++) { var t = save.tm[save.ids[i]]; if (t && (slugOf(t) === key || t.id === key && slugOf(t) === key)) return t; }
    return null;
  }
  function fateDerive(f) {
    var d = fateDef(f), hist = f.choice === 'history';
    var ren = [];
    if (hist) Object.keys(d.rename || {}).forEach(function (k) { var t = clubBySlug(k); if (t) ren.push({ id: t.id, to: d.rename[k], from: t.city + ' ' + t.name }); });
    var foldIds = hist ? d.fold.filter(function (id) { return save.ids.indexOf(id) >= 0; }) : [];
    var staying = save.ids.filter(function (id) { return foldIds.indexOf(id) < 0; }).map(teamById);
    var conflicts = [];
    d.join.forEach(function (t) {
      var ex = staying.filter(function (x) { return x.id === t.id || x.city === t.city; })[0];
      if (ex) conflicts.push({ team: t, existing: ex });
    });
    var move = {}, ok = hist && Object.keys(d.move || {}).length > 0;
    if (ok) Object.keys(d.move).forEach(function (id) { var t = save.tm[id]; if (!t || save.ids.indexOf(id) < 0 || t.division !== d.move[id].from) ok = false; });
    if (ok) move = d.move;
    return { def: d, fold: foldIds, move: move, conflicts: conflicts, rename: ren };
  }

  function offFates(body, me) {
    offHeader('League news', 'Off-season · ' + seasonLabel(save.year) + ' to ' + seasonLabel(save.year + 1));
    var blocked = false;
    save.off.fates.forEach(function (f) {
      var x = fateDerive(f), d = x.def;
      var card = el('div', 'stat-card');
      card.appendChild(el('div', 'group-title', d.title));
      var seg = el('div', 'seg');
      [['history', 'Keep history'], ['alt', 'Change history']].forEach(function (o) {
        var b = el('button', 'btn small' + (f.choice === o[0] ? ' primary' : ''), o[1]);
        b.type = 'button';
        b.addEventListener('click', function () { f.choice = o[0]; f.res = {}; persist(); offStep('fates'); });
        seg.appendChild(b);
      });
      card.appendChild(seg);
      card.appendChild(el('p', 'sub', f.choice === 'history' ? d.news : d.alt));
      x.fold.forEach(function (id) {
        var t = teamById(id), row = el('div', 'row');
        row.appendChild(teamBadge(t));
        row.appendChild(el('strong', null, t.city + ' ' + t.name + ' fold' + (id === me.id ? ' (your club)' : '')));
        card.appendChild(row);
      });
      d.join.forEach(function (t0) {
        var t = save.tm[t0.id] || t0, row = el('div', 'row');
        row.appendChild(teamBadge(t));
        row.appendChild(el('strong', null, t.city + ' ' + t.name + ' join'));
        card.appendChild(row);
      });
      x.rename.forEach(function (r) {
        var t = save.tm[r.id], row = el('div', 'row');
        row.appendChild(teamBadge(t));
        row.appendChild(el('strong', null, r.from + ' become the ' + r.to.city + ' ' + r.to.name + (r.id === me.id ? ' (your club)' : '')));
        card.appendChild(row);
      });
      x.conflicts.forEach(function (c) {
        var t = c.team, ex = c.existing, key = t.id;
        var box = el('div', 'fates');
        box.appendChild(el('p', 'sub', 'Contradiction: history gives ' + t.city + ' the ' + t.name + ', but in your league the ' + ex.city + ' ' + ex.name + ' still play there.'));
        [['rebrand', 'Rename the ' + ex.name + ' the ' + t.name], ['skip', 'No new club in ' + t.city]].forEach(function (o) {
          var b = el('button', 'btn small' + (f.res[key] === o[0] ? ' primary' : ''), o[1]);
          b.type = 'button';
          b.addEventListener('click', function () { f.res[key] = o[0]; persist(); offStep('fates'); });
          box.appendChild(b);
        });
        card.appendChild(box);
        if (!f.res[key]) blocked = true;
      });
      body.appendChild(card);
    });
    offDock('Continue', function () {
      var myFolded = false;
      save.off.fates.forEach(function (f) { if (fateDerive(f).fold.indexOf(me.id) >= 0) myFolded = true; });
      var hadFold = applyFates();
      save.off.myFolded = myFolded;
      offStep(myFolded ? 'newclub' : (hadFold ? 'dispersal' : 'contracts'));
    }, blocked);
  }

  function applyFates() {
    var foldAll = [], newIds = [];
    save.off.fates.forEach(function (f) {
      if (f.applied) return;
      f.applied = true;
      var x = fateDerive(f);
      x.fold.forEach(function (id) { save.ids.splice(save.ids.indexOf(id), 1); foldAll.push(id); });
      Object.keys(x.move).forEach(function (id) { save.tm[id].division = x.move[id].to; });
      x.rename.forEach(function (r) {
        var t = save.tm[r.id];
        t.was = (t.was || []).concat([t.city + ' ' + t.name]);
        t.city = r.to.city; t.name = r.to.name; t.colors = r.to.colors.slice(); if (r.to.nbaId) t.nbaId = r.to.nbaId;
      });
      x.def.join.forEach(function (t0) {
        var c = x.conflicts.filter(function (k) { return k.team.id === t0.id; })[0];
        var res = c && f.res[t0.id];
        if (res === 'skip') return;
        if (res === 'rebrand') {
          var ex = save.tm[c.existing.id];
          ex.was = (ex.was || []).concat([ex.name]);
          ex.name = t0.name; ex.colors = t0.colors.slice();
          return;
        }
        var t = JSON.parse(JSON.stringify(t0));
        var count = { Eastern: 0, Western: 0 };
        save.ids.forEach(function (id) { var dv = save.tm[id].division; count[dv] = (count[dv] || 0) + 1; });
        var divs = Object.keys(count);
        t.division = divs.length === 2 && count[divs[0]] !== count[divs[1]] ? (count[divs[0]] < count[divs[1]] ? divs[0] : divs[1]) : t0.division;
        save.tm[t.id] = t;
        save.ids.push(t.id);
        save.rec[t.id] = { w: 0, l: 0 };
        League.makeVeterans(save, t.id, 10, 52, 66);
        newIds.push(t.id);
      });
    });
    if (foldAll.length) {
      var teams = save.ids.map(teamById);
      League.startDispersal(save, teams, foldAll, newIds, 5);
    }
    rosterCache = {};
    persist();
    return foldAll.length > 0;
  }

  function offNewClub(body, me) {
    offHeader('Choose a new club', 'Your franchise has folded');
    body.appendChild(el('p', 'sub how', 'The league needs GMs. Pick the club you want to take over.'));
    save.ids.forEach(function (id) {
      var t = teamById(id);
      var pl = League.rosterOf(save, id);
      var rating = pl.map(function (p) { return p.ratings.ovr; }).sort(function (a, b) { return b - a; }).slice(0, 8);
      var avg = rating.length ? Math.round(rating.reduce(function (a, b) { return a + b; }, 0) / rating.length) : 0;
      var c = el('button', 'card');
      c.type = 'button';
      c.appendChild(teamBadge(t));
      var tx = el('span');
      tx.appendChild(el('strong', null, t.city + ' ' + t.name));
      tx.appendChild(el('span', 'meta', pl.length + ' players · rating ' + avg + ' · payroll ' + money(League.payroll(save, id))));
      c.appendChild(tx);
      c.addEventListener('click', function () {
        save.myId = id;
        selected = t;
        save.off.myFolded = false;
        rosterCache = {};
        persist();
        offStep('dispersal');
      });
      body.appendChild(c);
    });
    document.getElementById('off-dock').textContent = '';
  }

  function offContracts(body, me) {
    offHeader('Contracts', money(League.payroll(save, me.id)) + ' payroll' + (League.deadOf(save, me.id) ? ' (' + money(League.deadOf(save, me.id)) + ' dead)' : '') + ' · cap ' + money(save.lg.cap));
    var list = League.expiring(save, me.id);
    if (!list.length) {
      body.appendChild(el('p', 'sub', 'No contracts expire this year.'));
    } else {
      body.appendChild(el('p', 'sub how', 'These deals have run out. Re-sign them or let them walk into free agency.'));
    }
    list.forEach(function (p) {
      var trust = Events.pm(save, p.id).t;
      var ask = League.ask(save, p, trust);
      var holder = el('div', 'player');
      holder.appendChild(personRow(p, [(p.pos || '') + ' · Age ' + p.age + ' · potential ' + p.pot, 'Asking ' + money(ask) + ' a year' + (trust < 40 ? ' · unhappy with you' : '') + ' \u00B7 leaving: ' + oddsShift(me.id, null, p)], el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr))));
      var row = el('div', 'dock-row');
      [[1, '1 year'], [3, '3 years']].forEach(function (o) {
        var b = el('button', 'btn small', 'Re-sign ' + o[1]);
        b.type = 'button';
        b.addEventListener('click', function () {
          League.sign(save, p, me.id, ask, o[0]);
          persist(); renderOff();
        });
        row.appendChild(b);
      });
      holder.appendChild(row);
      var go = el('button', 'btn ghost wide', 'Let him go');
      go.type = 'button';
      go.addEventListener('click', function () { League.release(save, p); persist(); renderOff(); });
      holder.appendChild(go);
      body.appendChild(holder);
    });
    offDock(list.length ? 'Release the rest and go to the draft' : 'Go to the draft', function () {
      League.expiring(save, me.id).forEach(function (p) { League.release(save, p); });
      League.aiReSign(save, save.ids.map(teamById), me.id);
      var year = save.year + 1;
      fetch('data/draft-' + year + '.json').then(function (r) { return r.ok ? r.json() : { prospects: [] }; })
        .catch(function () { return { prospects: [] }; })
        .then(function (d) {
          League.startDraft(save, save.ids.map(teamById), d.prospects, League.draftRounds());
          offStep('draft');
        });
    });
  }

  function offDraft(body, me) {
    var d = save.lg.draft;
    Social.draftOpen(save);
    while (d.at < d.picks.length && d.picks[d.at].team !== me.id) League.aiPick(save);
    persist();
    var isDisp = d.kind === 'dispersal';
    if (d.at >= d.picks.length) {
      d.pool.forEach(function (p) {
        if (p.status !== 'prospect') return;
        p.status = 'active'; p.team = null; p.salary = League.salaryFor(p.ratings.ovr); p.yrs = 1;
        if (!League.byId(save, p.id)) save.lg.players.push(p);
      });
      if (isDisp) { offStep('contracts'); return; }
      League.aiRosterPass(save, save.ids.map(teamById), me.id);
      offStep('fa');
      return;
    }
    var slot = d.picks[d.at];
    offHeader(isDisp ? 'Dispersal draft' : d.year + ' draft', 'Round ' + slot.round + ' · pick ' + slot.pick + ' of ' + d.picks.length + (slot.orig ? ' · via ' + teamById(slot.orig).city : ''));
    var clock = el('div', 'stat-card');
    clock.appendChild(el('div', 'group-title', 'You are on the clock'));
    var recent = d.picks.slice(Math.max(0, d.at - 4), d.at).reverse();
    if (recent.length) {
      var rc = el('div', 'headlines');
      recent.forEach(function (sl) {
        var p = League.byId(save, sl.player);
        var line = el('div', null, '#' + sl.pick + ' ' + teamById(sl.team).city + ': ' + p.name);
        line.appendChild(el('small', null, (p.pos || '') + ' · ' + (p.college || '')));
        rc.appendChild(line);
      });
      clock.appendChild(rc);
    }
    body.appendChild(clock);
    var avail = League.draftAvailable(save).slice(0, 40);
    if (!offSel || !avail.some(function (p) { return p.id === offSel; })) offSel = avail[0].id;
    avail.forEach(function (p) {
      var holder = el('div', 'player');
      var row = personRow(p, [(p.pos || '') + ' · ' + hgtText(p) + ' · ' + (isDisp ? 'from ' + (teamById(p.formerTeam) || { city: 'a folded club' }).city : p.college) + ' · age ' + p.age + (p.realPick ? ' · real pick ' + p.realPick : ''), isDisp ? 'Overall ' + p.scout.ovr + ' · potential ' + p.scout.pot : 'Scouts: ' + p.scout.ovr + ' now · up to ' + p.scout.pot], el('span', 'ovr ' + level(p.scout.ovr), String(p.scout.ovr)));
      row.className += ' pickable';
      if (p.id === offSel) row.classList.add('selected');
      row.style.cursor = 'pointer';
      row.addEventListener('click', function () { offSel = p.id; renderOff(); });
      holder.appendChild(row);
      body.appendChild(holder);
    });
    var dock = offDock('Draft ' + League.draftAvailable(save).filter(function (p) { return p.id === offSel; })[0].name, function () {
      League.makePick(save, avail.filter(function (p) { return p.id === offSel; })[0]);
      persist(); offSel = null; renderOff();
    });
    var auto = el('button', 'btn ghost wide', 'Auto-pick for me');
    auto.type = 'button';
    auto.addEventListener('click', function () { League.aiPick(save); persist(); offSel = null; renderOff(); });
    dock.appendChild(auto);
  }

  function rightsSection(body, me) {
    var list = League.rightsOf(save, me.id).sort(function (x, y) { return y.ratings.ovr - x.ratings.ovr; });
    if (!list.length) return;
    var n = League.rosterOf(save, me.id).length, pay = League.payroll(save, me.id);
    body.appendChild(el('h3', 'box-title', 'Draft rights (' + list.length + ')'));
    body.appendChild(el('p', 'sub how', 'Players you drafted. They only count against your roster and payroll once you sign them. Unsigned rights are released when the season starts.'));
    var all = el('button', 'btn small', 'Let all go');
    all.type = 'button';
    all.addEventListener('click', function () { list.forEach(function (p) { League.release(save, p); }); persist(); renderOff(); });
    body.appendChild(all);
    list.forEach(function (p) {
      var can = League.canSign(save, me.id, p.salary) && n < League.MAX_ROSTER;
      var sg = el('button', 'btn small primary', can ? 'Sign ' + money(p.salary) : (n >= League.MAX_ROSTER ? 'Roster full' : 'Over the cap'));
      sg.type = 'button'; sg.disabled = !can;
      sg.addEventListener('click', function () { League.signRights(save, p); Social.rightsSigned(save, p); persist(); renderOff(); });
      var rl = el('button', 'btn small', 'Let go');
      rl.type = 'button';
      rl.addEventListener('click', function () { League.release(save, p); persist(); renderOff(); });
      var right = el('span'); right.style.marginLeft = 'auto'; right.appendChild(sg); right.appendChild(rl);
      body.appendChild(personRow(p, [(p.pos || '') + ' \u00B7 age ' + p.age + ' \u00B7 overall ' + p.ratings.ovr, 'Potential ' + p.pot], right));
    });
  }

  function offFA(body, me) {
    Social.faOpen(save);
    var pay = League.payroll(save, me.id), n = League.rosterOf(save, me.id).length;
    offHeader('Free agency', n + ' players · ' + money(pay) + ' of ' + money(save.lg.cap));
    var fa = League.freeAgents(save).slice(0, 30);
    body.appendChild(el('p', 'sub how', 'Sign anyone you can fit under the cap. Your drafted rookies are under draft rights below.'));
    rightsSection(body, me);
    fa.forEach(function (p) {
      var ask = League.salaryFor(p.ratings.ovr);
      var can = League.canSign(save, me.id, ask) && n < League.MAX_ROSTER;
      var b = el('button', 'btn small', can ? 'Sign ' + money(ask) : (n >= League.MAX_ROSTER ? 'Roster full' : 'Over the cap'));
      b.type = 'button';
      b.disabled = !can;
      b.addEventListener('click', function () { League.sign(save, p, me.id, ask, 2); Social.faSigned(save, p, money(ask), 2); persist(); renderOff(); });
      var right = el('span'); right.style.marginLeft = 'auto'; right.appendChild(b);
      body.appendChild(personRow(p, [(p.pos || '') + ' · ' + hgtText(p) + ' · age ' + p.age + ' · potential ' + p.pot, 'Overall ' + p.ratings.ovr + ' \u00B7 ' + oddsShift(me.id, p)], right));
    });
    if (!fa.length) body.appendChild(el('p', 'sub', 'Nobody is available.'));
    var tb = el('button', 'btn wide', 'Trades');
    tb.type = 'button';
    tb.addEventListener('click', function () { openTrade('off'); });
    body.appendChild(tb);
    offDock('Finish the off-season', function () { offStep('ready'); });
  }

  function offReady(body, me) {
    var n = League.rosterOf(save, me.id).length, pay = League.payroll(save, me.id);
    offHeader('Ready for ' + seasonLabel(save.year + 1), 'Last check');
    var card = el('div', 'stat-card');
    card.appendChild(el('div', 'group-title', 'Your club'));
    card.appendChild(el('p', 'sub', n + ' players · payroll ' + money(pay) + ' of ' + money(save.lg.cap)));
    var problem = n < League.MIN_ROSTER ? 'You need at least ' + League.MIN_ROSTER + ' players. Go back and sign more.' : n > League.MAX_ROSTER ? 'The roster limit is ' + League.MAX_ROSTER + '. Release ' + (n - League.MAX_ROSTER) + ' from the roster screen.' : '';
    if (problem) card.appendChild(el('p', 'note', problem));
    body.appendChild(card);
    rightsSection(body, me);
    if (n > League.MAX_ROSTER) {
      body.appendChild(el('h3', 'box-title', n > League.MAX_ROSTER ? 'Cut down to ' + League.MAX_ROSTER : 'Over the cap'));
      League.rosterOf(save, me.id).sort(function (a, b) { return a.ratings.ovr - b.ratings.ovr; }).slice(0, 12).forEach(function (p) {
        var rel = el('button', 'btn small', 'Release');
        rel.type = 'button';
        rel.addEventListener('click', function () { League.release(save, p); persist(); renderOff(); });
        var right = el('span'); right.style.marginLeft = 'auto'; right.appendChild(rel);
        body.appendChild(personRow(p, [(p.pos || '') + ' \u00B7 age ' + p.age + ' \u00B7 ' + money(p.salary) + ' \u00B7 overall ' + p.ratings.ovr, 'Potential ' + p.pot], right));
      });
    }
    var rb = el('button', 'btn wide', 'View roster');
    rb.type = 'button';
    rb.addEventListener('click', function () { renderRoster(me); show('screen-roster'); });
    body.appendChild(rb);
    var fb = el('button', 'btn wide', 'Back to free agency');
    fb.type = 'button';
    fb.addEventListener('click', function () { offStep('fa'); });
    body.appendChild(fb);
    offDock('Start the ' + seasonLabel(save.year + 1) + ' season', startNextSeason, !!problem);
  }

  function startNextSeason() {
    var teams = save.ids.map(teamById), me = teamById(save.myId);
    League.rightsOf(save, me.id).forEach(function (p) { League.release(save, p); });
    League.aiRosterPass(save, teams, me.id);
    var next = Season.create(save.eraId, save.year + 1, teams, save.myId, Rules.games(save.year + 1));
    save.lg.players.forEach(function (p) { if (p.imp) p.imp = Math.round(p.imp * 500) / 1000; });
    next.tm = save.tm; next.ids = save.ids.slice();
    next.lg = save.lg; next.mood = save.mood; next.plan = save.plan; if (next.mood) next.mood.asked = false;
    next.lg.stats = {}; next.lg.draft = null; next.lg.year = next.year; next.lg.cap = League.capFor(next.year);
    if (next.mood) { next.mood.streak = 0; next.mood.news = next.mood.news.slice(-3); }
    next.pending = [];
    next.ownerTrust = save.ownerTrust;
    next.ownerPrev = save.ownerPrev;
    next.rules = save.rules;
    save = next;
    League.ensurePicks(save, save.ids.map(teamById));
    rosterCache = {};
    offSel = null;
    persist();
    renderSeason();
    show('screen-season');
  }

  document.getElementById('btn-play').addEventListener('click', startSeason);
  document.getElementById('btn-again').addEventListener('click', function () { openEvents(); });
  document.getElementById('btn-simweek').addEventListener('click', function () { simDays(7); });
  document.getElementById('btn-simrest').addEventListener('click', function () { simDays(500); });

  var continueBtn = document.getElementById('btn-continue');
  var saved = store.get('save', null);
  if (saved && saved.v === 1 && eraStart(saved.eraId)) continueBtn.disabled = false;
  continueBtn.addEventListener('click', function () {
    var data = store.get('save', null);
    if (!data) return;
    var era = eraStart(data.eraId);
    currentEra = era;
    eraLook(era);
    League.setEra(data.year);
    continueBtn.disabled = true;
    Promise.all([fetch(era.teams).then(function (r) { return r.json(); }), fetch(era.players).then(function (r) { return r.json(); })])
      .then(function (res) {
        seasons[era.id] = res[0];
        playersByEra[era.id] = res[1];
        rosterCache = {};
        save = data;
        Engine.setRules(save.rules);
        selected = teamById(save.myId);
        if (!save.lg) League.init(save, res[1].players, res[0].teams, res[1].dead);
        League.tune(save);
        League.realContracts(save, res[1].players);
        ensureTm();
        continueBtn.disabled = false;
        if (save.pending && save.pending.length) openEvents();
        else if (save.off) { openOff(); }
        else { renderSeason(); show('screen-season'); }
      })
      .catch(function () { continueBtn.disabled = false; });
  });

  /* ---------- start ---------- */
  show('screen-title');
  playIntro();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
