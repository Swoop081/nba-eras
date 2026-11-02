import json,glob,os
os.chdir(os.path.dirname(os.path.abspath(__file__))+'/..')
seasons={}; car={}; names={}
for y in range(1946,2026):
    fn='data/players-%d.json'%y
    if not os.path.exists(fn): continue
    d=json.load(open(fn)); games=(d.get('lg') or {}).get('games',60)
    teams={t['id']:t.get('city','') for t in json.load(open('data/teams-%d.json'%y))['teams']} if os.path.exists('data/teams-%d.json'%y) else {}
    rows=[]
    for p in d['players']:
        s=p.get('prev')
        if not s and p.get('g') and 'pts' in p and 'ratings' in p and 'stints' in p:
            g=p['g']; s={'g':g,'pts':p['pts']/g,'trb':0,'ast':(p.get('ast') or 0)/g,'stl':0,'blk':0}
        if not s or not s.get('g'): continue
        rows.append((p['id'],p['name'],teams.get(p['teamId'],''),s))
        names[p['id']]=p['name']
        c=car.setdefault(p['id'],[])
        g=s['g']; c.append([y,g,round(s['pts']*g),round(s['trb']*g),round(s['ast']*g),round(s['stl']*g),round(s['blk']*g)])
    out={}
    for k in ('pts','trb','ast','stl','blk'):
        q=[r for r in rows if r[3]['g']>=0.7*games and (r[3].get(k) or 0)>0]
        q.sort(key=lambda r:-r[3][k])
        out[k]=[[r[0],r[1],r[2],r[3]['g'],r[3][k]] for r in q[:5]]
    seasons[y]=out
keep=[]
for pid,c in car.items():
    t=[sum(x[i] for x in c) for i in range(1,7)]
    if t[1]>=7000 or t[3]>=3500 or t[2]>=5000 or t[4]>=700 or t[5]>=500 or t[0]>=1000:
        keep.append([pid,names[pid],c])
# hand-entered seasons that have no data file (BAA 1947-48 .. 1950-51)
def L(id,n,c,g,v): return [[id,n,c,g,v]]
seasons[1947]={'pts':L('max-zaslofsky','Max Zaslofsky','Chicago',48,21.0),'ast':L('howie-dallmar','Howie Dallmar','Philadelphia',48,2.5)}
seasons[1948]={'pts':L('george-mikan','George Mikan','Minneapolis',60,28.3),'ast':L('bob-davies','Bob Davies','Rochester',60,5.4)}
seasons[1949]={'pts':L('george-mikan','George Mikan','Minneapolis',68,27.4),'ast':L('dick-mcguire','Dick McGuire','New York',68,5.8)}
seasons[1950]={'pts':L('george-mikan','George Mikan','Minneapolis',68,28.4),'ast':L('andy-phillip','Andy Phillip','Philadelphia',66,6.3)}
json.dump({'seasons':seasons,'career':keep},open('data/real-records.json','w'),separators=(',',':'),ensure_ascii=False)
print(len(keep),os.path.getsize('data/real-records.json'))
for n in ('kareem-abdul-jabbar','lebron-james','michael-jordan','wilt-chamberlain','bill-russell'):
    for r in keep:
        if r[0]==n: print(n,[sum(x[i] for x in r[2]) for i in range(1,7)])
print(seasons[1961]['pts'][:2],seasons[2025]['pts'][:2])
