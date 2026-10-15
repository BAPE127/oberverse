// Mill Road Yards — a fenced industrial estate on Halvermouth's western edge
// (v0.13.0), through the gate at the end of Mill Road. Three arms works are
// for sale here; each needs an arms licence (Lucas Eastrise "knows a guy").
// A separate region, loaded through the gateway like Halvermouth itself.
import { MapBuilder, roomTiles } from '../../world/mapBuilder.js';

const W = 64;
const H = 40;
const m = new MapBuilder(W, H, 'g');
m.rect(0, 0, W, 1, 'x').rect(0, H - 1, W, 1, 'x').rect(0, 0, 1, H, 'x'); // beyond the fence
m.rect(1, 18, W - 1, 4, '='); // the yard road, from the east gate
m.rect(40, 1, 2, 17, '=').rect(40, 22, 2, 17, '='); // the cross road
m.rect(2, 35, 37, 3, ','); // loading apron

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
  ],
  spots: {
    east_gate: { x: 61, y: 20, facing: 'left' },
    aw1_door_out: { x: 11, y: 14, facing: 'down' }, aw2_door_out: { x: 30, y: 14, facing: 'down' }, aw3_door_out: { x: 16, y: 35, facing: 'down' },
    yard_center: { x: 30, y: 20, facing: 'down' },
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

export default [yards, aw1, aw2, aw3];
