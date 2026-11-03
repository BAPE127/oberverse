import { roofed, T, VW, VH, INK, row, look, person, night, bridgeDeck, drawRoofed, drawFloor, minTiles, faceH, groundOf, hash, drawCar, drawProp, drawPixelCar, mk, NEON, grid } from './scene.js';
const W = 60, H = 34, FRONT = 16;
const tiles = grid(W, H, (x, y) => (y >= 18 && y <= 21 ? '=' : y >= 24 ? 'm' : ','));
const SPEC = [{ w: 7, floors: 5, sign: 'RAMEN 24' }, { w: 8, floors: 6, gap: 4, sign: 'NEON LOTUS CLUB', dx: 4 }, { w: 7, floors: 5, sign: 'MERIDIAN BANK' }, { w: 6, floors: 4, sign: 'SYNTH RECORDS' }];
export const BUILD = row(SPEC, 12, FRONT, 2);
export const def = () => ({ id: 'neu_levels', name: 'Neumina', kind: 'outdoor', tiles: tiles.map((r) => r.join('')), buildings: BUILD.map((b) => ({ id: b.id, name: b.sign, mapLabel: b.sign, x: b.x, y: b.y, w: b.w, h: b.h, roof: b.roof, wall: b.wall, trim: '#2a1c3a', flatRoof: true, door: b.door })), props: [], spots: { start: { x: 30, y: 17, facing: 'down' } }, areas: [] });
const lamps = (g, ys) => { const L = []; for (let x = 14; x < 50; x += 6) for (const y of ys) { drawProp(g, { type: 'streetlamp', x, y, w: 1, h: 1, id: `l${x}${y}` }, { wind: 0, map: null, time: 0, night: true }); L.push([x * T + 16, y * T - 22, 120]); } return L; };
const floorY = (b, f) => (b.y + b.h) * T - (14 + 12 * f) * 2;           // world y of the top of floor f on a facade
const STREET_CARS = [['sedan', '#d03aa8', 'E', 14, 19.4], ['taxi', '#e8b030', 'W', 24, 20.5], ['hatch', '#2fb4d0', 'E', 33, 19.4], ['sedan', '#3a3a5a', 'W', 41, 20.5], ['van', '#7a5ad0', 'E', 47, 19.4]];
const PEOPLE = [[15.2, 17.3], [17, 16.8], [18.5, 17.5], [23, 17.2], [24.4, 16.9], [27.6, 17.4], [33.2, 17.2], [35, 16.9], [36.5, 17.5], [40.6, 17.2], [44, 17.4], [21, 22.7], [25, 23.2], [30.8, 22.8], [34, 23.3], [38, 22.9], [41, 23.4], [20, 25.6], [28, 26.4], [36, 25.2], [43, 26.8], [31, 28], [24, 28.4]];
function ground() { return groundOf(tiles.map((r) => r.slice())); }
function actors(g, cam, o = {}) {
  const items = []; PEOPLE.forEach(([x, y], i) => { if (o.only && !o.only(x, y)) return; items.push({ y: y * T, d: () => person(g, look(i * 7 + 3), x * T, y * T, ['down', 'left', 'right', 'up'][i % 4]) }); });
  STREET_CARS.forEach(([k, c, dir, x, y]) => items.push({ y: y * T, d: () => drawCar(g, k, c, dir, x * T, y * T) })); items.sort((a, b) => a.y - b.y).forEach((i) => i.d());
}
function flyer(g, models, id, x, y, ang, color, big = 1) {
  const m = models[id]; const [c, cg] = mk(220, 160); cg.translate(110, 80); cg.scale(big, big); drawPixelCar(cg, m, 0, 0, ang * Math.PI / 180, { color });
  const [s, sg] = mk(220, 160); sg.drawImage(c, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#0a0818'; sg.fillRect(0, 0, 220, 160);
  g.globalAlpha = 0.3; g.drawImage(s, x - 110 + 46, y - 80 + 96); g.globalAlpha = 1; g.drawImage(c, x - 110, y - 80);
}
const quiet = (g, fn) => fn();
const DIM = (g, a = 0.5) => { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(40,36,90,${a})`; g.fillRect(-4000, -4000, 9000, 9000); g.restore(); };
// ----------------------------------------------------------------------------------------------------------------- 1: the street, from outside
export function street(info) {
  const [cv, g] = mk(VW, VH); const cam = { x: 30 * T - VW / 2, y: 16.6 * T - VH / 2 }; g.save(); g.translate(-cam.x, -cam.y);
  g.drawImage(ground(), 0, 0); const L = lamps(g, [17]); lamps(g, [23]).forEach((l) => L.push(l));
  for (const b of [...BUILD].sort((a, c) => (a.y + a.h) - (c.y + c.h))) roofed(g, b);
  // the sky bridge between the 2nd and 3rd building, at the fourth floor
  const A = BUILD[1], B = BUILD[2]; bridgeDeck(g, (A.x + A.w) * T, floorY(A, 3), (B.x - A.x - A.w) * T, 24);
  actors(g, cam);
  const glows = BUILD.map((b) => [(b.door.x + 0.5) * T, FRONT * T - 6, 60 + b.w * 7, NEON[(b.seed + 1) % NEON.length]]);
  flyer(g, info.models, 'tempest', 22 * T, 9.8 * T, 12, '#ff5ec8', 1.15); flyer(g, info.models, 'corsair', 38 * T, 10.6 * T, 192, '#5ee6ff', 1.15);
  g.restore(); const g2 = cv.getContext('2d'); night(g2, VW, VH, { x: 0, y: 0 }, L.map(([x, y, r]) => [x - cam.x, y - cam.y, r]), glows.map(([x, y, r, h]) => [x - cam.x, y - cam.y, r, h]));
  return { cv, player: { x: 30.5, y: 17.4 }, ps: { x: 400, y: 225 + 4 } };
}
// ----------------------------------------------------------------------------------------------------------------- 2: up on the sky bridge (level +1): only this floor shows; the street is below, dimmed
export function bridge(info) {
  const [cv, g] = mk(VW, VH); const cam = { x: 30 * T - VW / 2, y: 12.4 * T - VH / 2 }; g.save(); g.translate(-cam.x, -cam.y);
  g.drawImage(ground(), 0, 0); lamps(g, [17]); STREET_CARS.forEach(([k, c, dir, x, y]) => drawCar(g, k, c, dir, x * T, y * T)); PEOPLE.slice(0, 18).forEach(([x, y], i) => person(g, look(i * 7 + 3), x * T, y * T, 'down'));
  DIM(g, 0.62);                                                                                    // the level below, dimmed
  const A = BUILD[1], B = BUILD[2];
  for (const b of BUILD) { if (b.floors > 3) { g.fillStyle = 'rgba(8,6,22,0.4)'; g.fillRect((b.x + b.w) * T, b.y * T + 10, 40, b.h * T); if (b === A || b === B) drawFloor(g, b, 3, { lit: true, noTag: b !== BUILD[1] }); else drawFloor(g, b, 3, { lit: true, noTag: true }); } else roofed(g, b); }
  // the bridge in plan: a glazed deck joining the two floors
  const bx = (A.x + A.w) * T - 6, bw = (B.x - A.x - A.w) * T + 12, by = (FRONT - 5.5) * T, bh = 2 * T;
  g.fillStyle = 'rgba(8,6,22,0.38)'; g.fillRect(bx + 24, by + 54, bw, bh);
  g.fillStyle = INK; g.fillRect(bx - 2, by - 8, bw + 4, bh + 16); g.fillStyle = '#4a5a80'; g.fillRect(bx, by - 6, bw, 6); g.fillRect(bx, by + bh, bw, 6);
  g.fillStyle = '#c9c2d8'; g.fillRect(bx, by, bw, bh); for (let x = 0; x < bw; x += 16) { g.fillStyle = x % 32 ? '#b8b0cc' : '#d8d2e6'; g.fillRect(bx + x, by, 16, bh); }
  g.fillStyle = '#7fd0e8'; g.globalAlpha = 0.5; g.fillRect(bx, by - 6, bw, 5); g.fillRect(bx, by + bh + 1, bw, 5); g.globalAlpha = 1; for (let x = 0; x < bw; x += 24) { g.fillStyle = '#2a3358'; g.fillRect(bx + x, by - 6, 3, 6); g.fillRect(bx + x, by + bh, 3, 6); }
  g.fillStyle = '#5ee6ff'; g.fillRect(bx, by + bh / 2 - 1, bw, 2); for (let x = 6; x < bw; x += 12) { g.fillStyle = '#a8f4ff'; g.fillRect(bx + x, by + bh / 2 - 1, 5, 2); }
  const crowd = [[0.18, 0.3], [0.4, 0.7], [0.62, 0.35], [0.85, 0.65]]; crowd.forEach(([fx, fy], i) => person(g, look(40 + i), bx + bw * fx, by + bh * fy + 16, i % 2 ? 'left' : 'right'));
  g.restore(); const g2 = cv.getContext('2d'); night(g2, VW, VH, { x: 0, y: 0 }, [[VW / 2, VH / 2, 160]], [[VW / 2, VH / 2 + 8, 150, '#5ee6ff']], 0.38);
  return { cv, player: { x: 30, y: 11.6 }, ps: { x: 400, y: 11.9 * T - cam.y } };
}
// ----------------------------------------------------------------------------------------------------------------- 3: inside the tower, floor 4 of 6 (roof and floors above lifted away; the street below still shows)
export function inside(info) {
  const [cv, g] = mk(VW, VH); const B = BUILD[1]; const cam = { x: (B.x + B.w / 2) * T - VW / 2, y: (B.y + B.h / 2) * T - VH / 2 + 24 }; g.save(); g.translate(-cam.x, -cam.y);
  g.drawImage(ground(), 0, 0); lamps(g, [17]); STREET_CARS.forEach(([k, c, dir, x, y]) => drawCar(g, k, c, dir, x * T, y * T)); PEOPLE.slice(0, 18).forEach(([x, y], i) => person(g, look(i * 7 + 3), x * T, y * T, 'down'));
  DIM(g, 0.58);
  for (const b of BUILD) { if (b === B) continue; if (b.floors > 3) { drawFloor(g, b, 3, { lit: true, noTag: true }); } else roofed(g, b); }
  g.fillStyle = 'rgba(8,6,22,0.4)'; g.fillRect((B.x + B.w) * T, B.y * T + 10, 36, B.h * T); drawFloor(g, B, 3, { lit: true });
  [[0.25, 0.5], [0.45, 0.6], [0.7, 0.45], [0.82, 0.7]].forEach(([fx, fy], i) => person(g, look(60 + i), (B.x + B.w * fx) * T, (B.y + B.h * fy) * T, ['down', 'left', 'up', 'right'][i]));
  g.restore(); const g2 = cv.getContext('2d'); night(g2, VW, VH, { x: 0, y: 0 }, [[VW / 2, VH / 2, 230]], [[VW / 2 - 60, VH / 2 + 30, 120, '#ff5ec8'], [VW / 2 + 70, VH / 2 + 20, 120, '#5ee6ff']], 0.3);
  return { cv, player: { x: B.x + B.w * 0.55, y: B.y + B.h * 0.55 }, ps: { x: 400, y: 225 + 24 } };
}
// ----------------------------------------------------------------------------------------------------------------- 4: the roof (level +2): a helipad, flying cars, the city far below
export function roof(info) {
  const [cv, g] = mk(VW, VH); const B = BUILD[1]; const cam = { x: (B.x + B.w / 2) * T - VW / 2, y: (B.y + B.h / 2) * T - VH / 2 + 10 }; g.save(); g.translate(-cam.x, -cam.y);
  g.drawImage(ground(), 0, 0); lamps(g, [17]); STREET_CARS.forEach(([k, c, dir, x, y]) => drawCar(g, k, c, dir, x * T, y * T)); PEOPLE.slice(0, 16).forEach(([x, y], i) => person(g, look(i * 7 + 3), x * T, y * T, 'down'));
  DIM(g, 0.66);
  for (const b of BUILD) { if (b === B) continue; roofed(g, { ...b, floors: Math.min(b.floors, 6) }); }
  g.fillStyle = 'rgba(8,6,22,0.4)'; g.fillRect((B.x + B.w) * T, B.y * T + 10, 44, B.h * T);
  g.save(); g.beginPath(); g.rect(B.x * T, B.y * T, B.w * T, (B.h - faceH(B.floors) / 16) * T + 2); g.clip(); roofed(g, B); g.restore();
  const hx = B.x + B.w / 2 - 2; drawProp(g, { type: 'helipad', x: Math.round(hx), y: B.y + 1, w: 4, h: 4, id: 'pad' }, { wind: 0, map: null, time: 0, night: true });
  flyer(g, info.models, 'aurelia', (Math.round(hx) + 2) * T, (B.y + 3) * T - 6, 20, '#ffd75e', 1.0); flyer(g, info.models, 'tempest', (B.x - 3) * T, (B.y - 2.5) * T, 30, '#ff5ec8', 1.2);
  g.restore(); const g2 = cv.getContext('2d'); night(g2, VW, VH, { x: 0, y: 0 }, [[VW / 2, VH / 2, 180]], [[VW / 2, VH / 2 + 10, 140, '#ffd75e'], [VW / 2 - 160, VH / 2 - 120, 100, '#ff5ec8']], 0.4);
  return { cv, player: { x: B.x + B.w / 2 + 1.5, y: B.y + 4.6 }, ps: { x: 400 + 70, y: 225 + 70 } };
}
export const SCENES = { street, bridge, inside, roof };
