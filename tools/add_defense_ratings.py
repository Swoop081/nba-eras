"""Add rebounding, steals and blocks ratings to data/players-1946.json.

1946-47 box scores have no rebounds, steals or blocks, so these are modelled
from what is recorded (fouls, assists, shooting, scoring) plus position where
known. Heights/positions from roster pages will sharpen them later.

Usage: python3 -I tools/add_defense_ratings.py data/players-1946.json
"""
import json
import sys
import zlib

POS_BIG = {'C': 1.0, 'PF': 0.8, 'F': 0.6, 'SF': 0.45, 'GF': 0.3, 'SG': 0.2, 'G': 0.15, 'PG': 0.0}


def pct_fn(values):
    ordered = sorted(values)
    n = len(ordered)
    return lambda v: (sum(1 for x in ordered if x < v) + 0.5 * sum(1 for x in ordered if x == v)) / n


def jitter(pid, salt, spread=4):
    h = zlib.crc32((pid + salt).encode()) % 1000 / 999
    return round((h - 0.5) * 2 * spread)


def clamp(v):
    return max(15, min(99, round(v)))


def main(path):
    doc = json.load(open(path))
    ps = doc['players']
    ref = [p for p in ps if p['g'] >= 15] or ps
    f = lambda p: p['pf'] / max(p['g'], 1)
    a = lambda p: p['ast'] / max(p['g'], 1)
    s = lambda p: p['pts'] / max(p['g'], 1)
    p_pf, p_ast, p_pts = (pct_fn([fn(p) for p in ref]) for fn in (f, a, s))

    for p in ps:
        r = p['ratings']
        stat_big = 0.55 * p_pf(f(p)) + 0.45 * (1 - p_ast(a(p)))
        big = stat_big if not p['pos'] else 0.35 * stat_big + 0.65 * POS_BIG.get(p['pos'], 0.5)
        skill = p_pts(s(p))
        thin = min(1.0, p['g'] / 30)  # few games -> pulled toward average
        reb = 28 + 52 * big + 12 * skill + jitter(p['id'], 'reb')
        blk = 18 + 62 * big ** 1.6 + 8 * skill + jitter(p['id'], 'blk')
        stl = 30 + 40 * (1 - big) + 0.25 * r['ply'] + jitter(p['id'], 'stl')
        for k, v in (('reb', reb), ('stl', stl), ('blk', blk)):
            r[k] = clamp(thin * v + (1 - thin) * 40)
        w = (0.45 * r['sco'] + 0.12 * r['sht'] + 0.08 * r['ply'] + 0.10 * r['dur']
             + 0.12 * r['reb'] + 0.07 * r['stl'] + 0.06 * r['blk'])
        r['ovr'] = round(35 + 0.6 * w)
    ps.sort(key=lambda p: -p['ratings']['ovr'])
    doc['source'] += ' Rebounding, steals and blocks are modelled, not recorded.'
    json.dump(doc, open(path, 'w'), indent=1)
    for p in ps[:12]:
        print(p['name'], p['pos'], p['ratings'])


if __name__ == '__main__':
    main(sys.argv[1])
