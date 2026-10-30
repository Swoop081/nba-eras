/* Real franchise changes between seasons. Keyed by the season that just ended. */
(function (root) {
  var HISTORY = {
    1946: {
      fold: ['cleveland-rebels', 'detroit-falcons', 'pittsburgh-ironmen', 'toronto-huskies'],
      join: [{ id: 'baltimore-bullets', city: 'Baltimore', name: 'Bullets', division: 'Western', colors: ['#8E1B2B', '#E8D9B5'], w: 0, l: 0 }],
      news: 'The league contracts after its first season. Cleveland, Detroit, Pittsburgh and Toronto fold, and Baltimore joins from the American Basketball League.'
    }
  };
  root.History = { get: function (year) { return HISTORY[year] || null; } };
})(window);
