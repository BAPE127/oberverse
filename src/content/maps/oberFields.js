// The Ober Fields — Sir Moneybucks's estate east of Lanternside: the manor,
// the Ober's Oil refinery, the oil fields and the workers' bunkhouse.
// Coordinates are in tiles. Preview with `npm run map -- ober_fields`.
import { MapBuilder, roomTiles } from '../../world/mapBuilder.js';

const W = 52;
const H = 40;
const m = new MapBuilder(W, H, '.');
m.rect(0, 12, W - 7, 2, '=').rect(0, 11, 20, 1, ':').rect(0, 14, 20, 1, ':'); // the county road
m.rect(44, 9, 7, 7, 'm'); // v0.20.0: Wellhead Circle — the county road ends round Ober's first well
m.rect(51, 0, 1, H, 'r'); // the escarpment: the estate ends here
m.rect(33, 10, 1, 2, 'g'); // manor drive
m.rect(22, 15, 27, 11, 'g'); // refinery apron
m.rect(22, 26, 29, 13, ':'); // oil fields
m.rect(8, 15, 3, 6, ':').rect(5, 21, 9, 2, ':'); // bunkhouse yard
// Continuations of Lanternside across the seam (x = 0 here is Lanternside's x = 63):
m.rect(0, 21, 5, 1, ',').rect(0, 22, 4, 2, '~').rect(0, 24, 5, 1, ','); // the Lantern Canal ends in a culvert pool
m.rect(0, 30, 5, 10, '~').rect(5, 32, 1, 6, '~'); // the harbour's eastern shore

const fence = [];
for (let y = 1; y < 39; y++) if (y < 11 || y > 14) fence.push({ id: `fence_${y}`, type: 'fence', x: 20, y });

const derrick = (id, x, y, extra = {}) => ({ id, type: 'derrick', x, y, w: 2, h: 2, examine: 'An Ober\'s Oil derrick, hammering away. Everything smells faintly of money and burnt pennies.', ...extra });
const pipe = (id, x, y, hidden) => ({ id, type: 'pipe', x, y, ...(hidden ? { hiddenUnless: hidden } : {}) });

const pipeline = [];
for (let x = 0; x < 20; x++) pipeline.push(pipe(`pipeline_w${x}`, x, 25, { oil: { pipeline: true } }));

export const oberFields = {
  id: 'ober_fields',
  name: 'The Ober Fields',
  kind: 'outdoor',
  music: { day: 'mus_fields', night: 'mus_fields' },
  ambience: 'amb_fields',
  tiles: m.rows(),
  areas: [
    { id: 'area_county_road', name: 'County Road', x: 0, y: 0, w: 20, h: 40 },
    { id: 'area_estate', name: 'Moneybucks Estate', x: 20, y: 0, w: 32, h: 15 },
    { id: 'area_refinery', name: 'Ober\'s Oil Refinery', x: 20, y: 15, w: 32, h: 11 },
    { id: 'area_oilfields', name: 'The Oil Fields', x: 20, y: 26, w: 32, h: 14 },
  ],
  buildings: [
    {
      id: 'b_manor', mapLabel: 'Moneybucks Manor', name: 'Moneybucks Manor', x: 26, y: 2, w: 16, h: 8,
      roof: '#3a3f4f', wall: '#efe6d4', trim: '#2b2e38', sign: 'MONEYBUCKS MANOR', columns: true,
      door: {
        x: 33, y: 9, to: { map: 'manor', spot: 'entry' },
        lock: {
          key: 'item_none', owners: ['npc_moneybucks', 'npc_crisp', 'npc_mabel', 'npc_silas', 'npc_agnes'],
          flag: 'manor_invited', hours: { from: '08:00', to: '21:00' },
          flagMessage: 'Moneybucks Manor: callers are received by invitation only. The butler will not be moved.',
        },
      },
    },
    {
      id: 'b_refinery', mapLabel: 'Refinery', name: 'Ober\'s Oil Refinery No. 1', x: 24, y: 17, w: 14, h: 7,
      roof: '#5a5f66', wall: '#b9b4aa', trim: '#3d4045', sign: 'OBER\'S OIL',
      door: {
        x: 30, y: 23, to: { map: 'refinery', spot: 'entry' },
        lock: { key: 'item_none', owners: ['npc_moneybucks', 'npc_gideon', 'npc_ruby', 'npc_pip', 'npc_otto', 'npc_delphine', 'npc_hank'], hours: { from: '06:00', to: '20:00' } },
      },
    },
    {
      id: 'b_bunkhouse', mapLabel: 'Bunkhouse', name: 'Workers\' Bunkhouse', x: 5, y: 16, w: 9, h: 5,
      roof: '#7d5a3c', wall: '#d8c9ad', trim: '#59402b', sign: 'BUNKHOUSE',
      door: {
        x: 9, y: 20, to: { map: 'bunkhouse', spot: 'entry' },
        lock: { key: 'item_none', owners: ['npc_gideon', 'npc_ruby', 'npc_hank', 'npc_pip', 'npc_otto'], hours: { from: '06:00', to: '22:00' } },
      },
    },
  ],
  spots: {
    west_road: { x: 2, y: 12, facing: 'right' },
    gate_post: { x: 22, y: 10, facing: 'left' },
    picket_1: { x: 18, y: 11, facing: 'right' },
    picket_2: { x: 17, y: 13, facing: 'right' },
    picket_3: { x: 18, y: 14, facing: 'right' },
    manor_door_out: { x: 33, y: 10, facing: 'up' },
    garden: { x: 29, y: 11, facing: 'up' },
    refinery_door_out: { x: 30, y: 24, facing: 'up' },
    bunkhouse_door_out: { x: 9, y: 21, facing: 'up' },
    derrick_a: { x: 27, y: 30, facing: 'left' },
    inspection_point: { x: 30, y: 28, facing: 'down' },
    derrick_b: { x: 35, y: 32, facing: 'left' },
    pumpjack_spot: { x: 31, y: 35, facing: 'left' },
    pipeline: { x: 44, y: 26, facing: 'up' },
    tank_yard: { x: 42, y: 23, facing: 'up' },
    east_overlook: { x: 49, y: 10, facing: 'right' },
    field_entrance: { x: 23, y: 27, facing: 'down' },
  },
  props: [
    ...fence,
    { id: 'wellhead_monument', type: 'statue', x: 46, y: 9, label: 'FIRST WELL', examine: '"OBER\'S FIRST WELL — struck by Sir R. E. Moneybucks\'s grandfather, who was standing on it at the time." The county road turns round here; beyond is the escarpment.' },
    { id: 'gate_booth', type: 'booth', x: 21, y: 9, examine: 'A green gatehouse booth. A clipboard on the counter lists approved visitors. Your name is not on it.' },
    { id: 'sign_private', type: 'sign', x: 18, y: 9, examine: '"OBER\'S OIL — PRIVATE PROPERTY. Trespassers will be invoiced." Underneath, smaller: "Sir R. E. Moneybucks, Esq., Founder, Owner, Benefactor."' },
    { id: 'sign_bunk', type: 'sign', x: 14, y: 22, examine: 'A hand-painted sign: "BUNKHOUSE — wipe your boots, Gideon means it."' },
    // manor grounds
    { id: 'manor_fountain', type: 'fountain', x: 37, y: 10, examine: 'A marble fountain topped with a gilded derrick that spouts — of course — water. For now.' },
    { id: 'hedge_1', type: 'bush', x: 24, y: 4, w: 1, h: 4 }, { id: 'hedge_2', type: 'bush', x: 43, y: 4, w: 1, h: 4 },
    { id: 'tree_m1', type: 'tree', x: 23, y: 1 }, { id: 'tree_m2', type: 'tree', x: 46, y: 2 }, { id: 'tree_m3', type: 'tree', x: 49, y: 6 },
    { id: 'lamp_m1', type: 'streetlamp', x: 32, y: 10 }, { id: 'lamp_m2', type: 'streetlamp', x: 35, y: 10 },
    { id: 'lamp_g', type: 'streetlamp', x: 19, y: 10 }, { id: 'lamp_r', type: 'streetlamp', x: 29, y: 24 },
    // refinery yard
    { id: 'tank_1', type: 'tank', x: 40, y: 16, w: 2, h: 2 }, { id: 'tank_2', type: 'tank', x: 43, y: 16, w: 2, h: 2 }, { id: 'tank_3', type: 'tank', x: 46, y: 16, w: 2, h: 2 },
    { id: 'tank_4', type: 'tank', x: 40, y: 20, w: 2, h: 2 }, { id: 'tank_5', type: 'tank', x: 43, y: 20, w: 2, h: 2 },
    pipe('pipe_r1', 38, 19), pipe('pipe_r2', 39, 19), pipe('pipe_r3', 42, 19), pipe('pipe_r4', 45, 19),
    { id: 'barrels_yard', type: 'barrel', x: 23, y: 16 }, { id: 'crate_yard', type: 'crate', x: 23, y: 18 },
    // oil fields
    derrick('derrick_1', 25, 29), derrick('derrick_2', 33, 31), derrick('derrick_3', 42, 29),
    derrick('derrick_x1', 46, 33, { hiddenUnless: { oil: { derricks: '>=1' } }, examine: 'A brand-new derrick. A brass plaque thanks "our valued investors". Your name is on it, in very small letters.' }),
    derrick('derrick_x2', 38, 34, { hiddenUnless: { oil: { derricks: '>=2' } } }),
    derrick('derrick_x3', 47, 28, { hiddenUnless: { oil: { derricks: '>=3' } } }),
    { id: 'pumpjack_1', type: 'pumpjack', x: 29, y: 35, w: 2, examine: 'A nodding pumpjack. Hank has named it "Gerald". Everyone has a Gerald.' },
    { id: 'pumpjack_2', type: 'pumpjack', x: 38, y: 37, w: 2 },
    pipe('pipe_f1', 44, 27), pipe('pipe_f2', 44, 28), pipe('pipe_f3', 44, 31), pipe('pipe_f4', 44, 32),
    ...pipeline,
    // around the bunkhouse
    { id: 'tree_b1', type: 'pine', x: 2, y: 17 }, { id: 'tree_b2', type: 'pine', x: 15, y: 17 }, { id: 'tree_b3', type: 'tree', x: 3, y: 4 },
    { id: 'tree_b4', type: 'tree', x: 11, y: 6 }, { id: 'tree_b5', type: 'pine', x: 8, y: 29 },
    { id: 'sign_west', type: 'sign', x: 2, y: 10, examine: '"WEST ← Lanternside. Civic Office, Kettle & Crumb, the Quay."' }, { id: 'tree_b6', type: 'pine', x: 14, y: 33 },
    { id: 'bench_bunk', type: 'bench', x: 11, y: 22 },
  ],
};

export const manor = {
  id: 'manor',
  name: 'Moneybucks Manor',
  kind: 'interior',
  music: 'mus_manor',
  ambience: 'amb_indoor',
  owner: 'npc_moneybucks',
  tiles: roomTiles(20, 12, 't', 6, [[11, 1, 1, 10, 'W'], [11, 5, 1, 2, 't'], [12, 1, 7, 10, 'c']]),
  doors: [{ id: 'door_manor_exit', x: 6, y: 11, to: { map: 'ober_fields', spot: 'manor_door_out' } }],
  spots: {
    entry: { x: 6, y: 10, facing: 'up' },
    butler_post: { x: 8, y: 9, facing: 'down' },
    hall_center: { x: 6, y: 7, facing: 'down' },
    kitchen: { x: 9, y: 2, facing: 'right' },
    dining: { x: 5, y: 2, facing: 'down' },
    dining_b: { x: 5, y: 4, facing: 'up' },
    master_bed: { x: 2, y: 2, facing: 'down' },
    staff_bed1: { x: 1, y: 10, facing: 'up' },
    staff_bed2: { x: 2, y: 10, facing: 'up' },
    staff_bed3: { x: 3, y: 10, facing: 'up' },
    staff_bed4: { x: 4, y: 10, facing: 'up' },
    study_desk: { x: 15, y: 2, facing: 'down' },
    card_table: { x: 16, y: 7, facing: 'left' },
    agnes_desk: { x: 17, y: 8, facing: 'down' },
  },
  props: [
    { id: 'manor_stairs', type: 'stairs', x: 1, y: 1, examine: 'A sweeping staircase to Sir Moneybucks\'s private apartments. A velvet rope says, eloquently, "no".' },
    { id: 'manor_paint1', type: 'painting', x: 4, y: 0, examine: 'Sir Moneybucks, in oils, standing on a smaller man.' },
    { id: 'manor_paint2', type: 'painting', x: 8, y: 0, examine: 'Sir Moneybucks\'s father, also in oils, also standing on a smaller man. It runs in the family.' },
    { id: 'manor_table', type: 'table', x: 4, y: 3, w: 3, color: '#5a3424', examine: 'A dining table long enough to keep guests at a comfortable distance.' },
    { id: 'manor_chair1', type: 'chair', x: 5, y: 2 }, { id: 'manor_chair2', type: 'chair', x: 5, y: 4 },
    { id: 'manor_stove', type: 'stove', x: 10, y: 1, examine: 'Mabel\'s range. It is spotless, hot, and somehow judgemental.' },
    { id: 'manor_counter', type: 'counter', x: 10, y: 2 },
    { id: 'manor_rug', type: 'rug', x: 5, y: 6, w: 3, h: 2, color: '#7a2f35' },
    { id: 'manor_bed1', type: 'bed', x: 1, y: 8, color: '#6d6a60' }, { id: 'manor_bed2', type: 'bed', x: 2, y: 8, color: '#6d6a60' },
    { id: 'manor_bed3', type: 'bed', x: 3, y: 8, color: '#6d6a60' }, { id: 'manor_bed4', type: 'bed', x: 4, y: 8, color: '#6d6a60' },
    { id: 'manor_plant', type: 'plant', x: 9, y: 10 },
    // the study
    { id: 'study_shelf', type: 'shelf', x: 12, y: 1, w: 2, examine: 'Leather-bound books, uncut. "The Moral Case for Monopoly", volumes I to IX.' },
    { id: 'study_paint', type: 'painting', x: 15, y: 0, examine: 'A painting of Ober\'s Oil Derrick No. 1 gushing into a grey sky. A small brass plate: "The Day It All Began."' },
    { id: 'study_desk', type: 'desk', x: 15, y: 3, color: '#3d2418', interact: { kind: 'container', container: 'ct_moneybucks_desk' } },
    { id: 'study_vault', type: 'vault', x: 18, y: 1, interact: { kind: 'container', container: 'ct_manor_vault' } },
    { id: 'study_cardtable', type: 'table', x: 14, y: 7, w: 2, color: '#2f5a3a', examine: 'A green baize card table. A deck sits squared at Sir Moneybucks\'s place. Only at his place.' },
    { id: 'study_chair1', type: 'chair', x: 13, y: 7 }, { id: 'study_chair2', type: 'chair', x: 16, y: 7 },
    { id: 'agnes_desk', type: 'desk', x: 17, y: 9, color: '#6b4a32', interact: { kind: 'read', doc: 'doc_company_ledger', private: 'npc_agnes', caughtBark: 'Those are the company books, and they are not for you.' } },
    { id: 'study_plant', type: 'plant', x: 18, y: 5 },
  ],
};

export const refinery = {
  id: 'refinery',
  name: 'Ober\'s Oil Refinery No. 1',
  kind: 'interior',
  music: 'mus_refinery',
  ambience: 'amb_refinery',
  owner: 'npc_moneybucks',
  tiles: roomTiles(18, 11, 'g', 8),
  doors: [{ id: 'door_refinery_exit', x: 8, y: 10, to: { map: 'ober_fields', spot: 'refinery_door_out' } }],
  spots: {
    entry: { x: 8, y: 9, facing: 'up' },
    valves_spot: { x: 3, y: 3, facing: 'up' },
    gauges_spot: { x: 8, y: 2, facing: 'up' },
    barrels_spot: { x: 13, y: 6, facing: 'down' },
    column_spot: { x: 11, y: 4, facing: 'right' },
    foreman: { x: 16, y: 3, facing: 'up' },
    lab: { x: 3, y: 8, facing: 'left' },
    lab_cot: { x: 16, y: 9, facing: 'up' },
  },
  props: [
    { id: 'ref_valves', type: 'valve', x: 2, y: 2, w: 3, interact: { kind: 'workstation', station: 'valves', name: 'Valve bank' } },
    { id: 'ref_gauges', type: 'gauge', x: 7, y: 1, w: 3, interact: { kind: 'workstation', station: 'gauges', name: 'Gauge panel' } },
    { id: 'ref_barrels', type: 'barrelline', x: 12, y: 7, w: 3, interact: { kind: 'workstation', station: 'barrels', name: 'Barrel line' } },
    { id: 'ref_column', type: 'column', x: 12, y: 2, w: 2, h: 3, examine: 'The distillation column, ticking and gurgling. A chalk tally on its base counts "days since last incident". It says 3. It has been rubbed out a lot.' },
    { id: 'ref_desk', type: 'desk', x: 15, y: 2, examine: 'The foreman\'s desk: timesheets, a stopwatch, and a sign reading "BREAKS ARE A STATE OF MIND".' },
    { id: 'ref_lab', type: 'workbench', x: 1, y: 7, w: 2, examine: 'Delphine\'s lab bench. Flasks, a spectroscope, and a jar labelled "DO NOT".' },
    
    { id: 'ref_win', type: 'window', x: 5, y: 0 }, { id: 'ref_win2', type: 'window', x: 14, y: 0 },
  ],
};

export const bunkhouse = {
  id: 'bunkhouse',
  name: 'Workers\' Bunkhouse',
  kind: 'interior',
  music: 'mus_home',
  ambience: 'amb_indoor',
  tiles: roomTiles(12, 8, 'f', 6),
  doors: [{ id: 'door_bunkhouse_exit', x: 6, y: 7, to: { map: 'ober_fields', spot: 'bunkhouse_door_out' } }],
  spots: {
    entry: { x: 6, y: 6, facing: 'up' },
    bunk1: { x: 2, y: 2, facing: 'left' },
    bunk2: { x: 4, y: 2, facing: 'left' },
    bunk3: { x: 6, y: 2, facing: 'left' },
    bunk4: { x: 8, y: 2, facing: 'left' },
    bunk5: { x: 10, y: 2, facing: 'left' },
    table_a: { x: 4, y: 4, facing: 'right' },
    table_b: { x: 7, y: 4, facing: 'left' },
  },
  props: [
    { id: 'bunk_bed1', type: 'bed', x: 1, y: 1, color: '#8a7a5a' }, { id: 'bunk_bed2', type: 'bed', x: 3, y: 1, color: '#7a8a5a' },
    { id: 'bunk_bed3', type: 'bed', x: 5, y: 1, color: '#8a5a5a' }, { id: 'bunk_bed4', type: 'bed', x: 7, y: 1, color: '#5a6a8a' },
    { id: 'bunk_bed5', type: 'bed', x: 9, y: 1, color: '#6a5a8a' },
    { id: 'bunk_table', type: 'table', x: 5, y: 4, w: 2, interact: { kind: 'read', doc: 'doc_union_pamphlet' } },
    { id: 'bunk_stove', type: 'stove', x: 10, y: 5, examine: 'A pot-bellied stove. Someone has hung wet socks on it. Several someones.' },
    { id: 'bunk_win', type: 'window', x: 3, y: 0 }, { id: 'bunk_win2', type: 'window', x: 8, y: 0 },
  ],
};

export default [oberFields, manor, refinery, bunkhouse];
