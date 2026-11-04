import json,os,re,unicodedata,collections
def norm(n):
    n=unicodedata.normalize('NFKD',n).encode('ascii','ignore').decode().lower()
    n=re.sub(r"\b(jr|sr|ii|iii|iv)\b",'',n)
    return re.sub(r'[^a-z]','',n)
dn={}   # normname -> draft year
for D in range(1946,2028):
    f='data/draft-%d.json'%D
    if os.path.exists(f):
        for q in json.load(open(f))['prospects']: dn.setdefault(norm(q['name']),D)
prev=set(); res={}
for Y in range(1951,2026):
    g='data/players-%d.json'%Y
    pl=json.load(open(g))['players']
    new=[p for p in pl if p['id'] not in prev]
    cur=set(p['id'] for p in pl)
    und=[p for p in new if norm(p['name']) not in dn and Y>=1952]
    res[Y]=und
    prev|=cur
if __name__=='__main__':
    print({Y:len(v) for Y,v in res.items()})
    for Y in (1985,1996,2016,1960,1976): print(Y,[(p['name'],p['age']) for p in res[Y]][:20])
