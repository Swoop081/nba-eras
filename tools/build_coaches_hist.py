"""Real opening-night head coaches for every season from Basketball Reference coach pages ('name|team|seasonsWithTeam|seasonsOverall|G|W|L|careerG|careerW|careerL', first listed = first coach of the year).
Ratings are DERIVED, not real: career win% shrunk toward .500 by games coached (246 games = half weight), with a stable per-coach spread for off/def/dev/mot.
Usage: python3 -I tools/build_coaches_hist.py coach_raw.json abbr_map.json"""
import json, sys, hashlib
raw=json.load(open(sys.argv[1])); AB=json.load(open(sys.argv[2]))
MOD={'ATL':'atlanta-hawks','BOS':'boston-celtics','BRK':'brooklyn-nets','CHO':'charlotte-hornets','CHI':'chicago-bulls','CLE':'cleveland-cavaliers','DAL':'dallas-mavericks','DEN':'denver-nuggets','DET':'detroit-pistons','GSW':'golden-state-warriors','HOU':'houston-rockets','IND':'indiana-pacers','LAC':'la-clippers','LAL':'los-angeles-lakers','MEM':'memphis-grizzlies','MIA':'miami-heat','MIL':'milwaukee-bucks','MIN':'minnesota-timberwolves','NOP':'new-orleans-pelicans','NYK':'new-york-knicks','OKC':'oklahoma-city-thunder','ORL':'orlando-magic','PHI':'philadelphia-76ers','PHO':'phoenix-suns','POR':'portland-trail-blazers','SAC':'sacramento-kings','SAS':'san-antonio-spurs','TOR':'toronto-raptors','UTA':'utah-jazz','WAS':'washington-wizards'}
def jit(name,k): return (int(hashlib.md5((name+k).encode()).hexdigest()[:6],16)/0xffffff-0.5)*12
out={}; miss=0
for page,rows in sorted(raw.items(),key=lambda x:int(x[0])):
    y=int(page)-1; seen={}
    amap=AB.get(str(y),{}) if y<=2014 else MOD
    for r in rows:
        n,tm,sw,so,g,w,l,cg,cw,cl=(r.split('|')+['']*10)[:10]
        if tm in seen: continue          # first coach of the year only
        tid=amap.get(tm)
        if not tid:
            if tm!='TOT': miss+=1
            continue
        seen[tm]=1
        try: G=int(cg); W=int(cw)
        except: G=0; W=0
        wp=W/G if G else 0.5; k=G/(G+246.0)
        base=50+(wp-0.5)*110*k*1.0+ (0 if G else 0)
        row=[n,n.replace(' ','_')]+[max(35,min(88,round(base+jit(n,x)))) for x in ('off','def','dev','mot')]
        out.setdefault(str(y),{})[tid]=row
json.dump(out,open('data/coaches-hist.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(out),'seasons; unmatched team rows',miss); print(out['1995']['chicago-bulls'], out['2014']['san-antonio-spurs'])
