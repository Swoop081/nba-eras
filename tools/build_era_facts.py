"""data/era-facts.json from Wikipedia award tables (scraped to wiki_awards.json / wiki_awards2.json):
{seasonStartYear: {champ, runnerUp, result, fmvp, mvp, roy}}. Usage: build_era_facts.py wiki_awards.json wiki_awards2.json"""
import json, re, sys
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
def clean(n): return re.sub(r'\s*[\*\^†‡§]+|\s*\(\d+\)|\[.*?\]', '', n).strip()
def team(t): return re.sub(r'\s*\(.*', '', re.sub(r'\.mw-parser-output[^}]*}', '', t)).replace('†', '').strip()
F = {}
for r in a['List_of_NBA_champions'][1][1:]:
    c = [x.strip() for x in r.split(' | ')]
    if len(c) < 4 or not re.match(r'\d{4}$', c[0]): continue
    y = int(c[0]); ri = next((i for i, x in enumerate(c) if re.match(r'\d[–-]\d$', x)), None)   # the result cell splits the two finalists
    if ri is None: continue
    w = team(c[1]); e = next((team(x) for x in c[ri + 1:] if re.search(r'\(\d+\)', x)), None); m = re.match(r'(\d)[–-](\d)', c[ri])
    if not e: continue
    ww, ee = int(m.group(1)), int(m.group(2)); champ, ru = (w, e) if ww > ee else (e, w)
    F[y - 1] = {'champ': champ, 'runnerUp': ru, 'result': '%d-%d' % (max(ww, ee), min(ww, ee))}
for r in b['NBA_Finals_Most_Valuable_Player_Award'][0][1:]:
    c = [x.strip() for x in r.split(' | ')]
    if re.match(r'\d{4}$', c[0]) and int(c[0]) - 1 in F: F[int(c[0]) - 1]['fmvp'] = clean(c[1])
for key, name in (('NBA_Rookie_of_the_Year_Award', 'roy'), ('NBA_Most_Valuable_Player_Award', 'mvp')):
    for r in b[key][0][1:]:
        c = [x.strip() for x in r.split(' | ')]
        m = re.match(r'(\d{4})', c[0])
        if m and int(m.group(1)) in F: F[int(m.group(1))].setdefault(name, clean(c[1]))
json.dump({str(k): v for k, v in sorted(F.items())}, open('data/era-facts.json', 'w'), ensure_ascii=False, indent=0)
print(len(F)); [print(k, F[k]) for k in (1950, 1999, 2013, 2014, 2025)]
