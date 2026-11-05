"""Overall rating from real production. Within an era, players with a real line are ranked by a production score (PER, win shares per 48, BPM where it
exists; z-scored among rotation players and pulled toward replacement level when minutes are few) and given the era's own sorted overall values in that order.
Salaries and thresholds keep their scale, but who is rated above whom follows the season's real play. Usage: python3 -I tools/rank_ovr.py <era id>..."""
import json, sys, os, numpy as np
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def zscores(P):
    """production z-score and minutes for every player with a real line in one era file"""
    S = [p for p in P if p.get('prev') and p['prev'].get('per') is not None and p['prev'].get('mpg', 0) >= 3 and p['prev'].get('g', 0) >= 1 and not p.get('tw')]
    if len(S) < 30: return {}
    def ws48(pv): return pv['ws'] / max(1, pv['g'] * pv['mpg'] / 48) if pv.get('ws') is not None else None
    def dfn(pv):
        m = max(pv.get('mpg', 0), 1)
        return (pv.get('stl', 0) + 0.7 * pv.get('blk', 0)) / m * 36 if pv.get('stl') is not None else None
    rot = [p for p in S if p['prev']['mpg'] >= 12 and p['prev']['g'] >= 15] or S
    comps = [(lambda pv: pv.get('per'), 1.0), (ws48, 1.0), (lambda pv: pv.get('bpm'), 1.0), (lambda pv: pv.get('pts'), 0.8), (dfn, 0.25), (lambda pv: pv.get('mpg'), 0.6)]
    def stats(key):
        v = [key(p['prev']) for p in rot if key(p['prev']) is not None]
        return (np.mean(v), np.std(v) or 1) if len(v) > 20 else None
    st = [stats(f) for f, _ in comps]; out = {}
    for p in S:
        pv = p['prev']; zs = []; ws = []
        for (f, w), s in zip(comps, st):
            v = f(pv)
            if s and v is not None: zs.append(w * (v - s[0]) / s[1]); ws.append(w)
        out[p['id']] = (sum(zs) / sum(ws) if ws else -1.0, pv['g'] * pv['mpg'])
    return out
CACHE = '/tmp/rp/zcache.json'
def zfor(year):
    """z-scores of an era file, cached (stats never change, only overall ratings do)"""
    c = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    if str(year) not in c:
        fn = R + '/data/players-' + str(year) + '.json'
        c[str(year)] = {i: list(v) for i, v in zscores(json.load(open(fn))['players']).items()} if os.path.exists(fn) else {}
        json.dump(c, open(CACHE + '.tmp', 'w')); os.replace(CACHE + '.tmp', CACHE)
    return c[str(year)]

DRIFT = {19: .35, 20: .30, 21: .25, 22: .20, 23: .15, 24: .10, 25: .05, 26: 0, 27: 0, 28: 0, 29: -.05, 30: -.10, 31: -.12, 32: -.15}
def drift(age): return DRIFT.get(age, .35 if age < 19 else -.2)
M0 = 1500.0   # minutes of evidence it takes for a season to count about half

def trajectories():
    """Career model: a player starts at a base, and each season moves him toward what he showed in proportion to the minutes he played;
    age adds growth then decline. A season lost to injury barely moves him, so he does not dip and bounce back."""
    lc = '/tmp/rp/lcache.json'
    if os.path.exists(lc): return json.load(open(lc))
    state = {}; out = {}; ages = {}
    for y in range(1951, 2026):
        fn = R + '/data/players-' + str(y) + '.json'
        if not os.path.exists(fn): continue
        P = {p['id']: p for p in json.load(open(fn))['players']}
        Z = zfor(y); res = {}
        for i, p in P.items():
            age = p.get('age') or 26
            if i in state:
                L, ly = state[i]
                L += sum(drift(a) for a in range(ly + 1, y + 1)) if False else drift(age)
            else:
                L = -0.5
            if i in Z:
                z, m = Z[i]; k = m / (m + (M0 if i in state else 600.0)); L = L + k * (z - L)   # a rookie's first season sets his base

            if i in Z or i in state:
                state[i] = (L, y); res[i] = L
        out[str(y)] = res
    json.dump(out, open(lc, 'w')); return out
for era in sys.argv[1:]:
    fn = R + '/data/players-' + era + '.json'; doc = json.load(open(fn)); P = doc['players']
    T = trajectories().get(era, {})
    if len(T) < 30: print(era, 'too few'); continue
    P0 = {p['id'] for p in P}
    score = {i: v for i, v in T.items() if i in P0}
    ids = sorted(score, key=lambda i: -score[i])
    vals = sorted([p['ratings']['ovr'] for p in P if p['id'] in score], reverse=True)
    new = dict(zip(ids, vals)); n = 0
    for p in P:
        if p['id'] in new:
            if p['ratings']['ovr'] != new[p['id']]: n += 1
            p['ratings']['ovr'] = new[p['id']]
    for p in P:   # an established rotation player is not rated below what a coach would still play
        pv = p.get('prev') or {}
        if pv.get('g', 0) >= 50 and pv.get('mpg', 0) >= 22 and p['ratings']['ovr'] < 58: p['ratings']['ovr'] = 58
    if os.environ.get('DRY'):
        for p in sorted(P, key=lambda p: -p['ratings']['ovr'])[:8]: print(p['name'], p['ratings']['ovr'])
        for p in P:
            if p['id'] in os.environ['DRY'].split(','): print(era, p['id'], p['ratings']['ovr'])
        continue
    json.dump(doc, open(fn + '.tmp', 'w'), ensure_ascii=False, separators=(',', ':')); os.replace(fn + '.tmp', fn)
    print(era, 'ranked', len(score), 'changed', n)
