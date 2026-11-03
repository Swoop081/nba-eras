"""Real career spans from every data/players-<year>.json (tw excluded): data/careers.json
{id: [lastSeason (0 = still playing in 2026-27), [[firstSeasonOut, seasonBackIn], ...]]}
A gap of two or more missing seasons is a real sabbatical (Jordan 1998-2000, Magic 1992-94); EXTRA lists one-year sit-outs
that the box-score filter cannot tell from an injury."""
import json, glob, re, collections
yrs = collections.defaultdict(set)
for f in glob.glob('data/players-[0-9][0-9][0-9][0-9].json'):
    y = int(re.findall(r'(\d{4})', f)[0])
    for p in json.load(open(f))['players']:
        if not p.get('tw'): yrs[p['id']].add(y)
out = {}
for i, s in yrs.items():
    s = sorted(s); gaps = []
    for a, b in zip(s, s[1:]):
        pass   # sabbaticals are ignored: a player stays until his real last season
    out[i] = [0 if s[-1] >= 2026 else s[-1], sorted(gaps)] if gaps else [0 if s[-1] >= 2026 else s[-1]]
json.dump(out, open('data/careers.json', 'w'), separators=(',', ':'))
print(len(out), sum(1 for v in out.values() if len(v) > 1), out.get('michael-jordan'), out.get('magic-johnson'), out.get('kobe-bryant'))
