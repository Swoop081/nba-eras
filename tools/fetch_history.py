#!/usr/bin/env python3
"""Pull each franchise's championship years and retired numbers (with the year each was retired) from Wikipedia.
Writes data/franchise-history.json keyed by the modern club id."""
import json, re, sys, time, urllib.request, urllib.parse, html
from bs4 import BeautifulSoup
PAGES = {'atlanta-hawks':'Atlanta_Hawks','boston-celtics':'Boston_Celtics','brooklyn-nets':'Brooklyn_Nets','charlotte-hornets':'Charlotte_Hornets','chicago-bulls':'Chicago_Bulls','cleveland-cavaliers':'Cleveland_Cavaliers','dallas-mavericks':'Dallas_Mavericks','denver-nuggets':'Denver_Nuggets','detroit-pistons':'Detroit_Pistons','golden-state-warriors':'Golden_State_Warriors','houston-rockets':'Houston_Rockets','indiana-pacers':'Indiana_Pacers','la-clippers':'Los_Angeles_Clippers','los-angeles-lakers':'Los_Angeles_Lakers','memphis-grizzlies':'Memphis_Grizzlies','miami-heat':'Miami_Heat','milwaukee-bucks':'Milwaukee_Bucks','minnesota-timberwolves':'Minnesota_Timberwolves','new-orleans-pelicans':'New_Orleans_Pelicans','new-york-knicks':'New_York_Knicks','oklahoma-city-thunder':'Oklahoma_City_Thunder','orlando-magic':'Orlando_Magic','philadelphia-76ers':'Philadelphia_76ers','phoenix-suns':'Phoenix_Suns','portland-trail-blazers':'Portland_Trail_Blazers','sacramento-kings':'Sacramento_Kings','san-antonio-spurs':'San_Antonio_Spurs','toronto-raptors':'Toronto_Raptors','utah-jazz':'Utah_Jazz','washington-wizards':'Washington_Wizards'}
def api(**p):
    p['format'] = 'json'
    url = 'https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode(p)
    req = urllib.request.Request(url, headers={'User-Agent': 'nba-eras-private-game/1.0 (hobby project; contact via github Swoop081)'})
    for k in range(8):
        try:
            time.sleep(1.5)
            return json.load(urllib.request.urlopen(req, timeout=60))
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == 7: raise
            time.sleep(10 * (k + 1))
def clean(t): return re.sub(r'\[[^\]]*\]|\s+', ' ', html.unescape(t)).strip()
out, log = {}, []
for tid, page in PAGES.items():
    rec = {'champs': [], 'retired': []}
    try:
        secs = api(action='parse', page=page, prop='sections')['parse']['sections']
        idx = [s['index'] for s in secs if re.search(r'retired (numbers|jerseys)|retired number', s['line'], re.I)]
        full = api(action='parse', page=page, prop='text', redirects=1)['parse']['text']['*']
        soup = BeautifulSoup(full, 'html.parser')
        info = soup.find('table', class_=re.compile('infobox'))
        if info:
            for tr in info.find_all('tr'):
                th = tr.find('th')
                if th and re.search(r'championships', th.get_text(), re.I) and 'conference' not in th.get_text().lower() and 'division' not in th.get_text().lower():
                    td = tr.find('td'); txt = clean(td.get_text(' ')) if td else ''
                    yrs = [int(y) for y in re.findall(r'\b(19[4-9]\d|20[0-3]\d)\b', txt)]
                    if yrs and not rec['champs']: rec['champs'] = sorted(set(yrs)); rec['champs_raw'] = txt[:200]
        # retired numbers: the table right after the heading
        heads = [h for h in soup.find_all(['h2', 'h3', 'h4']) if re.search(r'retired (numbers|jerseys)', h.get_text(), re.I)]
        tbl = None
        for h in heads:
            node = h.parent if h.parent.name == 'div' and 'mw-heading' in ' '.join(h.parent.get('class', [])) else h
            for sib in node.find_all_next(['table', 'h2'], limit=6):
                if sib.name == 'h2' and sib is not h: break
                if sib.name == 'table' and 'wikitable' in ' '.join(sib.get('class', [])): tbl = sib; break
            if tbl: break
        if tbl:
            rows = tbl.find_all('tr'); hdr = [clean(c.get_text()).lower() for c in rows[0].find_all(['th', 'td'])]
            def col(pat):
                for i, h in enumerate(hdr):
                    if re.search(pat, h): return i
                return None
            ci_no, ci_pl, ci_dt = col(r'^no|number|#'), col(r'player|name|inductee'), col(r'retired|date|year')
            for tr in rows[1:]:
                cells = [clean(c.get_text(' ')) for c in tr.find_all(['th', 'td'])]
                if len(cells) < 2: continue
                no = cells[ci_no] if ci_no is not None and ci_no < len(cells) else cells[0]
                nm = cells[ci_pl] if ci_pl is not None and ci_pl < len(cells) else cells[1]
                dt = cells[ci_dt] if ci_dt is not None and ci_dt < len(cells) else ' '.join(cells[2:])
                ym = re.findall(r'\b(19[4-9]\d|20[0-3]\d)\b', dt)
                rec['retired'].append({'n': no, 'p': nm, 'y': int(ym[-1]) if ym else None, 'raw': dt[:60]})
        log.append('%s champs=%s retired=%d' % (tid, rec['champs'][-4:], len(rec['retired'])))
    except Exception as e:
        log.append('%s FAILED %r' % (tid, e))
    out[tid] = rec
json.dump(out, open('data/franchise-history.json', 'w'), indent=1)
print('\n'.join(log))
