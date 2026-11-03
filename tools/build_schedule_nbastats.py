"""Real game order, matchups and home/away for 2015-16..2019-20 from the stats-API play-by-play (no calendar dates in that file).
Days are rebuilt from the game order (a club never plays twice in a day) and spread across the season's real first and last dates,
so the calendar is approximate while every matchup and its order are real. Marked "datesApprox".
Usage: python3 -I tools/build_schedule_nbastats.py <startYear> nbastats_<year>.csv out.json"""
import pandas as pd, json, sys, datetime as dt
Y=int(sys.argv[1])
SPAN={2015:('2015-10-27','2016-04-13'),2016:('2016-10-25','2017-04-12'),2017:('2017-10-17','2018-04-11'),2018:('2018-10-16','2019-04-10'),2019:('2019-10-22','2020-08-14')}
TRI={'ATL':'atlanta-hawks','BOS':'boston-celtics','BKN':'brooklyn-nets','CHA':'charlotte-hornets','CHI':'chicago-bulls','CLE':'cleveland-cavaliers','DAL':'dallas-mavericks','DEN':'denver-nuggets','DET':'detroit-pistons','GSW':'golden-state-warriors','HOU':'houston-rockets','IND':'indiana-pacers','LAC':'la-clippers','LAL':'los-angeles-lakers','MEM':'memphis-grizzlies','MIA':'miami-heat','MIL':'milwaukee-bucks','MIN':'minnesota-timberwolves','NOP':'new-orleans-pelicans','NYK':'new-york-knicks','OKC':'oklahoma-city-thunder','ORL':'orlando-magic','PHI':'philadelphia-76ers','PHX':'phoenix-suns','POR':'portland-trail-blazers','SAC':'sacramento-kings','SAS':'san-antonio-spurs','TOR':'toronto-raptors','UTA':'utah-jazz','WAS':'washington-wizards'}
d=pd.read_csv(sys.argv[2],usecols=['GAME_ID','HOMEDESCRIPTION','VISITORDESCRIPTION','PLAYER1_TEAM_ABBREVIATION'],low_memory=False)
d=d[(d.GAME_ID>=20000000)&(d.GAME_ID<30000000)]
home=d[d.HOMEDESCRIPTION.notna()&d.PLAYER1_TEAM_ABBREVIATION.notna()].groupby('GAME_ID').PLAYER1_TEAM_ABBREVIATION.agg(lambda s:s.mode().iat[0])
away=d[d.VISITORDESCRIPTION.notna()&d.PLAYER1_TEAM_ABBREVIATION.notna()].groupby('GAME_ID').PLAYER1_TEAM_ABBREVIATION.agg(lambda s:s.mode().iat[0])
g=pd.DataFrame({'h':home,'a':away}).dropna().sort_index()
g=g[g.h!=g.a]
days=[]; cur=[]; busy=set()
for gid,r in g.iterrows():
    if r.h in busy or r.a in busy: days.append(cur); cur=[]; busy=set()
    cur.append((gid,r.h,r.a)); busy|={r.h,r.a}
days.append(cur)
a,b=[dt.date.fromisoformat(x) for x in SPAN[Y]]; n=len(days); games=[]
for i,day in enumerate(days):
    iso=(a+dt.timedelta(days=round(i*(b-a).days/max(1,n-1)))).isoformat()
    for gid,h,aw in day: games.append({'d':iso,'h':TRI[h],'a':TRI[aw],'id':str(gid),'lab':'','sub':'','arena':'','city':''})
print(Y,len(games),'games',n,'days')
json.dump({'source':'NBA stats play-by-play (shufinskiy/nba_data); calendar dates approximate','datesApprox':True,'n':len(games),'games':games},open(sys.argv[3],'w'),separators=(',',':'))
