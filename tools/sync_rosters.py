#!/usr/bin/env python3
"""Roster sync for 2026-27 from the Wikipedia roster tables (data/rosters-wiki-2026.json):
 - every standard-contract player is on his real team; two-way players (p.tw) are on the roster too: fifteen standard plus up to three two-way
 - players missing from the game are rated by the normal pipeline from their 2025-26 Basketball Reference lines
 - jersey numbers come from the same tables; no invented injuries. Usage: python3 -I tools/sync_rosters.py"""
import csv, json, os, re, shutil, sys, tempfile, unicodedata, datetime, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_players_2026 as B
import pandas as pd
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DATA = os.path.join(ROOT, 'data')
ALIAS = {'nicclaxton': 'nicolasclaxton', 'jakobpoltl': 'jakobpoeltl', 'sviatoslavmykhailiuk': 'svimykhailiuk'}


def nm(s):
    s = re.sub(r'\((TW|GL|DP|FA|S)\)', '', s)
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\b(jr|sr|ii|iii|iv)\b\.?', '', s.replace('.', ''))
    k = re.sub(r'[^a-z]', '', s)
    return ALIAS.get(k, k)


CODE = {B.slug(c + ' ' + n): code for code, c, n, *_ in B.TEAMS}
W = json.load(open(os.path.join(DATA, 'rosters-wiki-2026.json')))
doc = json.load(open(os.path.join(DATA, 'players-2026.json')))
P = [p for p in doc['players'] if not p.get('est')]   # earlier hand-estimated additions are dropped and rebuilt from real stats
have = {nm(p['name']): p for p in P}

rows = []
for tid, v in W.items():
    for r in v['rows']:
        if len(r) != 7 or r[0] == 'Pos.':
            continue
        m = re.match(r'(\d+) ft (\d+) in', r[3])
        dob = datetime.date(*map(int, r[5].split('-')))
        age = 2026 - dob.year - (1 if (dob.month, dob.day) > (10, 21) else 0)
        rows.append({'tid': tid, 'name': re.sub(r'\s*\((TW|GL|DP|FA|S)\)', '', r[2]).strip(), 'tw': '(TW)' in r[2], 'pos': r[0],
                     'ht': '%s-%s' % (m.group(1), m.group(2)), 'age': age, 'no': r[1]})
new = [x for x in rows if nm(x['name']) not in have]
print('new players:', len(new))

pg = pd.read_csv(os.path.join(ROOT, 'tools', 'data-2025', 'bbref_per_game.csv'))
pg = pg[pg.Player.notna()].copy()
pg['k'] = pg.Player.map(nm)


def line(k):
    m = pg[pg.k == k]
    if m.empty:
        return None
    tot = m[m.Team.astype(str).str.endswith('TM')]
    return (tot if len(tot) else m).iloc[0]


tmp = tempfile.mkdtemp()
shutil.copytree(B.RAW, tmp + '/raw')
os.makedirs(tmp + '/out')
with open(tmp + '/raw/rosters.csv', 'a', encoding='utf-8', newline='') as fh:
    w = csv.writer(fh)
    for x in new:
        w.writerow([CODE[x['tid']], x['name'], x['pos'], x['ht'], x['age'], 0])
nostat = []
with open(tmp + '/raw/stats.csv', 'a', encoding='utf-8', newline='') as fh:
    w = csv.writer(fh)
    for x in new:
        s = line(nm(x['name']))
        if s is None:
            nostat.append(x['name'])
            continue
        g = lambda c: round(float(s[c]), 2)
        w.writerow([x['name'], int(s.G), g('MP'), g('FG'), g('FGA'), g('3P'), g('3PA'), g('FT'), g('FTA'), g('ORB'), g('DRB'),
                    g('AST'), g('STL'), g('BLK'), g('TOV'), g('PF'), g('PTS')])
print('no 2025-26 NBA line:', nostat)
B.RAW, B.OUT = tmp + '/raw', tmp + '/out'
B.TIER.update({'jimmy butler': 74, 'kristaps porzingis': 70})
B.build()
built = {nm(p['name']): p for p in json.load(open(tmp + '/out/players-2026.json'))['players']}
ids = {p['id'] for p in P}
for x in new:
    q = built[nm(x['name'])]
    if q['id'] in ids:
        q['id'] += '-2'
    q['stats'] = 'none' if x['name'] in nostat else '2025-26'
    P.append(q)
    have[nm(x['name'])] = q

onrost = set()
for x in rows:
    p = have[nm(x['name'])]
    if x['tw']:
        p['teamId'] = x['tid']
        p['tw'] = 1
    else:
        p['teamId'] = x['tid']
        p.pop('tw', None)
    onrost.add(p['id'])
for p in P:
    p.pop('inj', None)
    if p['id'] not in onrost and p.get('teamId'):
        print('released to FA:', p['name'], p['teamId'])
        p['teamId'] = None
    if p.get('st') and not p.get('teamId'):
        p.pop('st')
doc['players'] = P
json.dump(doc, open(os.path.join(DATA, 'players-2026.json'), 'w'), ensure_ascii=False, indent=1)

N = json.load(open(os.path.join(DATA, 'jersey-numbers-2026.json')))
for x in rows:
    N.setdefault(x['tid'], {})[x['name']] = x['no']
json.dump(N, open(os.path.join(DATA, 'jersey-numbers-2026.json'), 'w'), ensure_ascii=False, indent=1)
print(sorted(collections.Counter(p['teamId'] for p in P if p.get('teamId')).values()))
for x in new:
    q = have[nm(x['name'])]
    print(x['tid'][:4], q['name'], q['age'], q['pos'], q['ratings']['ovr'], q['stats'], 'TW' if x['tw'] else '')
