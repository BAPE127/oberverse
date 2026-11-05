// The battle (v0.101.0 stage 10a): a pure, deterministic simulation. Ten steps a second; every chance is a hash of (the engagement's key, the tick, the unit); nothing reads a clock, a draw
// or the game. The same setup and the same orders give the same battle, so a save is a setup, an order log and a tick, and a reload replays it to where it was (`replay`).
//
//   createBattle(setup)                 a battle from a setup (src/battle/setup.js)
//   issue(B, ids, order)                give your units an order (logged for the replay): move, amove, hold, garrison, retreat
//   step(B) / run(B, ticks)             advance one tick / many
//   outcome(B)                          the result, in the shape src/war/engagements.js applyOutcome takes
//   replay(setup, log, tick)            the battle again, from the start, to a tick
import { CHARGE, TEND, UAV, ARTY, SCATTER, STATION, FLAK, WIRE_SLOW, TICK, TILE, COVER, HEIGHT, SUPPRESS, WEAPONS, ARMOUR_FLOOR, ROLE, OBJECTIVE, SPEED, DOWN, FACING, MODULES, MODULE, SUPPORT, BREACH } from '../content/battle.js';
import { OUTCOMES } from '../war/combat.js';
import { generate, idx, inb, tileAt, walkable } from './map.js';
import { findPath, los, canStand } from './nav.js';
import { unit as chance } from './hash.js';

const dt = 1 / TICK.perSecond;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const isVeh = (u) => u.kind !== 'inf';

export function createBattle(setup) {
  const map = generate({ ...setup.map, ver: setup.map.ver ?? 1 });
  const rules = setup.rules ?? (setup.map.ver >= 2 ? 2 : 1); // 1: v0.101.0; 2: v0.102.0 (modules and facing); 3: v0.102.1 (what runs without an order): a setup says which rules it was made under, and replays under them
  const B = { key: setup.key, setup, rules, map, tick: 0, units: [], byId: new Map(), log: [], over: false, why: null, goal: setup.goal, maxTicks: setup.maxTicks || TICK.maxSeconds * TICK.perSecond,
    ai: { p: Boolean(setup.ai?.p), e: setup.ai?.e !== false }, counts: { rockets: 0, fuel: 0, items: {}, air: [], strategic: [], airLost: [] }, sup: { items: { ...(setup.support?.items || {}) }, air: (setup.support?.air || []).map((a) => ({ ...a, used: false })), strategic: (setup.support?.strategic || []).map((a) => ({ ...a, used: false })) }, pend: [], runs: [], smoke: [], drones: [], fpvs: [], spotted: {}, wall: new Map(), rubble: [], hold: 0, cap: 0, start: { p: 0, e: 0 }, events: [], captured: false, convoyOut: false };
  const place = (side, specs) => {
    const s = side === 'p' ? map.spawns.p : map.spawns.e;
    const taken = new Set();
    specs.forEach((spec) => {
      let spot = null;
      for (let r = 0; r < 14 && !spot; r++) for (let j = -r; j <= r && !spot; j++) for (let i = -r; i <= r && !spot; i++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
        const x = s.x + i; const y = s.y + j; const k = `${x},${y}`;
        if (!taken.has(k) && canStand(map, x, y, spec.kind === 'inf' ? 'inf' : spec.kind === 'helicopter' ? 'heli' : 'veh') && map.bid[idx(map, x, y)] < 0) spot = { x, y, k };
      }
      spot ||= { x: s.x, y: s.y, k: 'x' }; taken.add(spot.k);
      const u = makeUnit(spec, side, spot.x + 0.5, spot.y + 0.5, rules);
      B.units.push(u); B.byId.set(u.id, u);
    });
  };
  place('p', setup.units.filter((x) => x.side === 'p')); place('e', setup.units.filter((x) => x.side === 'e'));
  B.start.p = B.units.filter((u) => u.side === 'p').length; B.start.e = B.units.filter((u) => u.side === 'e').length;
  B.startAcc = { p: B.units.filter((u) => u.side === 'p' && u.rec).length };
  return B;
}

function makeUnit(spec, side, x, y, rules = 2) { // (spec.vtype: which vehicle it is, from rules 3)
  const W = WEAPONS[spec.weapon] || WEAPONS.none; const ground = spec.kind !== 'inf' && spec.kind !== 'helicopter' && rules >= 2;
  return { id: spec.id, side, kind: spec.kind, role: spec.role, name: spec.name, rec: spec.rec || null, vtype: spec.vtype || null, x, y, z: 0, wantZ: 0, hp: spec.hp, hpMax: spec.hp, morale: spec.morale ?? 70, supp: 0, state: 'steady', weapon: spec.weapon, W,
    fatigue: spec.fatigue || 0, accMult: spec.accMult ?? 1, prot: spec.prot ?? 1, armourBar: spec.armourBar ?? 0, speed: spec.speed, sight: spec.sight, cd: Math.floor(chance(`${spec.id}|cd0`) * W.interval * TICK.perSecond), target: null, order: { type: 'hold' }, path: [], alive: true, fled: false, broken: false,
    moving: false, stairsT: 0, shots: 0, kills: 0, travelled: 0, gstage: null, post: null, hurt: 0,
    heading: side === 'p' ? 0 : Math.PI, mod: ground ? { tracks: 1, gun: 1, engine: 1, crew: 1 } : null, arty: rules >= 3 && spec.role === 'artillery' ? ARTY[spec.vtype] || null : null, fuelT: rules >= 3 && spec.kind === 'helicopter' ? Math.round((spec.vtype === 'mercy' ? STATION.mercy : STATION.seconds) * TICK.perSecond) : null, stab: false, evac: false, tendT: 0, plantT: 0, recharge: 0, burning: false, smokes: spec.kind === 'inf' && (spec.role === 'engineer' || spec.role === 'officer') ? SUPPORT.smoke.charges : 0 };
}

// ---- orders
/** The spots of a formation: `n` places round a point, facing the way the group is going (line abreast, a column, a wedge, a skirmish line spread wide). */
export function formationSpots(n, x, y, heading, kind = 'line') {
  const fx = Math.cos(heading); const fy = Math.sin(heading); const px = -fy; const py = fx; const gap = kind === 'skirmish' ? 2.6 : 1.7; const out = [];
  for (let i = 0; i < n; i++) {
    const o = i - (n - 1) / 2; let a = o * gap; let b = 0;
    if (kind === 'column') { a = (i % 2 ? 0.8 : -0.8); b = -Math.floor(i / 1) * 1.2 * 0.5 * 2; }
    else if (kind === 'wedge') { a = o * gap; b = -Math.abs(o) * 1.4; }
    out.push({ x: x + px * a + fx * b, y: y + py * a + fy * b });
  }
  return out;
}
/** Give a group a move or attack-move to a point in a formation: each unit its own spot, nearest first, on ground it can stand on. */
export function issueFormation(B, ids, type, x, y, kind = 'line') {
  const us = ids.map((id) => B.byId.get(id)).filter((u) => u && u.alive && u.side === 'p'); if (!us.length) return;
  const cx = us.reduce((a, u) => a + u.x, 0) / us.length; const cy = us.reduce((a, u) => a + u.y, 0) / us.length; const heading = Math.atan2(y - cy, x - cx); const spots = formationSpots(us.length, x, y, heading, kind);
  const left = us.slice(); const used = [];
  for (const sp of spots) { let bi = 0; let bd = 1e9; left.forEach((u, i) => { const d = Math.hypot(u.x - sp.x, u.y - sp.y); if (d < bd) { bd = d; bi = i; } }); const u = left.splice(bi, 1)[0]; const k = u.kind === 'inf' ? 'inf' : u.kind === 'helicopter' ? 'heli' : 'veh'; const at = standNear(B, Math.max(1, Math.min(B.map.w - 2, sp.x)), Math.max(1, Math.min(B.map.h - 2, sp.y)), k) || { x, y }; used.push([u.id, at]); }
  for (const [id, at] of used) issue(B, [id], { type, x: at.x, y: at.y });
}
export function issue(B, ids, order) {
  B.log.push({ t: B.tick, ids: [...ids], order: { ...order } });
  for (const id of ids) { const u = B.byId.get(id); if (u && u.alive && u.side === 'p') setOrder(B, u, order); }
}
function setOrder(B, u, order) {
  u.order = { ...order }; u.path = []; u.target = u.order.type === 'move' ? null : u.target; u.gstage = null; u.post = null;
  const kind = u.kind === 'inf' ? 'inf' : u.kind === 'helicopter' ? 'heli' : 'veh';
  if (order.type === 'move' || order.type === 'amove' || order.type === 'regroup' || order.type === 'recon') u.path = findPath(B.map, u, order, kind);
  else if (order.type === 'flank') { // round the side: out to a point 9 tiles to one flank of the line to the target, then in
    const dx = order.x - u.x; const dy = order.y - u.y; const l = Math.hypot(dx, dy) || 1; const side = chance(`${B.key}|${u.id}|flank`) < 0.5 ? 1 : -1; let w = { x: u.x + dx * 0.55 - (dy / l) * 9 * side, y: u.y + dy * 0.55 + (dx / l) * 9 * side };
    w = standNear(B, Math.max(1, Math.min(B.map.w - 2, w.x)), Math.max(1, Math.min(B.map.h - 2, w.y)), kind) || { x: order.x, y: order.y };
    const a = findPath(B.map, u, w, kind); const b = findPath(B.map, { x: w.x, y: w.y, z: u.z }, order, kind); u.path = [...a, ...b];
  }
  else if (order.type === 'escort') { if (!B.byId.get(order.target)?.alive || order.target === u.id) u.order = { type: 'hold' }; }
  else if (order.type === 'retreat') { const s = u.side === 'p' ? B.map.spawns.p : B.map.spawns.e; u.order.x = s.x < B.map.w / 2 ? 1 : B.map.w - 2; u.order.y = Math.floor(u.y); u.path = findPath(B.map, u, u.order, kind); }
  else if (order.type === 'fire') { if (!u.arty) u.order = { type: 'hold' }; }
  else if (order.type === 'tend') { if (u.role !== 'medic') u.order = { type: 'hold' }; }
  else if (order.type === 'charge') { if (u.role !== 'engineer' || !(B.sup.items.item_breach_charge > 0)) u.order = { type: 'hold' }; u.plantT = 0; }
  else if (order.type === 'scout' || order.type === 'fpv') { if (u.role !== 'uav') u.order = { type: 'hold' }; }
  else if (order.type === 'smoke' || order.type === 'suppress' || order.type === 'breach') { if (order.type === 'smoke' && !u.smokes) u.order = { type: 'hold' }; else if (order.type === 'breach' && !(u.weapon === 'tank_gun' || u.W.rocket)) u.order = { type: 'hold' }; else if (order.type === 'suppress' && !(u.W.range > 0)) u.order = { type: 'hold' }; }
  else if (order.type === 'garrison') { const b = B.map.buildings[order.b]; if (b && u.kind === 'inf') { u.gstage = 'go'; u.path = findPath(B.map, u, { x: b.stairs.x + 0.5, y: b.stairs.y + 0.5 }, 'inf'); u.order.floor = Math.min(order.floor ?? b.floors - 1, b.floors - 1); } else u.order = { type: 'hold' }; }
}

// ---- seeing, covering, hitting
/** Whether a smoke cloud lies across the line between two points. */
const smoked = (B, x0, y0, x1, y1) => B.smoke.some((c) => c.until > B.tick && segDist(c.x, c.y, x0, y0, x1, y1) < c.r);
function segDist(px, py, x0, y0, x1, y1) { const dx = x1 - x0; const dy = y1 - y0; const l2 = dx * dx + dy * dy; const t = l2 ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2)) : 0; return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy)); }
const seeLine = (B, a, za, b, zb) => los(B.map, a.x, a.y, za, b.x, b.y, zb) && !smoked(B, a.x, a.y, b.x, b.y);
const eyeZ = (u) => u.z;
function sightOf(u) { return u.sight + HEIGHT.sight * u.z + (u.role === 'signaller' ? ROLE.signaller.sight : 0); }
const reachOf = (u) => u.W.range + HEIGHT.reach * u.z;
function coverFor(B, t, from) {
  if (isVeh(t)) return 0;
  const tile = tileAt(B.map, Math.floor(t.x), Math.floor(t.y));
  if (tile === TILE.FLOOR || tile === TILE.DOOR || tile === TILE.STAIRS) {
    const x = Math.floor(t.x); const y = Math.floor(t.y);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tileAt(B.map, x + dx, y + dy) === TILE.WINDOW) return COVER.window;
    return COVER.building;
  }
  if (tile === TILE.TRENCH) return COVER.trench;
  if (tile === TILE.HEDGE) return COVER.hedge; if (tile === TILE.CROP) return COVER.crop;
  const x = Math.floor(t.x); const y = Math.floor(t.y); const sx = Math.sign(from.x - t.x); const sy = Math.sign(from.y - t.y);
  const n = tileAt(B.map, x + sx, y + sy); const n2 = tileAt(B.map, x + sx, y); const n3 = tileAt(B.map, x, y + sy);
  return [n, n2, n3].some((q) => q === TILE.WALL || q === TILE.HEDGE || q === TILE.TREE) ? COVER.tree : 0;
}
const stateOf = (u) => { const m = (u.morale - 70) * SUPPRESS.moraleShift; return u.supp >= SUPPRESS.broken + m ? 'broken' : u.supp >= SUPPRESS.pinned + m ? 'pinned' : u.supp >= SUPPRESS.shaken + m ? 'shaken' : 'steady'; };

function visible(B, u, e) { return dist(u, e) <= sightOf(u) && seeLine(B, u, eyeZ(u), e, eyeZ(e)); }

function pickTarget(B, u) {
  let best = null; let bd = 1e9;
  for (const e of B.units) {
    if (e.side === u.side || !e.alive || e.fled) continue;
    if (u.W.airOnly && e.kind !== 'helicopter') continue; // an anti-air gun looks up
    const d = dist(u, e); if (d > sightOf(u) || d >= bd) continue;
    if (!seeLine(B, u, eyeZ(u), e, eyeZ(e))) continue;
    const pref = u.role === 'anti_tank' && !isVeh(e) ? 6 : 0; // an anti-tank soldier looks for armour first
    if (d + pref >= bd) continue;
    best = e; bd = d + pref;
  }
  return best;
}

function fire(B, u, t) {
  const W = u.W; u.shots++;
  if (W.rocket && u.side === 'p') B.counts.rockets++;
  const d = dist(u, t);
  const stateMul = u.state === 'shaken' ? 0.7 : u.state === 'pinned' ? 0.5 : 1;
  const cover = coverFor(B, t, u);
  const move = u.moving ? 0.55 : 1; const tmove = t.moving ? 0.85 : 1;
  const p = Math.min(0.95, W.acc * u.accMult * stateMul * move * tmove * (1 - cover) * (1 - 0.45 * (d / Math.max(1, reachOf(u)))) * (1 - 0.04 * Math.max(0, t.z - u.z)) * (1 - (u.fatigueP || 0)));
  const roll = chance(`${B.key}|${B.tick}|${u.id}|h`);
  const hit = roll < p;
  // suppression lands on the target and a little on its neighbours, hit or miss
  const s = W.suppress * (1 - cover * 0.5) * (hit ? 1 : 0.6);
  for (const n of B.units) if (n.alive && n.side === t.side && !n.fled) { const dd = dist(n, t); if (dd < 2) n.supp = Math.min(100, n.supp + (n === t ? s : s * 0.5 * (1 - dd / 2))); }
  if (!hit) return;
  let dmg = W.damage * (0.8 + 0.4 * chance(`${B.key}|${B.tick}|${u.id}|d`));
  if (isVeh(t)) { dmg *= ARMOUR_FLOOR + (1 - ARMOUR_FLOOR) * W.pierce * (t.kind === 'helicopter' ? 1.2 : 1); if (t.mod) dmg *= FACING[faceOf(t, u)]; }
  else dmg /= t.prot;
  t.hp -= dmg; t.hurt += dmg; t.lastBy = u.id;
  if (t.mod && t.alive) hitModule(B, t, dmg, u);
  if (t.hp <= 0 && t.alive) {
    t.alive = false; t.hp = 0; u.kills++; B.events.push({ t: B.tick, k: 'down', id: t.id, by: u.id });
    for (const n of B.units) if (n.alive && n.side === t.side && !n.fled && dist(n, t) < 6) n.morale = Math.max(0, n.morale - (n.role === 'officer' ? 1 : 3)); // a friend falls near
    if (t.role === 'officer') for (const n of B.units) if (n.alive && n.side === t.side) n.morale = Math.max(0, n.morale - 4);
  }
}

// ---- vehicles: facing and modules
/** Which side of a ground vehicle faces the shooter: its front is the way it last moved. */
function faceOf(t, from) {
  let d = Math.atan2(from.y - t.y, from.x - t.x) - t.heading; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; d = Math.abs(d);
  return d < Math.PI / 4 ? 'front' : d > (3 * Math.PI) / 4 ? 'rear' : 'side';
}
const gunOut = (u) => Boolean(u.mod && u.mod.gun <= MODULE.down);
const trackFactor = (u) => (!u.mod ? 1 : u.mod.tracks <= MODULE.down ? 0 : u.mod.tracks < MODULE.hurt ? MODULE.slow : 1);
/** A hit that lands on a module wears it down; what that does follows from the table in the content file (tracks, gun, engine, crew). */
function hitModule(B, t, dmg, by) {
  const r = chance(`${B.key}|${B.tick}|${by.id}|${t.id}|m`); let acc = 0; let name = 'hull';
  for (const [k, m] of Object.entries(MODULES)) { acc += m.w; if (r < acc) { name = k; break; } }
  if (name === 'hull') return;
  const before = t.mod[name]; t.mod[name] = Math.max(0, before - dmg / (t.hpMax * MODULE.hpShare));
  if (before > MODULE.down && t.mod[name] <= MODULE.down) {
    B.events.push({ t: B.tick, k: 'module', id: t.id, module: name });
    if (name === 'engine') { t.burning = true; B.events.push({ t: B.tick, k: 'fire', id: t.id }); }
    if (name === 'crew') { t.alive = false; t.hp = 0; B.events.push({ t: B.tick, k: 'down', id: t.id, by: by.id, abandoned: true }); }
  }
  t.accMult = t.accMult0 ??= t.accMult; if (t.mod.gun < MODULE.hurt || t.mod.crew < MODULE.hurt) t.accMult = t.accMult0 * MODULE.aimLoss;
}

// ---- support, smoke, blasts and walls
/** A blast hurts everyone near it (more at the middle, half behind walls) and breaches wall segments at the middle. */
function blast(B, x, y, r, dmg, by) {
  B.events.push({ t: B.tick, k: 'blast', x, y, r });
  for (const n of B.units) {
    if (!n.alive || n.fled) continue; const d = dist(n, { x, y }); if (d > r) continue;
    let v = dmg * (1 - d / r); if (B.map.bid[idx(B.map, Math.floor(n.x), Math.floor(n.y))] >= 0 && !isVeh(n)) v *= 0.5;
    if (isVeh(n)) { v *= n.kind === 'helicopter' ? 0.6 : 0.5; } else v /= n.prot;
    n.hp -= v; n.hurt += v; n.supp = Math.min(100, n.supp + 40 * (1 - d / r)); n.lastBy = by;
    if (n.mod && n.alive) hitModule(B, n, v, { id: by });
    if (n.hp <= 0 && n.alive) { n.alive = false; n.hp = 0; B.events.push({ t: B.tick, k: 'down', id: n.id, by }); }
  }
  for (let j = Math.floor(y - r); j <= Math.ceil(y + r); j++) for (let i = Math.floor(x - r); i <= Math.ceil(x + r); i++) if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= r * BREACH.blast / 2 + 0.6 && dmg >= BREACH.wall) breachTile(B, i, j);
}
function breachTile(B, i, j) {
  if (!inb(B.map, i, j) || B.map.tiles[idx(B.map, i, j)] !== TILE.WALL || B.map.bid[idx(B.map, i, j)] < 0) return false;
  B.map.tiles[idx(B.map, i, j)] = TILE.FLOOR; B.rubble.push({ x: i, y: j, t: B.tick }); B.events.push({ t: B.tick, k: 'breach', x: i, y: j }); return true;
}
/** Call support: a missile or a drone from the stock, an aircraft pass, or smoke. Validated against what the setup says the company has; logged for the replay. */
export function callSupport(B, spec) {
  const r = applySupport(B, spec); if (r.ok) B.log.push({ t: B.tick, ids: [], order: { type: 'support', ...spec } }); return r;
}
function applySupport(B, spec) {
  const S = SUPPORT[spec.kind]; if (!S || B.over) return { ok: false, text: 'No such support.' };
  if (!inb(B.map, Math.floor(spec.x), Math.floor(spec.y))) return { ok: false, text: 'Off the map.' };
  if (S.group === 'air') { const a = B.sup.air.find((q) => !q.used && q.kind === spec.kind && (!spec.id || q.id === spec.id)); if (!a) return { ok: false, text: 'No such aircraft is free.' }; a.used = true; B.counts.air.push({ id: a.id, kind: a.kind }); B.counts.fuel += S.fuel; B.pend.push({ at: B.tick + Math.round(S.delay * TICK.perSecond), kind: spec.kind, x: spec.x, y: spec.y, id: a.id }); B.events.push({ t: B.tick, k: 'call', kind: spec.kind, x: spec.x, y: spec.y }); return { ok: true, text: `${a.name || S.name} is inbound.` }; }
  if (S.group === 'smoke') return { ok: false, text: 'Smoke is thrown by an engineer or an officer.' };
  if (S.group === 'strategic') { const a = B.sup.strategic.find((q) => !q.used && (!spec.id || q.id === spec.id)); if (!a) return { ok: false, text: 'There is no strategic missile in the stores.' }; a.used = true; B.counts.strategic.push(a.id); B.pend.push({ at: B.tick + Math.round(S.delay * TICK.perSecond), kind: 'strategic', x: spec.x, y: spec.y }); B.events.push({ t: B.tick, k: 'call', kind: 'strategic', x: spec.x, y: spec.y }); return { ok: true, text: `${a.name || S.name} is launched (${S.delay} s).` }; }
  if (!(B.sup.items[spec.kind] > 0)) return { ok: false, text: `No ${S.name.toLowerCase()} in the stores.` };
  B.sup.items[spec.kind]--; B.counts.items[spec.kind] = (B.counts.items[spec.kind] || 0) + 1;
  B.pend.push({ at: B.tick + Math.round(S.delay * TICK.perSecond), kind: spec.kind, x: spec.x, y: spec.y }); B.events.push({ t: B.tick, k: 'call', kind: spec.kind, x: spec.x, y: spec.y });
  return { ok: true, text: `${S.name} is on its way (${S.delay} s).` };
}
/** Land what is due, fly the passes, and let the smoke and the fires run. */
function tickSupport(B) {
  for (const p of B.pend.filter((q) => q.at <= B.tick)) {
    if (p.kind === 'shell') { blast(B, p.x, p.y, p.r, p.dmg, 'shell'); continue; }
    if (p.kind === 'charge') { blast(B, p.x, p.y, p.r, p.dmg, 'charge'); continue; }
    const S = SUPPORT[p.kind];
    if (S.group === 'air') { const dur = Math.round(S.seconds * TICK.perSecond); B.runs.push({ kind: p.kind, id: p.id, x0: p.x - S.len / 2, x1: p.x + S.len / 2, y: p.y, t0: B.tick, dur, bx: Array.from({ length: S.bombs || 0 }, (_, i) => p.x + (i - ((S.bombs || 0) - 1) / 2) * 3), dropped: 0 }); B.events.push({ t: B.tick, k: 'pass', id: p.id, kind: p.kind, x0: p.x - S.len / 2, x1: p.x + S.len / 2, y: p.y, dur }); }
    else if (S.group === 'smoke') { B.smoke.push({ x: p.x, y: p.y, r: S.r, until: B.tick + S.seconds * TICK.perSecond }); B.events.push({ t: B.tick, k: 'smoke', x: p.x, y: p.y, r: S.r }); }
    else blast(B, p.x, p.y, S.r, S.dmg, p.kind);
  }
  B.pend = B.pend.filter((q) => q.at > B.tick);
  for (const run of B.runs) {
    const S = SUPPORT[run.kind]; const f = (B.tick - run.t0) / run.dur; if (f < 0 || f > 1) continue; const x = run.x0 + (run.x1 - run.x0) * f;
    const guns = B.rules >= 3 ? B.units.filter((g) => g.alive && !g.fled && g.side === 'e' && g.W.airOnly && Math.hypot(g.x - x, g.y - run.y) <= g.W.range).length : 0;
    if (guns && !run.down && chance(`${B.key}|${B.tick}|flak|${run.id}`) < 1 - (1 - FLAK.perTick) ** guns) { run.down = true; run.dur = 0; B.counts.airLost.push(run.id); B.events.push({ t: B.tick, k: 'shotdown', id: run.id, x, y: run.y }); blast(B, x, run.y, 1.6, 90, 'flak'); continue; }
    if (run.down) continue;
    if (run.kind === 'fighter') { for (const n of B.units) if (n.alive && !n.fled && Math.abs(n.y - run.y) < S.width && Math.abs(n.x - x) < 1.2) { const v = S.dmgTick * (isVeh(n) ? 0.5 : 1 / n.prot); n.hp -= v; n.hurt += v; n.supp = Math.min(100, n.supp + 6); if (n.mod) hitModule(B, n, v, { id: 'air' }); if (n.hp <= 0 && n.alive) { n.alive = false; n.hp = 0; B.events.push({ t: B.tick, k: 'down', id: n.id, by: 'air' }); } } }
    else if (run.dropped < run.bx.length && x >= run.bx[run.dropped]) { blast(B, run.bx[run.dropped], run.y, S.r, S.dmg, 'bomber'); run.dropped++; }
  }
  B.runs = B.runs.filter((r) => !r.down && B.tick - r.t0 <= r.dur);
  tickDrones(B);
  if (B.smoke.length) B.smoke = B.smoke.filter((c) => c.until > B.tick);
}

// ---- the UAV team: scout drones that spot, FPV drones that dive
const flak = (B, d) => (B.rules >= 3 ? B.units.filter((g) => g.alive && !g.fled && g.side !== d.side && g.W.airOnly && Math.hypot(g.x - d.x, g.y - d.y) <= g.W.range).length : 0);
function tickDrones(B) {
  const sp = (UAV.speed / TICK.perSecond); const fsp = (UAV.fpvSpeed / TICK.perSecond);
  for (const d of B.drones) {
    const dx = d.tx - d.x; const dy = d.ty - d.y; const l = Math.hypot(dx, dy); if (l > sp) { d.x += (dx / l) * sp; d.y += (dy / l) * sp; } else { d.x = d.tx; d.y = d.ty; }
    d.left--; if (B.tick % 5 === 0 && d.side === 'p') for (const e of B.units) if (e.alive && !e.fled && e.side !== d.side && Math.hypot(e.x - d.x, e.y - d.y) <= UAV.r) B.spotted[e.id] = B.tick;
    const g = flak(B, d); if (g && chance(`${B.key}|${B.tick}|${d.id}|dz`) < 1 - (1 - 0.03) ** g) { d.left = 0; d.shot = true; B.events.push({ t: B.tick, k: 'dronedown', x: d.x, y: d.y }); }
    if (d.left <= 0) { const o = B.byId.get(d.owner); if (o) o.recharge = UAV.recharge * TICK.perSecond; d.gone = true; }
  }
  B.drones = B.drones.filter((d) => !d.gone);
  for (const f of B.fpvs) {
    let tx = f.tx; let ty = f.ty; let best = null; let bd = UAV.fpvSeek; for (const e of B.units) if (e.alive && !e.fled && e.side !== f.side) { const k = Math.hypot(e.x - f.tx, e.y - f.ty); if (k < bd) { bd = k; best = e; } }
    if (best) { tx = best.x; ty = best.y; }
    const dx = tx - f.x; const dy = ty - f.y; const l = Math.hypot(dx, dy); const bl = UAV.fpvBlast[f.item];
    const g = flak(B, f); if (g && chance(`${B.key}|${B.tick}|${f.id}|fz`) < 1 - (1 - 0.03) ** g) { f.gone = true; B.events.push({ t: B.tick, k: 'dronedown', x: f.x, y: f.y }); continue; }
    if (l <= 0.8 || l <= fsp) { f.x = tx; f.y = ty; blast(B, f.x, f.y, bl.r, bl.dmg, 'fpv'); f.gone = true; } else { f.x += (dx / l) * fsp; f.y += (dy / l) * fsp; }
  }
  B.fpvs = B.fpvs.filter((f) => !f.gone);
}

// ---- moving
function moveAlong(B, u, speed) {
  u.moving = false;
  if (!u.path.length) return false;
  let left = speed * dt;
  while (left > 0 && u.path.length) {
    const nx = u.path[0]; const d = Math.hypot(nx.x - u.x, nx.y - u.y); if (d > 1e-6 && u.kind !== 'inf') u.heading = Math.atan2(nx.y - u.y, nx.x - u.x);
    if (d <= left) { u.x = nx.x; u.y = nx.y; left -= d; u.path.shift(); u.travelled += d; } else { u.x += ((nx.x - u.x) / d) * left; u.y += ((nx.y - u.y) / d) * left; u.travelled += left; left = 0; }
    u.moving = true;
  }
  return u.moving;
}
const speedOf = (B, u) => (u.kind === 'inf' ? (B.map.bid[idx(B.map, Math.floor(u.x), Math.floor(u.y))] >= 0 ? SPEED.indoors : SPEED.infantry) * (1 - 0.3 * (u.fatigueP || 0)) * (tileAt(B.map, Math.floor(u.x), Math.floor(u.y)) === TILE.WIRE ? WIRE_SLOW : 1) : u.speed * trackFactor(u));

/** A standable tile near a point (nearest first), or null. */
function standNear(B, x, y, kind) { for (let r = 0; r < 6; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue; const tx = Math.floor(x) + i; const ty = Math.floor(y) + j; if (canStand(B.map, tx, ty, kind) && B.map.bid[idx(B.map, tx, ty)] < 0) return { x: tx + 0.5, y: ty + 0.5 }; } return null; }

function garrisonStep(B, u) {
  const b = B.map.buildings[u.order.b];
  if (u.gstage === 'go') {
    if (!u.path.length) { u.gstage = 'up'; u.stairsT = 0; }
    return;
  }
  if (u.gstage === 'up') {
    if (u.z === u.order.floor) { u.gstage = 'post'; const foe = B.units.find((e) => e.side !== u.side && e.alive); const aim = foe || B.map.objective; let best = null; let bd = 1e9;
      for (let j = b.y + 1; j < b.y + b.h - 1; j++) for (let i = b.x + 1; i < b.x + b.w - 1; i++) { if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tileAt(B.map, i + dx, j + dy) === TILE.WINDOW)) continue; const d = Math.hypot(i - aim.x, j - aim.y); if (d < bd) { bd = d; best = { x: i + 0.5, y: j + 0.5 }; } }
      u.post = best; u.path = best ? findPath(B.map, u, best, 'inf') : []; return; }
    u.stairsT++; if (u.stairsT >= 12) { u.stairsT = 0; u.z += Math.sign(u.order.floor - u.z); }
    return;
  }
  // 'post': stands at the window and holds
}

/** The nearest downed friend nobody has stabilised yet (for a medic), within reach. */
function downedNear(B, u, reach) {
  let best = null; let bd = reach;
  for (const d of B.units) { if (d.alive || d.fled || d.side !== u.side || d.kind !== 'inf' || d.stab || d.evac || d.id === u.id) continue; const k = dist(u, d); if (k < bd) { bd = k; best = d; } }
  return best;
}
function standBeside(B, d) { return standNear(B, d.x, d.y, 'inf'); }

function step1(B, u, idxU) {
  if (!u.alive || u.fled) return;
  if (u.burning && B.tick % 10 === 0) { u.hp -= MODULE.burn; if (u.hp <= 0) { u.alive = false; u.hp = 0; B.events.push({ t: B.tick, k: 'down', id: u.id, by: 'fire' }); return; } }
  if (u.recharge > 0) u.recharge--;
  if (u.fuelT != null && u.alive && !u.fled) { u.fuelT--; if (u.fuelT === 0) { B.events.push({ t: B.tick, k: 'bingo', id: u.id }); setOrder(B, u, { type: 'retreat' }); } }
  u.supp = Math.max(0, u.supp - SUPPRESS.decay);
  const ns = stateOf(u);
  if (ns === 'broken' && !u.broken) { u.broken = true; setOrder(B, u, { type: 'retreat' }); B.events.push({ t: B.tick, k: 'broke', id: u.id }); }
  if (u.broken && u.supp < SUPPRESS.rally + (u.morale - 70) * 0.2) u.broken = false; // rallied
  u.state = u.broken ? 'broken' : ns;
  u.fatigueP = Math.min(0.3, (u.fatigue || 0) / 400);
  if (u.role === 'medic' && B.tick % 10 === 0) for (const n of B.units) if (n.alive && n.side === u.side && n !== u && n.hp < n.hpMax && !isVeh(n) && dist(n, u) <= ROLE.medic.radius) n.hp = Math.min(n.hpMax, n.hp + ROLE.medic.heal);
  if (u.role === 'officer' && B.tick % 10 === 0) for (const n of B.units) if (n.alive && n.side === u.side && n.supp > 0 && dist(n, u) <= ROLE.officer.rally) n.supp = Math.max(0, n.supp - 2);
  if (B.rules >= 3 && u.kind === 'helicopter' && u.vtype === 'mercy' && u.alive && B.tick % 10 === 0) { for (const d of B.units) if (!d.alive && !d.fled && d.side === u.side && d.kind === 'inf' && !d.evac && dist(u, d) <= TEND.pickup) { d.stab = true; d.evac = true; d.fled = true; B.events.push({ t: B.tick, k: 'evac', id: d.id, by: u.id }); } }
  u.cd--;
  if (u.W.range > 0 && B.tick % TICK.decide === idxU % TICK.decide) u.target = (() => { const t = pickTarget(B, u); return t ? t.id : null; })();
  const tgt = u.target ? B.byId.get(u.target) : null;
  const canShoot = tgt && tgt.alive && !tgt.fled && u.W.range > 0 && !u.broken && dist(u, tgt) <= reachOf(u) && u.cd <= 0 && seeLine(B, u, eyeZ(u), tgt, eyeZ(tgt)) && !gunOut(u);
  const o = u.order;
  const hold = o.type === 'hold' || (o.type === 'garrison' && u.gstage === 'post');
  const engaged = tgt && tgt.alive && dist(u, tgt) <= reachOf(u) && u.W.range > 0;
  const reconSeen = o.type === 'recon' ? B.units.filter((e) => e.alive && !e.fled && e.side !== u.side && dist(u, e) <= sightOf(u) && seeLine(B, u, eyeZ(u), e, eyeZ(e))) : [];
  // an infantryman fires standing; on a move order he keeps moving; on attack-move he stops to fight what he can hit
  let moves = false;
  if (!u.broken && (u.state !== 'pinned' || o.type === 'retreat')) {
    if (o.type === 'move' || o.type === 'retreat' || o.type === 'regroup') moves = true;
    else if ((o.type === 'amove' || o.type === 'flank') && !engaged) moves = true;
    else if (o.type === 'recon' && !reconSeen.length) moves = true;
    else if (o.type === 'garrison' && (u.gstage === 'go' || u.gstage === 'post') && u.path.length) moves = true;
  } else if (u.broken) moves = true;
  if (u.broken && !u.path.length) setOrder(B, u, { type: 'retreat' });
  // the special orders: throw smoke, hold a point under fire, open a wall
  let special = false;
  if (o.type === 'smoke') {
    if (Math.hypot(o.x - u.x, o.y - u.y) <= SUPPORT.smoke.throw) { if (u.smokes > 0) { u.smokes--; B.pend.push({ at: B.tick + Math.round(SUPPORT.smoke.delay * TICK.perSecond), kind: 'smoke', x: o.x, y: o.y }); B.events.push({ t: B.tick, k: 'throw', id: u.id, x: o.x, y: o.y }); } u.order = { type: 'hold' }; u.path = []; }
    else { if (!u.path.length) u.path = findPath(B.map, u, { x: o.x, y: o.y }, 'inf'); moves = !u.broken; }
  } else if ((o.type === 'tend' || (B.rules >= 3 && u.role === 'medic' && o.type === 'hold' && !tgt)) && u.role === 'medic' && !u.broken) {
    const d = downedNear(B, u, o.type === 'tend' ? TEND.orderReach : TEND.reach);
    if (!d) { if (o.type === 'tend') u.order = { type: 'hold' }; u.tendT = 0; }
    else if (dist(u, d) > 1.3) { special = true; u.tendT = 0; if (!u.path.length || B.tick % 20 === 0) { const sp = standBeside(B, d); u.path = sp ? findPath(B.map, u, sp, 'inf') : []; } moves = true; }
    else { special = true; moves = false; u.tendT++; if (u.tendT >= TEND.seconds * TICK.perSecond) { d.stab = true; u.tendT = 0; B.events.push({ t: B.tick, k: 'stabilised', id: d.id, by: u.id }); } }
  } else if (o.type === 'escort' && !u.broken) {
    const f = B.byId.get(o.target);
    if (!f || !f.alive || f.fled) u.order = { type: 'hold' };
    else if (dist(u, f) > 3.5) { if (!u.path.length || B.tick % 10 === 0) { const sp = standNear(B, f.x, f.y, isVeh(u) ? 'veh' : 'inf'); u.path = sp ? findPath(B.map, u, sp, isVeh(u) ? 'veh' : 'inf') : []; } moves = !engaged || isVeh(f); }
    else { u.path = []; moves = false; }
  } else if (o.type === 'charge' && u.role === 'engineer' && !u.broken) {
    const wx = Math.floor(o.x); const wy = Math.floor(o.y); const dd = Math.hypot(wx + 0.5 - u.x, wy + 0.5 - u.y);
    if (dd > 1.9) { if (!u.path.length) { const sp = standNear(B, o.x, o.y, 'inf'); u.path = sp ? findPath(B.map, u, sp, 'inf') : []; if (!u.path.length) u.order = { type: 'hold' }; } moves = true; }
    else { special = true; moves = false; u.plantT++; if (u.plantT >= CHARGE.plant * TICK.perSecond) { if (B.sup.items.item_breach_charge > 0) { B.sup.items.item_breach_charge--; B.counts.items.item_breach_charge = (B.counts.items.item_breach_charge || 0) + 1; B.pend.push({ at: B.tick + CHARGE.fuse * TICK.perSecond, kind: 'charge', x: wx + 0.5, y: wy + 0.5, r: CHARGE.r, dmg: CHARGE.dmg }); B.events.push({ t: B.tick, k: 'plant', id: u.id, x: wx + 0.5, y: wy + 0.5 }); } u.order = { type: 'move', x: u.x - Math.sign(wx + 0.5 - u.x) * 5, y: u.y - Math.sign(wy + 0.5 - u.y) * 5 }; u.path = findPath(B.map, u, u.order, 'inf'); u.plantT = 0; } }
  } else if (o.type === 'scout' && u.role === 'uav' && !u.broken) {
    if (u.recharge <= 0 && !B.drones.some((q) => q.owner === u.id)) { B.drones.push({ id: `D${B.tick}${u.id}`, owner: u.id, side: u.side, x: u.x, y: u.y, tx: o.x, ty: o.y, left: UAV.battery * TICK.perSecond }); B.events.push({ t: B.tick, k: 'launch', id: u.id, kind: 'scout' }); }
    u.order = { type: 'hold' };
  } else if (o.type === 'fpv' && u.role === 'uav' && !u.broken) {
    const item = B.sup.items.item_drone_attack > 0 ? 'item_drone_attack' : B.sup.items.item_drone_strike > 0 ? 'item_drone_strike' : null;
    if (item) { B.sup.items[item]--; B.counts.items[item] = (B.counts.items[item] || 0) + 1; B.fpvs.push({ id: `F${B.tick}${u.id}`, item, side: u.side, x: u.x, y: u.y, tx: o.x, ty: o.y }); B.events.push({ t: B.tick, k: 'launch', id: u.id, kind: 'fpv' }); }
    u.order = { type: 'hold' };
  } else if (o.type === 'fire' && u.arty && !u.broken) {
    const dd = Math.hypot(o.x - u.x, o.y - u.y); special = true; moves = false; u.aim = { x: o.x, y: o.y };
    if (dd > u.arty.range) { u.order = { type: 'hold' }; B.events.push({ t: B.tick, k: 'outofrange', id: u.id }); }
    else if (u.cd <= 0) {
      if (!(B.sup.items.item_artillery_shell > 0)) { u.order = { type: 'hold' }; u.aim = null; B.events.push({ t: B.tick, k: 'noshells', id: u.id }); }
      else {
        B.sup.items.item_artillery_shell--; B.counts.items.item_artillery_shell = (B.counts.items.item_artillery_shell || 0) + 1; u.shots++; u.cd = Math.round(u.arty.interval * TICK.perSecond);
        const spotted = B.units.some((p) => p.side === u.side && p.alive && !p.fled && p.kind === 'inf' && dist(p, o) <= sightOf(p) && seeLine(B, p, p.z, o, 0)) || B.drones.some((d) => d.side === u.side && dist(d, o) <= UAV.r); const sc = spotted ? SCATTER.spotted : SCATTER.blind;
        const a = chance(`${B.key}|${B.tick}|${u.id}|sa`) * Math.PI * 2; const r = Math.sqrt(chance(`${B.key}|${B.tick}|${u.id}|sr`)) * sc; const lx = o.x + Math.cos(a) * r; const ly = o.y + Math.sin(a) * r;
        B.pend.push({ at: B.tick + Math.max(10, Math.round((dd / u.arty.speed) * TICK.perSecond)), kind: 'shell', x: lx, y: ly, r: u.arty.r, dmg: u.arty.dmg }); B.events.push({ t: B.tick, k: 'shell', id: u.id, x: o.x, y: o.y });
      }
    }
  } else if ((o.type === 'suppress' || o.type === 'breach') && !u.broken) {
    const reach = reachOf(u); const dd = Math.hypot(o.x - u.x, o.y - u.y);
    if (dd > reach - 1) { if (!u.path.length) { const k = isVeh(u) ? 'veh' : 'inf'; const a = Math.atan2(u.y - o.y, u.x - o.x); const spot = standNear(B, o.x + Math.cos(a) * (reach - 3), o.y + Math.sin(a) * (reach - 3), k); u.path = spot ? findPath(B.map, u, spot, k) : []; if (!u.path.length) u.order = { type: 'hold' }; } moves = true; }
    else { special = true; moves = false; u.aim = { x: o.x, y: o.y };
      if (u.cd <= 0 && u.W.range > 0 && !gunOut(u)) {
        u.shots++; if (u.W.rocket && u.side === 'p') B.counts.rockets++; u.cd = Math.max(1, Math.round(u.W.interval * TICK.perSecond));
        if (o.type === 'suppress') { for (const n of B.units) if (n.alive && n.side !== u.side && !n.fled && Math.hypot(n.x - o.x, n.y - o.y) < 2.5) n.supp = Math.min(100, n.supp + u.W.suppress * 1.5); }
        else { const key = `${Math.floor(o.x)},${Math.floor(o.y)}`; const hp = (B.wall.get(key) || 0) + u.W.damage; B.wall.set(key, hp); B.events.push({ t: B.tick, k: 'wallhit', x: Math.floor(o.x), y: Math.floor(o.y) }); if (hp >= BREACH.wall) { breachTile(B, Math.floor(o.x), Math.floor(o.y)); u.order = { type: 'hold' }; u.aim = null; } }
      } }
  }
  if (canShoot && !special && !(moves && u.kind === 'inf' && o.type === 'move' && u.state === 'shaken')) { fire(B, u, tgt); u.cd = Math.max(1, Math.round(u.W.interval * TICK.perSecond * (u.state === 'shaken' ? 1.2 : 1))); }
  if (moves) { moveAlong(B, u, speedOf(B, u)); } else u.moving = false;
  if (o.type === 'garrison') garrisonStep(B, u);
  if (u.order.type === 'move' && !u.path.length) u.order = { type: 'hold' };
  if ((u.order.type === 'amove' || u.order.type === 'flank') && !u.path.length && !engaged) u.order = { type: 'hold' };
  if (u.order.type === 'regroup') { u.supp = Math.max(0, u.supp - 0.4); if (!u.path.length) u.order = { type: 'hold' }; }
  if (u.order.type === 'recon') { if (reconSeen.length) { for (const e of reconSeen) B.spotted[e.id] = B.tick; B.events.push({ t: B.tick, k: 'contact', id: u.id }); u.order = { type: 'hold' }; u.path = []; } else if (!u.path.length) u.order = { type: 'hold' }; }
  if (u.order.type === 'retreat' && !u.path.length) { if (u.broken || u.side === 'p') { u.fled = true; B.events.push({ t: B.tick, k: 'fled', id: u.id }); } else u.order = { type: 'hold' }; }
  void hold;
}

// ---- the enemy's (and, for a headless battle, your) mind: simple, by goal
function ai(B, side) {
  const mine = B.units.filter((u) => u.side === side && u.alive && !u.fled);
  const attacking = (B.goal === 'offence' && side === 'p') || (B.goal === 'defence' && side === 'e');
  const obj = B.map.objective; const exit = B.map.exit;
  mine.forEach((u, i) => {
    if (u.broken || u.order.type === 'retreat') return;
    if (B.goal === 'logistics' && side === 'p') { if (isVeh(u) && u.kind !== 'helicopter' && u.order.type === 'hold' && !u.path.length) setOrder(B, u, { type: 'move', x: exit.x, y: exit.y }); else if (!isVeh(u) && u.order.type === 'hold') setOrder(B, u, { type: 'amove', x: exit.x, y: exit.y }); return; }
    if (attacking) {
      if (u.order.type === 'hold' && !(u.target && B.byId.get(u.target)?.alive)) {
        // go for the objective; once it is reached with nobody in sight, go and find the nearest enemy still standing (the AI knows where they are)
        const near = Math.hypot(u.x - obj.x, u.y - obj.y) < 5;
        const foe = near ? B.units.filter((e) => e.side !== side && e.alive && !e.fled).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0] : null;
        setOrder(B, u, foe ? { type: 'amove', x: foe.x, y: foe.y } : { type: 'amove', x: obj.x + ((i % 5) - 2), y: obj.y + ((i % 3) - 1) });
      }
      return;
    }
    // defending: infantry take the nearest building to the objective, the rest hold round it
    if (u.order.type === 'hold' && u.gstage === null && u.kind === 'inf' && B.tick < 20 && B.map.buildings.length) {
      const bs = B.map.buildings.slice().sort((a, b) => Math.hypot(a.x - obj.x, a.y - obj.y) - Math.hypot(b.x - obj.x, b.y - obj.y)).slice(0, 4);
      const b = bs[i % bs.length]; if (Math.hypot(b.x - obj.x, b.y - obj.y) < 20 && i % 3 !== 2) setOrder(B, u, { type: 'garrison', b: b.id, floor: Math.min(b.floors - 1, 1) });
      else setOrder(B, u, { type: 'move', x: obj.x + ((i % 5) - 2) * 2, y: obj.y + ((i % 4) - 1) * 2 });
    }
  });
}

function zoneCount(B, side) {
  const o = B.map.objective; let n = 0;
  for (const u of B.units) if (u.side === side && u.alive && !u.fled && dist(u, o) <= OBJECTIVE.zone) n++;
  return n;
}

export function step(B) {
  if (B.over) return B;
  if (B.tick % 20 === 0) { if (B.ai.e) ai(B, 'e'); if (B.ai.p) ai(B, 'p'); }
  B.units.forEach((u, i) => step1(B, u, i));
  tickSupport(B);
  B.tick++;
  // objectives
  const pz = zoneCount(B, 'p'); const ez = zoneCount(B, 'e');
  if (B.goal === 'defence') { if (pz > 0 || ez === 0) B.hold++; else B.hold = Math.max(0, B.hold - 1); }
  if (B.goal === 'offence') { if (pz > 0 && ez === 0) B.cap++; else B.cap = Math.max(0, B.cap - 1); if (B.cap >= OBJECTIVE.captureSeconds * TICK.perSecond) B.captured = true; }
  if (B.goal === 'logistics') for (const u of B.units) if (u.side === 'p' && u.alive && isVeh(u) && u.kind !== 'helicopter' && Math.hypot(u.x - B.map.exit.x, u.y - B.map.exit.y) < 3) B.convoyOut = true;
  const live = (s) => B.units.filter((u) => u.side === s && u.alive && !u.fled).length;
  if (!live('p')) { B.over = true; B.why = 'your force is gone'; }
  else if (!live('e')) { B.over = true; B.why = 'the enemy is beaten'; }
  else if (B.captured) { B.over = true; B.why = 'the objective is taken'; }
  else if (B.convoyOut) { B.over = true; B.why = 'the convoy is through'; }
  else if (B.tick >= B.maxTicks) { B.over = true; B.why = 'time'; }
  return B;
}
export function run(B, ticks) { for (let i = 0; i < ticks && !B.over; i++) step(B); return B; }
export function runToEnd(B) { while (!B.over) step(B); return B; }

/** The result, in the shape the engagement's apply step takes. Valid once the battle is over (or at any moment, as it stands). */
export function outcome(B) {
  const mine = B.units.filter((u) => u.side === 'p' && u.rec); const foes = B.units.filter((u) => u.side === 'e');
  const downFoes = foes.filter((u) => !u.alive || u.fled).length; const downMine = mine.filter((u) => !u.alive).length; // (put out of action: dead or wounded)
  let primary;
  if (B.goal === 'defence') primary = B.hold >= OBJECTIVE.holdSeconds * TICK.perSecond || (B.over && B.why !== 'your force is gone' && zoneCount(B, 'e') === 0 && B.units.some((u) => u.side === 'p' && u.alive && !u.fled)) || (B.over && B.why === 'time' && B.units.some((u) => u.side === 'p' && u.alive && !u.fled) && zoneCount(B, 'e') <= zoneCount(B, 'p'));
  else if (B.goal === 'offence') primary = B.captured;
  else primary = B.convoyOut;
  const ob = [primary, foes.length ? downFoes / foes.length >= OBJECTIVE.enemyShare : true, mine.length ? downMine / mine.length <= OBJECTIVE.ownLossCeiling : true];
  const objectives = ob.filter(Boolean).length;
  const dead = []; const wounded = []; const lost = [];
  for (const u of mine) {
    if (!u.alive) {
      if (u.rec.t !== 'person') { lost.push(u.rec.id); continue; }
      // put out of action: dead with a chance (less with plate armour), else badly wounded; a hash, so a replay agrees
      if (u.stab) wounded.push({ id: u.rec.id, wounds: DOWN.woundsLow }); // a medic got to him
      else if (chance(`${B.key}|down|${u.id}`) < Math.min(0.8, DOWN.dead / u.prot)) dead.push(u.rec.id);
      else wounded.push({ id: u.rec.id, wounds: DOWN.woundsLow + Math.floor(chance(`${B.key}|dw|${u.id}`) * (DOWN.woundsHigh - DOWN.woundsLow + 1)) });
      continue;
    }
    if (u.rec.t === 'person' && u.hp / u.hpMax < 0.75) wounded.push({ id: u.rec.id, wounds: Math.max(1, Math.min(2, Math.ceil((1 - u.hp / u.hpMax) * 4))) });
  }
  const fuel = Math.ceil(mine.filter((u) => u.rec.t === 'vehicle').reduce((a, u) => a + u.travelled, 0) / 60);
  return { how: 'played', objectives, outcome: OUTCOMES[objectives], objectivesMet: ob, dead, wounded, lost, used: { fuel: fuel + B.counts.fuel, rockets: B.counts.rockets, items: { ...B.counts.items }, air: B.counts.air.map((a) => a.id), strategic: [...B.counts.strategic], airLost: [...B.counts.airLost] }, ratio: foes.length ? mine.length / foes.length : 1, parts: { ticks: B.tick, why: B.why, killed: downFoes, of: foes.length, own: downMine, ownOf: mine.length } };
}

/** The battle again from the start, with the orders as they were given, to a tick. Equal to the battle that was played. */
export function replay(setup, log, tick) {
  const B = createBattle(setup);
  const q = log.slice().sort((a, b) => a.t - b.t); let i = 0;
  while (B.tick < tick && !B.over) {
    while (i < q.length && q[i].t <= B.tick) { if (q[i].order.type === 'support') applySupport(B, q[i].order); else for (const id of q[i].ids) { const u = B.byId.get(id); if (u && u.alive && u.side === 'p') setOrder(B, u, q[i].order); } B.log.push(q[i]); i++; }
    step(B);
  }
  while (i < q.length && q[i].t <= B.tick) { if (q[i].order.type === 'support') applySupport(B, q[i].order); else for (const id of q[i].ids) { const u = B.byId.get(id); if (u && u.alive && u.side === 'p') setOrder(B, u, q[i].order); } B.log.push(q[i]); i++; }
  return B;
}
export { standNear, inb, walkable, sightOf, coverFor, stateOf, reachOf, faceOf, hitModule };
