"""Hand-set overalls for 2026 rookies (the owner's call); skills move with the same formula as the game's overall. Usage: python3 -I tools/set_rookie_ovr_2026.py"""
import json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
W = {'sco': .39, 'sht': .10, 'ft': .04, 'ply': .08, 'tov': .04, 'orb': .05, 'drb': .07, 'stl': .07, 'blk': .05, 'fou': .03, 'dur': .08}
TARGET = {'aj-dybantsa': 74, 'darryn-peterson': 74, 'cameron-boozer': 74}
def shift(r, d):
    f0 = sum(W[k] * r[k] for k in W)
    for _ in range(8):
        rem = d - 0.6 * (sum(W[k] * r[k] for k in W) - f0)
        if abs(rem) < 0.6: break
        free = [k for k in W if k != 'dur' and (r[k] < 99 if rem > 0 else r[k] > 3)]
        if not free: break
        e = rem / (0.6 * sum(W[k] for k in free))
        for k in free: r[k] = int(max(3, min(99, round(r[k] + e))))
    r['ovr'] += d
fn = R + '/data/players-2026.json'; doc = json.load(open(fn))
for p in doc['players']:
    if p['id'] in TARGET:
        d = TARGET[p['id']] - p['ratings']['ovr']
        if d: shift(p['ratings'], d)
        print(p['id'], p['ratings']['ovr'])
json.dump(doc, open(fn + '.tmp', 'w'), ensure_ascii=False, separators=(',', ':')); os.replace(fn + '.tmp', fn)
