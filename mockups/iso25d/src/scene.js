// CONCEPT STUDY ONLY — assembles one mock-up scene from a dumped region and renders it.
import { THREE, hash, canvas } from './lib.js';
import { composite, paintGround, paintContact, buildGround, HEIGHT } from './ground.js';
import { buildBuilding, buildCutaway } from './buildings.js';
import { buildProp, lampHeads } from './props.js';
import { person, vehicle } from './actors.js';
import { blob, cone, box, group, mat, shade, mix } from './lib.js';
import { PPT } from './ground.js';
import { DRESS } from './dress.js';

const TIMES = {
  day: { sun: '#fff0d2', sunI: 2.5, sunDir: [-0.55, 1.0, 0.7], sky: '#c6d8ea', gnd: '#7a6e5e', hemiI: 1.15, bg: '#27353d', lamps: 0, lit: 0 },
  overcast: { sun: '#dfe6f0', sunI: 1.15, sunDir: [-0.5, 1.2, 0.6], sky: '#c9d2dc', gnd: '#6f6a66', hemiI: 1.25, bg: '#3a424a', lamps: 0, lit: 0.15 },
  dusk: { sun: '#ff9a5c', sunI: 1.5, sunDir: [-1.0, 0.36, 0.5], sky: '#6f7fae', gnd: '#4a3d3a', hemiI: 0.55, bg: '#1d1f2c', lamps: 1, lit: 0.7 },
  night: { sun: '#8fa6e6', sunI: 0.55, sunDir: [-0.4, 1.0, 0.75], sky: '#3a4a80', gnd: '#1a1c2a', hemiI: 0.72, bg: '#0a0c14', lamps: 1, lit: 0.6 },
  snowdusk: { sun: '#c2cdea', sunI: 0.75, sunDir: [-0.7, 0.8, 0.6], sky: '#9fb0d0', gnd: '#7a84a0', hemiI: 0.95, bg: '#232a3a', lamps: 1, lit: 0.65 },
};

export async function buildScene(spec, data, renderer) {
  const T = { ...TIMES[spec.time || 'day'], ...(spec.light || {}) };
  const R = spec.radius || 34;
  const win = { x0: Math.floor(spec.focus[0] - R), y0: Math.floor(spec.focus[1] - R), w: R * 2, h: R * 2 };
  const cutIds = new Set(spec.cutaway || []);
  const main = data.layers[0];
  const outdoor = data.layers.filter((L) => L.kind !== 'interior');
  const interiorOf = new Map(data.layers.filter((L) => L.kind === 'interior').map((L) => [L.id, L]));
  const C = composite(data, win, cutIds);
  const opts = { weather: spec.weather || 'clear', time: spec.time || 'day', night: T.lamps > 0, lit: T.lit, spec };
  const inWin = (x, y, pad = 0) => x >= win.x0 - pad && y >= win.y0 - pad && x < win.x0 + win.w + pad && y < win.y0 + win.h + pad;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(T.bg);
  const textures = paintGround(C, win, opts);
  // contact shadows around roofed buildings, inside cut-away rooms
  const roofed = [], cut = [];
  for (const L of outdoor) for (const b of L.buildings) { const q = { x: b.x + L.ox, y: b.y + L.oy, w: b.w, h: b.h }; if (!inWin(q.x + q.w / 2, q.y + q.h / 2, 30)) continue; (cutIds.has(b.interior) ? cut : roofed).push(q); }
  paintContact(textures.cv, win, roofed, 0.34, 14);
  paintContact(textures.cv, win, cut.map((q) => ({ x: q.x + 0.12, y: q.y + 0.12, w: q.w - 0.24, h: q.h - 0.24 })), 0.3, 8);
  // garden paths: stepping stones from each front door to the pavement (set dressing derived from the door data)
  { const c = textures.cv.getContext('2d'); const snow = opts.weather === 'snow';
    for (const L of outdoor) for (const b of L.buildings) { if (!b.door) continue; const dx = b.door.x + L.ox - win.x0; let dy = b.door.y + L.oy - win.y0 + 1; for (let i = 0; i < 7 && C.grid[dy]?.[dx] === '.'; i++, dy++) for (let j = 0; j < 2; j++) { c.fillStyle = snow ? 'rgba(170,176,186,0.75)' : j ? '#aca596' : '#b8b1a2'; c.beginPath(); c.ellipse((dx + 0.5 + (j ? 0.08 : -0.06)) * PPT, (dy + 0.27 + j * 0.48) * PPT, 11, 6, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(40,36,30,0.35)'; c.stroke(); } } }
  const dress = DRESS[spec.dress]; const dctx = { THREE, scene: null, opts, lights: null, win, PPT, HEIGHT, C, data };
  if (dress?.paint) dress.paint(textures.cv.getContext('2d'), dctx);
  scene.add(buildGround(C, win, textures, opts));
  // loose growth on the grass: tufts, wild flowers, the odd stone (hash-placed; never on a prop)
  { const taken = new Set(); for (const L of outdoor) for (const p of L.props) for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) taken.add(`${x + L.ox},${y + L.oy}`);
    const snow = opts.weather === 'snow'; const dressR = Math.min(R, (spec.span || 46) * 0.62);
    for (let y = 0; y < win.h; y++) for (let x = 0; x < win.w; x++) { const ch = C.grid[y][x]; if (ch !== '.' && ch !== 'u' && ch !== 'R') continue; const wx = x + win.x0, wy = y + win.y0; if (dctx.clear?.has(`${wx},${wy}`)) continue; if (Math.abs(wx - spec.focus[0]) + Math.abs(wy - spec.focus[1]) > dressR * 1.5 || taken.has(`${wx},${wy}`)) continue; const k = hash(wx, wy, 31); if (k < 0.8) continue; const ox = wx + 0.2 + hash(wx, wy, 32) * 0.6, oz = wy + 0.2 + hash(wx, wy, 33) * 0.6; const y0 = HEIGHT[ch];
      if (k > 0.985 && !snow) scene.add(group(ox, y0, oz, blob(0.34, '#4f7c46', { y: 0.2, sy: 0.7, seed: 1 }), blob(0.22, '#5d8c50', { x: 0.24, y: 0.14, sy: 0.7, seed: 2 })));
      else if (k > 0.95) scene.add(group(ox, y0, oz, blob(0.16, snow ? '#b9c0c6' : '#7d7f84', { y: 0.04, sy: 0.6, detail: 0 })));
      else { const g = group(ox, y0, oz); for (let i = 0; i < 4; i++) g.add(cone(0.045, 0.2 + hash(wx, wy, 40 + i) * 0.16, mat(snow ? '#8c9a6a' : i % 2 ? '#7fa862' : '#5b8648'), { x: (hash(wx, i, 41) - 0.5) * 0.3, z: (hash(wy, i, 42) - 0.5) * 0.3, seg: 4, cast: false })); if (!snow && k > 0.9) g.add(blob(0.05, k > 0.925 ? '#f1e9a0' : '#f4f1e4', { y: 0.2, detail: 0, cast: false })); scene.add(g); } } }

  const lights = []; // {x,y,z,color,intensity,dist}
  const labels = [];
  // buildings
  for (const L of outdoor) for (const b of L.buildings) {
    const bx = b.x + L.ox, by = b.y + L.oy;
    if (!inWin(bx + b.w / 2, by + b.h / 2, 24)) continue;
    const I = interiorOf.get(b.interior);
    const front = (bx + b.w / 2 - spec.focus[0]) + (by + b.h / 2 - spec.focus[1]);
    const g = cutIds.has(b.interior) && I ? buildCutaway(b, I, bx, by, opts, lights) : buildBuilding(b, bx, by, opts, lights, front > (spec.cutFront ?? 6) ? (spec.cutHeight || 4.6) : 0);
    if (g.userData.cutTop && spec.labels?.[b.id] === undefined) labels.push({ text: `${b.mapLabel || b.name} — upper ${g.userData.cutTop - 3} floors hidden`, x: bx + b.w / 2, y: g.userData.top, z: by + b.h / 2, kind: 'place' });
    scene.add(g);
    if (spec.labels?.[b.id]) labels.push({ text: spec.labels[b.id] === true ? (b.sign || b.name) : spec.labels[b.id], x: bx + b.w / 2, y: g.userData.top || 3, z: by + b.h / 2, kind: 'place' });
  }
  // props: streets, plus the furniture of cut-away rooms
  const propLayers = [...outdoor, ...[...cutIds].map((id) => interiorOf.get(id)).filter(Boolean)];
  for (const L of propLayers) {
    const types = new Map(); for (const p of L.props) { if (!types.has(p.type)) types.set(p.type, new Set()); for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) types.get(p.type).add(`${x},${y}`); }
    for (const p of L.props) {
      const x = p.x + L.ox, y = p.y + L.oy;
      if (!inWin(x, y, 2)) continue;
      const ch = C.grid[Math.floor(y - win.y0)]?.[Math.floor(x - win.x0)];
      const g = buildProp(p, { wx: x, wy: y, layer: L, same: types.get(p.type), interior: L.kind === 'interior', ground: HEIGHT[ch] ?? 0, opts, lights, lw: L.w, lh: L.h });
      if (!g) continue;
      g.position.x += x; g.position.z += y; g.position.y += HEIGHT[ch] ?? 0;
      scene.add(g);
    }
  }
  // people: the simulation's own, where it put them, plus any staged for the composition
  const offs = new Map(data.layers.map((L) => [L.id, L]));
  const staged = new Map((spec.people || []).map((p) => [p.id, p]));
  const hide = new Set(spec.hide || []);
  const folk = [];
  for (const n of data.npcs) { const L = offs.get(n.map); if (!L || hide.has(n.id)) continue; if (L.kind === 'interior' && !cutIds.has(L.id) && !staged.has(n.id)) continue; const s = staged.get(n.id); folk.push({ ...n, x: s ? s.x : n.x + L.ox, y: s ? s.y : n.y + L.oy, facing: s?.facing || n.facing, walk: s?.walk ?? null, label: s?.label ?? (/^(Officer|Sir|Dr\.?|Captain|Sergeant|Mr\.?|Mrs\.?) /.test(n.name) ? n.name.split(' ').slice(0, 2).join(' ').replace('Sir Richard', 'Sir Moneybucks') : (n.name.match(/"([^"]+)"/)?.[1] || n.name.split(' ')[0])), holding: s?.holding, tag: s?.tag }); staged.delete(n.id); }
  for (const s of staged.values()) folk.push({ appearance: s.appearance || data.player.appearance, ...s });
  for (const n of folk) {
    if (!inWin(n.x, n.y)) continue;
    const ch = C.grid[Math.floor(n.y - win.y0)]?.[Math.floor(n.x - win.x0)];
    const g = person(n.appearance, { facing: n.facing, walk: n.walk, seed: n.id || n.label, holding: n.holding, kit: n.kit, opts });
    g.position.set(n.x, HEIGHT[ch] ?? 0, n.y); scene.add(g);
    if (n.label && spec.nameTags !== false) labels.push({ text: n.label, x: n.x, y: (HEIGHT[ch] ?? 0) + 1.72, z: n.y, kind: n.tag || 'npc' });
  }
  // vehicles
  const cars = [...(spec.simCars === false ? [] : [...data.cars, ...data.transit]), ...(spec.cars || [])];
  for (const c of cars) {
    if (!inWin(c.x, c.y) || (spec.hideCars || []).includes(c.id)) continue;
    const g = vehicle(c, { opts, lights, moving: c.moving });
    g.position.set(c.x, 0, c.y); g.rotation.y = -c.angle; scene.add(g);
  }
  if (dress?.build) dress.build({ ...dctx, scene, lights, labels, person, vehicle });

  // ---- light
  const hemi = new THREE.HemisphereLight(T.sky, T.gnd, T.hemiI); scene.add(hemi);
  const sun = new THREE.DirectionalLight(T.sun, T.sunI);
  const sd = new THREE.Vector3(...T.sunDir).normalize();
  const f = new THREE.Vector3(spec.focus[0], 0, spec.focus[1]);
  sun.position.copy(f).addScaledVector(sd, 120); sun.target.position.copy(f); scene.add(sun, sun.target);
  sun.castShadow = true; const sc = sun.shadow.camera; const ext = spec.shadowExtent || 46; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 320; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = spec.time === 'day' ? 2.2 : 5;
  if (T.lamps) {
    const near = lights.map((l) => ({ l, d: Math.hypot(l.x - spec.focus[0], l.z - spec.focus[1]) - (l.prio || 0) })).sort((a, b) => a.d - b.d).slice(0, spec.maxLights || 30);
    for (const { l } of near) {
      if (l.spot) { const s = new THREE.SpotLight(l.color, l.intensity, l.dist, l.angle || 0.5, 0.95, 1.5); s.position.set(l.x, l.y, l.z); s.target.position.set(l.x + l.spot[0], l.y + l.spot[1], l.z + l.spot[2]); scene.add(s, s.target); }
      else { const p = new THREE.PointLight(l.color, l.intensity, l.dist, 1.7); p.position.set(l.x, l.y, l.z); scene.add(p); }
    }
  }
  if (opts.weather === 'fog' || opts.weather === 'snow' || opts.weather === 'rain' || spec.fog) { const fg = spec.fog || (opts.weather === 'fog' ? [T.lamps ? '#262c3a' : '#b9c2c8', 0.018] : opts.weather === 'snow' ? [T.lamps ? '#2a3044' : '#cfd6dd', 0.008] : [T.lamps ? '#161a26' : '#8f9aa4', 0.009]); scene.userData.fog = fg; }

  // ---- the fixed dimetric camera: 2:1 tiles, looking north-west (south and east faces of everything are seen)
  const aspect = spec.width / spec.height; const span = spec.span || 46;
  const cam = new THREE.OrthographicCamera(-span / 2, span / 2, span / 2 / aspect, -span / 2 / aspect, 1, 600);
  const el = Math.atan(0.5 / Math.SQRT1_2 * Math.SQRT1_2) ; // 2:1 dimetric (≈26.57°… the classic pixel-art isometric)
  const elev = spec.elev ?? Math.atan(Math.sin(Math.PI / 6) / Math.cos(Math.PI / 6)); // 30° elevation → 2:1 ground diamonds
  const dir = new THREE.Vector3(Math.cos(elev) * Math.SQRT1_2, Math.sin(elev), Math.cos(elev) * Math.SQRT1_2);
  cam.position.copy(f).addScaledVector(dir, 200); cam.lookAt(f); cam.updateMatrixWorld();
  if (scene.userData.fog) { const [col, k] = scene.userData.fog; scene.fog = new THREE.Fog(col, 200 - span * 0.55, 200 + 0.9 / k); }
  return { scene, cam, labels, T, opts, win };
}
