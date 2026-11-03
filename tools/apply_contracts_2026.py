"""Real 2026-27 contracts from basketball-reference.com/contracts/<TM>.html (rows: Player|Age|2026-27..2031-32|Guaranteed, option flags
[PO]/[TO]/[ETO] on the amount). s = 2026-27 salary (thousands), y = consecutive paid seasons including an option season, o = option type
on the last season. Usage: apply_contracts_2026.py contracts.json"""
import json, sys, re, unicodedata
d = json.load(open(sys.argv[1]))
def norm(n):
    n = unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode().lower()
    n = re.sub(r"[.'’,]", '', n); n = re.sub(r'\b(jr|sr|ii|iii|iv)\b', '', n)
    return re.sub(r'[^a-z]+', ' ', n).strip()
R = {}
for t, v in d.items():
    hd = v['hd']; yc = [i for i, h in enumerate(hd) if re.match(r'\d{4}-\d{2}$', h)]
    for r in v['rows']:
        if len(r) < 3 or not r[0]: continue
        cells = [r[i] for i in yc if i < len(r)]
        amt = []; opt = 'none'
        for c in cells:
            m = re.search(r'\$([\d,]+)', c)
            if not m: break
            amt.append(int(m.group(1).replace(',', '')))
            opt = 'player' if '[PO]' in c or '[ETO]' in c else 'team' if '[TO]' in c else 'none'
        if not amt: continue
        R.setdefault(norm(r[0]), []).append({'s': round(amt[0] / 1000), 'y': len(amt), 'o': opt})
f = 'data/players-2026.json'; doc = json.load(open(f)); hit = 0; miss = []
for p in doc['players']:
    l = R.get(norm(p['name']))
    if not l: miss.append(p['name']); continue
    c = max(l, key=lambda x: x['s']); p['contract'] = c; hit += 1
json.dump(doc, open(f, 'w'), ensure_ascii=False, indent=1)
print('real 2026-27 contracts', hit, 'of', len(doc['players']), 'unmatched', len(miss), miss[:30])
