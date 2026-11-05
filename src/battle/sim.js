// The battle (v0.101.0 stage 10a): a pure, deterministic simulation. Ten steps a second; every chance is a hash of (the engagement's key, the tick, the unit); nothing reads a clock, a draw
// or the game. The same setup and the same orders give the same battle, so a save is a setup, an order log and a tick, and a reload replays it to where it was (`replay`).
//
//   createBattle(setup)                 a battle from a setup (src/battle/setup.js)
//   issue(B, ids, order)                give your units an order (logged for the replay): move, amove, hold, garrison, retreat
//   step(B) / run(B, ticks)             advance one tick / many
//   outcome(B)                          the result, in the shape src/war/engagements.js applyOutcome takes
//   replay(setup, log, tick)            the battle again, from the start, to a tick
import { TICK, TILE, COVER, HEIGHT, SUPPRESS, WEAPONS, ARMOUR_FLOOR, ROLE, OBJECTIVE, SPEED, DOWN } from '../content/battle.js';
import { OUTCOMES } from '../war/combat.js';
import { generate, idx, inb, tileAt, walkable } from './map.js';
import { findPath, los, canStand } from './nav.js';
import { unit as chance } from './hash.js';

const dt = 1 / TICK.perSecond;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const isVeh = (u) => u.kind !== 'inf';

export function createBattle(setup) {
  const map = generate(setup.map);
  const B = { key: setup.key, setup, map, tick: 0, units: [], byId: new Map(), log: [], over: false, why: null, goal: setup.goal, maxTicks: setup.maxTicks || TICK.maxSeconds * TICK.perSecond,
    ai: { p: Boolean(setup.ai?.p), e: setup.ai?.e !== false }, counts: { rockets: 0, fuel: 0 }, hold: 0, cap: 0, start: { p: 0, e: 0 }, events: [], captured: false, convoyOut: false };
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
      const u = makeUnit(spec, side, spot.x + 0.5, spot.y + 0.5);
      B.units.push(u); B.byId.set(u.id, u);
    });
  };
  place('p', setup.units.filter((x) => x.side === 'p')); place('e', setup.units.filter((x) => x.side === 'e'));
  B.start.p = B.units.filter((u) => u.side === 'p').length; B.start.e = B.units.filter((u) => u.side === 'e').length;
  B.startAcc = { p: B.units.filter((u) => u.side === 'p' && u.rec).length };
  return B;
}

function makeUnit(spec, side, x, y) {
  const W = WEAPONS[spec.weapon] || WEAPONS.none;
  return { id: spec.id, side, kind: spec.kind, role: spec.role, name: spec.name, rec: spec.rec || null, x, y, z: 0, wantZ: 0, hp: spec.hp, hpMax: spec.hp, morale: spec.morale ?? 70, supp: 0, state: 'steady', weapon: spec.weapon, W,
    fatigue: spec.fatigue || 0, accMult: spec.accMult ?? 1, prot: spec.prot ?? 1, armourBar: spec.armourBar ?? 0, speed: spec.speed, sight: spec.sight, cd: Math.floor(chance(`${spec.id}|cd0`) * W.interval * TICK.perSecond), target: null, order: { type: 'hold' }, path: [], alive: true, fled: false, broken: false,
    moving: false, stairsT: 0, shots: 0, kills: 0, travelled: 0, gstage: null, post: null, hurt: 0 };
}

// ---- orders
export function issue(B, ids, order) {
  B.log.push({ t: B.tick, ids: [...ids], order: { ...order } });
  for (const id of ids) { const u = B.byId.get(id); if (u && u.alive && u.side === 'p') setOrder(B, u, order); }
}
function setOrder(B, u, order) {
  u.order = { ...order }; u.path = []; u.target = u.order.type === 'move' ? null : u.target; u.gstage = null; u.post = null;
  const kind = u.kind === 'inf' ? 'inf' : u.kind === 'helicopter' ? 'heli' : 'veh';
  if (order.type === 'move' || order.type === 'amove') u.path = findPath(B.map, u, order, kind);
  else if (order.type === 'retreat') { const s = u.side === 'p' ? B.map.spawns.p : B.map.spawns.e; u.order.x = s.x < B.map.w / 2 ? 1 : B.map.w - 2; u.order.y = Math.floor(u.y); u.path = findPath(B.map, u, u.order, kind); }
  else if (order.type === 'garrison') { const b = B.map.buildings[order.b]; if (b && u.kind === 'inf') { u.gstage = 'go'; u.path = findPath(B.map, u, { x: b.stairs.x + 0.5, y: b.stairs.y + 0.5 }, 'inf'); u.order.floor = Math.min(order.floor ?? b.floors - 1, b.floors - 1); } else u.order = { type: 'hold' }; }
}

// ---- seeing, covering, hitting
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
  if (tile === TILE.HEDGE) return COVER.hedge; if (tile === TILE.CROP) return COVER.crop;
  const x = Math.floor(t.x); const y = Math.floor(t.y); const sx = Math.sign(from.x - t.x); const sy = Math.sign(from.y - t.y);
  const n = tileAt(B.map, x + sx, y + sy); const n2 = tileAt(B.map, x + sx, y); const n3 = tileAt(B.map, x, y + sy);
  return [n, n2, n3].some((q) => q === TILE.WALL || q === TILE.HEDGE || q === TILE.TREE) ? COVER.tree : 0;
}
const stateOf = (u) => { const m = (u.morale - 70) * SUPPRESS.moraleShift; return u.supp >= SUPPRESS.broken + m ? 'broken' : u.supp >= SUPPRESS.pinned + m ? 'pinned' : u.supp >= SUPPRESS.shaken + m ? 'shaken' : 'steady'; };

function visible(B, u, e) { return dist(u, e) <= sightOf(u) && los(B.map, u.x, u.y, eyeZ(u), e.x, e.y, eyeZ(e)); }

function pickTarget(B, u) {
  let best = null; let bd = 1e9;
  for (const e of B.units) {
    if (e.side === u.side || !e.alive || e.fled) continue;
    const d = dist(u, e); if (d > sightOf(u) || d >= bd) continue;
    if (!los(B.map, u.x, u.y, eyeZ(u), e.x, e.y, eyeZ(e))) continue;
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
  if (isVeh(t)) dmg *= ARMOUR_FLOOR + (1 - ARMOUR_FLOOR) * W.pierce * (t.kind === 'helicopter' ? 1.2 : 1);
  else dmg /= t.prot;
  t.hp -= dmg; t.hurt += dmg; t.lastBy = u.id;
  if (t.hp <= 0 && t.alive) {
    t.alive = false; t.hp = 0; u.kills++; B.events.push({ t: B.tick, k: 'down', id: t.id, by: u.id });
    for (const n of B.units) if (n.alive && n.side === t.side && !n.fled && dist(n, t) < 6) n.morale = Math.max(0, n.morale - (n.role === 'officer' ? 1 : 3)); // a friend falls near
    if (t.role === 'officer') for (const n of B.units) if (n.alive && n.side === t.side) n.morale = Math.max(0, n.morale - 4);
  }
}

// ---- moving
function moveAlong(B, u, speed) {
  u.moving = false;
  if (!u.path.length) return false;
  let left = speed * dt;
  while (left > 0 && u.path.length) {
    const nx = u.path[0]; const d = Math.hypot(nx.x - u.x, nx.y - u.y);
    if (d <= left) { u.x = nx.x; u.y = nx.y; left -= d; u.path.shift(); u.travelled += d; } else { u.x += ((nx.x - u.x) / d) * left; u.y += ((nx.y - u.y) / d) * left; u.travelled += left; left = 0; }
    u.moving = true;
  }
  return u.moving;
}
const speedOf = (B, u) => (u.kind === 'inf' ? (B.map.bid[idx(B.map, Math.floor(u.x), Math.floor(u.y))] >= 0 ? SPEED.indoors : SPEED.infantry) * (1 - 0.3 * (u.fatigueP || 0)) : u.speed);

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

function step1(B, u, idxU) {
  if (!u.alive || u.fled) return;
  u.supp = Math.max(0, u.supp - SUPPRESS.decay);
  const ns = stateOf(u);
  if (ns === 'broken' && !u.broken) { u.broken = true; setOrder(B, u, { type: 'retreat' }); B.events.push({ t: B.tick, k: 'broke', id: u.id }); }
  if (u.broken && u.supp < SUPPRESS.rally + (u.morale - 70) * 0.2) u.broken = false; // rallied
  u.state = u.broken ? 'broken' : ns;
  u.fatigueP = Math.min(0.3, (u.fatigue || 0) / 400);
  if (u.role === 'medic' && B.tick % 10 === 0) for (const n of B.units) if (n.alive && n.side === u.side && n !== u && n.hp < n.hpMax && !isVeh(n) && dist(n, u) <= ROLE.medic.radius) n.hp = Math.min(n.hpMax, n.hp + ROLE.medic.heal);
  if (u.role === 'officer' && B.tick % 10 === 0) for (const n of B.units) if (n.alive && n.side === u.side && n.supp > 0 && dist(n, u) <= ROLE.officer.rally) n.supp = Math.max(0, n.supp - 2);
  u.cd--;
  if (u.W.range > 0 && B.tick % TICK.decide === idxU % TICK.decide) u.target = (() => { const t = pickTarget(B, u); return t ? t.id : null; })();
  const tgt = u.target ? B.byId.get(u.target) : null;
  const canShoot = tgt && tgt.alive && !tgt.fled && u.W.range > 0 && !u.broken && dist(u, tgt) <= reachOf(u) && u.cd <= 0 && los(B.map, u.x, u.y, eyeZ(u), tgt.x, tgt.y, eyeZ(tgt));
  const o = u.order;
  const hold = o.type === 'hold' || (o.type === 'garrison' && u.gstage === 'post');
  const engaged = tgt && tgt.alive && dist(u, tgt) <= reachOf(u) && u.W.range > 0;
  // an infantryman fires standing; on a move order he keeps moving; on attack-move he stops to fight what he can hit
  let moves = false;
  if (!u.broken && (u.state !== 'pinned' || o.type === 'retreat')) {
    if (o.type === 'move' || o.type === 'retreat') moves = true;
    else if (o.type === 'amove' && !engaged) moves = true;
    else if (o.type === 'garrison' && (u.gstage === 'go' || u.gstage === 'post') && u.path.length) moves = true;
  } else if (u.broken) moves = true;
  if (u.broken && !u.path.length) setOrder(B, u, { type: 'retreat' });
  if (canShoot && !(moves && u.kind === 'inf' && o.type === 'move' && u.state === 'shaken')) { fire(B, u, tgt); u.cd = Math.max(1, Math.round(u.W.interval * TICK.perSecond * (u.state === 'shaken' ? 1.2 : 1))); }
  if (moves) { moveAlong(B, u, speedOf(B, u)); } else u.moving = false;
  if (o.type === 'garrison') garrisonStep(B, u);
  if (u.order.type === 'move' && !u.path.length) u.order = { type: 'hold' };
  if (u.order.type === 'amove' && !u.path.length && !engaged) u.order = { type: 'hold' };
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
      if (chance(`${B.key}|down|${u.id}`) < Math.min(0.8, DOWN.dead / u.prot)) dead.push(u.rec.id);
      else wounded.push({ id: u.rec.id, wounds: DOWN.woundsLow + Math.floor(chance(`${B.key}|dw|${u.id}`) * (DOWN.woundsHigh - DOWN.woundsLow + 1)) });
      continue;
    }
    if (u.rec.t === 'person' && u.hp / u.hpMax < 0.75) wounded.push({ id: u.rec.id, wounds: Math.max(1, Math.min(2, Math.ceil((1 - u.hp / u.hpMax) * 4))) });
  }
  const fuel = Math.ceil(mine.filter((u) => u.rec.t === 'vehicle').reduce((a, u) => a + u.travelled, 0) / 60);
  return { how: 'played', objectives, outcome: OUTCOMES[objectives], objectivesMet: ob, dead, wounded, lost, used: { fuel, rockets: B.counts.rockets }, ratio: foes.length ? mine.length / foes.length : 1, parts: { ticks: B.tick, why: B.why, killed: downFoes, of: foes.length, own: downMine, ownOf: mine.length } };
}

/** The battle again from the start, with the orders as they were given, to a tick. Equal to the battle that was played. */
export function replay(setup, log, tick) {
  const B = createBattle(setup);
  const q = log.slice().sort((a, b) => a.t - b.t); let i = 0;
  while (B.tick < tick && !B.over) {
    while (i < q.length && q[i].t <= B.tick) { for (const id of q[i].ids) { const u = B.byId.get(id); if (u && u.alive && u.side === 'p') setOrder(B, u, q[i].order); } B.log.push(q[i]); i++; }
    step(B);
  }
  while (i < q.length && q[i].t <= B.tick) { for (const id of q[i].ids) { const u = B.byId.get(id); if (u && u.alive && u.side === 'p') setOrder(B, u, q[i].order); } B.log.push(q[i]); i++; }
  return B;
}
export { inb, walkable, sightOf, coverFor, stateOf, reachOf, step1 as stepUnit };
