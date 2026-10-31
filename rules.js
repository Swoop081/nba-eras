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
    },
    1951: {
      games: 66, kind: 'top',
      playoffs: 'The best clubs by record qualify and meet in short series that grow longer each round, ending in a best-of-seven Finals.',
      notes: ['Four 12-minute quarters', '24-second shot clock', 'Six personal fouls and you are out', 'Players are paid by their club, no league cap']
    },
    1954: {
      kind: 'div3',
      playoffs: 'The top three clubs in each division qualify. The division winner gets a bye; seconds and thirds meet in a short series, then division finals and the Finals are best-of-seven.'
    },
    1956: { games: 72 },
    1961: { games: 79 },
    1967: {
      games: 81, kind: 'div4x',
      playoffs: 'The top four clubs in each division qualify: first plays fourth and second plays third, every round a best-of-seven through the Finals.'
    },
    1968: { games: 82 },
    1976: {
      games: 82, kind: 'nba12', firstBest: 3,
      playoffs: 'Twelve clubs qualify, six from each conference. The top two seeds in each conference get a bye; seeds three to six play a best-of-three first round. Every later round is a best-of-seven.',
      notes: ['Four 12-minute quarters', '24-second shot clock', 'No three-point line until 1979-80', 'Free agency with compensation']
    },
    1983: {
      games: 82, kind: 'nba', firstBest: 5,
      playoffs: 'The eight best records in each conference qualify and are seeded one to eight. The first round is a best-of-five; every later round, including the Finals, is a best-of-seven.',
      notes: ['Four 12-minute quarters', '24-second shot clock and the three-point line', 'Salary cap with exceptions (from 1984-85)', 'Rosters of 12']
    },
    1996: {
      games: 82, kind: 'nba', firstBest: 5,
      playoffs: 'The eight best records in each conference qualify and are seeded one to eight. The first round is a best-of-five; every later round, including the Finals, is a best-of-seven.',
      notes: ['Four 12-minute quarters', '24-second shot clock and the three-point line', 'Salary cap with exceptions', 'Rosters of 12 to 15']
    },
    2000: {
      games: 82, kind: 'nba',
      playoffs: 'The eight best records in each conference qualify and are seeded one to eight. Every round is a best-of-seven: first round, conference semifinals, conference finals, then the Finals between the two conference champions. (The real league also runs a play-in tournament for seeds seven to ten. That is not in the game yet.)',
      notes: ['Four 12-minute quarters', 'Six personal fouls and you are out', '24-second shot clock and the three-point line', '30 clubs, 15-man rosters', 'Salary cap and contracts']
    },
    2003: { firstBest: 7 }
  };
  function get(year) {
    var best = null;
    Object.keys(TABLE).map(Number).sort(function (a, b) { return a - b; }).forEach(function (y) { if (y <= year) best = y; });
    var out = { since: best };
    ['games', 'kind', 'playoffs', 'notes', 'firstBest'].forEach(function (k) {
      for (var y = best; y !== null && y >= 1946; y--) if (TABLE[y] && TABLE[y][k] !== undefined) { out[k] = TABLE[y][k]; break; }
    });
    return out;
  }
  root.Rules = { get: get, games: function (year) { return get(year).games; } };
})(window);
