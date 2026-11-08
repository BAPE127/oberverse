// Soldiers for the battle (v0.102.0): the game's own people sprites and weapon sprites with the war pieces added on: a helmet in the side's colour, a pack behind the body for the role (radio and
// antenna for a signaller, rockets for anti-tank, a ghillie cloak for a marksman, a medic's cross, an officer's braid, a leader's band). Ported from the approved mock-up
// (docs/mockups/src/war/soldiers.js). Browser only; paint, never state.
import { drawPerson } from './drawPeople.js';
import { drawWeaponSprite } from './drawPixelWeapons.js';
import { shade, INK, mixc } from './drawFleet.js';
import { drawArmoured, drawGunSpec, ARMOUR_COLOURS } from './drawFuture.js';

/** The pieces a role adds: a pack, a build, and what is worn. The weapon comes from the soldier's real loadout, not from here. */
export const ROLE_LOOK = {
  rifleman: { pack: 'small' }, mg: { pack: 'ammo', build: 'broad' }, at: { pack: 'rockets' }, medic: { pack: 'medic', cross: true }, marksman: { pack: 'ghillie', build: 'thin' },
  engineer: { pack: 'tools' }, signaller: { pack: 'radio', antenna: true }, officer: { cap: true, band: true }, recon: { pack: 'ghillie', build: 'thin' },
};
const ROLE_OF = { machine_gunner: 'mg', anti_tank: 'at', guard: 'rifleman', uav: 'signaller' };
/** The enemy's uniform (the player's comes from the squad's look). */
export const ENEMY = { cloth: '#9a8456', legs: '#6e5e38', helm: '#7a6a42', accent: '#b83a2a' };

/** x, y = feet. facing: left | right | up | down. o: { cloth, helm, legs, accent, gun, t, moving, scale, skin }. */
export function drawSoldier(ctx, role, x, y, facing = 'right', o = {}) {
  const key = ROLE_OF[role] || role; const R = ROLE_LOOK[key] || ROLE_LOOK.rifleman; const cloth = o.cloth || '#516b3e';
  // v0.103.8: the hardsuit (era 3) and the power armour (era 4) are painted soldiers of their own, in the squad's colour; a gun that is not a future weapon is drawn as a plain rifle
  if (o.era >= 3) {
    const C = ARMOUR_COLOURS[o.era]; const spec = typeof o.gun === 'object' ? o.gun : o.gun ? { kind: 'ballistic', len: 18, body: '#4a4a52' } : null;
    drawArmoured(ctx, { era: o.era, role: key, facing, colors: { ...C, primary: o.era === 3 ? mixc(cloth, '#ffffff', 0.62) : mixc(cloth, '#2a3350', 0.6), glow: C.glow }, band: o.accent, weapon: spec }, x, y, o.scale || 1);
    return;
  }
  const a = { skin: o.skin || '#e0b088', hair: '#3a2a1a', hairStyle: R.cap ? 'cap' : 'helmet', hatColor: R.cap ? shade(cloth, -10) : (o.helm || shade(cloth, -18)), hatBand: o.accent, outfit: cloth, sleeves: shade(cloth, -6), legs: o.legs || shade(cloth, -30), shoes: '#2a2418', build: R.build || 'average', accessories: ['vest'], vestColor: shade(cloth, -26) };
  const s = { x, y, facing, animTime: o.t ?? 0, moving: Boolean(o.moving), scale: o.scale || 1 };
  ctx.save(); ctx.imageSmoothingEnabled = false;
  const dir = facing === 'left' ? 1 : -1; const side = facing === 'left' || facing === 'right';
  if (R.pack && facing !== 'down') {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s.scale, s.scale); const px = side ? dir * 5 : 0; const py = -19; const P = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(px + dx, py + dy, w, h); }; const packC = R.pack === 'medic' ? '#e8e6dc' : shade(cloth, -22);
    if (R.pack === 'ghillie') { for (let i = 0; i < 9; i++) P(-4 + (i % 3) * 3, i * 1.5, 4, 3, i % 2 ? '#5a6a3a' : '#44562c'); } else { P(-3, 0, 6, 9, INK); P(-2, 1, 4, 7, packC); P(-2, 1, 1, 7, shade(packC, 24)); }
    if (R.pack === 'medic') { P(-1, 3, 2, 4, '#c82a2a'); P(-2, 4, 4, 2, '#c82a2a'); }
    if (R.pack === 'radio' || R.antenna) { P(2, -10, 1, 11, '#2a2a30'); P(-2, 1, 4, 2, '#1c1c22'); }
    if (R.pack === 'rockets') { P(-4, -1, 2, 8, '#6a6a3a'); P(2, -1, 2, 8, '#6a6a3a'); }
    if (R.pack === 'tools') { P(-3, 8, 6, 2, '#8a6a2a'); P(-1, -2, 2, 4, '#a0a0a8'); }
    ctx.restore();
  }
  const gun = o.gun;
  drawPerson(ctx, a, s, gun ? (c) => { c.save(); c.translate(facing === 'left' ? -3 : 3, -8); if (facing === 'left') c.scale(-1, 1); if (facing === 'up') c.translate(0, -2); (typeof gun === 'object' ? drawGunSpec(c, gun, 0, 0, 0, 1) : drawWeaponSprite(c, gun, 1, { hand: a.skin })); c.restore(); } : null);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s.scale, s.scale);
  if (R.cross && facing !== 'up') { ctx.fillStyle = '#f0eee4'; ctx.fillRect(-6, -17, 4, 5); ctx.fillStyle = '#c82a2a'; ctx.fillRect(-5, -16, 2, 3); ctx.fillRect(-6, -15, 4, 1); ctx.fillStyle = '#f0eee4'; ctx.fillRect(-4, -26, 8, 3); ctx.fillStyle = '#c82a2a'; ctx.fillRect(-1, -26, 2, 3); }
  if (R.band && o.accent) { ctx.fillStyle = o.accent; ctx.fillRect(-5, -14, 4, 2); ctx.fillRect(-5, -12, 2, 1); }
  if (key === 'officer') { ctx.fillStyle = '#d8b04a'; ctx.fillRect(-4, -16, 8, 1); ctx.fillRect(-3, -14, 6, 1); }
  ctx.restore(); ctx.restore();
}
