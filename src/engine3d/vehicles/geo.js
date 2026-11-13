// Geometry kit for the 3D vehicles and machines (phase 3D-3). A vehicle is a handful of merged, flat-shaded meshes (one per
// material "bucket": the body paint, the dark trim with vertex colours, the lamps, ...) plus wheels that turn. The builders write
// triangles into a `Geo` (axis-aligned boxes, extruded side profiles, lofts between rings, cylinders, blobs), the result is
// cached per model, and every car of the model shares the geometry (nothing here is ever disposed per car).
//
// Units: tiles (1 = 32 world px). A car's frame: +x forward (nose), +y up, +z its right side. Pure: no DOM at import.
import { THREE, mat, vertexMat, textMat } from '../lib3d.js';

const tmpC = new THREE.Color();

/** Is a polygon (x, y) counter-clockwise? */
const area2 = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a; };

export class Geo {
  constructor() { this.b = new Map(); this.dx = 0; this.dy = 0; this.dz = 0; }

  /** Everything written from now on is moved by (dx, dy, dz): to centre a car whose parts stick out at one end. */
  shift(dx = 0, dy = 0, dz = 0) { this.dx = dx; this.dy = dy; this.dz = dz; return this; }

  bucket(name) {
    let b = this.b.get(name);
    if (!b) this.b.set(name, (b = { pos: [], nor: [], col: [] }));
    return b;
  }

  /** One triangle, flat normal from its winding (counter-clockwise seen from outside). */
  tri(name, a, b, c, color = '#ffffff') {
    const B = this.bucket(name);
    const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
    const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    tmpC.set(color);
    for (const p of [a, b, c]) { B.pos.push(p[0] + this.dx, p[1] + this.dy, p[2] + this.dz); B.nor.push(nx, ny, nz); B.col.push(tmpC.r, tmpC.g, tmpC.b); }
    return this;
  }

  quad(name, a, b, c, d, color) { return this.tri(name, a, b, c, color).tri(name, a, c, d, color); }

  /** An axis-aligned box from min to max corners. */
  box(name, x0, x1, y0, y1, z0, z1, color) {
    this.quad(name, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], color); // +x
    this.quad(name, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], color); // -x
    this.quad(name, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], color); // +y
    this.quad(name, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], color); // -y
    this.quad(name, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color); // +z
    this.quad(name, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], color); // -z
    return this;
  }

  /** A box by centre and size. */
  cube(name, cx, cy, cz, w, h, d, color) { return this.box(name, cx - w / 2, cx + w / 2, cy, cy + h, cz - d / 2, cz + d / 2, color); }

  /** A box by centre and size, turned by Euler angles (x, y, z): slanted pillars, spokes, lugs, horns. */
  tbox(name, cx, cy, cz, w, h, d, color, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
    m.setPosition(cx, cy, cz);
    const v = new THREE.Vector3();
    const P = (x, y, z) => { v.set(x * w / 2, y * h / 2, z * d / 2).applyMatrix4(m); return [v.x, v.y, v.z]; };
    this.quad(name, P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), color);
    this.quad(name, P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1), color);
    this.quad(name, P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1), color);
    this.quad(name, P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), color);
    this.quad(name, P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), color);
    this.quad(name, P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), color);
    return this;
  }

  /** A side profile (x, y points) extruded across z0..z1: the body of a car, a wing section, a fin. */
  prism(name, pts, z0, z1, color) {
    const p = area2(pts) < 0 ? pts.slice().reverse() : pts;
    const n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[i]; const b = p[(i + 1) % n];
      this.quad(name, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], color);
    }
    const tris = THREE.ShapeUtils.triangulateShape(p.map((q) => new THREE.Vector2(q[0], q[1])), []);
    for (const [i, j, k] of tris) {
      this.tri(name, [p[i][0], p[i][1], z1], [p[j][0], p[j][1], z1], [p[k][0], p[k][1], z1], color);
      this.tri(name, [p[i][0], p[i][1], z0], [p[k][0], p[k][1], z0], [p[j][0], p[j][1], z0], color);
    }
    return this;
  }

  /** A plan outline (x, z points) extruded up between y0 and y1: the cheese, a flat deck. */
  plan(name, pts, y0, y1, color) {
    const p = area2(pts) > 0 ? pts.slice().reverse() : pts; // (x, z) with z south: clockwise on the page = counter-clockwise from above
    const n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[i]; const b = p[(i + 1) % n];
      this.quad(name, [a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], color);
    }
    const tris = THREE.ShapeUtils.triangulateShape(p.map((q) => new THREE.Vector2(q[0], q[1])), []);
    for (const [i, j, k] of tris) {
      this.tri(name, [p[i][0], y1, p[i][1]], [p[k][0], y1, p[k][1]], [p[j][0], y1, p[j][1]], color);
      this.tri(name, [p[i][0], y0, p[i][1]], [p[j][0], y0, p[j][1]], [p[k][0], y0, p[k][1]], color);
    }
    return this;
  }

  /** Join two rings of 3D points (the same count, each going round counter-clockwise seen from the `b` end). */
  loft(name, A, B, color, capA = true, capB = true) {
    const n = A.length;
    const col = (i) => (typeof color === 'function' ? color(i) : color);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.quad(name, A[i], A[j], B[j], B[i], col(i)); }
    const cen = (R) => R.reduce((s, q) => [s[0] + q[0] / n, s[1] + q[1] / n, s[2] + q[2] / n], [0, 0, 0]);
    if (capB) { const c = cen(B); for (let i = 0; i < n; i++) this.tri(name, c, B[i], B[(i + 1) % n], col(i)); }
    if (capA) { const c = cen(A); for (let i = 0; i < n; i++) this.tri(name, c, A[(i + 1) % n], A[i], col(i)); }
    return this;
  }

  /** A cylinder (or cone: r1 at the start, r0 at the end) along an axis ('x' | 'y' | 'z'), starting at (x, y, z) and running `len`. */
  cyl(name, axis, x, y, z, r0, len, color, { r1 = r0, seg = 10, caps = true, ex = 1, ey = 1 } = {}) {
    const ring = (r, t) => {
      const out = [];
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2; const c = Math.cos(a) * r; const s = Math.sin(a) * r;
        if (axis === 'y') out.push([x + c * ex, y + t, z + s * ey]);
        else if (axis === 'x') out.push([x + t, y + c * ex, z + s * ey]);
        else out.push([x + c * ex, y + s * ey, z + t]);
      }
      return out;
    };
    // the winding turns with the axis: build the ring so that it runs counter-clockwise from the far end
    let A = ring(r0, 0); let B = ring(r1, len);
    if (axis === 'y') { A = A.reverse(); B = B.reverse(); }
    return this.loft(name, A, B, color, caps, caps);
  }

  /** A lumpy ball / ellipsoid (icosahedron, detail 0 or 1), flat shaded. */
  blob(name, cx, cy, cz, rx, ry, rz, color, detail = 1) {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const p = g.attributes.position;
    const P = (i) => [cx + p.getX(i) * rx, cy + p.getY(i) * ry, cz + p.getZ(i) * rz];
    for (let i = 0; i < p.count; i += 3) this.tri(name, P(i), P(i + 1), P(i + 2), color);
    g.dispose();
    return this;
  }

  /** A donut standing in the plane given by `axis` (the axis through its hole): big radius R, tube radius r. */
  torus(name, axis, cx, cy, cz, R, r, color, nu = 14, nv = 6) {
    const pt = (u, v) => {
      const a = (u / nu) * Math.PI * 2; const b = (v / nv) * Math.PI * 2;
      const rr = R + r * Math.cos(b);
      const x = rr * Math.cos(a); const y = rr * Math.sin(a); const z = r * Math.sin(b);
      if (axis === 'z') return [cx + x, cy + y, cz + z];
      if (axis === 'y') return [cx + x, cy + z, cz + y];
      return [cx + z, cy + x, cz + y];
    };
    for (let u = 0; u < nu; u++) for (let v = 0; v < nv; v++) {
      const a = pt(u, v); const b = pt(u + 1, v); const c = pt(u + 1, v + 1); const d = pt(u, v + 1);
      if (axis === 'y') this.quad(name, a, d, c, b, color); else this.quad(name, a, b, c, d, color);
    }
    return this;
  }

  /** Every bucket as a BufferGeometry (flagged shared). */
  build() {
    const out = {};
    for (const [name, b] of this.b) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.computeBoundingBox(); g.computeBoundingSphere();
      g.userData.keep = true;
      out[name] = g;
    }
    return out;
  }
}

// ---- materials: shared and cached, swapped by name (never cloned per car) -------------------------------------------------
export const paintMat = (hex) => mat(hex, { tag: 'paint' });
const M = {};
const E = (key, color, emissive, ei) => (M[key] ||= mat(color, { emissive, ei, tag: key }));
export const lampMats = {
  headOff: () => E('headOff', '#d8d2b8', '#fff2c0', 0.25),
  headOn: () => E('headOn', '#fff6d8', '#ffeeb0', 3.2),
  tailOff: () => E('tailOff', '#7a1a14', '#ff2a1a', 0.1),
  tailDim: () => E('tailDim', '#9a1c14', '#ff2a1a', 0.9),
  tailBrake: () => E('tailBrake', '#ff3a2a', '#ff3020', 3.2),
  sirenRedOff: () => E('sirenRedOff', '#5a1612', '#ff2a1a', 0.15),
  sirenRedOn: () => E('sirenRedOn', '#ff3a2a', '#ff2a1a', 3.4),
  sirenBlueOff: () => E('sirenBlueOff', '#182a5a', '#2a4aff', 0.15),
  sirenBlueOn: () => E('sirenBlueOn', '#4a70ff', '#3a5aff', 3.4),
};
export const glowMat = (hex, ei = 1.6) => mat(hex, { emissive: hex, ei, tag: 'glow' });
export const dark = () => vertexMat();

/** Resolve a bucket name to its material: 'dark' vertex colours, 'glow:#hex', or one of the lamp / siren sets (swapped later). */
export function materialFor(name, paint) {
  if (name === 'paint') return paintMat(paint);
  if (name === 'dark') return dark();
  if (name === 'lampF') return lampMats.headOff();
  if (name === 'lampR') return lampMats.tailOff();
  if (name === 'barR') return lampMats.sirenRedOff();
  if (name === 'barB') return lampMats.sirenBlueOff();
  if (name.startsWith('glow:')) return glowMat(name.slice(5));
  return dark();
}

// ---- wheels --------------------------------------------------------------------------------------------------------
const wheelCache = new Map();
/** A wheel geometry, axle along z, centred on the origin: a tyre, a hub with a bar across it (so a spin shows), optional lugs. */
export function wheelGeo(r, w, { hub = '#aeb4ba', tyre = '#1c1c20', lugs = 0, bar = '#4a4e54', seg = 12 } = {}) {
  const key = `${r}|${w}|${hub}|${tyre}|${lugs}|${bar}|${seg}`;
  let g = wheelCache.get(key);
  if (!g) {
    const G = new Geo();
    G.cyl('w', 'z', 0, 0, -w / 2, r, w, tyre, { seg });
    G.cyl('w', 'z', 0, 0, -w / 2 - 0.004, r * 0.56, w + 0.008, hub, { seg: 10 });
    G.box('w', -r * 0.5, r * 0.5, -r * 0.07, r * 0.07, -w / 2 - 0.007, w / 2 + 0.007, bar);
    G.box('w', -r * 0.07, r * 0.07, -r * 0.5, r * 0.5, -w / 2 - 0.007, w / 2 + 0.007, bar);
    for (let i = 0; i < lugs; i++) {
      const a = (i / lugs) * Math.PI * 2;
      G.tbox('w', Math.cos(a) * (r + 0.012), Math.sin(a) * (r + 0.012), 0, 0.06, ((Math.PI * 2 * r) / lugs) * 0.8, w, i % 2 ? tyre : '#2e2e34', 0, 0, a);
    }
    g = G.build().w;
    wheelCache.set(key, g);
  }
  return g;
}

// ---- painted signs (a number plate, a stencil): needs a canvas, so none in Node ---------------------------------------------
const signCache = new Map();
export function signMaterial(text, o = {}) {
  if (typeof document === 'undefined') return null;
  const key = text + JSON.stringify(o);
  let m = signCache.get(key);
  if (!m) {
    m = textMat(text, o);
    m.material.userData.keep = true;
    if (m.material.map) m.material.map.userData.keep = true;
    signCache.set(key, m);
  }
  return m;
}

// ---- the assembled vehicle ------------------------------------------------------------------------------------------------
const rigCache = new Map();
const planeCache = new Map();
function sharedPlane(w, h) {
  const k = `${w}|${h}`;
  let g = planeCache.get(k);
  if (!g) { g = new THREE.PlaneGeometry(w, h); g.userData.keep = true; planeCache.set(k, g); }
  return g;
}

/**
 * Build (once per key) and instance a vehicle. `spec` = { key, build(G) -> void, wheels: [{ x, z, r, w, steer, opts }] }. Returns a Group:
 *   userData.parts   { name → Mesh } for the merged buckets          userData.wheels  [{ mesh, steer, r }]
 *   userData.body    the group the merged meshes sit in (it rolls and pitches on its springs; the wheels stay on the ground)
 *   userData.setColor(hex)                                           userData.set* (see drive.js for the standard update)
 */
export function assemble(spec, paintHex) {
  let c = rigCache.get(spec.key);
  if (!c) {
    const G = new Geo();
    spec.build(G);
    c = { geos: G.build(), wheelGeos: (spec.wheels || []).map((w) => wheelGeo(w.r, w.w, w.opts)) };
    rigCache.set(spec.key, c);
  }
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const parts = {};
  for (const [name, geo] of Object.entries(c.geos)) {
    const m = new THREE.Mesh(geo, materialFor(name, paintHex));
    m.castShadow = true; m.receiveShadow = true;
    if (name.startsWith('glow:') || name === 'lampF' || name === 'lampR' || name === 'barR' || name === 'barB') m.castShadow = false;
    body.add(m);
    parts[name] = m;
  }
  // moving parts: each its own little geometry on a pivot, in the body group (so it rolls with it)
  const subs = {};
  for (const sub of spec.subs || []) {
    const sk = `${spec.key}|${sub.name}`;
    let sg = rigCache.get(sk);
    if (!sg) { const SG = new Geo(); sub.build(SG); sg = SG.build(); rigCache.set(sk, sg); }
    const grp = new THREE.Group();
    grp.position.set(sub.pivot[0], sub.pivot[1], sub.pivot[2]);
    for (const [name, geo] of Object.entries(sg)) {
      const m = new THREE.Mesh(geo, materialFor(name, paintHex));
      m.castShadow = !name.startsWith('glow:');
      grp.add(m);
    }
    body.add(grp);
    subs[sub.name] = grp;
  }
  // signs: flat plates with a painted text (not in Node, where there is no canvas)
  for (const sg of spec.signs || []) {
    const sm = signMaterial(sg.text, sg.opts);
    if (!sm) continue;
    const g = sharedPlane(sg.w, sg.w / sm.aspect);
    const m = new THREE.Mesh(g, sm.material);
    m.position.set(sg.pos[0], sg.pos[1], sg.pos[2]);
    m.rotation.y = sg.ry || 0;
    body.add(m);
  }
  const wheels = [];
  (spec.wheels || []).forEach((w, i) => {
    const m = new THREE.Mesh(c.wheelGeos[i], vertexMat());
    m.castShadow = true;
    const pivot = new THREE.Group();
    pivot.position.set(w.x, w.r, w.z);
    pivot.add(m);
    root.add(pivot);
    wheels.push({ mesh: m, pivot, steer: Boolean(w.steer), r: w.r, hide: w.hide });
  });
  root.userData.subs = subs;
  root.userData.parts = parts;
  root.userData.body = body;
  root.userData.wheels = wheels;
  root.userData.paint = paintHex;
  root.userData.setColor = (hex) => { root.userData.paint = hex; if (parts.paint) parts.paint.material = paintMat(hex); };
  return root;
}
