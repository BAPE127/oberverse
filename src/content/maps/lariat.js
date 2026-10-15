// Lariat (v0.29.0; streets rebuilt in v0.29.1) — a small Texas farming town
// north of Halvermouth, up Farm-to-Market Road 38 from the city's North Gate.
//
// The town is a grid of four-lane streets with pavements, like the city's:
//   FM 38 (x 72–75) runs north–south through the middle, from the ranch-gate
//   arch at the south edge up to the Hollister and windmill lanes;
//   Pecan Street (y 24–27, houses), Main Street (y 40–43, shops), Cotton
//   Street (y 57–60, the diner, Red Dirt, the square) and Dairy Road /
//   Mesquite Lane (y 74–77, the school, Chuckie's Cheese, more houses) cross it;
//   Church Street (x 20–23) and East Street (x 128–131) close the blocks.
// Traffic lights at FM 38 & Main and FM 38 & Cotton (src/content/transit.js).
// Around the town: Chuckie's Cheese (south-west), the rodeo grounds and the
// church (west), the old windmill (north-west), the Hollister farm (north-
// east), the Co-op, Caddo Creek down the east side, and the land for sale
// (south-east). Fields are drawn into the ground layer from `fields`.
// Coordinates are in tiles (authored at full width: roads are already 4 wide).
// Preview with `npm run map -- lariat`.
import { MapBuilder, roomTiles } from '../../world/mapBuilder.js';

const W = 150;
const H = 110;
const m = new MapBuilder(W, H, '.');

// ---------------------------------------------------------------- pavements (roads are laid over them)
m.rect(19, 23, 53, 1, ',').rect(19, 28, 53, 1, ','); // Pecan Street
m.rect(19, 23, 1, 40, ',').rect(24, 23, 1, 40, ','); // Church Street
m.rect(71, 23, 1, 56, ',').rect(76, 23, 1, 56, ','); // FM 38 through town
m.rect(2, 38, 131, 2, ',').rect(19, 44, 114, 2, ','); // Main Street (north side runs on past the church)
m.rect(19, 56, 114, 1, ',').rect(19, 61, 114, 2, ','); // Cotton Street
m.rect(127, 38, 1, 41, ',').rect(132, 38, 1, 41, ','); // East Street
m.rect(49, 73, 84, 1, ',').rect(49, 78, 84, 1, ','); // Dairy Road and Mesquite Lane
// ---------------------------------------------------------------- roads
m.rect(72, 4, 4, H - 4, '='); // FM 38
m.rect(20, 24, 52, 4, '='); // Pecan Street
m.rect(20, 24, 4, 37, '='); // Church Street
m.rect(20, 40, 112, 4, '='); // Main Street
m.rect(20, 57, 112, 4, '='); // Cotton Street
m.rect(128, 40, 4, 38, '='); // East Street
m.rect(49, 74, 83, 4, '='); // Dairy Road (west of FM 38) and Mesquite Lane (east)
// ---------------------------------------------------------------- lots, yards and lanes
m.rect(10, 8, 62, 2, ':'); // Windmill Lane
m.rect(76, 8, 60, 2, ':'); // the Hollister lane
m.rect(77, 10, 12, 14, 'g'); // the Hollister farmyard
m.rect(113, 10, 3, 14, ':'); // the track between the Hollister fields
m.rect(77, 26, 34, 4, 'g'); // the loading lot behind Feed & Seed and Ag Repair
m.rect(112, 28, 15, 10, 'g'); // the Co-op yard
m.rect(96, 46, 15, 10, 'g'); // Red Dirt's equipment lot
m.rect(112, 46, 15, 1, 'm').rect(112, 54, 15, 1, 'm').rect(112, 46, 1, 9, 'm').rect(126, 46, 1, 9, 'm'); // Lariat Square: the walk round it
m.rect(118, 47, 3, 7, 'm').rect(113, 49, 13, 3, 'm'); // ...and across it
m.rect(4, 47, 13, 12, ':').rect(17, 52, 2, 2, ':'); // the rodeo arena, and its way in from Church Street
m.rect(4, 63, 45, 18, 'g'); // Chuckie's Cheese: the working yard
m.rect(24, 81, 12, 10, ':'); // the lead cows' paddock (dirt)
m.rect(42, 81, 2, 5, ':'); // the path down to Chuckie's house
m.rect(58, 79, 2, 3, ':'); // the gate into the silage corn
m.rect(76, 93, 59, 3, ':').rect(105, 81, 3, 12, ':'); // the farm tracks between the plots for sale
// path from each door to the pavement is added with the buildings below
// ---------------------------------------------------------------- fields (drawn from `fields`, see below)
const fields = [
  { id: 'hollister_cotton', x: 90, y: 12, w: 22, h: 12, crop: 'cotton', stage: 3 },
  { id: 'hollister_sorghum', x: 116, y: 12, w: 19, h: 12, crop: 'sorghum', stage: 3 },
  { id: 'chuckie_corn', x: 50, y: 82, w: 19, h: 22, crop: 'corn', stage: 3 },
  { id: 'plot_east_1', x: 78, y: 81, w: 27, h: 12, crop: 'fallow' },
  { id: 'plot_east_2', x: 108, y: 81, w: 27, h: 12, crop: 'fallow' },
  { id: 'plot_east_3', x: 78, y: 96, w: 57, h: 11, crop: 'fallow' },
];
for (const f of fields) m.rect(f.x, f.y, f.w, f.h, 'k');
// ---------------------------------------------------------------- Caddo Creek, down the east side
const creekX = (y) => 140 + Math.round(2 * Math.sin(y / 9) + Math.sin(y / 4));
for (let y = 0; y < H; y++) m.rect(creekX(y) - 1, y, 3, 1, '~');
const BAR = 17; // a sandbar off the west bank (Duchess keeps watch from it)
for (let y = BAR - 1; y <= BAR + 1; y++) m.rect(creekX(y) - 1, y, 2, 1, 's');

// ---------------------------------------------------------------- buildings
const B = (id, name, x, y, w, h, o = {}) => ({
  id, name, mapLabel: o.label ?? name, x, y, w, h,
  roof: o.roof || '#8a4a32', wall: o.wall || '#e8d8b8', trim: o.trim || '#5a3a2a', sign: o.sign, signColor: o.signColor, flatRoof: o.flatRoof, awning: o.awning, shabby: o.shabby, columns: o.columns,
  door: o.door,
});
const closed = (msg) => ({ message: msg });
const house = (id, x, y, roof, wall, who) => B(id, 'House', x, y, 7, 5, { roof, wall, label: '', door: { x: x + 3, y: y + 4, lock: closed(who) } });
const buildings = [
  // Pecan Street: houses on the north side, front walks down to the pavement
  house('b_house_1', 25, 17, '#6a4a3a', '#f0e6d2', 'The Pruett house. A wreath of dried cotton on the door, and a note: "At the diner."'),
  house('b_house_2', 34, 17, '#3a4a6a', '#e6dcc8', 'A neat blue house. Nobody answers; a dog inside barks once, for form\'s sake.'),
  house('b_house_3', 43, 17, '#5a6a3a', '#f2e8d8', 'The Calloways\'. Three spanners on the porch rail and a sign: "BACK AT THE SHOP."'),
  house('b_house_4', 52, 17, '#7a3a2a', '#e8dcc4', 'A brick-red house with a porch swing. The swing creaks. The door doesn\'t open.'),
  house('b_house_5', 61, 17, '#4a5a5a', '#efe6d6', 'The pastor\'s house. "Sunday 10am. All welcome. Cows by arrangement."'),
  // Main Street, north side (doors open onto the pavement)
  B('b_church', 'First Baptist Church of Lariat', 5, 28, 11, 10, { roof: '#5a5a62', wall: '#f4efe4', trim: '#3a3a42', sign: 'FIRST BAPTIST', columns: true, door: { x: 10, y: 37, lock: closed('FIRST BAPTIST CHURCH OF LARIAT. "Services Sunday 10am. Potluck after. Bring a dish — Chuckie is bringing cheese again."') } }),
  B('b_post_office', 'Lariat Post Office', 26, 31, 8, 7, { roof: '#3a4a6a', wall: '#e8dcc8', sign: 'U.S. MAIL · LARIAT', flatRoof: true, door: { x: 29, y: 37, lock: closed('LARIAT POST OFFICE. "Window closed. Parcels for Chuckie\'s Cheese: leave on the bench. Parcels FROM Chuckie\'s Cheese: open a window."') } }),
  B('b_bank', 'Lariat State Bank', 36, 31, 7, 7, { roof: '#5a4a3a', wall: '#ece4d4', sign: 'STATE BANK', flatRoof: true, columns: true, door: { x: 39, y: 37, lock: closed('LARIAT STATE BANK. Est. 1911. "Closed for the afternoon. Loans: ask about our Farm & Ranch rates when the Land Office opens."') } }),
  B('b_mercantile', 'Lariat Mercantile', 44, 30, 12, 8, { roof: '#7a2a24', wall: '#e8d8b8', sign: 'LARIAT MERCANTILE', awning: '#c8402a', door: { x: 49, y: 37, to: { map: 'mercantile', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_opal'], hours: { from: '07:00', to: '20:00' } } } }),
  B('b_land_office', 'Lariat Land Office', 58, 32, 8, 6, { roof: '#4a5a6a', wall: '#f2ead8', sign: 'LAND OFFICE', flatRoof: true, door: { x: 61, y: 37, to: { map: 'land_office', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_lorna'], hours: { from: '08:00', to: '18:00' } } } }),
  B('b_feed_seed', 'Lone Star Feed & Seed', 80, 30, 13, 8, { roof: '#2a5a3a', wall: '#e8dcc0', sign: 'LONE STAR FEED & SEED', awning: '#3a8a4a', door: { x: 86, y: 37, to: { map: 'feed_seed', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_lorna'], hours: { from: '07:00', to: '19:00' } } } }),
  B('b_repair', 'Calloway Ag Repair', 96, 31, 9, 7, { roof: '#5a5a5e', wall: '#c8c4bc', sign: 'CALLOWAY AG REPAIR', flatRoof: true, door: { x: 100, y: 37, lock: closed('CALLOWAY AG REPAIR. A note on the door: "Out on a breakdown. If it\'s an emergency, it can wait. — R.C."') } }),
  // the Co-op elevator (a landmark: you can't go in, but the cow who's hiding there can't either)
  B('b_elevator', 'Lariat Co-op Elevator', 114, 28, 6, 8, { roof: '#9aa0a8', wall: '#c8ccd2', trim: '#6a7078', sign: 'LARIAT CO-OP', flatRoof: true, door: { x: 116, y: 35, lock: closed('The Co-op elevator\'s office. "Harvest hours only. Grain in, cheques out."') } }),
  // Cotton Street, north side (doors open south onto Cotton Street)
  B('b_barber', 'Rusty\'s Barber Shop', 26, 50, 8, 6, { roof: '#2a3a5a', wall: '#f2ead8', sign: 'RUSTY\'S BARBER', awning: '#c8402a', door: { x: 29, y: 55, lock: closed('RUSTY\'S BARBER SHOP. "Gone fishin\'. Haircuts $8, opinions free." The pole still turns.') } }),
  B('b_livestock', 'Hoof & Horn Livestock Supply', 38, 48, 10, 8, { roof: '#6a3a1e', wall: '#e2cfa8', sign: 'HOOF & HORN', door: { x: 43, y: 55, to: { map: 'hoof_horn', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_wes'], hours: { from: '07:00', to: '18:00' } } } }),
  B('b_diner', 'Mesquite Diner', 51, 49, 11, 7, { roof: '#c8402a', wall: '#f2ead8', sign: 'MESQUITE DINER', awning: '#e8c04a', door: { x: 56, y: 55, to: { map: 'diner', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_lupe'], hours: { from: '06:00', to: '21:00' } } } }),
  B('b_boarding', 'Bluebonnet Boarding House', 63, 48, 7, 8, { roof: '#3a4a7a', wall: '#ece4d4', sign: 'BLUEBONNET', door: { x: 66, y: 55, to: { map: 'boarding_house', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_opal', 'npc_lupe', 'npc_wade', 'npc_rosa', 'npc_dale', 'npc_lorna'], hours: { from: '06:00', to: '23:00' } } } }),
  B('b_tractor', 'Red Dirt Tractor & Implement', 80, 47, 14, 9, { roof: '#b8402a', wall: '#ece4d4', sign: 'RED DIRT TRACTOR & IMPLEMENT', flatRoof: true, door: { x: 87, y: 55, lock: closed('RED DIRT TRACTOR & IMPLEMENT. "SALES ON THE LOT — ask for Dale." The showroom is mostly a very shiny floor and a coffee machine.') } }),
  // Dairy Road and Mesquite Lane, north side
  B('b_school', 'Lariat School', 52, 64, 14, 8, { roof: '#7a2a24', wall: '#e8d0b0', trim: '#4a2a1e', sign: 'LARIAT SCHOOL · GO LONGHORNS', door: { x: 58, y: 71, lock: closed('LARIAT SCHOOL. Summer recess. A banner on the fence: "CONGRATULATIONS CLASS OF THIS YEAR (ALL NINE OF YOU)".') } }),
  house('b_house_6', 79, 66, '#5a3a2a', '#f0e6d2', 'Wade\'s mother\'s house. "WADE: CLOSE THE GATE" is painted on the mailbox.'),
  house('b_house_7', 88, 66, '#3a5a4a', '#e8e0cc', 'A green-roofed house with a vegetable patch and a scarecrow that looks a lot like Earl.'),
  house('b_house_8', 97, 66, '#6a5a3a', '#f2e8d8', 'Nobody home. A wind chime made of old horseshoes rings politely.'),
  house('b_house_9', 106, 66, '#7a2a24', '#ece4d4', 'The Haskins place. Opal\'s mother\'s bluebonnet painting hangs by the door — a copy; the original is at the boarding house.'),
  house('b_house_10', 115, 66, '#4a4a5a', '#efe6d6', 'A tidy house with a FOR RENT sign in the window. "Ask at the Land Office (when it opens)."'),
  // Chuckie's Cheese
  B('b_barn_1', 'Freestall Barn No. 1', 6, 67, 16, 5, { roof: '#9aa0a8', wall: '#ece6da', trim: '#7a2a24', sign: 'CHUCKIE\'S CHEESE · BARN 1', label: 'Barn 1' }),
  B('b_barn_2', 'Freestall Barn No. 2', 6, 74, 16, 5, { roof: '#9aa0a8', wall: '#ece6da', trim: '#7a2a24', label: 'Barn 2' }),
  B('b_parlour', 'Milking Parlour', 25, 67, 9, 6, { roof: '#7a2a24', wall: '#f2ead8', sign: 'MILKING PARLOUR', flatRoof: true, door: { x: 29, y: 72, to: { map: 'milking_parlour', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_chuckie', 'npc_wade', 'npc_rosa'], hours: { from: '04:30', to: '21:00' } } } }),
  B('b_cheese_plant', 'Chuckie\'s Cheese Co.', 36, 67, 12, 8, { roof: '#e8c04a', wall: '#f2ead8', trim: '#7a2a24', sign: 'CHUCKIE\'S CHEESE CO.', signColor: '#7a2a24', flatRoof: true, door: { x: 41, y: 74, to: { map: 'cheese_plant', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_chuckie', 'npc_wade', 'npc_rosa'], hours: { from: '06:00', to: '19:00' } } } }),
  B('b_chuckie_house', 'Chuckie\'s Ranch House', 38, 86, 9, 6, { roof: '#5a3a2a', wall: '#f0e6d2', label: 'Chuckie\'s place', door: { x: 42, y: 91, to: { map: 'chuckie_house', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_chuckie'], hours: { from: '06:00', to: '21:30' } } } }),
  // the Hollister place
  B('b_hollister_house', 'Hollister Farmhouse', 78, 10, 8, 6, { roof: '#6a4a3a', wall: '#f2e8d4', label: 'Hollister farm', door: { x: 82, y: 15, to: { map: 'hollister_house', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_earl'], hours: { from: '05:30', to: '21:00' } } } }),
  B('b_hollister_barn', 'Hollister Barn', 78, 18, 8, 6, { roof: '#8a2a24', wall: '#a8442e', trim: '#f2ead8', label: '' }),
  // the old windmill farm (abandoned)
  B('b_old_barn', 'The Old Barn', 6, 12, 8, 6, { roof: '#5a4a3a', wall: '#8a6a4a', label: 'Old barn', shabby: true }),
];
// a paved walk from every door that faces a street down to the pavement
for (const b of buildings) {
  const d = b.door;
  if (!d) continue;
  let y = d.y + 1;
  while (y < H && m.rows()[y][d.x] === '.') y++;
  if (y - d.y - 1 <= 4 && y < H && [',', '='].includes(m.rows()[y][d.x])) m.rect(d.x, d.y + 1, 1, y - d.y - 1, ',');
}

// ---------------------------------------------------------------- props
const props = [];
let n = 0;
const P = (type, x, y, o = {}) => props.push({ id: `la_${type}_${n++}`, type, x, y, ...o });
const fenceH = (x0, x1, y, gaps = []) => { for (let x = x0; x <= x1; x++) if (!gaps.includes(x)) P('ranchfence', x, y, { w: 1, h: 1 }); };
const fenceV = (x, y0, y1, gaps = []) => { for (let y = y0; y <= y1; y++) if (!gaps.includes(y)) P('ranchfence', x, y, { w: 1, h: 1, vertical: true }); };

// --- the way in: the ranch-gate arch over FM 38, the welcome sign, and the road signs
P('ranchgate', 71, 102, { w: 6, h: 2, text: 'LARIAT', examine: 'The Lariat arch, est. 1887: LARIAT in iron letters on a mesquite beam, a horseshoe at one end and a lasso loop at the other. A cattle guard rattles under the road.' });
P('ranchpost', 71, 103, { examine: 'A mesquite gatepost, braced with iron. Somebody has carved "C + O 1984" into it.' });
P('ranchpost', 76, 103, { examine: 'A mesquite gatepost. Someone has nailed a horseshoe to it, points up, so the luck doesn\'t run out.' });
P('bigsign', 66, 105, { w: 4, h: 2, text: 'WELCOME TO LARIAT', sub: 'POP. 412 · HOME OF CHUCKIE\'S CHEESE', examine: 'WELCOME TO LARIAT. Pop. 412. Home of Chuckie\'s Cheese. Drive friendly.' });
P('roadsign', 77, 107, { w: 4, h: 2, text: 'HALVERMOUTH ↓', sub: 'FM 38 · CITY 6 MI', examine: 'FM 38 SOUTH — HALVERMOUTH 6. The road runs down to the city\'s North Gate.' });
P('roadsign', 64, 79, { w: 4, h: 2, text: 'LARIAT ↑', sub: 'MAIN ST · 1 MI', examine: 'FM 38 NORTH — LARIAT 1. Somebody has added a cow sticker.' });
P('sign', 77, 99, { examine: 'SPEED LIMIT 30. Underneath, smaller: "COWS HAVE RIGHT OF WAY. ALWAYS."' });
// --- zebra crossings on every side of the two junctions with lights (FM 38 at Main and at Cotton)
for (const y of [40, 57]) {
  P('crosswalk', 71, y, { w: 1, h: 4 }); P('crosswalk', 76, y, { w: 1, h: 4 });
  P('crosswalk', 72, y - 1, { w: 4, h: 1, vertical: true }); P('crosswalk', 72, y + 4, { w: 4, h: 1, vertical: true });
}
// --- Main Street and Cotton Street: lamps, benches, hydrants, bins, planters
const skip = (x) => (x >= 19 && x <= 24) || (x >= 71 && x <= 76) || (x >= 127 && x <= 132);
for (let x = 22; x <= 130; x += 8) { if (!skip(x)) P('streetlamp', x, 38); if (x + 4 <= 126 && !skip(x + 4)) P('streetlamp', x + 4, 45); }
for (let x = 26; x <= 126; x += 10) if (!skip(x) && ![29, 43, 56, 66, 87].includes(x)) P('streetlamp', x, 56);
for (let x = 30; x <= 126; x += 10) if (!skip(x)) P('streetlamp', x, 62);
for (const x of [6, 14]) P('streetlamp', x, 38);
for (const [x, y] of [[71, 30], [76, 30], [71, 50], [76, 50], [71, 67], [76, 67], [19, 32], [24, 50], [127, 50], [132, 66], [127, 70]]) P('streetlamp', x, y);
for (const x of [28, 40, 52, 64]) { P('streetlamp', x, 23); }
for (const x of [60, 84, 100, 118]) P('streetlamp', x, 73);
P('bench', 47, 45); P('bench', 64, 45); P('bench', 100, 45); P('bench', 34, 45); P('bench', 90, 62); P('bench', 60, 62);
for (const [x, y] of [[44, 39], [80, 39], [110, 44], [70, 61], [24, 61], [36, 56], [100, 61]]) P('hydrant', x, y);
for (const [x, y] of [[53, 39], [92, 39], [60, 45], [78, 61], [48, 61]]) P('trash', x, y);
for (const [x, y] of [[57, 38], [42, 38], [94, 38], [104, 38]]) P('flowerbed', x, y);
P('noticeboard', 66, 39, { examine: 'LARIAT NOTICES: "LOST: five cows. Answer to their names. Will tell you so. — C." · "Church supper Friday." · "Tractor pull postponed (tractor pulled itself)." · "Land coming up for sale east of FM 38 — see the Land Office."' });
P('mailbox', 56, 39); P('mailbox', 31, 38);
P('flagpole', 34, 36); P('flagpole', 68, 36); P('flagpole', 62, 72);
// --- Pecan Street: yards, fences, mailboxes and shade trees
for (const x of [25, 34, 43, 52, 61]) {
  P('fence', x - 1, 15, { w: 9, h: 1 });
  P('mailbox', x + 5, 22);
  P('tree', x + 7, 19);
  P('flowerbed', x, 22);
}
for (const [x, y] of [[22, 16], [69, 16], [30, 29], [46, 29], [62, 29], [69, 30], [20, 20], [30, 12], [48, 12], [62, 12]]) P('tree', x, y);
// --- the church and the rodeo grounds (west)
P('tree', 3, 30); P('tree', 17, 29); P('tree', 3, 35); P('tree', 17, 34); P('bench', 13, 39);
P('statue', 16, 36, { examine: 'A bronze of a cowboy roping a steer. The plaque says "THE FOUNDERS". The steer\'s expression suggests he disagreed.' });
fenceH(3, 17, 46, [17]); fenceH(3, 17, 59); fenceV(3, 47, 58); fenceV(17, 47, 58, [52, 53]);
P('bigsign', 6, 43, { w: 4, h: 2, text: 'RODEO GROUNDS', sub: 'LARIAT STAMPEDE · EVERY JULY', color: '#e8c04a', examine: 'LARIAT RODEO GROUNDS. "Home of the Lariat Stampede, every July. No cows from Chuckie\'s may enter the calf scramble (they win)."' });
for (const x of [6, 9, 12]) P('bench', x, 60);
P('haybale', 5, 48, { w: 1, h: 1 }); P('haybale', 15, 57, { w: 1, h: 1 }); P('trough', 9, 57, { w: 2, h: 1 });
// --- Lariat Square: a little park with the fountain, benches and old pecans
P('fountain', 118, 49, { w: 3, h: 3, examine: 'The square\'s fountain, with a cast-iron longhorn spouting water from both nostrils. Kids throw obols in for luck.' });
for (const [x, y] of [[113, 47], [125, 47], [113, 53], [125, 53]]) P('tree', x, y);
for (const [x, y] of [[115, 47], [123, 53], [115, 53], [123, 47]]) P('bench', x, y);
for (const [x, y] of [[114, 50], [124, 50]]) P('flowerbed', x, y);
P('sign', 112, 45, { examine: 'LARIAT SQUARE. "No grazing." (This sign was put up after an incident.)' });
// --- the shops' lots
P('watertower', 106, 30, { w: 4, h: 5, examine: 'The Lariat water tower: LARIAT · HOME OF CHUCKIE\'S CHEESE painted round the tank, and below it, smaller, someone\'s initials in a heart.' });
P('car', 102, 30, { w: 2, h: 1, color: '#c8402a', examine: 'A dusty pickup. CALLOWAY on the door and three spanners on the dash.' }); // (Red Dirt's lot is for tractors, v0.30.0)
P('haybale', 108, 53, { w: 1, h: 1 }); P('haybale', 109, 54, { w: 1, h: 1 });
for (const [x, y] of [[78, 27], [82, 27], [86, 27]]) P('haybale', x, y, { w: 1, h: 1 });
P('crate', 92, 27); P('barrel', 94, 27); P('car', 100, 27, { w: 3, h: 1, color: '#2a5a3a', examine: 'A Lone Star Feed & Seed delivery truck, loaded with sacks of feed for Chuckie\'s Cheese.' });
P('silo', 121, 28, { w: 2, h: 3 }); P('silo', 121, 32, { w: 2, h: 3 }); P('silo', 124, 28, { w: 2, h: 3 });
P('car', 119, 36, { w: 2, h: 1, color: '#8a8a7a', examine: 'A grain truck with CO-OP stencilled on the tailgate.' });
// --- the school and Mesquite Lane
fenceH(50, 69, 63);
for (const x of [79, 88, 97, 106, 115]) { P('fence', x - 1, 64, { w: 9, h: 1 }); P('mailbox', x + 5, 72); P('tree', x + 7, 67); }
P('tree', 123, 66); P('tree', 125, 70); P('tree', 50, 66); P('tree', 68, 66);
// --- the Hollister farm (north-east)
P('tractor', 86, 20, { w: 3, h: 2, color: '#3a7a3a', examine: 'Earl Hollister\'s tractor. Older than Earl. Runs better.' });
P('silo', 87, 12, { w: 2, h: 3 });
P('car', 90, 6, { w: 2, h: 1, color: '#6a4a3a', examine: 'Earl\'s pickup. The bed is full of cotton modules, string, and one boot.' });
for (const [x, y] of [[92, 4], [96, 5], [104, 3], [112, 5], [120, 4], [128, 3]]) P('haybale', x, y, { w: 1, h: 1 });
fenceH(89, 135, 10, [113, 114, 115]); fenceH(89, 135, 24, [113, 114, 115]);
P('sign', 89, 9, { examine: 'HOLLISTER COTTON — 4TH GENERATION. "Please don\'t pick the cotton. It isn\'t ready, and neither are we."' });
// --- the old windmill (north-west)
P('windmill', 16, 4, { w: 3, h: 4, examine: 'An old steel windmill, still turning, pumping nothing into a trough nobody uses. It creaks a tune.' });
P('trough', 12, 10, { w: 2, h: 1 });
for (const [x, y] of [[4, 14], [5, 16], [15, 15]]) P('haybale', x, y, { w: 1, h: 1 });
// --- Chuckie's Cheese
P('bigsign', 44, 63, { w: 4, h: 2, text: 'CHUCKIE\'S CHEESE', sub: 'DAIRY · CHEESE · TEXAS PROUD', color: '#e8c04a', examine: 'CHUCKIE\'S CHEESE — FAMILY OWNED, PUBLICLY TRADED, UDDERLY DELICIOUS.' });
fenceH(4, 43, 63, [20, 21, 22, 23]); // the yard's front fence along Cotton Street, open at Church Street
P('gatepost', 48, 72); P('gatepost', 48, 79);
for (const [x, y] of [[23, 75], [25, 75], [27, 75]]) P('silo', x, y, { w: 2, h: 3, color: '#d8dee6', examine: 'A feed silo: corn silage for the herd. It hums when the auger runs.' });
P('milktank', 34, 76, { w: 2, h: 2, examine: 'The bulk milk tank, chilled. A gauge shows how full it is — today, not very.' });
P('car', 44, 77, { w: 3, h: 1, color: '#f2ead8', examine: 'A refrigerated delivery truck: CHUCKIE\'S CHEESE on the side, a cartoon cow winking on the back door.' });
P('car', 44, 79, { w: 3, h: 1, color: '#e8c04a', examine: 'A cheese truck loading at the dock. A crate marked "AGED 12 MONTHS — DO NOT RUSH".' });
P('car', 39, 83, { w: 2, h: 1, color: '#7a2a24', examine: 'Chuckie\'s pickup. A bumper sticker: "I BRAKE FOR COWS (AND THEY KNOW IT)".' });
for (let k = 0; k < 6; k++) P('haybale', 4 + k, 80, { w: 1, h: 1 });
// pasture fence round the herd's field (gate on the north side by the barns)
fenceH(3, 24, 81, [12, 13]); fenceH(3, 24, 106); fenceV(3, 82, 105); fenceV(24, 82, 105);
// the herd (ordinary cows: they graze and moo, they don't talk)
const coats = [['#2a2420', '#f2ece0'], ['#f2ece0', '#2a2420'], ['#8a5a3a', '#f2ece0'], ['#f2ece0', '#8a5a3a'], ['#3a2a24', '#f2ece0']];
for (let k = 0; k < 22; k++) {
  const x = 5 + ((k * 7) % 18);
  const y = 84 + ((k * 5) % 20);
  const [patches, coat] = coats[k % coats.length];
  P('cow', x, y, { coat, patches, seed: 11 + k * 3, examine: ['A Holstein, chewing. She looks at you the way cows look at everything: patiently, and without much hope.', 'A dairy cow. "Moo," she says. Just "moo". Not one of the special ones, then.', 'A cow with a tag in her ear: No. 117. She moos once, for the record.'][k % 3] });
}
// the lead cows' paddock (where the five special cows live when they're home)
fenceH(25, 35, 81, [28, 29, 30, 31]); fenceH(25, 35, 91); fenceV(35, 82, 90);
P('trough', 30, 89, { w: 2, h: 1, examine: 'The lead cows\' trough, with five names painted along it: BESSIE MAE · CLEMENTINE · DUCHESS · PATSY · DAISY.' });
P('sign', 27, 80, { examine: 'THE LEAD COWS\' PADDOCK. "Please do not discuss politics with the cows."' });
P('tree', 46, 84); P('tree', 37, 93); P('bench', 45, 92);
// Chuckie's silage corn
fenceH(49, 69, 81, [58, 59]); fenceH(49, 69, 104); fenceV(49, 82, 103); fenceV(69, 82, 103);
P('sign', 56, 80, { examine: 'CHUCKIE\'S SILAGE CORN. "Cows\' dinner. Not yours."' });
// --- land coming up for sale (south-east): three plots, fenced, with signs
fenceH(77, 135, 80, [105, 106, 107]);
// each plot's sign is where you work it (src/systems/farm.js); explicit ids
for (const [id, x, y] of [['plot_east_1', 80, 79], ['plot_east_2', 110, 79], ['plot_east_3', 80, 95]]) props.push({ id: `la_sign_${id}`, type: 'sign', x, y, interact: { kind: 'farm', action: 'plot', plot: id, name: 'field sign' }, examine: 'LAND FOR SALE — inquire at the Lariat Land Office, Main Street.' });
props.push({ id: 'la_coop_scale', type: 'noticeboard', x: 113, y: 36, interact: { kind: 'farm', action: 'coop', name: 'Co-op scale' }, examine: 'The Co-op\'s truck scale and price board: today\'s bids for wheat, sorghum, corn and cotton, chalked up every morning.' });
// --- trees: along the creek, round the edges of the county, and a few in the fields' corners
for (let y = 1; y < H - 1; y += 3) { P('tree', Math.max(135, creekX(y) - 4), y, {}); if (y % 2) P('tree', creekX(y) + 4, y + 1); }
for (let x = 2; x < 136; x += 5) if (!(x >= 9 && x <= 20) && !(x >= 70 && x <= 78)) P(x % 3 ? 'tree' : 'bush', x, 0);
for (let y = 22; y < 106; y += 4) if (!(y >= 37 && y <= 46) && !(y >= 62 && y <= 81)) P('tree', 0, y);
for (let x = 2; x < 136; x += 4) if (!(x >= 70 && x <= 81) && !(x >= 3 && x <= 25)) P(x % 3 ? 'tree' : 'bush', x, H - 1);
for (const [x, y] of [[48, 99], [70, 90], [136, 60], [134, 76], [134, 107], [104, 107], [26, 108], [69, 105]]) P('tree', x, y);

export const lariat = {
  id: 'lariat',
  name: 'Lariat',
  kind: 'outdoor',
  music: { day: 'mus_fields', night: 'mus_fields' },
  ambience: 'amb_fields',
  tiles: m.rows(),
  fields,
  areas: [
    { id: 'area_lariat_main', name: 'Main Street, Lariat', x: 19, y: 29, w: 114, h: 17 },
    { id: 'area_lariat_cotton', name: 'Cotton Street, Lariat', x: 19, y: 46, w: 92, h: 17 },
    { id: 'area_lariat_square', name: 'Lariat Square', x: 111, y: 45, w: 16, h: 11 },
    { id: 'area_pecan_street', name: 'Pecan Street', x: 19, y: 12, w: 52, h: 17 },
    { id: 'area_church', name: 'First Baptist Church', x: 2, y: 26, w: 17, h: 14 },
    { id: 'area_rodeo', name: 'Lariat Rodeo Grounds', x: 2, y: 42, w: 17, h: 20 },
    { id: 'area_mesquite_lane', name: 'Mesquite Lane', x: 76, y: 63, w: 57, h: 16 },
    { id: 'area_dairy_road', name: 'Dairy Road', x: 49, y: 63, w: 23, h: 16 },
    { id: 'area_chuckies', name: 'Chuckie\'s Cheese', x: 2, y: 63, w: 47, h: 45 },
    { id: 'area_lead_paddock', name: 'The Lead Cows\' Paddock', x: 25, y: 82, w: 10, h: 9 },
    { id: 'area_silage', name: 'Chuckie\'s Silage Corn', x: 49, y: 79, w: 21, h: 26 },
    { id: 'area_hollister', name: 'Hollister Cotton Farm', x: 76, y: 2, w: 60, h: 23 },
    { id: 'area_caddo_creek', name: 'Caddo Creek', x: 135, y: 0, w: 15, h: H },
    { id: 'area_windmill', name: 'The Old Windmill', x: 2, y: 2, w: 22, h: 20 },
    { id: 'area_coop', name: 'Lariat Co-op', x: 105, y: 26, w: 22, h: 12 },
    { id: 'area_east_land', name: 'East Fields (for sale)', x: 77, y: 79, w: 58, h: 30 },
    { id: 'area_fm38', name: 'FM 38', x: 70, y: 79, w: 8, h: 31 },
  ],
  buildings,
  doors: [
    // FM 38 runs south to Halvermouth's North Gate
    ...[72, 73, 74, 75].map((x, i) => ({ id: `door_la_south_${i}`, x, y: H - 1, keepTile: true, gateway: 'Halvermouth', label: 'FM 38 south, to Halvermouth', to: { map: 'halvermouth', spot: 'north_gate' } })),
  ],
  spots: {
    south_gate: { x: 73, y: H - 3, facing: 'up' },
    town_square: { x: 119, y: 53, facing: 'up' },
    mercantile_door_out: { x: 49, y: 38, facing: 'down' },
    diner_door_out: { x: 56, y: 56, facing: 'down' },
    boarding_door_out: { x: 66, y: 56, facing: 'down' },
    parlour_door_out: { x: 29, y: 73, facing: 'down' },
    cheese_plant_door_out: { x: 41, y: 75, facing: 'down' },
    chuckie_house_door_out: { x: 42, y: 92, facing: 'down' },
    hollister_door_out: { x: 82, y: 16, facing: 'down' },
    // where people go
    dairy_yard: { x: 20, y: 73, facing: 'down' },
    dairy_gate: { x: 12, y: 80, facing: 'down' },
    paddock_gate: { x: 29, y: 80, facing: 'down' },
    paddock_centre: { x: 30, y: 86, facing: 'down' },
    chuckie_porch: { x: 44, y: 93, facing: 'left' },
    chuckie_lookout: { x: 33, y: 79, facing: 'down' },
    cotton_field: { x: 100, y: 20, facing: 'up' },
    hollister_porch: { x: 84, y: 16, facing: 'down' },
    diner_bench: { x: 64, y: 46, facing: 'down' },
    main_bench: { x: 47, y: 46, facing: 'down' },
    // the five lead cows' hideouts (src/content/dairy.js) and their places in the paddock
    reddirt_lot: { x: 101, y: 54, facing: 'up' },
    land_office_door_out: { x: 61, y: 38, facing: 'down' },
    hoof_horn_door_out: { x: 43, y: 56, facing: 'down' },
    feed_seed_door_out: { x: 86, y: 38, facing: 'down' },
    hide_bessie: { x: 57, y: 47, facing: 'down' },
    hide_clementine: { x: 15, y: 8, facing: 'right' },
    hide_duchess: { x: creekX(BAR) - 1, y: BAR, facing: 'right' },
    hide_patsy: { x: 124, y: 36, facing: 'left' },
    hide_daisy: { x: 128, y: 100, facing: 'up' },
    pen_bessie: { x: 26, y: 84, facing: 'down' },
    pen_clementine: { x: 29, y: 83, facing: 'down' },
    pen_duchess: { x: 32, y: 85, facing: 'left' },
    pen_patsy: { x: 27, y: 88, facing: 'right' },
    pen_daisy: { x: 33, y: 89, facing: 'up' },
  },
  // the paddock the lead cows must be brought into (src/systems/dairy.js)
  paddock: { x: 25, y: 82, w: 10, h: 9 },
  props,
};

// ---------------------------------------------------------------- interiors
const room = (id, name, w, h, outSpot, o = {}) => ({
  id, name, kind: 'interior', music: o.music || 'mus_workshop', ambience: 'amb_indoor',
  tiles: roomTiles(w, h, o.floor || 'f', Math.floor(w / 2)),
  doors: [{ id: `door_${id}_exit`, x: Math.floor(w / 2), y: h - 1, to: { map: 'lariat', spot: outSpot } }],
  spots: { entry: { x: Math.floor(w / 2), y: h - 2, facing: 'up' }, ...(o.spots || {}) },
  keepClear: [[Math.floor(w / 2), h - 2]],
  props: o.props || [],
});

export const mercantile = room('mercantile', 'Lariat Mercantile', 14, 9, 'mercantile_door_out', {
  spots: { counter: { x: 7, y: 2, facing: 'down' } },
  props: [
    { id: 'me_counter', type: 'counter', x: 5, y: 3, w: 5, h: 1, interact: { kind: 'shop', shop: 'shop_mercantile', name: 'counter' }, examine: 'The Mercantile counter: a brass register, a jar of jerky, and a coil of good rope on a peg — LASSOS 45¢… crossed out… 45 OBOLS.' },
    { id: 'me_shelf_1', type: 'shelf', x: 1, y: 1, w: 3, h: 1, examine: 'Canned peaches, work gloves, a box of horseshoe nails, and a tin of something called "Bag Balm" that Opal swears fixes everything.' },
    { id: 'me_shelf_2', type: 'shelf', x: 10, y: 1, w: 3, h: 1, examine: 'Coils of rope, lassos, a wall of hats, and one pair of boots in a size nobody has.' },
    { id: 'me_barrel', type: 'barrel', x: 1, y: 6, examine: 'A pickle barrel. It has been here since before the town. The pickles may have been too.' },
    { id: 'me_stove', type: 'stove', x: 12, y: 6, examine: 'A pot-bellied stove with three chairs round it, for the important business of talking about the weather.' },
    { id: 'me_board', type: 'noticeboard', x: 5, y: 0, examine: '"LOST: 5 COWS. They will tell you their names. Bring them home to Chuckie\'s and he\'ll see you right." A lasso is pinned underneath, helpfully.' },
  ],
});
export const diner = room('diner', 'Mesquite Diner', 14, 9, 'diner_door_out', {
  spots: { counter: { x: 7, y: 2, facing: 'down' }, booth: { x: 2, y: 4, facing: 'right' }, stool: { x: 10, y: 4, facing: 'up' } },
  props: [
    { id: 'di_counter', type: 'counter', x: 4, y: 3, w: 7, h: 1, interact: { kind: 'shop', shop: 'shop_diner', name: 'counter' }, examine: 'The diner counter: pies under glass domes, a coffee pot that has never been empty, and a bell that says RING FOR LUPE.' },
    { id: 'di_oven', type: 'oven', x: 9, y: 1 },
    { id: 'di_table_1', type: 'table', x: 1, y: 5, examine: 'A booth with red vinyl seats, patched with tape the same red, nearly.' },
    { id: 'di_table_2', type: 'table', x: 12, y: 5 },
    { id: 'di_chair_1', type: 'chair', x: 2, y: 5 }, { id: 'di_chair_2', type: 'chair', x: 11, y: 5 },
    { id: 'di_jukebox', type: 'display', x: 12, y: 1, w: 1, examine: 'A jukebox. Every song on it is about a truck, a dog, or a truck that was also a dog.' },
  ],
});
export const boardingHouse = room('boarding_house', 'Bluebonnet Boarding House', 14, 10, 'boarding_door_out', {
  floor: 'c',
  spots: { ...Object.fromEntries([['opal', 1], ['lupe', 4], ['wade', 9], ['rosa', 12]].map(([k, x]) => [`bed_${k}`, { x, y: 3, facing: 'down' }])), bed_dale: { x: 2, y: 7, facing: 'up' }, bed_lorna: { x: 11, y: 7, facing: 'up' } },
  props: [
    ...[1, 4, 9, 12].map((x, i) => ({ id: `bh_bed_${i}`, type: 'bed', x, y: 1, w: 1, h: 2 })),
    { id: 'bh_bed_4', type: 'bed', x: 1, y: 6, w: 1, h: 2 }, { id: 'bh_bed_5', type: 'bed', x: 12, y: 5, w: 1, h: 2 }, // v0.30.0
    { id: 'bh_table', type: 'table', x: 6, y: 5, w: 2, examine: 'The boarding-house table, set for breakfast forever: grits, eggs, and a pot of coffee that bites.' },
    { id: 'bh_painting', type: 'painting', x: 6, y: 0, examine: 'A painting of bluebonnets, by Mrs. Haskins, aged nine. Framed like it\'s in a museum. It deserves it.' },
  ],
});
export const milkingParlour = room('milking_parlour', 'Milking Parlour', 16, 9, 'parlour_door_out', {
  floor: 't',
  spots: { station: { x: 4, y: 4, facing: 'up' }, station_2: { x: 11, y: 4, facing: 'up' } },
  props: [
    ...[1, 3, 5, 7, 9, 11, 13].map((x, i) => ({ id: `mp_stall_${i}`, type: 'milkstall', x, y: 1, w: 2, h: 2, examine: 'A milking stall with a rotary claw, hoses and a little screen showing litres: today it reads lower than it should.' })),
    { id: 'mp_tank', type: 'milktank', x: 1, y: 6, w: 2, h: 2, examine: 'The parlour\'s buffer tank. It gurgles contentedly — or as contentedly as a half-empty tank can.' },
    { id: 'mp_board', type: 'noticeboard', x: 13, y: 6, examine: 'THE MILKING ROTA. A note in Chuckie\'s hand: "Herd won\'t come in without the lead cows. Patience, folks. They\'ll be home." Below, in another hand: "or not lol" (crossed out, firmly).' },
  ],
});
export const cheesePlant = room('cheese_plant', 'Chuckie\'s Cheese Co. — Plant & Office', 18, 10, 'cheese_plant_door_out', {
  floor: 't',
  spots: { vat: { x: 4, y: 4, facing: 'up' }, office: { x: 14, y: 3, facing: 'up' }, press: { x: 9, y: 4, facing: 'up' } },
  props: [
    { id: 'cp_vat_1', type: 'cheesevat', x: 1, y: 1, w: 3, h: 2, examine: 'A stainless cheese vat: warm milk, rennet, and a paddle turning slowly. Curds are forming. Fewer than usual.' },
    { id: 'cp_vat_2', type: 'cheesevat', x: 5, y: 1, w: 3, h: 2, examine: 'The second vat, half full. Rosa taps it like a drum and frowns.' },
    { id: 'cp_press', type: 'cheesepress', x: 9, y: 1, w: 2, h: 2, examine: 'The cheese press, squeezing curds into wheels. It sighs.' },
    { id: 'cp_racks', type: 'cheeserack', x: 1, y: 6, w: 6, h: 2, examine: 'Ageing racks: rows of golden wheels, each stamped CHUCKIE\'S with a date. The cellar smells like money and feet, in the best way.' },
    { id: 'cp_desk', type: 'desk', x: 13, y: 1, w: 3, h: 1, examine: 'Chuckie\'s desk: invoices under a cheese-shaped paperweight (it is cheese), a photo of a cow in a graduation cap.' },
    { id: 'cp_ticker', type: 'terminal', x: 16, y: 1, w: 1, h: 1, interact: { kind: 'dairy', action: 'board', name: 'company board' }, examine: 'The company board: today\'s milk, today\'s cheese, and CHZ on the Halvermouth exchange.' },
    { id: 'cp_crates', type: 'crate', x: 15, y: 7, w: 2 },
  ],
});
export const chuckieHouse = room('chuckie_house', 'Chuckie\'s Ranch House', 12, 9, 'chuckie_house_door_out', {
  spots: { bed: { x: 2, y: 3, facing: 'down' }, kitchen: { x: 9, y: 3, facing: 'up' }, chair: { x: 6, y: 5, facing: 'up' } },
  props: [
    { id: 'ch_bed', type: 'bed', x: 1, y: 1, w: 1, h: 2, examine: 'Chuckie\'s bed, under a quilt with a cow on it. The cow on the quilt has a speech bubble that says "MOO". Ordinary cow, then.' },
    { id: 'ch_stove', type: 'stove', x: 9, y: 1 },
    { id: 'ch_table', type: 'table', x: 5, y: 4, w: 2, examine: 'The kitchen table: a block of cheese, a knife, a crossword half done. 7 across: "Bovine escapee (5)".' },
    { id: 'ch_photo', type: 'painting', x: 4, y: 0, w: 2, examine: 'A photo: young Chuckie and a much younger Captain Ober on a quay, both holding an enormous cheese. "Lanternside, the year we shipped the big one."' },
    { id: 'ch_rug', type: 'rug', x: 5, y: 6, w: 2, h: 2 },
  ],
});
export const hollisterHouse = room('hollister_house', 'Hollister Farmhouse', 12, 9, 'hollister_door_out', {
  spots: { bed: { x: 2, y: 3, facing: 'down' }, table: { x: 6, y: 5, facing: 'up' } },
  props: [
    { id: 'ho_bed', type: 'bed', x: 1, y: 1, w: 1, h: 2 },
    { id: 'ho_stove', type: 'stove', x: 9, y: 1 },
    { id: 'ho_table', type: 'table', x: 5, y: 4, w: 2, examine: 'A farm ledger, open at a page of cotton prices with a lot of question marks.' },
    { id: 'ho_rack', type: 'gunrack', x: 9, y: 6, w: 2, examine: 'An empty gun rack with a sign: "SOLD THEM FOR SEED, 2011."' },
  ],
});

// v0.30.0: the Land Office (the deeds desk) and Lone Star Feed & Seed open
export const landOffice = room('land_office', 'Lariat Land Office', 12, 8, 'land_office_door_out', {
  spots: { desk: { x: 6, y: 2, facing: 'down' } },
  props: [
    { id: 'lo_desk', type: 'desk', x: 4, y: 3, w: 4, h: 1, interact: { kind: 'farm', action: 'office', name: 'deeds desk' }, examine: 'The county land agent\'s desk: a plat map under glass, a rubber stamp shaped like Texas, and the deeds to three plots east of FM 38.' },
    { id: 'lo_map', type: 'painting', x: 1, y: 0, w: 3, examine: 'A survey map of the county. The east plots are outlined in red pencil: FOR SALE.' },
    { id: 'lo_cabinet', type: 'cabinet', x: 10, y: 1 },
    { id: 'lo_plant', type: 'plant', x: 1, y: 5 },
  ],
});
export const feedSeed = room('feed_seed', 'Lone Star Feed & Seed', 14, 9, 'feed_seed_door_out', {
  spots: { counter: { x: 7, y: 2, facing: 'down' } },
  props: [
    { id: 'fs_counter', type: 'counter', x: 5, y: 3, w: 5, h: 1, interact: { kind: 'shop', shop: 'shop_feedseed', name: 'counter' }, examine: 'The Feed & Seed counter: a scale, a calendar from a fertiliser company, and a bell that sounds like a cow.' },
    { id: 'fs_sacks_1', type: 'crate', x: 1, y: 1, w: 3, examine: 'Seed sacks stacked to the rafters: wheat, sorghum, corn, cotton.' },
    { id: 'fs_sacks_2', type: 'crate', x: 10, y: 1, w: 3, examine: 'Fertiliser, 10-10-10, in fifty-pound bags. It smells like a very serious garden.' },
    { id: 'fs_shelf', type: 'shelf', x: 1, y: 6, w: 3, examine: 'Fence pliers, baling twine, salt licks and a hat that says FEED ME.' },
    { id: 'fs_barrel', type: 'barrel', x: 12, y: 6 },
  ],
});

// v0.31.0: Hoof & Horn Livestock Supply — the sale barn's front office
export const hoofHorn = room('hoof_horn', 'Hoof & Horn Livestock Supply', 14, 9, 'hoof_horn_door_out', {
  spots: { counter: { x: 7, y: 2, facing: 'down' }, bed: { x: 12, y: 2, facing: 'down' } },
  props: [
    { id: 'hh_counter', type: 'counter', x: 5, y: 3, w: 5, h: 1, interact: { kind: 'farm', action: 'livestock', name: 'sale ledger' }, examine: 'The Hoof & Horn counter: the sale ledger, a brass bell, and a jar of horehound candy that has been there since the Depression.' },
    { id: 'hh_board', type: 'noticeboard', x: 1, y: 0, examine: 'STOCK FOR SALE: laying hens, dairy goats, beef calves — delivered to your pasture. "WE BUY: grown cattle, goats, hens. Auction prices, paid same day."' },
    { id: 'hh_saddle', type: 'display', x: 11, y: 1, w: 1, examine: 'A saddle on a stand, and a sign: "NOT FOR SALE. ASK ANYWAY."' },
    { id: 'hh_bed', type: 'cot', x: 12, y: 5, w: 1, h: 2, examine: 'Wes\'s cot in the back. He says he lives in town. He lives here.' },
    { id: 'hh_sacks', type: 'crate', x: 1, y: 6, w: 3, examine: 'Salt licks, mineral blocks, and a box of ear tags numbered up to 999.' },
  ],
});

export default [lariat, mercantile, diner, boardingHouse, milkingParlour, cheesePlant, chuckieHouse, hollisterHouse, landOffice, feedSeed, hoofHorn];
