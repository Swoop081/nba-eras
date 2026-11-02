#!/usr/bin/env python3
"""Turn data/free-agents-2026.json (name, pos, age, last team, ppg, rpg, apg) into free-agent entries in data/players-2026.json.
Ratings are estimated from last season's per-game numbers and shaped like a similar-sized player already in the data."""
import json, copy, unicodedata
F = 'data/players-2026.json'
d = json.load(open(F)); pl = [p for p in d['players'] if not p.get('free')]
fa = json.load(open('data/free-agents-2026.json'))['players']
H = {'G': 75, 'G-F': 77, 'F-G': 77, 'F': 80, 'F-C': 81, 'C-F': 82, 'C': 83}
def slug(n): return ''.join(c for c in unicodedata.normalize('NFD', n) if unicodedata.category(c) != 'Mn').lower().replace('.', '').replace("'", '').replace(' ', '-')
have = {p['id'] for p in pl}
added = 0
for name, pos, age, last, ppg, rpg, apg in fa:
    i = slug(name)
    if i in have: continue
    score = ppg + 0.7 * rpg + 0.9 * apg
    ovr = max(40, min(66, round(41 + 0.78 * score - max(0, age - 33) * 0.4)))
    h = H.get(pos, 78)
    pool = [p for p in pl if p['teamId'] and abs(p['hgt'] - h) <= 2]
    base = min(pool, key=lambda p: abs(p['ratings']['ovr'] - ovr) + abs(p['hgt'] - h))
    r = copy.deepcopy(base['ratings']); dl = ovr - r['ovr']
    for k in r:
        if k == 'ovr': r[k] = ovr
        elif k != 'dur': r[k] = max(10, min(99, r[k] + dl))
    pl.append({'id': i, 'name': name, 'age': age, 'pos': pos, 'teamId': None, 'hgt': h, 'ratings': r, 'src': 'est', 'free': True, 'last': last, 'ls': [ppg, rpg, apg]})
    have.add(i); added += 1
d['players'] = pl
json.dump(d, open(F, 'w'), ensure_ascii=False, separators=(',', ':'))
print('free agents added', added)
