#!/usr/bin/env python3
"""Position, height and age for current-roster players the game is missing (from each player's Wikipedia infobox).
Writes data/extra-players-2026.json: {teamId: [{name, pos, hgt (inches), age, caption}]}"""
import json, re, time, urllib.request, urllib.parse, html, datetime
from bs4 import BeautifulSoup
EXTRA = {
 'atlanta-hawks': ['RayJ Dennis', 'Keshon Gilbert', 'Jalen Wilson'],
 'boston-celtics': ['Devin Carter', 'Dillon Mitchell', 'Amari Williams'],
 'brooklyn-nets': ['Tyler Bilodeau', 'Joshua Jefferson', 'Grant Nelson'],
 'charlotte-hornets': ['Michael Ajayi', 'Kylan Boswell'],
 'cleveland-cavaliers': ['Thomas Bryant', 'Khalifa Diop', 'Tristan Enaruna', 'Riley Minix', "Nae'Qwan Tomlin", 'Ernest Udeh Jr.'],
 'detroit-pistons': ['Ugonna Onyenso'],
 'golden-state-warriors': ['Jimmy Butler', 'Moses Moody', 'Kristaps Porziņģis'],
 'houston-rockets': ['Quadir Copeland'],
 'los-angeles-lakers': ['Arthur Kaluma', 'Lawson Lovering'],
 'memphis-grizzlies': ['Carson Cooper', 'Jahmai Mashack', 'Javon Small'],
 'miami-heat': ['Tre Donaldson', 'Vladislav Goldin', 'Keshad Johnson'],
 'milwaukee-bucks': ['Kam Jones', 'Pete Nance', 'Cormac Ryan'],
 'minnesota-timberwolves': ['Donte DiVincenzo', 'Enrique Freeman', 'Rocco Zikarsky'],
 'new-orleans-pelicans': ['Malik Dia', 'Jaron Pierre Jr.', 'Julian Reese', 'Tyler Nickel'],
 'orlando-magic': ['Izaiyah Nelson'],
 'philadelphia-76ers': ['Tacko Fall', 'Rayan Rupert'],
 'portland-trail-blazers': ['Chris Youngblood'],
 'sacramento-kings': ['Sean Pedulla'],
 'san-antonio-spurs': ['Jayden Quaintance'],
 'toronto-raptors': ['Nate Bittle'],
 'utah-jazz': ['Trey Alexander', 'Kobe Bufkin'],
 'washington-wizards': ['Jamir Watkins']}
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
def posmap(t):
    t = t.lower()
    big = 'center' in t; fwd = 'forward' in t; grd = 'guard' in t
    if big and fwd: return 'F-C'
    if big: return 'C'
    if grd and fwd: return 'G-F'
    if grd: return 'G'
    return 'F'
out, log = {}, []
for tid, names in EXTRA.items():
    out[tid] = []
    for nm in names:
        try:
            q = re.sub(r'\bJr\.|\bII\b', '', nm).strip()
            hits = api(action='query', list='search', srsearch=q + ' basketball player', srlimit=3)['query']['search']
            title = hits[0]['title']
            soup = BeautifulSoup(api(action='parse', page=title, prop='text', redirects=1)['parse']['text']['*'], 'html.parser')
            info = soup.find('table', class_=re.compile('infobox'))
            txt = clean(info.get_text(' ')) if info else ''
            cap = re.search(r'No\. (00|\d{1,2}) – ([A-Za-z .]+?) (Position|Positions)', txt)
            pos = re.search(r'Positions? ([A-Za-z /,]+?) (League|Personal)', txt)
            ht = re.search(r'Listed height (\d) ft (\d{1,2})(?:\.\d)? in', txt)
            born = re.search(r'\((\d{4})-(\d{2})-(\d{2})\)', txt)
            age = None
            if born:
                b = datetime.date(int(born.group(1)), int(born.group(2)), int(born.group(3))); today = datetime.date.today()
                age = today.year - b.year - ((today.month, today.day) < (b.month, b.day))
            rec = {'name': nm, 'page': title, 'pos': posmap(pos.group(1)) if pos else None, 'hgt': int(ht.group(1)) * 12 + int(ht.group(2)) if ht else None, 'age': age,
                   'no': cap.group(1) if cap else None, 'caption_team': cap.group(2) if cap else None}
            out[tid].append(rec); log.append('%s %r' % (tid, rec))
        except Exception as e:
            log.append('%s %s ERR %r' % (tid, nm, e))
json.dump(out, open('data/extra-players-2026.json', 'w'), indent=1, ensure_ascii=False)
print('\n'.join(log))
