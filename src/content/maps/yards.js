// Mill Road Yards — a fenced industrial estate on Halvermouth's western edge
// (v0.13.0), through the gate at the end of Mill Road. Three arms works are
// for sale here; each needs an arms licence (Lucas Eastrise "knows a guy").
// A separate region, loaded through the gateway like Halvermouth itself.
import { MapBuilder, roomTiles } from '../../world/mapBuilder.js';

const W = 64;
const H = 62;
const m = new MapBuilder(W, H, 'g');
m.rect(0, 0, W, 1, 'x').rect(0, 0, 1, 48, 'x'); // beyond the fence
m.rect(1, 18, W - 1, 4, '='); // the yard road, from the east gate
m.rect(40, 1, 2, 17, '=').rect(40, 22, 2, 19, '='); // the cross road, down to the docks
m.rect(2, 35, 37, 3, ','); // loading apron
// v0.21.0: the docks — Ober & Sons Maritime's quay along the south of the Yards
m.rect(1, 39, W - 2, 2, ','); // pavement along the quay road
m.rect(1, 45, W - 2, 3, ','); // the quay apron
m.rect(6, 41, 52, 4, '='); // Quay Road
m.rect(40, 39, 2, 2, '='); // where the cross road meets it
m.rect(1, 40, 5, 6, 'm').rect(58, 40, 5, 6, 'm'); // turning circles at both ends
m.rect(0, 48, W, H - 48, '~'); // the harbour
export const BERTH_PIERS = [10, 29, 48]; // three berths, each a pier with a ship either side (authored x)
for (const x of BERTH_PIERS) m.rect(x, 48, 2, 10, 'p');
m.rect(58, 48, 1, 7, 'p'); // the Salty Ober's mooring

const works = (id, name, x, y, w, h, o = {}) => ({
  id: `b_${id}`, name, mapLabel: name, x, y, w, h,
  roof: o.roof || '#4a4e56', wall: o.wall || '#8a8e94', trim: o.trim || '#2e3238', flatRoof: true, sign: o.sign || name.toUpperCase(),
  door: { x: x + Math.floor(w / 2), y: y + h - 1, to: { map: id, spot: 'entry' }, lock: { flag: `owns_${id}`, flagMessage: `${name}: roller doors down, padlocked. A sign beside the door says FOR SALE — ARMS LICENCE REQUIRED.` } },
});

const buildings = [
  works('aw1', 'Yard 1 Works', 4, 4, 14, 9, { roof: '#5a5e66' }),
  works('aw2', 'Yard 2 Works', 22, 3, 16, 10, { roof: '#4a5a4a', wall: '#8a948a' }),
  works('aw3', 'Foundry Hall', 4, 23, 24, 11, { roof: '#5a3a2e', wall: '#9a7a62', trim: '#3a2a1e', sign: 'FOUNDRY HALL' }),
  { id: 'b_gatehouse', name: 'Gatehouse', mapLabel: 'Gatehouse', x: 50, y: 12, w: 6, h: 5, roof: '#3a3a40', wall: '#b8b4aa', trim: '#2a2a2e', flatRoof: true, sign: 'SECURITY',
    door: { x: 53, y: 16, lock: { message: 'The gatehouse is locked. Through the window: a portable TV playing a show about guards.' } } },
  { id: 'b_ober_office', name: 'Ober & Sons Maritime', mapLabel: 'Ober & Sons Maritime', x: 47, y: 35, w: 10, h: 4, roof: '#2a3a5a', wall: '#e8e2d4', trim: '#1e2a3a', flatRoof: true, sign: 'OBER & SONS MARITIME', signColor: '#e0b84a',
    door: { x: 52, y: 38, to: { map: 'ober_office', spot: 'entry' } } },
  { id: 'b_scrapco', name: 'Halver Scrap Co.', mapLabel: 'Halver Scrap Co.', x: 44, y: 24, w: 12, h: 8, roof: '#6a4a3a', wall: '#a8988a', trim: '#3a2e2a', flatRoof: true, shabby: true, sign: 'SCRAP CO.',
    door: { x: 50, y: 31, lock: { message: 'Halver Scrap Co.: "CLOSED FOR STOCKTAKE". The sign is rusted in place.' } } },
];

const props = [];
let n = 0;
const P = (type, x, y, o = {}) => props.push({ id: `yd_${type}_${n++}`, type, x, y, ...o });
for (let x = 2; x < W - 1; x++) if (x < 18 || x > 21) P('chainfence', x, 1, { razor: true });
for (const [x, y] of [[44, 17], [44, 22], [58, 17], [58, 22]]) P('streetlamp', x, y);
for (const [x, y] of [[20, 16], [36, 16], [20, 23], [36, 23], [8, 16], [30, 34]]) P('streetlamp', x, y);
for (const [id, wh, x, y] of [['yd_aw1_sale', 'aw1', 13, 13], ['yd_aw2_sale', 'aw2', 32, 13], ['yd_aw3_sale', 'aw3', 18, 34]]) {
  props.push({ id, type: 'sign', x, y, interact: { kind: 'arms', action: 'buy', warehouse: wh, name: 'FOR SALE sign' }, examine: 'FOR SALE. Arms licence required.' });
}
P('gatepost', 61, 17); P('gatepost', 61, 22);
P('sign', 59, 16, { examine: '"MILL ROAD YARDS — Industrial Estate. Heavy goods vehicles only. Pedestrians: be heavy."' });
for (const [x, y] of [[44, 4], [46, 4], [48, 4], [44, 7], [46, 7], [52, 5], [54, 5]]) P('crate', x, y, { w: 2 });
for (const [x, y] of [[57, 5], [58, 6], [57, 8], [59, 9]]) P('barrel', x, y);
for (const [x, y] of [[44, 34], [48, 34]]) P('dumpster', x, y, { color: '#5a6a5a' });
P('car', 24, 15, { w: 1, h: 2, color: '#c9a24a', examine: 'A forklift with the keys in it and a sign on the seat: "DON\'T."' });
P('car', 30, 35, { w: 2, h: 1, color: '#4a5a6a', examine: 'A flatbed truck. The cab smells of coffee and diesel.' });
for (const [x, y] of [[58, 26], [59, 29], [57, 33]]) P('trash', x, y);
P('noticeboard', 46, 13, { examine: 'YARD NOTICES: "Arms works for sale — licence holders only." "Lost: one (1) crate marked FRAGILE — DO NOT DROP. If found, do not drop." "Smoking strictly prohibited. Seriously. Look at what we make."' });

// the docks: lamps, bollards, cranes, the berths (drawn with your ships) and the Salty Ober
for (const x of [8, 20, 33, 46]) P('streetlamp', x, 39);
for (const x of [8, 16, 24, 36, 44, 54, 62]) P('streetlamp', x, 47);
for (const x of [7, 15, 19, 26, 34, 39, 43, 53, 56, 61]) P('bollard', x, 47);
P('crane', 21, 45, { w: 3, h: 2, examine: 'A dockside crane, OBER & SONS painted on the jib in letters that have been repainted so many times they\'re three-dimensional.' });
P('crane', 39, 45, { w: 3, h: 2, examine: 'A newer crane. Captain Ober calls it "the young one" and doesn\'t trust it.' });
for (const [x, y] of [[56, 45], [57, 45]]) P('crate', x, y, { w: 1 });
// v0.24.0: Ober & Sons' shipyard slipway at the west end of the quay — scaffolding while Mason's Os build it, then the slip
props.push({ id: 'yd_slipway_works', type: 'scaffold', x: 1, y: 45, w: 4, h: 3, hiddenUnless: { flag: 'shipyard_home_building' }, examine: 'Mason\'s Os are building a shipyard here. A sign: "SLIPWAY UNDER CONSTRUCTION. Mind the pun-filled gap."' });
props.push({ id: 'yd_slipway', type: 'slipway', x: 1, y: 47, w: 4, h: 12, hiddenUnless: { flag: 'shipyard_home_ready' }, examine: 'The Ober & Sons shipyard slipway: greased rails running down into the harbour, a gantry overhead. Ships you build at Mill Road are launched from here.' });
BERTH_PIERS.forEach((x, i) => {
  props.push({ id: `yd_berth${i + 1}`, type: 'shipberth', x: x - 5, y: 48, w: 12, h: 11, slot: i, examine: `Berth ${i + 1}.` });
  props.push({ id: `yd_berth${i + 1}_sign`, type: 'sign', x: x + 2, y: 47, interact: { kind: 'logistics', action: 'berth', slot: i, name: `Berth ${i + 1} board` }, examine: `BERTH ${i + 1}.` });
});
props.push({ id: 'yd_salty_ober', type: 'moored_ship', x: 59, y: 48, w: 4, h: 9, look: { hull: 'tug', color: '#7a2a24', trim: '#e8e2d4', len: 3.2 }, name: 'Salty Ober', examine: 'The Salty Ober: an old harbour tug turned houseboat, red as a pillar box, with geraniums in the lifebelts. Captain Ober lives aboard.' });
P('sign', 52, 39, { examine: '"OBER & SONS MARITIME — Shipping since before the sea was wet. Ask for the Captain." Under it, smaller: "The Sons all became accountants."' });

export const yards = {
  id: 'yards',
  name: 'Mill Road Yards',
  kind: 'outdoor',
  music: { day: 'mus_halvermouth', night: 'mus_halvermouth' },
  ambience: 'amb_city',
  tiles: m.rows(),
  areas: [{ id: 'area_yards', name: 'Mill Road Yards', x: 0, y: 0, w: W, h: H }],
  buildings,
  doors: [
    { id: 'door_yd_gate_n', x: 63, y: 18, keepTile: true, gateway: 'Halvermouth', label: 'Mill Road, back to Halvermouth', to: { map: 'halvermouth', spot: 'mill_road_west' } },
    { id: 'door_yd_gate_a', x: 63, y: 19, keepTile: true, gateway: 'Halvermouth', label: 'Mill Road, back to Halvermouth', to: { map: 'halvermouth', spot: 'mill_road_west' } },
    { id: 'door_yd_gate_b', x: 63, y: 20, keepTile: true, gateway: 'Halvermouth', label: 'Mill Road, back to Halvermouth', to: { map: 'halvermouth', spot: 'mill_road_west' } },
    { id: 'door_yd_gate_s', x: 63, y: 21, keepTile: true, gateway: 'Halvermouth', label: 'Mill Road, back to Halvermouth', to: { map: 'halvermouth', spot: 'mill_road_west' } },
    { id: 'door_salty_ober', x: 59, y: 51, keepTile: true, label: 'the Salty Ober', to: { map: 'salty_ober', spot: 'entry' } },
  ],
  spots: {
    east_gate: { x: 61, y: 20, facing: 'left' },
    aw1_door_out: { x: 11, y: 14, facing: 'down' }, aw2_door_out: { x: 30, y: 14, facing: 'down' }, aw3_door_out: { x: 16, y: 35, facing: 'down' },
    yard_center: { x: 30, y: 20, facing: 'down' },
    ober_office_out: { x: 52, y: 39, facing: 'down' },
    quay: { x: 30, y: 46, facing: 'down' },
    ober_bollards: { x: 57, y: 46, facing: 'down' },
    salty_gangway: { x: 58, y: 51, facing: 'right' },
  },
  props,
};

// ------------------------------------------------------------ arms works
// Bigger than the calculator warehouses. Fixed fittings: the loading dock
// (parts you order arrive here), the export cage (finished weapons), the
// terminal (the globe: parts, equipment, staff, research) and the staff
// bunks. Workstations are placed by the player (B).
const armsWorks = (id, name, w, h, bunks, o = {}) => {
  const props = [
    { id: `${id}_dock`, type: 'loadingbay', x: 1, y: 1, w: 4, h: 2, interact: { kind: 'container', container: `ct_${id}_dock`, name: 'loading dock' }, examine: 'The loading dock. Parts you order on the terminal are dropped here.' },
    { id: `${id}_cage`, type: 'outbin', x: w - 4, y: 1, w: 3, h: 2, interact: { kind: 'container', container: `ct_${id}_cage`, name: 'export cage' }, examine: 'The export cage. Finished crates go here to fill countries\' orders — or to be carried to Lucas.' },
    { id: `${id}_terminal`, type: 'terminal', x: Math.floor(w / 2) - 1, y: 1, w: 2, h: 1, interact: { kind: 'arms', action: 'terminal', warehouse: id, name: 'terminal' }, examine: 'A terminal with a slowly turning globe. Trade routes glow across it like veins.' },
    { id: `${id}_bench`, type: 'workbench', x: 6, y: 1, w: 2, h: 1, color: '#5a4a3a', interact: { kind: 'arms', action: 'bench', warehouse: id, name: 'armourer\'s workbench' }, examine: 'The armourer\'s workbench: a vice, files, a reloading press. Hand-make one weapon — or its ammunition — for yourself, from parts on the loading dock.' },
    { id: `${id}_board`, type: 'noticeboard', x: Math.floor(w / 2) + 2, y: 0, examine: o.board || 'A whiteboard: "SAFETY FIRST. SECOND. THIRD. — L.E." Somebody has added "DAYS WITHOUT INCIDENT: 0".' },
  ];
  const spots = { entry: { x: Math.floor(w / 2), y: h - 2, facing: 'up' } };
  // staff quarters along the bottom-left wall: a cot per bunk, with a spot beside it and an idle post
  for (let i = 0; i < bunks; i++) {
    const x = 1 + i * 2;
    props.push({ id: `${id}_cot${i + 1}`, type: 'cot', x, y: h - 3 });
    spots[`bunk_${i + 1}`] = { x: x + 1, y: h - 2, facing: 'left' };
    spots[`post_${i + 1}`] = { x: x + 1, y: h - 4, facing: 'up' };
  }
  return {
    id, name, kind: 'interior', armsWorks: id,
    music: 'mus_workshop', ambience: 'amb_indoor',
    tiles: roomTiles(w, h, 'g', Math.floor(w / 2)),
    doors: [{ id: `door_${id}_exit`, x: Math.floor(w / 2), y: h - 1, to: { map: 'yards', spot: `${id}_door_out` } }],
    spots,
    keepClear: [[Math.floor(w / 2), h - 2]],
    props,
  };
};
export const aw1 = armsWorks('aw1', 'Yard 1 Works', 30, 18, 4);
export const aw2 = armsWorks('aw2', 'Yard 2 Works', 36, 20, 6, { board: 'Previous tenant\'s whiteboard: "WIDGETS — Q3 TARGET: MORE". Underlined.' });
export const aw3 = armsWorks('aw3', 'Foundry Hall', 44, 24, 10, { board: 'An old foundry roll of honour, every name ending in "-smith". Someone has added "Eastrise (honorary)".' });

// ------------------------------------------------------------ the harbour office and the Salty Ober (v0.21.0)
const officeProps = [
  { id: 'oo_terminal', type: 'terminal', x: 2, y: 1, w: 2, h: 1, interact: { kind: 'logistics', action: 'terminal', name: 'logistics terminal' }, examine: 'The logistics terminal: a chart of the world\'s sea lanes, glowing in harbour-office green.' },
  { id: 'oo_desk', type: 'desk', x: 7, y: 3, w: 3, h: 1, examine: 'The Captain\'s desk: tide tables, a brass barometer, a mug that says WORLD\'S OKAYEST SAILOR.' },
  { id: 'oo_chair', type: 'chair', x: 8, y: 4 },
  { id: 'oo_chart', type: 'painting', x: 5, y: 0, w: 2, h: 1, examine: 'A framed sea chart of the coast with "HERE BE ACCOUNTANTS" written over Halvermouth.' },
  { id: 'oo_bottle', type: 'display', x: 11, y: 1, examine: 'A ship in a bottle. Look closely: there\'s a tiny Captain Ober on deck, waving.' },
  { id: 'oo_board', type: 'noticeboard', x: 9, y: 0, examine: 'TIDES · WEATHER · "NO WHISTLING IN THE OFFICE (IT CALLS UP THE WIND)".' },
  { id: 'oo_plant', type: 'plant', x: 12, y: 5 },
];
export const oberOffice = {
  id: 'ober_office', name: 'Ober & Sons Maritime', kind: 'interior',
  music: 'mus_workshop', ambience: 'amb_indoor',
  tiles: roomTiles(14, 8, 'f', 7),
  doors: [{ id: 'door_ober_office_exit', x: 7, y: 7, to: { map: 'yards', spot: 'ober_office_out' } }],
  spots: { entry: { x: 7, y: 6, facing: 'up' }, desk: { x: 8, y: 2, facing: 'down' }, terminal: { x: 3, y: 2, facing: 'up' } },
  keepClear: [[7, 6]],
  props: officeProps,
};
export const saltyOber = {
  id: 'salty_ober', name: 'The Salty Ober', kind: 'interior',
  music: 'mus_workshop', ambience: 'amb_indoor',
  tiles: roomTiles(10, 6, 'f', 5),
  doors: [{ id: 'door_salty_exit', x: 5, y: 5, to: { map: 'yards', spot: 'salty_gangway' } }],
  spots: { entry: { x: 5, y: 4, facing: 'up' }, bunk: { x: 2, y: 2, facing: 'right' }, wheel: { x: 7, y: 2, facing: 'up' } },
  keepClear: [[5, 4]],
  props: [
    { id: 'so_bunk', type: 'bed', x: 1, y: 1, w: 1, h: 2, examine: 'The Captain\'s bunk, made with hospital corners. Naval habits die hard.' },
    { id: 'so_wheel', type: 'display', x: 7, y: 1, examine: 'The ship\'s wheel, polished smooth by forty years of hands. The tug hasn\'t left the quay in nine.' },
    { id: 'so_stove', type: 'stove', x: 4, y: 1, examine: 'A little iron stove. The kettle is always on "nearly".' },
    { id: 'so_chest', type: 'chest', x: 8, y: 3, examine: 'A sea chest. Locked. It smells faintly of rum and nostalgia.' },
  ],
};

export default [yards, aw1, aw2, aw3, oberOffice, saltyOber];
