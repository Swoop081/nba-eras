# Hand corrections to a few star ratings that stat-only ratings got wrong.
import json
FIX={2026:{'kevin-durant':82},2008:{'kobe-bryant':87},2017:{'stephen-curry':86,'kevin-durant':86},2013:{'kevin-love':80}}
for y,m in FIX.items():
    f=f'data/players-{y}.json'; d=json.load(open(f)); ps=d if isinstance(d,list) else d['players']
    for p in ps:
        if p['id'] in m: print(y,p['name'],p['ratings']['ovr'],'->',m[p['id']]); p['ratings']['ovr']=m[p['id']]
    json.dump(d,open(f,'w'),separators=(',',':'),ensure_ascii=False)
