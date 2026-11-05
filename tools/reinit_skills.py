"""Resets the skills the calibration used to pin at 3 or 99 (stl, blk, tov, ft, fou) from each player's real per-game line, so a good
rebounding/steals/shooting year raises that skill and a bad one lowers it. Usage: python3 -I tools/reinit_skills.py <era id>"""
import json, sys, os, numpy as np
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
era = sys.argv[1]; fn = R + '/data/players-' + era + '.json'
doc = json.load(open(fn)); P = doc['players']
def pct(vals, ref):
    ref = np.sort(np.array(ref, float)); return lambda v: float(np.searchsorted(ref, v, 'right')) / max(1, len(ref))
rot = [p for p in P if p.get('prev') and p['prev'].get('mpg', 0) >= 12 and p['prev'].get('g', 0) >= 15]
def per36(p, k): return p['prev'].get(k, 0) / max(p['prev']['mpg'], 1) * 36
ps = pct(None, [per36(p, 'stl') for p in rot]); pb = pct(None, [per36(p, 'blk') for p in rot])
ptv = pct(None, [(per36(p, 'tov')) / (per36(p, 'pts') + per36(p, 'ast') + per36(p, 'tov') + 1) for p in rot])
POS = {'C': (.35, .75, 38), 'F-C': (.42, .62, 42), 'F': (.5, .48, 50), 'G-F': (.55, .35, 54), 'G': (.55, .22, 58)}
has = lambda k: sum(1 for p in rot if p['prev'].get(k)) >= 0.5 * max(1, len(rot))
HS, HB, HT = has('stl'), has('blk'), has('tov')
n = 0
for p in P:
    pv = p.get('prev'); r = p['ratings']
    if not pv or 'stl' not in r: continue
    sb, bb, fo = POS.get(p.get('pos'), POS['F'])
    mins = pv.get('g', 0) * pv.get('mpg', 0); w = mins / (mins + 450.0)
    if pv.get('mpg', 0) >= 3:
      if HS:
        r['stl'] = int(max(5, min(99, round(100 * (w * ps(per36(p, 'stl')) + (1 - w) * sb)))))
      if HB:
        r['blk'] = int(max(5, min(99, round(100 * (w * pb(per36(p, 'blk')) + (1 - w) * bb)))))
      if HT:
        rate = per36(p, 'tov') / (per36(p, 'pts') + per36(p, 'ast') + per36(p, 'tov') + 1)
        r['tov'] = int(max(10, min(95, round(100 * (w * (1 - ptv(rate)) + (1 - w) * .5)))))
    ft = pv.get('ft')
    if ft is not None:
        f = (ft * 12 + 0.78 * 20) / 32 if mins < 600 else ft
        r['ft'] = int(max(10, min(99, round(100 * (f - 0.55) / 0.37))))
    r['fou'] = int(max(8, min(95, round(fo + (r.get('fou', fo) - fo) * 0)))); n += 1
json.dump(doc, open(fn, 'w'), ensure_ascii=False, indent=1 if doc.get('_indent') else None, separators=None if doc.get('_indent') else (',', ':'))
print(era, 'reinitialised', n)
