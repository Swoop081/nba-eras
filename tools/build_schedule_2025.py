"""Real 2025-26 regular-season schedule from the NBA CDN play-by-play (shufinskiy/nba_data cdnnba_2025).
Usage: python3 -I tools/build_schedule_2025.py cdnnba_2025.csv out.json"""
import pandas as pd, json, sys, datetime as dt
from zoneinfo import ZoneInfo
TRI={'ATL':'atlanta-hawks','BOS':'boston-celtics','BKN':'brooklyn-nets','CHA':'charlotte-hornets','CHI':'chicago-bulls','CLE':'cleveland-cavaliers','DAL':'dallas-mavericks','DEN':'denver-nuggets','DET':'detroit-pistons','GSW':'golden-state-warriors','HOU':'houston-rockets','IND':'indiana-pacers','LAC':'la-clippers','LAL':'los-angeles-lakers','MEM':'memphis-grizzlies','MIA':'miami-heat','MIL':'milwaukee-bucks','MIN':'minnesota-timberwolves','NOP':'new-orleans-pelicans','NYK':'new-york-knicks','OKC':'oklahoma-city-thunder','ORL':'orlando-magic','PHI':'philadelphia-76ers','PHX':'phoenix-suns','POR':'portland-trail-blazers','SAC':'sacramento-kings','SAS':'san-antonio-spurs','TOR':'toronto-raptors','UTA':'utah-jazz','WAS':'washington-wizards'}
GROUPS=[['cle','ind','atl','tor','was'],['bos','det','orl','bkn','phi'],['mil','nyk','chi','mia','cha'],['okc','min','sac','phx','uta'],['lal','lac','mem','dal','nop'],['hou','den','gsw','por','sas']]
d=pd.read_csv(sys.argv[1],usecols=['gameId','timeActual','teamTricode','scoreHome','scoreAway','orderNumber'],low_memory=False)
d['scoreHome']=pd.to_numeric(d.scoreHome,errors='coerce'); d['scoreAway']=pd.to_numeric(d.scoreAway,errors='coerce')
d=d.sort_values(['gameId','orderNumber'])
d['dh']=d.groupby('gameId').scoreHome.diff(); d['da']=d.groupby('gameId').scoreAway.diff()
hm=d[(d.dh>0)&d.teamTricode.notna()].groupby('gameId').teamTricode.agg(lambda s:s.mode().iat[0])
aw=d[(d.da>0)&d.teamTricode.notna()].groupby('gameId').teamTricode.agg(lambda s:s.mode().iat[0])
g=pd.DataFrame({'left':hm,'right':aw}); g['t']=d.dropna(subset=['timeActual']).groupby('gameId').timeActual.min()
g=g[g.t.notna()&g['left'].notna()&g['right'].notna()]
grp={}
for i,G in enumerate(GROUPS):
    for t in G: grp[TRI[t.upper()]]=i
games=[]
for gid,r in g.iterrows():
    t=dt.datetime.fromisoformat(r.t.replace('Z','+00:00')).astimezone(ZoneInfo('America/New_York'))
    day=(t-dt.timedelta(hours=4)).date()   # a late tip-off stays on the evening's date
    games.append({'d':day.isoformat(),'h':TRI[r['left']],'a':TRI[r['right']],'id':str(gid),'lab':'','sub':'','arena':'','city':''})
games.sort(key=lambda x:(x['d'],x['id']))
# Cup group play: one game per same-group pair inside the Oct 31 - Nov 28 window, Tue/Fri nights first
pairs={}
for x in games:
    if grp[x['h']]==grp[x['a']] and '2025-10-31'<=x['d']<='2025-11-28':
        pairs.setdefault(frozenset((x['h'],x['a'])),[]).append(x)
for p,l in pairs.items():
    l.sort(key=lambda x:(dt.date.fromisoformat(x['d']).weekday() not in (1,4),x['d']))
    l[0]['lab']='NBA Cup - Group Play'
print('cup pairs',len(pairs),'labelled',sum(1 for x in games if x['lab']))
# the engine replays the knockout rounds itself: drop the real quarter/semi games and two more per club so everyone keeps 80 real games
import collections
need=collections.Counter({t:2 for t in TRI.values()}); rm=set()
for k,x in enumerate(games):
    if x['d'] in ('2025-12-09','2025-12-10','2025-12-13'): rm.add(k); need[x['h']]-=1; need[x['a']]-=1
for k in sorted(range(len(games)),key=lambda k:abs((dt.date.fromisoformat(games[k]['d'])-dt.date(2025,12,10)).days)):
    x=games[k]
    if k in rm or x['lab']: continue
    if need[x['h']]>0 and need[x['a']]>0: rm.add(k); need[x['h']]-=1; need[x['a']]-=1
assert not any(need.values()),need
games=[x for k,x in enumerate(games) if k not in rm]
print(len(games),'games')
json.dump({'source':'NBA CDN play-by-play (shufinskiy/nba_data)','n':len(games),'games':games,'cup':{'from':'2025-12-08','days':['2025-12-09','2025-12-13','2025-12-16']}},open(sys.argv[2],'w'),separators=(',',':'))
