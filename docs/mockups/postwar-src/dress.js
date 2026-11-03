// Per-shot dressing: the proposed extras, kept small and drawn in the game's stepped style. Everything else is the game's own renderer.
export async function neuStreet(S, city) { const g = window.oberverse.ui.game; const A = S.overlay();
  for (const b of city.def.buildings) if (b.signColor) A.glow((b.x + b.w / 2) * 32, (b.y + b.h) * 32 - 6, 34 + b.w * 5, b.signColor, 0.8);
  A.bar(98.5 * 32, 58 * 32, 98.5 * 32, 66 * 32, 26); A.bar(110 * 32, 53 * 32, 123 * 32, 53 * 32, 26); A.fly('tempest', 94 * 32, 56 * 32, 0, '#ff5ec8', g, 1.2); A.fly('corsair', 111 * 32, 60 * 32, 180, '#5ee6ff', g, 1.2); }
export async function neuPlaza(S, city) { const g = window.oberverse.ui.game; const A = S.overlay();
  for (const b of city.def.buildings) if (b.signColor) A.glow((b.x + b.w / 2) * 32, (b.y + b.h) * 32 - 6, 30 + b.w * 4, b.signColor, 0.7);
  A.glow(67 * 32, 50 * 32, 150, '#5ee6ff', 0.9); A.fly('regent', 60 * 32, 40 * 32, 10, '#ffd75e', g, 1.2); }
export async function neuMap(S, city) { const g = window.oberverse.ui.game; const A = S.overlay();
  for (const b of city.def.buildings) if (b.signColor) A.glow((b.x + b.w / 2) * 32, (b.y + b.h) * 32 - 6, 60 + b.w * 8, b.signColor, 0.8); }
export async function noirStreet(S, city) { const A = S.overlay();
  for (const b of city.def.buildings) if (b.signColor) A.glow((b.x + b.w / 2) * 32, (b.y + b.h) * 32 - 6, 30 + b.w * 4, b.signColor, 0.55);
  A.tint('#8aa0c8', 0.07); A.rain(380, 3); }
export async function noirDocks(S, city) { const A = S.overlay();
  for (const b of city.def.buildings) if (b.signColor) A.glow((b.x + b.w / 2) * 32, (b.y + b.h) * 32 - 6, 30 + b.w * 4, b.signColor, 0.5);
  A.tint('#8aa0c8', 0.08); A.rain(420, 7); }
export async function noirMap(S, city) { const A = S.overlay(); A.tint('#8aa0c8', 0.12); }

export async function neuUnder(S, city) { const A = S.overlay(); A.glow(20 * 32, 18 * 32, 120, '#ff9a40', 0.8); A.glow(40 * 32, 8 * 32, 90, '#5ee6ff', 0.8); }
