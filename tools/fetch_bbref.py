"""Download every Basketball Reference league table we can for a season into tools/data-<season>/bbref_<table>.csv.
Runs in GitHub Actions (the cloud sandbox cannot reach the site). Usage: python3 tools/fetch_bbref.py 2026 2025"""
import io, os, sys, time, urllib.request, urllib.error, re

TABLES = ['per_game', 'totals', 'per_minute', 'per_poss', 'advanced', 'shooting', 'play-by-play']
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
HERE = os.path.dirname(os.path.abspath(__file__))


def get(url):
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9'})
            return urllib.request.urlopen(req, timeout=40).read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print('  404', url, flush=True)
                return None
            print('  retry', i, url, e, flush=True)
            time.sleep(8 * (i + 1))
        except Exception as e:
            print('  retry', i, url, e, flush=True)
            time.sleep(8 * (i + 1))
    return None


def main():
    import pandas as pd
    for yr in sys.argv[1:]:
        out = os.path.join(HERE, 'data-%d' % (int(yr) - 1))   # BR season 2026 = 2025-26
        os.makedirs(out, exist_ok=True)
        # standings: every table on the season page that has team, W and L
        html = get('https://www.basketball-reference.com/leagues/NBA_%s.html' % yr)
        time.sleep(5)
        if html:
            try:
                html = html.replace('<!--', '').replace('-->', '')
                rows = []
                for t in pd.read_html(io.StringIO(html)):
                    cols = [str(c) for c in t.columns]
                    if 'W' in cols and 'L' in cols and len(cols) < 12 and len(t) >= 3:
                        name = [c for c in cols if c not in ('W', 'L')][0]
                        for _, r in t.iterrows():
                            n = str(r[name]).replace('*', '').strip()
                            if n and n != 'nan' and not n.endswith('Division') and str(r['W']).isdigit():
                                rows.append((n, int(r['W']), int(r['L'])))
                if rows:
                    pd.DataFrame(rows, columns=['team', 'W', 'L']).drop_duplicates('team').to_csv(os.path.join(out, 'standings_bbref.csv'), index=False)
                    print('OK standings', yr, len(rows), flush=True)
            except Exception as e:
                print('standings fail', yr, e, flush=True)
        for t in TABLES:
            url = 'https://www.basketball-reference.com/leagues/NBA_%s_%s.html' % (yr, t)
            html = get(url)
            time.sleep(5)
            if not html:
                print('FAILED', url, flush=True)
                continue
            html = html.replace('<!--', '').replace('-->', '')   # BR hides some tables in comments
            try:
                tabs = pd.read_html(io.StringIO(html))
            except Exception as e:
                print('parse fail', url, e, flush=True)
                continue
            tabs = [x for x in tabs if len(x) > 100]
            if not tabs:
                print('no big table', url, flush=True)
                continue
            df = tabs[0]
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [(b if not str(b).startswith('Unnamed') else a) if str(a).startswith('Unnamed') else str(a) + '_' + str(b) for a, b in df.columns]
            df = df[df.iloc[:, 1].astype(str) != df.columns[1]]       # drop repeated header rows
            df.to_csv(os.path.join(out, 'bbref_%s.csv' % t.replace('-', '_')), index=False)
            print('OK', url, len(df), 'rows', flush=True)


main()
