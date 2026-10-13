// Lanternside — the starting borough of the city of Obermere.
// See docs/WORLD_BIBLE.md for geography. Coordinates are in tiles.
// Run `npm run map` to print an ASCII preview of this map.
import { MapBuilder } from '../../world/mapBuilder.js';

const W = 64;
const H = 48;
const m = new MapBuilder(W, H, '.');

// Gullwing Road (east–west) with pavements
m.rect(0, 11, W, 1, ',').rect(0, 12, W, 2, '=').rect(0, 14, W, 1, ',');
// Lamplighter Lane (north–south) with pavements, north of the canal
m.rect(29, 0, 1, 22, ',').rect(30, 0, 2, 22, '=').rect(32, 0, 1, 22, ',');
// Canal towpaths and the Lantern Canal itself
m.rect(0, 21, W, 1, ',').rect(0, 22, W, 2, '~').rect(0, 24, W, 1, ',');
// Bridges: road bridge and the old footbridge
m.rect(29, 22, 4, 2, 'b').rect(15, 22, 2, 2, 'b');
// Lane continues south to the Quay
m.rect(29, 25, 1, 13, ',').rect(30, 25, 2, 13, '=').rect(32, 25, 1, 13, ',');
// Quay frontage
m.rect(29, 38, 23, 2, ',');
// Harbour basin to the east and the open sea to the south
m.rect(52, 30, 12, 18, '~').rect(51, 30, 1, 14, ',');
m.rect(52, 36, 10, 2, 'p'); // pier
m.rect(0, 44, W, 4, '~').rect(17, 42, 34, 2, 's');
// Western inlet around Lighthouse Point
m.rect(0, 26, 3, 22, '~').rect(3, 26, 1, 3, '~');
m.rect(3, 43, 2, 1, 'r').rect(13, 43, 3, 1, 'r');
// Footpath from the footbridge down to the lighthouse
m.rect(15, 25, 2, 17, ':').rect(9, 41, 8, 2, ':');
// Gullwing Park paths and pond
m.rect(36, 6, 24, 1, ':').rect(47, 1, 1, 10, ':');
m.rect(50, 3, 5, 3, '~');
// Civic Square plaza
m.rect(45, 15, 17, 6, ',');
// Café patio
m.rect(13, 15, 4, 6, ',');
// Quay yard
m.rect(34, 26, 16, 1, 'g').rect(39, 33, 11, 2, 'g');

const tree = (id, x, y, type = 'tree') => ({ id, type, x, y });
const lamp = (id, x, y) => ({ id, type: 'streetlamp', x, y });

export default {
  id: 'lanternside',
  name: 'Lanternside',
  kind: 'outdoor',
  music: { day: 'mus_lanternside_day', night: 'mus_lanternside_night' },
  ambience: 'amb_harbour',
  tiles: m.rows(),
  areas: [
    { id: 'area_brindle', name: 'Brindle Heights', x: 0, y: 0, w: 33, h: 11 },
    { id: 'area_park', name: 'Gullwing Park', x: 33, y: 0, w: 31, h: 11 },
    { id: 'area_canal_row', name: 'Canal Row', x: 0, y: 11, w: 29, h: 14 },
    { id: 'area_civic', name: 'Civic Square', x: 29, y: 11, w: 35, h: 14 },
    { id: 'area_point', name: 'Lighthouse Point', x: 0, y: 25, w: 22, h: 23 },
    { id: 'area_quay', name: 'The Quay', x: 22, y: 25, w: 42, h: 23 },
  ],
  buildings: [
    {
      id: 'b_number9', mapLabel: 'No. 9 (home)', name: 'Number 9, Gullwing Row', x: 3, y: 4, w: 7, h: 6,
      roof: '#4f8a8b', wall: '#efe2c8', trim: '#3d6b6c',
      door: { x: 6, y: 9, to: { map: 'player_flat', spot: 'entry' }, lock: { key: 'item_flat_key' } },
    },
    {
      id: 'b_vane_house', mapLabel: 'Vane House', name: 'Vane Residence', x: 13, y: 4, w: 6, h: 6,
      roof: '#5a6788', wall: '#e6e1d8', trim: '#3e4863',
      door: { x: 15, y: 9, to: { map: 'osric_house', spot: 'entry' }, lock: { key: 'item_vane_key', owners: ['npc_osric'] } },
    },
    {
      id: 'b_to_let', mapLabel: 'No. 11', name: '11 Gullwing Row (To Let)', x: 21, y: 5, w: 6, h: 5,
      roof: '#9b6b5a', wall: '#ece0cf', trim: '#6e4a3e', sign: 'TO LET',
      door: { x: 23, y: 9, to: null, lock: { key: 'item_none', message: 'A faded "To Let" notice. The door is locked tight.' } },
    },
    {
      id: 'b_cafe', mapLabel: 'Kettle & Crumb', name: 'The Kettle & Crumb', x: 4, y: 15, w: 9, h: 5,
      roof: '#c0614a', wall: '#f3e5c6', trim: '#8f3f2e', sign: 'KETTLE & CRUMB', awning: '#d9826a',
      door: { x: 8, y: 19, to: { map: 'cafe', spot: 'entry' }, lock: { key: 'item_cafe_key', owners: ['npc_mags'], hours: { from: '07:00', to: '21:00' } } },
    },
    {
      id: 'b_civic', mapLabel: 'Civic Office', name: 'Lanternside Civic Office', x: 35, y: 15, w: 10, h: 5,
      roof: '#6c7a89', wall: '#e8e4da', trim: '#46505b', sign: 'CIVIC OFFICE', columns: true,
      door: { x: 39, y: 19, to: { map: 'civic_office', spot: 'entry' }, lock: { key: 'item_civic_key', owners: ['npc_osric'], hours: { from: '08:30', to: '17:00' } } },
    },
    {
      id: 'b_workshop', mapLabel: 'Hollow Fixings', name: 'Hollow Fixings', x: 40, y: 27, w: 9, h: 6,
      roof: '#b08a3e', wall: '#d9cdb5', trim: '#6b5428', sign: 'HOLLOW FIXINGS',
      door: { x: 44, y: 32, to: { map: 'workshop', spot: 'entry' }, lock: { key: 'item_workshop_key', owners: ['npc_tibbs'], hours: { from: '07:00', to: '23:00' } } },
    },
    {
      id: 'b_collective', mapLabel: 'Collective Hall', name: 'Quay Collective Hall', x: 33, y: 28, w: 6, h: 5,
      roof: '#7a4f6d', wall: '#ddd2c4', trim: '#523447', sign: 'MEMBERS ONLY',
      door: { x: 35, y: 32, to: null, lock: { key: 'item_collective_card', message: 'A brass plate reads "Quay Workers\' Collective — Members Only". Locked.' } },
    },
    {
      id: 'b_lighthouse', mapLabel: 'Lighthouse', name: 'The Old Lighthouse', x: 8, y: 35, w: 4, h: 6, round: true,
      roof: '#b8423a', wall: '#f2efe8', trim: '#9a3530',
      door: { x: 10, y: 40, to: { map: 'lighthouse', spot: 'entry' }, lock: { key: 'item_lighthouse_key', owners: ['npc_osric'], trespass: 'lighthouse' } },
    },
  ],
  spots: {
    start: { x: 6, y: 11, facing: 'down' },
    flat_door_out: { x: 6, y: 10 },
    vane_door_out: { x: 15, y: 10 },
    cafe_door_out: { x: 8, y: 20 },
    civic_door_out: { x: 39, y: 20 },
    workshop_door_out: { x: 44, y: 33 },
    lighthouse_door_out: { x: 10, y: 41 },
    square_bench: { x: 49, y: 19, facing: 'up' },
    fountain_side: { x: 53, y: 20, facing: 'up' },
    notice_board: { x: 47, y: 17, facing: 'up' },
    park_bench: { x: 41, y: 7, facing: 'down' },
    park_pond: { x: 52, y: 7, facing: 'up' },
    quay_edge: { x: 49, y: 39, facing: 'down' },
    pier_end: { x: 60, y: 37, facing: 'right' },
    lighthouse_gate: { x: 14, y: 41, facing: 'left' },
    canal_footbridge: { x: 16, y: 25, facing: 'up' },
    patio: { x: 14, y: 18, facing: 'left' },
  },
  props: [
    // Brindle Heights
    tree('t_bh1', 1, 2), tree('t_bh2', 11, 3), tree('t_bh3', 20, 2), tree('t_bh4', 27, 3), tree('t_bh5', 1, 8),
    { id: 'fb_n9', type: 'flowerbed', x: 3, y: 10, w: 2 },
    { id: 'fb_vane', type: 'flowerbed', x: 17, y: 10, w: 2 },
    { id: 'mb_brindle', type: 'mailbox', x: 11, y: 10, examine: 'A red post box. Last collection: 17:30. Someone has stuck a gull feather in the slot.' },
    // Gullwing Park
    tree('t_p1', 35, 2), tree('t_p2', 38, 9), tree('t_p3', 43, 2), tree('t_p4', 45, 9), tree('t_p5', 57, 2), tree('t_p6', 60, 8),
    tree('t_p7', 56, 9, 'pine'), tree('t_p8', 39, 3, 'pine'), tree('t_p9', 62, 4),
    { id: 'bench_park', type: 'bench', x: 41, y: 8 },
    { id: 'fb_park1', type: 'flowerbed', x: 44, y: 4, w: 2, interact: { kind: 'forage', item: 'item_wildflowers' } },
    { id: 'fb_park2', type: 'flowerbed', x: 37, y: 7, w: 2, interact: { kind: 'forage', item: 'item_wildflowers' } },
    { id: 'bench_park2', type: 'bench', x: 53, y: 8 },
    {
      id: 'spanner_spot', type: 'item', x: 58, y: 5, item: 'item_lucky_spanner', hiddenUnless: { quest: { id: 'q_lucky_spanner', state: 'active' } },
      examine: 'Something glints under the pine needles.',
    },
    // Canal Row
    lamp('l_cr1', 2, 14), lamp('l_cr2', 12, 14), lamp('l_cr3', 22, 14), lamp('l_cr4', 6, 21), lamp('l_cr5', 24, 21),
    { id: 'patio_t1', type: 'table', x: 14, y: 16 }, { id: 'patio_t2', type: 'table', x: 14, y: 19 },
    { id: 'bench_canal', type: 'bench', x: 20, y: 20 },
    { id: 'bench_canal2', type: 'bench', x: 26, y: 20 },
    tree('t_cr1', 18, 16), tree('t_cr2', 24, 17), tree('t_cr3', 1, 17),
    { id: 'fb_cr', type: 'flowerbed', x: 20, y: 16, w: 3 },
    // Civic Square
    lamp('l_cs1', 34, 14), lamp('l_cs2', 46, 14), lamp('l_cs3', 60, 14), lamp('l_cs4', 44, 21), lamp('l_cs5', 58, 21),
    { id: 'fountain', type: 'fountain', x: 52, y: 17, examine: 'The Lamplighter Fountain. A bronze lamplighter holds up a pole whose wick has been dry for years.' },
    { id: 'noticeboard_civic', type: 'noticeboard', x: 47, y: 16 },
    { id: 'bench_sq1', type: 'bench', x: 49, y: 20 }, { id: 'bench_sq2', type: 'bench', x: 56, y: 20 },
    tree('t_cs1', 61, 16), tree('t_cs2', 61, 19),
    // The Quay
    lamp('l_q1', 34, 37), lamp('l_q2', 44, 37), lamp('l_q3', 50, 35), lamp('l_q4', 28, 30),
    { id: 'crate_q1', type: 'crate', x: 47, y: 35 }, { id: 'crate_q2', type: 'crate', x: 48, y: 35 }, { id: 'barrel_q1', type: 'barrel', x: 49, y: 34 },
    { id: 'scrap_yard', type: 'scrap', x: 39, y: 34, examine: 'A heap of bicycle frames, kettle lids and one suspiciously intact jet ski engine.' },
    { id: 'boat1', type: 'boat', x: 55, y: 34 },
    { id: 'crate_pier', type: 'crate', x: 61, y: 36 },
    tree('t_q1', 24, 28), tree('t_q2', 26, 34), tree('t_q3', 22, 39, 'pine'),
    // Lighthouse Point
    tree('t_lp1', 5, 30, 'pine'), tree('t_lp2', 12, 28, 'pine'), tree('t_lp3', 19, 33, 'pine'), tree('t_lp4', 5, 39, 'pine'),
    { id: 'rock_lp1', type: 'rock', x: 4, y: 42 }, { id: 'rock_lp2', type: 'rock', x: 18, y: 38 },
    {
      id: 'lighthouse_hatch', type: 'hatch', x: 12, y: 38,
      interact: {
        kind: 'obstacle', name: 'Rusted maintenance hatch',
        closedText: 'A rusted maintenance hatch at the base of the tower. The bolts are seized solid. A crowbar might shift it — noisily.',
        requires: { item: 'item_crowbar' }, verb: 'Pry open',
        openedText: 'The hatch hangs open, revealing a dark crawlway into the tower.',
        noise: { crime: 'crime_trespass_lighthouse', radius: 10 },
        enter: { map: 'lighthouse', spot: 'hatch_in', trespass: 'lighthouse' },
      },
    },
    {
      id: 'sign_point', type: 'sign', x: 17, y: 40,
      examine: '"LIGHTHOUSE POINT — Decommissioned. No public access. By order of the Lanternside Civic Office."',
    },
  ],
};
