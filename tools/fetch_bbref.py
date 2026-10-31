"""Download every Basketball Reference league table we can for a season into tools/data-<season>/bbref_<table>.csv.
Runs in GitHub Actions (the cloud sandbox cannot reach the site). Usage: python3 tools/fetch_bbref.py 2026 2025"""
import io, os, sys, time, urllib.request, re

TABLES = ['per_game', 'totals', 'per_minute', 'per_poss', 'advanced', 'shooting', 'play-by-play']
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
HERE = os.path.dirname(os.path.abspath(__file__))


def get(url):
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9'})
            return urllib.request.urlopen(req, timeout=40).read().decode('utf-8', 'replace')
        except Exception as e:
            print('  retry', i, url, e, flush=True)
            time.sleep(8 * (i + 1))
    return None


def main():
    import pandas as pd
    for yr in sys.argv[1:]:
        out = os.path.join(HERE, 'data-%d' % (int(yr) - 1))   # BR season 2026 = 2025-26
        os.makedirs(out, exist_ok=True)
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
