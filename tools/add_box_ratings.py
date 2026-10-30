"""Add height, positions and the full set of box-score ratings to a players file.

1946-47 only recorded points, FG, FT, assists and fouls. Everything else a
modern box score tracks (3-pointers, offensive/defensive rebounds, steals,
blocks, turnovers) is modelled from height, position and the recorded stats,
so the match engine has a rating for every box-score line.

Usage: python3 -I tools/add_box_ratings.py data/players-1946.json tools/roster-1946.txt
"""
import json
import sys
import zlib

ALIAS = {
    'Butch van Breda Kolff': 'Bill Van Breda Kolff',
    'Red Dehnert': 'Dutch Dehnert',
    'Gene Gallette': 'Gene Gillette',
    'Bob Rensberger': 'Rob Rensberger',
    'Bones McKinney': 'Horace McKinney',
}
POS_BIG = {'C': 1.0, 'C-F': 0.85, 'F-C': 0.75, 'PF': 0.8, 'F': 0.5, 'SF': 0.45,
           'F-G': 0.35, 'G-F': 0.25, 'SG': 0.2, 'G': 0.1, 'PG': 0.0}
W = dict(sco=.39, sht=.10, ft=.04, ply=.08, tov=.04, orb=.05, drb=.07,
         stl=.07, blk=.05, fou=.03, dur=.08)


def pct_fn(values):
    o = sorted(values)
    n = len(o)
    return lambda v: (sum(1 for x in o if x < v) + 0.5 * sum(1 for x in o if x == v)) / n


def jit(pid, salt, spread=4):
    return round((zlib.crc32((pid + salt).encode()) % 1000 / 999 - 0.5) * 2 * spread)


def clamp(v):
    return max(15, min(99, round(v)))


def load_roster(path):
    out = {}
    for line in open(path):
        n, p, h = line.strip().split('|')
        ft, inch = h.rstrip('"').split("'")
        out[n] = (p, int(ft) * 12 + int(inch))
    return out


def main(path, roster_path):
    doc = json.load(open(path))
    ps = doc['players']
    roster = load_roster(roster_path)
    ref = [p for p in ps if p['g'] >= 15] or ps
    g = lambda p: max(p['g'], 1)
    p_pf = pct_fn([p['pf'] / g(p) for p in ref])
    p_ast = pct_fn([p['ast'] / g(p) for p in ref])
    p_pts = pct_fn([p['pts'] / g(p) for p in ref])
    ft_adj = lambda p: (p['ft'] + 0.641 * 20) / (p['fta'] + 20)
    p_ft = pct_fn([ft_adj(p) for p in ref])

    for p in ps:
        r = p['ratings']
        hit = roster.get(p['name']) or roster.get(ALIAS.get(p['name'], ''))
        if hit:
            p['hgt'] = hit[1]
            if not p['pos'] or p.get('posSrc') == 'roster':
                p['pos'], p['posSrc'] = hit[0], 'roster'
        stat_big = 0.55 * p_pf(p['pf'] / g(p)) + 0.45 * (1 - p_ast(p['ast'] / g(p)))
        if hit:
            hn = max(0, min(1, (hit[1] - 69) / 15))
            big = 0.5 * hn + 0.25 * POS_BIG.get(hit[0], 0.5) + 0.25 * stat_big
        else:
            big = stat_big
        skill = p_pts(p['pts'] / g(p))
        thin = min(1.0, p['g'] / 30)

        raw = {
            'ft': 100 * p_ft(ft_adj(p)),
            'tpt': 25 + 0.35 * r['sht'] + 0.25 * 100 * p_ft(ft_adj(p)) - 22 * big ** 2,
            'orb': 26 + 50 * big + 10 * skill,
            'drb': 28 + 52 * big + 12 * skill,
            'blk': 15 + 62 * big ** 1.6 + 8 * skill,
            'stl': 30 + 38 * (1 - big) + 0.25 * r['ply'],
            'tov': 42 + 0.25 * r['ply'] + 14 * (1 - big) + 8 * (1 - p_pf(p['pf'] / g(p))),
            'fou': 100 * (1 - p_pf(p['pf'] / g(p))),
        }
        for k, v in raw.items():
            v += jit(p['id'], k)
            r[k] = clamp(thin * v + (1 - thin) * 40)
        r.pop('reb', None)
        w = sum(W[k] * r[k] for k in W)
        r['ovr'] = round(35 + 0.6 * w)

    ps.sort(key=lambda p: -p['ratings']['ovr'])
    if 'modelled' not in doc['source']:
        doc['source'] += ' Height and position from team rosters. Three-pointers, rebounds, steals, blocks and turnovers are modelled, not recorded.'
    json.dump(doc, open(path, 'w'), indent=1)
    for p in ps[:10]:
        print(p['name'], p['pos'], p.get('hgt'), p['ratings'])
    print('no height:', [p['name'] for p in ps if 'hgt' not in p])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
