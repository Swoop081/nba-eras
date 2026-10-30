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

  function renderRoster(team) {
    var list = document.getElementById('roster-list');
    list.textContent = '';
    document.getElementById('roster-title').textContent = team.city + ' ' + team.name;
    var squad = League.rosterOf(save, team.id).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    var pay = League.payroll(save, team.id);
    document.getElementById('roster-sub').textContent = squad.length + ' players · ' + money(pay) + ' of ' + money(save.lg.cap) + ' cap';
    squad.forEach(function (p) {
      var holder = el('div', 'player');
      var card = el('button', 'card');
      card.type = 'button';
      card.appendChild(makeAvatar(p));
      var text = el('span');
      text.appendChild(el('strong', null, p.name));
      var st = save.lg.stats[p.id];
      var line = st && st.g ? (st.pts / st.g).toFixed(1) + ' pts · ' + (st.ast / st.g).toFixed(1) + ' ast · ' + st.g + ' G' : (p.g ? (p.pts / p.g).toFixed(1) + ' pts · ' + (p.ast / p.g).toFixed(1) + ' ast (last season)' : 'No games yet');
      text.appendChild(el('span', 'meta', (p.pos ? p.pos + ' · ' : '') + (p.hgt ? Math.floor(p.hgt / 12) + '\'' + (p.hgt % 12) + '\" · ' : '') + 'Age ' + (p.age || '?')));
      text.appendChild(el('span', 'meta', money(p.salary) + ' · ' + (p.yrs <= 0 ? 'expiring' : p.yrs + (p.yrs === 1 ? ' yr' : ' yrs') + ' left')));
      text.appendChild(el('span', 'meta', line));
      card.appendChild(text);
      card.appendChild(el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr)));
      var detail = el('div', 'detail');
      detail.hidden = true;
      detail.appendChild(ratingRow('Potential', p.pot));
      var groups = [
        ['Offence', [['Scoring', 'sco'], ['Shooting', 'sht'], ['Free throws', 'ft'], ['Three-pointers', 'tpt'], ['Playmaking', 'ply'], ['Ball security', 'tov'], ['Off. rebounding', 'orb']]],
        ['Defence', [['Def. rebounding', 'drb'], ['Steals', 'stl'], ['Blocks', 'blk'], ['Discipline', 'fou']]],
        ['Physical', [['Durability', 'dur']]]
      ];
      groups.forEach(function (g) {
        detail.appendChild(el('div', 'group-title', g[0]));
        g[1].forEach(function (r) { detail.appendChild(ratingRow(r[0], p.ratings[r[1]])); });
      });
      if (team.id === save.myId) {
        var rel = el('button', 'btn ghost wide', 'Release ' + p.name);
        rel.type = 'button';
        var armed = false;
        rel.addEventListener('click', function () {
          if (squad.length <= 5) { rel.textContent = 'You need at least 5 players'; return; }
          if (!armed) { armed = true; rel.textContent = 'Tap again to release ' + p.name; return; }
          League.release(save, p);
          persist();
          renderRoster(team);
        });
        detail.appendChild(rel);
      }
      card.addEventListener('click', function () {
        detail.hidden = !detail.hidden;
        holder.classList.toggle('open', !detail.hidden);
      });
      holder.appendChild(card);
      holder.appendChild(detail);
      list.appendChild(holder);
    });
    list.appendChild(el('p', 'sub', 'Salaries are estimates except where the record is known (Joe Fulks earned $8,000). Ratings are built from real ' + currentEra.years + ' stats, with rebounds, steals, blocks and turnovers modelled.'));
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
    var seg = el('div', 'seg');
    var note = el('p', 'sub');
    var cur = store.get('fates', 'history');
    function paint() {
      seg.textContent = '';
      [['history', 'Keep history'], ['alt', 'Change history']].forEach(function (o) {
        var b = el('button', 'btn small' + (cur === o[0] ? ' primary' : ''), o[1]);
        b.type = 'button';
        b.addEventListener('click', function () { cur = o[0]; store.set('fates', cur); paint(); });
        seg.appendChild(b);
      });
      var doomed = selected && DOOMED[selected.id];
      note.textContent = cur === 'history'
        ? 'After 1946-47 Cleveland, Detroit, Pittsburgh and Toronto fold, Baltimore joins, and the league has 8 clubs.' + (doomed ? ' Your franchise is one of the four. You would take over another club after the season.' : '')
        : 'Nobody folds. Baltimore joins as the 12th club.';
    }
    paint();
    box.appendChild(seg);
    box.appendChild(note);
    var anchor = document.getElementById('btn-play');
    card.insertBefore(box, anchor);
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
    if (!save.fates) save.fates = 'alt';
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
    return id === save.myId ? Events.moraleRoster(save, rosterOf(id)) : rosterOf(id);
  }
  function simGame(g) {
    var r = Engine.simulate(rosterFor(g.home), rosterFor(g.away), save.year);
    if (save.phase === 'regular') League.accumulate(save, r.homeLines.concat(r.awayLines));
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
      League.init(save, pl.players, data.teams);
      save.fates = store.get('fates', 'history');
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
    if (save.phase === 'regular') League.accumulate(save, res.homeLines.concat(res.awayLines));
    var others = Season.today(save).filter(function (g) {
      return g.home !== me.id && g.away !== me.id;
    }).map(simGame);
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
    renderMatch(me, opp, res, save.year, label, true);
    show('screen-match');
  }

  /* ---------- live match ---------- */
  var lv = null;
  var COURT_SPOTS = [[50, 36], [20, 50], [80, 50], [34, 74], [66, 74]];
  var COURT_SVG = '<svg class="lines" viewBox="0 0 100 90" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="86"/><rect x="34" y="2" width="32" height="38"/><circle cx="50" cy="40" r="10"/><path d="M12 2v14a38 38 0 0 0 76 0V2"/><circle cx="50" cy="9" r="2.4"/><path d="M44 5h12"/></svg>';

  function lastName(n) { var p = n.split(' '); return p[p.length - 1]; }
  function periodLabel(g) { return g.q < 4 ? 'Q' + (g.q + 1) : (g.q === 4 ? 'OT' : 'OT' + (g.q - 3)); }
  function clockText(g) {
    var total = g.q < 4 ? 12 : 5, secs = Math.round((1 - g.k / g.limit) * total * 60);
    return Math.floor(secs / 60) + ':' + ('0' + (secs % 60)).slice(-2);
  }

  function startLive(me, opp, mine, label) {
    var g = Engine.start(rosterFor(me.id), rosterOf(opp.id), save.year);
    lv = { g: g, me: me, opp: opp, mine: mine, label: label, da: 0, db: 0, hist: [], done: {}, lastDec: -99, timer: null, skip: false };
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
    COURT_SPOTS.forEach(function (sp, i) {
      var p = g.H[i].p, o = g.A[i].p;
      var d = el('div', 'op', lastName(o.name).slice(0, 3).toUpperCase());
      d.style.left = (sp[0] + (50 - sp[0]) * 0.45) + '%';
      d.style.top = (sp[1] - 17) + '%';
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

  function showPoss(evObj, mineSide) {
    var g = lv.g, ev = evObj.ev;
    var list = mineSide ? g.H : g.A;
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
    for (var i = 0; i < 5; i++) lv.pl[i].pp.textContent = g.H[i].s.pts;
  }

  function decisionDue() {
    var g = lv.g, key;
    if (g.over) return null;
    var diff = g.hs - g.as;
    if (g.q >= 3 && g.k === g.limit - 1 && Math.abs(diff) <= 5) {
      key = 'clutch' + g.q;
      if (!lv.done[key]) { lv.done[key] = 1; return 'clutch'; }
    }
    if (g.q < 4 && g.k === Math.floor(g.limit / 2)) {
      key = 'mid' + g.q;
      if (!lv.done[key]) { lv.done[key] = 1; lv.lastDec = g.n; return 'mid'; }
    }
    var run = 0, h = lv.hist.slice(-6);
    h.forEach(function (d) { run += d; });
    if (h.length === 6 && run >= 8 && g.n - lv.lastDec >= 10 && g.k < g.limit - 2) {
      lv.lastDec = g.n; lv.hist = []; return 'run';
    }
    return null;
  }

  function hotLine(x) { return x.s.pts + ' pts, ' + x.s.fg + '-' + x.s.fga; }

  function showDecision(kind) {
    var g = lv.g, dock = document.getElementById('live-dock');
    dock.textContent = '';
    var mineTop = g.H.slice(0, 5).slice().sort(function (a, b) { return b.s.pts - a.s.pts || b.p.ratings.sco - a.p.ratings.sco; })[0];
    var oppTop = g.A.slice(0, 5).slice().sort(function (a, b) { return b.s.pts - a.s.pts || b.p.ratings.sco - a.p.ratings.sco; })[0];
    var when = periodLabel(g) + ' ' + clockText(g) + ' · ' + lv.me.city + ' ' + g.hs + ', ' + lv.opp.city + ' ' + g.as;
    if (kind === 'clutch') {
      tickerLine('Final possession. Who takes the shot?', 'sys');
      dock.appendChild(el('p', 'dec-title', when + '. Tap the player you want to take the last shot.'));
      lv.pl.forEach(function (p, i) {
        p.el.classList.add('pick');
        p.el.onclick = function () {
          lv.pl.forEach(function (q) { q.el.classList.remove('pick'); q.el.onclick = null; });
          g.mods.H = { focus: g.H[i].p.id, focusW: 60, fgMul: 1.02, until: g.n + 1 };
          tickerLine('Ball to ' + lastName(g.H[i].p.name) + '...', 'sys');
          skipButton();
          lv.timer = setTimeout(liveTick, 700);
        };
      });
      return;
    }
    tickerLine(kind === 'run' ? 'Timeout. ' + lv.opp.city + ' are on a run.' : 'Timeout.', 'sys');
    dock.appendChild(el('p', 'dec-title', when + (kind === 'run' ? ' · ' + lv.opp.city + ' on a run. Your call.' : ' · What is the plan?')));
    var opts = [
      { t: 'Feed ' + lastName(mineTop.p.name), s: hotLine(mineTop) + ' · more shots for him', mods: { focus: mineTop.p.id, focusW: 5 } },
      { t: 'Push the pace', s: 'Fast breaks, but more turnovers', mods: { fgMul: 1.04, tovAdd: 0.03 } },
      { t: 'Lock down ' + lastName(oppTop.p.name), s: hotLine(oppTop) + ' · tougher defence, more fouls', mods: { oppFgMul: 0.92, foulAdd: 0.05 } }
    ];
    opts.forEach(function (o, i) {
      var b = el('button', 'btn opt' + (i === 0 ? ' primary' : ''));
      b.type = 'button';
      b.appendChild(el('span', null, o.t));
      b.appendChild(el('small', null, o.s));
      b.addEventListener('click', function () {
        var m = o.mods; m.until = g.n + 8;
        g.mods.H = m;
        tickerLine('Plan: ' + o.t + '.', 'sys');
        skipButton();
        lv.timer = setTimeout(liveTick, 500);
      });
      dock.appendChild(b);
    });
  }

  function liveTick() {
    var g = lv.g;
    var due = decisionDue();
    if (due) { updateLive(); showDecision(due); return; }
    var evs = Engine.step(g);
    lv.da += evs[0].pts; lv.db += evs[1].pts;
    lv.hist.push(evs[1].pts - evs[0].pts);
    showPoss(evs[0], true);
    updateLive();
    lv.timer = setTimeout(function () {
      showPoss(evs[1], false);
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
      card.appendChild(el('div', 'group-title', save.phase === 'regular' ? 'Rest day' : 'Out of the playoffs'));
      card.appendChild(el('p', 'sub', save.phase === 'regular' ? 'No game for your team today.' : 'Your season is over. Sim the rest of the playoffs to crown a champion.'));
    }
    bodyEl.appendChild(card);

    if (save.playoffs) {
      bodyEl.appendChild(el('h3', 'box-title', 'Playoffs'));
      var pc = el('div', 'stat-card');
      save.playoffs.rounds.forEach(function (round, ri) {
        pc.appendChild(el('div', 'group-title', Season.roundInfo(save, ri).name + ' · best of ' + Season.roundInfo(save, ri).best));
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

    var ld = League.leaders(save, 'pts', 3, 10);
    if (ld.length) {
      bodyEl.appendChild(el('h3', 'box-title', 'Scoring leaders'));
      var lc = el('div', 'stat-card headlines');
      ld.forEach(function (r) {
        var d = el('div', null, r.p.name + ' \u00B7 ' + r.v.toFixed(1) + ' per game');
        d.appendChild(el('small', null, (r.p.team ? teamById(r.p.team).city : 'Free agent') + ' \u00B7 ' + r.g + ' games'));
        lc.appendChild(d);
      });
      bodyEl.appendChild(lc);
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


  /* ---------- off-season ---------- */
  var offSel = null;

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
      mvp: best ? { id: best.p.id, name: best.p.name } : null
    };
    save.lg.history.push({ year: save.year, champion: save.champion, rec: review.rec, mvp: review.mvp ? review.mvp.name : null });
    var rep = League.progress(save, me.id);
    League.newSeasonContracts(save);
    save.off = {
      step: 'review', review: review, leagueRetired: rep.leagueRetired,
      dev: rep.mine.map(function (x) { return { id: x.p.id, name: x.p.name, from: x.from, to: x.to, age: x.p.age }; }),
      retired: rep.retired.map(function (x) { return { id: x.p.id, name: x.p.name, ovr: x.ovr }; })
    };
    var hist = History.get(save.year);
    if (hist) {
      var foldIds = save.fates === 'history' ? hist.fold.filter(function (id) { return save.ids.indexOf(id) >= 0; }) : [];
      save.off.fate = { fold: foldIds, join: hist.join, news: hist.news, myFolded: foldIds.indexOf(me.id) >= 0 };
    }
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
    offDock(save.off.fate ? 'League news' : 'Contracts', function () { offStep(save.off.fate ? 'fates' : 'contracts'); });
  }


  function offFates(body, me) {
    var f = save.off.fate;
    offHeader('League news', 'Off-season');
    var card = el('div', 'stat-card');
    card.appendChild(el('div', 'group-title', 'Franchise changes'));
    if (f.fold.length) {
      card.appendChild(el('p', 'sub', f.news));
      f.fold.forEach(function (id) {
        var t = teamById(id), row = el('div', 'row');
        row.appendChild(teamBadge(t));
        row.appendChild(el('strong', null, t.city + ' ' + t.name + ' fold' + (id === me.id ? ' (your club)' : '')));
        card.appendChild(row);
      });
    } else {
      card.appendChild(el('p', 'sub', 'The Baltimore Bullets join the league as its next club. Every other franchise survives.'));
    }
    f.join.forEach(function (t0) {
      var t = save.tm[t0.id] || t0, row = el('div', 'row');
      row.appendChild(teamBadge(t));
      row.appendChild(el('strong', null, t.city + ' ' + t.name + ' join'));
      card.appendChild(row);
    });
    body.appendChild(card);
    if (f.myFolded) body.appendChild(el('p', 'note', 'Your franchise has folded. You will take over one of the remaining clubs.'));
    offDock('Continue', function () {
      applyFates();
      offStep(f.myFolded ? 'newclub' : (f.fold.length ? 'dispersal' : 'contracts'));
    });
  }

  function applyFates() {
    var f = save.off.fate;
    if (f.applied) return;
    f.applied = true;
    f.join.forEach(function (t) {
      save.tm[t.id] = t;
      if (save.ids.indexOf(t.id) < 0) save.ids.push(t.id);
      save.rec[t.id] = { w: 0, l: 0 };
      League.makeVeterans(save, t.id, 10, 52, 66);
    });
    f.fold.forEach(function (id) { save.ids.splice(save.ids.indexOf(id), 1); });
    if (f.fold.length) {
      var teams = save.ids.map(teamById);
      League.startDispersal(save, teams, f.fold, f.join.map(function (t) { return t.id; }), 5);
    }
    rosterCache = {};
    persist();
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
        save.off.fate.myFolded = false;
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

  function offFA(body, me) {
    var pay = League.payroll(save, me.id), n = League.rosterOf(save, me.id).length;
    offHeader('Free agency', n + ' players · ' + money(pay) + ' of ' + money(save.lg.cap));
    var fa = League.freeAgents(save).slice(0, 30);
    body.appendChild(el('p', 'sub', 'Sign anyone you can fit under the cap. Rookies you drafted are already on your roster.'));
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
    League.aiRosterPass(save, teams, me.id);
    var next = Season.create(save.eraId, save.year + 1, teams, save.myId, teams.length <= 8 ? 48 : 60);
    next.tm = save.tm; next.fates = save.fates; next.ids = save.ids.slice();
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
