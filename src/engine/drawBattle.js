// The battle on the screen (v0.101.0, the look renderer + the tactical engine's drawing): the ground baked once, buildings seen from above with a roof (or opened to one floor's plan), people on the
// game's own people sprites (with the new helmet), vehicles, effects, and three camera tiers: far (banners), command (everything at the game's own scale) and close (the same sprites, enlarged by
// whole numbers). Browser only. It reads a battle (src/battle/sim.js) and never changes it.
import { drawPerson } from './drawPeople.js';
import { drawWeaponSprite } from './drawPixelWeapons.js';
import { drawVehicle } from './drawWarVehicles.js';
import { TILE, STYLES } from '../content/battle.js';
import { LOOKS, DEFAULT_LOOK } from '../content/troops.js';
import { unit } from '../battle/hash.js';

export const TP = 32; // pixels a tile is drawn at, at command zoom
const INK = '#1b1a24';
const GROUND = {
  rural: ['#6b8b4b', '#5f7f43', '#779657'], taiga: ['#5d7d58', '#527250', '#6b8a64'], desert: ['#c9b27a', '#bda56e', '#d6c08a'], steppe: ['#9aa35a', '#8d9650', '#a8b068'], tundra: ['#8fa0a0', '#839494', '#9bacac'], jungle: ['#3f6f3a', '#376433', '#497d44'], snow: ['#dfe6ea', '#d0d9de', '#eaf0f2'],
};
const palFor = (biome) => GROUND[biome] || GROUND.rural;
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v + k))); return `#${[f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`; };
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const WLOOK = { item_assault_rifle: 'ar', item_smg: 'smg', item_lmg: 'lmg', item_rpg: 'rpg', item_sniper_rifle: 'sniper', item_pistol: 'pistol', item_shotgun: 'shotgun' };

/** The ground, painted once for a map: grass with a little grain, roads, water, crops in rows, hedges, trees. (Building tiles are painted over by the building pass.) */
export function bakeGround(map) {
  const c = mkCanvas(map.w * TP, map.h * TP); const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const pal = palFor(map.biome === 'rural' ? 'rural' : map.biome);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const t = map.tiles[y * map.w + x]; const X = x * TP; const Y = y * TP; const u = unit(`${map.seed}|g|${x}|${y}`);
    g.fillStyle = pal[Math.floor(u * 3)]; g.fillRect(X, Y, TP, TP);
    for (let k = 0; k < 4; k++) { g.fillStyle = shade(pal[(Math.floor(u * 3) + 1) % 3], k * 3 - 4); g.fillRect(X + Math.floor(unit(`${map.seed}|n${k}|${x}|${y}`) * 28) + 2, Y + Math.floor(unit(`${map.seed}|m${k}|${x}|${y}`) * 28) + 2, 2, 2); }
    if (t === TILE.ROAD) { g.fillStyle = '#5a5a60'; g.fillRect(X, Y, TP, TP); g.fillStyle = '#66666c'; g.fillRect(X + 4, Y + 6, 3, 2); g.fillRect(X + 18, Y + 20, 3, 2); g.fillStyle = '#4c4c52'; g.fillRect(X, Y + TP - 2, TP, 2); }
    else if (t === TILE.WATER) { g.fillStyle = '#3d6f9e'; g.fillRect(X, Y, TP, TP); g.fillStyle = '#5a92c2'; g.fillRect(X + 4 + (y % 3) * 4, Y + 8, 10, 2); g.fillRect(X + 14, Y + 22, 12, 2); }
    else if (t === TILE.CROP) { g.fillStyle = '#9aa83c'; g.fillRect(X, Y, TP, TP); g.fillStyle = '#7e8c2e'; for (let r = 3; r < TP; r += 6) g.fillRect(X, Y + r, TP, 2); g.fillStyle = '#b8c456'; for (let r = 1; r < TP; r += 6) g.fillRect(X + 3, Y + r, 4, 1); }
    else if (t === TILE.HEDGE) { g.fillStyle = '#3d5a30'; g.fillRect(X, Y + 6, TP, 22); g.fillStyle = '#4f7040'; g.fillRect(X, Y + 6, TP, 4); g.fillStyle = INK; g.fillRect(X, Y + 4, TP, 2); g.fillRect(X, Y + 28, TP, 2); g.fillStyle = '#6a8e52'; g.fillRect(X + 4, Y + 10, 3, 3); g.fillRect(X + 16, Y + 16, 3, 3); }
  }
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (map.tiles[y * map.w + x] === TILE.TREE) {
    const X = x * TP + 16; const Y = y * TP + 20; g.fillStyle = 'rgba(16,14,36,0.28)'; g.fillRect(X - 10, Y + 6, 24, 8);
    g.fillStyle = INK; g.fillRect(X - 12, Y - 16, 24, 24); g.fillRect(X - 10, Y - 18, 20, 28); g.fillStyle = '#35592e'; g.fillRect(X - 11, Y - 15, 22, 22); g.fillStyle = '#4a7a3c'; g.fillRect(X - 10, Y - 16, 14, 12); g.fillStyle = '#6a9a52'; g.fillRect(X - 8, Y - 14, 6, 4); g.fillStyle = '#26421f'; g.fillRect(X + 2, Y - 4, 8, 8);
  }
  return c;
}

/** A building from above: its roof in its style's colours, a facade strip with a row of windows per floor, a door, and a shadow. */
function roof(g, b, style) {
  const S = STYLES[style] || STYLES.halvermouth; const X = b.x * TP; const Y = b.y * TP; const W = b.w * TP; const H = b.h * TP;
  g.fillStyle = 'rgba(16,14,36,0.3)'; g.fillRect(X + 6, Y + 6, W, H);
  g.fillStyle = INK; g.fillRect(X - 1, Y - 1, W + 2, H + 2);
  g.fillStyle = S.roof; g.fillRect(X, Y, W, H - 12);
  g.fillStyle = shade(S.roof, 26); g.fillRect(X, Y, W, 4); g.fillStyle = shade(S.roof, -22); g.fillRect(X, Y + H - 16, W, 4);
  g.fillStyle = shade(S.roof, -12); for (let i = 8; i < W - 6; i += 12) g.fillRect(X + i, Y + 6, 2, H - 24); // ridges/tiles
  g.fillStyle = S.trim; g.fillRect(X, Y, 4, H - 12); g.fillRect(X + W - 4, Y, 4, H - 12);
  // facade: a wall strip with a row of windows for each floor, then the door
  g.fillStyle = S.wall; g.fillRect(X, Y + H - 12, W, 12); g.fillStyle = shade(S.wall, -26); g.fillRect(X, Y + H - 3, W, 3);
  for (let f = 0; f < Math.min(b.floors, 3); f++) { g.fillStyle = '#2a3a50'; for (let i = 6; i < W - 10; i += 14) g.fillRect(X + i, Y + H - 10 + f * 3, 6, 2); }
  g.fillStyle = '#5a3a24'; g.fillRect(X + Math.floor(b.w / 2) * TP + 8, Y + H - 14, 14, 14);
  g.fillStyle = INK; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText(String(b.floors), X + W / 2, Y + (H - 12) / 2 + 4);
}

/** One floor of a building as a plan: walls, boards, windows, the stair, and a label. */
function plan(g, map, b, floor) {
  const X = b.x * TP; const Y = b.y * TP;
  for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) {
    const t = map.tiles[j * map.w + i]; const x = i * TP; const y = j * TP;
    if (t === TILE.WALL) { g.fillStyle = INK; g.fillRect(x, y, TP, TP); g.fillStyle = '#7a6a5c'; g.fillRect(x + 2, y + 2, TP - 4, TP - 4); g.fillStyle = '#9a8a78'; g.fillRect(x + 2, y + 2, TP - 4, 3); }
    else if (t === TILE.WINDOW) { g.fillStyle = INK; g.fillRect(x, y, TP, TP); g.fillStyle = '#7a6a5c'; g.fillRect(x + 2, y + 2, TP - 4, TP - 4); g.fillStyle = '#8ad0e8'; g.fillRect(x + 6, y + 8, TP - 12, TP - 16); g.fillStyle = '#d6f2ff'; g.fillRect(x + 6, y + 8, TP - 12, 3); }
    else { g.fillStyle = (i + j) % 2 ? '#b9a07a' : '#c4ab84'; g.fillRect(x, y, TP, TP); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y + TP - 2, TP, 2); if (t === TILE.DOOR) { g.fillStyle = '#5a3a24'; g.fillRect(x + 2, y + 4, TP - 4, TP - 8); } if (t === TILE.STAIRS) { g.fillStyle = '#6a5a48'; for (let k = 0; k < 5; k++) g.fillRect(x + 4, y + 4 + k * 5, TP - 8, 3); g.fillStyle = '#e8c84a'; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.fillText(floor < b.floors - 1 ? '▲' : '▼', x + TP / 2, y + TP / 2 + 5); } }
  }
  g.fillStyle = 'rgba(16,14,36,0.78)'; g.fillRect(X, Y - 18, 118, 16); g.fillStyle = '#ffe8a0'; g.font = 'bold 11px monospace'; g.textAlign = 'left'; g.fillText(`FLOOR ${floor + 1} OF ${b.floors}`, X + 4, Y - 6);
}

const dirOf = (u, to) => { const dx = to.x - u.x; const dy = to.y - u.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'; };
const appearance = (u, side, look) => {
  const h = (k) => unit(`${u.id}|ap|${k}`); const skin = ['#f2d6c0', '#e2b896', '#c48a62', '#8a5a3a', '#6a4430'][Math.floor(h(1) * 5)];
  const cloth = side === 'p' ? (LOOKS.primary[look.primary] || '#5e7a46') : '#8a5a48';
  return { skin, hair: ['#1a1410', '#3a2a20', '#6a3a2a', '#c9813a'][Math.floor(h(2) * 4)], hairStyle: 'helmet', hatColor: cloth, outfit: cloth, legs: '#2a2e22', build: ['thin', 'average', 'broad', 'wiry'][Math.floor(h(3) * 4)], height: 0.97 + h(4) * 0.1, accessories: [], accent: side === 'p' ? (LOOKS.band[look.band] || '#e8c84a') : '#d8402e' };
};

/** The view: owns a canvas, a camera and the effects; `draw(B, ui)` paints a frame. */
export class BattleView {
  constructor(canvas) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.cam = { x: 0, y: 0, zoom: 1 }; this.fx = null; this.ground = null; this.map = null; this.t = 0; this.lastShots = new Map(); this.lastHp = new Map(); this.seenAt = new Map(); }
  attach(B, looks = {}) { this.B = B; this.map = B.map; this.ground = bakeGround(B.map); this.looks = looks; this.lastShots.clear(); this.lastHp.clear(); this.seenAt.clear(); }
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
    g.drawImage(this.ground, 0, 0);
    // the objective and the way out
    const o = B.map.objective; g.strokeStyle = 'rgba(255,224,120,0.9)'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.arc(o.x * TP + 16, o.y * TP + 16, 4 * TP, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    if (B.goal === 'logistics') { g.strokeStyle = 'rgba(120,255,160,0.9)'; g.strokeRect(B.map.exit.x * TP - 20, B.map.exit.y * TP - 60, 40, 120); }
    const seen = ui.seen || new Set(B.units.filter((u) => u.side === 'e').map((u) => u.id));
    // buildings: a roof, unless one is opened to a floor plan
    const open = ui.open || {};
    for (const b of B.map.buildings) { const v = open[b.id]; if (v) plan(g, B.map, b, v.floor); else roof(g, b, b.style); }
    if (tier === 'far') { this.banners(g, B, seen, ui); this.fx.draw(g); g.setTransform(1, 0, 0, 1, 0, 0); return; }
    const list = B.units.filter((u) => (u.side === 'p' || seen.has(u.id)) && !u.fled).sort((a, b) => a.y - b.y);
    for (const u of list) {
      const v = open[B.map.bid[Math.floor(u.y) * B.map.w + Math.floor(u.x)]];
      const inside = B.map.bid[Math.floor(u.y) * B.map.w + Math.floor(u.x)] >= 0 && u.kind === 'inf';
      if (inside && !v) continue; // inside a roofed building: not seen
      if (inside && v && v.floor !== u.z && !(v.ground && u.z === 0)) continue; // on a floor that is not the one shown
      this.unit(g, u, B, ui);
    }
    this.fx.draw(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  unit(g, u, B, ui) {
    const px = u.x * TP; const py = u.y * TP;
    if (ui.selected?.has(u.id)) { g.strokeStyle = '#7af0a0'; g.lineWidth = 2; g.beginPath(); g.ellipse(px, py + 2, u.kind === 'inf' ? 11 : 20, u.kind === 'inf' ? 5 : 8, 0, 0, Math.PI * 2); g.stroke(); }
    if (u.kind === 'inf') {
      const t = u.target ? B.byId.get(u.target) : null; const ang = u.path?.[0] ? dirOf(u, u.path[0]) : t ? dirOf(u, t) : (u.side === 'p' ? 'right' : 'left');
      if (!u.alive) { g.save(); g.translate(px, py); g.fillStyle = 'rgba(16,14,36,0.3)'; g.fillRect(-9, -1, 18, 3); g.fillStyle = u.side === 'p' ? '#5e7a46' : '#8a5a48'; g.fillRect(-9, -4, 16, 5); g.fillStyle = INK; g.fillRect(-10, -5, 2, 7); g.restore(); return; }
      const look = { ...DEFAULT_LOOK, ...(this.looks?.[u.id] || {}) };
      const dir = ang === 'left' ? -1 : 1; const wl = WLOOK[u.weapon];
      const held = wl ? (c) => { c.save(); c.translate(ang === 'left' ? -14 : ang === 'right' ? 2 : -6, -13); if (ang === 'left') { c.scale(-1, 1); c.translate(-12, 0); } drawWeaponSprite(c, wl, 1); c.restore(); } : null;
      drawPerson(g, appearance(u, u.side, look), { x: px, y: py, facing: ang, animTime: u.moving ? this.t * 6 + (u.id.length * 0.7) : 0, scale: 1 }, held);
      void dir;
      if (u.state !== 'steady') { g.fillStyle = u.state === 'broken' ? '#ff5a4a' : u.state === 'pinned' ? '#ffb43a' : '#ffe86a'; g.fillRect(px - 3, py - 36, 6, 3); }
    } else {
      const heading = u.path?.[0] ? Math.atan2(u.path[0].y - u.y, u.path[0].x - u.x) : u.target && B.byId.get(u.target) ? Math.atan2(B.byId.get(u.target).y - u.y, B.byId.get(u.target).x - u.x) : (u.side === 'p' ? 0 : Math.PI);
      drawVehicle(g, u.kind, u.side, px, py, heading, { wreck: !u.alive, time: this.t });
    }
    if (u.alive && (u.hp < u.hpMax || ui.selected?.has(u.id))) { const w = u.kind === 'inf' ? 16 : 30; const y = py - (u.kind === 'inf' ? 32 : u.kind === 'helicopter' ? 52 : 26); g.fillStyle = INK; g.fillRect(px - w / 2 - 1, y - 1, w + 2, 5); g.fillStyle = '#3a2a2a'; g.fillRect(px - w / 2, y, w, 3); g.fillStyle = u.side === 'p' ? '#6ae88a' : '#f06a5a'; g.fillRect(px - w / 2, y, Math.max(0, Math.round((w * u.hp) / u.hpMax)), 3); }
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
export { GROUND };
