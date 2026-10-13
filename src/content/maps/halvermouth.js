// Halvermouth — the metropolis west of Westbrook. A separate region (loaded on
// entry through the East Gate, not stitched seamlessly: it is far bigger than
// the coast maps). Map-only build (v0.5.0): streets, skyscrapers, the Hall of
// Justice (courthouse + Mayor's office), Police Precinct 1, Rook & Rifle
// Firearms and the Sumps slum, with interiors for the three key buildings.
// No residents yet.
//
// Street grid (tiles): avenues (east–west) at y 12–13 Crown St, 36–37 Grand
// Avenue, 60–61 Mill Road; streets (north–south) at x 14–15 Tanner St, 38–39
// Justice Way, 62–63 Court St, 86–87 Harbor St; 1-tile pavements either side.
import { MapBuilder, roomTiles } from '../../world/mapBuilder.js';

const W = 112;
const H = 80;
const m = new MapBuilder(W, H, ',');

// --- streets
const AVENUES = [12, 36, 60];
const STREETS = [14, 38, 62, 86];
for (const y of AVENUES) m.rect(0, y, W, 2, '=');
for (const x of STREETS) m.rect(x, 0, 2, 71, '=');
// --- blocks
m.rect(41, 15, 20, 20, 'm'); // Civic Plaza
m.rect(0, 15, 13, 20, 'g'); // Harbourline car park
m.rect(78, 23, 7, 12, 'g'); // police car park
m.rect(89, 39, 23, 20, '.'); // Founders Park
m.rect(89, 48, 23, 1, ':').rect(99, 39, 1, 20, ':'); // park paths
m.rect(97, 44, 7, 4, '~'); // the park pond
m.rect(41, 48, 20, 3, 'g').rect(65, 47, 20, 4, 'g'); // service alleys
// --- the Sumps (slum): mud, dirt tracks; the grid breaks down here
m.rect(0, 38, 38, 36, 'u');
m.rect(14, 38, 2, 36, ':').rect(0, 60, 38, 2, ':'); // Tanner St / Mill Rd as dirt
m.rect(5, 38, 1, 22, ':').rect(26, 44, 1, 16, ':').rect(16, 52, 10, 1, ':').rect(16, 67, 22, 1, ':');
// --- docks and the harbour
m.rect(38, 71, 74, 3, ',');
m.rect(0, 74, W, 6, '~');
m.rect(0, 72, 38, 2, 's');
m.rect(70, 74, 3, 5, 'p').rect(96, 74, 3, 5, 'p').rect(20, 74, 2, 3, 'p');
m.rect(108, 36, 4, 2, '='); // East Gate

// ---------------------------------------------------------------- buildings
const tower = (id, name, x, y, w, h, storeys, o = {}) => ({
  id, name, mapLabel: o.label || name, x, y, w, h, tower: storeys,
  wall: o.wall || '#5a6a7a', glass: o.glass || '#8fb4c8', trim: o.trim || '#2e3640', roof: o.roof || '#4a4f5a',
  sign: o.sign, signColor: o.signColor, helipad: o.helipad,
  door: { x: o.doorX ?? x + Math.floor(w / 2), y: y + h - 1, lock: { message: o.closed || `${name}: the lobby doors are locked. A guard behind the glass shakes his head.` } },
});
const shack = (id, x, y, w, h, roof) => ({ id, name: 'Shack', mapLabel: '', x, y, w, h, roof: roof || '#8a5a3a', wall: '#9a8c74', trim: '#5a4a3a', flatRoof: true, shabby: true });
const shop = (id, name, x, y, w, h, o = {}) => ({
  id, name, mapLabel: o.label ?? name, x, y, w, h, sign: o.sign, roof: o.roof || '#6a5a4a', wall: o.wall || '#d8ccb4', trim: o.trim || '#4a3a2e',
  flatRoof: o.flat ?? true, awning: o.awning, columns: o.columns,
  door: o.door || { x: x + Math.floor(w / 2), y: y + h - 1, lock: { message: o.closed || `${name} is closed. (Opening in a future update.)` } },
});

const buildings = [
  // Financial District (north)
  tower('t_mutual', 'Halvermouth Mutual', 1, 3, 11, 8, 18, { wall: '#6a7684', sign: 'HALVERMOUTH MUTUAL' }),
  tower('t_ledgerline', 'Ledgerline Building', 18, 3, 9, 8, 22, { wall: '#4a5a6e', glass: '#9cc0d2', sign: 'LEDGERLINE' }),
  tower('t_crown', 'Crown Insurance', 28, 3, 8, 8, 16, { wall: '#8a7a6a', trim: '#4a3e34', glass: '#a8c4cc' }),
  tower('t_meridian', 'Meridian Trust', 41, 3, 10, 8, 24, { wall: '#3e4a5c', glass: '#7fa8c4', helipad: true, sign: 'MERIDIAN TRUST' }),
  tower('t_herald', 'The Halvermouth Herald', 52, 3, 9, 8, 14, { wall: '#9a8a74', trim: '#3a3028', glass: '#b0c8cc', sign: 'THE HERALD' }),
  tower('t_exchange', 'Copperfield Exchange', 66, 3, 11, 8, 20, { wall: '#7a5a42', trim: '#3a2a1e', glass: '#c0a888', sign: 'COPPERFIELD EXCHANGE' }),
  tower('t_atlas', 'The Atlas Rooms', 78, 3, 7, 8, 15, { wall: '#5e6a5a', glass: '#a4c0b4' }),
  tower('t_vantage', 'Vantage Point', 90, 3, 11, 8, 23, { wall: '#2e3a4e', glass: '#6f9cc0', helipad: true }),
  tower('t_telephone', 'Halvermouth Telephone Co.', 102, 3, 9, 8, 17, { wall: '#6a6e78', sign: 'TELEPHONE CO.' }),
  // Bank Row
  tower('t_harbourline', 'Harbourline Apartments', 1, 15, 11, 8, 15, { wall: '#a08a72', trim: '#4a3a2e', glass: '#b4c8cc', closed: 'Harbourline Apartments: residents only. The buzzer panel has 120 buttons and none of them are yours.' }),
  tower('t_ober', 'Ober\'s Oil Tower', 18, 24, 12, 11, 30, { wall: '#1e2228', glass: '#c9a24a', trim: '#8a6a2a', roof: '#2a2a30', sign: 'OBER\'S OIL', signColor: '#5a3a14', label: 'Ober\'s Oil Tower', closed: 'Ober\'s Oil Tower: "Appointments only. Sir Moneybucks does not receive walk-ins." The doorman is gold-buttoned and enormous.' }),
  shop('b_bank', 'First Bank of Halvermouth', 31, 28, 6, 7, { roof: '#5a5a62', wall: '#e8e2d4', trim: '#5a5a62', columns: true, sign: 'BANK', closed: 'First Bank of Halvermouth: closed to the public until the next update. The vault door behind the glass is very round and very shiny.' }),
  // Civic Plaza
  {
    id: 'b_hall_of_justice', name: 'Halvermouth Hall of Justice', mapLabel: 'Hall of Justice & Mayor\'s Office',
    x: 43, y: 16, w: 15, h: 8, roof: '#8a8478', wall: '#ece6d8', trim: '#6a6458', columns: true, flatRoof: true, dome: '#6a9a8a', pediment: true,
    sign: 'HALL OF JUSTICE · OFFICE OF THE MAYOR',
    door: { x: 50, y: 23, to: { map: 'hall_of_justice', spot: 'entry' }, lock: { key: 'item_none', hours: { from: '08:00', to: '18:00' } } },
  },
  // Precinct Row
  tower('t_ironclad', 'Ironclad Securities', 66, 15, 9, 7, 12, { wall: '#4a4e56', glass: '#90a8b8' }),
  {
    id: 'b_police', name: 'Halvermouth Police — Precinct 1', mapLabel: 'Police Precinct 1',
    x: 66, y: 25, w: 12, h: 9, roof: '#4a5260', wall: '#3e5a7a', trim: '#1e2a3a', flatRoof: true, sign: 'POLICE · PRECINCT 1',
    door: { x: 71, y: 33, to: { map: 'police_station', spot: 'entry' } },
  },
  // East End
  tower('t_grand_hotel', 'The Grand Hotel', 89, 24, 12, 11, 20, { wall: '#8a3a32', trim: '#3a1a16', glass: '#e2c890', sign: 'GRAND HOTEL', signColor: '#6a1a14', closed: 'The Grand Hotel: "Fully booked." The bellhop looks at your boots and adds, "Forever."' }),
  // Market Street
  shop('b_rialto', 'The Rialto', 42, 40, 10, 7, { roof: '#7a2a32', wall: '#e2c8a0', trim: '#5a1a22', sign: 'RIALTO · PICTURES' }),
  shop('b_market_hall', 'Market Hall', 53, 40, 8, 7, { roof: '#5a7a5a', wall: '#e8dcc0', trim: '#3a4a3a', sign: 'MARKET HALL', flat: false }),
  shop('b_diner', 'Dinah\'s Diner', 41, 52, 6, 7, { roof: '#c0414a', wall: '#f0e8d8', trim: '#8a2a32', sign: 'DINAH\'S', awning: '#c0414a' }),
  shop('b_pawn', 'Golden Hock Pawn & Loan', 48, 52, 6, 7, { roof: '#6a5a3a', wall: '#d8c89a', trim: '#4a3a1e', sign: 'PAWN & LOAN' }),
  shop('b_bar', 'The Lucky Star', 55, 52, 6, 7, { roof: '#3a2a4a', wall: '#6a5a7a', trim: '#2a1a3a', sign: 'LUCKY STAR', label: 'The Lucky Star (bar)' }),
  // Iron Row
  shop('b_garage', 'Iron Row Garage', 66, 39, 10, 7, { roof: '#5a5e66', wall: '#9a9ea6', trim: '#3a3e46', sign: 'GARAGE' }),
  {
    id: 'b_gun_shop', name: 'Rook & Rifle Firearms', mapLabel: 'Rook & Rifle (guns)', x: 66, y: 52, w: 7, h: 7,
    roof: '#3a3a32', wall: '#7a6a52', trim: '#2a2418', flatRoof: true, sign: 'ROOK & RIFLE', awning: '#5a4a2a',
    door: { x: 69, y: 58, to: { map: 'gun_shop', spot: 'entry' }, lock: { key: 'item_none', hours: { from: '09:00', to: '19:00' } } },
  },
  shop('b_locksmith', 'Tumbler & Sons Locksmiths', 74, 52, 5, 7, { roof: '#5a4a3a', wall: '#c8b89a', sign: 'LOCKS' }),
  shop('b_bail', 'Bail Bonds 24/7', 80, 52, 5, 7, { roof: '#7a6a2a', wall: '#e8d888', trim: '#5a4a1a', sign: 'BAIL BONDS' }),
  // The Sumps
  shop('b_mission', 'St. Brennan\'s Mission', 18, 40, 8, 6, { roof: '#5a4a5a', wall: '#c8bca8', trim: '#3a2e3a', sign: 'SOUP · BEDS · NO QUESTIONS', flat: false, closed: 'St. Brennan\'s Mission: "Doors open at six for soup." It\'s not six. (Opening in a future update.)' }),
  shack('sh_1', 1, 40, 4, 3, '#8a5a3a'), shack('sh_2', 7, 40, 4, 3, '#6a6e6a'), shack('sh_3', 1, 46, 3, 3, '#7a4a3a'),
  shack('sh_4', 7, 46, 5, 3, '#5a6a7a'), shack('sh_5', 1, 53, 4, 3, '#8a7a4a'), shack('sh_6', 7, 54, 4, 3, '#7a5a4a'),
  shack('sh_7', 28, 40, 4, 3, '#6a5a4a'), shack('sh_8', 33, 40, 4, 3, '#8a4a3a'), shack('sh_9', 28, 47, 5, 3, '#5a5a4a'),
  shack('sh_10', 17, 55, 4, 3, '#7a6a5a'), shack('sh_11', 28, 54, 4, 3, '#6a4a3a'), shack('sh_12', 33, 54, 4, 3, '#5a6a5a'),
  shack('sh_13', 1, 63, 5, 3, '#8a5a4a'), shack('sh_14', 8, 63, 4, 3, '#6a6a5a'), shack('sh_15', 18, 63, 4, 3, '#7a4a3a'),
  shack('sh_16', 28, 63, 5, 3, '#5a5a6a'), shack('sh_17', 1, 68, 4, 3, '#7a6a4a'), shack('sh_18', 25, 69, 4, 3, '#8a5a3a'),
  // The Docks
  shop('b_wh7', 'Warehouse 7', 41, 63, 10, 6, { roof: '#6a6e74', wall: '#a8a49a', trim: '#4a4a4a', sign: 'WAREHOUSE 7', closed: 'Warehouse 7 is padlocked. Something inside is ticking. Probably a clock.' }),
  shop('b_wh9', 'Warehouse 9', 52, 63, 9, 6, { roof: '#7a5a4a', wall: '#b09a84', trim: '#4a3a2e', sign: 'WAREHOUSE 9' }),
  shop('b_port', 'Port Authority', 65, 63, 12, 6, { roof: '#3a4a5a', wall: '#d8dce0', trim: '#2a3a4a', sign: 'PORT AUTHORITY' }),
  shop('b_cold', 'Northbank Cold Storage', 89, 63, 12, 6, { roof: '#8a9aa6', wall: '#dce6ea', trim: '#4a5a66', sign: 'COLD STORAGE' }),
  shop('b_wh12', 'Warehouse 12', 102, 63, 9, 6, { roof: '#5a5a52', wall: '#a49e8e', trim: '#3a3a32', sign: 'WAREHOUSE 12' }),
];

// ---------------------------------------------------------------- props
const props = [];
let n = 0;
const P = (type, x, y, o = {}) => props.push({ id: `hv_${type}_${n++}`, type, x, y, ...o });
// street lamps along every pavement
for (const y of [11, 35, 59]) for (let x = 3; x < W; x += 9) if (!STREETS.some((s) => x >= s - 1 && x <= s + 2) && !(y === 59 && x < 38)) P('streetlamp', x, y);
for (const y of [14, 38, 62]) for (let x = 7; x < W; x += 9) if (!STREETS.some((s) => x >= s - 1 && x <= s + 2) && !(y >= 38 && x < 38)) P('streetlamp', x, y);
// crossings at the main junctions
for (const x of [38, 62, 86]) for (const y of [12, 36, 60]) {
  P('crosswalk', x - 1, y, { h: 2 });
  P('crosswalk', x, y - 1, { w: 2, vertical: true });
}
// hydrants and parked cars along the avenues
for (const [x, y] of [[20, 14], [44, 38], [68, 11], [92, 14], [58, 35], [83, 38], [10, 11], [104, 38]]) P('hydrant', x, y);
const carColors = ['#3a5a8a', '#8a3a32', '#2a2a2e', '#e8e2d4', '#4a7a5a', '#c9a24a', '#5a4a6a'];
for (let i = 0, x = 18; x < 108; x += 7, i++) if (!STREETS.some((s) => x >= s - 2 && x <= s + 2)) P('car', x, 12, { color: carColors[i % carColors.length], solid: false });
for (let i = 0, x = 44; x < 104; x += 9, i++) if (!STREETS.some((s) => x >= s - 2 && x <= s + 2)) P('car', x, 37, { color: carColors[(i + 3) % carColors.length], solid: false });
// Harbourline car park
for (let i = 0; i < 4; i++) P('car', 1 + i * 3, 26, { w: 1, h: 2, color: carColors[(i + 1) % carColors.length] });
for (let i = 0; i < 4; i++) P('car', 1 + i * 3, 31, { w: 1, h: 2, color: carColors[(i + 4) % carColors.length] });
// Bank Row greenery in the tower's shadow
for (const x of [18, 22, 26, 30, 34]) P('tree', x, 17, { color: '#4f7a4a' });
P('bench', 24, 20); P('bench', 30, 20); P('flowerbed', 19, 21, { w: 4 }); P('flowerbed', 27, 21, { w: 4 });
// Civic Plaza
P('statue', 49, 28, { label: 'A. HALVER', examine: 'Aldous Halver, founder of Halvermouth, pointing heroically at a scroll. The plaque reads: "He Built A City Where There Was Only Mud." Someone has chalked underneath: "still mud in the Sumps, Aldous".' });
for (const x of [44, 56]) P('flagpole', x, 25, { color: '#2a4a8a' });
P('flagpole', 50, 25, { color: '#c9a24a' });
for (const [x, y] of [[43, 31], [57, 31], [45, 33], [55, 33]]) P('bench', x, y);
for (const [x, y] of [[41, 16], [59, 16], [41, 33], [59, 33]]) P('tree', x, y, { color: '#5a8a4a' });
P('flowerbed', 46, 29, { w: 2 }); P('flowerbed', 53, 29, { w: 2 });
for (const [x, y] of [[42, 26], [58, 26], [47, 32], [53, 32]]) P('streetlamp', x, y);
P('noticeboard', 48, 24, { examine: 'CITY NOTICES: "Mayoral Surgery Tuesdays." "Jury duty is a civic privilege (attendance compulsory)." "REWARD for information on the Mill Road warehouse fires."' });
// Precinct Row: police car park
P('chainfence', 78, 23, { w: 7 });
for (let i = 0; i < 3; i++) P('car', 79 + i * 2, 25, { w: 1, h: 2, color: '#e8e2d4', police: true, examine: 'A Halvermouth police cruiser. The lights turn lazily.' });
for (let i = 0; i < 2; i++) P('car', 79 + i * 2, 30, { w: 1, h: 2, color: '#1e2a3a', police: true });
P('flagpole', 66, 24, { color: '#2a4a8a' });
P('sign', 76, 34, { examine: '"HALVERMOUTH POLICE DEPARTMENT — PRECINCT 1. Open day and night. To report a crime, step inside. To commit one, please don\'t."' });
// East End and the East Gate
P('gatepost', 108, 35); P('gatepost', 108, 38);
P('sign', 106, 35, { examine: '"WELCOME TO HALVERMOUTH — City of a Thousand Windows. East: Westbrook, Lanternside & the Coast Road."' });
for (const [x, y] of [[103, 17], [107, 17], [103, 22], [107, 22], [103, 27], [107, 27], [103, 32]]) P('tree', x, y, { color: '#4f8a4a' });
P('bench', 105, 19); P('bench', 105, 29);
for (const x of [90, 94]) P('car', x, 18, { color: '#1e1e22', examine: 'A black limousine with a chauffeur asleep at the wheel. Grand Hotel guests only.' });
// Market Street and Iron Row
for (let x = 54; x < 61; x += 2) P('booth', x, 48, { examine: 'A market stall: fish, flowers, and "genuine" Ober\'s Oil shares at a discount.' });
P('dumpster', 42, 49); P('dumpster', 66, 48, { color: '#5a5a4a' }); P('dumpster', 80, 49);
P('crate', 70, 48); P('crate', 71, 48); P('barrel', 75, 48);
P('sign', 72, 59, { examine: '"ROOK & RIFLE FIREARMS — Licensed dealer. Hunting · Sport · Self-defence. Licence required for all sales. Ammunition sold separately. Common sense not included."' });
// Founders Park
for (const [x, y] of [[90, 40], [94, 41], [90, 45], [93, 51], [90, 56], [95, 55], [102, 40], [106, 41], [109, 45], [106, 52], [109, 56], [102, 55], [96, 42]]) P(y % 2 ? 'tree' : 'pine', x, y);
for (const [x, y] of [[96, 49], [102, 49], [98, 43], [104, 47]]) P('bench', x, y);
P('flowerbed', 91, 48, { w: 3 }); P('flowerbed', 106, 48, { w: 3 });
P('sign', 100, 40, { examine: '"FOUNDERS PARK. No ball games. No fishing. No feeding the pigeons. No pigeons."' });
// The Sumps
P('sign', 17, 37, { examine: 'A city sign, bent double: "MILL DISTRICT REGENERATION ZONE — Phase 1 Beginning Soon." It is dated eleven years ago. Someone has written "THE SUMPS" over it in tar.' });
P('chainfence', 37, 40, { h: 1, w: 1, razor: true }); 
for (let y = 41; y < 58; y += 1) if (y !== 48 && y !== 49) P('chainfence', 37, y, { razor: true });
for (const [x, y] of [[12, 42], [24, 48], [11, 57], [22, 66], [33, 69], [6, 50]]) P('barrelfire', x, y);
for (const [x, y, c] of [[17, 47, '#5a7a6a'], [20, 49, '#7a5a4a'], [9, 51, '#4a5a7a'], [30, 44, '#6a6a4a'], [11, 66, '#7a4a4a'], [31, 66, '#4a6a5a'], [2, 59, '#6a5a6a']]) P('tent', x, y, { color: c });
for (const [x, y] of [[2, 44], [28, 51], [8, 61], [22, 61], [29, 58]]) P('laundry', x, y);
for (const [x, y] of [[4, 49], [13, 45], [25, 43], [31, 50], [20, 58], [35, 61], [5, 66], [14, 70], [28, 72], [10, 72], [23, 53]]) P('trash', x, y);
P('car', 21, 44, { wrecked: true, color: '#6a4a3a', examine: 'A car with no wheels, no doors and three residents.' });
P('car', 33, 64, { wrecked: true, color: '#4a5a4a' });
props.push({ id: 'hv_sumps_crate', type: 'crate', x: 24, y: 58, interact: { kind: 'container', container: 'ct_sumps_crate' }, examine: 'A rotten crate.' }); P('crate', 25, 58); P('barrel', 16, 50); P('barrel', 34, 47);
// The Docks
for (const x of [44, 45, 58, 80, 81, 104, 105]) P('crate', x, 71);
for (const x of [47, 60, 83, 107]) P('barrel', x, 72);
P('boat', 74, 75, { w: 3, h: 2 }); P('boat', 100, 75, { w: 3, h: 2 });
P('sign', 64, 70, { examine: '"PORT OF HALVERMOUTH. Authorised personnel only beyond this point. Unauthorised personnel: please be discreet."' });

export const halvermouth = {
  id: 'halvermouth',
  name: 'Halvermouth',
  kind: 'outdoor',
  music: { day: 'mus_halvermouth', night: 'mus_halvermouth' },
  ambience: 'amb_city',
  tiles: m.rows(),
  areas: [
    { id: 'area_hv_financial', name: 'The Financial District', x: 0, y: 0, w: 112, h: 14 },
    { id: 'area_hv_bank_row', name: 'Bank Row', x: 0, y: 14, w: 38, h: 24 },
    { id: 'area_hv_civic', name: 'Civic Plaza', x: 38, y: 14, w: 26, h: 24 },
    { id: 'area_hv_precinct', name: 'Precinct Row', x: 64, y: 14, w: 22, h: 24 },
    { id: 'area_hv_east_end', name: 'The East End', x: 86, y: 14, w: 26, h: 24 },
    { id: 'area_hv_sumps', name: 'The Sumps', x: 0, y: 38, w: 38, h: 42 },
    { id: 'area_hv_market', name: 'Market Street', x: 38, y: 38, w: 26, h: 24 },
    { id: 'area_hv_iron_row', name: 'Iron Row', x: 64, y: 38, w: 22, h: 24 },
    { id: 'area_hv_park', name: 'Founders Park', x: 86, y: 38, w: 26, h: 24 },
    { id: 'area_hv_docks', name: 'The Docks', x: 38, y: 62, w: 74, h: 18 },
  ],
  buildings,
  doors: [
    { id: 'door_hv_east_gate_a', x: 111, y: 36, keepTile: true, gateway: 'Westbrook & the Coast', label: 'The Coast Road east', to: { map: 'westbrook', spot: 'west_gate' } },
    { id: 'door_hv_east_gate_b', x: 111, y: 37, keepTile: true, gateway: 'Westbrook & the Coast', label: 'The Coast Road east', to: { map: 'westbrook', spot: 'west_gate' } },
  ],
  spots: {
    east_gate: { x: 109, y: 36, facing: 'left' },
    plaza_center: { x: 51, y: 31, facing: 'up' },
    hall_door_out: { x: 50, y: 24, facing: 'down' },
    police_door_out: { x: 71, y: 34, facing: 'down' },
    gunshop_door_out: { x: 69, y: 59, facing: 'down' },
    sumps_gate: { x: 16, y: 38, facing: 'down' },
    mission_front: { x: 22, y: 46, facing: 'up' },
    park_center: { x: 99, y: 49, facing: 'up' },
    docks_quay: { x: 70, y: 72, facing: 'down' },
    ober_tower_front: { x: 24, y: 35, facing: 'up' },
  },
  props,
};

export const hallOfJustice = {
  id: 'hall_of_justice',
  name: 'Hall of Justice',
  kind: 'interior',
  music: 'mus_civic',
  ambience: 'amb_indoor',
  // centre: marble lobby; west: the Mayor's office; east: Courtroom One
  tiles: (() => {
    const rows = roomTiles(27, 15, 't', 13, [[9, 1, 1, 9, 'W'], [17, 1, 1, 9, 'W']]).map((r) => r.split(''));
    for (let y = 1; y < 14; y++) {
      for (let x = 1; x < 9; x++) rows[y][x] = 'c';
      for (let x = 18; x < 26; x++) rows[y][x] = 'f';
    }
    return rows.map((r) => r.join(''));
  })(),
  doors: [{ id: 'door_hall_exit', x: 13, y: 14, to: { map: 'halvermouth', spot: 'hall_door_out' } }],
  spots: { entry: { x: 13, y: 13, facing: 'up' }, mayor_desk: { x: 4, y: 3, facing: 'down' }, judge_seat: { x: 21, y: 1, facing: 'down' }, security_desk: { x: 13, y: 8, facing: 'down' } },
  props: [
    // lobby
    { id: 'hoj_desk', type: 'counter', x: 12, y: 9, w: 3, examine: 'The security desk. A sign-in book, a bowl of confiscated umbrellas and a very bored-looking stamp.' },
    { id: 'hoj_directory', type: 'sign', x: 15, y: 11, examine: '"WEST: Office of the Mayor. EAST: Courtroom One. UPSTAIRS: Records (closed for renovation since the last renovation)."' },
    { id: 'hoj_plant1', type: 'plant', x: 10, y: 1 }, { id: 'hoj_plant2', type: 'plant', x: 16, y: 1 },
    { id: 'hoj_bench1', type: 'bench', x: 10, y: 12 }, { id: 'hoj_bench2', type: 'bench', x: 15, y: 12 },
    { id: 'hoj_rug', type: 'rug', x: 12, y: 3, w: 3, h: 5, color: '#7a2a32' },
    { id: 'hoj_scales', type: 'statue', x: 12, y: 1, w: 3, h: 1, label: 'JUSTICE', examine: 'Lady Justice, blindfolded, scales in hand. One pan has been weighted with chewing gum.' },
    // Mayor's office
    { id: 'hoj_mayor_desk', type: 'desk', x: 3, y: 2, w: 3, color: '#5a3a24', examine: 'The Mayor\'s desk. A nameplate with no name on it yet, a fountain pen and a stack of letters marked "URGENT", "VERY URGENT" and "IGNORE".' },
    { id: 'hoj_mayor_flag', type: 'flagpole', x: 7, y: 2, color: '#2a4a8a' },
    { id: 'hoj_mayor_shelf', type: 'shelf', x: 1, y: 1, w: 1, h: 2 },
    { id: 'hoj_mayor_cab', type: 'cabinet', x: 8, y: 6, examine: 'City contracts, building permits for the whole city and a fat file labelled "MILL DISTRICT REGENERATION — DEFERRED".' },
    { id: 'hoj_mayor_rug', type: 'rug', x: 2, y: 5, w: 5, h: 3, color: '#2a4a6a' },
    { id: 'hoj_mayor_chairs', type: 'chair', x: 3, y: 4 }, { id: 'hoj_mayor_chairs2', type: 'chair', x: 5, y: 4 },
    { id: 'hoj_mayor_plant', type: 'plant', x: 1, y: 12 },
    { id: 'hoj_mayor_portraits', type: 'painting', x: 4, y: 0, examine: 'Portraits of past mayors. The most recent frame is empty.' },
    // Courtroom One
    { id: 'hoj_bench', type: 'counter', x: 19, y: 2, w: 5, color: '#4a2e1e', examine: 'The judge\'s bench, raised and polished. A gavel rests on a block worn into a perfect gavel-shaped dip.' },
    { id: 'hoj_witness', type: 'lectern', x: 18, y: 4, examine: 'The witness stand. Somebody has scratched "I DIDN\'T DO IT" into the rail. Somebody else has added "HE DID".' },
    { id: 'hoj_jury1', type: 'bench', x: 24, y: 4, w: 1, h: 1 }, { id: 'hoj_jury2', type: 'bench', x: 24, y: 6 },
    { id: 'hoj_table_a', type: 'table', x: 19, y: 7, w: 2 }, { id: 'hoj_table_b', type: 'table', x: 22, y: 7, w: 2 },
    { id: 'hoj_gallery1', type: 'bench', x: 19, y: 10, w: 2 }, { id: 'hoj_gallery2', type: 'bench', x: 22, y: 10, w: 2 },
    { id: 'hoj_gallery3', type: 'bench', x: 19, y: 12, w: 2 }, { id: 'hoj_gallery4', type: 'bench', x: 22, y: 12, w: 2 },
    { id: 'hoj_court_flag', type: 'flagpole', x: 25, y: 1, color: '#c9a24a' },
    { id: 'hoj_win1', type: 'window', x: 3, y: 0 }, { id: 'hoj_win2', type: 'window', x: 13, y: 0 }, { id: 'hoj_win3', type: 'window', x: 21, y: 0 },
  ],
};

const OFFICERS = ['npc_lawrence', 'npc_justin', 'npc_warren', 'npc_bailey', 'npc_miranda', 'npc_hugh'];

export const policeStation = {
  id: 'police_station',
  name: 'Police Precinct 1',
  kind: 'interior',
  music: 'mus_civic',
  ambience: 'amb_indoor',
  // lobby (west), Chief Order's office (north-east), the officers' bunk room (south-east)
  tiles: (() => {
    const rows = roomTiles(24, 14, 't', 7, [[14, 1, 1, 4, 'W'], [14, 6, 1, 1, 'W'], [14, 7, 9, 1, 'W'], [14, 8, 1, 2, 'W'], [14, 11, 1, 2, 'W']]).map((r) => r.split(''));
    for (let y = 1; y < 7; y++) for (let x = 15; x < 23; x++) rows[y][x] = 'c';
    for (let y = 8; y < 13; y++) for (let x = 15; x < 23; x++) rows[y][x] = 'f';
    return rows.map((r) => r.join(''));
  })(),
  doors: [
    { id: 'door_police_exit', x: 7, y: 13, to: { map: 'halvermouth', spot: 'police_door_out' } },
    { id: 'door_police_stairs', x: 2, y: 9, label: 'Stairs to the cell block', to: { map: 'jail', spot: 'stairs_in' }, lock: { key: 'item_jail_keys', owners: OFFICERS, message: 'CELL BLOCK — AUTHORISED PERSONNEL ONLY. (You are not authorised. You are barely personnel.)' } },
  ],
  spots: {
    entry: { x: 7, y: 12, facing: 'up' }, release: { x: 7, y: 11, facing: 'down' }, front_desk: { x: 6, y: 6, facing: 'down' },
    stairs_out: { x: 3, y: 9, facing: 'right' }, lobby_wait: { x: 10, y: 10, facing: 'left' }, desk_a: { x: 2, y: 4, facing: 'up' }, desk_b: { x: 6, y: 4, facing: 'up' },
    chief_desk: { x: 18, y: 3, facing: 'down' }, chief_couch: { x: 20, y: 2, facing: 'left' }, chief_visitor: { x: 18, y: 5, facing: 'up' },
    bunk_1: { x: 16, y: 9, facing: 'left' }, bunk_2: { x: 18, y: 9, facing: 'left' }, bunk_3: { x: 20, y: 9, facing: 'left' }, bunk_4: { x: 22, y: 9, facing: 'left' }, bunk_5: { x: 16, y: 11, facing: 'left' },
  },
  props: [
    { id: 'pd_front_desk', type: 'counter', x: 4, y: 7, w: 5, examine: 'The front desk. A bell, a sign reading "TAKE A NUMBER", and no numbers. A second sign: "COMPLAINTS: SEE CHIEF ORDER (HE IS AT LUNCH)".' },
    { id: 'pd_waiting1', type: 'bench', x: 9, y: 11, w: 2 }, { id: 'pd_waiting2', type: 'bench', x: 11, y: 11, w: 2 },
    { id: 'pd_wanted', type: 'noticeboard', x: 10, y: 1, examine: 'WANTED posters. A burglar called "The Cat". A fraudster called "The Other Cat". A sketch of someone who looks remarkably like a gull. Space has been left for more.' },
    { id: 'pd_desk1', type: 'desk', x: 1, y: 3, w: 2, color: '#6a6e74' }, { id: 'pd_desk2', type: 'desk', x: 5, y: 3, w: 2, color: '#6a6e74' },
    { id: 'pd_files', type: 'cabinet', x: 12, y: 1 }, { id: 'pd_files2', type: 'cabinet', x: 13, y: 1, examine: 'Case files. A drawer labelled "WAREHOUSE FIRES — MILL ROAD" is jammed shut. Another, "UNSOLVED", is jammed open.' },
    { id: 'pd_evidence', type: 'cabinet', x: 13, y: 3, interact: { kind: 'container', container: 'ct_evidence' }, examine: 'The evidence locker. Confiscated weapons end up here.' },
    { id: 'pd_coffee', type: 'stove', x: 1, y: 7, examine: 'Precinct coffee. It has been on the hotplate since the last century and has achieved sentience.' },
    { id: 'pd_stairs', type: 'stairs', x: 1, y: 9, examine: 'Stairs down to the cell block. They smell of damp and regret.' },
    { id: 'pd_lockers', type: 'wardrobe', x: 13, y: 9, interact: { kind: 'container', container: 'ct_police_lockers' }, examine: 'Officers\' lockers. One has a photo of a dog taped inside the vent.' },
    { id: 'pd_plant', type: 'plant', x: 12, y: 7 },
    // Chief Order's office
    { id: 'pd_chief_desk', type: 'desk', x: 17, y: 4, w: 3, color: '#5a3a24', examine: 'Chief Order\'s desk. An in-tray stacked to the ceiling, an out-tray with one sandwich in it, and a nameplate: LAWRENCE ORDER — CHIEF OF POLICE — "IF IT\'S URGENT, IT\'LL KEEP".' },
    { id: 'pd_donuts', type: 'table', x: 15, y: 1, examine: 'A box of a dozen doughnuts. There are two left. There are always two left.' },
    { id: 'pd_couch', type: 'bed', x: 21, y: 1, color: '#6a4a3a', examine: 'A sagging office couch with a Lawrence-shaped dent in it. A cushion is embroidered "NAP TIME IS POLICE TIME".' },
    { id: 'pd_chief_cab', type: 'cabinet', x: 22, y: 5, examine: 'Reports, unread, filed under "LATER". There is no "NOW".' },
    { id: 'pd_chief_flag', type: 'flagpole', x: 15, y: 6, color: '#2a4a8a' },
    { id: 'pd_rug', type: 'rug', x: 16, y: 5, w: 4, h: 1, color: '#2a4a6a' },
    // bunks
    { id: 'pd_cot1', type: 'cot', x: 15, y: 8 }, { id: 'pd_cot2', type: 'cot', x: 17, y: 8 }, { id: 'pd_cot3', type: 'cot', x: 19, y: 8 }, { id: 'pd_cot4', type: 'cot', x: 21, y: 8 }, { id: 'pd_cot5', type: 'cot', x: 15, y: 11 },
    { id: 'pd_win', type: 'window', x: 3, y: 0 }, { id: 'pd_win2', type: 'window', x: 19, y: 0 },
  ],
};

export const jail = {
  id: 'jail',
  name: 'Precinct 1 Cell Block',
  kind: 'interior',
  music: 'mus_lighthouse',
  ambience: 'amb_indoor',
  // three cells along the north wall, a corridor, the guard's desk and the stairs up
  tiles: roomTiles(22, 12, 't', 19, [[7, 1, 1, 6, 'W'], [14, 1, 1, 6, 'W']]),
  doors: [
    { id: 'door_jail_stairs', x: 19, y: 11, label: 'Stairs up to the precinct', to: { map: 'police_station', spot: 'stairs_out' }, lock: { key: 'item_jail_keys', flag: 'jail_stairs_open', owners: OFFICERS, flagMessage: 'The stairwell door is locked from the other side.' } },
    { id: 'door_cell_a', x: 5, y: 7, label: 'Cell door', to: { map: 'jail', spot: 'corridor_a' }, lock: { key: 'item_jail_keys', flag: 'jail_cell_open', owners: OFFICERS, flagMessage: 'The cell door is locked. Solid iron. Very rude.' } },
    { id: 'door_cell_b', x: 12, y: 7, label: 'Cell door', to: { map: 'jail', spot: 'corridor_b' }, lock: { key: 'item_jail_keys', flag: 'jail_cell_b_open', owners: OFFICERS, flagMessage: 'Petty\'s cell. Locked.' } },
    { id: 'door_cell_c', x: 19, y: 7, label: 'Cell door', to: { map: 'jail', spot: 'corridor_c' }, lock: { key: 'item_jail_keys', flag: 'jail_cell_c_open', owners: OFFICERS, flagMessage: 'An empty cell. Locked.' } },
  ],
  spots: {
    cell_a: { x: 3, y: 4, facing: 'down' }, cell_b: { x: 9, y: 3, facing: 'down' }, cell_b_bed: { x: 9, y: 2, facing: 'left' }, cell_c: { x: 17, y: 4, facing: 'down' },
    corridor_a: { x: 5, y: 8, facing: 'down' }, corridor_b: { x: 12, y: 8, facing: 'down' }, corridor_c: { x: 19, y: 8, facing: 'down' },
    guard_desk: { x: 2, y: 8, facing: 'up' }, stairs_in: { x: 19, y: 10, facing: 'up' },
  },
  props: [
    // cell A — the player's
    { id: 'jl_bars_a', type: 'cellbars', x: 1, y: 7, w: 4, interact: { kind: 'jail', action: 'bars', name: 'Cell bars' }, examine: 'Iron bars. The guard\'s desk is just beyond them.' },
    { id: 'jl_bars_a2', type: 'cellbars', x: 6, y: 7 },
    { id: 'jl_cot_a', type: 'cot', x: 1, y: 1, interact: { kind: 'jail', action: 'serve', name: 'Cot' }, examine: 'A thin cot with a thinner blanket.' },
    { id: 'jl_tray', type: 'table', x: 5, y: 2, interact: { kind: 'jail', action: 'tray', name: 'Meal tray' }, examine: 'A dented meal tray.' },
    { id: 'jl_brick', type: 'loosebrick', x: 1, y: 5, interact: { kind: 'jail', action: 'dig', name: 'Loose brick' }, examine: 'One brick in the wall is a slightly different colour. Older. Softer. Promising.' },
    { id: 'jl_vent', type: 'vent', x: 4, y: 1, interact: { kind: 'jail', action: 'vent', name: 'Air vent' }, examine: 'A rusty air vent, held shut by four screws. Big enough to crawl through, if you were desperate. You are a bit desperate.' },
    { id: 'jl_crack', type: 'wallcrack', x: 6, y: 3, interact: { kind: 'jail', action: 'whisper', name: 'Crack in the wall' }, examine: 'A crack in the wall between your cell and the next. Someone on the other side is humming.' },
    // cell B — Petty Larson's
    { id: 'jl_bars_b', type: 'cellbars', x: 8, y: 7, w: 4 }, { id: 'jl_bars_b2', type: 'cellbars', x: 13, y: 7 },
    { id: 'jl_cot_b', type: 'cot', x: 8, y: 1 },
    { id: 'jl_petty_stash', type: 'crate', x: 12, y: 1, examine: 'Petty\'s "stash": a mouth organ, three buttons and a photograph of his mum.' },
    // cell C — empty
    { id: 'jl_bars_c', type: 'cellbars', x: 15, y: 7, w: 4 }, { id: 'jl_bars_c2', type: 'cellbars', x: 20, y: 7 },
    { id: 'jl_cot_c', type: 'cot', x: 15, y: 1 },
    // corridor
    { id: 'jl_desk', type: 'desk', x: 1, y: 9, w: 2, color: '#6a6e74', examine: 'The night guard\'s desk: a crossword (abandoned), a mug (empty), and a ring of keys on a hook beside the chair.' },
    { id: 'jl_lamp', type: 'streetlamp', x: 9, y: 9 },
    { id: 'jl_sign', type: 'sign', x: 16, y: 9, examine: '"NO ESCAPES SINCE RECORDS BEGAN." Someone has scratched underneath: "records began on Tuesday".' },
  ],
};

export const gunShop = {
  id: 'gun_shop',
  name: 'Rook & Rifle Firearms',
  kind: 'interior',
  music: 'mus_workshop',
  ambience: 'amb_indoor',
  tiles: roomTiles(12, 9, 'f', 6),
  doors: [{ id: 'door_gunshop_exit', x: 6, y: 8, to: { map: 'halvermouth', spot: 'gunshop_door_out' } }],
  spots: { entry: { x: 6, y: 7, facing: 'up' }, counter_back: { x: 6, y: 2, facing: 'down' } },
  props: [
    { id: 'gs_counter', type: 'display', variant: 'guns', x: 3, y: 4, w: 6, interact: { kind: 'shop', shop: 'shop_rook', name: 'Gun counter' }, examine: 'A glass display counter of revolvers and pistols.' },
    { id: 'gs_bell', type: 'sign', x: 9, y: 4, examine: 'A brass bell and a card: "Back in 5 min — R. Pay at the till, take a receipt, and don\'t do anything I wouldn\'t." The till is an honesty box bolted to the counter.' },
    { id: 'gs_rack1', type: 'gunrack', x: 1, y: 1, w: 3, examine: 'Hunting rifles in a locked rack.' },
    { id: 'gs_rack2', type: 'gunrack', x: 8, y: 1, w: 3, examine: 'Shotguns in a locked rack. A sign: "Duck season. Rabbit season. NO gull season (city ordinance)."' },
    { id: 'gs_ammo', type: 'shelf', x: 1, y: 5, w: 1, h: 2, examine: 'Boxes of ammunition and a stern notice about storage.' },
    { id: 'gs_targets', type: 'painting', x: 5, y: 0, examine: 'A shot-through paper target, framed. Every hole is in the centre ring. It is signed "R."' },
    { id: 'gs_cabinet', type: 'cabinet', x: 10, y: 5, examine: 'Licence forms, in triplicate. Osric would approve.' },
    { id: 'gs_rug', type: 'rug', x: 4, y: 6, w: 4, h: 1, color: '#5a3a2a' },
  ],
};

export default [halvermouth, hallOfJustice, policeStation, jail, gunShop];
