// Shared helpers for the prop builders (phase 3D-2): a positional mesh DSL over lib3d, link masks for runs of
// fences and pipes (the same rule as the 2D painter: 1 north, 2 east, 4 south, 8 west), text plates that work without
// a DOM, and `done`, which merges a prop's static parts into a handful of meshes.
// Nothing here touches `document` at import time: canvases are made lazily and only when a DOM exists.
import { THREE, box, cyl, cone, blob, group, decal, board, mat, shade, mix, mute, hash, strHash, bake, textMat, sharedGeometry, Mesher, vertexMat } from '../lib3d.js';
export { THREE, group, decal, board, mat, shade, mix, mute, hash, strHash, bake };

export const WOOD = '#8a6442';
export const DWOOD = '#5e432c';
export const LWOOD = '#b08c66';
export const STEEL = '#8d9297';
export const IRON = '#3c4046';
export const CONC = '#a5a7a4';
export const RED = '#b8402e';
export const BRASS = '#c9a43a';
export const CREAM = '#e6dcc3';
export const GREEN = '#3f6a4a';

// ---- materials: options for the material are separated from options for the mesh, so a material is shared by every placement
const MK = ['emissive', 'ei', 'opacity', 'double', 'flat'];
function mopts(o) { let m = null; if (o) for (const k of MK) if (o[k] !== undefined) (m ||= {})[k] = o[k]; return m || {}; }
export const M = (c, o) => (typeof c === 'string' ? mat(c, mopts(o)) : c);
export const glass = (c = '#a8c8d6', op = 0.38) => mat(c, { opacity: op, double: true });
/** A glowing material: lit when `on`. */
export const glow = (c, on, ei = 2.2) => (on ? mat(c, { emissive: c, ei }) : mat(shade(c, -120)));

/** box w (x) h (y) d (z) with its base centre at (x, y, z). */
export const bx = (w, h, d, c, x = 0, y = 0, z = 0, o) => box(w, h, d, M(c, o), { x, y, z, ...o });
export const cy = (r, h, c, x = 0, y = 0, z = 0, o) => cyl(r, h, M(c, o), { x, y, z, ...o });
export const cn = (r, h, c, x = 0, y = 0, z = 0, o) => cone(r, h, M(c, o), { x, y, z, ...o });
export const bl = (r, c, x = 0, y = 0, z = 0, o) => blob(r, M(c, { flat: true, ...o }), { x, y, z, ...o });
/** A cylinder lying along x (or z) with its middle at (x, y, z) (y is the axis height). */
export const cyx = (r, L, c, x, y, z, o) => cyl(r, L, M(c, o), { x, y: y - L / 2, z, rz: Math.PI / 2, ...o });
export const cyz = (r, L, c, x, y, z, o) => cyl(r, L, M(c, o), { x, y: y - L / 2, z, rx: Math.PI / 2, ...o });
/** A hemisphere dome (radius r, base at y). */
export function dome(r, c, x = 0, y = 0, z = 0, o = {}) {
  const g = sharedGeometry(`dome${r}|${o.seg || 14}`, () => new THREE.SphereGeometry(r, o.seg || 14, 7, 0, Math.PI * 2, 0, Math.PI / 2));
  const m = new THREE.Mesh(g, M(c, o)); m.position.set(x, y, z); m.castShadow = o.cast ?? true; m.receiveShadow = true; return m;
}
export function sphere(r, c, x = 0, y = 0, z = 0, o = {}) {
  const g = sharedGeometry(`sph${r}|${o.seg || 14}`, () => new THREE.SphereGeometry(r, o.seg || 14, 10));
  const m = new THREE.Mesh(g, M(c, o)); m.position.set(x, y, z); m.castShadow = o.cast ?? true; m.receiveShadow = true; return m;
}
/** A flat quad on the ground (a thin slab), centred at (x, z). */
export const flat = (w, d, c, x, z, y = 0.02, o) => decal(w, d, M(c, o), { x, z, y, ...o });
/** An upright thin panel facing +z (south) by default, base at y, centre x, z; `ry` turns it. */
export const panel = (w, h, c, x, y, z, o) => board(w, h, M(c, o), { x, y, z, ...o });
/** A box from (x0, y0, z0) to (x1, y1, z1) corners. */
export const span = (x0, y0, z0, x1, y1, z1, c, o) => bx(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), c, (x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2, o);

export const size = (p, w = 1, h = 1) => [p.w || w, p.h || h];
/** A stable 0..1 number for this prop (position and type), for variants. */
export const rnd = (p, k = 0) => hash(Math.round(p.x * 7) + 3, Math.round(p.y * 13) + 1, k + (strHash(p.type) % 97));
export const pick = (arr, k) => arr[Math.floor(k * arr.length) % arr.length];
export const night = (ctx) => Boolean(ctx && ctx.night);
export const clockOf = (ctx) => (ctx && Number.isFinite(ctx.time) ? ctx.time : 0);

/** Merge the static parts: one mesh per material. Animated meshes carry `userData.noBake`. */
export function done(g, extra) {
  bake(g);
  if (extra) Object.assign(g.userData, extra);
  return g;
}
export const noBake = (m) => { m.userData.noBake = true; return m; };

// ---- text plates ---------------------------------------------------------------------------------
const plateCache = new Map();
/** { material, aspect } for a text plate; a plain coloured one when there is no DOM (tests) or no text. */
export function plate(ctx, text, o = {}) {
  const t = String(text || '').slice(0, 40);
  if (!t || ctx?.headless || typeof document === 'undefined') return { material: mat(o.bg || '#2a2630'), aspect: Math.max(1.5, t.length * 0.5) };
  const key = t + '|' + (o.bg || '') + '|' + (o.fg || '') + '|' + (o.border || '') + '|' + (o.font || '') + '|' + (o.glow || 0);
  let r = plateCache.get(key);
  if (!r) {
    r = textMat(t, o);
    r.material.userData.keep = true;
    if (r.material.map) r.material.map.userData.keep = true;
    if (r.material.emissiveMap) r.material.emissiveMap.userData.keep = true;
    plateCache.set(key, r);
  }
  return r;
}

// ---- runs: fences, hedges, pipes, belts --------------------------------------------------------------
const FAMILY = { ranchfence: ['ranchfence', 'ranchpost', 'ranchgate'], ranchpost: ['ranchfence', 'ranchpost', 'ranchgate'], ranchgate: ['ranchfence', 'ranchpost', 'ranchgate'], belt: ['belt', 'sorter', 'inserter'], sorter: ['belt', 'sorter'], gatepost: ['fence', 'chainfence', 'gatepost'], fence: ['fence', 'gatepost'], chainfence: ['chainfence', 'gatepost'] };
const famCache = new WeakMap();
function tileSet(map, type) {
  if (!map || !map.props) return null;
  let c = famCache.get(map);
  if (!c || c.n !== map.props.length) { c = { n: map.props.length, sets: new Map() }; famCache.set(map, c); }
  const fam = FAMILY[type] || [type];
  const key = fam.join(',');
  let s = c.sets.get(key);
  if (!s) {
    s = new Set();
    for (const q of map.props) if (fam.includes(q.type)) for (let y = q.y; y < q.y + (q.h || 1); y++) for (let x = q.x; x < q.x + (q.w || 1); x++) s.add(`${x},${y}`);
    c.sets.set(key, s);
  }
  return s;
}
/** The link mask of the tile (gx, gy) for runs of `p.type`: 1 north, 2 east, 4 south, 8 west. */
export function linkMask(ctx, p, gx, gy) {
  const set = tileSet(ctx?.map, p.type);
  const w = p.w || 1; const h = p.h || 1;
  const at = set ? (x, y) => set.has(`${x},${y}`) : (x, y) => x >= p.x && y >= p.y && x < p.x + w && y < p.y + h;
  return (at(gx, gy - 1) ? 1 : 0) | (at(gx + 1, gy) ? 2 : 0) | (at(gx, gy + 1) ? 4 : 0) | (at(gx - 1, gy) ? 8 : 0);
}

/**
 * Build a run: each tile of the footprint gets `cell(m, ox, oz, tile)` where m is its link mask. The cell is drawn in
 * tile coordinates (0..1 each way) and placed for you. Returns the baked group.
 */
export function run(p, ctx, cell) {
  const w = p.w || 1; const h = p.h || 1;
  const g = group();
  for (let cz = 0; cz < h; cz++) for (let cx = 0; cx < w; cx++) {
    const gx = p.x + cx; const gy = p.y + cz;
    const m = linkMask(ctx, p, gx, gy);
    const c = cell(m, cx, cz, { gx, gy, w, h });
    if (c) { c.position.x += cx; c.position.z += cz; g.add(c); }
  }
  return done(g);
}
/** Which axes a cell runs along, given its mask and the prop: { ew, ns, a0, a1, b0, b1 } with arm extents in 0..1. */
export function arms(m, p, stub = 0.3) {
  let ew = Boolean(m & 10); let ns = Boolean(m & 5);
  if (!ew && !ns) { if (p.vertical || (p.h || 1) > (p.w || 1)) ns = true; else ew = true; }
  return { ew, ns, x0: m & 8 ? 0 : 0.5 - stub, x1: m & 2 ? 1 : 0.5 + stub, z0: m & 1 ? 0 : 0.5 - stub, z1: m & 4 ? 1 : 0.5 + stub, end: !((m & 10) === 10 || (m & 5) === 5) };
}

/** A prism with a triangular cross-section (ridge along x): width w (x), height h, depth d (z). Base centre at (x, y, z). */
export function prism(w, h, d, c, x = 0, y = 0, z = 0, o = {}) {
  const g = sharedGeometry(`prism${w}|${h}|${d}`, () => {
    const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h);
    const ge = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
    ge.translate(0, 0, -w / 2); ge.rotateY(Math.PI / 2); // shape x -> z, extrusion -> x
    return ge;
  });
  const m = new THREE.Mesh(g, M(c, o)); m.position.set(x, y, z); m.castShadow = o.cast ?? true; m.receiveShadow = true;
  if (o.ry) m.rotation.y = o.ry;
  return m;
}

/** A thing with a front: `build(L, D)` draws in a frame with length L along x and depth D along z, front facing +z (south),
 *  centred on the footprint. A prop taller than wide (h > w) is turned to run along z, its front facing east. */
export function oriented(p, dw, dh, build) {
  const w = p.w || dw; const h = p.h || dh;
  const along = w >= h;
  const inner = group(0, 0, 0, ...[].concat(build(along ? w : h, along ? h : w)));
  if (!along) inner.rotation.y = Math.PI / 2;
  return group(w / 2, 0, h / 2, inner);
}

/** A vertex-coloured mesh of many boxes (books, flowers, cheeses): one draw call whatever the colours. `fn(m)` calls m.box(w, h, d, color, x, y, z, ry). */
export function vmesh(fn) {
  const m = new Mesher(); fn(m);
  const mesh = new THREE.Mesh(m.build(), vertexMat());
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.noBake = true;
  return mesh;
}

const typeCache = new WeakMap();
/** The set of 'x,y' tiles covered by props of the given types on this map (null without a map). */
export function tilesOfTypes(map, types) {
  if (!map || !map.props) return null;
  let c = typeCache.get(map);
  if (!c || c.n !== map.props.length) { c = { n: map.props.length, sets: new Map() }; typeCache.set(map, c); }
  const key = types.join(',');
  let s = c.sets.get(key);
  if (!s) { s = new Set(); for (const q of map.props) if (types.includes(q.type)) for (let y = q.y; y < q.y + (q.h || 1); y++) for (let x = q.x; x < q.x + (q.w || 1); x++) s.add(`${x},${y}`); c.sets.set(key, s); }
  return s;
}

/**
 * A wall item: which face of the wall it hangs on. `build(L)` draws it in a frame whose wall surface is the plane z = 0, the item
 * standing out toward +z, centred on x = 0, L long. Returns the placed group. The face is the open side of the wall tile it
 * stands on (south first, since the camera sees the south faces), or the wall beside it.
 */
export function onWall(p, ctx, build) {
  const w = p.w || 1; const h = p.h || 1;
  const map = ctx?.map;
  const px = Math.floor(p.x); const py = Math.floor(p.y);
  const isW = (x, y) => map && map.inBounds?.(x, y) && map.tileAt(x, y) === 'W';
  const open = (x, y) => map && map.inBounds?.(x, y) && map.tileAt(x, y) !== 'W';
  let face = 'S';
  if (map) {
    if (isW(px, py)) face = open(px, py + 1) ? 'S' : open(px + 1, py) ? 'E' : open(px - 1, py) ? 'W' : open(px, py - 1) ? 'N' : 'S';
    else face = isW(px, py - 1) ? 'N0' : isW(px - 1, py) ? 'W0' : isW(px + 1, py) ? 'E0' : 'N0';
  }
  const inner = group(0, 0, 0, ...[].concat(build(face === 'E' || face === 'W' || face === 'E0' || face === 'W0' ? h : w)));
  const g = group(0, 0, 0, inner);
  // 'N0' and friends: the wall is beside the tile, the item stands on this tile against it
  switch (face) {
    case 'S': g.position.set(w / 2, 0, h - 0.04); break;
    case 'N': g.position.set(w / 2, 0, 0.04); inner.rotation.y = Math.PI; break;
    case 'E': g.position.set(w - 0.04, 0, h / 2); inner.rotation.y = Math.PI / 2; break;
    case 'W': g.position.set(0.04, 0, h / 2); inner.rotation.y = -Math.PI / 2; break;
    case 'N0': g.position.set(w / 2, 0, 0.04); break;
    case 'W0': g.position.set(0.04, 0, h / 2); inner.rotation.y = Math.PI / 2; break;
    case 'E0': g.position.set(w - 0.04, 0, h / 2); inner.rotation.y = -Math.PI / 2; break;
  }
  return g;
}

/** A ship's outline in plan (x across, z along; bow at +z), as a THREE.Shape in (x, z). */
function hullShape(L, B, kind) {
  const s = new THREE.Shape();
  const sq = kind === 'tug' || kind === 'coaster' ? 0.18 : 0.1; // bluntness of the bow
  const hb = B / 2;
  s.moveTo(-hb * 0.92, 0); s.lineTo(hb * 0.92, 0); s.lineTo(hb, L * 0.12); s.lineTo(hb, L * (0.78 - sq)); s.lineTo(hb * (0.7 + sq * 2), L * 0.92); s.lineTo(hb * sq, L); s.lineTo(-hb * sq, L); s.lineTo(-hb * (0.7 + sq * 2), L * 0.92); s.lineTo(-hb, L * (0.78 - sq)); s.lineTo(-hb, L * 0.12); s.closePath();
  return s;
}
/** The ship's hull as a solid (height H, base at y = 0) with bow to +z, or a walkable deck slab (a thin floor with a low bulwark). */
export function shipHull(L, B, H, color, kind = 'freighter', o = {}) {
  const key = `hull${L.toFixed(2)}|${B.toFixed(2)}|${H}|${kind}|${o.deck ? 1 : 0}`;
  const g = sharedGeometry(key, () => {
    const sh = hullShape(L, B, kind);
    if (o.deck) {
      const inner = hullShape(L - 0.3, B - 0.3, kind); const pts = inner.getPoints().map((q) => new THREE.Vector2(q.x, q.y + 0.15)).reverse();
      sh.holes.push(new THREE.Path(pts));
    }
    const ge = new THREE.ExtrudeGeometry(sh, { depth: H, bevelEnabled: false });
    ge.rotateX(Math.PI / 2); ge.translate(0, H, 0); // shape y -> +z, extrusion down from the top at y = H
    return ge;
  });
  const m = new THREE.Mesh(g, M(color, o)); m.castShadow = true; m.receiveShadow = true;
  return m;
}
