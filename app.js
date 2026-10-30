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
  function show(id) {
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    var target = document.getElementById(id);
    target.classList.add('active');
    target.scrollTop = 0;
    body.dataset.screen = id;
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

  eraFilterBox.addEventListener('change', function () {
    store.set('eraFilter', eraFilterBox.checked);
    applyEraFilter(eraFilterBox.checked);
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
  function flick() {
    body.classList.add('flicker');
    setTimeout(function () { body.classList.remove('flicker'); }, 700);
  }
  function finishIntro() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
    body.classList.remove('flicker');
    setPhase('bw');
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
    later(function () { body.dataset.menu = 'show'; }, 6400);
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
    { years: '1950s-60s', title: 'The Shot Clock Era', blurb: 'Locked for now' },
    { years: '1970s', title: 'The Colour TV Era', blurb: 'Locked for now' },
    { years: '1980s', title: 'The Cable Era', blurb: 'Locked for now' },
    { years: '1990s-2000s', title: 'The Multimedia Era', blurb: 'Locked for now' },
    { years: '2010s-now', title: 'The HD and Social Era', blurb: 'Locked for now' }
  ];

  var eraList = document.getElementById('era-list');
  ERAS.forEach(function (era) {
    var card = el('button', 'card era');
    card.type = 'button';
    card.appendChild(el('span', 'year', era.years));
    var text = el('span');
    text.appendChild(el('strong', null, era.title));
    text.appendChild(el('span', 'meta', era.blurb));
    card.appendChild(text);
    if (era.open) {
      card.addEventListener('click', function () { openTeams(era); });
    } else {
      card.disabled = true;
    }
    eraList.appendChild(card);
  });

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
    var era = currentEra ? currentEra.id : '';
    var urls = [];
    if (era) urls.push(base + '-' + era + '.png', base + '-' + era + '.svg');
    urls.push(base + '.png', base + '.svg');
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

  function renderTeams(data) {
    teamList.textContent = '';
    data.divisions.forEach(function (div) {
      var teams = data.teams.filter(function (t) { return t.division === div; });
      teams.sort(function (a, c) { return c.w - a.w; });
      teamList.appendChild(el('p', 'group-title', div + ' division'));
      teams.forEach(function (team) {
        var rank = 1;
        teams.forEach(function (o) { if (o.w > team.w) rank++; });
        var card = el('button', 'card team');
        card.type = 'button';
        card.appendChild(makeBadge(team, false));
        var text = el('span');
        text.appendChild(el('strong', null, team.city + ' ' + team.name));
        text.appendChild(el('span', 'meta', 'In history: ' + team.w + '-' + team.l + ', ' + ordinal(rank) + ' in the ' + div));
        if (team.id === data.champion) text.appendChild(el('span', 'tag', 'Won the first title'));
        else if (team.id === data.runnerUp) text.appendChild(el('span', 'tag', 'Lost the final'));
        card.appendChild(text);
        card.addEventListener('click', function () {
          var all = teamList.querySelectorAll('.card');
          for (var i = 0; i < all.length; i++) all[i].classList.remove('selected');
          card.classList.add('selected');
          selected = team;
          takeBtn.textContent = 'Take over the ' + team.city + ' ' + team.name;
          dock.hidden = false;
        });
        teamList.appendChild(card);
      });
    });
  }

  function openTeams(era) {
    currentEra = era;
    selected = null;
    dock.hidden = true;
    teamSub.textContent = era.years;
    show('screen-team');
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
    document.getElementById('ready-line').textContent =
      'In real history this team went ' + selected.w + '-' + selected.l + '. What will you do differently?';
    store.set('team', selected.id);
    buildFatesBox();
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

  /* Uses assets/players/<player-id>.jpg (or .png / .webp) when present; assets/photos works too. */
  function makeAvatar(p) {
    var wrap = el('span', 'avatar');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.appendChild(el('span', null, playerInitials(p.name)));
    var exts = [];
    ['players', 'photos'].forEach(function (d) { ['jpg', 'png', 'webp'].forEach(function (e) { exts.push(d + '/' + p.id + '.' + e); }); });
    var i = 0;
    var img = new Image();
    img.onload = function () { wrap.textContent = ''; wrap.appendChild(img); };
    img.onerror = function () { next(); };
    function next() {
      if (i < exts.length) img.src = 'assets/' + exts[i++];
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
  function lineChart(vals, avg, fmt) {
    var W = 340, H = 150, L = 30, R = 8, T = 10, B = 18;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img' });
    var hi = Math.max.apply(null, vals.concat(avg || 0)), lo = Math.min.apply(null, vals.concat(avg === undefined ? 0 : avg, 0));
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
    var a = svgEl('text', { x: L, y: H - 4, class: 'axis' }); a.textContent = 'Game 1'; svg.appendChild(a);
    var z = svgEl('text', { x: W - R, y: H - 4, class: 'axis', 'text-anchor': 'end' }); z.textContent = 'Game ' + vals.length; svg.appendChild(z);
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
      body.appendChild(boxes([['PTS', f1(x.pts, x.g)], ['AST', f1(x.ast, x.g)], ['FG%', pctS(x.fg, x.fga)], ['FT%', pctS(x.ft, x.fta)]]));
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
    } else body.appendChild(el('p', 'sub', 'Last season’s real record only lists these figures. Rebounds, steals, blocks and turnovers are tracked once you play.'));
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
      body.appendChild(el('p', 'sub', 'The mark on each bar is the league average this season.'));
    } else if (mode === 'Trend') {
      if (log.length < 2) { body.appendChild(el('p', 'sub', 'Trends appear after two games with your club.')); return; }
      body.appendChild(el('div', 'group-title', 'Points per game'));
      body.appendChild(lineChart(log.map(function (g) { return g[6]; }), x.pts / x.g));
      var roll = [];
      for (var i = 0; i < log.length; i++) {
        var a = 0, b = 0; for (var j = Math.max(0, i - 4); j <= i; j++) { a += log[j][13]; b += log[j][14]; }
        roll.push(b ? 100 * a / b : 0);
      }
      body.appendChild(el('div', 'group-title', 'FG% over the last five games'));
      body.appendChild(lineChart(roll, x.fga ? 100 * x.fg / x.fga : 0, function (v) { return Math.round(v) + '%'; }));
      body.appendChild(el('p', 'sub', 'The dashed line is his season average.'));
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
        var d = Math.round(p.ratings[r[1]] - avg(r[1]));
        row.lastChild.textContent = p.ratings[r[1]] + ' (' + (d > 0 ? '+' : '') + d + ')';
        body.appendChild(row);
      });
    });
    body.appendChild(el('p', 'sub', 'The number in brackets is the gap to the average ' + ({ G: 'guard', F: 'forward', C: 'centre' }[grp(p)]) + ' in the league.'));
  }

  function pvContract(body, p) {
    var tm = function (id) { return id ? oppName(id) : 'Free agent'; };
    body.appendChild(el('div', 'group-title', 'Current deal'));
    body.appendChild(boxes([['Salary', money(p.salary)], ['Years left', p.yrs <= 0 ? 'Expiring' : String(p.yrs)], ['Worth', money(League.salaryFor(p.ratings.ovr))], ['Cap share', Math.round(100 * p.salary / save.lg.cap) + '%']]));
    var diff = p.salary - League.salaryFor(p.ratings.ovr);
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
    body.appendChild(el('p', 'sub', 'Durability is the rating that keeps him on the floor. Lower numbers get hurt more often.'));
  }

  function pvAwards(body, p) {
    var aw = (p.awards || []).slice().reverse();
    var count = function (n) { return aw.filter(function (x) { return x.a === n; }).length; };
    body.appendChild(boxes([['Titles', String(count('League champion'))], ['MVP', String(count('Most Valuable Player'))], ['All-League', String(count('All-League First Team') + count('All-League Second Team'))], ['Leader', String(count('Scoring champion') + count('Assists leader'))]]));
    body.appendChild(el('div', 'group-title', 'Honours'));
    if (!aw.length) { body.appendChild(el('p', 'sub', 'No honours yet. They are handed out when each season ends: MVP, scoring and assist titles, All-League teams and the championship.')); return; }
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
    if (p.g) row('Last season', '', { g: p.g, pts: p.pts || 0, ast: p.ast || 0, fg: p.fg || 0, fga: p.fga || 0, ft: p.ft || 0, fta: p.fta || 0 });
    (p.career || []).forEach(function (c) { row(seasonLabel(c.y), c.t ? oppName(c.t) : '', c); });
    var cur = save.lg.stats[p.id];
    if (cur && cur.g) row(seasonLabel(save.year), p.team ? oppName(p.team) : '', cur);
    if (!rows.length) { body.appendChild(el('p', 'sub', 'No seasons on record yet.')); return; }
    body.appendChild(dataTable(['Season', 'Team', 'GP', 'PTS', 'AST', 'FG%', 'FT%'], rows));
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
    var squad = League.rosterOf(save, team.id).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    var pay = League.payroll(save, team.id);
    document.getElementById('roster-sub').textContent = squad.length + ' players \u00B7 ' + money(pay) + ' of ' + money(save.lg.cap) + ' cap';
    squad.forEach(function (p) {
      var holder = el('div', 'player');
      var card = el('button', 'card');
      card.type = 'button';
      card.appendChild(makeAvatar(p));
      var text = el('span');
      text.appendChild(el('strong', null, p.name));
      text.appendChild(el('span', 'meta', (p.pos ? p.pos + ' \u00B7 ' : '') + (p.hgt ? Math.floor(p.hgt / 12) + '\'' + (p.hgt % 12) + '\" \u00B7 ' : '') + 'Age ' + (p.age || '?')));
      if (p.inj > 0) text.appendChild(el('span', 'meta injured', 'Injured \u00B7 out ' + p.inj + (p.inj === 1 ? ' more game' : ' more games')));
      card.appendChild(text);
      card.appendChild(el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr)));
      var detail = el('button', 'detail quick');
      detail.type = 'button';
      detail.hidden = true;
      var s = statsOf(p);
      detail.appendChild(el('div', 'group-title', s ? 'Averages \u00B7 ' + s.label : 'No games yet'));
      if (s) detail.appendChild(boxes([['PTS', f1(s.x.pts, s.x.g)], ['AST', f1(s.x.ast, s.x.g)], ['FG%', pctS(s.x.fg, s.x.fga)], ['FT%', pctS(s.x.ft, s.x.fta)]]));
      detail.appendChild(el('div', 'quick-k', money(p.salary) + ' \u00B7 ' + (p.yrs <= 0 ? 'expiring' : p.yrs + (p.yrs === 1 ? ' year' : ' years') + ' left') + ' \u00B7 potential ' + p.pot));
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
    list.appendChild(el('p', 'sub', 'Tap a player for his averages and contract, tap again for the full profile. Salaries are estimates except where the record is known (Joe Fulks earned $8,000).'));
  }

  /* ---------- match ---------- */
  var matchTimer = null;
  function teamBadge(team) {
    var b = makeBadge(team, false);
    applyLogo(b, team);
    return b;
  }

  function boxTable(team, lines, cols, won) {
    var wrap = el('div');
    wrap.appendChild(el('h3', 'box-title', team.city + ' ' + team.name));
    var scroll = el('div', 'boxwrap');
    var table = el('table', 'box');
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
      tr.appendChild(el('td', null, l.name));
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
      bodyEl.appendChild(boxTable(me, res.homeLines, cols));
      bodyEl.appendChild(boxTable(opp, res.awayLines, cols));
      bodyEl.appendChild(el('p', 'sub', 'This box score only shows what the league recorded in ' + seasonLabel(save.year) + '. Later eras add rebounds, steals, blocks and more.'));
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
  function persist() { store.set('save', save); }
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
  function seasonLabel(y) { return y + '-' + String(y + 1).slice(2); }
  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function teamRating(id) {
    var r = rosterOf(id).map(function (p) { return p.ratings.ovr; }).sort(function (a, b) { return b - a; }).slice(0, 8);
    return r.length ? Math.round(r.reduce(function (a, b) { return a + b; }, 0) / r.length) : 0;
  }
  function rosterFor(id) {
    var h = League.healthy(save, id);
    return id === save.myId ? Events.moraleRoster(save, h) : h;
  }
  function simGame(g) {
    var r = Engine.simulate(rosterFor(g.home), rosterFor(g.away), save.year);
    if (save.phase === 'regular') League.accumulate(save, r.homeLines.concat(r.awayLines), { h: g.home, a: g.away, hs: r.home, as: r.away, nh: r.homeLines.length, day: save.day });
    var inj = League.rollInjuries(save, r.homeLines, g.home).concat(League.rollInjuries(save, r.awayLines, g.away));
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
    Season.record(save, results);
    League.aiMoves(save, save.myId, save.ids.map(teamById));
    rosterCache = {};
    if (save.phase !== 'regular') save.pd = (save.pd || 0) + 1;
  }
  function eraStart(id) { return ERAS.filter(function (e) { return e.id === id; })[0]; }

  function startSeason() {
    var data = seasons[currentEra.id];
    loadPlayers(function (pl) {
      if (!pl) return;
      rosterCache = {};
      save = Season.create(currentEra.id, parseInt(currentEra.years, 10), data.teams, selected.id, data.games || 60);
      League.init(save, pl.players, data.teams);
      ensureTm();
      persist();
      renderSeason();
      show('screen-season');
    });
  }

  function playNext() {
    if (save.pending && save.pending.length) { openEvents(); return; }
    var mine = Season.myNext(save);
    if (!mine) { simDay(); persist(); renderSeason(); return; }
    var oppId = mine.home === save.myId ? mine.away : mine.home;
    var me = teamById(save.myId), opp = teamById(oppId);
    var label = save.phase === 'regular'
      ? 'Game ' + (save.rec[me.id].w + save.rec[me.id].l + 1) + ' · ' + (mine.home === me.id ? 'home' : 'away')
      : Season.roundInfo(save, mine.round).name;
    startLive(me, opp, mine, label);
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
    var myInj = League.rollInjuries(save, res.homeLines, me.id).concat(League.rollInjuries(save, res.awayLines, opp.id));
    League.tickInjuries(save, me.id); League.tickInjuries(save, opp.id);
    var before = {}, stb = Season.standings(save);
    Object.keys(stb).forEach(function (d) { before[d] = stb[d][0].id; });
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
    if (i === 0) return rows.length > 1 && rows[1].gb ? 'The result leaves ' + city + ' alone in first place in the ' + d + ' Division, ' + (rows[1].gb === 1 ? 'a game' : rows[1].gb + ' games') + ' clear.' : 'The result leaves ' + city + ' tied for first in the ' + d + ' Division.';
    return 'The result leaves ' + city + ' ' + (me.gb === 1 ? 'a game' : me.gb + ' games') + ' behind ' + teamById(rows[0].id).city + ' in the ' + d + ' Division.';
  }

  /* ---------- live match ---------- */
  var lv = null;
  var COURT_SPOTS = [[50, 41], [15, 52], [85, 52], [30, 80], [70, 80]];
  var OPP_SPOTS = [[50, 12], [29, 27], [71, 27], [36, 59], [64, 59]];
  var COURT_SVG = '<svg class="lines" viewBox="0 0 100 90" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="86"/><rect x="34" y="2" width="32" height="38"/><circle cx="50" cy="40" r="10"/><path d="M12 2v14a38 38 0 0 0 76 0V2"/><circle cx="50" cy="9" r="2.4"/><path d="M44 5h12"/></svg>';

  function lastName(n) { var p = n.split(' '); return p[p.length - 1]; }
  function periodLabel(g) { return g.q < 4 ? 'Q' + (g.q + 1) : (g.q === 4 ? 'OT' : 'OT' + (g.q - 3)); }
  function clockText(g) {
    var total = g.q < 4 ? 12 : 5, secs = Math.round((1 - g.k / g.limit) * total * 60);
    return Math.floor(secs / 60) + ':' + ('0' + (secs % 60)).slice(-2);
  }

  function startLive(me, opp, mine, label) {
    var g = Engine.start(rosterFor(me.id), rosterFor(opp.id), save.year);
    lv = { g: g, me: me, opp: opp, mine: mine, label: label, da: 0, db: 0, hist: [], feed: [], fq: {}, fo: {}, count: 0, tovM: 0, tovO: 0, plan: null, lastKind: '', done: {}, lastDec: -99, timer: null, skip: false };
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
    court.innerHTML = COURT_SVG;
    lv.pl = []; lv.op = [];
    lv.ids = [];
    COURT_SPOTS.forEach(function (sp, i) {
      var p = g.onH[i].p, o = g.onA[i].p;
      lv.ids.push(p.id + '|' + o.id);
      var d = el('div', 'op', lastName(o.name).slice(0, 3).toUpperCase());
      d.style.left = OPP_SPOTS[i][0] + '%';
      d.style.top = OPP_SPOTS[i][1] + '%';
      court.appendChild(d); lv.op.push(d);
      var b = el('button', 'pl');
      b.type = 'button';
      b.style.left = sp[0] + '%'; b.style.top = sp[1] + '%';
      b.appendChild(makeAvatar(p));
      b.appendChild(el('span', 'nm', lastName(p.name)));
      var pp = el('span', 'pp', '0'); b.appendChild(pp);
      court.appendChild(b); lv.pl.push({ el: b, pp: pp });
    });
    document.getElementById('ticker').textContent = '';
    tickerLine('Tip-off. ' + me.city + ' v ' + opp.city + '.', 'sys');
    document.getElementById('live-dock').textContent = '';
    skipButton();
    show('screen-live');
    lv.timer = setTimeout(liveTick, 900);
  }

  function skipButton() {
    var dock = document.getElementById('live-dock');
    dock.textContent = '';
    var b = el('button', 'btn ghost wide', 'Skip to the final buzzer');
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
    while (t.children.length > 4) t.removeChild(t.lastChild);
  }

  function evText(ev, mine) {
    var who = lastName(ev.who || '');
    if (ev.kind === 'made') return who + ' scores ' + ev.pts + (ev.ast ? ', assist ' + lastName(ev.ast) : '');
    if (ev.kind === 'tov') return who + ' turns it over' + (ev.stl ? ', stolen by ' + lastName(ev.stl) : '');
    if (ev.kind === 'foul') return who + ' is fouled, ' + ev.ftm + ' of ' + ev.fta + ' at the line' + (ev.and1 ? ' and the bucket' : '');
    return who + ' misses' + (ev.blk ? ', blocked by ' + lastName(ev.blk) : '');
  }

  /* Keeps the court dots in step with whoever the sim has on the floor. */
  function syncCourt() {
    var g = lv.g;
    for (var i = 0; i < 5; i++) {
      var p = g.onH[i].p, o = g.onA[i].p, key = p.id + '|' + o.id;
      if (lv.ids[i] === key) continue;
      var slot = lv.pl[i], old = lv.ids[i].split('|');
      lv.ids[i] = key;
      if (old[0] !== p.id) {
        slot.el.textContent = '';
        slot.el.appendChild(makeAvatar(p));
        slot.el.appendChild(el('span', 'nm', lastName(p.name)));
        slot.pp = el('span', 'pp', String(g.onH[i].s.pts));
        slot.el.appendChild(slot.pp);
        slot.el.classList.remove('flash'); void slot.el.offsetWidth; slot.el.classList.add('flash');
      }
      if (old[1] !== o.id) lv.op[i].textContent = lastName(o.name).slice(0, 3).toUpperCase();
    }
  }

  function showPoss(evObj, mineSide) {
    var g = lv.g, ev = evObj.ev;
    syncCourt();
    var list = mineSide ? g.onH : g.onA;
    var idx = -1;
    for (var i = 0; i < 5; i++) if (list[i].p.name === ev.who) idx = i;
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
    for (var i = 0; i < 5; i++) lv.pl[i].pp.textContent = g.onH[i].s.pts;
  }

  /* ---------- timeout decisions: situational, each with its own trade-off ---------- */
  function sumFeed(n, key) { var t = 0; lv.feed.slice(-n).forEach(function (f) { t += f[key]; }); return t; }
  function feedBy(n, who, side) {
    var t = 0;
    lv.feed.slice(-n).forEach(function (f) { if (side === 'm' ? f.mw === who : f.ow === who) t += side === 'm' ? f.mp : f.op; });
    return t;
  }

  function decisionDue() {
    var g = lv.g, diff = g.hs - g.as, d;
    if (g.over) return null;
    if (g.q >= 3 && g.k === g.limit - 1 && Math.abs(diff) <= 5) {
      var key = 'clutch' + g.q;
      if (!lv.done[key]) { lv.done[key] = 1; return { kind: 'clutch' }; }
    }
    if (g.q === 2 && g.k === 0 && !lv.done.half) { lv.done.half = 1; lv.lastDec = g.n; lv.count++; return { kind: 'half' }; }
    if (g.q > 3 || lv.count >= 6 || g.n - lv.lastDec < 9 || g.k < 2 || g.k > g.limit - 3) return null;
    var tries = [];
    g.onH.forEach(function (x) {
      var pf = x.s.pf;
      if (pf >= 4 && !lv.fq[x.p.id + pf]) tries.push({ kind: 'foul', x: x, mark: x.p.id + pf });
    });
    var runDiff = -sumFeed(6, 'mp') + sumFeed(6, 'op');
    if (lv.feed.length >= 6 && runDiff >= 8) tries.push({ kind: 'run', v: runDiff });
    var oh = null;
    g.onA.forEach(function (x) { var v = feedBy(10, x.p.name, 'o'); if (v >= 8 && (!oh || v > oh.v)) oh = { x: x, v: v }; });
    if (oh && !lv.fq['oh' + oh.x.p.id + g.q]) tries.push({ kind: 'oppHot', x: oh.x, v: oh.v, mark: 'oh' + oh.x.p.id + g.q });
    var mh = null;
    g.onH.forEach(function (x) { var v = feedBy(10, x.p.name, 'm'); if (v >= 8 && (!mh || v > mh.v)) mh = { x: x, v: v }; });
    if (mh && !lv.fq['mh' + mh.x.p.id + g.q]) tries.push({ kind: 'myHot', x: mh.x, v: mh.v, mark: 'mh' + mh.x.p.id + g.q });
    g.onH.forEach(function (x) {
      if (x.s.fga >= 7 && x.s.fg / x.s.fga <= 0.22 && x.p.ratings.sco >= 60 && !lv.fq['c' + x.p.id]) tries.push({ kind: 'cold', x: x, mark: 'c' + x.p.id });
    });
    var tov = 0; lv.feed.slice(-8).forEach(function (f) { if (f.mt) tov++; });
    if (tov >= 4) tries.push({ kind: 'sloppy' });
    if (g.q === 3 && Math.abs(diff) <= 8 && g.k >= Math.floor(g.limit * 0.5) && !lv.done.late) tries.push({ kind: 'late', mark: 'late' });
    tries = tries.filter(function (t) { return t.kind !== lv.lastKind || tries.length === 1; });
    if (tries.length) {
      d = tries[Math.floor(Math.random() * tries.length)];
      if (d.mark) { lv.fq[d.mark] = 1; if (d.kind === 'late') lv.done.late = 1; }
      lv.lastDec = g.n; lv.lastKind = d.kind; lv.count++;
      return d;
    }
    if ((g.q === 0 || g.q === 1 || g.q === 3) && g.k === Math.floor(g.limit / 2) && !lv.done['mid' + g.q] && g.n - lv.lastDec >= 14) {
      lv.done['mid' + g.q] = 1; lv.lastDec = g.n; lv.lastKind = 'tempo'; lv.count++;
      return { kind: 'tempo' };
    }
    return null;
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
      tickerLine('Final possession. Who takes the shot?', 'sys');
      dock.appendChild(el('p', 'dec-title', when + '. Tap the player you want to take the last shot.'));
      lv.pl.forEach(function (p, i) {
        p.el.classList.add('pick');
        p.el.onclick = function () {
          lv.pl.forEach(function (q) { q.el.classList.remove('pick'); q.el.onclick = null; });
          g.mods.H = { focus: g.onH[i].p.id, focusW: 60, fgMul: 1.02, until: g.n + 1 };
          tickerLine('Ball to ' + lastName(g.onH[i].p.name) + '...', 'sys');
          skipButton();
          lv.timer = setTimeout(liveTick, 700);
        };
      });
      return;
    }
    var built = buildOptions(spec);
    tickerLine(spec.kind === 'half' ? 'Halftime.' : 'Timeout.', 'sys');
    dock.appendChild(el('p', 'dec-title', built.title + ' ' + (spec.kind === 'half' || spec.kind === 'tempo' ? '' : '(' + when + ')')));
    built.opts.forEach(function (o, i) {
      var b = el('button', 'btn opt' + (i === 0 ? ' primary' : ''));
      b.type = 'button';
      b.appendChild(el('span', null, o.t));
      b.appendChild(el('small', null, o.s));
      b.addEventListener('click', function () {
        var m = scaleMods(o.mods); m.until = g.n + (built.win || o.win);
        g.mods.H = m;
        if (o.extra.rest) g.rest.H[o.extra.rest] = g.n + o.extra.restN;
        lv.plan = { label: o.t, n1: g.n + (built.win || o.win), my0: lv.da, op0: lv.db, tm0: lv.tovM, to0: lv.tovO };
        tickerLine('Plan: ' + o.t + '.', 'sys');
        skipButton();
        lv.timer = setTimeout(liveTick, 500);
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

  function checkPlan() {
    var g = lv.g, p = lv.plan;
    if (!p || g.n < p.n1) return;
    lv.plan = null;
    var my = lv.da - p.my0, op = lv.db - p.op0, net = my - op;
    var verdict = net >= 3 ? 'It worked.' : net <= -3 ? 'It backfired.' : 'A wash.';
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
    if (due) { updateLive(); showDecision(due); return; }
    var evs = Engine.step(g);
    lv.da += evs[0].pts; lv.db += evs[1].pts;
    lv.hist.push(evs[1].pts - evs[0].pts);
    lv.feed.push({ mw: evs[0].ev.who, mp: evs[0].pts, mt: evs[0].ev.kind === 'tov', ow: evs[1].ev.who, op: evs[1].pts, ot: evs[1].ev.kind === 'tov' });
    if (lv.feed.length > 16) lv.feed.shift();
    if (evs[0].ev.kind === 'tov') lv.tovM++;
    if (evs[1].ev.kind === 'tov') lv.tovO++;
    showPoss(evs[0], true);
    checkFouledOut();
    updateLive();
    lv.timer = setTimeout(function () {
      showPoss(evs[1], false);
      checkPlan();
      updateLive();
      if (g.over) {
        tickerLine('Final buzzer.', 'sys');
        lv.timer = setTimeout(finishLive, 1100);
      } else {
        lv.timer = setTimeout(liveTick, reduceMotion ? 60 : 200);
      }
    }, reduceMotion ? 40 : 170);
  }

  function finishLive() {
    clearTimeout(lv.timer);
    var res = Engine.finalize(lv.g);
    completeGame(res, lv.mine, lv.me, lv.opp, lv.label);
  }

  function simDays(n) {
    var guard = 0;
    save.pending = [];
    while (save.phase === 'regular' && n-- > 0 && guard++ < 200) simDay();
    persist();
    renderSeason();
  }

  function simPlayoffs() {
    var guard = 0;
    save.pending = [];
    while (save.phase === 'playoffs' && guard++ < 100) simDay();
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
    wrap.appendChild(el('h3', 'box-title', div + ' Division'));
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
      tr.appendChild(el('td', null, (i + 1) + '. ' + t.city));
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

  function renderSeason() {
    var me = teamById(save.myId);
    var rec = save.rec[me.id];
    var bodyEl = document.getElementById('season-body');
    bodyEl.textContent = '';
    document.getElementById('season-title').textContent = me.city + ' ' + me.name;
    var sub = seasonLabel(save.year) + ' · ' + rec.w + '-' + rec.l + ' · payroll ' + money(League.payroll(save, me.id));
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
      var row = el('div', 'row');
      row.appendChild(teamBadge(opp));
      var tx = el('span');
      tx.appendChild(el('strong', null, (next.home === me.id ? 'vs ' : 'at ') + opp.city + ' ' + opp.name));
      var oprec = save.rec[oppId];
      tx.appendChild(el('span', 'meta', oprec.w + '-' + oprec.l + ' · team rating ' + teamRating(oppId) + ' vs your ' + teamRating(me.id)));
      row.appendChild(tx);
      card.appendChild(el('div', 'group-title', save.phase === 'regular' ? 'Next game · ' + (rec.w + rec.l + 1) + ' of ' + gamesFor(me.id) : Season.roundInfo(save, next.round).name));
      card.appendChild(row);
    } else {
      card.appendChild(el('div', 'group-title', save.phase === 'regular' ? 'Rest day' : Season.inPlayoffs(save, me.id) ? 'Waiting' : 'Out of the playoffs'));
      card.appendChild(el('p', 'sub', save.phase === 'regular' ? 'No game for your team today.' : Season.inPlayoffs(save, me.id) ? 'Your club is resting while the other series finish.' : 'Your season is over. Sim the rest of the playoffs to crown a champion.'));
    }
    bodyEl.appendChild(card);

    if (save.playoffs) {
      bodyEl.appendChild(el('h3', 'box-title', 'Playoffs'));
      var pc = el('div', 'stat-card');
      save.playoffs.rounds.forEach(function (round, ri) {
        pc.appendChild(el('div', 'group-title', Season.roundInfo(save, ri).name));
        round.forEach(function (s) {
          var line = el('div', 'series');
          var an = teamById(s.a).city, bn = teamById(s.b).city;
          line.appendChild(el('span', null, an + ' v ' + bn + ' \u00B7 best of ' + (s.best || Season.roundInfo(save, ri).best) + (s.label ? ' \u00B7 ' + s.label : '')));
          line.appendChild(el('b', null, s.w[0] + '-' + s.w[1] + (s.winner ? ' · ' + teamById(s.winner).city : '')));
          pc.appendChild(line);
        });
      });
      bodyEl.appendChild(pc);
    }

    var st = Season.standings(save);
    var divs = Object.keys(st).sort(function (x, y) {
      var mx = st[x].some(function (r) { return r.id === me.id; }), my = st[y].some(function (r) { return r.id === me.id; });
      return mx === my ? 0 : mx ? -1 : 1;
    });
    bodyEl.appendChild(carousel(divs.map(function (d) { return { title: d + ' Division', node: standingsTable(d, st[d]) }; })));

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
      bodyEl.appendChild(el('p', 'sub', 'Leaders appear once the season gets going.'));
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
    var mast = el('header', 'pp-mast');
    mast.appendChild(el('div', 'pp-name', ev.paper));
    mast.appendChild(el('div', 'pp-meta', ev.date + ' \u00B7 ' + ev.edition + ' EDITION \u00B7 TWO CENTS'));
    pg.appendChild(mast);
    pg.appendChild(el('h2', 'pp-head', ev.head));
    pg.appendChild(el('p', 'pp-deck', ev.deck));
    var fig = el('figure', 'pp-photo');
    fig.hidden = true;
    var cap = el('figcaption', 'pp-cap');
    var tryNext = function (i) {
      if (i >= ev.photos.length) return;
      var c = ev.photos[i], exts = ['png', 'jpg', 'webp'], k = 0, img = new Image();
      img.onload = function () {
        fig.textContent = '';
        fig.appendChild(img);
        cap.textContent = c.name + ' of ' + c.team + ', ' + c.pts + ' points.';
        fig.appendChild(cap);
        fig.hidden = false;
      };
      img.onerror = function () { k++; if (k < exts.length) img.src = 'assets/players/' + c.id + '.' + exts[k]; else tryNext(i + 1); };
      img.alt = c.name;
      img.src = 'assets/players/' + c.id + '.' + exts[0];
    };
    tryNext(0);
    pg.appendChild(fig);
    ev.story.forEach(function (t) { pg.appendChild(el('p', 'pp-p', t)); });
    function section(title, nodes) {
      if (!nodes.length) return;
      var s = el('section', 'pp-sec');
      s.appendChild(el('h3', null, title));
      nodes.forEach(function (n) { s.appendChild(n); });
      pg.appendChild(s);
    }
    if (ev.feat) section('Feat of the day', [el('p', 'pp-p', ev.feat)]);
    section('Around the circuit', ev.scores.map(function (g) {
      var r = el('div', 'pp-score');
      r.appendChild(el('span', null, g.w + ' ' + g.ws + ', ' + g.l + ' ' + g.ls));
      r.appendChild(el('small', null, g.top));
      return r;
    }));
    section('On the wire', ev.briefs.map(function (b) {
      var p = el('p', 'pp-p');
      p.appendChild(el('b', null, b.h + '. '));
      p.appendChild(document.createTextNode(b.t));
      return p;
    }));
    section('Injury list', (ev.injuries || []).map(function (t) { return el('p', 'pp-p', t); }));
    section('The standing', ev.table.map(function (d) {
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
    return pg;
  }

  function renderEvent(ev) {
    var bodyEl = document.getElementById('ev-body');
    var dock = document.getElementById('ev-dock');
    bodyEl.textContent = '';
    dock.textContent = '';
    document.getElementById('ev-title').textContent = 'Today';
    document.getElementById('ev-sub').textContent = Events.dateFor(save) + ' · ' + save.pending.length + (save.pending.length === 1 ? ' item' : ' items') + ' left';
    var card = el('div', 'ev ev-' + ev.kind);
    if (ev.kind === 'paper') {
      card = renderPaper(ev);
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
    trade = { back: returnTo, partner: null, give: {}, get: {}, msg: '' };
    document.getElementById('trade-back').onclick = function () {
      if (trade.partner) { trade.partner = null; renderTrade(); return; }
      if (trade.back === 'off') { renderOff(); show('screen-off'); } else { renderSeason(); show('screen-season'); }
    };
    if (closed) trade.closed = closed;
    renderTrade();
    show('screen-trade');
  }

  function tradeRow(p, selected, onTap) {
    var row = personRow(p, [(p.pos || '') + ' · age ' + p.age + ' · ' + money(p.salary) + ' · ' + (p.yrs <= 0 ? 'expiring' : p.yrs + ' yr' + (p.yrs === 1 ? '' : 's')), 'Potential ' + p.pot], el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr)));
    row.classList.add('pickable');
    row.style.cursor = 'pointer';
    if (selected) row.classList.add('selected');
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
    if (!trade.partner) {
      body.appendChild(el('p', 'sub', 'Pick a club to trade with.'));
      save.ids.filter(function (id) { return id !== me.id; }).forEach(function (id) {
        var t = teamById(id), pl = League.rosterOf(save, id);
        var top = pl.map(function (p) { return p.ratings.ovr; }).sort(function (a, b) { return b - a; }).slice(0, 8);
        var avg = top.length ? Math.round(top.reduce(function (a, b) { return a + b; }, 0) / top.length) : 0;
        var c = el('button', 'card');
        c.type = 'button';
        c.appendChild(teamBadge(t));
        var tx = el('span');
        tx.appendChild(el('strong', null, t.city + ' ' + t.name));
        tx.appendChild(el('span', 'meta', pl.length + ' players · rating ' + avg + ' · payroll ' + money(League.payroll(save, id))));
        c.appendChild(tx);
        c.addEventListener('click', function () { trade.partner = id; trade.give = {}; trade.get = {}; trade.msg = ''; renderTrade(); });
        body.appendChild(c);
      });
      return;
    }
    var mine = League.rosterOf(save, me.id).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    var theirs = League.rosterOf(save, trade.partner).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    function chosen(list, map) { return list.filter(function (p) { return map[p.id]; }); }
    var give = chosen(mine, trade.give), get = chosen(theirs, trade.get);
    var res = League.evaluateTrade(save, me.id, trade.partner, give, get, tradeMax());
    var meter = el('div', 'stat-card');
    meter.appendChild(el('div', 'group-title', 'Their view'));
    var pct = Math.max(0, Math.min(100, Math.round((give.length || get.length ? res.ratio / 1.1 : 0) * 100)));
    meter.appendChild(ratingRow('Interest', Math.min(100, pct)));
    body.appendChild(meter);
    dock.appendChild(el('p', res.ok && !trade.msg ? 'dec-title' : 'note', trade.msg || (give.length || get.length ? res.reason : 'Tap players on both sides to build a deal.')));
    body.appendChild(el('h3', 'box-title', 'You send'));
    mine.forEach(function (p) {
      body.appendChild(tradeRow(p, !!trade.give[p.id], function () { if (trade.give[p.id]) delete trade.give[p.id]; else trade.give[p.id] = 1; trade.msg = ''; renderTrade(); }));
    });
    body.appendChild(el('h3', 'box-title', 'You get'));
    theirs.forEach(function (p) {
      body.appendChild(tradeRow(p, !!trade.get[p.id], function () { if (trade.get[p.id]) delete trade.get[p.id]; else trade.get[p.id] = 1; trade.msg = ''; renderTrade(); }));
    });
    var send = el('button', 'btn primary wide', 'Propose trade');
    send.type = 'button';
    send.disabled = !give.length && !get.length;
    send.addEventListener('click', function () {
      var r = League.evaluateTrade(save, me.id, trade.partner, give, get, tradeMax());
      if (!r.ok) { trade.msg = r.reason; renderTrade(); return; }
      var them = teamById(trade.partner);
      League.executeTrade(save, me.id, trade.partner, give, get);
      give.concat(get).forEach(function (p) { var x = Events.pm(save, p.id); x.m = 55; x.t = 45; });
      var line = 'Trade: ' + me.city + ' send ' + (give.map(function (p) { return lastName(p.name); }).join(', ') || 'nobody') + ' to ' + them.city + ' for ' + (get.map(function (p) { return lastName(p.name); }).join(', ') || 'nothing');
      var mo = Events.mood(save);
      mo.news.push({ text: line, date: Events.dateFor(save) });
      if (mo.news.length > 12) mo.news.shift();
      rosterCache = {};
      persist();
      trade.give = {}; trade.get = {};
      trade.msg = 'Deal done. ' + line.replace('Trade: ', '');
      renderTrade();
    });
    dock.appendChild(send);
    var ask = el('button', 'btn ghost wide', 'What would it take?');
    ask.type = 'button';
    ask.addEventListener('click', function () {
      if (!give.length && !get.length) return;
      if (res.ok) { trade.msg = 'The deal already works for them.'; renderTrade(); return; }
      var add = League.suggestAdd(save, me.id, trade.partner, give, get, tradeMax());
      if (add) { trade.msg = 'They would do it if you add ' + add.map(function (p) { return p.name + ' (' + p.ratings.ovr + ' overall, ' + money(p.salary) + ')'; }).join(' and ') + '.'; }
      else { trade.msg = 'Nothing on your roster would make this work. Ask for less.'; }
      renderTrade();
    });
    dock.appendChild(ask);
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

  function startOffseason() {
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
      title: titleLeader(), allLeague: allLeague()
    };
    save.lg.history.push({ year: save.year, champion: save.champion, rec: review.rec, mvp: review.mvp ? review.mvp.name : null });
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
    Object.keys(save.lg.stats).forEach(function (id) {
      var x = save.lg.stats[id], p = League.byId(save, id);
      if (!p || !x.g) return;
      var c = { y: save.year, t: p.team || null };
      ['g', 'min', 'pts', 'ast', 'trb', 'stl', 'blk', 'tov', 'pf', 'fg', 'fga', 'ft', 'fta'].forEach(function (k) { c[k] = x[k] || 0; });
      (p.career || (p.career = [])).push(c);
    });
    var rep = League.progress(save, me.id);
    League.newSeasonContracts(save);
    save.off = {
      step: 'review', review: review, leagueRetired: rep.leagueRetired,
      dev: rep.mine.map(function (x) { return { id: x.p.id, name: x.p.name, from: x.from, to: x.to, age: x.p.age }; }),
      retired: rep.retired.map(function (x) { return { id: x.p.id, name: x.p.name, ovr: x.ovr }; })
    };
    var hist = History.get(save.year);
    if (hist.length) save.off.fates = hist.map(function (d) { return { id: d.id, choice: 'history', res: {}, applied: false }; });
    rosterCache = {};
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

  function personRow(p, metaLines, right) {
    var row = el('div', 'card');
    row.appendChild(makeAvatar(p));
    var tx = el('span');
    tx.appendChild(el('strong', null, p.name));
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
  function fateDerive(f) {
    var d = fateDef(f), hist = f.choice === 'history';
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
    return { def: d, fold: foldIds, move: move, conflicts: conflicts };
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
    body.appendChild(el('p', 'sub', 'The league needs GMs. Pick the club you want to take over.'));
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
    offHeader('Contracts', money(League.payroll(save, me.id)) + ' payroll · cap ' + money(save.lg.cap));
    var list = League.expiring(save, me.id);
    if (!list.length) {
      body.appendChild(el('p', 'sub', 'No contracts expire this year.'));
    } else {
      body.appendChild(el('p', 'sub', 'These deals have run out. Re-sign them or let them walk into free agency.'));
    }
    list.forEach(function (p) {
      var trust = Events.pm(save, p.id).t;
      var ask = League.ask(save, p, trust);
      var holder = el('div', 'player');
      holder.appendChild(personRow(p, [(p.pos || '') + ' · Age ' + p.age + ' · potential ' + p.pot, 'Asking ' + money(ask) + ' a year' + (trust < 40 ? ' · unhappy with you' : '')], el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr))));
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
          League.startDraft(save, save.ids.map(teamById), d.prospects, 5);
          offStep('draft');
        });
    });
  }

  function offDraft(body, me) {
    var d = save.lg.draft;
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
    offHeader(isDisp ? 'Dispersal draft' : d.year + ' draft', 'Round ' + slot.round + ' · pick ' + slot.pick + ' of ' + d.picks.length);
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
    body.appendChild(el('p', 'sub', 'Players you drafted. They only count against your roster and payroll once you sign them. Unsigned rights are released when the season starts.'));
    var all = el('button', 'btn small', 'Let all go');
    all.type = 'button';
    all.addEventListener('click', function () { list.forEach(function (p) { League.release(save, p); }); persist(); renderOff(); });
    body.appendChild(all);
    list.forEach(function (p) {
      var can = pay + p.salary <= save.lg.cap && n < League.MAX_ROSTER;
      var sg = el('button', 'btn small primary', can ? 'Sign ' + money(p.salary) : (n >= League.MAX_ROSTER ? 'Roster full' : 'Over the cap'));
      sg.type = 'button'; sg.disabled = !can;
      sg.addEventListener('click', function () { League.signRights(save, p); persist(); renderOff(); });
      var rl = el('button', 'btn small', 'Let go');
      rl.type = 'button';
      rl.addEventListener('click', function () { League.release(save, p); persist(); renderOff(); });
      var right = el('span'); right.style.marginLeft = 'auto'; right.appendChild(sg); right.appendChild(rl);
      body.appendChild(personRow(p, [(p.pos || '') + ' \u00B7 age ' + p.age + ' \u00B7 overall ' + p.ratings.ovr, 'Potential ' + p.pot], right));
    });
  }

  function offFA(body, me) {
    var pay = League.payroll(save, me.id), n = League.rosterOf(save, me.id).length;
    offHeader('Free agency', n + ' players · ' + money(pay) + ' of ' + money(save.lg.cap));
    var fa = League.freeAgents(save).slice(0, 30);
    body.appendChild(el('p', 'sub', 'Sign anyone you can fit under the cap. Your drafted rookies are under draft rights below.'));
    rightsSection(body, me);
    fa.forEach(function (p) {
      var ask = League.salaryFor(p.ratings.ovr);
      var can = pay + ask <= save.lg.cap && n < League.MAX_ROSTER;
      var b = el('button', 'btn small', can ? 'Sign ' + money(ask) : (n >= League.MAX_ROSTER ? 'Roster full' : 'Over the cap'));
      b.type = 'button';
      b.disabled = !can;
      b.addEventListener('click', function () { League.sign(save, p, me.id, ask, 2); persist(); renderOff(); });
      var right = el('span'); right.style.marginLeft = 'auto'; right.appendChild(b);
      body.appendChild(personRow(p, [(p.pos || '') + ' · ' + hgtText(p) + ' · age ' + p.age + ' · potential ' + p.pot, 'Overall ' + p.ratings.ovr], right));
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
    if (n > League.MAX_ROSTER || pay > save.lg.cap) {
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
    next.lg = save.lg; next.mood = save.mood;
    next.lg.stats = {}; next.lg.draft = null; next.lg.year = next.year; next.lg.cap = League.capFor(next.year);
    if (next.mood) { next.mood.streak = 0; next.mood.news = next.mood.news.slice(-3); }
    next.pending = [];
    save = next;
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
    continueBtn.disabled = true;
    Promise.all([fetch(era.teams).then(function (r) { return r.json(); }), fetch(era.players).then(function (r) { return r.json(); })])
      .then(function (res) {
        seasons[era.id] = res[0];
        playersByEra[era.id] = res[1];
        rosterCache = {};
        save = data;
        selected = teamById(save.myId);
        if (!save.lg) League.init(save, res[1].players, res[0].teams);
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
