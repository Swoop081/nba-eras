"""Build data/players-2025.json and data/teams-2025.json (2025-26 opening night).

Input: tools/data-2025/rosters.csv (landofbasketball.com 2025-26 team pages: GP, PTS, REB, AST per player).
A player who appears for several clubs belongs to the one he played most games for.
Ratings: last season's production is quantile-mapped onto the 2026 rating scale, then blended with the
player's 2026-27 rating (talent prior). Skill splits come from the 2026 file where the player exists.

Usage: python3 -I tools/build_players_2025.py
"""
import csv, json, os, re, sys, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_players_2026 as B

OUT = os.path.join(HERE, '..', 'data')
W = B.W


def pos_of(p):
    p = p.split('/')[0].strip()
    return {'Guard': 'G', 'Forward': 'F', 'Center': 'C'}.get(p, 'F')


def posfull(raw):
    parts = [x.strip() for x in raw.split('/')]
    s = ''.join({'Guard': 'G', 'Forward': 'F', 'Center': 'C'}.get(x, 'F') for x in parts)
    return B.posout(s)


def main():
    rows = list(csv.DictReader(open(os.path.join(HERE, 'data-2025', 'rosters.csv'), encoding='utf-8')))
    best = {}
    for r in rows:
        k = B.norm(r['Player'])
        r['GP'] = int(r['GP']); r['PTS'] = float(r['PTS']); r['REB'] = float(r['REB']); r['AST'] = float(r['AST'])
        if k not in best or r['GP'] > best[k]['GP']:
            best[k] = r
    cur = {B.norm(p['name']): p for p in json.load(open(os.path.join(OUT, 'players-2026.json')))['players']}
    # production score -> percentile -> 2026 ovr scale
    ovrs = sorted(p['ratings']['ovr'] for p in cur.values())
    prod = {k: (r['PTS'] + 0.7 * r['REB'] + 1.1 * r['AST']) * min(1.0, 0.55 + r['GP'] / 70.0 * 0.45) for k, r in best.items()}
    order = sorted(prod, key=lambda k: prod[k])
    n = len(order)
    ref = ovrs[-max(n, 1):] if len(ovrs) >= n else ovrs
    allp = [p for p in cur.values()]
    pool = sorted(p['ratings']['ovr'] for p in allp)
    perf = {}
    for i, k in enumerate(order):
        q = (i + 0.5) / n
        perf[k] = pool[min(len(pool) - 1, int(q * len(pool)))]
    teams_map = {c: B.slug(city + ' ' + name) for c, city, name, conf, c1, c2 in B.TEAMS}
    byteam = {}
    for k, r in best.items():
        byteam.setdefault(r['team'], []).append(k)
    out = []
    for code, keys in byteam.items():
        keys.sort(key=lambda k: -(best[k]['GP'] * (best[k]['PTS'] + 6)))
        for idx, k in enumerate(keys):
            r = best[k]
            age = max(18, int(r['Age']) - 1)
            c = cur.get(k)
            pos = posfull(r['Pos'])
            pr = c['ratings']['ovr'] if c else perf[k]
            # players move with age: youngsters were worse a year ago, veterans slightly better
            drift = -1.5 * max(0, 25 - age) / 3.0 if age < 25 else (1.0 * (age - 31) / 3.0 if age > 31 else 0)
            target = B.clamp(round(0.5 * (pr + drift) + 0.5 * perf[k] + B.jitter(r['Player'] + 'y', 1.0)), 38, 94)
            if c:
                rt = dict(c['ratings'])
            else:
                pp = lambda v, lo, hi: B.clamp(round((v - lo) / (hi - lo) * 100), 5, 98)
                gp = r['GP']
                base = {'G': (.62, .22, .35), 'G-F': (.55, .35, .45), 'F': (.42, .5, .52), 'F-C': (.35, .68, .66), 'C': (.32, .8, .8)}[pos]
                rt = {'sco': pp(r['PTS'], 0, 30), 'sht': 50, 'ft': 65, 'tpt': {'C': 15, 'F-C': 30, 'F': 50, 'G-F': 58, 'G': 62}[pos],
                      'ply': B.clamp(round(100 * (0.5 * base[0] + 0.5 * min(1, r['AST'] / 8))), 5, 95),
                      'tov': 50, 'orb': B.clamp(round(100 * (0.5 * base[1] + 0.5 * min(1, r['REB'] / 12))), 5, 95),
                      'drb': B.clamp(round(100 * (0.5 * base[2] + 0.5 * min(1, r['REB'] / 12))), 5, 95),
                      'stl': 45, 'blk': {'C': 60, 'F-C': 50, 'F': 40, 'G-F': 33, 'G': 30}[pos], 'fou': 45,
                      'dur': B.clamp(round(80 - max(0, age - 31) * 3), 40, 95)}
            rr = {k2: rt[k2] for k2 in ('sco', 'sht', 'ft', 'tpt', 'ply', 'tov', 'orb', 'drb', 'stl', 'blk', 'fou', 'dur')}
            for _ in range(3):
                curv = 35 + 0.6 * sum(W[x] * rr[x] for x in W)
                d = (target - curv) / (0.6 * (1 - W['dur']))
                if abs(d) < 0.2:
                    break
                for x in rr:
                    if x != 'dur':
                        rr[x] = B.clamp(round(rr[x] + d), 3, 99)
            rr['ovr'] = round(35 + 0.6 * sum(W[x] * rr[x] for x in W))
            out.append({'id': B.slug(r['Player']), 'name': r['Player'], 'age': age, 'pos': pos, 'teamId': teams_map[code],
                        'hgt': B.parse_ht(r['Ht']),
                        'ratings': {x: rr[x] for x in ('ovr', 'sco', 'sht', 'ply', 'dur', 'stl', 'blk', 'ft', 'tpt', 'orb', 'drb', 'tov', 'fou')},
                        '_r': idx})
    # rosters of at most 15: the rest become free agents (no team)
    cnt = {}
    final = []
    for p in sorted(out, key=lambda p: (p['teamId'], p['_r'])):
        cnt[p['teamId']] = cnt.get(p['teamId'], 0) + 1
        del p['_r']
        if cnt[p['teamId']] > 15:
            continue
        final.append(p)
    seen = {}
    for p in final:
        c = seen.get(p['id'], 0); seen[p['id']] = c + 1
        if c: p['id'] += '-' + str(c + 1)
    final.sort(key=lambda p: -p['ratings']['ovr'])
    t26 = json.load(open(os.path.join(OUT, 'teams-2026.json')))
    t = dict(t26); t['season'] = '2025-26'; t['source'] = 'NBA 2025-26 opening night. Colours are approximations.'
    json.dump({'season': '2025-26', 'source': 'Rosters and per-game lines: landofbasketball.com, 2025-26 season.', 'players': final}, open(os.path.join(OUT, 'players-2025.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(t, open(os.path.join(OUT, 'teams-2025.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    c = {}
    for p in final: c[p['teamId']] = c.get(p['teamId'], 0) + 1
    print(len(final), 'players; teams:', len(c), 'min/max roster', min(c.values()), max(c.values()))
    print([ (p['name'], p['ratings']['ovr']) for p in final[:12]])

main()
