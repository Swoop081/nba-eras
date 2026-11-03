#!/usr/bin/env python3
"""Re-rate every player who has a 2024-25 NBA line from the full 2024-25 Basketball Reference per-game table
(the opening-week sample the game started with was only four to six games). Everything else on a player is kept.
Usage: python3 -I tools/rerate_2025_open.py"""
import csv, json, os, re, shutil, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_players_2026 as B
import pandas as pd
import sync_rosters_names as N
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
doc = json.load(open(os.path.join(ROOT, 'data', 'players-2025-open.json')))
P = doc['players']
CODE = {B.slug(c + ' ' + n): code for code, c, n, *_ in B.TEAMS}
pg = pd.read_csv(os.path.join(ROOT, 'tools', 'data-2024', 'bbref_per_game.csv'))
pg = pg[pg.Player.notna()].copy(); pg['k'] = pg.Player.map(N.nm)
def line(k):
    m = pg[pg.k == k]
    if m.empty: return None
    t = m[m.Team.astype(str).str.endswith('TM')]
    return (t if len(t) else m).iloc[0]
tmp = tempfile.mkdtemp(); os.makedirs(tmp + '/raw'); os.makedirs(tmp + '/out')
rows, stats, has = [], [], {}
for p in P:
    tid = p.get('teamId') or 'atlanta-hawks'
    pos = p['pos'].replace('-', '')
    h = p['hgt']
    rows.append([CODE[tid], p['name'], pos, '%d-%d' % (h // 12, h % 12), p['age'], 0])
    s = line(N.nm(p['name']))
    if s is not None and float(s.G) * float(s.MP) >= 150:
        g = lambda c: round(float(s[c]), 2)
        stats.append([p['name'], int(s.G), g('MP'), g('FG'), g('FGA'), g('3P'), g('3PA'), g('FT'), g('FTA'), g('ORB'), g('DRB'), g('AST'), g('STL'), g('BLK'), g('TOV'), g('PF'), g('PTS')])
        has[p['id']] = 1
        p['mp'] = round(float(s.MP), 1)   # last season's minutes: how much the coach really plays him
with open(tmp + '/raw/rosters.csv', 'w', encoding='utf-8', newline='') as fh:
    w = csv.writer(fh); w.writerow(['team', 'Player', 'Pos', 'Ht', 'Age', 'GP']); w.writerows(rows)
with open(tmp + '/raw/stats.csv', 'w', encoding='utf-8', newline='') as fh:
    w = csv.writer(fh); w.writerow('name,G,MP,FG,FGA,3P,3PA,FT,FTA,ORB,DRB,AST,STL,BLK,TOV,PF,PTS'.split(',')); w.writerows(stats)
open(tmp + '/raw/stats2.csv', 'w').write('name,G,MPG,PPG,RPG,APG,SPG,BPG,FGp,TPp,FTp\n')
B.RAW, B.OUT = tmp + '/raw', tmp + '/out'
B.TIER.update({'jimmy butler': 74, 'kristaps porzingis': 70})
B.build()
built = {N.nm(p['name']): p for p in json.load(open(tmp + '/out/players-2026.json'))['players']}
chg = []
for p in P:
    if p['id'] in has:
        q = built[N.nm(p['name'])]
        chg.append((q['ratings']['ovr'] - p['ratings']['ovr'], p['name'], p['ratings']['ovr'], q['ratings']['ovr']))
        p['ratings'] = q['ratings']
        if p['pos'] in ('G', 'G-F'):   # the rebound percentile is taken against every position; a guard's 89 is not a centre's 89
            r = p['ratings']
            r['drb'] = max(3, round(r['drb'] * 0.8)); r['orb'] = max(3, round(r['orb'] * 0.9))
            r['ovr'] = round(35 + 0.6 * sum(B.W[k] * r[k] for k in B.W))
        p['stats'] = '2024-25'
json.dump(doc, open(os.path.join(ROOT, 'data', 'players-2025-open.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
chg.sort()
print(len(has), 're-rated; biggest drops', chg[:12]); print('biggest rises', chg[-12:])
