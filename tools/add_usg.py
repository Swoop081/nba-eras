"""Adds ratings.usg (real usage %) to every player of an era: his real usage that season, pulled toward a role guess when he played few minutes.
Players with no real line get a guess from their scoring rating. Usage: python3 -I tools/add_usg.py <era id>..."""
import json, sys, os, numpy as np
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
for era in sys.argv[1:]:
    fn = R + '/data/players-' + era + '.json'; doc = json.load(open(fn)); P = doc['players']
    xs = [(p['ratings']['sco'], p['prev']['usg']) for p in P if p.get('prev') and p['prev'].get('usg') and p['prev'].get('mpg', 0) >= 15 and 'sco' in p['ratings']]
    if len(xs) < 20: print(era, 'too few'); continue
    a, b = np.polyfit([x[0] for x in xs], [x[1] for x in xs], 1)
    for p in P:
        r = p['ratings']; pv = p.get('prev'); guess = float(np.clip(a * r.get('sco', 40) + b, 8, 30))
        if pv and not pv.get('usg') and pv.get('ts') and pv.get('mpg', 0) >= 3:   # eras before usage was tracked: estimate from the line
            m = pv['mpg']; est = 18.493 + 1.136 * pv['pts'] / m * 36 + 0.133 * pv['ast'] / m * 36 - 30.76 * pv['ts']
            pv = dict(pv, usg=float(np.clip(est, 8, 38)))
        if pv and pv.get('usg'):
            mins = pv.get('g', 0) * pv.get('mpg', 0); w = mins / (mins + 300.0); r['usg'] = round(w * pv['usg'] + (1 - w) * guess, 1)
        else: r['usg'] = round(guess, 1)
    json.dump(doc, open(fn, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(era, 'usg added', len(P))
