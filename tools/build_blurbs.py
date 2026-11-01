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
import random
CH = {1950: 'Royals', 1951: 'Lakers', 1952: 'Lakers', 1953: 'Lakers', 1954: 'Nationals', 1955: 'Warriors', 1956: 'Celtics', 1957: 'Hawks', 1958: 'Celtics', 1959: 'Celtics', 1960: 'Celtics', 1961: 'Celtics', 1962: 'Celtics', 1963: 'Celtics', 1964: 'Celtics', 1965: 'Celtics', 1966: '76ers', 1967: 'Celtics', 1968: 'Celtics', 1969: 'Knicks', 1970: 'Bucks', 1971: 'Lakers', 1972: 'Knicks', 1973: 'Celtics', 1974: 'Warriors', 1975: 'Celtics', 1976: 'Trail Blazers', 1977: 'Bullets', 1978: 'SuperSonics', 1979: 'Lakers', 1980: 'Celtics', 1981: 'Lakers', 1982: '76ers', 1983: 'Celtics', 1984: 'Lakers', 1985: 'Celtics', 1986: 'Lakers', 1987: 'Lakers', 1988: 'Pistons', 1989: 'Pistons', 1990: 'Bulls', 1991: 'Bulls', 1992: 'Bulls', 1993: 'Rockets', 1994: 'Rockets', 1995: 'Bulls', 1996: 'Bulls', 1997: 'Bulls', 1998: 'Spurs', 1999: 'Lakers', 2000: 'Lakers', 2001: 'Lakers', 2002: 'Spurs', 2003: 'Pistons', 2004: 'Spurs', 2005: 'Heat', 2006: 'Spurs', 2007: 'Celtics', 2008: 'Lakers', 2009: 'Lakers', 2010: 'Mavericks', 2011: 'Heat', 2012: 'Heat', 2013: 'Spurs', 2014: 'Warriors', 2015: 'Cavaliers', 2016: 'Warriors', 2017: 'Warriors', 2018: 'Raptors', 2019: 'Lakers', 2020: 'Bucks', 2021: 'Warriors', 2022: 'Nuggets', 2023: 'Celtics'}
DECADE = {
 1950: 'Big men, set shots and no margin for error.', 1960: 'The Celtics cast a long shadow over everyone else.',
 1970: 'Afros, ABA flair and a league finding its feet.', 1980: 'Showtime, the Bird-Magic rivalry, then Jordan.',
 1990: 'Bruising defence and a league that grinds you down.', 2000: 'Isolation basketball and the last of the true centres.',
 2010: 'The three-point revolution is on.', 2020: 'Positionless basketball and a league built on the arc.'
}
def load(kind, y):
    p = os.path.join(D, f'{kind}-{y}.json')
    return json.load(open(p)) if os.path.exists(p) else None
out = {}
for y in range(1951, 2027):
    pl, tm = load('players', y), load('teams', y)
    if not pl or not tm: continue
    r = random.Random(y * 7919)
    teams = tm['teams']; n = len(teams); games = tm.get('games') or 82
    lg = pl.get('lg', {})
    P = pl['players']
    star = max(P, key=lambda p: p['ratings']['ovr'])
    young = [p for p in P if p.get('age', 30) <= 22 and p['ratings']['ovr'] >= 60]
    young = max(young, key=lambda p: p['ratings']['ovr']) if young else None
    vets = [p for p in P if p.get('age', 20) >= 34 and p['ratings']['ovr'] >= 62]
    vet = max(vets, key=lambda p: p['ratings']['ovr']) if vets else None
    facts = []
    if y in NOTE: facts.append(('note', NOTE[y]))
    champ = CH.get(y - 1)
    pp, pt = load('players', y - 1), load('teams', y - 1)
    best = lead = None
    if pp and pt and all('rw' in t for t in pt['teams']):
        best = max(pt['teams'], key=lambda t: t['rw'] / max(1, t['rw'] + t['rl']))
        sc = [p for p in pp['players'] if p['prev'].get('g', 0) >= 30]
        lead = max(sc, key=lambda p: p['prev']['pts']) if sc else None
    if champ and best and champ != best['name']:
        facts.append(('top', f'The {champ} wear the crown, but the {best["name"]} ({best["rw"]}-{best["rl"]}) owned the regular season.'))
    elif champ:
        facts.append(('top', r.choice([f'The {champ} are the team to beat.', f'The {champ} come in as defending champions.', f'{champ} hold the title and everyone knows it.', f'Everyone is chasing the {champ}.'])))
    facts.append(('star', r.choice([f'{star["name"]} ({star["age"]}) is the game\'s centre of gravity.', f'All eyes on {star["name"]}, the best player alive right now.', f'{star["name"]} is the one every coach plans around.'])))
    if lead and lead['name'] != star['name']:
        facts.append(('lead', r.choice([f'{lead["name"]} led the league in scoring last year at {lead["prev"]["pts"]:.1f}.', f'Last year\'s scoring crown went to {lead["name"]} ({lead["prev"]["pts"]:.1f} a night).'])))
    if young:
        facts.append(('young', r.choice([f'{young["name"]} is {young["age"]} and already a problem.', f'Keep an eye on {young["name"]}, {young["age"]}, the brightest young talent.'])))
    if vet:
        facts.append(('vet', r.choice([f'{vet["name"]} is still going at {vet["age"]}.', f'Father Time keeps losing to {vet["name"]}, {vet["age"]}.'])))
    if lg.get('pts'):
        tpa = lg.get('3pa', 0)
        if tpa >= 15: facts.append(('pace', r.choice([f'Teams are launching {tpa:.0f} threes a night.', f'The arc rules: {tpa:.0f} three-point tries a team, every game.'])))
        elif y >= 1979 and tpa >= 1: facts.append(('pace', f'The three-point line is still a curiosity ({tpa:.1f} tries a night).'))
        else: facts.append(('pace', r.choice([f'Teams score {lg["pts"]:.0f} a night.', f'Pace is fast: about {lg.get("poss", 100):.0f} possessions a game.' if lg.get('poss', 0) > 105 else f'Scores sit around {lg["pts"]:.0f} a game.'])))
    facts.append(('size', r.choice([f'{n} clubs, {games} games.', f'A {n}-team league playing {games} games a year.', f'{n} franchises fight for the title over {games} games.'])))
    notes = [f for f in facts if f[0] == 'note']
    rest = [f for f in facts if f[0] not in ('note', 'size')]
    r.shuffle(rest)
    pick = notes + rest[:2 if notes else 3]
    pick.append(next(f for f in facts if f[0] == 'size'))
    r.shuffle(pick)
    # lead with the most striking fact
    pick.sort(key=lambda f: {'note': 0, 'top': 1, 'star': 2}.get(f[0], 3))
    text = ' '.join(f[1] for f in pick)
    if r.random() < 0.5: text += ' ' + DECADE[y // 10 * 10]
    out[str(y)] = text
json.dump(out, open(os.path.join(D, 'era-blurbs.json'), 'w'), indent=0, ensure_ascii=False)
print(len(out))
for k in ('1953','1962','1975','1987','1996','2008','2019','2024'): print(k, out[k]); print()
