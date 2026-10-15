// Traffic lights (v0.20.0): every junction cycles the same 22-second program,
// offset per junction. East–west traffic has green, then amber, then it's
// north–south's turn. Pedestrians get WALK on the crossing that runs with the
// green traffic (crossing the road whose traffic is held at red).
//   0–9 EW green · 9–11 EW amber · 11–20 NS green · 20–22 NS amber
export const CYCLE = 22;

/** State of a junction at time t (seconds): { ew, ns } each 'green' | 'amber' | 'red'. */
export function lightState(junction, t) {
  const k = (((t + (junction.offset || 0)) % CYCLE) + CYCLE) % CYCLE;
  if (k < 9) return { ew: 'green', ns: 'red', k };
  if (k < 11) return { ew: 'amber', ns: 'red', k };
  if (k < 20) return { ew: 'red', ns: 'green', k };
  return { ew: 'red', ns: 'amber', k };
}

/**
 * May a pedestrian step onto this junction's crossing, walking along `axis`
 * ('ns' = walking north–south, across the east–west road)? They walk while the
 * traffic they cross is held at red, and not in the last 3 seconds of it.
 */
export function walkSignal(junction, axis, t) {
  const s = lightState(junction, t);
  // walking north–south crosses the east–west road: allowed while EW is red and NS is green
  if (axis === 'ns') return s.ns === 'green' && s.k < 17 ? 'walk' : s.ns === 'green' ? 'flash' : 'wait';
  return s.ew === 'green' && s.k < 6 ? 'walk' : s.ew === 'green' ? 'flash' : 'wait';
}
