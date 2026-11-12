// CONCEPT STUDY ONLY — buildings assembled from reusable parts: wall runs with painted facades,
// roof kinds (gable, hip, flat with parapet, dome, tower), shopfront kit (sign, awning, columns)
// and the cut-away room (low near walls, full far walls, the game's own interior grid and floor).
import { THREE, hash, strHash, canvas, tex, shade, mix, mute, box, cyl, cone, blob, group, board, textMat, mat } from './lib.js';

const FP = 32; // facade texture pixels per world unit
export const STOREY = 2.3;

function kindOf(b) {
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

function floorsOf(b, kind) {
  if (b.tower) return b.tower;
  if (kind === 'civic') return /justice/i.test(b.name) ? 3 : 2;
  if (/apartments|hotel|precinct|boarding|lodging|manor/i.test(b.name || '')) return 2;
  return 1;
}

/** Paint one facade (colour + emissive). side: 's' (the front, with the door) or 'e'. */
function facade(b, kind, wUnits, H, side, opts, doorAt) {
  const W = Math.round(wUnits * FP), HH = Math.round(H * FP);
  const cv = canvas(W, HH), em = canvas(W, HH); const c = cv.getContext('2d'), e = em.getContext('2d');
  e.fillStyle = '#000'; e.fillRect(0, 0, W, HH);
  const seed = strHash(b.id + side);
  const wall = mute(b.wall || '#cfc4ae', 0.18), trim = mute(b.trim || '#5a4a3e', 0.15);
  const R = (x, y, w, h, col, ctx = c) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  R(0, 0, W, HH, wall);
  const floors = floorsOf(b, kind);
  const fh = kind === 'tower' ? HH / floors : Math.min(HH, STOREY * FP);
  // --- wall material
  if (kind === 'tower' || b.glass) {
    R(0, 0, W, HH, mix(wall, '#22303c', 0.4));
  } else if (kind === 'shack') {
    for (let x = 0; x < W; x += 9) { const k = hash(seed, x, 1); R(x, 0, 9, HH, k > 0.7 ? '#7d7f84' : k > 0.45 ? shade('#8a6a4a', (k - 0.5) * 40 | 0) : shade('#6f5a48', (k - 0.5) * 30 | 0)); R(x, 0, 1, HH, 'rgba(0,0,0,0.3)'); }
    for (let i = 0; i < 5; i++) R(hash(seed, i, 2) * W, hash(seed, i, 3) * HH, 22, 14, i % 2 ? '#8e3f2e' : '#5d6f7a');
  } else if (kind === 'industrial' || kind === 'hangar' || kind === 'barn') {
    const base = kind === 'barn' ? mute(b.wall || '#8e3b2e', 0.1) : wall; R(0, 0, W, HH, base);
    for (let x = 0; x < W; x += 6) { R(x, 0, 1, HH, shade(base, -22)); R(x + 3, 0, 1, HH, shade(base, 10)); }
    R(0, HH - 14, W, 14, shade(base, -30));
  } else if (kind === 'house' && hash(seed, 5) > 0.35) { // clapboard
    for (let y = 0; y < HH; y += 8) { R(0, y, W, 2, shade(wall, -40)); R(0, y + 2, W, 2, shade(wall, 12)); }
  } else { // brick or stone courses, tinted by the building's own wall colour
    for (let y = 0, r = 0; y < HH; y += 8, r++) { R(0, y, W, 2, shade(wall, -38)); for (let x = (r % 2) * 10; x < W; x += 20) { R(x, y, 2, 8, shade(wall, -32)); if (hash(seed, x, y) > 0.55) R(x + 2, y + 2, 18, 6, shade(wall, hash(seed, y, x) > 0.5 ? -18 : 14)); } }
  }
  // grime: darker toward the ground, streaks under the eaves
  const g = c.createLinearGradient(0, HH - 30, 0, HH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,16,12,0.34)'); c.fillStyle = g; c.fillRect(0, HH - 30, W, 30);
  const g2 = c.createLinearGradient(0, 0, 0, 16); g2.addColorStop(0, 'rgba(0,0,0,0.32)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.fillRect(0, 0, W, 16);
  if (opts.weather === 'snow') { R(0, HH - 5, W, 5, '#e6ebf0'); }
  // --- openings
  const lit = (i, j) => opts.lit > 0 && hash(seed, i * 7 + 1, j * 13 + 2) < (kind === 'tower' ? opts.lit * 0.55 : opts.lit);
  const glass = (x, y, w, h, on, warm = '#ffd58a') => {
    R(x - 2, y - 2, w + 4, h + 4, kind === 'tower' ? '#1a232c' : trim);
    R(x, y, w, h, on ? warm : '#31465a');
    if (!on) { c.fillStyle = 'rgba(150,190,215,0.35)'; c.beginPath(); c.moveTo(x, y + h * 0.6); c.lineTo(x + w * 0.55, y); c.lineTo(x + w * 0.85, y); c.lineTo(x, y + h); c.fill(); }
    else { R(x, y, w, h, warm, e); R(x, y + h * 0.55, w, h * 0.45, 'rgba(120,70,30,0.28)'); }
  };
  if (kind === 'tower') {
    const cols = Math.max(2, Math.round(wUnits / 1.1)); const cw = W / cols; const top = 10;
    for (let j = 0; j < floors; j++) for (let i = 0; i < cols; i++) { const y = top + j * ((HH - top - 30) / floors); const on = lit(i, j); { const sky = 0.55 - (j / floors) * 0.4 + (hash(seed, i, j) - 0.5) * 0.16; const pane = hash(seed, i * 3, j * 5) > 0.9 ? '#cfc6b0' : mix(mix('#2c4256', b.wall || '#8090a0', 0.2), '#a9c8dc', Math.max(0.05, sky)); R(i * cw + 2, y + 2, cw - 4, (HH - top - 30) / floors - 5, on ? '#ffdc98' : pane); } if (on) R(i * cw + 2, y + 2, cw - 4, (HH - top - 30) / floors - 5, hash(seed, j, i) > 0.5 ? '#ffd58a' : '#cfe3ff', e); else if (hash(seed, i + 3, j) > 0.6) { c.fillStyle = 'rgba(170,205,228,0.18)'; c.fillRect(i * cw + 2, y + 2, (cw - 4) * 0.5, (HH - top - 30) / floors - 5); } }
    const mull = typeof b.glass === 'string' ? mute(b.glass, 0.1) : trim;
    for (let i = 0; i <= cols; i++) R(i * cw - 1, 0, 3, HH - 30, mull);
    for (let j = 0; j <= floors; j += 5) R(0, top + j * ((HH - top - 30) / floors) - 1, W, 2, mull);
    R(0, HH - 30, W, 30, shade(trim, 10)); // the podium
    R(0, 0, W, 8, shade(trim, 18));
  } else if (kind !== 'shack' || side === 's') {
    const n = Math.max(1, Math.floor(wUnits / (kind === 'industrial' || kind === 'hangar' || kind === 'barn' ? 4 : 2.4)));
    for (let j = 0; j < floors; j++) for (let i = 0; i < n; i++) {
      const cx = (i + 0.5) * (W / n); const ground = j === floors - 1; const y0 = HH - (floors - j) * fh;
      if (ground && doorAt !== null && Math.abs(cx - doorAt * FP) < 30) continue;
      if (kind === 'shop' && ground && side === 's') { const ww = Math.min(W / n - 14, 62); glass(cx - ww / 2, y0 + fh * 0.3, ww, fh * 0.48, lit(i, j), '#ffe2a6'); R(cx - ww / 2 - 2, y0 + fh * 0.78, ww + 4, 4, shade(trim, 18)); continue; }
      if (kind === 'industrial' || kind === 'hangar' || kind === 'barn') { if (side === 's' && ground && kind !== 'barn') { R(cx - 26, y0 + fh * 0.22, 52, fh * 0.78, shade(trim, -4)); for (let k = 0; k < 6; k++) R(cx - 26, y0 + fh * 0.22 + k * 9, 52, 1, shade(trim, 22)); } else glass(cx - 12, y0 + fh * 0.18, 24, 9, lit(i, j), '#fff0c0'); continue; }
      if (kind === 'shack') { glass(cx - 6, y0 + fh * 0.35, 12, 12, lit(i, j), '#ffb866'); continue; }
      const ww = 15, wh = fh * 0.42; glass(cx - ww / 2, y0 + fh * 0.26, ww, wh, lit(i, j));
      R(cx - 1, y0 + fh * 0.26, 2, wh, trim); R(cx - ww / 2, y0 + fh * 0.26 + wh / 2 - 1, ww, 2, trim); R(cx - ww / 2 - 3, y0 + fh * 0.26 + wh + 2, ww + 6, 3, shade(wall, 24));
      if (kind === 'house' && hash(seed, i, 9) > 0.5) { R(cx - ww / 2 - 6, y0 + fh * 0.26 - 1, 4, wh + 2, shade(trim, 10)); R(cx + ww / 2 + 2, y0 + fh * 0.26 - 1, 4, wh + 2, shade(trim, 10)); }
    }
  }
  if (doorAt !== null && side === 's') {
    const dx = doorAt * FP; const dw = kind === 'civic' || kind === 'tower' ? 30 : 20, dh = 52;
    R(dx - dw / 2 - 3, HH - dh - 4, dw + 6, dh + 4, shade(trim, -8)); R(dx - dw / 2, HH - dh, dw, dh, kind === 'tower' ? '#2c3b48' : shade(mix(trim, '#6b4a2e', 0.5), 6));
    if (kind === 'civic' || kind === 'tower') R(dx - 1, HH - dh, 2, dh, '#1c1a1c'); else { R(dx - dw / 2 + 3, HH - dh + 5, dw - 6, 16, opts.lit ? '#ffd58a' : '#3c5266'); if (opts.lit) R(dx - dw / 2 + 3, HH - dh + 5, dw - 6, 16, '#ffd58a', e); R(dx + dw / 2 - 5, HH - dh / 2, 2, 3, '#d9c07a'); }
    R(dx - dw / 2 - 5, HH - 3, dw + 10, 3, '#9a958c');
  }
  if (floors > 1 && kind !== 'tower') for (let j = 1; j < floors; j++) R(0, HH - j * fh - 2, W, 3, shade(wall, -18));
  return { map: tex(cv), emissiveMap: tex(em) };
}

function wallMat(f, lit) { return new THREE.MeshLambertMaterial({ map: f.map, emissiveMap: f.emissiveMap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: lit ? 0.8 : 0 }); }

function roofTex(col, kind, snow) {
  const cv = canvas(128, 128); const c = cv.getContext('2d'); c.fillStyle = col; c.fillRect(0, 0, 128, 128);
  if (kind === 'shingle') for (let y = 0, r = 0; y < 128; y += 16, r++) { c.fillStyle = shade(col, -44); c.fillRect(0, y + 13, 128, 3); c.fillStyle = shade(col, 16); c.fillRect(0, y, 128, 2); for (let x = (r % 2) * 16; x < 128; x += 32) { c.fillStyle = shade(col, -34); c.fillRect(x, y, 2, 16); if (hash(x, y, 4) > 0.45) { c.fillStyle = shade(col, hash(y, x, 2) > 0.5 ? -20 : 14); c.fillRect(x + 2, y + 2, 30, 11); } } }
  else if (kind === 'metal') for (let x = 0; x < 128; x += 8) { c.fillStyle = shade(col, -20); c.fillRect(x, 0, 1, 128); c.fillStyle = shade(col, 12); c.fillRect(x + 4, 0, 1, 128); }
  else for (let i = 0; i < 700; i++) { c.fillStyle = shade(col, (hash(i, 3) - 0.5) * 30 | 0); c.fillRect(hash(i, 1) * 128, hash(i, 2) * 128, 2, 2); }
  if (snow) { c.fillStyle = 'rgba(236,241,246,0.9)'; c.fillRect(0, 0, 128, 128); for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(190,202,218,0.5)'; c.fillRect(hash(i, 5) * 128, hash(i, 6) * 128, 6, 2); } }
  const t = tex(cv, { repeat: true }); return t;
}

/** A pitched roof over a rectangle: ridge along the long axis; 'hip' pulls the ridge ends in. */
function pitched(w, d, rise, over, hip, material, gableMat) {
  const hw = w / 2 + over, hd = d / 2 + over; const alongX = w >= d; const v = [], uv = [], idx = [];
  const P = (x, y, z, u, vv) => { v.push(x, y, z); uv.push(u, vv); return v.length / 3 - 1; };
  const quad = (a, b, c, e) => idx.push(a, b, c, a, c, e); const tri = (a, b, c) => idx.push(a, b, c);
  const L = alongX ? hw : hd, S = alongX ? hd : hw; const inset = hip ? Math.min(S, L * 0.6) : 0; const sl = Math.hypot(S, rise);
  const map = (l, s, y) => (alongX ? [l, y, s] : [s, y, l]);
  // two main slopes
  for (const sg of [1, -1]) { const K = 3.4; const a = P(...map(-L, sg * S, 0), 0, 0), b = P(...map(L, sg * S, 0), 2 * L / K, 0), c2 = P(...map(L - inset, 0, rise), (2 * L - inset) / K, sl / K), e = P(...map(-L + inset, 0, rise), inset / K, sl / K); if ((sg === 1) === alongX) quad(a, b, c2, e); else quad(b, a, e, c2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const roof = new THREE.Mesh(g, material); roof.castShadow = true; roof.receiveShadow = true;
  // ends: hip slopes or gable walls
  const v2 = [], i2 = [];
  for (const sg of [1, -1]) { const b0 = v2.length / 3; v2.push(...map(sg * L, -S, 0), ...map(sg * L, S, 0), ...map(sg * (L - inset), 0, rise)); if ((sg === 1) === alongX) i2.push(b0, b0 + 2, b0 + 1); else i2.push(b0, b0 + 1, b0 + 2); }
  const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(v2, 3)); g2.setIndex(i2); g2.computeVertexNormals();
  const ends = new THREE.Mesh(g2, hip ? material.clone() : gableMat); if (hip) ends.material.map = null, ends.material.color = material.userData.flat; ends.castShadow = true; ends.receiveShadow = true;
  return group(0, 0, 0, roof, ends);
}

export function buildBuilding(b, bx, by, opts, lights, limit = 0) {
  const kind = kindOf(b); const snow = opts.weather === 'snow';
  const g = new THREE.Group(); g.position.set(bx + b.w / 2, 0.1, by + b.h / 2);
  const wall = mute(b.wall || '#cfc4ae', 0.18), trim = mute(b.trim || '#5a4a3e', 0.15), roofC = mute(b.roof || '#6a6e78', 0.2);
  const seed = strHash(b.id);
  if (kind === 'lighthouse') {
    const H = 9; const tw = cyl(1.9, H, mat(wall), { rt: 1.25, seg: 18 }); g.add(tw);
    for (const [y, hh] of [[1.6, 1.3], [4.6, 1.3]]) g.add(cyl(1.9 - y * 0.072 + 0.02, hh, mat(roofC), { rt: 1.9 - (y + hh) * 0.072 + 0.02, seg: 18, y }));
    g.add(cyl(1.75, 0.18, mat('#3a3a40'), { y: H, seg: 18 }), cyl(0.95, 1.3, new THREE.MeshLambertMaterial({ color: '#2a3138', emissive: '#000' }), { y: H + 0.18, seg: 12 }), cone(1.25, 1.1, mat(roofC), { y: H + 1.48, seg: 12 }), cyl(0.05, 0.6, mat('#333'), { y: H + 2.5 }));
    for (let i = 0; i < 12; i++) g.add(cyl(0.03, 0.5, mat('#33333a'), { x: Math.cos(i / 12 * 6.283) * 1.68, z: Math.sin(i / 12 * 6.283) * 1.68, y: H + 0.18, cast: false }));
    g.add(box(0.9, 1.5, 0.12, mat(shade(trim, -10)), { z: 1.86, y: 0 }));
    for (let i = 0; i < 3; i++) g.add(box(0.36, 0.5, 0.08, mat('#2e4050'), { z: 1.72 - i * 0.2, y: 2.4 + i * 2.2 }));
    g.userData.top = H + 2.6; return g;
  }
  const floors = floorsOf(b, kind);
  let H = kind === 'tower' ? 2.6 + floors * 0.62 : kind === 'industrial' || kind === 'hangar' ? 3.6 : kind === 'barn' ? 3.0 : floors * STOREY + (kind === 'civic' ? 0.5 : kind === 'shop' ? 0.6 : 0);
  const fullH = H; const cutTop = limit && H > limit + 1;
  const doorAt = b.door ? b.door.x - b.x + 0.5 : null;
  const fs = facade(b, kind, b.w, H, 's', opts, doorAt), fe = facade(b, kind, b.h, H, 'e', opts, null);
  const ms = wallMat(fs, opts.lit), me = wallMat(fe, opts.lit), plain = mat(shade(wall, -10));
  if (cutTop) { H = limit; for (const f of [fs, fe]) for (const t of [f.map, f.emissiveMap]) { t.repeat.set(1, H / fullH); t.offset.set(0, 0); } }
  const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, H, b.h), [me, me, plain, plain, ms, ms]); body.position.y = H / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  g.userData.top = H + 1;
  const flat = b.flatRoof || kind === 'tower' || kind === 'shack' || kind === 'civic' || kind === 'hangar';
  if (cutTop) { // a tall building that would stand between the camera and the player is cut to its lower floors (the upper floors still exist — they are just not drawn)
    const cvx = canvas(64, 64), cx = cvx.getContext('2d'); cx.fillStyle = '#1a1c24'; cx.fillRect(0, 0, 64, 64); cx.strokeStyle = 'rgba(232,215,106,0.5)'; cx.lineWidth = 3; for (let i = -64; i < 64; i += 16) { cx.beginPath(); cx.moveTo(i, 0); cx.lineTo(i + 64, 64); cx.stroke(); } const t = tex(cvx, { repeat: true }); t.repeat.set(b.w / 2, b.h / 2);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), new THREE.MeshLambertMaterial({ map: t, emissive: '#30301a' })); top.rotation.x = -Math.PI / 2; top.position.y = H + 0.01; g.add(top); g.add(box(b.w + 0.1, 0.12, b.h + 0.1, mat('#e8d76a', { emissive: '#5a5020' }), { y: H - 0.12, cast: false })); g.userData.top = H + 1.2; g.userData.cutTop = floors;
  } else if (kind === 'hangar') { // a barrel vault
    const r = b.h / 2; const arch = new THREE.Mesh(new THREE.CylinderGeometry(r, r, b.w, 20, 1, false, 0, Math.PI), new THREE.MeshLambertMaterial({ map: roofTex(snow ? '#e8edf2' : roofC, 'metal', snow), side: THREE.DoubleSide })); arch.rotation.z = Math.PI / 2; arch.rotation.y = 0; arch.scale.set(0.42, 1, 1); arch.position.y = H; arch.castShadow = true; g.add(arch);
    const endm = mat(shade(wall, -6)); for (const sx of [-1, 1]) { const e2 = new THREE.Mesh(new THREE.CircleGeometry(r, 20, 0, Math.PI), endm); e2.scale.set(1, 0.42, 1); e2.rotation.y = sx * Math.PI / 2; e2.position.set(sx * b.w / 2, H, 0); g.add(e2); }
    g.userData.top = H + r * 0.42 + 0.6;
  } else if (flat) {
    const rt = roofTex(snow ? '#e8edf2' : kind === 'shack' ? '#6f6a66' : shade(roofC, -6), kind === 'shack' ? 'metal' : 'gravel', snow); rt.repeat.set(b.w / 4, b.h / 4);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(b.w - 0.3, b.h - 0.3), new THREE.MeshLambertMaterial({ map: rt })); top.rotation.x = -Math.PI / 2; top.position.y = H + 0.02; top.receiveShadow = true; g.add(top);
    const pm = mat(shade(kind === 'tower' ? trim : wall, 8)); const ph = kind === 'shack' ? 0.12 : 0.38;
    g.add(box(b.w, ph, 0.16, pm, { y: H, z: b.h / 2 - 0.08 }), box(b.w, ph, 0.16, pm, { y: H, z: -b.h / 2 + 0.08 }), box(0.16, ph, b.h, pm, { y: H, x: b.w / 2 - 0.08 }), box(0.16, ph, b.h, pm, { y: H, x: -b.w / 2 + 0.08 }));
    if (kind !== 'shack') { // roof plant: units, vents, a stair head
      const n = Math.max(1, Math.round(b.w * b.h / 40));
      for (let i = 0; i < Math.min(n, 6); i++) { const x = (hash(seed, i, 1) - 0.5) * (b.w - 3), z = (hash(seed, i, 2) - 0.5) * (b.h - 3); const k = hash(seed, i, 3); if (k > 0.6) g.add(box(1.3, 0.7, 0.9, mat('#8d9297'), { x, z, y: H }), cyl(0.3, 0.08, mat('#3c4046'), { x, z, y: H + 0.7 })); else if (k > 0.3) g.add(cyl(0.22, 0.6, mat('#7d8288'), { x, z, y: H }), cyl(0.3, 0.12, mat('#5b6066'), { x, z, y: H + 0.6 })); else g.add(box(1.6, 1.3, 1.6, mat(shade(wall, -14)), { x, z, y: H }), box(1.8, 0.1, 1.8, mat('#55585e'), { x, z, y: H + 1.3 })); }
      if (b.helipad) { const cvh = canvas(128, 128), ch = cvh.getContext('2d'); ch.fillStyle = '#4a4d54'; ch.fillRect(0, 0, 128, 128); ch.strokeStyle = '#e8d76a'; ch.lineWidth = 6; ch.beginPath(); ch.arc(64, 64, 52, 0, 7); ch.stroke(); ch.fillStyle = '#f0f0ea'; ch.font = 'bold 70px sans-serif'; ch.textAlign = 'center'; ch.textBaseline = 'middle'; ch.fillText('H', 64, 68); const hp = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshLambertMaterial({ map: tex(cvh) })); hp.rotation.x = -Math.PI / 2; hp.position.y = H + 0.05; g.add(hp); }
      if (kind === 'tower' && hash(seed, 9) > 0.4) g.add(cyl(0.06, 3.2, mat('#9a9ea4'), { y: H + 0.3, x: b.w / 4, z: -b.h / 4 }), box(0.12, 0.12, 0.12, mat('#ff4a3a', { emissive: '#ff2a1a', ei: opts.night ? 2 : 0.2 }), { y: H + 3.5, x: b.w / 4, z: -b.h / 4, cast: false }));
    }
    if (b.dome) { const dr = Math.min(b.w, b.h) * 0.26; g.add(cyl(dr * 1.05, 1.3, mat(shade(wall, 6)), { y: H, seg: 20 })); const dm = new THREE.Mesh(new THREE.SphereGeometry(dr, 22, 12, 0, 6.3, 0, Math.PI / 2), mat(snow ? '#dfe6ec' : '#4f8a84')); dm.position.y = H + 1.3; dm.castShadow = true; g.add(dm, cyl(0.16, 0.9, mat('#d9c07a'), { y: H + 1.3 + dr })); g.userData.top = H + dr + 2.6; }
    if (b.pediment || (kind === 'civic' && b.columns)) { const pw = Math.min(b.w * 0.5, 9); const sh = new THREE.Shape(); sh.moveTo(-pw / 2, 0); sh.lineTo(pw / 2, 0); sh.lineTo(0, 1.25); const pg = new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false }); const pm2 = new THREE.Mesh(pg, mat(shade(wall, 14))); pm2.position.set((doorAt ?? b.w / 2) - b.w / 2, H - 0.25, b.h / 2 - 0.1); pm2.castShadow = true; g.add(pm2); }
  } else {
    const mtl = new THREE.MeshLambertMaterial({ map: roofTex(snow ? '#e8edf2' : roofC, kind === 'barn' || kind === 'industrial' ? 'metal' : 'shingle', snow), side: THREE.DoubleSide }); mtl.userData.flat = new THREE.Color(snow ? '#e8edf2' : roofC);
    const rise = Math.min(b.w, b.h) * (kind === 'barn' ? 0.42 : 0.3) + 0.3; const hip = kind !== 'barn' && hash(seed, 4) > 0.55;
    const rf = pitched(b.w, b.h, rise, 0.32, hip, mtl, mat(shade(wall, 4), { double: true })); rf.position.y = H; g.add(rf);
    const fm = mat(snow ? '#dfe5ea' : shade(trim, 6)); const alongX = b.w >= b.h;
    g.add(box(b.w + 0.7, 0.14, 0.1, fm, { y: H - 0.1, z: b.h / 2 + 0.34 }), box(0.1, 0.14, b.h + 0.7, fm, { y: H - 0.1, x: b.w / 2 + 0.34 }), box(b.w + 0.7, 0.14, 0.1, fm, { y: H - 0.1, z: -b.h / 2 - 0.34 }), box(0.1, 0.14, b.h + 0.7, fm, { y: H - 0.1, x: -b.w / 2 - 0.34 }));
    const inset = hip ? Math.min((alongX ? b.h : b.w) / 2 + 0.32, ((alongX ? b.w : b.h) / 2 + 0.32) * 0.6) : 0; const rl = (alongX ? b.w : b.h) + 0.64 - inset * 2;
    if (rl > 0.3) g.add(alongX ? box(rl, 0.1, 0.22, mat(snow ? '#f2f5f8' : shade(roofC, -34)), { y: H + rise - 0.03 }) : box(0.22, 0.1, rl, mat(snow ? '#f2f5f8' : shade(roofC, -34)), { y: H + rise - 0.03 }));
    if (kind === 'house' && alongX && b.w >= 8) for (const dxx of [-b.w * 0.22, b.w * 0.22]) { const dz = b.h / 2 * 0.52; const dy = H + rise * 0.48 - 0.25; g.add(box(1.1, 0.8, 1.2, mat(wall), { x: dxx, z: dz, y: dy }), box(0.6, 0.48, 0.05, mat('#31465a', { emissive: opts.lit && hash(seed, dxx * 10) > 0.4 ? '#ffd58a' : '#000', ei: 1.5 }), { x: dxx, z: dz + 0.6, y: dy + 0.18, cast: false }), box(1.3, 0.1, 1.4, mat(snow ? '#e8edf2' : shade(roofC, -14)), { x: dxx, z: dz, y: dy + 0.8 })); }
    if (kind === 'house' || kind === 'shop') { const cx = (hash(seed, 6) - 0.5) * b.w * 0.5, cz = -b.h * 0.12; g.add(box(0.55, rise + 0.7, 0.55, mat('#8a4f40'), { x: cx, z: cz, y: H }), box(0.68, 0.12, 0.68, mat(snow ? '#e8edf2' : '#5d5550'), { x: cx, z: cz, y: H + rise + 0.7 })); }
    if (kind === 'industrial') { const n = Math.max(2, Math.round(Math.max(b.w, b.h) / 5)); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n - 0.5; const x = b.w >= b.h ? t * b.w * 0.8 : 0, z = b.w >= b.h ? 0 : t * b.h * 0.8; g.add(cyl(0.34, 0.5, mat('#8d9297'), { x, z, y: H + rise - 0.1, seg: 10 }), cyl(0.44, 0.1, mat('#6d7277'), { x, z, y: H + rise + 0.4, seg: 10 })); } if (/refinery|foundry|works|cannery/i.test(b.name)) for (const sx of [-1, 1]) { const x = sx * (b.w / 2 - 1.6), z = -b.h / 2 + 1.5; g.add(cyl(0.42, 4.6, mat('#9a9288'), { x, z, y: H, seg: 12, rt: 0.32 }), cyl(0.36, 0.3, mat('#8a3a2e'), { x, z, y: H + 3.6, seg: 12 }), cyl(0.36, 0.12, mat('#2a2a2e'), { x, z, y: H + 4.6, seg: 12 })); } }
    g.userData.top = H + rise + 1;
  }
  // --- the shopfront kit: columns, awning, sign, step, lamp over the door
  const zf = b.h / 2;
  if (b.columns) { const n = Math.max(2, Math.min(8, Math.round(b.w / 3.2))); const cw = Math.min(b.w - 2, n * 3); const cx0 = (doorAt ?? b.w / 2) - b.w / 2; const ch = Math.min(H, kind === 'tower' ? 3.2 : H) - 0.3; for (let i = 0; i < n; i++) { const x = Math.max(-b.w / 2 + 0.5, Math.min(b.w / 2 - 0.5, cx0 - cw / 2 + (i + 0.5) * (cw / n))); if (doorAt !== null && Math.abs(x - cx0) < 0.6) continue; g.add(cyl(0.2, ch, mat('#e2dccf'), { x, z: zf + 0.75, seg: 10 }), box(0.56, 0.14, 0.56, mat('#d2ccbf'), { x, z: zf + 0.75 }), box(0.56, 0.14, 0.56, mat('#d2ccbf'), { x, z: zf + 0.75, y: ch })); } g.add(box(cw + 0.8, 0.34, 1.5, mat(shade(wall, 10)), { x: cx0, z: zf + 0.5, y: ch + 0.14 })); }
  if (b.awning && doorAt !== null) { const aw = Math.min(b.w - 1, 6); const cva = canvas(64, 16), ca = cva.getContext('2d'); const ac = mute(b.awning, 0.1); for (let i = 0; i < 8; i++) { ca.fillStyle = i % 2 ? ac : '#efe6d4'; ca.fillRect(i * 8, 0, 8, 16); } if (snow) { ca.fillStyle = 'rgba(236,241,246,0.8)'; ca.fillRect(0, 0, 64, 9); } const am = new THREE.Mesh(new THREE.BoxGeometry(aw, 0.06, 1.2), new THREE.MeshLambertMaterial({ map: tex(cva) })); am.position.set(doorAt - b.w / 2, 2.0, zf + 0.52); am.rotation.x = 0.36; am.castShadow = true; g.add(am); }
  if (b.sign && doorAt !== null && kind !== 'house') { const t = textMat(b.sign, { fg: b.signColor ? '#fff6e0' : '#f4ecd8', bg: mute(b.signColor || shade(trim, -12), 0.1), border: 'rgba(255,255,255,0.35)', glow: opts.night ? 0.9 : 0 }); const sh = 0.5, sw = Math.min(b.w - 0.6, sh * t.aspect); const sy = kind === 'tower' ? 2.75 : Math.min(H - 0.56, b.awning ? 2.5 : 2.2); g.add(box(sw + 0.12, sh + 0.12, 0.1, mat('#2a2622'), { x: doorAt - b.w / 2, y: sy - 0.06, z: zf + 0.06 })); g.add(board(sw, sh, t.material, { x: doorAt - b.w / 2, y: sy, z: zf + 0.125 })); }
  if (doorAt !== null) { g.add(box(1.5, 0.08, 0.5, mat(snow ? '#e3e8ee' : '#9a958c'), { x: doorAt - b.w / 2, z: zf + 0.25, y: -0.02 })); if (opts.night && kind !== 'tower') lights.push({ x: bx + doorAt, y: 2.0, z: by + b.h + 0.6, color: '#ffc880', intensity: 6, dist: 6, prio: -2 }); }
  if (opts.night && kind === 'tower') lights.push({ x: bx + (doorAt ?? b.w / 2), y: 2.4, z: by + b.h + 1.0, color: '#cfe0ff', intensity: 9, dist: 8 });
  return g;
}

// ------------------------------------------------------------------ the cut-away room
function innerWallTex(floor, wUnits, H, windows, seed, opts) {
  const W = Math.round(wUnits * FP), HH = Math.round(H * FP); const cv = canvas(W, HH), em = canvas(W, HH); const c = cv.getContext('2d'), e = em.getContext('2d'); e.fillStyle = '#000'; e.fillRect(0, 0, W, HH);
  const sch = { f: ['#d8c9a8', '#7a5a3c'], t: ['#dfe3dc', '#a8b5ad'], c: ['#5d6e62', '#4a3528'], g: ['#a9aaa6', '#7b7d7a'] }[floor] || ['#d5ccba', '#7a6a55'];
  c.fillStyle = sch[0]; c.fillRect(0, 0, W, HH);
  if (floor === 'f') for (let x = 0; x < W; x += 10) { c.fillStyle = 'rgba(150,120,80,0.16)'; c.fillRect(x, 0, 4, HH); }
  if (floor === 'c') for (let x = 0; x < W; x += 14) for (let y = (x / 14 % 2) * 7; y < HH; y += 14) { c.fillStyle = 'rgba(220,200,150,0.14)'; c.fillRect(x + 5, y + 5, 3, 3); }
  if (floor === 'g') for (let y = 0, r = 0; y < HH; y += 8, r++) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, y, W, 1); for (let x = (r % 2) * 10; x < W; x += 20) c.fillRect(x, y, 1, 8); }
  const wh = floor === 't' ? HH * 0.5 : HH * 0.36; c.fillStyle = sch[1]; c.fillRect(0, HH - wh, W, wh);
  if (floor === 't') { for (let x = 0; x < W; x += 8) { c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x, HH - wh, 1, wh); } for (let y = HH - wh; y < HH; y += 8) { c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(0, y, W, 1); } }
  else { c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(0, HH - wh, W, 2); for (let x = 0; x < W; x += 16) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, HH - wh, 1, wh); } }
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, HH - 4, W, 4);
  const g = c.createLinearGradient(0, 0, 0, 14); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 14);
  for (const wx of windows) { const x = wx * FP; const ww = 22, hh = 26, y = HH * 0.2; c.fillStyle = '#4a3a2c'; c.fillRect(x - ww / 2 - 3, y - 3, ww + 6, hh + 6); const day = !opts.night; c.fillStyle = day ? '#bfe0ee' : '#1c2740'; c.fillRect(x - ww / 2, y, ww, hh); if (day) { e.fillStyle = '#5a7884'; e.fillRect(x - ww / 2, y, ww, hh); } c.fillStyle = '#4a3a2c'; c.fillRect(x - 1, y, 2, hh); c.fillRect(x - ww / 2, y + hh / 2 - 1, ww, 2); c.fillStyle = '#e8e0cf'; c.fillRect(x - ww / 2 - 5, y + hh + 3, ww + 10, 3); }
  return new THREE.MeshLambertMaterial({ map: tex(cv), emissiveMap: tex(em), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1 });
}

/** The room you are in: far walls stand, near walls are cut to a kerb, no roof — the same walls as the roofed building. */
export function buildCutaway(b, I, bx, by, opts, lights) {
  const g = new THREE.Group(); g.position.set(bx, 0.12, by);
  const H = STOREY; const th = 0.22; const wall = mute(b.wall || '#cfc4ae', 0.18), trim = mute(b.trim || '#5a4a3e', 0.15);
  const rows = I.rows, w = I.w, h = I.h; const seed = strHash(b.id);
  const floorAt = (x, y) => { const ch = rows[y]?.[x]; return ch && ch !== 'W' && ch !== 'D' ? ch : null; };
  const mainFloor = floorAt(1, 1) || 'f';
  const winN = I.props.filter((p) => p.type === 'window' && p.y === 0).map((p) => p.x + 0.5);
  const outer = facadeLite(wall, w, H), capM = mat('#2c2824'), stubM = mat(shade(wall, -8));
  // north wall (full height), west wall (full height)
  const nIn = innerWallTex(mainFloor, w, H, winN, seed, opts);
  const north = new THREE.Mesh(new THREE.BoxGeometry(w, H, th), [stubM, stubM, capM, capM, nIn, outer]); north.position.set(w / 2, H / 2, th / 2); north.castShadow = true; north.receiveShadow = true; g.add(north);
  const wIn = innerWallTex(floorAt(1, h - 2) || mainFloor, h, H, [], seed + 1, opts);
  const west = new THREE.Mesh(new THREE.BoxGeometry(th, H, h), [wIn, outer, capM, capM, stubM, stubM]); west.position.set(th / 2, H / 2, h / 2); west.castShadow = true; west.receiveShadow = true; g.add(west);
  // near walls: stubs, with the doorway left open
  const stubH = 0.34; const door = I.doors.find((d) => d.y === h - 1) || (b.door ? { x: b.door.x - b.x, y: h - 1 } : null);
  const seg = (x0, x1) => { if (x1 - x0 < 0.05) return; g.add(box(x1 - x0, stubH, th, stubM, { x: (x0 + x1) / 2, z: h - th / 2 }), box(x1 - x0, 0.03, th, capM, { x: (x0 + x1) / 2, z: h - th / 2, y: stubH, cast: false })); };
  if (door) { seg(0, door.x - 0.05); seg(door.x + 1.05, w); for (const dx of [door.x - 0.02, door.x + 1.02]) g.add(box(0.1, 1.95, th + 0.04, mat(trim), { x: dx, z: h - th / 2 })); g.add(box(1.14, 0.1, th + 0.04, mat(trim), { x: door.x + 0.5, z: h - th / 2, y: 1.95 })); const leaf = box(0.92, 1.9, 0.07, mat(mix(trim, '#7a5536', 0.6)), { x: 0.46, z: 0 }); const hinge = group(door.x + 0.03, 0, h - th / 2, leaf); hinge.rotation.y = 1.25; g.add(hinge); } else seg(0, w);
  g.add(box(th, stubH, h, stubM, { x: w - th / 2, z: h / 2 }), box(th, 0.03, h, capM, { x: w - th / 2, z: h / 2, y: stubH, cast: false }));
  // partitions from the grid: runs of W inside the room
  const done = new Set();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (rows[y][x] !== 'W' || done.has(`${x},${y}`)) continue;
    let ex = x; while (ex + 1 < w - 1 && rows[y][ex + 1] === 'W') ex++;
    let ey = y; while (ey + 1 < h - 1 && rows[ey + 1][x] === 'W') ey++;
    const horiz = ex - x >= ey - y; const len = horiz ? ex - x + 1 : ey - y + 1;
    for (let k = 0; k < len; k++) done.add(horiz ? `${x + k},${y}` : `${x},${y + k}`);
    const ph = horiz ? H : 1.05; // a wall that faces you stands; one that would hide the next room is cut low
    const pin = innerWallTex(floorAt(x, y + 1) || floorAt(x + 1, y) || mainFloor, len, ph, [], seed + x + y, opts);
    const a0 = horiz ? (rows[y][x - 1] === 'W' ? x : x) : y; const m = horiz ? new THREE.Mesh(new THREE.BoxGeometry(len, ph, th), [stubM, stubM, capM, capM, pin, pin]) : new THREE.Mesh(new THREE.BoxGeometry(th, ph, len), [pin, pin, capM, capM, stubM, stubM]);
    m.position.set(horiz ? x + len / 2 : x + 0.5, ph / 2, horiz ? y + 0.5 : y + len / 2); m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  // the outside dress the roofed version has, kept so the place is still itself: step and sign post
  if (door) g.add(box(1.5, 0.08, 0.5, mat('#9a958c'), { x: door.x + 0.5, z: h + 0.25, y: -0.04 }));
  if (b.sign && door) { const t = textMat(b.sign, { bg: mute(b.signColor || shade(trim, -12), 0.1), border: 'rgba(255,255,255,0.35)', glow: opts.night ? 0.9 : 0 }); const sh = 0.46, sw = sh * t.aspect; const px = Math.min(w - sw / 2 - 0.4, door.x + 2.4 + sw / 2); g.add(cyl(0.05, 1.5, mat('#3a3632'), { x: px - sw / 2 + 0.1, z: h + 0.5 }), cyl(0.05, 1.5, mat('#3a3632'), { x: px + sw / 2 - 0.1, z: h + 0.5 }), box(sw + 0.1, sh + 0.1, 0.08, mat('#2a2622'), { x: px, y: 1.0, z: h + 0.5 }), board(sw, sh, t.material, { x: px, y: 1.05, z: h + 0.55 })); }
  // proposed room dressing (not in today's data): wall lamps, a doormat, a board behind a counter
  for (let x = 2.5; x < w - 1; x += 4) { if (winN.some((q) => Math.abs(q - x) < 1)) continue; g.add(box(0.1, 0.1, 0.16, mat('#3a3632'), { x, y: 1.75, z: th + 0.08, cast: false }), box(0.2, 0.2, 0.2, mat('#fff0c8', { emissive: '#ffd58a', ei: opts.night ? 3 : 0.6 }), { x, y: 1.6, z: th + 0.2, cast: false })); if (opts.night) lights.push({ x: bx + x, y: 1.7, z: by + 0.9, color: '#ffd090', intensity: 7, dist: 7, prio: 6 }); }
  if (door) g.add(box(0.9, 0.02, 0.5, mat('#5a4a3a'), { x: door.x + 0.5, z: h - 0.75, cast: false }));
  const ctr = I.props.find((p) => p.type === 'counter'); if (ctr && ctr.y <= 4) { const t = textMat("TODAY'S BAKES", { bg: '#26302c', fg: '#e8e2d2', font: 'bold 30px "Trebuchet MS", sans-serif', border: '#8a6a48' }); g.add(board(1.7, 0.62, t.material, { x: Math.min(w - 2, ctr.x + (ctr.w || 2) + 1.4), y: 1.2, z: th + 0.02 })); }
  // room light
  const rl = opts.night ? 16 : 0;
  if (rl) for (let i = 0; i < Math.max(1, Math.round(w / 7)); i++) lights.push({ x: bx + (i + 0.5) * (w / Math.max(1, Math.round(w / 7))), y: 2.1, z: by + h / 2, color: '#ffd9a0', intensity: rl, dist: 10, prio: 6 });
  g.userData.top = H + 0.6; g.userData.cut = true;
  return g;
}

function facadeLite(wall, w, H) { const cv = canvas(64, 64); const c = cv.getContext('2d'); c.fillStyle = wall; c.fillRect(0, 0, 64, 64); for (let y = 0, r = 0; y < 64; y += 5, r++) { c.fillStyle = shade(wall, -24); c.fillRect(0, y, 64, 1); for (let x = (r % 2) * 6; x < 64; x += 12) c.fillRect(x, y, 1, 5); } const t = tex(cv, { repeat: true }); t.repeat.set(w / 2, H / 2); return new THREE.MeshLambertMaterial({ map: t }); }
