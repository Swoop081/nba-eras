"""Real career spans from every data/players-<year>.json (tw excluded): data/careers.json
{id: [lastSeason (0 = still playing in 2026-27)]} or {id: [lastSeason, retireAge]}.
A good player (ovr >= 62) whose real career ended at 31 or younger left early (injury, going overseas). The sim does not repeat
his injury, so he gets a best-guess retirement age instead of his real exit: 32 + (peak ovr - 65) / 5, capped at 37."""
import json, glob, re, collections
DIED = {'reggie-lewis', 'drazen-petrovic', 'malik-sealy', 'jason-collier', 'wayman-tisdale', 'sean-rooks', 'lorenzen-wright', 'terry-furlow', 'bobby-phills', 'dick-barnett'}   # a real death ends the career, no guess
last = {}; peak = collections.defaultdict(int)
for f in sorted(glob.glob('data/players-[0-9][0-9][0-9][0-9].json')):
    y = int(re.findall(r'(\d{4})', f)[0])
    for p in json.load(open(f))['players']:
        if not p.get('tw'): last[p['id']] = (y, p.get('age') or 0, p['ratings']['ovr'], p.get('name')); peak[p['id']] = max(peak[p['id']], p['ratings']['ovr'])
out = {}; early = []
for i, (y, age, ovr, name) in last.items():
    if y >= 2026: out[i] = [0]; continue
    ovr = peak[i]
    if age and age <= 31 and ovr >= 70 and 1970 <= y <= 2023 and i not in DIED:
        g = min(37, round(32 + (ovr - 65) / 5)); out[i] = [y, g]; early.append((ovr, name, y, age, g))
    else: out[i] = [y]
json.dump(out, open('data/careers.json', 'w'), separators=(',', ':'))
early.sort(reverse=True); print(len(out), 'early exits', len(early)); print(early[:25])
