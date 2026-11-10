// CONCEPT STUDY ONLY — isolated prototype, not part of the game build.
import * as THREE from '../vendor/three.module.min.js';
export { THREE };

export const hash = (a, b = 0, c = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const strHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const rgbHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const shade = (h, k) => { const c = hexRgb(h); return rgbHex(c[0] + k, c[1] + k, c[2] + k); };
export const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
/** pull a colour toward a muted, slightly desaturated version (the grounded palette of the proposal) */
export const mute = (h, k = 0.22) => { const c = hexRgb(h); const g = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; return rgbHex(c[0] + (g - c[0]) * k, c[1] + (g - c[1]) * k, c[2] + (g - c[2]) * k); };

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
export function tex(cv, { srgb = true, repeat = false, nearest = false } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (nearest) { t.magFilter = THREE.NearestFilter; }
  return t;
}

const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: new THREE.Color(color), flatShading: o.flat ?? false, emissive: new THREE.Color(o.emissive || '#000000'), emissiveIntensity: o.ei ?? 1, transparent: Boolean(o.opacity), opacity: o.opacity ?? 1, side: o.double ? THREE.DoubleSide : THREE.FrontSide });
    matCache.set(key, m);
  }
  return m;
}

// ---- tiny mesh DSL: everything is built from boxes, cylinders, cones and blobs -------------------
const boxG = new THREE.BoxGeometry(1, 1, 1);
const geoCache = new Map();
const G = (k, make) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };
function finish(m, o) { m.castShadow = o.cast ?? true; m.receiveShadow = o.recv ?? true; if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; return m; }
/** box w(x) × h(y) × d(z), its base centre at (x, y, z) */
export function box(w, h, d, color, o = {}) { const m = new THREE.Mesh(boxG, typeof color === 'string' ? mat(color, o) : color); m.scale.set(w, h, d); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); return finish(m, o); }
export function cyl(r, h, color, o = {}) { const seg = o.seg || 10; const rt = o.rt ?? r; const g = G(`c${r}|${rt}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, r, h, seg)); const m = new THREE.Mesh(g, typeof color === 'string' ? mat(color, o) : color); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); return finish(m, o); }
export function cone(r, h, color, o = {}) { return cyl(r, h, color, { ...o, rt: 0.001, seg: o.seg || 8 }); }
export function blob(r, color, o = {}) { const g = G(`b${r}|${o.detail ?? 1}|${o.seed || 0}`, () => { const ge = new THREE.IcosahedronGeometry(r, o.detail ?? 1); const p = ge.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (hash(Math.round(p.getX(i) * 50), Math.round(p.getY(i) * 50), Math.round(p.getZ(i) * 50) + (o.seed || 0)) - 0.5) * 0.28; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * (o.sy || 1), p.getZ(i) * k); } ge.computeVertexNormals(); return ge; }); const m = new THREE.Mesh(g, mat(color, { flat: true, ...o })); m.position.set(o.x || 0, o.y || 0, o.z || 0); return finish(m, o); }
export function group(x = 0, y = 0, z = 0, ...kids) { const g = new THREE.Group(); g.position.set(x, y, z); for (const k of kids.flat()) if (k) g.add(k); return g; }
/** a flat quad lying on the ground (decals, rugs, markings) */
export function decal(w, d, material, o = {}) { const g = G(`p${w}|${d}`, () => new THREE.PlaneGeometry(w, d)); const m = new THREE.Mesh(g, material); m.rotation.x = -Math.PI / 2; if (o.ry) m.rotation.z = o.ry; m.position.set(o.x || 0, o.y || 0.02, o.z || 0); m.receiveShadow = true; return m; }
/** an upright quad facing +z (south) by default */
export function board(w, h, material, o = {}) { const g = G(`q${w}|${h}`, () => new THREE.PlaneGeometry(w, h)); const m = new THREE.Mesh(g, material); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); if (o.ry) m.rotation.y = o.ry; m.castShadow = o.cast ?? false; return m; }

/** text painted on a small canvas → a material (signs, plates) */
export function textMat(text, { fg = '#f4ecd8', bg = '#2a2630', font = 'bold 44px "Trebuchet MS", "Segoe UI", sans-serif', pad = 18, h = 72, border = null, glow = 0 } = {}) {
  const c0 = canvas(8, 8).getContext('2d'); c0.font = font; const w = Math.ceil(c0.measureText(text).width) + pad * 2;
  const cv = canvas(w, h); const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  if (border) { c.strokeStyle = border; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6); }
  c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg; c.fillText(text, w / 2, h / 2 + 2);
  const t = tex(cv);
  const m = new THREE.MeshLambertMaterial({ map: t, emissive: new THREE.Color('#ffffff'), emissiveMap: t, emissiveIntensity: glow });
  return { material: m, aspect: w / h };
}
