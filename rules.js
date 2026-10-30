/* Rules of the league, keyed by the season they take effect. A rule stays in force until history changes it,
   so a league that never follows history keeps playing by the last real rules. */
(function (root) {
  var TABLE = {
    1946: {
      games: 60, kind: 'ladder47',
      playoffs: 'Six clubs qualify, three from each division. The two division winners meet in a best-of-seven semifinal. The four runners-up play best-of-three series against each other, and the survivor meets the semifinal winner in a best-of-seven Finals.',
      notes: ['Four 12-minute quarters', 'Six personal fouls and you are out', 'No shot clock, no three-point line', '$55,000 team salary cap']
    },
    1947: {
      games: 48, kind: 'semi4',
      playoffs: 'Four clubs qualify: the two division winners and the next two best records. Winners of each division meet in a best-of-seven semifinal, as do the other two clubs, then a best-of-seven Finals.'
    },
    1948: {
      games: 60, kind: 'div4',
      playoffs: 'Top four clubs in each division qualify. Division semifinals and finals are best-of-three, then a best-of-seven Finals.'
    }
  };
  function get(year) {
    var best = null;
    Object.keys(TABLE).map(Number).sort(function (a, b) { return a - b; }).forEach(function (y) { if (y <= year) best = y; });
    var out = { since: best };
    ['games', 'kind', 'playoffs', 'notes'].forEach(function (k) {
      for (var y = best; y !== null && y >= 1946; y--) if (TABLE[y] && TABLE[y][k] !== undefined) { out[k] = TABLE[y][k]; break; }
    });
    return out;
  }
  root.Rules = { get: get, games: function (year) { return get(year).games; } };
})(window);
