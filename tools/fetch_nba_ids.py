"""Collect NBA.com person ids for every player who has ever played, so headshots load from the NBA CDN
(https://cdn.nba.com/headshots/nba/latest/1040x760/<id>.png). Runs in GitHub Actions. Writes data/nba-ids.json {slug: id}.
Tries stats.nba.com first, then Wikidata (property 'NBA.com player ID')."""
import json, os, re, sys, unicodedata, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'nba-ids.json')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'


def slug(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r"[.'’]", '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def get(url, headers=None, timeout=60):
    req = urllib.request.Request(url, headers=dict({'User-Agent': UA}, **(headers or {})))
    return urllib.request.urlopen(req, timeout=timeout).read().decode('utf-8', 'replace')


ids = {}
try:
    d = json.loads(get('https://stats.nba.com/stats/commonallplayers?IsOnlyCurrentSeason=0&LeagueID=00&Season=2025-26',
                       {'Referer': 'https://www.nba.com/', 'Origin': 'https://www.nba.com', 'Accept': 'application/json'}, 25))
    rs = d['resultSets'][0]
    h = rs['headers']
    for row in rs['rowSet']:
        r = dict(zip(h, row))
        ids.setdefault(slug(r['DISPLAY_FIRST_LAST']), r['PERSON_ID'])
    print('stats.nba.com ok', len(ids))
except Exception as e:
    print('stats.nba.com failed', repr(e)[:200])

if len(ids) < 1000:
    try:
        j = json.loads(get('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' + urllib.parse.quote('NBA.com player ID') + '&type=property&language=en&format=json'))
        pid = [x['id'] for x in j['search'] if 'NBA.com player' in x.get('label', '')][0]
        print('property', pid)
        q = 'SELECT ?l ?v WHERE { ?p wdt:%s ?v . ?p rdfs:label ?l FILTER(LANG(?l)="en") }' % pid
        r = get('https://query.wikidata.org/sparql?format=json&query=' + urllib.parse.quote(q), {'Accept': 'application/sparql-results+json'}, 120)
        for b in json.loads(r)['results']['bindings']:
            v = b['v']['value']
            if v.isdigit():
                ids.setdefault(slug(b['l']['value']), int(v))
        print('wikidata ok', len(ids))
    except Exception as e:
        print('wikidata failed', repr(e)[:300])

if ids:
    json.dump(ids, open(OUT, 'w'), separators=(',', ':'))
print('written', len(ids))
