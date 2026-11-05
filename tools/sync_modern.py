"""Brings the 2025-26 opening-night league and the 2026-27 league onto the stat-built ratings: players who are in the rebuilt 2025 file take
its skills and usage (2025-open also its overall); anyone else gets a usage guess from his scoring rating. Run after tools/rebuild_era.sh 2025."""
import json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
N = {p['id']: p for p in json.load(open(R + '/data/players-2025.json'))['players']}
SK = ['sco', 'sht', 'ft', 'tpt', 'ply', 'tov', 'orb', 'drb', 'stl', 'blk', 'fou']
def ageStep(a): return 0 if a <= 25 else -0.5 if a <= 29 else -1.5 if a <= 32 else -2.5
for f, openfile in (('players-2025-open.json', True), ('players-2026.json', False)):
    doc = json.load(open(R + '/data/' + f)); hit = miss = 0
    for p in doc['players']:
        r = p['ratings']; q = N.get(p['id'])
        if q:
            qr = q['ratings']; hit += 1
            for k in SK + ['usg']:
                if k in qr: r[k] = qr[k] if openfile or k == 'usg' else int(max(3, min(99, round(qr[k] + ageStep(p.get('age', 27))))))
            if openfile: r['ovr'] = qr['ovr']
        else:
            miss += 1; r['usg'] = round(max(8, min(32, 8 + 0.2 * r.get('sco', 40))), 1)
    json.dump(doc, open(R + '/data/' + f, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f, 'from rebuilt 2025:', hit, 'guessed:', miss)
