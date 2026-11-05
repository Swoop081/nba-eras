# June 2004, before the Bobcats' expansion draft: the league as it stood, an empty Charlotte Bobcats, the real draft class.
import json
def L(f):
    d=json.load(open(f)); return d if isinstance(d,list) else d.get('players') or d.get('prospects')
p04=L('data/players-2004.json'); p03={x['id']:x for x in L('data/players-2003.json')}
dids={x['id'] for x in L('data/draft-2004.json')}
NEW='charlotte-bobcats'
players=[]; real=[]; fa=[]
for x in p04:
    if x['id'] in dids: continue
    y=dict(x)
    if x['teamId']==NEW:
        real.append(x['id'])
        old=p03.get(x['id'],{}).get('teamId')
        y['teamId']=old if old and old!=NEW else None
        if y['teamId'] is None: fa.append(x['id'])
    players.append(y)
t=json.load(open('data/teams-2004.json'))
out={'season':'2004-05','phase':'expansion','teams':t['teams'],'players':players,'real':{NEW:real},'freeAgents':fa,
     'rules':{'protect':8,'maxLoss':1,'picks':{NEW:19},'draftSlots':{NEW:2},'noFirstPick':True,'new':[NEW]}}
json.dump(out,open('data/expansion-2004.json','w'),separators=(',',':'),ensure_ascii=False)
from collections import Counter
c=Counter(x['teamId'] for x in players)
print(len(players),'players;',len(fa),'unattached; real bobcats',len(real),'; club sizes',sorted(v for k,v in c.items() if k))
