"""Rookie base for the 2026 draft class by draft slot (the same idea as Fultz 74 / Tatum 72 in 2017): #1 74, #2 73, #3 72 ... then a gentle slope.
Usage: python3 -I tools/rookie_base_2026.py"""
import json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
W = {'sco': .39, 'sht': .10, 'ft': .04, 'ply': .08, 'tov': .04, 'orb': .05, 'drb': .07, 'stl': .07, 'blk': .05, 'fou': .03, 'dur': .08}
def base(pick):
    if pick <= 10: return 75 - pick
    if pick <= 20: return round(64 - 0.5 * (pick - 11))
    if pick <= 30: return round(58 - 0.45 * (pick - 21))
    return max(44, round(52 - 0.2 * (pick - 31)))
def shift(r, d):
    f0 = sum(W[k] * r[k] for k in W)
    for _ in range(8):
        rem = d - 0.6 * (sum(W[k] * r[k] for k in W) - f0)
        if abs(rem) < 0.6: break
        free = [k for k in W if k != 'dur' and (r[k] < 99 if rem > 0 else r[k] > 3)]
        if not free: break
        e = rem / (0.6 * sum(W[k] for k in free))
        for k in free: r[k] = int(max(3, min(99, round(r[k] + e))))
    r['ovr'] = r['ovr'] + d
pk = {p['id']: p['realPick'] for p in json.load(open(R + '/data/draft-2026.json'))['prospects'] if p.get('realPick')}
doc = json.load(open(R + '/data/players-2026.json')); n = 0
for p in doc['players']:
    if p['id'] in pk:
        d = base(pk[p['id']]) - p['ratings']['ovr']
        if d: shift(p['ratings'], d); n += 1
        if pk[p['id']] <= 5: print(pk[p['id']], p['name'], p['ratings']['ovr'])
json.dump(doc, open(R + '/data/players-2026.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('rookies set', n)
