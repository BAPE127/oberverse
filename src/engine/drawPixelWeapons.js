// Pixel-art weapons (v0.45.0): one sprite per weapon `look`, drawn on the art-pixel grid with a
// dark outline — used in the hand (rotated toward the aim) and, scaled up, as the hotbar icon.
// A sprite is a list of rects [x, y, w, h, colour] in art pixels; the grip (where the hand holds
// it) is at (0, 0) and the barrel or business end points along +x.
const INK = '#14141e';
const STEEL = '#4a4a56';
const DARK = '#2a2a32';
const HI = '#8a8a98';
const WOOD = '#7a4a2a';
const WOOD_HI = '#a87448';
const GOLD = '#e8b830';
const GOLD_HI = '#fff0a0';

const S = {
  // ---- guns
  revolver: [[2, -3, 9, 2, STEEL], [2, -3, 9, 1, HI], [0, -5, 5, 4, '#6a6a78'], [0, -5, 5, 1, '#a0a0ae'], [1, -3, 3, 1, DARK], [-1, -2, 3, 2, DARK], [-1, 0, 3, 4, WOOD], [-1, 0, 1, 4, WOOD_HI], [-2, -5, 2, 1, DARK], [10, -4, 1, 1, DARK], [2, 0, 2, 1, DARK]],
  pistol: [[-1, -4, 12, 3, '#3a3a44'], [-1, -4, 12, 1, '#7a7a88'], [8, -3, 1, 1, '#1a1a22'], [0, -1, 7, 1, DARK], [0, 0, 3, 4, DARK], [1, 1, 1, 2, STEEL], [3, 0, 3, 1, DARK], [9, -5, 1, 1, DARK]],
  shotgun: [[-7, -2, 7, 3, WOOD], [-7, -2, 7, 1, WOOD_HI], [-7, 0, 2, 2, WOOD], [0, -3, 5, 3, '#3a3a44'], [5, -3, 13, 2, STEEL], [5, -3, 13, 1, HI], [5, -1, 11, 1, DARK], [7, -1, 6, 2, WOOD], [7, -1, 6, 1, WOOD_HI], [1, 0, 2, 2, DARK]],
  rifle: [[-7, -2, 7, 3, WOOD], [-7, -2, 7, 1, WOOD_HI], [0, -3, 8, 3, WOOD], [0, -3, 8, 1, WOOD_HI], [8, -3, 12, 1, STEEL], [1, -6, 9, 2, DARK], [1, -6, 9, 1, '#4a4a56'], [9, -6, 1, 2, '#7ab8d8'], [3, -4, 1, 1, DARK], [4, -1, 1, 1, '#c9ced4'], [1, 0, 2, 2, DARK]],
  smg: [[-5, -3, 5, 1, STEEL], [-5, -3, 1, 3, STEEL], [0, -4, 9, 3, '#3a3a44'], [0, -4, 9, 1, '#7a7a88'], [9, -3, 4, 1, DARK], [4, -1, 2, 6, DARK], [4, -1, 1, 6, STEEL], [0, -1, 2, 3, DARK], [7, -5, 1, 1, DARK]],
  ar: [[-6, -3, 6, 3, DARK], [-6, -3, 6, 1, STEEL], [0, -4, 9, 3, '#3a3a44'], [0, -4, 9, 1, '#7a7a88'], [9, -4, 6, 3, '#4a4a3a'], [9, -4, 6, 1, '#6a6a52'], [15, -3, 4, 1, DARK], [2, -6, 6, 1, DARK], [2, -6, 1, 2, DARK], [5, -1, 2, 3, DARK], [6, 2, 2, 2, DARK], [0, -1, 2, 3, DARK]],
  sniper: [[-8, -2, 8, 3, '#3a4a3a'], [-8, -2, 8, 1, '#5a6a52'], [0, -3, 8, 3, '#3a4a3a'], [8, -3, 16, 1, STEEL], [22, -4, 2, 3, DARK], [0, -7, 11, 3, DARK], [0, -7, 11, 1, STEEL], [10, -7, 1, 3, '#7ab8d8'], [-1, -6, 1, 1, '#7ab8d8'], [14, -2, 1, 4, DARK], [17, -2, 1, 4, DARK], [1, 0, 2, 2, DARK]],
  lmg: [[-7, -3, 7, 3, DARK], [0, -4, 10, 4, '#3a3a44'], [0, -4, 10, 1, '#7a7a88'], [10, -4, 8, 3, '#4a4a56'], [10, -4, 8, 1, DARK], [11, -3, 1, 1, '#1a1a22'], [13, -3, 1, 1, '#1a1a22'], [15, -3, 1, 1, '#1a1a22'], [18, -3, 4, 1, DARK], [2, 0, 6, 5, '#5a5a3a'], [2, 0, 6, 1, '#7a7a52'], [16, -1, 1, 4, DARK], [19, -1, 1, 4, DARK], [2, -6, 5, 2, DARK]],
  rpg: [[-6, -4, 22, 4, '#5a6a3a'], [-6, -4, 22, 1, '#7a8a52'], [-7, -5, 2, 6, DARK], [16, -5, 2, 6, '#6a7a4a'], [18, -4, 3, 4, '#c0302a'], [21, -3, 2, 2, '#c0302a'], [4, -7, 3, 3, DARK], [2, 0, 2, 3, DARK], [6, 0, 2, 3, DARK]],
  // ---- melee (handle at the grip, head along +x)
  crowbar: [[-2, -1, 14, 2, '#c03030'], [-2, -1, 14, 1, '#e86060'], [12, -3, 2, 3, '#c03030'], [11, -4, 2, 1, '#c03030'], [-3, 0, 2, 1, '#c03030']],
  knuckles: [[0, -3, 6, 5, '#c9a24a'], [0, -3, 6, 1, '#f0d070'], [1, -1, 1, 2, INK], [3, -1, 1, 2, INK], [5, -1, 1, 1, INK]],
  baton: [[-3, -1, 16, 2, '#1e1e26'], [-3, -1, 16, 1, '#4a4a56'], [2, -3, 1, 2, '#1e1e26']],
  bat: [[-3, -1, 5, 2, '#d0d0d8'], [2, -1, 4, 2, WOOD_HI], [6, -2, 8, 3, WOOD_HI], [6, -2, 8, 1, '#d8a878'], [10, -1, 2, 1, '#8a5a34']],
  machete: [[-3, -1, 4, 2, '#3a2a1e'], [1, -2, 1, 3, '#c9a24a'], [2, -2, 12, 2, '#c9ced4'], [2, -2, 12, 1, '#ffffff'], [12, -1, 3, 2, '#c9ced4'], [3, 0, 9, 1, '#8a9098']],
  fireaxe: [[-3, -1, 14, 2, WOOD_HI], [-3, -1, 14, 1, '#d8a878'], [9, -5, 4, 9, '#c0302a'], [9, -5, 4, 1, '#e86060'], [13, -4, 1, 7, '#c9ced4'], [8, -3, 1, 4, '#c0302a']],
  // ---- the special weapons (v0.45.0)
  confetti: [[-5, -2, 6, 3, '#e86ab0'], [-5, -2, 6, 1, '#ff9ad0'], [1, -3, 9, 3, '#6ad0e8'], [1, -3, 9, 1, '#aaf0ff'], [3, -3, 1, 3, '#f2e05a'], [6, -3, 1, 3, '#f2e05a'], [10, -5, 3, 7, '#f2a33a'], [10, -5, 3, 1, '#ffd080'], [0, 0, 2, 3, '#7a3a9a']],
  rollingpin: [[-4, -1, 3, 2, WOOD], [-1, -2, 12, 4, '#e8c898'], [-1, -2, 12, 1, '#fff0d0'], [11, -1, 3, 2, WOOD], [3, -1, 1, 2, '#d8b888']],
  pigeon: [[-4, -2, 5, 3, '#5a5a66'], [1, -4, 12, 4, '#8a8a96'], [1, -4, 12, 1, '#b0b0ba'], [13, -5, 3, 4, '#9a9aa6'], [14, -6, 3, 3, '#c0c0ca'], [16, -5, 1, 1, '#2a2a32'], [17, -4, 2, 1, '#e8a040'], [15, -4, 2, 1, '#6ab08a'], [0, 0, 2, 3, DARK]],
  plunger: [[-3, -1, 13, 2, GOLD], [-3, -1, 13, 1, GOLD_HI], [10, -4, 3, 8, '#c03030'], [13, -3, 1, 6, '#c03030'], [10, -4, 1, 8, '#e86060']],
  mackerel: [[-6, -3, 3, 1, '#4a7aa8'], [-6, 1, 3, 1, '#4a7aa8'], [-4, -2, 2, 3, '#4a7aa8'], [-2, -3, 14, 4, '#8ab0c8'], [-2, -3, 14, 1, '#d0e8f0'], [0, -2, 2, 1, '#4a7aa8'], [4, -2, 2, 1, '#4a7aa8'], [8, -2, 2, 1, '#4a7aa8'], [12, -2, 2, 3, '#8ab0c8'], [12, -2, 1, 1, INK], [0, 1, 2, 3, DARK]],
  tuningfork: [[-3, -1, 6, 2, '#c9ced4'], [3, -3, 2, 6, '#c9ced4'], [5, -3, 10, 1, '#e8eef4'], [5, 2, 10, 1, '#e8eef4'], [14, -3, 1, 1, '#ffffff'], [14, 2, 1, 1, '#ffffff']],
  goldenhandshake: [[2, -3, 10, 2, GOLD], [2, -3, 10, 1, GOLD_HI], [0, -5, 5, 4, GOLD], [0, -5, 5, 1, GOLD_HI], [1, -3, 2, 1, '#b08820'], [-1, 0, 3, 4, '#f2efe6'], [-1, 0, 1, 4, '#ffffff'], [12, -4, 3, 4, GOLD], [12, -4, 3, 1, GOLD_HI], [15, -3, 1, 2, GOLD], [2, -6, 1, 1, '#ff4a8a']],
  nailgun: [[-2, -4, 10, 4, '#f2c14e'], [-2, -4, 10, 1, '#ffe08a'], [8, -3, 4, 2, DARK], [12, -3, 2, 1, '#c9ced4'], [0, 0, 3, 4, DARK], [4, 0, 2, 4, '#c9ced4'], [4, 1, 2, 1, '#8a9098'], [4, 3, 2, 1, '#8a9098']],
  gavel: [[-3, -1, 12, 2, WOOD], [-3, -1, 12, 1, WOOD_HI], [9, -6, 7, 12, '#5a3420'], [9, -6, 7, 1, '#8a5a34'], [9, -3, 7, 1, GOLD], [9, 2, 7, 1, GOLD]],
  pythagorean: [[-2, -2, 4, 3, '#2a3028'], [2, -8, 2, 9, '#2a3028'], [2, -8, 14, 2, '#2a3028'], [4, -6, 9, 1, '#e8e8e0'], [4, -5, 7, 1, '#e8e8e0'], [4, -4, 5, 1, '#e8e8e0'], [4, -3, 3, 1, '#e8e8e0'], [16, -8, 2, 2, DARK], [4, -1, 14, 1, DARK], [18, -1, 2, 1, DARK], [0, 1, 2, 3, WOOD]],
  tinfoil: [[-2, -3, 9, 4, '#c9ced4'], [-2, -3, 9, 1, '#ffffff'], [0, -2, 1, 1, '#9aa0a8'], [3, -1, 1, 1, '#9aa0a8'], [7, -4, 3, 6, '#9aa0a8'], [10, -2, 4, 2, '#c9ced4'], [14, -3, 2, 4, '#5aff8a'], [2, -7, 1, 4, '#c9ced4'], [1, -8, 3, 2, '#ff5a5a'], [0, 1, 2, 3, '#9aa0a8']],
  harpoon: [[-5, -3, 6, 5, '#8a5a34'], [-5, -3, 6, 1, '#a87448'], [1, -4, 10, 6, '#c9a24a'], [1, -4, 10, 1, '#f0d070'], [11, -3, 2, 4, '#c9a24a'], [13, -2, 8, 2, '#c9ced4'], [21, -3, 2, 4, '#c9ced4'], [23, -2, 1, 2, '#c9ced4'], [4, 2, 2, 2, DARK]],
  cheddar: [[-4, -2, 5, 3, WOOD], [1, -6, 9, 9, '#f2c14e'], [1, -6, 9, 1, '#ffe08a'], [3, -4, 2, 2, '#c8902a'], [6, -2, 2, 2, '#c8902a'], [3, 0, 1, 1, '#c8902a'], [10, -3, 6, 3, STEEL], [10, -3, 6, 1, HI], [2, 3, 2, 2, DARK]],
  // v0.52.0: Morganius's card shoe (a fan of cards rising out of it) and Octavius's gold phone
  deadmanshand: [[-2, -2, 9, 4, '#4a1e6a'], [-2, -2, 9, 1, '#7a3aa8'], [-2, 1, 9, 1, GOLD], [7, -3, 2, 6, GOLD], [5, -7, 3, 5, '#f6f2e8'], [8, -8, 3, 5, '#f6f2e8'], [11, -7, 3, 5, '#f6f2e8'], [6, -6, 1, 1, '#c8242c'], [9, -7, 1, 1, '#14141e'], [12, -6, 1, 1, '#c8242c'], [0, 2, 2, 3, DARK]],
  goldphone: [[-1, -4, 6, 9, GOLD], [-1, -4, 6, 1, GOLD_HI], [0, -3, 4, 6, '#6ac8f0'], [0, -3, 4, 1, '#c8f0ff'], [1, 4, 2, 1, '#8a6a1a'], [5, -3, 1, 2, GOLD_HI], [6, -2, 2, 1, GOLD_HI]],
  // ---- not weapons: things people carry (v0.52.0)
  phone: [[-1, -2, 7, 4, '#16161e'], [0, -2, 5, 3, '#6ac8f0'], [0, -2, 5, 1, '#c8f0ff'], [2, 0, 1, 1, '#16161e'], [5, -1, 1, 2, '#c9a24a']],
};
// the old `held` names still work
const ALIAS = { pistol: 'pistol', longgun: 'rifle', club: 'bat', blade: 'machete', axe: 'fireaxe', knuckles: 'knuckles' };
const GUNS = new Set(['revolver', 'pistol', 'shotgun', 'rifle', 'smg', 'ar', 'sniper', 'lmg', 'rpg', 'confetti', 'pigeon', 'mackerel', 'goldenhandshake', 'nailgun', 'pythagorean', 'tinfoil', 'harpoon', 'cheddar', 'longgun', 'deadmanshand', 'goldphone']);

export const weaponLooks = () => Object.keys(S);
export const isGunLook = (look) => GUNS.has(look);
export const lookOf = (w) => w?.weapon?.look || ALIAS[w?.weapon?.held] || w?.weapon?.held || null;

/** Draw a weapon sprite at the current transform, `u` px per art pixel. `hand` is the holder's skin (or null). */
export function drawWeaponSprite(ctx, look, u = 2, { flash = false, hand = null } = {}) {
  const rects = S[look] || S[ALIAS[look]];
  if (!rects) return false;
  const col = (c) => (flash ? '#ffffff' : c);
  ctx.fillStyle = col(INK);
  for (const [x, y, w, h] of rects) ctx.fillRect((x - 1) * u, (y - 1) * u, (w + 2) * u, (h + 2) * u);
  for (const [x, y, w, h, c] of rects) { ctx.fillStyle = col(c); ctx.fillRect(x * u, y * u, w * u, h * u); }
  if (hand) { ctx.fillStyle = col(INK); ctx.fillRect(-1 * u, -2 * u, 4 * u, 4 * u); ctx.fillStyle = col(hand); ctx.fillRect(0, -1 * u, 2 * u, 2 * u); }
  return true;
}

/** The sprite's extent in art pixels (for fitting it into an icon). */
export function weaponBounds(look) {
  const rects = S[look] || S[ALIAS[look]];
  if (!rects) return null;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const [x, y, w, h] of rects) { x0 = Math.min(x0, x - 1); y0 = Math.min(y0, y - 1); x1 = Math.max(x1, x + w + 1); y1 = Math.max(y1, y + h + 1); }
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
}
