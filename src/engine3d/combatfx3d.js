// Combat effects in 3D: a pure function of `game.combat` (bullets, particles, decals, fx) and `game.heavy`, drawn as meshes
// in the lit scene. Everything is pooled or instanced with fixed caps: nothing is allocated per frame once the pools exist.
//
//   bullets      thin emissive streaks (instanced) at chest height; the odd ammunition (coins, cards, fish, rays...) as small pooled models
//   particles    blood droplets, cases, coins, confetti: small instanced boxes along the simulation's arcs
//   decals       blood spatter and pools, spent cases, scorch marks and tyre marks: flat soft-edged quads on the ground (instanced, faded by the simulation's own clock)
//   fx           muzzle flashes (at the held model's muzzle, plus one point light), swings, impact sparks and dust, blasts
//   heavy        rockets in flight with a smoke trail, drones above their shadows
//
// DOM-free at import: the soft textures are made on first use and only when a canvas exists (Node tests run without them).
import { THREE } from './three.js';
import { holeLit } from './buildings3d.js';
import { FUTURE_LOOKS } from '../content/futureArms.js';

const TILE = 32;
const BODY_Y = 18; // px: combat stores chest-plane y minus this
const CHEST = BODY_Y / TILE;
export const CAPS = { bits: 360, streaks: 96, decal: 300, odd: 20, flash: 6, spark: 10, swing: 3, blast: 4, rocket: 6, drone: 6, trail: 6 };
const CONFETTI = ['#e86ab0', '#6ad0e8', '#f2e05a', '#8ae86a', '#f2a33a'];
const hash = (a, b = 0) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const seed = (d) => Math.round(d.x * 3.1 + d.y * 7.7 + (d.at || 0) * 13);

const _m = new THREE.Matrix4(); const _q = new THREE.Quaternion(); const _p = new THREE.Vector3(); const _s = new THREE.Vector3(); const _e = new THREE.Euler(); const _c = new THREE.Color();

/** Fade by an instance attribute on top of the shared hole/shadow patch. */
function alphaPatch(m) {
  holeLit(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'attribute float instAlpha;\nvarying float vIA;\nvoid main() {\n  vIA = instAlpha;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vIA;\nvoid main() {').replace('#include <dithering_fragment>', 'gl_FragColor.a *= vIA;\n#include <dithering_fragment>');
  };
  m.customProgramCacheKey = () => 'oberDecalAlpha24n';
  return m;
}

function softTexture(kind, v) {
  if (typeof document === 'undefined') return null;
  const S = 64;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const blob = (x, y, r, col, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(0.55, col.replace('A', a * 0.8)); g.addColorStop(1, col.replace('A', 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  const rnd = (i) => hash(v * 31 + i, kind.length);
  if (kind === 'blood') { // a main splash with a few satellites, thrown in one direction
    blob(32, 32, 9 + rnd(0) * 4, 'rgba(120,12,18,A)', 0.95);
    for (let i = 0; i < 6 + v; i++) { const a = rnd(i + 1) * 6.28; const d = 8 + rnd(i + 9) * 18; blob(32 + Math.cos(a) * d, 32 + Math.sin(a) * d * 0.7, 2 + rnd(i + 20) * 4, 'rgba(110,10,16,A)', 0.9); }
  } else if (kind === 'pool') {
    for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28 + rnd(i); blob(32 + Math.cos(a) * 7, 32 + Math.sin(a) * 6, 14 + rnd(i + 3) * 6, 'rgba(105,10,16,A)', 0.9); }
    blob(32, 32, 22, 'rgba(92,8,14,A)', 0.95);
  } else if (kind === 'scorch') {
    blob(32, 32, 31, 'rgba(18,15,13,A)', 0.95);
    for (let i = 0; i < 8; i++) { const a = rnd(i) * 6.28; blob(32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14, 8 + rnd(i + 4) * 6, 'rgba(14,12,10,A)', 0.6); }
  } else { // skid: soft across its width
    const g = c.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(20,20,24,0)'); g.addColorStop(0.5, 'rgba(20,20,24,1)'); g.addColorStop(1, 'rgba(20,20,24,0)');
    c.fillStyle = g; c.fillRect(0, 0, S, S);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** An instanced flat quad family with per-instance fade. */
class DecalSet {
  constructor(kind, v, cap, parent) {
    this.cap = cap;
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    geo.setAttribute('instAlpha', this.alpha);
    const map = softTexture(kind, v);
    this.mat = alphaPatch(new THREE.MeshLambertMaterial({ map, color: map ? '#ffffff' : kind === 'blood' || kind === 'pool' ? '#6a0c12' : '#14120f', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    this.mesh = new THREE.InstancedMesh(geo, this.mat, cap);
    this.mesh.frustumCulled = false; this.mesh.receiveShadow = true; this.mesh.count = 0; this.mesh.renderOrder = 1;
    parent.add(this.mesh);
    this.n = 0;
  }

  begin() { this.n = 0; }

  add(x, y, z, yaw, sx, sz, a) {
    if (this.n >= this.cap || a <= 0.01) return;
    _p.set(x, y, z); _q.setFromAxisAngle(_UP, yaw); _s.set(sx, 1, sz);
    this.mesh.setMatrixAt(this.n, _m.compose(_p, _q, _s));
    this.alpha.array[this.n++] = a;
  }

  end() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; this.alpha.needsUpdate = true; }

  dispose() { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.mat.map?.dispose(); this.mat.dispose(); this.mesh.dispose(); }
}
const _UP = new THREE.Vector3(0, 1, 0);

/** Instanced small boxes with a colour each (droplets, cases, coins, confetti, streaks). */
class BitSet {
  constructor(cap, geo, mat, parent) {
    this.cap = cap; this.n = 0;
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    parent.add(this.mesh);
  }

  begin() { this.n = 0; }

  add(x, y, z, rx, ry, sx, sy, sz, color) {
    if (this.n >= this.cap) return;
    _p.set(x, y, z); _q.setFromEuler(_e.set(rx, ry, 0, 'YXZ')); _s.set(sx, sy, sz);
    this.mesh.setMatrixAt(this.n, _m.compose(_p, _q, _s));
    _c.set(color); this.mesh.setColorAt(this.n++, _c);
  }

  end() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; if (this.n) this.mesh.instanceColor.needsUpdate = true; }

  dispose() { this.mesh.removeFromParent(); this.mesh.dispose(); }
}

const basic = (color, o = {}) => { const m = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: Boolean(o.opacity !== undefined), opacity: o.opacity ?? 1, depthWrite: !o.opacity, side: o.double ? THREE.DoubleSide : THREE.FrontSide }); m.userData.keep = false; return m; };

export class CombatFx3D {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'combatfx';
    scene.add(this.group);
    this.owned = [];
    const own = (o) => { this.owned.push(o); return o; };
    this.boxG = own(new THREE.BoxGeometry(1, 1, 1));
    this.litBits = own(new THREE.MeshLambertMaterial({ color: '#ffffff' })); holeLit(this.litBits);
    this.glowBits = own(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
    this.bits = new BitSet(CAPS.bits, this.boxG, this.litBits, this.group);
    this.streaks = new BitSet(CAPS.streaks, this.boxG, this.glowBits, this.group);
    this.decals = { blood: [0, 1, 2].map((v) => new DecalSet('blood', v, CAPS.decal, this.group)), pool: [0, 1].map((v) => new DecalSet('pool', v, 24, this.group)), scorch: new DecalSet('scorch', 0, 32, this.group), skid: new DecalSet('skid', 0, CAPS.decal, this.group) };
    this.odd = new Map(); // kind -> { items: [group], used }
    this.flashes = Array.from({ length: CAPS.flash }, () => this.makeFlash());
    this.sparks = Array.from({ length: CAPS.spark }, () => this.makeSpark());
    this.swings = Array.from({ length: CAPS.swing }, () => this.makeSwing());
    this.blasts = Array.from({ length: CAPS.blast }, () => this.makeBlast());
    this.rockets = Array.from({ length: CAPS.rocket }, () => this.makeRocket());
    this.drones = Array.from({ length: CAPS.drone }, () => this.makeDrone());
    this.slot = new Map(); // fx object -> pool entry
    this.bulletOrigin = new Map(); // bullet -> { x, y }
    this.stats = { bits: 0, streaks: 0, decals: 0, odd: 0, flashes: 0 };
    this.light = null;
  }

  reset() { this.slot.clear(); this.bulletOrigin.clear(); }

  dispose() {
    for (const d of [...this.decals.blood, ...this.decals.pool, this.decals.scorch, this.decals.skid]) d.dispose();
    this.bits.dispose(); this.streaks.dispose();
    for (const o of this.owned) o.dispose();
    this.group.traverse((o) => { if (o.material && !o.material.userData.keep) o.material.dispose?.(); if (o.geometry && o.geometry !== this.boxG) o.geometry.dispose?.(); });
    this.group.removeFromParent();
  }

  // ------------------------------------------------------------------ builders (each returns a hidden entry)
  hidden(g) { g.visible = false; this.group.add(g); return { g, key: null }; }

  makeFlash() {
    const g = new THREE.Group();
    const mat = basic('#ffd878', { opacity: 0.95, double: true });
    const star = new THREE.PlaneGeometry(1, 1);
    const a = new THREE.Mesh(star, mat); const b = new THREE.Mesh(star, mat); b.rotation.z = Math.PI / 4;
    const c = new THREE.Mesh(star, mat); c.rotation.y = Math.PI / 2; // (a second set stands across, so the star shows from every side)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 6), basic('#fff4d0', { opacity: 0.9 }));
    cone.rotation.x = Math.PI / 2; cone.position.z = 0.5;
    g.add(a, b, c, cone);
    g.userData.mats = [mat, cone.material]; g.userData.geos = [star, cone.geometry];
    return this.hidden(g);
  }

  makeSpark() {
    const g = new THREE.Group(); const m = basic('#ffe08a');
    for (let i = 0; i < 5; i++) g.add(new THREE.Mesh(this.boxG, m));
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), basic('#b8b2a4', { opacity: 0.5 }));
    g.add(puff);
    g.userData.puff = puff; g.userData.mats = [m, puff.material]; g.userData.geos = [puff.geometry];
    return this.hidden(g);
  }

  makeSwing() {
    const N = 13;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    const idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    const m = basic('#ffffff', { opacity: 0.6, double: true });
    const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false;
    const g = new THREE.Group(); g.add(mesh);
    g.userData.mesh = mesh; g.userData.mats = [m]; g.userData.geos = [geo];
    return this.hidden(g);
  }

  makeBlast() {
    const g = new THREE.Group();
    const ico = new THREE.IcosahedronGeometry(1, 1);
    const fire = new THREE.Mesh(ico, basic('#ff8a2a', { opacity: 0.85 }));
    const core = new THREE.Mesh(ico, basic('#fff0b0', { opacity: 0.95 }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 28), basic('#ffffff', { opacity: 0.5, double: true })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
    const smokeM = basic('#4a443e', { opacity: 0.5 });
    const smoke = [0, 1, 2, 3].map(() => new THREE.Mesh(ico, smokeM));
    const debM = basic('#2a2622');
    const debris = Array.from({ length: 7 }, () => new THREE.Mesh(this.boxG, debM));
    g.add(fire, core, ring, ...smoke, ...debris);
    g.userData = { fire, core, ring, smoke, debris, mats: [fire.material, core.material, ring.material, smokeM, debM], geos: [ico, ring.geometry] };
    return this.hidden(g);
  }

  makeRocket() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), new THREE.MeshLambertMaterial({ color: '#5a6a3a' })); body.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 8), new THREE.MeshLambertMaterial({ color: '#c0302a' })); nose.rotation.x = Math.PI / 2; nose.position.z = 0.34;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), basic('#ffb04a', { opacity: 0.9 })); flame.rotation.x = -Math.PI / 2; flame.position.z = -0.38;
    const puffM = basic('#d8d8d8', { opacity: 0.35 });
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const trail = Array.from({ length: CAPS.trail }, () => new THREE.Mesh(ico, puffM));
    g.add(body, nose, flame);
    const root = new THREE.Group(); root.add(g); for (const t of trail) root.add(t);
    root.userData = { g, flame, trail, mats: [body.material, nose.material, flame.material, puffM], geos: [body.geometry, nose.geometry, flame.geometry, ico] };
    return this.hidden(root);
  }

  makeDrone() {
    const g = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: '#2a2c32' });
    const body = new THREE.Mesh(this.boxG, dark); body.scale.set(0.26, 0.1, 0.26);
    const arm = new THREE.Mesh(this.boxG, dark); arm.scale.set(0.5, 0.03, 0.04); arm.rotation.y = Math.PI / 4;
    const arm2 = new THREE.Mesh(this.boxG, dark); arm2.scale.set(0.5, 0.03, 0.04); arm2.rotation.y = -Math.PI / 4;
    const rotM = basic('#c8c8d2', { opacity: 0.45, double: true });
    const disc = new THREE.CircleGeometry(0.11, 10); disc.rotateX(-Math.PI / 2);
    const rots = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => { const r = new THREE.Mesh(disc, rotM); r.position.set(a * 0.17, 0.06, b * 0.17); return r; });
    const led = new THREE.Mesh(this.boxG, basic('#ff3a2a')); led.scale.set(0.04, 0.04, 0.04); led.position.y = 0.06;
    const shGeo = new THREE.CircleGeometry(0.3, 14); shGeo.rotateX(-Math.PI / 2);
    const shadow = new THREE.Mesh(shGeo, basic('#10121c', { opacity: 0.28 }));
    const air = new THREE.Group(); air.add(body, arm, arm2, led, ...rots);
    const root = new THREE.Group(); root.add(air, shadow);
    root.userData = { air, shadow, led, mats: [dark, rotM, led.material, shadow.material], geos: [disc, shGeo] };
    return this.hidden(root);
  }

  /** The small model of an odd bullet, or null. Built once per pool slot. */
  makeOdd(kind) {
    const L = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...o });
    const B = (w, h, d, m, x = 0, y = 0, z = 0) => { const q = new THREE.Mesh(this.boxG, m); q.scale.set(w, h, d); q.position.set(x, y, z); return q; };
    const g = new THREE.Group(); const mats = [];
    const mt = (m) => { mats.push(m); return m; };
    switch (kind) {
      case 'pigeon': { const gr = mt(L('#8a8a96')); const wing = B(0.34, 0.025, 0.14, mt(L('#6a6a76')), 0, 0.04, 0); wing.name = 'wing'; g.add(B(0.12, 0.1, 0.26, gr), B(0.08, 0.08, 0.08, mt(L('#b0b0ba')), 0, 0.05, 0.16), B(0.025, 0.025, 0.05, mt(L('#e8a040')), 0, 0.045, 0.22), wing); break; }
      case 'fish': g.add(B(0.1, 0.12, 0.34, mt(L('#8ab0c8'))), B(0.1, 0.012, 0.3, mt(L('#d0e8f0')), 0, 0.06, 0), B(0.012, 0.14, 0.1, mt(L('#4a7aa8')), 0, 0, -0.22), B(0.03, 0.03, 0.03, mt(L('#14141e')), 0.05, 0.02, 0.14)); break;
      case 'cheese': g.add(B(0.16, 0.12, 0.16, mt(L('#f2c14e', { emissive: '#3a2a08' }))), B(0.17, 0.03, 0.04, mt(L('#c8902a')), 0, 0.01, 0.03)); break;
      case 'coin': { const q = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.016, 12), mt(basic('#f2c84a'))); q.rotation.z = Math.PI / 2; g.add(q); break; }
      case 'nail': g.add(B(0.014, 0.014, 0.2, mt(L('#c9ced4', { emissive: '#505860' }))), B(0.04, 0.04, 0.012, mt(L('#8a9098')), 0, 0, -0.1)); break;
      case 'chalk': g.add(B(0.04, 0.04, 0.14, mt(basic('#f0f0e8'))), B(0.025, 0.025, 0.3, mt(basic('#f0f0e8', { opacity: 0.35 })), 0, 0, -0.2)); break;
      case 'ray': g.add(B(0.05, 0.05, 1.3, mt(basic('#5aff8a', { opacity: 0.55 })), 0, 0, -0.5), B(0.03, 0.03, 0.5, mt(basic('#e0ffe8')), 0, 0, -0.1)); break;
      case 'harpoon': g.add(B(0.02, 0.02, 0.8, mt(L('#8a6a3a')), 0, 0, -0.35), B(0.03, 0.03, 0.3, mt(L('#c9ced4', { emissive: '#505860' })), 0, 0, 0.1), B(0.1, 0.012, 0.06, mt(L('#c9ced4')), 0, 0, 0.0)); break;
      case 'card': g.add(B(0.1, 0.01, 0.14, mt(L('#f6f2e8', { emissive: '#605c50' })))); break;
      case 'ring': { const t = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.016, 5, 14, 2.4), mt(basic('#e8c35a'))); t.rotation.set(0, Math.PI / 2, 0); g.add(t); break; }
      case 'confetti': for (let i = 0; i < 4; i++) { const q = B(0.04, 0.012, 0.04, mt(basic(CONFETTI[i]))); q.name = `c${i}`; g.add(q); } break;
      default: return null;
    }
    g.userData.mats = mats;
    this.group.add(g); g.visible = false;
    return g;
  }

  // ------------------------------------------------------------------ the frame
  /** One frame. `world` is the World3D (figures, cands, host); everything is read from the game. */
  update(world) {
    const host = world.host; const game = host.game; const t = game.realTime; const p = game.player;
    const L = host.layers.find((l) => l.map.id === p.map);
    this.hideAll();
    if (!L) return;
    const ox = L.x / TILE; const oz = L.y / TILE;
    const y0 = L.map.kind === 'interior' ? 0.045 : 0;
    const C = game.combat; const H = game.heavy;
    this.drawDecals(game, L, ox, oz, y0, t);
    this.drawParticles(C, p, ox, oz, y0);
    this.drawBullets(C, game, p, ox, oz, world, t);
    this.drawFx(C, game, world, ox, oz, y0, t);
    if (H) this.drawHeavy(H, ox, oz, y0, t);
    this.stats.bits = this.bits.n; this.stats.streaks = this.streaks.n;
  }

  hideAll() {
    for (const list of [this.flashes, this.sparks, this.swings, this.blasts, this.rockets, this.drones]) for (const e of list) e.g.visible = false;
    for (const o of this.odd.values()) { for (const g of o.items) g.visible = false; o.used = 0; }
    this.bits.begin(); this.streaks.begin();
    for (const d of [...this.decals.blood, ...this.decals.pool, this.decals.scorch, this.decals.skid]) d.begin();
    this.used = { flash: 0, spark: 0, swing: 0, blast: 0, rocket: 0, drone: 0 };
    this.stats.flashes = 0; this.light = null;
  }

  take(list, name) { const i = this.used[name]; if (i >= list.length) return null; this.used[name]++; const e = list[i]; e.g.visible = true; return e; }

  oddFor(kind) {
    let o = this.odd.get(kind);
    if (!o) { o = { items: [], used: 0, bad: false }; this.odd.set(kind, o); }
    if (o.bad || o.used >= CAPS.odd) return null;
    if (o.used >= o.items.length) { const g = this.makeOdd(kind); if (!g) { o.bad = true; return null; } o.items.push(g); }
    const g = o.items[o.used++]; g.visible = true; return g;
  }

  drawDecals(game, L, ox, oz, y0, t) {
    const C = game.combat; const mapId = L.map.id;
    let n = 0;
    for (const d of C.decals) {
      if (d.map !== mapId) continue;
      const age = t - d.at;
      const a = Math.max(0, Math.min(1, (240 - age) / 60));
      if (a <= 0) continue;
      const x = d.x / TILE + ox; const z = d.y / TILE + oz; const r = hash(seed(d), 1);
      n++;
      if (d.kind === 'blood') this.decals.blood[Math.floor(hash(seed(d), 2) * 3)].add(x, y0 + 0.014, z, r * 6.28, 0.16 + (d.size || 1) * 0.1 + r * 0.06, 0.16 + (d.size || 1) * 0.08 + r * 0.05, 0.85 * a);
      else if (d.kind === 'pool') { const k = Math.min(1, age / 3); const e = 1 - (1 - k) * (1 - k); const s = 0.25 + e * 0.75; this.decals.pool[Math.floor(hash(seed(d), 3) * 2)].add(x, y0 + 0.016, z, r * 6.28, s * 1.05, s * 0.85, 0.85 * a); }
      else if (d.kind === 'case') this.bits.add(x, y0 + 0.02, z, 0, r * 6.28, 0.07, 0.035, 0.035, '#e8b83a');
      else if (d.kind === 'coin') this.bits.add(x, y0 + 0.015, z, 0, r * 6.28, 0.07, 0.014, 0.07, '#f2c84a');
      else if (d.kind === 'confetti') this.bits.add(x, y0 + 0.012, z, 0, r * 6.28, 0.05, 0.01, 0.035, CONFETTI[d.hue || 0]);
    }
    this.stats.decals = n;
    if (game.heavy) for (const d of game.heavy.decals) {
      if (d.map !== mapId) continue;
      const fade = Math.max(0, Math.min(1, (d.until - t) / 20));
      this.decals.scorch.add(d.x / TILE + ox, y0 + 0.018, d.y / TILE + oz, hash(seed(d), 4) * 6.28, (d.r * 2.1) / TILE, (d.r * 2.1) / TILE, 0.75 * fade);
    }
    if (game.vehicles?.skids?.length) {
      for (const k of game.vehicles.skids) {
        if (k.map !== mapId) continue;
        const a = 0.4 * (1 - (t - k.t) / 14);
        if (a <= 0) continue;
        const dx = (k.x1 - k.x0) / TILE; const dz = (k.y1 - k.y0) / TILE;
        const len = Math.hypot(dx, dz);
        if (len < 0.01) continue;
        this.decals.skid.add((k.x0 + k.x1) / 2 / TILE + ox, y0 + 0.011, (k.y0 + k.y1) / 2 / TILE + oz, Math.atan2(dx, dz) + Math.PI / 2, 0.17, len + 0.05, a);
      }
    }
    for (const d of [...this.decals.blood, ...this.decals.pool, this.decals.scorch, this.decals.skid]) d.end();
  }

  drawParticles(C, p, ox, oz, y0) {
    for (const q of C.particles) {
      if (q.map !== p.map) continue;
      const x = q.x / TILE + ox; const z = q.y / TILE + oz; const y = y0 + Math.max(0.02, q.z / TILE);
      const sp = Math.atan2(q.vx, q.vy);
      if (q.kind === 'blood') this.bits.add(x, y, z, 0, sp, 0.035 * q.size, 0.035 * q.size, 0.05 * q.size, '#7a0c12');
      else if (q.kind === 'case') this.bits.add(x, y, z, q.z * 0.2, sp + q.z * 0.15, 0.025, 0.025, 0.07, '#e8b83a');
      else if (q.kind === 'coin') this.bits.add(x, y, z, q.z * 0.3, sp, 0.07, 0.015, 0.07, '#f2c84a');
      else if (q.kind === 'confetti') this.bits.add(x, y, z, q.z * 0.3, sp + q.z * 0.2, 0.05, 0.012, 0.04, CONFETTI[q.hue || 0]);
    }
    this.bits.end();
  }

  drawBullets(C, game, p, ox, oz, world, t) {
    const eq = C.equipped?.();
    const glow = eq ? this.energyGlow(eq) : null;
    const seen = new Set();
    for (const b of C.bullets) {
      if (b.map !== p.map) continue;
      seen.add(b);
      let o = this.bulletOrigin.get(b);
      if (!o) { o = { x: b.x, y: b.y }; this.bulletOrigin.set(b, o); }
      const run = Math.hypot(b.x - o.x, b.y - o.y) / TILE;
      const h = 0.72 + (CHEST - 0.72) * Math.min(1, run / 1.6); // leaves the muzzle, settles on the chest plane
      const x = b.x / TILE + ox; const z = (b.y + BODY_Y) / TILE + oz;
      const yaw = Math.atan2(b.dx, b.dy);
      if (b.kind) {
        const g = this.oddFor(b.kind);
        if (g) { this.poseOdd(g, b, x, h, z, yaw, t, run); continue; }
      }
      const len = b.hurts ? 0.5 : 0.7;
      const col = b.hurts ? '#ff9a5a' : glow || '#fff0b0';
      const bx = x - b.dx * len / 2; const bz = z - b.dy * len / 2;
      this.streaks.add(bx, h, bz, 0, yaw, 0.03, 0.03, len, col);
      this.streaks.add(x, h, z, 0, yaw, 0.06, 0.06, 0.07, '#ffffff');
    }
    for (const k of this.bulletOrigin.keys()) if (!seen.has(k)) this.bulletOrigin.delete(k);
    this.streaks.end();
  }

  energyGlow(eq) { return FUTURE_LOOKS[eq.id]?.glow || null; }

  poseOdd(g, b, x, h, z, yaw, t, run) {
    g.position.set(x, h, z); g.rotation.set(0, yaw, 0);
    switch (b.kind) {
      case 'pigeon': { const w = g.getObjectByName('wing'); if (w) w.rotation.z = Math.sin(t * 40) * 0.7; break; }
      case 'cheese': g.rotation.set(t * 9, yaw + t * 6, 0); break;
      case 'coin': g.rotation.set(0, yaw, t * 24); break;
      case 'card': g.rotation.set(t * 14, yaw + t * 10, 0); break;
      case 'confetti': for (let i = 0; i < 4; i++) { const q = g.getObjectByName(`c${i}`); if (q) q.position.set(Math.cos(i * 1.7 + t * 9) * 0.1, Math.sin(i * 2.3 + t * 9) * 0.08, Math.sin(i + t * 5) * 0.08); } break;
      default: break;
    }
    void run;
  }

  /** Find the figure that fired (nearest to a ground point in map px) and its muzzle in world space. */
  shooter(world, gx, gy, pos, dir) {
    let best = null; let bd = 30 * 30;
    for (const [actor, e] of world.figures) {
      if (!e.fig.root.visible || !e.fig.wm?.muzzle) continue;
      const d = (actor.x - gx) ** 2 + (actor.y - gy) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best ? best.fig.muzzleWorld(pos, dir) : false;
  }

  drawFx(C, game, world, ox, oz, y0, t) {
    for (const f of C.fx) {
      const k = Math.max(0, 1 - (t - f.start) / Math.max(0.001, f.until - f.start));
      if (f.type === 'flash') {
        const e = this.take(this.flashes, 'flash'); if (!e) continue;
        const gx = f.x; const gy = f.y + BODY_Y;
        const hit = this.shooter(world, gx, gy, _p, _fd);
        let px; let py; let pz;
        if (hit) { px = _p.x; py = _p.y; pz = _p.z; } else { px = f.x / TILE + ox; py = 0.66; pz = gy / TILE + oz; _fd.set(f.dir?.x || 0, 0, f.dir?.y || 1); }
        e.g.position.set(px, py, pz);
        e.g.rotation.set(0, Math.atan2(_fd.x, _fd.z), 0);
        const s = 0.2 + 0.14 * k;
        e.g.scale.set(s, s, s);
        e.g.children[3].scale.set(0.5, 0.5, 0.9);
        e.g.userData.mats[0].opacity = 0.5 + 0.5 * k;
        this.stats.flashes++;
        if (!this.light || k > this.light.k) this.light = { x: px, y: py, z: pz, k };
      } else if (f.type === 'swing') {
        const e = this.take(this.swings, 'swing'); if (!e) continue;
        const pos = e.g.userData.mesh.geometry.attributes.position; const a = Math.atan2(f.dir.y, f.dir.x); const R = f.range * 0.9 / TILE;
        const N = 13;
        for (let i = 0; i < N; i++) {
          const th = a + ((i / (N - 1)) * 2 - 1) * f.arc;
          const c = Math.cos(th); const s = Math.sin(th);
          const w = (1 - Math.abs((i / (N - 1)) * 2 - 1) * 0.6) * 0.14;
          pos.setXYZ(i * 2, c * (R - w), 0, s * (R - w)); pos.setXYZ(i * 2 + 1, c * (R + w * 0.3), 0, s * (R + w * 0.3));
        }
        pos.needsUpdate = true;
        e.g.position.set(f.x / TILE + ox, 0.62, (f.y + BODY_Y) / TILE + oz);
        e.g.userData.mats[0].opacity = 0.6 * k;
      } else if (f.type === 'spark') {
        const e = this.take(this.sparks, 'spark'); if (!e) continue;
        const age = 1 - k;
        e.g.position.set(f.x / TILE + ox, 0.6, (f.y + BODY_Y) / TILE + oz);
        for (let i = 0; i < 5; i++) { const q = e.g.children[i]; const a = i * 1.7 + (f.start * 7); q.position.set(Math.cos(a) * 0.22 * age, 0.18 * age - 0.5 * age * age * 0.5, Math.sin(a) * 0.22 * age); q.scale.setScalar(0.03 * (1 - age * 0.6)); }
        const pf = e.g.userData.puff; pf.position.y = 0.02 + age * 0.1; pf.scale.setScalar(0.08 + age * 0.22); e.g.userData.mats[1].opacity = 0.5 * k;
      } else if (f.type === 'blast') this.blast(f, k, ox, oz, y0);
    }
    this.pushLight(world);
  }

  pushLight(world) {
    const l = this.light;
    if (l) world.cands.push({ x: l.x, y: l.y, z: l.z, color: '#ffc27a', intensity: 34 * l.k, distance: 9, prio: 30 });
    if (this.blastLight) { const b = this.blastLight; world.cands.push({ x: b.x, y: 0.8, z: b.z, color: '#ff9a4a', intensity: 90 * b.k, distance: 16, prio: 30 }); this.blastLight = null; }
  }

  blast(f, k, ox, oz, y0) {
    const e = this.take(this.blasts, 'blast'); if (!e) return;
    const u = e.g.userData; const age = 1 - k; const R = (f.r / TILE) * (0.35 + 0.65 * Math.min(1, age * 2.5));
    e.g.position.set(f.x / TILE + ox, y0, f.y / TILE + oz);
    u.fire.position.y = 0.3; u.fire.scale.setScalar(R * 0.8); u.fire.material.opacity = 0.85 * k;
    u.core.position.y = 0.3; u.core.scale.setScalar(R * 0.42 * (0.4 + k)); u.core.material.opacity = k;
    u.ring.scale.setScalar(Math.max(0.01, (f.r / TILE) * age * 1.3)); u.ring.material.opacity = 0.5 * k;
    u.smoke.forEach((q, i) => { const a = i * 1.6 + f.start * 3; q.position.set(Math.cos(a) * R * 0.5 * age, 0.4 + age * (0.9 + i * 0.15), Math.sin(a) * R * 0.5 * age); q.scale.setScalar(R * (0.4 + age * 0.5)); });
    u.smoke[0].material.opacity = 0.5 * Math.min(1, k * 1.5);
    u.debris.forEach((q, i) => { const a = i * 0.9 + f.start * 5; const sp = (0.6 + hash(i, Math.floor(f.start * 10)) * 0.9) * (f.r / TILE); const tt = age * 0.9; q.position.set(Math.cos(a) * sp * age * 1.5, Math.max(0.02, 2.2 * tt - 3 * tt * tt), Math.sin(a) * sp * age * 1.5); q.scale.setScalar(0.07 * (k > 0.05 ? 1 : 0)); q.rotation.set(age * 9 + i, age * 7, 0); });
    this.blastLight = { x: f.x / TILE + ox, z: f.y / TILE + oz, k: Math.max(this.blastLight?.k || 0, k > 0.7 ? 1 : k / 0.7) };
  }

  drawHeavy(H, ox, oz, y0, t) {
    for (const pr of H.projectiles) {
      const e = this.take(this.rockets, 'rocket'); if (!e) continue;
      const u = e.g.userData; const yaw = Math.atan2(pr.vx, pr.vy); const sp = Math.hypot(pr.vx, pr.vy) || 1;
      e.g.position.set(pr.x / TILE + ox, CHEST + y0, pr.y / TILE + oz);
      u.g.rotation.set(0, yaw, 0);
      u.flame.scale.set(1, 0.7 + 0.5 * Math.abs(Math.sin(t * 40)), 1);
      u.trail.forEach((q, i) => { const d = (i + 1) * 0.22; q.position.set(-(pr.vx / sp) * d, 0, -(pr.vy / sp) * d); q.scale.setScalar(0.05 + i * 0.035); });
    }
    for (const d of H.drones) {
      const e = this.take(this.drones, 'drone'); if (!e) continue;
      const u = e.g.userData; const bob = Math.sin(t * 6 + d.born) * 2;
      e.g.position.set(d.x / TILE + ox, y0, (d.y + 26) / TILE + oz);
      u.air.position.y = (40 + bob) / TILE; u.air.rotation.y = t * 0.5;
      u.led.visible = Math.floor(t * 4) % 2 === 0; u.shadow.position.y = 0.025;
    }
  }
}
const _fd = new THREE.Vector3();

/** For tests: the live count of pooled objects an instance holds (never grows past the caps). */
export function poolSizes(fx) {
  return { flash: fx.flashes.length, spark: fx.sparks.length, swing: fx.swings.length, blast: fx.blasts.length, rocket: fx.rockets.length, drone: fx.drones.length, odd: [...fx.odd.values()].reduce((a, o) => Math.max(a, o.items.length), 0), bits: fx.bits.n, streaks: fx.streaks.n };
}
