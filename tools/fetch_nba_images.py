#!/usr/bin/env python3
"""Private-use image fetcher: NBA team logos + player headshots for the 2026-27 league.
Run on YOUR computer (the build sandbox cannot reach nba.com):
    python3 tools/fetch_nba_images.py
Writes assets/logos/<team-id>-2026.svg and assets/players/<player-id>.png, then commit and push.
Uses only the standard library. Safe to re-run; existing files are skipped."""
import json, os, re, sys, time, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.nba.com/', 'Origin': 'https://www.nba.com'}
# NBA franchise ids (same ids the NBA CDN uses for logos)
TEAM_IDS = {'atlanta-hawks':1610612737,'boston-celtics':1610612738,'brooklyn-nets':1610612751,'charlotte-hornets':1610612766,
 'chicago-bulls':1610612741,'cleveland-cavaliers':1610612739,'dallas-mavericks':1610612742,'denver-nuggets':1610612743,
 'detroit-pistons':1610612765,'golden-state-warriors':1610612744,'houston-rockets':1610612745,'indiana-pacers':1610612754,
 'la-clippers':1610612746,'los-angeles-lakers':1610612747,'memphis-grizzlies':1610612763,'miami-heat':1610612748,
 'milwaukee-bucks':1610612749,'minnesota-timberwolves':1610612750,'new-orleans-pelicans':1610612740,'new-york-knicks':1610612752,
 'oklahoma-city-thunder':1610612760,'orlando-magic':1610612753,'philadelphia-76ers':1610612755,'phoenix-suns':1610612756,
 'portland-trail-blazers':1610612757,'sacramento-kings':1610612758,'san-antonio-spurs':1610612759,'toronto-raptors':1610612761,
 'utah-jazz':1610612762,'washington-wizards':1610612764}

def get(url, binary=True):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        d = r.read()
    return d if binary else d.decode('utf-8', 'replace')

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z ]', '', re.sub(r'\b(jr|sr|ii|iii|iv)\b\.?', '', s)).strip()

def player_index():
    """name -> NBA person id, from the official players list."""
    for url in ('https://stats.nba.com/stats/commonallplayers?IsOnlyCurrentSeason=1&LeagueID=00&Season=2026-27',
                'https://stats.nba.com/stats/playerindex?LeagueID=00&Season=2026-27'):
        try:
            j = json.loads(get(url, False))
            rs = j['resultSets'][0]; h = rs['headers']; rows = rs['rowSet']
            if 'PERSON_ID' in h:
                i, n = h.index('PERSON_ID'), h.index('DISPLAY_FIRST_LAST')
                return {norm(r[n]): r[i] for r in rows}
            i = h.index('PERSON_ID'); f = h.index('PLAYER_FIRST_NAME'); l = h.index('PLAYER_LAST_NAME')
            return {norm(r[f] + ' ' + r[l]): r[i] for r in rows}
        except Exception as e:
            print('index failed:', url.split('?')[0], e)
    try:  # fallback: the players page embeds the full list
        html = get('https://www.nba.com/players', False)
        m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
        rows = json.loads(m.group(1))['props']['pageProps']['players']
        return {norm(r['PLAYER_FIRST_NAME'] + ' ' + r['PLAYER_LAST_NAME']): r['PERSON_ID'] for r in rows}
    except Exception as e:
        print('players page failed:', e)
    sys.exit('Could not load the NBA player list. Open https://www.nba.com/players once in your browser, then retry.')

def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(data)

def main():
    teams = json.load(open(os.path.join(ROOT, 'data/teams-2026.json')))['teams']
    pl = json.load(open(os.path.join(ROOT, 'data/players-2026.json')))
    pl = pl.get('players', pl)
    ok = miss = 0
    for t in teams:
        out = os.path.join(ROOT, 'assets/logos', t['id'] + '-2026.svg')
        if os.path.exists(out): continue
        try:
            save(out, get('https://cdn.nba.com/logos/nba/%d/primary/L/logo.svg' % TEAM_IDS[t['id']])); ok += 1
        except Exception as e:
            print('logo missing', t['id'], e); miss += 1
        time.sleep(0.2)
    idx = player_index()
    for p in pl:
        out = os.path.join(ROOT, 'assets/players', p['id'] + '.png')
        if os.path.exists(out): continue
        pid = idx.get(norm(p['name']))
        if not pid:
            print('no id for', p['name']); miss += 1; continue
        try:
            save(out, get('https://cdn.nba.com/headshots/nba/latest/1040x760/%d.png' % pid)); ok += 1
        except Exception as e:
            print('no photo', p['name'], e); miss += 1
        time.sleep(0.15)
    print('saved %d, missing %d' % (ok, miss))

main()
