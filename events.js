/* NBA Eras daily event stack: headlines, radio, fan letters, rumours and conversations.
   Pure functions. Mood lives in save.mood so it is saved with the season. */
(function (root) {
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  function last(name) { var p = name.split(' '); return p[p.length - 1]; }
  function fill(t, d) { return t.replace(/\{(\w+)\}/g, function (m, k) { return d[k] !== undefined ? d[k] : m; }); }

  var MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  function dateFor(save) {
    var off = save.phase === 'regular' ? Math.round(save.day * 2.2) : 145 + (save.pd || 0) * 2;
    var d = new Date(Date.UTC(save.year, 10, 1 + off));
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
  }

  function mood(save) {
    if (!save.mood) save.mood = { p: {}, coach: 50, fans: 50, streak: 0, cool: { conv: 0, rumour: 0 }, news: [] };
    return save.mood;
  }
  function pm(save, id) {
    var m = mood(save);
    if (!m.p[id]) m.p[id] = { m: 60, t: 50 };
    return m.p[id];
  }

  /* Ratings scaled by morale: roughly +/-5% at the extremes. */
  function moraleRoster(save, players) {
    return players.map(function (p) {
      var f = 1 + (pm(save, p.id).m - 50) * 0.001;
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
    }
  };
  function voice(year) { return VOICE[year] || VOICE[1946]; }

  /* ---------- after-game mood changes ---------- */
  function afterGame(save, me, mine, rosterMe, won) {
    var m = mood(save);
    m.streak = won ? Math.max(1, m.streak + 1) : Math.min(-1, m.streak - 1);
    m.fans = clamp(m.fans + (won ? 2 : -2));
    var ranked = rosterMe.slice().sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
    ranked.forEach(function (p, i) {
      var x = pm(save, p.id);
      if (i < 5) x.m = clamp(x.m + (won ? 0.8 : -0.8));
      else if (i < 8) x.m = clamp(x.m + (won ? 0.2 : -0.6) - 0.5);
      else x.m = clamp(x.m - 0.3);
    });
    m.cool.conv = Math.max(0, m.cool.conv - 1);
    m.cool.rumour = Math.max(0, m.cool.rumour - 1);
    m.cool.period = Math.max(0, (m.cool.period || 0) - 1);
  }


  /* Little scenes from the 1940s road: rail travel, exhibitions, the war's aftermath. */
  var PERIOD = [
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
    out.push({ kind: 'news', head: headline, dateline: ctx.me.city.toUpperCase() + ', ' + date, sub: sub, source: v.paper });
    m.news.push({ text: headline, date: date });
    if (m.news.length > 12) m.news.shift();

    var bigPts = star.s.pts >= 20;
    var topAst = lines.slice().sort(function (a, b) { return b.s.ast - a.s.ast; })[0];
    if (bigPts || topAst.s.ast >= 7) {
      var text = bigPts
        ? rnd(['And {n} hits again! That is {x} points tonight, folks, and the crowd is on its feet!', '{n} from the corner. Good! He now has {x} points and nobody can stop him!', 'Listeners, you are hearing history. {n} has {x} points and the night is young!'])
        : '{n} threads another pass, that is {x} assists for him tonight. He sees the whole floor!';
      out.push({ kind: 'radio', text: fill(text, { n: bigPts ? star.name : topAst.name, x: bigPts ? star.s.pts : topAst.s.ast }), source: v.announcer });
    }

    if (Math.abs(m.streak) >= 3 || Math.random() < 0.3) {
      var fan;
      if (m.streak >= 3) fan = rnd(['Sir, I have watched basketball in this city twenty years and never seen a quintet play so. Keep it up!', 'The whole street is talking about the {C} club. Make room on the bandwagon!']);
      else if (m.streak <= -3) fan = rnd(['Sir, are the {C} a basketball team or a social club? I want my money back!', 'Three straight defeats! Somebody in the front office is asleep at the switch.']);
      else if (won) fan = rnd(['A fine evening at {hall}. The boys gave us our money\'s worth.', 'My boy shook {star}\'s hand after the game. He will talk about it for a year.']);
      else fan = rnd(['A dollar twenty for a seat in the rafters and a loss to boot. Highway robbery!', 'The boys looked tired out there. Give them a rest, I say.']);
      out.push({ kind: 'fans', text: fill(fan, { C: ctx.me.city, hall: v.hall, star: last(star.name) }), name: rnd(['A Loyal Fan', 'Cheap Seat Charlie', 'Disgruntled of Flatbush', 'A Season Ticket Holder', 'Mrs. Annie Kowalski']) });
    }

    if (m.cool.rumour === 0 && Math.random() < 0.14) {
      m.cool.rumour = 8;
      var mine = ctx.rosterMe.slice().sort(function (a, b) { return b.ratings.ovr - a.ratings.ovr; });
      var target = mine[Math.floor(Math.random() * Math.min(4, mine.length))];
      var other = rnd(ctx.others || [ctx.opp]);
      if (Math.random() < 0.6) {
        out.push({
          kind: 'rumour', pid: target.id, who: target.name,
          text: fill('REPORT FROM {OC} STOP {OT} CLUB SAID TO BE ASKING ABOUT {P} STOP WILL YOU DENY IT STOP', { OC: other.city.toUpperCase(), OT: other.name.toUpperCase(), P: target.name.toUpperCase() }),
          choices: [
            { label: 'Wire back: not for sale', fx: { s: { m: 2, t: 4 }, fans: 1 }, say: 'Denied' },
            { label: 'Say nothing', fx: { s: { t: target && pm(save, target.id).m < 50 ? -3 : -1 } }, say: 'No comment' }
          ]
        });
      } else {
        out.push({ kind: 'rumour', text: fill('OWNERS MEETING IN {OC} STOP TALK OF SCHEDULE CHANGES AND NEW ARENAS STOP NOTHING CONFIRMED STOP', { OC: other.city.toUpperCase() }), choices: [{ label: 'Noted', fx: {}, say: 'Noted' }] });
      }
    }

    if (save.phase === 'regular' && !(m.cool.period > 0) && Math.random() < 0.06) {
      m.cool.period = 14;
      out.push(rnd(PERIOD)(ctx));
    }

    var conv = pickConversation(save, ctx, lines, won);
    if (conv) { m.cool.conv = 3; out.push(conv); }
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
