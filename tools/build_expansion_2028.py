# June 2028 (made up): the league as simulated forward, plus two new clubs, Seattle and Las Vegas.
import json
s=json.load(open('/tmp/t/snap28.json'))
NEW=['seattle-supersonics-2028','las-vegas-2028']
pl=[]
for p in s['lg']['players']:
    if p.get('status')!='active': continue
    q={'id':p['id'],'name':p['name'],'age':p['age'],'pos':p['pos'],'teamId':p.get('team'),'hgt':p['hgt'],'ratings':p['ratings'],
       'contract':{'s':p.get('salary',0),'y':max(1,p.get('yrs',1)),'o':p.get('opt') or 'none'}}
    if p.get('pot'): q['pot']=p['pot']
    pl.append(q)
t=json.load(open('data/teams-2027.json')); t['season']='2028-29'
for x in t['teams']:
    r=s['lastRec'][x['id']]; x['w']=r['w'];x['l']=r['l'];x['lw']=r['w'];x['ll']=r['l'];x['rw']=r['w'];x['rl']=r['l']
    if x['id']=='memphis-grizzlies': x['division']='Eastern'   # 17 West / 15 East would be lopsided
t['teams']+= [
 {'id':NEW[0],'city':'Seattle','name':'SuperSonics','division':'Western','w':0,'l':0,'colors':['#00653A','#FFC200'],'nbaId':0,'isNew':True},
 {'id':NEW[1],'city':'Las Vegas','name':'Expansion','division':'Western','w':0,'l':0,'colors':['#111111','#C9A227'],'nbaId':0,'isNew':True}]
json.dump(t,open('data/teams-2028.json','w'),separators=(',',':'),ensure_ascii=False)
json.dump({'season':'2028-29','phase':'expansion','teams':t['teams'],'players':pl,'real':{NEW[0]:[],NEW[1]:[]},'freeAgents':[],
  'rules':{'protect':8,'maxLoss':1,'picks':{NEW[0]:15,NEW[1]:15},'noFirstPick':True,'new':NEW}},open('data/expansion-2028.json','w'),separators=(',',':'),ensure_ascii=False)
json.dump({'season':'2028-29','source':'placeholder until the expansion is played out','players':pl,'dead':[]},open('data/players-2028.json','w'),separators=(',',':'),ensure_ascii=False)
print(len(pl),'players',len(t['teams']),'teams')
