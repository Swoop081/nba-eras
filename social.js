/* The league's social feed. Everything that drops in as a banner lands here too, and the game writes its own posts:
   team accounts, insiders, cap specialists, stat accounts, fans and players, all built from what really happened. */
(function (root) {
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function chance(p) { return Math.random() < p; }
  function lastN(n) { var s = String(n || '').split(' '); return s[s.length - 1]; }
  function fix(t, d) { return t.replace(/\{(\w+)\}/g, function (m, k) { return d[k] !== undefined ? d[k] : m; }); }

  var INSIDER = [{ n: 'League Insider', h: 'leagueinsider' }, { n: 'Hoops Scoop', h: 'hoopsscoop' }, { n: 'Front Office Report', h: 'frontofficerpt' }, { n: 'The Trade Desk', h: 'thetradedesk' }];
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
    var f = feed(save);
    p.id = ++save.feedN;
    p.d = dayKey(save); p.dl = dl(save); p.m = 1 + Math.floor(Math.random() * 11); p.u = 1;
    var big = p.big || 1, base = ({ insider: 9000, team: 5000, cap: 2500, stats: 3000, media: 6000, fan: 90, player: 20000, dm: 0 })[p.role] || 100;
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
    var who = n.app === 'Breaking' ? (n.title || 'League Insider') : n.title;
    var h = String(who).replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '');
    if (n.app === 'Result') { who = 'Your decision'; h = 'frontoffice'; }
    n.feedId = add(save, { role: role, who: who, h: h, g: n.g, c: n.c, t: n.text + (n.note ? ' (' + n.note + ')' : ''), v: role === 'insider', act: n.act ? n.act.type : '', banner: 1 });
    return n.feedId;
  }

  /* ---------- post makers ---------- */
  function acct(list) { return rnd(list); }
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
      margin >= 15 ? 'Statement night. {C} {us}, {O} {them}.' : 'Closed it out. {C} {us}, {O} {them}.'
    ] : [
      'FINAL | {O} {them}, {C} {us}. {star} had {pts}. We go again.',
      'Not our night. {O} {them}, {C} {us}. Film, reset, next one.',
      margin <= 4 ? 'Came up just short, {us}-{them}. Credit to {O}.' : 'Tough one at home and on the road alike. {them}-{us}. Back to work.'
    ]), d), { score: won ? 'W' : 'L' });
    if (chance(0.55)) post(save, 'team', teamAcct(save, opp), fix(rnd(won ? ['Tonight did not go our way. {them}-{us} to {C}. On to the next.', '{C} {us}, {O} {them}. We will be better.'] : ['W. {O} {them}, {C} {us}. Big night from {ostar}.', 'FINAL | {O} {them}, {C} {us}. That is how we play.']), Object.assign({ ostar: lastN(theirs[0].name) }, d)));

    /* fans: praise and backlash that match what happened */
    var f1 = fan(), worst = mine.filter(function (l) { return l.s.fga >= 8; }).sort(function (a, b) { return a.s.fg / a.s.fga - b.s.fg / b.s.fga; })[0];
    var fp = [];
    if (won) {
      fp.push('{star} was incredible tonight. {pts} and it never felt forced. {CN} fans, we are eating.', 'Front office has this team cooking. {rec} and it is not luck.', margin >= 15 ? 'That was not a game, that was a clinic. {us}-{them}.' : 'My heart cannot take these finishes but I am here for it. {CN}!', d.n >= 4 ? '{n} in a row. Somebody wake the city up, this is real.' : 'Good win. Not perfect, but good.');
    } else {
      fp.push(margin >= 15 ? 'Embarrassing. {them} to {us}. Nobody on the bench has any ideas?' : 'Lost by {margin}. Every. Single. Time. This team finds a way.', worst && worst.s.fg / worst.s.fga < 0.3 ? lastN(worst.name) + ' is ' + worst.s.fg + '-for-' + worst.s.fga + ' and still shooting. Please, someone take the ball away.' : 'I want to see changes. The rotation, the plan, anything.', d.n >= 3 ? '{n} straight losses. Somebody has to answer for this.' : 'One game. Relax. We bounce back.', 'Told you the bench is the problem.');
    }
    post(save, 'fan', f1, fix(rnd(fp), d));
    if (chance(0.7)) post(save, 'fan', fan(), fix(rnd(won ? ['{CN} {us}, {ON} {them}. Good. Moving on to tomorrow.', 'Win is a win. Check the standings later.', 'Ok but can we talk about {star}?? ' + d.pts + ' points.'] : ['Take the loss and learn something. See you Sunday.', 'Not panicking. Panicking is for the group chat.', 'Waiting for the GM to say something about this.']), d));

    /* a player speaks */
    if (sp && chance(0.8)) {
      var pt = won ? (star.s.pts >= 30 ? ['Special night. Thank you to the fans for the energy. 🙌', 'My teammates found me all night. Team win.', 'Feels good. Keep stacking these.'] : ['Team win. On to the next one.', 'Love this group. Everybody counted.']) : ['We will be better. That one is on all of us.', 'Rough night. Back in the gym tomorrow.', 'Credit to ' + ON + '. We go again.'];
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
      post(save, 'media', acct(MEDIA), rnd(['{W} ' + Math.max(boom.g.hs, boom.g.as) + ', {L} ' + Math.min(boom.g.hs, boom.g.as) + '. That one was over by halftime.', '{L} will want to burn the tape after a ' + boom.m + '-point loss to {W}.']).replace('{W}', tc(save, w)).replace(/\{L\}/g, tc(save, lz)));
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
      'The ' + tn(save, t2) + ' like ' + p.name + ' and have checked in with ' + tc(save, me) + '. Talks are early.'
    ] : [
      'The ' + tn(save, p.team) + ' have been listening on offers for ' + p.name + ' (' + p.ratings.ovr + ' overall). The ' + tn(save, t2) + ' are one of the teams interested.',
      p.name + ' is on the radar for contenders, per league sources. ' + tc(save, p.team) + ' wants a first-round pick in return.',
      'Nothing is close, but ' + tc(save, t2) + ' has made multiple calls about ' + p.name + '.'
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
      'Just bought a ' + lastN(p.name) + ' jersey. Do not jinx it.'
    ];
    if (x && x.g >= 8 && x.fga >= 40) lines.push(lastN(p.name) + ' is shooting ' + Math.round(100 * x.fg / x.fga) + '% and getting roasted for it. He is fine. Relax.');
    post(save, 'fan', fan(), rnd(lines));
  }

  /* a whole day: yours and everybody else's */
  function day(save, games, inj) {
    try {
      feed(save);
      games.forEach(function (g) { if (g.home === save.myId || g.away === save.myId) myGame(save, g); });
      around(save, games, inj);
    } catch (e) { /* the feed never breaks a game */ }
  }

  /* what your decisions did */
  function react(save, kind, d) {
    try {
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

  function unread(save) { return (save.feed || []).filter(function (p) { return p.u; }).length; }
  function markRead(save) { (save.feed || []).forEach(function (p) { p.u = 0; }); }

  /* the feed only exists in the social-media era */
  function has(year) { return year >= 2009; }

  root.Social = { has: has, add: add, fromBanner: fromBanner, day: day, react: react, capPost: capPost, unread: unread, markRead: markRead, feed: feed };
})(window);
