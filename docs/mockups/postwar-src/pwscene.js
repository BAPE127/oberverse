// Page-side helpers: put a mock city into the live game, dress it with people and cars, set the hour, aim the camera.
import { GameMap } from '/src/world/gameMap.js';
import { PROP_TYPES } from '/src/content/props.js';
const T = 32;
const hash = (a, b = 0, c = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export async function install(city, opts = {}) {
  const ui = window.oberverse.ui, g = ui.game;
  const { def, meta } = city;
  // the mock tile kinds the stock props table does not know are tolerated (renderer falls back)
  g.maps.set(def.id, new GameMap(def, PROP_TYPES));
  g.changeMap(def.id, 'start');
  g.player.health = 100;
  g.clock.total = (opts.day || 1) * 1440 + (opts.hour ?? 23) * 60 + 20;
  return { ui, g, meta };
}
export function people(g, map, list) {
  const proto = g.npcs.get('npc_mags'); let i = 0;
  for (const p of list) {
    const n = JSON.parse(JSON.stringify(proto, (k, v) => (k === 'portrait' ? undefined : v)));
    n.id = `mock_${i++}`; n.profile.id = n.id; n.profile.schedule = []; n.profile.impulses = []; n.profile.name = 'Resident'; n.profile.appearance = { build: 'average', height: 1, ...p.look, portrait: undefined };
    n.bubble = null; n.chat = null; n.nextBarkAt = 1e12; n.profile.shortName = ''; n.profile.name = ''; n.map = map; n.x = (p.x + 0.5) * T; n.y = (p.y + 0.5) * T; n.facing = p.facing || 'down'; n.activity = 'idle'; n.path = null; n.dead = false;
    g.npcs.set(n.id, n);
  }
}
export function cars(g, map, list) {
  const st = g.vehicles.state; let i = 0;
  for (const c of list) { const id = `mockcar_${i++}`; st.cars[id] = { id, model: c.model, color: c.color, map, x: (c.x + 0.5) * T, y: (c.y + 0.5) * T, angle: (c.angle || 0) * Math.PI / 180, owner: 'npc', stolen: false, plate: 'NEU ' + (100 + i) }; }
}
export function aim(g, wx, wy, zoom = 2) {
  const ui = window.oberverse.ui; g.player.x = wx; g.player.y = wy; ui.renderer.baseZoom = zoom; ui.renderer.cam.zoom = zoom; ui.renderer.cam.x = wx - ui.renderer.canvas.width / 2 / zoom; ui.renderer.cam.y = wy - ui.renderer.canvas.height / 2 / zoom;
}

// ---------------------------------------------------------------- dressing
const SKIN = ['#e8c4a0', '#d9a77f', '#b97f58', '#8a5a3c', '#f2d4b8'];
const HAIRSTYLE = ['bun', 'cap', 'curly', 'long', 'messy', 'parted', 'ponytail'];
export const LOOKS = {
  neu: { hair: ['#ff5ec8', '#5ee6ff', '#ffd75e', '#a98cff', '#2a2438', '#f2f2f2', '#8aff9a'], outfit: ['#6a3fa0', '#2fa0c0', '#c43fa0', '#2a2438', '#d8b030', '#3f4f8a', '#e8e8f0', '#30a070'], legs: ['#1c1634', '#2a2a4a', '#322046'], acc: [[], [], ['shades'], ['goggles'], ['scarf'], ['vest']] },
  noir: { hair: ['#1c1814', '#3a2a1c', '#5a4430', '#8a8a8a', '#c8b8a0'], outfit: ['#2a2a32', '#3a3a46', '#6a2a30', '#5a4a3a', '#3a4a5a', '#8a7a5a', '#222'], legs: ['#1a1a20', '#2a2a30', '#3a3228'], acc: [[], [], [], ['scarf'], ['shades'], ['vest']] },
};
export function lookFor(kind, k) {
  const L = LOOKS[kind]; const r = (arr, s) => arr[Math.floor(hash(k, s, 3) * arr.length) % arr.length];
  return { skin: r(SKIN, 1), hair: r(L.hair, 2), hairStyle: r(HAIRSTYLE, 3), outfit: r(L.outfit, 4), legs: r(L.legs, 5), shoes: '#14121a', accent: r(L.outfit, 6), accessories: r(L.acc, 7), hatColor: r(L.outfit, 8) };
}
/** n residents on pavement tiles within `rad` tiles of (cx,cy), most of them near a road edge; kind = 'neu' | 'noir' */
export function crowd(g, city, kind, cx, cy, rad, n, seed = 1) {
  const rows = city.def.tiles; const out = []; const cand = [];
  for (let y = Math.max(1, Math.floor(cy - rad)); y < Math.min(rows.length - 1, cy + rad); y++) for (let x = Math.max(1, Math.floor(cx - rad * 1.7)); x < Math.min(rows[0].length - 1, cx + rad * 1.7); x++) {
    const c = rows[y][x]; if (c !== ',' && c !== 'm' && c !== 'g') continue;
    if (city.def.props.some((p) => p.x === x && p.y === y && p.solid !== false && ['streetlamp', 'tree', 'bench', 'fountain', 'statue', 'dumpster', 'tent', 'crate', 'barrel', 'plant', 'monitor_wall', 'hydrant', 'trashbarrel'].includes(p.type))) continue;
    cand.push([x, y]);
  }
  for (let i = 0; i < n && cand.length; i++) { const [x, y] = cand[Math.floor(hash(seed, i, 9) * cand.length)]; out.push({ x, y, facing: ['down', 'up', 'left', 'right'][Math.floor(hash(seed, i, 4) * 4)], look: lookFor(kind, seed * 1000 + i) }); }
  people(g, city.def.id, out); return out.length;
}
/** cars in lanes on straight road tiles within the window */
export function traffic(g, city, models, cx, cy, rad, n, seed = 1, colors = null) {
  const t = city.def.tiles; const R = (x, y) => t[y]?.[x] === '='; const out = []; const taken = [];
  for (let i = 0, tries = 0; out.length < n && tries < 4000; tries++) {
    const x = Math.floor(cx + (hash(seed, tries, 1) - 0.5) * rad * 3.4), y = Math.floor(cy + (hash(seed, tries, 2) - 0.5) * rad * 2);
    if (!R(x, y)) continue; const hz = R(x - 2, y) && R(x + 2, y) && !(R(x, y - 2) && R(x, y + 2)), vt = R(x, y - 2) && R(x, y + 2) && !(R(x - 2, y) && R(x + 2, y)); if (!hz && !vt) continue;
    let top = y; while (R(x, top - 1) && hz) top--; let left = x; while (R(left - 1, y) && vt) left--;
    const lane = hz ? y - top : x - left; const angle = hz ? (lane < 2 ? 180 : 0) : (lane < 2 ? 90 : 270);
    if (taken.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 6)) continue;
    taken.push([x, y]); const m = models[Math.floor(hash(seed, tries, 5) * models.length)];
    const cs = g.content.vehicles.models[m].colors; out.push({ model: m, color: colors ? colors[Math.floor(hash(seed, tries, 6) * colors.length)] : cs[Math.floor(hash(seed, tries, 7) * cs.length)], x, y, angle }); i++;
  }
  cars(g, city.def.id, out); return out.length;
}

// ---------------------------------------------------------------- the mock-only overlay (proposed extras, drawn in the game's stepped pixel style)
export function overlay() {
  const ui = window.oberverse.ui, r = ui.renderer, cv = r.canvas; const o = document.createElement('canvas');
  const k = cv.clientWidth / cv.width; o.width = cv.clientWidth; o.height = cv.clientHeight;
  Object.assign(o.style, { position: 'absolute', left: cv.offsetLeft + 'px', top: cv.offsetTop + 'px', width: cv.clientWidth + 'px', height: cv.clientHeight + 'px', pointerEvents: 'none' });
  cv.parentNode.insertBefore(o, cv.nextSibling); const ctx = o.getContext('2d'); ctx.imageSmoothingEnabled = false;
  for (const el of document.querySelectorAll('*')) if (el.children.length === 0 && /^You wake in your new flat/.test(el.textContent || '')) { let p = el; for (let i = 0; i < 3 && p.parentElement && p.parentElement !== document.body; i++) p = p.parentElement; el.closest('[class]')?.style && (el.closest('[class]').style.display = 'none'); }
  const z = r.cam.zoom * k; const S = (wx, wy) => { const s = r.toScreen(wx, wy); return { x: s.x * k, y: s.y * k }; };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const A = {
    ctx, S, z, rgba, w: o.width, h: o.height,
    pat(hex, n) { const sz = Math.max(1, Math.round(z * 2)); const c = document.createElement('canvas'); c.width = c.height = sz * 2; const x = c.getContext('2d'); x.fillStyle = hex; if (n === 1) x.fillRect(0, 0, sz, sz); else if (n === 2) { x.fillRect(0, 0, sz, sz); x.fillRect(sz, sz, sz, sz); } else x.fillRect(0, 0, sz * 2, sz * 2); return ctx.createPattern(c, 'repeat'); },
    glow(wx, wy, rad, hex, a = 1) { const s = S(wx, wy); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.min(1, 0.5 * a); [[1, 1], [0.66, 2], [0.36, 2]].forEach(([k, n], i) => { ctx.fillStyle = A.pat(hex, n); ctx.globalAlpha = (i === 2 ? 0.34 : 0.22) * a; ctx.beginPath(); ctx.ellipse(s.x, s.y, rad * z * k, rad * z * k * 0.72, 0, 0, 6.2832); ctx.fill(); }); ctx.restore(); },
    // a sky bridge between two roofs, straight along a tile axis like everything else in the game: an inked deck, a glazed tube, a stepped shadow
    bar(ax, ay, bx, by, wpx = 36) { const a = S(ax, ay), b = S(bx, by); const w = wpx * z; const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y), x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y); const hz = (x1 - x0) > (y1 - y0);
      const R = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
      const bx0 = hz ? x0 : x0 - w / 2, by0 = hz ? y0 - w / 2 : y0, bw = hz ? x1 - x0 : w, bh = hz ? w : y1 - y0;
      R(bx0 + 40 * z, by0 + 64 * z, bw, bh, 'rgba(8,6,20,0.30)'); R(bx0 - 2 * z, by0 - 2 * z, bw + 4 * z, bh + 4 * z, '#1b1a24'); R(bx0, by0, bw, bh, '#232c48'); R(bx0 + 3 * z, by0 + 3 * z, bw - 6 * z, bh - 6 * z, '#4f8aa8');
      ctx.fillStyle = '#c8f4ff'; if (hz) { R(bx0 + 3 * z, by0 + 3 * z, bw - 6 * z, 3 * z, '#c8f4ff'); for (let i = 0; i < bw; i += 32 * z) R(bx0 + i, by0 + 3 * z, 2 * z, bh - 6 * z, '#2c3a5c'); } else { R(bx0 + 3 * z, by0 + 3 * z, 3 * z, bh - 6 * z, '#c8f4ff'); for (let i = 0; i < bh; i += 32 * z) R(bx0 + 3 * z, by0 + i, bw - 6 * z, 2 * z, '#2c3a5c'); }
      for (const p of [[bx0, by0], [hz ? bx0 + bw - 8 * z : bx0, hz ? by0 : by0 + bh - 8 * z]]) { R(p[0], p[1], 8 * z, 8 * z, '#1b1a24'); R(p[0] + 2 * z, p[1] + 2 * z, 4 * z, 4 * z, '#5ee6ff'); } },
    fly(modelId, wx, wy, ang, hex, g, big = 1) { const m = g.content.vehicles.models[modelId]; const s = S(wx, wy);
      ctx.save(); ctx.translate(s.x + 54 * z, s.y + 84 * z); ctx.scale(z * big, z * big); ctx.fillStyle = 'rgba(8,6,20,0.30)'; ctx.beginPath(); ctx.ellipse(0, 0, m.len * 0.5, m.wid * 0.45, ang, 0, 6.2832); ctx.fill(); ctx.restore();
      A.glow(wx + 2, wy + 10, 40 * big, hex, 0.9);
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(z * big, z * big); window.__drawPixelCar(ctx, m, 0, 0, ang * Math.PI / 180, { color: hex }); ctx.restore(); },
    rain(n = 900, seed = 5) { ctx.save(); ctx.strokeStyle = 'rgba(190,210,255,0.28)'; ctx.lineWidth = Math.max(1, z); for (let i = 0; i < n; i++) { const x = hash(seed, i, 1) * A.w, y = hash(seed, i, 2) * A.h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5 * z, y + 14 * z); ctx.stroke(); } ctx.restore(); },
    tint(hex, a) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(hex, a); ctx.fillRect(0, 0, A.w, A.h); ctx.restore(); },
  };
  return A;
}
import('/src/engine/drawPixelCars.js').then((m) => { window.__drawPixelCar = m.drawPixelCar; });
