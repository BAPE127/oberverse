// Tower floors and lifts (v0.41.0, art revamp stage 4). A tower's ground floor is a room on the
// street (roofless, like everything else); a lift goes up, and each floor is its own little map
// drawn high over the city below (`aloft`). Vantage Point opens to the public (08:00–20:00):
// a lobby, an office floor to let, the Sky Lounge on 23 and the helipad roof. The Atlas Rooms and
// the Harbourline Apartments get a lift from their stairwells to the roof (residents and guests).
import { roomTiles } from '../world/mapBuilder.js';

export const TOWERS = {
  vantage: {
    name: 'Vantage Point', map: 'halvermouth', building: 't_vantage', hours: { from: '08:00', to: '20:00' },
    floors: [
      { n: 'G', name: 'Lobby', map: 'vantage_lobby' },
      { n: '12', name: 'Offices to let', map: 'vantage_12' },
      { n: '23', name: 'The Sky Lounge', map: 'vantage_23' },
      { n: 'R', name: 'The roof — helipad', map: 'vantage_roof' },
    ],
  },
  atlas: { name: 'The Atlas Rooms', map: 'halvermouth', building: 't_atlas', floors: [{ n: 'G', name: 'Stairwell', map: 'atlas_hall' }, { n: 'R', name: 'The roof', map: 'atlas_roof' }] },
  harbourline: { name: 'Harbourline Apartments', map: 'halvermouth', building: 't_harbourline', floors: [{ n: 'G', name: 'Stairwell', map: 'harbourline_hall' }, { n: 'R', name: 'The roof', map: 'harbourline_roof' }] },
};

const lift = (tower, x, id) => ({ id, type: 'lift', x, y: 0, interact: { kind: 'lift', tower }, examine: 'A lift. Brushed steel, a brass dial over the doors.' });

/** A floor high up: no doors out, only the lift (at x) — spots `entry` and `lift` in front of it. */
function floor(id, name, tower, w, h, ground, liftX, props, extra = {}) {
  return {
    id, name, kind: 'interior', music: 'mus_home', ambience: 'amb_indoor', aloft: { tower }, ...extra,
    tiles: roomTiles(w, h, ground, liftX).map((row, y) => (y === h - 1 ? 'W'.repeat(w) : row)),
    doors: [],
    spots: { entry: { x: liftX, y: 2, facing: 'down' }, lift: { x: liftX, y: 2, facing: 'down' }, ...(extra.spots || {}) },
    keepClear: [[liftX, 1], [liftX, 2]],
    props: [lift(tower, liftX, `${id}_lift`), ...props],
  };
}

function roof(id, name, tower, w, h, props, extra = {}) {
  return floor(id, name, tower, w, h, 'g', 2, [
    { id: `${id}_tank`, type: 'barrel', x: w - 3, y: 1, name: 'Water butt', examine: 'The rainwater butt. Someone has painted a face on it. It looks worried.' },
    { id: `${id}_tank_b`, type: 'barrel', x: w - 2, y: 1 },
    { id: `${id}_vent_a`, type: 'vent', x: 6, y: 1 },
    { id: `${id}_vent_b`, type: 'vent', x: 7, y: 1 },
    ...props,
  ], { roof: true, ...extra });
}

export function towerMaps() {
  const V = 'vantage';
  return [
    {
      id: 'vantage_lobby', name: 'Vantage Point — Lobby', kind: 'interior', music: 'mus_home', ambience: 'amb_indoor',
      tiles: roomTiles(14, 9, 't', 7),
      doors: [{ id: 'door_vantage_lobby_exit', x: 7, y: 8, to: { map: 'halvermouth', spot: 'vantage_door_out' } }],
      spots: { entry: { x: 7, y: 7, facing: 'up' }, lift: { x: 5, y: 2, facing: 'down' }, desk: { x: 10, y: 3, facing: 'down' } },
      keepClear: [[7, 7], [5, 1], [8, 1], [5, 2]],
      props: [
        lift(V, 5, 'vantage_lift_a'), lift(V, 8, 'vantage_lift_b'),
        { id: 'vantage_desk', type: 'counter', x: 9, y: 4, w: 3, examine: 'Reception. A brass bell, a visitors\' book and a sign: "THE SKY LOUNGE — FLOOR 23 — OPEN TO ALL".' },
        { id: 'vantage_plant_a', type: 'plant', x: 1, y: 1 }, { id: 'vantage_plant_b', type: 'plant', x: 12, y: 1 },
        { id: 'vantage_sofa_a', type: 'chair', x: 2, y: 5 }, { id: 'vantage_sofa_b', type: 'chair', x: 3, y: 5 },
        { id: 'vantage_table', type: 'table', x: 2, y: 6 },
        { id: 'vantage_rug', type: 'rug', x: 5, y: 3, w: 4, h: 3, color: '#2e3a4e' },
        { id: 'vantage_board', type: 'cabinet', x: 12, y: 6, examine: 'The directory: 12 — OFFICES TO LET. 23 — THE SKY LOUNGE. R — HELIPAD (no unauthorised landings).' },
      ],
    },
    floor('vantage_12', 'Vantage Point — Floor 12 (offices to let)', V, 16, 10, 'c', 2, [
      ...[3, 7, 11].flatMap((x, i) => [
        { id: `v12_desk_${i}`, type: 'desk', x, y: 3 }, { id: `v12_chair_${i}`, type: 'chair', x, y: 4 },
        { id: `v12_desk_${i}b`, type: 'desk', x, y: 6 }, { id: `v12_chair_${i}b`, type: 'chair', x, y: 7 },
      ]),
      { id: 'v12_cabinet_a', type: 'cabinet', x: 14, y: 1 }, { id: 'v12_cabinet_b', type: 'cabinet', x: 13, y: 1 },
      { id: 'v12_plant', type: 'plant', x: 14, y: 8 },
      { id: 'v12_sign', type: 'sign', x: 5, y: 1, examine: '"TO LET — 4,000 sq ft of prime Halvermouth office space. Enquiries: Ironclad Securities." The carpet still has the dents of someone else\'s desks.' },
    ]),
    floor('vantage_23', 'Vantage Point — The Sky Lounge (floor 23)', V, 16, 10, 'f', 2, [
      { id: 'v23_bar', type: 'counter', x: 9, y: 1, w: 5, examine: 'The bar. Everything costs twice what it should; the view is free.' },
      ...[[3, 4], [7, 5], [11, 6], [4, 7], [12, 3]].flatMap(([x, y], i) => [
        { id: `v23_table_${i}`, type: 'table', x, y, color: '#2e2a36' }, { id: `v23_chair_${i}`, type: 'chair', x: x + 1, y },
      ]),
      { id: 'v23_rug', type: 'rug', x: 6, y: 3, w: 3, h: 2, color: '#6a3a4a' },
      { id: 'v23_plant_a', type: 'plant', x: 1, y: 8 }, { id: 'v23_plant_b', type: 'plant', x: 14, y: 8 },
      { id: 'v23_scope', type: 'plant', x: 14, y: 1, name: 'Telescope', examine: 'A coin telescope (1 obol). Through it: the Lantern Canal, the Yards\' cranes, and someone in the Ledgerline Building picking their nose.' },
    ], { spots: { bar_a: { x: 10, y: 2, facing: 'up' }, bar_b: { x: 12, y: 2, facing: 'up' } } }),
    roof('vantage_roof', 'Vantage Point — The roof', V, 16, 12, [
      { id: 'vroof_helipad', type: 'helipad', x: 6, y: 4, w: 4, h: 4, examine: 'The helipad. Painted on it, in letters a pilot could read from a mile up: NO UNAUTHORISED LANDINGS.' },
      { id: 'vroof_crate', type: 'crate', x: 13, y: 9 },
    ]),
    roof('atlas_roof', 'The Atlas Rooms — the roof', 'atlas', 11, 9, [
      { id: 'aroof_line', type: 'laundry', x: 3, y: 5, w: 3 },
      { id: 'aroof_chair', type: 'chair', x: 8, y: 6, examine: 'A deckchair, weighed down with a brick. Someone comes up here to smoke and think.' },
      { id: 'aroof_plant', type: 'plant', x: 1, y: 7 },
    ]),
    roof('harbourline_roof', 'Harbourline Apartments — the roof', 'harbourline', 13, 9, [
      { id: 'hroof_bench', type: 'bench', x: 4, y: 6, w: 2, examine: 'A bench facing the bay. "IN MEMORY OF THE NIGHT SHIFT."' },
      { id: 'hroof_plant_a', type: 'plant', x: 1, y: 7 }, { id: 'hroof_plant_b', type: 'plant', x: 11, y: 7 },
    ]),
  ];
}

/** Final coordinates: Vantage Point's door opens on its lobby; the stairwells get their lifts; floors learn where they stand. */
export function addTowers(maps) {
  for (const [id, t] of Object.entries(TOWERS)) {
    const street = maps[t.map];
    const b = street.buildings.find((x) => x.id === t.building);
    if (!b) throw new Error(`towers: no building ${t.building}`);
    for (const f of t.floors) if (maps[f.map].aloft) maps[f.map].aloft = { tower: id, over: t.map, x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const ground = maps[t.floors[0].map];
    if (id === 'vantage') {
      b.door = { x: b.door.x, y: b.door.y, to: { map: 'vantage_lobby', spot: 'entry' }, lock: { hours: t.hours, message: 'Vantage Point: the lobby is open 08:00–20:00.' } };
      street.spots.vantage_door_out = { x: b.door.x, y: b.door.y + 1, facing: 'down' };
    } else if (!ground.props.some((p) => p.type === 'lift')) {
      const x = ground.tiles[0].length - 2;
      ground.props.push(lift(id, x, `${ground.id}_lift`));
      ground.spots.lift = { x, y: 1, facing: 'down' };
      ground.keepClear = [...(ground.keepClear || []), [x, 1]];
    }
  }
}
