/* NBA Eras daily event stack: headlines, radio, fan letters, rumours and conversations.
   Pure functions. Mood lives in save.mood so it is saved with the season. */
(function (root) {
  var recent = [];
  function rnd(a) {
    var pool = a;
    if (a.length > 1 && typeof a[0] === 'string') { pool = a.filter(function (x) { return recent.indexOf(x) < 0; }); if (!pool.length) pool = a; }
    var v = pool[Math.floor(Math.random() * pool.length)];
    if (typeof v === 'string' && v.length > 14) { recent.push(v); if (recent.length > 140) recent.shift(); }
    return v;
  }
  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  function last(name) {
    var p = String(name).split(' ');
    while (p.length > 1 && /^(jr|sr|ii|iii|iv|v)\.?$/i.test(p[p.length - 1])) p.pop();
    return p[p.length - 1];
  }
  function fill(t, d) { return t.replace(/\{(\w+)\}/g, function (m, k) { return d[k] !== undefined ? d[k] : m; }); }

  var MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  function dateFor(save) {
    var off = save.phase === 'regular' ? Math.round(save.day * 2.2) : 145 + (save.pd || 0) * 2;
    var d = new Date(Date.UTC(save.year, 10, 1 + off));
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
  }

  function mood(save) {
    if (!save.mood) save.mood = { p: {}, coach: 50, fans: 50, streak: 0, cool: { conv: 0, rumour: 0 }, news: [] };
    var m = save.mood;
    if (!m.follow) m.follow = [];
    if (!m.posts) m.posts = [];
    if (!m.tweak) m.tweak = {};
    if (!m.cool.act) m.cool.act = 0;
    return m;
  }
  function pm(save, id) {
    var m = mood(save);
    if (!m.p[id]) m.p[id] = { m: 60, t: 50 };
    return m.p[id];
  }

  /* Ratings scaled by morale: roughly +/-5% at the extremes. */
  function moraleRoster(save, players) {
    return players.map(function (p) {
      var tw = mood(save).tweak[p.id];
      var f = (1 + (pm(save, p.id).m - 50) * 0.001) * (tw ? tw.f : 1);
      var r = {};
      Object.keys(p.ratings).forEach(function (k) {
        r[k] = (k === 'ovr' || k === 'dur') ? p.ratings[k] : Math.min(99, p.ratings[k] * f);
      });
      return Object.assign({}, p, { ratings: r });
    });
  }

  var VOICE = {
    1946: {
      win: ['{C} Quintet Downs {O}, {us}-{them}', '{star} Scores {pts} As {C} Tops {O}', '{C} Cagers Take Measure Of {O}'],
      close: ['{C} Edges {O} {us}-{them} In Thriller', '{star} Leads {C} To Narrow Win Over {O}', '{C} Survives Late Scare From {O}'],
      blow: ['{C} Routs {O}, {us}-{them}', '{O} Crushed By {C} Five', '{C} Runs Wild Against {O}'],
      loss: ['{O} Hands {C} Setback, {them}-{us}', '{C} Cagers Stumble Before {O}', '{O} Cools Off {C} Five'],
      lclose: ['{O} Nips {C}, {them}-{us}', '{C} Falls Just Short Against {O}', '{star} Scores {pts} In Vain As {C} Drops Close One'],
      lblow: ['{C} Humbled By {O}, {them}-{us}', '{O} Overwhelms {C} Five'],
      desk: 'Sports Desk', paper: 'The Daily Sentinel', announcer: 'The announcer', hall: 'the Garden'
    },
    2026: {
      win: ['{C} Handle {O}, {us}-{them}', '{star} Drops {pts} As {C} Beat {O}', '{C} Get Past {O}', '{star} Leads {C} Past {O}', '{C} Pull Away From {O}', '{C} Take Down {O}, {us}-{them}', '{O} Fall To {C}'],
      close: ['{C} Edge {O}, {us}-{them}, In Thriller', '{star} Leads {C} To Narrow Win Over {O}', '{C} Survive Late Push From {O}', '{C} Hold Off {O} In Tight One', '{O} Fall Just Short Against {C}', '{star} Delivers In The Clutch As {C} Win'],
      blow: ['{C} Roll Past {O}, {us}-{them}', '{O} Blown Out By {C}', '{C} Run Away From {O}', '{C} Dominate {O}', '{C} Make A Statement Against {O}', '{O} Never Had A Chance Against {C}'],
      loss: ['{O} Beat {C}, {them}-{us}', '{C} Fall To {O}', '{O} Get The Better Of {C}', '{C} Stumble Against {O}', '{star} Not Enough As {C} Lose', '{O} Pull Away To Beat {C}'],
      lclose: ['{O} Edge {C}, {them}-{us}', '{C} Come Up Just Short Against {O}', '{star} Scores {pts} In Vain As {C} Drop Close One', '{C} Let One Slip Against {O}', '{O} Survive {C}, {them}-{us}', '{C} Fall Short In Late Duel With {O}'],
      lblow: ['{C} Run Over By {O}, {them}-{us}', '{O} Blow Out {C}', '{O} Rout {C}', '{C} Overwhelmed By {O}', '{O} Roll Over {C}'],
      desk: 'Sports Desk', paper: 'The Courtside Report', announcer: 'The broadcast', hall: 'the arena', modern: true, period: PERIOD_M_FLAG(),
      radio: ['{n} hits another! That is {x} points tonight and the building is on its feet!', 'And {n} from the wing, good! {x} for him now and nobody can slow him down!', 'You are watching something special. {n} has {x} points and he is not done!'],
      radioAst: '{n} with another dime, that is {x} assists tonight. He sees the whole floor!',
      fanHot: ['I have had season tickets for twenty years and this is the most fun I have had. Keep it going!', 'The whole city is talking about the {C}. Make room on the bandwagon!'],
      fanCold: ['Three straight losses. Is anyone in the front office watching these games?', 'I want a refund on my League Pass. Fix this team!'],
      fanWin: ['Great night at {hall}. The team gave us our money\'s worth.', 'Took my kid to the game and he got a high five from {star}. He will talk about it for a year.'],
      fanLoss: ['Forty dollars for parking and a loss to boot. Come on!', 'The team looked tired out there. Rest the guys, I say.'],
      fanNames: ['A Season Ticket Holder', 'Section 104', 'Longtime Fan', 'Upper Bowl Charlie', 'Mrs. Annie Kowalski']
    }
  };
  function PERIOD_M_FLAG() { return true; }
  function voice(year) { return year >= 1979 ? VOICE[2026] : (VOICE[year] || VOICE[1946]); }

  /* ---------- after-game mood changes ---------- */
  function afterGame(save, me, mine, rosterMe, won) {
    var m = mood(save);
    m.streak = won ? Math.max(1, m.streak + 1) : Math.min(-1, m.streak - 1);
    m.fans = clamp(m.fans + (won ? 2 : -2));
    var ranked = rosterMe.slice().sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    ranked.forEach(function (p, i) {
      var x = pm(save, p.id);
      var mn = save.plan && save.plan.minutes;
      if (i < 5) x.m = clamp(x.m + (won ? 0.8 : -0.8) + (mn === 'heavy' ? -0.2 : mn === 'deep' ? 0.1 : 0));
      else if (i < 8) x.m = clamp(x.m + (won ? 0.2 : -0.6) - 0.5 + (mn === 'heavy' ? -0.5 : mn === 'deep' ? 0.6 : 0));
      else x.m = clamp(x.m - 0.3);
    });
    m.cool.conv = Math.max(0, m.cool.conv - 1);
    m.cool.rumour = Math.max(0, m.cool.rumour - 1);
    m.cool.period = Math.max(0, (m.cool.period || 0) - 1);
    m.cool.inj = Math.max(0, (m.cool.inj || 0) - 1);
    m.cool.offer = Math.max(0, (m.cool.offer || 0) - 1);
    m.cool.act = Math.max(0, (m.cool.act || 0) - 1);
    Object.keys(m.tweak).forEach(function (id) { m.tweak[id].g--; if (m.tweak[id].g <= 0) delete m.tweak[id]; });
    resolveFollows(save, m);
  }

  /* what came of the choices you made on your phone: a few games later the fans notice */
  function resolveFollows(save, m) {
    var stats = save.lg && save.lg.stats ? save.lg.stats : {};
    m.follow = m.follow.filter(function (f) {
      var s = stats[f.pid];
      if (!s || s.g - f.g0 < f.n) return true;
      var g = s.g - f.g0, ppg = (s.pts - f.pts0) / g, fa = s.fga - f.fga0, pct = fa > 0 ? (s.fg - f.fg0) / fa : 0;
      var p = root.League ? root.League.byId(save, f.pid) : null, nm = p ? last(p.name) : f.name;
      var good = f.kind === 'backed' ? (pct >= 0.44 || ppg >= f.base * 1.1) : f.kind === 'minutes' ? ppg >= f.base * 0.9 && ppg >= 8 : (pct >= 0.44);
      var x = pm(save, f.pid), t, fx;
      if (f.kind === 'backed') t = good ? nm + ' answers the doubters: ' + ppg.toFixed(1) + ' a night, ' + Math.round(pct * 100) + '% from the floor since the front office stood by him.' : nm + ' is still ' + Math.round(pct * 100) + '% from the floor. The GM backed him. Was it the right call?';
      else if (f.kind === 'minutes') t = good ? nm + ' is making the most of the extra minutes: ' + ppg.toFixed(1) + ' a game. The GM was right.' : nm + ' got the minutes and ' + ppg.toFixed(1) + ' a night is not cutting it. Fans are asking questions.';
      else t = good ? 'The shake-up is paying off. ' + nm + ' is up to ' + Math.round(pct * 100) + '% since the change.' : 'Nothing has changed. ' + nm + ' still cannot buy a bucket.';
      x.m = clamp(x.m + (good ? 3 : -2)); x.t = clamp(x.t + (good ? 2 : 0)); m.fans = clamp(m.fans + (good ? 3 : -2));
      fx = (good ? 'Fans +3 \u00B7 ' : 'Fans -2 \u00B7 ') + nm + ' morale ' + (good ? '+3' : '-2');
      m.posts.push({ app: 'Mentions', c: '#F4511E', g: '@', title: ['@section104_', '@hoopsfan88', '@courtside_kay', '@lateshiftlarry'][Math.floor(Math.random() * 4)], text: t, note: fx, good: good });
      return false;
    });
  }


  /* Little scenes from the modern road: sponsors, social media, the league office. */
  var PERIOD_M = [
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A shoe company wants the whole roster at a promotional event on an off day. There is money in it for the club and a lot of cameras.', choices: [
        { label: 'Say yes and do the event', fx: { team: { m: -1 }, fans: 5 }, say: 'The cameras love it' },
        { label: 'Protect the off day', fx: { team: { m: 2 } }, say: 'The players rest' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A clip of one of your players arguing with a referee is going viral. The league office has called to ask whether the club will comment.', choices: [
        { label: 'Back the player publicly', fx: { team: { m: 3 }, fans: 2, coach: -1 }, say: 'The locker room appreciates it' },
        { label: 'Stay quiet and let it pass', fx: {}, say: 'It blows over in a day' },
        { label: 'Fine him quietly', fx: { team: { m: -2 }, coach: 2 }, say: 'The message is received' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A podcast host is writing that your club is "all offence and no defence" and wants a response before the next show.', choices: [
        { label: 'Say the team will answer on the floor', fx: { team: { m: 2 }, fans: 1 }, say: 'The quote does the rounds' },
        { label: 'Fire back on social media', fx: { team: { m: 1 }, fans: -3, coach: -1 }, say: 'The argument drags on all week' },
        { label: 'No comment', fx: {}, say: 'He runs the segment anyway' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A children\'s hospital asks the club to host a visit on an off night. The local press will be there.', choices: [
        { label: 'Send the whole team', fx: { team: { m: -1 }, fans: 6, coach: 1 }, say: 'A warm night for a good cause' },
        { label: 'Send a few players and a donation', fx: { fans: 2 }, say: 'Quiet generosity' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, coach: true, text: 'Coach: "Boss, the schedule has us on the second night of a back-to-back after a long flight. I can rest the starters, but we might lose the game."', choices: [
        { label: 'Rest the starters', fx: { team: { m: 3 }, coach: 2 }, say: 'Fresh legs for the stretch run' },
        { label: 'Play everyone', fx: { team: { m: -2 }, coach: -1, fans: 1 }, say: 'The tired legs show' }
      ] };
    }
  ];

  /* Little scenes from the 1940s road: rail travel, exhibitions, the war's aftermath. */
  var PERIOD = [
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A local department store offers to put the club\'s picture in its window and pay $300 toward the travel fund, if the boys sign autographs on Saturday afternoon.', choices: [
        { label: 'Take the money and sign autographs', fx: { team: { m: -1 }, fans: 5 }, say: 'The treasury is a little fuller' },
        { label: 'Politely decline', fx: { team: { m: 1 } }, say: 'The boys rest instead' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A snowstorm has closed the roads. The train is stuck outside town and the game starts in four hours. The league office says a forfeit is possible if you are late.', choices: [
        { label: 'Hire a fleet of taxis and race in', fx: { team: { m: -3 }, coach: 2, fans: 2 }, say: 'They arrive frozen but in time' },
        { label: 'Wait for the train, trust the league', fx: { team: { m: 1 }, coach: -1 }, say: 'They make it with minutes to spare' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A newspaper columnist is writing that your club is "all show and no defence." He wants a quote before his deadline.', choices: [
        { label: 'Say the boys will answer on the floor', fx: { team: { m: 2 }, fans: 1 }, say: 'Printed word for word' },
        { label: 'Call him a bum in print', fx: { team: { m: 1 }, fans: -3, coach: -1 }, say: 'The column gets nastier' },
        { label: 'No comment', fx: {}, say: 'He writes it anyway' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A charity in town asks the club to play a benefit game for orphans on an off night. The gate goes to the cause. The papers will be there.', choices: [
        { label: 'Play the benefit game', fx: { team: { m: -2 }, fans: 6, coach: 1 }, say: 'A warm night for a good cause' },
        { label: 'Send a cheque instead', fx: { fans: 2 }, say: 'Quiet generosity' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, coach: true, text: 'Coach: "Skipper, the referee tonight let them mug us. The league has a form for complaints. Do we file one?"', choices: [
        { label: 'File the complaint', fx: { coach: 3, fans: 1 }, say: 'The league office notes it' },
        { label: 'Swallow it and move on', fx: { team: { m: 1 }, coach: -1 }, say: 'Water under the bridge' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'The radio station is offering to carry the road games for a fee of $200 a night. It would put the club in every kitchen in town. Some owners fear it will keep fans home.', choices: [
        { label: 'Sign the radio deal', fx: { fans: 6, team: { m: 1 } }, say: 'The boys are on the air' },
        { label: 'Keep the gate, refuse', fx: { fans: -1, coach: 1 }, say: 'The turnstiles will have to do' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A rookie missed the team bus and arrived at the hotel at dawn, smelling of cigar smoke. The veterans are waiting to see what you do.', choices: [
        { label: 'Fine him a week\'s pay', fx: { team: { m: 2 }, coach: 3 }, say: 'The vets nod' },
        { label: 'Give him a quiet talking-to', fx: { team: { m: 0 }, coach: -1 }, say: 'He promises to behave' },
        { label: 'Laugh it off', fx: { team: { m: -2 }, coach: -3 }, say: 'The coach is not amused' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'The arena manager says the hot-water boiler is broken. The visiting club has agreed to play, but the showers will be cold for both sides.', choices: [
        { label: 'Play on, cold showers', fx: { team: { m: -2 } }, say: 'Grumbling in the locker room' },
        { label: 'Pay for a repair crew', fx: { team: { m: 2 }, coach: 1 }, say: 'Money well spent, they say' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, coach: true, text: 'Coach: "Skipper, the next road swing is an overnight Pullman. We can book sleeper berths for the whole club, or ride coach and keep the money in the treasury."', choices: [
        { label: 'Sleeper berths for everyone', fx: { team: { m: 3 }, fans: 0 }, say: 'The boys sleep soundly' },
        { label: 'Coach seats, save the fare', fx: { team: { m: -3 }, coach: 2 }, say: 'A stiff, grumpy ride' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A promoter in a nearby town offers the club a purse to play an exhibition against a local semi-pro five on the off night. The crowd would be big and the pay is cash.', choices: [
        { label: 'Take the exhibition', fx: { team: { m: -2 }, fans: 4 }, say: 'Tired legs, happy fans' },
        { label: 'Rest the boys', fx: { team: { m: 2 }, fans: -1 }, say: 'A quiet night in the hotel' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'A returned serviceman, still wearing his Army-issue jacket, asks the doorman for a tryout. He played ball in a camp league overseas. The reporters at the gate are watching.', choices: [
        { label: 'Give him a tryout', fx: { team: { m: 1 }, fans: 3 }, say: 'The papers love the story' },
        { label: 'Send him away politely', fx: { fans: -1 }, say: 'He tips his cap and leaves' }
      ] };
    },
    function (ctx) {
      return { kind: 'talk', who: null, text: 'The arena has sold out for a college doubleheader before your game. The late tip will mean a rushed warm-up. The house manager asks whether you want the floor for a half hour first.', choices: [
        { label: 'Ask for the half hour', fx: { team: { m: 1 }, coach: 1 }, say: 'The boys are loose and ready' },
        { label: 'Take what we get', fx: { fans: 1 }, say: 'The crowd is warm and early' }
      ] };
    }
  ];


  /* ---------- the front page: every game of the day, not just ours ---------- */
  function fullDate(save) {
    var off = save.phase === 'regular' ? Math.round(save.day * 2.2) : 145 + (save.pd || 0) * 2;
    var d = new Date(Date.UTC(save.year, 10, 1 + off));
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
  }
  function ordinal(n) { return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n); }
  function streakOf(save, id) {
    var n = 0, kind = null;
    for (var i = save.results.length - 1; i >= 0; i--) {
      var g = save.results[i];
      if (g.h !== id && g.a !== id) continue;
      var win = (g.h === id) === (g.hs > g.as);
      if (kind === null) kind = win;
      if (win !== kind) break;
      n++;
    }
    return { n: n, win: kind };
  }
  function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function paper(save, ctx, headline, v) {
    var T = ctx.teamOf, day = ctx.day.games, regular = save.phase === 'regular';
    var recOf = function (id) { var r = save.rec[id]; return r.w + '-' + r.l; };
    var names = function (id) { return T(id).city; };
    var all = [];
    day.forEach(function (g) {
      [['h', g.home], ['a', g.away]].forEach(function (s) {
        g.lines[s[0]].forEach(function (ln) {
          if (ln.s.pts > 0 || ln.s.fga > 0) all.push({ id: ln.id, name: ln.name, team: s[1], pts: ln.s.pts, fg: ln.s.fg, fga: ln.s.fga, ft: ln.s.ft, fta: ln.s.fta, ast: ln.s.ast, pf: ln.s.pf, reb: (ln.s.orb || 0) + (ln.s.drb || 0), game: g });
        });
      });
    });
    all.sort(function (a, b) { return b.pts - a.pts || b.ast - a.ast; });
    var feat = all[0];
    var out = { kind: 'paper', paper: v.paper, date: fullDate(save), edition: ctx.me.city.toUpperCase(), head: headline, label: ctx.label };

    // lead story about our game
    var mine = day.filter(function (g) { return g.mine; })[0];
    var myLines = ctx.res.homeLines.slice().sort(function (a, b) { return b.s.pts - a.s.pts; });
    var oppLines = ctx.res.awayLines.slice().sort(function (a, b) { return b.s.pts - a.s.pts; });
    var won = ctx.us > ctx.them, margin = Math.abs(ctx.us - ctx.them), star = myLines[0];
    var C = ctx.me.city, O = ctx.opp.city, hi = Math.max(ctx.us, ctx.them), lo = Math.min(ctx.us, ctx.them), rc = recOf(ctx.me.id), ro = recOf(ctx.opp.id);
    var cls = margin <= 4 ? 'close' : margin >= 18 ? 'blow' : 'normal';
    var L = {
      winclose: [C + ' (' + rc + ') needed every possession to get past ' + O + ' (' + ro + '), ' + hi + '-' + lo + '.', 'It came down to the last few trips, and ' + C + ' (' + rc + ') made just enough to beat ' + O + ', ' + hi + '-' + lo + '.', C + ' held on. ' + O + ' (' + ro + ') pushed all night and still fell, ' + hi + '-' + lo + '.', 'A nervy finish, but ' + C + ' (' + rc + ') walked out with it, ' + hi + '-' + lo + ' over ' + O + '.'],
      winblow: [C + ' (' + rc + ') were never troubled, running ' + O + ' (' + ro + ') out of the building, ' + hi + '-' + lo + '.', 'This one was over early. ' + C + ' (' + rc + ') cruised past ' + O + ', ' + hi + '-' + lo + '.', O + ' (' + ro + ') had no answers as ' + C + ' ran away with it, ' + hi + '-' + lo + '.'],
      win: [C + ' (' + rc + ') took care of ' + O + ' (' + ro + '), ' + hi + '-' + lo + '.', C + ' got the job done against ' + O + ', ' + hi + '-' + lo + ', and moved to ' + rc + '.', 'A solid night for ' + C + ' (' + rc + '), who beat ' + O + ' ' + hi + '-' + lo + '.', O + ' (' + ro + ') stayed within reach for a while, but ' + C + ' pulled clear to win ' + hi + '-' + lo + '.'],
      lossclose: [O + ' (' + ro + ') edged ' + C + ' (' + rc + '), ' + hi + '-' + lo + ', in a game that could have gone either way.', C + ' (' + rc + ') had its chances and could not finish. ' + O + ' won ' + hi + '-' + lo + '.', 'So close. ' + C + ' (' + rc + ') fell to ' + O + ', ' + hi + '-' + lo + ', on the last few possessions.'],
      lossblow: [O + ' (' + ro + ') made it look easy against ' + C + ' (' + rc + '), ' + hi + '-' + lo + '.', 'A night to forget for ' + C + ' (' + rc + '), run off the floor by ' + O + ', ' + hi + '-' + lo + '.', C + ' never found its legs. ' + O + ' won going away, ' + hi + '-' + lo + '.'],
      loss: [C + ' (' + rc + ') fell to ' + O + ' (' + ro + '), ' + hi + '-' + lo + '.', O + ' (' + ro + ') got the better of ' + C + ', ' + hi + '-' + lo + ', and the club drops to ' + rc + '.', 'It was not ' + C + '\'s night. ' + O + ' won ' + hi + '-' + lo + '.']
    };
    var s1 = rnd(L[(won ? 'win' : 'loss') + (cls === 'close' ? 'close' : cls === 'blow' ? 'blow' : '')]) ;
    var body = [s1];
    var q = ctx.res.quarters;
    if (q && q.length >= 2) {
      var h1 = q[0][0] + q[1][0], h2 = q[0][1] + q[1][1], lead = h1 - h2, held = won === (h1 > h2);
      var hl = h1 === h2 ? rnd(['The clubs went to the break level at ' + h1 + '.', 'Nothing between them at the half, ' + h1 + ' apiece.'])
        : lead > 0 ? (won ? rnd([C + ' led ' + h1 + '-' + h2 + ' at the half and kept its foot down.', C + ' went into the break up ' + lead + ' and never let go.', 'A ' + h1 + '-' + h2 + ' halftime lead was all ' + C + ' needed.']) : rnd([C + ' led ' + h1 + '-' + h2 + ' at the half, but the second half told a different story.', 'The ' + lead + '-point halftime lead for ' + C + ' did not last.']))
        : (won ? rnd([C + ' trailed ' + h2 + '-' + h1 + ' at the half and came roaring back.', 'Down ' + (-lead) + ' at the break, ' + C + ' flipped the game in the third quarter.']) : rnd([O + ' led ' + h2 + '-' + h1 + ' at the half and held the edge.', 'A ' + (-lead) + '-point deficit at halftime proved too much for ' + C + '.']));
      body.push(hl);
    }
    var sr = star.s, sreb = (sr.orb || 0) + (sr.drb || 0), dd = [sr.pts, sreb, sr.ast, sr.stl, sr.blk].filter(function (x) { return x >= 10; }).length >= 2;
    var shoot = sr.fg + ' of ' + sr.fga + ' from the floor' + (sr.fta ? ' and ' + sr.ft + ' of ' + sr.fta + ' at the line' : '');
    var oppTop = oppLines[0], oppS = oppTop.s.pts >= 15 ? rnd([' For ' + O + ', ' + oppTop.name + ' scored ' + oppTop.s.pts + '.', ' ' + oppTop.name + ' kept ' + O + ' alive with ' + oppTop.s.pts + '.', ' ' + oppTop.name + ' answered with ' + oppTop.s.pts + ' for ' + O + '.']) : '';
    body.push(rnd([
      star.name + ' paced ' + C + ' with ' + sr.pts + ' points (' + shoot + ').',
      star.name + ' led the way: ' + sr.pts + ' points on ' + shoot + '.',
      dd ? star.name + ' filled the stat sheet with ' + sr.pts + ' points, ' + sreb + ' rebounds and ' + sr.ast + ' assists.' : 'It was ' + star.name + ' who carried the scoring, ' + sr.pts + ' points, ' + shoot + '.',
      sr.pts >= 30 ? star.name + ' was unstoppable, ' + sr.pts + ' points, ' + shoot + '.' : star.name + ' did most of the damage with ' + sr.pts + ' points.'
    ]) + oppS);
    if (regular && ctx.standing && !v.modern) body.push(ctx.standing);
    else if (ctx.seriesLine) body.push(ctx.seriesLine + '.');
    out.story = body;
    function boxOf(lines, city) {
      var rows = lines.filter(function (l) { return l.s.pos > 0; }).slice().sort(function (a, b) { return (b.s.pos || 0) - (a.s.pos || 0); }).slice(0, 6).map(function (l) {
        var s = l.s, mn = 0; return [l.name, s.pts, (s.orb || 0) + (s.drb || 0), s.ast, s.fg + '-' + s.fga];
      });
      return { city: city, rows: rows };
    }
    out.box = [boxOf(ctx.res.homeLines, ctx.me.city), boxOf(ctx.res.awayLines, ctx.opp.city)];
    function boxFull(lines, t) {
      return { id: t.id, city: t.city, rows: lines.filter(function (l) { return l.s.pos > 0; }).slice().sort(function (a, b) { return (b.s.pos || 0) - (a.s.pos || 0); }).slice(0, 10).map(function (l) {
        var s = l.s; return { id: l.id, name: l.name, pts: s.pts, reb: (s.orb || 0) + (s.drb || 0), ast: s.ast, fg: s.fg + '-' + s.fga };
      }) };
    }
    out.boxFull = [boxFull(ctx.res.homeLines, ctx.me), boxFull(ctx.res.awayLines, ctx.opp)];
    // the night's best individual performances, from every game
    var perfSeen = {}, perf = [];
    function addPerf(x, tag) {
      if (!x || perfSeen[x.id]) return; perfSeen[x.id] = 1;
      perf.push({ id: x.id, name: x.name, tid: x.team, team: names(x.team), pts: x.pts, reb: x.reb, ast: x.ast, fg: x.fg, fga: x.fga, tag: tag || '' });
    }
    all.slice(0, 3).forEach(function (x) { addPerf(x, ''); });
    addPerf(all.slice().sort(function (a, b) { return b.reb - a.reb || b.pts - a.pts; })[0], 'Glass');
    addPerf(all.slice().sort(function (a, b) { return b.ast - a.ast || b.pts - a.pts; })[0], 'Playmaker');
    out.perf = perf;
    out.slug = (ctx.me.city + '-' + ctx.opp.city).toLowerCase().replace(/[^a-z]+/g, '-');
    var stk = regular ? streakOf(save, ctx.me.id) : { n: 0 };
    out.deck = ctx.seriesLine || (stk.n >= 3 && stk.win ? rnd(['That makes ' + ordinal(stk.n) + ' straight for ' + ctx.me.city + '.', ordinal(stk.n) + ' in a row and the confidence is showing.']) : stk.n >= 3 && stk.win === false ? rnd(['The losing run reaches ' + ordinal(stk.n) + '. Questions are coming.', ordinal(stk.n) + ' straight defeats and the pressure is on.']) : won ? rnd(['A step forward for ' + ctx.me.city + '.', 'The kind of win a club can build on.', 'One more for the ledger.', margin >= 15 ? 'A statement from ' + ctx.me.city + '.' : 'Not pretty, but it counts.']) : rnd(['The club has work to do.', 'Back to the drawing board.', margin <= 4 ? 'Close, but close does not count.' : 'A night the club will want to forget.', 'Time to regroup.']));

    // photo candidates: the day's best performers, whoever they play for
    // The photo sits under the lead story, so it must come from that game: our top scorer, then theirs.
    // The day's best performer from other games is shown beside the "Feat of the day" item instead.
    var fromLine = function (l, city) { return { id: l.id, name: l.name, team: city, pts: l.s.pts, fg: l.s.fg, fga: l.s.fga }; };
    out.photos = [];
    if (myLines[0]) out.photos.push(fromLine(myLines[0], ctx.me.city));
    if (oppLines[0]) out.photos.push(fromLine(oppLines[0], ctx.opp.city));
    myLines.slice(1, 3).forEach(function (l) { out.photos.push(fromLine(l, ctx.me.city)); });
    oppLines.slice(1, 3).forEach(function (l) { out.photos.push(fromLine(l, ctx.opp.city)); });
    out.featPhoto = feat ? { id: feat.id, name: feat.name, team: names(feat.team), pts: feat.pts } : null;

    // feat of the day
    if (feat) {
      var hiRec = save.lg.high || { pts: 0 };
      var fr = feat.name + ' of ' + names(feat.team) + ' scored ' + feat.pts + ' points, ' + feat.fg + ' of ' + feat.fga + ' from the floor' + (feat.fta ? ' and ' + feat.ft + ' of ' + feat.fta + ' from the line' : '') + '.';
      if (regular && feat.pts > hiRec.pts) { fr += hiRec.pts ? ' It is the best single night of the season, topping ' + hiRec.name + '’s ' + hiRec.pts + '.' : ''; save.lg.high = { pts: feat.pts, name: feat.name }; }
      else if (regular && hiRec.pts) fr += ' The season high remains ' + hiRec.pts + ', by ' + hiRec.name + '.';
      out.feat = fr;
    }

    // scores from around the circuit
    out.scores = day.filter(function (g) { return !g.mine; }).map(function (g) {
      var all2 = g.lines.h.map(function (x) { return [x, g.home]; }).concat(g.lines.a.map(function (x) { return [x, g.away]; })).sort(function (a, b) { return b[0].s.pts - a[0].s.pts; });
      var top = all2[0] ? last(all2[0][0].name) + ' ' + all2[0][0].s.pts : '';
      var win = g.hs > g.as;
      return { w: names(win ? g.home : g.away), ws: win ? g.hs : g.as, l: names(win ? g.away : g.home), ls: win ? g.as : g.hs, top: top, at: names(g.home), wid: win ? g.home : g.away, lid: win ? g.away : g.home, topName: all2[0] ? last(all2[0][0].name) : '', topPts: all2[0] ? all2[0][0].s.pts : 0, topTid: all2[0] ? all2[0][1] : null };
    });

    // wire briefs: close games, blowouts, rivalry, streaks, milestones, first place
    var briefs = [];
    function tag(o, tid, pid) { o.tid = tid; if (pid) o.pid = pid; return o; }
    day.forEach(function (g) {
      var m = Math.abs(g.hs - g.as), w = g.hs > g.as ? g.home : g.away, l2 = w === g.home ? g.away : g.home;
      if (g.mine) return;
      if (m <= 3) briefs.push(tag(rnd([{ h: 'Down to the wire', t: names(w) + ' held off ' + names(l2) + ', ' + Math.max(g.hs, g.as) + '-' + Math.min(g.hs, g.as) + '.' }, { h: 'Nail-biter', t: names(l2) + ' had the last look but ' + names(w) + ' survived, ' + Math.max(g.hs, g.as) + '-' + Math.min(g.hs, g.as) + '.' }, { h: 'Late drama', t: 'It went to the final possession before ' + names(w) + ' edged ' + names(l2) + '.' }]), w));
      else if (m >= 18) briefs.push(tag(rnd([{ h: 'Rout', t: names(w) + ' ran ' + names(l2) + ' off the floor, ' + Math.max(g.hs, g.as) + '-' + Math.min(g.hs, g.as) + '.' }, { h: 'Blowout', t: names(l2) + ' never got going in a ' + m + '-point loss to ' + names(w) + '.' }, { h: 'No contest', t: names(w) + ' by ' + m + '. ' + names(l2) + ' will want this one back.' }, { h: 'Statement', t: names(w) + ' made a point against ' + names(l2) + ', ' + Math.max(g.hs, g.as) + '-' + Math.min(g.hs, g.as) + '.' }]), w));
    });
    if (margin <= 3) briefs.unshift({ h: 'Down to the wire', t: 'Our own game was decided by ' + (margin === 1 ? 'a single point' : ordinal(margin) + ' points') + '.', tid: ctx.me.id });
    else if (margin >= 18) briefs.unshift({ h: 'Rout', t: (won ? ctx.me.city : ctx.opp.city) + ' won by ' + margin + '.', tid: won ? ctx.me.id : ctx.opp.id });
    if (regular) {
      var riv = null;
      day.forEach(function (g) {
        if (riv && !g.mine) return;
        if (save.division[g.home] !== save.division[g.away]) return;
        var meet = save.results.filter(function (r) { return (r.h === g.home && r.a === g.away) || (r.h === g.away && r.a === g.home); });
        if (meet.length < 2) return;
        var wh = meet.filter(function (r) { return (r.h === g.home) === (r.hs > r.as); }).length;
        riv = { tid: g.home, h: 'Division rivals', t: names(g.home) + ' and ' + names(g.away) + ' have now met ' + ordinal(meet.length) + ' times this season. ' + (wh * 2 === meet.length ? 'The series is level.' : (wh * 2 > meet.length ? names(g.home) : names(g.away)) + ' lead it ' + Math.max(wh, meet.length - wh) + '-' + Math.min(wh, meet.length - wh) + '.') };
      });
      if (riv) briefs.push(riv);
      var seen = {};
      day.forEach(function (g) {
        [g.home, g.away].forEach(function (id) {
          if (seen[id]) return; seen[id] = 1;
          var s = streakOf(save, id);
          if (s.win && s.n >= 4) briefs.push(tag(rnd([{ h: 'Hot streak', t: names(id) + ' have won ' + ordinal(s.n) + ' in a row.' }, { h: 'Rolling', t: names(id) + ' extend their winning streak to ' + ordinal(s.n) + '.' }, { h: 'Who can stop them?', t: ordinal(s.n) + ' straight wins for ' + names(id) + '.' }]), id));
          else if (s.win === false && s.n >= 5) briefs.push(tag(rnd([{ h: 'Slump', t: names(id) + ' have lost ' + ordinal(s.n) + ' straight.' }, { h: 'Skid', t: names(id) + ' cannot buy a win: ' + ordinal(s.n) + ' defeats in a row.' }, { h: 'Trouble', t: names(id) + ' are in a freefall after ' + ordinal(s.n) + ' straight losses.' }]), id));
        });
      });
      var st2 = Season.standings(save);
      Object.keys(st2).forEach(function (d) {
        var lead = st2[d][0].id, was = ctx.before && ctx.before[d];
        if (was && was !== lead) briefs.push({ tid: lead, h: 'New leader', t: names(lead) + ' move into first place in the ' + d + ' Division, replacing ' + names(was) + '.' });
      });
      all.forEach(function (x) {
        var tot = save.lg.stats[x.id] ? save.lg.stats[x.id].pts : 0;
        [250, 500, 750, 1000, 1250, 1500].forEach(function (M) { if (tot - x.pts < M && tot >= M) briefs.push({ pid: x.id, tid: x.team, h: 'Milestone', t: x.name + ' of ' + names(x.team) + ' passed ' + commas(M) + ' points for the season.' }); });
      });
    }
    var tx = (save.lg.wire || []).filter(function (w) { return w.d === save.day && w.y === save.year; });
    out.briefs = briefs.slice(0, tx.length ? 4 : 5);
    tx.slice(0, 2).forEach(function (w) {
      var hit = null, at = 1e9;
      save.ids.forEach(function (id) { var k = w.t.indexOf(names(id)); if (k >= 0 && k < at) { at = k; hit = id; } });
      out.briefs.push({ h: 'Transactions', t: w.t, tid: hit });
    });

    // injuries
    var inj = (ctx.day.inj || []).map(function (i) { return i.name + ' (' + names(i.team) + ') was hurt and is expected to miss ' + (i.games >= 30 ? 'the rest of the season' : i.games + ' games') + '.'; });
    ctx.rosterAll.filter(function (p) { return p.inj > 0 && !(ctx.day.inj || []).some(function (i) { return i.id === p.id; }); }).forEach(function (p) {
      inj.push(p.name + ' (' + ctx.me.city + ') remains on the injured list, ' + p.inj + ' more ' + (p.inj === 1 ? 'game' : 'games') + '.');
    });
    out.injuries = inj.slice(0, 5);
    var injIds = (ctx.day.inj || []).map(function (i) { return { pid: i.id, tid: i.team }; });
    ctx.rosterAll.filter(function (p) { return p.inj > 0 && !(ctx.day.inj || []).some(function (i) { return i.id === p.id; }); }).forEach(function (p) { injIds.push({ pid: p.id, tid: ctx.me.id }); });
    out.injIds = injIds.slice(0, 5);

    // standings box
    var stand = Season.standings(save);
    out.table = Object.keys(stand).map(function (d) {
      return { div: d, rows: stand[d].slice(0, 4).map(function (r) { return { city: names(r.id), w: r.w, l: r.l, gb: r.gb, me: r.id === ctx.me.id }; }) };
    });
    // every club, grouped, with our group first
    var myDiv = save.division[ctx.me.id];
    out.tableFull = Object.keys(stand).sort(function (a, b) { return (b === myDiv) - (a === myDiv); }).map(function (d) {
      return { div: d, rows: stand[d].map(function (r) { return { id: r.id, city: names(r.id), w: r.w, l: r.l, gb: r.gb, me: r.id === ctx.me.id }; }) };
    });
    return out;
  }

  /* ---------- generation ---------- */
  function generate(save, ctx) {
    // ctx: me, opp (team objects), res (engine result, me first), us, them, rosterMe, rosterOpp, label, seriesLine
    var v = voice(save.year), m = mood(save), out = [];
    var won = ctx.us > ctx.them, margin = Math.abs(ctx.us - ctx.them);
    var lines = ctx.res.homeLines.slice().sort(function (a, b) { return b.s.pts - a.s.pts; });
    var star = lines[0];
    var d = { C: ctx.me.city, O: ctx.opp.city, us: ctx.us, them: ctx.them, star: last(star.name), pts: star.s.pts };

    var pool = won ? (margin >= 15 ? v.blow : margin <= 3 ? v.close : v.win) : (margin >= 15 ? v.lblow : margin <= 3 ? v.lclose : v.loss);
    var headline = fill(rnd(pool), d);
    var date = dateFor(save);
    var sub = ctx.seriesLine ? ctx.seriesLine : (won ? 'Another step forward for the club.' : 'The club will try to bounce back.');
    if (ctx.day && ctx.teamOf) out.push(paper(save, ctx, headline, v));
    else out.push({ kind: 'news', head: headline, dateline: ctx.me.city.toUpperCase() + ', ' + date, sub: sub, source: v.paper });
    m.news.push({ text: headline, date: date });
    if (m.news.length > 12) m.news.shift();

    var bigPts = star.s.pts >= 20;
    var topAst = lines.slice().sort(function (a, b) { return b.s.ast - a.s.ast; })[0];
    if (!v.modern && (bigPts || topAst.s.ast >= 7)) {
      var text = v.modern ? (bigPts ? rnd(v.radio) : v.radioAst) : bigPts
        ? rnd(['And {n} hits again! That is {x} points tonight, folks, and the crowd is on its feet!', '{n} from the corner. Good! He now has {x} points and nobody can stop him!', 'Listeners, you are hearing history. {n} has {x} points and the night is young!'])
        : '{n} threads another pass, that is {x} assists for him tonight. He sees the whole floor!';
      out.push({ kind: 'radio', text: fill(text, { n: bigPts ? star.name : topAst.name, x: bigPts ? star.s.pts : topAst.s.ast }), source: v.announcer });
    }

    if (Math.abs(m.streak) >= 3 || Math.random() < 0.3) {
      var fan;
      if (v.modern) fan = m.streak >= 3 ? rnd(v.fanHot) : m.streak <= -3 ? rnd(v.fanCold) : won ? rnd(v.fanWin) : rnd(v.fanLoss);
      else if (m.streak >= 3) fan = rnd(['Sir, I have watched basketball in this city twenty years and never seen a quintet play so. Keep it up!', 'The whole street is talking about the {C} club. Make room on the bandwagon!']);
      else if (m.streak <= -3) fan = rnd(['Sir, are the {C} a basketball team or a social club? I want my money back!', 'Three straight defeats! Somebody in the front office is asleep at the switch.']);
      else if (won) fan = rnd(['A fine evening at {hall}. The boys gave us our money\'s worth.', 'My boy shook {star}\'s hand after the game. He will talk about it for a year.']);
      else fan = rnd(['A dollar twenty for a seat in the rafters and a loss to boot. Highway robbery!', 'The boys looked tired out there. Give them a rest, I say.']);
      out.push({ kind: 'fans', text: fill(fan, { C: ctx.me.city, hall: v.hall, star: last(star.name) }), name: rnd(v.modern ? v.fanNames : ['A Loyal Fan', 'Cheap Seat Charlie', 'Disgruntled of Flatbush', 'A Season Ticket Holder', 'Mrs. Annie Kowalski']) });
    }

    if (m.cool.rumour === 0 && Math.random() < 0.14) {
      m.cool.rumour = 8;
      var mine = ctx.rosterMe.slice().sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
      var target = mine[Math.floor(Math.random() * Math.min(4, mine.length))];
      var other = rnd(ctx.others || [ctx.opp]);
      if (Math.random() < 0.6) {
        out.push({
          kind: 'rumour', pid: target.id, who: target.name,
          text: v.modern ? fill('League sources say the {OT} have been asking about {P}. Do you want to shut the rumour down?', { OT: other.name, P: target.name })
            : fill('REPORT FROM {OC} STOP {OT} CLUB SAID TO BE ASKING ABOUT {P} STOP WILL YOU DENY IT STOP', { OC: other.city.toUpperCase(), OT: other.name.toUpperCase(), P: target.name.toUpperCase() }),
          choices: [
            { label: 'Wire back: not for sale', fx: { s: { m: 2, t: 4 }, fans: 1 }, say: 'Denied' },
            { label: 'Say nothing', fx: { s: { t: target && pm(save, target.id).m < 50 ? -3 : -1 } }, say: 'No comment' }
          ]
        });
      } else {
        out.push({ kind: 'rumour', text: v.modern ? fill('Owners are meeting in {OC} and there is talk of schedule changes. Nothing is confirmed.', { OC: other.city }) : fill('OWNERS MEETING IN {OC} STOP TALK OF SCHEDULE CHANGES AND NEW ARENAS STOP NOTHING CONFIRMED STOP', { OC: other.city.toUpperCase() }), choices: [{ label: 'Noted', fx: {}, say: 'Noted' }] });
      }
    }

    if (save.phase === 'regular' && !(m.cool.period > 0) && Math.random() < 0.06) {
      m.cool.period = 14;
      out.push(rnd(v.modern ? PERIOD_M : PERIOD)(ctx));
    }

    // injuries to my players: a decision for the manager
    if (!(m.cool.inj > 0)) {
      var top7 = ctx.rosterAll ? ctx.rosterAll.slice().sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; }).slice(0, 7).map(function (p) { return p.id; }) : [];
      var hurtMine = (ctx.myInj || []).filter(function (h) { return h.team === ctx.me.id && h.games >= 4 && top7.indexOf(h.id) >= 0; })[0];
      if (hurtMine && save.phase === 'regular') {
        m.cool.inj = 6;
        out.push({ kind: 'talk', who: hurtMine.name, pid: hurtMine.id, text: 'The club doctor says ' + hurtMine.name + ' will miss about ' + hurtMine.games + ' games. "I can play through it, boss," he insists. The coach is watching you.', choices: [
          { label: 'Rush him back early', fx: { s: { m: 3, t: 2 }, inj: { id: hurtMine.id, mode: 'rush' } }, say: 'Rushed back' },
          { label: 'Let him heal properly', fx: { s: { m: 1, t: 3 }, inj: { id: hurtMine.id, mode: 'rest' }, coach: 1 }, say: 'Rested' },
          { label: 'Sign a free agent to cover', fx: { inj: { id: hurtMine.id, mode: 'sign' } }, say: 'Signed cover' }
        ] });
      }
    }

    // a rival club wires a trade offer
    if (save.phase === 'regular' && save.day <= save.days.length * 0.75 && !(m.cool.offer > 0) && Math.random() < 0.06 && root.League && ctx.others) {
      var of = root.League.makeOffer(save, ctx.me.id, ctx.others.concat([ctx.opp]));
      if (of) {
        m.cool.offer = 14;
        out.push({ kind: 'rumour', who: of.give.name, text: v.modern ? 'The ' + of.team + ' offer ' + of.give.name + ' (' + of.give.ratings.ovr + ' overall, ' + (of.give.pos || 'player') + ', ' + root.League.money(of.give.salary, save.lg.cap) + ') for ' + of.want.name + ' (' + of.want.ratings.ovr + ', ' + root.League.money(of.want.salary, save.lg.cap) + '). What do you say?' : of.city.toUpperCase() + ' CLUB WIRES OFFER STOP WILL SEND ' + of.give.name.toUpperCase() + ' (' + of.give.ratings.ovr + ' OVERALL, ' + (of.give.pos || 'PLAYER') + ', $' + of.give.salary.toLocaleString('en-US') + ') FOR ' + of.want.name.toUpperCase() + ' (' + of.want.ratings.ovr + ', $' + of.want.salary.toLocaleString('en-US') + ') STOP YOUR ANSWER STOP', choices: [
            { label: 'Accept the swap', fx: { offer: { them: of.themId, give: of.want.id, get: of.give.id } }, say: 'Accepted' },
            { label: 'Decline', fx: {}, say: 'Declined' }
          ] });
      }
    }

    var conv = pickConversation(save, ctx, lines, won);
    if (conv) { m.cool.conv = 3; out.push(conv); }
    if (v.modern) {
      var M = function (t) {
        return typeof t !== 'string' ? t : t.replace(/Skipper/g, 'Boss').replace(/Give the boys a day off/g, 'Give the guys a day off').replace(/A fellow plays better/g, 'A player plays better')
          .replace(/Fellows on other clubs are making real money\./g, 'Guys on other teams are getting paid.').replace(/the boys/g, 'the guys').replace(/The boys/g, 'The guys');
      };
      out.forEach(function (e) {
        e.text = M(e.text);
        (e.choices || []).forEach(function (c) { c.label = M(c.label); c.say = M(c.say); });
      });
    }
    return out;
  }

  function pickConversation(save, ctx, lines, won) {
    var m = mood(save);
    if (m.cool.conv > 0) return null;
    var roster = ctx.rosterMe.slice().sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    var bench = roster.slice(5, 9);
    var promised = bench.filter(function (p) { var x = pm(save, p.id); return x.promise && (save.rec[save.myId].w + save.rec[save.myId].l) - x.promise >= 8; })[0];
    var unhappy = bench.filter(function (p) { return pm(save, p.id).m < 50; })[0];
    var chance = promised || unhappy || m.streak <= -2 ? 0.7 : 0.25;
    if (Math.random() > chance) return null;
    var topScorer = lines[0];
    var topPlayer = ctx.rosterMe.filter(function (p) { return p.id === topScorer.id; })[0];

    if (promised) {
      var x = pm(save, promised.id); x.promise = 0;
      return conv(promised, '"Skipper, you told me I would play more. I am still on the bench. Was that just talk?"', [
        { label: 'You are right. Starting tomorrow.', fx: { s: { m: 4, t: 2 } }, say: 'Apologised' },
        { label: 'The coach decides who plays.', fx: { s: { m: -6, t: -8 }, coach: 2 }, say: 'Brushed him off' }
      ], promised);
    }
    if (unhappy) {
      return conv(unhappy, '"Boss, I came here to play. I am sitting more than I stand. What do I have to do?"', [
        { label: 'You will get your minutes.', fx: { s: { m: 6, t: 5, promise: true } }, say: 'Promised minutes' },
        { label: 'Earn it in practice.', fx: { s: { m: -1, t: 2 } }, say: 'Challenged him' },
        { label: 'That is the coach\'s call.', fx: { s: { m: -4, t: -3 }, coach: 2 }, say: 'Passed the buck' }
      ], unhappy);
    }
    if (m.streak <= -2) {
      return { kind: 'talk', who: null, text: 'The room is quiet after another loss. The players are looking at you.', choices: [
        { label: 'Call a team meeting.', fx: { team: { m: 3 }, coach: 1 }, say: 'Team meeting' },
        { label: 'Give the boys a day off.', fx: { team: { m: 4 }, coach: -2 }, say: 'Day off' },
        { label: 'Say nothing.', fx: { team: { m: -2 } }, say: 'Said nothing' }
      ] };
    }
    var r = Math.random();
    if (r < 0.3 && topPlayer && topScorer.s.pts >= 15) {
      return conv(topPlayer, '"Thanks for believing in me, boss. A fellow plays better when he knows somebody is behind him."', [
        { label: 'You are the franchise.', fx: { s: { m: 6, t: 5 }, team: { m: -1 } }, say: 'Backed him' },
        { label: 'It is a team game.', fx: { s: { m: 1, t: 1 }, team: { m: 2 } }, say: 'Team first' }
      ], topPlayer);
    }
    if (r < 0.6) {
      var star = roster[Math.floor(Math.random() * 3)];
      return conv(star, '"Fellows on other clubs are making real money. I would like a raise for next year."', [
        { label: 'I will look at it in the off-season.', fx: { s: { m: 1, t: 2 } }, say: 'Deferred' },
        { label: 'We pay everyone fairly. No.', fx: { s: { m: -5, t: -6 } }, say: 'Refused' },
        { label: 'Here is a bonus if we win the East.', fx: { s: { m: 5, t: 4 }, bonus: true }, say: 'Offered a bonus' }
      ], star);
    }
    return { kind: 'talk', who: null, coach: true, text: 'Coach: "Skipper, we are too slow getting down the floor. Let me run a fast-break system."', choices: [
      { label: 'Back him.', fx: { coach: 6, team: { m: 1 } }, say: 'Backed the coach' },
      { label: 'Stick with set plays.', fx: { coach: -5 }, say: 'Overruled' },
      { label: 'Try it for three games.', fx: { coach: 2, team: { m: 1 } }, say: 'Trial' }
    ] };
  }

  function conv(p, text, choices, subject) {
    return { kind: 'talk', who: p.name, pid: p.id, text: text, choices: choices, subject: subject };
  }

  /* ---------- applying a choice ---------- */
  function apply(save, ev, idx, rosterMe) {
    var m = mood(save), c = ev.choices[idx], fx = c.fx || {}, notes = [];
    if (fx.s && ev.pid) {
      var x = pm(save, ev.pid);
      if (fx.s.m) { x.m = clamp(x.m + fx.s.m); notes.push(last(ev.who) + ' morale ' + (fx.s.m > 0 ? '+' : '') + fx.s.m); }
      if (fx.s.t) { x.t = clamp(x.t + fx.s.t); notes.push('trust ' + (fx.s.t > 0 ? '+' : '') + fx.s.t); }
      if (fx.s.promise) x.promise = save.rec[save.myId].w + save.rec[save.myId].l;
    }
    if (fx.team && fx.team.m) {
      rosterMe.forEach(function (p) { var y = pm(save, p.id); y.m = clamp(y.m + fx.team.m); });
      notes.push('Team morale ' + (fx.team.m > 0 ? '+' : '') + fx.team.m);
    }
    if (fx.inj && root.League) notes.push(root.League.injuryChoice(save, fx.inj.id, fx.inj.mode, save.myId));
    if (fx.offer && root.League) notes.push(root.League.doOffer(save, save.myId, fx.offer.them, fx.offer.give, fx.offer.get));
    if (fx.coach) { m.coach = clamp(m.coach + fx.coach); notes.push('Coach trust ' + (fx.coach > 0 ? '+' : '') + fx.coach); }
    if (fx.fans) { m.fans = clamp(m.fans + fx.fans); notes.push('Fans ' + (fx.fans > 0 ? '+' : '') + fx.fans); }
    return notes.length ? notes.join(' · ') : c.say;
  }

  function summary(save, rosterMe) {
    var m = mood(save);
    var avg = rosterMe.length ? rosterMe.reduce(function (a, p) { return a + pm(save, p.id).m; }, 0) / rosterMe.length : 50;
    return { morale: clamp(avg), fans: m.fans, coach: m.coach };
  }

  root.Events = { generate: generate, afterGame: afterGame, apply: apply, moraleRoster: moraleRoster, summary: summary, mood: mood, pm: pm, dateFor: dateFor };
})(window);
