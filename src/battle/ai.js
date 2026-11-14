// The minds of a side that is not being played (rules 5): the enemy, and your own force in a headless battle. It acts only on what the side PERCEIVES (src/battle/perception.js: contacts seen, last known
// and heard), never on where the other side really is. A force is grouped into elements (its teams, src/battle/teams.js) and each picks a behaviour from the situation:
//   defend    garrison a strongpoint, windows facing the threat (machine guns on the lanes, marksmen high, anti-tank on the road); patrol a round of the objective until something happens
//   investigate  go and look at a place a sound came from
//   advance   go forward by bounds (half moves while half covers) along the covered route, from cover to cover
//   flank     round the side of a contact that is not moving, by the covered way, then in
//   fallback  back to the next position when hurt or pinned, rather than die in place
//   counter   retake lost ground; vehicles stay with the infantry and keep their front to the threat
// `X` is the simulation's own rules passed in (setOrder, standNear, spread...), so this file does not import the simulation.
import { contactsOf, nearestContact } from './perception.js';
import { los, canStand, findPath } from './nav.js';
import { idx, inb, tileAt } from './map.js';
import { AI, OBJECTIVE, TICK, SUPPRESS, TILE, SUPPORT, UAV } from '../content/battle.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const sec = (n) => n * TICK.perSecond;
const living = (B, el) => el.members.map((m) => B.byId.get(m)).filter((u) => u && u.alive && !u.fled && !u.inside);
const mid = (us) => ({ x: us.reduce((a, u) => a + u.x, 0) / (us.length || 1), y: us.reduce((a, u) => a + u.y, 0) / (us.length || 1) });
const kindOf = (u) => (u.kind === 'inf' ? 'inf' : u.kind === 'helicopter' ? 'heli' : 'veh');

// ---- what a known contact can see: ground it covers costs more to cross (a cost grid for the path-finder), made from the contacts only
export function exposureGrid(B, side, near = null) {
  B.expo ||= {}; const T = B.tick; const cs = contactsOf(B, side).filter((c) => !c.heard && c.armed !== false && T - c.t < sec(10));
  if (!cs.length) return null;
  const key = cs.map((c) => `${c.id}:${Math.round(c.x / 2)},${Math.round(c.y / 2)}`).join('|');
  const cur = B.expo[side]; if (cur && cur.key === key && T - cur.t < sec(AI.exposure.refresh)) return cur.g;
  const m = B.map; const g = new Float32Array(m.w * m.h); const R = AI.exposure.range;
  const list = near ? cs.sort((a, b) => dist(a, near) - dist(b, near)).slice(0, AI.exposure.contacts) : cs.slice(0, AI.exposure.contacts);
  for (const c of list) for (let j = Math.max(0, Math.floor(c.y - R)); j <= Math.min(m.h - 1, Math.floor(c.y + R)); j++) for (let i = Math.max(0, Math.floor(c.x - R)); i <= Math.min(m.w - 1, Math.floor(c.x + R)); i++) {
    if (Math.hypot(i + 0.5 - c.x, j + 0.5 - c.y) > R) continue; const n = idx(m, i, j); if (g[n] >= AI.exposure.cap) continue;
    const t = m.tiles[n]; if (t === TILE.WALL || t === TILE.TREE || t === TILE.WATER) continue;
    if (los(m, c.x, c.y, 0, i + 0.5, j + 0.5, 0)) g[n] = Math.min(AI.exposure.cap, g[n] + AI.exposure.cost);
  }
  B.expo[side] = { key, t: T, g }; return g;
}

// ---- the lay of the ground, once
function init(B, side, X) {
  const m = B.map; const obj = m.objective; const foeSpawn = side === 'e' ? m.spawns.p : m.spawns.e; const ownSpawn = side === 'e' ? m.spawns.e : m.spawns.p;
  const attacking = ((B.goal === 'offence' || B.goal === 'raid') && side === 'p') || (B.goal === 'defence' && side === 'e');
  const ax = foeSpawn.x - obj.x; const ay = foeSpawn.y - obj.y; const al = Math.hypot(ax, ay) || 1; const ux = ax / al; const uy = ay / al; // (the way the attack comes: from where the other side starts)
  const lanes = AI.lane.flatMap((d) => [-1, 0, 1].map((k) => ({ x: Math.max(1, Math.min(m.w - 2, obj.x + ux * d - uy * k * 8)), y: Math.max(1, Math.min(m.h - 2, obj.y + uy * d + ux * k * 8)) }))).slice(0, 5);
  const sps = [];
  for (const b of m.buildings.slice().sort((a, c) => dist({ x: a.x + a.w / 2, y: a.y + a.h / 2 }, obj) - dist({ x: c.x + c.w / 2, y: c.y + c.h / 2 }, obj))) { if (dist({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, obj) > 24 || sps.length >= 6) break; sps.push({ kind: 'building', b: b.id, x: b.door.x + 0.5, y: b.door.y + 1.5, floors: b.floors, c: { x: b.x + b.w / 2, y: b.y + b.h / 2 } }); }
  let tr = 0; for (let j = Math.floor(obj.y - 16); j <= obj.y + 16 && tr < 6; j += 2) for (let i = Math.floor(obj.x - 16); i <= obj.x + 16 && tr < 6; i += 2) if (inb(m, i, j) && m.tiles[idx(m, i, j)] === TILE.TRENCH && !sps.some((s) => s.kind === 'trench' && dist(s, { x: i, y: j }) < 6)) { sps.push({ kind: 'trench', x: i + 0.5, y: j + 0.5 }); tr++; }
  const ring = []; for (let k = 0; k < 6; k++) { const a = Math.atan2(uy, ux) + (k - 2.5) * 0.6; const p = X.standNear(B, obj.x + Math.cos(a) * 7, obj.y + Math.sin(a) * 7, 'inf'); if (p) ring.push({ kind: 'cover', x: p.x, y: p.y }); }
  if (sps.length < 4) sps.push(...ring);
  const rear = X.standNear(B, obj.x - ux * 9, obj.y - uy * 9, 'veh') || { x: obj.x, y: obj.y };
  const falls = sps.slice().sort((a, c) => dist(c, foeSpawn) - dist(a, foeSpawn)).map((s) => ({ x: s.x, y: s.y })); falls.push({ x: ownSpawn.x, y: ownSpawn.y });
  return { side, attacking, ux, uy, lanes, sps, ring, rear, falls, n: 0, inv: new Map(), batT: -9999, zoneLost: false };
}

const give = (B, X, el, us, type, x, y, opts = {}, kind = 'line', pen = null) => {
  const A = el.ai; const c = A.cmd;
  if (c && c.type === type && Math.hypot(c.x - x, c.y - y) < 2.5 && us.some((u) => u.order.type !== 'hold' || u.path.length)) return false; // (it is already on its way)
  A.cmd = { type, x, y };
  const spots = us.length > 1 && us[0].kind === 'inf' ? X.spread(B, us, x, y, kind) : us.map((u) => [u, { x, y }]);
  for (const [u, at] of spots) { u.pen = pen; X.setOrder(B, u, { type, x: at.x, y: at.y, ...opts }); }
  return true;
};

/** The best cover within `r` of a point (tile centres a person can stand on, not in a building), judged against where the threat is. */
function coverNear(B, X, p, r, face) {
  let best = null; let bs = -1;
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const tx = Math.floor(p.x) + i; const ty = Math.floor(p.y) + j; if (!canStand(B.map, tx, ty, 'inf') || B.map.bid[idx(B.map, tx, ty)] >= 0 || tileAt(B.map, tx, ty) === TILE.WIRE) continue; const sc = X.coverFor(B, { x: tx + 0.5, y: ty + 0.5, z: 0, kind: 'inf' }, face) - 0.015 * Math.hypot(i, j); if (sc > bs) { bs = sc; best = { x: tx + 0.5, y: ty + 0.5 }; } }
  return best || X.standNear(B, p.x, p.y, 'inf');
}

/** A way point `len` tiles along the covered route from `from` to `to`, brought to the best cover near it. */
function wayPoint(B, X, from, to, len, pen, face) {
  const path = findPath(B.map, from, to, 'inf', pen ? { penalty: pen } : null); if (!path.length) return null;
  const wp = path[Math.min(path.length - 1, len)]; return path.length <= len ? { x: to.x, y: to.y, last: true } : { ...coverNear(B, X, wp, 2, face), last: false };
}

// ---- the enemy's plan before the first tick: where it stands
export function planEnemy(B, X) {
  const S = (B.ai5 ||= {}).e ||= init(B, 'e', X); if (S.attacking) return; // (an attacker starts at its entry)
  const els = (B.teams || []).filter((t) => t.side === 'e' && t.kind === 'inf'); const sps = S.sps.filter((s) => s.kind !== 'cover' || S.sps.length < 4 || true);
  els.forEach((el, i) => {
    const sp = sps[i % Math.max(1, sps.length)]; if (!sp) return; el.ai = { mode: 'defend', since: 0, sp, cmd: null, cool: {} };
    const us = el.members.map((m) => B.byId.get(m)).filter(Boolean); const spots = X.spread(B, us, sp.x, sp.y, AI.spread);
    for (const [u, at] of spots) { u.x = at.x; u.y = at.y; u.path = []; }
  });
  for (const t of (B.teams || []).filter((q) => q.side === 'e' && q.kind === 'veh')) { const u = B.byId.get(t.members[0]); if (u.battery || u.speed === 0) continue; const at = X.standNear(B, S.rear.x + (t.members[0].length % 5) * 2.5, S.rear.y + 1, 'veh'); if (at && u.kind !== 'helicopter') { u.x = at.x; u.y = at.y; } }
}

// ---- the mind itself: every AI.every ticks
export function runAI(B, side, X) {
  const S = ((B.ai5 ||= {})[side] ||= init(B, side, X)); const T = B.tick; const isVeh = X.isVeh;
  const obj = B.map.objective; const exit = B.map.exit;
  const legacy = side === 'p' && (B.goal === 'extract' || B.goal === 'rescue' || B.goal === 'logistics');
  const mine = B.units.filter((u) => u.side === side && u.alive && !u.fled);
  if (side === 'p' && B.reserve.length && B.reserveAt === null && T >= 300) X.callReserve(B, true);
  if (legacy) { legacyP(B, X, mine, S); return; }
  const cs = contactsOf(B, side); const seenC = cs.filter((c) => !c.heard && c.armed !== false && T - c.t <= sec(20)); const visC = seenC.filter((c) => c.vis);
  const heardC = cs.filter((c) => c.heard && T - c.t <= sec(AI.investigate.maxAge));
  for (const c of cs) { if (c.sx === undefined || Math.hypot(c.x - c.sx, c.y - c.sy) > 1.5) { c.sx = c.x; c.sy = c.y; c.st = T; } } // (how long it has stayed where it is)
  const pen = visC.length ? exposureGrid(B, side) : null;
  const els = (B.teams || []).filter((t) => t.side === side && t.kind === 'inf' && living(B, t).length);
  for (const el of els) el.ai ||= { mode: null, since: T, cmd: null, cool: {}, n0: living(B, el).length };
  // zone: our ground lost? (only what we perceive of it)
  const ownIn = mine.filter((u) => X.onGround(u) && dist(u, obj) <= OBJECTIVE.zone).length; const foeIn = seenC.filter((c) => c.vis && dist(c, obj) <= OBJECTIVE.zone + 2).length;
  S.zoneLost = !S.attacking && ownIn === 0 && foeIn > 0;
  // blast awareness: a recent blast near spreads the force out
  const scatter = cs.some((c) => c.heard && c.kind === 'blast' && T - c.t <= sec(AI.blast.seconds) && els.some((e) => dist(c, mid(living(B, e))) <= AI.blast.r));
  const fmt = scatter ? 'skirmish' : 'line';
  // sounds: one element goes to look at each heard place that nobody has been sent to
  for (const [k, e] of S.inv) { const el = els.find((q) => q.id === e); if (!el || el.ai.mode !== 'investigate') S.inv.delete(k); }
  for (const c of heardC) {
    if (S.inv.has(c.id) || S.inv.size >= Math.max(1, Math.ceil(els.length / AI.investigate.share))) continue;
    let best = null; let bd = AI.investigate.range;
    for (const el of els) { const A = el.ai; if (!(A.mode === 'defend' || A.mode === 'patrol' || A.mode === null)) continue; const us = living(B, el); if (us.length < 2 || us.some((u) => u.state === 'pinned') || visC.some((v) => dist(v, mid(us)) < 20)) continue; const d = dist(mid(us), c); if (d < bd && d >= AI.investigate.minRange) { bd = d; best = el; } }
    if (best) { const A = best.ai; A.prev = A.mode; A.mode = 'investigate'; A.since = T; A.cmd = null; A.tgt = { x: c.x, y: c.y, id: c.id }; S.inv.set(c.id, best.id); B.stats.investigations++; }
  }
  // each infantry element
  els.forEach((el, i) => {
    const A = el.ai; const us = living(B, el); if (!us.length) return; const c0 = mid(us); const n = us.length; A.n0 = Math.max(A.n0 || 0, n);
    const avgSupp = us.reduce((a, u) => a + u.supp, 0) / n; const losses = 1 - n / Math.max(1, A.n0);
    let near = null; let nd = 1e9; for (const c of seenC) { const d = dist(c, c0); if (d < nd) { nd = d; near = c; } }
    const fighting = near && nd < 26 && (near.vis || T - near.t < sec(8));
    if (!A.mode) { A.mode = S.attacking ? 'advance' : (S.sps.length && !(els.length >= 3 && i % AI.patrol.share === AI.patrol.share - 1) ? 'defend' : 'patrol'); A.sp ||= S.sps[i % Math.max(1, S.sps.length)]; A.since = T; }
    const face = near || (side === 'e' ? B.map.spawns.p : B.map.spawns.e);
    // ---- fall back
    if (A.mode === 'fallback') { if (avgSupp < AI.fallback.recover && (!fighting || nd > 18) || T - A.since > sec(40)) { A.mode = S.attacking ? 'advance' : 'defend'; A.cmd = null; A.since = T; A.cool.fallback = T + sec(AI.fallback.cooldown); } }
    else if (fighting && (!A.cool.fallback || T > A.cool.fallback) && (avgSupp >= AI.fallback.supp || (losses >= AI.fallback.loss && n <= Math.ceil(A.n0 / 2)))) {
      const from = c0; const pt = S.falls.find((p) => dist(p, near) > nd + 6 && dist(p, from) > AI.fallback.dist) || S.falls[S.falls.length - 1];
      A.prev = A.mode; A.mode = 'fallback'; A.since = T; A.cmd = null; A.fb = pt; B.stats.fallbacks++; X.shout(B, us[0], 'retreat');
    }
    // ---- counter-attack
    if (A.mode !== 'fallback' && A.mode !== 'counter' && (S.zoneLost || A.lost) && n >= AI.counter.minStrength && avgSupp < AI.counter.suppMax && (!A.cool.counter || T > A.cool.counter) && !S.attacking) { A.prev = A.mode; A.mode = 'counter'; A.since = T; A.cmd = null; A.tgt = { x: obj.x, y: obj.y }; B.stats.counters++; }
    if (A.mode === 'counter' && (T - A.since > sec(AI.counter.timeout) || (!S.zoneLost && dist(c0, obj) < 6))) { A.mode = A.prev || 'defend'; A.cmd = null; A.cool.counter = T + sec(AI.counter.cooldown); }
    // ---- flank a contact that is not moving
    if ((A.mode === 'advance' || A.mode === 'defend' || A.mode === 'patrol') && n >= 2 && (!A.cool.flank || T > A.cool.flank)) {
      const fixing = els.some((o) => o !== el && o.ai.mode !== 'fallback' && living(B, o).some((u) => u.target && B.byId.get(u.target)?.alive));
      const pinned = visC.find((c) => T - c.st >= sec(AI.flank.still) && dist(c, c0) >= AI.flank.minRange && dist(c, c0) <= AI.flank.maxRange);
      if (fixing && pinned && A.mode === 'advance') { const f = planFlank(B, X, us, c0, pinned, pen); if (f) { A.prev = A.mode; A.mode = 'flank'; A.since = T; A.cmd = null; A.fl = f; B.stats.flanks++; } else A.cool.flank = T + sec(10); }
    }
    if (A.mode === 'flank' && (T - A.since > sec(AI.flank.timeout) || !A.fl)) { A.mode = A.prev || 'advance'; A.cmd = null; A.cool.flank = T + sec(AI.flank.cooldown); }
    // ---- execute
    switch (A.mode) {
      case 'fallback': give(B, X, el, us, 'move', A.fb.x, A.fb.y, {}, 'skirmish', null); break;
      case 'investigate': {
        const t = A.tgt; const gone = !contactsOf(B, side).some((c) => c.id === t.id); const arrived = dist(c0, t) < 7;
        if (gone || arrived || T - A.since > sec(AI.investigate.timeout) || fighting) { A.mode = A.prev || 'defend'; A.cmd = null; S.inv.delete(t.id); break; }
        give(B, X, el, us, 'amove', t.x, t.y, {}, fmt, pen); break;
      }
      case 'counter': give(B, X, el, us, 'amove', A.tgt.x, A.tgt.y, {}, fmt, pen); smokeFor(B, X, el, us, near, nd); break;
      case 'flank': {
        const f = A.fl;
        if (f.stage === 'out') { if (dist(c0, f.wp) < 4 || T - f.t0 > sec(30)) { f.stage = 'in'; A.cmd = null; } else { give(B, X, el, us, 'move', f.wp.x, f.wp.y, {}, 'skirmish', f.pen); break; } }
        const tgt = visC.find((c) => c.id === f.cid) || seenC.find((c) => c.id === f.cid); const to = tgt || f.dest; give(B, X, el, us, 'amove', to.x, to.y, {}, fmt, pen);
        if (dist(c0, to) < 5 && !tgt) { A.mode = A.prev || 'advance'; A.cmd = null; }
        break;
      }
      case 'advance': advance(B, X, el, us, c0, near, nd, pen, face, fmt, S); smokeFor(B, X, el, us, near, nd); break;
      case 'patrol': patrol(B, X, el, us, c0, S, face); break;
      case 'defend': defend(B, X, el, us, c0, S, face, fmt); break;
      default: break;
    }
    // a strongpoint lost to a contact: retake it (the element is told on its next look)
    A.lost = A.sp && A.sp.kind === 'building' && seenC.some((c) => c.vis && dist(c, A.sp.c) < 3) && ownCount(B, side, A.sp.c, 4) === 0;
  });
  // vehicles and the rest
  for (const t of (B.teams || []).filter((q) => q.side === side && q.kind === 'veh')) { const u = B.byId.get(t.members[0]); if (!u || !u.alive || u.fled || u.broken || u.battery || u.order.type === 'retreat') continue; t.ai ||= { cmd: null, cool: {} }; vehicle(B, X, t, u, els, S, seenC, visC, cs, pen); }
  if (side === 'e') shell(B, X, S, visC, mine);
}
const ownCount = (B, side, p, r) => B.units.filter((u) => u.side === side && u.alive && !u.fled && u.kind === 'inf' && dist(u, p) <= r).length;

/** Plan a flank round a contact: a point `offset` tiles to one side, by the way that is least in its sight; null if none. */
function planFlank(B, X, us, c0, c, pen) {
  const dx = c.x - c0.x; const dy = c.y - c0.y; const l = Math.hypot(dx, dy) || 1; const vx = dx / l; const vy = dy / l; let best = null;
  for (const sgn of [1, -1]) {
    const raw = { x: c.x - vy * sgn * AI.flank.offset - vx * 2, y: c.y + vx * sgn * AI.flank.offset - vy * 2 }; const wp = X.standNear(B, Math.max(1, Math.min(B.map.w - 2, raw.x)), Math.max(1, Math.min(B.map.h - 2, raw.y)), 'inf'); if (!wp) continue;
    const path = findPath(B.map, c0, wp, 'inf', pen ? { penalty: pen } : null); if (!path.length) continue;
    let cost = path.length * 0.05; if (pen) for (const p of path) cost += pen[idx(B.map, Math.floor(p.x), Math.floor(p.y))]; if (los(B.map, c.x, c.y, 0, wp.x, wp.y, 0)) cost += 6;
    if (!best || cost < best.cost) best = { wp, cost };
  }
  return best ? { wp: best.wp, cid: c.id, dest: { x: c.x, y: c.y }, stage: 'out', t0: B.tick, pen } : null;
}

/** Advance toward the objective or the nearest known contact: together while nothing is near, by bounds (half moves, half covers) when the enemy is. */
function advance(B, X, el, us, c0, near, nd, pen, face, fmt, S) {
  const A = el.ai; const obj = B.map.objective; const goal = near && nd < 30 ? near : (dist(c0, obj) > 5 ? obj : (near || searchPoint(B, S, el)));
  if (!goal) return;
  if (!near || nd > AI.bound.near) { // nothing near: on together, from cover to cover
    const wp = wayPoint(B, X, c0, goal, AI.advanceLen, pen, face); if (wp) give(B, X, el, us, 'amove', wp.x, wp.y, {}, fmt, pen); return;
  }
  // bounds: half goes, half covers; swap when the movers arrive or after a few seconds
  A.bd ||= { phase: 0, until: B.tick + sec(7) };
  const halves = [us.filter((_, k) => k % 2 === 0), us.filter((_, k) => k % 2 === 1)]; const mov = halves[A.bd.phase]; const cov = halves[1 - A.bd.phase];
  const arrived = mov.length === 0 || mov.every((u) => !u.path.length && u.order.type !== 'move') ;
  if (B.tick >= A.bd.until || (arrived && B.tick > A.bd.until - sec(5))) { A.bd.phase = 1 - A.bd.phase; A.bd.until = B.tick + sec(7); A.cmd = null; B.stats.bounds++; }
  const m2 = halves[A.bd.phase]; const c2 = halves[1 - A.bd.phase];
  const wp = wayPoint(B, X, mid(m2.length ? m2 : us), goal, AI.bound.len, pen, face);
  for (const u of c2) if (u.order.type !== 'hold') { X.setOrder(B, u, { type: 'hold' }); u.path = []; }
  if (wp && m2.length) { const k = m2.length > 1 ? X.spread(B, m2, wp.x, wp.y, 'skirmish') : [[m2[0], wp]]; for (const [u, at] of k) if (u.order.type !== 'move' || Math.hypot((u.order.x ?? 0) - at.x, (u.order.y ?? 0) - at.y) > 2.5) { u.pen = pen; X.setOrder(B, u, { type: 'move', x: at.x, y: at.y }); } }
}
/** Where an attacker looks when the objective is reached and nothing is known: the buildings round it, in turn. */
function searchPoint(B, S, el) {
  const bs = B.map.buildings; if (!bs.length) return null; el.ai.sweep = (el.ai.sweep ?? 0); const b = bs[(el.ai.sweep + el.id.length) % bs.length];
  if (!el.ai.sweepAt || B.tick - el.ai.sweepAt > sec(25)) { el.ai.sweepAt = B.tick; el.ai.sweep++; } return { x: b.door.x + 0.5, y: b.door.y + 1.5 };
}
/** Throw smoke for an element that has to cross open ground under fire: an officer (or engineer) with smoke, between them and the contact. */
function smokeFor(B, X, el, us, near, nd) {
  const A = el.ai; if (!near || nd > AI.smoke.range || nd < 6 || (A.cool.smoke && B.tick < A.cool.smoke)) return;
  if (!us.some((u) => u.supp > AI.smoke.supp) || !near.vis) return;
  const th = us.find((u) => u.smokes > 0 && u.order.type !== 'smoke'); if (!th) return; const c0 = mid(us); const k = Math.min(0.45, 8 / nd);
  X.setOrder(B, th, { type: 'smoke', x: c0.x + (near.x - c0.x) * k + (near.x - c0.x) * 0.15, y: c0.y + (near.y - c0.y) * k + (near.y - c0.y) * 0.15 }); A.cool.smoke = B.tick + sec(AI.smoke.cooldown); B.stats.smokes++; A.cmd = null;
}
/** A walk round the objective's perimeter, a few seconds at each point, until something is seen. */
function patrol(B, X, el, us, c0, S, face) {
  const A = el.ai; const obj = B.map.objective; A.pt ??= 0;
  if (!A.pts) { A.pts = [0, 1, 2].map((k) => { const a = Math.atan2(S.uy, S.ux) + (k - 1) * 1.4; return coverNear(B, X, { x: obj.x + Math.cos(a) * AI.patrol.radius, y: obj.y + Math.sin(a) * AI.patrol.radius }, 2, face); }); }
  const p = A.pts[A.pt % A.pts.length]; const arrived = dist(c0, p) < 4 && us.every((u) => !u.path.length);
  if (arrived) { A.wait ??= B.tick; if (B.tick - A.wait > sec(AI.patrol.wait)) { A.pt++; A.wait = null; A.cmd = null; } return; }
  give(B, X, el, us, 'move', p.x, p.y, {}, 'line', null);
}
/** Hold a strongpoint: a building (windows facing the lanes, each role where it is best), a trench or a covered spot. */
function defend(B, X, el, us, c0, S, face, fmt) {
  const A = el.ai; const sp = A.sp || S.sps[0]; if (!sp) return;
  if (sp.kind === 'building') {
    if (A.cmd?.type === 'garrison' && us.every((u) => u.order.type === 'garrison' || u.gstage === 'post')) return;
    const lane = S.lanes.slice().sort((a, b) => dist(a, sp.c) - dist(b, sp.c))[0] || B.map.objective;
    us.forEach((u, k) => { const top = sp.floors - 1; const floor = u.role === 'marksman' ? top : u.role === 'anti_tank' ? 0 : u.role === 'machine_gunner' ? Math.min(top, 1) : Math.min(top, k % 2 ? 1 : 0); const f = u.role === 'machine_gunner' ? lane : u.role === 'anti_tank' ? S.lanes[S.lanes.length - 1] : u.role === 'marksman' ? S.lanes[S.lanes.length - 1] : lane; if (u.order.type !== 'garrison' || u.order.b !== sp.b) X.setOrder(B, u, { type: 'garrison', b: sp.b, floor, face: f }); });
    A.cmd = { type: 'garrison', x: sp.x, y: sp.y }; return;
  }
  const at = A.hold ||= coverNear(B, X, sp, 2, face);
  if (dist(c0, at) > 6 || us.some((u) => u.order.type === 'hold' && dist(u, at) > 8)) give(B, X, el, us, 'move', at.x, at.y, {}, fmt, null);
}
function vehicle(B, X, t, u, els, S, seenC, visC, cs, pen) {
  const A = t.ai; const T = B.tick;
  if (u.kind === 'helicopter') {
    const c = visC.slice().sort((a, b) => dist(a, u) - dist(b, u))[0];
    if (c && u.W.range > 0) { const d = dist(c, u); const ox = u.x - c.x; const oy = u.y - c.y; const l = Math.hypot(ox, oy) || 1; const want = Math.max(6, u.W.range - 3); if (Math.abs(d - want) > 3 && (!A.cmd || Math.hypot(A.cmd.x - c.x, A.cmd.y - c.y) > 4)) { A.cmd = { x: c.x, y: c.y }; X.setOrder(B, u, { type: 'move', x: c.x + (ox / l) * want, y: c.y + (oy / l) * want }); } }
    else if (u.order.type === 'hold' && !S.attacking) X.setOrder(B, u, { type: 'orbit', x: B.map.objective.x, y: B.map.objective.y, r: 9 });
    else if (u.order.type === 'hold') X.setOrder(B, u, { type: 'amove', x: B.map.objective.x, y: B.map.objective.y });
    return;
  }
  if (u.W.airOnly || u.arty) { if (!A.set) { A.set = true; if (u.W.airOnly) { const at = X.standNear(B, S.rear.x + 3, S.rear.y + 3, 'veh'); if (at) X.setOrder(B, u, { type: 'move', x: at.x, y: at.y }); } } return; }
  const friends = els.map((e) => ({ e, us: living(B, e) })).filter((q) => q.us.length && q.e.ai.mode !== 'fallback');
  const lead = friends.slice().sort((a, b) => dist(mid(a.us), u) - dist(mid(b.us), u))[0];
  const at = seenC.filter((c) => c.role === 'anti_tank' && T - c.t < sec(25));
  const threatAhead = seenC.filter((c) => c.vis && dist(c, u) < 16 && Math.abs(angle(Math.atan2(c.y - u.y, c.x - u.x) - u.heading)) < 1.0);
  if (at.some((c) => dist(c, u) < AI.atFear) && (!lead || dist(mid(lead.us), u) > 9) && threatAhead.length && u.order.type !== 'reverse' && (!A.cool.back || T > A.cool.back)) { // anti-tank near and no infantry with it: back out, front to the threat
    const bx = u.x - Math.cos(u.heading) * 6; const by = u.y - Math.sin(u.heading) * 6; const p = X.standNear(B, bx, by, 'veh'); if (p) { X.setOrder(B, u, { type: 'reverse', x: p.x, y: p.y }); A.cool.back = T + sec(12); A.cmd = null; return; }
  }
  if (!S.attacking) { // defence: hull-down near the objective, between it and the threat
    const sp = A.hd ||= (X.standNear(B, B.map.objective.x + S.ux * 5, B.map.objective.y + S.uy * 5, 'veh') || S.rear);
    if (dist(u, sp) > 3 && (!A.cmd || u.order.type === 'hold')) { A.cmd = { x: sp.x, y: sp.y }; X.setOrder(B, u, { type: 'move', x: sp.x, y: sp.y }); }
    return;
  }
  if (!lead) { if (u.order.type === 'hold' && dist(u, B.map.objective) > 6) X.setOrder(B, u, { type: 'move', x: B.map.objective.x, y: B.map.objective.y }); return; }
  const c = mid(lead.us); const dx = S.attacking ? S.ux * -1 : 0; void dx;
  const back = { x: c.x - (B.map.objective.x - c.x) / (dist(c, B.map.objective) || 1) * AI.tankFollow, y: c.y - (B.map.objective.y - c.y) / (dist(c, B.map.objective) || 1) * AI.tankFollow };
  const spot = X.standNear(B, back.x, back.y, 'veh'); if (!spot) return;
  if (dist(u, spot) > 4 && (!A.cmd || Math.hypot(A.cmd.x - spot.x, A.cmd.y - spot.y) > 5 || u.order.type === 'hold')) { A.cmd = { x: spot.x, y: spot.y }; X.setOrder(B, u, { type: 'move', x: spot.x, y: spot.y }); }
}
const angle = (d) => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
/** The enemy battery: a cluster of known contacts that is not on top of our own is shelled, once in a while (the battery's own counter-battery answer is in the simulation). */
function shell(B, X, S, visC, mine) {
  if (B.tick - S.batT < sec(AI.battery.cooldown)) return; if (!B.units.some((b) => b.battery && b.alive && !b.fled)) return;
  for (const c of visC) { const grp = visC.filter((o) => dist(o, c) <= AI.battery.cluster); if (grp.length < AI.battery.min) continue; const x = grp.reduce((a, o) => a + o.x, 0) / grp.length; const y = grp.reduce((a, o) => a + o.y, 0) / grp.length; if (mine.some((u) => dist(u, { x, y }) < AI.battery.safe)) continue; B.located.push({ x, y, at: B.tick + sec(8), done: false }); S.batT = B.tick; B.stats.battery++; return; }
}
/** Your own force on its own, in goals that are not a fight for the ground: the old logic (go to the person, bring them home; get a vehicle through). */
function legacyP(B, X, mine, S) {
  const obj = B.map.objective; const exit = B.map.exit; const isVeh = X.isVeh;
  mine.forEach((u, i) => {
    if (u.broken || u.battery || u.order.type === 'retreat') return;
    if (B.goal === 'extract' || B.goal === 'rescue') {
      const v = B.units.find((q) => q.vip && q.alive);
      if (u.vip) { if (u.order.type === 'hold' && mine.some((q) => !q.vip && dist(q, u) < 7)) X.setOrder(B, u, { type: 'move', x: B.map.spawns.p.x, y: B.map.spawns.p.y }); return; }
      if (v && v.order.type === 'move') { if (u.order.type !== 'escort' && !isVeh(u)) X.setOrder(B, u, { type: 'escort', target: v.id }); }
      else if (u.order.type === 'hold' && !(u.target && B.byId.get(u.target)?.alive)) X.setOrder(B, u, { type: 'amove', x: obj.x + ((i % 5) - 2), y: obj.y + ((i % 3) - 1) });
      return;
    }
    if (isVeh(u) && u.kind !== 'helicopter' && u.order.type === 'hold' && !u.path.length) X.setOrder(B, u, { type: 'move', x: exit.x, y: exit.y }); else if (!isVeh(u) && u.order.type === 'hold') X.setOrder(B, u, { type: 'amove', x: exit.x, y: exit.y });
  });
  void S;
}
export { contactsOf, nearestContact, SUPPRESS, SUPPORT, UAV };
