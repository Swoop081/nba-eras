/* Fits the 2025-26 ratings to what really happened: each player's per-game line and each club's record.
   node tools/calibrate_2025.js [iterations] [seasons per iteration] [--write]
   Reads data/players-2025.json and tools/data-2025/standings.csv; --write saves the fitted ratings back. */
const fs = require('fs'), vm = require('vm'), path = require('path');
global.window = global; global.self = global;
const R = path.join(__dirname, '..');
for (const f of ['rules', 'engine']) vm.runInThisContext(fs.readFileSync(path.join(R, f + '.js'), 'utf8'), { filename: f });
const W = { sco: .39, sht: .10, ft: .04, ply: .08, tov: .04, orb: .05, drb: .07, stl: .07, blk: .05, fou: .03, dur: .08 };
const SK = ['sco', 'sht', 'ft', 'tpt', 'ply', 'tov', 'orb', 'drb', 'stl', 'blk', 'fou', 'dur'];
const doc = JSON.parse(fs.readFileSync(path.join(R, 'data/players-2025.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(R, 'data/teams-2025.json'), 'utf8')).teams;
const stand = {};
fs.readFileSync(path.join(R, 'tools/data-2025/standings.csv'), 'utf8').trim().split('\n').slice(1).forEach(l => { const [c, w] = l.split(','); stand[c] = +w; });
const CODE = { atlanta: 'ATL', boston: 'BOS', brooklyn: 'BKN', charlotte: 'CHA', chicago: 'CHI', cleveland: 'CLE', dallas: 'DAL', denver: 'DEN', detroit: 'DET', 'golden-state': 'GSW', houston: 'HOU', indiana: 'IND', 'la-clippers': 'LAC', 'los-angeles-lakers': 'LAL', memphis: 'MEM', miami: 'MIA', milwaukee: 'MIL', minnesota: 'MIN', 'new-orleans': 'NOP', 'new-york': 'NYK', 'oklahoma-city': 'OKC', orlando: 'ORL', philadelphia: 'PHI', phoenix: 'PHX', portland: 'POR', sacramento: 'SAC', 'san-antonio': 'SAS', toronto: 'TOR', utah: 'UTA', washington: 'WAS' };
const realW = {};
teams.forEach(t => { const k = Object.keys(CODE).find(c => (t.id === c || t.id.startsWith(c + '-'))); realW[t.id] = stand[CODE[k]]; });
const players = doc.players;
players.forEach(p => { p.ratings.ovr = ovrOf(p.ratings); p.avail = Math.min(1, (p.prev.g || 0) / 82); });
function ovrOf(r) { let s = 0; for (const k in W) s += W[k] * r[k]; return Math.round(35 + 0.6 * s); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const byTeam = {}; players.forEach(p => (byTeam[p.teamId] = byTeam[p.teamId] || []).push(p));
const ids = Object.keys(byTeam);

function seasonSim() {
  const wins = {}, st = {}; ids.forEach(i => wins[i] = 0);
  players.forEach(p => st[p.id] = { g: 0, pts: 0, trb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fg: 0, fga: 0, tp: 0, tpa: 0, ft: 0, fta: 0, pf: 0, min: 0 });
  let pf = 0, ga = 0;
  const games = [];
  for (let d = 0; d < 82; d++) { const o = ids.slice().sort(() => Math.random() - .5); for (let i = 0; i < 30; i += 2) games.push(Math.random() < .5 ? [o[i], o[i + 1]] : [o[i + 1], o[i]]); }
  const avail = id => { let l = byTeam[id].filter(p => Math.random() < p.avail); if (l.length < 8) l = byTeam[id].slice().sort((a, b) => b.ratings.ovr - a.ratings.ovr).slice(0, 8); return l; };
  for (const [h, a] of games) {
    const r = Engine.simulate(avail(h), avail(a), 2025);
    wins[r.home > r.away ? h : a]++; pf += r.home + r.away; ga += 2;
    for (const L of [r.homeLines, r.awayLines]) for (const x of L) { const s = x.s, o = st[x.id]; if (!s.pos) continue; o.g++; o.pts += s.pts; o.trb += s.trb; o.ast += s.ast; o.stl += s.stl; o.blk += s.blk; o.tov += s.tov; o.fg += s.fg; o.fga += s.fga; o.tp += s.tp; o.tpa += s.tpa; o.ft += s.ft; o.fta += s.fta; o.pf += s.pf; o.min += s.min; }
  }
  return { wins, st, ppg: pf / ga };
}
function run(S) {
  const W2 = {}, ST = {}; ids.forEach(i => W2[i] = 0); players.forEach(p => ST[p.id] = { g: 0, pts: 0, trb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fg: 0, fga: 0, tp: 0, tpa: 0, ft: 0, fta: 0, pf: 0, min: 0 });
  let ppg = 0;
  for (let s = 0; s < S; s++) { const r = seasonSim(); ppg += r.ppg / S; ids.forEach(i => W2[i] += r.wins[i] / S); for (const id in r.st) for (const k in r.st[id]) ST[id][k] += r.st[id][k]; }
  return { wins: W2, st: ST, ppg };
}
function report(r, tag) {
  let mw = 0; ids.forEach(i => mw += Math.abs(r.wins[i] - realW[i])); mw /= ids.length;
  let ep = 0, er = 0, ea = 0, n = 0;
  players.forEach(p => { const s = r.st[p.id]; if (s.g < 20 || p.prev.mpg < 15) return; n++; ep += Math.abs(s.pts / s.g - p.prev.pts); er += Math.abs(s.trb / s.g - p.prev.trb); ea += Math.abs(s.ast / s.g - p.prev.ast); });
  console.log(tag, 'league PPG', r.ppg.toFixed(1), '(real 115.6) | wins MAE', mw.toFixed(1), '| PPG MAE', (ep / n).toFixed(2), 'RPG', (er / n).toFixed(2), 'APG', (ea / n).toFixed(2), 'n', n);
}
const ITER = +process.argv[2] || 0, S = +process.argv[3] || 6;
let r = run(S); report(r, 'start');
for (let it = 1; it <= ITER; it++) {
  players.forEach(p => {
    const s = r.st[p.id]; if (s.g < 12) return;
    const g = s.g, sim = { pts: s.pts / g, trb: s.trb / g, ast: s.ast / g, stl: s.stl / g, blk: s.blk / g, tov: s.tov / g };
    const real = p.prev, k = p.ratings, wt = 0.55;
    const adj = (a, b) => clamp(Math.pow((b + 0.35) / (a + 0.35), wt), 0.88, 1.14);
    k.sco = clamp(k.sco * adj(sim.pts, real.pts), 3, 99);
    k.ply = clamp(k.ply * adj(sim.ast, real.ast), 3, 99);
    const rr = adj(sim.trb, real.trb); k.orb = clamp(k.orb * rr, 3, 99); k.drb = clamp(k.drb * rr, 3, 99);
    k.stl = clamp(k.stl * adj(sim.stl, real.stl), 3, 99);
    k.blk = clamp(k.blk * adj(sim.blk, real.blk), 3, 99);
    k.tov = clamp(k.tov * adj(real.tov, sim.tov), 3, 99);     // more turnovers than real -> better ball security
    if (s.tpa / g > 0.4 && real.tp !== null && real.tp !== undefined) { const stp = s.tp / s.tpa; k.tpt = clamp(k.tpt * clamp(Math.pow((real.tp + .02) / (stp + .02), .5), .93, 1.08), 3, 99); }
    if (s.fga / g > 3 && real.fg) { const sfg = s.fg / s.fga; k.sht = clamp(k.sht * clamp(Math.pow((real.fg + .02) / (sfg + .02), .6), .94, 1.07), 3, 99); }
    k.ovr = ovrOf(k);
  });
  ids.forEach(i => {   // club residual: spread over the rotation as hidden impact
    const d = (realW[i] - r.wins[i]) / 82 * 0.040;
    const top = byTeam[i].slice().sort((a, b) => b.ratings.ovr - a.ratings.ovr).slice(0, 9);
    top.forEach(p => { p.imp = clamp((p.imp || 0) + d, -0.06, 0.06); });
  });
  r = run(S); report(r, 'iter ' + it);
}
if (process.argv.includes('--write')) {
  players.forEach(p => { SK.forEach(k => p.ratings[k] = Math.round(p.ratings[k])); p.ratings.ovr = ovrOf(p.ratings); p.imp = Math.round((p.imp || 0) * 10000) / 10000; delete p.avail; });
  fs.writeFileSync(path.join(R, 'data/players-2025.json'), JSON.stringify(doc, null, 1));
  console.log('written');
}
