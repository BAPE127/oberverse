// What a side knows (rules 5): contacts, never the truth. A contact is { id, x, y, t, vis, heard, kind, role, conf }: an enemy SEEN (vis while it is in sight, then its last-known place ageing),
// or a HEARD place (gunfire, a blast, an engine, a rotor; its position is off by an error that grows with distance, from the keyed `chance`). The player's side also takes what a scout drone, a
// designation and the intel level of the province give (B.spotted), as before. The enemy's mind (src/battle/ai.js) reads only this.
import { PER, TICK } from '../content/battle.js';
import { unit as chance } from './hash.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function initPerception(B) { B.per = { p: new Map(), e: new Map() }; B.soundBuf = []; B.hseq = 0; }
/** A sound is made: (x, y, loud = tiles it carries, side = who made it, null for a blast that is nobody's, kind). */
export function sound(B, x, y, loud, side, kind = 'shot') { if (B.rules >= 5 && B.soundBuf.length < 120) B.soundBuf.push({ x, y, loud, side, kind }); }
export const loudOf = (key) => PER.loud[key] ?? PER.loud.default;

/**
 * One pass a tick: a fifth of the units look (staggered, as the old target decisions were); what they see becomes a contact; a contact a unit looked at from close by and did not find is
 * cleared; every `PER.every` ticks the sounds of those ticks are heard and the contacts age. `X.visible(B, u, e)` is the simulation's own sight rule.
 */
export function updatePerception(B, X) {
  const T = B.tick; const phase = T % PER.every;
  B.units.forEach((u, i) => {
    if (i % PER.every !== phase || !u.alive || u.fled || u.inside) return;
    const m = B.per[u.side]; const seen = [];
    for (const e of B.units) {
      if (e.side === u.side || !e.alive || e.fled || e.hidden) continue;
      if (!X.visible(B, u, e)) continue;
      seen.push(e.id); m.set(e.id, { id: e.id, x: e.x, y: e.y, t: T, vis: true, heard: false, kind: e.kind, role: e.role, vtype: e.vtype || null, armed: e.W.range > 0, conf: 1 });
    }
    u.seen = seen;
    for (const [k, c] of m) if (c.t < T - 1 && dist(c, u) <= PER.clearR && !seen.includes(k)) m.delete(k); // (he looked where it was, and it is not there)
  });
  if (phase === 0) {
    for (const side of ['p', 'e']) {
      const m = B.per[side];
      if (side === 'p') for (const [id, at] of Object.entries(B.spotted)) { const e = B.byId.get(id); if (e && e.alive && !e.fled && !e.hidden && T - at <= PER.every * 2) m.set(id, { id, x: e.x, y: e.y, t: at, vis: T - at <= PER.every, heard: false, kind: e.kind, role: e.role, vtype: e.vtype || null, armed: e.W.range > 0, conf: 0.9 }); }
      for (const [k, c] of m) { const age = (T - c.t) / TICK.perSecond; const lim = c.heard ? PER.heardFade : PER.fade; c.vis = c.vis && T - c.t <= PER.every * 2; c.conf = Math.max(0, (c.heard ? 0.4 : 1) * (1 - age / lim)); if (age > lim) m.delete(k); }
    }
    hear(B);
  }
}

function hear(B) {
  const T = B.tick; const snd = B.soundBuf.slice(0, 40); B.soundBuf.length = 0;
  snd.forEach((s, i) => {
    for (const side of ['p', 'e']) {
      if (s.side === side) continue;
      let best = 1e9; for (const u of B.units) if (u.side === side && u.alive && !u.fled) { const d = Math.hypot(u.x - s.x, u.y - s.y); if (d < best) best = d; }
      if (best > s.loud) continue;
      const m = B.per[side]; const a = chance(`${B.key}|${T}|hear|${i}|${side}|a`) * Math.PI * 2; const r = (0.5 + (best / s.loud) * PER.err) * chance(`${B.key}|${T}|hear|${i}|${side}|r`);
      const x = s.x + Math.cos(a) * r; const y = s.y + Math.sin(a) * r;
      let near = null; for (const c of m.values()) if (Math.hypot(c.x - x, c.y - y) <= PER.mergeR && (c.vis || c.heard)) { near = c; break; }
      if (near) { if (near.heard) { near.x = (near.x + x) / 2; near.y = (near.y + y) / 2; near.t = T; } continue; }
      const id = `h${B.hseq++}`; m.set(id, { id, x, y, t: T, vis: false, heard: true, kind: s.kind, role: null, armed: true, conf: 0.4 });
      let n = 0; for (const c of m.values()) if (c.heard) n++;
      if (n > PER.cap) { let old = null; for (const [k, c] of m) if (c.heard && (!old || c.t < m.get(old).t)) old = k; m.delete(old); }
    }
  });
}

/** The side's contacts as an array. */
export const contactsOf = (B, side) => (B.per ? [...B.per[side].values()] : []);
export function nearestContact(B, side, p, filter = null) { let best = null; let bd = 1e9; for (const c of contactsOf(B, side)) { if (filter && !filter(c)) continue; const d = dist(c, p); if (d < bd) { bd = d; best = c; } } return best; }
