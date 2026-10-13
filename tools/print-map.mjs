// Print an ASCII preview of a map (default: lanternside) with buildings,
// doors, props (P) and spots (*). Usage: npm run map -- [mapId]
import { CONTENT } from '../src/content/index.js';
import { GameMap } from '../src/world/gameMap.js';

const id = process.argv[2] || 'lanternside';
const def = CONTENT.maps[id];
if (!def) {
  console.error(`Unknown map "${id}". Maps: ${Object.keys(CONTENT.maps).join(', ')}`);
  process.exit(1);
}
const map = new GameMap(def, CONTENT.propTypes);
const grid = map.grid.map((r) => [...r]);
for (const p of map.props) for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) if (grid[y]?.[x] !== undefined) grid[y][x] = 'P';
for (const s of Object.values(map.spots)) grid[s.y][s.x] = '*';
console.log(`${map.name} (${map.width}x${map.height})`);
console.log('    ' + Array.from({ length: map.width }, (_, i) => (i % 10 === 0 ? String(i / 10) : ' ')).join(''));
grid.forEach((row, y) => console.log(String(y).padStart(3) + ' ' + row.join('')));
