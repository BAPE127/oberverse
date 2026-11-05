// The battle on the screen (v0.101.0, the look renderer + the tactical engine's drawing): the ground baked once, buildings seen from above with a roof (or opened to one floor's plan), people on the
// game's own people sprites (with the new helmet), vehicles, effects, and three camera tiers: far (banners), command (everything at the game's own scale) and close (the same sprites, enlarged by
// whole numbers). Browser only. It reads a battle (src/battle/sim.js) and never changes it.
import { drawVeh, drawHelo, SPEC as FLEET, shade } from './drawFleet.js';
import { drawSoldier, ENEMY } from './drawSoldiers.js';
import { drawRoofed, STYLES as ART_STYLES } from './drawRoofed.js';
import { drawCar } from './drawBattleCars.js';
import { bakeGround, gameMapOf } from './battleGround.js';
import { drawProp, setPixelProps } from './drawWorld.js';
import { PROP_TYPES } from '../content/props.js';
import { TILE, ART_STYLE, SUPPORT } from '../content/battle.js';
import { drawJet } from './drawBattleFx.js';
import { LOOKS, DEFAULT_LOOK } from '../content/troops.js';
import { unit } from '../battle/hash.js';

export const TP = 32; // pixels a tile is drawn at, at command zoom
const INK = '#1b1a24';
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const WLOOK = { item_assault_rifle: 'ar', item_smg: 'smg', item_lmg: 'lmg', item_rpg: 'rpg', item_sniper_rifle: 'sniper', item_pistol: 'pistol', item_shotgun: 'shotgun' };

/** A battle begun under v0.101.0 has no ground glyphs, props or cars: make them from its tiles so it is painted in the new look too (a road, water, crops, trees, hedges, building footprints). */
function legacyDecor(map) {
  const surf = new Uint8Array(map.w * map.h); const props = [];
  for (let i = 0; i < surf.length; i++) {
    const t = map.tiles[i]; const x = i % map.w; const y = Math.floor(i / map.w);
    surf[i] = (t === TILE.ROAD ? '=' : t === TILE.WATER ? '~' : t === TILE.CROP ? 'k' : map.bid[i] >= 0 ? ',' : '.').charCodeAt(0);
    if (t === TILE.TREE) props.push({ id: `l${props.length}`, type: 'tree', x, y, color: '#4f7a4a' }); else if (t === TILE.HEDGE) props.push({ id: `l${props.length}`, type: 'bush', x, y });
  }
  const buildings = map.buildings.map((b) => ({ ...b, astyle: b.astyle || ART_STYLE[b.style] || 'halver', seed: b.seed ?? b.id * 977 }));
  return { ...map, surf, props, cars: [], fields: [], buildings };
}

/** A building's roof-and-facade, painted once to its own canvas (with room for its shadow): the painter makes thousands of strokes, far too many to repeat sixty times a second. */
function bakeBuilding(b) {
  const c = mkCanvas(b.w * TP + 24, b.h * TP + 22); const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  drawRoofed(g, { ...b, x: 0, y: 0, style: b.astyle, door: { x: b.door.x - b.x, y: b.door.y - b.y } }, { damage: b.dmg });
  return c;
}

/** Everything about a map that does not change in a battle, built once: the ground, and the things that stand on it in the order they are drawn (back to front). */
export function bakeScene(map0) {
  setPixelProps(true);
  const map = map0.surf ? map0 : legacyDecor(map0); const gm = gameMapOf(map); const ground = bakeGround(map, gm); const gg = ground.getContext('2d'); gg.imageSmoothingEnabled = false;
  const items = [];
  for (const p of map.props) {
    const pp = { w: 1, h: 1, ...(PROP_TYPES[p.type]?.defaults || {}), ...p };
    if (p.type === 'crosswalk') { drawProp(gg, pp, { wind: 0, map: gm, time: 0, night: false }); continue; }
    items.push({ y: (p.y + (pp.h || 1)) * TP - 4, x0: p.x * TP - 48, x1: (p.x + (pp.w || 1)) * TP + 48, y0: p.y * TP - 120, y1: (p.y + (pp.h || 1)) * TP + 24, draw: (g, t) => drawProp(g, pp, { wind: 0, map: gm, time: t, night: false }) });
  }
  for (const b of map.buildings) { const sprite = bakeBuilding(b); items.push({ y: (b.y + b.h) * TP, b, x0: b.x * TP, x1: b.x * TP + sprite.width, y0: b.y * TP, y1: b.y * TP + sprite.height, draw: (g, t, B) => { g.drawImage(sprite, b.x * TP, b.y * TP); if (B) for (const r of B.rubble) if (r.x >= b.x && r.x < b.x + b.w && r.y >= b.y && r.y < b.y + b.h) rubble(g, r.x, r.y); } }); }
  for (const c of map.cars || []) items.push({ y: c.y + 10, x0: c.x - 70, x1: c.x + 70, y0: c.y - 40, y1: c.y + 40, draw: (g) => drawCar(g, c.kind, c.color, c.dir, c.x, c.y) });
  items.sort((a, b) => a.y - b.y);
  return { map, gm, ground, items };
}

/** A breached wall segment: a dark gap with bricks on the ground. */
function rubble(g, tx, ty) {
  const x = tx * TP; const y = ty * TP; g.fillStyle = INK; g.fillRect(x + 2, y + 2, TP - 4, TP - 4); g.fillStyle = '#2a2420'; g.fillRect(x + 4, y + 4, TP - 8, TP - 8);
  for (let i = 0; i < 9; i++) { const u = unit(`rub|${tx}|${ty}|${i}`); const v = unit(`rub|${tx}|${ty}|${i}|v`); g.fillStyle = ['#8a4a3a', '#a8604a', '#6a3a2a', '#c8b8a0'][i % 4]; g.fillRect(x + 3 + Math.floor(u * (TP - 9)), y + 3 + Math.floor(v * (TP - 9)), 4 + (i % 3) * 2, 3 + (i % 2) * 2); }
}

/** One floor of a building as a plan, in the game's roofless look: plank floors with a shadow under the north wall, brick or plaster walls with framed windows, furniture on the boards, the stair and a label. */
function plan(g, map, b, floor, gm) {
  const X = b.x * TP; const Y = b.y * TP; const S = ART_STYLES[b.astyle] || ART_STYLES.halver; const wall = S.walls[0]; const wlo = shade(wall, -30); const whi = shade(wall, 22);
  const at = (i, j) => (i < b.x || j < b.y || i >= b.x + b.w || j >= b.y + b.h ? TILE.WALL : map.tiles[j * map.w + i]);
  const solid = (t) => t === TILE.WALL || t === TILE.WINDOW;
  for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) {
    const t = map.tiles[j * map.w + i]; const x = i * TP; const y = j * TP;
    if (t === TILE.WALL || t === TILE.WINDOW) {
      g.fillStyle = INK; g.fillRect(x, y, TP, TP); g.fillStyle = wall; g.fillRect(x + 2, y + 2, TP - 4, TP - 4);
      g.fillStyle = wlo; for (let r = 4; r < TP - 2; r += 6) { g.fillRect(x + 2, y + r + 4, TP - 4, 1); g.fillRect(x + 2 + ((r / 6 + i) % 2) * 8 + 4, y + r - 2, 1, 6); }
      g.fillStyle = whi; g.fillRect(x + 2, y + 2, TP - 4, 2); g.fillRect(x + 2, y + 2, 2, TP - 4);
      if (t === TILE.WINDOW) { const horiz = solid(at(i - 1, j)) && solid(at(i + 1, j)); g.fillStyle = INK; g.fillRect(x + (horiz ? 4 : 8), y + (horiz ? 8 : 4), horiz ? TP - 8 : TP - 16, horiz ? TP - 16 : TP - 8); g.fillStyle = '#7aa3b8'; g.fillRect(x + (horiz ? 5 : 9), y + (horiz ? 9 : 5), horiz ? TP - 10 : TP - 18, horiz ? TP - 18 : TP - 10); g.fillStyle = '#cfe6f0'; g.fillRect(x + (horiz ? 5 : 9), y + (horiz ? 9 : 5), horiz ? 8 : 3, horiz ? 3 : 8); }
    } else {
      const k = (i * 7 + j * 13) % 3; g.fillStyle = ['#b98a5e', '#b08157', '#c0925f'][k]; g.fillRect(x, y, TP, TP);
      g.fillStyle = 'rgba(70,40,20,0.35)'; for (let r = 0; r < TP; r += 8) g.fillRect(x, y + r + 7, TP, 1); g.fillStyle = 'rgba(255,230,190,0.16)'; for (let r = 0; r < TP; r += 8) g.fillRect(x, y + r, TP, 1);
      if (solid(at(i, j - 1))) { g.fillStyle = 'rgba(30,18,10,0.38)'; g.fillRect(x, y, TP, 7); } if (solid(at(i - 1, j))) { g.fillStyle = 'rgba(30,18,10,0.22)'; g.fillRect(x, y, 5, TP); }
      if (t === TILE.DOOR) { g.fillStyle = INK; g.fillRect(x + 2, y + 6, TP - 4, TP - 10); g.fillStyle = '#6b4a32'; g.fillRect(x + 4, y + 8, TP - 8, TP - 14); g.fillStyle = '#e8c35a'; g.fillRect(x + TP - 10, y + 16, 3, 3); }
      if (t === TILE.STAIRS) { g.fillStyle = INK; g.fillRect(x + 1, y + 1, TP - 2, TP - 2); g.fillStyle = '#8a8478'; g.fillRect(x + 3, y + 3, TP - 6, TP - 6); for (let q = 0; q < 6; q++) { g.fillStyle = q % 2 ? '#a8a298' : '#948e82'; g.fillRect(x + 3, y + 4 + q * 4, TP - 6, 3); } g.fillStyle = '#e8c84a'; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.fillText(floor < b.floors - 1 ? '\u25b2' : '\u25bc', x + TP / 2, y + TP / 2 + 5); }
    }
  }
  // furniture, from the game's own props, laid by a hash of the building: shelves and cabinets along the north wall, tables with chairs inside, a counter and a plant on the ground floor of a shop
  const open = (i, j) => map.tiles[j * map.w + i] === TILE.FLOOR && map.bid[j * map.w + i] === b.id;
  const put = (type, i, j, extra = {}) => { const pp = { w: 1, h: 1, ...(PROP_TYPES[type]?.defaults || {}), type, x: i, y: j, ...extra }; drawProp(g, pp, { wind: 0, map: gm, time: 0, night: false }); };
  const clearish = (i, j) => open(i, j) && Math.abs(i - b.door.x) + Math.abs(j - b.door.y) > 2 && !(i <= b.x + 2 && j <= b.y + 2);
  for (let j = b.y + 1; j < b.y + b.h - 1; j++) for (let i = b.x + 1; i < b.x + b.w - 1; i++) {
    if (!clearish(i, j)) continue; const u = unit(`${b.id}|f${floor}|${i}|${j}`);
    if (j === b.y + 1 && u < 0.45) put(u < 0.2 ? 'shelf' : 'cabinet', i, j);
    else if (j > b.y + 1 && j < b.y + b.h - 2 && u < 0.1 && clearish(i + 1, j)) { put('table', i, j); put('chair', i + 1, j); }
    else if (u > 0.96) put('plant', i, j);
  }
  if (floor === 0 && b.sign) { const cj = b.y + 2; for (let i = b.x + 3; i < b.x + b.w - 2; i++) if (clearish(i, cj + 1)) put('counter', i, cj + 1); }
  g.fillStyle = 'rgba(16,14,36,0.9)'; g.fillRect(X, Y - 20, 132, 18); g.strokeStyle = '#ffe28a'; g.lineWidth = 2; g.strokeRect(X, Y - 20, 132, 18); g.fillStyle = '#ffe28a'; g.font = 'bold 12px system-ui'; g.textAlign = 'left'; g.fillText(`FLOOR ${floor + 1} OF ${b.floors}`, X + 8, Y - 6);
}

const dirOf = (u, to) => { const dx = to.x - u.x; const dy = to.y - u.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'; };
/** Which spec of the fleet a battle unit is drawn as (its kind and class; a helicopter's armour tells an attack helicopter from a scout). */
const specOf = (u) => (u.kind === 'tank' ? (u.armourBar >= 3 ? 'bulwark' : 'anvil') : u.kind === 'helicopter' ? (u.armourBar >= 2 ? 'talon' : 'viper') : u.kind === 'carrier' ? 'wolf' : u.role === 'recon' ? 'scout' : u.role === 'artillery' ? 'hammer' : u.role === 'antiair' ? 'skyguard' : 'truck');

/** The view: owns a canvas, a camera and the effects; `draw(B, ui)` paints a frame. */
export class BattleView {
  constructor(canvas) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.cam = { x: 0, y: 0, zoom: 1 }; this.fx = null; this.scene = null; this.map = null; this.t = 0; this.hdg = new Map(); this.air = []; this.labels = []; this.rings = []; this.evi = 0; this.lastShots = new Map(); this.lastHp = new Map(); this.seenAt = new Map(); }
  attach(B, looks = {}) { this.B = B; this.map = B.map; this.scene = bakeScene(B.map); this.looks = looks; this.evi = B.events.length; this.air = []; this.labels = []; this.rings = []; this.lastShots.clear(); this.lastHp.clear(); this.seenAt.clear(); }
  tier() { return this.cam.zoom < 0.55 ? 'far' : this.cam.zoom > 1.8 ? 'close' : 'command'; }
  toWorld(sx, sy) { const r = this.cv.getBoundingClientRect(); return { x: (sx - r.left) / this.cam.zoom + this.cam.x, y: (sy - r.top) / this.cam.zoom + this.cam.y }; }
  toTile(sx, sy) { const w = this.toWorld(sx, sy); return { x: w.x / TP, y: w.y / TP }; }
  center(tx, ty) { this.cam.x = tx * TP - this.cv.width / 2 / this.cam.zoom; this.cam.y = ty * TP - this.cv.height / 2 / this.cam.zoom; this.clamp(); }
  clamp() { const mw = this.map.w * TP; const mh = this.map.h * TP; const vw = this.cv.width / this.cam.zoom; const vh = this.cv.height / this.cam.zoom; this.cam.x = Math.max(-40, Math.min(mw - vw + 40, this.cam.x)); this.cam.y = Math.max(-40, Math.min(mh - vh + 40, this.cam.y)); }
  zoomBy(f, sx, sy) { const before = this.toWorld(sx, sy); const z = Math.max(0.3, Math.min(4, this.cam.zoom * f)); this.cam.zoom = z <= 1.05 && z >= 0.95 ? 1 : Math.abs(z - 3) < 0.2 ? 3 : z; const r = this.cv.getBoundingClientRect(); this.cam.x = before.x - (sx - r.left) / this.cam.zoom; this.cam.y = before.y - (sy - r.top) / this.cam.zoom; this.clamp(); }

  /** The enemies the player's units can see now (and for a moment after). */
  seen(B) {
    const out = new Set();
    for (const e of B.units) {
      if (e.side !== 'e' || !e.alive || e.fled) continue;
      const vis = this.visible?.(e);
      if (vis) { out.add(e.id); this.seenAt.set(e.id, B.tick); } else if (B.tick - (this.seenAt.get(e.id) ?? -999) < 20) out.add(e.id);
    }
    return out;
  }

  /** What changed since the last frame becomes effects: shots, hits, kills. */
  effects(B) {
    const T = TP;
    for (const e of B.events.slice(this.evi)) {
      if (e.k === 'blast') { const big = e.r >= 2.5; this.fx.blast(e.x * T, e.y * T - 6, big); for (let i = 0; i < Math.round(e.r * 2); i++) this.fx.blast(e.x * T + (unit(`bl|${B.tick}|${i}`) - 0.5) * e.r * T * 1.4, e.y * T + (unit(`bm|${B.tick}|${i}`) - 0.5) * e.r * T * 1.2 - 6, false); this.rings.push({ x: e.x * T, y: e.y * T, r: e.r * T, age: 0 }); }
      else if (e.k === 'pass') this.air.push({ kind: e.kind, id: e.id, x0: e.x0 * T, x1: e.x1 * T, y: e.y * T, t0: e.t, dur: e.dur });
      else if (e.k === 'module') { const u = B.byId.get(e.id); if (u) this.labels.push({ x: u.x * T, y: u.y * T - 34, text: { tracks: 'TRACKS OUT', gun: 'GUN OUT', engine: 'ENGINE ON FIRE', crew: 'CREW OUT' }[e.module] || e.module, age: 0 }); }
      else if (e.k === 'breach') { this.fx.blast((e.x + 0.5) * T, (e.y + 0.5) * T, false); for (let i = 0; i < 6; i++) this.fx.hit((e.x + unit(`br|${i}`)) * T, (e.y + unit(`bs|${i}`)) * T); }
      else if (e.k === 'shell') { const u = B.byId.get(e.id); if (u) { const a = Math.atan2(e.y - u.y, e.x - u.x); this.fx.muzzle(u.x * T, u.y * T - 10, Math.cos(a), Math.sin(a)); this.fx.smoke(u.x * T + Math.cos(a) * 18, u.y * T - 10); this.fx.smoke(u.x * T + Math.cos(a) * 26, u.y * T - 14); } }
      else if (e.k === 'shotdown') { this.air = this.air.filter((a) => a.id !== e.id); this.labels.push({ x: e.x * T, y: e.y * T - 30, text: 'SHOT DOWN', age: 0 }); for (let i = 0; i < 4; i++) this.fx.blast(e.x * T + (unit(`sd|${i}`) - 0.5) * 40, e.y * T - 20 + i * 8, i < 2); }
      else if (e.k === 'bingo') { const u = B.byId.get(e.id); if (u) this.labels.push({ x: u.x * T, y: u.y * T - 50, text: 'BINGO FUEL', age: 0 }); }
      else if (e.k === 'noshells') { const u = B.byId.get(e.id); if (u) this.labels.push({ x: u.x * T, y: u.y * T - 40, text: 'OUT OF SHELLS', age: 0 }); }
      else if (e.k === 'outofrange') { const u = B.byId.get(e.id); if (u) this.labels.push({ x: u.x * T, y: u.y * T - 40, text: 'OUT OF RANGE', age: 0 }); }
      else if (e.k === 'wallhit') this.fx.hit((e.x + 0.5) * T, (e.y + 0.5) * T);
      else if (e.k === 'down' && e.abandoned) { const u = B.byId.get(e.id); if (u) this.labels.push({ x: u.x * T, y: u.y * T - 34, text: 'ABANDONED', age: 0 }); }
    }
    this.evi = B.events.length;
    if (B.tick % 3 === 0) for (const c of B.smoke) if (c.until > B.tick) for (let i = 0; i < 2; i++) this.fx.cloud((c.x + (unit(`sc|${B.tick}|${i}`) - 0.5) * c.r * 1.7) * T, (c.y + (unit(`sd|${B.tick}|${i}`) - 0.5) * c.r * 1.3) * T);
    for (const u of B.units) if (u.burning && B.tick % 4 === 0) this.fx.flame(u.x * T, u.y * T - 8);
    for (const u of B.units) {
      const s0 = this.lastShots.get(u.id) ?? u.shots; if (u.shots > s0) { const t = u.target ? B.byId.get(u.target) : null; if (t) { const dx = t.x - u.x; const dy = t.y - u.y; const d = Math.hypot(dx, dy) || 1; this.fx.muzzle(u.x * TP, u.y * TP - 12, dx / d, dy / d); this.fx.tracer(u.x * TP, u.y * TP - 12, t.x * TP, t.y * TP - 12, u.side); if (u.W.pierce >= 1 || u.W.rocket) this.fx.blast(t.x * TP, t.y * TP - 8); } }
      this.lastShots.set(u.id, u.shots);
      const h0 = this.lastHp.get(u.id) ?? u.hp; if (u.hp < h0 - 0.5) this.fx.hit(u.x * TP, u.y * TP - 10); if (h0 > 0 && u.hp <= 0) this.fx.blast(u.x * TP, u.y * TP - 8, u.kind !== 'inf'); this.lastHp.set(u.id, u.hp);
      if (!u.alive && u.kind !== 'inf' && B.tick % 8 === 0) this.fx.smoke(u.x * TP, u.y * TP - 6);
    }
  }

  draw(B, ui = {}) {
    const g = this.ctx; const cam = this.cam; this.t += 1 / 60; const tier = this.tier();
    g.imageSmoothingEnabled = false; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#10101c'; g.fillRect(0, 0, this.cv.width, this.cv.height);
    g.setTransform(cam.zoom, 0, 0, cam.zoom, -cam.x * cam.zoom, -cam.y * cam.zoom);
    g.drawImage(this.scene.ground, 0, 0);
    // the objective and the way out
    const o = B.map.objective; g.strokeStyle = 'rgba(255,224,120,0.9)'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.arc(o.x * TP + 16, o.y * TP + 16, 4 * TP, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    if (B.goal === 'logistics') { g.strokeStyle = 'rgba(120,255,160,0.9)'; g.strokeRect(B.map.exit.x * TP - 20, B.map.exit.y * TP - 60, 40, 120); }
    const seen = ui.seen || new Set(B.units.filter((u) => u.side === 'e').map((u) => u.id));
    const open = ui.open || {};
    // a building opened to a floor plan lies flat on the ground; the rest stand, in order from back to front, with the people between them
    for (const b of B.map.buildings) { const v = open[b.id]; if (v) plan(g, B.map, b, v.floor, this.scene.gm); }
    if (tier === 'far') { this.drawItems(g, [], open); this.banners(g, B, seen, ui); this.fx.draw(g); g.setTransform(1, 0, 0, 1, 0, 0); return; }
    const list = B.units.filter((u) => (u.side === 'p' || seen.has(u.id)) && !u.fled).sort((a, b) => a.y - b.y).filter((u) => {
      const v = open[B.map.bid[Math.floor(u.y) * B.map.w + Math.floor(u.x)]];
      const inside = B.map.bid[Math.floor(u.y) * B.map.w + Math.floor(u.x)] >= 0 && u.kind === 'inf';
      if (inside && !v) return false; // inside a roofed building: not seen
      if (inside && v && v.floor !== u.z && !(v.ground && u.z === 0)) return false; // on a floor that is not the one shown
      return true;
    });
    this.drawItems(g, list, open, B, ui);
    this.fx.draw(g);
    this.overlay(g, B);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** What is in the air and what is about to land: the passes, the rings round the targets of strikes that are on their way, the shock rings and the labels. */
  overlay(g, B) {
    const T = TP;
    for (const p of B.pend) { const S = SUPPORT[p.kind]; if ((!S && p.kind !== 'shell') || S?.group === 'smoke') continue; const r = (p.r || S?.r || 1.5) * T; const left = Math.max(0, p.at - B.tick); g.strokeStyle = `rgba(255,${80 + (left % 6) * 20},60,0.9)`; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.ellipse(p.x * T, p.y * T, r, r * 0.8, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(255,90,60,0.12)'; g.fill(); }
    for (const r of B.runs) { const S = SUPPORT[r.kind]; g.strokeStyle = 'rgba(255,200,90,0.5)'; g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(r.x0 * T, r.y * T); g.lineTo(r.x1 * T, r.y * T); g.stroke(); g.setLineDash([]); void S; }
    this.rings = this.rings.filter((q) => q.age < 14); for (const q of this.rings) { q.age++; g.strokeStyle = `rgba(255,230,180,${1 - q.age / 14})`; g.lineWidth = 3; g.beginPath(); g.ellipse(q.x, q.y, q.r * (0.3 + q.age / 14), q.r * 0.8 * (0.3 + q.age / 14), 0, 0, Math.PI * 2); g.stroke(); }
    this.air = this.air.filter((a) => B.tick - a.t0 <= a.dur + 30);
    for (const a of this.air) {
      const f = (B.tick - a.t0) / a.dur; const x = a.x0 + (a.x1 - a.x0) * f; const bomber = a.kind === 'bomber';
      if (f >= -0.1 && f <= 1.4) { drawJet(g, x, a.y - 30 * (1 - Math.min(1, Math.max(0, f))) * 0, 0, bomber, this.t); if (!bomber && f >= 0 && f <= 1) { g.fillStyle = '#ffe08a'; for (let i = 0; i < 5; i++) g.fillRect(Math.round(x + 24 + i * 5), Math.round(a.y + (i % 2) * 2 - 1), 3, 2); } }
    }
    this.labels = this.labels.filter((l) => l.age < 60); g.font = 'bold 12px monospace'; g.textAlign = 'center';
    for (const l of this.labels) { l.age++; const y = l.y - l.age * 0.5; g.fillStyle = INK; g.fillText(l.text, l.x + 1, y + 1); g.fillStyle = '#ffd24a'; g.fillText(l.text, l.x, y); }
  }

  /** The standing things and the people, merged in order of how far down the screen they are, so a soldier behind a tree is behind it. */
  drawItems(g, units, open, B, ui) {
    const cam = this.cam; const vx0 = cam.x; const vy0 = cam.y; const vx1 = cam.x + this.cv.width / cam.zoom; const vy1 = cam.y + this.cv.height / cam.zoom; let k = 0;
    const flush = (limit) => { while (k < units.length && units[k].y * TP <= limit) { this.unit(g, units[k], B, ui); k++; } };
    for (const it of this.scene.items) {
      flush(it.y);
      if (it.x1 < vx0 || it.x0 > vx1 || it.y1 < vy0 || it.y0 > vy1) continue;
      if (it.b && open[it.b.id]) continue;
      it.draw(g, this.t, this.B);
    }
    flush(Infinity);
  }

  unit(g, u, B, ui) {
    const px = u.x * TP; const py = u.y * TP; const inf = u.kind === 'inf';
    if (ui.selected?.has(u.id)) { g.strokeStyle = '#7af0a0'; g.lineWidth = 2; g.beginPath(); g.ellipse(px, py + 2, inf ? 11 : 24, inf ? 5 : 10, 0, 0, Math.PI * 2); g.stroke(); }
    if (inf) {
      const t = u.target ? B.byId.get(u.target) : null; const ang = u.path?.[0] ? dirOf(u, u.path[0]) : t ? dirOf(u, t) : (u.side === 'p' ? 'right' : 'left');
      if (!u.alive) { g.save(); g.translate(px, py); const c = u.side === 'p' ? '#516b3e' : ENEMY.cloth; g.fillStyle = 'rgba(16,14,36,0.3)'; g.fillRect(-11, 1, 22, 4); g.fillStyle = INK; g.fillRect(-11, -5, 22, 9); g.fillStyle = c; g.fillRect(-9, -4, 14, 7); g.fillStyle = shade(c, 20); g.fillRect(-9, -4, 14, 2); g.fillStyle = shade(c, -34); g.fillRect(5, -3, 5, 5); g.fillStyle = u.side === 'p' ? '#3a5030' : ENEMY.helm; g.fillRect(-12, -4, 5, 6); g.fillStyle = '#e0b088'; g.fillRect(-8, -2, 2, 2); g.restore(); return; }
      const look = { ...DEFAULT_LOOK, ...(this.looks?.[u.id] || {}) }; const mine = u.side === 'p'; const cloth = mine ? (LOOKS.primary[look.primary] || '#5e7a46') : ENEMY.cloth;
      const skin = ['#f2d6c0', '#e2b896', '#c48a62', '#8a5a3a', '#6a4430'][Math.floor(unit(`${u.id}|skin`) * 5)];
      drawSoldier(g, u.role, px, py, ang, { cloth, helm: mine ? shade(cloth, -18) : ENEMY.helm, legs: mine ? shade(cloth, -34) : ENEMY.legs, accent: mine ? (LOOKS.band[look.band] || '#e8c84a') : ENEMY.accent, gun: WLOOK[u.weapon], skin, t: u.moving ? this.t * 6 + (u.id.length * 0.7) : 0, moving: Boolean(u.moving), scale: 0.95 });
      if (u.state !== 'steady') { g.fillStyle = u.state === 'broken' ? '#ff5a4a' : u.state === 'pinned' ? '#ffb43a' : '#ffe86a'; g.fillRect(px - 3, py - 36, 6, 3); }
    } else this.vehicle(g, u, B, px, py);
    if (u.alive && (u.hp < u.hpMax || ui.selected?.has(u.id))) { const w = inf ? 16 : 30; const y = py - (inf ? 32 : u.kind === 'helicopter' ? 60 : 30); g.fillStyle = INK; g.fillRect(px - w / 2 - 1, y - 1, w + 2, 5); g.fillStyle = '#3a2a2a'; g.fillRect(px - w / 2, y, w, 3); g.fillStyle = u.side === 'p' ? '#6ae88a' : '#f06a5a'; g.fillRect(px - w / 2, y, Math.max(0, Math.round((w * u.hp) / u.hpMax)), 3); }
  }

  /** A war vehicle: the spec for what it is, the paint for whose it is, a hull that turns toward where it goes and a turret that turns toward what it shoots at. */
  vehicle(g, u, B, px, py) {
    const target = u.target ? B.byId.get(u.target) : null; const step = u.path?.[0];
    const want = step ? Math.atan2(step.y - u.y, step.x - u.x) : target ? Math.atan2(target.y - u.y, target.x - u.x) : (u.side === 'p' ? 0 : Math.PI);
    const had = this.hdg.get(u.id) ?? want; let d = want - had; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const hd = u.alive ? had + d * 0.12 : had; this.hdg.set(u.id, hd);
    const spec = FLEET[specOf(u)]; const paint = u.side === 'p' ? 'company' : 'varn'; const state = !u.alive ? 'wreck' : u.hp < u.hpMax * 0.45 ? 'damaged' : 'ok';
    const nose = hd + Math.PI / 2; // the sprites point up; the battle's east is zero
    if (u.kind === 'helicopter') { drawHelo(g, spec, px, py - 14, nose, { paint, altitude: u.alive ? 26 : 0, phase: this.t * 40 }); return; }
    const aim = target && u.alive ? Math.atan2(target.y - u.y, target.x - u.x) + Math.PI / 2 - nose : 0;
    drawVeh(g, spec, px, py, nose, { paint, state, turret: aim, scale: 0.9 });
  }

  /** The far tier: a banner for each group of units (a flag, a number, a bar). */
  banners(g, B, seen, ui) {
    const cell = 6; const groups = new Map();
    for (const u of B.units) { if (!u.alive || u.fled || (u.side === 'e' && !seen.has(u.id))) continue; const k = `${u.side}|${Math.floor(u.x / cell)}|${Math.floor(u.y / cell)}`; const q = groups.get(k) || { side: u.side, n: 0, x: 0, y: 0, hp: 0, max: 0, sel: false, veh: false }; q.n++; q.x += u.x; q.y += u.y; q.hp += u.hp; q.max += u.hpMax; q.sel ||= Boolean(ui.selected?.has(u.id)); q.veh ||= u.kind !== 'inf'; groups.set(k, q); }
    for (const q of groups.values()) {
      const x = (q.x / q.n) * TP; const y = (q.y / q.n) * TP; const c = q.side === 'p' ? '#5ec27a' : '#e86a58';
      g.fillStyle = INK; g.fillRect(x - 15, y - 33, 4, 38); g.fillRect(x - 12, y - 33, 34, 20); g.fillStyle = c; g.fillRect(x - 11, y - 31, 32, 16); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x - 11, y - 31, 32, 3);
      g.fillStyle = INK; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.fillText(`${q.veh ? '▣' : ''}${q.n}`, x + 5, y - 19);
      g.fillStyle = INK; g.fillRect(x - 12, y - 11, 34, 5); g.fillStyle = '#e8e4c0'; g.fillRect(x - 11, y - 10, Math.round((32 * q.hp) / q.max), 3);
      if (q.sel) { g.strokeStyle = '#7af0a0'; g.lineWidth = 2; g.strokeRect(x - 17, y - 35, 42, 44); }
    }
  }
}
