// The battle's fire, smoke, dust, sparks and tracers in the 3D scene (docs/RENDERING.md 7). The particles themselves are the 2D battle's
// FxLayer (src/engine/drawBattleFx.js): what spawns them, how long they live and how they drift is unchanged, and the Canvas 2D fallback
// still paints them. Here each one is a small low-poly blob at its real place in the scene, so smoke behind a building is hidden by it,
// fire in a window sits in the window, and nothing is painted over the roofs any more. This is paint only: the simulation never reads it.
//
// Mapping from FxLayer: a particle sits at a ground point (x, y, world px) and a height z (px), plus a screen drift (ox, oy) in iso px.
// In the 2:1 projection a screen drift of ox is a ground move of (ox/2, -ox/2) and a drift of oy is a height of -oy, so the blob lands on
// the very pixel the 2D layer painted. One tile is 32 px and one unit of the scene.
import { THREE } from './three.js';

const TP = 32;
const CAP = 600; // FxLayer keeps at most 600 particles
const LINES = 80; // and 80 tracers
const FIRE = ['#fff4b8', '#ffd24a', '#ff9a24', '#e8581a', '#b02a12', '#6a1408', '#2a0a08'];
const SMOKE = ['#a8a8b6', '#7e7e8c', '#585864', '#383842', '#1e1e26'];
const DUST = ['#e0cdb0', '#c0aa8c', '#98826a', '#6e5c44', '#4a3c2c'];
const SCREEN = ['#f6f6fa', '#dcdce6', '#c0c0ce', '#a2a2b2', '#84849a'];
const ALPHA = [0.9, 0.65, 0.42, 0.22]; // the soft kinds are drawn in four opacity bands (instanced meshes have one opacity each)
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _X = new THREE.Vector3(1, 0, 0);
const _d = new THREE.Vector3();
const _Y = new THREE.Vector3(0, 1, 0);
const _LIGHT = new THREE.Color('#c9c7cf'); // smoke and dust are drawn a little lighter than the 2D ramp: lit grey blobs read as stones

/** The colour and look of one FxLayer particle at its age, as the 2D layer chooses them. */
export function particleLook(q) {
  const f = q.age / q.life;
  if (q.k === 'fire' || q.k === 'flash' || q.k === 'spark') {
    let level = Math.min(6, Math.floor(f * 7)); if (q.k === 'flash') level = f > 0.5 ? 2 : 0; if (q.k === 'spark') level = Math.min(3, Math.floor(f * 4));
    return { glow: true, color: FIRE[level], alpha: 1 };
  }
  if (q.k === 'screen') return { glow: false, color: SCREEN[Math.min(3, Math.floor(f * 4))], alpha: Math.min(0.9, 2.2 * (1 - f)) };
  if (q.k === 'dust') return { glow: false, color: DUST[Math.min(4, Math.floor(f * 5))], alpha: 1 - f };
  return { glow: false, color: SMOKE[Math.min(4, Math.floor(0.4 * 5 + f * 2))], alpha: 1 - f };
}

/** Where an FxLayer particle is in the scene (tiles; y up) and its radius in tiles. */
export function particlePlace(q) {
  const h = (q.z || 0) - (q.oy || 0); const gx = (q.x + (q.ox || 0) / 2) / TP; const gz = (q.y - (q.ox || 0) / 2) / TP;
  const r = Math.max(1, Math.round(q.s)) * 2 / TP; // (r art pixels of two screen pixels each)
  return { x: gx, y: Math.max(r * 0.5, h / TP), z: gz, r };
}

/** The bright segment of a tracer at its age: from a to b (world px, height z), moving along as the 2D dashes did. */
export function tracerSpan(l) {
  const t0 = Math.min(1, (l.age * 0.9) / 9); const t1 = Math.min(1, t0 + 0.45);
  return { x0: (l.x0 + (l.x1 - l.x0) * t0) / TP, z0: (l.y0 + (l.y1 - l.y0) * t0) / TP, x1: (l.x0 + (l.x1 - l.x0) * t1) / TP, z1: (l.y0 + (l.y1 - l.y0) * t1) / TP, y: (l.z || 0) / TP };
}

export class BattleFx3D {
  constructor(parent) {
    this.group = new THREE.Group(); parent.add(this.group);
    this.blob = new THREE.IcosahedronGeometry(1, 0);
    this.rod = new THREE.BoxGeometry(1, 1, 1);
    const glowMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    this.glow = this.mesh(this.blob, glowMat, CAP);
    this.soft = ALPHA.map((a) => this.mesh(this.blob, new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: a, depthWrite: false, flatShading: true }), CAP));
    this.lines = this.mesh(this.rod, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, opacity: 0.95 }), LINES);
    this.count = 0;
  }

  mesh(geo, mat, n) {
    const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); this.group.add(m); return m;
  }

  /** Draw what the FxLayer holds now. `far`: the overview tier, where the 2D layer drew them too (they stay, smaller things go). */
  sync(fx, far = false) {
    const glow = this.glow; const soft = this.soft; glow.count = 0; for (const s of soft) s.count = 0;
    let k = 0;
    const put = (m, x, y, z, r, color, soft) => {
      if (m.count >= CAP) return; k++;
      // each puff turned its own way (a hash of its place in the list), so a cloud is not a row of the same stone
      const a = ((k * 2654435761) >>> 0) / 4294967296 * Math.PI * 2; _q.setFromAxisAngle(_Y, a);
      _p.set(x, y, z); _s.set(r, r * (soft ? 0.78 : 0.9), r); _m.compose(_p, _q, _s); m.setMatrixAt(m.count, _m);
      _c.set(color); if (soft) _c.lerp(_LIGHT, 0.35); m.setColorAt(m.count, _c); m.count++;
    };
    for (const q of fx?.p || []) {
      if (far && (q.k === 'spark' || q.k === 'flash')) continue;
      const L = particleLook(q); const P = particlePlace(q);
      if (L.glow) put(glow, P.x, P.y, P.z, P.r * (q.k === 'fire' ? 0.8 : 1), L.color, false);
      else { const al = L.alpha * 0.7; const band = al > 0.78 ? 0 : al > 0.53 ? 1 : al > 0.3 ? 2 : al > 0.08 ? 3 : -1; if (band >= 0) put(soft[band], P.x, P.y + P.r * 0.3, P.z, P.r * 1.2, L.color, true); }
    }
    const ln = this.lines; ln.count = 0;
    if (!far) for (const l of fx?.lines || []) {
      if (ln.count >= LINES) break;
      const S = tracerSpan(l); const len = Math.hypot(S.x1 - S.x0, S.z1 - S.z0); if (len < 0.02) continue;
      _d.set((S.x1 - S.x0) / len, 0, (S.z1 - S.z0) / len); _q.setFromUnitVectors(_X, _d);
      _p.set((S.x0 + S.x1) / 2, S.y, (S.z0 + S.z1) / 2); _s.set(len, 0.035, 0.035); _m.compose(_p, _q, _s);
      ln.setMatrixAt(ln.count, _m); _c.set(l.side === 'p' ? '#e8ffe0' : '#ffd9a0'); ln.setColorAt(ln.count, _c); ln.count++;
    }
    for (const m of [glow, ...soft, ln]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    this.count = glow.count + soft.reduce((a, s) => a + s.count, 0) + ln.count;
    return this.count;
  }

  dispose() {
    this.group.removeFromParent();
    this.blob.dispose(); this.rod.dispose();
    for (const m of [this.glow, ...this.soft, this.lines]) { m.material.dispose(); m.dispose?.(); }
  }
}
