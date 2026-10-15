// Transit (v0.17.0 "Route 1"; reworked for the wide streets in v0.20.0): the
// No. 1 bus, the traffic, and the junctions with traffic lights.
//
// Everything is authored in each map's ORIGINAL (2-tile road) coordinates and
// built after the roads are widened (src/world/widen.js) by buildTransit(),
// which turns lanes into map-local points; src/systems/transit.js turns those
// into world space. Traffic keeps to the LEFT: on a 4-tile road the
// eastbound/northbound... lane is the northern/western pair of tiles.
//   lane centre on a road whose first (authored) line is r:  north/west lane r'+1, south/east lane r'+3

export const BUS_INFO = {
  name: 'No. 1',
  fare: 2,
  buses: 3, // spaced evenly round the loop
  speed: 230, // px per second (= per game minute)
  dwell: 8, // game minutes at each stop
  len: 150,
  wid: 46,
  color: '#2f6b4f',
};

/** Bus stops: a sign on the pavement (authored coordinates); the bus stops beside it in both directions. */
export const BUS_STOPS = [
  { id: 'stop_yards', name: 'Mill Road Yards', sign: { map: 'yards', x: 10, y: 17 } },
  { id: 'stop_sumps', name: 'Mill Road (the Sumps)', sign: { map: 'halvermouth', x: 24, y: 59 } },
  { id: 'stop_civic', name: 'Civic Plaza', sign: { map: 'halvermouth', x: 52, y: 35 } },
  { id: 'stop_eastend', name: 'The East End', sign: { map: 'halvermouth', x: 96, y: 35 } },
  { id: 'stop_westbrook', name: 'Westbrook Row', sign: { map: 'westbrook', x: 26, y: 11 } },
  { id: 'stop_lanternside', name: 'Gullwing Road', sign: { map: 'lanternside', x: 36, y: 11 } },
  { id: 'stop_ober', name: 'Ober\'s Oil Refinery', sign: { map: 'ober_fields', x: 40, y: 11 } },
];

/** Junctions with traffic lights: [map, street column, avenue row] (authored first lines). */
const LIGHTS = [
  ...[14, 38, 62, 86].flatMap((c) => [12, 36, 60].map((r) => ['halvermouth', c, r])),
  ['lanternside', 30, 12],
  // v0.29.1: Lariat's two lights, on FM 38 at Main Street and at Cotton Street
  ['lariat', 72, 40], ['lariat', 72, 57],
];

/**
 * Build the bus route, traffic and junctions in widened map coordinates.
 * S: { [mapId]: { fx, fy } } from widenAll (identity for maps not widened).
 */
export function buildTransit(S) {
  const id = (v) => v;
  const fx = (m) => S[m]?.fx || id;
  const fy = (m) => S[m]?.fy || id;
  // lanes on a widened road (authored first line r): north/west lane, south/east lane
  const N = (m, r) => fy(m)(r) + 1;
  const So = (m, r) => fy(m)(r) + 3;
  const Wl = (m, c) => fx(m)(c) + 1;
  const E = (m, c) => fx(m)(c) + 3;
  const X = (m, x) => fx(m)(x);
  const Y = (m, y) => fy(m)(y);
  const p = (map, x, y) => ({ map, x, y });
  const H = 'halvermouth';
  const hvW = X(H, 111) + 1; // the city's width after widening
  const ober = 'ober_fields';
  // the yards road is already four tiles wide (rows 18–21): lanes at 19 and 21
  const route = [
    // out from the Yards: east along the yard road and Mill Road
    p('yards', 5, 19), p('yards', 63.9, 19),
    p(H, 0, N(H, 60)), p(H, Wl(H, 38), N(H, 60)),
    // up Justice Way to Grand Avenue, east to the East Gate
    p(H, Wl(H, 38), N(H, 36)), p(H, hvW - 0.1, N(H, 36)),
    // the coast road east: Westbrook, Lanternside, the Ober Fields
    p('westbrook', 0, N('westbrook', 12)), p(ober, 44, N(ober, 12)),
    // round Wellhead Circle
    p(ober, 49.5, N(ober, 12)), p(ober, 50, So(ober, 12) + 1.4), p(ober, 44.5, So(ober, 12) + 1.8), p(ober, 43, So(ober, 12)),
    // and all the way back
    p('westbrook', 0.1, So('westbrook', 12)),
    p(H, hvW - 0.1, So(H, 36)), p(H, E(H, 38), So(H, 36)),
    p(H, E(H, 38), So(H, 60)), p(H, 0, So(H, 60)),
    p('yards', 63.9, 21), p('yards', 5, 21),
    // turn round at the end of the yard road
    p('yards', 2.6, 20),
  ];
  // traffic: one-way rings round city blocks (never leave the map), and through traffic
  // that comes in through a gate and leaves through another (or the same) — no U-turns
  const ring = (c1, c2, r1, r2) => [p(H, Wl(H, c1), N(H, r1)), p(H, E(H, c2), N(H, r1)), p(H, E(H, c2), So(H, r2)), p(H, Wl(H, c1), So(H, r2))];
  const traffic = {
    models: ['pipit', 'dray', 'mule', 'pipit', 'aurelia', 'dray', 'tempest'],
    colors: ['#3a5a8a', '#8a3a32', '#2a2a2e', '#e8e2d4', '#4a7a5a', '#c9a24a', '#5a4a6a', '#6f7f94', '#a35a48'],
    loops: [
      { id: 'city_ring', cars: 2, speed: [170, 210], path: ring(14, 86, 12, 36) }, // round the Financial District, Bank Row and Precinct Row
      // v0.32.0: a Precinct 1 cruiser on patrol — round the Financial District and Grand Avenue, Market Street and the Mill Road blocks
      { id: 'police_cruiser', cars: 1, model: 'cruiser', color: '#e8e2d4', police: true, speed: [140, 170], path: ring(38, 86, 12, 60) },
      { id: 'market_ring', cars: 1, speed: [150, 190], path: ring(38, 62, 36, 60) }, // round Market Street
      // through the city: in at the East Gate, out at Mill Road (and the other way)
      { id: 'west_through', cars: 1, open: true, gap: 50, speed: [180, 220], path: [p(H, hvW - 0.1, So(H, 36)), p(H, E(H, 62), So(H, 36)), p(H, E(H, 62), So(H, 60)), p(H, 0, So(H, 60))] },
      { id: 'east_through', cars: 1, open: true, gap: 60, speed: [180, 220], path: [p(H, 0, N(H, 60)), p(H, Wl(H, 62), N(H, 60)), p(H, Wl(H, 62), N(H, 36)), p(H, hvW - 0.1, N(H, 36))] },
      // the coast road: in from the Halvermouth gate, round Wellhead Circle, and back out
      // v0.29.1: Lariat — round the downtown blocks (Main, East, Cotton, Church), and round the Mesquite Lane block
      { id: 'lariat_ring', cars: 2, speed: [140, 170], path: [p('lariat', 21, 41), p('lariat', 131, 41), p('lariat', 131, 60), p('lariat', 21, 60)] },
      { id: 'lariat_mesquite', cars: 1, speed: [120, 150], path: [p('lariat', 73, 58), p('lariat', 131, 58), p('lariat', 131, 77), p('lariat', 73, 77)] },
      { id: 'coast_road', cars: 2, open: true, gap: 45, speed: [190, 230], path: [p('westbrook', 0, N('westbrook', 12)), p(ober, 44, N(ober, 12)), p(ober, 49.5, N(ober, 12)), p(ober, 50, So(ober, 12) + 1.4), p(ober, 44.5, So(ober, 12) + 1.8), p(ober, 43, So(ober, 12)), p('westbrook', 0, So('westbrook', 12))] },
    ],
  };
  const junctions = LIGHTS.map(([map, c, r], i) => ({ id: `j${i}`, map, x: X(map, c), y: Y(map, r), w: 4, h: 4, offset: (i * 7) % 22 }));
  const stops = BUS_STOPS.map((s) => ({ ...s, sign: { map: s.sign.map, x: X(s.sign.map, s.sign.x), y: Y(s.sign.map, s.sign.y) } }));
  return { bus: { ...BUS_INFO, route, stops }, traffic, junctions };
}

/** Put a bus-stop sign on each stop's map, and a traffic light at each corner of each junction (props, at load). Mutates `maps`. */
export function addStreetFurniture(maps, transit) {
  for (const s of transit.bus.stops) {
    const m = maps[s.sign.map];
    m.props = [...(m.props || []), { id: s.id, type: 'busstop', x: s.sign.x, y: s.sign.y, interact: { kind: 'busstop', stop: s.id, name: 'bus stop' }, examine: `A bus stop: "${s.name}". Route ${transit.bus.name}.` }];
  }
  for (const j of transit.junctions) {
    const m = maps[j.map];
    // on the pavement just off each corner: heads face the traffic arriving on that side
    const corners = [[j.x - 1, j.y - 1, 'nw'], [j.x + j.w, j.y - 1, 'ne'], [j.x - 1, j.y + j.h, 'sw'], [j.x + j.w, j.y + j.h, 'se']];
    for (const [x, y, c] of corners) m.props.push({ id: `tl_${j.id}_${c}`, type: 'trafficlight', x, y, junction: j.id, offset: j.offset, corner: c, walkThrough: true, examine: 'A traffic light. Red, amber, green — and a little walking man for the crossing. (Running a red isn\'t a crime here. Just rude.)' });
  }
}
