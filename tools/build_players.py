"""Turn a Basketball Reference player-totals export (HTML saved as .xls)
into data/players-1946.json with simple derived ratings.

Usage: python3 -I tools/build_players.py <input.xls> <output.json>
"""
import json
import re
import sys

import pandas as pd

TEAM_IDS = {
    'WSC': 'washington-capitols',
    'PHW': 'philadelphia-warriors',
    'NYK': 'new-york-knicks',
    'PRO': 'providence-steamrollers',
    'BOS': 'boston-celtics',
    'TRH': 'toronto-huskies',
    'CHS': 'chicago-stags',
    'STB': 'st-louis-bombers',
    'CLR': 'cleveland-rebels',
    'DTF': 'detroit-falcons',
    'PIT': 'pittsburgh-ironmen',
}
COMBINED = {'2TM', '3TM', '4TM'}
LEAGUE_FG = 0.279
LEAGUE_FT = 0.641
SEASON_GAMES = 60


def slug(name):
    s = re.sub(r"[^a-z0-9 ]", '', name.lower().replace('.', '').replace("'", ''))
    return re.sub(r'\s+', '-', s.strip())


def num(v):
    return 0 if pd.isna(v) else float(v)


def percentile_table(values):
    ordered = sorted(values)
    n = len(ordered)

    def pct(v):
        below = sum(1 for x in ordered if x < v)
        equal = sum(1 for x in ordered if x == v)
        return (below + 0.5 * equal) / n

    return pct


def main(src, dst):
    table = pd.read_html(src, keep_default_na=False, na_values=[''])[0]
    table = table[table['Player'].notna() & (table['Player'] != 'League Average')]

    players = {}
    order = []
    for _, row in table.iterrows():
        name = row['Player']
        team = row['Team']
        entry = players.setdefault(name, {'combined': None, 'stints': [], 'age': None, 'pos': None})
        if pd.notna(row['Age']):
            entry['age'] = int(row['Age'])
        if pd.notna(row['Pos']):
            entry['pos'] = row['Pos']
        stat = {k: num(row[k]) for k in ('G', 'FG', 'FGA', 'FT', 'FTA', 'AST', 'PF', 'PTS')}
        if team in COMBINED:
            entry['combined'] = stat
        else:
            entry['stints'].append({'team': TEAM_IDS[team], **stat})
        if name not in order:
            order.append(name)

    rows = []
    for name in order:
        e = players[name]
        if e['combined'] is not None:
            tot = e['combined']
        else:
            tot = {k: sum(s[k] for s in e['stints']) for k in ('G', 'FG', 'FGA', 'FT', 'FTA', 'AST', 'PF', 'PTS')}
        g = tot['G']
        fg_adj = (tot['FG'] + LEAGUE_FG * 50) / (tot['FGA'] + 50)
        ft_adj = (tot['FT'] + LEAGUE_FT * 20) / (tot['FTA'] + 20)
        rows.append({
            'name': name,
            'e': e,
            'tot': tot,
            'ppg': tot['PTS'] / (g + 5),
            'apg': tot['AST'] / (g + 5),
            'fg': fg_adj,
            'ft': ft_adj,
            'dur': min(1.0, g / SEASON_GAMES),
        })

    ref = [r for r in rows if r['tot']['G'] >= 15] or rows
    p_ppg = percentile_table([r['ppg'] for r in ref])
    p_apg = percentile_table([r['apg'] for r in ref])
    p_fg = percentile_table([r['fg'] for r in ref])
    p_ft = percentile_table([r['ft'] for r in ref])

    top_ppg = max(r['ppg'] for r in rows)

    out = []
    seen = set()
    for r in rows:
        # Scoring blends rank among players with raw volume, so a runaway scorer stands out.
        sco = round(50 * p_ppg(r['ppg']) + 50 * (r['ppg'] / top_ppg))
        sht = round(100 * (0.6 * p_fg(r['fg']) + 0.4 * p_ft(r['ft'])))
        ply = round(100 * p_apg(r['apg']))
        dur = round(100 * r['dur'])
        weighted = 0.6 * sco + 0.15 * sht + 0.1 * ply + 0.15 * dur
        ovr = round(35 + 0.6 * weighted)
        pid = slug(r['name'])
        if pid in seen:
            pid += '-2'
        seen.add(pid)
        stints = r['e']['stints']
        t = r['tot']
        out.append({
            'id': pid,
            'name': r['name'],
            'age': r['e']['age'],
            'pos': r['e']['pos'],
            'teamId': stints[0]['team'],
            'g': int(t['G']),
            'pts': int(t['PTS']),
            'ast': int(t['AST']),
            'fg': int(t['FG']),
            'fga': int(t['FGA']),
            'ft': int(t['FT']),
            'fta': int(t['FTA']),
            'pf': int(t['PF']),
            'stints': [{'team': s['team'], 'g': int(s['G']), 'pts': int(s['PTS'])} for s in stints],
            'ratings': {'ovr': ovr, 'sco': sco, 'sht': sht, 'ply': ply, 'dur': dur},
        })

    out.sort(key=lambda p: -p['ratings']['ovr'])
    doc = {
        'season': '1946-47',
        'source': 'Basketball Reference player totals export. Ratings are derived from these stats.',
        'players': out,
    }
    with open(dst, 'w') as f:
        json.dump(doc, f, indent=1)
    print(len(out), 'players written')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
