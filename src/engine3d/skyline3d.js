// The city beyond the map (v0.107.0, Neumina): a planet of towers. Built once per megacity street level and carried in that level's
// scene, so it stands at the street's height whichever level you are on. Two parts, both cheap (instanced, one draw call each):
//   the skyline   towers past the north and west edges (behind the map, as the camera sees it) rising far above the Terraces, and
//                 towers past the south and east edges whose tops stay below the street, so they never stand in front of you: you
//                 look past the edge of the street into a lit abyss of the city going down;
//   the traffic   lanes of air-cars, small lit shapes gliding along straight lanes under the Skyway, above the city beyond, and in the
//                 abyss. Decoration only: they do not hit anything.
// Deterministic (the map's own hash), no state, nothing saved. In Node (no DOM) the window texture is skipped.
import { THREE, hash } from './lib3d.js';

const LIT = ['#ffd9a0', '#9fdcff', '#ff9fd8', '#c8b8ff', '#fff2c8'];

function windowTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = '#0a0b12'; x.fillRect(0, 0, 64, 256);
  for (let r = 0; r < 64; r++) for (let k = 0; k < 8; k++) {
    const h = hash(r, k, 7); if (h < 0.55) continue;
    x.fillStyle = LIT[Math.floor(hash(r, k, 8) * LIT.length)]; x.globalAlpha = 0.35 + h * 0.6; x.fillRect(k * 8 + 2, r * 4 + 1, 4, 2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}

/** The skyline and traffic for a megacity street map (`W` x `H` tiles). Returns a group with userData.update(dt). */
export function buildSkyline(W, H, seed = 1) {
  const root = new THREE.Group(); root.name = 'skyline';
  const tex = windowTexture();
  const mat = new THREE.MeshBasicMaterial({ color: tex ? '#ffffff' : '#141626', map: tex });
  const towers = [];
  const ring = (n, near, far, tall) => {
    for (let i = 0; i < n; i++) {
      const a = hash(seed, i, 1); const d = near + hash(seed, i, 2) * (far - near); const w = 4 + hash(seed, i, 3) * 9; const dd = 4 + hash(seed, i, 4) * 9;
      // north-west (behind): along the north edge (z < 0) or the west edge (x < 0); south-east (the abyss): past the south or east edge
      let x; let z;
      if (tall) { if (a < 0.5) { x = -20 + hash(seed, i, 5) * (W + 40); z = -d; } else { x = -d; z = -20 + hash(seed, i, 5) * (H + 40); } } else if (a < 0.5) { x = -10 + hash(seed, i, 5) * (W + 60); z = H + d; } else { x = W + d; z = -10 + hash(seed, i, 5) * (H + 60); }
      const top = tall ? 20 + Math.pow(hash(seed, i, 6), 1.6) * 110 : -3 - hash(seed, i, 6) * 40;
      const bottom = -160;
      towers.push({ x, z, w, d: dd, y0: bottom, y1: top });
    }
  };
  ring(90, 6, 90, true); ring(110, 3, 110, false);
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(geo, mat, towers.length); const m4 = new THREE.Matrix4();
  towers.forEach((t, i) => { m4.makeScale(t.w, t.y1 - t.y0, t.d); m4.setPosition(t.x, t.y0, t.z); inst.setMatrixAt(i, m4); });
  inst.frustumCulled = false; root.add(inst);
  // crown lights on the tall ones: one small glowing box each
  const crown = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ff3a5a' }), towers.length);
  const col = new THREE.Color(); const cols = ['#ff3a5a', '#4dfcff', '#ff3fb4', '#b06bff'];
  towers.forEach((t, i) => { m4.makeScale(t.w * 0.3, 0.5, t.d * 0.3); m4.setPosition(t.x, t.y1, t.z); crown.setMatrixAt(i, m4); crown.setColorAt(i, col.set(cols[i % cols.length])); });
  crown.frustumCulled = false; root.add(crown);
  // the traffic: lanes (a start, a direction, a height, a speed), cars spread along each
  const lanes = [];
  for (let i = 0; i < 14; i++) {
    const alongX = hash(seed, i, 11) > 0.5; const where = hash(seed, i, 12);
    const y = where < 0.3 ? 3.2 + hash(seed, i, 13) * 1.8 : where < 0.65 ? 26 + hash(seed, i, 13) * 30 : -6 - hash(seed, i, 13) * 30;
    // under the Skyway lanes run over the avenues; the high lanes keep behind the map; the low lanes out in the abyss
    const off = where < 0.3 ? (alongX ? [20, 30][i % 2] : [20, 38, 56][i % 3]) : where < 0.65 ? -8 - hash(seed, i, 14) * 40 : (alongX ? H : W) + 6 + hash(seed, i, 14) * 50;
    lanes.push({ alongX, y, off, len: (alongX ? W : H) + 160, speed: (hash(seed, i, 15) > 0.5 ? 1 : -1) * (6 + hash(seed, i, 16) * 10), n: 6 + Math.floor(hash(seed, i, 17) * 8) });
  }
  const cars = []; lanes.forEach((L, li) => { for (let k = 0; k < L.n; k++) cars.push({ L, s: (k / L.n + hash(seed, li, k) * 0.05) * L.len, c: k % 3 }); });
  const carMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.35, 0.5), new THREE.MeshBasicMaterial({ color: '#ffffff' }), cars.length);
  const ccols = ['#fff3c4', '#ff5f6f', '#7af7ff'];
  cars.forEach((c, i) => carMesh.setColorAt(i, col.set(ccols[c.c])));
  carMesh.frustumCulled = false; root.add(carMesh);
  const place = () => {
    cars.forEach((c, i) => {
      const L = c.L; const s = ((c.s % L.len) + L.len) % L.len - 80;
      m4.makeRotationY(L.alongX ? 0 : Math.PI / 2);
      m4.setPosition(L.alongX ? s : L.off, L.y, L.alongX ? L.off : s); carMesh.setMatrixAt(i, m4);
    });
    carMesh.instanceMatrix.needsUpdate = true;
  };
  place();
  root.userData.update = (dt) => { for (const c of cars) c.s += c.L.speed * dt; place(); };
  root.userData.counts = { towers: towers.length, cars: cars.length };
  return root;
}

function cloudTexture(seed) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = '#9fb6d2'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) { // soft white billows, wrapped at the edges so the sea tiles without a seam
    const cx = hash(seed, i, 1) * 256; const cy = hash(seed, i, 2) * 256; const r = 18 + hash(seed, i, 3) * 46; const a = 0.45 + hash(seed, i, 4) * 0.5;
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      const gr = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(cx + ox - r, cy + oy - r, r * 2, r * 2);
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The sea of clouds under the Crown: two drifting layers below the platforms (the lower one tinted by the sky). Returns a group with userData.update(dt). */
export function buildCloudSea(W, H, seed = 5) {
  const root = new THREE.Group(); root.name = 'clouds';
  const layers = [];
  for (const [y, rep, op, sp] of [[-9, 6, 1, 0.004], [-3.5, 4, 0.55, 0.009]]) {
    const tex = cloudTexture(seed + y); if (tex) tex.repeat.set(rep, rep);
    const m = new THREE.MeshBasicMaterial({ color: tex ? '#ffffff' : '#dfe6ef', map: tex, transparent: op < 1, opacity: op, depthWrite: op >= 1 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W + 400, H + 400), m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(W / 2, y, H / 2); mesh.renderOrder = op < 1 ? 1 : 0;
    root.add(mesh); layers.push({ tex, sp });
  }
  root.userData.update = (dt) => { for (const L of layers) if (L.tex) { L.tex.offset.x += L.sp * dt; L.tex.offset.y += L.sp * 0.4 * dt; } };
  return root;
}
