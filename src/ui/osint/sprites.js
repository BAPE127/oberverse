// Sprites for the command terminal (v0.103.6): the game's own soldier, tank and helicopter art, drawn on the terminal's canvases so a squad, a finished vehicle or a parked aircraft looks the way it
// does in a battle. Browser only; paint, never state. Which sprite a vehicle gets depends only on its type, so the same vehicle always looks the same.
import { drawSoldier } from '../../engine/drawSoldiers.js';
import { shade } from '../../engine/drawFleet.js';
import { LOOKS, DEFAULT_LOOK } from '../../content/troops.js';
export { specId, isHeli, paintMachine } from '../../engine/drawParked.js';

/** The class glyph for a slot of a squad board (one letter each, so twelve fit a card). */
export const GLYPH = { rifleman: 'R', machine_gunner: 'MG', anti_tank: 'AT', marksman: 'M', medic: '+', engineer: 'E', signaller: 'S', officer: '★', recon: 'RC', uav: 'U' };
export const GLYPH_COLOUR = { rifleman: '#8fae6a', machine_gunner: '#d8a34a', anti_tank: '#d86a4a', marksman: '#7ab8d8', medic: '#e8e8e0', engineer: '#c8a060', signaller: '#9a8ad8', officer: '#e8d070', recon: '#6ad8b8', uav: '#d88ac8' };

/** The colours a squad's look gives its soldiers. */
export function lookColours(look) {
  const L = { ...DEFAULT_LOOK, ...(look || {}) }; const cloth = LOOKS.primary[L.primary] || '#4a5a3a';
  return { cloth, helm: shade(cloth, -18), legs: shade(cloth, -34), accent: LOOKS.band[L.band] || '#e8c84a', look: L };
}

/** Paint a row of soldiers of the given classes, in the squad's colours, feet on y. */
export function paintSquad(ctx, roles, look, x, y, { scale = 1.5, gap = 16 } = {}) {
  const c = lookColours(look);
  roles.forEach((role, i) => drawSoldier(ctx, role, x + i * gap * scale, y, 'right', { cloth: c.cloth, helm: c.helm, legs: c.legs, accent: c.accent, scale, t: 0, moving: false }));
}

/** The squad's patch: pattern in the primary colour, insignia, band along the bottom and a crest tick (everything the look setting means, in one picture). */
export function paintPatch(ctx, look, x, y, s = 40) {
  const c = lookColours(look); const L = c.look;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#0b100e'; ctx.fillRect(-1, -1, s + 2, s + 2); ctx.fillStyle = c.cloth; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = shade(c.cloth, -26); ctx.strokeStyle = shade(c.cloth, -26); ctx.lineWidth = 3;
  if (L.pattern === 'stripes') for (let i = -s; i < s; i += 10) { ctx.beginPath(); ctx.moveTo(i, s); ctx.lineTo(i + s, 0); ctx.stroke(); }
  else if (L.pattern === 'camo') { for (const [a, b, w, h] of [[2, 4, 14, 9], [20, 2, 16, 8], [6, 20, 12, 10], [24, 22, 12, 12], [14, 12, 10, 8]]) ctx.fillRect(a * s / 40, b * s / 40, w * s / 40, h * s / 40); }
  else if (L.pattern === 'chevron') { ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(0, 10 + k * 10); ctx.lineTo(s / 2, 2 + k * 10); ctx.lineTo(s, 10 + k * 10); } ctx.stroke(); }
  else if (L.pattern === 'checks') for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) ctx.fillRect(i * s / 4, j * s / 4, s / 4, s / 4);
  ctx.fillStyle = c.accent; ctx.fillRect(0, s - 7, s, 7);
  ctx.fillStyle = '#f0eee4';
  if (L.insignia === 'star') { ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 4 : 9; const a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(s / 2 + Math.cos(a) * r, s / 2 - 4 + Math.sin(a) * r); } ctx.fill(); }
  else if (L.insignia === 'bar') { ctx.fillRect(s / 2 - 10, s / 2 - 6, 20, 5); ctx.fillRect(s / 2 - 10, s / 2 + 1, 20, 5); }
  else if (L.insignia === 'wing') { ctx.beginPath(); ctx.moveTo(s / 2, s / 2 - 8); ctx.lineTo(s / 2 - 13, s / 2 + 2); ctx.lineTo(s / 2, s / 2 - 1); ctx.lineTo(s / 2 + 13, s / 2 + 2); ctx.fill(); }
  else if (L.insignia === 'dots') for (const dx of [-8, 0, 8]) ctx.fillRect(s / 2 + dx - 2, s / 2 - 6, 4, 4);
  if (L.crest === 'crest') { ctx.fillStyle = '#e8d070'; ctx.fillRect(s / 2 - 2, 1, 4, 5); } else if (L.crest === 'antenna') { ctx.fillStyle = '#d8d8e0'; ctx.fillRect(s - 8, 0, 1, 12); } else if (L.crest === 'fin') { ctx.fillStyle = '#d8d8e0'; ctx.fillRect(s / 2 - 1, 0, 2, 8); }
  ctx.restore();
}
