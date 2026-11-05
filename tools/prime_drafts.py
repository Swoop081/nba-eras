"""Bake each real prospect's first-season ratings (and a hidden potential from his later peak) into data/draft-YYYY.json,
so real draft classes arrive as the players they really were, not a random roll from the pick slot."""
import json, os, glob, sys
D = 'data'
def load(y):
    p = f'{D}/players-{y}.json'
    if not os.path.exists(p): return None
    d = json.load(open(p)); L = d if isinstance(d, list) else d['players']
    return {x['id']: x for x in L}
cache = {}
def P(y):
    if y not in cache: cache[y] = load(y)
    return cache[y]
tot = 0
for f in sorted(glob.glob(f'{D}/draft-*.json')):
    Y = int(f.split('-')[1].split('.')[0])
    if Y < 1970: continue
    d = json.load(open(f)); L = d if isinstance(d, list) else d.get('prospects', d.get('players'))
    n = 0
    for pr in L:
        first = None
        for y in range(Y, Y + 4):
            m = P(y)
            if m and pr['id'] in m: first = (y, m[pr['id']]); break
        if not first: continue
        y0, x = first
        peak = max([P(y)[pr['id']]['ratings']['ovr'] for y in range(y0, y0 + 10) if P(y) and pr['id'] in P(y)] or [x['ratings']['ovr']])
        pr['ratings'] = {k: (round(v, 1) if k == 'usg' else int(v)) for k, v in x['ratings'].items()}
        pr['pot'] = max(peak, x['ratings']['ovr'])
        if x.get('hgt'): pr['hgt'] = x['hgt']
        n += 1
    json.dump(d, open(f, 'w'), separators=(',', ':'))
    tot += n
    print(Y, n, 'primed')
print(tot)
