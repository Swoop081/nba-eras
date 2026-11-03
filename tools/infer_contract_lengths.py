"""Infers contract lengths for 1990-2024 from the real salary history (a deal continues while his pay moves (a trade does not end it)
only by an ordinary raise; a jump starts a new deal; minimum-level pay is a one-year deal; at most 6 years).
Salaries: nba_salaries_master.csv (season-end years 1991-2024), team_sal.json (2025, 2026 from team pages), contracts26.json (2027 on).
Usage: infer_contract_lengths.py master.csv team_sal.json contracts26.json [--check]"""
import json, sys, re, unicodedata, pandas as pd
def norm(n):
    n = unicodedata.normalize('NFKD', str(n)).encode('ascii', 'ignore').decode().lower()
    n = re.sub(r"[.'’,]", '', n); n = re.sub(r'\b(jr|sr|ii|iii|iv)\b', '', n)
    return re.sub(r'[^a-z]+', ' ', n).strip()
FIX = {'BRK': 'BKN', 'CHO': 'CHA', 'PHO': 'PHX'}
m = pd.read_csv(sys.argv[1]); by = {}
for r in m.itertuples(): by[(norm(r.player), int(r.year))] = (float(r.salary), r.team)
ts = json.load(open(sys.argv[2]))
for k, v in ts.items():
    y, t = k.split('|'); t = FIX.get(t, t)
    for n, s in v['s']:
        x = int(re.sub(r'[^0-9]', '', s) or 0)
        if x: by[(norm(n), int(y))] = max(by.get((norm(n), int(y)), (0, t)), (x, t))
cj = json.load(open(sys.argv[3]))
for t, v in cj.items():
    t = FIX.get(t, t); yc = [i for i, h in enumerate(v['hd']) if re.match(r'\d{4}-\d{2}$', h)]
    for r in v['rows']:
        for j, i in enumerate(yc):
            c = r[i] if i < len(r) else ''
            mm = re.search(r'\$([\d,]+)', c)
            if mm and (norm(r[0]), 2027 + j) not in by: by[(norm(r[0]), 2027 + j)] = (int(mm.group(1).replace(',', '')), t)
first = {}
for (k, y) in by: first[k] = min(first.get(k, 9999), y)
p25 = m.groupby('year').salary.quantile(.25).to_dict()
def span_end(k, y):
    s, t = by[(k, y)]; n = 1
    if y <= 2024 and s <= p25.get(y, 0): return y
    yy = y
    while n < 6 and (k, yy + 1) in by:
        s2, t2 = by[(k, yy + 1)]
        lim = 1.22 if yy - first[k] <= 2 and first[k] >= 1992 else 1.125
        if not (0.88 <= s2 / s <= lim): break
        yy += 1; n += 1; s = s2
    return yy
tot = chg = 0; agree = []
for Y in range(1990, 2026):
    f = 'data/players-%d.json' % Y if Y != 2025 else 'data/players-2025-open.json'
    try: d = json.load(open(f))
    except Exception: continue
    for p in d['players']:
        c = p.get('contract'); k = norm(p['name'])
        if not c or (k, Y + 1) not in by: continue
        # real contracts (2025-26 / 2026-27) are only compared, never changed
        n = span_end(k, Y + 1) - Y
        if Y >= 2025:
            agree.append((n, c['y'])); continue
        if c['y'] != n: chg += 1
        c['y'] = n; tot += 1
    if Y < 2025: json.dump(d, open(f, 'w'), ensure_ascii=False, separators=(',', ':'))
print('contracts re-lengthed', tot, 'changed', chg)
if agree: print('check vs real 2025-26 lengths: exact', sum(a == b for a, b in agree), 'of', len(agree), 'within 1', sum(abs(a - b) <= 1 for a, b in agree))
