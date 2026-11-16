// Neumina (v0.107.0; owner's brief of 2026-11-16): the Windfen League's megacity, a city in levels. This first cut is two of them, the proof that
// a level shows through the one above it:
//   neumina_street   Level 1, the street: avenues in a grid, arcades, and the towers whose feet stand here and whose shafts rise through every level
//   neumina_skyway   Level 2, seven tiles up: decks round the towers and bridges between them, over open drops ('O') through which the street shows
// Each level is its own flat map (the rules never stack them); stairs join them as ordinary doors. The 3D view draws the level below through the
// drops (src/engine3d/world3d.js, `def.below`). Final coordinates; no growth, no generated interiors yet. Preview: `npm run map -- neumina_skyway`.
import { MapBuilder } from '../../world/mapBuilder.js';

export const NM_W = 72;
export const NM_H = 56;
export const SKY_DROP = 7; // tiles between the street and the skyway deck
export const TERRACE_DROP = 7; // and between the skyway and the terraces

/** The towers: x, y, w, h, storeys, name, wall, glass. They stand on the street and rise through the skyway (its tiles there are 'B'). */
const TOWERS = [
  [6, 6, 8, 8, 34, 'Halcyne Spire', '#2a2f44', '#5fd6ff'], [22, 5, 7, 9, 26, 'Orrel Data Exchange', '#33283f', '#ff4fb8'],
  [43, 6, 9, 7, 40, 'Vantor Biotic', '#1f3238', '#4dffc3'], [58, 5, 8, 9, 30, 'Kessin Arcology', '#3a2a2a', '#ffb347'],
  [6, 34, 9, 8, 22, 'Lumen Freight Stack', '#2b2b35', '#8f7bff'], [24, 36, 8, 8, 28, 'The Meridian Lattice', '#24323a', '#5fd6ff'],
  [44, 35, 7, 9, 36, 'Synth Court', '#3a2440', '#ff5fd6'], [58, 34, 9, 8, 24, 'Dace & Morrow Holdings', '#202b30', '#9dffb0'],
];

function street() {
  const m = new MapBuilder(NM_W, NM_H, ',');
  // avenues: two east-west, three north-south, four tiles wide
  for (const y of [18, 28]) m.rect(0, y, NM_W, 4, '=');
  for (const x of [18, 36, 54]) m.rect(x, 0, 4, NM_H, '=');
  const buildings = TOWERS.map(([x, y, w, h, storeys, name, wall, glass], i) => {
    m.rect(x, y, w, h, 'B');
    return { id: `nm_t${i}`, name, mapLabel: name, x, y, w, h, tower: storeys, storeys: Math.round(storeys / 2.6), wall, trim: '#14141c', glass, sign: name.toUpperCase().split(' ')[0] }; // (`storeys` sets its 3D height: tall enough to rise through every level)
  });
  // low arcades along the avenues (shops at street level, roofs under the deck)
  const arcade = [[1, 15, 15, 2, 'Night Market', '#3b2d22'], [40, 15, 13, 2, 'Arcade Row', '#2a2238'], [1, 24, 15, 3, 'Noodle Steps', '#402a20'], [40, 24, 13, 3, 'Chrome Alley', '#22303a'], [58, 24, 12, 3, 'The Underpass Clinic', '#2f2f2f']];
  for (const [x, y, w, h, name, wall] of arcade) { m.rect(x, y, w, h, 'B'); buildings.push({ id: `nm_a_${x}_${y}`, name, mapLabel: name, x, y, w, h, wall, trim: '#151520', flatRoof: true, sign: name.toUpperCase() }); }
  const props = [];
  let n = 0; const P = (type, x, y, o = {}) => props.push({ id: `nm_s_${type}_${n++}`, type, x, y, w: o.w || 1, h: o.h || 1, ...o });
  for (const x of [2, 10, 26, 32, 40, 48, 60, 66]) { P('streetlamp', x, 17); P('streetlamp', x, 27); }
  for (const [x, y] of [[23, 22], [41, 22], [59, 22], [23, 32], [41, 32], [59, 32]]) P('trafficlight', x, y);
  for (const [x, y] of [[4, 22], [30, 33], [50, 17], [64, 33]]) P('bench', x, y);
  P('stairs', 35, 24, { examine: 'The public stair tower up to the Skyway. Its steps are worn into dips by a million commuters.' });
  for (const [x, y] of [[3, 14], [12, 23], [46, 23], [62, 14]]) P('trash', x, y);
  return {
    id: 'neumina_street', name: 'Neumina — Street Level', kind: 'outdoor', megacity: true, abroad: 'neumina', level: 1, music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city',
    tiles: m.rows(), buildings, props,
    areas: [{ id: 'area_nm_street', name: 'Neumina, Street Level', x: 0, y: 0, w: NM_W, h: NM_H }],
    doors: [{ id: 'door_nm_up', x: 36, y: 25, keepTile: true, label: 'The stair tower up to the Skyway', to: { map: 'neumina_skyway', spot: 'stairs' } }],
    spots: { arrive: { x: 38, y: 23, facing: 'down' }, stairs: { x: 37, y: 26, facing: 'down' } },
  };
}

function skyway() {
  const m = new MapBuilder(NM_W, NM_H, 'O');
  // the decks round each tower's shaft (the shaft itself is 'B': the street's tower rises through), then bridges between them
  for (const [x, y, w, h] of TOWERS) { m.rect(x - 2, y - 2, w + 4, h + 4, 'n'); m.rect(x, y, w, h, 'B'); }
  m.rect(30, 22, 14, 10, 'm'); m.rect(31, 23, 12, 8, 'n'); m.rect(34, 25, 6, 4, 'm'); // the central plaza over the avenue crossing: plating with a stone court
  const bridge = (x, y, w, h) => m.rect(x, y, w, h, 'n');
  bridge(16, 9, 4, 3); bridge(31, 8, 10, 3); bridge(54, 8, 2, 3); bridge(9, 16, 3, 16); bridge(25, 16, 3, 18); bridge(46, 15, 3, 18); bridge(61, 16, 3, 16);
  bridge(17, 38, 5, 3); bridge(34, 39, 8, 3); bridge(53, 38, 3, 3); bridge(28, 24, 2, 3); bridge(44, 26, 2, 3); bridge(30, 32, 3, 2); bridge(36, 13, 3, 9);
  const buildings = [ // kiosks and a transit hall on the decks
    { id: 'nm_k_kiosk_a', name: 'Static Noodles', mapLabel: 'Static Noodles', x: 2, y: 16, w: 3, h: 3, wall: '#2b1f33', trim: '#ff4fb8', flatRoof: true, sign: 'NOODLES' },
    { id: 'nm_k_transit', name: 'Skyway Transit Hall', mapLabel: 'Skyway Transit Hall', x: 32, y: 3, w: 8, h: 4, wall: '#1f2a36', trim: '#3ad8ff', flatRoof: true, sign: 'TRANSIT' },
  ];
  m.rect(1, 15, 5, 5, 'n'); m.rect(2, 16, 3, 3, 'B'); bridge(5, 17, 2, 2); m.rect(31, 2, 10, 6, 'n'); m.rect(32, 3, 8, 4, 'B');
  const props = [];
  let n = 0; const P = (type, x, y, o = {}) => props.push({ id: `nm_k_${type}_${n++}`, type, x, y, w: o.w || 1, h: o.h || 1, ...o });
  for (const [x, y] of [[31, 23], [42, 23], [31, 30], [42, 30], [9, 18], [26, 20], [47, 20], [62, 20], [35, 40], [40, 40]]) P('streetlamp', x, y);
  for (const [x, y] of [[33, 26], [39, 26], [33, 28], [39, 28]]) P('bench', x, y);
  P('fountain', 35, 26, { w: 2, h: 2 });
  P('stairs', 35, 30, { examine: 'The public stair tower down to the Street Level.' }); P('lift', 43, 23, { examine: 'A glass lift to the Terraces. A sign: RESIDENTS AND GUESTS. A smaller sign: WE CAN SEE YOU.' });
  return {
    id: 'neumina_skyway', name: 'Neumina — The Skyway', kind: 'outdoor', megacity: true, abroad: 'neumina', level: 2, below: { map: 'neumina_street', drop: SKY_DROP, lip: '#262838', glow: '#3ad8ff' },
    music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city', tiles: m.rows(), buildings, props,
    areas: [{ id: 'area_nm_skyway', name: 'Neumina, the Skyway', x: 0, y: 0, w: NM_W, h: NM_H }],
    doors: [{ id: 'door_nm_down', x: 36, y: 31, keepTile: true, label: 'The stair tower down to the Street Level', to: { map: 'neumina_street', spot: 'stairs' } },
      { id: 'door_nm_lift_up', x: 43, y: 24, keepTile: true, label: 'The lift up to the Terraces', to: { map: 'neumina_terrace', spot: 'lift' } }],
    spots: { arrive: { x: 37, y: 27, facing: 'down' }, stairs: { x: 37, y: 30, facing: 'up' }, lift: { x: 42, y: 24, facing: 'left' }, bridge: { x: 26, y: 26, facing: 'down' } },
  };
}

/** Level 3, the Terraces: the rich live up here, on gardens and terraces round the towers' upper floors, looking down through two levels. */
function terrace() {
  const m = new MapBuilder(NM_W, NM_H, 'O');
  for (const [x, y, w, h] of TOWERS) m.rect(x, y, w, h, 'B');
  // three terraces: the Halcyne garden (north-west), the Vantor terrace (north-east), the Synth Court promenade (south), joined by two long bridges
  m.rect(3, 3, 26, 13, 'm'); for (const [x, y, w, h] of TOWERS.slice(0, 2)) m.rect(x, y, w, h, 'B'); m.rect(15, 5, 6, 8, '.');
  m.rect(40, 3, 30, 12, 'm'); for (const [x, y, w, h] of TOWERS.slice(2, 4)) m.rect(x, y, w, h, 'B'); m.rect(53, 4, 4, 9, '.');
  m.rect(36, 33, 34, 13, 'm'); for (const [x, y, w, h] of TOWERS.slice(6, 8)) m.rect(x, y, w, h, 'B'); m.rect(52, 36, 5, 8, '.');
  m.rect(29, 8, 11, 3, 'n'); m.rect(41, 15, 3, 18, 'n'); m.rect(41, 21, 5, 7, 'n'); m.rect(42, 22, 3, 5, 'n');
  const buildings = [
    { id: 'nm_r_villa_a', name: 'The Halcyne Garden Pavilion', mapLabel: 'Garden Pavilion', x: 16, y: 12, w: 5, h: 3, wall: '#e8e2d4', trim: '#c9a43a', flatRoof: true, sign: 'PAVILION' },
    { id: 'nm_r_club', name: 'The Aurum Club', mapLabel: 'The Aurum Club', x: 59, y: 42, w: 7, h: 3, wall: '#efe9dc', trim: '#c9a43a', flatRoof: true, sign: 'AURUM' },
  ];
  for (const b of buildings) m.rect(b.x, b.y, b.w, b.h, 'B');
  const props = [];
  let n = 0; const P = (type, x, y, o = {}) => props.push({ id: `nm_r_${type}_${n++}`, type, x, y, w: o.w || 1, h: o.h || 1, ...o });
  for (const [x, y] of [[16, 6], [18, 9], [16, 10], [54, 5], [55, 9], [53, 11], [53, 37], [55, 41]]) P('tree', x, y);
  for (const [x, y] of [[4, 4], [20, 4], [41, 4], [67, 4], [38, 35], [67, 35], [43, 18], [43, 30]]) P('streetlamp', x, y);
  for (const [x, y] of [[8, 14], [11, 14], [46, 14], [49, 14], [40, 44], [42, 44]]) P('bench', x, y);
  P('lift', 45, 23, { examine: 'The glass lift down to the Skyway.' });
  return {
    id: 'neumina_terrace', name: 'Neumina — The Terraces', kind: 'outdoor', megacity: true, abroad: 'neumina', level: 3, below: { map: 'neumina_skyway', drop: TERRACE_DROP, lip: '#d8d2c4', glow: '#ffd27a' },
    music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city', tiles: m.rows(), buildings, props,
    areas: [{ id: 'area_nm_terrace', name: 'Neumina, the Terraces', x: 0, y: 0, w: NM_W, h: NM_H }],
    doors: [{ id: 'door_nm_lift_down', x: 44, y: 23, keepTile: true, label: 'The lift down to the Skyway', to: { map: 'neumina_skyway', spot: 'lift' } }],
    spots: { arrive: { x: 43, y: 25, facing: 'down' }, lift: { x: 43, y: 24, facing: 'down' }, garden: { x: 18, y: 7, facing: 'down' }, bridge: { x: 42, y: 19, facing: 'down' } },
  };
}

export default [street(), skyway(), terrace()];
