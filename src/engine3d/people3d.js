// People in 3D: box figures built from `profile.appearance` (the same record the 2D sprites use), ported from the concept
// study (mockups/iso25d/src/actors.js). A figure is six meshes (the body with head and hair, two legs, two arms) in one
// vertex-coloured material; geometries are cached per look. Walking swings the limbs, a figure turns smoothly to face the
// way it moves (or the way a held gun is aimed), lies flat when down, and a held weapon is a simple part keyed by the
// same `look` the 2D code uses.
import { THREE, Mesher, vertexMat, hash, strHash, shade, mix, mute } from './lib3d.js';
import { holeLit } from './buildings3d.js';
import { modelFor, poseOf, glowMat, FIST } from './weapons3d.js';

holeLit(vertexMat()); // (nothing in a see-through hole receives a shadow: the figure there shows at full brightness)

export const GUN_SHORT = new Set(['revolver', 'pistol', 'goldenhandshake', 'nailgun', 'goldphone', 'phone']);
/** The yaw (about y, 0 = facing south/+z, east = +pi/2) for a world direction (dx east, dy south). */
export const yawOf = (dx, dy) => Math.atan2(dx, dy);

/** The shortest signed turn from a to b (radians). */
export const angleDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

const BUILD = { thin: 0.86, wiry: 0.9, average: 1, broad: 1.16, round: 1.22 };

const a2key = (u) => (u ? `${u.top}~${u.legs}~${u.helm}` : '');
/** A string that changes when anything that decides a figure's geometry changes. */
export function personKey(app = {}, holding = null, kit = null) {
  return [app.species, app.skin, app.hair, app.hairStyle, app.outfit, app.accent, app.accessory, (app.accessories || []).join('+'), app.build, app.apron, app.legs, app.shoes, app.sleeves, app.overalls, app.undershirt, app.tie, app.hat, app.hatColor, app.beard, app.coat, app.robe, app.vestColor, app.seed, holding, kit, a2key(app.uniform)].join('|');
}

const geoCache = new Map();
const MAX_GEO = 260;

/** The geometries of a look: { body, leg, arm, armHold, height, wide }. Cached, shared between figures of the same look. */
export function personGeometry(app = {}, holdingLook = null, kit = null) {
  holdingLook = null; // (the weapon is its own model now, weapons3d.js: the body geometry is shared by everyone who looks alike)
  const key = personKey(app, null, kit);
  let c = geoCache.get(key);
  if (c) { geoCache.delete(key); geoCache.set(key, c); return c; }
  const a = app || {};
  const s = strHash(String(a.seed || a.hair || 'x') + String(a.skin || ''));
  const skin = a.skin || '#d9a77c';
  const hair = a.hair || '#3a2f2a';
  const outfit = mute(a.outfit || '#5a6a7a', 0.1);
  const accent = a.accent || '#d9c07a';
  const wide = BUILD[a.build] || 1;
  const un = kit === 'soldier' ? a.uniform || null : null; // (the battle's side colours: an optional { top, legs, helm } for the soldier kit)
  const trousers = a.overalls || a.legs || (kit === 'soldier' ? un?.legs || '#4a5238' : kit === 'police' ? '#1f2a44' : shade(mix(outfit, '#2a2c38', 0.72), 0));
  const top = kit === 'soldier' ? un?.top || '#59633f' : kit === 'police' ? '#27375c' : a.coat || a.robe || outfit;
  const sleeves = a.sleeves || top;
  const body = new Mesher();
  const long = Boolean(a.coat || a.robe);
  if (long) body.box(0.46 * wide, 0.34, 0.3, a.robe || a.coat, 0, 0.12, 0); // a coat or robe skirt hides the legs' tops
  body.box(0.42 * wide, 0.46, 0.26 * (a.build === 'round' ? 1.25 : 1), top, 0, 0.42, 0);
  body.box(0.44 * wide, 0.06, 0.28, shade(trousers, -14), 0, 0.41, 0);
  if (a.overalls) body.box(0.3 * wide, 0.4, 0.04, a.overalls, 0, 0.45, 0.14);
  if (a.undershirt) body.box(0.2 * wide, 0.14, 0.03, a.undershirt, 0, 0.74, 0.135);
  if (a.pattern === 'pinstripe') for (let i = -3; i <= 3; i++) body.box(0.012, 0.44, 0.27, shade(top, 40), i * 0.055 * wide, 0.42, 0);
  if (a.accessory === 'apron' || a.apron) body.box(0.34 * wide, 0.5, 0.03, a.apron || '#f1ece0', 0, 0.26, 0.15);
  if (a.accessory === 'scarf') body.box(0.36 * wide, 0.1, 0.32, accent, 0, 0.82, 0).box(0.1, 0.26, 0.04, accent, 0.1, 0.58, 0.15);
  if (a.vestColor) body.box(0.4 * wide, 0.34, 0.285, a.vestColor, 0, 0.45, 0);
  if (kit === 'soldier') { const vest = un?.top ? shade(un.top, -26) : '#3d4530'; const pouch = un?.top ? shade(un.top, -44) : '#2e3424'; body.box(0.46 * wide, 0.34, 0.31, vest, 0, 0.5, 0).box(0.12, 0.1, 0.06, pouch, -0.1, 0.56, 0.17).box(0.12, 0.1, 0.06, pouch, 0.08, 0.56, 0.17).box(0.3, 0.36, 0.14, un?.top ? shade(un.top, -18) : '#454d34', 0, 0.48, -0.2); }
  if (kit === 'police') body.box(0.07, 0.07, 0.02, '#e8d76a', -0.1, 0.72, 0.14);
  if (a.tie) body.box(0.07, 0.34, 0.02, a.tie, 0, 0.5, 0.135);
  else if (!kit && !a.undershirt && hash(s, 3) > 0.5) body.box(0.06, 0.38, 0.02, accent, 0, 0.48, 0.135);
  // head: large, as the game draws people; face, hair by style
  const hy = 0.92;
  const H = (w, h, d, col, x, y, z) => body.box(w, h, d, col, x, hy + y, z);
  H(0.4, 0.38, 0.36, skin, 0, 0, 0);
  H(0.05, 0.06, 0.02, '#2a2420', -0.09, 0.19, 0.185);
  H(0.05, 0.06, 0.02, '#2a2420', 0.09, 0.19, 0.185);
  const hatKind = kit === 'soldier' ? 'helmet' : kit === 'police' ? 'cap' : a.hat || a.hairStyle || 'short';
  const st = typeof hatKind === 'string' ? hatKind : 'hat';
  if (st === 'bald') H(0.42, 0.04, 0.38, shade(skin, -8), 0, 0.36, 0);
  else if (st === 'helmet') { H(0.48, 0.2, 0.46, un?.helm || '#4d5638', 0, 0.3, 0); H(0.5, 0.05, 0.5, un?.helm ? shade(un.helm, -12) : '#434b30', 0, 0.27, 0); }
  else if (st === 'hardhat') { H(0.46, 0.16, 0.42, '#f0c23a', 0, 0.32, 0); H(0.5, 0.04, 0.54, '#e0b22a', 0, 0.3, 0.04); }
  else if (st === 'cap' || st === 'captain') { const cc = kit === 'police' ? '#1f2a44' : st === 'captain' ? '#f1ece0' : (a.hatColor || accent); H(0.44, 0.13, 0.4, cc, 0, 0.34, 0); H(0.4, 0.035, 0.2, shade(cc, -30), 0, 0.33, 0.26); H(0.44, 0.1, 0.38, hair, 0, 0.26, -0.03); }
  else if (st === 'hat' || st === 'tophat' || st === 'wizard') {
    const hc = a.hatColor || (st === 'tophat' ? '#22201e' : st === 'wizard' ? '#3a2f6a' : shade(mix(outfit, '#3a3026', 0.5), -10));
    H(0.64, 0.04, 0.6, hc, 0, 0.36, 0);
    if (st === 'wizard') { H(0.34, 0.3, 0.3, hc, 0, 0.4, 0); H(0.2, 0.3, 0.2, hc, 0, 0.7, 0); } else H(0.38, st === 'tophat' ? 0.38 : 0.18, 0.34, hc, 0, 0.4, 0);
    if (st === 'tophat') H(0.4, 0.06, 0.36, a.hatBand || accent, 0, 0.42, 0);
    H(0.42, 0.08, 0.38, hair, 0, 0.28, -0.03);
  } else {
    H(0.44, 0.14, 0.4, hair, 0, 0.3, -0.01);
    H(0.44, 0.24, 0.1, hair, 0, 0.12, -0.17);
    if (st === 'bun') body.blob(0.13, hair, 0, hy + 0.5, -0.12);
    if (st === 'ponytail') H(0.12, 0.34, 0.1, hair, 0, -0.12, -0.24);
    if (st === 'long') { H(0.46, 0.4, 0.1, hair, 0, -0.14, -0.19); H(0.06, 0.34, 0.3, hair, -0.21, -0.02, -0.03); H(0.06, 0.34, 0.3, hair, 0.21, -0.02, -0.03); }
    if (st === 'curly' || st === 'messy') for (let i = 0; i < 5; i++) body.blob(0.11, hair, (hash(s, i, 1) - 0.5) * 0.36, hy + 0.42 + hash(s, i, 2) * 0.05, (hash(s, i, 3) - 0.5) * 0.3);
    if (st === 'parted') H(0.2, 0.05, 0.42, shade(hair, 14), -0.1, 0.42, -0.01);
  }
  if (a.beard) H(0.36, 0.14, 0.06, a.beard, 0, -0.02, 0.19);
  if (a.moustache) H(0.2, 0.05, 0.03, a.moustacheColor || a.beard || hair, 0, 0.08, 0.19);
  const acc = new Set([a.accessory, ...(a.accessories || [])].filter(Boolean));
  if (acc.has('glasses')) { H(0.14, 0.09, 0.02, '#1c1c22', -0.09, 0.17, 0.19); H(0.14, 0.09, 0.02, '#1c1c22', 0.09, 0.17, 0.19); }
  if (acc.has('goggles')) H(0.42, 0.1, 0.04, '#c9a43a', 0, 0.26, 0.18);
  if (a.hairStyle === 'tophat' || acc.has('moustache') || acc.has('mustache')) H(0.2, 0.05, 0.03, '#f1ece0', 0, 0.08, 0.19);
  const leg = new Mesher().box(0.17 * wide, 0.42, 0.19, trousers, 0, -0.42, 0).box(0.18 * wide, 0.08, 0.26, a.shoes || '#2a2622', 0, -0.44, 0.03);
  const arm = new Mesher().box(0.12, 0.36, 0.14, sleeves, 0, -0.36, 0).box(0.11, 0.1, 0.12, skin, 0, -0.44, 0);
  c = { body: body.build(), leg: leg.build(), arm: arm.build(), armHold: null, height: a.height || 1, wide, hold: holdingLook };
  geoCache.set(key, c);
  while (geoCache.size > MAX_GEO) { const old = geoCache.keys().next().value; const o = geoCache.get(old); o.body.dispose(); o.leg.dispose(); o.arm.dispose(); o.armHold?.dispose(); geoCache.delete(old); }
  return c;
}

function cowGeometry(a) {
  const hide = a.skin || '#f2efe6';
  const spot = a.hair || '#2a2a30';
  const body = new Mesher();
  body.box(0.52, 0.52, 1.0, hide, 0, 0.42, 0).box(0.3, 0.2, 0.22, spot, 0.1, 0.8, 0.1).box(0.26, 0.2, 0.3, spot, -0.14, 0.7, -0.25);
  body.box(0.34, 0.34, 0.3, hide, 0, 0.7, 0.62).box(0.3, 0.14, 0.12, '#e8b0a0', 0, 0.7, 0.8).box(0.04, 0.1, 0.04, '#e8e0cc', -0.15, 1.02, 0.6).box(0.04, 0.1, 0.04, '#e8e0cc', 0.15, 1.02, 0.6);
  body.box(0.18, 0.12, 0.2, '#e8b0a0', 0, 0.3, -0.2).box(0.04, 0.34, 0.04, spot, 0, 0.4, -0.54);
  const leg = new Mesher().box(0.12, 0.42, 0.12, hide, 0, -0.42, 0).box(0.13, 0.06, 0.13, '#3a3028', 0, -0.44, 0);
  return { body: body.build(), leg: leg.build(), arm: null, armHold: null, height: a.height || 1, wide: 1, cow: true };
}

const WSCALE = 1.18;
const SHOULDER_Y = 0.86;
const ARM = 0.44; // shoulder to hand
const _v = new THREE.Vector3();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Turn an arm pivot so its hand reaches `t` (body frame), stretching it a little when it must; returns the hand's position in `out`. */
function armTo(piv, sx, t, out, stretch = 1.35) {
  const dx = t[0] - sx; const dy = t[1] - SHOULDER_Y; const dz = t[2];
  const L = Math.hypot(dx, dy, dz) || 1e-6;
  piv.rotation.set(Math.atan2(-dz, -dy), 0, Math.asin(clamp(dx / L, -1, 1)));
  const k = clamp(L / ARM, 0.8, stretch);
  piv.scale.y = k;
  if (out) { const r = ARM * k; out[0] = sx + (dx / L) * r; out[1] = SHOULDER_Y + (dy / L) * r; out[2] = (dz / L) * r; }
}

/** A figure: { root, pose(p) }. The pose carries everything that changes a frame (see `pose`). */
export class Figure {
  constructor(app, holdingKey, kit) {
    this.app = app;
    this.key = personKey(app, holdingKey, kit);
    this.geo = app?.species === 'cow' ? cowGeometry(app) : personGeometry(app, null, kit);
    this.cow = Boolean(this.geo.cow);
    this.own = this.cow; // a cow's geometry is not cached
    const m = vertexMat();
    this.root = new THREE.Group();
    this.spin = new THREE.Group();
    this.lay = new THREE.Group();
    this.root.add(this.spin);
    this.spin.add(this.lay);
    this.body = new THREE.Group();
    this.body.scale.set(1, this.geo.height, 1);
    this.lay.add(this.body);
    this.meshes = [];
    const mesh = (geo) => { const q = new THREE.Mesh(geo, m); q.castShadow = true; q.receiveShadow = true; this.meshes.push(q); return q; };
    this.body.add(mesh(this.geo.body));
    const W = this.geo.wide;
    this.legs = [-1, 1].map((sd) => {
      const piv = new THREE.Group();
      piv.position.set(this.cow ? sd * 0.2 : sd * 0.1 * W, 0.44, this.cow ? -0.32 : 0);
      piv.add(mesh(this.geo.leg));
      this.body.add(piv);
      return piv;
    });
    this.legs2 = []; // a cow's front legs
    if (this.cow) for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sd * 0.2, 0.44, 0.32); piv.add(mesh(this.geo.leg)); this.body.add(piv); this.legs2.push(piv); }
    this.arms = [];
    if (!this.cow) {
      for (const sd of [-1, 1]) {
        const piv = new THREE.Group();
        piv.position.set(sd * 0.27 * W, SHOULDER_Y, 0);
        piv.add(mesh(this.geo.arm));
        this.body.add(piv);
        this.arms.push(piv);
      }
    }
    this.yaw = 0;
    this.fadeMat = null;
    this.hitMat = null;
    this.matState = 'normal';
    this.alpha = 1;
    this.mount = new THREE.Group(); // the weapon, positioned at the hand (not a child of the arm: the arm is turned to reach it)
    this.mount.visible = false;
    this.mount.scale.set(WSCALE, WSCALE / this.geo.height, WSCALE); // (the body is scaled in height: the weapon is not; a little over size so it reads at the game's zoom)
    this.body.add(this.mount);
    this.wm = null; this.wKey = null; this.wMeshes = []; this.dropped = false;
    this.stars = null;
    this.kick = 0;
    if (holdingKey && !this.cow) this.setWeapon(holdingKey);
  }

  /** Hold another weapon (a hold key, weapons3d.holdKeyOf) or nothing (null). The figure's body geometry is untouched. */
  setWeapon(key) {
    if (this.cow) return;
    key = key || null;
    if (key === this.wKey) return;
    this.wKey = key;
    for (const q of [...this.mount.children]) this.mount.remove(q);
    this.wMeshes = [];
    this.wm = key ? modelFor(key) : null;
    this.mount.visible = Boolean(this.wm);
    if (!this.wm) return;
    const add = (geo, mat, cast) => { if (!geo) return null; const q = new THREE.Mesh(geo, mat); q.castShadow = cast; q.receiveShadow = cast; this.mount.add(q); return q; };
    const body = add(this.wm.geo, this.matFor(), true);
    if (body) this.wMeshes.push(body);
    add(this.wm.glow, glowMat(), false);
  }

  matFor() { return this.matState === 'fade' ? this.fadeMat : this.matState === 'hit' ? this.hitMat : vertexMat(); }

  /** The muzzle of the held gun in world space (the scene must have had its matrices updated: call after `pose`). Returns false when nothing is held. */
  muzzleWorld(pos, dir) {
    if (!this.wm?.muzzle) return false;
    this.root.updateWorldMatrix(true, true);
    pos.set(this.wm.muzzle[0], this.wm.muzzle[1], this.wm.muzzle[2]);
    this.mount.localToWorld(pos);
    if (dir) { dir.set(0, 0, 1).transformDirection(this.mount.matrixWorld); }
    return true;
  }

  /**
   * Set the pose. { x, y, z (tiles), yaw, phase (walk radians, or null at rest), lying, lift } as before, and for fighting:
   *   aim     the weapon is raised along the facing (a gun the mouse or the target points)
   *   swing   null, or 0..1 through a melee swing (a punch with nothing held); swingArc: the swing's half-angle
   *   kick    0..1 recoil of the shot just fired
   *   flinch  0..1 the hit just taken (leans back); flash: red flash of that hit, 0..1
   *   stun    stars over the head
   */
  pose(p) {
    this.root.position.set(p.x, p.y + (p.lift || 0), p.z);
    this.spin.rotation.y = p.yaw;
    const lying = Boolean(p.lying);
    const sw = p.phase == null ? 0 : Math.sin(p.phase) * 0.55;
    const bob = p.phase == null ? 0 : Math.abs(Math.cos(p.phase)) * 0.035;
    const fl = p.flinch || 0;
    this.lay.rotation.x = lying ? -Math.PI / 2 : -0.24 * fl;
    this.lay.position.y = lying ? 0.2 : 0;
    this.lay.position.z = lying ? 0 : -0.05 * fl;
    this.body.position.y = bob;
    this.legs.forEach((l, i) => { l.rotation.x = lying ? 0 : (i ? 1 : -1) * sw; l.rotation.z = lying ? (i ? 1 : -1) * 0.2 : 0; });
    this.legs2.forEach((l, i) => { l.rotation.x = (i ? -1 : 1) * sw; });
    const W = this.geo.wide;
    const wm = this.wm;
    const swinging = p.swing != null;
    const armed = Boolean(wm) && !lying;
    this.arms.forEach((a) => { a.scale.y = 1; });
    if (lying) {
      // splayed, one arm across the chest a little
      this.arms.forEach((a, i) => { a.rotation.set(i ? 0.15 : -0.35, 0, (i ? 1 : -1) * 0.5); });
    } else if (armed || swinging) {
      this.poseArms(p, wm || FIST, W, swinging);
    } else {
      this.arms.forEach((a, i) => { a.rotation.set((i ? 1 : -1) * -sw * 0.9, 0, 0); });
    }
    this.placeWeapon(lying, W);
    if (!lying && (p.prone || p.crouch || p.kneel || p.signal)) this.poseExtra(p, W);
    else if (this.extraOn) this.clearExtra();
    this.setLook(p);
  }

  /**
   * The battle's added poses, on top of the ordinary one (a figure that never asks for them is untouched):
   *   crouch 0..1  lowered, weapon still carried or aimed (halted in cover)
   *   kneel  0..1  down on a knee, leaning to the ground (a medic at a casualty)
   *   prone  true  on the belly, head and weapon forward (suppressed); crawl: a phase, the limbs drag when it is a number
   *   signal 0..1  one arm raised and waved (an officer's rally)
   * A casualty (`lying`) is on the back with the weapon dropped: the two are different shapes on purpose.
   */
  poseExtra(p, W) {
    this.extraOn = true;
    const h = this.geo.height; const wm = this.wm;
    if (p.prone) {
      const cr = p.crawl == null ? null : Math.sin(p.crawl) * 0.35;
      this.lay.rotation.x = Math.PI / 2; this.lay.position.y = 0.13; this.lay.position.z = 0.02;
      this.body.position.y = 0; this.body.scale.y = h;
      this.legs.forEach((l, i) => { l.rotation.set(cr == null ? 0 : (i ? 1 : -1) * cr * 0.6, 0, (i ? 1 : -1) * 0.12); });
      this.arms.forEach((a, i) => { a.rotation.set(-Math.PI + (cr == null ? 0 : (i ? 1 : -1) * cr * 0.5), 0, (i ? 1 : -1) * 0.12); });
      if (wm) { // the weapon forward along the ground, held at the chest (the body's y scale is undone on the gun's own axis)
        this.mount.position.set(0.04 * W, 0.98, 0.12); this.mount.rotation.set(-Math.PI / 2, 0, 0); this.mount.scale.set(WSCALE, WSCALE, WSCALE / h); this.mount.visible = true;
      }
      return;
    }
    const k = Math.max(0, Math.min(1, p.kneel || p.crouch || 0));
    if (k > 0) {
      this.body.scale.y = h * (1 - (p.kneel ? 0.32 : 0.24) * k);
      if (p.kneel) { this.lay.rotation.x = 0.4 * k; this.legs.forEach((l, i) => { l.rotation.x = i ? -1.1 * k : 0.2 * k; }); }
    }
    if (p.signal) {
      const a = this.arms[0]; const w = Math.sin((p.time || 0) * 9) * 0.35 * p.signal;
      a.rotation.set(-Math.PI * 0.95, 0, 0.25 + w);
    }
  }

  clearExtra() {
    this.extraOn = false; this.body.scale.y = this.geo.height;
    if (this.wm && !this.dropped) this.mount.scale.set(WSCALE, WSCALE / this.geo.height, WSCALE);
  }

  poseArms(p, model, W, swinging) {
    const mode = swinging ? 'swing' : p.aim ? 'aim' : 'carry';
    const P = poseOf(model, mode, { W, t: p.swing, arc: p.swingArc });
    const k = Math.max(0, Math.min(1, p.kick || 0));
    const g = [P.g[0], P.g[1], P.g[2] - (model.kind === 'one' ? 0.06 : 0.09) * k];
    const hand = [0, 0, 0];
    const main = this.arms[1]; const off = this.arms[0];
    armTo(main, 0.27 * W, g, hand);
    if (model.fist || !this.wm) { if (swinging) off.rotation.set(-0.3, 0, -0.2); else off.rotation.set(0, 0, 0); return; }
    this.mount.position.set(hand[0], hand[1], hand[2]);
    this.mount.rotation.set(-(P.pitch + 0.1 * k), P.yaw, 0, 'YXZ');
    this.mount.updateMatrix();
    if (P.two && model.fore) {
      _v.set(model.fore[0], model.fore[1], model.fore[2]).applyMatrix4(this.mount.matrix);
      armTo(off, -0.27 * W, [_v.x, _v.y, _v.z], null, 1.45);
    } else if (mode === 'carry') {
      const sw = p.phase == null ? 0 : Math.sin(p.phase) * 0.55;
      off.rotation.set(sw * 0.9, 0, -0.06);
    } else off.rotation.set(0.25, 0, -0.18); // (a free hand, steadying)
    this.handed = true;
  }

  /** Put the weapon in the hand, or on the ground beside a figure that is down. */
  placeWeapon(lying, W) {
    const wm = this.wm;
    if (!wm) return;
    if (lying !== this.dropped) {
      this.dropped = lying;
      (lying ? this.spin : this.body).add(this.mount);
      this.mount.scale.set(WSCALE, lying ? WSCALE : WSCALE / this.geo.height, WSCALE);
    }
    if (lying) {
      this.mount.position.set(0.5 * W + 0.12, 0.07, 0.12);
      this.mount.rotation.set(0, 0.5, wm.kind === 'melee' ? 1.5708 : 0);
      if (wm.kind === 'melee') this.mount.rotation.set(0, 0.35, 0);
      this.mount.visible = true;
    } else this.mount.visible = true;
    if (lying && wm.kind !== 'melee') this.mount.rotation.set(0, 0.5, 1.5708 * 0); // (guns lie flat on their side's belly: upright is fine on a 2 cm model)
  }

  /** Red flash on a hit, stun stars: the figure's own overlays. */
  setLook(p) {
    const f = p.flash || 0;
    const want = this.alpha < 0.999 ? 'fade' : f > 0.02 ? 'hit' : 'normal';
    if (f > 0.02 && want === 'hit') {
      if (!this.hitMat) { this.hitMat = vertexMat().clone(); delete this.hitMat.userData.seeThrough; this.hitMat.userData.keep = false; this.hitMat.emissive = new THREE.Color('#ff1a14'); holeLit(this.hitMat); }
      this.hitMat.emissiveIntensity = 0.45 * f;
    }
    this.useMat(want);
    if (p.stun && !this.cow) {
      if (!this.stars) this.makeStars();
      this.stars.visible = true;
      const t = (p.time || 0) * 5;
      this.stars.position.y = 1.5 * this.geo.height + (p.lying ? -0.9 : 0);
      this.stars.children.forEach((q, i) => { const a = t + i * 2.094; q.position.set(Math.cos(a) * 0.26, Math.sin(a * 1.7) * 0.03, Math.sin(a) * 0.26); q.rotation.y = a * 2; });
    } else if (this.stars) this.stars.visible = false;
  }

  makeStars() {
    this.stars = new THREE.Group();
    const m = new THREE.MeshBasicMaterial({ color: '#ffe35a', toneMapped: false });
    m.userData.keep = false;
    const g = new THREE.OctahedronGeometry(0.06, 0);
    for (let i = 0; i < 3; i++) this.stars.add(new THREE.Mesh(g, m));
    this.stars.userData.mat = m; this.stars.userData.geo = g;
    this.spin.add(this.stars);
  }

  useMat(state) {
    if (state === this.matState) return;
    this.matState = state;
    const m = this.matFor();
    for (const q of this.meshes) q.material = m;
    for (const q of this.wMeshes) q.material = m;
  }

  /** Fade the whole figure (the Wrath takes the player away). */
  setAlpha(a) {
    if (a === this.alpha) return;
    this.alpha = a;
    if (a >= 0.999) { this.useMat('normal'); return; }
    if (!this.fadeMat) { this.fadeMat = vertexMat().clone(); this.fadeMat.transparent = true; this.fadeMat.userData.keep = false; }
    this.fadeMat.opacity = Math.max(0, a);
    this.matState = 'x'; // (force the swap even when it was 'fade' already: the opacity changed, the material did not)
    this.useMat('fade');
  }

  dispose() {
    this.root.removeFromParent();
    if (this.fadeMat) this.fadeMat.dispose();
    if (this.hitMat) this.hitMat.dispose();
    if (this.stars) { this.stars.userData.mat.dispose(); this.stars.userData.geo.dispose(); }
    if (this.own) { this.geo.body.dispose(); this.geo.leg.dispose(); }
  }
}

/** Per-actor motion memory: which way the figure faces, smoothed. Mirrors the 2D `actorFacing` rule, but with a real angle. */
export function stepFacing(m, actor, now, dt, facingVec, aim) {
  const ddx = actor.x - m.x;
  const ddy = actor.y - m.y;
  m.x = actor.x; m.y = actor.y;
  const d = Math.hypot(ddx, ddy);
  if (d > 0.05 && d < 40) { m.dx = ddx; m.dy = ddy; m.movedAt = now; m.moved = true; m.lastFacing = actor.facing; }
  let tx; let ty;
  if (aim) { tx = aim.x; ty = aim.y; }
  else if (now - m.movedAt < 0.25 || (m.moved && actor.facing === m.lastFacing)) { tx = m.dx; ty = m.dy; }
  else { const f = facingVec(actor.facing); tx = f[0]; ty = f[1]; }
  const target = yawOf(tx, ty);
  if (!m.init) { m.init = true; m.yaw = target; } else m.yaw += angleDiff(m.yaw, target) * Math.min(1, dt * 16);
  return m.yaw;
}

export const newMotion = (actor) => ({ x: actor.x, y: actor.y, dx: 0, dy: 1, movedAt: -9, moved: false, lastFacing: actor.facing, yaw: 0, init: false });
