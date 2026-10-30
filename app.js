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
    { id: '1946', years: '1946-47', title: 'The Founding Season', blurb: 'The Basketball Association of America, the league the NBA counts as its first. 11 teams, 60 games, no shot clock, no salary cap.', open: true, teams: 'data/teams-1946.json', players: 'data/players-1946.json' },
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

  function renderRoster(team, data) {
    var list = document.getElementById('roster-list');
    list.textContent = '';
    document.getElementById('roster-title').textContent = team.city + ' ' + team.name;
    var squad = data ? data.players.filter(function (p) { return p.teamId === team.id; }) : [];
    document.getElementById('roster-sub').textContent = squad.length + ' players · ' + currentEra.years;
    if (!data) {
      document.getElementById('roster-sub').textContent = currentEra.years;
      list.textContent = 'Player data for this season has not been added yet.';
      return;
    }
    squad.forEach(function (p) {
      var holder = el('div', 'player');
      var card = el('button', 'card');
      card.type = 'button';
      card.appendChild(makeAvatar(p));
      var text = el('span');
      text.appendChild(el('strong', null, p.name));
      var ppg = p.g ? (p.pts / p.g).toFixed(1) : '0.0';
      var apg = p.g ? (p.ast / p.g).toFixed(1) : '0.0';
      text.appendChild(el('span', 'meta', (p.pos ? p.pos + ' · ' : '') + (p.hgt ? Math.floor(p.hgt / 12) + '\'' + (p.hgt % 12) + '\" · ' : '') + 'Age ' + (p.age || '?') + ' · ' + p.g + ' G'));
      text.appendChild(el('span', 'meta', ppg + ' pts · ' + apg + ' ast per game'));
      card.appendChild(text);
      card.appendChild(el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr)));
      var detail = el('div', 'detail');
      detail.hidden = true;
      var groups = [
        ['Offence', [['Scoring', 'sco'], ['Shooting', 'sht'], ['Free throws', 'ft'], ['Three-pointers', 'tpt'], ['Playmaking', 'ply'], ['Ball security', 'tov'], ['Off. rebounding', 'orb']]],
        ['Defence', [['Def. rebounding', 'drb'], ['Steals', 'stl'], ['Blocks', 'blk'], ['Discipline', 'fou']]],
        ['Physical', [['Durability', 'dur']]]
      ];
      groups.forEach(function (g) {
        detail.appendChild(el('div', 'group-title', g[0]));
        g[1].forEach(function (r) { detail.appendChild(ratingRow(r[0], p.ratings[r[1]])); });
      });
      card.addEventListener('click', function () {
        detail.hidden = !detail.hidden;
        holder.classList.toggle('open', !detail.hidden);
      });
      holder.appendChild(card);
      holder.appendChild(detail);
      list.appendChild(holder);
    });
    if (squad.length) {
      list.appendChild(el('p', 'sub', 'Ratings are built from each player’s ' + currentEra.years + ' stats, with three-pointers, rebounds, steals, blocks and turnovers modelled for the match engine. Rosters show where players started the season.'));
    }
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

  function renderMatch(me, opp, res, year, label) {
    clearTimeout(matchTimer);
    var bodyEl = document.getElementById('match-body');
    var dockEl = document.getElementById('match-dock');
    bodyEl.textContent = '';
    dockEl.hidden = true;
    document.getElementById('match-title').textContent = me.city + ' vs ' + opp.city;
    document.getElementById('match-sub').textContent = label || currentEra.years;
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
      bodyEl.appendChild(el('p', 'sub', 'This box score only shows what the league recorded in ' + currentEra.years + '. Later eras add rebounds, steals, blocks and more.'));
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
    matchTimer = setTimeout(step, reduceMotion ? 0 : 600);
  }



  /* ---------- season ---------- */
  var save = null;
  var pendingAfterMatch = false;
  var rosterCache = {};
  function persist() { store.set('save', save); }
  function teamById(id) {
    return seasons[currentEra.id].teams.filter(function (t) { return t.id === id; })[0];
  }
  function rosterOf(id) {
    if (!rosterCache[id]) {
      rosterCache[id] = playersByEra[currentEra.id].players.filter(function (p) { return p.teamId === id; });
    }
    return rosterCache[id];
  }
  function teamRating(id) {
    var r = rosterOf(id).map(function (p) { return p.ratings.ovr; }).sort(function (a, b) { return b - a; }).slice(0, 8);
    return r.length ? Math.round(r.reduce(function (a, b) { return a + b; }, 0) / r.length) : 0;
  }
  function rosterFor(id) {
    return id === save.myId ? Events.moraleRoster(save, rosterOf(id)) : rosterOf(id);
  }
  function simGame(g) {
    var r = Engine.simulate(rosterFor(g.home), rosterFor(g.away), save.year);
    return { home: g.home, away: g.away, hs: r.home, as: r.away, series: g.series };
  }
  function simDay() {
    var results = Season.today(save).map(simGame);
    results.forEach(function (g) {
      if (g.home !== save.myId && g.away !== save.myId) return;
      var us = g.home === save.myId ? g.hs : g.as, them = g.home === save.myId ? g.as : g.hs;
      Events.afterGame(save, teamById(save.myId), null, rosterOf(save.myId), us > them);
    });
    Season.record(save, results);
    if (save.phase !== 'regular') save.pd = (save.pd || 0) + 1;
  }
  function eraStart(id) { return ERAS.filter(function (e) { return e.id === id; })[0]; }

  function startSeason() {
    var data = seasons[currentEra.id];
    loadPlayers(function (pl) {
      if (!pl) return;
      rosterCache = {};
      save = Season.create(currentEra.id, parseInt(currentEra.years, 10), data.teams, selected.id, data.games || 60);
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
    var res = Engine.simulate(rosterFor(me.id), rosterOf(oppId), save.year);
    var mineResult = {
      home: mine.home, away: mine.away, series: mine.series,
      hs: mine.home === me.id ? res.home : res.away,
      as: mine.home === me.id ? res.away : res.home
    };
    var others = Season.today(save).filter(function (g) {
      return g.home !== me.id && g.away !== me.id;
    }).map(simGame);
    var label = save.phase === 'regular'
      ? 'Game ' + (save.rec[me.id].w + save.rec[me.id].l + 1) + ' · ' + (mine.home === me.id ? 'home' : 'away')
      : Season.ROUNDS[mine.round].name;
    Season.record(save, others.concat([mineResult]));
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
    save.pending = Events.generate(save, { me: me, opp: opp, res: res, us: us, them: them, rosterMe: rosterOf(me.id), label: label, seriesLine: seriesLine, others: others2 });
    persist();
    pendingAfterMatch = true;
    renderMatch(me, opp, res, save.year, label);
    show('screen-match');
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
    var sub = currentEra.years + ' · ' + rec.w + '-' + rec.l;
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
      card.appendChild(el('p', 'sub', champ.id === me.id ? 'You won the title. The new league champions.' : 'Champions of ' + currentEra.years + '. Your season is over.'));
      card.appendChild(el('p', 'sub', 'The next season, with player development and the draft, comes later.'));
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
      card.appendChild(el('div', 'group-title', save.phase === 'regular' ? 'Next game · ' + (rec.w + rec.l + 1) + ' of ' + (save.days.length - 6 > 0 ? 60 : save.days.length) : Season.ROUNDS[next.round].name));
      card.appendChild(row);
    } else {
      card.appendChild(el('div', 'group-title', save.phase === 'regular' ? 'Rest day' : 'Out of the playoffs'));
      card.appendChild(el('p', 'sub', save.phase === 'regular' ? 'No game for your team today.' : 'Your season is over. Sim the rest of the playoffs to crown a champion.'));
    }
    bodyEl.appendChild(card);

    if (save.playoffs) {
      bodyEl.appendChild(el('h3', 'box-title', 'Playoffs'));
      var pc = el('div', 'stat-card');
      save.playoffs.rounds.forEach(function (round, ri) {
        pc.appendChild(el('div', 'group-title', Season.ROUNDS[ri].name + ' · best of ' + Season.ROUNDS[ri].best));
        round.forEach(function (s) {
          var line = el('div', 'series');
          var an = teamById(s.a).city, bn = teamById(s.b).city;
          line.appendChild(el('span', null, an + ' v ' + bn));
          line.appendChild(el('b', null, s.w[0] + '-' + s.w[1] + (s.winner ? ' · ' + teamById(s.winner).city : '')));
          pc.appendChild(line);
        });
      });
      bodyEl.appendChild(pc);
    }

    var st = Season.standings(save);
    Object.keys(st).forEach(function (d) { bodyEl.appendChild(standingsTable(d, st[d])); });

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
      renderRoster(me, playersByEra[currentEra.id]);
      show('screen-roster');
    });
    bodyEl.appendChild(rb);
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

  function renderEvent(ev) {
    var bodyEl = document.getElementById('ev-body');
    var dock = document.getElementById('ev-dock');
    bodyEl.textContent = '';
    dock.textContent = '';
    document.getElementById('ev-title').textContent = 'Today';
    document.getElementById('ev-sub').textContent = Events.dateFor(save) + ' · ' + save.pending.length + (save.pending.length === 1 ? ' item' : ' items') + ' left';
    var card = el('div', 'ev ev-' + ev.kind);
    if (ev.kind === 'news') {
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
        continueBtn.disabled = false;
        if (save.pending && save.pending.length) openEvents();
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
