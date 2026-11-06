// Supply, weather and intelligence on the strategic map (v0.103.1). Pure functions over the provinces and a `ctl(province)` that says who holds each one; nothing here is saved (it is
// recomputed from the ground, the day and the battalions, and cached for the hour).
//
//   weatherOf(province, day)                  → 'clear' | 'rain' | 'mud' | 'snow' | 'heat': regional (a 4-degree cell shares it), changing every three days, by latitude, season and ground
//   supplyMap(provinces, ctl, side, day)      → Float32Array (by province number): 0 to 100, how much of what an army needs reaches that province from the side's hubs
//   intelMap(provinces, ctl, side, sources)   → Uint8Array: 2 known, 1 spotted, 0 unseen
//   estimate(real, level, key)                → what a report says of a number at that level of intel (wide of the mark when unseen: the screen shows a question mark)
// A hub is a province of the side's with a port or a capital; supply flows out of it by neighbours, losing more across poor infrastructure, rough ground and bad weather, and less along a railway.
// Supply only WEAKENS (an army cut off fights badly and recovers slowly; it is never stopped).
import { WEATHER, SUPPLY, INTEL } from '../content/strategic.js';

const unit = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

export function weatherOf(p, day) {
  const cell = `${Math.floor(p.lat / 4)}|${Math.floor(p.lon / 4)}`; const win = Math.floor(day / 3);
  const lat = Math.abs(p.lat); const phase = Math.sin(((day % 120) / 120) * 2 * Math.PI); const winter = p.lat >= 0 ? -phase : phase; // +1 deep winter, -1 high summer (the southern hemisphere is the other way)
  const wet = (p.terrain === 'marsh' || p.terrain === 'jungle' ? 0.12 : p.terrain === 'forest' ? 0.06 : 0) + (p.coast ? 0.05 : 0);
  const u = unit(`wx|${cell}|${win}`); const prev = unit(`wx|${cell}|${win - 1}`);
  const cold = lat > 52 ? 0.55 + 0.45 * winter : lat > 38 ? 0.3 * winter + 0.1 : 0;
  if (cold > 0.55 && u < 0.45) return 'snow';
  if (u < 0.2 + wet) return prev < 0.2 + wet && cold < 0.55 ? 'mud' : 'rain';
  if (lat < 32 && winter < -0.3 && (p.terrain === 'desert' || p.terrain === 'plains') && u > 0.6) return 'heat';
  return 'clear';
}

const CACHE = new Map();
export function supplyMap(P, ctl, side, day, hubOf = (p) => p.port || p.capital) {
  const own = P.map((p) => ctl(p) === side); const key = `${side}|${day}|${own.map((x) => (x ? 1 : 0)).join('')}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const lvl = new Float32Array(P.length); const open = [];
  P.forEach((p, n) => { if (own[n] && hubOf(p)) { lvl[n] = SUPPLY.hub; open.push(n); } });
  while (open.length) {
    open.sort((a, b) => lvl[b] - lvl[a]); const c = open.shift(); const pc = P[c];
    for (const q of pc.neighbours) {
      if (!own[q]) continue; const pq = P[q]; const w = WEATHER[weatherOf(pq, day)];
      const loss = SUPPLY.loss[pq.infra] * (pc.rail.includes(q) ? SUPPLY.rail : pc.road.includes(q) ? SUPPLY.road : SUPPLY.trackless) * (SUPPLY.ground[pq.terrain] ?? 1) * w.flow;
      const v = lvl[c] - loss; if (v > lvl[q]) { lvl[q] = v; open.push(q); }
    }
  }
  if (CACHE.size > 8) CACHE.delete(CACHE.keys().next().value); CACHE.set(key, lvl); return lvl;
}

/** `sources`: [{ n: province number, known: steps, spotted: steps }]: what each of your battalions and allied formations sees round it. Ground you hold is known. */
export function intelMap(P, ctl, side, sources) {
  const out = new Uint8Array(P.length);
  P.forEach((p, n) => { if (ctl(p) === side) out[n] = 2; });
  for (const s of sources) {
    const dist = new Map([[s.n, 0]]); const q = [s.n];
    while (q.length) { const c = q.shift(); const d = dist.get(c); if (d >= Math.max(s.known, s.spotted)) continue; for (const k of P[c].neighbours) if (!dist.has(k)) { dist.set(k, d + 1); q.push(k); } }
    for (const [n, d] of dist) { const v = d <= s.known ? 2 : d <= s.spotted ? 1 : 0; if (v > out[n]) out[n] = v; }
  }
  return out;
}

export function estimate(real, level, key) {
  const err = level >= 2 ? INTEL.error[2] : level === 1 ? INTEL.error[1] : INTEL.error[0];
  return Math.max(0, Math.round(real * (1 + (unit(`est|${key}`) - 0.5) * 2 * err)));
}
