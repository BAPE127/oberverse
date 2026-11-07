// Theatres as an observer sees them (v0.103.4): every theatre of the atlas, whether or not the company is in it. Read-only: it never calls anything that advances the war and never reads a garrison.
// What is known is the ground: who holds each province (its own country unless the war record says it changed hands), where the two belligerents' ground touches (the fronts), the cities and ports,
// the infrastructure, and what the geopolitical record and the war log say. What is NOT known to an observer, the forces on each side, is not shown: for a theatre the company is in, its own
// battalions are listed and the operational map (with its fog of war) is one tap away.
import { peekMilitary } from './state.js';
import { atlasTheatres, atlasStates } from '../world/atlas.js';
import { provinces } from '../world/provinces.js';
import { profileOf } from './strategicAI.js';

const countryName = (g, c) => g.content.arms.countries[c]?.name || c;
const warEvents = (g) => (g.corp?.geo?.peek?.()?.events || []).filter((e) => e.kind === 'war');
const warBetween = (g, a, b) => warEvents(g).find((e) => e.status === 'active' && e.parties.includes(a) && e.parties.includes(b)) || null;
const stateName = (id) => atlasStates().find((s) => s.id === id)?.name || id;
const ctl = (g) => { const c = peekMilitary(g)?.war?.control || {}; return (p) => c[p.id] ?? p.country; };

/** Every theatre with its status and a one-line situation, for the selection cards. */
export function theatreList(g) {
  const w = peekMilitary(g)?.war; const P = provinces(); const C = ctl(g);
  return atlasTheatres().filter((t) => t.between.length === 2).map((t) => {
    const [a, b] = t.between; const inT = P.filter((p) => t.states.includes(p.state)); const ev = warBetween(g, a, b);
    const held = { [a]: 0, [b]: 0, other: 0 }; for (const p of inT) { const c = C(p); if (c === a || c === b) held[c]++; else held.other++; }
    const fronts = frontsOf(g, t, inT, C).length; const land = t.kind.split(/\s*\+\s*/).includes('land');
    const lastEv = (ev?.timeline || []).slice(-1)[0];
    const status = ev ? 'At war' : land ? 'Contested ground' : 'Tension';
    return { id: t.id, name: t.name, between: t.between, names: t.between.map((c) => countryName(g, c)), kind: t.kind, note: t.note, region: [...new Set(t.states.map((s) => stateName(s)))].slice(0, 4).join(', '), status, war: ev, hot: Boolean(ev) || land, provinces: inT.length, fronts, held, involved: w?.employer?.theatre === t.id, recent: lastEv ? lastEv.text : land ? 'No recorded fighting; the ground is contested.' : 'No recorded developments.', states: t.states };
  });
}

/** The fronts of a theatre: clusters of provinces held by one belligerent that touch ground held by the other. */
function frontsOf(g, t, inT, C) {
  const [a, b] = t.between; const byN = new Map(inT.map((p) => [p.n, p])); const P = provinces();
  const front = new Set();
  for (const p of inT) { const c = C(p); if (c !== a && c !== b) continue; for (const q of p.neighbours) { const pq = byN.get(q) || P[q]; if (!pq || !t.states.includes(pq.state)) continue; const cq = C(pq); if ((c === a && cq === b) || (c === b && cq === a)) { front.add(p.n); front.add(q); } } }
  const seen = new Set(); const out = [];
  for (const n of front) {
    if (seen.has(n)) continue; const comp = []; const stack = [n]; seen.add(n);
    while (stack.length) { const x = stack.pop(); comp.push(x); for (const y of P[x].neighbours) if (front.has(y) && !seen.has(y)) { seen.add(y); stack.push(y); } }
    out.push(comp);
  }
  return out.sort((x, y) => y.length - x.length);
}

/** The whole picture of one theatre: provinces with their holders, cities, fronts with their numbers, the company's part, and the record. */
export function theatreDetail(g, id) {
  const t = atlasTheatres().find((x) => x.id === id); if (!t || t.between.length !== 2) return null;
  const [a, b] = t.between; const P = provinces(); const inT = P.filter((p) => t.states.includes(p.state)); const C = ctl(g); const w = peekMilitary(g)?.war; const C0 = peekMilitary(g)?.company;
  const sum = theatreList(g).find((x) => x.id === id);
  const fr = frontsOf(g, t, inT, C).map((comp, i) => {
    const ps = comp.map((n) => P[n]); const held = { [a]: ps.filter((p) => C(p) === a).length, [b]: ps.filter((p) => C(p) === b).length };
    const sa = {}; for (const p of ps) sa[p.state] = (sa[p.state] || 0) + 1; const top = Object.entries(sa).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([s]) => stateName(s));
    const changed = ps.filter((p) => w?.flipped?.[p.id] != null).map((p) => ({ name: p.name, day: w.flipped[p.id], to: C(p) }));
    const battles = (C0?.engagements || []).filter((e) => e.strategic && e.result && ps.some((p) => p.id === e.strategic.province)).map((e) => ({ title: e.title, day: e.ended, outcome: e.result.outcome }));
    const imp = ps.reduce((s, p) => s + p.vp + (p.port ? 2 : 0) + (p.capital ? 3 : 0) + (p.fort || 0), 0);
    return { id: `f${i + 1}`, name: top.length ? `${top.join(' / ')} front` : `Front ${i + 1}`, provinces: comp, size: comp.length, held, importance: imp, infra: Math.round((ps.reduce((s, p) => s + p.infra, 0) / ps.length) * 10) / 10, changed: changed.sort((x, y) => y.day - x.day), battles, momentum: changed.length ? `${changed.length} province${changed.length === 1 ? '' : 's'} changed hands (the war record)` : 'No change of hands recorded' };
  });
  const cities = inT.filter((p) => p.capital || p.port || p.vp >= 2).map((p) => ({ n: p.n, name: p.name, lat: p.lat, lon: p.lon, capital: p.capital, port: p.port, vp: p.vp, holder: C(p), own: p.country })).sort((x, y) => (y.capital - x.capital) || y.vp - x.vp).slice(0, 14);
  const ev = warBetween(g, a, b);
  const mine = t.id === w?.employer?.theatre ? (w.battalions || []).filter((x) => x.status !== 'home').map((x) => ({ id: x.id, name: x.name, status: x.status, at: P[Number(x.pos)]?.name || x.pos })) : [];
  return { ...sum, th: { id: t.id, name: t.name, states: t.states, between: t.between }, provincesList: inT, fronts: fr, cities, mine, war: ev, timeline: (ev?.timeline || []).slice().reverse(), log: t.id === w?.employer?.theatre ? (w.log || []).slice().reverse() : [],
    profiles: t.between.map((c) => ({ id: c, name: countryName(g, c), ...profileOf(c), income: g.content.arms.countries[c]?.income ?? null })),
    avgInfra: inT.length ? Math.round((inT.reduce((s, p) => s + p.infra, 0) / inT.length) * 10) / 10 : 0, ports: inT.filter((p) => p.port).length, airfields: inT.filter((p) => p.airfield).length };
}

/** The front lines of every theatre as short segments between a province and the enemy-held one beside it: [{ theatre, war, a: [lat, lon], b: [lat, lon] }]. For drawing on the world map. */
export function frontLines(g) {
  const C = ctl(g); const P = provinces(); const out = [];
  for (const t of atlasTheatres().filter((x) => x.between.length === 2)) {
    const [a, b] = t.between; const war = Boolean(warBetween(g, a, b));
    for (const p of P) { if (!t.states.includes(p.state) || C(p) !== a) continue; for (const q of p.neighbours) { const pq = P[q]; if (t.states.includes(pq.state) && C(pq) === b) out.push({ theatre: t.id, war, a: [p.lat, p.lon], b: [pq.lat, pq.lon] }); } }
  }
  return out;
}

/** The provinces of each theatre as lat/lon points, with whether it is at war: the conflict zones of the world map. */
export function theatreZones(g) {
  const P = provinces();
  return atlasTheatres().filter((x) => x.between.length === 2).map((t) => { const pts = P.filter((p) => t.states.includes(p.state)).map((p) => [p.lat, p.lon]); const la = pts.reduce((s, q) => s + q[0], 0) / (pts.length || 1); const lo = pts.reduce((s, q) => s + q[1], 0) / (pts.length || 1); const land = t.kind.split(/\s*\+\s*/).includes('land'); return { id: t.id, name: t.name, between: t.between, war: Boolean(warBetween(g, t.between[0], t.between[1])), land, pts, centre: [la, lo] }; });
}
