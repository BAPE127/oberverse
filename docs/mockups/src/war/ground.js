// The game's real ground painter (drawPixelGround) on a GameMap built from a tile grid. The war update would generate these grids from an atlas place.
import { GameMap } from '/src/world/gameMap.js';
import { buildPixelGround } from '/src/engine/drawPixelGround.js';
import { PROP_TYPES } from '/src/content/props.js';
export function groundFrom(grid, name = 'battle') {
  const map = new GameMap({ id: name, name, kind: 'outdoor', tiles: grid.map((r) => r.join('')), buildings: [], props: [], doors: [], spots: {} }, PROP_TYPES || {});
  return buildPixelGround(map, (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; });
}
export function makeGrid(w, h, fill = '.') { return Array.from({ length: h }, () => Array(w).fill(fill)); }
export function fillRect(g, x, y, w, h, ch) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && g[j][i] !== undefined) g[j][i] = ch; }
