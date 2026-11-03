"""Apply real team-page salaries (bbref teams/<TM>/<Y>.html table#salaries2, scraped to team_sal.json) to
players-2024.json (2024-25 era, key '2025|*') and players-2025-open.json (2025-26, key '2026|*').
Usage: apply_team_salaries.py team_sal.json"""
import json, sys, re, unicodedata
d = json.load(open(sys.argv[1]))
def norm(n):
    n = unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode().lower()
    n = re.sub(r"[.'’,]", '', n); n = re.sub(r'\b(jr|sr|ii|iii|iv)\b', '', n)
    return re.sub(r'[^a-z]+', ' ', n).strip()
def sal(v): return int(re.sub(r'[^0-9]', '', v) or 0)
by = {'2025': {}, '2026': {}}
for k, v in d.items():
    y, t = k.split('|')
    for n, s in v['s']:
        if sal(s): by[y].setdefault(norm(n), []).append((sal(s), t))
def pick(lst, team):
    return max(lst, key=lambda x: (x[1] == team, x[0]))[0]
TEAM = {}  # filled lazily from file
def run(f, yr, nxt):
    p = json.load(open(f)); real = 0; miss = []
    for x in p['players']:
        n = norm(x['name']); l = by[yr].get(n)
        if not l: miss.append(x['name']); continue
        s = max(a for a, _ in l)
        c = x.get('contract') or {}
        y = c.get('y')
        if not y:
            y = 1
            if nxt and by[nxt].get(n): y = 2
        x['contract'] = {'s': round(s / 1000), 'y': y, 'o': c.get('o', 'none')}; real += 1
    json.dump(p, open(f, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f, 'real', real, 'unmatched', len(miss), miss[:25])
run('data/players-2024.json', '2025', '2026')
run('data/players-2025-open.json', '2026', None)
