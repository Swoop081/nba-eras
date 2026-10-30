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

  /* Uses assets/photos/<player-id>.jpg (or .png / .webp) when present. */
  function makeAvatar(p) {
    var wrap = el('span', 'avatar');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.appendChild(el('span', null, playerInitials(p.name)));
    var exts = ['jpg', 'png', 'webp'];
    var i = 0;
    var img = new Image();
    img.onload = function () { wrap.textContent = ''; wrap.appendChild(img); };
    img.onerror = function () { next(); };
    function next() {
      if (i < exts.length) img.src = 'assets/photos/' + p.id + '.' + exts[i++];
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
      text.appendChild(el('span', 'meta', (p.pos ? p.pos + ' · ' : '') + 'Age ' + (p.age || '?') + ' · ' + p.g + ' G'));
      text.appendChild(el('span', 'meta', ppg + ' pts · ' + apg + ' ast per game'));
      card.appendChild(text);
      card.appendChild(el('span', 'ovr ' + level(p.ratings.ovr), String(p.ratings.ovr)));
      var detail = el('div', 'detail');
      detail.hidden = true;
      detail.appendChild(ratingRow('Scoring', p.ratings.sco));
      detail.appendChild(ratingRow('Shooting', p.ratings.sht));
      detail.appendChild(ratingRow('Playmaking', p.ratings.ply));
      detail.appendChild(ratingRow('Durability', p.ratings.dur));
      card.addEventListener('click', function () {
        detail.hidden = !detail.hidden;
        holder.classList.toggle('open', !detail.hidden);
      });
      holder.appendChild(card);
      holder.appendChild(detail);
      list.appendChild(holder);
    });
    if (squad.length) {
      list.appendChild(el('p', 'sub', 'Ratings are derived from each player’s ' + currentEra.years + ' stats. Rosters show where players started the season.'));
    }
  }

  document.getElementById('btn-roster').addEventListener('click', function () {
    if (!selected) return;
    loadPlayers(function (data) {
      renderRoster(selected, data);
      show('screen-roster');
    });
  });

  /* ---------- start ---------- */
  show('screen-title');
  playIntro();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
