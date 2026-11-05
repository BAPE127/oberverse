// The ground of a battle map (v0.102.0): the game's own ground painter (the one every street map uses) run over the map's glyph grid, graded to the biome (snow, desert, steppe, wet), so a battle
// field has the same paving, kerbs, grass, dirt tracks, furrows and water as the rest of the game. Baked once per battle. Browser only. Ported from docs/mockups/src/war/g_gen.js.
import { GameMap } from '../world/gameMap.js';
import { buildPixelGround } from './drawPixelGround.js';
import { PROP_TYPES } from '../content/props.js';
import { ART_BIOME } from '../content/battle.js';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/** The game's own map object for a battle map: the glyph grid as rows, with its props and fields (the props are painted separately; the ground painter reads them for what lies under). */
export function gameMapOf(map) {
  const rows = []; for (let y = 0; y < map.h; y++) { let r = ''; for (let x = 0; x < map.w; x++) r += String.fromCharCode(map.surf[y * map.w + x]); rows.push(r); }
  return new GameMap({ id: 'battle', name: 'battle', kind: 'outdoor', tiles: rows, buildings: [], props: map.props, doors: [], spots: {}, fields: map.fields }, PROP_TYPES);
}

// ------------------------------------------------------------------------------------------------- biome grading of the painted ground
export function grade(canvas, biome) {
  if (biome === 'temperate') return canvas; const g = canvas.getContext('2d'); const w = canvas.width, h = canvas.height; const img = g.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2]; const sat = Math.max(r, gg, b) - Math.min(r, gg, b); const lum = (r + gg + b) / 3; const road = sat < 22 && lum < 105; const paved = sat < 26 && lum >= 105; const greenish = gg > r + 6 && gg > b + 6; const dirt = r > b + 26 && r >= gg; const water = b > r + 26 && b > gg + 6; const n = (i / 4) % 7;
    if (biome === 'snow') { if (greenish || dirt) { const k = 0.84; d[i] = r + (222 - r + (n - 3)) * k; d[i + 1] = gg + (230 - gg + (n - 3)) * k; d[i + 2] = b + (242 - b) * k; } else if (water) { d[i] = r + (176 - r) * 0.45; d[i + 1] = gg + (206 - gg) * 0.45; d[i + 2] = b + (226 - b) * 0.3; } else if (paved) { d[i] = r + (214 - r) * 0.35; d[i + 1] = gg + (222 - gg) * 0.35; d[i + 2] = b + (236 - b) * 0.35; } else if (road) { d[i] = r * 0.96 + 6; d[i + 1] = gg * 0.96 + 8; d[i + 2] = b * 0.98 + 12; } }
    else if (biome === 'desert') { if (!road) { d[i] = Math.min(255, r * 1.05 + 4); d[i + 1] = gg * 0.99; d[i + 2] = b * 0.88; } else { d[i] = r * 1.04; d[i + 1] = gg; d[i + 2] = b * 0.92; } }
    else if (biome === 'steppe') { if (greenish) { const k = 0.6; d[i] = r + (186 - r) * k; d[i + 1] = gg + (170 - gg) * k; d[i + 2] = b + (92 - b) * k; } }
    else if (biome === 'mud') { if (greenish) { d[i] = r * 0.72; d[i + 1] = gg * 0.88; d[i + 2] = b * 0.7; } else if (dirt) { d[i] = r * 0.78; d[i + 1] = gg * 0.74; d[i + 2] = b * 0.7; } } }
  g.putImageData(img, 0, 0); return canvas;
}


/** The whole ground, painted once: the game's painter, then the biome grade. */
export function bakeGround(map, gm = gameMapOf(map)) {
  const raw = buildPixelGround(gm, mk); const ground = mk(raw.width, raw.height); ground.getContext('2d').drawImage(raw, 0, 0);
  grade(ground, ART_BIOME[map.biome] || 'temperate'); return ground;
}
