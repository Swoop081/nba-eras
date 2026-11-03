"""Real dates for 2015-2019 schedules from bbref NBA_<Y+1>_games month pages (scraped rows 'date|visitor|home|pts|pts').
Usage: apply_schedule_dates.py rows.json"""
import json, sys, datetime as dt, re
T = json.load(open('tools/../data/schedule-2025.json'))  # only for team slug set check
ABB = {'ATL':'atlanta-hawks','BOS':'boston-celtics','BRK':'brooklyn-nets','CHO':'charlotte-hornets','CHI':'chicago-bulls','CLE':'cleveland-cavaliers','DAL':'dallas-mavericks','DEN':'denver-nuggets','DET':'detroit-pistons','GSW':'golden-state-warriors','HOU':'houston-rockets','IND':'indiana-pacers','LAC':'la-clippers','LAL':'los-angeles-lakers','MEM':'memphis-grizzlies','MIA':'miami-heat','MIL':'milwaukee-bucks','MIN':'minnesota-timberwolves','NOP':'new-orleans-pelicans','NYK':'new-york-knicks','OKC':'oklahoma-city-thunder','ORL':'orlando-magic','PHI':'philadelphia-76ers','PHO':'phoenix-suns','POR':'portland-trail-blazers','SAC':'sacramento-kings','SAS':'san-antonio-spurs','TOR':'toronto-raptors','UTA':'utah-jazz','WAS':'washington-wizards','CHA':'charlotte-hornets','NOH':'new-orleans-pelicans','NOK':'new-orleans-pelicans'}
rows = json.load(open(sys.argv[1]))
for k in rows: rows[k] = list(dict.fromkeys(rows[k]))   # October (index) page was fetched twice
for Y in range(2015, 2020):
    f = 'data/schedule-%d.json' % Y; s = json.load(open(f)); old = s['games']
    reg = []
    for r in rows[str(Y + 1)]:
        if r.startswith('__'):
            if 'layoff' in r: break
            continue
        d, a, h, *_ = r.split('|')
        if not a or not h: continue
        dd = dt.datetime.strptime(d, '%a, %b %d, %Y').date()
        if Y == 2019 and dd > dt.date(2020, 8, 14): continue   # postseason, no separator row in this season's pages
        reg.append((dt.datetime.strptime(d, '%a, %b %d, %Y').date().isoformat(), ABB[h], ABB[a]))
    reg.sort()
    print(Y, 'bbref', len(reg), 'old', len(old))
    if len(reg) != len(old) and Y != 2019: continue
    # keep old ids in order: same multiset of (home, away) pairs?
    from collections import Counter
    co = Counter((g['h'], g['a']) for g in old); cr = Counter((h, a) for _, h, a in reg)
    print('  pair multiset equal:', co == cr)
    s['games'] = [{'d': d, 'h': h, 'a': a, 'id': 'r%d%04d' % (Y, i + 1), 'lab': '', 'sub': '', 'arena': '', 'city': ''} for i, (d, h, a) in enumerate(reg)]
    s['source'] = 'Basketball-Reference schedule pages (real dates and matchups)'; s.pop('datesApprox', None)
    json.dump(s, open(f, 'w'), ensure_ascii=False, separators=(',', ':'))
