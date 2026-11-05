"""Real per-season history for every player: data/career-real.json
{ playerId: [[season_start_year, teamId, g, mpg, pts, trb, ast, stl, blk, tov, fg%, 3p%, ft%], ...] }
Each data/players-<year>.json already holds the real stats of the season that starts that year in `prev`,
and the player's club that season in `teamId`. (1946 is covered by its own real row in the app.)"""
import json, glob, re, os
out = {}
for f in sorted(glob.glob('data/players-[0-9][0-9][0-9][0-9].json')):
    y = int(re.search(r'(\d{4})', f).group(1))
    if y == 1946: continue
    d = json.load(open(f))
    for p in d['players']:
        v = p.get('prev')
        if not v or not v.get('g'): continue
        out.setdefault(p['id'], []).append([y, p.get('teamId'), v['g'], v.get('mpg', 0), v.get('pts', 0), v.get('trb', 0), v.get('ast', 0), v.get('stl', 0), v.get('blk', 0), v.get('tov', 0), v.get('fg', 0), v.get('tp', 0), v.get('ft', 0)])
json.dump(out, open('data/career-real.json', 'w'), separators=(',', ':'))
print(len(out), 'players', sum(len(v) for v in out.values()), 'seasons', os.path.getsize('data/career-real.json') // 1024, 'KB')
