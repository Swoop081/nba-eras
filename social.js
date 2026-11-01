/* The league's social feed. Everything that drops in as a banner lands here too, and the game writes its own posts:
   team accounts, insiders, cap specialists, stat accounts, fans and players, all built from what really happened. */
(function (root) {
  var recent = [];
  function rnd(a) {
    var pool = a;
    if (a.length > 1 && typeof a[0] === 'string') { pool = a.filter(function (x) { return recent.indexOf(x) < 0; }); if (!pool.length) pool = a; }
    var v = pool[Math.floor(Math.random() * pool.length)];
    if (typeof v === 'string' && v.length > 14) { recent.push(v); if (recent.length > 140) recent.shift(); }
    return v;
  }
  function chance(p) { return Math.random() < p; }
  function lastN(n) { var s = String(n || '').split(' '); return s[s.length - 1]; }
  function fix(t, d) { return t.replace(/\{(\w+)\}/g, function (m, k) { return d[k] !== undefined ? d[k] : m; }); }

  /* Invented insiders. A veteran scooper owns the early social years and a younger successor takes the top spot later. */
  var VARGA = { n: 'Dom Varga', h: 'DomVargaHoops' }, OKAFOR = { n: 'Idris Okafor', h: 'IdrisOkaforHoops' };
  var INSIDER_REST = [{ n: 'Hoops Scoop', h: 'hoopsscoop' }, { n: 'Front Office Report', h: 'frontofficerpt' }, { n: 'The Trade Desk', h: 'thetradedesk' }, { n: 'Marisol Reyes', h: 'MarisolReyesNBA' }];
  var curY = 2026;
  function leadInsider(y) { return y >= 2018 ? OKAFOR : VARGA; }
  var INSIDER = { pick: function () {
    var r = Math.random(), lead = leadInsider(curY);
    if (r < 0.62) return lead;
    if (r < 0.7 && curY >= 2018 && curY <= 2022) return VARGA;
    return rnd(INSIDER_REST);
  } };
  var SCOUT = [{ n: 'Draft Room', h: 'draftroom_hoops' }, { n: 'Prospect Ledger', h: 'prospectledger' }, { n: 'Hoops Futures', h: 'hoopsfutures' }];
  var AGENT = [{ n: 'Agent Sources', h: 'agentsources' }, { n: 'Player Reps', h: 'playerreps' }];
  var CAP = [{ n: 'Cap Sheet', h: 'capsheet' }, { n: 'Salary Desk', h: 'salarydesk' }];
  var STATS = [{ n: 'Hoops Numbers', h: 'hoopsnumbers' }, { n: 'Box Score Bureau', h: 'boxscorebureau' }];
  var MEDIA = [{ n: 'Courtside', h: 'courtside' }, { n: 'Hardwood Daily', h: 'hardwooddaily' }, { n: 'Nightly Hoops', h: 'nightlyhoops' }];
  var FANS = [
    { n: 'Section 104', h: 'section104_', p: 'loud' }, { n: 'Upper Bowl Dave', h: 'upperbowl_dave', p: 'doom' }, { n: 'Late Shift Larry', h: 'lateshiftlarry', p: 'joke' },
    { n: 'Court Kay', h: 'courtside_kay', p: 'sharp' }, { n: 'Hardwood Hank', h: 'hardwood_hank', p: 'old' }, { n: 'Dre', h: 'dre_hoops', p: 'loud' },
    { n: 'Priya P.', h: 'priya_p_hoops', p: 'sharp' }, { n: 'Mo Buckets', h: 'mo_buckets', p: 'joke' }, { n: 'Rosa from Row 7', h: 'rosa_row7', p: 'loud' }
  ];

  function feed(save) { if (!save.feed) { save.feed = []; save.feedN = 0; } return save.feed; }
  function team(save, id) { return save.tm && save.tm[id] ? save.tm[id] : null; }
  function tn(save, id) { var t = team(save, id); return t ? t.name : id; }
  function tc(save, id) { var t = team(save, id); return t ? t.city : id; }
  function dl(save) { try { return root.Events ? root.Events.dateFor(save) : ''; } catch (e) { return ''; } }
  function dayKey(save) { return save.phase === 'regular' ? save.day : 200 + (save.pd || 0); }

  function add(save, p) {
    if (save.said) recent = save.said; else save.said = recent;
    curY = save.year || curY;
    var f = feed(save);
    p.id = ++save.feedN;
    p.d = dayKey(save); p.dl = dl(save); p.m = 1 + Math.floor(Math.random() * 11); p.u = 1;
    var big = p.big || 1, base = ({ scout: 4000, agent: 3500, insider: 9000, team: 5000, cap: 2500, stats: 3000, media: 6000, fan: 90, player: 20000, dm: 0 })[p.role] || 100;
    var s = (p.id * 2654435761) % 1000 / 1000;
    p.lk = Math.round(base * (0.3 + s) * big * (p.role === 'fan' ? (0.2 + s * 4) : 1));
    p.rt = Math.round(p.lk * (0.08 + (1 - s) * 0.1));
    p.rp = Math.round(p.lk * (0.04 + s * 0.06));
    f.unshift(p);
    if (f.length > 160) f.length = 160;
    return p.id;
  }

  /* any banner the phone shows is kept here, so a missed one is never lost */
  function fromBanner(save, n) {
    if (!save || n.fed) return n.feedId || 0;
    n.fed = true;
    var role = n.app === 'Breaking' ? 'insider' : n.app === 'Mentions' ? 'fan' : n.app === 'Messages' ? 'dm' : n.app === 'Scores' ? 'media' : n.app === 'Clips' ? 'media' : n.app === 'Result' ? 'dm' : 'media';
    curY = save.year || curY;
    var who = n.app === 'Breaking' ? (n.title && n.title !== 'League Insider' ? n.title : leadInsider(curY).n) : n.title;
    var h = String(who).replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '');
    if (n.app === 'Breaking') { var known = [VARGA, OKAFOR].concat(INSIDER_REST).filter(function (a) { return a.n === who; })[0]; if (known) h = known.h; }
    if (n.app === 'Result') { who = 'Your decision'; h = 'frontoffice'; }
    n.feedId = add(save, { role: role, who: who, h: h, g: n.g, c: n.c, t: n.text + (n.note ? ' (' + n.note + ')' : ''), v: role === 'insider', act: n.act ? n.act.type : '', banner: 1 });
    return n.feedId;
  }

  /* ---------- post makers ---------- */
  function acct(list) { return list.pick ? list.pick() : rnd(list); }
  function post(save, role, a, t, extra) {
    var p = { role: role, who: a.n, h: a.h, t: t, v: role !== 'fan' && role !== 'player' };
    if (a.tid) p.tid = a.tid;
    if (a.pid) { p.pid = a.pid; p.v = true; }
    if (a.g) { p.g = a.g; p.c = a.c; }
    if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    return add(save, p);
  }
  function teamAcct(save, id) { var t = team(save, id); return { n: t ? t.city + ' ' + t.name : id, h: (t ? t.name : id).toLowerCase().replace(/[^a-z0-9]+/g, ''), tid: id }; }
  function playerAcct(p) { return { n: p.name, h: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), pid: p.id }; }
  function fan() { return rnd(FANS); }

  function lineOf(lines, id) { for (var i = 0; i < lines.length; i++) if (lines[i].id === id) return lines[i]; return null; }
  function reb(s) { return (s.orb || 0) + (s.drb || 0); }

  /* the game you just played */
  function myGame(save, g) {
    var me = save.myId, home = g.home === me, opp = home ? g.away : g.home;
    var us = home ? g.hs : g.as, them = home ? g.as : g.hs, won = us > them, margin = Math.abs(us - them);
    var mine = (home ? g.lines.h : g.lines.a).slice().sort(function (a, b) { return b.s.pts - a.s.pts; });
    var theirs = (home ? g.lines.a : g.lines.h).slice().sort(function (a, b) { return b.s.pts - a.s.pts; });
    var star = mine[0], rec = save.rec[me] || { w: 0, l: 0 };
    var m = root.Events ? root.Events.mood(save) : { streak: 0 };
    var C = tc(save, me), O = tc(save, opp), CN = tn(save, me), ON = tn(save, opp);
    var d = { C: C, O: O, CN: CN, ON: ON, us: us, them: them, star: lastN(star.name), pts: star.s.pts, reb: reb(star.s), ast: star.s.ast, fg: star.s.fg, fga: star.s.fga, rec: rec.w + '-' + rec.l, n: Math.abs(m.streak), margin: margin };
    var sp = save.lg.players.filter(function (p) { return p.id === star.id; })[0];

    post(save, 'team', teamAcct(save, me), fix(rnd(won ? [
      'FINAL | {C} {us}, {O} {them}. {star}: {pts} PTS, {reb} REB, {ast} AST.',
      'W. {C} move to {rec}. {star} led the way with {pts}.',
      'That is a win. {us}-{them} over {O}. Back at it soon.',
      '{rec} and counting. {star} had {pts} and the group did the rest.',
      'Done and dusted, {us}-{them}. Thank you to everyone who showed up tonight.',
      '{C} take it, {us}-{them}. {star} finished with {pts} on {fg}-{fga}.',
      'Another one for the {CN}. {star} with {pts}, {reb} boards and {ast} assists.',
      'It is a W. Onto the next.',
      margin >= 15 ? 'Statement night. {C} {us}, {O} {them}.' : 'Closed it out. {C} {us}, {O} {them}.'
    ] : [
      'FINAL | {O} {them}, {C} {us}. {star} had {pts}. We go again.',
      'Not our night. {O} {them}, {C} {us}. Film, reset, next one.',
      '{O} got it done, {them}-{us}. {star} scored {pts}, but we needed more from everywhere else.',
      'L. We are {rec} and we know what has to improve.',
      'Tough finish. {us}-{them}. We will be ready for the next one.',
      'That one stings. {O} {them}, {C} {us}. Hold your heads up and go again.',
      margin <= 4 ? 'Came up just short, {us}-{them}. Credit to {O}.' : 'Tough one at home and on the road alike. {them}-{us}. Back to work.'
    ]), d), { score: won ? 'W' : 'L' });
    if (chance(0.55)) post(save, 'team', teamAcct(save, opp), fix(rnd(won ? ['Tonight did not go our way. {them}-{us} to {C}. On to the next.', '{C} {us}, {O} {them}. We will be better.', 'Credit to {C}. They were the better team tonight, {us}-{them}.', 'We ran out of gas against {C}. Back in the lab tomorrow.', 'Hats off to {C}, {us}-{them}. We travel on.'] : ['W. {O} {them}, {C} {us}. Big night from {ostar}.', 'FINAL | {O} {them}, {C} {us}. That is how we play.']), Object.assign({ ostar: lastN(theirs[0].name) }, d)));

    /* fans: praise and backlash that match what happened */
    var f1 = fan(), worst = mine.filter(function (l) { return l.s.fga >= 8; }).sort(function (a, b) { return a.s.fg / a.s.fga - b.s.fg / b.s.fga; })[0];
    var fp = [];
    if (won) {
      fp.push('{star} was incredible tonight. {pts} and it never felt forced. {CN} fans, we are eating.', 'Front office has this team cooking. {rec} and it is not luck.', margin >= 15 ? 'That was not a game, that was a clinic. {us}-{them}.' : 'My heart cannot take these finishes but I am here for it. {CN}!', d.n >= 4 ? '{n} in a row. Somebody wake the city up, this is real.' : 'Good win. Not perfect, but good.', '{star} again. How many more nights like this before people believe?', 'This bench is quietly winning us games. Say it with me: depth.', 'That was a fun one. {rec} and the vibes are immaculate.', 'Ok I take back everything I said last week. {CN} are for real.');
    } else {
      fp.push(margin >= 15 ? 'Embarrassing. {them} to {us}. Nobody on the bench has any ideas?' : 'Lost by {margin}. Every. Single. Time. This team finds a way.', worst && worst.s.fg / worst.s.fga < 0.3 ? lastN(worst.name) + ' is ' + worst.s.fg + '-for-' + worst.s.fga + ' and still shooting. Please, someone take the ball away.' : 'I want to see changes. The rotation, the plan, anything.', d.n >= 3 ? '{n} straight losses. Somebody has to answer for this.' : 'One game. Relax. We bounce back.', 'Told you the bench is the problem.', 'Lineup changes. Immediately. I am not asking again.', 'We were so close to something good and then we just stopped playing.', 'Defence, anyone? Anyone? Hello?', 'I will be at the next one anyway, and that is the problem.');
    }
    post(save, 'fan', f1, fix(rnd(fp), d));
    if (chance(0.7)) post(save, 'fan', fan(), fix(rnd(won ? ['{CN} {us}, {ON} {them}. Good. Moving on to tomorrow.', 'Win is a win. Check the standings later.', 'Ok but can we talk about {star}?? ' + d.pts + ' points.', 'Fell asleep in the third, woke up to a W. Take it.', 'Season ticket holders eating well tonight.', 'Nobody tell the group chat I said it, but this team is fun.'] : ['Take the loss and learn something. See you Sunday.', 'Not panicking. Panicking is for the group chat.', 'Waiting for the GM to say something about this.', 'Switching off the replay. Back tomorrow.', 'The record says one thing, the effort says another. Stay patient.', 'Every season has these nights. Just not this many.']), d));

    /* a player speaks */
    if (sp && chance(0.8)) {
      var pt = won ? (star.s.pts >= 30 ? ['Special night. Thank you to the fans for the energy. 🙌', 'My teammates found me all night. Team win.', 'Feels good. Keep stacking these.', 'Credit to the coaches and the guys who set the screens. All of it starts there.', 'Home crowd was loud. We fed off it.', 'Got to keep it going. Next one.'] : ['Team win. On to the next one.', 'Love this group. Everybody counted.', 'Locked in. Win, eat, sleep, repeat.', 'That is what we are capable of when we play together.']) : ['We will be better. That one is on all of us.', 'Rough night. Back in the gym tomorrow.', 'Credit to ' + ON + '. We go again.', 'Own it. Fix it. Next.', 'Heard you, fans. We will give you more.'];
      post(save, 'player', playerAcct(sp), rnd(pt));
    }

    /* the numbers */
    var tdd = [star.s.pts, reb(star.s), star.s.ast].filter(function (x) { return x >= 10; }).length;
    if (tdd >= 3) post(save, 'stats', acct(STATS), 'TRIPLE-DOUBLE | ' + star.name + ': ' + star.s.pts + ' PTS, ' + reb(star.s) + ' REB, ' + star.s.ast + ' AST in the ' + CN + ' ' + (won ? 'win' : 'loss') + '.', { big: 2 });
    else if (star.s.pts >= 35) post(save, 'stats', acct(STATS), star.name + ' dropped ' + star.s.pts + ' on ' + star.s.fg + '-' + star.s.fga + ' shooting' + (star.s.tp ? ' with ' + star.s.tp + ' threes' : '') + '. ' + CN + ' ' + (won ? 'win' : 'lose') + ', ' + us + '-' + them + '.', { big: 1.6 });
    if (theirs[0] && theirs[0].s.pts >= 38) post(save, 'stats', acct(STATS), tc(save, opp) + '’s ' + theirs[0].name + ' went for ' + theirs[0].s.pts + ' against ' + CN + '. ' + (won ? 'And they still won.' : 'It was not enough to stop him.'), { big: 1.4 });

    if (Math.abs(m.streak) >= 5) post(save, 'media', acct(MEDIA), m.streak > 0 ? 'The ' + CN + ' have now won ' + m.streak + ' straight. League insiders say the front office is not touching a thing.' : 'The ' + CN + ' have dropped ' + (-m.streak) + ' in a row. Pressure is building in ' + C + '.', { big: 1.3 });

    /* cap talk now and then */
    var gp = rec.w + rec.l;
    if (gp > 0 && gp % 6 === 0 && root.League) capPost(save);
  }

  function capPost(save) {
    var L = root.League, me = save.myId, cap = save.lg.cap, pay = L.payroll(save, me), C = tc(save, me), CN = tn(save, me);
    var ex = save.lg.players.filter(function (p) { return p.team === me && p.status === 'active' && p.yrs <= 1; }).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; })[0];
    var over = pay - cap;
    var t = over > 0 ? 'The ' + CN + ' are ' + L.money(over, cap) + ' over the cap at ' + L.money(pay, cap) + '. Any deal has to send out at least as much salary as it brings back.'
      : 'The ' + CN + ' sit at ' + L.money(pay, cap) + ', ' + L.money(-over, cap) + ' under the cap. ' + (-over > cap * 0.03 ? 'Real room to make a move.' : 'Not much wiggle room.');
    if (ex && chance(0.6)) t += ' ' + ex.name + ' (' + L.money(ex.salary, cap) + ') comes off the books after this season.';
    post(save, 'cap', acct(CAP), t);
    /* and a look at another club */
    var other = save.ids.filter(function (id) { return id !== me; }).map(function (id) { return { id: id, pay: L.payroll(save, id) }; }).sort(function (a, b) { return b.pay - a.pay; })[0];
    if (other && other.pay > cap) post(save, 'cap', acct(CAP), 'League-high payroll belongs to ' + tc(save, other.id) + ' at ' + L.money(other.pay, cap) + ', ' + L.money(other.pay - cap, cap) + ' over the cap. Expect them to look for relief.');
  }

  /* the rest of the league on a given day */
  function around(save, games, inj) {
    var me = save.myId, others = games.filter(function (g) { return g.home !== me && g.away !== me; });
    var best = null, boom = null;
    others.forEach(function (g) {
      var margin = Math.abs(g.hs - g.as);
      if (!boom || margin > boom.m) boom = { g: g, m: margin };
      ['h', 'a'].forEach(function (s) { (g.lines[s] || []).forEach(function (l) { if (!best || l.s.pts > best.l.s.pts) best = { l: l, g: g, side: s }; }); });
    });
    if (best && best.l.s.pts >= 38) {
      var t = best.side === 'h' ? best.g.home : best.g.away;
      post(save, 'media', acct(MEDIA), best.l.name + ' (' + tc(save, t) + ') erupts for ' + best.l.s.pts + ' points, ' + best.l.s.fg + ' of ' + best.l.s.fga + ' from the floor.', { big: 1.8, pid: best.l.id });
    }
    if (boom && boom.m >= 22) {
      var w = boom.g.hs > boom.g.as ? boom.g.home : boom.g.away, lz = w === boom.g.home ? boom.g.away : boom.g.home;
      post(save, 'media', acct(MEDIA), rnd(['{W} ' + Math.max(boom.g.hs, boom.g.as) + ', {L} ' + Math.min(boom.g.hs, boom.g.as) + '. That one was over by halftime.', '{L} will want to burn the tape after a ' + boom.m + '-point loss to {W}.', '{W} put {L} away early. ' + boom.m + ' points was the final margin.', 'Starters sat the fourth in {W}. {L} never really got going.']).replace('{W}', tc(save, w)).replace(/\{L\}/g, tc(save, lz)));
    }
    (inj || []).slice(0, 2).forEach(function (i) {
      if (i.games < 4) return;
      post(save, 'insider', acct(INSIDER), 'Sources: ' + i.name + ' (' + tc(save, i.team) + ') is expected to miss ' + (i.games >= 30 ? 'the rest of the season' : i.games + ' games') + ' with a ' + rnd(['sprained ankle', 'hamstring strain', 'knee injury', 'wrist injury', 'back issue', 'calf strain']) + '.', { v: true, big: 1.3 });
    });
    var wire = (save.lg.wire || []).filter(function (w) { return w.d === save.day && w.y === save.year; }).slice(0, 2);
    wire.forEach(function (w) { post(save, chance(0.5) ? 'insider' : 'media', acct(chance(0.5) ? INSIDER : MEDIA), 'Transaction wire: ' + w.t, { big: 1.1 }); });
    if (chance(0.22)) rumour(save);
    if (chance(0.12)) around.power(save);
    if (chance(0.18)) fanChatter(save);
  }
  around.power = function (save) {
    var rows = save.ids.map(function (id) { var r = save.rec[id]; return { id: id, w: r.w, l: r.l }; }).filter(function (r) { return r.w + r.l >= 6; }).sort(function (a, b) { return b.w / (b.w + b.l) - a.w / (a.w + a.l); }).slice(0, 3);
    if (rows.length < 3) return;
    post(save, 'media', acct(MEDIA), 'Best records in the league right now: ' + rows.map(function (r) { return tc(save, r.id) + ' (' + r.w + '-' + r.l + ')'; }).join(', ') + '.');
  };

  function rumour(save) {
    var me = save.myId;
    var cand = save.lg.players.filter(function (p) { return p.team && p.status === 'active' && p.ratings.ovr >= 64; });
    if (!cand.length) return;
    var p = rnd(cand), t2 = rnd(save.ids.filter(function (id) { return id !== p.team; }));
    var mine = p.team === me;
    post(save, 'insider', acct(INSIDER), rnd(mine ? [
      'Sources: several teams have asked the ' + tn(save, me) + ' about ' + p.name + '. No deal is close.',
      'The ' + tn(save, t2) + ' like ' + p.name + ' and have checked in with ' + tc(save, me) + '. Talks are early.',
      'Calls are coming in on ' + p.name + '. The ' + tn(save, me) + ' are listening but not selling.'
    ] : [
      'The ' + tn(save, p.team) + ' have been listening on offers for ' + p.name + ' (' + p.ratings.ovr + ' overall). The ' + tn(save, t2) + ' are one of the teams interested.',
      p.name + ' is on the radar for contenders, per league sources. ' + tc(save, p.team) + ' wants a first-round pick in return.',
      'Nothing is close, but ' + tc(save, t2) + ' has made multiple calls about ' + p.name + '.',
      tc(save, t2) + ' has asked about ' + p.name + ' more than once, I am told. ' + tc(save, p.team) + ' has not said no.',
      'Teams around the league view ' + p.name + ' as gettable if the offer is right. The ' + tn(save, p.team) + ' are in no rush.'
    ]), { v: true, big: mine ? 1.5 : 1, pid: mine ? p.id : undefined });
  }

  function fanChatter(save) {
    var me = save.myId, ros = save.lg.players.filter(function (p) { return p.team === me && p.status === 'active'; }).sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    if (!ros.length) return;
    var p = rnd(ros.slice(0, 6)), x = save.lg.stats && save.lg.stats[p.id], C = tn(save, me);
    var lines = [
      'Hot take: ' + lastN(p.name) + ' is a top-10 player in this league. Fight me.',
      'Can we please get ' + lastN(p.name) + ' more touches in the fourth?',
      'Unpopular opinion: this ' + C + ' team is a contender if the bench holds up.',
      'Counting down the days until the trade deadline. Please, do something.',
      'Just bought a ' + lastN(p.name) + ' jersey. Do not jinx it.',
      'Whoever is designing the late-game plays deserves a raise. Or a firing. I cannot decide.',
      'Ticket prices up again and we still cannot find a backup point guard. Wild.',
      'Our bench is better than half the starting fives in this league. Say what you want.',
      'The ' + C + ' should extend ' + lastN(p.name) + ' now before it costs double.',
      'Rewatching the fourth quarter from last week. Still mad about it.',
      'If the ' + C + ' make the playoffs, I am calling in sick. Both rounds.'
    ];
    if (x && x.g >= 8 && x.fga >= 40) lines.push(lastN(p.name) + ' is shooting ' + Math.round(100 * x.fg / x.fga) + '% and getting roasted for it. He is fine. Relax.');
    post(save, 'fan', fan(), rnd(lines));
  }

  /* a whole day: yours and everybody else's */
  function day(save, games, inj) {
    try {
      if (save.said) recent = save.said; else save.said = recent;
      feed(save);
      games.forEach(function (g) { if (g.home === save.myId || g.away === save.myId) myGame(save, g); });
      around(save, games, inj);
    } catch (e) { /* the feed never breaks a game */ }
  }

  /* what your decisions did */
  function react(save, kind, d) {
    try {
      if (save.said) recent = save.said; else save.said = recent;
      feed(save);
      var ln = lastN(d.name || ''), C = tc(save, save.myId), CN = tn(save, save.myId);
      var m = {
        backed: [['fan', fan(), 'GM publicly backing ' + ln + '. Bold. Let us see if it pays off.'], ['media', acct(MEDIA), 'The ' + CN + ' are sticking with ' + d.name + ' despite the slump.']],
        cut: [['fan', fan(), ln + ' losing minutes? Finally someone is listening.'], ['insider', acct(INSIDER), 'Sources: ' + d.name + ' will see a smaller role for now. The ' + CN + ' want to see more from him.']],
        sit: [['fan', fan(), ln + ' sits tonight. Message sent.']],
        minutes: [['fan', fan(), ln + ' getting real minutes. About time.'], ['media', acct(MEDIA), d.name + ' is set for a bigger role as ' + C + ' try to ride the hot hand.']],
        extend: [['team', teamAcct(save, save.myId), 'OFFICIAL | ' + d.name + ' signs a ' + d.years + '-year extension with the ' + CN + '.'], ['insider', acct(INSIDER), 'Sources: ' + d.name + ' has agreed to a ' + d.years + '-year extension with ' + C + ', worth about ' + d.salary + ' a season.'], ['cap', acct(CAP), d.name + '’s new deal pushes the ' + CN + ' payroll to ' + d.payroll + '.']],
        sign: [['team', teamAcct(save, save.myId), 'OFFICIAL | The ' + CN + ' sign ' + d.name + '.'], ['insider', acct(INSIDER), 'Sources: ' + d.name + ' lands with ' + C + ' on a ' + d.salary + ' deal.']],
        owner: [['insider', acct(INSIDER), 'Ownership pressure is building in ' + C + '. The GM has been told what is expected.']],
        trade: [['team', teamAcct(save, save.myId), 'OFFICIAL | ' + d.text], ['insider', acct(INSIDER), 'Sources: ' + d.text], ['fan', fan(), 'Trade grade? ' + rnd(['B+', 'C', 'A-', 'incomplete', 'we will see in a month']) + '.']]
      }[kind] || [];
      m.forEach(function (x) { post(save, x[0], x[1], x[2], { v: x[0] !== 'fan' }); });
    } catch (e) {}
  }


  /* ---------- the draft ---------- */
  function ordn(n) { var k = n % 100; return n + (k >= 11 && k <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'); }
  function mon(save, x) { var r = root.League; return r ? r.money(x, save.lg.cap) : String(x); }
  function draftOpen(save) {
    try {
      var d = save.lg.draft; if (!d || d.posted || !has(save.year) || d.kind === 'dispersal') return;
      d.posted = 1; if (save.said) recent = save.said; else save.said = recent;
      var top = d.pool.filter(function (p) { return p.status === 'prospect'; }).sort(function (a, b) { return b.board - a.board; }).slice(0, 3);
      if (top.length < 3) return;
      var first = d.picks[0] && d.picks[0].team, mine = d.picks.filter(function (k) { return k.team === save.myId; })[0];
      post(save, 'scout', acct(SCOUT), rnd([
        'Top of the board: ' + top.map(function (p) { return p.name + ' (' + (p.pos || '') + ', ' + p.age + ')'; }).join(', ') + '. Scouts are split on the order.',
        'Final big board: 1. ' + top[0].name + ', 2. ' + top[1].name + ', 3. ' + top[2].name + '. The rest of the first round is wide open.',
        'Three names every team has circled: ' + top.map(function (p) { return lastN(p.name); }).join(', ') + '. Everyone else is a debate.'
      ]), { v: true, big: 1.4 });
      if (first) post(save, 'insider', acct(INSIDER), rnd([
        tc(save, first) + ' are on the clock at No. 1. ' + lastN(top[0].name) + ' has been the name in the building for weeks.',
        'Sources: ' + tc(save, first) + ' have narrowed the first pick to ' + lastN(top[0].name) + ' and ' + lastN(top[1].name) + '.'
      ]), { big: 1.6 });
      if (mine) post(save, 'fan', fan(), rnd(['We pick at ' + mine.pick + '. Please, no reaches this year.', 'Draft night. Every year I think this is the one. I have a good feeling.', 'If the front office trades the pick I am done.']));
    } catch (e) {}
  }
  function draftPick(save, p, slot) {
    try {
      if (!has(save.year) || !slot) return;
      if (save.said) recent = save.said; else save.said = recent;
      var mine = slot.team === save.myId, n = slot.pick || 0, C = tc(save, slot.team), CN = tn(save, slot.team);
      if (!mine && n > 8 && !(n <= 20 && p.board && p.board >= 66)) return;
      var info = (p.pos || '') + (p.college ? ', ' + p.college : '') + ', ' + p.age;
      if (mine) {
        post(save, 'team', teamAcct(save, save.myId), 'OFFICIAL | With the ' + ordn(n) + ' pick, the ' + CN + ' select ' + p.name + ' (' + info + ').', { v: true, big: 1.4 });
        post(save, 'scout', acct(SCOUT), rnd([
          p.name + ' to ' + C + ': scouts had him at ' + (p.scout ? p.scout.ovr : p.ratings.ovr) + ' now with a ceiling of ' + (p.scout ? p.scout.pot : p.pot) + '. ' + (n <= 5 ? 'A big swing at the top.' : 'Solid value at ' + n + '.'),
          'Grade: ' + rnd(['A-', 'B+', 'B', 'A', 'B-', 'C+']) + ' for ' + C + ' on ' + lastN(p.name) + '. ' + (p.age <= 19 ? 'Young, with room to grow.' : 'Closer to ready than most of the class.')
        ]));
        post(save, 'fan', fan(), rnd([lastN(p.name) + '!!! I will take it. Draft room finally listened.', 'Who? ... ok I looked him up. I like it.', 'A ' + p.age + '-year-old with that tape? Cannot complain.', 'Reach? We will see. Trust the process, I guess.']));
      } else {
        post(save, 'insider', acct(INSIDER), rnd([
          'Sources: ' + C + ' select ' + p.name + ' with the ' + ordn(n) + ' pick.',
          p.name + ' (' + info + ') is headed to ' + C + ' at No. ' + n + ', per sources.'
        ]), { v: true, big: n <= 3 ? 1.9 : 1.2 });
        if (n <= 5 || chance(0.4)) post(save, 'scout', acct(SCOUT), rnd([
          lastN(p.name) + ' at ' + n + ': ' + (p.scout ? p.scout.ovr : p.ratings.ovr) + ' overall with a ' + (p.scout ? p.scout.pot : p.pot) + ' ceiling in the eyes of scouts. ' + C + ' get a ' + (p.age <= 19 ? 'raw, high-upside' : 'polished') + ' prospect.',
          C + ' takes ' + p.name + ' at No. ' + n + '. ' + (n > 12 ? 'That is where the board said he should go.' : 'He was never going to slide.')
        ]));
      }
    } catch (e) {}
  }
  function rightsSigned(save, p) {
    try {
      if (!has(save.year)) return;
      if (save.said) recent = save.said; else save.said = recent;
      post(save, 'team', teamAcct(save, save.myId), 'OFFICIAL | The ' + tn(save, save.myId) + ' sign first-round pick ' + p.name + '.', { v: true });
      if (chance(0.7)) post(save, 'agent', acct(AGENT), rnd(['Rookie deal done for ' + p.name + '. His camp is happy to be in ' + tc(save, save.myId) + '.', p.name + ' signs with ' + tc(save, save.myId) + '. Everything is lined up for summer league.']));
    } catch (e) {}
  }

  /* ---------- free agency ---------- */
  function faOpen(save) {
    try {
      if (!has(save.year) || save.lg.faPosted === save.year) return;
      save.lg.faPosted = save.year; if (save.said) recent = save.said; else save.said = recent;
      var L = root.League, fa = L.freeAgents(save).slice(0, 4), cap = save.lg.cap;
      if (fa.length < 3) return;
      post(save, 'insider', acct(INSIDER), rnd([
        'The market opens with ' + fa.slice(0, 3).map(function (p) { return p.name; }).join(', ') + ' at the top. Several teams are clearing room.',
        'Free agency preview: ' + fa[0].name + ' is the headliner. ' + lastN(fa[1].name) + ' and ' + lastN(fa[2].name) + ' are right behind him.'
      ]), { big: 1.7 });
      post(save, 'agent', acct(AGENT), fa[0].name + '’s camp is asking for roughly ' + mon(save, L.salaryFor(fa[0].ratings.ovr)) + ' a year, and he is in no hurry to decide.', { big: 1.1 });
      var rich = save.ids.map(function (id) { return { id: id, room: cap - L.payroll(save, id) }; }).sort(function (a, b) { return b.room - a.room; }).slice(0, 3);
      if (rich[0].room > 0) post(save, 'cap', acct(CAP), 'Teams with the most cap space heading into July: ' + rich.map(function (r) { return tc(save, r.id) + ' (' + mon(save, Math.max(0, r.room)) + ')'; }).join(', ') + '.');
      var me = cap - L.payroll(save, save.myId);
      post(save, 'cap', acct(CAP), me > 0 ? 'The ' + tn(save, save.myId) + ' have ' + mon(save, me) + ' to work with this summer. ' + (me > cap * 0.08 ? 'That buys a real piece.' : 'That is depth money, not star money.') : 'The ' + tn(save, save.myId) + ' are over the cap this summer, so it is minimum deals and trades.');
      post(save, 'fan', fan(), rnd(['Free agency week. Ready to be disappointed again.', 'Sign ' + lastN(fa[0].name) + '. I do not care what it costs. Actually I do. But sign him.', 'Inbox is full of "sources say". None of it is us. Classic.']));
    } catch (e) {}
  }
  function faSigned(save, p, salary, years) {
    try {
      if (!has(save.year)) return;
      react(save, 'sign', { name: p.name, salary: salary });
      if (p.ratings.ovr >= 70) post(save, 'agent', acct(AGENT), p.name + ' picked ' + tc(save, save.myId) + ' over other suitors. ' + years + ' years, and he wanted to be here.');
    } catch (e) {}
  }

  function unread(save) { return (save.feed || []).filter(function (p) { return p.u; }).length; }
  function markRead(save) { (save.feed || []).forEach(function (p) { p.u = 0; }); }

  /* the feed only exists in the social-media era */
  function has(year) { return year >= 2009; }

  root.Social = { draftOpen: draftOpen, draftPick: draftPick, rightsSigned: rightsSigned, faOpen: faOpen, faSigned: faSigned, lead: function (y) { return leadInsider(y).n; }, has: has, add: add, fromBanner: fromBanner, day: day, react: react, capPost: capPost, unread: unread, markRead: markRead, feed: feed };
})(window);
