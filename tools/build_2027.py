# 2027-28: a made-up season. The real 2026-27 league was played forward by the game itself (autopilot), then frozen here.
import json
s=json.load(open('/tmp/t/snap27.json'))
out=[]
for p in s['lg']['players']:
    if p.get('status')!='active': continue
    q={'id':p['id'],'name':p['name'],'age':p['age'],'pos':p['pos'],'teamId':p.get('team'),'hgt':p['hgt'],'ratings':p['ratings'],
       'contract':{'s':p.get('salary',0),'y':max(1,p.get('yrs',1)),'o':p.get('opt') or 'none'}}
    if p.get('pot'): q['pot']=p['pot']
    out.append(q)
json.dump({'season':'2027-28','source':'simulated forward from 2026-27 (made-up)','players':out,'dead':[]},open('data/players-2027.json','w'),separators=(',',':'),ensure_ascii=False)
t=json.load(open('data/teams-2026.json')); t['season']='2027-28'
for x in t['teams']:
    r=s['lastRec'][x['id']]; x['w']=r['w'];x['l']=r['l'];x['lw']=r['w'];x['ll']=r['l'];x['rw']=r['w'];x['rl']=r['l']
json.dump(t,open('data/teams-2027.json','w'),separators=(',',':'),ensure_ascii=False)
print(len(out),'players', sum(1 for q in out if not q['teamId']),'free agents; champion',s['champion'])
