#!/usr/bin/env python3
"""One-off roster sync for 2026-27: adds missing real players (injured where known), moves traded/signed players, releases non-NBA ones."""
import json, re, unicodedata, hashlib
d = json.load(open('data/players-2026.json')); P = d['players']
X = json.load(open('data/extra-players-2026.json'))
def norm(s): return re.sub(r'[^a-z]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower())
# (ovr target, age, injury games or 0, salary override)
INFO = {
 'Jimmy Butler': (71, 37, 35, 54126), 'Kristaps Porziņģis': (68, 31, 14, 30731), 'Donte DiVincenzo': (66, 29, 78, 12000), 'Moses Moody': (61, 24, 22, 12000),
 'Thomas Bryant': (57, 29, 0, 0), 'Devin Carter': (56, 24, 5, 0), 'Tacko Fall': (44, 31, 0, 0), 'Rayan Rupert': (50, 22, 0, 0),
 'Jayden Quaintance': (56, 20, 14, 0), 'Nate Bittle': (52, 23, 12, 0), 'Kobe Bufkin': (52, 23, 0, 0), 'Kam Jones': (52, 24, 0, 0),
 'Kylan Boswell': (52, 23, 8, 0), 'Tyler Bilodeau': (50, 23, 4, 0), 'Jamir Watkins': (48, 23, 75, 0), 'Rocco Zikarsky': (47, 21, 0, 0),
 'Vladislav Goldin': (50, 24, 0, 0), 'Javon Small': (51, 23, 0, 0), 'Jahmai Mashack': (50, 24, 0, 0), 'Carson Cooper': (49, 22, 0, 0),
 'Trey Alexander': (50, 24, 6, 0), 'Dillon Mitchell': (50, 23, 0, 0), 'Amari Williams': (50, 23, 0, 0), 'Joshua Jefferson': (50, 23, 0, 0),
 'Grant Nelson': (51, 24, 0, 0), 'RayJ Dennis': (50, 24, 0, 0), 'Keshon Gilbert': (48, 24, 0, 0), 'Jalen Wilson': (52, 25, 0, 0),
 'Michael Ajayi': (48, 24, 0, 0), 'Khalifa Diop': (47, 23, 0, 0), 'Tristan Enaruna': (47, 25, 0, 0), 'Riley Minix': (46, 23, 0, 0),
 "Nae'Qwan Tomlin": (46, 25, 0, 0), 'Ernest Udeh Jr.': (50, 23, 0, 0), 'Ugonna Onyenso': (47, 23, 0, 0), 'Quadir Copeland': (47, 22, 0, 0),
 'Arthur Kaluma': (49, 24, 0, 0), 'Lawson Lovering': (49, 24, 0, 0), 'Tre Donaldson': (49, 23, 0, 0), 'Keshad Johnson': (50, 25, 0, 0),
 'Pete Nance': (47, 25, 0, 0), 'Cormac Ryan': (47, 26, 0, 0), 'Enrique Freeman': (48, 25, 0, 0), 'Malik Dia': (46, 21, 0, 0),
 'Jaron Pierre Jr.': (46, 22, 0, 0), 'Julian Reese': (50, 24, 0, 0), 'Tyler Nickel': (46, 23, 0, 0), 'Izaiyah Nelson': (47, 24, 0, 0),
 'Chris Youngblood': (49, 24, 0, 0), 'Sean Pedulla': (48, 24, 0, 0),
}
def pick_template(pos, ovr, used):
    c = [p for p in P if p['pos'] == pos and p['teamId'] and p['id'] not in used and abs(p['ratings']['ovr'] - ovr) <= 2]
    c.sort(key=lambda p: (abs(p['ratings']['ovr'] - ovr), p['id']))
    return c[int(hashlib.md5((pos + str(ovr)).encode()).hexdigest(), 16) % min(len(c), 6)] if c else None
have = {norm(p['name']) for p in P}
used, added = set(), []
for tid, lst in X.items():
    for x in lst:
        nm = x['name']
        if norm(nm) in have or nm not in INFO: continue
        ovr, age, inj, sal = INFO[nm]
        pos = x['pos']
        t = pick_template(pos, ovr, used)
        if t is None: t = pick_template(pos, ovr + 3, used)
        used.add(t['id'])
        r = dict(t['ratings'])
        diff = ovr - r['ovr']
        for k in r:
            if k not in ('dur', 'ovr'): r[k] = max(5, min(99, r[k] + int(round(diff / 0.6 * 0.5))))
        r['ovr'] = ovr
        slug = re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', nm).encode('ascii', 'ignore').decode().lower())).strip('-')
        q = {'id': slug, 'name': nm, 'age': age, 'pos': pos, 'teamId': tid, 'hgt': x['hgt'], 'ratings': r}
        if sal: q['contract'] = {'s': sal, 'y': 2, 'o': 'player'}
        if inj: q['inj'] = inj
        P.append(q); added.append(nm)
# moves
MOVE = {'dalton-knecht': 'new-york-knicks', 'drew-timme': 'phoenix-suns', 'julian-phillips': 'houston-rockets', 'blake-wesley': 'la-clippers',
        'malachi-smith': 'toronto-raptors', 'harrison-ingram': 'utah-jazz'}
REL = {'d-angelo-russell', 'cole-anthony', 'caleb-houstan', 'johni-broome', 'ej-liddell'}
INJ = {'ariel-hukporti': 75, 'henri-veesaar': 75, 'mouhamed-gueye': 12, 'mikel-brown-jr': 3, 'egor-demin': 5, 'cj-mccollum': 0}
for p in P:
    if p['id'] in MOVE:
        p['teamId'] = MOVE[p['id']]
        if p['ratings']['ovr'] < 46: p['ratings']['ovr'] = 46
    if p['id'] in REL: p['teamId'] = None
    if INJ.get(p['id']): p['inj'] = INJ[p['id']]
d['players'] = P
json.dump(d, open('data/players-2026.json', 'w'), ensure_ascii=False, indent=1)
# numbers the main table lacks
N = json.load(open('data/jersey-numbers-2026.json')); E = json.load(open('data/jersey-numbers-extra.json'))
known = {norm(n) for t in N.values() for n in t} | {norm(n) for t in E.values() for n in t}
for tid, lst in X.items():
    for x in lst:
        if x.get('no') and norm(x['name']) not in known and x['name'] != 'Tyler Nickel' and (x.get('caption_team') or '') != '':
            E.setdefault(tid, {})[x['name']] = x['no']
json.dump(E, open('data/jersey-numbers-extra.json', 'w'), ensure_ascii=False, indent=1)
print(len(added), 'added', [n for n in INFO if n not in added])
