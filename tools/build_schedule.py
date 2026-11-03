"""Real regular-season schedule from the NBA CDN play-by-play (shufinskiy/nba_data cdnnba_<year>, seasons 2020 on).
Usage: python3 -I tools/build_schedule.py <startYear> cdnnba_<year>.csv out.json"""
import pandas as pd, json, sys, datetime as dt, itertools, collections
from zoneinfo import ZoneInfo
TRI={'ATL':'atlanta-hawks','BOS':'boston-celtics','BKN':'brooklyn-nets','CHA':'charlotte-hornets','CHI':'chicago-bulls','CLE':'cleveland-cavaliers','DAL':'dallas-mavericks','DEN':'denver-nuggets','DET':'detroit-pistons','GSW':'golden-state-warriors','HOU':'houston-rockets','IND':'indiana-pacers','LAC':'la-clippers','LAL':'los-angeles-lakers','MEM':'memphis-grizzlies','MIA':'miami-heat','MIL':'milwaukee-bucks','MIN':'minnesota-timberwolves','NOP':'new-orleans-pelicans','NYK':'new-york-knicks','OKC':'oklahoma-city-thunder','ORL':'orlando-magic','PHI':'philadelphia-76ers','PHX':'phoenix-suns','POR':'portland-trail-blazers','SAC':'sacramento-kings','SAS':'san-antonio-spurs','TOR':'toronto-raptors','UTA':'utah-jazz','WAS':'washington-wizards'}
Y=int(sys.argv[1]); sys.argv.pop(1)
KO={2023:(['2023-12-04','2023-12-05','2023-12-07'],['2023-12-04','2023-12-07','2023-12-09'],'2023-11-03','2023-11-28'),
    2024:(['2024-12-10','2024-12-11','2024-12-14'],['2024-12-10','2024-12-14','2024-12-17'],'2024-11-12','2024-12-03'),
    2025:(['2025-12-09','2025-12-10','2025-12-13'],['2025-12-09','2025-12-13','2025-12-16'],'2025-10-31','2025-11-28')}
KO_REAL,KO_DAYS,CUP_FROM,CUP_TO=KO[Y]
EAST={'atlanta-hawks','boston-celtics','brooklyn-nets','charlotte-hornets','chicago-bulls','cleveland-cavaliers','detroit-pistons','indiana-pacers','miami-heat','milwaukee-bucks','new-york-knicks','orlando-magic','philadelphia-76ers','toronto-raptors','washington-wizards'}
d=pd.read_csv(sys.argv[1],usecols=['gameId','timeActual','teamTricode','scoreHome','scoreAway','orderNumber'],low_memory=False)
d['scoreHome']=pd.to_numeric(d.scoreHome,errors='coerce'); d['scoreAway']=pd.to_numeric(d.scoreAway,errors='coerce')
d=d.sort_values(['gameId','orderNumber'])
d['dh']=d.groupby('gameId').scoreHome.diff(); d['da']=d.groupby('gameId').scoreAway.diff()
hm=d[(d.dh>0)&d.teamTricode.notna()].groupby('gameId').teamTricode.agg(lambda s:s.mode().iat[0])
aw=d[(d.da>0)&d.teamTricode.notna()].groupby('gameId').teamTricode.agg(lambda s:s.mode().iat[0])
g=pd.DataFrame({'left':hm,'right':aw}); g['t']=d.dropna(subset=['timeActual']).groupby('gameId').timeActual.min()
g=g[g.t.notna()&g['left'].notna()&g['right'].notna()]
games=[]
for gid,r in g.iterrows():
    t=dt.datetime.fromisoformat(r.t.replace('Z','+00:00')).astimezone(ZoneInfo('America/New_York'))
    day=(t-dt.timedelta(hours=4)).date()   # a late tip-off stays on the evening's date
    games.append({'d':day.isoformat(),'h':TRI[r['left']],'a':TRI[r['right']],'id':str(gid),'lab':'','sub':'','arena':'','city':''})
games.sort(key=lambda x:(x['d'],x['id']))
# Cup groups are found, not typed in: inside each conference the three 5-team cliques that met most on Tue/Fri nights of the group window
cnt=collections.Counter()
for x in games:
    if CUP_FROM<=x['d']<=CUP_TO: cnt[frozenset((x['h'],x['a']))]+=10 if dt.date.fromisoformat(x['d']).weekday() in (1,4) else 1
def best_split(conf):
    conf=sorted(conf); first=conf[0]; best=(-1,None)
    for a in itertools.combinations(conf[1:],4):
        A=(first,)+a; rest=[t for t in conf if t not in A]; f2=rest[0]
        for b in itertools.combinations(rest[1:],4):
            B=(f2,)+b; C=tuple(t for t in rest if t not in B)
            sc=sum(cnt[frozenset(p)] for G in (A,B,C) for p in itertools.combinations(G,2))
            if sc>best[0]: best=(sc,[A,B,C])
    return best
allt=set(TRI.values()); GR=[]
for conf in (EAST,allt-EAST):
    sc,sp=best_split(conf); print('conference split score',sc); GR+=sp
grp={t:i for i,G in enumerate(GR) for t in G}
pairs={}
for x in games:
    if grp[x['h']]==grp[x['a']] and CUP_FROM<=x['d']<=CUP_TO:
        pairs.setdefault(frozenset((x['h'],x['a'])),[]).append(x)
for p,l in pairs.items():
    l.sort(key=lambda x:(dt.date.fromisoformat(x['d']).weekday() not in (1,4),x['d']))
    l[0]['lab']='NBA Cup - Group Play'
print('cup pairs',len(pairs),'labelled',sum(1 for x in games if x['lab']))
# the engine replays the knockout rounds itself: drop the real quarter/semi games and two more per club so everyone keeps 80 real games
import collections
need=collections.Counter({t:2 for t in TRI.values()}); rm=set()
for k,x in enumerate(games):
    if x['d'] in KO_REAL: rm.add(k); need[x['h']]-=1; need[x['a']]-=1
for k in sorted(range(len(games)),key=lambda k:abs((dt.date.fromisoformat(games[k]['d'])-dt.date.fromisoformat(KO_REAL[1])).days)):
    x=games[k]
    if k in rm or x['lab']: continue
    if need[x['h']]>0 and need[x['a']]>0: rm.add(k); need[x['h']]-=1; need[x['a']]-=1
assert not any(need.values()),need
games=[x for k,x in enumerate(games) if k not in rm]
print(len(games),'games')
json.dump({'source':'NBA CDN play-by-play (shufinskiy/nba_data)','n':len(games),'games':games,'cup':{'from':(dt.date.fromisoformat(KO_DAYS[0])-dt.timedelta(days=1)).isoformat(),'days':KO_DAYS}},open(sys.argv[2],'w'),separators=(',',':'))
