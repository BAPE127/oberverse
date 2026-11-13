// The docks and ships: dock cranes, berths, the slipway, moored ships and the fittings on their decks.
import { bx, cy, cn, bl, cyx, cyz, flat, panel, dome, sphere, prism, glass, glow, M, mat, shade, mix, mute, group, done, noBake, plate, size, rnd, pick, night, clockOf, hash, strHash, shipHull, oriented, WOOD, DWOOD, LWOOD, STEEL, IRON, CONC, RED, BRASS, CREAM } from './kit.js';

const BEAM = { runner: 0.24, starwake: 0.24, tug: 0.4, coaster: 0.32, skiff: 0.36, schooner: 0.24, brig: 0.26, galleon: 0.3, manowar: 0.28, warship: 0.16, battleship: 0.2 };
const SAIL = new Set(['schooner', 'brig', 'galleon', 'manowar', 'skiff']);

/** A ship in plan: length L along +z (bow south), beam B, built from a look { hull, color, trim, len }. `walk` gives a flat deck. */
export function shipModel(look, L, B, walk) {
  const hull = look.hull || 'freighter'; const c = look.color || '#4a4a52'; const trim = look.trim || '#e8e2d4';
  const g = group();
  if (walk) { g.add(shipHull(L, B, 0.22, shade(c, -10), hull, { deck: true })); g.add(shipHull(L, B - 0.3, 0.05, '#9a8a72', hull)); return g; }
  const H = Math.min(0.8, 0.45 + B * 0.12);
  g.add(shipHull(L, B, H, c, hull), shipHull(L * 0.97, B * 0.86, 0.04, shade(c, 28), hull));
  g.children[1].position.y = H; g.children[1].position.z = L * 0.015;
  g.add(bx(B * 0.2, 0.05, L * 0.9, trim, 0, H * 0.7, L * 0.5, { cast: false }));
  const bridge = (z, w, hgt) => { g.add(bx(w, hgt, B * 0.5, '#f2f0ea', 0, H, z), bx(w + 0.06, 0.05, B * 0.56, '#8a8e96', 0, H + hgt, z), bx(w - 0.1, 0.14, B * 0.5 + 0.02, '#2a4a6a', 0, H + hgt * 0.55, z, { cast: false })); };
  if (SAIL.has(hull)) {
    const n = hull === 'skiff' ? 1 : hull === 'schooner' ? 2 : 3;
    for (let i = 0; i < n; i++) { const z = L * (0.28 + i * 0.7 / n); const mh = 2.2 + B * 0.5; g.add(cy(0.04, mh, DWOOD, 0, H, z, { seg: 5 }), bx(B * 0.9, mh * 0.3, 0.03, '#ece2c8', 0, H + mh * 0.45, z + 0.06, { double: true }), bx(B * 0.7, mh * 0.25, 0.03, '#e2d8bc', 0, H + mh * 0.75, z + 0.06, { double: true }), bx(B * 0.95, 0.04, 0.04, DWOOD, 0, H + mh * 0.42, z)); }
    g.add(bx(B * 0.5, 0.25, L * 0.18, shade(c, 12), 0, H, L * 0.12));
  } else if (hull === 'warship' || hull === 'battleship') {
    bridge(L * 0.45, B * 0.5, 0.7); g.add(bx(B * 0.4, 0.28, 0.5, '#7a828a', 0, H, L * 0.2), cyz(0.05, 0.6, '#5a626a', 0, H + 0.38, L * 0.2 + 0.4, { seg: 6 }), bx(B * 0.4, 0.28, 0.5, '#7a828a', 0, H, L * 0.78), cyz(0.05, 0.6, '#5a626a', 0, H + 0.38, L * 0.78 + 0.4, { seg: 6 }), cy(0.08, 0.5, '#5a626a', 0, H + 0.7, L * 0.45, { seg: 6 }), cy(0.12, 0.5, '#7a828a', 0, H + 0.7, L * 0.38, { seg: 8 }));
  } else if (hull === 'tug') {
    bridge(L * 0.38, B * 0.7, 0.55); g.add(cy(0.14, 0.5, RED, 0, H + 0.55, L * 0.28, { seg: 8 }), cy(0.15, 0.08, '#1c1c20', 0, H + 1.0, L * 0.28, { seg: 8 }));
  } else {
    bridge(L * 0.18, B * 0.8, 0.6); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.add(bx(B * 0.34, 0.26, L * 0.12, pick(['#c8402e', '#3f6a8a', '#c9a43a', '#4f7f4f', '#d8d2c0'], hash(i, j, strHash(c) % 50)), (j - 0.5) * B * 0.38, H, L * (0.4 + i * 0.14)), bx(B * 0.34, 0.26, L * 0.12, pick(['#c8402e', '#3f6a8a', '#c9a43a', '#4f7f4f'], hash(j, i, 9)), (j - 0.5) * B * 0.38, H + 0.26, L * (0.4 + i * 0.14)));
    g.add(cy(0.12, 0.4, trim, 0, H + 0.6, L * 0.14, { seg: 8 }));
  }
  return g;
}

export function moored_ship(p) {
  const [w, h] = size(p, 4, 9);
  const look = p.look || {};
  const L = Math.min(h - 0.2, look.len || 3);
  const B = Math.min(w - 0.4, L * (BEAM[look.hull || 'freighter'] ?? 0.22) + 0.3);
  const g = group(w / 2, 0, 0.1, shipModel(look, L, B, false));
  return done(g);
}

export function shipberth(p, ctx) {
  const slot = p.slot;
  const px = (p.pier ?? p.x + 8) - p.x;
  const read = (c) => { try { return c?.game?.logistics?.docks?.at(slot) || null; } catch { return null; } };
  const B = read(ctx);
  const sig = (b) => (b ? b.ships.map((m) => `${m.id}${m.side}`).join(',') + `|${b.name}|${b.more}|${b.empty ? 1 : 0}` : 'none');
  const text = B ? B.name + (B.more ? ` · +${B.more} more` : B.empty ? ' · no ships in' : '') : 'BERTH — TO LET';
  const t = plate(ctx, text, { bg: '#2a3a4a', fg: '#f4ecd8', border: '#e8dcc0', h: 60, font: 'bold 34px "Trebuchet MS", sans-serif' });
  const bw = Math.min(3.2, 0.34 * t.aspect + 0.2);
  const g = group(0, 0, 0, cy(0.06, 1.6, DWOOD, px + 1 - bw / 2 + 0.2, 0, 0.9, { seg: 6 }), cy(0.06, 1.6, DWOOD, px + 1 + bw / 2 - 0.2, 0, 0.9, { seg: 6 }), bx(bw + 0.1, 0.5, 0.08, '#14202a', px + 1, 1.2, 0.9), panel(bw, 0.44, t.material, px + 1, 1.23, 0.95, { cast: false }));
  if (B) for (const m of B.ships) { const s = shipModel(m.look || {}, m.plan.Lt, m.plan.Bt, true); s.position.set(m.x0 - p.x + m.plan.Bt / 2, 0, m.y0 - p.y); g.add(s); }
  done(g);
  g.userData.key = sig(B);
  g.userData.update = (q, c) => { g.userData.key = sig(read(c)); };
  return g;
}

export function slipway(p, ctx) {
  const [w, h] = size(p, 4, 12);
  const read = (c) => { try { return c?.game?.logistics?.slip?.() || null; } catch { return null; } };
  const S = read(ctx);
  const g = group(0, 0, 0, bx(w - 0.6, 0.08, h - 0.2, '#6a5a46', w / 2, 0, h / 2));
  for (const x of [0.5, w - 0.5]) g.add(bx(0.14, 0.14, h - 0.2, '#5a5e64', x, 0.08, h / 2));
  for (let z = 0.4; z < h - 0.2; z += 0.9) g.add(bx(w - 0.8, 0.06, 0.22, '#7a5a3a', w / 2, 0.08, z));
  for (const x of [0.15, w - 0.15]) g.add(bx(0.2, 3.0, 0.2, '#c9a24a', x, 0, 0.7), bx(0.2, 3.0, 0.2, '#c9a24a', x, 0, 1.6));
  g.add(bx(w - 0.1, 0.22, 0.3, '#c9a24a', w / 2, 3.0, 0.7), bx(w - 0.1, 0.22, 0.3, '#c9a24a', w / 2, 3.0, 1.6), bx(0.2, 0.2, 1.1, '#c9a24a', 0.15, 3.0, 1.15), bx(0.2, 0.2, 1.1, '#c9a24a', w - 0.15, 3.0, 1.15));
  const t = plate(ctx, 'OBER & SONS SHIPYARD', { bg: '#2a3a4a', fg: '#f4ecd8', h: 60, font: 'bold 32px "Trebuchet MS", sans-serif' });
  g.add(panel(Math.min(w - 0.3, 3.4), 0.4, t.material, w / 2, 3.25, 0.8, { cast: false }));
  if (S?.look) {
    const L = Math.min(h - 2.4, (S.look.len || 3)); const B = Math.min(w - 0.8, L * (BEAM[S.look.hull || 'freighter'] ?? 0.22) + 0.2);
    const s = shipModel(S.look, L, B, false); s.scale.y = 0.3 + 0.7 * (S.progress || 0); s.position.set(w / 2, 0.15, 1.6); g.add(s);
  }
  done(g);
  const sig = (b) => (b?.look ? `${b.look.hull}|${b.look.len}|${Math.round((b.progress || 0) * 8)}` : 'none');
  g.userData.key = sig(S);
  g.userData.update = (q, c) => { g.userData.key = sig(read(c)); };
  return g;
}

export function crane(p) {
  const [w, h] = size(p, 3, 2);
  const col = '#c9a24a';
  const jib = group(0, 5.6, 0, bx(0.34, 0.34, h - 0.1, col, 0, 0, h / 2 - 0.05), bx(0.04, 0.04, h - 0.4, IRON, 0.14, 0.34, h / 2 - 0.05, { rx: 0 }));
  const hook = group(0, 0, 0, bx(0.02, 3.0, 0.02, '#2a2a2e', 0, 2.6, 0, { cast: false }), bx(0.5, 0.45, 0.5, '#8a4a3a', 0, 2.2, 0));
  const g = group(w / 2, 0, 0);
  for (const sx of [-1, 1]) for (const sz of [0.3, h - 0.3]) g.add(bx(0.2, 5.6, 0.2, col, sx * (w / 2 - 0.2), 0, sz));
  for (const sx of [-1, 1]) g.add(bx(0.1, 0.1, h - 0.6, STEEL, sx * (w / 2 - 0.2), 2.4, h / 2), bx(0.06, 5.4, 0.06, STEEL, sx * (w / 2 - 0.2), 0.1, h / 2, { rx: 0.3 }));
  g.add(bx(w - 0.2, 0.3, h - 0.3, col, 0, 5.6, h / 2), bx(0.9, 0.9, 0.9, '#3a3a40', 0, 5.9, h * 0.35), bx(0.5, 0.4, 0.4, '#d9d2c0', 0, 6.2, h * 0.35 - 0.1), bx(0.34, 0.34, h, col, 0, 6.25, h / 2 + 0.1), bx(0.34, 0.14, h, '#a88a38', 0, 6.62, h / 2 + 0.1));
  done(g);
  const trolley = group(0, 5.5, h - 0.4, hook);
  hook.position.y = -2.7 + 0.5;
  g.add(trolley);
  const ph = rnd(p) * 6;
  g.userData.update = (q, c) => { const s = Math.sin(clockOf(c) * 0.7 + ph); trolley.position.z = h * 0.55 + s * 0.35; };
  return g;
}

export function gangway(p) {
  const [w, h] = size(p, 3, 1);
  return done(group(0, 0, 0, bx(w, 0.07, 0.72, '#9a8a72', w / 2, 0.02, h / 2), bx(w, 0.05, 0.05, '#d8d4c8', w / 2, 0.45, 0.14), bx(w, 0.05, 0.05, '#d8d4c8', w / 2, 0.45, h - 0.14), ...[0.1, w - 0.1, w / 2].flatMap((x) => [bx(0.04, 0.4, 0.04, '#d8d4c8', x, 0.08, 0.14), bx(0.04, 0.4, 0.04, '#d8d4c8', x, 0.08, h - 0.14)])));
}
export function companionway(p) {
  const g = group(0.5, 0, 0.5, bx(0.88, 0.2, 0.88, '#5a3a1e'), bx(0.6, 0.02, 0.6, '#1a1210', 0, 0.2, 0));
  for (let k = 0; k < 3; k++) g.add(bx(0.56, 0.03, 0.08, '#8a6a4a', 0, 0.21 + k * 0.0, -0.18 + k * 0.17, { cast: false }));
  return done(g);
}
export function shipwheel(p) {
  const w = group(0, 0.95, 0.05);
  for (let i = 0; i < 4; i++) { const b = bx(0.62, 0.05, 0.04, '#8a6a48', 0, 0, 0); b.rotation.z = i * Math.PI / 4; w.add(b); }
  w.add(cyz(0.3, 0.03, '#6a4a2e', 0, 0, 0, { seg: 12 }), cyz(0.06, 0.1, BRASS, 0, 0, 0, { seg: 8 }));
  const g = group(0.5, 0, 0.5, bx(0.5, 0.2, 0.4, '#5a3e28'), bx(0.14, 0.9, 0.14, '#6a4a2e', 0, 0.2, 0), bx(0.26, 0.1, 0.24, '#5a3e28', 0, 0.95, 0.0), w);
  return done(g);
}
export function logbook(p) {
  return done(group(0.5, 0, 0.5, bx(0.12, 0.8, 0.12, '#5a3e28'), bx(0.4, 0.06, 0.32, '#4a3220', 0, 0.8, 0, { rx: -0.35 }), bx(0.17, 0.02, 0.24, '#f4efe2', -0.09, 0.86, 0.0, { rx: -0.35, cast: false }), bx(0.17, 0.02, 0.24, '#f0ead8', 0.09, 0.86, 0.0, { rx: -0.35, cast: false }), bx(0.3, 0.1, 0.1, '#3a2a1c', 0, 0.0, 0.0)));
}
export function hatch(p) {
  const g = group(0.5, 0, 0.5, bx(0.88, 0.16, 0.88, '#5b5f66'), bx(0.7, 0.04, 0.7, '#8a5b3c', 0, 0.16, 0));
  for (const z of [-0.15, 0.1]) g.add(bx(0.66, 0.02, 0.05, '#a5754e', 0, 0.2, z, { cast: false }));
  return done(g);
}

// ---- fittings on a deck (a 'deckpart' prop, by key) ---------------------------------------------------------
export function deckpart(p) {
  const [w, h] = size(p, 1, 1);
  const look = p.look || {}; const color = look.color || '#4a4a52'; const trim = look.trim || '#e8e2d4';
  const key = p.key || '';
  const g = group(w / 2, 0, h / 2);
  const base = (hgt, c) => g.add(bx(w - 0.12, hgt, h - 0.12, c));
  if (/^(funnel|ecofunnel|turbine)$/.test(key)) { base(0.3, shade(color, 12)); const n = key === 'turbine' ? 2 : 1; const r = key === 'turbine' ? Math.min(w, h) * 0.17 : Math.min(w, h) * 0.26; const hh = key === 'turbine' ? 1.9 : key === 'ecofunnel' ? 1.4 : 1.6; for (let i = 0; i < n; i++) g.add(cy(r, hh, key === 'ecofunnel' ? '#e8eee8' : trim, n === 2 ? (i ? w * 0.2 : -w * 0.2) : 0, 0.3, 0, { seg: 12 }), cy(r + 0.02, 0.2, key === 'ecofunnel' ? '#3a9a5a' : '#16181c', n === 2 ? (i ? w * 0.2 : -w * 0.2) : 0, 0.3 + hh - 0.1, 0, { seg: 12 })); }
  else if (/^(fusion|core)$/.test(key)) { const c = key === 'fusion' ? '#5ad8ff' : '#ffb84a'; base(0.45, '#c8d0da'); g.add(sphere(Math.min(w, h) * 0.26, c, 0, 0.9, 0, { seg: 12, emissive: c, ei: 1.6 }), cy(Math.min(w, h) * 0.34, 0.04, '#e8f8ff', 0, 0.9, 0, { seg: 16 })); }
  else if (/^(generator|turbogen)$/.test(key)) { base(0.6, '#8a9098'); for (let k = 0; k < 6; k++) g.add(bx((w - 0.12) / 6, 0.1, 0.03, k % 2 ? '#1a1a1a' : '#f2c14e', -w / 2 + 0.06 + (k + 0.5) * (w - 0.12) / 6, 0.05, h / 2 - 0.05, { cast: false })); g.add(cy(0.12, 0.5, '#5a6068', 0, 0.6, 0, { seg: 8 })); }
  else if (/^(hatch|hatch2|bulk)$/.test(key)) { g.add(bx(w - 0.14, 0.14, h - 0.14, '#5a5e66'), bx(w - 0.4, 0.04, h - 0.4, '#2a2a30', 0, 0.14, 0), bx(w - 0.5, 0.05, (h - 0.5) / 2, '#8a8e96', 0, 0.16, -(h - 0.5) / 4)); }
  else if (key === 'containers') { for (let i = 0; i < Math.max(1, Math.round(w)); i++) for (let j = 0; j < Math.max(1, Math.round(h)); j++) { const c = pick(['#c8402e', '#3f6a8a', '#c9a43a', '#4f7f4f', '#d8d2c0', '#7a4a7a'], hash(i, j, p.slot || 1)); g.add(bx(0.86, 0.5, 0.86, c, -w / 2 + i + 0.5, 0, -h / 2 + j + 0.5)); if (hash(j, i, 3) > 0.4) g.add(bx(0.86, 0.5, 0.86, shade(c, 12), -w / 2 + i + 0.5, 0.5, -h / 2 + j + 0.5)); } }
  else if (key === 'reefer') { base(0.7, '#dcdcd6'); g.add(bx(w - 0.4, 0.1, 0.1, '#4a8ab0', 0, 0.74, 0), cy(0.14, 0.05, IRON, w / 2 - 0.3, 0.7, 0, { seg: 8 })); }
  else if (key === 'crane') { g.add(bx(0.4, 1.4, 0.4, '#c9a24a', -w * 0.3, 0, 0), bx(0.2, 0.2, Math.max(1, h - 0.3), '#c9a24a', -w * 0.3, 1.4, 0.0), bx(0.04, 1.0, 0.04, IRON, -w * 0.3, 0.4, Math.max(1, h - 0.3) / 2 - 0.1)); }
  else if (key === 'cabins') { base(0.7, '#e8e2d4'); for (let k = 0; k < Math.max(2, w); k++) g.add(bx(0.2, 0.2, 0.03, '#2a4a6a', -w / 2 + 0.3 + k * 0.5, 0.4, h / 2 - 0.05, { cast: false })); g.add(bx(w - 0.1, 0.06, h - 0.1, '#8a8e96', 0, 0.7, 0)); }
  else if (key === 'pod') { g.add(cyx(0.35, w - 0.3, '#d8dce0', 0, 0.45, 0, { seg: 12 }), cyx(0.36, 0.05, '#c8402e', w * 0.2, 0.45, 0, { seg: 12 }), bx(0.1, 0.1, 0.1, '#2a4a6a', -w * 0.3, 0.55, 0.34)); }
  else if (/^(navmast|radar|antenna|command|crowsnest)$/.test(key)) { g.add(bx(0.6, 0.4, 0.6, shade(color, 14)), cy(0.05, 1.8, '#8a8e96', 0, 0.4, 0, { seg: 6 })); if (key === 'radar') g.add(bx(0.9, 0.08, 0.2, '#c8ccd0', 0, 2.2, 0)); else if (key === 'antenna') g.add(bx(0.5, 0.04, 0.04, STEEL, 0, 1.9, 0), bx(0.04, 0.04, 0.5, STEEL, 0, 1.6, 0)); else g.add(cy(0.3, 0.3, '#5a626a', 0, 1.8, 0, { seg: 8 })); }
  else if (/^(qsensor|aegis)$/.test(key)) { base(0.5, '#6a7078'); g.add(sphere(0.3, '#c8ccd0', 0, 0.8, 0, { seg: 10 }), bx(0.5, 0.5, 0.05, '#2a3a4a', 0, 0.5, h / 2 - 0.1)); }
  else if (/^(turret|railgun)$/.test(key)) { g.add(cy(Math.min(w, h) * 0.4, 0.3, '#6a737b', 0, 0, 0, { seg: 12 }), bx(0.4, 0.28, 0.5, '#7a828a', 0, 0.3, 0)); const n = key === 'railgun' ? 2 : 1; for (let i = 0; i < n; i++) g.add(cyz(0.05, 1.2, '#3a4048', (i - (n - 1) / 2) * 0.2, 0.45, 0.8, { seg: 6 })); }
  else if (key === 'missile') { base(0.3, '#5a626a'); for (let i = 0; i < 3; i++) g.add(cyz(0.1, 0.8, '#d8d8d0', -0.25 + i * 0.25, 0.5, 0, { seg: 8 }), cn(0.1, 0.18, '#c8402e', -0.25 + i * 0.25, 0.4, 0.4, { seg: 8, rx: Math.PI / 2 })); }
  else if (key === 'decoy') { g.add(cy(0.3, 0.1, '#6a7078', 0, 0, 0, { seg: 10 }), cn(0.28, 0.6, '#d9a42a', 0, 0.1, 0, { seg: 6 })); }
  else if (key === 'sandbags') { for (let i = 0; i < 5; i++) g.add(bx(0.4, 0.18, 0.24, '#b8a47a', -w / 2 + 0.3 + (i % 3) * 0.3, (i > 2 ? 0.18 : 0), -0.15 + (i > 2 ? 0 : 0.0), { ry: hash(i, 1, 1) * 0.3 })); }
  else if (key === 'cannon') { g.add(bx(0.4, 0.18, 0.5, '#5a3e28'), cyz(0.09, 0.6, '#2a2c30', 0, 0.32, 0.25, { seg: 8 }), cyz(0.16, 0.04, '#5a3e28', -0.15, 0.16, 0, { seg: 8 }), cyz(0.16, 0.04, '#5a3e28', 0.15, 0.16, 0, { seg: 8 })); }
  else if (/^(mast|topsail)$/.test(key)) { g.add(cy(0.07, 3.0, DWOOD, 0, 0, 0, { seg: 6 }), bx(w * 0.9, 1.0, 0.04, '#ece2c8', 0, 1.4, 0.08, { double: true }), bx(w * 0.95, 0.05, 0.05, DWOOD, 0, 1.35, 0)); }
  else if (/^(sonar|plating|armour|coating)$/.test(key)) { g.add(bx(w - 0.2, 0.05, h - 0.2, '#6a7078', 0, 0, 0), bx(w - 0.4, 0.03, h - 0.4, '#8a9098', 0, 0.05, 0, { cast: false })); }
  else { base(0.5, shade(color, 10)); g.add(bx(w * 0.5, 0.2, h * 0.5, trim, 0, 0.5, 0), cy(0.08, 0.4, '#5a626a', 0, 0.7, 0, { seg: 6 })); }
  return done(g);
}

export function deckhouse(p) {
  const [w, h] = size(p, 3, 3);
  const look = p.look || {}; const war = p.family === 'war'; const future = p.family === 'future';
  const wall = war ? shade(look.color || '#6f7f8f', 14) : future ? '#e8eef4' : '#f2f0ea';
  const tiers = war ? 3 : future ? 2 : Math.max(2, Math.min(4, Math.round(h * 0.9)));
  const th = 0.55;
  const g = group(0, 0, 0);
  for (let k = 0; k < tiers; k++) {
    const inset = k * (war ? 0.15 : 0.06);
    g.add(bx(w - inset * 2 - 0.1, th, h - inset * 2 - 0.1, shade(wall, -k * 3), w / 2, k * th, h / 2), bx(w - inset * 2, 0.04, h - inset * 2, shade(wall, -26), w / 2, (k + 1) * th - 0.04, h / 2, { cast: false }));
    const gl = k === tiers - 1 ? 0.34 : 0.2;
    g.add(bx(w - inset * 2 - 0.2, gl, 0.03, future ? '#5ad8ff' : '#2a4a6a', w / 2, k * th + 0.12, h - inset - 0.05, { cast: false, emissive: future ? '#5ad8ff' : '#1a3a5a', ei: future ? 1 : 0.4 }), bx(0.03, gl, h - inset * 2 - 0.2, future ? '#5ad8ff' : '#2a4a6a', w - inset - 0.05, k * th + 0.12, h / 2, { cast: false }));
  }
  g.add(cy(0.03, 0.8, '#8a8e96', w * 0.3, tiers * th, h * 0.4, { seg: 4 }), bx(0.5, 0.06, 0.06, '#c8ccd0', w * 0.3, tiers * th + 0.6, h * 0.4));
  return done(g);
}

export const BUILDERS = { moored_ship, shipberth, slipway, crane, gangway, companionway, shipwheel, logbook, hatch, deckpart, deckhouse };
