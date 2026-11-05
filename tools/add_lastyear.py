# Adds lw/ll (last season's real record) to each teams-YYYY.json from the prior year's real rw/rl.
import json,os,glob
for f in sorted(glob.glob('data/teams-[0-9][0-9][0-9][0-9].json')):
    y=int(f[-9:-5]); pf='data/teams-%d.json'%(y-1)
    if not os.path.exists(pf): continue
    d=json.load(open(f)); prev={t['id']:t for t in json.load(open(pf))['teams']}
    n=0
    for t in d['teams']:
        p=prev.get(t['id'])
        if p and p.get('rw') is not None and not (t.get('w') or t.get('l')): t['lw'],t['ll']=p['rw'],p['rl']; n+=1
    json.dump(d,open(f,'w'),separators=(',',':'),ensure_ascii=False)
    print(y,n,'of',len(d['teams']))
