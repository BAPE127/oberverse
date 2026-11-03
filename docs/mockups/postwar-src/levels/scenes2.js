import { T, VW, VH, INK, strip, drawB, ground, drawCar, drawProp, drawPixelCar, mk, night, hash, rng, drawCharacter, NEON, STYLES, drawFloor, drawRoofed } from './city.js';
const px = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const SK = ['#e8c4a0', '#d9a77f', '#b97f58', '#8a5a3c', '#f2d4b8'];
const LOOKS = {
  elite: { out: ['#f4f0e0', '#e8d8a0', '#d8c8f0', '#f0e0e8', '#c8d8e8'], hair: ['#2a2020', '#c8a050', '#e8e0d0', '#6a4a2a'], hs: ['bun', 'parted', 'ponytail', 'long', 'hat', 'tophat'], acc: [[], [], ['shades'], ['scarf']], legs: ['#2a2a3a', '#e8e0d0', '#3a3a4a'] },
  corp: { out: ['#6a3fa0', '#2fa0c0', '#c43fa0', '#2a2438', '#d8b030', '#3f4f8a', '#e8e8f0', '#30a070'], hair: ['#ff5ec8', '#5ee6ff', '#ffd75e', '#a98cff', '#2a2438', '#f2f2f2', '#8aff9a'], hs: ['bun', 'cap', 'curly', 'long', 'messy', 'parted', 'ponytail'], acc: [[], [], ['shades'], ['goggles'], ['vest']], legs: ['#1c1634', '#2a2a4a', '#322046'] },
  slum: { out: ['#4a4238', '#3a3a34', '#5a4a3a', '#2f3a3a', '#6a5a40', '#4a3a3a'], hair: ['#2a2020', '#4a3a2a', '#8a8a8a', '#1c1814'], hs: ['cap', 'messy', 'hardhat', 'cap', 'curly'], acc: [['scarf'], ['goggles'], ['vest'], ['scarf'], []], legs: ['#2a2a24', '#34302a', '#3a3a30'] },
};
const look = (cls, k) => { const L = LOOKS[cls], r = (a, s) => a[Math.floor(hash(k, s, 3) * a.length) % a.length]; return { skin: r(SK, 1), hair: r(L.hair, 2), hairStyle: r(L.hs, 3), hatColor: r(L.out, 9), outfit: r(L.out, 4), legs: r(L.legs, 5), shoes: '#14121a', accent: r(L.out, 6), accessories: r(L.acc, 7), build: 'average', height: 1 }; };
const person = (g, a, x, y, f = 'down') => drawCharacter(g, a, { x, y, facing: f, moving: false, idleTime: 0 });
const lamp = (g, x, y) => { drawProp(g, { type: 'streetlamp', x, y, w: 1, h: 1, id: `l${x}_${y}` }, { wind: 0, map: null, time: 0, night: true }); return [x * T + 16, y * T - 22]; };
const prop = (g, type, x, y, w = 1, h = 1, o = {}) => drawProp(g, { type, x, y, w, h, id: `${type}${x}_${y}`, ...o }, { wind: 0, map: null, time: 0, night: true });
const shadowRect = (g, x, y, w, h, a = 0.28) => px(g, x, y, w, h, `rgba(8,6,24,${a})`);
function cable(g, x0, y0, x1, y1, sag = 10, c = '#14101a') { g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); g.stroke(); }
function bridgeV(g, x, y0, y1, wT = 2.2) { const w = wT * T, X = x * T - w / 2, Y = y0 * T, H = (y1 - y0) * T; shadowRect(g, X + 34, Y + 56, w, H, 0.3); px(g, X - 2, Y - 2, w + 4, H + 4, INK); px(g, X, Y, w, H, '#2a3a60'); px(g, X + 3, Y + 3, w - 6, H - 6, '#5aa8c8'); px(g, X + 3, Y + 3, 4, H - 6, '#cfeefa'); px(g, X + w - 7, Y + 3, 4, H - 6, '#3a6a8a'); for (let i = 10; i < H - 6; i += 28) px(g, X + 3, Y + i, w - 6, 3, '#2a3a60'); px(g, X + w / 2 - 1, Y + 3, 2, H - 6, '#a8f4ff'); for (let i = 0; i < H; i += 12) px(g, X + w / 2 - 1, Y + i, 2, 5, '#e8fcff'); }
function steam(g, x, y, r = rng(1), n = 5) { for (let i = 0; i < n; i++) { const a = 0.28 - i * 0.04; g.fillStyle = `rgba(200,205,220,${a})`; const s = 8 + i * 5; g.fillRect(Math.round(x - s / 2 + (r() - 0.5) * 8 + i * 3), Math.round(y - i * 14 - s / 2), s, s); } }
function pipe(g, x0, y, x1, th = 12, c = '#6a5a4a') { px(g, x0, y + th - 1 + 10, x1 - x0, 6, 'rgba(8,6,24,0.3)'); px(g, x0, y - 1, x1 - x0, th + 2, INK); px(g, x0, y, x1 - x0, th, c); px(g, x0, y + 1, x1 - x0, 3, '#8a7a68'); px(g, x0, y + th - 3, x1 - x0, 3, '#3a2e24'); for (let x = x0 + 30; x < x1; x += 90) { px(g, x - 3, y - 3, 8, th + 6, INK); px(g, x - 2, y - 2, 6, th + 4, '#4a3e32'); } }
const NEUT = (tag) => tag;
function stage(cam, fn) { const [cv, g] = mk(VW, VH); g.save(); g.translate(-cam.x, -cam.y); const out = fn(g) || {}; g.restore(); return { cv, g, ...out }; }
function finishNight(cv, cam, out, dark) { night(cv.getContext('2d'), VW, VH, { x: 0, y: 0 }, (out.lights || []).map(([x, y, r]) => [x - cam.x, y - cam.y, r]), (out.glows || []).map(([x, y, r, h]) => [x - cam.x, y - cam.y, r, h]), dark); }
const mkcam = (cx, cy) => ({ x: cx * T - VW / 2, y: cy * T - VH / 2 });
const drawAll = (g, arr) => arr.slice().sort((a, b) => (a.y + a.h) - (b.y + b.h)).forEach((b) => drawB(g, b));
// ================================================================================================ 0: GLASS MILE (commerce level)
export function street(info) {
  const cam = mkcam(40, 8.9); const r = rng(11);
  const S = stage(cam, (g) => {
    ground(g, 'walk', 20 * T, 0, 40 * T, 40 * T, 3); ground(g, 'road', 20 * T, 11 * T, 40 * T, 4 * T, 5);
    ground(g, 'plate', 45 * T, 3 * T, 9 * T, 8 * T, 2); ground(g, 'plate', 33 * T, 17 * T, 4 * T, 3 * T, 4); for (let x = 20 * T; x < 60 * T; x += 64) px(g, x, 13 * T - 2, 36, 4, '#e8c860'); px(g, 20 * T, 11 * T - 4, 40 * T, 2, '#5a5a7a'); px(g, 20 * T, 15 * T + 2, 40 * T, 2, '#5a5a7a');
    // crossings and grates
    for (const cx of [37, 53]) for (let i = 0; i < 4; i++) px(g, cx * T, 11 * T + i * 32 + 6, 64, 14, 'rgba(232,232,248,0.8)');
    for (const [x, y] of [[30, 13.6], [47, 12.4], [57, 14]]) { px(g, x * T, y * T, 28, 16, '#14101a'); for (let i = 0; i < 4; i++) px(g, x * T + 3 + i * 6, y * T + 2, 3, 12, '#3a3a52'); }
    const north = [...strip({ x0: 20, x1: 45, front: 9, kinds: ['corp', 'shop', 'shop', 'corp', 'shop'], seed: 21, stagger: 2, gaps: [0, 1, 1, 3], wmin: 4, wmax: 9, fl: { shop: [2, 5], corp: [4, 8] } }), ...strip({ x0: 54, x1: 62, front: 9, kinds: ['corp', 'shop'], seed: 24, stagger: 1, wmin: 4, wmax: 8 })];
    const south = strip({ x0: 20, x1: 62, front: 27, kinds: ['corp', 'shop', 'corp'], seed: 31, stagger: 1, gaps: [1, 2, 3], wmin: 5, wmax: 11, fl: { corp: [5, 9], shop: [3, 6] } }); south.forEach((b) => { b.sign = undefined; });
    drawAll(g, [...north, ...south]);
    // the market notch: stalls, hologram, benches
    for (const [x, y] of [[46, 4], [49, 4], [52, 4], [46, 7.5], [49, 7.5], [52, 7.5]]) prop(g, 'tent', x, y, 2, 2);
    prop(g, 'monitor_wall', 47, 3.2, 4, 1); prop(g, 'bench', 47, 6.2); prop(g, 'bench', 52, 6.2); prop(g, 'plant', 45, 9); prop(g, 'plant', 54, 9); prop(g, 'crate', 51, 6); prop(g, 'barrel', 45, 10);
    const L = []; for (const x of [22, 29, 36, 43, 50, 57]) { L.push(lamp(g, x + Math.floor(r() * 2), 10)); L.push(lamp(g, x + 3, 15)); }
    for (const [x, y] of [[26, 15.5], [41, 15.6], [58, 10]]) prop(g, 'hydrant', x, y); prop(g, 'busstop', 40, 15.4); prop(g, 'trashbarrel', 31, 10.2); prop(g, 'vent', 44, 15.6); prop(g, 'dumpster', 55, 15.7, 2, 1);
    // cables, a flying billboard, a sky bridge
    cable(g, 28 * T, 5 * T, 44 * T, 4.2 * T, 14); cable(g, 44 * T, 4.2 * T, 58 * T, 6 * T, 12); cable(g, 22 * T, 8 * T, 36 * T, 6.5 * T, 10);
    bridgeV(g, 33, 8.4, 17.4, 2); 
    // traffic: two lanes each way, mixed
    const cars = [['bus', '#2fb4d0', 'E', 24, 11.7], ['taxi', '#e8b030', 'W', 33, 12.5], ['sedan', '#d03aa8', 'E', 40, 11.7], ['van', '#7a5ad0', 'W', 47, 12.5], ['sedan', '#e8e8f0', 'E', 55, 11.7], ['truck', '#5a6a7a', 'W', 26, 13.5], ['hatch', '#ff8a4e', 'W', 40, 13.5], ['sedan', '#3a3a5a', 'E', 31, 14.1], ['taxi', '#e8b030', 'E', 49, 14.1]];
    cars.forEach(([k, c, d, x, y]) => drawCar(g, k, c, d, x * T, y * T));
    // people: groups at the stalls and shopfronts, streams on the pavements
    const P = []; for (let i = 0; i < 46; i++) { const row = r(); const x = 21 + r() * 40, y = row < 0.5 ? 9.6 + r() * 1.2 : row < 0.8 ? 15.6 + r() * 1.2 : 3.5 + r() * 6; P.push([x, y, i]); } P.sort((a, b) => a[1] - b[1]).forEach(([x, y, i]) => person(g, look('corp', i * 5 + 1), x * T, y * T, ['down', 'left', 'right', 'up'][i % 4]));
    // a gang of cyber-augmented guards at the club door, and a flying car in the lane above
    const fly = (m, x, y, a, c, big = 1.15) => { const [c1, cg] = mk(220, 160); cg.translate(110, 80); cg.scale(big, big); drawPixelCar(cg, info.models[m], 0, 0, a * Math.PI / 180, { color: c }); const [s, sg] = mk(220, 160); sg.drawImage(c1, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#0a0818'; sg.fillRect(0, 0, 220, 160); g.globalAlpha = 0.3; g.drawImage(s, x * T - 110 + 50, y * T - 80 + 100); g.globalAlpha = 1; g.drawImage(c1, x * T - 110, y * T - 80); };
    fly('tempest', 27, 5, 8, '#ff5ec8'); fly('corsair', 50, 13.5, 190, '#5ee6ff');
    // the great hanging sign
    const sx = 40 * T, sy = 5.6 * T; shadowRect(g, sx + 40, sy + 130, 200, 40, 0.3); px(g, sx - 2, sy - 2, 204, 52, INK); px(g, sx, sy, 200, 48, '#2a1844'); px(g, sx + 4, sy + 4, 192, 40, '#ff5ec8'); px(g, sx + 4, sy + 4, 192, 6, '#ffa0e0'); g.font = 'bold 20px "Trebuchet MS", sans-serif'; g.fillStyle = '#2a1030'; g.textAlign = 'center'; g.fillText('SYNTH-CHAIN', sx + 100, sy + 33); g.textAlign = 'left';
    return { lights: L.map(([x, y]) => [x, y, 116]), glows: [...north.filter((b) => b.kind !== 'corp').map((b) => [(b.door.x + 0.5) * T, 9 * T - 4, 58 + b.w * 6, NEON[b.seed % NEON.length]]), [sx + 100, sy + 80, 120, '#ff5ec8'], [50 * T, 5.5 * T, 110, '#5ee6ff'], [27 * T, 6.3 * T, 70, '#ff5ec8']], ps: { x: 400, y: (10.4 * T) - cam.y } };
  });
  finishNight(S.cv, cam, S, 0.5); return { cv: S.cv, ps: S.ps };
}

const FLY = (g, info, m, x, y, a, c, big = 1.15) => { const [c1, cg] = mk(220, 160); cg.translate(110, 80); cg.scale(big, big); drawPixelCar(cg, info.models[m], 0, 0, a * Math.PI / 180, { color: c }); const [s, sg] = mk(220, 160); sg.drawImage(c1, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#0a0818'; sg.fillRect(0, 0, 220, 160); g.globalAlpha = 0.28; g.drawImage(s, x * T - 110 + 60, y * T - 80 + 120); g.globalAlpha = 1; g.drawImage(c1, x * T - 110, y * T - 80); };
// ================================================================================================ +4: SKYLINE TERRACES (the elite level)
function eliteBand(g, y0, y1, info, o = {}) {
  const r = rng(o.seed || 41); ground(g, 'elite', 20 * T, y0 * T, 44 * T, (y1 - y0) * T, 7);
  const bl = strip({ x0: 20, x1: 64, front: y0 + 9, kinds: ['elite'], seed: o.seed || 41, stagger: 1, gaps: [2, 3, 5], wmin: 6, wmax: 10, fl: { elite: [6, 9] } }); drawAll(g, bl); return bl;
}
export function terrace(info) {
  const cam = mkcam(40, 11.9); const r = rng(5);
  const S = stage(cam, (g) => {
    const bl = eliteBand(g, 0, 17, info); const L = [];
    // the promenade: a fountain court, trees, planters, benches; low light, warm and clean
    for (let i = 0; i < 8; i++) { prop(g, 'tree', 24 + i * 4.8 + (i % 2), 11.2 + (i % 3) * 0.2, 1, 1); }
    prop(g, 'fountain', 39, 12.6, 2, 2); prop(g, 'statue', 45, 12.4); prop(g, 'statue', 33, 12.4);
    for (let x = 22; x < 62; x += 3.2) { prop(g, 'plant', Math.round(x), 9.7); } for (const x of [26, 36, 44, 54]) { prop(g, 'bench', x, 14); }
    for (const x of [24, 31, 38, 46, 53, 60]) { L.push(lamp(g, x, 10.2)); L.push(lamp(g, x + 2, 15)); }
    // the glass balustrade at the terrace edge and the drop below
    const ey = 16.4 * T; px(g, 20 * T, ey, 44 * T, 18, INK); px(g, 20 * T, ey + 2, 44 * T, 14, '#9ac8d8'); px(g, 20 * T, ey + 2, 44 * T, 3, '#e8fcff'); for (let x = 20 * T; x < 64 * T; x += 48) px(g, x, ey, 6, 24, '#c8a850');
    // below: the glass-mile level, hazed and dimmed
    const bh = 260; const [b, bg] = mk(44 * T, bh); bg.translate(-20 * T, -(ey + 18)); ground(bg, 'walk', 20 * T, ey + 18, 44 * T, bh, 3); drawAll(bg, strip({ x0: 20, x1: 64, front: 21, kinds: ['corp', 'shop', 'corp'], seed: 61, stagger: 1, gaps: [0, 1, 2], wmin: 5, wmax: 10, fl: { corp: [3, 4], shop: [2, 3] } }));
    bg.globalCompositeOperation = 'multiply'; bg.fillStyle = 'rgba(70,64,140,0.55)'; bg.fillRect(20 * T, ey + 18, 44 * T, bh); bg.globalCompositeOperation = 'source-over'; const hz = bg.createLinearGradient(0, ey + 18, 0, ey + 18 + bh); hz.addColorStop(0, 'rgba(20,16,50,0.5)'); hz.addColorStop(1, 'rgba(60,40,110,0.25)'); bg.fillStyle = hz; bg.fillRect(20 * T, ey + 18, 44 * T, bh);
    g.drawImage(b, 20 * T, ey + 18); shadowRect(g, 20 * T, ey + 18, 44 * T, 18, 0.5);
    for (const [x, y] of [[30, 19.2], [45, 20.4], [56, 19.4]]) { px(g, x * T, y * T, 40, 8, '#ff5ec8'); px(g, x * T, y * T + 2, 40, 2, '#ffd0f0'); }
    // flying cars, gold and white, gliding over the terrace
    FLY(g, info, 'aurelia', 31, 6.2, 6, '#f4f0e0', 1.3); FLY(g, info, 'regent', 53, 13.2, 186, '#d8b858', 1.3);
    // the rich: pale coats, hats, slow groups; a pair of white-uniformed guards
    const P = []; for (let i = 0; i < 24; i++) P.push([22 + r() * 40, 10 + r() * 5.4, i]); P.sort((a, b) => a[1] - b[1]).forEach(([x, y, i]) => person(g, look('elite', i * 9 + 2), x * T, y * T, ['down', 'left', 'right', 'up'][i % 4]));
    for (const x of [38, 41.6]) person(g, { ...look('elite', 90), outfit: '#ece6d6', hairStyle: 'cap', hatColor: '#c8a850', accessories: ['shades'] }, x * T, 15.9 * T, 'down');
    return { lights: L.map(([x, y]) => [x, y, 132]), glows: [[40 * T, 13.5 * T, 190, '#fff2c8'], [30 * T, 7 * T, 90, '#fff2c8'], [51 * T, 14 * T, 90, '#ffd88a']], ps: { x: 400, y: 12.0 * T - cam.y } };
  });
  finishNight(S.cv, cam, S, 0.3); return { cv: S.cv, ps: S.ps };
}
// ================================================================================================ -2: THE UNDER-LEVELS (the poor level)
export function under(info) {
  const cam = mkcam(40, 9.6); const r = rng(9);
  const S = stage(cam, (g) => {
    ground(g, 'under', 20 * T, 0, 44 * T, 40 * T, 11); ground(g, 'plate', 20 * T, 12.2 * T, 44 * T, 2.6 * T, 12);
    const north = strip({ x0: 20, x1: 64, front: 10, kinds: ['slum'], seed: 71, stagger: 2, gaps: [0, 0, 1, 2], wmin: 3, wmax: 7, fl: { slum: [2, 4] } }); const south = strip({ x0: 20, x1: 64, front: 22, kinds: ['slum'], seed: 73, stagger: 2, gaps: [0, 1, 1, 2], wmin: 3, wmax: 7, fl: { slum: [2, 5] } }); drawAll(g, [...north, ...south]);
    // pipes, cables, laundry; a blocked lane of stalls and fires
    pipe(g, 20 * T, 11.2 * T, 64 * T, 12, '#6a5a4a'); pipe(g, 20 * T, 11.7 * T, 64 * T, 8, '#4a6a5a'); pipe(g, 20 * T, 15.2 * T, 64 * T, 14, '#7a5a3a');
    for (const x of [27, 36, 46, 55]) { px(g, x * T - 4, 11.2 * T - 3, 8, 46, INK); px(g, x * T - 3, 11.2 * T - 2, 6, 44, '#4a3e32'); }
    for (let i = 0; i < 6; i++) { const x0 = (22 + i * 7) * T; cable(g, x0, 8.2 * T, x0 + 6.5 * T, 8.6 * T, 14); }
    for (const [x, y] of [[26, 13], [31.5, 13.2], [39, 13], [46, 13.3], [53, 13]]) prop(g, 'tent', Math.round(x), Math.round(y), 2, 2);
    for (const [x, y] of [[30, 12.4], [44, 14.6], [57, 12.6]]) prop(g, 'barrelfire', x, y);
    for (const [x, y] of [[24, 14.8], [28, 15], [35, 14.9], [41, 15.2], [50, 15], [58, 14.9]]) prop(g, ['crate', 'barrel', 'dumpster', 'scrap'][Math.floor(r() * 4)], x, y);
    prop(g, 'workbench', 47, 12.2, 2, 1); prop(g, 'generator', 22, 12.2); prop(g, 'vent', 33, 15.4); prop(g, 'vent', 52, 15.4);
    const L = []; for (const [x, y] of [[23, 10.4], [34, 10.5], [49, 10.4], [60, 10.5], [28, 15.6], [43, 15.6], [56, 15.6]]) L.push([x * T + 16, y * T - 10]);
    for (const [x, y] of [[30, 11.4], [44, 14.6], [57, 12.4], [38, 15.2], [26, 11.4]]) { steam(g, x * T + 16, y * T + 6, rng(Math.floor(x))); }
    const P = []; for (let i = 0; i < 40; i++) { const t = r(); P.push([21 + r() * 42, t < 0.5 ? 12.1 + r() * 2.8 : 10.2 + r() * 1.2, i]); } P.sort((a, b) => a[1] - b[1]).forEach(([x, y, i]) => person(g, look('slum', i * 11 + 4), x * T, y * T, ['down', 'left', 'right', 'up'][i % 4]));
    // girder shadows from the levels above, and shafts of cold light through the gaps
    g.save(); g.fillStyle = 'rgba(6,4,18,0.35)'; g.fillRect(cam.x, 5.6 * T, VW, 0.7 * T); g.restore();
    g.save(); g.globalCompositeOperation = 'screen'; for (const [x, w] of [[29, 3], [50, 2.4]]) { g.fillStyle = 'rgba(150,200,230,0.1)'; g.fillRect(x * T, cam.y, w * T, VH); g.fillStyle = 'rgba(190,225,245,0.07)'; g.fillRect((x + 0.4) * T, cam.y, (w - 0.8) * T, VH); } g.restore();
    return { lights: L.map(([x, y]) => [x, y, 76]).concat([[30 * T + 16, 12.6 * T, 90], [44 * T + 16, 15 * T, 90], [57 * T + 16, 13 * T, 90], [30.5 * T, 12 * T, 120]]), glows: [[30 * T + 16, 12.8 * T, 90, '#ff8a4e'], [44 * T + 16, 15 * T, 80, '#ff8a4e'], [57 * T + 16, 13 * T, 80, '#ff8a4e'], [35 * T, 9.6 * T, 60, '#8aff9a'], [51 * T, 9.6 * T, 60, '#5ee6ff'], [40 * T, 13.4 * T, 70, '#ffb060']], ps: { x: 400, y: 12.8 * T - cam.y } };
  });
  finishNight(S.cv, cam, S, 0.6); return { cv: S.cv, ps: S.ps };
}
// ================================================================================================ the stack: all three levels in one view (the class divide)
export function stack(info) {
  const cam = mkcam(40, 8.4); const r = rng(3);
  const S = stage(cam, (g) => {
    const L = [], G = []; const bands = [{ k: 'elite', y0: 0, y1: 5.2 }, { k: 'corp', y0: 5.9, y1: 10.6 }, { k: 'slum', y0: 11.3, y1: 16.2 }];
    const wall = (y, kind) => { const Y = y * T, H = 0.7 * T; if (kind === 'elite') { px(g, cam.x, Y, VW, H, INK); px(g, cam.x, Y + 2, VW, H - 4, '#ece6d6'); px(g, cam.x, Y + 2, VW, 3, '#fff'); px(g, cam.x, Y + H - 8, VW, 4, '#c8a850'); for (let x = Math.floor(cam.x / 40) * 40; x < cam.x + VW; x += 40) px(g, x, Y + 4, 2, H - 10, '#bdb59f'); } else if (kind === 'corp') { px(g, cam.x, Y, VW, H, INK); px(g, cam.x, Y + 2, VW, H - 4, '#3c3c58'); px(g, cam.x, Y + 2, VW, 3, '#6a6a90'); for (let x = Math.floor(cam.x / 32) * 32; x < cam.x + VW; x += 32) px(g, x + 14, Y + 8, 4, 4, '#8a8aa8'); px(g, cam.x, Y + H - 6, VW, 3, '#5ee6ff'); } shadowRect(g, cam.x, Y + H, VW, 30, 0.55); };
    for (const b of bands) { g.save(); g.beginPath(); g.rect(cam.x, b.y0 * T, VW, (b.y1 - b.y0) * T); g.clip();
      if (b.k === 'elite') { ground(g, 'elite', 20 * T, b.y0 * T, 44 * T, 6 * T, 7); drawAll(g, strip({ x0: 20, x1: 64, front: 2.8, kinds: ['elite'], seed: 41, stagger: 0, gaps: [2, 4], wmin: 6, wmax: 10, fl: { elite: [3, 4] } })); for (let i = 0; i < 6; i++) prop(g, 'tree', 22 + i * 7 + (i % 2), 3.4); prop(g, 'fountain', 39, 3.2, 2, 2); for (let i = 0; i < 9; i++) person(g, look('elite', i * 9 + 2), (22 + r() * 40) * T, (3.4 + r() * 1.5) * T); for (const x of [26, 49]) L.push(lamp(g, x, 4.2)); }
      if (b.k === 'corp') { ground(g, 'walk', 20 * T, b.y0 * T, 44 * T, 6 * T, 3); ground(g, 'road', 20 * T, 8.5 * T, 44 * T, 1.9 * T, 5); drawAll(g, strip({ x0: 20, x1: 64, front: 8.1, kinds: ['corp', 'shop'], seed: 31, stagger: 0, gaps: [0, 1, 2], wmin: 5, wmax: 9, fl: { corp: [3, 4], shop: [2, 3] } })); [['taxi', '#e8b030', 'E', 31, 9.1], ['sedan', '#d03aa8', 'W', 42, 9.9], ['bus', '#2fb4d0', 'E', 53, 9.1]].forEach(([k, c, d, x, y]) => drawCar(g, k, c, d, x * T, y * T)); for (let i = 0; i < 14; i++) person(g, look('corp', i * 5 + 1), (21 + r() * 41) * T, (8.15 + r() * 0.35) * T); for (const x of [25, 36, 47, 58]) L.push(lamp(g, x, 8.4)); }
      if (b.k === 'slum') { ground(g, 'under', 20 * T, b.y0 * T, 44 * T, 7 * T, 11); drawAll(g, strip({ x0: 20, x1: 64, front: 13.8, kinds: ['slum'], seed: 73, stagger: 1, gaps: [0, 1], wmin: 3, wmax: 7, fl: { slum: [2, 3] } })); pipe(g, 20 * T, 14.9 * T, 64 * T, 12, '#7a5a3a'); prop(g, 'barrelfire', 30, 14.2); prop(g, 'barrelfire', 52, 14.4); steam(g, 30 * T + 16, 14.2 * T + 6, rng(3)); steam(g, 52 * T + 16, 14.4 * T + 6, rng(4)); for (let i = 0; i < 12; i++) person(g, look('slum', i * 11 + 4), (22 + r() * 40) * T, (13.9 + r() * 1.9) * T); G.push([30 * T + 16, 14.6 * T, 80, '#ff8a4e'], [52 * T + 16, 14.8 * T, 80, '#ff8a4e']); }
      g.restore(); }
    wall(5.2, 'elite'); wall(10.6, 'corp');
    // the lower the level, the darker and murkier; and haze down the stack
    g.save(); g.fillStyle = 'rgba(30,26,80,0.20)'; g.fillRect(cam.x, 5.9 * T, VW, 4.7 * T); g.fillStyle = 'rgba(8,6,22,0.5)'; g.fillRect(cam.x, 11.3 * T, VW, 5 * T); g.restore();
    bridgeV(g, 31, 5.4, 8.1, 1.8); FLY(g, info, 'aurelia', 50, 4.6, 4, '#f4f0e0', 1.0); FLY(g, info, 'tempest', 26, 9.8, 180, '#ff5ec8', 1.0);
    return { lights: L.map(([x, y]) => [x, y, 110]).concat([[40 * T, 3.5 * T, 200], [30 * T, 14.8 * T, 70], [52 * T, 14.8 * T, 70]]), glows: [[40 * T, 3.4 * T, 190, '#fff2c8'], [40 * T, 9 * T, 80, '#5ee6ff'], [46 * T, 8 * T, 70, '#ff5ec8'], ...G], ps: { x: 400, y: 4.3 * T - cam.y } };
  });
  finishNight(S.cv, cam, S, 0.36); return { cv: S.cv, ps: S.ps };
}
export const SCENES = { street, terrace, under, stack };
export const def = () => { const W = 64, H = 40; const t = Array.from({ length: H }, () => 'g'.repeat(W)); return { id: 'neu_class', name: 'Neumina', kind: 'outdoor', tiles: t, buildings: [], props: [], spots: { start: { x: 30, y: 12, facing: 'down' } }, areas: [] }; };
