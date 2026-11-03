"""Real draft classes from Basketball Reference draft pages (rows 'round|pick|team|player|college').
A prospect is matched by name to that season's per-game table (tools/data-<year>) for id, position and age; unmatched players
(never played in the NBA) get a generated id, position F and the usual age for their route.
Usage: python3 -I tools/build_drafts.py draft_raw.json"""
import json, sys, unicodedata, re, os
def norm(n): return re.sub(r'[^a-z]','',unicodedata.normalize('NFD',n).encode('ascii','ignore').decode().lower().replace('jr.','').replace('sr.','').replace(' iii','').replace(' ii',''))
def slug(n): return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFD',n).encode('ascii','ignore').decode().lower())).strip('-')
def mapos(p):
    p=p.upper().replace('/','-'); a=p.split('-')
    g={'PG':'G','SG':'G','G':'G','SF':'F','PF':'F','F':'F','C':'C'}
    k=[g.get(x,'F') for x in a]
    if len(set(k))==1: return k[0]
    s=''.join(sorted(set(k)))
    return {'FG':'G-F','CF':'F-C','CG':'F-C'}.get(s,'F-C')
raw=json.load(open(sys.argv[1])); out=0
import pandas as pd
LATER={}
for yy in range(1950,2026):
    f=f'tools/data-{yy}/bbref_per_game.csv'
    if os.path.exists(f):
        m={}
        for r in pd.read_csv(f).itertuples():
            if isinstance(r.Player,str) and norm(r.Player) not in m: m[norm(r.Player)]={'id':slug(r.Player),'pos':mapos(str(r.Pos)),'age':int(r.Age) if r.Age==r.Age else 21,'name':r.Player}
        LATER[yy]=m
for y,rows in sorted(raw.items(),key=lambda x:int(x[0])):
    D=int(y); P=LATER.get(D,{})
    tf=f'data/teams-{D}.json'; NT=len(json.load(open(tf))['teams']) if os.path.exists(tf) else 30
    pros=[]; used=set(); hit=0
    for r in rows:
        _,pk,tm,name,col=(r.split('|')+['']*5)[:5]
        if not pk.isdigit(): continue
        rnd=-(-int(pk)//NT)
        p=P.get(norm(name))
        if not p:   # a stash pick or late debut: first season he appears within eight years, age taken back to draft night
            for k in range(1,9):
                q=LATER.get(D+k,{}).get(norm(name))
                if q: p=dict(q,age=max(18,q['age']-k)); break
        hit+=1 if p else 0
        pid=p['id'] if p else slug(name)
        if pid in used: pid+='-'+pk
        used.add(pid)
        pros.append({'id':pid,'name':name,'pos':(p['pos'] if p else 'F'),'college':col,'age':(p['age'] if p else (21 if col else 22)),'realPick':int(pk),'round':rnd,'team':tm,**({} if p else {'unk':1})})
    pros.sort(key=lambda x:x['realPick'])
    json.dump({'year':D,'note':'Basketball Reference draft results','prospects':pros},open(f'data/draft-{D}.json','w'),ensure_ascii=False,separators=(',',':'))
    out+=1; print(D,len(pros),'matched',hit)
print(out,'drafts')
