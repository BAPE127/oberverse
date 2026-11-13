// Light in 3D (docs/RENDERING.md 7.2): a sun with a shadow map, a hemisphere of sky, and a pool of point lights for street
// lamps, lit doors, open rooms and headlights, all driven by `clock.darkness`. The presets are the concept study's.
import { THREE } from './three.js';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export const PRESETS = {
  day: { sun: '#fff0d2', sunI: 2.5, sunDir: [-0.55, 1.0, 0.7], sky: '#c6d8ea', gnd: '#7a6e5e', hemiI: 1.15, bg: '#27353d' },
  dusk: { sun: '#ff9a5c', sunI: 1.5, sunDir: [-1.0, 0.36, 0.5], sky: '#6f7fae', gnd: '#4a3d3a', hemiI: 0.55, bg: '#1d1f2c' },
  night: { sun: '#8fa6e6', sunI: 0.7, sunDir: [-0.4, 1.0, 0.75], sky: '#3f4f88', gnd: '#1e2030', hemiI: 0.95, bg: '#0a0c14' }, // (a little brighter than the study's: it has to be played in)
  indoor: { sun: '#fff0d2', sunI: 0.4, sunDir: [-0.55, 1.0, 0.7], sky: '#efe3cf', gnd: '#8a7a68', hemiI: 1.45, bg: '#1b1620' },
};

const tmp = new THREE.Color();
const mixHex = (a, b, t) => '#' + tmp.set(a).lerp(new THREE.Color(b), t).getHexString();

/** The preset for a darkness in 0..1: day, through dusk at 0.5, to night at 1. Indoors only (no street in the scene): the room preset, dimmed a little at night. */
export function presetFor(darkness, outdoor = true) {
  const d = Math.max(0, Math.min(1, darkness));
  if (!outdoor) { const k = d * 0.3; return { ...PRESETS.indoor, hemiI: PRESETS.indoor.hemiI * (1 - k), sunI: PRESETS.indoor.sunI * (1 - k) }; }
  const [a, b, t] = d < 0.5 ? [PRESETS.day, PRESETS.dusk, d / 0.5] : [PRESETS.dusk, PRESETS.night, (d - 0.5) / 0.5];
  return {
    sun: mixHex(a.sun, b.sun, t), sunI: lerp(a.sunI, b.sunI, t), sunDir: a.sunDir.map((v, i) => lerp(v, b.sunDir[i], t)),
    sky: mixHex(a.sky, b.sky, t), gnd: mixHex(a.gnd, b.gnd, t), hemiI: lerp(a.hemiI, b.hemiI, t), bg: mixHex(a.bg, b.bg, t),
  };
}

/** How far lamps and lit windows are on: 0 by day, 1 at night. */
export const lampFactor = (darkness) => smooth(0.25, 0.6, darkness);

const POOL = 24;
const SIZES = [0, 8, 16, 24]; // the pool is sized in steps so a light-count change recompiles shaders rarely

export class LightRig {
  constructor(scene) {
    this.scene = scene;
    this.hemi = new THREE.HemisphereLight('#c6d8ea', '#7a6e5e', 1);
    this.sun = new THREE.DirectionalLight('#fff0d2', 2.5);
    this.sun.target.position.set(0, 0, 0);
    scene.add(this.hemi, this.sun, this.sun.target);
    this.pool = [];
    for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight('#ffffff', 0, 8, 1.7); l.visible = true; this.pool.push(l); }
    this.size = 0;
    this.shadows = null;
    this.setShadows(true);
    this.used = 0;
  }

  /** Shadows on or off (quality 'low' turns them off). */
  setShadows(on) {
    if (this.shadows === on) return;
    this.shadows = on;
    const s = this.sun;
    s.castShadow = on;
    if (on) {
      const sc = s.shadow.camera;
      sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.near = 1; sc.far = 320;
      s.shadow.mapSize.set(2048, 2048);
      s.shadow.bias = -0.0006; s.shadow.normalBias = 0.03; s.shadow.radius = 2.2;
      sc.updateProjectionMatrix();
    }
  }

  /**
   * One frame. `focus` is [x, z] in tiles (the sun and its shadow follow it); `candidates` a list of
   * { x, y, z, color, intensity, distance, prio?, always? } in world tiles. Returns the preset used.
   */
  update(darkness, outdoor, focus, candidates, quality = 'high') {
    const P = presetFor(darkness, outdoor);
    this.hemi.color.set(P.sky); this.hemi.groundColor.set(P.gnd); this.hemi.intensity = P.hemiI;
    this.sun.color.set(P.sun); this.sun.intensity = P.sunI;
    this.setShadows(quality !== 'low' && outdoor);
    const fx = Math.round(focus[0]); const fz = Math.round(focus[1]); // (snapped: the shadow map doesn't swim with the camera)
    const d = P.sunDir; const n = Math.hypot(d[0], d[1], d[2]);
    this.sun.position.set(fx + (d[0] / n) * 120, (d[1] / n) * 120, fz + (d[2] / n) * 120);
    this.sun.target.position.set(fx, 0, fz);
    this.sun.target.updateMatrixWorld();
    // the point lights: lamps burn by night (rooms always burn), the nearest ones win
    const k = outdoor ? lampFactor(darkness) : 1;
    let list = [];
    if (k > 0.02 || !outdoor) {
      list = candidates.map((c) => ({ c, d: Math.hypot(c.x - focus[0], c.z - focus[1]) - (c.prio || 0) })).sort((a, b) => a.d - b.d).slice(0, POOL);
    }
    const want = list.length;
    const size = SIZES.find((s) => s >= want) ?? POOL;
    if (size !== this.size) {
      for (const l of this.pool) this.scene.remove(l);
      for (let i = 0; i < size; i++) this.scene.add(this.pool[i]);
      this.size = size;
    }
    for (let i = 0; i < this.size; i++) {
      const l = this.pool[i];
      const e = list[i];
      if (!e) { l.intensity = 0; continue; }
      const c = e.c;
      l.position.set(c.x, c.y, c.z);
      l.color.set(c.color || '#ffd9a0');
      l.intensity = c.intensity * (c.always ? Math.max(k, outdoor ? 0.25 : 1) : k);
      l.distance = c.distance || 8;
    }
    this.used = want;
    return P;
  }

  dispose() {
    for (const l of this.pool) this.scene.remove(l);
    this.scene.remove(this.hemi, this.sun, this.sun.target);
    this.sun.shadow.map?.dispose();
  }
}
