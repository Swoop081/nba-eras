"""Durability from real games played over the last three seasons (0.5 / 0.3 / 0.2) instead of one season.
Only rotation seasons count (14+ minutes a game): a bench player who sees 5 of 82 games is not hurt, the coach just
does not play him. A player with no rotation season starts injury-free (full availability); each rotation season on record pulls him toward
his real record, so a rookie is near the top and it lowers as real history accumulates.
Same scale as build_ratings.py: dur = 52 + 45 * availability - 2.5 per year over 31, clamped 40..98.
ovr moves by 0.048 per dur point (the dur weight). Run once after build_career_real.py; it is idempotent
(it recomputes from games played, not from the old dur)."""
import json, glob, re
CR = json.load(open('data/career-real.json'))
G = {}
for f in glob.glob('data/teams-[0-9][0-9][0-9][0-9].json'):
    G[int(re.search(r'(\d{4})', f).group(1))] = json.load(open(f)).get('games', 82)
def avail_of(pid, base):
    hist = {r[0]: r[2] for r in CR.get(pid, []) if r[3] >= 14}
    num = den = 0.0
    for k, w in enumerate((0.5, 0.3, 0.2)):
        y = base - k
        if y in hist:
            num += w * min(1.0, hist[y] / float(G.get(y, 82))); den += w
    return (num + (1.0 - den) * 1.0, den)   # unseen weight counts as fully available
def run(path, base_of):
    d = json.load(open(path)); n = moved = 0
    for p in d['players']:
        base = base_of(d)
        av, den = avail_of(p['id'], base)
        r = p['ratings']; old = r.get('dur', 60)
        new = max(40, min(98, round(52 + 45 * av - max(0, p['age'] - 31) * 2.5)))
        n += 1
        if new != old:
            r['dur'] = new; r['ovr'] = max(1, r['ovr'] + round(0.048 * (new - old))); moved += 1
    json.dump(d, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(path, n, 'rated,', moved, 'changed')
for f in sorted(glob.glob('data/players-[0-9][0-9][0-9][0-9].json')):
    y = int(re.search(r'(\d{4})', f).group(1))
    if y < 1951: continue
    run(f, (lambda d, y=y: y - 1) if y == 2026 else (lambda d, y=y: y))
run('data/players-2025-open.json', lambda d: 2024)
