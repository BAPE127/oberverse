// Buildings in 3D (docs/RENDERING.md 7.2, 2.4): geometry from the building record, ported from the concept study
// (mockups/iso25d/src/buildings.js). Three forms of one building:
//   roofed   a box with painted facades, a roof (flat, pitched, barrel, dome), a shopfront kit, a sign
//   open     the room the player is in: north and west walls stand, south and east walls are a kerb, no roof
//   see-through   any roofed building, with a dithered disc discarded around the focus (a shared uniform, a shader patch)
// Everything here builds three.js objects from plain records; textures are painted on canvases (so it needs the DOM).
// Units: 1 unit = 1 tile; the group's origin is the map's own, x east, z south, y up.
import { THREE, hash, strHash, canvas, tex, shade, mix, mute, box, cyl, cone, group, board, textMat, mat, bake } from './lib3d.js';
import { buildingHeight } from '../engine/isoBuildings.js';

const FP = 32; // facade texture pixels per tile
export const STOREY = 2.3; // tiles of wall to a storey of an ordinary building
export const KERB = 0.34; // height of a cut-down wall of an open room
const TH = 0.22; // wall thickness

// ------------------------------------------------------------------ sizes and kinds (pure)
export function buildingKind(b) {
  const name = `${b.sign || ''} ${b.name || ''} ${b.mapLabel || ''} ${b.id}`;
  if (b.round) return 'lighthouse';
  if (b.tower && b.tower >= 6) return 'tower';
  if (b.shabby) return 'shack';
  if (/barn|parlour|freestall/i.test(name)) return 'barn';
  if (/hangar/i.test(name)) return 'hangar';
  if (/warehouse|shed|storage|cannery|works|foundry|refinery|depot|garage|motor pool|factory|range|armou?ry|supply/i.test(name)) return 'industrial';
  if (/barracks|mess|command|guardhouse|hospital|medical/i.test(name)) return 'military';
  if (/house|home|residence|cottage|gullwing row|no\. \d|manor|mesa road|place$/i.test(name)) return 'house';
  if (b.columns || /civic|justice|bank|court|office|hall/i.test(name)) return 'civic';
  return 'shop';
}

export function floorsOf(b, kind) {
  if (b.tower) return b.tower;
  if (kind === 'civic') return /justice/i.test(b.name) ? 3 : 2;
  if (/apartments|hotel|precinct|boarding|lodging|manor/i.test(b.name || '')) return 2;
  return 1;
}

/**
 * The wall height of a building in tiles, from the 2D view's `buildingHeight` (px): up to three storeys are storeys of
 * STOREY tiles; a taller tower keeps the 2D view's cap (about 420 px) and adds to three storeys what the cap allows.
 */
export function height3d(b) {
  const px = buildingHeight(b);
  if (b.round) return (px / 32) * 1.5;
  const n = b.storeys || b.tower || 0;
  if (b.storeys || (b.tower && b.tower <= 3)) return 0.3 + n * STOREY;
  if (b.tower) return 0.3 + 3 * STOREY + (px - (8 + 3 * 48)) / 32;
  return 0.3 + (px - 8) / 48 * STOREY;
}

// ------------------------------------------------------------------ the see-through shader patch
/**
 * Patch a material so a dithered disc around a screen point is discarded. `u` is a shared uniform object
 * `{ value: Vector4(x, y, r, on) }`, x and y in gl_FragCoord pixels (origin bottom-left) and r in the same; one per building,
 * shared by all of its materials, so only that building gets a hole.
 */
export function seeThrough(material, u) {
  if (material.userData.seeThrough) return material;
  material.userData.seeThrough = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHole = u;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `uniform vec4 uHole;
float oberBayer2(vec2 p) { vec2 q = floor(mod(p, 2.0)); return mod(2.0 * q.x + 3.0 * q.y, 4.0); }
void main() {
  if (uHole.w > 0.5) {
    vec2 hp = gl_FragCoord.xy - uHole.xy;
    float t = length(hp) / max(uHole.z, 1.0);
    if (t < 1.0) {
      float cover = t < 0.55 ? 1.0 - 0.38 * (t / 0.55) : 0.62 * (1.0 - (t - 0.55) / 0.45);
      float thr = (4.0 * oberBayer2(gl_FragCoord.xy) + oberBayer2(floor(gl_FragCoord.xy / 2.0)) + 0.5) / 16.0;
      if (floor(cover * 5.0 + thr) > 0.5) discard;
    }
  }`);
  };
  material.customProgramCacheKey = () => 'oberHole1';
  material.needsUpdate = true;
  return material;
}

export const makeHole = () => ({ value: new THREE.Vector4(0, 0, 1, 0) });

// ------------------------------------------------------------------ painted facades
function roofTexture(col, kind, cache) {
  const key = `${col}|${kind}`;
  let t = cache.get(key);
  if (t) return t;
  const cv = canvas(128, 128);
  const c = cv.getContext('2d');
  c.fillStyle = col; c.fillRect(0, 0, 128, 128);
  if (kind === 'shingle') {
    for (let y = 0, r = 0; y < 128; y += 16, r++) {
      c.fillStyle = shade(col, -44); c.fillRect(0, y + 13, 128, 3);
      c.fillStyle = shade(col, 16); c.fillRect(0, y, 128, 2);
      for (let x = (r % 2) * 16; x < 128; x += 32) { c.fillStyle = shade(col, -34); c.fillRect(x, y, 2, 16); if (hash(x, y, 4) > 0.45) { c.fillStyle = shade(col, hash(y, x, 2) > 0.5 ? -20 : 14); c.fillRect(x + 2, y + 2, 30, 11); } }
    }
  } else if (kind === 'metal') {
    for (let x = 0; x < 128; x += 8) { c.fillStyle = shade(col, -20); c.fillRect(x, 0, 1, 128); c.fillStyle = shade(col, 12); c.fillRect(x + 4, 0, 1, 128); }
  } else for (let i = 0; i < 700; i++) { c.fillStyle = shade(col, (hash(i, 3) - 0.5) * 30 | 0); c.fillRect(hash(i, 1) * 128, hash(i, 2) * 128, 2, 2); }
  t = tex(cv, { repeat: true });
  t.userData.keep = true;
  cache.set(key, t);
  return t;
}

/** Paint one facade: a colour canvas (daylight) and an emissive canvas (the windows that glow at night). side 's' has the door. */
function facade(b, kind, wUnits, H, side, doorAt) {
  const W = Math.round(wUnits * FP);
  const HH = Math.round(H * FP);
  const cv = canvas(W, HH);
  const em = canvas(W, HH);
  const c = cv.getContext('2d');
  const e = em.getContext('2d');
  e.fillStyle = '#000'; e.fillRect(0, 0, W, HH);
  const seed = strHash(b.id + side);
  const wall = mute(b.wall || '#cfc4ae', 0.18);
  const trim = mute(b.trim || '#5a4a3e', 0.15);
  const R = (x, y, w, h, col, ctx = c) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  R(0, 0, W, HH, wall);
  const floors = floorsOf(b, kind);
  const fh = kind === 'tower' ? HH / floors : Math.min(HH, STOREY * FP);
  if (kind === 'tower' || b.glass) {
    R(0, 0, W, HH, mix(wall, '#22303c', 0.4));
  } else if (kind === 'shack') {
    for (let x = 0; x < W; x += 9) { const k = hash(seed, x, 1); R(x, 0, 9, HH, k > 0.7 ? '#7d7f84' : k > 0.45 ? shade('#8a6a4a', (k - 0.5) * 40 | 0) : shade('#6f5a48', (k - 0.5) * 30 | 0)); R(x, 0, 1, HH, 'rgba(0,0,0,0.3)'); }
    for (let i = 0; i < 5; i++) R(hash(seed, i, 2) * W, hash(seed, i, 3) * HH, 22, 14, i % 2 ? '#8e3f2e' : '#5d6f7a');
  } else if (kind === 'industrial' || kind === 'hangar' || kind === 'barn') {
    const base = kind === 'barn' ? mute(b.wall || '#8e3b2e', 0.1) : wall;
    R(0, 0, W, HH, base);
    for (let x = 0; x < W; x += 6) { R(x, 0, 1, HH, shade(base, -22)); R(x + 3, 0, 1, HH, shade(base, 10)); }
    R(0, HH - 14, W, 14, shade(base, -30));
  } else if (kind === 'house' && hash(seed, 5) > 0.35) {
    for (let y = 0; y < HH; y += 8) { R(0, y, W, 2, shade(wall, -40)); R(0, y + 2, W, 2, shade(wall, 12)); }
  } else {
    for (let y = 0, r = 0; y < HH; y += 8, r++) { R(0, y, W, 2, shade(wall, -38)); for (let x = (r % 2) * 10; x < W; x += 20) { R(x, y, 2, 8, shade(wall, -32)); if (hash(seed, x, y) > 0.55) R(x + 2, y + 2, 18, 6, shade(wall, hash(seed, y, x) > 0.5 ? -18 : 14)); } }
  }
  const g = c.createLinearGradient(0, HH - 30, 0, HH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,16,12,0.34)'); c.fillStyle = g; c.fillRect(0, HH - 30, W, 30);
  const g2 = c.createLinearGradient(0, 0, 0, 16); g2.addColorStop(0, 'rgba(0,0,0,0.32)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.fillRect(0, 0, W, 16);
  const glowAt = (i, j) => hash(seed, i * 7 + 1, j * 13 + 2) < (kind === 'tower' ? 0.55 : 0.8);
  const glass = (x, y, w, h, glows, warm = '#ffd58a') => {
    R(x - 2, y - 2, w + 4, h + 4, kind === 'tower' ? '#1a232c' : trim);
    R(x, y, w, h, '#31465a');
    c.fillStyle = 'rgba(150,190,215,0.35)'; c.beginPath(); c.moveTo(x, y + h * 0.6); c.lineTo(x + w * 0.55, y); c.lineTo(x + w * 0.85, y); c.lineTo(x, y + h); c.fill();
    if (glows) R(x, y, w, h, warm, e);
  };
  if (kind === 'tower') {
    const cols = Math.max(2, Math.round(wUnits / 1.1));
    const cw = W / cols;
    const top = 10;
    const fhh = (HH - top - 30) / floors;
    for (let j = 0; j < floors; j++) for (let i = 0; i < cols; i++) {
      const y = top + j * fhh;
      const sky = 0.55 - (j / floors) * 0.4 + (hash(seed, i, j) - 0.5) * 0.16;
      const pane = hash(seed, i * 3, j * 5) > 0.9 ? '#cfc6b0' : mix(mix('#2c4256', b.wall || '#8090a0', 0.2), '#a9c8dc', Math.max(0.05, sky));
      R(i * cw + 2, y + 2, cw - 4, fhh - 5, pane);
      if (glowAt(i, j)) R(i * cw + 2, y + 2, cw - 4, fhh - 5, hash(seed, j, i) > 0.5 ? '#ffd58a' : '#cfe3ff', e);
      else if (hash(seed, i + 3, j) > 0.6) { c.fillStyle = 'rgba(170,205,228,0.18)'; c.fillRect(i * cw + 2, y + 2, (cw - 4) * 0.5, fhh - 5); }
    }
    const mull = typeof b.glass === 'string' ? mute(b.glass, 0.1) : trim;
    for (let i = 0; i <= cols; i++) R(i * cw - 1, 0, 3, HH - 30, mull);
    for (let j = 0; j <= floors; j += 5) R(0, top + j * fhh - 1, W, 2, mull);
    R(0, HH - 30, W, 30, shade(trim, 10));
    R(0, 0, W, 8, shade(trim, 18));
  } else if (kind !== 'shack' || side === 's') {
    const n = Math.max(1, Math.floor(wUnits / (kind === 'industrial' || kind === 'hangar' || kind === 'barn' ? 4 : 2.4)));
    for (let j = 0; j < floors; j++) for (let i = 0; i < n; i++) {
      const cx = (i + 0.5) * (W / n);
      const ground = j === floors - 1;
      const y0 = HH - (floors - j) * fh;
      if (ground && doorAt !== null && Math.abs(cx - doorAt * FP) < 30) continue;
      if (kind === 'shop' && ground && side === 's') { const ww = Math.min(W / n - 14, 62); glass(cx - ww / 2, y0 + fh * 0.3, ww, fh * 0.48, true, '#ffe2a6'); R(cx - ww / 2 - 2, y0 + fh * 0.78, ww + 4, 4, shade(trim, 18)); continue; }
      if (kind === 'industrial' || kind === 'hangar' || kind === 'barn') {
        if (side === 's' && ground && kind !== 'barn') { R(cx - 26, y0 + fh * 0.22, 52, fh * 0.78, shade(trim, -4)); for (let k = 0; k < 6; k++) R(cx - 26, y0 + fh * 0.22 + k * 9, 52, 1, shade(trim, 22)); } else glass(cx - 12, y0 + fh * 0.18, 24, 9, glowAt(i, j), '#fff0c0');
        continue;
      }
      if (kind === 'shack') { glass(cx - 6, y0 + fh * 0.35, 12, 12, glowAt(i, j), '#ffb866'); continue; }
      const ww = 15;
      const wh = fh * 0.42;
      glass(cx - ww / 2, y0 + fh * 0.26, ww, wh, glowAt(i, j));
      R(cx - 1, y0 + fh * 0.26, 2, wh, trim); R(cx - ww / 2, y0 + fh * 0.26 + wh / 2 - 1, ww, 2, trim); R(cx - ww / 2 - 3, y0 + fh * 0.26 + wh + 2, ww + 6, 3, shade(wall, 24));
      if (kind === 'house' && hash(seed, i, 9) > 0.5) { R(cx - ww / 2 - 6, y0 + fh * 0.26 - 1, 4, wh + 2, shade(trim, 10)); R(cx + ww / 2 + 2, y0 + fh * 0.26 - 1, 4, wh + 2, shade(trim, 10)); }
    }
  }
  if (doorAt !== null && side === 's') {
    const dx = doorAt * FP;
    const dw = kind === 'civic' || kind === 'tower' ? 30 : 20;
    const dh = 52;
    R(dx - dw / 2 - 3, HH - dh - 4, dw + 6, dh + 4, shade(trim, -8));
    R(dx - dw / 2, HH - dh, dw, dh, kind === 'tower' ? '#2c3b48' : shade(mix(trim, '#6b4a2e', 0.5), 6));
    if (kind === 'civic' || kind === 'tower') R(dx - 1, HH - dh, 2, dh, '#1c1a1c');
    else { R(dx - dw / 2 + 3, HH - dh + 5, dw - 6, 16, '#3c5266'); R(dx - dw / 2 + 3, HH - dh + 5, dw - 6, 16, '#ffd58a', e); R(dx + dw / 2 - 5, HH - dh / 2, 2, 3, '#d9c07a'); }
    R(dx - dw / 2 - 5, HH - 3, dw + 10, 3, '#9a958c');
  }
  if (floors > 1 && kind !== 'tower') for (let j = 1; j < floors; j++) R(0, HH - j * fh - 2, W, 3, shade(wall, -18));
  return { map: tex(cv), emissiveMap: tex(em) };
}

/** A pitched roof over a rectangle: ridge along the long axis; `hip` pulls the ridge ends in. */
function pitched(w, d, rise, over, hip, material, gableMat) {
  const hw = w / 2 + over;
  const hd = d / 2 + over;
  const alongX = w >= d;
  const v = []; const uv = []; const idx = [];
  const P = (x, y, z, u, vv) => { v.push(x, y, z); uv.push(u, vv); return v.length / 3 - 1; };
  const quad = (a, b2, c2, e) => idx.push(a, b2, c2, a, c2, e);
  const L = alongX ? hw : hd;
  const S = alongX ? hd : hw;
  const inset = hip ? Math.min(S, L * 0.6) : 0;
  const sl = Math.hypot(S, rise);
  const map = (l, s, y) => (alongX ? [l, y, s] : [s, y, l]);
  for (const sg of [1, -1]) {
    const K = 3.4;
    const a = P(...map(-L, sg * S, 0), 0, 0);
    const b2 = P(...map(L, sg * S, 0), 2 * L / K, 0);
    const c2 = P(...map(L - inset, 0, rise), (2 * L - inset) / K, sl / K);
    const e = P(...map(-L + inset, 0, rise), inset / K, sl / K);
    if ((sg === 1) === alongX) quad(a, b2, c2, e); else quad(b2, a, e, c2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const roof = new THREE.Mesh(g, material);
  roof.castShadow = true; roof.receiveShadow = true;
  const v2 = []; const i2 = [];
  for (const sg of [1, -1]) {
    const b0 = v2.length / 3;
    v2.push(...map(sg * L, -S, 0), ...map(sg * L, S, 0), ...map(sg * (L - inset), 0, rise));
    if ((sg === 1) === alongX) i2.push(b0, b0 + 2, b0 + 1); else i2.push(b0, b0 + 1, b0 + 2);
  }
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.Float32BufferAttribute(v2, 3));
  g2.setIndex(i2);
  g2.computeVertexNormals();
  let endMat = gableMat;
  if (hip) { endMat = material.clone(); endMat.map = null; endMat.color = material.userData.flat; endMat.userData.keep = false; if (material.userData.seeThrough) { endMat.userData.seeThrough = false; } }
  const ends = new THREE.Mesh(g2, endMat);
  ends.castShadow = true; ends.receiveShadow = true;
  const gr = new THREE.Group();
  gr.add(roof, ends);
  return gr;
}

// ------------------------------------------------------------------ the roofed building
/**
 * Build a roofed building at map-local tile (b.x, b.y). Returns { group, mats, lights, top } where `mats` are the materials
 * a see-through hole must patch (all of them), `emissive` those whose glow follows the night, and `lights` the candidate
 * lamps (map-local tiles). `shared.roofTex` is a Map for roof textures.
 */
export function buildRoofed(b, shared) {
  const kind = buildingKind(b);
  const g = new THREE.Group();
  g.position.set(b.x + b.w / 2, 0.02, b.y + b.h / 2);
  const wall = mute(b.wall || '#cfc4ae', 0.18);
  const trim = mute(b.trim || '#5a4a3e', 0.15);
  const roofC = mute(b.roof || '#6a6e78', 0.2);
  const seed = strHash(b.id);
  const lights = [];
  const emissive = [];
  const out = { group: g, kind, lights, emissive, top: 0, door: null };
  if (kind === 'lighthouse') {
    const H = 9;
    g.add(cyl(1.9, H, mat(wall), { rt: 1.25, seg: 18 }));
    for (const [y, hh] of [[1.6, 1.3], [4.6, 1.3]]) g.add(cyl(1.9 - y * 0.072 + 0.02, hh, mat(roofC), { rt: 1.9 - (y + hh) * 0.072 + 0.02, seg: 18, y }));
    g.add(cyl(1.75, 0.18, mat('#3a3a40'), { y: H, seg: 18 }), cyl(0.95, 1.3, mat('#2a3138'), { y: H + 0.18, seg: 12 }), cone(1.25, 1.1, mat(roofC), { y: H + 1.48, seg: 12 }), cyl(0.05, 0.6, mat('#333'), { y: H + 2.5 }));
    for (let i = 0; i < 12; i++) g.add(cyl(0.03, 0.5, mat('#33333a'), { x: Math.cos(i / 12 * 6.283) * 1.68, z: Math.sin(i / 12 * 6.283) * 1.68, y: H + 0.18, cast: false }));
    g.add(box(0.9, 1.5, 0.12, mat(shade(trim, -10)), { z: 1.86, y: 0 }));
    for (let i = 0; i < 3; i++) g.add(box(0.36, 0.5, 0.08, mat('#2e4050'), { z: 1.72 - i * 0.2, y: 2.4 + i * 2.2 }));
    out.top = H + 2.6;
    out.mats = collectMats(g);
    return out;
  }
  const floors = floorsOf(b, kind);
  const H = height3d(b);
  const doorAt = b.door ? b.door.x - b.x + 0.5 : null;
  const fs = facade(b, kind, b.w, H, 's', doorAt);
  const fe = facade(b, kind, b.h, H, 'e', null);
  const mk = (f) => { const m = new THREE.MeshLambertMaterial({ map: f.map, emissiveMap: f.emissiveMap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 }); m.userData.emissiveBase = 0.8; emissive.push(m); return m; };
  const ms = mk(fs);
  const me = mk(fe);
  const plain = new THREE.MeshLambertMaterial({ color: shade(wall, -10) });
  const bodyGeo = new THREE.BoxGeometry(b.w, H, b.h);
  const body = new THREE.Mesh(bodyGeo, [me, me, plain, plain, ms, ms]);
  body.position.y = H / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  out.top = H + 1;
  const flat = b.flatRoof || kind === 'tower' || kind === 'shack' || kind === 'civic' || kind === 'hangar';
  const deco = new THREE.Group(); // the small parts, merged at the end
  g.add(deco);
  if (kind === 'hangar') {
    const r = b.h / 2;
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(r, r, b.w, 20, 1, false, 0, Math.PI), new THREE.MeshLambertMaterial({ map: roofTexture(roofC, 'metal', shared.roofTex), side: THREE.DoubleSide }));
    arch.rotation.z = Math.PI / 2;
    arch.scale.set(0.42, 1, 1);
    arch.position.y = H;
    arch.castShadow = true;
    g.add(arch);
    const endm = mat(shade(wall, -6));
    for (const sx of [-1, 1]) { const e2 = new THREE.Mesh(new THREE.CircleGeometry(r, 20, 0, Math.PI), endm); e2.scale.set(1, 0.42, 1); e2.rotation.y = sx * Math.PI / 2; e2.position.set(sx * b.w / 2, H, 0); g.add(e2); }
    out.top = H + r * 0.42 + 0.6;
  } else if (flat) {
    const rt = roofTexture(kind === 'shack' ? '#6f6a66' : shade(roofC, -6), kind === 'shack' ? 'metal' : 'gravel', shared.roofTex).clone();
    rt.repeat.set(b.w / 4, b.h / 4);
    rt.needsUpdate = true;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(b.w - 0.3, b.h - 0.3), new THREE.MeshLambertMaterial({ map: rt }));
    top.rotation.x = -Math.PI / 2; top.position.y = H + 0.02; top.receiveShadow = true;
    g.add(top);
    const pm = mat(shade(kind === 'tower' ? trim : wall, 8));
    const ph = kind === 'shack' ? 0.12 : 0.38;
    deco.add(box(b.w, ph, 0.16, pm, { y: H, z: b.h / 2 - 0.08 }), box(b.w, ph, 0.16, pm, { y: H, z: -b.h / 2 + 0.08 }), box(0.16, ph, b.h, pm, { y: H, x: b.w / 2 - 0.08 }), box(0.16, ph, b.h, pm, { y: H, x: -b.w / 2 + 0.08 }));
    if (kind !== 'shack') {
      const n = Math.max(1, Math.round(b.w * b.h / 40));
      for (let i = 0; i < Math.min(n, 6); i++) {
        const x = (hash(seed, i, 1) - 0.5) * (b.w - 3);
        const z = (hash(seed, i, 2) - 0.5) * (b.h - 3);
        const k = hash(seed, i, 3);
        if (k > 0.6) deco.add(box(1.3, 0.7, 0.9, mat('#8d9297'), { x, z, y: H }), cyl(0.3, 0.08, mat('#3c4046'), { x, z, y: H + 0.7 }));
        else if (k > 0.3) deco.add(cyl(0.22, 0.6, mat('#7d8288'), { x, z, y: H }), cyl(0.3, 0.12, mat('#5b6066'), { x, z, y: H + 0.6 }));
        else deco.add(box(1.6, 1.3, 1.6, mat(shade(wall, -14)), { x, z, y: H }), box(1.8, 0.1, 1.8, mat('#55585e'), { x, z, y: H + 1.3 }));
      }
      if (kind === 'tower' && hash(seed, 9) > 0.4) {
        deco.add(cyl(0.06, 3.2, mat('#9a9ea4'), { y: H + 0.3, x: b.w / 4, z: -b.h / 4 }));
        const beacon = box(0.12, 0.12, 0.12, mat('#ff4a3a', { emissive: '#ff2a1a', ei: 1.4 }), { y: H + 3.5, x: b.w / 4, z: -b.h / 4, cast: false });
        deco.add(beacon);
      }
    }
    if (b.dome) {
      const dr = Math.min(b.w, b.h) * 0.26;
      deco.add(cyl(dr * 1.05, 1.3, mat(shade(wall, 6)), { y: H, seg: 20 }));
      const dm = new THREE.Mesh(new THREE.SphereGeometry(dr, 22, 12, 0, 6.3, 0, Math.PI / 2), mat('#4f8a84'));
      dm.position.y = H + 1.3; dm.castShadow = true;
      g.add(dm);
      deco.add(cyl(0.16, 0.9, mat('#d9c07a'), { y: H + 1.3 + dr }));
      out.top = H + dr + 2.6;
    }
    if (b.pediment || (kind === 'civic' && b.columns)) {
      const pw = Math.min(b.w * 0.5, 9);
      const sh = new THREE.Shape();
      sh.moveTo(-pw / 2, 0); sh.lineTo(pw / 2, 0); sh.lineTo(0, 1.25);
      const pm2 = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false }), mat(shade(wall, 14)));
      pm2.position.set((doorAt ?? b.w / 2) - b.w / 2, H - 0.25, b.h / 2 - 0.1);
      pm2.castShadow = true;
      g.add(pm2);
    }
  } else {
    const mtl = new THREE.MeshLambertMaterial({ map: roofTexture(roofC, kind === 'barn' || kind === 'industrial' ? 'metal' : 'shingle', shared.roofTex), side: THREE.DoubleSide });
    mtl.userData.flat = new THREE.Color(roofC);
    const rise = Math.min(b.w, b.h) * (kind === 'barn' ? 0.42 : 0.3) + 0.3;
    const hip = kind !== 'barn' && hash(seed, 4) > 0.55;
    const rf = pitched(b.w, b.h, rise, 0.32, hip, mtl, mat(shade(wall, 4), { double: true }));
    rf.position.y = H;
    g.add(rf);
    const fm = mat(shade(trim, 6));
    const alongX = b.w >= b.h;
    deco.add(box(b.w + 0.7, 0.14, 0.1, fm, { y: H - 0.1, z: b.h / 2 + 0.34 }), box(0.1, 0.14, b.h + 0.7, fm, { y: H - 0.1, x: b.w / 2 + 0.34 }), box(b.w + 0.7, 0.14, 0.1, fm, { y: H - 0.1, z: -b.h / 2 - 0.34 }), box(0.1, 0.14, b.h + 0.7, fm, { y: H - 0.1, x: -b.w / 2 - 0.34 }));
    const inset = hip ? Math.min((alongX ? b.h : b.w) / 2 + 0.32, ((alongX ? b.w : b.h) / 2 + 0.32) * 0.6) : 0;
    const rl = (alongX ? b.w : b.h) + 0.64 - inset * 2;
    if (rl > 0.3) deco.add(alongX ? box(rl, 0.1, 0.22, mat(shade(roofC, -34)), { y: H + rise - 0.03 }) : box(0.22, 0.1, rl, mat(shade(roofC, -34)), { y: H + rise - 0.03 }));
    if (kind === 'house' || kind === 'shop') { const cx = (hash(seed, 6) - 0.5) * b.w * 0.5; const cz = -b.h * 0.12; deco.add(box(0.55, rise + 0.7, 0.55, mat('#8a4f40'), { x: cx, z: cz, y: H }), box(0.68, 0.12, 0.68, mat('#5d5550'), { x: cx, z: cz, y: H + rise + 0.7 })); }
    if (kind === 'industrial') {
      const n = Math.max(2, Math.round(Math.max(b.w, b.h) / 5));
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n - 0.5; const x = b.w >= b.h ? t * b.w * 0.8 : 0; const z = b.w >= b.h ? 0 : t * b.h * 0.8; deco.add(cyl(0.34, 0.5, mat('#8d9297'), { x, z, y: H + rise - 0.1, seg: 10 }), cyl(0.44, 0.1, mat('#6d7277'), { x, z, y: H + rise + 0.4, seg: 10 })); }
      if (/refinery|foundry|works|cannery/i.test(b.name)) for (const sx of [-1, 1]) { const x = sx * (b.w / 2 - 1.6); const z = -b.h / 2 + 1.5; deco.add(cyl(0.42, 4.6, mat('#9a9288'), { x, z, y: H, seg: 12, rt: 0.32 }), cyl(0.36, 0.3, mat('#8a3a2e'), { x, z, y: H + 3.6, seg: 12 }), cyl(0.36, 0.12, mat('#2a2a2e'), { x, z, y: H + 4.6, seg: 12 })); }
    }
    out.top = H + rise + 1;
  }
  // the shopfront kit: columns, awning, sign, step, lamp over the door
  const zf = b.h / 2;
  if (b.columns) {
    const n = Math.max(2, Math.min(8, Math.round(b.w / 3.2)));
    const cw = Math.min(b.w - 2, n * 3);
    const cx0 = (doorAt ?? b.w / 2) - b.w / 2;
    const ch = Math.min(H, kind === 'tower' ? 3.2 : H) - 0.3;
    for (let i = 0; i < n; i++) {
      const x = Math.max(-b.w / 2 + 0.5, Math.min(b.w / 2 - 0.5, cx0 - cw / 2 + (i + 0.5) * (cw / n)));
      if (doorAt !== null && Math.abs(x - cx0) < 0.6) continue;
      deco.add(cyl(0.2, ch, mat('#e2dccf'), { x, z: zf + 0.75, seg: 10 }), box(0.56, 0.14, 0.56, mat('#d2ccbf'), { x, z: zf + 0.75 }), box(0.56, 0.14, 0.56, mat('#d2ccbf'), { x, z: zf + 0.75, y: ch }));
    }
    deco.add(box(cw + 0.8, 0.34, 1.5, mat(shade(wall, 10)), { x: cx0, z: zf + 0.5, y: ch + 0.14 }));
  }
  if (b.awning && doorAt !== null) {
    const aw = Math.min(b.w - 1, 6);
    const cva = canvas(64, 16);
    const ca = cva.getContext('2d');
    const ac = mute(b.awning, 0.1);
    for (let i = 0; i < 8; i++) { ca.fillStyle = i % 2 ? ac : '#efe6d4'; ca.fillRect(i * 8, 0, 8, 16); }
    const am = new THREE.Mesh(new THREE.BoxGeometry(aw, 0.06, 1.2), new THREE.MeshLambertMaterial({ map: tex(cva) }));
    am.position.set(doorAt - b.w / 2, 2.0, zf + 0.52);
    am.rotation.x = 0.36;
    am.castShadow = true;
    g.add(am);
  }
  if (b.sign && doorAt !== null && kind !== 'house') {
    const t = textMat(b.sign, { fg: b.signColor ? '#fff6e0' : '#f4ecd8', bg: mute(b.signColor || shade(trim, -12), 0.1), border: 'rgba(255,255,255,0.35)', glow: 0 });
    t.material.userData.emissiveBase = 0.9;
    emissive.push(t.material);
    const sh = 0.5;
    const sw = Math.min(b.w - 0.6, sh * t.aspect);
    const sy = kind === 'tower' ? 2.75 : Math.min(H - 0.56, b.awning ? 2.5 : 2.2);
    g.add(box(sw + 0.12, sh + 0.12, 0.1, mat('#2a2622'), { x: doorAt - b.w / 2, y: sy - 0.06, z: zf + 0.06 }));
    g.add(board(sw, sh, t.material, { x: doorAt - b.w / 2, y: sy, z: zf + 0.125 }));
  }
  if (doorAt !== null) {
    deco.add(box(1.5, 0.08, 0.5, mat('#9a958c'), { x: doorAt - b.w / 2, z: zf + 0.25, y: -0.02 }));
    out.door = { x: b.x + doorAt, z: b.y + b.h + 0.6 };
    lights.push({ x: b.x + doorAt, y: 2.0, z: b.y + b.h + 0.6, color: kind === 'tower' ? '#cfe0ff' : '#ffc880', intensity: kind === 'tower' ? 9 : 6, distance: kind === 'tower' ? 8 : 6, prio: -2, door: true, tower: kind === 'tower' });
  }
  bake(deco);
  out.mats = collectMats(g);
  return out;
}

/**
 * The materials of a building, all its own. Shared (cached) materials are cloned first: the see-through shader patch binds one
 * building's hole to a material, and a shared material would carry that hole to every other building and prop that uses it.
 */
function ownMats(root) {
  const own = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const swap = (m) => {
      if (!m.userData.keep) return m;
      let c = own.get(m);
      if (!c) { c = m.clone(); c.userData.keep = false; own.set(m, c); }
      return c;
    };
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
  return root;
}

function collectMats(root) {
  ownMats(root);
  const s = new Set();
  root.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) s.add(m); });
  return [...s];
}

// ------------------------------------------------------------------ rooms (open buildings, rooms alone, aloft floors)
const FLOORS = { f: ['#d8c9a8', '#7a5a3c'], t: ['#dfe3dc', '#a8b5ad'], c: ['#5d6e62', '#4a3528'], g: ['#a9aaa6', '#7b7d7a'] };

function innerWallMaterial(floor, H, cache) {
  const key = `${floor}|${H.toFixed(2)}`;
  let m = cache.get(key);
  if (m) return m;
  const sch = FLOORS[floor] || ['#d5ccba', '#7a6a55'];
  const W = 64; const HH = Math.round(H * FP);
  const cv = canvas(W, HH);
  const c = cv.getContext('2d');
  c.fillStyle = sch[0]; c.fillRect(0, 0, W, HH);
  if (floor === 'f') for (let x = 0; x < W; x += 10) { c.fillStyle = 'rgba(150,120,80,0.16)'; c.fillRect(x, 0, 4, HH); }
  if (floor === 'g') for (let y = 0, r = 0; y < HH; y += 8, r++) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, y, W, 1); for (let x = (r % 2) * 10; x < W; x += 20) c.fillRect(x, y, 1, 8); }
  const wh = floor === 't' ? HH * 0.5 : HH * 0.36;
  c.fillStyle = sch[1]; c.fillRect(0, HH - wh, W, wh);
  if (floor === 't') { for (let x = 0; x < W; x += 8) { c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x, HH - wh, 1, wh); } for (let y = HH - wh; y < HH; y += 8) { c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(0, y, W, 1); } }
  else { c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(0, HH - wh, W, 2); for (let x = 0; x < W; x += 16) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, HH - wh, 1, wh); } }
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, HH - 4, W, 4);
  const gr = c.createLinearGradient(0, 0, 0, 14); gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, 14);
  const t = tex(cv, { repeat: true });
  t.repeat.set(0.5, 1); // 64 px = two tiles across
  t.userData.keep = true;
  m = new THREE.MeshLambertMaterial({ map: t });
  m.userData.keep = true;
  cache.set(key, m);
  return m;
}

/** A wall box (len along x if horizontal) whose side UVs repeat once per tile. */
function wallGeometry(len, h, th, horizontal) {
  const g = new THREE.BoxGeometry(horizontal ? len : th, h, horizontal ? th : len);
  const uv = g.attributes.uv;
  const n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)); const nz = Math.abs(n.getZ(i));
    if (nx > 0.5) uv.setX(i, uv.getX(i) * (horizontal ? th : len));
    else if (nz > 0.5) uv.setX(i, uv.getX(i) * (horizontal ? len : th));
  }
  return g;
}

/** What kind of wall tile is a 'W' at (tx, ty) in a room: 'tall' or 'low'. */
export function wallClass(tx, ty, w, h, horizontal, roofed) {
  if (roofed) return 'low';
  if (ty === 0 && horizontal) return 'tall';
  if (tx === 0 && !horizontal) return 'tall';
  if (ty === h - 1 || tx === w - 1) return 'low';
  return horizontal ? 'tall' : 'low';
}

/** Runs of 'W' tiles of a map: [{ x, y, len, horizontal }], horizontal wins ties. */
export function wallRuns(map) {
  const w = map.width; const h = map.height;
  const isW = (x, y) => x >= 0 && y >= 0 && x < w && y < h && map.tileAt(x, y) === 'W';
  const seen = new Set();
  const runs = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!isW(x, y) || seen.has(y * 4096 + x)) continue;
    let a = 0; while (isW(x + a + 1, y) && !seen.has(y * 4096 + x + a + 1)) a++;
    let b = 0; while (isW(x, y + b + 1) && !seen.has((y + b + 1) * 4096 + x)) b++;
    const horizontal = a >= b;
    const len = (horizontal ? a : b) + 1;
    for (let k = 0; k < len; k++) seen.add(horizontal ? y * 4096 + x + k : (y + k) * 4096 + x);
    runs.push({ x, y, len, horizontal });
  }
  return runs;
}

/**
 * The walls of a room (an interior map): north and west walls stand to `H`, south and east walls and vertical partitions are
 * a kerb; with `roofed` (a roofed upper floor) everything is a kerb. `pal` { wall, trim, glass? }. Returns a Group in the map's
 * own tile frame, baked into a few meshes, with `userData.windows` the glass positions.
 */
export function buildRoom(map, pal, opts, shared) {
  const g = new THREE.Group();
  const H = opts.H || STOREY;
  const w = map.width; const h = map.height;
  const floorCh = (() => { for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const ch = map.tileAt(x, y); if (ch !== 'W' && ch !== 'D') return ch; } return 'f'; })();
  const inner = innerWallMaterial(floorCh, H, shared.wallMat);
  const stubM = mat(shade(pal.wall || '#d8cdb8', -8));
  const capM = mat('#2c2824');
  const glassWall = pal.glass ? mat(mix(pal.wall || '#3a3e48', pal.glass, 0.5), { opacity: 0.55 }) : null;
  const winRows = new Set((map.props || []).filter((p) => p.type === 'window' && (p.y === 0)).map((p) => p.x));
  for (const r of wallRuns(map)) {
    const cls = wallClass(r.x, r.y, w, h, r.horizontal, opts.roofed);
    const hh = cls === 'tall' ? H : KERB;
    const geo = wallGeometry(r.len, hh, TH, r.horizontal);
    const faces = r.horizontal ? [stubM, stubM, capM, capM, cls === 'tall' ? (glassWall || inner) : stubM, stubM] : [cls === 'tall' ? (glassWall || inner) : stubM, stubM, capM, capM, stubM, stubM];
    const m = new THREE.Mesh(geo, faces);
    // a north wall sits on its tile's north edge, a south wall on its tile's south edge, partitions down the tile's middle
    let cx = r.horizontal ? r.x + r.len / 2 : r.x + 0.5;
    let cz = r.horizontal ? r.y + 0.5 : r.y + r.len / 2;
    if (r.horizontal && r.y === 0) cz = TH / 2;
    else if (r.horizontal && r.y === h - 1) cz = h - TH / 2;
    if (!r.horizontal && r.x === 0) cx = TH / 2;
    else if (!r.horizontal && r.x === w - 1) cx = w - TH / 2;
    m.position.set(cx, hh / 2, cz);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.noBake = true;
    g.add(m);
  }
  const windows = [];
  for (const x of winRows) {
    windows.push({ x: x + 0.5, y: 1.35, z: TH + 0.02 });
    g.add(box(0.95, 1.05, 0.05, mat(shade(pal.trim || '#5a4a3a', -10)), { x: x + 0.5, y: 0.85, z: TH + 0.02, cast: false }), box(0.78, 0.88, 0.06, mat('#bfe0ee', { emissive: '#5a7884', ei: 0.5 }), { x: x + 0.5, y: 0.94, z: TH + 0.03, cast: false }));
  }
  g.userData.windows = windows;
  g.userData.H = H;
  return g;
}

/** The free-standing wall tiles of a street map, as merged slabs, built once for the whole map. */
export function buildStreetWalls(map) {
  const g = new THREE.Group();
  const m = mat('#5b4a45');
  const cap = mat('#3e322f');
  for (const r of wallRuns(map)) {
    const lx = r.horizontal ? r.len : 1; const lz = r.horizontal ? 1 : r.len;
    g.add(box(lx, 1.15, lz, m, { x: r.x + lx / 2, z: r.y + lz / 2 }), box(lx + 0.04, 0.08, lz + 0.04, cap, { x: r.x + lx / 2, z: r.y + lz / 2, y: 1.15, cast: false }));
  }
  bake(g);
  return g;
}

// ------------------------------------------------------------------ the open building
/**
 * The room the player stands in, cut away (no roof, south and east walls a kerb): the room's walls plus the outside dress the
 * roofed version has, kept so the place is still itself (a doorstep, a sign post). `I` is the interior map, `b` its building.
 */
export function buildOpen(b, I, shared) {
  const trim = mute(b.trim || '#5a4a3e', 0.15);
  const wall = mute(b.wall || '#cfc4ae', 0.18);
  const g = new THREE.Group();
  g.position.set(b.x, 0, b.y);
  const room = buildRoom(I, { wall, trim }, { H: STOREY }, shared);
  g.add(room);
  const h = I.height;
  const w = I.width;
  const door = I.doors.find((d) => d.y === h - 1) || (b.door ? { x: b.door.x - b.x, y: h - 1 } : null);
  const extras = new THREE.Group();
  g.add(extras);
  if (door) {
    for (const dx of [door.x - 0.02, door.x + 1.02]) extras.add(box(0.1, 1.95, TH + 0.04, mat(trim), { x: dx, z: h - TH / 2 }));
    extras.add(box(1.14, 0.1, TH + 0.04, mat(trim), { x: door.x + 0.5, z: h - TH / 2, y: 1.95 }), box(1.5, 0.08, 0.5, mat('#9a958c'), { x: door.x + 0.5, z: h + 0.25, y: -0.04 }));
    const leaf = box(0.92, 1.9, 0.07, mat(mix(trim, '#7a5536', 0.6)), { x: 0.46, z: 0 });
    const hinge = group(door.x + 0.03, 0, h - TH / 2, leaf);
    hinge.rotation.y = 1.25;
    extras.add(hinge);
  }
  if (b.sign && door) {
    const t = textMat(b.sign, { bg: mute(b.signColor || shade(trim, -12), 0.1), border: 'rgba(255,255,255,0.35)', glow: 0 });
    t.material.userData.emissiveBase = 0.9;
    const sh = 0.46; const sw = sh * t.aspect;
    const px = Math.min(w - sw / 2 - 0.4, door.x + 2.4 + sw / 2);
    extras.add(cyl(0.05, 1.5, mat('#3a3632'), { x: px - sw / 2 + 0.1, z: h + 0.5 }), cyl(0.05, 1.5, mat('#3a3632'), { x: px + sw / 2 - 0.1, z: h + 0.5 }), box(sw + 0.1, sh + 0.1, 0.08, mat('#2a2622'), { x: px, y: 1.0, z: h + 0.5 }), board(sw, sh, t.material, { x: px, y: 1.05, z: h + 0.55 }));
    g.userData.signMat = t.material;
  }
  bake(extras);
  g.userData.room = room;
  return g;
}
