#!/usr/bin/env python3
"""Fetch the real 2026-27 NBA schedule (incl. NBA Cup labels) and write data/schedule-2026.json.
Primary: cdn.nba.com league schedule. Fallback: ESPN scoreboard, day by day."""
import json, sys, datetime, urllib.request
TRI = {'ATL':'atlanta-hawks','BOS':'boston-celtics','BKN':'brooklyn-nets','CHA':'charlotte-hornets','CHI':'chicago-bulls','CLE':'cleveland-cavaliers','DAL':'dallas-mavericks','DEN':'denver-nuggets','DET':'detroit-pistons','GSW':'golden-state-warriors','GS':'golden-state-warriors','HOU':'houston-rockets','IND':'indiana-pacers','LAC':'la-clippers','LAL':'los-angeles-lakers','MEM':'memphis-grizzlies','MIA':'miami-heat','MIL':'milwaukee-bucks','MIN':'minnesota-timberwolves','NOP':'new-orleans-pelicans','NO':'new-orleans-pelicans','NYK':'new-york-knicks','NY':'new-york-knicks','OKC':'oklahoma-city-thunder','ORL':'orlando-magic','PHI':'philadelphia-76ers','PHX':'phoenix-suns','POR':'portland-trail-blazers','SAC':'sacramento-kings','SAS':'san-antonio-spurs','SA':'san-antonio-spurs','TOR':'toronto-raptors','UTA':'utah-jazz','UTAH':'utah-jazz','WAS':'washington-wizards','WSH':'washington-wizards'}
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Referer': 'https://www.nba.com/', 'Accept': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=60))
games, labels, how = [], {}, ''
try:
    j = get('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json')
    for gd in j['leagueSchedule']['gameDates']:
        for g in gd['games']:
            gid = g.get('gameId', '')
            if not gid.startswith(('002', '006')): continue
            h, a = g['homeTeam']['teamTricode'], g['awayTeam']['teamTricode']
            if h not in TRI or a not in TRI: continue
            lab = (g.get('gameLabel') or '') + '|' + (g.get('gameSubLabel') or '') + '|' + (g.get('seriesText') or '')
            labels[lab] = labels.get(lab, 0) + 1
            games.append({'d': g['gameDateEst'][:10], 'h': TRI[h], 'a': TRI[a], 'id': gid, 'lab': g.get('gameLabel') or '', 'sub': g.get('gameSubLabel') or '', 'arena': g.get('arenaName') or '', 'city': g.get('arenaCity') or ''})
    how = 'nba-cdn'
except Exception as e:
    print('cdn failed', repr(e))
if len(games) < 1000:
    games = []; how = 'espn'
    d = datetime.date(2026, 10, 20)
    while d <= datetime.date(2027, 4, 12):
        try:
            j = get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=%s&limit=50' % d.strftime('%Y%m%d'))
            for ev in j.get('events', []):
                c = ev['competitions'][0]['competitors']
                h = [x for x in c if x['homeAway'] == 'home'][0]['team']['abbreviation']
                a = [x for x in c if x['homeAway'] == 'away'][0]['team']['abbreviation']
                if h in TRI and a in TRI:
                    note = (ev['competitions'][0].get('notes') or [{}])[0].get('headline', '')
                    games.append({'d': d.isoformat(), 'h': TRI[h], 'a': TRI[a], 'id': ev.get('id'), 'lab': note, 'sub': '', 'arena': (ev['competitions'][0].get('venue') or {}).get('fullName', ''), 'city': ''})
        except Exception as e:
            print('espn', d, repr(e))
        d += datetime.timedelta(days=1)
games.sort(key=lambda g: (g['d'], g['id'] or ''))
json.dump({'source': how, 'n': len(games), 'games': games}, open('data/schedule-2026.json', 'w'), separators=(',', ':'))
print(how, len(games), 'games')
print(json.dumps(labels, indent=1)[:3000])
per = {}
for g in games:
    for t in (g['h'], g['a']): per[t] = per.get(t, 0) + 1
print(sorted(per.items(), key=lambda x: x[1])[:3], sorted(per.items(), key=lambda x: x[1])[-3:])
