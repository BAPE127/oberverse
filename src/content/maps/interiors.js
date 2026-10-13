// Interior maps. Each is a walled room built with roomTiles(); the doorway in
// the bottom wall links back to the matching spot on the outdoor map.
import { roomTiles } from '../../world/mapBuilder.js';

export const playerFlat = {
  id: 'player_flat',
  name: 'Number 9, Gullwing Row',
  kind: 'interior',
  music: 'mus_home',
  ambience: 'amb_indoor',
  tiles: roomTiles(10, 8, 'f', 4),
  doors: [{ id: 'door_flat_exit', x: 4, y: 7, to: { map: 'lanternside', spot: 'flat_door_out' } }],
  spots: { entry: { x: 4, y: 6, facing: 'up' }, bedside: { x: 2, y: 2 } },
  props: [
    { id: 'flat_bed', type: 'bed', x: 1, y: 1, color: '#6f8fb5', interact: { kind: 'sleep' }, examine: 'Your bed. It came with the flat, along with a faint smell of lavender.' },
    { id: 'flat_wardrobe', type: 'wardrobe', x: 8, y: 1, interact: { kind: 'container', container: 'ct_flat_wardrobe' } },
    {
      id: 'flat_desk', type: 'desk', x: 5, y: 1,
      interact: { kind: 'read', doc: 'doc_welcome_letter' },
    },
    { id: 'flat_rug', type: 'rug', x: 3, y: 3, w: 3, h: 2, color: '#8e5a6e' },
    { id: 'flat_stove', type: 'stove', x: 1, y: 4, examine: 'A two-ring stove. One ring works. The other is decorative, apparently.' },
    { id: 'flat_counter', type: 'counter', x: 1, y: 5 },
    { id: 'flat_plant', type: 'plant', x: 8, y: 5, examine: 'A fern called Gerald, according to the label taped to the pot.' },
    { id: 'flat_win1', type: 'window', x: 3, y: 0 }, { id: 'flat_win2', type: 'window', x: 7, y: 0 },
  ],
};

export const cafe = {
  id: 'cafe',
  name: 'The Kettle & Crumb',
  kind: 'interior',
  music: 'mus_cafe',
  ambience: 'amb_cafe',
  owner: 'npc_mags',
  tiles: roomTiles(14, 10, 't', 6),
  doors: [{ id: 'door_cafe_exit', x: 6, y: 9, to: { map: 'lanternside', spot: 'cafe_door_out' } }],
  spots: {
    entry: { x: 6, y: 8, facing: 'up' },
    counter: { x: 4, y: 2, facing: 'down' },
    oven: { x: 1, y: 2, facing: 'up' },
    mags_bed: { x: 11, y: 2, facing: 'right' },
    table_corner: { x: 11, y: 7, facing: 'left' },
    table_center: { x: 5, y: 6, facing: 'left' },
    table_window: { x: 9, y: 4, facing: 'right' },
  },
  props: [
    { id: 'cafe_oven', type: 'oven', x: 1, y: 1, examine: 'A cast-iron bread oven, warm to the touch even in the evening.' },
    { id: 'cafe_shelf', type: 'shelf', x: 2, y: 1, w: 2, examine: 'Jars of flour, honey, and something labelled "EMERGENCY CINNAMON".' },
    { id: 'cafe_counter', type: 'counter', x: 2, y: 3, w: 5, examine: 'The counter of the Kettle & Crumb. Talk to whoever is behind it to order.' },
    { id: 'cafe_display', type: 'display', x: 8, y: 1, w: 2, interact: { kind: 'stockcheck', shop: 'shop_kettle' } },
    { id: 'cafe_bed', type: 'bed', x: 12, y: 1, color: '#c98b6b', examine: 'A narrow bed tucked behind a folding screen. Mags lives where she works.' },
    { id: 'cafe_t1', type: 'table', x: 4, y: 6 }, { id: 'cafe_c1', type: 'chair', x: 5, y: 6 },
    { id: 'cafe_t2', type: 'table', x: 10, y: 4 }, { id: 'cafe_c2', type: 'chair', x: 9, y: 4 },
    { id: 'cafe_t3', type: 'table', x: 10, y: 7 }, { id: 'cafe_c3', type: 'chair', x: 11, y: 7 },
    { id: 'cafe_t4', type: 'table', x: 2, y: 7 },
    { id: 'cafe_plant', type: 'plant', x: 12, y: 8 },
    { id: 'cafe_win1', type: 'window', x: 5, y: 0 }, { id: 'cafe_win2', type: 'window', x: 11, y: 0 },
  ],
};

export const civicOffice = {
  id: 'civic_office',
  name: 'Lanternside Civic Office',
  kind: 'interior',
  music: 'mus_civic',
  ambience: 'amb_indoor',
  owner: 'npc_osric',
  tiles: roomTiles(14, 10, 't', 7),
  doors: [{ id: 'door_civic_exit', x: 7, y: 9, to: { map: 'lanternside', spot: 'civic_door_out' } }],
  spots: {
    entry: { x: 7, y: 8, facing: 'up' },
    desk_chair: { x: 8, y: 2, facing: 'down' },
    filing: { x: 2, y: 2, facing: 'up' },
  },
  props: [
    {
      id: 'civic_desk', type: 'desk', x: 8, y: 3, color: '#6b4a32',
      interact: { kind: 'container', container: 'ct_civic_desk' },
    },
    { id: 'civic_cab1', type: 'cabinet', x: 1, y: 1, interact: { kind: 'read', doc: 'doc_permits_ledger' } },
    { id: 'civic_cab2', type: 'cabinet', x: 2, y: 1, examine: 'Labelled "COMPLAINTS (NOISE)". It is the fullest drawer in the building.' },
    { id: 'civic_cab3', type: 'cabinet', x: 3, y: 1, examine: 'Labelled "COMPLAINTS (ABOUT COMPLAINTS)".' },
    { id: 'civic_lectern', type: 'lectern', x: 5, y: 6, interact: { kind: 'read', doc: 'doc_visitor_register' } },
    { id: 'civic_rug', type: 'rug', x: 6, y: 5, w: 3, h: 2, color: '#4f5f7a' },
    { id: 'civic_plant1', type: 'plant', x: 12, y: 1 }, { id: 'civic_plant2', type: 'plant', x: 1, y: 8 },
    { id: 'civic_bench', type: 'bench', x: 11, y: 7 },
    { id: 'civic_win1', type: 'window', x: 5, y: 0 }, { id: 'civic_win2', type: 'window', x: 10, y: 0 },
  ],
};

export const workshop = {
  id: 'workshop',
  name: 'Hollow Fixings',
  kind: 'interior',
  music: 'mus_workshop',
  ambience: 'amb_workshop',
  owner: 'npc_tibbs',
  tiles: roomTiles(13, 9, 'g', 6),
  doors: [{ id: 'door_workshop_exit', x: 6, y: 8, to: { map: 'lanternside', spot: 'workshop_door_out' } }],
  spots: {
    entry: { x: 6, y: 7, facing: 'up' },
    bench: { x: 3, y: 3, facing: 'up' },
    engine: { x: 9, y: 3, facing: 'up' },
    cot: { x: 10, y: 2, facing: 'right' },
  },
  props: [
    { id: 'ws_bench', type: 'workbench', x: 2, y: 2, examine: 'Half a toaster, a radio with legs, and a sketch titled "TOASTER (BUT FASTER)".' },
    { id: 'ws_rack', type: 'toolrack', x: 4, y: 1, examine: 'A wall of tools. A crowbar hangs in pride of place with a price tag on it.' },
    { id: 'ws_engine', type: 'engine', x: 8, y: 2, examine: 'A boat engine Tibbs calls "Duchess". It is held together with optimism.' },
    { id: 'ws_cot', type: 'cot', x: 11, y: 1 },
    { id: 'ws_scrap', type: 'scrap', x: 1, y: 6 },
    { id: 'ws_barrel', type: 'barrel', x: 11, y: 6 },
    { id: 'ws_crate', type: 'crate', x: 11, y: 5, interact: { kind: 'container', container: 'ct_workshop_crate' } },
    { id: 'ws_win1', type: 'window', x: 3, y: 0 }, { id: 'ws_win2', type: 'window', x: 9, y: 0 },
  ],
};

export const lighthouse = {
  id: 'lighthouse',
  name: 'The Old Lighthouse',
  kind: 'interior',
  music: 'mus_lighthouse',
  ambience: 'amb_lighthouse',
  restricted: 'lighthouse',
  tiles: roomTiles(9, 9, 'g', 4),
  doors: [{ id: 'door_lighthouse_exit', x: 4, y: 8, to: { map: 'lanternside', spot: 'lighthouse_door_out' } }],
  spots: { entry: { x: 4, y: 7, facing: 'up' }, hatch_in: { x: 7, y: 4, facing: 'left' } },
  props: [
    { id: 'lh_stairs', type: 'stairs', x: 1, y: 1, examine: 'The spiral stair to the lamp room is choked with fallen masonry. Someone would need proper tools — and permission — to clear it.' },
    {
      id: 'lh_mechanism', type: 'lamp_mechanism', x: 6, y: 1,
      examine: 'The clockwork that once turned the great lens. Every gear is oiled — recently. The lens cradle at its heart is empty.',
      onExamine: [{ learn: 'fact_lens_missing' }],
    },
    { id: 'lh_lectern', type: 'lectern', x: 4, y: 3, interact: { kind: 'read', doc: 'doc_keeper_log' } },
    { id: 'lh_chest', type: 'chest', x: 7, y: 6, interact: { kind: 'container', container: 'ct_lighthouse_chest' } },
    { id: 'lh_win', type: 'window', x: 4, y: 0 },
  ],
};

export const osricHouse = {
  id: 'osric_house',
  name: 'Vane Residence',
  kind: 'interior',
  music: 'mus_home',
  ambience: 'amb_indoor',
  owner: 'npc_osric',
  private: true,
  tiles: roomTiles(9, 7, 'c', 4),
  doors: [{ id: 'door_vane_exit', x: 4, y: 6, to: { map: 'lanternside', spot: 'vane_door_out' } }],
  spots: { entry: { x: 4, y: 5, facing: 'up' }, armchair: { x: 2, y: 3, facing: 'down' }, bed: { x: 6, y: 2, facing: 'right' } },
  props: [
    { id: 'vane_shelf', type: 'shelf', x: 1, y: 1, w: 2, examine: 'Municipal bylaws, alphabetised. A single cookbook: "101 Honey Buns".' },
    { id: 'vane_chair', type: 'chair', x: 2, y: 3 },
    { id: 'vane_bed', type: 'bed', x: 7, y: 1, color: '#55607a' },
    { id: 'vane_desk', type: 'desk', x: 4, y: 1 },
  ],
};

export default [playerFlat, cafe, civicOffice, workshop, lighthouse, osricHouse];
