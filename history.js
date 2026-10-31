/* Real franchise changes, keyed by the season that just ended. Each season with real events asks the
   player whether to keep history or change it, and resolves any contradiction with the league as it stands. */
(function (root) {
  function club(id, city, name, c1, c2, nbaId) { return { id: id, city: city, name: name, division: 'Western', colors: [c1, c2], w: 0, l: 0, nbaId: nbaId || null }; }
  function ev(id, title, news, alt, o) { var e = { id: id, title: title, news: news, alt: alt, fold: [], join: [], move: {}, rename: {} }; for (var k in o) e[k] = o[k]; return e; }
  function rn(city, name, c1, c2, nbaId) { return { city: city, name: name, colors: [c1, c2], nbaId: nbaId || null }; }
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
  /* Real league events from 1950 on, keyed by the season that just ended. A club that does not exist in your league is simply skipped. */
  function add(y, e) { (HISTORY[y] = HISTORY[y] || []).push(e); }
  add(1954, ev('mil-stl-1955', 'The Hawks move to St. Louis', 'The Milwaukee Hawks relocate to St. Louis.', 'The Hawks stay in Milwaukee.', { rename: { 'milwaukee-hawks': rn('St. Louis', 'Hawks', '#E03A3E', '#C1D32F', 1610612737) } }));
  add(1956, ev('ftw-det-1957', 'The Pistons move to Detroit', 'The Fort Wayne Pistons relocate to Detroit; the Rochester Royals become the Cincinnati Royals.', 'Both clubs stay where they are.', { rename: { 'fort-wayne-pistons': rn('Detroit', 'Pistons', '#C8102E', '#1D42BA', 1610612765), 'rochester-royals': rn('Cincinnati', 'Royals', '#6F2C91', '#FFFFFF', 1610612758) } }));
  add(1959, ev('min-la-1960', 'The Lakers move to Los Angeles', 'The Minneapolis Lakers relocate to Los Angeles.', 'The Lakers stay in Minneapolis.', { rename: { 'minneapolis-lakers': rn('Los Angeles', 'Lakers', '#552583', '#FDB927', 1610612747) } }));
  add(1960, ev('chi-packers-1961', 'The Chicago Packers join', 'Chicago gets an expansion club, the Packers.', 'No expansion.', { join: [club('chicago-packers', 'Chicago', 'Packers', '#E03A3E', '#000000', 1610612764)] }));
  add(1961, ev('phw-sf-1962', 'The Warriors move to San Francisco', 'The Philadelphia Warriors relocate to San Francisco.', 'The Warriors stay in Philadelphia.', { rename: { 'philadelphia-warriors': rn('San Francisco', 'Warriors', '#1D428A', '#FFC72C', 1610612744), 'chicago-packers': rn('Chicago', 'Zephyrs', '#E03A3E', '#000000', 1610612764) } }));
  add(1962, ev('syr-phi-1963', 'The Nationals become the 76ers', 'Syracuse moves to Philadelphia as the 76ers; the Chicago Zephyrs move to Baltimore as the Bullets.', 'Both clubs stay put.', { rename: { 'syracuse-nationals': rn('Philadelphia', '76ers', '#006BB6', '#ED174C', 1610612755), 'chicago-zephyrs': rn('Baltimore', 'Bullets', '#002B5C', '#E31837', 1610612764) } }));
  add(1965, ev('chi-bulls-1966', 'The Chicago Bulls join', 'The Bulls are the league\'s tenth club.', 'No expansion.', { join: [club('chicago-bulls', 'Chicago', 'Bulls', '#CE1141', '#000000', 1610612741)] }));
  add(1966, ev('sea-sd-1967', 'Seattle and San Diego join', 'The SuperSonics and the Rockets enter the league.', 'No expansion.', { join: [club('seattle-supersonics', 'Seattle', 'SuperSonics', '#00653A', '#FFC200', 1610612760), club('san-diego-rockets', 'San Diego', 'Rockets', '#CE1141', '#C4CED4', 1610612745)] }));
  add(1967, ev('mil-phx-1968', 'Milwaukee and Phoenix join', 'The Bucks and the Suns enter the league. The Hawks move from St. Louis to Atlanta.', 'No expansion and the Hawks stay in St. Louis.', { join: [club('milwaukee-bucks', 'Milwaukee', 'Bucks', '#00471B', '#EEE1C6', 1610612749), club('phoenix-suns', 'Phoenix', 'Suns', '#E56020', '#1D1160', 1610612756)], rename: { 'st-louis-hawks': rn('Atlanta', 'Hawks', '#E03A3E', '#C1D32F', 1610612737) } }));
  add(1969, ev('cle-buf-por-1970', 'Cleveland, Buffalo and Portland join', 'The Cavaliers, the Braves and the Trail Blazers enter the league.', 'No expansion.', { join: [club('cleveland-cavaliers', 'Cleveland', 'Cavaliers', '#860038', '#FDBB30', 1610612739), club('buffalo-braves', 'Buffalo', 'Braves', '#FF6600', '#006BB6', 1610612746), club('portland-trail-blazers', 'Portland', 'Trail Blazers', '#E03A3E', '#000000', 1610612757)] }));
  add(1970, ev('moves-1971', 'The Warriors and Rockets move', 'San Francisco becomes Golden State; San Diego\'s Rockets move to Houston.', 'Both clubs stay in their cities.', { rename: { 'san-francisco-warriors': rn('Golden State', 'Warriors', '#1D428A', '#FFC72C', 1610612744), 'san-diego-rockets': rn('Houston', 'Rockets', '#CE1141', '#C4CED4', 1610612745) } }));
  add(1971, ev('cin-kc-1972', 'The Royals move to Kansas City', 'The Cincinnati Royals relocate to Kansas City and Omaha.', 'The Royals stay in Cincinnati.', { rename: { 'cincinnati-royals': rn('Kansas City-Omaha', 'Kings', '#6F2C91', '#FFFFFF', 1610612758) } }));
  add(1972, ev('bal-cap-1973', 'The Bullets move to the capital', 'Baltimore becomes the Capital Bullets, then the Washington Bullets.', 'The Bullets stay in Baltimore.', { rename: { 'baltimore-bullets': rn('Washington', 'Bullets', '#002B5C', '#E31837', 1610612764) } }));
  add(1973, ev('nojazz-1974', 'The New Orleans Jazz join', 'New Orleans gets an expansion club.', 'No expansion.', { join: [club('new-orleans-jazz', 'New Orleans', 'Jazz', '#002B5C', '#F9A01B', 1610612762)] }));
  add(1975, ev('aba-1976', 'The ABA merges into the NBA', 'Denver, Indiana, New Jersey and San Antonio join from the American Basketball Association.', 'No merger.', { join: [club('denver-nuggets', 'Denver', 'Nuggets', '#0E2240', '#FEC524', 1610612743), club('indiana-pacers', 'Indiana', 'Pacers', '#002D62', '#FDBB30', 1610612754), club('new-jersey-nets', 'New Jersey', 'Nets', '#002A60', '#CD1041', 1610612751), club('san-antonio-spurs', 'San Antonio', 'Spurs', '#C4CED4', '#000000', 1610612759)] }));
  add(1977, ev('buf-sd-1978', 'The Braves move to San Diego', 'Buffalo relocates to San Diego and become the Clippers.', 'The Braves stay in Buffalo.', { rename: { 'buffalo-braves': rn('San Diego', 'Clippers', '#C8102E', '#1D428A', 1610612746) } }));
  add(1978, ev('nojazz-utah-1979', 'The Jazz move to Utah', 'New Orleans becomes Utah.', 'The Jazz stay in New Orleans.', { rename: { 'new-orleans-jazz': rn('Utah', 'Jazz', '#4E008E', '#F9A01B', 1610612762) } }));
  add(1979, ev('dal-1980', 'The Dallas Mavericks join', 'Dallas gets an expansion club.', 'No expansion.', { join: [club('dallas-mavericks', 'Dallas', 'Mavericks', '#00538C', '#002B5E', 1610612742)] }));
  add(1983, ev('sd-la-1984', 'The Clippers move to Los Angeles', 'San Diego relocates to Los Angeles.', 'The Clippers stay in San Diego.', { rename: { 'san-diego-clippers': rn('LA', 'Clippers', '#C8102E', '#1D428A', 1610612746) } }));
  add(1984, ev('kc-sac-1985', 'The Kings move to Sacramento', 'Kansas City relocates to Sacramento.', 'The Kings stay in Kansas City.', { rename: { 'kansas-city-kings': rn('Sacramento', 'Kings', '#5A2D81', '#63727A', 1610612758) } }));
  add(1987, ev('cha-mia-1988', 'Charlotte and Miami join', 'The Hornets and the Heat enter the league.', 'No expansion.', { join: [club('charlotte-hornets', 'Charlotte', 'Hornets', '#1D1160', '#00788C', 1610612766), club('miami-heat', 'Miami', 'Heat', '#98002E', '#F9A01B', 1610612748)] }));
  add(1988, ev('orl-min-1989', 'Orlando and Minnesota join', 'The Magic and the Timberwolves enter the league.', 'No expansion.', { join: [club('orlando-magic', 'Orlando', 'Magic', '#0077C0', '#C4CED4', 1610612753), club('minnesota-timberwolves', 'Minnesota', 'Timberwolves', '#0C2340', '#236192', 1610612750)] }));
  add(1994, ev('tor-van-1995', 'Toronto and Vancouver join', 'The Raptors and the Grizzlies enter the league.', 'No expansion.', { join: [club('toronto-raptors', 'Toronto', 'Raptors', '#CE1141', '#000000', 1610612761), club('vancouver-grizzlies', 'Vancouver', 'Grizzlies', '#00B2A9', '#E43C40', 1610612763)] }));
  add(1996, ev('wsh-1997', 'The Bullets become the Wizards', 'Washington changes its name.', 'The Bullets keep their name.', { rename: { 'washington-bullets': rn('Washington', 'Wizards', '#002B5C', '#E31837', 1610612764) } }));
  add(2000, ev('van-mem-2001', 'The Grizzlies move to Memphis', 'Vancouver relocates to Memphis.', 'The Grizzlies stay in Vancouver.', { rename: { 'vancouver-grizzlies': rn('Memphis', 'Grizzlies', '#5D76A9', '#12173F', 1610612763) } }));
  add(2001, ev('cha-no-2002', 'The Hornets move to New Orleans', 'Charlotte relocates to New Orleans.', 'The Hornets stay in Charlotte.', { rename: { 'charlotte-hornets': rn('New Orleans', 'Hornets', '#00778B', '#280071', 1610612740) } }));
  add(2003, ev('cha-bobcats-2004', 'The Charlotte Bobcats join', 'Charlotte gets a new club, the Bobcats.', 'No expansion.', { join: [club('charlotte-bobcats', 'Charlotte', 'Bobcats', '#1D1160', '#F26532', 1610612766)] }));
  add(2007, ev('sea-okc-2008', 'The SuperSonics move to Oklahoma City', 'Seattle relocates to Oklahoma City as the Thunder.', 'The SuperSonics stay in Seattle.', { rename: { 'seattle-supersonics': rn('Oklahoma City', 'Thunder', '#007AC1', '#EF3B24', 1610612760) } }));
  add(2011, ev('nj-bkn-2012', 'The Nets move to Brooklyn', 'New Jersey relocates to Brooklyn.', 'The Nets stay in New Jersey.', { rename: { 'new-jersey-nets': rn('Brooklyn', 'Nets', '#000000', '#FFFFFF', 1610612751) } }));
  add(2012, ev('no-pel-2013', 'The Hornets become the Pelicans', 'New Orleans changes its name to the Pelicans.', 'The Hornets keep their name.', { rename: { 'new-orleans-hornets': rn('New Orleans', 'Pelicans', '#0C2340', '#C8102E', 1610612740) } }));
  add(2013, ev('cha-hornets-2014', 'The Bobcats become the Hornets', 'Charlotte takes back the Hornets name.', 'The Bobcats keep their name.', { rename: { 'charlotte-bobcats': rn('Charlotte', 'Hornets', '#1D1160', '#00788C', 1610612766) } }));
  root.History = { get: function (year) { return HISTORY[year] || []; } };
})(window);
