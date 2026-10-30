// Halvermouth — the metropolis west of Westbrook. A separate region (loaded on
// entry through the East Gate, not stitched seamlessly: it is far bigger than
// the coast maps). Map-only build (v0.5.0): streets, skyscrapers, the Hall of
// Justice (courthouse + Mayor's office), Police Precinct 1, Pipecreek Armory
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
for (const x of STREETS) m.rect(x, 1, 2, 70, '=');
// --- blocks
m.rect(41, 15, 20, 20, 'm'); // Civic Plaza
m.rect(0, 15, 13, 20, 'g'); // Harbourline car park
m.rect(101, 20, 10, 4, 'm'); // the Beaumont Motor Gallery's forecourt (v0.16.0)
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
// --- v0.20.0: a road network that goes somewhere. The city sits between a ridge
// (north), the sea wall (west), the eastern cliffs and the harbour (south); roads
// only leave through the East Gate (to the coast) and Mill Road (to the Yards).
m.rect(0, 0, W, 1, 'R'); // the ridge (v0.29.1: drawn as a grassy bank, not sea wall)
m.rect(14, 1, 74, 2, '='); // Ridge Road: the tops of all four streets
m.rect(38, 0, 2, 1, '='); // v0.29.0: the North Gate — FM 38 up to Lariat
m.rect(0, 0, 1, 60, 'r').rect(0, 62, 1, 12, 'r'); // the sea wall (Mill Road's gate at rows 60–61)
m.rect(111, 0, 1, 36, 'r').rect(111, 38, 1, 36, 'r'); // the eastern cliffs (the East Gate at rows 36–37)
m.rect(1, 12, 1, 2, ',').rect(1, 36, 1, 2, ','); // Crown St and Grand Ave end at the car park
m.rect(5, 14, 4, 1, 'g').rect(5, 35, 4, 1, 'g'); // the Harbourline car park's two entrances
m.rect(104, 10, 7, 6, 'm'); // Crown Street's turning circle
m.rect(104, 58, 7, 6, 'm'); // Mill Road's turning circle, at the park gates
m.rect(38, 71, 73, 2, '='); // Quay Road, along the docks
m.rect(104, 69, 7, 4, 'm'); // the quay's turning circle


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
  shop('b_bank', 'First Bank of Halvermouth', 31, 28, 6, 7, { roof: '#5a5a62', wall: '#e8e2d4', trim: '#5a5a62', columns: true, sign: 'BANK', door: { x: 34, y: 34, to: { map: 'first_bank', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_augustus', 'npc_prudence', 'npc_cyrus', 'npc_bertram'], hours: { from: '09:00', to: '17:00' }, message: 'First Bank of Halvermouth: open 09:00 to 17:00. The vault door behind the glass is very round and very shiny, and very shut.' } } }),
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
  // v0.52.0: the Lucky Star bar's site, rebuilt as Octavius Thomas Phonograph's casino resort (the bar
  // lives on as its lobby lounge): 42 storeys over the back alley; open all hours (src/content/casino.js)
  {
    id: 'b_phonograph', name: 'The Phonograph Grand', mapLabel: 'The Phonograph Grand (casino)', x: 55, y: 48, w: 6, h: 11,
    tower: 42, resort: true, roof: '#1e1a24', wall: '#1e1a24', trim: '#c9a24a', glass: '#e8c86a', flatRoof: true,
    sign: 'THE PHONOGRAPH GRAND', awning: '#8a1a22', marquee: true,
    door: { x: 58, y: 58, to: { map: 'phonograph_lobby', spot: 'entry' } },
  },
  // Iron Row
  shop('b_garage', 'Iron Row Garage', 66, 39, 10, 7, { roof: '#5a5e66', wall: '#9a9ea6', trim: '#3a3e46', sign: 'GARAGE' }),
  {
    id: 'b_gun_shop', name: 'Pipecreek Armory', mapLabel: 'Pipecreek Armory (guns)', x: 66, y: 52, w: 7, h: 7,
    roof: '#3a3a32', wall: '#7a6a52', trim: '#2a2418', flatRoof: true, sign: 'PIPECREEK ARMORY', awning: '#5a4a2a',
    door: { x: 69, y: 58, to: { map: 'gun_shop', spot: 'entry' }, lock: { key: 'item_none', hours: { from: '09:00', to: '19:00' } } },
  },
  {
    id: 'b_beaumont', name: 'Beaumont Motor Gallery', mapLabel: 'Beaumont Motor Gallery', x: 102, y: 15, w: 9, h: 5,
    roof: '#1e2a3f', wall: '#e9e4d8', trim: '#b8892f', flatRoof: true, sign: 'BEAUMONT', columns: true, awning: '#1e2a3f',
    door: { x: 106, y: 19, to: { map: 'beaumont_showroom', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_julian'], hours: { from: '09:30', to: '18:30' } } },
  },
  shop('b_locksmith', 'Tumbler & Sons Locksmiths', 74, 52, 5, 7, { roof: '#5a4a3a', wall: '#c8b89a', sign: 'LOCKS' }),
  shop('b_bail', 'Bail Bonds 24/7', 80, 52, 5, 7, { roof: '#7a6a2a', wall: '#e8d888', trim: '#5a4a1a', sign: 'BAIL BONDS' }),
  // The Sumps
  shop('b_mission', 'St. Brennan\'s Mission', 18, 40, 8, 6, { roof: '#5a4a5a', wall: '#c8bca8', trim: '#3a2e3a', sign: 'SOUP · BEDS · NO QUESTIONS', flat: false, closed: 'St. Brennan\'s Mission: "Doors open at six for soup." It\'s not six. (Opening in a future update.)' }),
  shack('sh_1', 1, 40, 4, 3, '#8a5a3a'), shack('sh_2', 7, 40, 4, 3, '#6a6e6a'), shack('sh_3', 1, 46, 3, 3, '#7a4a3a'),
  shack('sh_4', 7, 46, 5, 3, '#5a6a7a'), shack('sh_5', 1, 53, 4, 3, '#8a7a4a'), shack('sh_6', 7, 54, 4, 3, '#7a5a4a'),
  shack('sh_7', 28, 40, 4, 3, '#6a5a4a'), shack('sh_8', 33, 40, 4, 3, '#8a4a3a'), shack('sh_9', 28, 47, 5, 3, '#5a5a4a'),
  shack('sh_10', 17, 55, 4, 3, '#7a6a5a'),
  {
    id: 'b_abacus', name: 'The Abacus', mapLabel: 'The Abacus (Sums of Anarchy)', x: 28, y: 53, w: 9, h: 5,
    roof: '#5a2a24', wall: '#8a4a3a', trim: '#2a1a14', flatRoof: true, shabby: true, sign: 'THE ABACUS', awning: '#8a2a20',
    door: { x: 32, y: 57, to: { map: 'abacus', spot: 'entry' } },
  },
  shack('sh_13', 1, 63, 5, 3, '#8a5a4a'), shack('sh_14', 8, 63, 4, 3, '#6a6a5a'), shack('sh_15', 18, 63, 4, 3, '#7a4a3a'),
  shack('sh_16', 28, 63, 5, 3, '#5a5a6a'), shack('sh_17', 1, 68, 4, 3, '#7a6a4a'), shack('sh_18', 25, 69, 4, 3, '#8a5a3a'),
  // The Docks
  // warehouses for sale (v0.12.0): bought at the FOR SALE sign beside each door
  shop('b_wh7', 'Warehouse 7', 41, 63, 10, 6, { roof: '#6a6e74', wall: '#a8a49a', trim: '#4a4a4a', sign: 'WAREHOUSE 7', door: { x: 46, y: 68, to: { map: 'wh7', spot: 'entry' }, lock: { flag: 'owns_wh7', flagMessage: 'Warehouse 7 is padlocked. A sign beside the door says FOR SALE.' } } }),
  shop('b_wh9', 'Pier 9 Shed', 52, 63, 9, 6, { roof: '#7a5a4a', wall: '#b09a84', trim: '#4a3a2e', sign: 'PIER 9', door: { x: 56, y: 68, to: { map: 'wh9', spot: 'entry' }, lock: { flag: 'owns_wh9', flagMessage: 'The Pier 9 Shed is chained shut. A sign beside the door says FOR SALE.' } } }),
  shop('b_surplus', 'Sal\'s Surplus Electronics', 78, 63, 7, 6, { roof: '#4a5a3a', wall: '#a8b08a', trim: '#2a3a1a', sign: 'SAL\'S SURPLUS', awning: '#6a7a3a', door: { x: 81, y: 68, to: { map: 'surplus', spot: 'entry' }, lock: { key: 'item_none', hours: { from: '08:00', to: '20:00' } } } }),
  shop('b_port', 'Port Authority', 65, 63, 12, 6, { roof: '#3a4a5a', wall: '#d8dce0', trim: '#2a3a4a', sign: 'PORT AUTHORITY' }),
  shop('b_cold', 'Northbank Cold Storage', 89, 63, 12, 6, { roof: '#8a9aa6', wall: '#dce6ea', trim: '#4a5a66', sign: 'COLD STORAGE' }),
  shop('b_wh12', 'The Old Cannery', 102, 63, 9, 6, { roof: '#5a5a52', wall: '#a49e8e', trim: '#3a3a32', sign: 'OLD CANNERY', door: { x: 106, y: 68, to: { map: 'wh12', spot: 'entry' }, lock: { flag: 'owns_wh12', flagMessage: 'The Old Cannery is boarded up. A sign beside the door says FOR SALE.' } } }),
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
// (v0.17.0: the avenues' parked cars moved off the lanes — the bus and traffic use them)
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
// v0.29.1: the North Gate — FM 38 up to Lariat — marked like the city's other gates (explicit ids: P() numbering stays put)
props.push({ id: 'hv_north_gatepost_w', type: 'gatepost', x: 37, y: 0 }, { id: 'hv_north_gatepost_e', type: 'gatepost', x: 40, y: 0 });
props.push({ id: 'hv_north_roadsign', type: 'roadsign', x: 31, y: 0, w: 4, h: 1, text: 'FM 38 NORTH ↑', sub: 'LARIAT · CHUCKIE\'S CHEESE · 6 MI', examine: 'A green road sign on the ridge: FM 38 NORTH — LARIAT 6. Through the gate the road climbs out of the city into farm country.' });
P('sign', 106, 35, { examine: '"WELCOME TO HALVERMOUTH — City of a Thousand Windows. East: Westbrook, Lanternside & the Coast Road."' });
for (const [x, y] of [[103, 27], [107, 27], [103, 32]]) P('tree', x, y, { color: '#4f8a4a' });
P('bench', 105, 29);
P('flagpole', 101, 15, { color: '#1e2a3f', examine: 'A navy pennant with a gold B. It does not flap so much as gesture.' });
P('sign', 110, 21, { examine: '"BEAUMONT MOTOR GALLERY — Est. in the age of carriages. By appointment, or by sufficient means."' });
for (const x of [90, 94]) P('car', x, 18, { color: '#1e1e22', examine: 'A black limousine with a chauffeur asleep at the wheel. Grand Hotel guests only.' });
// Market Street and Iron Row
for (let x = 46; x < 53; x += 2) P('booth', x, 48, { examine: 'A market stall: fish, flowers, and "genuine" Ober\'s Oil shares at a discount.' });
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
for (const [id, wh, x] of [['hv_wh7_sale', 'wh7', 48], ['hv_wh9_sale', 'wh9', 58], ['hv_wh12_sale', 'wh12', 108]]) props.push({ id, type: 'sign', x, y: 69, interact: { kind: 'factory', action: 'buy', warehouse: wh, name: 'FOR SALE sign' }, examine: 'FOR SALE.' });
P('sign', 64, 70, { examine: '"PORT OF HALVERMOUTH. Authorised personnel only beyond this point. Unauthorised personnel: please be discreet."' });
// v0.20.0: the turning circles' monuments, and signs that say where roads go
P('statue', 106, 12, { label: 'A. HALVER', examine: 'A bronze of the city\'s founder, pointing sternly at the cliffs. Crown Street ends here; the ridge stairs climb to nowhere you can go.' });
P('fountain', 106, 60, { examine: 'The Mill Road fountain, at the gates of Founders Park. Turn round here.' });
P('statue', 106, 70, { label: 'FISHERMAN', examine: 'A fisherman in bronze, staring out to sea. The Quay Road turns round at his feet.' });
P('sign', 2, 11, { examine: '"HARBOURLINE CAR PARK — entrance on the left. Crown Street ends at the sea wall."' });
P('sign', 13, 3, { examine: '"RIDGE ROAD — joins Tanner St, Justice Way, Court St and Harbor St along the foot of the ridge."' });
P('sign', 110, 35, { examine: '"EAST GATE → Westbrook, Lanternside, the Ober Fields."' });
P('sign', 1, 59, { examine: '"MILL ROAD → Mill Road Yards."' });
// keep the carriageways and turning circles clear (lamps, crates and barrels moved to the pavement)
const ROADS = (x, y) => { const ch = m.rows()[y]?.[x]; return ch === '=' || (ch === 'm' && x >= 104 && (y <= 15 || (y >= 58 && y <= 63) || y >= 69)); };
for (let i = props.length - 1; i >= 0; i--) {
  const p = props[i];
  if (['crosswalk', 'statue', 'fountain'].includes(p.type) || p.interact) continue;
  if (ROADS(p.x, p.y)) props.splice(i, 1);
}

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
    { id: 'door_hv_north_a', x: 38, y: 0, keepTile: true, gateway: 'Lariat', label: 'FM 38 north, to Lariat', to: { map: 'lariat', spot: 'south_gate' } },
    { id: 'door_hv_north_b', x: 39, y: 0, keepTile: true, gateway: 'Lariat', label: 'FM 38 north, to Lariat', to: { map: 'lariat', spot: 'south_gate' } },
    { id: 'door_hv_yards_a', x: 0, y: 60, keepTile: true, gateway: 'Mill Road Yards', label: 'Mill Road west, to the Yards', to: { map: 'yards', spot: 'east_gate' } },
    { id: 'door_hv_yards_b', x: 0, y: 61, keepTile: true, gateway: 'Mill Road Yards', label: 'Mill Road west, to the Yards', to: { map: 'yards', spot: 'east_gate' } },
  ],
  spots: {
    north_gate: { x: 38, y: 2, facing: 'down' }, // v0.29.0: just inside the North Gate
    east_gate: { x: 109, y: 36, facing: 'left' },
    plaza_center: { x: 51, y: 31, facing: 'up' },
    hall_door_out: { x: 50, y: 24, facing: 'down' },
    police_door_out: { x: 71, y: 34, facing: 'down' },
    gunshop_door_out: { x: 69, y: 59, facing: 'down' },
    beaumont_door_out: { x: 106, y: 20, facing: 'down' },
    mill_road_west: { x: 1, y: 60, facing: 'right' },
    sumps_gate: { x: 16, y: 38, facing: 'down' },
    mission_front: { x: 22, y: 46, facing: 'up' },
    park_center: { x: 99, y: 49, facing: 'up' },
    docks_quay: { x: 70, y: 72, facing: 'down' },
    wh7_door_out: { x: 46, y: 69, facing: 'down' }, wh9_door_out: { x: 56, y: 69, facing: 'down' }, wh12_door_out: { x: 106, y: 69, facing: 'down' }, surplus_door_out: { x: 81, y: 69, facing: 'down' },
    // the Sumps: the Sums of Anarchy's turf, their customers' haunts and the corners where deals happen
    abacus_door_out: { x: 32, y: 58, facing: 'down' },
    abacus_bouncer: { x: 34, y: 59, facing: 'left' },
    sumps_corner: { x: 20, y: 53, facing: 'down' },
    sumps_fire_n: { x: 12, y: 43, facing: 'up' },
    sumps_fire_w: { x: 7, y: 50, facing: 'left' },
    sumps_fire_s: { x: 11, y: 58, facing: 'up' },
    sumps_fire_e: { x: 25, y: 48, facing: 'left' },
    sumps_fire_mill: { x: 22, y: 67, facing: 'up' },
    sumps_lane: { x: 5, y: 45, facing: 'down' },
    sumps_wreck: { x: 24, y: 46, facing: 'left' },
    sumps_tents: { x: 18, y: 49, facing: 'down' },
    sumps_tents_w: { x: 9, y: 53, facing: 'down' },
    sumps_mill_road: { x: 20, y: 61, facing: 'down' },
    sumps_south: { x: 15, y: 68, facing: 'down' },
    sumps_shore: { x: 12, y: 73, facing: 'down' },
    sumps_east: { x: 35, y: 66, facing: 'left' },
    sumps_fence: { x: 36, y: 48, facing: 'left' },
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
    { id: 'pd_couch', type: 'bench', x: 21, y: 1, color: '#6a4a3a', examine: 'A sagging office couch with a Lawrence-shaped dent in it. A cushion is embroidered "NAP TIME IS POLICE TIME".' },
    { id: 'pd_chief_cab', type: 'cabinet', x: 22, y: 5, examine: 'Reports, unread, filed under "LATER". There is no "NOW".' },
    { id: 'pd_chief_flag', type: 'flagpole', x: 15, y: 6, color: '#2a4a8a' },
    { id: 'pd_rug', type: 'rug', x: 16, y: 5, w: 4, h: 1, color: '#2a4a6a' },
    // bunks
    
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

// The Beaumont Motor Gallery (v0.16.0): a marble showroom of cars as art,
// Julian Beaumont's desk, and a lounge for clients (and Julian, after hours).
export const beaumontShowroom = {
  id: 'beaumont_showroom',
  name: 'Beaumont Motor Gallery',
  kind: 'interior',
  music: 'mus_manor',
  ambience: 'amb_indoor',
  owner: 'npc_julian',
  tiles: roomTiles(18, 11, 't', 9),
  doors: [{ id: 'door_beaumont_exit', x: 9, y: 10, to: { map: 'halvermouth', spot: 'beaumont_door_out' } }],
  spots: { entry: { x: 9, y: 9, facing: 'up' }, desk: { x: 14, y: 2, facing: 'down' }, lounge: { x: 3, y: 8, facing: 'right' }, chaise: { x: 15, y: 8, facing: 'left' } },
  props: [
    { id: 'bg_aurelia', type: 'car_display', model: 'aurelia', x: 1, y: 1, w: 3, h: 2, examine: 'The Beaumont Aurelia, in midnight blue. A card on a brass stand: "6,500. Enquire with Mr Beaumont."' },
    { id: 'bg_tempest', type: 'car_display', model: 'tempest', x: 6, y: 1, w: 3, h: 2, examine: 'The Halcyon Tempest GT. The walnut dashboard has been polished until you can see your bank balance in it.' },
    { id: 'bg_regent', type: 'car_display', model: 'regent', x: 2, y: 4, w: 4, h: 2, examine: 'The Sterling Regent limousine. There is a decanter in the back. It is full. It is always full.' },
    { id: 'bg_corsair', type: 'car_display', model: 'corsair', x: 8, y: 4, w: 3, h: 2, examine: 'The Vantaggio Corsair, red as an alarm. A card: "18,500. Please do not rev."' },
    { id: 'bg_desk', type: 'desk', x: 13, y: 1, w: 3, color: '#2a1e18', examine: 'Julian\'s desk: a fountain pen, a leather order book and a single orchid. No computer. "Computers," he says, "are for people who forget things."' },
    { id: 'bg_plant1', type: 'plant', x: 16, y: 1 }, { id: 'bg_plant2', type: 'plant', x: 1, y: 8 },
    { id: 'bg_sofa', type: 'bench', x: 4, y: 8, w: 2, examine: 'A leather chesterfield for clients "considering their options".' },
    { id: 'bg_chaise', type: 'bench', x: 16, y: 7, color: '#6a1f2a', examine: 'A velvet chaise longue in the back corner. Julian insists he never sleeps here.' },
    { id: 'bg_bar', type: 'counter', x: 13, y: 5, w: 3, examine: 'A little bar: sherry, champagne, and sparkling water "for the drivers".' },
    { id: 'bg_rug', type: 'rug', x: 7, y: 7, w: 4, h: 2, color: '#1e2a3f' },
    { id: 'bg_portrait', type: 'painting', x: 11, y: 0, examine: 'Three generations of Beaumonts, each beside a vehicle: a carriage, a motor car, and the Corsair. All three are wearing the same expression.' },
  ],
};

export const gunShop = {
  id: 'gun_shop',
  name: 'Pipecreek Armory',
  kind: 'interior',
  music: 'mus_workshop',
  ambience: 'amb_indoor',
  // the shop floor, and Lucas Eastrise's back room (east) where he sleeps among the inventory
  tiles: roomTiles(14, 10, 'f', 6, [[10, 1, 1, 4, 'W'], [10, 6, 1, 3, 'W']]),
  doors: [{ id: 'door_gunshop_exit', x: 6, y: 9, to: { map: 'halvermouth', spot: 'gunshop_door_out' } }],
  spots: { entry: { x: 6, y: 8, facing: 'up' }, counter_back: { x: 6, y: 2, facing: 'down' }, counter_front: { x: 6, y: 5, facing: 'up' }, lucas_bed: { x: 11, y: 3, facing: 'left' }, lucas_desk: { x: 12, y: 6, facing: 'up' } },
  props: [
    { id: 'gs_counter', type: 'display', variant: 'guns', x: 3, y: 4, w: 6, interact: { kind: 'shop', shop: 'shop_rook', staffed: true, name: 'gun counter', closed: 'Nobody at the counter. Lucas opens 09:00–19:00. The back-room door is ajar, and something in there is humming.' }, examine: 'A glass display counter of revolvers and pistols. Taped to the glass: "ASK ME ABOUT BUSINESS OPPORTUNITIES — L.E."' },
    { id: 'gs_bell', type: 'sign', x: 9, y: 4, examine: 'A brass bell and a card: "PIPECREEK ARMORY — Lucas Eastrise, prop. Licensed dealer. I see you. ;)" The winking face is hand-drawn. Twice.' },
    { id: 'gs_rack1', type: 'gunrack', x: 1, y: 1, w: 3, examine: 'Hunting rifles in a locked rack.' },
    { id: 'gs_rack2', type: 'gunrack', x: 7, y: 1, w: 3, examine: 'Shotguns in a locked rack. A sign: "Duck season. Rabbit season. NO gull season (city ordinance)."' },
    { id: 'gs_ammo', type: 'shelf', x: 1, y: 5, w: 1, h: 2, examine: 'Boxes of ammunition and a stern notice about storage.' },
    { id: 'gs_targets', type: 'painting', x: 5, y: 0, examine: 'A framed paper target. Every hole spells out a word. The word is "FREEDOM", misspelled.' },
    { id: 'gs_cabinet', type: 'cabinet', x: 9, y: 6, examine: 'Licence forms, and under them a stack of pamphlets: "THE MOON IS A FRANCHISE — wake up."' },
    { id: 'gs_rug', type: 'rug', x: 4, y: 6, w: 4, h: 1, color: '#5a3a2a' },
    // the back room
    
    { id: 'gs_crates', type: 'crate', x: 11, y: 8, w: 2, examine: 'Crates stencilled NOT GUNS. They are guns.' },
    { id: 'gs_corkboard', type: 'noticeboard', x: 12, y: 0, examine: 'A corkboard of newspaper clippings joined with red string. The string spells "INVEST". Pinned in the middle: a photo of you, from across the street. Recent.' },
  ],
};

// The Abacus: the Sums of Anarchy's bar and headquarters. Bar (south),
// a back hall with a pool table, the crew's bunk room (north-west) and
// Arthur Anderson's office (north-east).
export const abacus = {
  id: 'abacus',
  name: 'The Abacus',
  kind: 'interior',
  music: 'mus_workshop',
  ambience: 'amb_indoor',
  tiles: (() => {
    const rows = roomTiles(18, 12, 'f', 9, [[6, 1, 1, 2, 'W'], [6, 4, 1, 2, 'W'], [1, 6, 6, 1, 'W'], [11, 1, 1, 3, 'W'], [11, 5, 1, 1, 'W'], [11, 6, 6, 1, 'W']]).map((r) => r.split(''));
    for (let y = 1; y < 6; y++) for (let x = 12; x < 17; x++) rows[y][x] = 'c';
    return rows.map((r) => r.join(''));
  })(),
  doors: [{ id: 'door_abacus_exit', x: 9, y: 11, to: { map: 'halvermouth', spot: 'abacus_door_out' } }],
  spots: {
    entry: { x: 9, y: 10, facing: 'up' }, bar_back: { x: 4, y: 7, facing: 'down' }, bar_front: { x: 4, y: 9, facing: 'up' },
    table_a: { x: 12, y: 9, facing: 'right' }, table_b: { x: 15, y: 10, facing: 'up' }, pool: { x: 10, y: 3, facing: 'left' }, hall_couch: { x: 9, y: 5, facing: 'down' },
    arthur_desk: { x: 14, y: 2, facing: 'down' }, arthur_bed: { x: 15, y: 4, facing: 'right' }, arthur_visitor: { x: 13, y: 5, facing: 'up' },
    bunk_1: { x: 1, y: 3, facing: 'up' }, bunk_2: { x: 2, y: 3, facing: 'up' }, bunk_3: { x: 3, y: 3, facing: 'up' }, bunk_4: { x: 4, y: 3, facing: 'down' }, bunk_5: { x: 5, y: 3, facing: 'down' },
  },
  props: [
    { id: 'ab_counter', type: 'counter', x: 2, y: 8, w: 5, color: '#4a2a1e', interact: { kind: 'shop', shop: 'shop_sums', staffed: true, name: 'counter', closed: 'Nobody behind the counter. Minnie works 11:00–02:00.' }, examine: 'The bar. Taped under the till: a price list in perfect long-hand. Every price ends in .99. "Psychology," says a note in Arthur\'s handwriting.' },
    { id: 'ab_shelf', type: 'shelf', x: 1, y: 7, w: 1, h: 1, examine: 'Bottles. Behind them, neatly stacked, boxes and boxes of calculators.' },
    { id: 'ab_table1', type: 'table', x: 13, y: 9, examine: 'A sticky table. Someone has carved 2 + 2 = 5 into it. Someone else has carved "NO IT DOESN\'T — A.A."' },
    { id: 'ab_table2', type: 'table', x: 15, y: 8 },
    { id: 'ab_juke', type: 'wardrobe', x: 16, y: 10, color: '#8a2a2a', examine: 'A jukebox. Every song on it is about numbers. "Seven Nation Army". "99 Problems". "Mambo No. 5".' },
    { id: 'ab_pool', type: 'table', x: 8, y: 2, w: 2, h: 2, color: '#2a5a3a', examine: 'A pool table. The balls are numbered in binary.' },
    { id: 'ab_couch', type: 'bench', x: 7, y: 5, w: 2, color: '#6a3a2a' }, // Max sleeps beside it
    { id: 'ab_board', type: 'noticeboard', x: 9, y: 0, examine: 'A chalkboard: this week\'s takings by corner, to the penny. Underlined twice: "THE SUMPS LOOKS AFTER ITS OWN." Underlined three times: "NO COPS."' },
    // the crew's bunks
    
    
    // Arthur's office
    { id: 'ab_desk', type: 'desk', x: 13, y: 3, w: 3, color: '#3a1a14', examine: 'Arthur\'s desk: a ledger of grudges, a ledger of takings, and a third ledger that just says "LEDGERS". A desk calculator with the = key worn through.' },
    { id: 'ab_safe', type: 'cabinet', x: 16, y: 1, color: '#3a3a3e', examine: 'A safe. Painted on the door in red: "TOUCH THIS AND I WILL DO THE MATHS ON YOUR TEETH."' },
    
    { id: 'ab_portrait', type: 'painting', x: 13, y: 0, examine: 'A framed photo of a very young Arthur at a school maths fair, holding a trophy. He is scowling.' },
  ],
};

// --------------------------------------------------- warehouses (v0.12.0)
// Concrete floors you build on. Fixed fittings: the input bay (deliveries and
// parts you drop off), the output crate (finished goods) and the workbench
// (hand-crafting). Everything else is placed by the player (src/systems/factory.js).
const warehouse = (id, name, w, h, o = {}) => ({
  id,
  name,
  kind: 'interior',
  warehouse: id,
  music: 'mus_workshop',
  ambience: 'amb_indoor',
  tiles: roomTiles(w, h, 'g', Math.floor(w / 2)),
  doors: [{ id: `door_${id}_exit`, x: Math.floor(w / 2), y: h - 1, to: { map: 'halvermouth', spot: `${id}_door_out` } }],
  spots: { entry: { x: Math.floor(w / 2), y: h - 2, facing: 'up' } },
  // the tile inside the door is kept clear so you can always get out
  keepClear: [[Math.floor(w / 2), h - 2]],
  props: [
    { id: `${id}_inbay`, type: 'loadingbay', x: 1, y: 1, w: 2, h: 2, interact: { kind: 'container', container: `ct_${id}_in`, name: 'input bay' }, examine: 'The input bay. Sal\'s deliveries land here at 07:00 — and you can drop parts in by hand.' },
    { id: `${id}_outbin`, type: 'outbin', x: w - 3, y: 1, w: 2, h: 2, interact: { kind: 'container', container: `ct_${id}_out`, name: 'output crate' }, examine: 'The output crate. Finished calculators end up here.' },
    { id: `${id}_bench`, type: 'workbench', x: 4, y: 1, w: 3, h: 1, interact: { kind: 'factory', action: 'workbench', warehouse: id, name: 'workbench' }, examine: 'A scarred workbench with a soldering iron, a vice and a magnifying lamp. Craft by hand here; press B to build machinery.' },
    { id: `${id}_board`, type: 'noticeboard', x: Math.floor(w / 2) - 1, y: 0, examine: o.board || 'A chalkboard for production notes. It\'s blank. For now.' },
    ...(o.props || []),
  ],
});
export const wh7 = warehouse('wh7', 'Warehouse 7', 16, 11, { board: 'Chalked by the last tenant: "THE TICKING IS THE PIPES. PROBABLY."' });
export const wh9 = warehouse('wh9', 'Pier 9 Shed', 20, 13, { board: 'Fishing nets on hooks, and a faded tide table for a year long gone.' });
export const wh12 = warehouse('wh12', 'The Old Cannery', 26, 15, { board: '"NORTHBANK SARDINE CO. — 1,000,000 TINS AND COUNTING." The counter stopped at 412,077.' });

// Sal's Surplus Electronics: parts, machinery and delivery contracts.
export const surplus = {
  id: 'surplus',
  name: 'Sal\'s Surplus Electronics',
  kind: 'interior',
  music: 'mus_workshop',
  ambience: 'amb_indoor',
  tiles: roomTiles(12, 9, 'f', 6, [[8, 1, 1, 2, 'W']]),
  doors: [{ id: 'door_surplus_exit', x: 6, y: 8, to: { map: 'halvermouth', spot: 'surplus_door_out' } }],
  spots: { entry: { x: 6, y: 7, facing: 'up' }, counter_front: { x: 4, y: 5, facing: 'up' }, counter_back: { x: 4, y: 3, facing: 'down' }, back_cot: { x: 9, y: 2, facing: 'right' } },
  props: [
    { id: 'sp_counter', type: 'counter', x: 2, y: 4, w: 5, color: '#3a4a2a', interact: { kind: 'shop', shop: 'shop_surplus', staffed: true, name: 'counter', closed: 'Nobody at the counter. Sal works 08:00–20:00.' }, examine: 'A counter buried in bins of keypads, screens and loose batteries.' },
    { id: 'sp_shelf1', type: 'shelf', x: 1, y: 1, w: 3, h: 1, examine: 'Shelves of LCD screens, each one reading 8.8.8.8.8.8.8.8.' },
    { id: 'sp_shelf2', type: 'shelf', x: 5, y: 1, w: 2, h: 1, examine: 'Boxes labelled CASINGS (PINK), CASINGS (GREY), CASINGS (??).' },
    { id: 'sp_machines', type: 'crate', x: 1, y: 6, w: 2, examine: 'Crated machinery: a soldering station, a case press, coils of conveyor belt. "ASK SAL," says a sticker.' },
    
    { id: 'sp_sign', type: 'sign', x: 9, y: 6, examine: '"SAL\'S SURPLUS — If it beeps, I\'ve got it. If it doesn\'t beep, I\'ve probably got it. No questions asked; no answers given."' },
  ],
};

export default [halvermouth, hallOfJustice, policeStation, jail, gunShop, beaumontShowroom, abacus, wh7, wh9, wh12, surplus];
