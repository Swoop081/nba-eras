"""Attach real salaries (nba_salaries_master.csv: player, salary, team, year=season end) to data/players-<Y>.json as contract {s,y,o}.
Years left = consecutive later seasons the player is paid by the same club (a floor: re-signs and extensions are not visible).
Usage: python3 -I tools/apply_salaries.py <startYear> nba_salaries_master.csv"""
import json, sys, unicodedata, re
import pandas as pd
def norm(n): return re.sub(r'[^a-z]','',unicodedata.normalize('NFD',str(n)).encode('ascii','ignore').decode().lower().replace('jr.','').replace('sr.','').replace(' iii','').replace(' ii',''))
Y=int(sys.argv[1]); m=pd.read_csv(sys.argv[2]); m['k']=m.player.map(norm)
by={(r.k,int(r.year)):(r.salary,r.team) for r in m.itertuples()}
f=f'data/players-{Y}.json'; d=json.load(open(f)); hit=0; miss=[]
for p in d['players']:
    k=norm(p['name']); v=by.get((k,Y+1))
    if not v: miss.append(p['name']); continue
    y=1
    while by.get((k,Y+1+y)) and by[(k,Y+1+y)][1]==v[1]: y+=1
    p['contract']={'s':round(v[0]/1000),'y':y,'o':'none'}; hit+=1
json.dump(d,open(f,'w'),ensure_ascii=False,separators=(',',':'))
print(Y,'real salaries',hit,'of',len(d['players']),'missing',len(miss),miss[:15])
