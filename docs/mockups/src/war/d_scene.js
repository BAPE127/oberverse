// TARGET ART (mock-up only). One shared battlefield (the Crossing at Halden Roads) drawn with the detail modules, so the battle, drone and breach pictures all show the same ground.
import { INK, hash, shade, rng, mk, R, blob, ell, rgba } from './d_util.js';
import { paintTerrain, paintRoads, crossing, bridge } from './d_terrain.js';
import { drawBuilding, buildingAnchors } from './d_build.js';
import { drawSoldier } from './d_units.js';
import { drawVehicle } from './d_veh.js';
import { drawAir } from './d_air.js';
import * as F from './d_fx.js';
import * as PR from './d_props.js';

export const W = 2880, H = 1620;
export const SPEC = {
  W, H, seed: 3, river: [[330, -40], [300, 300], [360, 700], [330, 1100], [380, 1700]], riverW: 170,
  roads: [{ pts: [[0, 830], [1000, 830], [2000, 830], [2880, 830]], w: 150 }, { pts: [[1560, 0], [1560, 830], [1560, 1620]], w: 130 }, { pts: [[1000, 330], [1560, 330]], w: 90, nomark: true }],
  hills: [{ x: 2560, y: 190, r: 420, h: 0.95, sy: 1.0, mesa: true }, { x: 800, y: 1560, r: 340, h: 0.25 }],
  fields: [{ x: 2330, y: 1010, w: 520, h: 500, crop: 'wheat' }, { x: 560, y: 1250, w: 440, h: 300, crop: 'green', vert: true }],
  dirt: [{ x: 1090, y: 1290, w: 480, h: 270 }], paved: [{ x: 1700, y: 950, w: 600, h: 300 }], mud: [{ x: 1180, y: 880, r: 100 }, { x: 2160, y: 880, r: 80 }, { x: 760, y: 1000, r: 90 }],
};
let TER = null;
export function terrain() { if (TER) return TER; const T = paintTerrain(SPEC); const [c, g] = mk(W, H); g.drawImage(T.canvas, 0, 0); paintRoads(g, SPEC, T); bridge(g, 250, 760, 220, 150); crossing(g, 1560, 830, 150, true); crossing(g, 700, 830, 150, false);
  // tyre tracks and scorch decals so the ground remembers the fighting
  const r = rng(5); g.fillStyle = 'rgba(30,24,18,.35)'; for (let i = 0; i < 70; i++) g.fillRect(1090 + i * 6, 1330 + Math.sin(i / 7) * 10, 5, 3); for (let i = 0; i < 70; i++) g.fillRect(1090 + i * 6, 1344 + Math.sin(i / 7) * 10, 5, 3);
  for (const [x, y, rr, s] of [[1840, 880, 26, 1], [2020, 800, 20, 2], [1330, 880, 18, 3], [2120, 880, 34, 4], [1790, 790, 24, 5]]) F.crater(g, x, y, rr, s);
  TER = { c, T }; return TER; }

export const B = {
  garrison: { x: 600, y: 520, w: 330, d: 190, kind: 'house', wall: '#dccfb2', roof: '#a04a3a', seed: 2, cut: true },
  shop: { x: 1000, y: 510, w: 380, d: 200, kind: 'shop', wall: '#d8d0bc', roof: '#8a8e92', seed: 7, sign: 'MARKET', awning: '#b8483a', state: 1 },
  west: { x: 40, y: 480, w: 200, d: 170, kind: 'house', wall: '#d6cab0', roof: '#4a6a8a', seed: 14 },
  northA: { x: 1080, y: 120, w: 300, d: 160, kind: 'house', wall: '#d8ccb0', roof: '#7a4a3a', seed: 21 },
  northB: { x: 700, y: 130, w: 260, d: 150, kind: 'row', wall: '#b87a5e', roof: '#5a6a7a', seed: 22 },
  warehouse: { x: 1700, y: 470, w: 420, d: 240, kind: 'warehouse', wall: '#98a0a8', roof: '#8a929a', seed: 9, state: 1, breach: [{ u: 150, w: 130, kind: 'blast' }] },
  flats: { x: 2200, y: 470, w: 440, d: 240, kind: 'flats', wall: '#bdb8b0', roof: '#6e6a66', seed: 3, state: 1, breach: [{ u: 150, w: 120, kind: 'ram' }] },
  burning: { x: 980, y: 1000, w: 320, d: 180, kind: 'house', wall: '#d4c8ac', roof: '#9a4a3a', seed: 31, state: 2, burning: true },
  rubble: { x: 640, y: 1000, w: 250, d: 170, kind: 'house', wall: '#d4c8ac', roof: '#9a4a3a', seed: 32, state: 3 },
  factory: { x: 1720, y: 990, w: 560, d: 250, kind: 'factory', wall: '#a89a8a', roof: '#7a8088', seed: 4, state: 1 },
};

/** the full drawable list in depth order; o.show lists which story elements appear */
export function scene(o = {}) {
  const items = []; const add = (y, f) => items.push({ y, f });
  const bld = (k, over = {}) => { const b = { ...B[k], ...over }; add(b.y + b.d, (g) => drawBuilding(g, b)); return b; };
  const names = o.buildings || Object.keys(B); const built = {}; for (const k of names) { const ov = (o.bover || {})[k] || {}; built[k] = bld(k, ov); }
  // trees
  const treeAt = (x, y, s = 1, k = 'oak', sd = 1) => add(y, (g) => PR.tree(g, x, y, s, k, sd));
  [[2300, 240, 1.2, 'pine'], [2420, 120, 1.1, 'pine'], [2540, 330, 1.3, 'pine'], [2680, 220, 1.15, 'pine'], [2760, 400, 1.2, 'pine'], [2480, 420, 1.1, 'pine'], [2840, 120, 1.0, 'pine'], [2380, 350, 1, 'pine'], [2640, 120, 1.0, 'pine'], [2760, 280, 1.1, 'pine'],
    [120, 120, 1.2, 'oak'], [200, 260, 1.1, 'oak'], [90, 380, 1.0, 'oak'], [210, 880, 1.1, 'oak'], [100, 1000, 1.2, 'oak'], [180, 1130, 1.1, 'oak'], [70, 1240, 1.3, 'oak'], [520, 90, 1.2, 'oak'], [560, 330, 1.1, 'oak'], [500, 1090, 1.0, 'oak'],
    [1470, 150, 1.1, 'oak'], [1800, 150, 1.2, 'oak'], [1960, 130, 1.0, 'poplar'], [2040, 110, 1.0, 'poplar'], [1880, 300, 1.1, 'oak'], [1450, 560, 0.9, 'oak'], [1450, 640, 1, 'oak'],
    [1260, 1330, 1.0, 'oak'], [1640, 1420, 1.2, 'oak'], [1720, 1560, 1.1, 'oak'], [900, 1460, 1.2, 'oak'], [420, 1400, 1.1, 'oak'], [330, 1540, 1.2, 'oak'], [2280, 1460, 1.1, 'poplar'], [2200, 1540, 1.0, 'poplar'], [2880 - 60, 1580, 1.2, 'oak'], [2800, 940, 1.1, 'oak'], [2690, 960, 1, 'oak'], [2330, 960, 1, 'oak']].forEach(([x, y, s, k], i) => treeAt(x, y, s, k, i + 1));
  // hedges, walls, fences
  add(960, (g) => PR.hedge(g, 1330, 960, 150, 22, 1)); add(1200, (g) => PR.hedge(g, 1110, 1240, 120, 20, 2)); add(305, (g) => PR.wall(g, 1010, 305, 230, 26, 12)); add(670, (g) => PR.fence(g, 1400, 700, 160));
  // sandbags and barricades (our line south of the road, theirs at the factory)
  if (o.sand !== false) { add(940, (g) => PR.sandbags(g, 1330, 944, 150, 2, 4)); add(950, (g) => PR.sandbags(g, 1700, 952, 120, 2, 7)); add(1000, (g) => PR.sandbags(g, 1760, 1006, 90, 2, 8)); add(800, (g) => PR.hedgehog(g, 470, 800, 1)); add(868, (g) => PR.hedgehog(g, 480, 872, 1)); }
  [[1950, 770, 'c'], [2010, 782, 'c'], [1898, 748, 'c']].forEach(([x, y], i) => add(y, (g) => PR.crate(g, x, y, 1, i % 2 ? '#8a6a3a' : '#6a7a4a')));
  add(740, (g) => PR.barrel(g, 2040, 745, 1, '#a83a2a')); add(748, (g) => PR.barrel(g, 2072, 752, 1, '#3a5a8a'));
  [[420, 735], [1480, 735], [1700, 735], [2140, 735]].forEach(([x, y], i) => add(y, (g) => PR.lamp(g, x, y, 1, false)));
  // civilian cars and wrecks
  add(765, (g) => PR.car(g, 810, 785, Math.PI / 2, '#3a5a8a')); add(790, (g) => PR.car(g, 1880, 868, 1.9, '#2a2826', { burnt: true })); add(1180, (g) => PR.car(g, 1470, 1150, 0.2, '#c8b848'));
  return { items, built };
}
export function renderBase(g, cam, items, pre) {
  const z = cam.z || 1; g.save(); g.translate(-cam.x * z, -cam.y * z); g.scale(z, z); g.imageSmoothingEnabled = false;
  g.drawImage(terrain().c, 0, 0); if (pre) pre(g);
  items.sort((a, b) => a.y - b.y); for (const it of items) it.f(g);
  g.restore();
}
/** soldiers helper */
export const squad = (items, roles, x, y, view, faction, pose, o = {}) => roles.forEach((r, i) => {
  const wp = { rifleman: 'rifle', mg: 'mg', at: 'at', marksman: 'sniper', medic: 'smg', engineer: 'shotgun', signaller: 'smg', officer: 'pistol', recon: 'smg', uav: 'controller' }[r];
  const sp = o.spread || 44; const dx = ((i % (o.cols || 4)) - ((o.cols || 4) - 1) / 2) * sp + (hash(i, x) - 0.5) * 12, dy = Math.floor(i / (o.cols || 4)) * (o.row || 30) + (hash(i, y) - 0.5) * 10;
  const px = x + dx, py = y + dy; const look = { role: r, faction, weapon: wp, camo: faction === 'company' && i % 3 === 0 ? 1 : 0, seed: i + (o.seed || 0), skin: (i + (o.seed || 0)) % 5, band: faction === 'company' ? (o.band || '#e8764a') : null, t: i % 2 };
  const ps = Array.isArray(pose) ? pose[i % pose.length] : pose; const vw = Array.isArray(view) ? view[i % view.length] : view;
  items.push({ y: py, f: (g) => drawSoldier(g, look, ps, vw, px, py, { scale: o.scale || 1 }) });
});
export const unit = (items, f, y) => items.push({ y, f });

/** a framed close-up of the shared ground: clips to the rectangle, centres world point (cx,cy), zoom z; fn draws in world coordinates */
export function panelView(g, x, y, w, h, cx, cy, z, fn) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x + w / 2, y + h / 2); g.scale(z, z); g.translate(-cx, -cy); g.imageSmoothingEnabled = false;
  g.drawImage(terrain().c, 0, 0); fn(g); g.restore(); g.save(); g.strokeStyle = '#3a38a0'; g.lineWidth = 3; g.strokeRect(x, y, w, h); g.restore();
}
export const caption = (g, x, y, w, title, lines, tag) => {
  g.fillStyle = 'rgba(14,12,44,.94)'; g.fillRect(x, y, w, 110); g.strokeStyle = '#3a38a0'; g.lineWidth = 3; g.strokeRect(x, y, w, 110);
  g.font = '800 24px system-ui'; g.fillStyle = '#ffe28a'; g.fillText(title, x + 18, y + 34); if (tag) { g.font = '800 15px system-ui'; g.fillStyle = '#9af0c0'; g.textAlign = 'right'; g.fillText(tag, x + w - 16, y + 32); g.textAlign = 'left'; }
  g.font = '600 17px system-ui'; g.fillStyle = '#e8e6ff'; lines.forEach((l, i) => g.fillText(l, x + 18, y + 62 + i * 24));
};
