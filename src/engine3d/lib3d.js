// Mesh helpers for the 3D renderer: colour maths, a tiny box/cylinder/cone/blob DSL, cached materials and
// geometries, a text-plate material, a merge helper (`bake`) and `disposeTree`. Ported from the concept study in
// mockups/iso25d (not imported from there). Units: 1 unit = 1 tile (32 world px); x east, z south, y up.
//
// Prop and vehicle builders (registry3d.js) get this module as `ctx.lib`.
import { THREE } from './three.js';
export { THREE };

export const hash = (a, b = 0, c = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const strHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const hexRgb = (h) => {
  const s = typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h) ? h : typeof h === 'string' && /^#[0-9a-f]{3}$/i.test(h) ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : '#808080';
  return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
};
export const rgbHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const shade = (h, k) => { const c = hexRgb(h); return rgbHex(c[0] + k, c[1] + k, c[2] + k); };
export const mix = (a, b, t) => { const A = hexRgb(a); const B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
/** Pull a colour toward a muted, slightly desaturated version (the grounded palette of the proposal). */
export const mute = (h, k = 0.22) => { const c = hexRgb(h); const g = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; return rgbHex(c[0] + (g - c[0]) * k, c[1] + (g - c[1]) * k, c[2] + (g - c[2]) * k); };

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function tex(cv, { srgb = true, repeat = false, nearest = false } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  return t;
}

// ---- caches (shared: never disposed by disposeTree) ------------------------------------------------
const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: new THREE.Color(color), flatShading: o.flat ?? false, emissive: new THREE.Color(o.emissive || '#000000'), emissiveIntensity: o.ei ?? 1, transparent: Boolean(o.opacity), opacity: o.opacity ?? 1, side: o.double ? THREE.DoubleSide : THREE.FrontSide });
    m.userData.keep = true;
    matCache.set(key, m);
  }
  return m;
}

const geoCache = new Map();
const G = (k, make) => { let g = geoCache.get(k); if (!g) { g = make(); g.userData.keep = true; geoCache.set(k, g); } return g; };
const boxG = G('box', () => new THREE.BoxGeometry(1, 1, 1));
export const sharedGeometry = G;

function finish(m, o) { m.castShadow = o.cast ?? true; m.receiveShadow = o.recv ?? true; if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; return m; }

// ---- the mesh DSL: everything is built from boxes, cylinders, cones and blobs ---------------------
/** Box w (x) × h (y) × d (z), its base centre at (x, y, z). `color` is a hex string or a material. */
export function box(w, h, d, color, o = {}) { const m = new THREE.Mesh(boxG, typeof color === 'string' ? mat(color, o) : color); m.scale.set(w, h, d); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); return finish(m, o); }
export function cyl(r, h, color, o = {}) { const seg = o.seg || 10; const rt = o.rt ?? r; const g = G(`c${r}|${rt}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, r, h, seg)); const m = new THREE.Mesh(g, typeof color === 'string' ? mat(color, o) : color); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); return finish(m, o); }
export function cone(r, h, color, o = {}) { return cyl(r, h, color, { ...o, rt: 0.001, seg: o.seg || 8 }); }
export function blob(r, color, o = {}) {
  const g = G(`b${r}|${o.detail ?? 1}|${o.seed || 0}|${o.sy || 1}`, () => {
    const ge = new THREE.IcosahedronGeometry(r, o.detail ?? 1);
    const p = ge.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + (hash(Math.round(p.getX(i) * 50), Math.round(p.getY(i) * 50), Math.round(p.getZ(i) * 50) + (o.seed || 0)) - 0.5) * 0.28; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * (o.sy || 1), p.getZ(i) * k); }
    ge.computeVertexNormals();
    return ge;
  });
  const m = new THREE.Mesh(g, typeof color === 'string' ? mat(color, { flat: true, ...o }) : color);
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  return finish(m, o);
}
export function group(x = 0, y = 0, z = 0, ...kids) { const g = new THREE.Group(); g.position.set(x, y, z); for (const k of kids.flat()) if (k) g.add(k); return g; }
/** A flat quad lying on the ground (decals, rugs, markings). */
export function decal(w, d, material, o = {}) { const g = G(`p${w}|${d}`, () => new THREE.PlaneGeometry(w, d)); const m = new THREE.Mesh(g, material); m.rotation.x = -Math.PI / 2; if (o.ry) m.rotation.z = o.ry; m.position.set(o.x || 0, o.y || 0.02, o.z || 0); m.receiveShadow = true; return m; }
/** An upright quad facing +z (south) by default. */
export function board(w, h, material, o = {}) { const g = G(`q${w}|${h}`, () => new THREE.PlaneGeometry(w, h)); const m = new THREE.Mesh(g, material); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); if (o.ry) m.rotation.y = o.ry; m.castShadow = o.cast ?? false; return m; }

/** Text painted on a small canvas, as a material (signs, plates). Returns { material, aspect }. */
export function textMat(text, { fg = '#f4ecd8', bg = '#2a2630', font = 'bold 44px "Trebuchet MS", "Segoe UI", sans-serif', pad = 18, h = 72, border = null, glow = 0 } = {}) {
  const c0 = canvas(8, 8).getContext('2d');
  c0.font = font;
  const w = Math.ceil(c0.measureText(text).width) + pad * 2;
  const cv = canvas(w, h);
  const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  if (border) { c.strokeStyle = border; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6); }
  c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg; c.fillText(text, w / 2, h / 2 + 2);
  const t = tex(cv);
  const m = new THREE.MeshLambertMaterial({ map: t, emissive: new THREE.Color('#ffffff'), emissiveMap: t, emissiveIntensity: glow });
  return { material: m, aspect: w / h };
}

/**
 * Put a built prop on its tile. A builder's object may sit at an offset inside the footprint frame (most are `group(w/2, 0, h/2, ...)`
 * with the parts centred on it), so the tile's corner is ADDED to the object's own position; setting the position would drop
 * half the footprint (the old bug: every such model stood up to half its size north-west of the tiles the simulation blocks).
 */
export function placeProp(obj, p) {
  obj.position.x += p.x;
  obj.position.z += p.y;
  return obj;
}

// ---- ground footprint ------------------------------------------------------------------------------
/**
 * The ground footprint of a model: the box of the parts whose bottom is within `reach` tiles of the ground (a canopy, a sign
 * board or an arm high above the ground does not count: overhang upward is fine). { x0, x1, z0, z1 } in world units (an object
 * not yet placed has its origin at 0), or null when nothing touches the ground.
 */
export function baseBox(obj, reach = 0.4) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3(); const t = new THREE.Box3(); let any = false;
  obj.traverse((c) => {
    if (!c.isMesh || !c.geometry?.attributes?.position) return;
    t.setFromObject(c);
    if (t.isEmpty() || t.min.y > reach) return;
    b.union(t); any = true;
  });
  return any ? { x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z } : null;
}

// ---- merging ---------------------------------------------------------------------------------------
/**
 * Merge the single-material meshes under `root` into one mesh per (material, cast, receive), so a building
 * of many small parts costs a few draw calls. Mutates `root` and returns it. Skip a mesh with
 * `userData.noBake = true` (anything that animates or is replaced later).
 */
export function bake(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !Array.isArray(o.material) && !o.userData.noBake) meshes.push(o); });
  const mm = new THREE.Matrix4();
  const nm = new THREE.Matrix3();
  const v = new THREE.Vector3();
  for (const m of meshes) {
    const geo = m.geometry;
    if (!geo.attributes.position) continue;
    const src = geo.index ? geo.toNonIndexed() : geo;
    mm.multiplyMatrices(inv, m.matrixWorld);
    nm.getNormalMatrix(mm);
    const key = `${m.material.uuid}|${m.castShadow ? 1 : 0}${m.receiveShadow ? 1 : 0}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { material: m.material, cast: m.castShadow, recv: m.receiveShadow, pos: [], nor: [], uv: [] }));
    const p = src.attributes.position;
    const n = src.attributes.normal;
    const u = src.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mm);
      b.pos.push(v.x, v.y, v.z);
      if (n) { v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); b.nor.push(v.x, v.y, v.z); } else b.nor.push(0, 1, 0);
      b.uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
    }
    if (src !== geo) src.dispose();
    m.removeFromParent();
  }
  for (const b of buckets.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    const mesh = new THREE.Mesh(g, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    root.add(mesh);
  }
  return root;
}

/** A vertex-coloured mesh builder: many boxes in one geometry (people). Colours are hex strings. */
export class Mesher {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.c = new THREE.Color(); }

  /** A box w × h × d, base centre (x, y, z), turned `ry` about y. */
  box(w, h, d, color, x = 0, y = 0, z = 0, ry = 0) {
    this.c.set(color);
    const cs = Math.cos(ry); const sn = Math.sin(ry);
    const hw = w / 2; const hd = d / 2;
    const faces = [ // normal, then four corners (counter-clockwise seen from outside)
      [[1, 0, 0], [hw, 0, hd], [hw, 0, -hd], [hw, h, -hd], [hw, h, hd]],
      [[-1, 0, 0], [-hw, 0, -hd], [-hw, 0, hd], [-hw, h, hd], [-hw, h, -hd]],
      [[0, 1, 0], [-hw, h, hd], [hw, h, hd], [hw, h, -hd], [-hw, h, -hd]],
      [[0, -1, 0], [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]],
      [[0, 0, 1], [-hw, 0, hd], [hw, 0, hd], [hw, h, hd], [-hw, h, hd]],
      [[0, 0, -1], [hw, 0, -hd], [-hw, 0, -hd], [-hw, h, -hd], [hw, h, -hd]],
    ];
    for (const [n, a, b, c2, d2] of faces) {
      const nx = n[0] * cs + n[2] * sn; const nz = -n[0] * sn + n[2] * cs;
      for (const q of [a, b, c2, a, c2, d2]) {
        this.pos.push(x + q[0] * cs + q[2] * sn, y + q[1], z - q[0] * sn + q[2] * cs);
        this.nor.push(nx, n[1], nz);
        this.col.push(this.c.r, this.c.g, this.c.b);
      }
    }
    return this;
  }

  /** A lumpy blob (hair curls, bushes), radius r at (x, y, z). */
  blob(r, color, x = 0, y = 0, z = 0) {
    this.c.set(color);
    const g = G(`mb${r}`, () => new THREE.IcosahedronGeometry(r, 0)); // (a polyhedron is already non-indexed)
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { this.pos.push(x + p.getX(i), y + p.getY(i), z + p.getZ(i)); this.nor.push(n.getX(i), n.getY(i), n.getZ(i)); this.col.push(this.c.r, this.c.g, this.c.b); }
    return this;
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

let vcMat = null;
/** The one material every vertex-coloured mesh shares. */
export function vertexMat() {
  if (!vcMat) { vcMat = new THREE.MeshLambertMaterial({ vertexColors: true }); vcMat.userData.keep = true; }
  return vcMat;
}

// ---- disposal ---------------------------------------------------------------------------------------
/** Free the geometries, materials and textures under `root` that are not shared (`userData.keep`). */
export function disposeTree(root) {
  const mats = new Set();
  const geos = new Set();
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.keep) geos.add(o.geometry);
    if (o.material) for (const m of [].concat(o.material)) if (!m.userData.keep) mats.add(m);
  });
  for (const g of geos) g.dispose();
  for (const m of mats) {
    for (const k of ['map', 'emissiveMap', 'alphaMap', 'bumpMap']) if (m[k] && !m[k].userData?.keep) m[k].dispose();
    m.dispose();
  }
}
