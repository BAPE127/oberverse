// Saint Halloran (Westreach): the noir mock city in the game's map format. 150 x 96 tiles.
import { buildCity } from './pwmaps.js';
export const HALLORAN = {
  id: 'halloran', name: 'Saint Halloran', W: 150, H: 96, start: [76, 33], lampStep: 15,
  water: [{ x: 119, y: 0, w: 10, h: 77 }, { x: 0, y: 77, w: 150, h: 19 }],
  roads: [
    { x: 0, y: 4, w: 150, h: 4 }, { x: 0, y: 30, w: 76, h: 4 }, { x: 72, y: 30, w: 4, h: 8 }, { x: 72, y: 34, w: 78, h: 4 }, { x: 0, y: 54, w: 150, h: 4 }, { x: 0, y: 72, w: 150, h: 4 },
    { x: 12, y: 0, w: 4, h: 76 }, { x: 40, y: 0, w: 4, h: 76 }, { x: 70, y: 0, w: 4, h: 34 }, { x: 76, y: 38, w: 4, h: 38 }, { x: 104, y: 0, w: 4, h: 76 }, { x: 130, y: 0, w: 4, h: 76 },
  ],
  paving: [{ x: 119, y: 4, w: 10, h: 4, tile: 'b' }, { x: 119, y: 34, w: 10, h: 4, tile: 'b' }, { x: 119, y: 54, w: 10, h: 4, tile: 'b' }, { x: 119, y: 72, w: 10, h: 4, tile: 'b' }, { x: 0, y: 76, w: 150, h: 1, tile: 'g' }],
  plazas: [{ x: 45, y: 39, w: 25, h: 14, fountain: true, trees: 7 }, { x: 109, y: 59, w: 20, h: 12, tile: 'm' }],
  cells: [
    { x: 17, y: 9, w: 23, h: 20, style: 'r_lan', wmin: 4, wmax: 8, dmin: 6, dmax: 9, lanes: true }, { x: 45, y: 9, w: 24, h: 20, style: 'r_lan', wmin: 4, wmax: 8, dmin: 6, dmax: 9, lanes: true }, { x: 75, y: 9, w: 28, h: 20, style: 'r_van', towers: 0.1 }, { x: 109, y: 9, w: 10, h: 20, style: 'r_civ' }, { x: 135, y: 9, w: 14, h: 20, style: 'r_civ' },
    { x: 17, y: 35, w: 23, h: 18, style: 'r_lan', wmin: 4, wmax: 8, dmin: 6, dmax: 9, lanes: true }, { x: 81, y: 39, w: 22, h: 14, style: 'r_van' }, { x: 109, y: 39, w: 10, h: 14, style: 'r_civ' }, { x: 135, y: 39, w: 14, h: 14, style: 'r_mhe' },
    { x: 17, y: 59, w: 23, h: 12, style: 'r_ten', wmin: 4, wmax: 7, dmin: 6, dmax: 9, lanes: true }, { x: 45, y: 59, w: 31, h: 12, style: 'r_kes' }, { x: 81, y: 59, w: 22, h: 12, style: 'r_kes' }, { x: 135, y: 59, w: 14, h: 12, style: 'r_mhe' },
  ],
  landmarks: [
    { key: 'casino', name: 'GILDED ACE CASINO', x: 78, y: 11, w: 17, h: 15, o: { wall: '#8a3a44', roof: '#2e1a1e', trim: '#1a0c10', neon: '#ffc846', awning: '#c8a030' } },
    { key: 'verona', name: 'CLUB VERONA', x: 96, y: 14, w: 7, h: 12, o: { wall: '#7a3a54', roof: '#2a1a24', trim: '#1a0c14', neon: '#ff8aa8', awning: '#a82a5a' } },
    { key: 'lantern', name: 'LANTERN HALL', x: 20, y: 12, w: 17, h: 14, o: { wall: '#8a5a36', roof: '#3a2a22', trim: '#2a1c14', neon: '#ffc846', awning: '#b83a2a' } },
    { key: 'cityhall', name: 'CITY HALL', x: 136, y: 11, w: 12, h: 15, o: { wall: '#a6a6b6', roof: '#4a4c58', trim: '#34363e', neon: '#dce6ff', columns: true } },
    { key: 'police', name: 'STATION 6 POLICE', x: 110, y: 12, w: 9, h: 14, o: { wall: '#8a96aa', roof: '#3a4252', trim: '#262c3a', neon: '#8ab4ff' } },
    { key: 'union', name: 'KESTREL UNION HALL', x: 47, y: 60, w: 16, h: 11, o: { wall: '#4a6a84', roof: '#24323e', trim: '#16222c', neon: '#6ec0f0', awning: '#2a6a9a' } },
    { key: 'pier3', name: 'PIER 3 WAREHOUSE', x: 84, y: 60, w: 16, h: 11, o: { wall: '#566a7a', roof: '#222c36', trim: '#141c24', neon: '#ff5a5a' } },
    { key: 'reyes', name: "MAMA REYES' GROCERY", x: 19, y: 63, w: 9, h: 8, o: { wall: '#80604a', roof: '#3a2e28', trim: '#2a201a', neon: '#8aff9a', awning: '#2a7a3a' } },
    { key: 'station', name: 'CENTRAL RAIL STATION', x: 136, y: 60, w: 13, h: 11, o: { wall: '#9a9aaa', roof: '#44444e', trim: '#2c2c34', neon: '#ffe9a0', columns: true } },
  ],
  props: [
    { type: 'statue', x: 56, y: 44 }, { type: 'barrelfire', x: 19, y: 31 }, { type: 'barrelfire', x: 100, y: 73 }, { type: 'crane', x: 60, y: 74, o: { w: 3, h: 2 } }, { type: 'crane', x: 96, y: 74, o: { w: 3, h: 2 } },
    { type: 'crate', x: 62, y: 75 }, { type: 'crate', x: 64, y: 75 }, { type: 'crate', x: 66, y: 75 }, { type: 'barrel', x: 90, y: 75 }, { type: 'crate', x: 92, y: 75 },
  ],
};
// piers into the harbour
export function piers(def) { const t = def.tiles.map((r) => r.split('')); for (const [x, len] of [[12, 9], [26, 14], [46, 11], [58, 15], [72, 9], [86, 13], [100, 10], [114, 7]]) for (let y = 77; y < 77 + len; y++) for (let dx = 0; dx < 3; dx++) t[y][x + dx] = 'p'; def.tiles = t.map((r) => r.join('')); return def; }
export const build = () => { const c = buildCity(HALLORAN); piers(c.def); return c; };
