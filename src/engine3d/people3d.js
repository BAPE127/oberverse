// People in 3D: box figures built from `profile.appearance` (the same record the 2D sprites use), ported from the concept
// study (mockups/iso25d/src/actors.js). A figure is six meshes (the body with head and hair, two legs, two arms) in one
// vertex-coloured material; geometries are cached per look. Walking swings the limbs, a figure turns smoothly to face the
// way it moves (or the way a held gun is aimed), lies flat when down, and a held weapon is a simple part keyed by the
// same `look` the 2D code uses.
import { THREE, Mesher, vertexMat, hash, strHash, shade, mix, mute } from './lib3d.js';
import { holeLit } from './buildings3d.js';

holeLit(vertexMat()); // (nothing in a see-through hole receives a shadow: the figure there shows at full brightness)

export const GUN_SHORT = new Set(['revolver', 'pistol', 'goldenhandshake', 'nailgun', 'goldphone', 'phone']);
const WEAPONS = { // look -> [shape, colour]
  revolver: ['short', '#4a4a56'], pistol: ['short', '#3a3a44'], goldenhandshake: ['short', '#e8b830'], nailgun: ['short', '#f2c14e'],
  shotgun: ['long', '#5a3a1e'], rifle: ['long', '#4a3626'], ar: ['long', '#3a3a44'], sniper: ['long', '#3a4a3a'], lmg: ['long', '#3a3a44'], smg: ['mid', '#3a3a44'],
  rpg: ['tube', '#5a6a3a'], confetti: ['mid', '#e86ab0'], pigeon: ['mid', '#8a8a96'], mackerel: ['mid', '#8ab0c8'], cheddar: ['mid', '#f2c14e'], harpoon: ['long', '#c9a24a'], pythagorean: ['mid', '#2a3028'], tinfoil: ['mid', '#c9ced4'], deadmanshand: ['mid', '#4a1e6a'],
  crowbar: ['stick', '#c03030'], baton: ['stick', '#1e1e26'], bat: ['stick', '#a87448'], machete: ['blade', '#c9ced4'], fireaxe: ['axe', '#a87448'], knuckles: ['fist', '#c9a24a'],
  rollingpin: ['stick', '#e8c898'], plunger: ['stick', '#e8b830'], tuningfork: ['stick', '#c9ced4'], gavel: ['axe', '#5a3420'],
  phone: ['phone', '#16161e'], goldphone: ['phone', '#e8b830'],
};

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

function weaponGeometry(look, hold) {
  const m = new Mesher();
  const spec = WEAPONS[look] || (hold ? ['mid', '#3a3a44'] : ['stick', '#7a4a2a']);
  const [shape, col] = spec;
  if (shape === 'short') m.box(0.05, 0.1, 0.26, '#2a2c30', 0, -0.5, 0.12).box(0.04, 0.1, 0.06, col, 0, -0.55, 0.04);
  else if (shape === 'mid') m.box(0.06, 0.1, 0.5, col, 0, -0.5, 0.2).box(0.05, 0.14, 0.12, '#2a2c30', 0, -0.56, 0.0);
  else if (shape === 'long') m.box(0.06, 0.1, 0.78, '#2a2c30', 0, -0.5, 0.2).box(0.07, 0.16, 0.22, col, 0, -0.54, -0.14);
  else if (shape === 'tube') m.box(0.12, 0.12, 0.95, col, 0, -0.52, 0.2).box(0.18, 0.18, 0.12, '#c0302a', 0, -0.55, 0.72);
  else if (shape === 'blade') m.box(0.04, 0.04, 0.12, '#3a2a1e', 0, -0.47, 0.06).box(0.03, 0.1, 0.5, col, 0, -0.5, 0.35);
  else if (shape === 'axe') m.box(0.04, 0.04, 0.56, col, 0, -0.46, 0.2).box(0.05, 0.2, 0.14, '#c9ced4', 0, -0.56, 0.52);
  else if (shape === 'fist') m.box(0.16, 0.1, 0.12, col, 0, -0.5, 0.05);
  else if (shape === 'phone') m.box(0.1, 0.02, 0.17, col, 0, -0.46, 0.1);
  else m.box(0.045, 0.045, 0.6, col, 0, -0.46, 0.2);
  return m.build();
}

const geoCache = new Map();
const MAX_GEO = 260;

/** The geometries of a look: { body, leg, arm, armHold, height, wide }. Cached, shared between figures of the same look. */
export function personGeometry(app = {}, holdingLook = null, kit = null) {
  const key = personKey(app, holdingLook, kit);
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
  const armHold = new Mesher().box(0.12, 0.36, 0.14, sleeves, 0, -0.36, 0).box(0.11, 0.1, 0.12, skin, 0, -0.44, 0);
  c = { body: body.build(), leg: leg.build(), arm: arm.build(), armHold: null, height: a.height || 1, wide, hold: holdingLook };
  if (holdingLook) {
    const wg = weaponGeometry(holdingLook, GUN_SHORT.has(holdingLook) || !WEAPONS[holdingLook]);
    c.armHold = mergeGeoms(armHold.build(), wg);
    wg.dispose();
  }
  geoCache.set(key, c);
  while (geoCache.size > MAX_GEO) { const old = geoCache.keys().next().value; const o = geoCache.get(old); o.body.dispose(); o.leg.dispose(); o.arm.dispose(); o.armHold?.dispose(); geoCache.delete(old); }
  return c;
}

function mergeGeoms(a, b) {
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'color']) {
    const A = a.attributes[k]; const B = b.attributes[k] || A;
    const arr = new Float32Array(A.array.length + (b.attributes[k] ? B.array.length : 0));
    arr.set(A.array); if (b.attributes[k]) arr.set(B.array, A.array.length);
    g.setAttribute(k, new THREE.BufferAttribute(arr, 3));
  }
  a.dispose();
  return g;
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

/** A figure: { root, set(pose) }. The pose carries everything that changes a frame. */
export class Figure {
  constructor(app, holdingLook, kit) {
    this.app = app;
    this.key = personKey(app, holdingLook, kit);
    this.geo = app?.species === 'cow' ? cowGeometry(app) : personGeometry(app, holdingLook, kit);
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
        const carry = this.geo.armHold && sd === 1;
        const piv = new THREE.Group();
        piv.position.set(sd * 0.27 * W, 0.86, 0);
        piv.add(mesh(carry ? this.geo.armHold : this.geo.arm));
        piv.userData.carry = Boolean(carry);
        this.body.add(piv);
        this.arms.push(piv);
      }
    }
    this.yaw = 0;
    this.fadeMat = null;
    this.alpha = 1;
  }

  /** Set the pose: { x, y, z (tiles), yaw, phase (walk radians, or null at rest), lying, lift }. */
  pose(p) {
    this.root.position.set(p.x, p.y + (p.lift || 0), p.z);
    this.spin.rotation.y = p.yaw;
    const sw = p.phase == null ? 0 : Math.sin(p.phase) * 0.55;
    const bob = p.phase == null ? 0 : Math.abs(Math.cos(p.phase)) * 0.035;
    this.lay.rotation.x = p.lying ? -Math.PI / 2 : 0;
    this.lay.position.y = p.lying ? 0.2 : 0;
    this.body.position.y = bob;
    this.legs.forEach((l, i) => { l.rotation.x = (i ? 1 : -1) * sw; });
    this.legs2.forEach((l, i) => { l.rotation.x = (i ? -1 : 1) * sw; });
    this.arms.forEach((a, i) => { a.rotation.x = a.userData.carry ? -1.15 : (i ? 1 : -1) * -sw * 0.9; });
  }

  /** Fade the whole figure (the Wrath takes the player away). */
  setAlpha(a) {
    if (a === this.alpha) return;
    this.alpha = a;
    if (a >= 0.999) { for (const m of this.meshes) m.material = vertexMat(); return; }
    if (!this.fadeMat) { this.fadeMat = vertexMat().clone(); this.fadeMat.transparent = true; this.fadeMat.userData.keep = false; }
    this.fadeMat.opacity = Math.max(0, a);
    for (const m of this.meshes) m.material = this.fadeMat;
  }

  dispose() {
    this.root.removeFromParent();
    if (this.fadeMat) this.fadeMat.dispose();
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
