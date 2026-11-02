#!/usr/bin/env python3
"""Fill the jersey numbers the season pages missed: read each player's own Wikipedia infobox (Number row).
Writes data/jersey-numbers-extra.json {teamId: {name: number}} and a log of every candidate seen."""
import json, re, time, urllib.request, urllib.parse, html
from bs4 import BeautifulSoup
MISSING = {
 'toronto-raptors': ['Jakob Poeltl', 'Dailyn Swain'], 'memphis-grizzlies': ['GG Jackson', "D'Angelo Russell", 'Cole Anthony'],
 'cleveland-cavaliers': ['Kenrich Williams', 'Hannes Steinbach', 'Craig Porter Jr.', 'Jalen Pickett', 'Alex Morales'],
 'minnesota-timberwolves': ['Jordan Hawkins'], 'portland-trail-blazers': ['Yang Hansen'], 'utah-jazz': ['Svi Mykhailiuk'],
 'new-orleans-pelicans': ['Caleb Houstan'], 'charlotte-hornets': ['Rob Dillingham'], 'chicago-bulls': ['Nic Claxton'],
 'philadelphia-76ers': ['Johni Broome'], 'oklahoma-city-thunder': ['Otega Oweh'], 'boston-celtics': ['Milos Uzan', 'Tucker DeVries'],
 'los-angeles-lakers': ['Dalton Knecht'], 'miami-heat': ['Drew Timme', 'EJ Liddell']}
def api(**p):
    p['format'] = 'json'
    url = 'https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode(p)
    req = urllib.request.Request(url, headers={'User-Agent': 'nba-eras-private-game/1.0 (hobby project; contact via github Swoop081)'})
    for k in range(8):
        try:
            time.sleep(1.2)
            return json.load(urllib.request.urlopen(req, timeout=60))
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == 7: raise
            time.sleep(10 * (k + 1))
def clean(t): return re.sub(r'\[[^\]]*\]|\s+', ' ', html.unescape(t)).strip()
out, log = {}, []
for tid, names in MISSING.items():
    out[tid] = {}
    for nm in names:
        try:
            hits = api(action='query', list='search', srsearch=nm + ' basketball', srlimit=3)['query']['search']
            title = hits[0]['title'] if hits else None
            if not title: log.append('%s %s NO PAGE' % (tid, nm)); continue
            soup = BeautifulSoup(api(action='parse', page=title, prop='text', redirects=1)['parse']['text']['*'], 'html.parser')
            info = soup.find('table', class_=re.compile('infobox'))
            txt = clean(info.get_text(' ')) if info else ''
            m = re.search(r'No\. (00|\d{1,2}) \u2013 ([A-Za-z .]+?) (Position|Positions)', txt)
            log.append('%s | %s | page=%s | caption=%r' % (tid, nm, title, m.group(0) if m else None))
            if m: out[tid][nm] = m.group(1); out[tid][nm + ' @team'] = m.group(2)

        except Exception as e:
            log.append('%s %s ERR %r' % (tid, nm, e))
json.dump(out, open('data/jersey-numbers-extra.json', 'w'), indent=1, ensure_ascii=False)
print('\n'.join(log))
