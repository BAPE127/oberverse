// The Crown Quarter (v0.93.1) — Sund's capital district, a new region through the Crown Gate off Crown Street in Halvermouth
// (Halvermouth keeps every shop and road; nothing is demolished). Coordinates are final (roads 4 wide). Preview: `npm run map -- crown_quarter`.
//
//   Palace Road (y 36–39) runs across the map; north of it Crown Park and the Royal Pavilion, Halver House (the Presidency) and the Assembly.
//   South of it Sovereign Square (fountain, flagpoles, a demonstration ground), staff flats to the west and the six ministries to the east.
//   Sovereign Way (x 92–95) runs south from the square to Embassy Row (y 89–92) and the Crown Gate Road (y 107–110), which leaves west by the gate.
//   Embassy Row's two blocks: ten embassies and the Free Ports Mission (west); the party headquarters, the press hall, a hotel, a café and a club (east).
//
// Halver House is the one building here with a real interior (src/content/maps/halverHouse.js). Every other building has a locked door and a
// plain room behind it, generated on its footprint, and a sign that says what it is: they open with the People release (ambassadors and staff).
import { MapBuilder } from '../../world/mapBuilder.js';
import { HALVER_HOUSE } from './halverHouse.js';

const W = 180;
const H = 120;
const m = new MapBuilder(W, H, ',');

// ---------------------------------------------------------------- the ground
m.rect(2, 2, 58, 32, '.'); // Crown Park
m.rect(36, 41, 104, 34, 'm'); // Sovereign Square
m.rect(0, 35, W, 1, ',').rect(0, 40, W, 1, ','); // Palace Road's pavements
m.rect(0, 36, W, 4, '='); // Palace Road
m.rect(91, 75, 1, 36, ',').rect(96, 75, 1, 36, ','); // Sovereign Way's pavements
m.rect(92, 75, 4, 36, '='); // Sovereign Way, up to the square
m.rect(0, 88, W, 1, ',').rect(0, 93, W, 1, ','); // Embassy Row's pavements
m.rect(0, 89, W, 4, '='); // Embassy Row
m.rect(0, 106, W, 1, ',').rect(0, 111, W, 1, ','); // the Crown Gate Road's pavements
m.rect(0, 107, W, 4, '='); // the Crown Gate Road
// the road ends: Palace Road and Embassy Row finish in turning circles at both ends, the Gate Road in one at its east end (paving, not a wall)
m.rect(0, 35, 8, 6, 'm').rect(172, 35, 7, 6, 'm'); // Palace Road's circles
m.rect(0, 88, 8, 6, 'm').rect(172, 88, 7, 6, 'm'); // Embassy Row's circles
m.rect(172, 106, 7, 6, 'm'); // the Gate Road's east circle
for (const [x0, x1, y] of [[0, 7, 36], [172, 178, 36], [0, 7, 89], [172, 178, 89], [172, 178, 107]]) m.rect(x0, y, x1 - x0 + 1, 4, 'm'); // the road itself gives way to the circle
m.rect(0, 0, 1, 107, 'r').rect(0, 111, 1, 9, 'r'); // the district wall (the Crown Gate at rows 107–110)
m.rect(W - 1, 0, 1, H, 'r');
m.rect(0, 0, W, 1, 'R');
m.rect(0, H - 1, W, 1, 'R');
// the demonstration ground in front of the Assembly, and the paths of the park
m.rect(120, 41, 19, 2, ',');
m.rect(30, 14, 1, 21, ':').rect(10, 24, 40, 1, ':').rect(14, 14, 1, 11, ':');

// ---------------------------------------------------------------- buildings
const B = (id, name, x, y, w, h, o = {}) => ({
  id, name, mapLabel: o.label ?? name, x, y, w, h,
  roof: o.roof || '#8a8478', wall: o.wall || '#d8d2c4', trim: o.trim || '#4a4438', sign: o.sign, signColor: o.signColor, flatRoof: o.flatRoof ?? true, columns: o.columns, tower: o.tower, trade: o.trade,
  door: o.door ?? { x: x + Math.floor(w / 2), y: y + h - 1, lock: { key: 'item_none', message: o.closed || `${name}: the doors are locked. "Not yet open to visitors."` } },
});
const shut = (name, what) => `${name.toUpperCase()}. ${what} The doors are locked: it opens when its staff arrive.`;
const embassy = (id, name, country, x, y, w, h, o = {}) => B(`cq_embassy_${id}`, name, x, y, w, h, { label: country, sign: country.toUpperCase(), trade: 'office', roof: o.roof || '#6a7a9a', wall: o.wall || '#d8dce6', signColor: o.signColor || '#e8e8f0', closed: shut(name, 'A flag, a brass plate, a camera and a very polite silence.'), ...o });
const buildings = [
  // --- the north side of Palace Road
  { ...B('cq_halver_house', 'Halver House', 80, 3, HALVER_HOUSE.w, HALVER_HOUSE.h, { label: 'Halver House', sign: 'HALVER HOUSE · OFFICE OF THE PRESIDENT', signColor: '#e8d8a8', roof: '#8a7a5a', wall: '#ece2c8', trim: '#4a3e28', columns: true, flatRoof: false, tower: 4,
    door: { x: 80 + HALVER_HOUSE.dx, y: 3 + HALVER_HOUSE.h - 1, to: { map: 'halver_house', spot: 'entry' }, lock: { key: 'item_none', hours: { from: '08:00', to: '18:00' }, message: 'HALVER HOUSE. Public hours 08:00–18:00. A guard behind glass: "Come back in the morning."' } } }) },
  B('cq_assembly', 'The Assembly', 126, 5, 36, 30, { sign: 'THE ASSEMBLY', signColor: '#e8d8a8', roof: '#8a7a3a', wall: '#e4d49a', trim: '#4a4020', columns: true, trade: 'office', closed: shut('The Assembly', 'The chamber where a hundred seats say yes or no.') }),
  B('cq_pavilion', 'The Royal Pavilion', 30, 15, 20, 20, { sign: 'ROYAL PAVILION', signColor: '#f0e0f0', roof: '#9a7aa0', wall: '#ece0ee', trim: '#5a3a60', flatRoof: false, trade: 'office', closed: shut('The Royal Pavilion', 'Where the boy king stays when he visits the capital (he is eleven and very serious).') }),
  // --- the west of Sovereign Square: staff flats and the civil service
  B('cq_staff_a', 'Staff Flats (A block)', 4, 42, 11, 12, { sign: 'STAFF FLATS A', wall: '#dcc2a0', roof: '#8a6a4a', trade: 'house', closed: shut('Staff Flats A', 'Homes of the government\'s staff.') }),
  B('cq_staff_b', 'Staff Flats (B block)', 18, 42, 11, 12, { sign: 'STAFF FLATS B', wall: '#dcc2a0', roof: '#8a6a4a', trade: 'house', closed: shut('Staff Flats B', 'Homes of the government\'s staff.') }),
  B('cq_civil_service', 'Civil Service Residences', 4, 57, 25, 14, { sign: 'CIVIL SERVICE RESIDENCES', wall: '#d8b898', roof: '#7a5a3a', trade: 'house', closed: shut('The Civil Service Residences', 'Long corridors, small rooms, and a notice about the kettle.') }),
  // --- the ministries (east of the square)
  ...[['treasury', 'Ministry of the Treasury', 'TREASURY', 142, 42], ['defence', 'Ministry of Defence & Security', 'DEFENCE & SECURITY', 155, 42], ['interior', 'Ministry of the Interior & Police', 'INTERIOR & POLICE', 168, 42],
    ['agriculture', 'Ministry of Agriculture & Trade', 'AGRICULTURE & TRADE', 142, 58], ['foreign', 'Ministry of Foreign Affairs', 'FOREIGN AFFAIRS', 155, 58], ['records', 'The Public Records Office', 'PUBLIC RECORDS', 168, 58],
  ].map(([id, name, sign, x, y]) => B(`cq_min_${id}`, name, x, y, 11, 12, { sign, wall: '#d8cfa8', roof: '#7a7048', trim: '#4a4228', trade: 'office', closed: shut(name, 'Behind the door: forms, stamps and a queue that has not formed yet.') })),
  // --- Embassy Row, west of Sovereign Way: the first block
  embassy('ostmark', 'The Ostmark Union — Embassy', 'Ostmark Union', 4, 76, 18, 12, { roof: '#5a7ab8', wall: '#c8d8f0' }),
  embassy('varn', 'Varnistan — Embassy', 'Varnistan', 25, 76, 14, 12, { roof: '#a87a3a', wall: '#e8d4b0' }),
  embassy('teshvar', 'Teshvar — Embassy', 'Teshvar', 42, 76, 16, 12, { roof: '#c8a830', wall: '#f0e4a8', signColor: '#5a4a10' }),
  embassy('lirre', 'The Grand Duchy of Lirre — Embassy', 'Lirre (neutral)', 61, 76, 13, 12, { roof: '#9a9ab8', wall: '#e4e4f0' }),
  embassy('westreach', 'The Westreach League — Embassy', 'Westreach', 76, 76, 11, 12, { roof: '#b87a9a', wall: '#f0d8e4' }),
  // --- Embassy Row, the second block
  embassy('caldera', 'The Republic of Caldera — Embassy', 'Caldera', 4, 94, 12, 12, { roof: '#b85a4a', wall: '#f0d4cc' }),
  embassy('pallas', 'The Free State of Pallas — Embassy', 'Pallas', 19, 94, 12, 12, { roof: '#9a5ab0', wall: '#e8d4f0' }),
  embassy('morrow', 'The Morrow Isles — Embassy', 'Morrow Isles', 34, 94, 12, 12, { roof: '#3aa898', wall: '#cce8e4' }),
  B('cq_free_ports', 'The Free Ports Mission', 49, 94, 18, 12, { label: 'Free Ports Mission', sign: 'FREE PORTS MISSION', trade: 'office', roof: '#7a7e86', wall: '#d8dade', closed: shut('The Free Ports Mission', 'One office for every free territory that is not a country: no flag, no army, plenty of contracts.') }),
  embassy('sunmouth', 'The Sunmouth Isthmus Compact — Embassy', 'Sunmouth', 69, 94, 11, 12, { roof: '#9ab83a', wall: '#e8f0cc' }),
  embassy('dunmere', 'The Free Harbour of Dunmere — Embassy', 'Dunmere', 82, 94, 8, 12, { roof: '#b89a6a', wall: '#f0e4d0' }),
  // --- east of Sovereign Way: parties, the press and the hotel
  B('cq_order_hq', 'Order Party Headquarters', 100, 76, 14, 12, { sign: 'THE ORDER PARTY', signColor: '#f0e0e0', roof: '#8a2a30', wall: '#d8a8a8', trade: 'office', closed: shut('The Order Party headquarters', 'Posters of a stern face, and a clenched jaw on every one.') }),
  B('cq_liberty_hq', 'Liberty League Headquarters', 117, 76, 14, 12, { sign: 'THE LIBERTY LEAGUE', signColor: '#e0eef8', roof: '#2a5a9a', wall: '#a8c4e0', trade: 'office', closed: shut('The Liberty League headquarters', 'Posters of a smiling face and an unlocked door.') }),
  B('cq_press_hall', 'The Press Hall', 134, 76, 17, 12, { sign: 'PRESS HALL · BRIEFINGS · NEWSROOM', roof: '#7a5a90', wall: '#d8c8e4', trade: 'office', closed: shut('The Press Hall', 'Briefings at noon and a newsroom that never closes.') }),
  B('cq_hotel', 'The Crown Hotel', 100, 94, 22, 12, { sign: 'THE CROWN HOTEL', signColor: '#f0e8c8', roof: '#4a7a58', wall: '#c8e0c8', trade: 'hotel', closed: shut('The Crown Hotel', 'Lobby, bar and rooms for visiting delegations.') }),
  B('cq_cafe', 'Café Concord & The Sitting Room', 125, 94, 14, 12, { sign: 'CAFÉ CONCORD', signColor: '#f8ead0', roof: '#c8782a', wall: '#f0d8b0', trade: 'diner', closed: shut('Café Concord', 'Where the two parties are never seen at the same table. The Sitting Room (restaurant) is behind.') }),
  B('cq_club', 'The Diplomats\' Club & Tourist Shops', 142, 94, 20, 12, { sign: 'DIPLOMATS\' CLUB', roof: '#c8782a', wall: '#f0d8b0', trade: 'shop', closed: shut('The Diplomats\' Club', 'Members only, and the tourist shops on the ground floor, which are shut for the same reason.') }),
];

// ---------------------------------------------------------------- props
const props = [];
let n = 0;
const P = (type, x, y, o = {}) => props.push({ id: `cq_${type}_${n++}`, type, x, y, ...o });
// --- the way in: the Crown Gate and the district
P('bigsign', 3, 112, { w: 3, h: 2, text: 'THE CROWN QUARTER', sub: 'SUND · SEAT OF GOVERNMENT', examine: 'THE CROWN QUARTER. "Seat of government. Please have your business ready. Photography of the Presidency is permitted from the Square."' });
P('booth', 13, 106, { examine: 'The Crown Gate checkpoint. A guard in a very clean cap, a logbook, and a notice: "ALL VISITORS WELCOME. ALL VISITORS COUNTED."' });
P('boom_barrier', 10, 107, { w: 1, h: 4, raised: true, solid: false, examine: 'The Crown Gate barrier. It lifts for anyone who is going somewhere sensible. For now, that is everyone.' });
P('sign', 16, 112, { examine: 'CROWN GATE. "Halvermouth, west. Sovereign Square, ahead. Embassy Row, left and right. The hotel does not have a lift."' });
P('roadsign', 7, 112, { w: 4, h: 2, text: '← HALVERMOUTH', sub: 'CROWN STREET · THE COAST', examine: 'WEST — THE CROWN GATE, CROWN STREET AND HALVERMOUTH.' });
// --- the palace checkpoint
P('booth', 101, 40, { examine: 'The palace checkpoint: a booth, a camera on a pole and a sign pointing at Halver House: "PUBLIC HOURS 08:00–18:00. NO PHOTOGRAPHY OF THE GUARDS (THEY ARE SHY)".' });
P('boom_barrier', 97, 36, { w: 1, h: 4, raised: true, solid: false, examine: 'The palace checkpoint barrier. Raised in the day; the guards say it "reflects the mood of the nation".' });
// --- Crown Park
for (const [x, y] of [[6, 5], [12, 8], [20, 4], [26, 10], [8, 18], [16, 20], [24, 28], [34, 6], [40, 4], [46, 9], [52, 6], [56, 14], [54, 26], [54, 31], [6, 30], [52, 12]]) P('tree', x, y);
P('fountain', 20, 14, { w: 3, h: 3, examine: 'A fountain in Crown Park. A plaque: "Presented by the Grateful Fishermen of Kingsfjord, who were told it was a boat."' });
for (const [x, y] of [[13, 23], [27, 23], [11, 27], [53, 22]]) P('bench', x, y);
P('statue', 54, 18, { w: 2, h: 3, label: 'THE FIRST PRESIDENT', examine: 'A bronze of the first President of Sund, one hand raised, the other holding a speech that is turned the wrong way up. The plaque says "ORDER", underneath, in chalk, "LIBERTY".' });
P('flowerbed', 12, 33); P('flowerbed', 16, 33); P('flowerbed', 20, 33);
P('noticeboard', 6, 24, { examine: 'CROWN PARK. "Dogs on leads. The King\'s Walk is open to the public on Thornday afternoons. Do not feed the guards."' });
// --- the Royal Pavilion
P('flagpole', 34, 35, { color: '#9a7aa0' }); P('flagpole', 46, 35, { color: '#9a7aa0' });
P('sign', 38, 35, { examine: 'THE ROYAL PAVILION. "The King of Sund stays here when he is in the capital. He is eleven. He has asked that visitors wipe their feet."' });
// --- Halver House and the Assembly
for (const x of [84, 90, 108, 114]) P('flagpole', x, 35, { color: '#8a2a30' });
for (const x of [130, 136, 152, 158]) P('flagpole', x, 35, { color: '#8a7a3a' });
P('bigsign', 102, 35, { w: 2, h: 1, text: 'HALVER HOUSE', sub: 'OFFICE OF THE PRESIDENT', examine: 'HALVER HOUSE — the Office of the President. Public hall open 08:00–18:00.' });
P('bench', 128, 40); P('bench', 134, 40);
P('noticeboard', 126, 35, { examine: 'THE ASSEMBLY: "Bills this week: none. The Assembly will sit when a bill exists. (A hundred seats, one yes, one no.)"' });
// --- Sovereign Square
P('fountain', 85, 56, { w: 4, h: 4, examine: 'The fountain of Sovereign Square: four stone fish spitting at one another. The Square is where the capital argues, celebrates and, occasionally, sits down.' });
for (const [x, y] of [[44, 44], [60, 44], [76, 44], [100, 44], [116, 44], [132, 44], [44, 70], [60, 70], [76, 70], [100, 70], [116, 70], [132, 70]]) P('flagpole', x, y, { color: '#c8c0a8' });
for (const [x, y] of [[50, 58], [70, 52], [102, 52], [122, 58], [108, 66], [64, 66]]) P('bench', x, y);
P('noticeboard', 90, 45, { examine: 'SOVEREIGN SQUARE: "Demonstrations permitted on the north-east ground, 10:00–16:00, with a form. Pigeons permitted everywhere."' });
P('sign', 120, 44, { examine: 'THE DEMONSTRATION GROUND. "Peaceful assembly: yes. Fireworks: no. Whistling at the guards: discouraged."' });
P('sign', 38, 72, { examine: 'THE PRESS LINE. A rope, a row of chalk marks and a sign: "REPORTERS WAIT HERE. WE KNOW YOU WON\'T."' });
// --- the road ends
for (const [x, y] of [[7, 35], [7, 40], [172, 35], [172, 40], [7, 88], [7, 93], [172, 88], [172, 93], [172, 106], [172, 111]]) P('bollard', x, y);
// --- Embassy Row
for (let x = 6; x < 166; x += 14) { P('streetlamp', x, 88); P('streetlamp', x + 7, 93); }
for (let x = 6; x < 166; x += 14) { P('streetlamp', x, 35); P('streetlamp', x + 7, 40); }
for (let x = 14; x < 170; x += 14) { P('streetlamp', x, 106); P('streetlamp', x + 7, 111); }
for (const y of [77, 83, 95, 101]) { P('streetlamp', 91, y); P('streetlamp', 96, y + 3); }
for (const [x, y, c] of [[6, 88, '#5a7ab8'], [27, 88, '#a87a3a'], [44, 88, '#c8a830'], [63, 88, '#9a9ab8'], [78, 88, '#b87a9a']]) P('flagpole', x, y, { color: c });
for (const [x, y, c] of [[6, 106, '#b85a4a'], [21, 106, '#9a5ab0'], [36, 106, '#3aa898'], [71, 106, '#9ab83a'], [84, 106, '#b89a6a']]) P('flagpole', x, y, { color: c });
P('sign', 48, 93, { examine: 'EMBASSY ROW. "Ten embassies and a Free Ports Mission. The Lirre embassy is neutral. It would like you to know it is neutral."' });
P('sign', 98, 106, { examine: 'CROWN GATE ROAD, WEST. THE CROWN HOTEL, EAST. "Tourists: the Diplomats\' Club sells postcards of buildings that are all the same."' });
for (const [x, y] of [[100, 88], [127, 88], [146, 88], [112, 111]]) P('bench', x, y);

/** Spots used by schedules and doors: the front step of each building is `<id>_out`, made when the interiors are laid. */
export const crownQuarter = {
  id: 'crown_quarter',
  name: 'The Crown Quarter',
  kind: 'outdoor',
  music: { day: 'mus_civic', night: 'mus_civic' },
  ambience: 'amb_city',
  tiles: m.rows(),
  areas: [
    { id: 'area_cq_park', name: 'Crown Park', x: 1, y: 1, w: 59, h: 34 },
    { id: 'area_cq_palace', name: 'Palace Road', x: 0, y: 35, w: 180, h: 6 },
    { id: 'area_cq_square', name: 'Sovereign Square', x: 36, y: 41, w: 104, h: 34 },
    { id: 'area_cq_ministries', name: 'The Ministries', x: 140, y: 41, w: 39, h: 33 },
    { id: 'area_cq_staff', name: 'Staff Quarter', x: 1, y: 41, w: 35, h: 34 },
    { id: 'area_cq_embassy', name: 'Embassy Row', x: 1, y: 75, w: 90, h: 36 },
    { id: 'area_cq_parties', name: 'Party Row', x: 97, y: 75, w: 82, h: 36 },
    { id: 'area_cq_gate', name: 'The Crown Gate', x: 1, y: 106, w: 179, h: 14 },
  ],
  buildings,
  doors: [
    ...[107, 108, 109, 110].map((y, i) => ({ id: `door_cq_gate_${i}`, x: 0, y, keepTile: true, gateway: 'Halvermouth', label: 'The Crown Gate, west to Halvermouth', to: { map: 'halvermouth', spot: 'crown_gate' } })),
  ],
  spots: {
    west_gate: { x: 2, y: 108, facing: 'right' },
    gate_booth: { x: 12, y: 106, facing: 'down' },
    palace_checkpoint: { x: 99, y: 41, facing: 'up' },
    halver_house_steps: { x: 99, y: 35, facing: 'up' },
    square_fountain: { x: 88, y: 61, facing: 'up' },
    press_line: { x: 40, y: 73, facing: 'right' },
    demonstration: { x: 128, y: 46, facing: 'left' },
    embassy_row: { x: 48, y: 90, facing: 'down' },
    park_bench: { x: 28, y: 24, facing: 'down' },
  },
  props,
};

export const CROWN_QUARTER_REGION = { name: 'The Crown Quarter', maps: { crown_quarter: { x: 0, y: 0, fallbackSpot: 'west_gate' } } };
export default [crownQuarter];
