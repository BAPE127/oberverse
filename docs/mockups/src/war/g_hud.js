// TARGET ART (mock-up only). The battle screen's panels, in the game's own HUD look (dark navy panels, indigo borders, cream text), drawn over a 1920 x 1080 view.
import { drawSoldier } from './soldiers.js';
import { drawVeh } from './fleet.js';
import { CAT } from './g_scene.js';
export function hud(g, o = {}) {
  const panel = (x, y, w, h, a = 0.92) => { g.fillStyle = `rgba(8,7,26,${a})`; g.fillRect(x, y, w, h); g.strokeStyle = '#3a38a0'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); };
  const txt = (t, x, y, s = 13, c = '#e8e6ff', w = 600, al = 'left') => { g.font = `${w} ${s}px system-ui`; g.fillStyle = c; g.textAlign = al; g.fillText(t, x, y); g.textAlign = 'left'; };
  const bar = (x, y, w, v, c) => { g.fillStyle = '#25254a'; g.fillRect(x, y, w, 6); g.fillStyle = c; g.fillRect(x, y, w * v, 6); };
  panel(0, 0, 1920, 46, 0.92); txt('THE CROSSING AT HALDEN ROADS', 20, 29, 18, '#ffe28a', 800); txt('Falkenmark · Ostmark contract · day 44 · 08:42 · clear, light wind', 360, 29, 14, '#c9c7ee');
  txt('OBJECTIVES', 820, 20, 11, '#a09ec9', 700); (o.objectives || ['◉ Hold the crossing  04:12', '○ Open the bakery', '○ Break the depot']).forEach((t, i) => txt(t, 820 + i * 215, 38, 13, i === 0 ? '#9af0c0' : '#e8e6ff', 700)); txt('×1  ▶▶  ⏸', 1790, 29, 16, '#ffe28a', 800);
  const cards = o.cards || [['Alpha Squad', '8/8 · 5 mags', 'leader'], ['Bravo (AT)', '3/3 · rockets 4', 'at'], ['UAV team', '2 ops · 2 drones', 'recon'], ['Engineers', '3 · charges 2', 'engineer'], ['Anvil (11)', 'crew 3 · 11 shells', 'anvil'], ['Breacher dozer', 'ramming', 'breacher']];
  cards.forEach(([n, d, k], i) => { const y = 58 + i * 78; panel(12, y, 232, 70, 0.9); if (i === 0 || i === 4) { g.strokeStyle = '#ffe28a'; g.lineWidth = 3; g.strokeRect(12, y, 232, 70); }
    g.save(); g.beginPath(); g.rect(20, y + 6, 58, 58); g.clip(); g.fillStyle = '#25254a'; g.fillRect(20, y + 6, 58, 58); if (CAT[k]) { drawVeh(g, CAT[k].spec, 49, y + 36, Math.PI / 2, { scale: 0.7, turret: 0.2 }); } else { g.save(); g.scale(2.2, 2.2); drawSoldier(g, k, 'company', 49 / 2.2, (y + 60) / 2.2, 'right', { env: 'forest' }); g.restore(); } g.restore();
    txt(n, 88, y + 24, 14, '#fff', 800); txt(d, 88, y + 42, 12, '#a09ec9'); bar(88, y + 52, 140, [0.92, 1, 0.9, 1, 0.82, 1][i], '#5fe08a'); bar(88, y + 60, 140, [0.85, 0.9, 1, 0.9, 1, 0.8][i], '#6ab0ff'); });
  if (o.right !== false) { panel(1668, 64, 240, 420, 0.92); txt(o.rightTitle || 'ALPHA SQUAD', 1684, 92, 16, '#ffe28a', 800); txt('Sgt. Orla Venn · Rifle section', 1684, 112, 12, '#c9c7ee'); txt('Morale  steady   Suppression  low', 1684, 132, 12, '#9af0c0', 700);
    [['Orla Venn', 'leader · smg', 1], ['Dev Ashby', 'rifle · ar', 1], ['Mo Tarr', 'rifle · ar', 0.9], ['Ines Cobb', 'rifle · ar', 1], ['Pike Rudd', 'rifle · ar', 0.6], ['Jules Hart', 'MG · lmg', 1], ['Tam Noor', 'rifle · ar', 1], ['Wren Doyle', 'medic · kit', 1]].forEach(([n, r, h], i) => { const y = 150 + i * 36; txt(n, 1684, y + 10, 13, '#fff', 700); txt(r, 1684, y + 26, 11, '#a09ec9'); bar(1810, y + 14, 80, h, h > 0.7 ? '#5fe08a' : '#f2c14e'); });
    txt('Wounded: Pike Rudd (clinic)', 1684, 452, 11, '#ffd0a0', 600); txt('Cover: heavy (sandbags)', 1684, 472, 11, '#c9c7ee', 600);
    panel(1668, 494, 240, 120, 0.92); txt('SUPPORT (real stock)', 1684, 520, 13, '#ffe28a', 800); ['Attack helicopter · on station', 'Harrow bomber · ready (1 run)', 'Longbow missile · 2 left', 'Rainmaker MLRS · 12 rockets'].forEach((t, i) => txt(t, 1684, 544 + i * 20, 12, '#e8e6ff')); }
  panel(264, 1000, 1000, 70, 0.92); ['Move', 'Hold', 'Attack', 'Flank', 'Suppress', 'Regroup', 'Garrison', 'Breach', 'Smoke'].forEach((t, i) => { const x = 276 + i * 108; g.fillStyle = i === 2 ? '#f2c14e' : '#25254a'; g.fillRect(x, 1010, 100, 50); g.strokeStyle = i === 2 ? '#ffe08a' : '#4a47b0'; g.strokeRect(x, 1010, 100, 50); txt(String(i + 1), x + 6, 1024, 10, i === 2 ? '#2a1a00' : '#a09ec9', 700); txt(t, x + 50, 1042, 14, i === 2 ? '#2a1a00' : '#fff', 800, 'center'); });
  if (o.minimap) { panel(1668, 920, 240, 150, 0.95); g.save(); g.beginPath(); g.rect(1676, 928, 224, 134); g.clip(); g.drawImage(o.minimap, 0, 0, o.minimap.width, o.minimap.height, 1676, 928, 224, 134); g.restore(); g.strokeStyle = '#ffe28a'; g.lineWidth = 2; g.strokeRect(1676 + 224 * o.mmRect[0], 928 + 134 * o.mmRect[1], 224 * o.mmRect[2], 134 * o.mmRect[3]); }
}
export const _ = null;
