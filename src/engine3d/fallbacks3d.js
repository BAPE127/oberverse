// Interim props and vehicles for the 3D renderer, used when no builder is registered (registry3d.js): nothing is
// ever missing from the scene. A prop is a muted box of its footprint; a vehicle a simple two-box car.
import { box, group, mute, mat, hash, strHash, shade } from './lib3d.js';

export const PROP_HEIGHT = 0.6; // tiles
export const FLAT_HEIGHT = 0.05;

/** The colour of a fallback prop: its own `color` when it has one, else a muted tone from its type. */
export function propColor(p) {
  if (typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color)) return mute(p.color, 0.3);
  const h = strHash(String(p.type));
  const tone = ['#8a7d6a', '#7d8a78', '#78808a', '#8a7878', '#8a8470', '#6f7f86'][h % 6];
  return mute(tone, 0.25);
}

/** The size of a fallback prop in tiles: { w, h (depth), height }. Flat props are thin slabs. */
export function propSize(p, flat) {
  return { w: Math.max(0.1, p.w || 1), d: Math.max(0.1, p.h || 1), height: flat ? FLAT_HEIGHT : PROP_HEIGHT };
}

/** A box of the prop's footprint; origin at the north-west corner. */
export function fallbackProp(p, flat = false) {
  const s = propSize(p, flat);
  const inset = flat ? 0 : 0.04;
  const g = group(0, 0, 0, box(s.w - inset * 2, s.height, s.d - inset * 2, propColor(p), { x: s.w / 2, z: s.d / 2, cast: !flat }));
  g.userData.fallback = true;
  return g;
}

/** The size of a fallback vehicle in tiles: { len, wid }. `m` is a model record (len and wid in px). */
export function vehicleSize(m) {
  const len = (m.len || 73) / 32;
  const wid = (m.wid || (m.len || 73) * 0.45) / 32;
  return { len, wid };
}

/** A two-box car in the colour given; +x forward, centred, at ground level. */
export function fallbackVehicle(m, color) {
  const { len, wid } = vehicleSize(m);
  const col = mute(color || m.colors?.[0] || '#8a8f94', 0.08);
  const g = group();
  const lowH = Math.min(0.42, wid * 0.4);
  const body = box(len, lowH, wid, mat(col), { y: 0.12 });
  const cab = box(len * 0.46, lowH * 0.8, wid * 0.82, mat(shade(col, -30)), { x: -len * 0.05, y: 0.12 + lowH });
  const glass = box(len * 0.46 + 0.02, lowH * 0.35, wid * 0.84, mat('#2c3e4e'), { x: -len * 0.05, y: 0.12 + lowH + lowH * 0.2, cast: false });
  g.add(body, cab, glass);
  g.userData.fallback = true;
  g.userData.bodyMat = body.material;
  g.userData.setColor = (hex) => { body.material = mat(mute(hex, 0.08)); cab.material = mat(shade(mute(hex, 0.08), -30)); };
  return g;
}

export const hashOf = hash;
