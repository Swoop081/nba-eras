#!/usr/bin/env python3
"""Current rosters straight from each team's Wikipedia roster table. Writes data/rosters-wiki-2026.json {teamId: {rows:[[cells]], head:[..]}}"""
import json, re, time, urllib.request, urllib.parse, html
from bs4 import BeautifulSoup
TEAMS = {'atlanta-hawks':'Atlanta Hawks','boston-celtics':'Boston Celtics','brooklyn-nets':'Brooklyn Nets','charlotte-hornets':'Charlotte Hornets','chicago-bulls':'Chicago Bulls','cleveland-cavaliers':'Cleveland Cavaliers','dallas-mavericks':'Dallas Mavericks','denver-nuggets':'Denver Nuggets','detroit-pistons':'Detroit Pistons','golden-state-warriors':'Golden State Warriors','houston-rockets':'Houston Rockets','indiana-pacers':'Indiana Pacers','la-clippers':'Los Angeles Clippers','los-angeles-lakers':'Los Angeles Lakers','memphis-grizzlies':'Memphis Grizzlies','miami-heat':'Miami Heat','milwaukee-bucks':'Milwaukee Bucks','minnesota-timberwolves':'Minnesota Timberwolves','new-orleans-pelicans':'New Orleans Pelicans','new-york-knicks':'New York Knicks','oklahoma-city-thunder':'Oklahoma City Thunder','orlando-magic':'Orlando Magic','philadelphia-76ers':'Philadelphia 76ers','phoenix-suns':'Phoenix Suns','portland-trail-blazers':'Portland Trail Blazers','sacramento-kings':'Sacramento Kings','san-antonio-spurs':'San Antonio Spurs','toronto-raptors':'Toronto Raptors','utah-jazz':'Utah Jazz','washington-wizards':'Washington Wizards'}
def api(**p):
    p['format'] = 'json'
    req = urllib.request.Request('https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode(p), headers={'User-Agent': 'nba-eras-private-game/1.0 (hobby project; github Swoop081)'})
    for k in range(8):
        try:
            time.sleep(1.2); return json.load(urllib.request.urlopen(req, timeout=60))
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == 7: raise
            time.sleep(10 * (k + 1))
def clean(t): return re.sub(r'\[[^\]]*\]|\s+', ' ', html.unescape(t)).strip()
out = {}
for tid, nm in TEAMS.items():
    soup = BeautifulSoup(api(action='parse', page=nm, prop='text', redirects=1)['parse']['text']['*'], 'html.parser')
    best = None
    for tb in soup.find_all('table'):
        hd = clean(tb.get_text(' '))[:400]
        if re.search(r'\bPos', hd) and re.search(r'\bHt|Height', hd) and re.search(r'Name|Player', hd):
            rows = [[clean(c.get_text(' ')) + ('|TW' if c.find(string=re.compile('two-way', re.I)) else '') for c in tr.find_all(['td', 'th'])] for tr in tb.find_all('tr')]
            if best is None or len(rows) > len(best['rows']): best = {'rows': rows}
    # footnotes/legend text around roster
    out[tid] = best or {'rows': []}
    print(tid, len(out[tid]['rows']), flush=True)
json.dump(out, open('data/rosters-wiki-2026.json', 'w'), ensure_ascii=False, indent=1)
