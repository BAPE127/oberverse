// Starling Flats Aerospace Park: tower, radar, runway kit, aircraft, rockets, halls and the pads.
import { bx, cy, cn, bl, cyx, cyz, flat, panel, dome, sphere, prism, glass, glow, M, mat, shade, mix, mute, group, done, noBake, plate, size, rnd, pick, night, clockOf, hash, strHash, run, arms, oriented, WOOD, DWOOD, LWOOD, STEEL, IRON, CONC, RED, BRASS } from './kit.js';

const view = (ctx, p) => { try { return ctx?.game?.aero?.propView?.(p) || null; } catch { return null; } };
const LIV = { roost: ['#efe6d0', '#c8402a', '#e2d8c0'], meridian: ['#f4f4f2', '#2e3a4e', '#d8dce2'], test: ['#f4f2ee', '#e86a20', '#e8e6e0'], military: ['#8a929a', '#5a626a', '#7e868e'], stealth: ['#3e444c', '#2a3038', '#383e46'] };
const KIND = { highwing: [0.12, 0.3, 0.2, 0.18, 0, 0.86, 0.36, 'nose', 'cabin'], twinprop: [0.12, 0.36, 0.16, 0.11, 0.02, 0.87, 0.34, 'wing2', 'cabin'], bizjet: [0.13, 0.48, 0.18, 0.08, 0.12, 0.9, 0.3, 'tail2', 'airliner'], bizjet_long: [0.11, 0.46, 0.18, 0.06, 0.16, 0.9, 0.3, 'tail2', 'airliner'], futuristic: [0.2, 0.55, 0.36, 0.1, 0.3, 0.92, 0, 'none', 'bubble'], turboprop_liner: [0.1, 0.38, 0.13, 0.08, 0.01, 0.88, 0.3, 'wing2', 'airliner'], narrowbody: [0.1, 0.44, 0.18, 0.05, 0.16, 0.9, 0.32, 'wing2j', 'airliner'], widebody: [0.11, 0.44, 0.2, 0.05, 0.18, 0.9, 0.34, 'wing2j', 'airliner'], blended: [0.3, 0.5, 0.3, 0.06, 0.2, 0.92, 0, 'wing4j', 'airliner'], trainer: [0.14, 0.5, 0.2, 0.1, 0.04, 0.88, 0.38, 'none', 'tandem'], fighter: [0.15, 0.56, 0.26, 0.06, 0.2, 0.92, 0.42, 'none', 'bubble'], twinfighter: [0.2, 0.55, 0.3, 0.07, 0.22, 0.92, 0.44, 'none', 'bubble'], stealthfighter: [0.22, 0.56, 0.32, 0.06, 0.24, 0.9, 0.4, 'none', 'bubble'], futurefighter: [0.22, 0.6, 0.4, 0.04, 0.32, 0.94, 0, 'none', 'bubble'], tacbomber: [0.14, 0.48, 0.22, 0.08, 0.18, 0.9, 0.36, 'none', 'tandem'], stratbomber: [0.08, 0.46, 0.2, 0.06, 0.24, 0.92, 0.3, 'wing4j', 'airliner'], flyingwing: [0.3, 0.5, 0.4, 0.06, 0.3, 0.9, 0, 'none', 'slit'], futurebomber: [0.3, 0.5, 0.4, 0.06, 0.3, 0.9, 0, 'none', 'slit'] };

/** An aircraft pointing north (-z), centred on the origin, len tiles long, span wide. `build` shows it part-built. */
export function planeModel(look, len, span, livery, build) {
  const k = KIND[look.kind] || KIND.bizjet;
  const [fw, wingY, chord, tip, sweep, tail, stab, pods, canopy] = k;
  const pal = LIV[livery];
  const body = pal ? pal[0] : look.color || '#e8e2d0'; const trim = pal ? pal[1] : look.trim || '#c8402a'; const wing = pal ? pal[2] : shade(body, -10);
  const stealth = livery === 'stealth' || /stealth|future|flying/.test(look.kind);
  const g = group();
  const R = Math.max(0.11, len * fw * 0.5); const z0 = -len / 2;
  const b = build || { fuselage: 1, wings: 1, engines: true, painted: true };
  const fl = len * 0.97 * (b.fuselage ?? 1);
  const flyingWing = canopy === 'slit';
  const yc = 0.28 + R;
  if (!flyingWing) {
    g.add(cyz(R, fl * 0.84, b.painted === false ? '#8a8e92' : body, 0, yc, z0 + fl * 0.5 + len * 0.02, { seg: 10 }));
    g.add(cn(R, fl * 0.2, b.painted === false ? '#8a8e92' : body, 0, yc, z0 + len * 0.02 - 0.0, { seg: 10, rx: -Math.PI / 2 }));
    g.children[g.children.length - 1].position.set(0, yc, z0 + fl * 0.1 + len * 0.0);
    g.add(bx(R * 2.2, 0.05, fl * 0.5, trim, 0, yc - R * 0.2, z0 + fl * 0.5, { cast: false }).translateY(0));
  } else {
    g.add(bx(len * 0.7, 0.14, len * 0.32, body, 0, 0.3, 0), cn(len * 0.2, len * 0.16, body, 0, 0.3, -len * 0.3, { seg: 4, rx: -Math.PI / 2 }));
  }
  // canopy
  if (canopy === 'bubble' || canopy === 'tandem') g.add(sphere(R * 0.55, '#2a4a6a', 0, yc + R * 0.7, z0 + fl * 0.22, { seg: 8 }));
  else if (canopy === 'airliner' || canopy === 'cabin') g.add(bx(R * 1.2, 0.06, 0.1, '#2a4a6a', 0, yc + R * 0.5, z0 + len * 0.1, { cast: false }));
  if (b.wings > 0.45) {
    const wz = z0 + len * wingY; const ws = span * (b.wings >= 1 ? 1 : 0.6);
    const ang = Math.atan2(sweep * len, span / 2);
    for (const s of [-1, 1]) g.add(bx(Math.hypot(span / 2, sweep * len), 0.05, Math.max(0.2, len * chord) * (1 - tip * 2) + 0.12, wing, s * ws * 0.25, yc - R * 0.25, wz + sweep * len * 0.5, { ry: -s * ang * 0.0 }).translateX(0));
    for (const s of [-1, 1]) { const w = g.children[g.children.length - 1]; void w; }
  }
  // tail
  if (!flyingWing && tail) {
    const tz = z0 + len * tail;
    g.add(bx(0.05, len * 0.2, len * 0.16, trim, 0, yc + R * 0.4, tz - len * 0.04));
    if (stab > 0) g.add(bx(span * stab, 0.04, len * 0.1, wing, 0, yc + R * 0.4 + (look.kind.includes('bizjet') ? len * 0.17 : 0), tz));
    if (/stealth|twinf|^fighter/.test(look.kind)) g.add(bx(0.05, len * 0.14, len * 0.12, trim, R * 1.1, yc + R * 0.3, tz - len * 0.02, { rz: 0.3 }), bx(0.05, len * 0.14, len * 0.12, trim, -R * 1.1, yc + R * 0.3, tz - len * 0.02, { rz: -0.3 }));
  }
  // engines
  const ec = stealth ? '#2a2e34' : '#8d9297';
  const pod = (x, z, r2) => g.add(cyz(r2, len * 0.14, ec, x, yc - R * 0.5, z, { seg: 8 }), cyz(r2 * 0.6, 0.03, '#1a1a1e', x, yc - R * 0.5, z - len * 0.07, { seg: 8 }));
  if (b.engines !== false) {
    if (pods === 'tail2') { pod(R * 1.5, z0 + len * 0.78, R * 0.45); pod(-R * 1.5, z0 + len * 0.78, R * 0.45); }
    else if (pods === 'wing2' || pods === 'wing2j') { const wz = z0 + len * wingY - 0.1; const x = span * 0.22; if (pods === 'wing2') g.add(cyz(0.07, 0.4, '#3a3e44', x, yc - R * 0.3, wz - 0.15, { seg: 6 }), cyz(0.07, 0.4, '#3a3e44', -x, yc - R * 0.3, wz - 0.15, { seg: 6 }), bx(0.03, 0.4, 0.04, '#c8ccd0', x, yc - R * 0.3 - 0.2, wz - 0.4, { cast: false }), bx(0.03, 0.4, 0.04, '#c8ccd0', -x, yc - R * 0.3 - 0.2, wz - 0.4, { cast: false })); else { pod(x, wz, R * 0.5); pod(-x, wz, R * 0.5); } }
    else if (pods === 'wing4j') { for (const x of [span * 0.14, span * 0.28]) { pod(x, z0 + len * wingY, R * 0.35); pod(-x, z0 + len * wingY, R * 0.35); } }
    else if (pods === 'nose') g.add(bx(0.03, R * 1.6, 0.04, '#3a3e44', 0, yc, z0 - 0.02, { cast: false }));
  }
  // wheels
  g.add(cyx(0.08, 0.06, '#1c1c20', 0, 0.1, z0 + len * 0.2, { seg: 8 }), cyx(0.08, 0.06, '#1c1c20', R * 0.9, 0.1, z0 + len * 0.55, { seg: 8 }), cyx(0.08, 0.06, '#1c1c20', -R * 0.9, 0.1, z0 + len * 0.55, { seg: 8 }));
  return g;
}

export function aircraft(p, ctx) {
  const [w, h] = size(p, 4, 3);
  const v = view(ctx, p);
  const look = v?.look || { kind: 'bizjet', len: Math.max(2, h - 0.3), span: Math.max(2, w - 0.3) };
  const len = Math.min(look.len || h, h - 0.1); const span = Math.min(look.span || w, w - 0.1);
  const m = planeModel(look, len, span, v?.livery || p.livery, null);
  if (p.wreck || v?.wreck) { m.rotation.z = 0.12; m.rotation.x = 0.05; m.position.y = 0.0; m.add(bl(0.3, '#2a2420', 0, 0.8, 0.0, { opacity: 0.6, cast: false })); }
  const g = group(w / 2, 0, h / 2, m);
  if (p.heading || v?.heading) { g.rotation.y = -(v?.heading || p.heading); }
  const out = done(g);
  out.userData.key = v?.key || '';
  return out;
}

export function windsock(p) {
  const sock = group(0, 2.95, 0);
  const seg = [['#e8703a', 0.28], ['#f4f1e4', 0.24], ['#e8703a', 0.2], ['#f4f1e4', 0.16]];
  let x = 0; for (const [c, r] of seg) { sock.add(cyx(r, 0.22, c, x + 0.11, 0, 0, { seg: 8, rt: r * 0.85 })); x += 0.22; }
  sock.children.forEach((c) => { c.userData.noBake = true; });
  const g = group(0.5, 0, 0.5, cy(0.12, 0.1, '#5a5e66', 0, 0, 0, { seg: 8 }), cy(0.04, 3.0, '#c8ccd2', 0, 0, 0, { seg: 6 }), cy(0.1, 0.06, RED, 0, 2.95, 0, { seg: 8 }));
  done(g);
  const turn = group(0, 0, 0, sock);
  g.add(turn);
  const ph = rnd(p) * 6;
  g.userData.update = (q, c) => { const t = clockOf(c); turn.rotation.y = 0.9 + Math.sin(t * 0.25 + ph) * 0.6; sock.rotation.z = -0.08 + Math.sin(t * 2.2 + ph) * 0.06; };
  return g;
}

export function control_tower(p, ctx) {
  const [w, h] = size(p, 3, 3);
  const on = night(ctx);
  const g = group(w / 2, 0, h / 2, bx(w - 0.5, 0.9, h - 0.5, '#b8bcc0'), bx(1.1, 5.2, 1.1, '#c4c8cc', 0, 0.9, 0), bx(1.14, 0.05, 1.14, '#8a8e92', 0, 3.0, 0), bx(1.14, 0.05, 1.14, '#8a8e92', 0, 4.4, 0));
  for (let y = 1.4; y < 6; y += 0.9) g.add(bx(0.24, 0.3, 0.04, on ? '#e8d890' : '#2a3440', 0, y, 0.57, { cast: false, emissive: on ? '#e8d890' : '#000000', ei: on ? 1 : 0 }), bx(0.04, 0.3, 0.24, on ? '#e8d890' : '#2a3440', 0.57, y, 0, { cast: false }));
  g.add(bx(2.0, 0.14, 2.0, '#4a4e56', 0, 6.1, 0), cy(1.3, 0.8, glass('#6a9ac0', 0.7), 0, 6.24, 0, { seg: 8, rt: 1.45 }), cy(1.5, 0.12, '#d8dce0', 0, 7.04, 0, { seg: 8 }), cy(0.04, 1.2, '#8a8e96', 0, 7.1, 0, { seg: 4 }), bx(0.4, 0.04, 0.04, '#8a8e96', 0.2, 7.9, 0), bx(0.8, 0.08, 0.5, '#6a6e72', -0.6, 0.0, 0));
  return done(g, { lights: [{ x: w / 2, y: 6.8, z: h / 2, color: '#7ad8a0', intensity: 3, distance: 6 }] });
}

export function radar(p) {
  const [w, h] = size(p, 2, 2);
  const ant = group(0, 2.9, 0, bx(2.0, 0.55, 0.1, '#c8ccd0', 0, 0, 0), bx(0.3, 0.3, 0.3, '#6a6e72', 0, -0.15, 0), bx(0.1, 0.12, 0.2, '#c8402a', 0, 0.55, 0));
  ant.children.forEach((c) => { c.userData.noBake = true; });
  const g = group(w / 2, 0, h / 2, cy(0.5, 0.3, '#6a6e72', 0, 0, 0, { seg: 8 }), bx(0.5, 2.4, 0.5, '#9a9ea2', 0, 0.3, 0), bx(0.8, 0.3, 0.8, '#5a5e66', 0, 2.7, 0));
  done(g);
  const spin = group(0, 0, 0, ant); g.add(spin);
  g.userData.update = (q, c) => { spin.rotation.y = clockOf(c) * 1.6; };
  return g;
}

export function runway_light(p, ctx) {
  const on = night(ctx);
  const c = typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#bfe0ff';
  return done(group(0.5, 0, 0.5, cy(0.07, 0.06, '#3c4046', 0, 0.01, 0, { seg: 6 }), bl(0.07, c, 0, 0.1, 0, { detail: 0, emissive: on ? c : '#000000', ei: on ? 3 : 0, cast: false })));
}

export function runway_sign(p, ctx) {
  const t = plate(ctx, p.text || 'A1', { bg: '#e8c040', fg: '#1a1a1a', h: 56, font: 'bold 40px "Trebuchet MS", sans-serif' });
  const bw = Math.min(0.94, 0.36 * t.aspect);
  return done(group(0.5, 0, 0.5, bx(0.05, 0.5, 0.05, IRON, -bw / 2 + 0.08, 0, 0), bx(0.05, 0.5, 0.05, IRON, bw / 2 - 0.08, 0, 0), bx(bw + 0.06, 0.4, 0.06, '#1a1a1a', 0, 0.5, 0), panel(bw, 0.34, t.material, 0, 0.53, 0.04, { cast: false })));
}

export function engine_stand(p) {
  return done(group(0.5, 0, 0.5, bx(0.8, 0.07, 0.5, '#44474c', 0, 0.18, 0), bx(0.06, 0.18, 0.5, '#2a2c30', -0.3, 0, 0), bx(0.06, 0.18, 0.5, '#2a2c30', 0.3, 0, 0), cyx(0.2, 0.7, '#9aa0a8', 0, 0.5, 0, { seg: 10 }), cyx(0.24, 0.12, '#6a6e76', -0.3, 0.5, 0, { seg: 10 }), cyx(0.14, 0.08, '#1a1a1e', 0.37, 0.5, 0, { seg: 10 }), bx(0.1, 0.1, 0.3, '#c8402a', 0, 0.72, 0)));
}

export function tug(p) {
  const col = typeof p.color === 'string' ? mute(p.color, 0.25) : '#e8d76a';
  return done(oriented(p, 2, 1, (L, D) => [bx(L - 0.3, 0.4, D - 0.2, col, 0.1, 0.2, 0), bx(L * 0.4, 0.5, D - 0.3, shade(col, -14), -L * 0.1, 0.6, 0), bx(L * 0.4 + 0.02, 0.22, D - 0.28, glass('#9fc0d0', 0.5), -L * 0.1, 0.8, 0, { cast: false }), bx(0.3, 0.1, D - 0.4, IRON, L / 2 - 0.12, 0.3, 0),
    ...[[-L * 0.28, 0.3], [-L * 0.28, -0.3], [L * 0.28, 0.3], [L * 0.28, -0.3]].map(([x, z]) => cyz(0.18, 0.16, '#1c1c20', x, 0.18, z, { seg: 10 })), cy(0.03, 0.2, '#e8a02a', -L * 0.3, 1.1, 0, { seg: 4 })]));
}

export function gantry(p) {
  const [w, h] = size(p, 34, 1);
  const g = group(0, 0, h / 2);
  const n = Math.max(1, Math.round(w / 8));
  for (let i = 0; i <= n; i++) { const x = 0.3 + i * (w - 0.6) / n; g.add(bx(0.25, 6.2, 0.25, '#c8402a', x, 0, -0.35), bx(0.25, 6.2, 0.25, '#c8402a', x, 0, 0.35), bx(0.1, 0.1, 0.8, '#a83a2a', x, 3.0, 0)); }
  g.add(bx(w, 0.4, 0.22, '#c8402a', w / 2, 6.1, -0.35), bx(w, 0.4, 0.22, '#c8402a', w / 2, 6.1, 0.35), bx(w, 0.1, 0.6, '#8a8e92', w / 2, 6.5, 0), bx(1.2, 0.5, 0.9, '#3a3a40', w * 0.3, 6.5, 0), bx(0.04, 3.0, 0.04, IRON, w * 0.3, 3.2, 0, { cast: false }), bx(0.5, 0.3, 0.4, '#c9a24a', w * 0.3, 2.9, 0));
  return done(g);
}

export function boom_barrier(p) {
  const [w, h] = size(p, 4, 1);
  const along = w >= h; const L = along ? w : h;
  const arm = group(0, 0.85, 0);
  for (let i = 0; i < 8; i++) arm.add(bx((L - 0.5) / 8, 0.09, 0.09, i % 2 ? '#c8402e' : '#f4f1e4', 0.3 + (i + 0.5) * (L - 0.5) / 8, -0.045, 0));
  arm.children.forEach((c) => { c.userData.noBake = true; });
  const g = group(0, 0, 0, bx(0.34, 1.0, 0.34, '#e8d76a', along ? 0.35 : w / 2, 0, along ? h / 2 : 0.35), bx(0.1, 0.1, 0.1, RED, along ? 0.35 : w / 2, 1.0, along ? h / 2 : 0.35), bx(0.2, 0.3, 0.1, '#2a2c30', along ? L - 0.15 : w / 2, 0, along ? h / 2 : L - 0.15));
  done(g);
  const piv = group(along ? 0.35 : w / 2, 0.0, along ? h / 2 : 0.35, arm);
  arm.position.x = -0.35 + 0.35; arm.position.y = 0.85;
  if (!along) piv.rotation.y = Math.PI / 2;
  piv.children[0].rotation.z = p.raised ? Math.PI / 2 * 0.95 : 0;
  g.add(piv);
  piv.children[0].position.x = 0;
  return g;
}

export function dish(p) {
  const [w, h] = size(p, 2, 2);
  const d = group(0, 0, 0);
  d.add(dome(0.85, '#d6d8d4', 0, 0, 0, { seg: 14 }).rotateX(Math.PI), cyz(0.04, 0.6, STEEL, 0, 0.0, 0.3, { seg: 4 }).translateZ(0), sphere(0.07, '#c8402a', 0, 0.0, 0.62, { seg: 6 }));
  d.children.forEach((c) => { c.userData.noBake = true; });
  d.rotation.x = -1.0; d.position.set(0, 1.9, 0);
  const g = group(w / 2, 0, h / 2, bx(1.0, 0.3, 1.0, CONC), cy(0.12, 1.6, STEEL, 0, 0.3, 0, { seg: 8 }), bx(0.5, 0.2, 0.5, '#5a5e66', 0, 1.7, 0));
  done(g);
  const yaw = group(0, 0, 0, d); g.add(yaw);
  const ph = rnd(p) * 6;
  g.userData.update = (q, c) => { yaw.rotation.y = Math.sin(clockOf(c) * 0.15 + ph) * 1.2; };
  return g;
}

export function test_stand(p) {
  const [w, h] = size(p, 3, 3);
  const g = group(w / 2, 0, h / 2, bx(w - 0.3, 0.15, h - 0.3, '#8a8c88'), bx(w - 1.0, 0.04, h - 0.8, '#2a2a2e', 0, 0.15, 0.2, { cast: false }));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(bx(0.18, 3.4, 0.18, '#5a6068', sx * (w / 2 - 0.5), 0.15, sz * (h / 2 - 0.5)));
  for (const y of [3.4, 1.6]) g.add(bx(w - 0.8, 0.14, 0.14, '#5a6068', 0, y, -(h / 2 - 0.5)), bx(w - 0.8, 0.14, 0.14, '#5a6068', 0, y, h / 2 - 0.5), bx(0.14, 0.14, h - 0.8, '#5a6068', -(w / 2 - 0.5), y, 0), bx(0.14, 0.14, h - 0.8, '#5a6068', w / 2 - 0.5, y, 0));
  g.add(cy(0.4, 1.4, '#9aa0a8', 0, 1.8, 0, { seg: 10 }), cy(0.3, 0.1, '#3a3c42', 0, 1.7, 0, { seg: 10, rt: 0.55 }), cy(0.5, 0.5, '#c8ccd2', 0, 3.2, 0, { seg: 10 }), bx(0.1, 0.4, 0.1, '#c84a2a', 0, 3.7, 0));
  return done(g);
}

export function blast_wall(p, ctx) {
  return run(p, ctx, (m) => {
    const a = arms(m, p, 0.5);
    const g = group();
    const x0 = a.ew ? (m & 8 ? 0 : 0.0) : 0.25; const x1 = a.ew ? 1 : 0.75; const z0 = a.ns ? 0 : 0.25; const z1 = a.ns ? 1 : 0.75;
    g.add(bx(x1 - x0, 1.7, z1 - z0, '#a8aca8', (x0 + x1) / 2, 0, (z0 + z1) / 2), bx(x1 - x0 + 0.04, 0.12, z1 - z0 + 0.04, '#8a8e8a', (x0 + x1) / 2, 1.7, (z0 + z1) / 2), bx(x1 - x0 + 0.04, 0.12, z1 - z0 + 0.04, '#6a6e6a', (x0 + x1) / 2, 0, (z0 + z1) / 2));
    if (a.ew) { g.add(bx(0.03, 1.5, z1 - z0 + 0.02, '#7a7e7a', 0.5, 0.1, 0.5, { cast: false })); } else g.add(bx(x1 - x0 + 0.02, 1.5, 0.03, '#7a7e7a', 0.5, 0.1, 0.5, { cast: false }));
    return g;
  });
}

export function propellant_sphere(p) {
  const [w, h] = size(p, 3, 3);
  const c = typeof p.color === 'string' ? mute(p.color, 0.25) : '#e8ecf0';
  const g = group(w / 2, 0, h / 2, bx(w - 0.4, 0.1, h - 0.4, '#8a8c88'), sphere(1.1, c, 0, 1.8, 0, { seg: 16 }), cy(1.12, 0.05, '#b8bcc0', 0, 1.8, 0, { seg: 16 }), cy(0.14, 0.3, '#8a8e96', 0, 2.95, 0, { seg: 8 }));
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; g.add(bx(0.08, 1.7, 0.08, '#7a8088', Math.cos(a) * 0.85, 0.1, Math.sin(a) * 0.85, { rz: -Math.cos(a) * 0.2, rx: Math.sin(a) * 0.2 })); }
  g.add(bx(0.05, 3.0, 0.1, '#5a5e66', 1.1, 0.1, 0.4));
  return done(g);
}

export function launch_tower(p) {
  const [w, h] = size(p, 2, 3);
  const g = group(w / 2, 0, h / 2);
  const hw = w / 2 - 0.2; const hd = h / 2 - 0.3;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(bx(0.14, 9.0, 0.14, '#a83a2a', sx * hw, 0, sz * hd));
  for (let y = 0.8; y < 9; y += 1.0) { g.add(bx(2 * hw, 0.07, 0.07, '#8a2a20', 0, y, -hd), bx(2 * hw, 0.07, 0.07, '#8a2a20', 0, y, hd), bx(0.07, 0.07, 2 * hd, '#8a2a20', -hw, y, 0), bx(0.07, 0.07, 2 * hd, '#8a2a20', hw, y, 0)); g.add(bx(0.05, 1.2, 0.05, '#8a2a20', 0, y - 0.9, hd, { rz: 0.9, cast: false }), bx(0.05, 1.2, 0.05, '#8a2a20', 0, y - 0.9, -hd, { rz: -0.9, cast: false })); }
  g.add(bx(2 * hw + 0.3, 0.1, 2 * hd + 0.3, '#6a6e72', 0, 9.0, 0), bx(0.1, 0.1, 1.0, '#c84a34', hw + 0.4, 6.5, 0), cy(0.04, 1.6, '#8a8e96', 0, 9.1, 0, { seg: 4 }), bx(0.8, 0.1, 0.1, '#c8ccd0', hw + 0.5, 6.5, 0.6));
  return done(g, { lights: [{ x: w / 2, y: 9.5, z: h / 2, color: '#ff5a3a', intensity: 2, distance: 5 }] });
}

export function helipad(p) {
  const [w, h] = size(p, 4, 4);
  const g = group(0, 0, 0, flat(w - 0.1, h - 0.1, '#6a6e72', w / 2, h / 2, 0.012), flat(Math.min(w, h) - 0.5, Math.min(w, h) - 0.5, '#f4f1e4', w / 2, h / 2, 0.02, { opacity: 0.0 }));
  const s = Math.min(w, h);
  g.add(flat(s * 0.62, s * 0.62, '#4a4e52', w / 2, h / 2, 0.016), flat(0.18, s * 0.46, '#f4f1e4', w / 2 - s * 0.15, h / 2, 0.022), flat(0.18, s * 0.46, '#f4f1e4', w / 2 + s * 0.15, h / 2, 0.022), flat(s * 0.3, 0.18, '#f4f1e4', w / 2, h / 2, 0.022));
  for (const [x, z] of [[0.2, 0.2], [w - 0.2, 0.2], [0.2, h - 0.2], [w - 0.2, h - 0.2]]) g.add(cy(0.07, 0.04, '#ffb02e', x, 0.0, z, { seg: 6, emissive: '#ffb02e', ei: 0.8 }));
  return done(g);
}

// ---- the pads, halls and bays (state from the aerospace system) ------------------------------------------
function rocketModel(look, stages, hmax) {
  const H = Math.min(hmax, (look.h || 8) * 0.9); const r = Math.max(0.22, (look.w || 2) * 0.22);
  const g = group(); const built = Math.max(0.1, stages ?? 1); const bh = H * built; const c = look.color || '#f2f2ee';
  g.add(cy(r, bh, c, 0, 0, 0, { seg: 12 }), cy(r + 0.01, 0.1, look.band || '#1a1a24', 0, H * 0.3, 0, { seg: 12 }), cy(r * 0.7, 0.3, '#2a2c32', 0, -0.1, 0, { seg: 10 }));
  if (built >= 0.99) { if (look.capsule) g.add(cn(r, H * 0.1, '#e8e8e4', 0, bh, 0, { seg: 12 })); else g.add(cn(r, H * 0.18, c, 0, bh, 0, { seg: 12 })); }
  if (look.boosters && built > 0.5) for (const s of [-1, 1]) g.add(cy(r * 0.5, H * 0.55, shade(c, -12), s * (r + r * 0.5), 0, 0, { seg: 8 }), cn(r * 0.5, H * 0.08, shade(c, -12), s * (r * 1.5), H * 0.55, 0, { seg: 8 }));
  if (look.legs) for (const s of [-1, 1]) g.add(bx(0.06, 0.8, 0.06, '#3a3c42', s * (r + 0.15), 0, 0, { rz: -s * 0.25 }));
  return g;
}

export function launch_pad(p, ctx) {
  const [w, h] = size(p, 10, 10);
  const v = view(ctx, p) || {};
  const g = group(0, 0, 0);
  if (v.site) {
    g.add(flat(w - 0.2, h - 0.2, '#968f7e', w / 2, h / 2, 0.012));
    for (let x = 0.5; x < w; x += 1.2) g.add(flat(0.5, 0.06, '#c8402a', x, 0.15, 0.02), flat(0.5, 0.06, '#c8402a', x, h - 0.15, 0.02));
    for (const [x, z] of [[0.3, 0.3], [w - 0.3, 0.3], [0.3, h - 0.3], [w - 0.3, h - 0.3]]) g.add(bx(0.08, 0.5, 0.08, '#c8a060', x, 0, z), bx(0.2, 0.1, 0.02, '#ff7a2a', x + 0.1, 0.4, z));
    return done(g, { key: v.key || '' });
  }
  g.add(flat(w - 0.1, h - 0.1, '#9a9c98', w / 2, h / 2, 0.012));
  for (let x = 1; x < w; x += 1) g.add(flat(0.03, h - 0.1, '#8a8c88', x, h / 2, 0.016));
  g.add(flat(2.1, h / 2 + 0.6, '#2a2a2e', w / 2, h * 0.6, 0.02), flat(2.0, 0.12, '#4a4a4e', w / 2, h * 0.5 - 0.5, 0.022));
  for (const x of [w / 2 - 1.4, w / 2 + 1.4]) g.add(bx(0.14, 3.0, 0.14, '#5a7a9a', x, 0, h * 0.5 - 0.5), cy(0.2, 0.4, '#5a7a9a', x, 3.0, h * 0.5 - 0.5, { seg: 8 }));
  g.add(bx(1.4, 0.3, 1.4, '#5a5e66', w / 2, 0, h * 0.5 - 0.3), bx(0.5, 0.6, 0.5, '#3a3e44', w / 2, 0.3, h * 0.5 - 0.3));
  if (v.rocket) { const r = rocketModel(v.rocket, v.stages, 7); r.position.set(w / 2, 0.8, h * 0.5 - 0.3); g.add(r); if (v.venting) g.add(bl(0.3, '#e8f0f4', w / 2 + 0.5, 1.5, h * 0.5 - 0.3, { opacity: 0.5, cast: false })); }
  return done(g, { key: v.key || 'empty' });
}

export function bay_slot(p, ctx) {
  const [w, h] = size(p, 10, 7);
  const v = view(ctx, p) || {};
  const g = group(0, 0, 0, flat(w - 0.2, h - 0.2, v.closed ? '#5a5e66' : '#7a7e82', w / 2, h / 2, 0.012));
  const y = mat('#f2c14e');
  for (let x = 0.4; x < w - 0.3; x += 0.8) g.add(flat(0.4, 0.07, y, x + 0.2, 0.2, 0.02), flat(0.4, 0.07, y, x + 0.2, h - 0.2, 0.02));
  for (let z = 0.4; z < h - 0.3; z += 0.8) g.add(flat(0.07, 0.4, y, 0.2, z + 0.2, 0.02), flat(0.07, 0.4, y, w - 0.2, z + 0.2, 0.02));
  if (v.closed) { g.add(bx(w - 0.6, 0.06, h - 0.6, '#4a4e56', w / 2, 0, h / 2)); if (v.key === 'building') g.add(bx(0.6, 1.2, 0.6, '#c8a060', w / 2, 0, h / 2)); }
  else if (v.look && v.kind === 'stack') { const r = rocketModel(v.look, v.stagesTotal ? (v.stageIndex || 1) / v.stagesTotal : 1, Math.min(7, h * 0.9)); r.position.set(w / 2, 0.2, h / 2); g.add(r); }
  else if (v.look) {
    const k = v.look; const len = Math.min(k.len || h - 1, h - 0.8); const span = Math.min(k.span || w - 1, w - 0.8);
    if (k.h && !k.kind) { const r = rocketModel(k, v.stages ?? 1, 6); r.rotation.z = Math.PI / 2; r.position.set(w / 2 - 1.5, 0.9, h / 2); g.add(r); }
    else { const pm = planeModel(k, len, span, v.livery, v.build); pm.position.set(w / 2, 0, h / 2); g.add(pm); }
  }
  const out = done(g);
  out.userData.key = v.key || 'none';
  return out;
}

export function hall_site(p, ctx) {
  const [w, h] = size(p, 14, 9);
  const v = view(ctx, p) || { state: 'site', f: 0 };
  const g = group(0, 0, 0);
  const stone = '#968f7e';
  g.add(flat(w - 0.1, h - 0.1, stone, w / 2, h / 2, 0.012));
  if (v.state === 'site') {
    for (let x = 0.6; x < w - 0.6; x += 1.4) g.add(flat(0.6, 0.05, '#e8e0c8', x, 0.5, 0.02), flat(0.6, 0.05, '#e8e0c8', x, h - 0.5, 0.02));
    for (let z = 0.6; z < h - 0.6; z += 1.4) g.add(flat(0.05, 0.6, '#e8e0c8', 0.5, z, 0.02), flat(0.05, 0.6, '#e8e0c8', w - 0.5, z, 0.02));
    for (const [x, z] of [[0.5, 0.5], [w - 0.5, 0.5], [0.5, h - 0.5], [w - 0.5, h - 0.5]]) g.add(bx(0.08, 0.6, 0.08, '#c8a060', x, 0, z), bx(0.24, 0.14, 0.02, '#ff7a2a', x + 0.12, 0.5, z));
  } else {
    const f = v.state === 'built' ? 1 : v.f || 0.3; const H = 4.0 * f; const co = p.aero?.company === 'roost' ? '#c8bca0' : '#c8ccd0';
    for (let x = 0.4; x <= w - 0.3; x += (w - 0.8) / Math.max(2, Math.round(w / 3))) { g.add(bx(0.16, H, 0.16, STEEL, x, 0, 0.4), bx(0.16, H, 0.16, STEEL, x, 0, h - 0.4)); }
    for (let z = 0.4; z <= h - 0.3; z += (h - 0.8) / Math.max(2, Math.round(h / 3))) { g.add(bx(0.16, H, 0.16, STEEL, 0.4, 0, z), bx(0.16, H, 0.16, STEEL, w - 0.4, 0, z)); }
    if (v.state === 'built') {
      g.add(bx(w - 0.6, H, h - 0.6, co, w / 2, 0, h / 2), bx(w - 0.4, 0.2, h - 0.4, '#6a6e72', w / 2, H, h / 2), bx(Math.min(6, w * 0.45), 3.0, 0.08, '#4a5058', w / 2, 0, h - 0.28), bx(w - 1.2, 0.18, 0.04, '#2a4a6a', w / 2, H - 0.8, h - 0.28, { cast: false }));
      for (let x = 1; x < w - 0.5; x += 1.6) g.add(bx(0.05, H, 0.04, '#9a9ea2', x, 0, h - 0.26, { cast: false }));
    } else g.add(bx(w - 0.8, H * 0.35, 0.1, co, w / 2, 0, 0.4), bx(0.1, H * 0.35, h - 0.8, co, 0.4, 0, h / 2), bx(w - 0.8, 0.1, h - 0.8, '#6a6e72', w / 2, 0, h / 2, { cast: false }));
  }
  const out = done(g);
  out.userData.key = v.key || 'site|0';
  return out;
}

export function aero_facility(p, ctx) {
  const [w, h] = size(p, 3, 3);
  const v = view(ctx, p) || { state: 'site' };
  const g = group(0, 0, 0, flat(w - 0.1, h - 0.1, '#968f7e', w / 2, h / 2, 0.012));
  const id = p.aero?.facility || '';
  if (v.state === 'site') { for (const [x, z] of [[0.3, 0.3], [w - 0.3, 0.3], [0.3, h - 0.3], [w - 0.3, h - 0.3]]) g.add(bx(0.08, 0.5, 0.08, '#c8a060', x, 0, z), bx(0.2, 0.1, 0.02, '#ff7a2a', x + 0.1, 0.4, z)); }
  else {
    const f = v.state === 'built' ? 1 : v.f || 0.3; const H = 1.9 * f;
    const c = /engine|cell/.test(id) ? '#9a8a7a' : /insp/.test(id) ? '#c8ccd0' : '#b8bcc0';
    g.add(bx(w - 0.6, H, h - 0.6, c, w / 2, 0, h / 2));
    if (v.state === 'built') { g.add(bx(w - 0.4, 0.14, h - 0.4, '#6a6e72', w / 2, H, h / 2), bx(1.0, 1.2, 0.06, '#4a5058', w / 2, 0, h - 0.28), bx(0.6, 0.3, 0.04, '#2a4a6a', w - 0.8, 1.0, h - 0.28, { cast: false }), cy(0.2, 0.9, '#8a8e92', 0.8, H + 0.1, 0.8, { seg: 8 })); }
    else for (const [x, z] of [[0.3, 0.3], [w - 0.3, 0.3], [0.3, h - 0.3], [w - 0.3, h - 0.3]]) g.add(bx(0.1, H + 0.6, 0.1, STEEL, x, 0, z));
  }
  const out = done(g);
  out.userData.key = v.key || 'site';
  return out;
}

export const BUILDERS = { aircraft, windsock, control_tower, radar, runway_light, runway_sign, engine_stand, tug, gantry, boom_barrier, dish, test_stand, blast_wall, propellant_sphere, launch_tower, helipad, launch_pad, bay_slot, hall_site, aero_facility };
