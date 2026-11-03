"""Builds the rich 2025-26 opening-night league (data/players-2025-open.json) and the 2026 draft class
(data/draft-2026.json) from the 2026-27 data, dialed back one year.
Rosters: data/players-2025.json (opening-night teams, 2025-26 stats); everyone else keeps his 2026 club as a proxy."""
import json, re, unicodedata, datetime
def norm(n): return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',n).encode('ascii','ignore').decode().lower())
A=json.load(open('data/players-2025.json')); B=json.load(open('data/players-2026.json'))
P24={p['id']:p for p in json.load(open('data/players-2024.json'))['players']}
bios=json.load(open('data/bios-2026.json')); BN={norm(k):v for k,v in bios.items()}
Ap={p['id']:p for p in A['players']}
SK=['sco','sht','ft','tpt','ply','tov','orb','drb','stl','blk','fou','dur']
W={'sco':.39,'sht':.10,'ft':.04,'ply':.08,'tov':.04,'orb':.05,'drb':.07,'stl':.07,'blk':.05,'fou':.03,'dur':.08}
def ovr_of(r): return round(35+0.6*sum(W[k]*r[k] for k in W))
def ageDelta(a):
    if a<=20: return 4.5
    return {21:3.5,22:2.5,23:1.5,24:1,25:.5,26:0,27:0,28:0,29:-.5,30:-1,31:-1.5,32:-2,33:-2.5}.get(a,-3.5)
def potGap(a): return 14 if a<=19 else {20:12,21:10,22:8,23:6,24:4,25:3,26:1.5}.get(a,0)
def dial(r,age26):
    gap=potGap(age26-1)*(1-max(0,r['ovr']-50)/100)
    d=ageDelta(age26)+(0.2*(gap+1) if age26<=25 else 0)
    dr=d/0.6; q=dict(r)
    for k in SK:
        if k in q: q[k]=max(12,min(99,round(q[k]-dr)))
    q['ovr']=ovr_of(q)
    return q
def is_rookie26(p):
    b=BN.get(norm(p['name']),{})
    return b.get('dy')==2026 or b.get('e')==0
# ---- 2026 draft class
rook=[p for p in B['players'] if BN.get(norm(p['name']),{}).get('dy')==2026]
rook.sort(key=lambda p:BN[norm(p['name'])]['dp'])
pros=[]
for p in rook:
    b=BN[norm(p['name'])]; dob=datetime.date.fromisoformat(b['b']) if b.get('b') else None
    age=(datetime.date(2026,6,25)-dob).days//365 if dob else p['age']-1
    pros.append({'id':p['id'],'name':p['name'],'pos':p['pos'],'college':b.get('s',''),'age':age,'realPick':b['dp'],'round':1 if b['dp']<=30 else 2,'hgt':p.get('hgt')})
json.dump({'year':2026,'note':'The real 2026 draft: first rounds and second rounds as they were picked.','prospects':pros},open('data/draft-2026.json','w'),indent=1,ensure_ascii=False)
print('draft class',len(pros))
# ---- players
out=[]; seen=set()
def contract25(c, young):
    if not c: return None
    y=min(c['y']+1,5 if not young else 4)
    return {'s':round(c['s']/1.06),'y':y,'o':c.get('o','none')}
def add(p26, p25):
    pid=(p26 or p25)['id']
    if pid in seen: return
    seen.add(pid)
    if p25:
        age=p25['age']; team=p25['teamId']; hgt=p25['hgt']; pos=p25['pos']; name=p25['name']
    else:
        age=p26['age']-1; team=p26['teamId']; hgt=p26['hgt']; pos=p26['pos']; name=p26['name']
    if p26: r=dial(p26['ratings'],p26['age'])
    else: r=dict(p25['ratings'])
    q={'id':pid,'name':name,'age':age,'pos':pos,'teamId':team,'hgt':hgt,'ratings':r}
    if p26 and p26.get('contract') and team:
        q['contract']=contract25(p26['contract'], age<=23)
    pv=(P24.get(pid) or {}).get('prev') or None
    if pv: q['prev']=pv
    mp=(p25 or {}).get('prev',{}).get('mpg') if p25 else None
    if mp is None and p26: mp=p26.get('mp')
    if mp: q['mp']=mp
    out.append(q)
B_by={p['id']:p for p in B['players']}
for pid,p25 in Ap.items(): add(B_by.get(pid),p25)
for p in B['players']:
    if p['id'] in seen or p.get('tw') or is_rookie26(p): continue
    add(p,None)
for p in A['pool']:
    if p['id'] not in seen: add(B_by.get(p['id']),p)
# cap each club at 15 (best 15 by rating keep; rest to the pool with no team)
by={}
for q in out:
    if q['teamId']: by.setdefault(q['teamId'],[]).append(q)
for t,l in by.items():
    l.sort(key=lambda q:-q['ratings']['ovr'])
    for q in l[15:]: q['teamId']=None; q.pop('contract',None)
# starters: top five by minutes per club
for t,l in by.items():
    l=[q for q in l if q['teamId']==t]
    l.sort(key=lambda q:-(q.get('mp') or 0))
    for q in l[:5]: q['st']=1
json.dump({'season':'2025-26','source':'Opening-night rosters from the 2025-26 season data; ratings, ages and contracts dialed back one year from 2026-27.','players':out,'dead':{}},open('data/players-2025-open.json','w'),ensure_ascii=False,separators=(',',':'))
import collections
print(len(out), collections.Counter(q['teamId'] for q in out).most_common(3), sum(1 for q in out if not q['teamId']))

# ---- contract sanity: vets whose derived deal is far below the going rate (they re-signed cheaply in 2026) get a market deal
import statistics
pts=[(p['ratings']['ovr'],p['contract']['s']) for p in B['players'] if p.get('contract') and p['contract']['y']>=2 and p['age']>=26]
def med(o):
    xs=[s for r,s in pts if abs(r-o)<=2]; return statistics.median(xs) if len(xs)>=3 else None
P=json.load(open('data/players-2025-open.json')); fx=[]
for p in P['players']:
    c=p.get('contract')
    if c and p['age']>=27:
        m=med(p['ratings']['ovr'])
        if m and c['s']<0.45*m and p['ratings']['ovr']>=62:
            c['s']=round(m*0.9); c['y']=min(c['y'],2); fx.append(p['name'])
print('market-fixed',fx)
json.dump(P,open('data/players-2025-open.json','w'),ensure_ascii=False,separators=(',',':'))
