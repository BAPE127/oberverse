// TARGET ART (mock-up only). Soldiers built on the game's REAL people sprites (src/engine/drawPeople.js) and weapon sprites (drawPixelWeapons.js):
// the war update would add role/uniform/camouflage data and a few overlay pieces (helmets, packs, armbands), not a new figure renderer.
// The game's people renderer has no soldier's helmet (its only hard hat is fixed yellow). The war update would add a 'helmet' style to drawPeople;
// here that addition is applied to a copy of the real module at load time so the mock still runs on the real sprites.
const src0 = await (await fetch('/src/engine/drawPeople.js')).text();
const helmet = `
  if (style === 'helmet') {
    const c = ramp(a.hatColor || '#4a5a30');
    R(-6, hy + 3, 12, 1, c[0]); R(-6, hy - 1, 12, 4, c[2]); R(-5, hy - 2, 10, 1, c[2]); R(-4, hy - 3, 8, 1, c[2]);
    R(-5, hy - 2, 4, 1, c[4]); R(-5, hy - 1, 3, 2, c[3]); R(3, hy - 1, 3, 3, c[1]); R(-6, hy + 2, 12, 1, a.hatBand || c[0]);
    if (!up) { R(-6, hy + 3, 1, 4, c[1]); R(5, hy + 3, 1, 4, c[1]); R(-5, hy + 6, 10, 1, c[1]); } // strap
  }
`;
const patched = src0.replace("['hat', 'tophat', 'cap', 'captain', 'hardhat', 'wizard']", "['hat', 'tophat', 'cap', 'captain', 'hardhat', 'wizard', 'helmet']").replace("  if (hatStyle && up) {", helmet + "  if (hatStyle && up) {");
const { drawPerson } = await import(URL.createObjectURL(new Blob([patched], { type: 'text/javascript' })));
import { drawWeaponSprite } from '/src/engine/drawPixelWeapons.js';
import { FACTIONS, shade, INK } from './warart.js';

export const ROLES = {
  rifleman: { name: 'Rifleman', gun: 'ar', pack: 'small' },
  leader: { name: 'Squad leader', gun: 'smg', pack: 'radio', band: true },
  mg: { name: 'Machine gunner', gun: 'lmg', pack: 'ammo', build: 'broad' },
  at: { name: 'Anti-tank', gun: 'rpg', pack: 'rockets' },
  medic: { name: 'Medic', gun: 'pistol', pack: 'medic', cross: true },
  marksman: { name: 'Marksman', gun: 'sniper', pack: 'ghillie', build: 'thin' },
  engineer: { name: 'Combat engineer', gun: 'shotgun', pack: 'tools' },
  signaller: { name: 'Signaller', gun: 'smg', pack: 'radio', antenna: true },
  officer: { name: 'Officer', gun: 'pistol', cap: true },
  recon: { name: 'Recon', gun: 'smg', pack: 'ghillie', build: 'thin' },
};
export const ENV = {
  forest: { cloth: '#4f6b3a', legs: '#3c5230', helm: '#3a5030', pat: '#2e4426' },
  desert: { cloth: '#b8a070', legs: '#9a8458', helm: '#a08a5c', pat: '#8a7448' },
  urban: { cloth: '#7a7e84', legs: '#5c6068', helm: '#4a4e56', pat: '#3e4248' },
  snow: { cloth: '#d8dde0', legs: '#b8c0c6', helm: '#c8d0d4', pat: '#9aa6ae' },
};
function look(role, faction, env) {
  const R = ROLES[role], F = FACTIONS[faction], E = ENV[env] || null;
  const cloth = E && faction !== 'sund' ? E.cloth : F.cloth, legs = E && faction !== 'sund' ? E.legs : F.legs, helm = E && faction !== 'sund' ? E.helm : F.helmet;
  return { skin: '#e0b088', hair: '#3a2a1a', hairStyle: R.cap ? 'cap' : 'helmet', hatColor: R.cap ? shade(cloth, -10) : helm, hatBand: F.accent, outfit: cloth, sleeves: shade(cloth, -6), legs, shoes: '#2a2418', build: R.build || 'average', accessories: ['vest'], vestColor: shade(cloth, -26), pattern: E ? 'check' : undefined, patternColor: E ? E.pat : undefined };
}
/** x,y = feet. facing: left|right|up|down. */
export function drawSoldier(ctx, role, faction, x, y, facing = 'right', o = {}) {
  const R = ROLES[role]; const a = look(role, faction, o.env || (faction === 'sund' ? null : 'forest'));
  const s = { x, y, facing, animTime: o.t ?? 0, moving: Boolean(o.moving), scale: o.scale || 1 };
  ctx.save(); ctx.imageSmoothingEnabled = false;
  // pack behind the body
  const dir = facing === 'left' ? 1 : -1; const side = facing === 'left' || facing === 'right';
  if (R.pack && facing !== 'down') { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s.scale, s.scale); const px = side ? dir * 5 : 0, py = -19; const P = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(px + dx, py + dy, w, h); }; const packC = R.pack === 'medic' ? '#e8e6dc' : shade(a.outfit, -22);
    if (R.pack === 'ghillie') { for (let i = 0; i < 9; i++) P(-4 + (i % 3) * 3, i * 1.5, 4, 3, i % 2 ? '#5a6a3a' : '#44562c'); } else { P(-3, 0, 6, 9, INK); P(-2, 1, 4, 7, packC); P(-2, 1, 1, 7, shade(packC, 24)); }
    if (R.pack === 'medic') { P(-1, 3, 2, 4, '#c82a2a'); P(-2, 4, 4, 2, '#c82a2a'); }
    if (R.pack === 'radio' || R.antenna) { P(2, -10, 1, 11, '#2a2a30'); P(-2, 1, 4, 2, '#1c1c22'); }
    if (R.pack === 'rockets') { P(-4, -1, 2, 8, '#6a6a3a'); P(2, -1, 2, 8, '#6a6a3a'); }
    if (R.pack === 'tools') { P(-3, 8, 6, 2, '#8a6a2a'); P(-1, -2, 2, 4, '#a0a0a8'); }
    ctx.restore(); }
  const gun = R.gun;
  drawPerson(ctx, a, s, gun ? (c) => { c.save(); c.translate(facing === 'left' ? -3 : 3, -8); if (facing === 'left') c.scale(-1, 1); if (facing === 'up') c.translate(0, -2); drawWeaponSprite(c, gun, 1, { hand: a.skin }); c.restore(); } : null);
  // markings: a medic's armband and cross, an officer's gold braid, the leader's stripe
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s.scale, s.scale);
  if (R.cross && facing !== 'up') { ctx.fillStyle = '#f0eee4'; ctx.fillRect(-6, -17, 4, 5); ctx.fillStyle = '#c82a2a'; ctx.fillRect(-5, -16, 2, 3); ctx.fillRect(-6, -15, 4, 1); ctx.fillStyle = '#f0eee4'; ctx.fillRect(-4, -26, 8, 3); ctx.fillStyle = '#c82a2a'; ctx.fillRect(-1, -26, 2, 3); }
  if (R.band) { ctx.fillStyle = FACTIONS[faction].accent; ctx.fillRect(-5, -14, 4, 2); ctx.fillRect(-5, -12, 2, 1); }
  if (role === 'officer') { ctx.fillStyle = '#d8b04a'; ctx.fillRect(-4, -16, 8, 1); ctx.fillRect(-3, -14, 6, 1); }
  ctx.restore(); ctx.restore();
}
/** Total War-style banner (the zoomed-out look of a squad/battalion) */
export function banner(ctx, x, y, faction, label, n, kind = 'inf', o = {}) {
  const F = FACTIONS[faction]; const w = o.w || 52, h = 30; ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = 'rgba(10,8,20,.4)'; ctx.fillRect(-w / 2 + 3, 3, w, h);
  ctx.fillStyle = '#05040f'; ctx.fillRect(-w / 2 - 2, -2, w + 4, h + 4); ctx.fillStyle = F.hull2; ctx.fillRect(-w / 2, 0, w, h); ctx.fillStyle = F.hull; ctx.fillRect(-w / 2, 0, w, 4); ctx.fillStyle = F.accent; ctx.fillRect(-w / 2, h - 5, w, 5);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, 0, 17);
  // icon
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; if (kind === 'inf') { ctx.beginPath(); ctx.moveTo(-w / 2 + 4, 24); ctx.lineTo(-w / 2 + 12, 10); ctx.moveTo(-w / 2 + 4, 10); ctx.lineTo(-w / 2 + 12, 24); ctx.stroke(); } else if (kind === 'arm') { ctx.beginPath(); ctx.ellipse(-w / 2 + 10, 17, 7, 4, 0, 0, 7); ctx.stroke(); } else if (kind === 'air') { ctx.beginPath(); ctx.moveTo(-w / 2 + 3, 20); ctx.lineTo(-w / 2 + 10, 8); ctx.lineTo(-w / 2 + 17, 20); ctx.stroke(); }
  ctx.fillStyle = '#05040f'; ctx.fillRect(w / 2 - 14, -9, 20, 12); ctx.fillStyle = '#ffe28a'; ctx.font = 'bold 10px system-ui'; ctx.fillText(String(n), w / 2 - 4, 0);
  if (o.sel) { ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2 - 4, -4, w + 8, h + 8); }
  if (o.hp != null) { ctx.fillStyle = '#2a2a34'; ctx.fillRect(-w / 2, h + 5, w, 3); ctx.fillStyle = o.hp > 0.6 ? '#5fe08a' : '#f2c14e'; ctx.fillRect(-w / 2, h + 5, w * o.hp, 3); }
  ctx.restore();
}
