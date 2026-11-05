"""Overall rating from real production. Within an era, players with a real line are ranked by a production score (PER, win shares per 48, BPM where it
exists; z-scored among rotation players and pulled toward replacement level when minutes are few) and given the era's own sorted overall values in that order.
Salaries and thresholds keep their scale, but who is rated above whom follows the season's real play. Usage: python3 -I tools/rank_ovr.py <era id>..."""
import json, sys, os, numpy as np
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
for era in sys.argv[1:]:
    fn = R + '/data/players-' + era + '.json'; doc = json.load(open(fn)); P = doc['players']
    S = [p for p in P if p.get('prev') and p['prev'].get('per') is not None and p['prev'].get('mpg', 0) >= 3 and p['prev'].get('g', 0) >= 1 and not p.get('tw')]
    if len(S) < 30: print(era, 'too few'); continue
    def ws48(pv): return pv['ws'] / max(1, pv['g'] * pv['mpg'] / 48) if pv.get('ws') is not None else None
    rot = [p for p in S if p['prev']['mpg'] >= 12 and p['prev']['g'] >= 15] or S
    def stats(key):
        v = [key(p['prev']) for p in rot if key(p['prev']) is not None]
        return (np.mean(v), np.std(v) or 1) if len(v) > 20 else None
    comps = [(lambda pv: pv.get('per'), 1.0), (ws48, 1.0), (lambda pv: pv.get('bpm'), 1.0), (lambda pv: pv.get('pts'), 0.9)]
    st = [stats(f) for f, _ in comps]
    score = {}
    for p in S:
        pv = p['prev']; zs = []; ws = []
        for (f, w), s in zip(comps, st):
            v = f(pv)
            if s and v is not None: zs.append(w * (v - s[0]) / s[1]); ws.append(w)
        z = sum(zs) / sum(ws) if ws else -1.0
        mins = pv['g'] * pv['mpg']; rel = mins / (mins + 700.0)
        score[p['id']] = rel * z + (1 - rel) * -0.9
    ids = sorted(score, key=lambda i: -score[i])
    vals = sorted([p['ratings']['ovr'] for p in P if p['id'] in score], reverse=True)
    new = dict(zip(ids, vals)); n = 0
    for p in P:
        if p['id'] in new:
            if p['ratings']['ovr'] != new[p['id']]: n += 1
            p['ratings']['ovr'] = new[p['id']]
    if os.environ.get('DRY'):
        for p in sorted(P, key=lambda p: -p['ratings']['ovr'])[:14]: print(p['name'], p['ratings']['ovr'])
        for p in P:
            if p['id'] in ('brandon-ingram', 'rj-barrett', 'immanuel-quickley', 'jakob-poeltl', 'scottie-barnes', 'domantas-sabonis'): print(p['id'], p['ratings']['ovr'])
        continue
    json.dump(doc, open(fn, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(era, 'ranked', len(score), 'changed', n)
