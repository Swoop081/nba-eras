"""Real regular-season schedules 1946-47 to 2014-15 from FiveThirtyEight's nba-elo (nbaallelo.csv): one file per season, matched to
each era's club ids by nickname. Usage: python3 -I tools/build_schedule_538.py nbaallelo.csv"""
import pandas as pd, json, sys, os, datetime as dt
d=pd.read_csv(sys.argv[1]); d=d[(d._iscopy==0)&(d.is_playoffs==0)]
d=d[d.lg_id=='NBA'].copy()
KEY={'ROC':'rochester','SYR':'syracuse','CIN':'cincinnati','BLB':'baltimore','BAL':'baltimore','CHP':'chicago','CHZ':'chicago','CAP':'capital','WSB':'washington','PHI':'philadelphia','POR':'portland','SEA':'seattle','BUF':'buffalo','CHH':'charlotte','NOH':'new-orleans','NOK':'new-orleans','CHA':'charlotte','NYK':'new-york','DNN':'denver','SHE':'sheboygan','WAT':'waterloo','CHS':'chicago','TRH':'toronto','STB':'st-louis','PRO':'providence','PIT':'pittsburgh','CLR':'cleveland','DTF':'detroit','WSC':'washington','INJ':'indianapolis','AND':'anderson','FTW':'fort-wayne','MNL':'minneapolis','TRI':'tri-cities','SDR':'san-diego','HOU':'houston','KCK':'kansas','KCO':'kansas','NJN':'new-jersey','SFW':'san-francisco','LAL':'los-angeles','LAC':'','SAN':'','STL':'st-louis','NOJ':'new-orleans','NYN':'new-york','VAN':'vancouver','MEM':'memphis','OKC':'oklahoma','BRK':'brooklyn','SDC':'san-diego','GSW':'golden','PHW':'philadelphia','INO':'indianapolis','DNR':'denver','SAS':'san-antonio','UTA':'utah','CHO':'charlotte'}
d['iso']=pd.to_datetime(d.date_game,format='%m/%d/%Y').dt.strftime('%Y-%m-%d')
bad=[]; ABBR={}
for y in range(1946,2015):
    f=f'data/teams-{y}.json'
    if not os.path.exists(f): continue
    T=json.load(open(f))['teams']; nick={t['name']:t['id'] for t in T}; ids=[t['id'] for t in T]
    s=d[d.year_id==y+1]
    if s.empty: continue
    games=[]
    ab=s.drop_duplicates('team_id'); amap={}
    FIRST={'NOH','NOK','NOJ','CHA','CHH','WSB','CAP','BAL','CHP','CHZ','ROC','SYR','CIN','BLB','BUF','DNN'}   # franchise nicknames in the file are today's, so these go by city first
    for r in ab.itertuples():
        c=[i for i in ids if KEY.get(r.team_id) and KEY[r.team_id] in i]
        if r.team_id in FIRST and len(c)==1 and c[0] not in amap.values(): amap[r.team_id]=c[0]
    for r in ab.itertuples():
        if r.team_id not in amap and r.fran_id in nick and nick[r.fran_id] not in amap.values(): amap[r.team_id]=nick[r.fran_id]
    left=[r.team_id for r in ab.itertuples() if r.team_id not in amap]; free=[i for i in ids if i not in amap.values()]
    for a_ in left:
        c=[i for i in free if KEY.get(a_) and KEY[a_] in i]
        if len(c)==1: amap[a_]=c[0]; free.remove(c[0])
    ABBR[y]=amap
    for r in s[s.game_location=='H'].itertuples():
        h=amap.get(r.team_id); a=amap.get(r.opp_id)
        if not h or not a: bad.append((y,r.team_id,r.opp_id)); games=None; break
        games.append({'d':r.iso,'h':h,'a':a,'id':r.game_id,'lab':'','sub':'','arena':'','city':''})
    if games is None: continue
    # neutral-site games have no H row: take the first-listed side as host
    n=s[s.game_location=='N']
    for r in n.itertuples():
        if r.team_id<r.opp_id: continue
        h=amap.get(r.team_id); a=amap.get(r.opp_id)
        if h and a: games.append({'d':r.iso,'h':h,'a':a,'id':r.game_id,'lab':'','sub':'','arena':'','city':''})
    games.sort(key=lambda g:(g['d'],g['id']))
    json.dump({'source':'FiveThirtyEight nba-elo','n':len(games),'games':games},open(f'data/schedule-{y}.json','w'),separators=(',',':'))
json.dump({str(k):v for k,v in ABBR.items()},open(os.environ.get('ABBR_OUT','/tmp/abbr_map.json'),'w'))
print('mismatches',sorted(set(bad))[:20],len(bad))
