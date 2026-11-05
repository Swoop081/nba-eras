# June 1995, before the expansion draft: the league as it stood, two empty new clubs, real draft class.
import json
def L(f):
    d=json.load(open(f)); return d if isinstance(d,list) else d.get('players') or d.get('prospects')
p95=L('data/players-1995.json'); p94={x['id']:x for x in L('data/players-1994.json')}
draft=json.load(open('data/draft-1995.json')); pros=draft if isinstance(draft,list) else draft.get('prospects') or draft.get('players')
dids={x['id'] for x in pros}
NEW=('toronto-raptors','vancouver-grizzlies')
players=[]; real={'toronto-raptors':[], 'vancouver-grizzlies':[]}; fa=[]
for x in p95:
    if x['id'] in dids: continue                       # drafted days later; lives in the draft class
    y=dict(x)
    if x['teamId'] in NEW:
        real[x['teamId']].append(x['id'])              # the real expansion picks, used by the CPU as its board
        old=p94.get(x['id'],{}).get('teamId')
        y['teamId']=old if old and old not in NEW else None
        if y['teamId'] is None: fa.append(x['id'])
    players.append(y)
# draftees who went to the new clubs in the expansion draft are really draft picks; keep them in the class
t=json.load(open('data/teams-1995.json'))
out={'season':'1995-96','phase':'expansion','teams':t['teams'],'players':players,'real':real,'freeAgents':fa,
     'rules':{'protect':8,'maxLoss':1,'picks':{'toronto-raptors':14,'vancouver-grizzlies':13},
              'draftSlots':{'vancouver-grizzlies':6,'toronto-raptors':7},'noFirstPick':True}}
json.dump(out,open('data/expansion-1995.json','w'),separators=(',',':'),ensure_ascii=False)
from collections import Counter
c=Counter(x['teamId'] for x in players)
print(len(players),'players;',len(fa),'unattached;', 'club sizes',sorted(v for k,v in c.items() if k),'new clubs',c.get('toronto-raptors',0),c.get('vancouver-grizzlies',0))
