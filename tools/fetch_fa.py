#!/usr/bin/env python3
"""Scrape the nba.com 2026 free agent tracker (all pages) and keep every player with no 2026-27 team.
Writes data/free-agents-2026.json, then tools/build_fa.py turns them into free-agent players."""
import json, re, sys
from playwright.sync_api import sync_playwright
URL = 'https://www.nba.com/players/free-agent-tracker/2026'
rows_out, seen = [], set()
def num(x):
    try: return float(x)
    except Exception: return 0.0
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', viewport={'width': 1400, 'height': 1800})
    pg.goto(URL, wait_until='networkidle', timeout=90000)
    pg.wait_for_selector('table', timeout=60000)
    # try to show every row at once
    for sel in pg.query_selector_all('select'):
        try:
            opts = [o.get_attribute('value') or o.inner_text() for o in sel.query_selector_all('option')]
            print('select options', opts)
            for v in opts:
                if v and v.lower() in ('-1', 'all'): sel.select_option(v); pg.wait_for_timeout(1500); break
        except Exception as e: print('select', e)
    def grab():
        heads = [h.inner_text().strip().lower() for h in pg.query_selector_all('table thead th')]
        n = 0
        for tr in pg.query_selector_all('table tbody tr'):
            tds = [t.inner_text().strip() for t in tr.query_selector_all('td')]
            if len(tds) < 5: continue
            row = dict(zip(heads, tds))
            name = row.get('player') or row.get('name') or tds[0]
            key = name
            if key in seen: continue
            seen.add(key); rows_out.append(row); n += 1
        return n, heads
    for page in range(12):
        n, heads = grab()
        print('page', page, 'new rows', n, 'heads', heads)
        nxt = None
        for sel in ['button[aria-label*="Next" i]', 'button:has-text("Next")', 'a[aria-label*="Next" i]', '[class*="Pagination"] button:last-child']:
            el = pg.query_selector(sel)
            if el and el.is_enabled(): nxt = el; break
        if not nxt or n == 0: break
        nxt.click(); pg.wait_for_timeout(1200)
    pg.screenshot(path='tools/fa-screen.png')
    b.close()
out = []
for r in rows_out:
    keys = list(r.keys())
    name = r.get('player') or r.get('name') or list(r.values())[0]
    team26 = next((r[k] for k in keys if '2026-27' in k or '26-27' in k), '')
    if team26.strip(): continue
    pos = r.get('pos') or r.get('position') or 'G'
    age = int(num(r.get('age', 27)) or 27)
    last = next((r[k] for k in keys if '2025-26' in k or '25-26' in k), '')
    ppg, rpg, apg = num(r.get('ppg')), num(r.get('rpg')), num(r.get('apg'))
    out.append([name, pos, age, last, ppg, rpg, apg])
print('unsigned', len(out), 'of', len(rows_out))
if len(out) >= 5:
    json.dump({'source': 'nba.com free agent tracker 2026 (unsigned)', 'players': out}, open('data/free-agents-2026.json', 'w'), ensure_ascii=False, separators=(',', ':'))
else:
    print('too few rows parsed; keeping the existing file'); sys.exit(0)
