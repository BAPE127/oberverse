// Westbrook Lots — the western edge of Lanternside where new building happens:
// Mason's Os yard and site office, an active construction site, Plumb Line
// Apartments (the crew's home) and open land for future property plots.
// Its east column is the same ground as Lanternside's west column (see world.js).
import { MapBuilder, roomTiles } from '../../world/mapBuilder.js';

const W = 44;
const H = 48;
const m = new MapBuilder(W, H, '.');
m.rect(0, 12, W, 2, '=').rect(0, 11, 20, 1, ':').rect(0, 14, 20, 1, ':').rect(20, 11, 24, 1, ',').rect(20, 14, 24, 1, ','); // Gullwing Road west
m.rect(18, 21, 26, 1, ',').rect(18, 22, 26, 2, '~').rect(18, 24, 26, 1, ','); // the Lantern Canal's western reach
m.rect(15, 21, 3, 4, '~'); // turning basin
m.rect(3, 1, 20, 9, ':').rect(6, 3, 8, 4, 'g'); // construction site + foundation slab
m.rect(12, 10, 1, 1, ':'); // site gate
m.rect(29, 9, 1, 2, ','); // office path
m.rect(9, 21, 1, 1, ','); // apartment step
m.rect(41, 26, 3, 22, '~').rect(0, 44, W, 4, '~').rect(0, 42, 41, 2, 's'); // inlet and shore

const fence = [];
for (let x = 2; x <= 23; x++) if (x < 11 || x > 13) fence.push({ id: `wfence_s${x}`, type: 'fence', x, y: 10 });
for (let y = 1; y < 10; y++) { fence.push({ id: `wfence_w${y}`, type: 'fence', x: 2, y }); fence.push({ id: `wfence_e${y}`, type: 'fence', x: 23, y }); }
const stake = (id, x, y) => ({ id, type: 'stake', x, y });
const lamp = (id, x, y) => ({ id, type: 'streetlamp', x, y });

export const westbrook = {
  id: 'westbrook',
  name: 'Westbrook Lots',
  kind: 'outdoor',
  music: { day: 'mus_westbrook', night: 'mus_lanternside_night' },
  ambience: 'amb_site',
  tiles: m.rows(),
  areas: [
    { id: 'area_mason_yard', name: 'Mason\'s Os Yard', x: 0, y: 0, w: 44, h: 11 },
    { id: 'area_westbrook_row', name: 'Westbrook Row', x: 0, y: 11, w: 44, h: 14 },
    { id: 'area_the_lots', name: 'The Lots', x: 0, y: 25, w: 44, h: 23 },
  ],
  buildings: [
    {
      id: 'b_mason_office', mapLabel: 'Mason\'s Os', name: 'Mason\'s Os Site Office', x: 26, y: 4, w: 7, h: 5,
      roof: '#d9a23a', wall: '#f2efe6', trim: '#8a6a2a', sign: 'MASON\'S Os',
      door: { x: 29, y: 8, to: { map: 'mason_office', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_mason', 'npc_dee', 'npc_barnaby', 'npc_quinn'], hours: { from: '07:00', to: '18:30' } } },
    },
    {
      id: 'b_plumb_line', mapLabel: 'Plumb Line Apts', name: 'Plumb Line Apartments', x: 4, y: 15, w: 12, h: 6,
      roof: '#7a8a9a', wall: '#e2d4bd', trim: '#4a5a6a', sign: 'PLUMB LINE APTS',
      door: { x: 9, y: 20, to: { map: 'apartments', spot: 'entry' }, lock: { key: 'item_none', owners: ['npc_mason', 'npc_dee', 'npc_barnaby', 'npc_quinn'], hours: { from: '07:00', to: '22:00' } } },
    },
  ],
  doors: [
    { id: 'door_wb_west_gate_a', x: 0, y: 12, keepTile: true, gateway: 'Halvermouth', label: 'The road to Halvermouth', to: { map: 'halvermouth', spot: 'east_gate' } },
    { id: 'door_wb_west_gate_b', x: 0, y: 13, keepTile: true, gateway: 'Halvermouth', label: 'The road to Halvermouth', to: { map: 'halvermouth', spot: 'east_gate' } },
  ],
  spots: {
    west_gate: { x: 1, y: 13, facing: 'right' },
    east_edge: { x: 41, y: 13, facing: 'left' },
    site_center: { x: 12, y: 8, facing: 'up' },
    foreman_post: { x: 12, y: 9, facing: 'down' },
    excavator_seat: { x: 16, y: 5, facing: 'down' },
    mixer_spot: { x: 9, y: 8, facing: 'up' },
    bricks_spot: { x: 6, y: 8, facing: 'up' },
    trench_spot: { x: 19, y: 8, facing: 'left' },
    lunch_bench: { x: 21, y: 8, facing: 'down' },
    office_door_out: { x: 29, y: 9, facing: 'up' },
    apartments_door_out: { x: 9, y: 21, facing: 'up' },
    birdwatch: { x: 17, y: 26, facing: 'up' },
    survey: { x: 20, y: 31, facing: 'down' },
    lots_sign: { x: 24, y: 27, facing: 'down' },
  },
  props: [
    ...fence,
    { id: 'wb_gatepost_n', type: 'gatepost', x: 1, y: 11 }, { id: 'wb_gatepost_s', type: 'gatepost', x: 1, y: 14 },
    { id: 'wb_city_sign', type: 'sign', x: 0, y: 9, examine: '"← WEST: HALVERMOUTH. City Centre · Civic Plaza · The Docks. Drive carefully — the city doesn\'t."' },
    { id: 'site_sign', type: 'sign', x: 14, y: 10, examine: '"MASON\'S Os — That\'s O plural! Because we never stop at one. Hard hats beyond this point. Soft hearts everywhere."' },
    { id: 'scaffold_1', type: 'scaffold', x: 7, y: 2, w: 2, h: 2, examine: 'Scaffolding around what will one day be a very respectable wall. Someone has chalked "WALL-E" on a pole.' },
    { id: 'scaffold_2', type: 'scaffold', x: 11, y: 2, w: 2, h: 2 },
    { id: 'excavator', type: 'excavator', x: 16, y: 4, w: 2, h: 2, solid: false, sortRow: 5, animateWhen: { npcAt: { npc: 'npc_mason', activity: 'excavate' } }, examine: 'A yellow mini excavator. A sticker on the cab reads "I DIG IT". Mason denies putting it there. Mason put it there.' },
    { id: 'lumber', type: 'lumber', x: 19, y: 2, w: 2, examine: 'A stack of lumber. Mason calls it "the board of directors".' },
    { id: 'site_bricks', type: 'bricks', x: 5, y: 7, w: 2, interact: { kind: 'workstation', company: 'construction', station: 'bricks', name: 'Brick stack' } },
    { id: 'site_mixer', type: 'mixer', x: 9, y: 7, interact: { kind: 'workstation', company: 'construction', station: 'mixer', name: 'Cement mixer' } },
    { id: 'site_trench', type: 'trench', x: 17, y: 7, w: 2, interact: { kind: 'workstation', company: 'construction', station: 'trench', name: 'Trench' } },
    { id: 'site_loo', type: 'booth', x: 21, y: 2, examine: 'A portable toilet stencilled "MASON\'S LOO-S". Occupied, somehow, at all times.' },
    { id: 'site_bench', type: 'bench', x: 20, y: 9 },
    lamp('wl_1', 5, 14), lamp('wl_2', 18, 14), lamp('wl_3', 32, 14), lamp('wl_4', 40, 10), lamp('wl_5', 24, 21),
    { id: 'tree_w1', type: 'tree', x: 26, y: 1 }, { id: 'tree_w2', type: 'tree', x: 36, y: 3 }, { id: 'tree_w3', type: 'pine', x: 40, y: 6 },
    { id: 'tree_w4', type: 'tree', x: 1, y: 17 }, { id: 'tree_w5', type: 'pine', x: 34, y: 17 }, { id: 'tree_w6', type: 'tree', x: 38, y: 19 },
    { id: 'tree_w7', type: 'pine', x: 2, y: 30 }, { id: 'tree_w8', type: 'tree', x: 37, y: 37 }, { id: 'tree_w9', type: 'tree', x: 6, y: 39 },
    { id: 'fb_apts', type: 'flowerbed', x: 11, y: 21, w: 2 },
    { id: 'bench_w', type: 'bench', x: 30, y: 20 },
    // The Lots: surveyed, waiting for future properties (see docs/PROPERTIES.md)
    { id: 'lots_sign', type: 'sign', x: 24, y: 26, examine: '"SURVEYED LOTS — Build your future here! Enquire at Mason\'s Os. (We\'ll make it brick-ly worth your while.)"' },
    stake('stk_1', 6, 28), stake('stk_2', 16, 28), stake('stk_3', 6, 35), stake('stk_4', 16, 35),
    stake('stk_5', 26, 30), stake('stk_6', 36, 30), stake('stk_7', 26, 38), stake('stk_8', 36, 38),
  ],
};

export const masonOffice = {
  id: 'mason_office',
  name: 'Mason\'s Os Site Office',
  kind: 'interior',
  music: 'mus_westbrook',
  ambience: 'amb_indoor',
  owner: 'npc_mason',
  tiles: roomTiles(10, 7, 'f', 4),
  doors: [{ id: 'door_mason_office_exit', x: 4, y: 6, to: { map: 'westbrook', spot: 'office_door_out' } }],
  spots: { entry: { x: 4, y: 5, facing: 'up' }, desk: { x: 7, y: 2, facing: 'up' }, drafting: { x: 2, y: 4, facing: 'up' }, board_front: { x: 3, y: 1, facing: 'up' } },
  props: [
    { id: 'mo_desk', type: 'desk', x: 6, y: 1, color: '#8a6142', examine: 'Mason\'s desk: invoices, a mug reading "WORLD\'S OKAYEST BOSS", and a joke-a-day calendar torn off three weeks ahead.' },
    { id: 'mo_board', type: 'board', x: 3, y: 0, interact: { kind: 'contracts', name: 'Contracts board' } },
    { id: 'mo_draft', type: 'desk', x: 1, y: 3, w: 2, color: '#c9b48a', examine: 'Quinn\'s drafting table. Every line is ruler-straight. One margin doodle of a gull in a hard hat.' },
    { id: 'mo_cab', type: 'cabinet', x: 8, y: 1, examine: 'Permits, in triplicate. Osric would be proud. Osric IS proud; he said so, once, at length.' },
    { id: 'mo_coffee', type: 'stove', x: 8, y: 4, examine: 'A coffee machine with a label: "BREW-NO-STOP". It has never been cleaned. It has never needed to be. It is perfect.' },
    { id: 'mo_win', type: 'window', x: 7, y: 0 },
  ],
};

export const apartments = {
  id: 'apartments',
  name: 'Plumb Line Apartments',
  kind: 'interior',
  music: 'mus_home',
  ambience: 'amb_indoor',
  tiles: roomTiles(16, 9, 'f', 8),
  doors: [{ id: 'door_apartments_exit', x: 8, y: 8, to: { map: 'westbrook', spot: 'apartments_door_out' } }],
  spots: {
    entry: { x: 8, y: 7, facing: 'up' },
    bed_mason: { x: 2, y: 2, facing: 'left' },
    bed_dee: { x: 4, y: 2, facing: 'left' },
    bed_barnaby: { x: 11, y: 2, facing: 'right' },
    bed_quinn: { x: 13, y: 2, facing: 'right' },
    common: { x: 6, y: 4, facing: 'right' },
    common_b: { x: 9, y: 4, facing: 'left' },
    armchair: { x: 3, y: 6, facing: 'right' },
    window_seat: { x: 12, y: 5, facing: 'up' },
  },
  props: [
    { id: 'apt_bed1', type: 'bed', x: 1, y: 1, color: '#9a5a3a' }, { id: 'apt_bed2', type: 'bed', x: 3, y: 1, color: '#5a7a9a' },
    { id: 'apt_bed3', type: 'bed', x: 12, y: 1, color: '#6a8a5a' }, { id: 'apt_bed4', type: 'bed', x: 14, y: 1, color: '#8a6a9a' },
    { id: 'apt_table', type: 'table', x: 7, y: 4, w: 2, examine: 'The common-room table. A sign: "PUN JAR — 1 obol per groan". The jar is full. It is always full.' },
    { id: 'apt_stove', type: 'stove', x: 14, y: 6 },
    { id: 'apt_rug', type: 'rug', x: 6, y: 5, w: 4, h: 2, color: '#a0703a' },
    { id: 'apt_plant', type: 'plant', x: 1, y: 6 },
    { id: 'apt_mail', type: 'cabinet', x: 10, y: 6, examine: 'Mailboxes: M. NAILS (landlord, handyman, pun enthusiast), D. RIVERA, B. COLE, Q. ABERNATHY.' },
    { id: 'apt_win', type: 'window', x: 5, y: 0 }, { id: 'apt_win2', type: 'window', x: 10, y: 0 },
  ],
};

export default [westbrook, masonOffice, apartments];
