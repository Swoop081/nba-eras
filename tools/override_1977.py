# Hand corrections for 1977-78: stat-only ratings under-rate reputation/peak players.
import json
O={
 'julius-erving':{'ovr':86,'sco':88,'sht':58,'ply':62,'orb':60,'drb':58,'stl':72,'blk':74,'tov':40},
 'pete-maravich':{'ovr':82,'sco':90,'sht':60,'blk':10,'stl':40},
 'dave-cowens':{'ovr':80,'sco':62,'sht':60,'ply':52,'stl':35,'blk':40},
 'moses-malone':{'ovr':79,'sht':52,'blk':50},
 'elvin-hayes':{'ovr':78,'sht':45,'ply':20,'blk':72,'sco':62},
}
f='data/players-1977.json'
d=json.load(open(f)); ps=d if isinstance(d,list) else d['players']
for p in ps:
    if p['id'] in O: p['ratings'].update(O[p['id']]); print('set',p['name'],p['ratings']['ovr'])
json.dump(d,open(f,'w'),separators=(',',':'))
