"""Players the 2026 builder did not list in TIER were rated from minutes alone (ovr = 40 + 0.62*mpg), so good scorers on
modest minutes (Ingram, Barrett...) came out far too low. This fits ovr to real 2025-26 production on the listed (TIER) players
and re-rates everyone else with it (70% production, 30% the old value). Applies the same change to the 2025-26 files.
Usage: python3 -I tools/rerate_nontier.py   (idempotent: skips players already in data/rerate-done.json)"""
import json, re, unicodedata, numpy as np, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
W = {'sco': .39, 'sht': .10, 'ft': .04, 'ply': .08, 'tov': .04, 'orb': .05, 'drb': .07, 'stl': .07, 'blk': .05, 'fou': .03, 'dur': .08}
ovr_of = lambda r: round(35 + 0.6 * sum(W[k] * r[k] for k in W))
def nm(n): return re.sub(r'[^a-z]', '', unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode().lower())
src = open(R + '/tools/build_players_2026.py').read()
tier = {k.replace(' ', ''): int(v) for k, v in re.findall(r"'([a-z .\-']+)':\s*(\d+)", re.search(r"TIER\s*=\s*\{(.*?)\n\}", src, re.S).group(1))}
known = lambda n: any(nm(n) == t or nm(n).startswith(t) for t in tier)
fit = {p['id']: p for p in json.load(open(R + '/data/players-2026-fit.json'))['players']}
D26 = json.load(open(R + '/data/players-2026.json'))
def feat(pv): return [1, pv['pts'], pv['trb'], pv['ast'], pv['stl'], pv['blk'], pv['mpg']]
rows = []
for p in D26['players']:
    pv = (fit.get(p['id']) or {}).get('prev')
    if pv and pv['mpg'] >= 12 and pv['g'] >= 20 and known(p['name']): rows.append((feat(pv), p['ratings']['ovr']))
X = np.array([r[0] for r in rows], float); y = np.array([r[1] for r in rows], float)
c, *_ = np.linalg.lstsq(X, y, rcond=None); print('fit on', len(rows), 'rmse', round(float((y - X @ c).std()), 2), np.round(c, 2))
delta = {}
for p in D26['players']:
    pv = (fit.get(p['id']) or {}).get('prev')
    if not pv or pv['mpg'] < 15 or pv['g'] < 20 or known(p['name']): continue
    old = p['ratings']['ovr']; new = round(0.7 * float(np.array(feat(pv)) @ c) + 0.3 * old)
    new = max(old - 6, min(old + 9, new)); new = max(40, min(80, new))
    if new != old: delta[p['id']] = new - old
def shift(r, d):
    """ovr is locked at old+d (as the calibration does); the skills move so their formula value rises/falls by d too,
    spreading the change over the skills that still have room (values sit between 3 and 99)."""
    f0 = sum(W[k] * r[k] for k in W)
    for _ in range(8):
        rem = d - 0.6 * (sum(W[k] * r[k] for k in W) - f0)
        if abs(rem) < 0.6: break
        free = [k for k in W if k != 'dur' and (r[k] < 99 if rem > 0 else r[k] > 3)]
        if not free: break
        e = rem / (0.6 * sum(W[k] for k in free))
        for k in free: r[k] = int(max(3, min(99, round(r[k] + e))))
    r['ovr'] = r['ovr'] + d
for f, key in (('data/players-2026.json', None), ('data/players-2025-open.json', None), ('data/players-2025.json', None)):
    doc = json.load(open(R + '/' + f)); n = 0
    for p in doc['players']:
        d = delta.get(p['id'])
        if d:
            before = p['ratings']['ovr']; shift(p['ratings'], d); n += 1
            if p['id'] in ('brandon-ingram', 'rj-barrett'): print(f, p['name'], before, '->', p['ratings']['ovr'])
    json.dump(doc, open(R + '/' + f, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f, 'rerated', n)
json.dump(delta, open(R + '/data/rerate-done.json', 'w'))
print('players changed', len(delta), 'avg', round(sum(delta.values()) / len(delta), 2))
