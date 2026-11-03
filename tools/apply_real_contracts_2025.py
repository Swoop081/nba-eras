"""Overwrite derived 2025-26 contracts with the real table (gabriel1200/site_Data salary.csv + option.csv, Spotrac-sourced).
Usage: python3 -I tools/apply_real_contracts_2025.py salary.csv option.csv"""
import json, sys, unicodedata, re
import pandas as pd
def norm(n): return re.sub(r'[^a-z]','',unicodedata.normalize('NFD',n).encode('ascii','ignore').decode().lower().replace('jr.','').replace('sr.','').replace(' iii','').replace(' ii',''))
s=pd.read_csv(sys.argv[1]); o=pd.read_csv(sys.argv[2])
cols=['2025-26','2026-27','2027-28','2028-29','2029-30','2030-31']
opt={}
for _,r in o.iterrows(): opt[(norm(r['Player']),r['Team'])]=r
R={}
for _,r in s.iterrows():
    amts=[float(r[c] or 0) for c in cols]
    if amts[0]<=0: continue
    y=0
    for a in amts:
        if a>0: y+=1
        else: break
    orow=opt.get((norm(r['Player']),r['Team']))
    ot='none'
    if orow is not None:
        m=str(orow[cols[y-1]]).strip()   # marker sits on the final paid year
        ot={'P':'player','T':'team'}.get(m,'none')
    R[norm(r['Player'])]={'s':round(amts[0]/1000),'y':y,'o':ot}
f='data/players-2025-open.json'; d=json.load(open(f)); hit=0; miss=[]
for p in d['players']:
    k=R.get(norm(p['name']))
    if k: p['contract']=k; hit+=1
    elif p.get('teamId'): miss.append((p['name'],p['teamId'],p['age']))
json.dump(d,open(f,'w'),ensure_ascii=False,separators=(',',':'))
print('real',hit,'of',len(d['players']),'unmatched on teams',len(miss)); print(miss[:60])
