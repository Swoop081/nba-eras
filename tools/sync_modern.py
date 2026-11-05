"""Brings the 2025-26 opening-night league and the 2026-27 league onto the stat-built ratings: players who are in the rebuilt 2025 file take
its skills and usage (2025-open also its overall); anyone else gets a usage guess from his scoring rating. Run after tools/rebuild_era.sh 2025."""
import json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
N = {p['id']: p for p in json.load(open(R + '/data/players-2025.json'))['players']}
SK = ['sco', 'sht', 'ft', 'tpt', 'ply', 'tov', 'orb', 'drb', 'stl', 'blk', 'fou']
def ageStep(a): return 0 if a <= 25 else -0.5 if a <= 29 else -1.5 if a <= 32 else -2.5
W = {'sco': .39, 'sht': .10, 'ft': .04, 'ply': .08, 'tov': .04, 'orb': .05, 'drb': .07, 'stl': .07, 'blk': .05, 'fou': .03, 'dur': .08}
def ageDelta(a):
    if a <= 20: return 4.5
    if a <= 25: return {21: 3.5, 22: 2.5, 23: 1.5, 24: 1, 25: 0.5}[a]
    if a <= 28: return 0
    if a <= 33: return {29: -0.5, 30: -1, 31: -1.5, 32: -2, 33: -2.5}[a]
    return -2.8 if a <= 36 else -3.2
def potGap(a): return 14 if a <= 19 else {20: 12, 21: 10, 22: 8, 23: 6, 24: 4, 25: 3, 26: 1.5}.get(a, 0)
def grow(r, d):
    """moves the skills so their formula value changes by d (spread over the skills with room); ovr moves by d"""
    f0 = sum(W[k] * r[k] for k in W)
    for _ in range(8):
        rem = d - 0.6 * (sum(W[k] * r[k] for k in W) - f0)
        if abs(rem) < 0.6: break
        free = [k for k in W if k != 'dur' and (r[k] < 99 if rem > 0 else r[k] > 3)]
        if not free: break
        e = rem / (0.6 * sum(W[k] for k in free))
        for k in free: r[k] = int(max(3, min(99, round(r[k] + e))))
    r['ovr'] = int(max(30, min(99, r['ovr'] + d)))
for f, openfile in (('players-2025-open.json', True), ('players-2026.json', False)):
    doc = json.load(open(R + '/data/' + f)); hit = miss = 0
    for p in doc['players']:
        r = p['ratings']; q = N.get(p['id'])
        if q:
            qr = q['ratings']; hit += 1
            keep = r.get('dur')
            for k in SK + ['usg', 'ovr']:
                if k in qr: r[k] = qr[k]
            if openfile: continue
            if keep is not None: r['dur'] = keep
            age = p.get('age', 27); o = r['ovr']
            d = ageDelta(age) + (0.2 * potGap(age - 1) * (1 - max(0, o - 50) / 100) if age <= 25 else 0)
            d = int(round(d)); grow(r, d)
            if r.get('usg'): r['usg'] = round(max(6, min(42, r['usg'] + 0.1 * d)), 1)
        else:
            miss += 1; r['usg'] = round(max(8, min(32, 8 + 0.2 * r.get('sco', 40))), 1)
    json.dump(doc, open(R + '/data/' + f, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f, 'from rebuilt 2025:', hit, 'guessed:', miss)
