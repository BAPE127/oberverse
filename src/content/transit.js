// Transit (v0.17.0 "Route 1"): the bus and the traffic. All paths are in
// WORLD tiles (src/world/layout.js: Halvermouth at 0,0; the coast road runs
// along world rows 36–37 from Halvermouth to the Ober Fields; Mill Road along
// rows 60–61 to the Yards). Traffic keeps to the LEFT: eastbound on the
// northern lane (row + 0.5), westbound on the southern lane (row + 1.5);
// southbound on a street's eastern lane, northbound on its western lane.
// Owner's answers: ride the bus for real; the fare was my call (2 obols);
// NPC traffic on the roads.

/** A rectangular one-way loop around city blocks: streets x1, x2 and avenues y1, y2 (the left column/row of each 2-wide road). */
const ring = (x1, x2, y1, y2) => [[x1 + 0.5, y1 + 0.5], [x2 + 1.5, y1 + 0.5], [x2 + 1.5, y2 + 1.5], [x1 + 0.5, y2 + 1.5]];

export const BUS = {
  name: 'No. 1',
  fare: 2,
  buses: 3, // spaced evenly round the loop
  speed: 230, // px per second (= per game minute)
  dwell: 8, // game minutes at each stop
  len: 150,
  wid: 46,
  color: '#2f6b4f',
  // one closed loop: the Yards → Mill Road → up Station Street (street 38) → east along the
  // coast road through Westbrook and Lanternside to the Ober Fields, and back
  route: [[-70, 60.5], [38.5, 60.5], [38.5, 36.5], [277, 36.5], [278.4, 37], [277, 37.5], [39.5, 37.5], [39.5, 61.5], [-70, 61.5], [-71.4, 61]],
  // stops: a sign on the pavement (map + tile); the bus stops beside it in both directions.
  // road: which road it's on (world row of its northern lane's tile).
  stops: [
    { id: 'stop_yards', name: 'Mill Road Yards', road: 60, x: -64, sign: { map: 'yards', x: 10, y: 17 } },
    { id: 'stop_sumps', name: 'Mill Road (the Sumps)', road: 60, x: 24, sign: { map: 'halvermouth', x: 24, y: 59 } },
    { id: 'stop_civic', name: 'Civic Plaza', road: 36, x: 52, sign: { map: 'halvermouth', x: 52, y: 35 } },
    { id: 'stop_eastend', name: 'The East End', road: 36, x: 96, sign: { map: 'halvermouth', x: 96, y: 35 } },
    { id: 'stop_westbrook', name: 'Westbrook Row', road: 36, x: 148, sign: { map: 'westbrook', x: 26, y: 11 } },
    { id: 'stop_lanternside', name: 'Gullwing Road', road: 36, x: 201, sign: { map: 'lanternside', x: 36, y: 11 } },
    { id: 'stop_ober', name: 'Ober\'s Oil Refinery', road: 36, x: 268, sign: { map: 'ober_fields', x: 40, y: 11 } },
  ],
};

/** Put a bus-stop sign on each stop's map (props, at load). Mutates `maps`. */
export function addBusStops(maps) {
  for (const s of BUS.stops) {
    const m = maps[s.sign.map];
    m.props = [...(m.props || []), { id: s.id, type: 'busstop', x: s.sign.x, y: s.sign.y, interact: { kind: 'busstop', stop: s.id, name: 'bus stop' }, examine: `A bus stop: "${s.name}". Route ${BUS.name}.` }];
  }
}

export const TRAFFIC = {
  models: ['pipit', 'dray', 'mule', 'pipit', 'aurelia', 'dray', 'tempest'],
  colors: ['#3a5a8a', '#8a3a32', '#2a2a2e', '#e8e2d4', '#4a7a5a', '#c9a24a', '#5a4a6a', '#6f7f94', '#a35a48'],
  loops: [
    { id: 'city_ring', cars: 4, speed: [170, 220], path: ring(14, 86, 12, 36) }, // round the Financial District, Bank Row and Precinct Row
    { id: 'market_ring', cars: 2, speed: [150, 190], path: ring(38, 62, 36, 60) }, // round Market Street
    { id: 'iron_ring', cars: 2, speed: [150, 200], path: ring(62, 86, 36, 60) }, // round Iron Row
    { id: 'coast_road', cars: 3, speed: [190, 240], path: [[124, 36.5], [277, 36.5], [278.4, 37], [277, 37.5], [124, 37.5], [122.6, 37]] },
  ],
};
