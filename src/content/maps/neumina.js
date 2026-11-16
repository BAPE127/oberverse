// Neumina (v0.107.0; owner's brief of 2026-11-16): the Windfen League's megacity, a city in five levels, each its own flat map with its own class,
// light and landmarks (docs/SPECIAL_OPERATIONS.md section 1):
//   neumina_sump      Level 1, the Sump: the wet foundations, a town of salvage neon between the piers; always dark
//   neumina_street    Level 2, the Gutterline: the working poor's neon street, in the towers' shadow; the Hundred Lanterns night market, the Station, perpetual dusk
//   neumina_skyway    Level 3, the Skyway: the salaried middle; clean steel decks and bridges between the towers, lobbies, the precinct, seven tiles up
//   neumina_terrace   Level 4, the Terraces: the comfortable rich; stone and gardens round the towers' upper floors, galleries and private clubs, seven tiles higher
//   neumina_crown     Level 5, the Crown: white and gold above the clouds; the sun is always out
// The towers stand on the Gutterline and rise through every level above it (their shafts are 'B' on the middle three). The Skyway and the Terraces
// have open drops ('O') through which the level below shows (src/engine3d/world3d.js, `def.below`). The rules never stack the levels; stairs and
// lifts join them as ordinary doors. Final coordinates; no growth, no generated interiors yet. Preview: `npm run map -- neumina_skyway`.
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

const NEO = ['#ff3fb4', '#4dfcff', '#5dff9c', '#ffb347', '#b06bff', '#ff5f5f'];

/** Level 2, the Gutterline: the working poor's street under the towers. Dense, loud and lit, in perpetual dusk. Landmarks: the Hundred Lanterns
 * night market, the Gutterline Station, Chrome Alley, the Underpass Clinic, noodle bars and pawn shops. The stair tower up to the Skyway stands
 * at the market's east end, the Chain Lift down to the Sump at its west end. */
function street() {
  const m = new MapBuilder(NM_W, NM_H, ',');
  // avenues: two east-west, three north-south, four tiles wide
  for (const y of [18, 28]) m.rect(0, y, NM_W, 4, '=');
  for (const x of [18, 36, 54]) m.rect(x, 0, 4, NM_H, '=');
  m.rect(22, 22, 14, 6, 'g'); // the market floor: poured concrete, stained by a hundred stalls
  const buildings = TOWERS.map(([x, y, w, h, storeys, name, wall, glass], i) => {
    m.rect(x, y, w, h, 'B');
    return { id: `nm_t${i}`, name, mapLabel: name, x, y, w, h, tower: storeys, neo: true, storeys: Math.round(storeys / 2.6), wall, trim: '#14141c', glass, sign: name.toUpperCase().split(' ')[0] }; // (`storeys` sets its 3D height: tall enough to rise through every level)
  });
  // shops at street level, low, each with a lit roof edge: [x, y, w, h, name, wall, neon, storeys, landmark?]
  const shops = [
    [1, 15, 8, 2, 'The Long Noodle', '#402a20', '#ffb347', 1, true], [10, 15, 7, 2, 'Fixit & Pawn', '#2a3340', '#4dfcff', 1, true],
    [40, 15, 6, 2, 'Skewer Row', '#3a2430', '#ff3fb4', 1], [47, 15, 6, 2, 'Bright Pawn', '#2f3a2f', '#5dff9c', 1],
    [58, 15, 6, 2, 'Rinse & Dry', '#2a2f40', '#b06bff', 1], [65, 15, 5, 2, 'Lucky Gutter Noodles', '#40302a', '#ff5f5f', 1],
    [1, 24, 7, 3, 'The Salt Noodle Bar', '#3a2a22', '#ff5f5f', 2], [9, 24, 7, 3, 'Wire & Pawn', '#26303a', '#4dfcff', 2],
    [27, 22, 6, 2, 'The Hundred Lanterns', '#4a3328', '#ffb347', 2, true],
    [41, 24, 10, 3, 'Chrome Alley', '#241f38', '#ff3fb4', 2, true], [60, 24, 8, 3, 'The Underpass Clinic', '#26363a', '#5dff9c', 2, true],
    [22, 32, 14, 2, 'Gutterline Station', '#222a3a', '#3ad8ff', 2, true],
    [2, 47, 8, 4, 'Kiln Street Repairs', '#33302a', '#ffb347', 2], [11, 47, 6, 4, 'Parts & Pawn', '#2c3038', '#b06bff', 1],
    [23, 47, 10, 4, 'Lantern Dumplings', '#40282a', '#ff9f5f', 2, true], [40, 47, 12, 4, 'Tin Dragon Noodles', '#2a3a3a', '#4dfcff', 2],
    [59, 47, 10, 4, 'Dead Channel Video', '#2d2840', '#ff3fb4', 2],
  ];
  for (const [x, y, w, h, name, wall, neon, storeys, mark] of shops) {
    m.rect(x, y, w, h, 'B');
    buildings.push({ id: `nm_s_${x}_${y}`, name, ...(mark ? { mapLabel: name } : {}), x, y, w, h, wall, trim: '#151520', flatRoof: true, storeys, neonTrim: neon, sign: name.toUpperCase() });
  }
  const props = [];
  let n = 0; const P = (type, x, y, o = {}) => props.push({ id: `nm_s_${type}_${n++}`, type, x, y, w: o.w || 1, h: o.h || 1, ...o });
  // a lit sign on a pole in front of every shop (the row in front is paving), and a lamp at each end of the frontage
  shops.forEach(([x, y, w, h, name], i) => {
    const fy = y < 20 ? y + h : y - 1; // the front row: south of the north strip, north of everything else
    if (name === 'The Hundred Lanterns' || name === 'Gutterline Station') return;
    P('neon_sign', x + 1, fy, { color: NEO[i % NEO.length], examine: `${name.toUpperCase()}, in tubes that flicker in turn so the word seems to walk.` });
    if (w > 6) P('neon_sign', x + w - 2, fy, { color: NEO[(i + 2) % NEO.length] });
  });
  for (const [x, y, c] of [[1, 17, '#ffb347'], [16, 17, '#4dfcff'], [20, 22, '#ff3fb4'], [38, 22, '#5dff9c'], [39, 17, '#ff3fb4'], [53, 17, '#b06bff'], [57, 17, '#4dfcff'], [70, 17, '#ffb347'], [17, 23, '#ff5f5f'], [53, 23, '#5dff9c'], [69, 23, '#ff3fb4']]) P('neon_lamp', x, y, { color: c });
  for (const [x, y, t, c] of [[24, 16, 'FORGET YOUR DEBT - ASK US HOW', '#ff3fb4'], [31, 16, 'SKYWAY FLATS: NOW WITH WINDOWS', '#4dfcff'], [60, 22, 'NOODLES ARE A SAVING', '#ffb347'], [2, 22, 'DRONE INSURANCE FOR YOUR DRONE', '#5dff9c'], [42, 22, 'CHROME ALLEY - OPEN WHEN LIT', '#b06bff'], [12, 45, 'LANTERNS 2 FOR 1 (THE OTHER ONE IS A LIE)', '#ff5f5f'], [46, 45, 'RENT: A FEELING', '#ffb347']]) P('holo_billboard', x, y, { w: 2, text: t, color: c });
  P('holo_ad', 22, 22, { color: '#ff5fd6', examine: 'A hologram of a woman laughing at a salad. It has run for nine years and she has never once eaten any of it.' });
  P('holo_ad', 34, 22, { color: '#4dfcff', examine: 'An advert for a better floor of the city. The picture is a window. The window is a picture.' });
  // the Hundred Lanterns: stalls on both sides of a lane, lit by strings of small lights
  for (const [x, y, c] of [[27, 25, '#ffb347'], [30, 25, '#ff3fb4'], [33, 25, '#4dfcff'], [23, 27, '#5dff9c'], [26, 27, '#b06bff'], [29, 27, '#ff5f5f'], [32, 27, '#ffb347']]) P('market_stall_neo', x, y, { w: 2, color: c });
  for (const [x, y, c] of [[5, 22, '#ff3fb4'], [12, 22, '#ffb347'], [47, 22, '#4dfcff'], [66, 22, '#b06bff']]) P('market_stall_neo', x, y, { w: 2, color: c, examine: 'Street food by the stick: something with a sauce, something with a shell, and a third thing nobody will name.' });
  for (const [x, y] of [[24, 22], [26, 22], [34, 27]]) P('neon_lamp', x, y, { color: '#ffb347' });
  P('vend_neo', 35, 27); P('vend_neo', 17, 25); P('vend_neo', 52, 25, { examine: 'A vending machine with one working button. It dispenses hot tea, or cold tea, depending on its mood.' }); P('vend_neo', 70, 27);
  // the stair tower up to the Skyway: signs, a camera, lamps
  P('sign', 35, 25, { text: 'SKYWAY - UP', color: '#3ad8ff' }); P('security_camera', 35, 23, { examine: 'A Skyway camera, pointed down at the stair tower. Things go up there that are not always let down again.' });
  P('neon_lamp', 35, 26, { color: '#3ad8ff' }); P('neon_sign', 34, 24, { color: '#3ad8ff', examine: 'UP, in cold blue tubes. The only blue on the whole street.' });
  P('stairs', 35, 24, { examine: 'The public stair tower up to the Skyway. Its steps are worn into dips by a million commuters.' });
  // the Chain Lift down to the Sump: a cage, a sign, a camera nobody mends
  P('lift', 25, 24, { examine: 'The Chain Lift: a freight cage down to the Sump. A sign: NO REFUNDS. NO RETURNS. NO QUESTIONS.' });
  P('sign', 25, 23, { text: 'CHAIN LIFT - DOWN', color: '#d8b02a' }); P('barrel', 24, 23); P('crate', 26, 23); P('neon_lamp', 26, 26, { color: '#ff9f5f' }); P('security_camera', 24, 26, { examine: 'A camera aimed at the Chain Lift. Its lens has been painted over, neatly, by someone with a steady hand.' });
  // the Gutterline Station frontage
  for (const [x, y] of [[24, 35], [28, 35], [33, 35]]) P('bench', x, y);
  P('neon_sign', 23, 34, { color: '#3ad8ff', examine: 'GUTTERLINE, with the second T out. Everyone says it right anyway.' }); P('neon_sign', 34, 34, { color: '#3ad8ff' });
  P('holo_billboard', 29, 35, { w: 2, text: 'TRAINS ALMOST ALWAYS', color: '#3ad8ff' });
  P('vend_neo', 31, 35); P('security_camera', 22, 35);
  // clinic and arcade fronts, and the backs of the shops
  P('neon_sign', 63, 23, { color: '#ff5f5f', examine: 'A red cross, a green cross and a hand-lettered card: NO QUESTIONS ABOUT THE PARTS.' }); P('security_camera', 60, 27); P('trash', 62, 27);
  for (const [x, y] of [[44, 27], [47, 27]]) P('bench', x, y);
  for (const [x, y] of [[4, 14], [16, 14], [41, 14], [48, 14], [63, 14], [68, 14], [8, 27], [16, 27]]) P('vent_stack', x, y);
  for (const [x, y] of [[3, 14], [12, 27], [46, 14], [51, 27], [66, 14], [71, 27], [19, 46], [39, 46], [53, 46], [58, 46]]) P(['trash', 'crate', 'barrel'][(x + y) % 3], x, y);
  for (const [x, y] of [[25, 17], [47, 17], [63, 17], [10, 46], [34, 46], [71, 46]]) P('security_camera', x, y);
  for (const [x, y] of [[8, 22], [34, 37], [50, 17], [64, 33]]) P('bench', x, y);
  for (const [x, y] of [[5, 46], [27, 46], [44, 46], [62, 46]]) P('market_stall_neo', x, y, { w: 2, color: NEO[(x + y) % NEO.length], examine: 'A cart of dumplings, steaming like a small volcano. The queue is the only advertisement it has ever needed.' });
  return {
    id: 'neumina_street', name: 'Neumina — The Gutterline', kind: 'outdoor', megacity: true, atmos: { skyline: true, dark: [0.55, 1], bg: '#0d0b1c' }, capTowers: SKY_DROP, abroad: 'neumina', level: 2, music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city',
    tiles: m.rows(), buildings, props,
    areas: [{ id: 'area_nm_street', name: 'Neumina, the Gutterline', x: 0, y: 0, w: NM_W, h: NM_H }],
    doors: [{ id: 'door_nm_up', x: 36, y: 25, keepTile: true, label: 'The stair tower up to the Skyway', to: { map: 'neumina_skyway', spot: 'stairs' } },
      { id: 'door_nm_chain_down', x: 25, y: 25, keepTile: true, label: 'The Chain Lift down to the Sump', to: { map: 'neumina_sump', spot: 'chain' } }],
    spots: { arrive: { x: 38, y: 23, facing: 'down' }, stairs: { x: 37, y: 26, facing: 'down' }, chain: { x: 24, y: 25, facing: 'down' }, market: { x: 30, y: 24, facing: 'down' }, arcade: { x: 45, y: 28, facing: 'up' }, clinic: { x: 64, y: 28, facing: 'up' }, station: { x: 29, y: 34, facing: 'up' } },
  };
}

/** Level 3, the Skyway: the salaried middle. Clean steel decks and bridges between the towers, corporate lobbies, transit, and a camera on
 * every corner (it is a watched level). Landmarks: the Skyway Transit Hall, the Orrel Data Exchange lobby, the Skyway Precinct, the Plaza
 * with its fountain, the Commuter Court. The stair tower down to the Gutterline is on the Plaza's south edge, the glass lift up to the
 * Terraces on its east. */
function skyway() {
  const m = new MapBuilder(NM_W, NM_H, 'O');
  // the decks round each tower's shaft (the shaft itself is 'B': the street's tower rises through), then bridges between them
  for (const [x, y, w, h] of TOWERS) { m.rect(x - 2, y - 2, w + 4, h + 4, 'n'); m.rect(x, y, w, h, 'B'); }
  m.rect(30, 22, 14, 10, 'n'); m.rect(33, 24, 8, 6, 'm'); // the Plaza over the avenue crossing: plating with a stone court
  m.rect(19, 14, 13, 6, 'n'); // the Orrel forecourt
  m.rect(32, 37, 12, 7, 'n'); // the Commuter Court deck
  const bridge = (x, y, w, h) => m.rect(x, y, w, h, 'n');
  bridge(16, 9, 4, 3); bridge(31, 8, 10, 3); bridge(54, 8, 2, 3); bridge(9, 16, 3, 16); bridge(25, 16, 3, 18); bridge(46, 15, 3, 18); bridge(61, 16, 3, 16);
  bridge(17, 38, 5, 3); bridge(53, 38, 3, 3); bridge(28, 24, 2, 3); bridge(44, 26, 2, 3); bridge(30, 32, 3, 2); bridge(36, 8, 3, 14);
  const buildings = [
    { id: 'nm_k_kiosk_a', name: 'Static Noodles', mapLabel: 'Static Noodles', x: 2, y: 16, w: 3, h: 3, wall: '#2b1f33', trim: '#ff4fb8', flatRoof: true, sign: 'NOODLES' },
    { id: 'nm_k_transit', name: 'Skyway Transit Hall', mapLabel: 'Skyway Transit Hall', x: 32, y: 3, w: 8, h: 4, wall: '#1f2a36', trim: '#3ad8ff', flatRoof: true, sign: 'TRANSIT' },
    { id: 'nm_k_orrel', name: 'Orrel Data Exchange, Public Lobby', mapLabel: 'Orrel Data Exchange', x: 22, y: 15, w: 7, h: 2, wall: '#3a3048', trim: '#ff4fb8', flatRoof: true, storeys: 2, sign: 'ORREL' },
    { id: 'nm_k_precinct', name: 'Skyway Precinct', mapLabel: 'Skyway Precinct', x: 31, y: 22, w: 5, h: 2, wall: '#27395a', trim: '#3a7bff', flatRoof: true, storeys: 2, neonTrim: '#3a7bff', sign: 'PRECINCT' },
    { id: 'nm_k_kessin', name: 'Kessin Arcology Concourse', mapLabel: 'Kessin Concourse', x: 59, y: 14, w: 5, h: 2, wall: '#4a3a34', trim: '#ffb347', flatRoof: true, sign: 'KESSIN' },
    { id: 'nm_k_vantor', name: 'Vantor Biotic Reception', x: 45, y: 13, w: 5, h: 2, wall: '#2a4a4a', trim: '#4dffc3', flatRoof: true, sign: 'VANTOR' },
    { id: 'nm_k_court', name: 'The Commuter Court', mapLabel: 'The Commuter Court', x: 35, y: 38, w: 6, h: 2, wall: '#2f3b4a', trim: '#ffb347', flatRoof: true, neonTrim: '#ffb347', sign: 'FOOD COURT' },
  ];
  m.rect(1, 15, 5, 5, 'n'); m.rect(5, 17, 2, 2, 'n'); m.rect(31, 2, 10, 6, 'n');
  for (const b of buildings) m.rect(b.x, b.y, b.w, b.h, 'B');
  const props = [];
  let n = 0; const P = (type, x, y, o = {}) => props.push({ id: `nm_k_${type}_${n++}`, type, x, y, w: o.w || 1, h: o.h || 1, ...o });
  // lamps along the walks, cold and even
  for (const [x, y] of [[31, 25], [42, 22], [30, 30], [42, 30], [9, 18], [11, 24], [25, 20], [27, 28], [47, 20], [48, 28], [61, 20], [63, 28], [35, 10], [39, 10], [19, 38], [54, 38], [34, 43], [42, 43], [20, 12], [30, 12], [44, 4], [53, 4]]) P('neon_lamp', x, y, { color: '#9fdcff' });
  // the Plaza: fountain, benches, planters, the arrival board
  P('fountain', 35, 26, { w: 2, h: 2 });
  for (const [x, y] of [[33, 25], [33, 28], [40, 25], [40, 28], [38, 24]]) P('bench', x, y);
  for (const [x, y] of [[34, 29], [38, 29]]) P('glow_planter', x, y, { w: 2 });
  P('data_pylon', 34, 24, { examine: 'The Plaza board: departures, delays, a weather forecast for a level with no weather, and a notice about the fountain.' });
  P('transit_shelter', 39, 22, { w: 3 }); P('transit_shelter', 31, 30, { w: 3 });
  for (const [x, y] of [[30, 22], [43, 22], [30, 31], [43, 31], [37, 20], [26, 17], [47, 17], [10, 20], [62, 20], [26, 30], [47, 30], [62, 30]]) P('security_camera', x, y);
  // the stair tower down to the Gutterline
  P('stairs', 35, 30, { examine: 'The public stair tower down to the Street Level.' });
  P('sign', 34, 31, { text: 'STREET LEVEL - DOWN', color: '#3ad8ff' }); P('security_camera', 37, 31, { examine: 'A camera trained on the stair tower. It counts who comes up from the Gutterline, and how many look back down.' });
  P('neon_lamp', 35, 31, { color: '#3ad8ff' });
  // the glass lift up to the Terraces
  P('lift', 43, 23, { examine: 'A glass lift to the Terraces. A sign: RESIDENTS AND GUESTS. A smaller sign: WE CAN SEE YOU.' });
  P('sign', 43, 25, { text: 'TERRACES - RESIDENTS AND GUESTS', color: '#ffe9b8' }); P('neon_lamp', 43, 26, { color: '#ffe9b8' }); P('glow_planter', 41, 28, { w: 2 }); P('data_pylon', 43, 27, { examine: 'A guest-pass reader. It beeps twice for a resident, once for a guest, and not at all for you.' });
  // the Precinct
  P('drone_pad', 31, 26, { w: 2, h: 2 }); P('neon_lamp', 31, 24, { color: '#3a7bff' }); P('data_pylon', 30, 23, { examine: 'A police report kiosk. It takes complaints about the neighbours and, more gladly, about you.' });
  // the Transit Hall
  P('holo_billboard', 33, 8, { w: 2, text: 'YOUR COMMUTE IS A SERVICE', color: '#3ad8ff' }); P('transit_shelter', 32, 7, { w: 3 }); P('transit_shelter', 37, 7, { w: 3 }); P('vend_neo', 31, 7); P('vend_neo', 40, 7);
  P('bench', 35, 7); P('security_camera', 31, 6); P('security_camera', 40, 6);
  // the Orrel lobby
  P('data_pylon', 21, 17, { examine: 'An Orrel public terminal: look up a share price, a stranger, or a street, in that order of popularity.' }); P('data_pylon', 29, 18);
  P('holo_billboard', 22, 18, { w: 2, text: 'ORREL: WE KNOW A GUY, AND THE GUY IS A DATABASE', color: '#ff4fb8' });
  for (const [x, y] of [[24, 18], [27, 18]]) P('glow_planter', x, y, { w: 2 }); P('bench', 20, 17); P('bench', 30, 17);
  // the Kessin Concourse, the Vantor reception, a pad row for deliveries on the north-east deck
  for (const [x, y] of [[58, 3], [61, 3], [64, 3]]) P('drone_pad', x, y, { w: 2, h: 2 });
  P('holo_billboard', 66, 6, { w: 2, text: 'KESSIN: LIVE ABOVE YOUR MEANS', color: '#ffb347' }); P('holo_billboard', 41, 5, { w: 2, text: 'VANTOR: A BETTER YOU, TERMS APPLY', color: '#4dffc3' });
  P('glow_planter', 56, 15, { w: 2 }); P('bench', 56, 13); P('bench', 67, 13); P('bench', 41, 12); P('bench', 53, 12);
  // the Commuter Court: tables, vending, light
  for (const [x, y] of [[34, 41], [36, 41], [38, 41], [40, 41], [34, 38], [41, 38]]) P('bench', x, y);
  for (const [x, y] of [[35, 40], [39, 40]]) P('glow_planter', x, y, { w: 2 });
  P('vend_neo', 33, 40); P('vend_neo', 42, 40); P('holo_billboard', 35, 37, { w: 2, text: 'LUNCH: 40 MINUTES, 38 OF THEM QUEUING', color: '#ffb347' });
  // the kiosk, the walks
  P('bench', 3, 19); P('vend_neo', 1, 19); P('neon_sign', 1, 15, { color: '#ff4fb8' }); P('data_pylon', 11, 22); P('data_pylon', 27, 21); P('data_pylon', 48, 22); P('data_pylon', 62, 24);
  for (const [x, y] of [[6, 4], [45, 44], [6, 42]]) P('holo_billboard', x, y, { w: 2, text: ['A FLOOR FOR EVERY BUDGET', 'WALK, DON\'T RUN, TO THE SKY', 'MIND THE GAP (IT IS LARGE)'][x % 3], color: '#3ad8ff' });
  for (const [x, y] of [[56, 40], [24, 34], [14, 32]]) P('bench', x, y);
  return {
    id: 'neumina_skyway', name: 'Neumina — The Skyway', kind: 'outdoor', megacity: true, abroad: 'neumina', level: 3, capTowers: TERRACE_DROP, below: { map: 'neumina_street', drop: SKY_DROP, lip: '#262838', glow: '#3ad8ff' },
    music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city', tiles: m.rows(), buildings, props,
    areas: [{ id: 'area_nm_skyway', name: 'Neumina, the Skyway', x: 0, y: 0, w: NM_W, h: NM_H }],
    doors: [{ id: 'door_nm_down', x: 36, y: 31, keepTile: true, label: 'The stair tower down to the Street Level', to: { map: 'neumina_street', spot: 'stairs' } },
      { id: 'door_nm_lift_up', x: 43, y: 24, keepTile: true, label: 'The lift up to the Terraces', to: { map: 'neumina_terrace', spot: 'lift' } }],
    spots: { arrive: { x: 37, y: 27, facing: 'down' }, stairs: { x: 37, y: 30, facing: 'up' }, lift: { x: 42, y: 24, facing: 'left' }, bridge: { x: 26, y: 26, facing: 'down' }, precinct: { x: 33, y: 24, facing: 'up' }, exchange: { x: 25, y: 19, facing: 'up' }, court: { x: 37, y: 40, facing: 'up' }, hall: { x: 36, y: 8, facing: 'up' } },
  };
}

/** Level 4, the Terraces: the comfortable rich. Stone and gardens round the towers' upper floors, galleries, private clubs, a quiet few
 * cameras. Landmarks: the Halcyne Garden, the Gallery of Glass, Vantor Wellness, Saffron Terrace, the Aurum Club. The glass lift down to the
 * Skyway opens on a fountain court; the Crown lift (gold doors, a doorman's podium) is on the southern terrace. */
function terrace() {
  const m = new MapBuilder(NM_W, NM_H, 'O');
  // three terraces: the Halcyne terrace (north-west), the Vantor terrace (north-east), the Synth Court promenade (south), joined by walks and a court
  m.rect(3, 3, 26, 20, 'm'); m.rect(40, 3, 30, 18, 'm'); m.rect(36, 33, 34, 15, 'm');
  m.rect(29, 8, 11, 3, 'm'); m.rect(29, 17, 13, 3, 'm'); m.rect(41, 15, 3, 18, 'm'); m.rect(38, 20, 10, 9, 'm'); // (the lift court: x38-47, y20-28)
  m.rect(15, 5, 6, 9, '.'); m.rect(53, 4, 4, 9, '.'); m.rect(52, 36, 5, 8, '.'); m.rect(13, 14, 16, 6, '.'); // the gardens
  for (const [x, y, w, h] of TOWERS) m.rect(x, y, w, h, 'B');
  const buildings = [
    { id: 'nm_r_villa_a', name: 'The Halcyne Garden Pavilion', mapLabel: 'Garden Pavilion', x: 16, y: 12, w: 5, h: 3, wall: '#e8e2d4', trim: '#c9a43a', flatRoof: true, sign: 'PAVILION' },
    { id: 'nm_r_gallery', name: 'The Gallery of Glass', mapLabel: 'The Gallery of Glass', x: 4, y: 16, w: 9, h: 3, wall: '#e9f0f0', trim: '#9fd4ff', columns: true, storeys: 2, sign: 'GALLERY' },
    { id: 'nm_r_wellness', name: 'Vantor Wellness', mapLabel: 'Vantor Wellness', x: 45, y: 15, w: 7, h: 3, wall: '#eef2ec', trim: '#4dffc3', columns: true, storeys: 2, sign: 'WELLNESS' },
    { id: 'nm_r_saffron', name: 'Saffron Terrace', mapLabel: 'Saffron Terrace', x: 58, y: 15, w: 9, h: 3, wall: '#f0e6d0', trim: '#c9a43a', flatRoof: true, storeys: 1, sign: 'SAFFRON' },
    { id: 'nm_r_club', name: 'The Aurum Club', mapLabel: 'The Aurum Club', x: 59, y: 42, w: 7, h: 3, wall: '#efe9dc', trim: '#c9a43a', flatRoof: true, sign: 'AURUM' },
  ];
  for (const b of buildings) m.rect(b.x, b.y, b.w, b.h, 'B');
  const props = [];
  let n = 0; const P = (type, x, y, o = {}) => props.push({ id: `nm_r_${type}_${n++}`, type, x, y, w: o.w || 1, h: o.h || 1, ...o });
  const WARM = '#ffe9b8';
  // the Halcyne Garden: trees, a path of benches, a fountain and a statue
  for (const [x, y] of [[15, 5], [20, 5], [16, 7], [19, 8], [15, 10], [20, 10], [14, 17], [18, 18], [24, 17], [27, 15]]) P('tree', x, y);
  P('fountain', 17, 8, { w: 2, h: 2 });
  for (const [x, y] of [[8, 14], [11, 14], [22, 16], [25, 19]]) P('bench', x, y);
  for (const [x, y] of [[4, 4], [20, 4], [41, 4], [67, 4], [21, 4], [3, 12]]) P('neon_lamp', x, y, { color: WARM });
  P('statue', 3, 6, { w: 2, h: 2 }); P('statue', 25, 15, { w: 2, h: 2 }); P('glow_planter', 14, 4, { w: 2 }); P('glow_planter', 24, 3, { w: 2 });
  // the Gallery of Glass: statues in a row on the forecourt, planters at the steps
  for (const [x, y] of [[5, 19], [10, 19]]) P('statue', x, y, { w: 2, h: 2 });
  P('glow_planter', 7, 19, { w: 2, examine: 'White orchids in a pot that costs more than the orchids. The pot is the exhibit.' });
  P('neon_lamp', 3, 17, { color: WARM }); P('neon_lamp', 13, 19, { color: WARM }); P('security_camera', 14, 16, { examine: 'A discreet camera in a brass shell shaped like a bird. The bird watches the glass, not the guests.' });
  // the Vantor terrace and Vantor Wellness
  for (const [x, y] of [[54, 5], [55, 9], [53, 11], [44, 4], [49, 4]]) P('tree', x, y);
  for (const [x, y] of [[46, 14], [49, 14], [54, 14]]) P('bench', x, y);
  for (const [x, y] of [[47, 18], [50, 18]]) P('glow_planter', x, y, { w: 2 }); P('neon_lamp', 45, 19, { color: WARM }); P('neon_lamp', 52, 19, { color: WARM });
  P('security_camera', 44, 18, { examine: 'A small camera by the Vantor door, framed like a brooch. It does not need to be big. Everyone behaves.' });
  P('statue', 67, 8, { w: 2, h: 2 });
  // Saffron Terrace: planters for tables, lamps for candles
  for (const [x, y] of [[59, 19], [62, 19], [65, 19]]) P('bench', x, y);
  for (const [x, y] of [[58, 18], [64, 18]]) P('glow_planter', x, y, { w: 2 }); P('neon_lamp', 57, 19, { color: '#ffd58a' }); P('neon_lamp', 67, 19, { color: '#ffd58a' }); P('neon_lamp', 61, 20, { color: '#ffd58a' });
  // the lift court: fountain, statues, benches, the glass lift down to the Skyway
  P('fountain', 40, 25, { w: 2, h: 2 }); P('statue', 39, 21, { w: 2, h: 2 });
  for (const [x, y] of [[40, 23], [43, 27], [46, 27], [39, 28]]) P('bench', x, y);
  P('lift', 45, 23, { examine: 'The glass lift down to the Skyway.' }); P('neon_lamp', 45, 22, { color: WARM }); P('neon_lamp', 45, 24, { color: WARM }); P('security_camera', 46, 21);
  P('glow_planter', 46, 25, { w: 2 }); P('tree', 47, 21);
  // the Synth Court promenade and the Aurum Club
  for (const [x, y] of [[53, 37], [55, 41], [54, 39]]) P('tree', x, y);
  for (const [x, y] of [[40, 44], [42, 44], [56, 45]]) P('bench', x, y);
  for (const [x, y] of [[38, 35], [67, 35], [57, 34], [57, 44], [48, 45]]) P('neon_lamp', x, y, { color: WARM });
  for (const [x, y] of [[67, 37], [67, 40]]) P('statue', x, y, { w: 2, h: 2 });
  P('neon_lamp', 58, 43, { color: '#ffd58a' }); P('neon_lamp', 66, 43, { color: '#ffd58a' }); P('glow_planter', 60, 45, { w: 2 }); P('glow_planter', 64, 45, { w: 2 });
  // the Crown lift: gold doors, gold lamps, a podium and a man whose whole job is to look at you
  P('lift', 39, 38, { examine: 'The Crown lift: gold doors, and a man beside them whose whole job is to look at you.' });
  P('neon_lamp', 38, 37, { color: '#ffd27a' }); P('neon_lamp', 41, 37, { color: '#ffd27a' }); P('glow_planter', 36, 37, { w: 2 }); P('glow_planter', 40, 41, { w: 2 });
  P('sign', 40, 39, { text: 'THE CROWN - BY INVITATION', color: '#ffd27a' }); P('data_pylon', 40, 38, { examine: 'The doorman\'s podium: a list of names, a smaller list of names, and a pen on a chain that is only there for show.' });
  P('statue', 36, 40, { w: 2, h: 2 }); P('security_camera', 42, 38);
  return {
    id: 'neumina_terrace', name: 'Neumina — The Terraces', kind: 'outdoor', megacity: true, abroad: 'neumina', level: 4, capTowers: 9, capGlow: '#ffd27a', below: { map: 'neumina_skyway', drop: TERRACE_DROP, lip: '#d8d2c4', glow: '#ffd27a' },
    music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city', tiles: m.rows(), buildings, props,
    areas: [{ id: 'area_nm_terrace', name: 'Neumina, the Terraces', x: 0, y: 0, w: NM_W, h: NM_H }],
    doors: [{ id: 'door_nm_lift_down', x: 44, y: 23, keepTile: true, label: 'The lift down to the Skyway', to: { map: 'neumina_skyway', spot: 'lift' } },
      { id: 'door_nm_crown_up', x: 39, y: 39, keepTile: true, label: 'The Crown lift up to the Crown', to: { map: 'neumina_crown', spot: 'gate' } }],
    spots: { arrive: { x: 43, y: 25, facing: 'down' }, lift: { x: 43, y: 24, facing: 'down' }, garden: { x: 18, y: 7, facing: 'down' }, bridge: { x: 42, y: 19, facing: 'down' }, crown: { x: 38, y: 39, facing: 'down' }, gallery: { x: 8, y: 21, facing: 'up' }, wellness: { x: 48, y: 19, facing: 'up' }, restaurant: { x: 62, y: 20, facing: 'up' }, club: { x: 62, y: 46, facing: 'up' } },
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
