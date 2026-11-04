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
      games: 60, kind: 'grp', po: { q: 4, best: [3, 3, 7] },
      playoffs: 'Four clubs from each division qualify. Division semifinals and finals are best-of-three, then a best-of-seven Finals.'
    },
    1949: {
      games: 68, kind: 'nba50',
      playoffs: 'Twelve clubs qualify, the top four in each of three divisions. Division semifinals and finals are best-of-three. The three division winners then meet: the best record goes straight to the Finals and the other two play a best-of-three semifinal. The Finals are best-of-seven.',
      notes: ['The BAA and NBL merge into the NBA', 'Three divisions', 'Four 12-minute quarters', 'Six personal fouls and you are out', 'No shot clock, no three-point line']
    },
    1950: {
      games: 68, kind: 'grp', po: { q: 4, best: [3, 5, 7] },
      playoffs: 'Four clubs from each of two divisions qualify. Division semifinals are best-of-three, division finals best-of-five, and the Finals best-of-seven.',
      notes: ['Four 12-minute quarters', 'Six personal fouls and you are out', 'No shot clock, no three-point line', 'First All-Star Game']
    },
    1951: { games: 66 },
    1952: { games: 70 },
    1953: {
      games: 72, kind: 'grp', po: { q: 3, best: [3, 3, 7] },
      playoffs: 'Three clubs from each division qualify (a round-robin sorts them out in the real league). The top two in each division meet for the division title, then the Finals are best-of-seven.',
      notes: ['Four 12-minute quarters', 'Six personal fouls and you are out', 'No shot clock until 1954-55']
    },
    1954: {
      games: 72, kind: 'grp', po: { q: 3, best: [3, 5, 7] },
      playoffs: 'The top three clubs in each division qualify. The division winner gets a bye; seconds and thirds play a best-of-three, then the division finals are best-of-five and the Finals best-of-seven.',
      notes: ['24-second shot clock', 'Teams are limited to six fouls a quarter before bonus free throws', 'Four 12-minute quarters', 'Six personal fouls and you are out']
    },
    1957: { po: { q: 3, best: [3, 7, 7] }, playoffs: 'The top three clubs in each division qualify. The division winner gets a bye; seconds and thirds play a best-of-three, then the division finals and the Finals are best-of-seven.' },
    1959: { games: 75 },
    1960: { games: 79, po: { q: 3, best: [5, 7, 7] }, playoffs: 'The top three clubs in each division qualify. The division winner gets a bye; seconds and thirds play a best-of-five, then the division finals and the Finals are best-of-seven.' },
    1961: { games: 80 },
    1966: {
      games: 81, kind: 'grp', po: { q: 4, best: [5, 7, 7] },
      playoffs: 'The top four clubs in each division qualify: first plays fourth and second plays third. Division semifinals are best-of-five, the rest best-of-seven.'
    },
    1967: {
      games: 82, po: { q: 4, best: [7, 7, 7] },
      playoffs: 'The top four clubs in each division qualify: first plays fourth and second plays third, every round a best-of-seven through the Finals.'
    },
    1970: {
      po: { q: 4, best: [7, 7, 7] },
      playoffs: 'The top four clubs in each conference qualify. Every round is a best-of-seven.',
      notes: ['Divisions become conferences', 'Four 12-minute quarters', '24-second shot clock', 'No three-point line until 1979-80']
    },
    1974: {
      po: { q: 5, best: [3, 7, 7, 7] },
      playoffs: 'Ten clubs qualify, five from each conference. The fourth and fifth seeds play a best-of-three; the top three seeds get a bye. Every later round is a best-of-seven.'
    },
    1976: {
      games: 82, po: { q: 6, best: [3, 7, 7, 7] },
      playoffs: 'Twelve clubs qualify, six from each conference. The top two seeds in each conference get a bye; seeds three to six play a best-of-three first round. Every later round is a best-of-seven.',
      notes: ['Four 12-minute quarters', '24-second shot clock', 'No three-point line until 1979-80', 'Free agency with compensation']
    },
    1979: { notes: ['Three-point line introduced', 'Four 12-minute quarters', '24-second shot clock'] },
    1983: {
      games: 82, po: { q: 8, best: [5, 7, 7, 7] },
      playoffs: 'The eight best records in each conference qualify and are seeded one to eight. The first round is a best-of-five; every later round, including the Finals, is a best-of-seven.',
      notes: ['Four 12-minute quarters', '24-second shot clock and the three-point line', 'Salary cap with exceptions (from 1984-85)', 'Rosters of 12']
    },
    1984: { fin232: true, lottery: 7 },
    1989: { lottery: 11 },
    1993: { lottery: 14 },
    1996: { notes: ['Four 12-minute quarters', '24-second shot clock and the three-point line', 'Salary cap with exceptions', 'Rosters of 12 to 15'] },
    1998: { games: 50, notes: ['Lockout shortens the season to 50 games'] },
    1999: { games: 82 },
    2000: { notes: ['Four 12-minute quarters', 'Six personal fouls and you are out', '24-second shot clock and the three-point line', '30 clubs, 15-man rosters', 'Salary cap and contracts'] },
    2002: { po: { q: 8, best: [7, 7, 7, 7] }, playoffs: 'The eight best records in each conference qualify and are seeded one to eight. Every round is a best-of-seven: first round, conference semifinals, conference finals, then the Finals.' },
    2004: { notes: ['Hand-checking is banned on the perimeter', 'Divisions are realigned into six'] },
    2011: { games: 66, notes: ['Lockout shortens the season to 66 games'] },
    2012: { games: 82 },
    2013: { fin232: false },
    2019: { games: 72, notes: ['The pandemic suspends the season; it finishes in a bubble'] },
    2020: { games: 72, playin: true, notes: ['Play-in tournament for seeds seven to ten', 'Season shortened to 72 games'] },
    2021: { games: 82 },
    2023: { notes: ['In-season tournament (NBA Cup)', 'Play-in tournament is permanent'] }
  };
  function get(year) {
    var best = null;
    Object.keys(TABLE).map(Number).sort(function (a, b) { return a - b; }).forEach(function (y) { if (y <= year) best = y; });
    var out = { since: best };
    ['games', 'kind', 'playoffs', 'notes', 'firstBest', 'po', 'fin232', 'playin', 'lottery'].forEach(function (k) {
      for (var y = best; y !== null && y >= 1946; y--) if (TABLE[y] && TABLE[y][k] !== undefined) { out[k] = TABLE[y][k]; break; }
    });
    return out;
  }
  root.Rules = { get: get, games: function (year) { return get(year).games; } };
})(window);
