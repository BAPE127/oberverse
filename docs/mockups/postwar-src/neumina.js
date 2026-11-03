// Neumina (Windfen League): the Post-War mock city in the game's map format. 150 x 96 tiles.
import { buildCity } from './pwmaps.js';
export const NEUMINA = {
  id: 'neumina', name: 'Neumina', W: 150, H: 96, start: [60, 41], ground: 'g', lampStep: 17,
  water: [{ x: 1, y: 0, w: 7, h: 96 }],
  roads: [
    { x: 0, y: 4, w: 150, h: 4 }, { x: 0, y: 34, w: 86, h: 4 }, { x: 82, y: 34, w: 4, h: 8 }, { x: 82, y: 38, w: 68, h: 4 },
    { x: 0, y: 66, w: 56, h: 4 }, { x: 52, y: 60, w: 4, h: 10 }, { x: 52, y: 60, w: 98, h: 4 },
    { x: 14, y: 0, w: 4, h: 96 }, { x: 48, y: 0, w: 4, h: 96 }, { x: 82, y: 0, w: 4, h: 42 }, { x: 90, y: 42, w: 4, h: 54 }, { x: 118, y: 0, w: 4, h: 96 },
  ],
  paving: [{ x: 0, y: 4, w: 14, h: 4, tile: 'b' }, { x: 0, y: 34, w: 14, h: 4, tile: 'b' }, { x: 0, y: 66, w: 14, h: 4, tile: 'b' }, { x: 0, y: 4, w: 8, h: 4, tile: 'b' }, { x: 1, y: 34, w: 7, h: 4, tile: 'b' }, { x: 1, y: 66, w: 7, h: 4, tile: 'b' }],
  plazas: [{ x: 54, y: 43, w: 28, h: 16, fountain: true, trees: 6 }, { x: 24, y: 76, w: 20, h: 14, tile: 'g' }, { x: 60, y: 92, w: 24, h: 3, tile: 'm' }],
  cells: [
    { x: 19, y: 9, w: 28, h: 24, style: 'n_res', towers: 0.3, wmin: 5, wmax: 9, dmin: 6, dmax: 9, lanes: true }, { x: 53, y: 9, w: 28, h: 24, style: 'n_corp', towers: 0.6, wmin: 7, wmax: 12, dmin: 8, dmax: 12 }, { x: 87, y: 9, w: 30, h: 24, style: 'n_corp', towers: 0.55, wmin: 7, wmax: 12, dmin: 8, dmax: 12 }, { x: 123, y: 9, w: 26, h: 24, style: 'n_lab' },
    { x: 19, y: 39, w: 28, h: 26, style: 'n_res', towers: 0.3, wmin: 5, wmax: 8, dmin: 6, dmax: 9, lanes: true }, { x: 87, y: 43, w: 30, h: 16, style: 'n_ent', towers: 0.3, wmin: 5, wmax: 9, dmin: 6, dmax: 9, lanes: true }, { x: 123, y: 43, w: 26, h: 16, style: 'n_ind' },
    { x: 19, y: 71, w: 28, h: 24, style: 'n_seam', wmin: 4, wmax: 7, dmin: 5, dmax: 8, lanes: true }, { x: 53, y: 65, w: 36, h: 27, style: 'n_tran', towers: 0.15 }, { x: 95, y: 65, w: 22, h: 29, style: 'n_ind' }, { x: 123, y: 65, w: 26, h: 29, style: 'n_ind' },
  ],
  landmarks: [
    { key: 'tower', name: 'ORRIN-VOSS TOWER', x: 94, y: 11, w: 14, h: 14, tower: 32, o: { wall: '#4c5ea8', glass: '#a8f0ff', trim: '#151c40', neon: '#ffd75e', helipad: true } },
    { key: 'kade', name: 'KADE LOGISTICS', x: 58, y: 12, w: 14, h: 13, tower: 24, o: { wall: '#3f5a96', glass: '#8fe0f0', trim: '#101a38', neon: '#5ee6ff', helipad: true } },
    { key: 'lab', name: 'HALCYON WORKS', x: 126, y: 13, w: 20, h: 17, o: { wall: '#7a3a6e', roof: '#341a30', trim: '#1c0c1a', neon: '#ff5a6a', awning: '#b03a4a' } },
    { key: 'lotus', name: 'NEON LOTUS CLUB', x: 94, y: 46, w: 16, h: 12, o: { wall: '#8a3fa6', roof: '#40205c', trim: '#221034', neon: '#ff5ec8', awning: '#d03aa8' } },
    { key: 'station', name: 'MERIDIAN LOOP STATION', x: 58, y: 70, w: 28, h: 18, o: { wall: '#3f7aa0', roof: '#1e3a52', trim: '#102232', neon: '#5ee6ff', awning: '#2f9ab8' } },
    { key: 'noodles', name: 'AGENCY NOODLES', sign: 'NOODLE BAR 24', x: 21, y: 23, w: 8, h: 9, o: { wall: '#6a5a96', roof: '#2c2450', trim: '#1c1634', neon: '#8aff9a', awning: '#2fb470' } },
    { key: 'mast', name: 'RELAY MAST PLANT', x: 98, y: 70, w: 14, h: 12, o: { wall: '#4a6a80', roof: '#222c38', trim: '#141a22', neon: '#ffffff' } },
  ],
  props: [
    { type: 'monitor_wall', x: 66, y: 44, o: { w: 4, h: 1 } }, { type: 'statue', x: 70, y: 50 }, { type: 'busstop', x: 54, y: 41 }, { type: 'busstop', x: 100, y: 62 },
    { type: 'tent', x: 26, y: 78 }, { type: 'tent', x: 30, y: 78 }, { type: 'tent', x: 34, y: 78 }, { type: 'tent', x: 38, y: 78 }, { type: 'tent', x: 26, y: 83 }, { type: 'tent', x: 31, y: 83 }, { type: 'tent', x: 36, y: 83 },
    { type: 'crate', x: 28, y: 80 }, { type: 'crate', x: 33, y: 85 }, { type: 'barrel', x: 40, y: 84 },
  ],
};
export const build = () => buildCity(NEUMINA);

// Level -1: the service tunnels, the metro and the black-market chamber, as its own interior map
import { MapBuilder } from '/src/world/mapBuilder.js';
export function underground() {
  const W = 70, H = 40, m = new MapBuilder(W, H, 'x');
  const room = (x, y, w, h, fl = 't') => { m.rect(x, y, w, h, 'W'); m.rect(x + 1, y + 1, w - 2, h - 2, fl); };
  room(0, 14, 70, 7, 'g'); m.rect(0, 15, 70, 5, 'g');            // the long service tunnel
  room(8, 3, 16, 12, 'g'); room(30, 3, 14, 12, 't'); room(50, 3, 16, 12, 'g'); // pump room, grid vault, relay
  room(6, 20, 26, 16, 'f'); room(38, 20, 28, 16, 'g');             // the black market, the metro platform
  for (const [x, y, w, h] of [[14, 13, 3, 3], [36, 13, 3, 3], [58, 13, 3, 3], [18, 19, 3, 3], [50, 19, 3, 3]]) m.rect(x, y, w, h, 'g');
  m.rect(38, 28, 28, 4, 'a');                                       // the metro track (tarmac look)
  const props = [], P = (type, x, y, o = {}) => props.push({ id: `u${props.length}`, type, x, y, ...o });
  [[9, 5], [12, 5], [15, 5], [18, 5], [21, 5]].forEach(([x, y]) => P('generator', x, y)); P('vent', 11, 3); P('vent', 19, 3); P('pipe', 10, 12); P('pipe', 14, 12);
  [[32, 5], [34, 5], [36, 5], [38, 5], [40, 5]].forEach(([x, y]) => P('terminal', x, y)); P('monitor_wall', 33, 3, { w: 4, h: 1 }); P('cabinet', 42, 10);
  [[52, 5], [55, 5], [58, 5], [61, 5]].forEach(([x, y]) => P('machine' === 'x' ? 'crate' : 'storagemachine' in {} ? 'x' : 'generator', x, y)); P('vent', 54, 3);
  for (const [x, y] of [[9, 23], [14, 23], [19, 23], [24, 23], [9, 29], [14, 29], [19, 29], [24, 29]]) { P('tent', x, y); P('crate', x + 2, y + 1); }
  P('barrel', 28, 32); P('barrel', 29, 33); P('crate', 27, 22); P('counter', 12, 33); P('counter', 13, 33);
  for (let x = 42; x < 64; x += 4) P('bench', x, 25);
  P('lamp_mechanism', 3, 17); P('crate', 66, 18); P('barrel', 62, 17); P('barrel', 5, 18);
  for (let x = 4; x < 66; x += 12) P('floorlamp', x, 16, { glow: '#ffb060' });
  return { id: 'neumina_under', name: 'Neumina: level -1', kind: 'interior', tiles: m.rows(), buildings: [], props, spots: { start: { x: 20, y: 17, facing: 'down' } }, areas: [] };
}
