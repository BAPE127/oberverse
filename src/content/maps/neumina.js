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
    return { id: `nm_t${i}`, name, mapLabel: name, x, y, w, h, tower: storeys, neo: true, storeys: Math.round(storeys / 2.6), wall, trim: '#14141c', glass, sign: name.toUpperCase().split(' ')[0] }; // (`storeys` sets its 3D height: tall enough to rise through every level)
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
  P('lift', 25, 24, { examine: 'The Chain Lift: a freight cage down to the Sump. A sign: NO REFUNDS. NO RETURNS. NO QUESTIONS.' });
  for (const [x, y] of [[3, 14], [12, 23], [46, 23], [62, 14]]) P('trash', x, y);
  return {
    id: 'neumina_street', name: 'Neumina — The Gutterline', kind: 'outdoor', megacity: true, atmos: { skyline: true }, abroad: 'neumina', level: 2, music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city',
    tiles: m.rows(), buildings, props,
    areas: [{ id: 'area_nm_street', name: 'Neumina, the Gutterline', x: 0, y: 0, w: NM_W, h: NM_H }],
    doors: [{ id: 'door_nm_up', x: 36, y: 25, keepTile: true, label: 'The stair tower up to the Skyway', to: { map: 'neumina_skyway', spot: 'stairs' } },
      { id: 'door_nm_chain_down', x: 25, y: 25, keepTile: true, label: 'The Chain Lift down to the Sump', to: { map: 'neumina_sump', spot: 'chain' } }],
    spots: { arrive: { x: 38, y: 23, facing: 'down' }, stairs: { x: 37, y: 26, facing: 'down' }, chain: { x: 24, y: 25, facing: 'down' } },
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
    id: 'neumina_skyway', name: 'Neumina — The Skyway', kind: 'outdoor', megacity: true, abroad: 'neumina', level: 3, below: { map: 'neumina_street', drop: SKY_DROP, lip: '#262838', glow: '#3ad8ff' },
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
  P('lift', 39, 38, { examine: 'The Crown lift: gold doors, and a man beside them whose whole job is to look at you.' });
  return {
    id: 'neumina_terrace', name: 'Neumina — The Terraces', kind: 'outdoor', megacity: true, abroad: 'neumina', level: 4, below: { map: 'neumina_skyway', drop: TERRACE_DROP, lip: '#d8d2c4', glow: '#ffd27a' },
    music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city', tiles: m.rows(), buildings, props,
    areas: [{ id: 'area_nm_terrace', name: 'Neumina, the Terraces', x: 0, y: 0, w: NM_W, h: NM_H }],
    doors: [{ id: 'door_nm_lift_down', x: 44, y: 23, keepTile: true, label: 'The lift down to the Skyway', to: { map: 'neumina_skyway', spot: 'lift' } },
      { id: 'door_nm_crown_up', x: 39, y: 39, keepTile: true, label: 'The Crown lift up to the Crown', to: { map: 'neumina_crown', spot: 'gate' } }],
    spots: { arrive: { x: 43, y: 25, facing: 'down' }, lift: { x: 43, y: 24, facing: 'down' }, garden: { x: 18, y: 7, facing: 'down' }, bridge: { x: 42, y: 19, facing: 'down' }, crown: { x: 38, y: 39, facing: 'down' } },
  };
}

/** Level 1, the Sump: the bottom of the city, where the towers' foundations stand in the wet and the people nobody counts have built a town
 * of sheet metal between them. No daylight reaches it (`atmos.dark`). Landmarks: the Drain Cathedral, the Scrap Bazaar, the Pit, Mother
 * Kettle's, and the Chain Lift up to the Gutterline. Tall things stand to the north and west, low things to the south and east (the camera
 * looks from the south-east). */
function sump() {
  const W = 60; const H = 46;
  const m = new MapBuilder(W, H, 'q');
  const buildings = [];
  // the foundations: piers of the towers above, squatted, their lit windows amber
  const piers = [[1, 1, 8, 7, 'Pier Nine'], [13, 1, 7, 5, 'Pier Ten'], [27, 1, 9, 5, 'Pier Eleven'], [43, 1, 7, 6, 'Pier Twelve'], [1, 13, 6, 8, 'Pier Fourteen']];
  for (const [x, y, w, h, name] of piers) { m.rect(x, y, w, h, 'B'); buildings.push({ id: `nm_u_pier_${x}_${y}`, name, mapLabel: name, x, y, w, h, tower: 30, pier: true, storeys: 12, wall: '#2c2925', trim: '#1a1816', glass: '#ffb866' }); }
  // the Drain Cathedral: an old pump hall the squatters made a church of
  m.rect(20, 11, 13, 7, 'B'); buildings.push({ id: 'nm_u_cathedral', name: 'The Drain Cathedral', mapLabel: 'The Drain Cathedral', x: 20, y: 11, w: 13, h: 7, wall: '#4a4038', trim: '#2a241e', columns: true, storeys: 3, sign: 'ST. RUNOFF' });
  // the shanties: sheet metal and salvage, in clusters along the alleys
  const shanty = [[10, 9, 4, 3, '#6b4a34'], [14, 9, 3, 3, '#3f5a58'], [36, 9, 4, 3, '#6a5a3a'], [40, 9, 3, 3, '#5a3a3a'], [51, 9, 4, 3, '#3a4a5a'], [9, 16, 3, 3, '#5a4a3a'],
    [9, 22, 4, 3, '#4a5a3a'], [14, 22, 3, 3, '#6b4a34'], [36, 13, 3, 3, '#3f5a58'], [52, 14, 4, 3, '#5a3a3a'], [53, 19, 3, 3, '#6a5a3a'], [18, 22, 4, 2, '#3a4a5a'],
    [2, 25, 4, 3, '#5a3a3a'], [47, 30, 3, 2, '#4a5a3a'], [52, 30, 4, 2, '#6b4a34']];
  shanty.forEach(([x, y, w, h, wall], i) => { m.rect(x, y, w, h, 'B'); buildings.push({ id: `nm_u_shack_${i}`, name: 'A shack', x, y, w, h, wall, shabby: true, storeys: 1 + (i % 2), ...(i % 3 !== 2 ? { neonTrim: ['#ff3fb4', '#4dfcff', '#5dff9c', '#ffb347', '#b06bff'][i % 5] } : {}) }); });
  // Mother Kettle's soup kitchen
  m.rect(26, 22, 6, 3, 'B'); buildings.push({ id: 'nm_u_kettle', name: "Mother Kettle's", mapLabel: "Mother Kettle's", x: 26, y: 22, w: 6, h: 3, wall: '#7a5a3a', shabby: true, storeys: 1, sign: 'SOUP', neonTrim: '#ffb347' });
  // the run-off channel along the south, two plank bridges over it
  m.rect(0, 38, W, 3, '~'); m.rect(12, 38, 3, 3, 'p'); m.rect(40, 38, 3, 3, 'p'); m.rect(0, 41, W, 5, 'u');
  const props = [];
  let n = 0; const P = (type, x, y, o = {}) => props.push({ id: `nm_u_${type}_${n++}`, type, x, y, w: o.w || 1, h: o.h || 1, ...o });
  // the Scrap Bazaar: tents and salvage round a fire
  for (const [x, y, c] of [[37, 19, '#4dfcff'], [41, 19, '#ff3fb4'], [45, 19, '#5dff9c'], [37, 24, '#ffb347'], [45, 24, '#b06bff']]) P('market_stall_neo', x, y, { w: 2, color: c, examine: 'A stall of salvage: chips pulled from dead drones, cables sold by the arm-length, and a box marked PROBABLY FINE.' });
  P('holo_ad', 42, 19, { color: '#ff5fd6', examine: 'A stolen hologram projector, still showing the advert it was stolen with: a perfume called ALTITUDE, for people who will never smell it.' });
  P('data_pylon', 35, 24, { examine: 'A city access node somebody has opened like a tin. Twelve cables run out of it to twelve different shacks.' });
  P('vend_neo', 49, 20, { examine: 'A vending machine hauled down from the Skyway. It sells only one thing now, and the label has been scratched off.' });
  P('barrelfire', 42, 22); for (const [x, y] of [[40, 22], [44, 22], [42, 21]]) P('crate', x, y);
  for (const [x, y] of [[39, 27], [48, 21], [35, 21]]) P('barrel', x, y);
  P('laundry', 36, 17, { w: 3 }); P('laundry', 47, 17, { w: 3 });
  P('neon_sign', 49, 23, { color: '#ff5f5f', examine: 'BAZAAR, in tubes salvaged from three different signs. The Z is an N lying down.' });
  // the Pit: a ring of chain fence where people fight for money and once, by accident, for a goat
  for (let x = 4; x <= 10; x++) { P('chainfence', x, 30); P('chainfence', x, 35); } for (let y = 31; y <= 34; y++) { P('chainfence', 4, y); P('chainfence', 10, y); }
  P('barrelfire', 3, 29); P('barrelfire', 11, 36);
  // the streets of the Sump: fires, rubbish, a few lamps that work
  for (const [x, y] of [[18, 19], [33, 20], [24, 30], [50, 26], [8, 13]]) P('barrelfire', x, y);
  for (const [x, y] of [[16, 26], [31, 9], [56, 26], [21, 34]]) P('dumpster', x, y, { w: 2 });
  for (const [x, y] of [[12, 20], [34, 28], [26, 35], [55, 34]]) P('rubble', x, y);
  for (const [x, y] of [[16, 13], [34, 16], [22, 27], [48, 13]]) P('streetlamp', x, y);
  for (const [x, y] of [[27, 26], [30, 26]]) P('bench', x, y);
  P('vent_stack', 19, 9); P('vent_stack', 41, 13); P('vent_stack', 6, 22);
  // salvage neon and second-hand tech everywhere: signs on poles, scavenger drones, grow-light fungus farms, a hologram preacher at the Cathedral
  for (const [x, y, c] of [[19, 12, '#4dfcff'], [34, 12, '#ff3fb4'], [8, 18, '#5dff9c'], [24, 21, '#ffb347'], [52, 27, '#b06bff'], [13, 26, '#ff5f5f'], [46, 33, '#4dfcff']]) P('neon_sign', x, y, { color: c });
  P('drone_pad', 50, 34, { w: 2, h: 2, examine: 'A scavenger drone\'s nest: it goes up the shafts at night and comes back with whatever fell off the Skyway.' });
  for (const [x, y] of [[33, 33], [17, 30]]) P('glow_planter', x, y, { w: 2, examine: 'Fungus under a grow light. Down here it is food, medicine, and on Thursdays, something else.' });
  P('holo_ad', 23, 19, { color: '#ffe2a0', examine: 'A hologram saint above the Cathedral door, patched together from a bank\'s advert. She still says "Your trust, compounded" now and then.' });
  P('neon_lamp', 37, 30, { color: '#ff9f5f' }); P('neon_lamp', 12, 34, { color: '#9fdcff' });
  P('security_camera', 27, 30, { examine: 'A Gutterline camera, pointed down at the Chain Lift. Someone has taped a picture of an eye over the lens.' });
  // the Chain Lift: a freight cage up to the Gutterline
  P('lift', 29, 31, { examine: 'The Chain Lift: a freight cage on a chain as thick as your leg. It goes up to the Gutterline, and complains the whole way.' });
  P('sign', 31, 31, { text: 'CHAIN LIFT - UP', color: '#d8b02a' });
  for (const x of [27, 28, 30, 31]) P('chainfence', x, 33);
  return {
    id: 'neumina_sump', name: 'Neumina — The Sump', kind: 'outdoor', megacity: true, abroad: 'neumina', level: 1,
    atmos: { dark: [0.78, 1], bg: '#0a0807', sludge: true }, edges: { lip: '#2a2622', glow: '#d8902a' },
    music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city', tiles: m.rows(), buildings, props,
    areas: [{ id: 'area_nm_sump', name: 'Neumina, the Sump', x: 0, y: 0, w: W, h: H }],
    doors: [{ id: 'door_nm_chain_up', x: 29, y: 32, keepTile: true, label: 'The Chain Lift up to the Gutterline', to: { map: 'neumina_street', spot: 'chain' } }],
    spots: { arrive: { x: 29, y: 29, facing: 'down' }, chain: { x: 29, y: 29, facing: 'down' }, bazaar: { x: 42, y: 25, facing: 'down' }, cathedral: { x: 26, y: 19, facing: 'up' }, pit: { x: 7, y: 32, facing: 'down' } },
  };
}

/** Level 5, the Crown: above the clouds. White stone platforms over a sea of cloud (its drops show cloud, not the city), towers of glass and
 * gold, and the sun always out (`atmos.dark`). Landmarks: the Spire (where the gala is held), the Mirror Pools, the Sky Garden, the Yacht
 * Pads, the Crown Gate (the private lift down to the Terraces). */
function crown() {
  const W = 60; const H = 46;
  const m = new MapBuilder(W, H, 'O');
  const buildings = [];
  const towers = [[4, 3, 10, 10, 60, 'The Spire'], [20, 2, 8, 7, 44, 'The Aurelian Residences'], [36, 3, 9, 8, 50, 'Celestine House'], [50, 6, 7, 7, 38, 'The Halo Observatory']];
  for (const [x, y, w, h, storeys, name] of towers) { m.rect(x - 2, y - 2, w + 4, h + 4, 'Q'); }
  // the platforms: the Spire plaza (north-west), the Mirror Pools (west), the Sky Garden (centre), the Yacht Pads (east), the Crown Gate (south)
  m.rect(2, 14, 18, 12, 'Q'); m.rect(4, 17, 5, 3, '~'); m.rect(11, 17, 5, 3, '~'); m.rect(4, 22, 12, 2, '~');
  m.rect(22, 14, 16, 13, 'Q'); m.rect(25, 16, 10, 8, '.');
  m.rect(42, 18, 15, 12, 'Q');
  m.rect(24, 34, 12, 8, 'Q');
  // the bridges (marble walks over the cloud)
  m.rect(9, 12, 3, 3, 'Q'); m.rect(20, 18, 2, 3, 'Q'); m.rect(38, 21, 4, 3, 'Q'); m.rect(29, 27, 3, 7, 'Q'); m.rect(26, 9, 3, 5, 'Q'); m.rect(42, 11, 3, 7, 'Q'); m.rect(46, 8, 3, 3, 'Q'); m.rect(52, 14, 3, 5, 'Q');
  for (const [x, y, w, h, storeys, name] of towers) { m.rect(x, y, w, h, 'B'); buildings.push({ id: `nm_c_${name.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '')}`, name, mapLabel: name, x, y, w, h, tower: storeys, crown: true, storeys: Math.round(storeys / 2.6), wall: '#eeeae2', trim: '#c9a43a', glass: '#9fd4ff', sign: name.toUpperCase().replace('THE ', '') }); }
  const pav = { id: 'nm_c_pavilion', name: 'The Gate Pavilion', mapLabel: 'The Crown Gate', x: 27, y: 39, w: 6, h: 2, wall: '#f4f0e6', trim: '#c9a43a', columns: true, storeys: 1, sign: 'CROWN GATE' };
  m.rect(pav.x, pav.y, pav.w, pav.h, 'B'); buildings.push(pav);
  const props = [];
  let n = 0; const P = (type, x, y, o = {}) => props.push({ id: `nm_c_${type}_${n++}`, type, x, y, w: o.w || 1, h: o.h || 1, ...o });
  // the Mirror Pools
  P('fountain', 9, 20, { w: 2, h: 2 }); P('statue', 3, 15); P('statue', 17, 15);
  for (const [x, y] of [[4, 25], [8, 25], [12, 25], [16, 25]]) P('bench', x, y);
  // the Sky Garden
  for (const [x, y] of [[26, 17], [33, 17], [26, 22], [33, 22], [29, 19]]) P('tree', x, y);
  for (const [x, y] of [[23, 15], [35, 15], [23, 25], [35, 25]]) P('glow_planter', x, y, { w: 2 });
  for (const [x, y] of [[28, 24], [31, 24]]) P('bench', x, y);
  // the Yacht Pads
  for (const [x, y] of [[44, 20], [48, 20], [52, 20], [46, 25], [51, 25]]) P('drone_pad', x, y, { w: 2, h: 2 });
  P('holo_ad', 55, 28, { color: '#ffe2a0', examine: 'A hologram of a yacht, turning slowly, for those who already own one and might want another.' });
  // lamps: slim gold-white ones everywhere a guest might walk
  for (const [x, y] of [[2, 14], [19, 14], [22, 14], [37, 14], [42, 18], [56, 18], [24, 34], [35, 34], [15, 12], [43, 12]]) P('neon_lamp', x, y, { color: '#ffe9b8' });
  for (const [x, y] of [[24, 36], [35, 36]]) P('security_camera', x, y);
  // the Crown Gate: the private lift down to the Terraces, and benches at the rail to look at the clouds
  P('lift', 30, 37, { examine: 'The Crown lift. No buttons inside: it knows where you are allowed to go.' });
  for (const [x, y] of [[25, 41], [34, 41]]) P('bench', x, y);
  return {
    id: 'neumina_crown', name: 'Neumina — The Crown', kind: 'outdoor', megacity: true, abroad: 'neumina', level: 5,
    atmos: { dark: [0, 0.06], bg: '#8fb8e0', clouds: true }, edges: { lip: '#e8e2d4', glow: '#ffd27a' },
    music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city', tiles: m.rows(), buildings, props,
    areas: [{ id: 'area_nm_crown', name: 'Neumina, the Crown', x: 0, y: 0, w: W, h: H }],
    doors: [{ id: 'door_nm_crown_down', x: 30, y: 38, keepTile: true, label: 'The Crown lift down to the Terraces', to: { map: 'neumina_terrace', spot: 'crown' } }],
    spots: { arrive: { x: 30, y: 35, facing: 'up' }, gate: { x: 30, y: 35, facing: 'up' }, spire: { x: 9, y: 15, facing: 'up' }, pools: { x: 10, y: 24, facing: 'up' }, garden: { x: 30, y: 20, facing: 'down' }, pads: { x: 49, y: 23, facing: 'down' } },
  };
}

export default [sump(), street(), skyway(), terrace(), crown()];
