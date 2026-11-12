// CONCEPT STUDY ONLY — staged set dressing for individual shots. Nothing here exists in the game's
// data today; each item is listed as "proposed" in the study document.
import { THREE, hash, box, cyl, blob, group, mat, shade } from './lib.js';

const picket = (x0, x1, z, snow) => { const g = group(0, 0.05, 0); const L = x1 - x0; if (L <= 0) return g; for (let i = 0; i <= Math.round(L); i++) g.add(box(0.1, 0.95, 0.1, mat('#ded7c6'), { x: x0 + i * L / Math.round(L), z })); for (let i = 0; i < L * 4; i++) g.add(box(0.13, 0.8, 0.04, mat('#ebe5d6'), { x: x0 + i / 4 + 0.12, z })); for (const y of [0.28, 0.66]) g.add(box(L, 0.07, 0.05, mat('#d5cebd'), { x: x0 + L / 2, y, z })); if (snow) g.add(box(L, 0.05, 0.12, mat('#edf1f5'), { x: x0 + L / 2, y: 0.86, z, cast: false })); return g; };
const hedge = (x0, x1, z0, z1, snow) => { const g = group(0, 0.05, 0); const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.7)); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; g.add(blob(0.46, snow ? '#c3ccc6' : i % 2 ? '#3f6e40' : '#487a46', { x, z, y: 0.36, sy: 0.9, seed: i % 4 })); if (snow) g.add(blob(0.36, '#edf1f5', { x, z, y: 0.6, sy: 0.5, seed: i % 4, cast: false })); } return g; };

export const DRESS = {
  // Gullwing Row: front fences with gates, side hedges, a gravel drive between the Vane house and No. 11
  gullwing: {
    paint(c, d) { const T = d.PPT; const snow = d.opts.weather === 'snow'; d.clear = new Set(); for (let y = 8; y < 15; y++) for (let x = 27; x < 29; x++) { d.clear.add(`${x},${y}`); const px = (x - d.win.x0) * T, py = (y - d.win.y0) * T; c.fillStyle = snow ? '#cfd4da' : '#a39a88'; c.fillRect(px, py, T, T); for (let i = 0; i < 30; i++) { c.fillStyle = snow ? (i % 2 ? '#e3e7ec' : '#b5bbc4') : i % 2 ? '#b9b09d' : '#8a8272'; c.fillRect(px + hash(x, y, i) * T | 0, py + hash(y, x, i + 40) * T | 0, 2, 2); } } },
    build(d) { const snow = d.opts.weather === 'snow'; const L = d.data.layers[0]; for (const b of L.buildings) { if (!['b_number9', 'b_vane_house', 'b_to_let'].includes(b.id)) continue; const z = 14.82; const dx = b.door.x; d.scene.add(picket(b.x - 0.5, dx - 0.1, z, snow), picket(dx + 1.1, b.x + b.w + 0.5, z, snow)); d.scene.add(hedge(b.x - 0.6, b.x - 0.6, b.y + b.h + 0.2, z - 0.3, snow)); if (b.id !== 'b_vane_house') d.scene.add(hedge(b.x + b.w + 0.6, b.x + b.w + 0.6, b.y + b.h + 0.2, z - 0.3, snow)); for (const sx of [dx - 0.1, dx + 1.1]) d.scene.add(group(sx, 0.05, z, box(0.16, 1.1, 0.16, mat('#cfc8b6')), blob(0.1, '#cfc8b6', { y: 1.16, detail: 0 }))); }
      const car = d.vehicle({ body: 'hatch', len: 2.28, wid: 1.19, color: '#5a6a7a', x: 28, y: 11.2, angle: -Math.PI / 2, parked: 1 }, { opts: d.opts, lights: d.lights }); car.position.set(28, 0.05, 11.2); car.rotation.y = Math.PI / 2; d.scene.add(car);
      // bins by the drive, a washing line behind No. 9
      d.scene.add(group(26.6, 0.05, 13.2, cyl(0.26, 0.8, '#4f5a52', { seg: 10 }), cyl(0.3, 0.06, snow ? '#edf1f5' : '#3c4640', { y: 0.8, seg: 10 })), group(26.6, 0.05, 12.4, cyl(0.26, 0.8, '#5a4a6a', { seg: 10 }), cyl(0.3, 0.06, snow ? '#edf1f5' : '#463a52', { y: 0.8, seg: 10 }))); },
  },
  // Fort Gullcrest: a platoon on the parade ground, vehicles on the apron (kinds the game already fields)
  fort: {
    build(d) { const put = (c) => { const g = d.vehicle(c, { opts: d.opts, lights: d.lights }); g.position.set(c.x, d.HEIGHT.g, c.y); g.rotation.y = -c.angle; d.scene.add(g); };
      for (let i = 0; i < 3; i++) put({ body: 'tank', len: 3.6, wid: 1.9, x: 94 + i * 3.4, y: 39.2, angle: -Math.PI / 2, parked: 1 });
      put({ body: 'heli', x: 106, y: 38, angle: 2.6, parked: 1 }); put({ body: 'heli', x: 106, y: 32.5, angle: 2.6, parked: 1 });
      put({ body: 'jet', len: 7.5, x: 97, y: 33.5, angle: Math.PI - 0.3, parked: 1 });
      put({ body: 'truck', len: 3.4, wid: 1.5, x: 66, y: 59.6, angle: Math.PI, parked: 0 }); put({ body: 'jeep', len: 2.3, wid: 1.2, x: 59, y: 61.5, angle: 0 }); put({ body: 'truck', len: 3.4, wid: 1.5, x: 74.5, y: 36, angle: Math.PI / 2, parked: 1 }); put({ body: 'jeep', len: 2.3, wid: 1.2, x: 72, y: 46, angle: 0.4, parked: 1 });
      const sk = ['#d9a77c', '#8a5a3c', '#e8b894', '#c99a72', '#6a4530'];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) { const g = d.person({ skin: sk[(r * 7 + i) % 5], hair: '#2a2420', build: 'average', height: 0.96 + hash(r, i) * 0.08 }, { kit: 'soldier', facing: 'up', seed: `sq${r}${i}`, holding: 'rifle' }); g.position.set(57.5 + i * 1.3, d.HEIGHT['.'], 51.5 + r * 1.4); d.scene.add(g); }
      const o = d.person({ skin: '#d9a77c', hair: '#5a4a3a', hairStyle: 'cap', build: 'broad' }, { kit: 'soldier', facing: 'down', seed: 'officer' }); o.position.set(61.4, d.HEIGHT['.'], 49.6); d.scene.add(o); d.labels.push({ text: 'Morning parade', x: 61.4, y: 2.0, z: 49.6, kind: 'npc' });
      for (const [x, z] of [[70, 62.6], [76, 62.6], [72, 50], [88, 41.5]]) { const g = d.person({ skin: sk[(x | 0) % 5], hair: '#2a2420' }, { kit: 'soldier', facing: (x | 0) % 2 ? 'left' : 'right', seed: `p${x}`, holding: 'rifle', walk: (x % 5) / 5 }); g.position.set(x, 0.05, z); d.scene.add(g); }
      // sandbag posts and crates by the armoury and the gate
      const bags = (x, z, n, rot) => { const g = group(x, 0.05, z); for (let lv = 0; lv < 3; lv++) for (let i = 0; i < n - (lv % 2); i++) g.add(box(0.6, 0.24, 0.36, mat(lv % 2 ? '#a89a72' : '#b5a67c'), { x: i * 0.62 + (lv % 2) * 0.31, y: lv * 0.24 })); g.rotation.y = rot; d.scene.add(g); };
      bags(62.5, 62.4, 5, 0); bags(70.5, 62.4, 5, 0); bags(73, 39.4, 4, 0);
      for (let i = 0; i < 6; i++) d.scene.add(group(77 + (i % 3) * 0.95, 0.05, 39.2 + Math.floor(i / 3) * 0.95, box(0.8, 0.5, 0.8, mat(i % 2 ? '#59633f' : '#4d5638')), box(0.82, 0.06, 0.82, mat('#3d4530'), { y: 0.5 }))); },
  },
};
