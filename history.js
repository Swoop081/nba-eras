/* Real franchise changes, keyed by the season that just ended. Each season with real events asks the
   player whether to keep history or change it, and resolves any contradiction with the league as it stands. */
(function (root) {
  function club(id, city, name, c1, c2) { return { id: id, city: city, name: name, division: 'Western', colors: [c1, c2], w: 0, l: 0 }; }
  var HISTORY = {
    1946: [{
      id: 'contraction-1947',
      title: 'The league contracts',
      news: 'Cleveland, Detroit, Pittsburgh and Toronto fold after the first season. Baltimore joins from the American Basketball League and Washington moves to the Western Division.',
      alt: 'Nobody folds and Baltimore joins as a twelfth club.',
      fold: ['cleveland-rebels', 'detroit-falcons', 'pittsburgh-ironmen', 'toronto-huskies'],
      join: [club('baltimore-bullets', 'Baltimore', 'Bullets', '#8E1B2B', '#E8D9B5')],
      move: { 'washington-capitols': { from: 'Eastern', to: 'Western' } }
    }],
    1947: [{
      id: 'nbl-arrivals-1948',
      title: 'Four National Basketball League clubs defect',
      news: 'Fort Wayne, Indianapolis, Minneapolis and Rochester leave the rival National Basketball League and join the BAA. Baltimore and Washington return to the East. Rosters are rebuilt from veterans because no real data exists for these clubs yet.',
      alt: 'The four clubs still join, and the divisions stay as they are.',
      fold: [],
      join: [
        club('fort-wayne-pistons', 'Fort Wayne', 'Pistons', '#B22234', '#FFFFFF'),
        club('indianapolis-jets', 'Indianapolis', 'Jets', '#1D428A', '#FDB927'),
        club('minneapolis-lakers', 'Minneapolis', 'Lakers', '#1D428A', '#F2E9D0'),
        club('rochester-royals', 'Rochester', 'Royals', '#1D428A', '#C8102E')
      ],
      move: { 'washington-capitols': { from: 'Western', to: 'Eastern' }, 'baltimore-bullets': { from: 'Western', to: 'Eastern' } }
    }]
  };
  root.History = { get: function (year) { return HISTORY[year] || []; } };
})(window);
