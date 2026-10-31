"""Data-driven ratings for any season from every Basketball Reference table (tools/data-<season>/bbref_*.csv).
Usage: python3 -I tools/build_ratings.py <BR year>   e.g. 2025 builds the 2024-25 era (data/players-2024.json, teams-2024.json)

Each skill is a percentile of the real stat that measures it, pulled toward a positional prior by minutes played:
  sco  points per 100 possessions, usage, offensive box plus-minus
  sht  true shooting
  ft   free-throw %, shrunk by attempts
  tpt  three-point % (shrunk by attempts) and three-point volume
  ply  assist %, assist-to-turnover, offensive box plus-minus
  tov  turnover % and bad passes / lost balls
  orb / drb   rebound percentages
  stl / blk   steal and block percentages
  fou  fouls per 100 possessions (high = disciplined)
  dur  games played and age
Overall is set from value (box plus-minus, win shares per 48, PER, on/off) mapped onto the same scale as the 2026 file,
and every skill is then moved together until the weighted overall matches. Hidden impact (imp) comes from
defensive box plus-minus and on/off. Output: data/players-2025.json, data/teams-2025.json.

"""
import csv, json, os, re, sys, unicodedata
import pandas as pd
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_players_2026 as B      # team table, slug, norm, weights

YR = int(sys.argv[1])                 # Basketball Reference season, 2025 = 2024-25
ERA = str(YR - 1)                     # era id = the year the season starts
RAW = os.path.join(HERE, 'data-' + ERA)
OUT = os.path.join(HERE, '..', 'data')
W = B.W
CODE = {'BRK': 'BKN', 'CHO': 'CHA', 'PHO': 'PHX'}
# franchise names by code for the year being built (Basketball Reference codes)
def team_name(code):
    n = {'ATL': 'Atlanta Hawks', 'BOS': 'Boston Celtics', 'BKN': 'Brooklyn Nets', 'NJN': 'New Jersey Nets', 'CHI': 'Chicago Bulls', 'CLE': 'Cleveland Cavaliers',
         'DAL': 'Dallas Mavericks', 'DEN': 'Denver Nuggets', 'DET': 'Detroit Pistons', 'GSW': 'Golden State Warriors', 'HOU': 'Houston Rockets', 'IND': 'Indiana Pacers',
         'LAC': 'Los Angeles Clippers', 'LAL': 'Los Angeles Lakers', 'MEM': 'Memphis Grizzlies', 'VAN': 'Vancouver Grizzlies', 'MIA': 'Miami Heat', 'MIL': 'Milwaukee Bucks',
         'MIN': 'Minnesota Timberwolves', 'NOP': 'New Orleans Pelicans', 'NOH': 'New Orleans Hornets', 'NOK': 'New Orleans Hornets', 'NYK': 'New York Knicks',
         'OKC': 'Oklahoma City Thunder', 'SEA': 'Seattle SuperSonics', 'ORL': 'Orlando Magic', 'PHI': 'Philadelphia 76ers', 'PHX': 'Phoenix Suns', 'POR': 'Portland Trail Blazers',
         'SAC': 'Sacramento Kings', 'SAS': 'San Antonio Spurs', 'TOR': 'Toronto Raptors', 'UTA': 'Utah Jazz', 'WAS': 'Washington Wizards', 'WSB': 'Washington Bullets'}
    if code == 'CHA':
        return 'Charlotte Bobcats' if 2005 <= YR <= 2014 else 'Charlotte Hornets'
    if code == 'CHH':
        return 'Charlotte Hornets'
    return n[code]

ALIAS = {'los-angeles-clippers': 'la-clippers'}
EAST = {'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'New Jersey Nets', 'Charlotte Bobcats', 'Charlotte Hornets', 'Chicago Bulls', 'Cleveland Cavaliers', 'Detroit Pistons', 'Indiana Pacers',
        'Miami Heat', 'Milwaukee Bucks', 'New York Knicks', 'Orlando Magic', 'Philadelphia 76ers', 'Toronto Raptors', 'Washington Wizards', 'Washington Bullets'}
COLORS = {'Seattle SuperSonics': ('#00653A', '#FFC200', 1610612760), 'Vancouver Grizzlies': ('#00B2A9', '#B15C2A', 1610612763), 'New Jersey Nets': ('#002A60', '#CD1041', 1610612751),
          'New Orleans Hornets': ('#00778B', '#280071', 1610612740), 'Charlotte Bobcats': ('#1D1160', '#F26532', 1610612766), 'Washington Bullets': ('#002B5C', '#E31837', 1610612764)}

AGG = ('2TM', '3TM', '4TM', '5TM', '6TM', 'TOT')


def load(name):
    fn = os.path.join(RAW, 'bbref_%s.csv' % name)
    if not os.path.exists(fn):
        return pd.DataFrame({'Rk': [], 'Player': [], 'Team': [], 'key': []})
    df = pd.read_csv(fn)
    df = df[pd.to_numeric(df['Rk'], errors='coerce').notna()].copy()
    df['key'] = df['Player'].map(B.norm)
    df['Team'] = df['Team'].replace(CODE)
    for c in df.columns:
        if c not in ('Player', 'Team', 'Pos', 'Awards', 'key', 'Position'):
            df[c] = pd.to_numeric(df[c], errors='coerce')
    return df


def pick_agg(df):
    """One row per player: the combined row if he was traded, otherwise his only row."""
    rows = {}
    for _, r in df.iterrows():
        k = r['key']
        if r['Team'] in AGG or k not in rows:
            if k in rows and rows[k]['Team'] in AGG and r['Team'] not in AGG:
                continue
            rows[k] = r
    return rows


def pct_of(values, v):
    lo = np.sum(values < v)
    eq = np.sum(values == v)
    return (lo + 0.5 * eq) / len(values)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def main():
    pg, tot, pm, pp, ad, sh, pb = [load(n) for n in ('per_game', 'totals', 'per_minute', 'per_poss', 'advanced', 'shooting', 'play_by_play')]
    hmap = {}
    for fn in os.listdir(OUT):
        if fn.startswith('players-') and fn.endswith('.json'):
            try:
                for q in json.load(open(os.path.join(OUT, fn)))['players']:
                    hmap[q['id']] = q['hgt']
            except Exception:
                pass
    A = {n: pick_agg(d) for n, d in (('pg', pg), ('tot', tot), ('pm', pm), ('pp', pp), ('ad', ad), ('sh', sh), ('pb', pb))}
    # team splits (per game) for availability and primary club
    splits = {}
    for _, r in pg.iterrows():
        if r['Team'] in AGG:
            continue
        splits.setdefault(r['key'], []).append((r['Team'], r['G'], r['MP']))
    rost = {}
    if os.path.exists(os.path.join(RAW, 'rosters.csv')):
        for r in csv.DictReader(open(os.path.join(RAW, 'rosters.csv'), encoding='utf-8')):
            rost[B.norm(r['Player'])] = r

    players = []
    for k, a in A['ad'].items():
        if k not in A['pg'] or k not in splits:
            continue
        g_ = A['pg'][k]; t_ = A['tot'][k]; p_ = A['pp'].get(k); s_ = A['sh'][k] if k in A['sh'] else None; b_ = A['pb'][k] if k in A['pb'] else None
        mp = float(a['MP']) if not np.isnan(a['MP']) else 0
        if mp < 1:
            continue
        team = max(splits[k], key=lambda x: x[1])[0]
        gp_team = max(splits[k], key=lambda x: x[1])[1]
        players.append({'k': k, 'name': g_['Player'], 'age': int(a['Age']), 'pos': a['Pos'], 'team': team, 'mp': mp, 'g': float(a['G']),
                        'a': a, 'g_': g_, 't': t_, 'p': p_, 's': s_, 'b': b_, 'gp_team': gp_team, 'splits': splits[k]})

    def col(fn, minmp=400):
        return np.array([fn(p) for p in players if p['mp'] >= minmp and fn(p) is not None and not np.isnan(fn(p))])

    def f(p, tab, c, default=np.nan):
        r = p[tab]
        if r is None:
            return default
        v = r.get(c, default)
        return default if v is None or (isinstance(v, float) and np.isnan(v)) else v

    # league tables of each measured rate, among players with real minutes
    FEATS = {
        'pts100': lambda p: f(p, 'p', 'PTS'),
        'usg': lambda p: f(p, 'a', 'USG%'),
        'obpm': lambda p: f(p, 'a', 'OBPM'),
        'ts': lambda p: f(p, 'a', 'TS%'),
        'ast': lambda p: f(p, 'a', 'AST%'),
        'astto': lambda p: f(p, 'p', 'AST') / max(0.5, f(p, 'p', 'TOV')),
        'tovp': lambda p: f(p, 'a', 'TOV%'),
        'orbp': lambda p: f(p, 'a', 'ORB%'),
        'drbp': lambda p: f(p, 'a', 'DRB%'),
        'stlp': lambda p: f(p, 'a', 'STL%'),
        'blkp': lambda p: f(p, 'a', 'BLK%'),
        'pf100': lambda p: f(p, 'p', 'PF'),
        'tpa100': lambda p: f(p, 'p', '3PA'),
        'bpm': lambda p: f(p, 'a', 'BPM'),
        'ws48': lambda p: f(p, 'a', 'WS/48'),
        'per': lambda p: f(p, 'a', 'PER'),
        'dbpm': lambda p: f(p, 'a', 'DBPM'),
        'onoff': lambda p: f(p, 'b', '+/- Per 100 Poss_On-Off'),
        'vorpg': lambda p: f(p, 'a', 'VORP') / max(1.0, f(p, 'a', 'G', 1)),
    }
    DIST = {n: col(fn) for n, fn in FEATS.items()}

    def pr(name, v):
        return pct_of(DIST[name], v)

    # positional priors for each rate: the median percentile of players at that position
    def posclass(p):
        b = p['b']
        if b is not None:
            g = f(p, 'b', 'Position Estimate_PG%', 0) + f(p, 'b', 'Position Estimate_SG%', 0)
            sf = f(p, 'b', 'Position Estimate_SF%', 0); pf = f(p, 'b', 'Position Estimate_PF%', 0); c = f(p, 'b', 'Position Estimate_C%', 0)
            if g >= 75: return 'G'
            if c >= 60: return 'C'
            if pf + c >= 75 and c >= 25: return 'F-C'
            if g >= 45 and sf >= 25: return 'G-F'
            return 'F'
        return {'PG': 'G', 'SG': 'G', 'SF': 'F', 'PF': 'F', 'C': 'C'}.get(str(p['pos'])[:2], 'F')

    for p in players:
        p['pc'] = posclass(p)
    PRIOR = {}
    for n in ('pts100', 'usg', 'obpm', 'ts', 'ast', 'astto', 'tovp', 'orbp', 'drbp', 'stlp', 'blkp', 'pf100', 'tpa100'):
        PRIOR[n] = {}
        for pc in ('G', 'G-F', 'F', 'F-C', 'C'):
            vals = [FEATS[n](p) for p in players if p['pc'] == pc and p['mp'] >= 400 and not np.isnan(FEATS[n](p))]
            PRIOR[n][pc] = pct_of(DIST[n], np.median(vals)) if vals else 0.5

    def shrunk(name, p, m0=500, invert=False):
        v = FEATS[name](p)
        pc = PRIOR[name][p['pc']]
        pctl = pr(name, v) if not np.isnan(v) else pc
        if invert:
            pctl, pc = 1 - pctl, 1 - pc
        w = p['mp'] / (p['mp'] + m0)
        return w * pctl + (1 - w) * pc

    LG_FT, LG_3P, LG_TS = 0.78, 0.36, 0.575
    # reference ovr distribution = the 2026 file, among its rotation players
    ref = json.load(open(os.path.join(OUT, 'players-2026.json')))['players']
    ref_ovr = np.sort(np.array([x['ratings']['ovr'] for x in ref]))

    out = []
    for p in players:
        mp = p['mp']
        fta = f(p, 't', 'FTA', 0); ftm = f(p, 't', 'FT', 0)
        ftp = (ftm + LG_FT * 30) / (fta + 30)
        tpa = f(p, 't', '3PA', 0); tpm = f(p, 't', '3P', 0)
        tpp = (tpm + LG_3P * 120) / (tpa + 120)
        ts = FEATS['ts'](p)
        ts_adj = LG_TS if np.isnan(ts) else (ts * (mp / (mp + 600)) + LG_TS * (600 / (mp + 600)))
        sco = 100 * (0.55 * shrunk('pts100', p) + 0.25 * shrunk('usg', p) + 0.20 * shrunk('obpm', p))
        sht = 100 * clamp((ts_adj - 0.50) / 0.15, 0, 1)
        ft = 100 * clamp((ftp - 0.55) / 0.38, 0, 1)
        tpt = 100 * (0.55 * clamp((tpp - 0.28) / 0.16, 0, 1) + 0.45 * shrunk('tpa100', p))
        ply = 100 * (0.70 * shrunk('ast', p) + 0.15 * shrunk('astto', p) + 0.15 * shrunk('obpm', p))
        tov = 100 * (0.65 * shrunk('tovp', p, invert=True) + 0.35 * shrunk('astto', p))
        orb = 100 * shrunk('orbp', p)
        drb = 100 * shrunk('drbp', p)
        stl = 100 * shrunk('stlp', p)
        blk = 100 * shrunk('blkp', p)
        fou = 100 * shrunk('pf100', p, invert=True)
        avail = clamp(p['g'] / 82.0, 0, 1)
        dur = clamp(round(40 + 45 * avail + 12 * (1 - avail) ** 0 - max(0, p['age'] - 31) * 2.5), 40, 98)
        raw = {'sco': sco, 'sht': sht, 'ft': ft, 'tpt': tpt, 'ply': ply, 'tov': tov, 'orb': orb, 'drb': drb, 'stl': stl, 'blk': blk, 'fou': fou, 'dur': dur}
        # value -> target overall
        w_obs = mp / (mp + 700.0)
        bpm = f(p, 'a', 'BPM', 0); ws48 = f(p, 'a', 'WS/48', 0.05); per = f(p, 'a', 'PER', 12); onoff = f(p, 'b', '+/- Per 100 Poss_On-Off', 0)
        vg = f(p, 'a', 'VORP', 0) / max(1.0, f(p, 'a', 'G', 1))
        value = w_obs * (0.28 * pr('bpm', bpm) + 0.22 * pr('vorpg', vg) + 0.20 * pr('ws48', ws48) + 0.15 * pr('per', per) + 0.15 * pr('onoff', onoff)) + (1 - w_obs) * 0.25
        p['value'] = value
        p['raw'] = raw
        p['w_obs'] = w_obs
        out.append(p)

    # minutes-weighted rank of value -> the ovr scale
    vals = np.sort(np.array([p['value'] for p in out if p['mp'] >= 300]))
    rows = []
    for p in out:
        q = pct_of(vals, p['value'])
        target = float(np.interp(q, np.linspace(0, 1, len(ref_ovr)), ref_ovr))
        if p['mp'] < 300:
            target = min(target, 56)
        r = {x: clamp(round(v), 3, 99) for x, v in p['raw'].items()}
        for _ in range(4):
            cur = 35 + 0.6 * sum(W[x] * r[x] for x in W)
            d = (target - cur) / (0.6 * (1 - W['dur']))
            if abs(d) < 0.2:
                break
            for x in r:
                if x != 'dur':
                    r[x] = clamp(round(r[x] + d), 3, 99)
        r['ovr'] = round(35 + 0.6 * sum(W[x] * r[x] for x in W))
        # hidden impact: defensive box plus-minus and on/off, shrunk by minutes; a unit is worth a little shooting efficiency
        dbpm = f(p, 'a', 'DBPM', 0); onoff = f(p, 'b', '+/- Per 100 Poss_On-Off', 0)
        imp = round(0.0016 * p['w_obs'] * (dbpm * 1.0 + onoff * 0.25), 4)
        g_ = p['g_']; a = p['a']
        ro = rost.get(p['k'])
        hgt = B.parse_ht(ro['Ht']) if ro else hmap.get(B.slug(p['name'])) or {'G': 75, 'G-F': 78, 'F': 80, 'F-C': 82, 'C': 83}[p['pc']]
        prev = {'g': int(p['g']), 'mpg': round(float(g_['MP']), 1), 'pts': float(g_['PTS']), 'trb': float(g_['TRB']), 'ast': float(g_['AST']), 'stl': float(g_['STL']), 'blk': float(g_['BLK']), 'tov': float(g_['TOV']),
                'fg': None if np.isnan(g_['FG%']) else round(float(g_['FG%']), 3), 'tp': None if np.isnan(g_['3P%']) else round(float(g_['3P%']), 3), 'ft': None if np.isnan(g_['FT%']) else round(float(g_['FT%']), 3),
                'ts': None if np.isnan(a['TS%']) else round(float(a['TS%']), 3), 'usg': float(a['USG%']), 'per': float(a['PER']), 'bpm': float(a['BPM']), 'ws': float(a['WS']), 'vorp': float(a['VORP'])}
        rows.append({'id': B.slug(p['name']), 'name': p['name'], 'age': p['age'], 'pos': p['pc'], 'teamId': p['team'], 'hgt': hgt,
                     'ratings': {x: r[x] for x in ('ovr', 'sco', 'sht', 'ply', 'dur', 'stl', 'blk', 'ft', 'tpt', 'orb', 'drb', 'tov', 'fou')},
                     'imp': imp, 'prev': prev, '_mp': p['mp'], '_splits': p['splits']})

    # roster build: primary club, best 15 by minutes; the rest go to the free-agent pool
    name_of = {}
    by = {}
    for r in rows:
        by.setdefault(r['teamId'], []).append(r)
    final = []
    pool = []
    for t, lst in by.items():
        lst.sort(key=lambda r: -r['_mp'])
        nm = team_name(t)
        for i, r in enumerate(lst):
            r['teamId'] = ALIAS.get(B.slug(nm), B.slug(nm))
            name_of[r['teamId']] = nm
            (final if i < 15 else pool).append(r)
    seen = {}
    for r in final + pool:
        n = seen.get(r['id'], 0); seen[r['id']] = n + 1
        if n: r['id'] += '-' + str(n + 1)
    for r in final:
        r.pop('_mp'); r.pop('_splits')
    final.sort(key=lambda r: -r['ratings']['ovr'])
    pool_out = [{k: v for k, v in r.items() if k not in ('_mp', '_splits')} for r in pool if r['_mp'] >= 150]
    for r in pool_out:
        r['teamId'] = None
    # real league per-team-game averages for the sim to match, and real records
    st_fn = os.path.join(RAW, 'standings_bbref.csv')
    recs = {}
    if os.path.exists(st_fn):
        for _, r in pd.read_csv(st_fn).iterrows():
            nm = str(r['team']).strip()
            sid = B.slug(nm.replace('New Orleans/Oklahoma City', 'New Orleans').replace('Los Angeles Clippers', 'LA Clippers'))
            sid = ALIAS.get(sid, sid)
            recs[sid] = (int(r['W']), int(r['L']))
    tg = sum(w + l for w, l in recs.values()) or 30 * 82
    T = {c: float(np.nansum([r[c] for r in A['tot'].values()])) for c in ('PTS', 'FGA', 'FG', '3P', '3PA', 'FT', 'FTA', 'ORB', 'DRB', 'TRB', 'AST', 'TOV', 'STL', 'BLK', 'PF') if c in tot.columns}
    lg = {k.lower(): round(v / tg, 2) for k, v in T.items()}
    lg['games'] = tg // max(1, len(recs)) if recs else 82
    lg['poss'] = round(lg['fga'] + 0.44 * lg['fta'] - lg.get('orb', 10) + lg.get('tov', 14), 1)
    lg['teams'] = len(recs) or len(name_of)
    yr_txt = '%d-%02d' % (YR - 1, YR % 100)
    final.sort(key=lambda r: -r['ratings']['ovr'])
    pool_out = [{k: v for k, v in r.items() if k not in ('_mp', '_splits')} for r in pool if r['_mp'] >= 150]
    for r in pool_out:
        r['teamId'] = None
    outp = os.path.join(OUT, 'players-%s.json' % ERA)
    if os.path.exists(outp) and '--force' not in sys.argv:
        sys.exit('refusing to overwrite a fitted file: ' + outp + ' (use --force)')
    json.dump({'season': yr_txt, 'source': 'Basketball Reference %s: per game, totals, per 36, per 100, advanced, shooting, play-by-play. Ratings are percentiles of the measuring stat, shrunk by minutes.' % yr_txt,
               'lg': lg, 'players': final, 'pool': pool_out}, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    base = {t['id']: t for t in json.load(open(os.path.join(OUT, 'teams-2026.json')))['teams']}
    teams = []
    for tid, nm in sorted(name_of.items(), key=lambda x: x[1]):
        if tid in base:
            t = dict(base[tid])
        else:
            c1, c2, nid = COLORS.get(nm, ('#555555', '#FFFFFF', None))
            city, nick = nm.rsplit(' ', 1) if nm not in ('Portland Trail Blazers',) else ('Portland', 'Trail Blazers')
            if nm.endswith('SuperSonics'): city, nick = 'Seattle', 'SuperSonics'
            t = {'id': tid, 'city': city, 'name': nick, 'division': 'Eastern' if nm in EAST else 'Western', 'w': 0, 'l': 0, 'colors': [c1, c2], 'nbaId': nid}
        if nm in EAST: t['division'] = 'Eastern'
        elif nm in ('New Orleans Hornets', 'Seattle SuperSonics', 'Vancouver Grizzlies'): t['division'] = 'Western'
        if tid in recs: t['rw'], t['rl'] = recs[tid]
        teams.append(t)
    json.dump({'season': yr_txt, 'league': 'National Basketball Association', 'games': int(lg['games']), 'divisions': ['Eastern', 'Western'], 'source': 'NBA ' + yr_txt + '. Colours are approximations.', 'teams': teams}, open(os.path.join(OUT, 'teams-%s.json' % ERA), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    cnt = {}
    for r in final:
        cnt[r['teamId']] = cnt.get(r['teamId'], 0) + 1
    print(len(final), 'players on teams,', len(pool_out), 'pool; roster sizes', min(cnt.values()), max(cnt.values()), 'teams', len(cnt))
    print([(r['name'], r['ratings']['ovr']) for r in final[:15]])


main()
