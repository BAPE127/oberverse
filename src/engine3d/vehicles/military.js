// The company's machines at Hollowmoor Lot (phase 3D-3): tanks, carriers, recon, artillery, anti-air, trucks, ambulances and engineers'
// vehicles, hover vehicles of the later eras, and the helicopters. Built from the same specs the 2D fleet painter uses (src/engine/drawFleet.js
// SPEC: running gear, hull shape, turret, features, hull colour) so every id is the vehicle the player owns. Sizes are the spec's px / 32:
// a tank is about 1.8 tiles long, against a car's 2.3.
// What moves: a turret creeps round, a radar dish turns, wheels steer and roll (when driven), rotors turn when `running`.
import { assemble } from './geo.js';
import { mix } from '../lib3d.js';
import { SPEC } from '../../engine/drawFleet.js';
import { VEHICLE_SIZE, VEHICLE_SCALE } from '../../content/battle.js';

const TILE = 32;
const INK = '#1b1a24';
const PAINT = {
  company: { hull: '#4f6a3e', hull2: '#3c5430', glass: '#26384e', track: '#26262c' },
};
const rnd = (a, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
const shade = (c, k) => mix(c, k < 0 ? '#000000' : '#ffffff', Math.abs(k));

/**
 * The factor that takes a model built from its sprite spec (length `L / 32` tiles) to the simulation's footprint (`VEHICLE_SIZE`, rules 5: 1.6 times what the drawing showed): the table is the
 * one source, so this reads the length it gives for the spec id. A uniform factor, so the height, wheels and tracks grow with the hull and stay on the ground. 1 for an id with no spec.
 */
export function sizeScale(id) {
  const sp = SPEC[id]; const sz = VEHICLE_SIZE[id];
  if (!sp || !sz || !sp.L) return 1;
  return sz.len / (sp.L / TILE);
}
/** The same factor for an older battle (rules below 5), which kept the drawn size: the table divided by the 1.6 it added. */
export const oldSizeScale = (id) => sizeScale(id) / VEHICLE_SCALE;

// ------------------------------------------------------------------------------------------------ ground vehicles
function groundSpec(id, sp) {
  const L = sp.L / TILE; const W = sp.W / TILE; const hl = L / 2; const hw = W / 2;
  const P = PAINT.company;
  const base = sp.hull || P.hull; const dark = sp.hull ? shade(sp.hull, -0.2) : P.hull2;
  const feats = new Set(sp.feats || []);
  const gear = sp.gear;
  const angular = sp.shape === 'angular';
  const nw = sp.wheels || 3;
  const wr = Math.min(0.3, W * 0.3); const ww = Math.max(0.1, W * 0.2);
  const wheelXs = [];
  if (gear === 'wheeled') for (let i = 0; i < nw; i++) wheelXs.push(-hl + wr + 0.1 + ((L - 2 * wr - 0.2) * i) / Math.max(1, nw - 1));
  if (gear === 'half') wheelXs.push(hl - wr - 0.1);
  const wz = hw - ww / 2 + 0.02;
  const wheels = wheelXs.flatMap((x) => [{ x, z: wz, r: wr, w: ww, steer: x > 0, opts: { hub: '#8a8e94', lugs: 0 } }, { x, z: -wz, r: wr, w: ww, steer: x > 0, opts: { hub: '#8a8e94', lugs: 0 } }]);
  const lift = gear === 'tracked' || gear === 'half' ? 0.22 : gear === 'hover' ? 0.28 : wr * 1.0;
  const hullH = Math.max(0.3, W * (angular ? 0.52 : 0.5));
  const top = lift + hullH;
  const t = sp.turret || { type: 'none' };
  const tcx = t.type === 'launcher' || t.type === 'mortar' ? -hl * 0.1 : hl * 0.05;
  return {
    key: `war|${id}`,
    build(G) {
      const bw = gear === 'tracked' || gear === 'half' ? hw - W * 0.2 : hw - 0.05; // the hull's half width inside the tracks
      // running gear
      if (gear === 'tracked' || gear === 'half') {
        const tl = gear === 'half' ? L * 0.66 : L * 1.0;
        const tw = W * 0.22;
        for (const s of [-1, 1]) {
          const zc = s * (hw - tw / 2);
          const x1 = gear === 'half' ? -hl + tl : hl - 0.02; const x0 = -hl + 0.02;
          G.prism('dark', [[x0 + 0.1, 0.02], [x1 - 0.1, 0.02], [x1, 0.12], [x1, 0.3], [x1 - 0.08, 0.4], [x0 + 0.08, 0.4], [x0, 0.3], [x0, 0.12]], zc - tw / 2, zc + tw / 2, P.track);
          const n = Math.max(3, Math.round((x1 - x0) / 0.3));
          for (let i = 0; i < n; i++) G.cyl('dark', 'z', x0 + 0.16 + (i * (x1 - x0 - 0.32)) / (n - 1), 0.2, zc + (s > 0 ? tw / 2 : -tw / 2 - 0.012), 0.1, 0.012, '#3a3a44', { seg: 8 });
          G.box('dark', x0 + 0.05, x1 - 0.05, 0.38, 0.42, zc - tw / 2 - 0.01, zc + tw / 2 + 0.01, shade(P.track, 0.1)); // the guard
        }
      } else if (gear === 'hover') {
        for (const s of [-1, 1]) {
          G.prism('dark', [[-hl + 0.1, 0.06], [hl - 0.1, 0.06], [hl, 0.2], [hl, 0.34], [-hl, 0.34], [-hl, 0.18]], s * (hw - 0.12) - 0.12, s * (hw - 0.12) + 0.12, shade(dark, -0.15));
          G.box('glow:#4ad8e8', -hl * 0.8, hl * 0.8, 0.02, 0.06, s * (hw - 0.12) - 0.08, s * (hw - 0.12) + 0.08);
        }
      }
      // the hull: a side profile, sloped at the nose, a flatter deck behind
      const noseDrop = angular ? 0.18 : 0.12;
      const prof = [[-hl + 0.03, lift], [hl - 0.03, lift], [hl - 0.03, top - noseDrop], [hl - 0.03 - (angular ? 0.35 : 0.22), top], [-hl + (angular ? 0.12 : 0.06), top], [-hl + 0.03, top - (angular ? 0.1 : 0.06)]];
      G.prism('dark', prof, -bw, bw, base);
      G.prism('dark', prof.map(([x, y]) => [x * 0.9, y + (y > lift ? 0.02 : 0)]), -bw * 0.7, bw * 0.7, shade(base, 0.12)); // the raised deck
      if (sp.skirts) for (const s of [-1, 1]) G.box('dark', -hl + 0.2, hl - 0.2, lift + 0.04, top - 0.1, s * (bw + 0.01) - 0.02, s * (bw + 0.01) + 0.02, shade(base, -0.16));
      // a cab for trucks, vans, ambulances, carriers
      if (sp.cab) {
        const cl = Math.min(0.55, L * 0.28);
        G.box('dark', hl - cl, hl - 0.03, top, top + 0.34, -bw + 0.04, bw - 0.04, shade(base, 0.04));
        G.prism('dark', [[hl - cl * 0.98, top + 0.04], [hl - 0.05, top + 0.04], [hl - 0.12, top + 0.28], [hl - cl * 0.8, top + 0.28]], -bw + 0.1, bw - 0.1, P.glass);
        G.box('dark', hl - cl, hl - 0.03, top + 0.34, top + 0.37, -bw + 0.02, bw - 0.02, shade(base, -0.1));
      }
      if (feats.has('tarp')) { G.prism('dark', [[-hl + 0.1, top], [hl - 0.7, top], [hl - 0.8, top + 0.34], [-hl + 0.2, top + 0.4]], -bw + 0.04, bw - 0.04, '#7a7a56'); for (let i = 0; i < 4; i++) G.box('dark', -hl + 0.2 + i * 0.28, -hl + 0.23 + i * 0.28, top + 0.0, top + 0.4, -bw + 0.02, bw - 0.02, '#5a5a3c'); }
      if (feats.has('crates')) for (let i = 0; i < 3; i++) G.cube('dark', -hl + 0.3 + i * 0.28, top, ((i % 2) - 0.5) * 0.2, 0.22, 0.2, 0.22, '#8a6a40');
      if (feats.has('ramp')) { G.box('dark', -hl - 0.0, -hl + 0.12, lift + 0.05, top - 0.04, -bw + 0.12, bw - 0.12, shade(base, -0.14)); G.box('dark', -hl - 0.012, -hl, lift + 0.05, top - 0.04, -bw + 0.12, bw - 0.12, '#16161c'); }
      if (feats.has('cross')) { for (const s of [-1, 1]) { G.box('dark', -0.12, 0.12, top - 0.08, top - 0.04, s * (bw + 0.003) - 0.003, s * (bw + 0.003) + 0.003, '#c8242c'); G.box('dark', -0.04, 0.04, top - 0.14, top + 0.02, s * (bw + 0.003) - 0.003, s * (bw + 0.003) + 0.003, '#c8242c'); } G.box('dark', -0.2, 0.2, top + 0.0, top + 0.012, -0.2, 0.2, '#f4f2ee'); G.box('dark', -0.15, 0.15, top + 0.012, top + 0.02, -0.04, 0.04, '#c8242c'); G.box('dark', -0.04, 0.04, top + 0.012, top + 0.02, -0.15, 0.15, '#c8242c'); }
      if (feats.has('lights')) { for (const s of [-1, 1]) { G.box('lampF', hl - 0.05, hl, top - 0.2, top - 0.1, s * (bw - 0.12) - 0.05, s * (bw - 0.12) + 0.05); G.box('lampR', -hl, -hl + 0.04, top - 0.18, top - 0.1, s * (bw - 0.12) - 0.05, s * (bw - 0.12) + 0.05); } }
      if (feats.has('stripe')) G.box('dark', -hl * 0.6, hl * 0.6, top + 0.0, top + 0.012, -0.03, 0.03, '#f2f0e4');
      if (feats.has('vents')) for (let i = 0; i < 4; i++) G.box('dark', -hl + 0.12 + i * 0.07, -hl + 0.15 + i * 0.07, top + 0.0, top + 0.014, -bw * 0.6, bw * 0.6, '#1c1e1a');
      if (feats.has('era')) for (let i = 0; i < 6; i++) for (const j of [-1, 1]) G.box('dark', hl - 0.55 - i * 0.14, hl - 0.45 - i * 0.14, top, top + 0.06, j * bw * 0.45 - 0.05, j * bw * 0.45 + 0.05, shade(base, -0.18));
      if (feats.has('dozer')) { G.prism('dark', [[hl, 0.05], [hl + 0.02, 0.05], [hl + 0.02, 0.45], [hl, 0.45]], -hw - 0.05, hw + 0.05, '#8a8a92'); for (const s of [-1, 1]) G.box('dark', hl - 0.3, hl, 0.2, 0.3, s * hw * 0.5 - 0.03, s * hw * 0.5 + 0.03, '#3a3a42'); }
      if (feats.has('roller')) for (const s of [-1, 1]) G.cyl('dark', 'z', hl + 0.12, 0.14, s * hw * 0.5 - 0.15, 0.14, 0.3, '#6a6a72', { seg: 8 });
      if (feats.has('bridge')) { G.box('dark', -hl + 0.05, hl - 0.05, top, top + 0.07, -bw + 0.02, bw - 0.02, '#7a7a56'); for (let i = 0; i < 7; i++) G.box('dark', -hl + 0.1 + i * ((L - 0.3) / 6), -hl + 0.13 + i * ((L - 0.3) / 6), top + 0.07, top + 0.1, -bw + 0.02, bw - 0.02, '#4a4a30'); }
      if (feats.has('crane')) { G.box('dark', -hl * 0.2, -hl * 0.2 + 0.1, top, top + 0.22, -0.06, 0.06, '#2a2a30'); G.tbox('dark', hl * 0.1, top + 0.55, 0, L * 0.7, 0.07, 0.07, '#c8a02a', 0, 0, 0.55); G.box('dark', hl * 0.55, hl * 0.55 + 0.02, top + 0.1, top + 0.65, -0.01, 0.01, '#16161c'); }
      if (feats.has('pods')) for (const s of [-1, 1]) G.box('dark', -0.2, 0.35, top, top + 0.16, s * (bw - 0.05) - 0.08, s * (bw - 0.05) + 0.08, shade(base, -0.2));
      if (feats.has('dome')) G.blob('dark', -hl * 0.4, top + 0.02, 0, 0.2, 0.18, 0.2, '#c8ced6', 1);
      if (feats.has('antenna')) { G.cyl('dark', 'y', -hl * 0.5, top, bw * 0.7, 0.012, 0.7, '#16161c', { seg: 4 }); G.cyl('dark', 'y', -hl * 0.6, top, -bw * 0.7, 0.012, 0.5, '#16161c', { seg: 4 }); }
      if (feats.has('hatch')) G.cyl('dark', 'y', -hl * 0.35, top, bw * 0.35, 0.1, 0.04, shade(base, -0.2), { seg: 8 });
      if (sp.camo || feats.has('camo')) for (let i = 0; i < 9; i++) G.box('dark', -hl + 0.15 + rnd(i, id.length) * (L - 0.5), -hl + 0.3 + rnd(i, id.length) * (L - 0.5), top + 0.001 + (i % 2) * 0.001, top + 0.012, (rnd(i, 3) - 0.5) * bw * 1.2, (rnd(i, 3) - 0.5) * bw * 1.2 + 0.2, i % 2 ? '#3c4a2c' : '#6a7a4a');
      for (const s of [-1, 1]) G.box('dark', hl - 0.02, hl + 0.01, lift + 0.05, lift + 0.15, s * (bw * 0.6) - 0.06, s * (bw * 0.6) + 0.06, '#16161c'); // tow lugs
      if (feats.has('shield')) G.torus('glow:#4ad8e8', 'y', 0, top + 0.5, 0, Math.max(L, W) * 0.52, 0.015, '#fff', 14, 3);
    },
    wheels,
    subs: [
      {
        name: 'turret', pivot: [tcx, top, 0],
        build(G) {
          if (t.type === 'none' || !t.type) return;
          const r = (t.r || 10) / TILE;
          const th = Math.max(0.2, r * 0.8);
          if (t.type === 'launcher') {
            G.box('dark', -r, r, 0, 0.12, -r * 0.9, r * 0.9, shade(base, -0.15));
            for (let i = 0; i < 4; i++) for (const s of [-1, 1]) G.tbox('dark', 0.1, 0.3, s * (0.06 + (i % 2) * 0.12) + 0, r * 2.2, 0.08, 0.08, '#3a3a40', 0, 0, 0.3);
            return;
          }
          if (t.type === 'mortar') { G.cyl('dark', 'y', 0, 0, 0, r, 0.1, shade(base, -0.1), { seg: 8 }); G.tbox('dark', 0.05, 0.35, 0, 0.1, 0.55, 0.1, '#2a2a30', 0, 0, -0.2); return; }
          if (t.type === 'dome') { G.cyl('dark', 'y', 0, 0, 0, r, 0.1, shade(base, 0.05), { seg: 10 }); G.blob('dark', 0, 0.1, 0, r * 0.9, r * 0.7, r * 0.9, '#c8ced6', 1); return; }
          G.cyl('dark', 'y', 0, 0, 0, r, th, shade(base, 0.08), { seg: angular ? 6 : 10 });
          G.cyl('dark', 'y', 0, th, 0, r * 0.7, 0.04, shade(base, -0.1), { seg: angular ? 6 : 10 });
          G.cyl('dark', 'y', -r * 0.3, th, r * 0.35, 0.07, 0.04, '#2a2c26', { seg: 8 }); // the commander's hatch
          const gl = Math.min((t.gun || 24) / TILE, hl - tcx - r * 0.6 + 0.25);
          const bar = t.barrels || 1;
          for (let i = 0; i < bar; i++) {
            const z = bar > 1 ? (i ? 1 : -1) * 0.1 : 0;
            G.box('dark', r * 0.6, r * 0.6 + gl, th * 0.5 - 0.03, th * 0.5 + 0.03, z - 0.03, z + 0.03, '#33382a');
            if (t.sleeve) G.box('dark', r * 0.8, r * 0.8 + gl * 0.4, th * 0.5 - 0.05, th * 0.5 + 0.05, z - 0.05, z + 0.05, '#2a2e24');
            if (t.brake) G.box('dark', r * 0.6 + gl - 0.1, r * 0.6 + gl, th * 0.5 - 0.055, th * 0.5 + 0.055, z - 0.055, z + 0.055, '#2a2e24');
          }
        },
      },
      { name: 'radar', pivot: [-hl * 0.1, top + 0.12, 0], build(G) { if (!feats.has('radar')) return; G.cyl('dark', 'y', 0, -0.12, 0, 0.03, 0.14, '#3a3e44', { seg: 5 }); G.box('dark', -0.03, 0.03, 0, 0.16, -0.3, 0.3, shade(P.hull2, 0.15)); } },
    ],
    animate(u, v, ctx, dt, st) {
      u.subs.turret.rotation.y = Math.sin(st.t * 0.25 + id.length) * 0.5 * (v.running ? 1.5 : 0.35);
      u.subs.radar.rotation.y = st.t * 1.2;
    },
  };
}

/** A war ground vehicle by its sprite spec id (anvil, wolf, scout, hammer, truck, ...). */
export function buildWarVehicle(id) {
  const sp = SPEC[id];
  if (!sp || sp.gear === undefined) return null;
  const s = groundSpec(id, sp);
  const root = assemble(s, '#ffffff');
  const st = { t: 0 };
  root.userData.update = (v, ctx, dt) => {
    st.t += dt || 0;
    v = v || {};
    const sp2 = Number.isFinite(v.speed) ? v.speed : 0;
    for (const w of root.userData.wheels) { w.spin = (w.spin || 0) - ((sp2 / TILE) / w.r) * (dt || 0); w.mesh.rotation.z = w.spin; if (w.steer) w.pivot.rotation.y = -(v.wheel || 0) * 0.5; }
    s.animate(root.userData, v, ctx, dt, st);
  };
  return root;
}

// ------------------------------------------------------------------------------------------------ helicopters
function heliSpec(id, sp) {
  const L = sp.L / TILE; const W = sp.W / TILE; const tail = sp.tailL / TILE; const rot = sp.rotor / TILE;
  const hull = sp.hull || '#4d5638';
  const dark = shade(hull, -0.18);
  const stealth = Boolean(sp.stealth);
  const total = L + tail;
  const ox = tail / 2; // centre the whole machine: nose at +x
  const gh = 0.22;
  const cy = gh + Math.max(0.3, W * 0.8); // the cabin's centre height
  const hw = Math.max(0.2, W / 2) * 1.15;
  const nblades = sp.blades || (sp.tandem ? 3 : 2);
  const mastX = sp.tandem ? L * 0.28 : 0.0;
  return {
    key: `heli|${id}`,
    build(G) {
      G.shift(ox - 0.0, 0, 0);
      // the cabin and canopy
      const bodyR = hw * 1.25;
      if (stealth) G.prism('dark', [[-L / 2, cy - 0.2], [L / 2 - 0.25, cy - 0.2], [L / 2, cy], [L / 2 - 0.25, cy + 0.28], [-L / 2 + 0.2, cy + 0.34]], -hw, hw, hull);
      else G.blob('dark', 0, cy, 0, L / 2, Math.max(0.28, bodyR * 0.85), hw, hull, 1);
      G.blob('dark', L * 0.22, cy + 0.06, 0, (sp.canopyL || 10) / TILE * 0.7, 0.22, hw * 0.82, '#26384e', 1);
      if (sp.cross) { G.box('dark', -0.12, 0.12, cy + 0.15, cy + 0.17, -0.02 - hw * 0.5, 0.02 - hw * 0.5, '#c8242c'); for (const s of [-1, 1]) { G.box('dark', -0.1, 0.1, cy + 0.0, cy + 0.04, s * (hw + 0.005) - 0.004, s * (hw + 0.005) + 0.004, '#c8242c'); G.box('dark', -0.03, 0.03, cy - 0.06, cy + 0.1, s * (hw + 0.005) - 0.004, s * (hw + 0.005) + 0.004, '#c8242c'); } }
      if (sp.door) for (const s of [-1, 1]) G.box('dark', -L * 0.2, L * 0.1, cy - 0.12, cy + 0.12, s * (hw + 0.003) - 0.004, s * (hw + 0.003) + 0.004, shade(hull, -0.3));
      // tail boom, fin and the horizontal tail
      G.prism('dark', [[-L / 2 + 0.2, cy - 0.06], [-L / 2 - tail, cy + 0.0], [-L / 2 - tail, cy + 0.1], [-L / 2 + 0.2, cy + 0.22]], -0.07, 0.07, hull);
      G.prism('dark', [[-L / 2 - tail + 0.03, cy + 0.05], [-L / 2 - tail - 0.0, cy + 0.45], [-L / 2 - tail + 0.14, cy + 0.38], [-L / 2 - tail + 0.22, cy + 0.05]], -0.03, 0.03, dark);
      G.box('dark', -L / 2 - tail + 0.05, -L / 2 - tail + 0.22, cy + 0.12, cy + 0.15, -0.2, 0.2, dark);
      if (sp.tandem) { G.box('dark', -L * 0.4, -L * 0.3, cy + 0.2, cy + 0.55, -0.1, 0.1, dark); }
      // skids or wheels, and the stub wings with pods
      if (sp.skids && !stealth) for (const s of [-1, 1]) {
        G.box('dark', -L * 0.38, L * 0.34, 0.04, 0.08, s * hw * 0.95 - 0.03, s * hw * 0.95 + 0.03, '#333');
        G.box('dark', L * 0.18 - 0.02, L * 0.18 + 0.02, 0.06, cy - 0.12, s * hw * 0.95 - 0.02, s * hw * 0.95 + 0.02, '#333');
        G.box('dark', -L * 0.18 - 0.02, -L * 0.18 + 0.02, 0.06, cy - 0.12, s * hw * 0.95 - 0.02, s * hw * 0.95 + 0.02, '#333');
      } else for (const s of [-1, 1]) { G.cyl('dark', 'z', L * 0.15, 0.1, s * hw * 0.8 - 0.04, 0.1, 0.08, '#1c1c20', { seg: 8 }); G.cyl('dark', 'z', -L * 0.2, 0.1, s * hw * 0.8 - 0.04, 0.1, 0.08, '#1c1c20', { seg: 8 }); G.box('dark', L * 0.15 - 0.02, L * 0.15 + 0.02, 0.1, cy - 0.15, s * hw * 0.8 - 0.02, s * hw * 0.8 + 0.02, '#333'); G.box('dark', -L * 0.2 - 0.02, -L * 0.2 + 0.02, 0.1, cy - 0.15, s * hw * 0.8 - 0.02, s * hw * 0.8 + 0.02, '#333'); }
      if (sp.wings) for (const s of [-1, 1]) {
        G.box('dark', -0.1, 0.25, cy - 0.04, cy + 0.02, s * hw, s * (hw + 0.5), dark);
        if (sp.pods) for (const f of [0.18, 0.42]) G.cyl('dark', 'x', -0.05, cy - 0.12, s * (hw + 0.5 * (f / 0.42)), 0.07, 0.38, '#3a3e38', { seg: 6 });
      }
      if (sp.nose) G.box('dark', L / 2 - 0.05, L / 2 + 0.2, cy - 0.15, cy - 0.1, -0.025, 0.025, '#2a2a2e');
      if (sp.sling) G.box('dark', 0, 0.02, 0.5, cy - 0.3, -0.01, 0.01, '#16161c');
      G.cyl('dark', 'y', mastX, cy + 0.2, 0, 0.05, 0.22, '#333', { seg: 6 }); // the rotor mast
      if (sp.tandem) G.cyl('dark', 'y', -L * 0.35, cy + 0.5, 0, 0.05, 0.1, '#333', { seg: 6 });
      G.shift(0, 0, 0);
    },
    subs: [
      {
        name: 'rotor', pivot: [ox + mastX, cy + 0.42, 0],
        build(G) { for (let i = 0; i < nblades; i++) { const a = (i / nblades) * Math.PI * 2; G.tbox('dark', Math.cos(a) * rot / 2, 0, -Math.sin(a) * rot / 2, rot, 0.025, 0.1, '#2a2c30', 0, a, 0); } },
      },
      {
        name: 'rotor2', pivot: [ox - L * 0.35, cy + 0.6, 0],
        build(G) { if (!sp.tandem) return; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; G.tbox('dark', Math.cos(a) * rot / 2, 0, -Math.sin(a) * rot / 2, rot, 0.025, 0.1, '#2a2c30', 0, a, 0); } },
      },
      { name: 'tailrotor', pivot: [ox - L / 2 - tail + 0.04, cy + 0.2, 0.09], build(G) { G.box('dark', -0.01, 0.01, -0.18, 0.18, -0.01, 0.01, '#2a2c30'); G.box('dark', -0.01, 0.01, -0.01, 0.01, -0.01, 0.04, '#333'); } },
    ],
    total,
  };
}

/** A helicopter by its sprite spec id (wren, drover, viper, talon, mercy, ox, shade, tempest). */
export function buildHelicopter(id) {
  const sp = SPEC[id];
  if (!sp || sp.rotor === undefined) return null;
  const s = heliSpec(id, sp);
  const root = assemble(s, '#ffffff');
  const st = { t: 0, phase: 0.6 };
  root.userData.update = (v, ctx, dt) => {
    st.t += dt || 0;
    v = v || {};
    const u = root.userData;
    st.phase += v.running ? (dt || 0) * 28 : 0;
    u.subs.rotor.rotation.y = st.phase;
    if (u.subs.rotor2) u.subs.rotor2.rotation.y = -st.phase * 0.9;
    u.subs.tailrotor.rotation.z = st.phase * 1.4;
  };
  return root;
}
