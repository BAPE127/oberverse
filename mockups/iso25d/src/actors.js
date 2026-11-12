// CONCEPT STUDY ONLY — people and vehicles as small rigid-part models, built from the game's own
// `appearance` and vehicle-model data, so the same record that drives the simulation drives the look.
import { THREE, hash, strHash, shade, mix, mute, box, cyl, cone, blob, group, mat } from './lib.js';

const FACING = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };

/** appearance: { skin, hair, hairStyle, outfit, accent, accessory, build, height, apron } */
export function person(app = {}, o = {}) {
  const s = strHash(String(o.seed || 'x')); const a = app || {};
  const skin = a.skin || '#d9a77c', hair = a.hair || '#3a2f2a', outfit = mute(a.outfit || '#5a6a7a', 0.1), accent = a.accent || '#d9c07a';
  const wide = { thin: 0.86, wiry: 0.9, average: 1, broad: 1.16, round: 1.22 }[a.build] || 1; const hgt = a.height || 1;
  const kit = o.kit; const trousers = kit === 'soldier' ? '#4a5238' : kit === 'police' ? '#1f2a44' : shade(mix(outfit, '#2a2c38', 0.72), 0);
  const top = kit === 'soldier' ? '#59633f' : kit === 'police' ? '#27375c' : outfit;
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body); body.scale.set(1, hgt, 1);
  const ph = o.walk == null ? null : o.walk * Math.PI * 2; const sw = ph == null ? 0 : Math.sin(ph) * 0.55;
  const limb = (w, h, d, col, x, y, rot, extra) => { const piv = new THREE.Group(); piv.position.set(x, y, 0); const m = box(w, h, d, mat(col), { y: -h }); piv.add(m); if (extra) piv.add(extra); piv.rotation.x = rot; return piv; };
  // legs and shoes
  for (const sd of [-1, 1]) body.add(limb(0.17 * wide, 0.42, 0.19, trousers, sd * 0.1 * wide, 0.44, sd * sw, box(0.18 * wide, 0.08, 0.26, mat('#2a2622'), { y: -0.44, z: 0.03 })));
  // torso
  body.add(box(0.42 * wide, 0.46, 0.26 * (a.build === 'round' ? 1.25 : 1), mat(top), { y: 0.42 }));
  body.add(box(0.44 * wide, 0.06, 0.28, mat(shade(trousers, -14)), { y: 0.41 })); // belt
  if (a.accessory === 'apron' || a.apron) body.add(box(0.34 * wide, 0.5, 0.03, mat(a.apron || '#f1ece0'), { y: 0.26, z: 0.15, cast: false }));
  if (a.accessory === 'scarf') body.add(box(0.36 * wide, 0.1, 0.32, mat(accent), { y: 0.82 }), box(0.1, 0.26, 0.04, mat(accent), { y: 0.58, x: 0.1, z: 0.15, cast: false }));
  if (kit === 'soldier') body.add(box(0.46 * wide, 0.34, 0.31, mat('#3d4530'), { y: 0.5 }), box(0.12, 0.1, 0.06, mat('#2e3424'), { y: 0.56, x: -0.1, z: 0.17 }), box(0.12, 0.1, 0.06, mat('#2e3424'), { y: 0.56, x: 0.08, z: 0.17 }), box(0.3, 0.36, 0.14, mat('#454d34'), { y: 0.48, z: -0.2 }));
  if (kit === 'police') body.add(box(0.07, 0.07, 0.02, mat('#e8d76a'), { y: 0.72, x: -0.1, z: 0.14, cast: false }));
  if (!kit && hash(s, 3) > 0.5) body.add(box(0.06, 0.38, 0.02, mat(accent), { y: 0.48, z: 0.135, cast: false })); // a tie, a placket
  // arms (one may carry)
  for (const sd of [-1, 1]) { const carry = o.holding && sd === 1; const hand = box(0.11, 0.1, 0.12, mat(skin), { y: -0.44 }); const arm = limb(0.12, 0.36, 0.14, top, sd * (0.27 * wide), 0.86, carry ? -1.15 : -sd * sw * 0.9, hand); if (carry) { const it = o.holding; if (it === 'rifle') arm.add(box(0.06, 0.1, 0.78, mat('#2a2c30'), { y: -0.46, z: 0.2 }), box(0.07, 0.16, 0.2, mat('#4a3626'), { y: -0.5, z: -0.14 })); else if (it === 'pistol') arm.add(box(0.05, 0.1, 0.24, mat('#2a2c30'), { y: -0.5, z: 0.12 })); else if (it === 'crowbar') arm.add(box(0.04, 0.04, 0.6, mat('#a8301e'), { y: -0.46, z: 0.2 })); else if (it === 'tray') arm.add(box(0.36, 0.03, 0.3, mat('#b8bcc0'), { y: -0.48, z: 0.22 }), blob(0.07, '#c98a4a', { y: -0.4, z: 0.22, detail: 0 })); else if (it === 'wrench') arm.add(box(0.05, 0.05, 0.4, mat('#b8bcc0'), { y: -0.46, z: 0.16 })); else if (it === 'clipboard') arm.add(box(0.22, 0.3, 0.03, mat('#e8e2d2'), { y: -0.5, z: 0.12 })); } body.add(arm); }
  // head (large, as the game draws people), face, hair by style
  const hy = 0.92; const head = new THREE.Group(); head.position.y = hy; body.add(head);
  head.add(box(0.4, 0.38, 0.36, mat(skin)), box(0.05, 0.06, 0.02, mat('#2a2420'), { x: -0.09, y: 0.19, z: 0.185, cast: false }), box(0.05, 0.06, 0.02, mat('#2a2420'), { x: 0.09, y: 0.19, z: 0.185, cast: false }));
  const st = kit === 'soldier' ? 'helmet' : kit === 'police' ? 'cap' : a.hairStyle || 'short';
  const H = (w, h, d, col, x, y, z) => head.add(box(w, h, d, mat(col), { x, y, z }));
  if (st === 'bald') H(0.42, 0.04, 0.38, shade(skin, -8), 0, 0.36, 0);
  else if (st === 'helmet') { H(0.48, 0.2, 0.46, '#4d5638', 0, 0.3, 0); H(0.5, 0.05, 0.5, '#434b30', 0, 0.27, 0); }
  else if (st === 'hardhat') { H(0.46, 0.16, 0.42, '#f0c23a', 0, 0.32, 0); H(0.5, 0.04, 0.54, '#e0b22a', 0, 0.3, 0.04); }
  else if (st === 'cap' || st === 'captain') { const cc = kit === 'police' ? '#1f2a44' : st === 'captain' ? '#f1ece0' : accent; H(0.44, 0.13, 0.4, cc, 0, 0.34, 0); H(0.4, 0.035, 0.2, shade(cc, -30), 0, 0.33, 0.26); H(0.44, 0.1, 0.38, hair, 0, 0.26, -0.03); }
  else if (st === 'hat' || st === 'tophat' || st === 'wizard') { const hc = st === 'tophat' ? '#22201e' : st === 'wizard' ? '#3a2f6a' : shade(mix(outfit, '#3a3026', 0.5), -10); H(0.64, 0.04, 0.6, hc, 0, 0.36, 0); if (st === 'wizard') head.add(cone(0.22, 0.6, mat(hc), { y: 0.4, seg: 8 })); else H(0.38, st === 'tophat' ? 0.38 : 0.18, 0.34, hc, 0, 0.4, 0); if (st === 'tophat') H(0.4, 0.06, 0.36, accent, 0, 0.42, 0); H(0.42, 0.08, 0.38, hair, 0, 0.28, -0.03); }
  else { H(0.44, 0.14, 0.4, hair, 0, 0.3, -0.01); H(0.44, 0.24, 0.1, hair, 0, 0.12, -0.17); if (st === 'bun') head.add(blob(0.13, hair, { y: 0.5, z: -0.12, detail: 0 })); if (st === 'ponytail') H(0.12, 0.34, 0.1, hair, 0, -0.12, -0.24); if (st === 'long') { H(0.46, 0.4, 0.1, hair, 0, -0.14, -0.19); H(0.06, 0.34, 0.3, hair, -0.21, -0.02, -0.03); H(0.06, 0.34, 0.3, hair, 0.21, -0.02, -0.03); } if (st === 'curly' || st === 'messy') for (let i = 0; i < 5; i++) head.add(blob(0.11, hair, { x: (hash(s, i, 1) - 0.5) * 0.36, y: 0.42 + hash(s, i, 2) * 0.05, z: (hash(s, i, 3) - 0.5) * 0.3, detail: 0 })); if (st === 'parted') H(0.2, 0.05, 0.42, shade(hair, 14), -0.1, 0.42, -0.01); }
  if (a.accessory === 'glasses') { H(0.14, 0.09, 0.02, '#1c1c22', -0.09, 0.17, 0.19); H(0.14, 0.09, 0.02, '#1c1c22', 0.09, 0.17, 0.19); }
  if (a.accessory === 'goggles') H(0.42, 0.1, 0.04, '#c9a43a', 0, 0.26, 0.18);
  if (a.hairStyle === 'tophat' || /mustache|moustache/.test(a.accessory || '')) H(0.2, 0.05, 0.03, '#f1ece0', 0, 0.08, 0.19);
  body.rotation.y = typeof o.facing === 'number' ? o.facing : FACING[o.facing] ?? 0;
  if (ph != null) body.position.y = Math.abs(Math.cos(ph)) * 0.035;
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

function wheel(r, w, x, z) { const m = cyl(r, w, '#1b1b1f', { seg: 14 }); m.rotation.x = Math.PI / 2; m.position.set(x, r, z); const hub = cyl(r * 0.5, w + 0.02, '#9a9ea4', { seg: 10 }); hub.rotation.x = Math.PI / 2; hub.position.set(x, r, z); return [m, hub]; }
const GLASS = () => new THREE.MeshLambertMaterial({ color: '#2c3e4e', emissive: '#0a1420' });

/** c: { body, len, wid, color } — the model faces +x; the caller turns it by the simulation's angle. */
export function vehicle(c, o = {}) {
  const g = new THREE.Group(); const L = c.len || 2.3, W = c.wid || 1.2; const col = mute(c.color || '#8a8f94', 0.08); const body = c.body || 'saloon'; const night = o.opts?.night; const snow = o.opts?.weather === 'snow';
  const lampF = mat('#fff6d8', { emissive: '#ffe9b0', ei: night ? 4 : 0.3 }), lampR = mat('#b8261e', { emissive: '#ff2a1a', ei: night ? 2.2 : 0.2 });
  const lightsOn = (y = 0.5) => { if (!night || c.parked) return; for (const sz of [-1, 1]) o.lights.push({ x: c.x + Math.cos(c.angle) * (L / 2 + 0.2) - Math.sin(c.angle) * sz * W * 0.3, y, z: c.y + Math.sin(c.angle) * (L / 2 + 0.2) + Math.cos(c.angle) * sz * W * 0.3, color: '#fff0c8', intensity: 46, dist: 13, spot: [Math.cos(c.angle) * 6, -1.3, Math.sin(c.angle) * 6], angle: 0.44, prio: 20 }); };
  const lamps = (y, x0 = L / 2, x1 = -L / 2) => { for (const sz of [-1, 1]) g.add(box(0.05, 0.12, 0.22, lampF, { x: x0, y, z: sz * (W / 2 - 0.2), cast: false }), box(0.05, 0.1, 0.22, lampR, { x: x1, y, z: sz * (W / 2 - 0.2), cast: false })); };
  const wheels = (r, xs, wz = W / 2 - 0.06) => { for (const x of xs) for (const sz of [-1, 1]) g.add(...wheel(r, 0.2, x, sz * wz)); };
  const cabin = (x, len, h, y, wscale = 0.86, slopeF = 0.3, slopeR = 0.2) => { const sh = new THREE.Shape(); sh.moveTo(-len / 2, 0); sh.lineTo(len / 2, 0); sh.lineTo(len / 2 - slopeF, h); sh.lineTo(-len / 2 + slopeR, h); const ge = new THREE.ExtrudeGeometry(sh, { depth: W * wscale, bevelEnabled: false }); const m = new THREE.Mesh(ge, GLASS()); m.position.set(x, y, -W * wscale / 2); m.castShadow = true; g.add(m); g.add(box(len - slopeF - slopeR + 0.04, 0.05, W * wscale + 0.02, mat(snow ? '#edf1f5' : col), { x: x + (slopeR - slopeF) / 2, y: y + h })); for (const px of [x - len / 2 + slopeR + 0.02, x + len / 2 - slopeF - 0.02, x]) g.add(box(0.06, h, W * wscale + 0.03, mat(col), { x: px, y })); };
  if (body === 'bus') {
    g.add(box(L, 1.55, W, mat(col), { y: 0.3 }), box(L - 0.3, 0.6, W + 0.02, GLASS(), { y: 1.05 }), box(L + 0.02, 0.1, W + 0.02, mat(shade(col, 30)), { y: 0.72 }), box(L - 0.6, 0.12, W - 0.4, mat(snow ? '#edf1f5' : '#d6d2c6'), { y: 1.85 }));
    for (let i = 0; i < 6; i++) g.add(box(0.06, 0.6, W + 0.03, mat(col), { x: -L / 2 + 0.5 + i * (L - 1) / 5, y: 1.05 }));
    g.add(box(0.04, 0.3, W * 0.7, mat('#111', { emissive: '#ffb02a', ei: 1.2 }), { x: L / 2 + 0.01, y: 1.5, cast: false })); wheels(0.3, [L / 2 - 0.9, -L / 2 + 0.9]); lamps(0.5); lightsOn(0.6); return g;
  }
  if (body === 'tractor') { g.add(box(L * 0.5, 0.55, W * 0.5, mat(col), { x: L * 0.2, y: 0.5 }), box(L * 0.4, 0.9, W * 0.7, new THREE.MeshLambertMaterial({ color: '#9fc0d0', transparent: true, opacity: 0.55 }), { x: -L * 0.2, y: 0.75 }), box(L * 0.44, 0.07, W * 0.76, mat(shade(col, -20)), { x: -L * 0.2, y: 1.65 }), cyl(0.04, 0.7, '#333', { x: L * 0.3, y: 1.05, z: W * 0.15 })); for (const sz of [-1, 1]) { g.add(...wheel(0.58, 0.3, -L * 0.22, sz * W * 0.45), ...wheel(0.32, 0.22, L * 0.32, sz * W * 0.4)); } return g; }
  if (body === 'tank') { g.add(box(L, 0.55, W * 0.62, mat('#59633f'), { y: 0.35 }), box(L * 0.96, 0.5, W * 0.2, mat('#2e3226'), { y: 0.05, z: W * 0.4 }), box(L * 0.96, 0.5, W * 0.2, mat('#2e3226'), { y: 0.05, z: -W * 0.4 }), box(L * 0.42, 0.42, W * 0.6, mat('#4d5638'), { y: 0.9, x: -0.1 }), box(L * 0.2, 0.2, W * 0.3, mat('#434b30'), { y: 1.32, x: -0.3 })); const gun = cyl(0.07, L * 0.62, '#3d4530', { seg: 8 }); gun.rotation.z = -Math.PI / 2; gun.position.set(L * 0.4, 1.1, 0); g.add(gun); for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) g.add(...wheel(0.2, 0.18, -L * 0.42 + i * L * 0.168, sz * W * 0.4)); return g; }
  if (body === 'heli') { const b = '#4d5638'; g.add(blob(0.9, b, { y: 1.35, sy: 0.75, detail: 2 }), box(1.1, 0.6, 0.9, GLASS(), { x: 0.5, y: 1.1 }), box(2.6, 0.26, 0.26, mat(b), { x: -1.9, y: 1.45 }), box(0.12, 0.9, 0.5, mat(b), { x: -3.1, y: 1.3 }), cyl(0.08, 0.4, '#333', { y: 2.0 }), box(6.4, 0.04, 0.26, mat('#2a2c30'), { y: 2.4, ry: 0.5 }), box(6.4, 0.04, 0.26, mat('#2a2c30'), { y: 2.4, ry: 0.5 + Math.PI / 2 })); for (const sz of [-1, 1]) g.add(box(2.2, 0.06, 0.08, mat('#333'), { y: 0.1, z: sz * 0.7 }), box(0.06, 0.6, 0.06, mat('#333'), { y: 0.1, z: sz * 0.7, x: 0.5 }), box(0.06, 0.6, 0.06, mat('#333'), { y: 0.1, z: sz * 0.7, x: -0.5 })); return g; }
  if (body === 'jet') { const b = '#8d9297'; const fus = cyl(0.42, L, mat(b), { seg: 12, rt: 0.2 }); fus.rotation.z = -Math.PI / 2; fus.position.set(0, 1.1, 0); g.add(fus, box(L * 0.3, 0.07, L * 0.8, mat(b), { x: -L * 0.08, y: 1.0 }), box(L * 0.16, 0.06, L * 0.34, mat(b), { x: -L * 0.44, y: 1.15 }), box(L * 0.16, 0.9, 0.07, mat(b), { x: -L * 0.44, y: 1.2 }), box(0.9, 0.3, 0.44, GLASS(), { x: L * 0.2, y: 1.42 }), cyl(0.04, 0.9, '#333', { x: L * 0.3, y: 0.2 }), cyl(0.04, 0.9, '#333', { x: -L * 0.1, y: 0.2, z: 0.7 }), cyl(0.04, 0.9, '#333', { x: -L * 0.1, y: 0.2, z: -0.7 })); return g; }
  // road cars: a lower body, a cabin, the differences by body type
  const low = body === 'gt' || body === 'coupe'; const tall = body === 'pickup' || body === 'truck' || body === 'jeep'; const r = tall ? 0.3 : 0.24; const by = r * 0.75; const bh = tall ? 0.52 : 0.4;
  const paint = body === 'jeep' || body === 'truck' ? '#59633f' : col;
  g.add(box(L, bh, W, mat(paint), { y: by }), box(L + 0.06, 0.12, W * 0.96, mat('#2a2c30'), { y: by - 0.02 }), box(L * 0.3, 0.05, W * 0.96, mat(shade(paint, 14)), { x: L * 0.33, y: by + bh, cast: false }));
  if (body === 'pickup' || body === 'truck') { cabin(L * 0.1, L * 0.34, 0.46, by + bh, 0.9, 0.16, 0.04); g.add(box(L * 0.4, 0.26, 0.06, mat(paint), { x: -L * 0.29, y: by + bh, z: W / 2 - 0.03 }), box(L * 0.4, 0.26, 0.06, mat(paint), { x: -L * 0.29, y: by + bh, z: -W / 2 + 0.03 }), box(0.06, 0.26, W, mat(paint), { x: -L / 2 + 0.03, y: by + bh })); if (body === 'truck') g.add(box(L * 0.44, 0.7, W * 0.98, mat('#4a5238'), { x: -L * 0.27, y: by + bh })); else g.add(box(0.5, 0.36, 0.5, mat('#9a7448'), { x: -L * 0.26, y: by + bh, ry: 0.3 })); }
  else if (body === 'jeep') { g.add(box(0.06, 0.4, W * 0.9, GLASS(), { x: L * 0.12, y: by + bh }), box(L * 0.4, 0.05, W * 0.9, mat('#3d4530'), { x: -L * 0.1, y: by + bh + 0.62 }), box(0.05, 0.62, 0.05, mat('#333'), { x: -L * 0.3, y: by + bh, z: W * 0.42 }), box(0.05, 0.62, 0.05, mat('#333'), { x: -L * 0.3, y: by + bh, z: -W * 0.42 })); }
  else if (body === 'estate' || body === 'hatch') cabin(-L * 0.1, L * (body === 'estate' ? 0.62 : 0.56), 0.4, by + bh, 0.88, 0.3, body === 'estate' ? 0.06 : 0.14);
  else if (body === 'limo') cabin(-L * 0.04, L * 0.66, 0.36, by + bh, 0.88, 0.28, 0.22);
  else cabin(-L * 0.05, L * (low ? 0.42 : 0.5), low ? 0.32 : 0.4, by + bh, 0.86, 0.32, 0.26);
  if (body === 'police') { g.add(box(L * 0.3, bh + 0.01, W + 0.02, mat('#f1ece0'), { x: -L * 0.05, y: by }), box(0.36, 0.1, W * 0.6, mat('#3050c8', { emissive: night ? '#2a4aff' : '#000', ei: 2.5 }), { x: -L * 0.05, y: by + bh + 0.46 })); if (night) o.lights.push({ x: c.x, y: 1.4, z: c.y, color: '#4060ff', intensity: 10, dist: 7, prio: 10 }); }
  if (body === 'gt') g.add(box(0.1, 0.14, W * 0.9, mat(shade(paint, -20)), { x: -L / 2 + 0.1, y: by + bh + 0.06 }), box(L * 0.9, 0.02, 0.16, mat('#f1ece0'), { y: by + bh + 0.001, cast: false }));
  if (snow && c.parked) g.add(box(L * 0.3, 0.07, W * 0.9, mat('#edf1f5'), { x: L * 0.33, y: by + bh + 0.03, cast: false }), box(L * 0.18, 0.07, W * 0.9, mat('#edf1f5'), { x: -L * 0.4, y: by + bh + 0.01, cast: false }));
  wheels(r, [L / 2 - 0.42, -L / 2 + 0.42]); lamps(by + bh * 0.55); lightsOn(by + bh * 0.5);
  return g;
}
