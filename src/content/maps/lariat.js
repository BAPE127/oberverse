// Lariat (v0.29.0) — a small Texas farming town north of Halvermouth, up
// Farm-to-Market Road 38 from the city's North Gate. Main Street and Cotton
// Street are the town; around them, the countryside: Chuckie's Cheese (the
// big dairy and cheese plant, south-west), the Hollister cotton farm (north-
// east), Caddo Creek, the old windmill, the Co-op grain elevator, and open
// land for the farms that are coming up for sale.
// Coordinates are in tiles (authored at full width: roads are already 4 wide).
// Preview with `npm run map -- lariat`.
import { MapBuilder, roomTiles } from '../../world/mapBuilder.js';

const W = 150;
const H = 110;
const m = new MapBuilder(W, H, '.');

// ---------------------------------------------------------------- ground
m.rect(0, 0, W, 1, 'r').rect(0, 0, 1, H, 'r').rect(W - 1, 0, 1, H, 'r'); // the mesa rim and the county line
m.rect(0, H - 1, W, 1, 'r');
// fields and pastures (dirt ':' = worked fields, grass '.' = pasture)
m.rect(88, 4, 50, 22, ':'); // Hollister cotton
m.rect(84, 70, 28, 18, ':').rect(116, 70, 30, 18, ':').rect(84, 92, 62, 14, ':'); // fallow land for sale (east)
m.rect(4, 82, 20, 24, '.'); // dairy pasture
// Caddo Creek: down from the north-east, under the county road, out at the east line
const creek = [[112, 1], [114, 6], [118, 10], [122, 14], [126, 18], [130, 24], [133, 30], [136, 36], [140, 42], [144, 48], [148, 52]];
for (let i = 0; i + 1 < creek.length; i++) {
  const [x0, y0] = creek[i];
  const [x1, y1] = creek[i + 1];
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let k = 0; k <= n; k++) {
    const x = Math.round(x0 + ((x1 - x0) * k) / n);
    const y = Math.round(y0 + ((y1 - y0) * k) / n);
    m.rect(x - 1, y, 3, 1, '~');
  }
}
m.rect(126, 16, 4, 3, 's').rect(129, 22, 3, 2, 's'); // sandbars
// ---------------------------------------------------------------- roads
m.rect(72, 30, 4, H - 30, '='); // FM 38, south to Halvermouth
m.rect(72, 1, 4, 29, ':'); // ...and north as a county road to the Hollister place and the windmill
m.rect(20, 40, 112, 4, '='); // Main Street
m.rect(36, 57, 76, 4, '='); // Cotton Street
m.rect(6, 62, 66, 4, '='); // Dairy Road
m.rect(76, 66, 70, 2, ':').rect(110, 66, 2, 40, ':'); // the farm track east, and down between the plots
m.rect(10, 8, 62, 2, ':'); // Windmill Lane
m.rect(76, 26, 56, 2, ':'); // the Hollister track
m.rect(130, 26, 3, 2, 'b'); // a plank bridge over Caddo Creek
m.rect(131, 28, 2, 12, ':').rect(116, 38, 17, 2, ':'); // down to the elevator
// pavements in town
m.rect(36, 38, 76, 2, ',').rect(36, 44, 76, 2, ','); // Main Street
m.rect(36, 56, 76, 1, ',').rect(36, 61, 76, 1, ','); // Cotton Street
m.rect(70, 46, 2, 10, ',').rect(76, 46, 2, 10, ','); // the highway's verges through town
m.rect(96, 46, 15, 10, 'g'); // Red Dirt's equipment lot
m.rect(112, 28, 10, 10, 'g'); // the Co-op yard
// Chuckie's Cheese: yards and pads
m.rect(4, 66, 44, 15, 'g'); // the dairy's working yard
m.rect(24, 81, 12, 10, ':'); // the lead cows' paddock (dirt)
m.rect(36, 81, 12, 3, 'g');

// ---------------------------------------------------------------- buildings
const B = (id, name, x, y, w, h, o = {}) => ({
  id, name, mapLabel: o.label ?? name, x, y, w, h,
  roof: o.roof || '#8a4a32', wall: o.wall || '#e8d8b8', trim: o.trim || '#5a3a2a', sign: o.sign, signColor: o.signColor, flatRoof: o.flatRoof, awning: o.awning, shabby: o.shabby,
  door: o.door,
});
const closed = (msg) => ({ message: msg });
const buildings = [
  // Main Street, north side (doors open onto the pavement)
  B('b_mercantile', 'Lariat Mercantile', 44, 30, 12, 8, { roof: '#7a2a24', wall: '#e8d8b8', sign: 'LARIAT MERCANTILE', awning: '#c8402a', door: { x: 49, y: 37, to: { map: 'mercantile', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_opal'], hours: { from: '07:00', to: '20:00' } } } }),
  B('b_land_office', 'Lariat Land Office', 58, 32, 8, 6, { roof: '#4a5a6a', wall: '#f2ead8', sign: 'LAND OFFICE', flatRoof: true, door: { x: 61, y: 37, lock: closed('LARIAT LAND OFFICE. A hand-lettered card in the window: "Farm listings being surveyed — back soon. Ask Opal at the Mercantile about land."') } }),
  B('b_feed_seed', 'Lone Star Feed & Seed', 80, 30, 13, 8, { roof: '#2a5a3a', wall: '#e8dcc0', sign: 'LONE STAR FEED & SEED', awning: '#3a8a4a', door: { x: 86, y: 37, lock: closed('LONE STAR FEED & SEED. "CLOSED FOR INVENTORY — new seed coming in on the next truck." Through the window: feed sacks to the ceiling.') } }),
  B('b_repair', 'Calloway Ag Repair', 96, 31, 9, 7, { roof: '#5a5a5e', wall: '#c8c4bc', sign: 'CALLOWAY AG REPAIR', flatRoof: true, door: { x: 100, y: 37, lock: closed('CALLOWAY AG REPAIR. A note on the door: "Out on a breakdown. If it\'s an emergency, it can wait. — R.C."') } }),
  // houses up Pecan Street (north-west of town)
  B('b_house_1', 'House', 24, 28, 6, 5, { roof: '#6a4a3a', wall: '#f0e6d2', label: '' }),
  B('b_house_2', 'House', 33, 28, 6, 5, { roof: '#3a4a6a', wall: '#e6dcc8', label: '' }),
  B('b_house_3', 'House', 24, 18, 6, 5, { roof: '#5a6a3a', wall: '#f2e8d8', label: '' }),
  B('b_house_4', 'House', 33, 18, 6, 5, { roof: '#7a3a2a', wall: '#e8dcc4', label: '' }),
  // Cotton Street (between Main and Cotton; doors open south onto Cotton Street)
  B('b_livestock', 'Hoof & Horn Livestock Supply', 38, 48, 10, 8, { roof: '#6a3a1e', wall: '#e2cfa8', sign: 'HOOF & HORN', door: { x: 43, y: 55, lock: closed('HOOF & HORN LIVESTOCK SUPPLY. "Gone to the sale barn in Halvermouth. Back with stock." A cat sleeps on the step, unbothered.') } }),
  B('b_diner', 'Mesquite Diner', 51, 49, 11, 7, { roof: '#c8402a', wall: '#f2ead8', sign: 'MESQUITE DINER', awning: '#e8c04a', door: { x: 56, y: 55, to: { map: 'diner', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_lupe'], hours: { from: '06:00', to: '21:00' } } } }),
  B('b_boarding', 'Bluebonnet Boarding House', 63, 48, 7, 8, { roof: '#3a4a7a', wall: '#ece4d4', sign: 'BLUEBONNET', door: { x: 66, y: 55, to: { map: 'boarding_house', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_opal', 'npc_lupe', 'npc_wade', 'npc_rosa'], hours: { from: '06:00', to: '23:00' } } } }),
  B('b_tractor', 'Red Dirt Tractor & Implement', 80, 47, 14, 9, { roof: '#b8402a', wall: '#ece4d4', sign: 'RED DIRT TRACTOR & IMPLEMENT', flatRoof: true, door: { x: 87, y: 55, lock: closed('RED DIRT TRACTOR & IMPLEMENT. "GRAND OPENING — NEW STOCK ARRIVING." The showroom is empty except for a very shiny floor.') } }),
  // the Co-op elevator (a landmark: you can't go in, but the cow who's hiding there can't either)
  B('b_elevator', 'Lariat Co-op Elevator', 114, 28, 6, 8, { roof: '#9aa0a8', wall: '#c8ccd2', trim: '#6a7078', sign: 'LARIAT CO-OP', flatRoof: true, door: { x: 116, y: 35, lock: closed('The Co-op elevator\'s office. "Harvest hours only. Grain in, cheques out."') } }),
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

// ---------------------------------------------------------------- props
const props = [];
let n = 0;
const P = (type, x, y, o = {}) => props.push({ id: `la_${type}_${n++}`, type, x, y, ...o });
// town
for (const x of [38, 52, 66, 80, 94, 108]) { P('streetlamp', x, 38); P('streetlamp', x + 6, 45); }
for (const x of [40, 60, 90, 104]) P('streetlamp', x, 56);
P('watertower', 64, 22, { w: 4, h: 5, examine: 'The Lariat water tower: LARIAT · HOME OF CHUCKIE\'S CHEESE painted round the tank, and below it, smaller, someone\'s initials in a heart.' });
P('bigsign', 66, 100, { w: 4, h: 2, text: 'LARIAT', sub: 'POP. 412 · HOME OF CHUCKIE\'S CHEESE', examine: 'WELCOME TO LARIAT. Pop. 412. Home of Chuckie\'s Cheese. Drive friendly.' });
P('sign', 76, 98, { examine: 'FM 38 — LARIAT 1 · HALVERMOUTH 6. Somebody has added a cow sticker.' });
P('noticeboard', 57, 38, { examine: 'LARIAT NOTICES: "LOST: five cows. Answer to their names. Will tell you so. — C." · "Church supper Friday." · "Tractor pull postponed (tractor pulled itself)." · "Land coming up for sale east of FM 38 — see the Land Office."' });
P('bench', 47, 45); P('bench', 64, 45); P('bench', 100, 45);
P('mailbox', 56, 38);
P('car', 101, 48, { w: 2, h: 1, color: '#c8402a', examine: 'A dusty pickup. CALLOWAY on the door and three spanners on the dash.' });
P('tractor', 97, 50, { w: 3, h: 2, color: '#c8402a', examine: 'A red tractor on the Red Dirt lot, with a SOLD SOON sign it has had for a while.' });
P('tractor', 103, 50, { w: 3, h: 2, color: '#3a7a3a', examine: 'A green tractor on the lot. The price is on a card face-down. That tells you everything.' });
P('haybale', 107, 47, { w: 1, h: 1 }); P('haybale', 108, 48, { w: 1, h: 1 });
P('silo', 121, 28, { w: 2, h: 3 }); P('silo', 121, 32, { w: 2, h: 3 }); P('silo', 124, 28, { w: 2, h: 3 });
for (const [x, y] of [[26, 34], [37, 34], [30, 24], [41, 24], [20, 26], [44, 16]]) P('tree', x, y);
for (const [x, y] of [[23, 35], [32, 35]]) P('mailbox', x, y);
// trees on the creek and the county
for (const [x, y] of [[110, 4], [116, 9], [124, 20], [128, 26], [137, 33], [142, 40], [146, 47], [104, 30], [60, 26], [8, 30], [14, 46], [50, 100], [60, 92], [140, 62], [146, 66], [80, 100], [12, 56], [54, 64]]) P('tree', x, y);
// the windmill and the old barn
P('windmill', 16, 4, { w: 3, h: 4, examine: 'An old steel windmill, still turning, pumping nothing into a trough nobody uses. It creaks a tune.' });
P('trough', 15, 9, { w: 2, h: 1 });
for (const [x, y] of [[4, 14], [5, 16], [15, 15]]) P('haybale', x, y, { w: 1, h: 1 });
// the Hollister cotton
for (let y = 5; y < 25; y += 2) P('crops', 88, y, { w: 50, h: 1, crop: 'cotton', stage: 3 });
P('tractor', 86, 22, { w: 3, h: 2, color: '#3a7a3a', examine: 'Earl Hollister\'s tractor. Older than Earl. Runs better.' });
P('silo', 87, 12, { w: 2, h: 3 });
// fallow land coming up for sale
for (const [x, y] of [[84, 69], [116, 69], [84, 91]]) P('sign', x, y, { examine: 'LAND FOR SALE — inquire at the Lariat Land Office, Main Street.' });
for (let x = 84; x < 146; x += 2) { if (x === 110 || x === 111) continue; P('ranchfence', x, 68, { w: 2, h: 1 }); }
// ---------------------------------------------------------------- Chuckie's Cheese
P('bigsign', 46, 60, { w: 4, h: 2, text: 'CHUCKIE\'S CHEESE', sub: 'DAIRY · CHEESE · TEXAS PROUD', color: '#e8c04a', examine: 'CHUCKIE\'S CHEESE — FAMILY OWNED, PUBLICLY TRADED, UDDERLY DELICIOUS.' });
for (const [x, y] of [[23, 75], [25, 75], [27, 75]]) P('silo', x, y, { w: 2, h: 3, color: '#d8dee6', examine: 'A feed silo: corn silage for the herd. It hums when the auger runs.' });
P('milktank', 34, 74, { w: 2, h: 2, examine: 'The bulk milk tank, chilled. A gauge shows how full it is — today, not very.' });
P('car', 44, 77, { w: 3, h: 1, color: '#f2ead8', examine: 'A refrigerated delivery truck: CHUCKIE\'S CHEESE on the side, a cartoon cow winking on the back door.' });
P('car', 44, 79, { w: 3, h: 1, color: '#e8c04a', examine: 'A cheese truck loading at the dock. A crate marked "AGED 12 MONTHS — DO NOT RUSH".' });
for (let k = 0; k < 6; k++) P('haybale', 4 + k, 80, { w: 1, h: 1 });
// pasture fence round the herd's field (gate on the north side by the barns)
for (let x = 3; x <= 24; x += 1) { if (x === 12 || x === 13) continue; P('ranchfence', x, 81, { w: 1, h: 1 }); P('ranchfence', x, 106, { w: 1, h: 1 }); }
for (let y = 82; y < 106; y++) { P('ranchfence', 3, y, { w: 1, h: 1, vertical: true }); P('ranchfence', 24, y, { w: 1, h: 1, vertical: true }); }
// the herd (ordinary cows: they graze and moo, they don't talk)
const coats = [['#2a2420', '#f2ece0'], ['#f2ece0', '#2a2420'], ['#8a5a3a', '#f2ece0'], ['#f2ece0', '#8a5a3a'], ['#3a2a24', '#f2ece0']];
for (let k = 0; k < 22; k++) {
  const x = 5 + ((k * 7) % 18);
  const y = 84 + ((k * 5) % 20);
  const [patches, coat] = coats[k % coats.length];
  P('cow', x, y, { coat, patches, seed: 11 + k * 3, examine: ['A Holstein, chewing. She looks at you the way cows look at everything: patiently, and without much hope.', 'A dairy cow. "Moo," she says. Just "moo". Not one of the special ones, then.', 'A cow with a tag in her ear: No. 117. She moos once, for the record.'][k % 3] });
}
// the lead cows' paddock (where the five special cows live when they're home)
for (let x = 24; x <= 35; x++) { if (x >= 28 && x <= 31) continue; P('ranchfence', x, 81, { w: 1, h: 1 }); P('ranchfence', x, 91, { w: 1, h: 1 }); }
for (let y = 82; y < 91; y++) P('ranchfence', 35, y, { w: 1, h: 1, vertical: true });
P('trough', 30, 89, { w: 2, h: 1, examine: 'The lead cows\' trough, with five names painted along it: BESSIE MAE · CLEMENTINE · DUCHESS · PATSY · DAISY.' });
P('sign', 27, 80, { examine: 'THE LEAD COWS\' PADDOCK. "Please do not discuss politics with the cows."' });

export const lariat = {
  id: 'lariat',
  name: 'Lariat',
  kind: 'outdoor',
  music: { day: 'mus_fields', night: 'mus_fields' },
  ambience: 'amb_fields',
  tiles: m.rows(),
  areas: [
    { id: 'area_lariat_main', name: 'Main Street, Lariat', x: 20, y: 28, w: 112, h: 18 },
    { id: 'area_lariat_cotton', name: 'Cotton Street, Lariat', x: 36, y: 46, w: 76, h: 16 },
    { id: 'area_pecan_street', name: 'Pecan Street', x: 18, y: 14, w: 26, h: 14 },
    { id: 'area_chuckies', name: 'Chuckie\'s Cheese', x: 2, y: 62, w: 48, h: 46 },
    { id: 'area_lead_paddock', name: 'The Lead Cows\' Paddock', x: 25, y: 82, w: 10, h: 9 },
    { id: 'area_hollister', name: 'Hollister Cotton Farm', x: 76, y: 2, w: 64, h: 26 },
    { id: 'area_caddo_creek', name: 'Caddo Creek', x: 110, y: 0, w: 40, h: 60 },
    { id: 'area_windmill', name: 'The Old Windmill', x: 2, y: 2, w: 22, h: 18 },
    { id: 'area_coop', name: 'Lariat Co-op', x: 112, y: 28, w: 14, h: 12 },
    { id: 'area_east_land', name: 'East Fields (for sale)', x: 80, y: 68, w: 68, h: 40 },
    { id: 'area_fm38', name: 'FM 38', x: 66, y: 62, w: 14, h: 48 },
  ],
  buildings,
  doors: [
    // FM 38 runs south to Halvermouth's North Gate
    ...[72, 73, 74, 75].map((x, i) => ({ id: `door_la_south_${i}`, x, y: H - 1, keepTile: true, gateway: 'Halvermouth', label: 'FM 38 south, to Halvermouth', to: { map: 'halvermouth', spot: 'north_gate' } })),
  ],
  spots: {
    south_gate: { x: 73, y: H - 3, facing: 'up' },
    town_square: { x: 66, y: 41, facing: 'down' },
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
    chuckie_lookout: { x: 33, y: 78, facing: 'down' },
    cotton_field: { x: 100, y: 20, facing: 'up' },
    hollister_porch: { x: 84, y: 16, facing: 'down' },
    diner_bench: { x: 64, y: 46, facing: 'down' },
    main_bench: { x: 47, y: 46, facing: 'down' },
    // the five lead cows' hideouts (src/content/dairy.js) and their places in the paddock
    hide_bessie: { x: 57, y: 48, facing: 'down' },
    hide_clementine: { x: 15, y: 8, facing: 'right' },
    hide_duchess: { x: 128, y: 17, facing: 'left' },
    hide_patsy: { x: 124, y: 36, facing: 'left' },
    hide_daisy: { x: 128, y: 98, facing: 'up' },
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
  spots: Object.fromEntries([['opal', 1], ['lupe', 4], ['wade', 9], ['rosa', 12]].map(([k, x]) => [`bed_${k}`, { x, y: 3, facing: 'down' }])),
  props: [
    ...[1, 4, 9, 12].map((x, i) => ({ id: `bh_bed_${i}`, type: 'bed', x, y: 1, w: 1, h: 2 })),
    { id: 'bh_table', type: 'table', x: 6, y: 5, w: 2, examine: 'The boarding-house table, set for breakfast forever: grits, eggs, and a pot of coffee that bites.' },
    { id: 'bh_plant', type: 'plant', x: 12, y: 7 },
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

export default [lariat, mercantile, diner, boardingHouse, milkingParlour, cheesePlant, chuckieHouse, hollisterHouse];
