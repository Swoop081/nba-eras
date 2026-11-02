#!/usr/bin/env python3
"""Pull each club's current jersey numbers from the season page on Wikipedia (roster table with No. and Player columns).
Writes data/jersey-numbers-2026.json: {teamId: {player name: number}}"""
import json, re, time, urllib.request, urllib.parse, html
from bs4 import BeautifulSoup
PAGES = {'atlanta-hawks':'Atlanta_Hawks','boston-celtics':'Boston_Celtics','brooklyn-nets':'Brooklyn_Nets','charlotte-hornets':'Charlotte_Hornets','chicago-bulls':'Chicago_Bulls','cleveland-cavaliers':'Cleveland_Cavaliers','dallas-mavericks':'Dallas_Mavericks','denver-nuggets':'Denver_Nuggets','detroit-pistons':'Detroit_Pistons','golden-state-warriors':'Golden_State_Warriors','houston-rockets':'Houston_Rockets','indiana-pacers':'Indiana_Pacers','la-clippers':'Los_Angeles_Clippers','los-angeles-lakers':'Los_Angeles_Lakers','memphis-grizzlies':'Memphis_Grizzlies','miami-heat':'Miami_Heat','milwaukee-bucks':'Milwaukee_Bucks','minnesota-timberwolves':'Minnesota_Timberwolves','new-orleans-pelicans':'New_Orleans_Pelicans','new-york-knicks':'New_York_Knicks','oklahoma-city-thunder':'Oklahoma_City_Thunder','orlando-magic':'Orlando_Magic','philadelphia-76ers':'Philadelphia_76ers','phoenix-suns':'Phoenix_Suns','portland-trail-blazers':'Portland_Trail_Blazers','sacramento-kings':'Sacramento_Kings','san-antonio-spurs':'San_Antonio_Spurs','toronto-raptors':'Toronto_Raptors','utah-jazz':'Utah_Jazz','washington-wizards':'Washington_Wizards'}
def api(**p):
    p['format'] = 'json'
    url = 'https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode(p)
    req = urllib.request.Request(url, headers={'User-Agent': 'nba-eras-private-game/1.0 (hobby project; contact via github Swoop081)'})
    for k in range(8):
        try:
            time.sleep(1.5)
            return json.load(urllib.request.urlopen(req, timeout=60))
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            if e.code != 429 or k == 7: raise
            time.sleep(10 * (k + 1))
def clean(t): return re.sub(r'\[[^\]]*\]|\s+', ' ', html.unescape(t)).strip()
def season_title(page, a, b): return '%d\u2013%02d_%s_season' % (a, b, page)
out, log = {}, []
for tid, page in PAGES.items():
    nums = {}
    for a in (2026, 2025):
        t = season_title(page, a, (a + 1) % 100)
        try:
            r = api(action='parse', page=t, prop='text', redirects=1)
        except Exception as e:
            log.append('%s %s ERR %r' % (tid, t, e)); continue
        if not r or 'parse' not in r: continue
        soup = BeautifulSoup(r['parse']['text']['*'], 'html.parser')
        for tb in soup.find_all('table'):
            rows = tb.find_all('tr')
            if len(rows) < 6: continue
            hdr = [clean(c.get_text()).lower() for c in rows[0].find_all(['th', 'td'])]
            if not any(h in ('no.', 'no', '#') for h in hdr): continue
            ci = [i for i, h in enumerate(hdr) if h in ('no.', 'no', '#')][0]
            pi = [i for i, h in enumerate(hdr) if h in ('player', 'name')]
            if not pi: continue
            pi = pi[0]
            for tr in rows[1:]:
                cells = [clean(c.get_text(' ')) for c in tr.find_all(['th', 'td'])]
                if len(cells) <= max(ci, pi): continue
                n = re.match(r'^(00|\d{1,2})', cells[ci])
                nm = re.sub(r'\s*\(.*?\)|\s*[*#\u2020\u2021]+$', '', cells[pi]).strip()
                if n and nm and re.search(r'[A-Za-z]{2}', nm): nums[nm] = n.group(1)
            if nums: break
        if nums:
            log.append('%s %s %d' % (tid, t, len(nums))); break
    out[tid] = nums
json.dump(out, open('data/jersey-numbers-2026.json', 'w'), indent=1, ensure_ascii=False)
print('\n'.join(log))
