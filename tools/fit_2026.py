"""Fits the 2026-27 era (data/players-2026.json) to each player's real 2025-26 per-game line and to the 2025-26 league averages,
the same way the 2025-26 era was fitted. A temporary players-2026-fit.json carries the stat lines; ratings and params are copied back.
Usage: python3 -I tools/fit_2026.py"""
import json, os, sys, subprocess, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sync_rosters_names as N
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
doc = json.load(open(R + '/data/players-2026.json'))
pg = pd.read_csv(R + '/tools/data-2025/bbref_per_game.csv'); pg = pg[pg.Player.notna()].copy(); pg['k'] = pg.Player.map(N.nm)
n = 0
for p in doc['players']:
    m = pg[pg.k == N.nm(p['name'])]
    if m.empty: continue
    t = m[m.Team.astype(str).str.endswith('TM')]; s = (t if len(t) else m).iloc[0]
    if float(s.G) * float(s.MP) < 150: continue
    f = lambda c: round(float(s[c]), 3)
    p['prev'] = {'g': int(s.G), 'mpg': f('MP'), 'pts': f('PTS'), 'trb': f('TRB'), 'ast': f('AST'), 'stl': f('STL'), 'blk': f('BLK'), 'tov': f('TOV'),
                 'fg': f('FG%'), 'tp': (f('3P%') if float(s['3PA']) > 0.3 else None), 'ft': f('FT%')}; n += 1
doc['lg'] = {'pts': 115.6, 'fga': 89.1, 'fg': 42.0, '3p': 13.3, '3pa': 37.0, 'ft': 18.4, 'fta': 23.5, 'orb': 11.4, 'drb': 32.4, 'trb': 43.8, 'ast': 26.7, 'tov': 14.5, 'stl': 8.4, 'blk': 4.8, 'pf': 19.9, 'games': 82, 'poss': 102.5, 'teams': 30}
json.dump(doc, open(R + '/data/players-2026-fit.json', 'w'), ensure_ascii=False, separators=(',', ':'))
t = json.load(open(R + '/data/teams-2026.json'))
for x in t['teams']: x['rw'] = x['w']; x['rl'] = x['l']
json.dump(t, open(R + '/data/teams-2026-fit.json', 'w'))
print(n, 'players with a real 2025-26 line')
subprocess.run(['node', R + '/tools/calibrate.js', '2026-fit', '16', '6', '1', '--write'], check=True)
fit = json.load(open(R + '/data/players-2026-fit.json'))
by = {p['id']: p for p in fit['players']}
for p in doc['players']:
    q = by[p['id']]; p['ratings'] = q['ratings']; p.pop('imp', None)
    if q.get('prev'): p['prev'] = q['prev']
json.dump(doc, open(R + '/data/players-2026.json', 'w'), ensure_ascii=False, indent=1) if False else None
