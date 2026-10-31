"""Build data/players-2026.json and data/teams-2026.json (2026-27 opening night).

Inputs, in tools/data-2026/:
  rosters.csv  team,Player,Pos,Ht,Age,GP     (landofbasketball roster pages, opening week)
  stats.csv    full per-game lines for ~277 players (Basketball Reference, opening week)
  stats2.csv   thinner per-game lines (PPG/RPG/APG/SPG/BPG and shooting %) for the rest

Only four to six games of 2026-27 exist, so the ratings are NOT read straight off the box scores.
Each player has a prior (a tier list for known players, otherwise minutes played) and the sample
pulls the rating away from it only as far as the minutes justify.

Usage: python3 -I tools/build_players_2026.py
"""
import csv
import hashlib
import json
import os
import re
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'data-2026')
OUT = os.path.join(HERE, '..', 'data')

# weights from league.js ovrOf
W = {'sco': .39, 'sht': .10, 'ft': .04, 'ply': .08, 'tov': .04, 'orb': .05, 'drb': .07, 'stl': .07, 'blk': .05, 'fou': .03, 'dur': .08}

TEAMS = [
    # code, city, name, conference, colours
    ('ATL', 'Atlanta', 'Hawks', 'Eastern', '#E03A3E', '#FFFFFF'),
    ('BOS', 'Boston', 'Celtics', 'Eastern', '#007A33', '#FFFFFF'),
    ('BKN', 'Brooklyn', 'Nets', 'Eastern', '#111111', '#FFFFFF'),
    ('CHA', 'Charlotte', 'Hornets', 'Eastern', '#1D1160', '#00A3B4'),
    ('CHI', 'Chicago', 'Bulls', 'Eastern', '#CE1141', '#FFFFFF'),
    ('CLE', 'Cleveland', 'Cavaliers', 'Eastern', '#860038', '#FDBB30'),
    ('DET', 'Detroit', 'Pistons', 'Eastern', '#1D42BA', '#C8102E'),
    ('IND', 'Indiana', 'Pacers', 'Eastern', '#002D62', '#FDBB30'),
    ('MIA', 'Miami', 'Heat', 'Eastern', '#98002E', '#F9A01B'),
    ('MIL', 'Milwaukee', 'Bucks', 'Eastern', '#00471B', '#EEE1C6'),
    ('NYK', 'New York', 'Knicks', 'Eastern', '#006BB6', '#F58426'),
    ('ORL', 'Orlando', 'Magic', 'Eastern', '#0077C0', '#C4CED4'),
    ('PHI', 'Philadelphia', '76ers', 'Eastern', '#006BB6', '#ED174C'),
    ('TOR', 'Toronto', 'Raptors', 'Eastern', '#CE1141', '#FFFFFF'),
    ('WAS', 'Washington', 'Wizards', 'Eastern', '#002B5C', '#E31837'),
    ('DAL', 'Dallas', 'Mavericks', 'Western', '#00538C', '#B8C4CA'),
    ('DEN', 'Denver', 'Nuggets', 'Western', '#0E2240', '#FEC524'),
    ('GSW', 'Golden State', 'Warriors', 'Western', '#1D428A', '#FFC72C'),
    ('HOU', 'Houston', 'Rockets', 'Western', '#CE1141', '#C4CED4'),
    ('LAC', 'LA', 'Clippers', 'Western', '#1D428A', '#C8102E'),
    ('LAL', 'Los Angeles', 'Lakers', 'Western', '#552583', '#FDB927'),
    ('MEM', 'Memphis', 'Grizzlies', 'Western', '#5D76A9', '#12173F'),
    ('MIN', 'Minnesota', 'Timberwolves', 'Western', '#0C2340', '#78BE20'),
    ('NOP', 'New Orleans', 'Pelicans', 'Western', '#0C2340', '#C8A15B'),
    ('OKC', 'Oklahoma City', 'Thunder', 'Western', '#007AC1', '#EF3B24'),
    ('PHX', 'Phoenix', 'Suns', 'Western', '#1D1160', '#E56020'),
    ('POR', 'Portland', 'Trail Blazers', 'Western', '#E03A3E', '#111111'),
    ('SAC', 'Sacramento', 'Kings', 'Western', '#5A2D81', '#C4CED4'),
    ('SAS', 'San Antonio', 'Spurs', 'Western', '#111111', '#C4CED4'),
    ('UTA', 'Utah', 'Jazz', 'Western', '#002B5C', '#F9A01B'),
]


def slug(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r"[^a-z0-9 ]", '', s.replace('.', '').replace("'", ''))
    return re.sub(r'\s+', '-', s.strip())


def norm(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'[^a-z ]', '', s.replace('.', '').replace('-', ' '))
    s = re.sub(r'\b(jr|sr|ii|iii|iv)\b', '', s)
    return ' '.join(s.split())


def f(v, default=None):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def jitter(name, span):
    h = int(hashlib.md5(name.encode()).hexdigest()[:6], 16) / 0xFFFFFF
    return (h - 0.5) * 2 * span


# Prior for players who are well known, on the game's own ovr scale (88 is the best player alive).
# Anyone not listed starts from their minutes.
TIER = {
    'nikola jokic': 88, 'shai gilgeousalexander': 87, 'luka doncic': 87, 'victor wembanyama': 86, 'giannis antetokounmpo': 85,
    'anthony edwards': 85, 'jayson tatum': 84, 'jalen brunson': 83, 'cade cunningham': 83, 'donovan mitchell': 82,
    'stephen curry': 81, 'kevin durant': 81, 'devin booker': 82, 'tyrese maxey': 82, 'joel embiid': 80, 'tyrese haliburton': 80,
    'jalen johnson': 80, 'domantas sabonis': 80, 'paolo banchero': 80, 'karlanthony towns': 80, 'anthony davis': 78,
    'jaylen brown': 80, 'kawhi leonard': 77, 'lebron james': 78, 'james harden': 77, 'trae young': 79, 'cooper flagg': 78,
    'evan mobley': 78, 'bam adebayo': 77, 'chet holmgren': 77, 'jalen williams': 78, 'alperen sengun': 78, 'amen thompson': 76,
    'deaaron fox': 76, 'zion williamson': 76, 'pascal siakam': 75, 'julius randle': 75, 'franz wagner': 75, 'zach lavine': 72,
    'damian lillard': 74, 'paul george': 72, 'lauri markkanen': 76, 'desmond bane': 74, 'darius garland': 74, 'scottie barnes': 75,
    'og anunoby': 74, 'tyler herro': 74, 'austin reaves': 75, 'brandon miller': 75, 'stephon castle': 72, 'dylan harper': 70,
    'jaren jackson': 74, 'deni avdija': 76, 'ja morant': 76, 'kyrie irving': 75, 'immanuel quickley': 70, 'derrick white': 72,
    'jarrett allen': 73, 'rudy gobert': 70, 'lamelo ball': 75, 'mikal bridges': 71, 'josh hart': 68, 'jrue holiday': 68,
    'jamal murray': 77, 'aaron gordon': 72, 'dejounte murray': 70, 'fred vanvleet': 70, 'jabari smith': 72, 'jaden mcdaniels': 69,
    'naz reid': 70, 'andrew nembhard': 68, 'ajay mitchell': 70, 'alex sarr': 68, 'kyshawn george': 64, 'tre johnson': 62,
    'zach edey': 68, 'ivica zubac': 71, 'jakob poeltl': 66, 'myles turner': 70, 'brook lopez': 65, 'al horford': 62,
    'draymond green': 64, 'klay thompson': 64, 'khris middleton': 62, 'jonathan kuminga': 68, 'kelly oubre': 64, 'jerami grant': 68,
    'norman powell': 72, 'keyonte george': 72, 'michael porter': 74, 'miles bridges': 70, 'dillon brooks': 66, 'jalen green': 71,
    'trey murphy': 73, 'herbert jones': 66, 'cameron boozer': 70, 'cedric coward': 66, 'jaylen wells': 63, 'ty jerome': 68,
    'nickeil alexanderwalker': 70, 'dyson daniels': 70, 'onyeka okongwu': 68, 'cj mccollum': 68, 'jalen duren': 72,
    'ausar thompson': 68, 'duncan robinson': 64, 'tari eason': 66, 'reed sheppard': 66, 'isaiah hartenstein': 68, 'alex caruso': 66,
    'cason wallace': 65, 'luguentz dort': 62, 'dennis schroder': 64, 'grayson allen': 66, 'ayo dosunmu': 64, 'toumani camara': 66,
    'donovan clingan': 68, 'jaime jaquez': 68, 'kelel ware': 66, 'kyle kuzma': 62, 'bobby portis': 64, 'andrew wiggins': 66,
    'christian braun': 67, 'peyton watson': 67, 'cameron johnson': 66, 'demar derozan': 70, 'saddiq bey': 64, 'jordan poole': 66,
    'walker kessler': 68, 'jarace walker': 62, 'bilal coulibaly': 64, 'deandre ayton': 66, 'collin sexton': 62, 'zaccharie risacher': 62,
    'dereck lively': 64, 'pj washington': 66, 'daniel gafford': 65, 'naji marshall': 64, 'max christie': 63, 'kon knueppel': 70,
    'matas buzelis': 66, 'josh giddey': 68, 'isaac okoro': 60, 'caleb wilson': 66, 'ace bailey': 64, 'darryn peterson': 68,
    'aj dybantsa': 68, 'darius acuff': 64, 'keaton wagler': 64, 'kingston flemings': 62, 'nolan traore': 60, 'mikel brown': 62,
    'egor demin': 60, 'derik queen': 66, 'jeremiah fears': 64, 'vj edgecombe': 68, 'khaman maluach': 60, 'ryan rollins': 66,
    'kasparas jakucionis': 60, 'jared mccain': 62, 'jabari walker': 52, 'aaron nesmith': 64, 'obi toppin': 66, 'bennedict mathurin': 66,
    'jalen suggs': 66, 'anthony black': 62, 'wendell carter': 64, 'tristan da silva': 62, 'jalen smith': 62, 'precious achiuwa': 60,
    'deandre hunter': 66, 'keegan murray': 66, 'malik monk': 64, 'dean wade': 56, 'devin vassell': 68, 'keldon johnson': 62,
    'julian champagnie': 62, 'harrison barnes': 56, 'luke kornet': 60, 'victor oladipo': 50, 'sam merrill': 62, 'tyrese proctor': 56,
    'jaylon tyson': 62, 'mario hezonja': 60, 'brandin podziemski': 66, 'yaxel lendeborg': 66, 'moses moody': 60, 'jonathan isaac': 50,
}

# mpg -> prior when nobody has heard of him
def minutes_prior(mpg):
    return 40 + 0.62 * min(mpg, 34)


def parse_ht(ht):
    a, b = ht.split('-')
    return int(a) * 12 + int(b)


def posout(p):
    p = p.replace('/', '')
    m = {'G': 'G', 'GF': 'G-F', 'F': 'F', 'FC': 'F-C', 'C': 'C', 'FG': 'G-F', 'CF': 'F-C', 'GFC': 'F-C'}
    return m.get(p, 'F')


def build():
    rosters = list(csv.DictReader(open(os.path.join(RAW, 'rosters.csv'), encoding='utf-8')))
    s1 = {norm(r['name']): r for r in csv.DictReader(open(os.path.join(RAW, 'stats.csv'), encoding='utf-8'))}
    s2 = {norm(r['name']): r for r in csv.DictReader(open(os.path.join(RAW, 'stats2.csv'), encoding='utf-8'))}

    rows = []
    for r in rosters:
        key = norm(r['Player'])
        e = {'name': r['Player'], 'team': r['team'], 'pos': posout(r['Pos']), 'hgt': parse_ht(r['Ht']), 'age': int(r['Age'])}
        a = s1.get(key)
        b = s2.get(key)
        if a:
            g = f(a['G'])
            mpg = f(a['MP'])
            e.update({'g': g, 'mpg': mpg, 'pts': f(a['PTS']), 'trb': f(a['ORB']) + f(a['DRB']), 'orb': f(a['ORB']), 'drb': f(a['DRB']),
                      'ast': f(a['AST']), 'stl': f(a['STL']), 'blk': f(a['BLK']), 'tov': f(a['TOV']), 'pf': f(a['PF']),
                      'fg': f(a['FG']), 'fga': f(a['FGA']), 'tp': f(a['3P']), 'tpa': f(a['3PA']), 'ft': f(a['FT']), 'fta': f(a['FTA']), 'full': True})
        elif b:
            g = f(b['G'])
            mpg = f(b['MPG'])
            rpg = f(b['RPG'])
            share = {'C': .34, 'F-C': .30, 'F': .24, 'G-F': .20, 'G': .16}.get(e['pos'], .24)
            e.update({'g': g, 'mpg': mpg, 'pts': f(b['PPG']), 'trb': rpg, 'orb': rpg * share, 'drb': rpg * (1 - share), 'ast': f(b['APG']),
                      'stl': f(b['SPG']), 'blk': f(b['BPG']), 'tov': None, 'pf': None, 'fgp': f(b['FGp']), 'tpp': f(b['TPp']), 'ftp': f(b['FTp']), 'full': False})
        else:
            e.update({'g': 0, 'mpg': 0, 'pts': 0, 'trb': 0, 'orb': 0, 'drb': 0, 'ast': 0, 'stl': 0, 'blk': 0, 'tov': None, 'pf': None, 'full': False, 'none': True})
        rows.append(e)

    # per-36 distributions among players with real minutes
    ref = [e for e in rows if e['g'] * e['mpg'] >= 60]

    def p36(e, k):
        return e[k] / e['mpg'] * 36 if e['mpg'] >= 3 else 0.0

    def pct_table(fn):
        vals = sorted(fn(e) for e in ref)
        n = len(vals)

        def pct(v):
            lo = sum(1 for x in vals if x < v)
            eq = sum(1 for x in vals if x == v)
            return (lo + 0.5 * eq) / n
        return pct

    p_pts = pct_table(lambda e: p36(e, 'pts'))
    p_ppg = pct_table(lambda e: e['pts'])
    p_ast = pct_table(lambda e: p36(e, 'ast'))
    p_orb = pct_table(lambda e: p36(e, 'orb'))
    p_drb = pct_table(lambda e: p36(e, 'drb'))
    p_stl = pct_table(lambda e: p36(e, 'stl'))
    p_blk = pct_table(lambda e: p36(e, 'blk'))
    p_tpa = pct_table(lambda e: (p36(e, 'tpa') if e['full'] else 0.0))

    LG_TS, LG_FT, LG_3P = 0.575, 0.78, 0.36
    PRIOR3 = {'C': 30, 'F-C': 42, 'F': 52, 'G-F': 60, 'G': 62}
    out = []
    for e in rows:
        mins = e['g'] * e['mpg']
        w_obs = mins / (mins + 450.0)
        pos = e['pos']
        # --- raw skill ratings from the sample, each pulled toward a neutral prior by minutes
        def mix(obs, prior, wt=None):
            wt = w_obs if wt is None else wt
            return wt * obs + (1 - wt) * prior

        if e.get('none') or e['mpg'] < 3:
            pr_pts = pr_ast = pr_orb = pr_drb = pr_stl = pr_blk = 0.4
        else:
            pr_pts = 0.5 * p_pts(p36(e, 'pts')) + 0.5 * p_ppg(e['pts'])
            pr_ast, pr_orb, pr_drb = p_ast(p36(e, 'ast')), p_orb(p36(e, 'orb')), p_drb(p36(e, 'drb'))
            pr_stl, pr_blk = p_stl(p36(e, 'stl')), p_blk(p36(e, 'blk'))
        posbase = {'G': {'ast': .72, 'orb': .22, 'drb': .35, 'blk': .22, 'stl': .55}, 'G-F': {'ast': .55, 'orb': .35, 'drb': .45, 'blk': .35, 'stl': .55},
                   'F': {'ast': .42, 'orb': .5, 'drb': .52, 'blk': .48, 'stl': .5}, 'F-C': {'ast': .35, 'orb': .68, 'drb': .66, 'blk': .62, 'stl': .42},
                   'C': {'ast': .32, 'orb': .8, 'drb': .8, 'blk': .75, 'stl': .35}}[pos]
        sco = clamp(round(100 * mix(pr_pts, 0.45) ** 1.0 * 1.0), 5, 100)
        ply = clamp(round(100 * mix(pr_ast, posbase['ast'])), 5, 99)
        orb = clamp(round(100 * mix(pr_orb, posbase['orb'])), 5, 99)
        drb = clamp(round(100 * mix(pr_drb, posbase['drb'])), 5, 99)
        stl = clamp(round(100 * mix(pr_stl, posbase['stl'])), 5, 99)
        blk = clamp(round(100 * mix(pr_blk, posbase['blk'])), 5, 99)

        # shooting efficiency
        if e['full'] and (e['fga'] + 0.44 * e['fta']) > 0:
            att = (e['fga'] + 0.44 * e['fta']) * e['g']
            ts = e['pts'] / (2 * (e['fga'] + 0.44 * e['fta']))
            ts_adj = (ts * att + LG_TS * 60) / (att + 60)
            ftp = (e['ft'] * e['g'] + LG_FT * 20) / (e['fta'] * e['g'] + 20)
            tpa_g = e['tpa'] * e['g']
            tpp = (e['tp'] * e['g'] + LG_3P * 40) / (tpa_g + 40)
            vol3 = p_tpa(p36(e, 'tpa'))
            tovr = e['tov'] / (e['fga'] + 0.44 * e['fta'] + e['tov']) if (e['fga'] + e['tov']) > 0 else 0.13
            tov_adj = (tovr * mins + 0.13 * 120) / (mins + 120)
            pf36 = e['pf'] / e['mpg'] * 36
            pf_adj = (pf36 * mins + 2.9 * 120) / (mins + 120)
            tov = clamp(round(100 * (1 - (tov_adj - 0.06) / 0.16)), 10, 95)
            fou = clamp(round(100 * (1 - (pf_adj - 1.5) / 4.2)), 8, 95)
        else:
            fgp = e.get('fgp')
            ts_adj = LG_TS
            if fgp is not None and e['mpg'] >= 3:
                ts_raw = 0.575 + (fgp - 0.46) * 0.8
                att = e['pts'] * e['g'] / 1.1
                ts_adj = (ts_raw * att + LG_TS * 60) / (att + 60)
            ftp = e.get('ftp')
            ftp = LG_FT if ftp is None else (ftp * 12 + LG_FT * 20) / 32
            tpp = e.get('tpp')
            tpp = LG_3P if tpp is None else (tpp * 14 + LG_3P * 40) / 54
            vol3 = {'C': .12, 'F-C': .3, 'F': .5, 'G-F': .62, 'G': .66}[pos]
            tov = clamp(round(58 - (e['ast'] / max(e['mpg'], 1) * 36) * 0.4 - (4 if pos == 'C' else 0)), 25, 75)
            fou = {'C': 38, 'F-C': 42, 'F': 50, 'G-F': 54, 'G': 58}[pos]
        sht = clamp(round(100 * clamp((ts_adj - 0.50) / 0.14, 0, 1)), 5, 99)
        ft = clamp(round(100 * (ftp - 0.55) / 0.37), 10, 99)
        tpt_obs = 100 * clamp((tpp - 0.28) / 0.15, 0, 1)
        tpt = clamp(round(0.55 * tpt_obs + 0.45 * 100 * vol3), 5, 99)
        age = e['age']
        dur = clamp(round(80 - max(0, age - 31) * 3 + jitter(e['name'], 9)), 40, 98)

        raw = {'sco': sco, 'sht': sht, 'ft': ft, 'tpt': tpt, 'ply': ply, 'tov': tov, 'orb': orb, 'drb': drb, 'stl': stl, 'blk': blk, 'fou': fou, 'dur': dur}
        raw_ovr = round(35 + 0.6 * sum(W[k] * raw[k] for k in W))

        # --- talent: the prior carries most of the weight because four to six games say little
        key = norm(e['name'])
        tier_key = key.replace(' ', '')
        prior = None
        for k, v in TIER.items():
            if k.replace(' ', '') == tier_key:
                prior = v
                break
        if prior is None:
            for k, v in TIER.items():   # surname-less keys like 'jaren jackson' match 'jaren jackson jr'
                if tier_key.startswith(k.replace(' ', '')):
                    prior = v
                    break
        known = prior is not None
        if prior is None:
            prior = minutes_prior(e['mpg'] if e['mpg'] else 6)
            if age <= 21 and e['mpg'] < 20:
                prior -= 2
        w_t = (0.18 if known else 0.4) * mins / (mins + 120.0)
        target = (1 - w_t) * prior + w_t * raw_ovr
        target = clamp(round(target + jitter(e['name'] + 'x', 1.2)), 38, 94)

        # move every skill (not durability) so the overall lands on the target; clamp-aware, two passes
        r = dict(raw)
        for _ in range(3):
            cur = 35 + 0.6 * sum(W[k] * r[k] for k in W)
            d = (target - cur) / (0.6 * (1 - W['dur']))
            if abs(d) < 0.2:
                break
            for k in r:
                if k != 'dur':
                    r[k] = clamp(round(r[k] + d), 3, 99)
        r['ovr'] = round(35 + 0.6 * sum(W[k] * r[k] for k in W))
        out.append({
            'id': slug(e['name']), 'name': e['name'], 'age': age, 'pos': pos, 'teamId': e['team'], 'hgt': e['hgt'],
            'ratings': {k: r[k] for k in ('ovr', 'sco', 'sht', 'ply', 'dur', 'stl', 'blk', 'ft', 'tpt', 'orb', 'drb', 'tov', 'fou')},
            '_mins': mins,
        })

    # unique ids
    seen = {}
    for p in out:
        n = seen.get(p['id'], 0)
        seen[p['id']] = n + 1
        if n:
            p['id'] += '-' + str(n + 1)
    out.sort(key=lambda p: -p['ratings']['ovr'])
    teams_out = []
    code_to_id = {}
    for code, city, name, conf, c1, c2 in TEAMS:
        tid = slug(city + ' ' + name)
        code_to_id[code] = tid
        teams_out.append({'id': tid, 'city': city, 'name': name, 'division': conf, 'w': 0, 'l': 0, 'colors': [c1, c2]})
    for p in out:
        p['teamId'] = code_to_id[p['teamId']]
        del p['_mins']
    players_doc = {'season': '2026-27', 'source': 'Rosters: landofbasketball.com opening week 2026-27. Stats: Basketball Reference and landofbasketball.com, first four to six games. Ratings blend those games with a prior built from reputation and minutes.', 'players': out}
    teams_doc = {'season': '2026-27', 'league': 'National Basketball Association', 'games': 82, 'source': 'NBA 2026-27 opening night. Colours are approximations.', 'divisions': ['Eastern', 'Western'], 'teams': teams_out}
    with open(os.path.join(OUT, 'players-2026.json'), 'w', encoding='utf-8') as fh:
        json.dump(players_doc, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'teams-2026.json'), 'w', encoding='utf-8') as fh:
        json.dump(teams_doc, fh, ensure_ascii=False, indent=1)
    print(len(out), 'players,', len(teams_out), 'teams')
    unmatched = [e['name'] for e in rows if e.get('none')]
    print('no stats at all:', unmatched)


if __name__ == '__main__':
    build()
