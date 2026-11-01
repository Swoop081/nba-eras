"""Writes data/era-blurbs.json: one line about the state of the league at each era's opening night."""
import json, os
D = os.path.join(os.path.dirname(__file__), '..', 'data')
NOTE = {
 1954: 'The 24-second shot clock is new.', 1956: 'Bill Russell arrives in Boston.',
 1961: 'Chicago expands the league to nine.', 1966: 'The Bulls arrive.',
 1967: 'Seattle and San Diego join the league.', 1968: 'Milwaukee and Phoenix join.',
 1970: 'Cleveland, Buffalo and Portland join.', 1976: 'Four ABA clubs join the NBA.',
 1979: 'The three-point line is new.', 1980: 'Dallas joins.', 1984: 'Michael Jordan is a rookie.',
 1988: 'Charlotte and Miami join.', 1989: 'Orlando and Minnesota join.', 1995: 'Toronto and Vancouver join.',
 1998: 'A lockout cuts the season to 50 games.', 2004: 'Charlotte returns as the Bobcats.',
 2011: 'A lockout cuts the season to 66 games.', 2020: 'A 72-game season after the pandemic.',
}
def load(kind, y):
    p = os.path.join(D, f'{kind}-{y}.json')
    return json.load(open(p)) if os.path.exists(p) else None
def last(n):
    return n.split()[-1] if n else n
out = {}
for y in range(1951, 2027):
    pl, tm = load('players', y), load('teams', y)
    if not pl or not tm: continue
    teams = {t['id']: t for t in tm['teams']}
    n = len(teams)
    star = max(pl['players'], key=lambda p: p['ratings']['ovr'])
    parts = []
    if y in NOTE: parts.append(NOTE[y])
    parts.append(f'{n} clubs, {tm.get("games") or 82} games.')
    pp, pt = load('players', y - 1), load('teams', y - 1)
    if pp and pt and y > 1951 and all('rw' in t for t in pt['teams']):
        best = max(pt['teams'], key=lambda t: (t.get('rw', 0) / max(1, t.get('rw', 0) + t.get('rl', 0))))
        sc = [p for p in pp['players'] if p['prev'].get('g', 0) >= 30]
        lead = max(sc, key=lambda p: p['prev']['pts'])
        parts.append(f'The {best["name"]} owned last season at {best["rw"]}-{best["rl"]}.')
        if lead['name'] == star['name']:
            parts.append(f'{star["name"]} led scoring ({lead["prev"]["pts"]:.1f}) and is the best player in the game.')
        else:
            parts.append(f'{lead["name"]} led scoring with {lead["prev"]["pts"]:.1f}; {star["name"]} is the best player in the game.')
    else:
        parts.append(f'{star["name"]} is the best player in the game.')
    out[str(y)] = ' '.join(parts)
json.dump(out, open(os.path.join(D, 'era-blurbs.json'), 'w'), indent=0, ensure_ascii=False)
print(len(out)); print(out['1987']); print(out['1951']); print(out['2025'])
