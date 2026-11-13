// The battle on the screen (v0.101.0, the look renderer + the tactical engine's drawing; v0.104.x: the isometric view, docs/RENDERING.md 2.6). The ground is baked once and cut into iso diamonds, buildings
// stand as roofed boxes (or open to one floor's plan, or fade where something of yours stands behind them), people and vehicles are upright sprites sorted with them by src/engine/iso.js, and
// the camera lives in iso space with three tiers: far (banners), command (everything at the game's own scale) and close (the same sprites, enlarged by whole numbers). Browser only. It reads a
// battle (src/battle/sim.js) and never changes it. World points are in pixels (a tile is TP = 32): a unit at tile (x, y) stands at (x * TP, y * TP).
import { FUTURE_LOOKS } from '../content/futureArms.js';
import { VEHICLES } from '../content/procurement.js';
import { drawHelo, SPEC as FLEET, shade, vehicleSprite } from './drawFleet.js';
import { drawSoldier, ENEMY } from './drawSoldiers.js';
import { STYLES as ART_STYLES, pick } from './drawRoofed.js';
import { carBody, carHeight } from './drawBattleCars.js';
import { bakeGround, gameMapOf } from './battleGround.js';
import { drawProp, setPixelProps, FLAT_PROPS } from './drawWorld.js';
import { PROP_TYPES } from '../content/props.js';
import { TILE, ART_STYLE, SUPPORT, UAV } from '../content/battle.js';
import { drawJet } from './drawBattleFx.js';
import { LOOKS, DEFAULT_LOOK } from '../content/troops.js';
import { unit } from '../battle/hash.js';
import { project, unproject, sortItems, behindBox, hidesPoint, prismHit, spriteFacing, pointBox, bodyBox } from './iso.js';
import { IsoBuildings, buildingHeight, columnPicture, bakeDiamond } from './isoBuildings.js';

export const TP = 32; // pixels a tile is drawn at, at command zoom
const INK = '#1b1a24';
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const WLOOK = { item_assault_rifle: 'ar', item_smg: 'smg', item_lmg: 'lmg', item_rpg: 'rpg', item_sniper_rifle: 'sniper', item_pistol: 'pistol', item_shotgun: 'shotgun' };
const CHUNK = 512; // world px of ground baked to one diamond
const HOLE_R = 90; // the see-through window in a building that stands in front of something of yours (iso px)

/** The fade rule for one point (world px, height z): a roofed building (ground box, `h` tall) must show it through when the building is drawn over it. */
export const needsFade = (box, h, focus) => behindBox(focus, box) && hidesPoint(box, h, focus.x, focus.y, focus.z || 0);

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

/** A battle building as the shared building painter (src/engine/isoBuildings.js) reads it: the same palette the roofed painter picks, the floors as the height. */
function isoRec(b) {
  const S = ART_STYLES[b.astyle] || ART_STYLES.halver; const seed = b.seed ?? b.id * 977;
  return { id: b.id, x: b.x, y: b.y, w: b.w, h: b.h, storeys: Math.max(1, b.floors || 1), wall: b.wall || pick(S.walls, seed), roof: b.roof || pick(S.roofCol, seed + 3), trim: S.trims[0], glass: '#7aa3b8', door: b.door, sign: b.sign, awning: b.awning, shabby: Boolean(b.dmg), floors: b.floors || 1, name: b.name };
}
const boxOf = (b) => ({ x0: b.x * TP, y0: b.y * TP, x1: (b.x + b.w) * TP, y1: (b.y + b.h) * TP });

// ------------------------------------------------------------------------------------------------- sprites stacked into volume (RENDERING.md 2.2)
const darker = (flat, a) => { const c = mkCanvas(flat.width, flat.height); const g = c.getContext('2d'); g.drawImage(flat, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(10,8,24,${a})`; g.fillRect(0, 0, c.width, c.height); return c; };
const silhouette = (flat, col) => { const c = mkCanvas(flat.width, flat.height); const g = c.getContext('2d'); g.drawImage(flat, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; };
/**
 * A flat top-down picture (w by h, one pixel to a world px, its middle on the ground point) given height: it is baked to the iso diamond and repeated `n` pixels up, the lower layers darker, the top layer as painted. `parts` are
 * { flat, z0, n } from the bottom up (a turret stands on its hull); `shadow` is a flat silhouette laid on the ground. Returns { canvas, ax, ay }: draw it at (ix - ax, iy - ay) for the iso point (ix, iy) of that ground point.
 */
export function stackSprite(w, h, parts, shadow = null) {
  const maxZ = Math.max(...parts.map((p) => p.z0 + p.n)); const dw = w + h; const dh = (w + h) >> 1; const base = maxZ + 2;
  const cv = mkCanvas(dw, dh + base); const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  if (shadow) g.drawImage(bakeDiamond(shadow), 0, base);
  for (const p of parts) {
    const lit = bakeDiamond(p.flat); const d1 = bakeDiamond(darker(p.flat, 0.38)); const d2 = bakeDiamond(darker(p.flat, 0.2));
    for (let k = 0; k < p.n; k++) g.drawImage(k < p.n * 0.5 ? d1 : d2, 0, base - (p.z0 + k));
    g.drawImage(lit, 0, base - (p.z0 + p.n));
  }
  return { canvas: cv, ax: dw / 2, ay: base + dh / 2 };
}
const STACKS = new Map();
const cached = (key, make) => { let v = STACKS.get(key); if (v) { STACKS.delete(key); STACKS.set(key, v); return v; } v = make(); STACKS.set(key, v); while (STACKS.size > 180) STACKS.delete(STACKS.keys().next().value); return v; };
const even = (n) => Math.ceil(n / 2) * 2;

/** A parked car: its painted body (no painted shadow) stacked to the car's height, with a shadow on the ground. */
function carStack(c) {
  return cached(`car|${c.kind}|${c.color}|${c.dir}`, () => {
    const body = carBody(c.kind, c.color, c.dir); const w = body.width + 8; const h = body.height + 8; const flat = mkCanvas(w, h); flat.getContext('2d').drawImage(body, 4, 4);
    const sh = mkCanvas(w, h); sh.getContext('2d').drawImage(silhouette(flat, 'rgba(15,15,35,0.32)'), 4, 4);
    return stackSprite(w, h, [{ flat, z0: 0, n: carHeight(c.kind) }], sh);
  });
}

/** A war vehicle: hull and turret each painted flat, turned to the (quantised) heading, then stacked: the turret stands on the hull. `nose`, `turret` in whole 15 degree steps. */
function vehicleStack(spec, paint, state, hb, tb) {
  return cached(`veh|${spec.id}|${paint}|${state}|${hb}|${tb}`, () => {
    const S = vehicleSprite(spec, paint, state); const sc = 0.9; const n = even(sc * (Math.max(spec.L, spec.W) + 90)); const nose = (hb * Math.PI) / 12; const rel = tb === null ? 0 : (tb * Math.PI) / 12 - nose;
    const flat = mkCanvas(n, n); const g = flat.getContext('2d'); g.imageSmoothingEnabled = false; g.translate(n / 2, n / 2); g.scale(sc, sc); g.rotate(nose); g.drawImage(S.hull, -S.hull.width / 2, -S.hull.height / 2);
    let tur = null; if (S.turret) { tur = mkCanvas(n, n); const t = tur.getContext('2d'); t.imageSmoothingEnabled = false; t.translate(n / 2, n / 2); t.scale(sc, sc); t.rotate(nose); t.rotate(rel); t.drawImage(S.turret, -S.turret.width / 2, -S.turret.height / 2 - (spec.turret?.dy || 0)); }
    const sh = mkCanvas(n, n); sh.getContext('2d').drawImage(silhouette(flat, 'rgba(10,8,20,0.34)'), 4, 4);
    const hh = state === 'wreck' ? 3 : Math.max(3, Math.min(7, Math.round(spec.W / 4.5)));
    const parts = [{ flat, z0: 0, n: hh }]; if (tur) parts.push({ flat: tur, z0: hh, n: 3 });
    return stackSprite(n, n, parts, sh);
  });
}
const steps = (a) => Math.round((((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 12)) % 24;

// ------------------------------------------------------------------------------------------------- the see-through pool (a black disc fading out, dithered, as the world's)
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const POOLS = new Map();
function holeSprite(rad) {
  const r = Math.max(2, Math.round(rad)); let cv = POOLS.get(r); if (cv) return cv;
  const S = r * 2 + 1; cv = mkCanvas(S, S); const g = cv.getContext('2d'); const img = g.createImageData(S, S); const d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const t = Math.hypot(x - r, y - r) / r; if (t >= 1) continue; const a = t < 0.55 ? 1 - (t / 0.55) * 0.38 : 0.62 * (1 - (t - 0.55) / 0.45); const q = Math.floor(a * 5 + BAYER4[((y & 3) << 2) | (x & 3)]) / 5; if (q <= 0) continue;
    const i = (y * S + x) * 4; d[i + 3] = Math.min(255, Math.round(q * 255));
  }
  g.putImageData(img, 0, 0); if (POOLS.size > 60) POOLS.clear(); POOLS.set(r, cv); return cv;
}

/** A pile of fallen brick at a breached wall that still shows from outside (the building is roofed): upright, so it sits on the wall's foot. */
let PILE = null;
function rubblePile() {
  if (PILE) return PILE; const c = mkCanvas(34, 20); const g = c.getContext('2d'); g.fillStyle = INK; g.fillRect(2, 8, 30, 10); g.fillStyle = '#2a2420'; g.fillRect(4, 9, 26, 7);
  for (let i = 0; i < 16; i++) { const u = unit(`pile|${i}`); const v = unit(`pile|${i}|v`); g.fillStyle = ['#8a4a3a', '#a8604a', '#6a3a2a', '#c8b8a0'][i % 4]; g.fillRect(3 + Math.floor(u * 24), 4 + Math.floor(v * 10), 4 + (i % 3) * 2, 3 + (i % 2) * 2); }
  PILE = c; return c;
}

/** Everything about a map that does not change in a battle, built once: the ground (flat, cut to iso diamonds as it is needed), and the things that stand on it. */
export function bakeScene(map0) {
  setPixelProps(true);
  const map = map0.surf ? map0 : legacyDecor(map0); const gm = gameMapOf(map); const ground = bakeGround(map, gm); const gg = ground.getContext('2d'); gg.imageSmoothingEnabled = false;
  const items = []; const flat = [];
  for (const p of map.props) {
    const pp = { w: 1, h: 1, ...(PROP_TYPES[p.type]?.defaults || {}), ...p };
    if (p.type === 'crosswalk') { drawProp(gg, pp, { wind: 0, map: gm, time: 0, night: false }); continue; }
    const W = pp.w || 1; const Hh = pp.h || 1; const ctx = { wind: 0, map: gm, time: 0, night: false };
    if (FLAT_PROPS.has(p.type)) { const a = project(p.x * TP, p.y * TP); const b2 = project((p.x + W) * TP, (p.y + Hh) * TP); flat.push({ pp, ctx, rect: { x0: a.x - Hh * TP, x1: b2.x + Hh * TP, y0: a.y, y1: b2.y } }); continue; }
    const leafy = p.type === 'tree' || p.type === 'pine' || p.type === 'bush'; const cx = (p.x + W / 2) * TP; const cy = (p.y + Hh / 2) * TP; const ip = project(cx, cy); const hw = W * 16 + 24; const up = 112 + (Hh - 1) * TP;
    items.push({ k: 'prop', pp, ctx, cx, cy, fy: (p.y + Hh) * TP - 2, ip, leaf: leafy ? (p.type === 'pine' ? '#2f5a46' : p.type === 'bush' ? '#5a7a4a' : (p.color || '#4f7a4a')) : null, box: { x0: p.x * TP, y0: p.y * TP, x1: (p.x + W) * TP, y1: (p.y + Hh) * TP }, rect: { x0: ip.x - hw, x1: ip.x + hw, y0: ip.y - up, y1: ip.y + 6 } });
  }
  for (const c of map.cars || []) {
    const body = carBody(c.kind, c.color, c.dir); const bw = body.width; const bh = body.height; const ip = project(c.x, c.y); const dw = bw + bh + 8; const hg = carHeight(c.kind);
    items.push({ k: 'car', c, box: { x0: c.x - bw / 2, y0: c.y - bh / 2, x1: c.x + bw / 2, y1: c.y + bh / 2 }, rect: { x0: ip.x - dw / 2 - 4, x1: ip.x + dw / 2 + 4, y0: ip.y - (bw + bh) / 4 - hg - 6, y1: ip.y + (bw + bh) / 4 + 10 } });
  }
  const recs = new Map(); for (const b of map.buildings) recs.set(b.id, isoRec(b));
  return { map, gm, ground, items, flat, recs, chunks: new Map() };
}

/** A breached wall segment: a dark gap with bricks on the ground. */
function rubble(g, tx, ty) {
  const x = tx * TP; const y = ty * TP; g.fillStyle = INK; g.fillRect(x + 2, y + 2, TP - 4, TP - 4); g.fillStyle = '#2a2420'; g.fillRect(x + 4, y + 4, TP - 8, TP - 8);
  for (let i = 0; i < 9; i++) { const u = unit(`rub|${tx}|${ty}|${i}`); const v = unit(`rub|${tx}|${ty}|${i}|v`); g.fillStyle = ['#8a4a3a', '#a8604a', '#6a3a2a', '#c8b8a0'][i % 4]; g.fillRect(x + 3 + Math.floor(u * (TP - 9)), y + 3 + Math.floor(v * (TP - 9)), 4 + (i % 3) * 2, 3 + (i % 2) * 2); }
}

/** A trench that has fallen in: churned earth and a few planks, over the painted trench. */
function fallenEarth(g, tx, ty) {
  const x = tx * TP; const y = ty * TP; g.fillStyle = '#4a3a2a'; g.fillRect(x, y, TP, TP);
  for (let i = 0; i < 14; i++) { const u = unit(`fe|${tx}|${ty}|${i}`); const v = unit(`fe|${tx}|${ty}|${i}|v`); g.fillStyle = ['#6a5236', '#3a2c1e', '#7a6244', '#2e2418'][i % 4]; g.fillRect(x + Math.floor(u * (TP - 8)), y + Math.floor(v * (TP - 8)), 5 + (i % 3) * 3, 4 + (i % 2) * 3); }
  g.fillStyle = INK; for (let i = 0; i < 2; i++) { const u = unit(`fp|${tx}|${ty}|${i}`); g.fillRect(x + 3 + Math.floor(u * 16), y + 4 + i * 14, 12, 3); }
}

/**
 * One floor of a building as a plan, in the game's roofless look: plank floors with a shadow under the north wall, furniture on the boards, the stair. Painted at world px (origin at the map's corner).
 * `o.walls = false` leaves the wall tiles out (the isometric view stands them up as boxes); `o.label = false` leaves out the floor plate.
 */
function plan(g, map, b, floor, gm, o = {}) {
  const X = b.x * TP; const Y = b.y * TP; const S = ART_STYLES[b.astyle] || ART_STYLES.halver; const wall = S.walls[0]; const wlo = shade(wall, -30); const whi = shade(wall, 22);
  const at = (i, j) => (i < b.x || j < b.y || i >= b.x + b.w || j >= b.y + b.h ? TILE.WALL : map.tiles[j * map.w + i]);
  const solid = (t) => t === TILE.WALL || t === TILE.WINDOW;
  for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) {
    const t = map.tiles[j * map.w + i]; const x = i * TP; const y = j * TP;
    if (t === TILE.WALL || t === TILE.WINDOW) {
      if (o.walls === false) continue;
      g.fillStyle = INK; g.fillRect(x, y, TP, TP); g.fillStyle = wall; g.fillRect(x + 2, y + 2, TP - 4, TP - 4);
      g.fillStyle = wlo; for (let r = 4; r < TP - 2; r += 6) { g.fillRect(x + 2, y + r + 4, TP - 4, 1); g.fillRect(x + 2 + ((r / 6 + i) % 2) * 8 + 4, y + r - 2, 1, 6); }
      g.fillStyle = whi; g.fillRect(x + 2, y + 2, TP - 4, 2); g.fillRect(x + 2, y + 2, 2, TP - 4);
      if (t === TILE.WINDOW) { const horiz = solid(at(i - 1, j)) && solid(at(i + 1, j)); g.fillStyle = INK; g.fillRect(x + (horiz ? 4 : 8), y + (horiz ? 8 : 4), horiz ? TP - 8 : TP - 16, horiz ? TP - 16 : TP - 8); g.fillStyle = '#7aa3b8'; g.fillRect(x + (horiz ? 5 : 9), y + (horiz ? 9 : 5), horiz ? TP - 10 : TP - 18, horiz ? TP - 18 : TP - 10); g.fillStyle = '#cfe6f0'; g.fillRect(x + (horiz ? 5 : 9), y + (horiz ? 9 : 5), horiz ? 8 : 3, horiz ? 3 : 8); }
    } else {
      const k = (i * 7 + j * 13) % 3; g.fillStyle = ['#b98a5e', '#b08157', '#c0925f'][k]; g.fillRect(x, y, TP, TP);
      g.fillStyle = 'rgba(70,40,20,0.35)'; for (let r = 0; r < TP; r += 8) g.fillRect(x, y + r + 7, TP, 1); g.fillStyle = 'rgba(255,230,190,0.16)'; for (let r = 0; r < TP; r += 8) g.fillRect(x, y + r, TP, 1);
      if (solid(at(i, j - 1))) { g.fillStyle = 'rgba(30,18,10,0.38)'; g.fillRect(x, y, TP, 7); } if (solid(at(i - 1, j))) { g.fillStyle = 'rgba(30,18,10,0.22)'; g.fillRect(x, y, 5, TP); }
      if (t === TILE.DOOR) { g.fillStyle = INK; g.fillRect(x + 2, y + 6, TP - 4, TP - 10); g.fillStyle = '#6b4a32'; g.fillRect(x + 4, y + 8, TP - 8, TP - 14); g.fillStyle = '#e8c35a'; g.fillRect(x + TP - 10, y + 16, 3, 3); }
      if (t === TILE.STAIRS) { g.fillStyle = INK; g.fillRect(x + 1, y + 1, TP - 2, TP - 2); g.fillStyle = '#8a8478'; g.fillRect(x + 3, y + 3, TP - 6, TP - 6); for (let q = 0; q < 6; q++) { g.fillStyle = q % 2 ? '#a8a298' : '#948e82'; g.fillRect(x + 3, y + 4 + q * 4, TP - 6, 3); } g.fillStyle = '#e8c84a'; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.fillText(floor < b.floors - 1 ? '▲' : '▼', x + TP / 2, y + TP / 2 + 5); }
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
  if (o.label !== false) { g.fillStyle = 'rgba(16,14,36,0.9)'; g.fillRect(X, Y - 20, 132, 18); g.strokeStyle = '#ffe28a'; g.lineWidth = 2; g.strokeRect(X, Y - 20, 132, 18); g.fillStyle = '#ffe28a'; g.font = 'bold 12px system-ui'; g.textAlign = 'left'; g.fillText(`FLOOR ${floor + 1} OF ${b.floors}`, X + 8, Y - 6); }
}

const dirOf = (u, to) => spriteFacing(to.x - u.x, to.y - u.y);
/** Which spec of the fleet a battle unit is drawn as (its kind and class; a helicopter's armour tells an attack helicopter from a scout). */
const specOf = (u) => (u.vtype === 'rainmaker' || u.vtype === 'longbow' || (FLEET[u.vtype] && VEHICLES[u.vtype]?.era >= 3) ? u.vtype : u.kind === 'tank' ? (u.armourBar >= 3 ? 'bulwark' : 'anvil') : u.kind === 'helicopter' ? (u.armourBar >= 2 ? 'talon' : 'viper') : u.kind === 'carrier' ? 'wolf' : u.role === 'recon' ? 'scout' : u.role === 'artillery' ? 'hammer' : u.role === 'antiair' ? 'skyguard' : 'truck');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** The view: owns a canvas, a camera (in iso space: `cam` is the iso point at the canvas's top left) and the effects; `draw(B, ui)` paints a frame. */
export class BattleView {
  constructor(canvas) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.cam = { x: 0, y: 0, zoom: 1 }; this.fx = null; this.scene = null; this.map = null; this.t = 0; this.hdg = new Map(); this.face = new Map(); this.air = []; this.labels = []; this.rings = []; this.evi = 0; this.lastShots = new Map(); this.lastHp = new Map(); this.seenAt = new Map(); this.bld = new IsoBuildings(200); this.fade = new Map(); this.floors = new Map(); this.opened = {}; this.ex = 0; this.ey = 0; this.r3 = null; }
  attach(B, looks = {}) {
    this.B = B; this.map = B.map; this.scene = bakeScene(B.map); this.looks = looks; this.evi = B.events.length; this.air = []; this.labels = []; this.rings = []; this.lastShots.clear(); this.lastHp.clear(); this.seenAt.clear(); this.fade.clear(); this.floors.clear(); this.bld = new IsoBuildings(200);
    if (this.r3) this.r3.attach(B, this); // (the 3D layer builds its own buildings: no pictures to paint)
    else if (typeof document !== 'undefined') for (const r of this.scene.recs.values()) this.bld.picture(r, { lit: false, night: false, locked: false }); // (all painted now, not one by one in the middle of a fight)
  }
  tier() { return this.cam.zoom < 0.55 ? 'far' : this.cam.zoom > 1.8 ? 'close' : 'command'; }

  // ---- the camera: the only place the iso mapping meets the screen. Screen (client) px <-> world px.
  /** The world point (px) at height z that shows under client position (sx, sy). */
  toWorld(sx, sy, z = 0) { const r = this.cv.getBoundingClientRect(); return unproject((sx - r.left) / this.cam.zoom + this.cam.x, (sy - r.top) / this.cam.zoom + this.cam.y, z); }
  /** The client position of a world point (px) at height z. */
  toScreen(wx, wy, z = 0) { const r = this.cv.getBoundingClientRect(); const p = project(wx, wy, z); return { x: r.left + (p.x - this.cam.x) * this.cam.zoom, y: r.top + (p.y - this.cam.y) * this.cam.zoom }; }
  /** The canvas position of a world point (px) at height z (what the pings and the cursor draw with). */
  toCanvas(wx, wy, z = 0) { const p = project(wx, wy, z); return { x: (p.x - this.cam.x) * this.cam.zoom, y: (p.y - this.cam.y) * this.cam.zoom }; }
  toTile(sx, sy) { const w = this.toWorld(sx, sy); return { x: w.x / TP, y: w.y / TP }; }
  center(tx, ty) { const p = project(tx * TP, ty * TP); this.cam.x = p.x - this.cv.width / 2 / this.cam.zoom; this.cam.y = p.y - this.cv.height / 2 / this.cam.zoom; this.clamp(); }
  /** The middle of the view must lie over the map (a little beyond its edge), so the map is never lost off the screen. */
  clamp() {
    const z = this.cam.zoom; const vw = this.cv.width / z; const vh = this.cv.height / z; const c = unproject(this.cam.x + vw / 2, this.cam.y + vh / 2); const m = 40;
    const wx = clamp(c.x, -m, this.map.w * TP + m); const wy = clamp(c.y, -m, this.map.h * TP + m); if (wx === c.x && wy === c.y) return;
    const p = project(wx, wy); this.cam.x = p.x - vw / 2; this.cam.y = p.y - vh / 2;
  }
  zoomBy(f, sx, sy) { const before = this.toWorld(sx, sy); const z = Math.max(0.3, Math.min(4, this.cam.zoom * f)); this.cam.zoom = z <= 1.05 && z >= 0.95 ? 1 : Math.abs(z - 3) < 0.2 ? 3 : z; const r = this.cv.getBoundingClientRect(); const p = project(before.x, before.y); this.cam.x = p.x - (sx - r.left) / this.cam.zoom; this.cam.y = p.y - (sy - r.top) / this.cam.zoom; this.clamp(); }

  // ---- picking: all by the screen position of a thing, never by a world rectangle
  /** Where on the screen a unit is (its chest; a helicopter's hull is high). */
  chest(u) { return this.toScreen(u.x * TP, u.y * TP, u.kind === 'inf' ? 10 : u.kind === 'helicopter' ? 46 : 8); }
  /** The nearest of `units` to the client position (sx, sy), or null. */
  unitAt(units, sx, sy) { let best = null; let bd = Infinity; for (const u of units) { const p = this.chest(u); const d = Math.hypot(p.x - sx, p.y - sy); const lim = (u.kind === 'inf' ? 22 : 34) + 8 * this.cam.zoom; if (d < lim && d < bd) { bd = d; best = u; } } return best; }
  /** The units whose screen positions lie in the client rectangle. */
  unitsIn(units, x0, y0, x1, y1) { const lo = { x: Math.min(x0, x1), y: Math.min(y0, y1) }; const hi = { x: Math.max(x0, x1), y: Math.max(y0, y1) }; return units.filter((u) => { const p = this.chest(u); return p.x >= lo.x && p.x <= hi.x && p.y >= lo.y && p.y <= hi.y; }); }
  /** The standing (roofed) building under a client position, if the pointer is on its picture: what the player means by "that building". */
  buildingAt(sx, sy) {
    if (!this.scene) return null; const w = this.toWorld(sx, sy); const ip = project(w.x, w.y); let best = null; let bd = -Infinity;
    for (const b of this.map.buildings) { if (this.opened[b.id]) continue; const rec = this.scene.recs.get(b.id); const box = boxOf(b); if (prismHit(box, this.heightPx(rec), ip.x, ip.y) < 0) continue; const d = box.x0 + box.x1 + box.y0 + box.y1; if (d > bd) { bd = d; best = b; } }
    return best;
  }

  // ---- canvas transforms for one frame (set by `draw`)
  screen(g) { const z = this.cam.zoom; g.setTransform(z, 0, 0, z, this.ex, this.ey); }
  ground(g) { const z = this.cam.zoom; g.setTransform(z, z / 2, -z, z / 2, this.ex, this.ey); }
  /** An upright sprite: the flat drawing's point (fx, fy) stands on the world point (wx, wy), lifted by z. */
  bill(g, wx, wy, z = 0, fx = 0, fy = 0) { const k = this.cam.zoom; g.setTransform(k, 0, 0, k, this.ex + k * Math.round(wx - wy - fx), this.ey + k * Math.round((wx + wy) / 2 - z - fy)); }
  /** A flat drawing whose origin lies on the world point (wx, wy) at height z, laid in the ground plane. */
  lay(g, wx, wy, z = 0) { const k = this.cam.zoom; g.setTransform(k, k / 2, -k, k / 2, this.ex + k * Math.round(wx - wy), this.ey + k * Math.round((wx + wy) / 2 - z)); }
  /** A circle of world radius r on the ground, as the 2:1 ellipse it is on the screen (the transform is set; draw at the origin). */
  ring(g, wx, wy, r, z = 0) { this.bill(g, wx, wy, z); g.beginPath(); g.ellipse(0, 0, r * Math.SQRT2, r * Math.SQRT1_2, 0, 0, Math.PI * 2); }

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

  /** What changed since the last frame becomes effects: shots, hits, kills. Ground points are world px; the height is passed on its own. */
  effects(B) {
    const T = TP; const lab = (x, y, z, text) => this.labels.push({ x, y, z, text, age: 0 });
    for (const e of B.events.slice(this.evi)) {
      if (e.k === 'blast') { const big = e.r >= 2.5; this.fx.blast(e.x * T, e.y * T, big, 6); for (let i = 0; i < Math.round(e.r * 2); i++) this.fx.blast(e.x * T + (unit(`bl|${B.tick}|${i}`) - 0.5) * e.r * T * 1.4, e.y * T + (unit(`bm|${B.tick}|${i}`) - 0.5) * e.r * T * 1.2, false, 6); this.rings.push({ x: e.x * T, y: e.y * T, r: e.r * T, age: 0 }); }
      else if (e.k === 'pass') this.air.push({ kind: e.kind, id: e.id, x0: e.x0 * T, x1: e.x1 * T, y: e.y * T, t0: e.t, dur: e.dur });
      else if (e.k === 'module') { const u = B.byId.get(e.id); if (u) lab(u.x * T, u.y * T, 34, { tracks: 'TRACKS OUT', gun: 'GUN OUT', engine: 'ENGINE ON FIRE', crew: 'CREW OUT' }[e.module] || e.module); }
      else if (e.k === 'breach') { this.fx.blast((e.x + 0.5) * T, (e.y + 0.5) * T, false, 14); for (let i = 0; i < 6; i++) this.fx.hit((e.x + unit(`br|${i}`)) * T, (e.y + unit(`bs|${i}`)) * T, 14); }
      else if (e.k === 'nodesignate') { const u = B.byId.get(e.id); if (u) lab(u.x * T, u.y * T, 40, 'NOT DESIGNATED'); }
      else if (e.k === 'battery') { const u = B.byId.get(e.id); if (u) { const a = Math.atan2(e.y - u.y, e.x - u.x); this.fx.muzzle(u.x * T, u.y * T, Math.cos(a), Math.sin(a), 10); this.fx.smoke(u.x * T + Math.cos(a) * 18, u.y * T + Math.sin(a) * 18, 10); lab(u.x * T, u.y * T, 40, 'COUNTER-BATTERY'); } }
      else if (e.k === 'shell' || e.k === 'salvo') { const u = B.byId.get(e.id); if (u) { const a = Math.atan2(e.y - u.y, e.x - u.x); this.fx.muzzle(u.x * T, u.y * T, Math.cos(a), Math.sin(a), 10); this.fx.smoke(u.x * T + Math.cos(a) * 18, u.y * T + Math.sin(a) * 18, 10); this.fx.smoke(u.x * T + Math.cos(a) * 26, u.y * T + Math.sin(a) * 26, 14); } }
      else if (e.k === 'stabilised' || e.k === 'evac') { const u = B.byId.get(e.id); if (u) lab(u.x * T, u.y * T, 30, e.k === 'evac' ? 'EVACUATED' : 'STABILISED'); }
      else if (e.k === 'plant') lab(e.x * T, e.y * T, 20, 'CHARGE SET');
      else if (e.k === 'dronedown') { this.fx.blast(e.x * T, e.y * T, false, 24); lab(e.x * T, e.y * T, 40, 'DRONE DOWN'); }
      else if (e.k === 'shotdown') { this.air = this.air.filter((a) => a.id !== e.id); lab(e.x * T, e.y * T, 60, 'SHOT DOWN'); for (let i = 0; i < 4; i++) this.fx.blast(e.x * T + (unit(`sd|${i}`) - 0.5) * 40, e.y * T, i < 2, 40 - i * 8); }
      else if (e.k === 'bingo') { const u = B.byId.get(e.id); if (u) lab(u.x * T, u.y * T, 50, 'BINGO FUEL'); }
      else if (e.k === 'noshells') { const u = B.byId.get(e.id); if (u) lab(u.x * T, u.y * T, 40, 'OUT OF SHELLS'); }
      else if (e.k === 'outofrange') { const u = B.byId.get(e.id); if (u) lab(u.x * T, u.y * T, 40, 'OUT OF RANGE'); }
      else if (e.k === 'deploying' || e.k === 'deployed' || e.k === 'repaired' || e.k === 'fireout' || e.k === 'bail' || e.k === 'full') { const u = B.byId.get(e.id); if (u) lab(u.x * T, u.y * T, 40, { deploying: 'SETTING UP', deployed: 'READY TO FIRE', repaired: 'REPAIRED', fireout: 'FIRE OUT', bail: 'BAILED OUT', full: 'FULL' }[e.k]); if (e.k === 'bail' && u) this.fx.blast(u.x * T, u.y * T, false, 8); }
      else if (e.k === 'collapse') { this.fx.hit((e.x + 0.5) * T, (e.y + 0.5) * T, 6); this.fx.hit((e.x + 0.5) * T, (e.y + 0.7) * T, 6); }
      else if (e.k === 'wallhit') this.fx.hit((e.x + 0.5) * T, (e.y + 0.5) * T, 14);
      else if (e.k === 'down' && e.abandoned) { const u = B.byId.get(e.id); if (u) lab(u.x * T, u.y * T, 34, 'ABANDONED'); }
    }
    this.evi = B.events.length;
    if (B.tick % 3 === 0) for (const c of B.smoke) if (c.until > B.tick) for (let i = 0; i < 2; i++) this.fx.cloud((c.x + (unit(`sc|${B.tick}|${i}`) - 0.5) * c.r * 1.7) * T, (c.y + (unit(`sd|${B.tick}|${i}`) - 0.5) * c.r * 1.3) * T, 6);
    for (const u of B.units) if (u.burning && B.tick % 4 === 0) this.fx.flame(u.x * T, u.y * T, 8);
    for (const u of B.units) {
      const s0 = this.lastShots.get(u.id) ?? u.shots; if (u.shots > s0) { const t = u.target ? B.byId.get(u.target) : null; if (t) { const dx = t.x - u.x; const dy = t.y - u.y; const d = Math.hypot(dx, dy) || 1; this.fx.muzzle(u.x * TP, u.y * TP, dx / d, dy / d, 12); this.fx.tracer(u.x * TP, u.y * TP, t.x * TP, t.y * TP, u.side, 12); if (u.W.pierce >= 1 || u.W.rocket) this.fx.blast(t.x * TP, t.y * TP, false, 8); } }
      this.lastShots.set(u.id, u.shots);
      const h0 = this.lastHp.get(u.id) ?? u.hp; if (u.hp < h0 - 0.5) this.fx.hit(u.x * TP, u.y * TP, 10); if (h0 > 0 && u.hp <= 0) this.fx.blast(u.x * TP, u.y * TP, u.kind !== 'inf', 8); this.lastHp.set(u.id, u.hp);
      if (!u.alive && u.kind !== 'inf' && B.tick % 8 === 0) this.fx.smoke(u.x * TP, u.y * TP, 6);
    }
  }

  /** The ground, cut to chunks and baked to iso diamonds as they come into view (the flat ground canvas is kept for it). Neighbours overlap by two pixels so no seam shows at a fractional zoom. */
  groundChunk(cx, cy) {
    const key = cy * 1000 + cx; let d = this.scene.chunks.get(key); if (d) return d;
    const G = this.scene.ground; const x0 = cx * CHUNK; const y0 = cy * CHUNK; const w = Math.min(CHUNK + 2, G.width - x0); const h = Math.min(CHUNK + 2, G.height - y0);
    const src = mkCanvas(w, h); src.getContext('2d').drawImage(G, x0, y0, w, h, 0, 0, w, h);
    d = { img: bakeDiamond(src), ix: x0 - y0 - h, iy: (x0 + y0) / 2 }; this.scene.chunks.set(key, d); return d;
  }

  /** The units to draw: yours and the enemy in sight, not those inside a roofed building or on another floor than the one shown. */
  visibleUnits(B, open, seen) {
    return B.units.filter((u) => (u.side === 'p' || seen.has(u.id)) && !u.fled && !u.hidden).filter((u) => {
      const v = open[B.map.bid[Math.floor(u.y) * B.map.w + Math.floor(u.x)]];
      const inside = B.map.bid[Math.floor(u.y) * B.map.w + Math.floor(u.x)] >= 0 && u.kind === 'inf';
      if (inside && !v) return false; // inside a roofed building: not seen
      if (inside && v && v.floor !== u.z && !(v.ground && u.z === 0)) return false; // on a floor that is not the one shown
      return true;
    });
  }

  // ---- what the 3D layer (src/engine3d/battle3d.js) asks of the view
  specKey(u) { return specOf(u); }
  /** A building's height in px in whichever view is drawn (the 3D storeys are taller than the pictures'). */
  heightPx(rec) { return this.r3 ? this.r3.heightPx(rec) : buildingHeight(rec); }
  /** The 3D layer is lost or broken: the Canvas 2D isometric battle takes over (nothing else changes). */
  dropR3() { const r = this.r3; this.r3 = null; try { r?.dispose(); } catch { /* already gone */ } this.floors.clear(); }
  /** The side colours and skin of a soldier (the same the 2D sprite is painted with). */
  soldierLook(u) {
    const look = { ...DEFAULT_LOOK, ...(this.looks?.[u.id] || {}) }; const mine = u.side === 'p'; const cloth = mine ? (LOOKS.primary[look.primary] || '#5e7a46') : ENEMY.cloth;
    return { cloth, helm: mine ? shade(cloth, -18) : ENEMY.helm, legs: mine ? shade(cloth, -34) : ENEMY.legs, skin: ['#f2d6c0', '#e2b896', '#c48a62', '#8a5a3a', '#6a4430'][Math.floor(unit(`${u.id}|skin`) * 5)], gun: WLOOK[u.weapon] || null, mine };
  }
  /** One floor of a building as a plan (no walls, no label) on its own canvas, for the 3D open building's floor. */
  floorCanvas(b, floor, B) { const src = mkCanvas(b.w * TP, b.h * TP); const sg = src.getContext('2d'); sg.imageSmoothingEnabled = false; sg.translate(-b.x * TP, -b.y * TP); plan(sg, B.map, b, floor, this.scene.gm, { walls: false, label: false }); return src; }
  /** The flat props and the changes the fight made to the ground, painted into a piece of the baked ground (world px; the context is already shifted). */
  paintFlat(g, x0, y0, w, h) { for (const f of this.scene.flat) { const p = f.pp; if ((p.x + (p.w || 1) + 1) * TP < x0 || (p.x - 1) * TP > x0 + w || (p.y + (p.h || 1) + 1) * TP < y0 || (p.y - 1) * TP > y0 + h) continue; drawProp(g, p, f.ctx); } }
  paintDecals(g, B) { for (const c of B.collapsed || []) fallenEarth(g, c.x, c.y); for (const r of B.rubble) if (B.map.bid[r.y * B.map.w + r.x] < 0) rubble(g, r.x, r.y); }

  draw(B, ui = {}) {
    if (this.r3) { if (this.draw3d(B, ui)) return; this.dropR3(); }
    const g = this.ctx; const cam = this.cam; this.t += 1 / 60; const tier = this.tier(); const Z = cam.zoom; this.opened = ui.open || {};
    this.ex = Math.round(-cam.x * Z); this.ey = Math.round(-cam.y * Z);
    const view = { x0: cam.x, y0: cam.y, x1: cam.x + this.cv.width / Z, y1: cam.y + this.cv.height / Z }; this.vw = view;
    g.imageSmoothingEnabled = false; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#10101c'; g.fillRect(0, 0, this.cv.width, this.cv.height);
    this.screen(g);
    // ground: the diamonds in view, then flat props, the objective and the way out
    const G = this.scene.ground; const nx = Math.ceil(G.width / CHUNK); const ny = Math.ceil(G.height / CHUNK);
    for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) {
      const x0 = cx * CHUNK; const y0 = cy * CHUNK; const a = project(x0, y0); const b = project(x0 + CHUNK, y0 + CHUNK);
      if (project(x0 + CHUNK, y0).x < view.x0 - 4 || project(x0, y0 + CHUNK).x > view.x1 + 4 || b.y < view.y0 - 4 || a.y > view.y1 + 4) continue;
      const d = this.groundChunk(cx, cy); g.drawImage(d.img, d.ix, d.iy);
    }
    const hit = (r, pad = 0) => r.x1 > view.x0 - pad && r.x0 < view.x1 + pad && r.y1 > view.y0 - pad && r.y0 < view.y1 + pad;
    this.ground(g); for (const f of this.scene.flat) if (hit(f.rect)) drawProp(g, f.pp, f.ctx);
    const o = B.map.objective; this.ring(g, o.x * TP + 16, o.y * TP + 16, 4 * TP); g.strokeStyle = 'rgba(255,224,120,0.9)'; g.lineWidth = 3; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]);
    if (B.goal === 'extract' || B.goal === 'rescue') { const h0 = B.map.spawns.p; this.ring(g, h0.x * TP + 16, h0.y * TP + 16, 4 * TP); g.strokeStyle = 'rgba(120,255,160,0.9)'; g.lineWidth = 3; g.setLineDash([6, 5]); g.stroke(); g.setLineDash([]); }
    if (B.goal === 'logistics') { this.ground(g); g.strokeStyle = 'rgba(120,255,160,0.9)'; g.lineWidth = 3; g.strokeRect(B.map.exit.x * TP - 20, B.map.exit.y * TP - 60, 40, 120); }
    const seen = ui.seen || new Set(B.units.filter((u) => u.side === 'e').map((u) => u.id));
    const open = this.opened;
    // a building opened to a floor plan lies on the ground (its walls stand up as items below); the rest stand, in order from back to front, with the people between them
    this.ground(g); for (const c of B.collapsed || []) fallenEarth(g, c.x, c.y);
    for (const r of B.rubble) if (B.map.bid[r.y * B.map.w + r.x] < 0) rubble(g, r.x, r.y); // (a breach in a wall that is not a building's, as round a compound)
    this.screen(g);
    const items = []; const sdt = 1 / 60;
    for (const b of B.map.buildings) this.buildingItems(g, items, b, open[b.id], B, ui, seen, hit, sdt);
    if (tier === 'far') { this.collect(items, [], hit); this.paint(g, items, B, ui); this.banners(g, B, seen, ui); this.screen(g); this.fx.draw(g, project); g.setTransform(1, 0, 0, 1, 0, 0); return; }
    const list = this.visibleUnits(B, open, seen);
    this.collect(items, list, hit, B, ui);
    this.paint(g, items, B, ui);
    this.screen(g); this.fx.draw(g, project);
    this.overlay(g, B);
    for (const b of B.map.buildings) if (open[b.id] && this.stateOf(b).t > 0.5) this.plate(g, b, open[b.id].floor);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** The 3D frame: the WebGL layer draws ground, buildings, props and units; this canvas (transparent, over it) draws only what is not solid: rings, bars, order lines, fire and smoke, text. Returns false when the GL layer is gone. */
  draw3d(B, ui = {}) {
    const g = this.ctx; const cam = this.cam; this.t += 1 / 60; const tier = this.tier(); const Z = cam.zoom; this.opened = ui.open || {};
    this.ex = Math.round(-cam.x * Z); this.ey = Math.round(-cam.y * Z);
    this.vw = { x0: cam.x, y0: cam.y, x1: cam.x + this.cv.width / Z, y1: cam.y + this.cv.height / Z };
    const seen = ui.seen || new Set(B.units.filter((u) => u.side === 'e').map((u) => u.id)); const open = this.opened;
    const list = tier === 'far' ? [] : this.visibleUnits(B, open, seen);
    if (!this.r3.render(B, ui, this, { units: list, foci: this.foci(B, ui, seen), tier, dt: 1 / 60, open })) return false;
    g.imageSmoothingEnabled = false; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.cv.width, this.cv.height);
    this.ground(g);
    const o = B.map.objective; this.ring(g, o.x * TP + 16, o.y * TP + 16, 4 * TP); g.strokeStyle = 'rgba(255,224,120,0.9)'; g.lineWidth = 3; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]);
    if (B.goal === 'extract' || B.goal === 'rescue') { const h0 = B.map.spawns.p; this.ring(g, h0.x * TP + 16, h0.y * TP + 16, 4 * TP); g.strokeStyle = 'rgba(120,255,160,0.9)'; g.lineWidth = 3; g.setLineDash([6, 5]); g.stroke(); g.setLineDash([]); }
    if (B.goal === 'logistics') { this.ground(g); g.strokeStyle = 'rgba(120,255,160,0.9)'; g.lineWidth = 3; g.strokeRect(B.map.exit.x * TP - 20, B.map.exit.y * TP - 60, 40, 120); }
    this.screen(g);
    if (tier === 'far') { this.banners(g, B, seen, ui); this.screen(g); this.fx.draw(g, project); g.setTransform(1, 0, 0, 1, 0, 0); return true; }
    for (const u of list) this.marks(g, u, ui);
    this.screen(g); this.fx.draw(g, project);
    this.overlay(g, B);
    for (const b of B.map.buildings) if (open[b.id] && this.stateOf(b).t > 0.5) this.plate(g, b, open[b.id].floor);
    g.setTransform(1, 0, 0, 1, 0, 0);
    return true;
  }

  /** A unit's ring (selected), its state pip and health bar on the overlay, above the 3D body (which is taller than the sprite was). */
  marks(g, u, ui) {
    const wx = u.x * TP; const wy = u.y * TP; const inf = u.kind === 'inf'; const sel = ui.selected?.has(u.id);
    if (sel) { this.bill(g, wx, wy, 0); g.strokeStyle = '#7af0a0'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 2, inf ? 11 : 26, inf ? 5.5 : 13, 0, 0, Math.PI * 2); g.stroke(); }
    if (!u.alive) return;
    const top = inf ? 46 : u.kind === 'helicopter' ? 112 : 46;
    if (inf && u.state !== 'steady') { this.bill(g, wx, wy, 0); g.fillStyle = u.state === 'broken' ? '#ff5a4a' : u.state === 'pinned' ? '#ffb43a' : '#ffe86a'; g.fillRect(-3, -top - 8, 6, 3); }
    if (u.hp < u.hpMax || sel) { this.bill(g, wx, wy, 0); const w = inf ? 16 : 30; const y = -top; g.fillStyle = INK; g.fillRect(-w / 2 - 1, y - 1, w + 2, 5); g.fillStyle = '#3a2a2a'; g.fillRect(-w / 2, y, w, 3); g.fillStyle = u.side === 'p' ? '#6ae88a' : '#f06a5a'; g.fillRect(-w / 2, y, Math.max(0, Math.round((w * u.hp) / u.hpMax)), 3); }
  }

  stateOf(b) { return this.bld.stateOf(this.scene.recs.get(b.id)); }

  /** The floor plate over an opened building's north corner. */
  plate(g, b, floor) {
    const p = project(b.x * TP, b.y * TP); this.screen(g); const x = Math.round(p.x - 66); const y = Math.round(p.y - 90);
    g.fillStyle = 'rgba(16,14,36,0.9)'; g.fillRect(x, y, 132, 18); g.strokeStyle = '#ffe28a'; g.lineWidth = 2; g.strokeRect(x, y, 132, 18); g.fillStyle = '#ffe28a'; g.font = 'bold 12px system-ui'; g.textAlign = 'left'; g.fillText(`FLOOR ${floor + 1} OF ${b.floors}`, x + 8, y + 13);
  }

  /** The foci a roofed building must not hide: what is selected, the enemy in sight, those of yours in an open room, and the ground under the pointer. */
  foci(B, ui, seen) {
    const out = [];
    for (const u of B.units) {
      if (!u.alive || u.fled || u.hidden) continue;
      const inOpen = u.side === 'p' && u.kind === 'inf' && this.opened[B.map.bid[Math.floor(u.y) * B.map.w + Math.floor(u.x)]]; // (a room that is open is never left hidden behind its neighbour)
      if (ui.selected?.has(u.id) || (u.side === 'e' && seen.has(u.id)) || inOpen) out.push({ x: u.x * TP, y: u.y * TP, z: u.kind === 'inf' ? (this.r3 ? 22 : 14) : this.r3 ? 14 : 8 });
    }
    if (ui.cursor) out.push({ x: ui.cursor.x * TP, y: ui.cursor.y * TP, z: 0 });
    return out;
  }

  /** A building's items for this frame: its roofed picture (faded where a focus stands behind it), or, open, its floor and its walls. */
  buildingItems(g, items, b, openV, B, ui, seen, hit, dt) {
    const rec = this.scene.recs.get(b.id); const box = boxOf(b); const H = buildingHeight(rec); const o = project(box.x0, box.y0);
    const wpx = (b.w + b.h) * TP; if (!hit({ x0: o.x - b.h * TP, x1: o.x - b.h * TP + wpx, y0: o.y - H - 52, y1: o.y + wpx / 2 }, 8)) return;
    const st = this.bld.step(rec, Boolean(openV), this.t, dt); const t = st.t;
    if (t < 1) {
      const pic = this.bld.picture(rec, { lit: false, night: false, locked: false }); const px = o.x - pic.ox; const py = o.y - pic.oy;
      let want = false; let holes = this.fade.get(b.id)?.holes || [];
      if (t < 0.01) {
        const fresh = []; this.fociCache ||= { tick: -1, list: [] }; if (this.fociCache.tick !== this.t) this.fociCache = { tick: this.t, list: this.foci(B, ui, seen) };
        for (const f of this.fociCache.list) { if (!needsFade(box, H, f)) continue; const p = project(f.x, f.y, f.z); if (fresh.length < 6 && !fresh.some((h) => Math.hypot(h.x - p.x, h.y - p.y) < HOLE_R * 0.6)) fresh.push({ x: p.x, y: p.y }); }
        if (fresh.length) { want = true; holes = fresh; this.fade.set(b.id, { holes }); }
      }
      const fade = this.bld.stepFade(rec, want, dt);
      items.push({ box, rect: { x0: px, y0: py, x1: px + pic.canvas.width, y1: py + pic.canvas.height }, draw: (V, c) => {
        V.screen(c); if (t > 0) c.globalAlpha = 1 - t;
        if (fade > 0.01 && holes.length) V.bld.drawWithHoles(c, pic, px, py, holes.map((h) => ({ x: h.x, y: h.y, r: HOLE_R * fade })), holeSprite); else { const w = pic.canvas.width; const h = pic.canvas.height; const v = V.vw; const sx = Math.max(0, Math.floor(v.x0 - px)); const sy = Math.max(0, Math.floor(v.y0 - py)); const ex = Math.min(w, Math.ceil(v.x1 - px)); const ey = Math.min(h, Math.ceil(v.y1 - py)); if (ex > sx && ey > sy) c.drawImage(pic.canvas, sx, sy, ex - sx, ey - sy, px + sx, py + sy, ex - sx, ey - sy); } // (only the part of the picture that is in view)
        c.globalAlpha = 1;
      } });
      if (t < 0.01) for (const r of B.rubble) if (r.x >= b.x && r.x < b.x + b.w && r.y >= b.y && r.y < b.y + b.h) { const wx = (r.x + 0.5) * TP; const wy = (r.y + 0.5) * TP; const ip = project(wx, wy); items.push({ box: { x0: r.x * TP, y0: r.y * TP, x1: (r.x + 1) * TP, y1: (r.y + 1) * TP }, rect: { x0: ip.x - 18, x1: ip.x + 18, y0: ip.y - 22, y1: ip.y + 6 }, draw: (V, c) => { V.bill(c, wx, wy + 10, 0, 17, 20); c.drawImage(rubblePile(), 0, 0); } }); }
    }
    if (!openV || t <= 0) return;
    // open: the floor on the ground, the walls as boxes (a storey at the back, a kerb elsewhere), what is inside drawn as items
    const key = `${b.id}|${openV.floor}|${B.rubble.length}|${(B.collapsed || []).length}`; let fl = this.floors.get(key);
    if (!fl) { const w = b.w * TP; const h = b.h * TP; const src = mkCanvas(w, h); const sg = src.getContext('2d'); sg.imageSmoothingEnabled = false; sg.translate(-b.x * TP, -b.y * TP); plan(sg, B.map, b, openV.floor, this.scene.gm, { walls: false, label: false }); fl = { img: bakeDiamond(src), ix: b.x * TP - b.y * TP - h, iy: (b.x * TP + b.y * TP) / 2 }; this.floors.set(key, fl); if (this.floors.size > 24) this.floors.delete(this.floors.keys().next().value); }
    g.globalAlpha = t; g.drawImage(fl.img, fl.ix, fl.iy); g.globalAlpha = 1;
    const pal = { wall: rec.wall, trim: rec.trim }; const winPal = { wall: rec.wall, trim: rec.trim, glass: rec.glass };
    for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) {
      const tl = B.map.tiles[j * B.map.w + i]; if (tl !== TILE.WALL && tl !== TILE.WINDOW) continue;
      const tall = j === b.y || i === b.x; const pic = columnPicture(tall ? 'tall' : 'low', tl === TILE.WINDOW && tall ? winPal : pal); const gx = i * TP; const gy = j * TP; const p = project(gx, gy); const px = p.x - pic.ox; const py = p.y - pic.oy;
      if (!hit({ x0: px, y0: py, x1: px + pic.canvas.width, y1: py + pic.canvas.height }, 4)) continue;
      items.push({ box: { x0: gx, y0: gy, x1: gx + TP, y1: gy + TP }, rect: { x0: px, y0: py, x1: px + pic.canvas.width, y1: py + pic.canvas.height }, draw: (V, c) => { V.screen(c); if (t < 1) c.globalAlpha = t; c.drawImage(pic.canvas, px, py); c.globalAlpha = 1; } });
    }
  }

  /** Add the standing things (props, parked cars), the people, drones and the like to the item list; those out of view are left out. */
  collect(items, units, hit, B, ui) {
    const far = this.tier() === 'far';
    for (const it of this.scene.items) { if (!hit(it.rect, 24)) continue; items.push(it); }
    if (!units.length || !B) return;
    for (const u of units) {
      const x = u.x * TP; const y = u.y * TP; const ip = project(x, y);
      if (u.kind === 'inf') items.push({ box: pointBox(x, y, 3), rect: { x0: ip.x - 22, x1: ip.x + 22, y0: ip.y - 60, y1: ip.y + 8 }, u, draw: (V, c) => V.unit(c, u, B, ui) });
      else if (u.kind === 'helicopter') items.push({ box: pointBox(x, y, 14), rect: { x0: ip.x - 60, x1: ip.x + 60, y0: ip.y - 110, y1: ip.y + 30 }, u, draw: (V, c) => V.unit(c, u, B, ui) });
      else { const spec = FLEET[specOf(u)]; const len = (spec?.L || 40) * 0.9; const wid = (spec?.W || 24) * 0.9; const hd = this.hdg.get(u.id) ?? 0; items.push({ box: bodyBox(x, y, len, wid, hd), rect: { x0: ip.x - 70, x1: ip.x + 70, y0: ip.y - 70, y1: ip.y + 50 }, u, draw: (V, c) => V.unit(c, u, B, ui) }); }
    }
    for (const d of B.drones) { const x = d.x * TP; const y = d.y * TP; const ip = project(x, y); items.push({ box: pointBox(x, y, 5), rect: { x0: ip.x - 20, x1: ip.x + 20, y0: ip.y - 50, y1: ip.y + 8 }, draw: (V, c) => { V.lay(c, x, y, 0); c.fillStyle = 'rgba(16,14,36,0.28)'; c.fillRect(-7, -4, 14, 8); V.lay(c, x, y, 24); V.drone(c, 0, 0, false); } }); }
    for (const f of B.fpvs) { const x = f.x * TP; const y = f.y * TP; const ip = project(x, y); items.push({ box: pointBox(x, y, 5), rect: { x0: ip.x - 20, x1: ip.x + 20, y0: ip.y - 50, y1: ip.y + 8 }, draw: (V, c) => { V.lay(c, x, y, 0); c.fillStyle = 'rgba(16,14,36,0.28)'; c.fillRect(-7, -4, 14, 8); V.lay(c, x, y, 20); V.drone(c, 0, 0, true); } }); }
    void far;
  }

  /** The items in order from back to front. */
  paint(g, items, B, ui) {
    const far = this.tier() === 'far';
    for (const it of sortItems(items)) {
      if (it.k === 'prop') {
        if (far && it.leaf) { this.screen(g); g.fillStyle = it.leaf; g.fillRect(Math.round(it.ip.x) - 12, Math.round(it.ip.y) - 36, 24, 22); continue; } // (seen from far, a tree is a green blot: the whole forest in view is thousands of sprites)
        this.bill(g, it.cx, it.cy, 0, it.cx, it.fy); drawProp(g, it.pp, { ...it.ctx, time: this.t });
      } else if (it.k === 'car') {
        const c = it.c; const sp = carStack(c); const ip = project(c.x, c.y); this.screen(g); g.drawImage(sp.canvas, Math.round(ip.x - sp.ax), Math.round(ip.y - sp.ay));
      } else it.draw(this, g);
    }
    void B; void ui;
  }

  /** A small quadcopter seen from above, flat in the plane it hovers in: four rotors that blur, a body; an FPV one is red. (The shadow is the caller's.) */
  drone(g, x, y, fpv = false) {
    x = Math.round(x); y = Math.round(y); const INKC = '#1b1a24';
    for (const [dx, dy] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) { g.fillStyle = INKC; g.fillRect(x + dx - 4, y + dy - 4, 9, 9); g.fillStyle = (Math.floor(this.t * 30) % 2) ? '#b8c4d0' : '#8a98a8'; g.fillRect(x + dx - 3, y + dy - 3, 7, 7); }
    g.fillStyle = INKC; g.fillRect(x - 5, y - 5, 11, 11); g.fillStyle = fpv ? '#d8402e' : '#4a5a6a'; g.fillRect(x - 4, y - 4, 9, 9); g.fillStyle = fpv ? '#ff9a7a' : '#8ab6d0'; g.fillRect(x - 2, y - 2, 3, 3);
  }

  /** What is in the air and what is about to land: the passes, the rings round the targets of strikes that are on their way, the shock rings and the labels. */
  overlay(g, B) {
    const T = TP; this.screen(g);
    for (const p of B.pend) { const S = SUPPORT[p.kind]; if ((!S && p.kind !== 'shell') || S?.group === 'smoke') continue; const r = (p.r || S?.r || 1.5) * T; const left = Math.max(0, p.at - B.tick); this.ring(g, p.x * T, p.y * T, r); g.strokeStyle = `rgba(255,${80 + (left % 6) * 20},60,0.9)`; g.lineWidth = 3; g.setLineDash([6, 6]); g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(255,90,60,0.12)'; g.fill(); }
    for (const r of B.runs) { this.screen(g); const a = project(r.x0 * T, r.y * T); const b = project(r.x1 * T, r.y * T); g.strokeStyle = 'rgba(255,200,90,0.5)'; g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]); }
    this.rings = this.rings.filter((q) => q.age < 14); for (const q of this.rings) { q.age++; this.ring(g, q.x, q.y, q.r * (0.3 + q.age / 14)); g.strokeStyle = `rgba(255,230,180,${1 - q.age / 14})`; g.lineWidth = 3; g.stroke(); }
    for (const p of B.pend) if (p.kind === 'charge') { const wx = p.x * T; const wy = p.y * T; this.bill(g, wx, wy, 0, 8, 6); const x = 0; const y = 0; g.fillStyle = INK; g.fillRect(x - 1, y - 1, 18, 14); g.fillStyle = '#b8382a'; g.fillRect(x, y, 16, 12); g.fillStyle = '#e8e0c8'; g.fillRect(x + 2, y + 2, 5, 3); g.fillStyle = (B.tick % 6 < 3) ? '#ff5a3a' : '#4a1a12'; g.fillRect(x + 11, y + 3, 3, 3); }
    for (const d of B.drones) { this.ring(g, d.x * T, d.y * T, UAV.r * T); g.strokeStyle = 'rgba(120,230,255,0.45)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.stroke(); g.setLineDash([]); }
    this.air = this.air.filter((a) => B.tick - a.t0 <= a.dur + 30);
    if (!this.r3) for (const a of this.air) { // (in 3D the jets are models)
      const f = (B.tick - a.t0) / a.dur; const x = a.x0 + (a.x1 - a.x0) * f; const bomber = a.kind === 'bomber';
      if (f >= -0.1 && f <= 1.4) {
        this.lay(g, x, a.y, 0); drawJet(g, 0, 0, 0, bomber, this.t, 'shadow');
        if (!bomber && f >= 0 && f <= 1) { g.fillStyle = '#ffe08a'; for (let i = 0; i < 5; i++) g.fillRect(24 + i * 5, (i % 2) * 2 - 1, 3, 2); }
        this.lay(g, x, a.y, 70); drawJet(g, 0, 0, 0, bomber, this.t, 'body');
      }
    }
    this.labels = this.labels.filter((l) => l.age < 60); g.font = 'bold 12px monospace'; g.textAlign = 'center';
    for (const l of this.labels) { l.age++; this.bill(g, l.x, l.y, l.z + l.age * 0.5); g.fillStyle = INK; g.fillText(l.text, 1, 1); g.fillStyle = '#ffd24a'; g.fillText(l.text, 0, 0); }
  }

  /** One unit, upright (a lying soldier is laid on the ground): its ring if selected, its sprite, its state and its health bar. */
  unit(g, u, B, ui) {
    const wx = u.x * TP; const wy = u.y * TP; const inf = u.kind === 'inf'; const sel = ui.selected?.has(u.id);
    if (sel) { this.bill(g, wx, wy, 0); g.strokeStyle = '#7af0a0'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 2, inf ? 11 : 26, inf ? 5.5 : 13, 0, 0, Math.PI * 2); g.stroke(); }
    if (inf) {
      const t = u.target ? B.byId.get(u.target) : null; const to = u.path?.[0] || t; let ang = this.face.get(u.id); if (to) { ang = dirOf(u, to); this.face.set(u.id, ang); } else if (!ang) ang = u.side === 'p' ? 'right' : 'left';
      if (!u.alive) { this.lay(g, wx, wy, 0.5); const c = u.side === 'p' ? '#516b3e' : ENEMY.cloth; g.fillStyle = 'rgba(16,14,36,0.3)'; g.fillRect(-11, 1, 22, 4); g.fillStyle = INK; g.fillRect(-11, -5, 22, 9); g.fillStyle = c; g.fillRect(-9, -4, 14, 7); g.fillStyle = shade(c, 20); g.fillRect(-9, -4, 14, 2); g.fillStyle = shade(c, -34); g.fillRect(5, -3, 5, 5); g.fillStyle = u.side === 'p' ? '#3a5030' : ENEMY.helm; g.fillRect(-12, -4, 5, 6); g.fillStyle = '#e0b088'; g.fillRect(-8, -2, 2, 2); return; }
      const look = { ...DEFAULT_LOOK, ...(this.looks?.[u.id] || {}) }; const mine = u.side === 'p'; const cloth = mine ? (LOOKS.primary[look.primary] || '#5e7a46') : ENEMY.cloth;
      const skin = ['#f2d6c0', '#e2b896', '#c48a62', '#8a5a3a', '#6a4430'][Math.floor(unit(`${u.id}|skin`) * 5)];
      this.bill(g, wx, wy, 0);
      drawSoldier(g, u.role, 0, 0, ang, { cloth, helm: mine ? shade(cloth, -18) : ENEMY.helm, legs: mine ? shade(cloth, -34) : ENEMY.legs, accent: mine ? (LOOKS.band[look.band] || '#e8c84a') : ENEMY.accent, gun: WLOOK[u.weapon] || FUTURE_LOOKS[u.weapon], era: mine ? (u.era || 1) : 1, skin, t: u.moving ? this.t * 6 + (u.id.length * 0.7) : 0, moving: Boolean(u.moving), scale: 0.95 });
      if (u.state !== 'steady') { g.fillStyle = u.state === 'broken' ? '#ff5a4a' : u.state === 'pinned' ? '#ffb43a' : '#ffe86a'; g.fillRect(-3, -36, 6, 3); }
    } else this.vehicle(g, u, B, wx, wy);
    if (u.alive && (u.hp < u.hpMax || sel)) { this.bill(g, wx, wy, 0); const w = inf ? 16 : 30; const y = -(inf ? 32 : u.kind === 'helicopter' ? 78 : 36); g.fillStyle = INK; g.fillRect(-w / 2 - 1, y - 1, w + 2, 5); g.fillStyle = '#3a2a2a'; g.fillRect(-w / 2, y, w, 3); g.fillStyle = u.side === 'p' ? '#6ae88a' : '#f06a5a'; g.fillRect(-w / 2, y, Math.max(0, Math.round((w * u.hp) / u.hpMax)), 3); }
  }

  /** A war vehicle: the spec for what it is, the paint for whose it is, a hull that turns toward where it goes and a turret that turns toward what it shoots at; hull and turret are stacked to a body with height. */
  vehicle(g, u, B, wx, wy) {
    const target = u.target ? B.byId.get(u.target) : null; const step = u.path?.[0];
    const want = step ? Math.atan2(step.y - u.y, step.x - u.x) : target ? Math.atan2(target.y - u.y, target.x - u.x) : (u.side === 'p' ? 0 : Math.PI);
    const had = this.hdg.get(u.id) ?? want; let d = want - had; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const hd = u.alive ? had + d * 0.12 : had; this.hdg.set(u.id, hd);
    const spec = FLEET[specOf(u)]; const paint = u.side === 'p' ? 'company' : 'varn'; const state = !u.alive ? 'wreck' : u.hp < u.hpMax * 0.45 ? 'damaged' : 'ok';
    const nose = hd + Math.PI / 2; // the sprites point up; the battle's east is zero
    if (u.kind === 'helicopter') {
      this.ground(g); this.bill(g, wx, wy, 0); g.fillStyle = 'rgba(16,14,36,0.26)'; g.beginPath(); g.ellipse(0, 0, (spec.rotor || 40) * 0.8 * Math.SQRT2, (spec.rotor || 40) * 0.8 * Math.SQRT1_2, 0, 0, Math.PI * 2); g.fill();
      this.lay(g, wx, wy, u.alive ? 46 : 0); drawHelo(g, spec, 0, 0, nose, { paint, altitude: 0, phase: this.t * 40 }); return;
    }
    const hb = steps(nose); const tb = target && u.alive ? steps(Math.atan2(target.y - u.y, target.x - u.x) + Math.PI / 2) : null;
    const sp = vehicleStack(spec, paint, state, hb, tb); const ip = project(wx, wy); this.screen(g); g.drawImage(sp.canvas, Math.round(ip.x - sp.ax), Math.round(ip.y - sp.ay));
  }

  /** The far tier: a banner for each group of units (a flag, a number, a bar). */
  banners(g, B, seen, ui) {
    const cell = 6; const groups = new Map();
    for (const u of B.units) { if (!u.alive || u.fled || (u.side === 'e' && !seen.has(u.id))) continue; const k = `${u.side}|${Math.floor(u.x / cell)}|${Math.floor(u.y / cell)}`; const q = groups.get(k) || { side: u.side, n: 0, x: 0, y: 0, hp: 0, max: 0, sel: false, veh: false }; q.n++; q.x += u.x; q.y += u.y; q.hp += u.hp; q.max += u.hpMax; q.sel ||= Boolean(ui.selected?.has(u.id)); q.veh ||= u.kind !== 'inf'; groups.set(k, q); }
    for (const q of groups.values()) {
      this.bill(g, (q.x / q.n) * TP, (q.y / q.n) * TP, 0); const x = 0; const y = 0; const c = q.side === 'p' ? '#5ec27a' : '#e86a58';
      g.fillStyle = INK; g.fillRect(x - 15, y - 33, 4, 38); g.fillRect(x - 12, y - 33, 34, 20); g.fillStyle = c; g.fillRect(x - 11, y - 31, 32, 16); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x - 11, y - 31, 32, 3);
      g.fillStyle = INK; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.fillText(`${q.veh ? '▣' : ''}${q.n}`, x + 5, y - 19);
      g.fillStyle = INK; g.fillRect(x - 12, y - 11, 34, 5); g.fillStyle = '#e8e4c0'; g.fillRect(x - 11, y - 10, Math.round((32 * q.hp) / q.max), 3);
      if (q.sel) { g.strokeStyle = '#7af0a0'; g.lineWidth = 2; g.strokeRect(x - 17, y - 35, 42, 44); }
    }
  }
}
