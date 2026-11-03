"""Top basketball-operations executive of every franchise by season, from Basketball Reference executives pages
(rows 'name|start|end|note'). Each entry is keyed by the first season whose opening night falls on or after the hire date.
Usage: python3 -I tools/build_gms_hist.py exec_raw.json"""
import json, sys
raw=json.load(open(sys.argv[1]))
KEY={'ATL':'atlanta-hawks','BOS':'boston-celtics','NJN':'brooklyn-nets','CHA':'charlotte-hornets','CHI':'chicago-bulls','CLE':'cleveland-cavaliers','DAL':'dallas-mavericks','DEN':'denver-nuggets','DET':'detroit-pistons','GSW':'golden-state-warriors','HOU':'houston-rockets','IND':'indiana-pacers','LAC':'la-clippers','LAL':'los-angeles-lakers','MEM':'memphis-grizzlies','MIA':'miami-heat','MIL':'milwaukee-bucks','MIN':'minnesota-timberwolves','NOH':'new-orleans-pelicans','NYK':'new-york-knicks','OKC':'oklahoma-city-thunder','ORL':'orlando-magic','PHI':'philadelphia-76ers','PHO':'phoenix-suns','POR':'portland-trail-blazers','SAC':'sacramento-kings','SAS':'san-antonio-spurs','TOR':'toronto-raptors','UTA':'utah-jazz','WAS':'washington-wizards'}
out={}
for code,slug in KEY.items():
    rows=[]
    for r in raw.get(code,[]):
        p=r.split('|')
        if len(p)<2 or p[0]=='Executive' or not p[1][:4].isdigit(): continue
        s=p[1]; y=int(s[:4]); m=int(s[5:7]) if len(s)>=7 else 6
        y=y+1 if m>=10 else y
        rows.append([y,p[0]])
    # one entry per season: later hire in the same season wins
    d={}
    for y,n in rows: d[y]=n
    out[slug]=sorted([y,n] for y,n in d.items())
json.dump(out,open('data/gms-history.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(out),'franchises'); print(out['chicago-bulls'][-6:], out['boston-celtics'][:3])
