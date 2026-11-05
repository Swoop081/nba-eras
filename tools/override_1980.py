# Hand corrections for 1980-81 (stat-only ratings under-rate Bird/Magic/Moses/Sikma).
import json
O={
 'larry-bird':{'ovr':86,'sco':84,'sht':80,'ply':78,'orb':78,'drb':82,'stl':62,'blk':40},
 'magic-johnson':{'ovr':85,'ply':99,'sco':78,'orb':62,'drb':70,'stl':80},
 'moses-malone':{'ovr':85,'orb':99,'drb':99},
 'jack-sikma':{'ovr':78,'sht':62,'ft':80},
 'robert-parish':{'ovr':82},
}
f='data/players-1980.json'
d=json.load(open(f)); ps=d if isinstance(d,list) else d['players']
for p in ps:
    if p['id'] in O: p['ratings'].update(O[p['id']]); print('set',p['name'],p['ratings']['ovr'])
json.dump(d,open(f,'w'),separators=(',',':'))
t=json.load(open('data/teams-1980.json'))['teams']; print(len(t),[x['id'] for x in t if 'dallas' in x['id']])
