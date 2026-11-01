// TARGET ART (mock-up only). The battle map built the way the REST of the game builds maps: a tile grid, the real ground painter (drawPixelGround), the real roofless buildings
// (drawPixelBuilding via drawBuilding) with their furnished interiors and tower lobbies, the real prop sprites, and the real people sprites. Only the war pieces (tanks,
// helicopters, damage, effects) are new, drawn in the same pixel idiom at the same scale (a tile is 32 px).
import { GameMap } from '/src/world/gameMap.js';
import { buildPixelGround } from '/src/engine/drawPixelGround.js';
import { PROP_TYPES } from '/src/content/props.js';
import { setPixelProps, drawBuilding, drawProp } from '/src/engine/drawWorld.js';
import { drawShopFront } from '/src/engine/drawPixelBuildings.js';
import { drawSoldier, drawPerson } from './soldiers.js';
import { CATALOG, HELIS, drawVeh, drawHelo } from './fleet.js';
import * as D from './g_damage.js';
import { buildCity, W, H, AV, ST } from './g_city.js';

setPixelProps(true);
export const T = 32; export { W, H, AV, ST };
const hash = (a, b = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const city = buildCity();
export const buildings = city.buildings; export const props = city.props; export const LM = city.LM; export const fieldsDef = city.fields;
export const bAt = (x, y) => buildings.find((b) => b.x === x && b.y === y);
const mapDef = { id: 'battle', name: 'Halden Roads', kind: 'outdoor', tiles: city.m.grid.map((r) => r.join('')), buildings, props, doors: [], spots: {}, fields: city.fields };
export const map = new GameMap(mapDef, PROP_TYPES);
/** the middle of a building's front face and its art-pixel width, for placing breaches and units */
export const front = (b) => ({ x: b.x * T, y: (b.y + b.h) * T, cx: (b.x + b.w / 2) * T, W: b.w * 16 });

let GROUND = null;
export function ground() { if (!GROUND) GROUND = buildPixelGround(map, (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }); return GROUND; }
export function baseItems(o = {}) {
  const items = []; const dmg = o.damage || {};
  for (const b of buildings) { const st = dmg[b.id]; items.push({ y: (b.y + b.h) * T, draw: (g) => drawBuilding(g, b, { lit: false, night: false, time: 0, doorLocked: false, inside: null, people: null }), id: b.id }); if (b.sign || b.awning) items.push({ y: (b.y + b.h) * T + 1, draw: (g) => drawShopFront(g, b, 0, false) }); if (st) items.push({ y: (b.y + b.h) * T + 2, draw: (g) => D.damage(g, b, st) }); }
  for (const p of props) { const pp = { w: 1, h: 1, ...(PROP_TYPES[p.type]?.defaults || {}), ...p }; const flat = p.type === 'crosswalk'; items.push({ y: flat ? -1 : (p.y + (pp.h || 1)) * T - 4, draw: (g) => drawProp(g, pp, { wind: 0, map, time: 0, night: false }) }); }
  return items;
}
const SKINS = ['#f0d0b8', '#e0b088', '#c48a62', '#a8724e', '#7a4f33', '#5a3a2a'], HAIR = ['#141210', '#3a2a1a', '#6a4a2a', '#c8a050', '#8a8a8a', '#c86a2a'], OUTF = ['#c85a4a', '#4a6a9a', '#5a8a5a', '#8a6a9a', '#d8b04a', '#6a6a72', '#3a3a4a', '#b8785a', '#e8e0d0', '#2e5a6a'], LEGS = ['#3a3a4a', '#5a4a3a', '#2e3a4e', '#6a6a72', '#4a3a2a'], STY = ['short', 'parted', 'ponytail', 'bun', 'curly', 'long', 'cap'];
/** townspeople on the pavements and in the plaza, drawn with the game's real people sprites */
export function civilians(items, n = 140, seed = 1) {
  const spots = []; for (const ay of AV) for (let i = 0; i < 24; i++) spots.push([14 * 32 + hash(i, ay + seed) * 160 * 32, (hash(i, ay * 3) < 0.5 ? ay - 1.0 : ay + 4.7) * 32]); for (const sx of ST) for (let i = 0; i < 12; i++) spots.push([(hash(i, sx + seed) < 0.5 ? sx - 1.0 : sx + 4.7) * 32, 10 * 32 + hash(i, sx * 5) * 85 * 32]); if (LM.plaza) for (let i = 0; i < 26; i++) spots.push([(LM.plaza.x0 + 1 + hash(i, 77) * 22) * 32, (LM.plaza.y0 + 9 + hash(i, 78) * 10) * 32]);
  for (let i = 0; i < n; i++) { const [x, y] = spots[Math.floor(hash(i, 91 + seed) * spots.length)]; const a = { skin: SKINS[Math.floor(hash(i, 1) * SKINS.length)], hair: HAIR[Math.floor(hash(i, 2) * HAIR.length)], hairStyle: STY[Math.floor(hash(i, 3) * STY.length)], outfit: OUTF[Math.floor(hash(i, 4) * OUTF.length)], sleeves: OUTF[Math.floor(hash(i, 5) * OUTF.length)], legs: LEGS[Math.floor(hash(i, 6) * LEGS.length)], shoes: '#2a2418', build: ['average', 'thin', 'broad'][i % 3], accessories: [] }; a.sleeves = a.outfit; const face = ['left', 'right', 'up', 'down'][Math.floor(hash(i, 7) * 4)]; const s = { x, y, facing: face, animTime: i * 0.37, moving: hash(i, 8) < 0.6, scale: 0.9 }; items.push({ y, draw: (g) => { g.save(); g.imageSmoothingEnabled = false; drawPerson(g, a, s, null); g.restore(); } }); }
}
export const CAT = Object.fromEntries(CATALOG.map((v) => [v.id, v])); export const HEL = Object.fromEntries(HELIS.map((v) => [v.id, v]));
const SPEC = (id) => (CAT[id] || HEL[id]).spec;
export function soldiers(items, roles, x, y, face, faction, o = {}) { roles.forEach((r, i) => { const px = x + (((i % (o.cols || 4)) - ((o.cols || 4) - 1) / 2) * (o.spread || 14)) + (hash(i, x) - 0.5) * 4, py = y + Math.floor(i / (o.cols || 4)) * (o.row || 12) + (hash(i, y) - 0.5) * 3; items.push({ y: py, draw: (g) => drawSoldier(g, r, faction, px, py, Array.isArray(face) ? face[i % face.length] : face, { env: o.env || (faction === 'varn' ? 'desert' : 'forest'), scale: o.scale || 0.9, t: i + (o.t || 0), moving: o.moving }) }); }); }
export function vehicle(items, id, x, y, heading, o = {}) { const spec = SPEC(id); items.push({ y: y + 10, draw: (g) => (HEL[id] ? drawHelo(g, spec, x, y, heading, o) : drawVeh(g, spec, x, y, heading, o)) }); }
export function render(g, cam, items, post) {
  const z = cam.z || 1; g.save(); g.imageSmoothingEnabled = false; g.translate(-cam.x * z, -cam.y * z); g.scale(z, z); g.drawImage(ground(), 0, 0);
  items.sort((a, b) => a.y - b.y); for (const it of items) it.draw(g); if (post) post(g); g.restore();
}
/** effects are drawn at half resolution and enlarged without smoothing, so fire and smoke have the same chunky pixels as everything else */
export function fxPass(g, cam, view, fn) {
  const z = cam.z || 1; const w = Math.ceil(view.w / 2), h = Math.ceil(view.h / 2); const oc = document.createElement('canvas'); oc.width = w; oc.height = h; const og = oc.getContext('2d');
  og.setTransform(z / 2, 0, 0, z / 2, -cam.x * z / 2, -cam.y * z / 2); fn(og); g.save(); g.imageSmoothingEnabled = false; g.drawImage(oc, 0, 0, w * 2, h * 2); g.restore();
}
