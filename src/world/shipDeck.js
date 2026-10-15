// Life-size ships (v0.27.0): a ship's deck as tiles, generated from its
// design, so you can walk aboard it at the Mill Road Yards berths — and the
// rooms below decks. Pure functions: the same model always gives the same
// plan (tests check every hull and every stock ship).
//
// Plan coordinates: a runs along the ship (0 = stern … Lt − 1 = bow), c runs
// across it (0 … Bt − 1). At a berth the stern is at the quay and the bow
// points out to sea (south), so a maps to y and c to x.
import { familyOf, partKey, fitFor } from '../engine/drawShipProfile.js';

/** Tiles of ship per unit of look.len. */
export const DECK_SCALE = 3.6;
export const MAX_BEAM = 6;
const BEAM = { coaster: 0.36, runner: 0.3, tug: 0.42, skiff: 0.5, freighter: 0.27, container: 0.25, heavylift: 0.26, bulk: 0.24, starwake: 0.26, schooner: 0.3, brig: 0.32, galleon: 0.32, manowar: 0.3, warship: 0.22, battleship: 0.23 };

/** Parts that fill the deck's width (leaving a walkway down each side). */
const WIDE = new Set(['hatch', 'hatch2', 'bulk', 'containers', 'reefer', 'cabins', 'pod']);
/** Parts that take a 2 × 2 block. */
const BLOCK = new Set(['funnel', 'ecofunnel', 'turbine', 'fusion', 'turbogen', 'crane', 'turret', 'railgun', 'missile', 'qsensor', 'aegis', 'command', 'generator', 'core']);

/**
 * The deck plan of a ship model ({ look, tags, kind, bonuses }).
 * Returns { Lt, Bt, family, rows, house, parts, gangwayRow, wheel, hatch }:
 *   rows[a] = [c0, c1] — the hull's extent in that row (its bulwarks);
 *   house   = { a0, a1, c0, c1, door: { a, c }, face } — the deckhouse, or null;
 *   parts   = [{ slot, id, key, a0, a1, c0, c1 }] — each fitted part's footprint;
 *   cannons = [{ slot, a, c }] — a broadside's guns along the rails;
 *   gangwayRow — the row the gangway reaches (kept clear);
 *   wheel / hatch — on sailing ships, the wheel and the companionway on deck.
 */
export function deckPlan(model) {
  const look = model.look || {};
  const family = familyOf(look.hull);
  const Lt = Math.max(7, Math.round((look.len || 3) * DECK_SCALE));
  const Bt = Math.max(4, Math.min(MAX_BEAM, Math.round(Lt * (BEAM[look.hull] ?? 0.26))));
  const fit = (look.fit || fitFor(model)).slice();
  // the hull's outline, row by row
  const rows = [];
  for (let a = 0; a < Lt; a++) {
    const u = a / (Lt - 1);
    let f = 1;
    if (u > 0.7) f = 1 - ((u - 0.7) / 0.3) ** 1.5 * 0.8;
    if (family === 'sail' && u < 0.08) f = 0.85;
    const half = Math.max(1, (Bt / 2) * f);
    const c0 = Math.max(0, Math.round((Bt - 1) / 2 - half + 0.5));
    rows.push([c0, Bt - 1 - c0]);
  }
  const lastDeckRow = () => Lt - 2;
  const inner = (a) => (a <= 0 || a >= Lt - 1 ? 0 : Math.max(0, rows[a][1] - rows[a][0] - 1));
  // the last row with a usable deck (at least two cells across)
  let bowRow = Lt - 2;
  while (bowRow > 2 && inner(bowRow) < 2) bowRow--;
  // the deckhouse
  let house = null;
  const span = (f0, f1) => [Math.max(1, Math.round(Lt * f0)), Math.max(2, Math.round(Lt * f1))];
  const houseAt = family === 'sail' || look.hull === 'skiff' ? null : family === 'war' ? span(0.4, 0.56) : family === 'future' ? span(0.56, 0.72) : family === 'small' ? span(0.3, 0.52) : span(0.04, 0.17);
  if (houseAt) {
    let [a0, a1] = houseAt;
    if (a1 - a0 < 1) a1 = a0 + 1;
    // the house stands inboard of the walkway down the port side (c0 + 1), which runs the length of every deck
    let c0 = 0;
    let c1 = Bt;
    for (let a = Math.max(1, a0 - 1); a <= Math.min(Lt - 2, a1 + 1); a++) { c0 = Math.max(c0, rows[a][0] + 2); c1 = Math.min(c1, rows[a][1] - 1); }
    if (c1 - c0 >= 3) c1 -= 1;
    // a cargo ship's bridge sits aft with its door facing forward; the rest face aft
    const forward = family === 'cargo';
    const doorA = forward ? a1 : a0;
    house = { a0, a1, c0, c1: Math.max(c0, c1), face: forward ? 'fore' : 'aft' };
    house.door = { a: doorA, c: Math.round((house.c0 + house.c1) / 2) };
  }
  // the stretches of deck free for parts (one clear row around the house, two at the bow)
  const runs = [];
  const first = house ? 2 : 4;
  if (house) {
    if (house.a0 - 2 >= first) runs.push([first, house.a0 - 2]);
    if (bowRow - 1 >= house.a1 + 2) runs.push([house.a1 + 2, bowRow - 1]);
  } else runs.push([first, bowRow - 1]);
  if (!runs.length) {
    // a small hull: any row clear of the house will do
    for (let a = 1; a <= bowRow; a++) {
      if (house && a >= house.a0 - 1 && a <= house.a1 + 1) continue;
      const last = runs[runs.length - 1];
      if (last && last[1] === a - 1) last[1] = a; else runs.push([a, a]);
    }
    if (!runs.length) runs.push([1, Math.max(1, bowRow)]);
  }
  const total = runs.reduce((s, [r0, r1]) => s + (r1 - r0 + 1), 0);
  const n = Math.max(1, look.slots || fit.length);
  const parts = [];
  const cannons = [];
  // each slot gets an even share of the free rows, stern to bow
  const slotRows = [];
  for (let i = 0; i < n; i++) {
    const s0 = (i * total) / n;
    const s1 = ((i + 1) * total) / n;
    const rowAt = (s) => { let k = s; for (const [r0, r1] of runs) { const len = r1 - r0 + 1; if (k < len) return r0 + Math.floor(k); k -= len; } return runs[runs.length - 1][1]; };
    const a0 = rowAt(s0);
    const a1 = Math.max(a0, rowAt(Math.max(s0, s1 - 1)));
    slotRows.push([a0, a1]);
  }
  fit.forEach((id, i) => {
    if (!id || !slotRows[i]) return;
    const key = partKey(id);
    let [a0, a1] = slotRows[i];
    // a part's own length: its share of the deck, less a clear row between neighbours
    const len = Math.max(1, a1 - a0 + (a1 > a0 ? 0 : 1));
    const runEnd = (runs.find(([r0, r1]) => a0 >= r0 && a0 <= r1) || [a0, a0])[1];
    a1 = Math.min(slotRows[i][1], runEnd, a0 + Math.max(0, Math.min(len - 1, BLOCK.has(key) ? 1 : WIDE.has(key) ? len - 1 : 0)));
    let narrow = Infinity;
    let left = 0;
    let right = Bt;
    // clear of the walkway in this row and the rows either side (where the hull narrows it steps inboard)
    for (let a = a0; a <= a1; a++) narrow = Math.min(narrow, inner(a));
    for (let a = Math.max(1, a0 - 1); a <= Math.min(lastDeckRow(), a1 + 1); a++) { left = Math.max(left, rows[a][0] + 1); right = Math.min(right, rows[a][1] - 1); }
    narrow = Math.min(narrow, right - left + 1);
    if (narrow < 1) return;
    if (key === 'guns') {
      // a broadside along the starboard rail (the port side is the walkway)
      if (right > left) for (let a = a0; a <= a1; a++) cannons.push({ slot: i, a, c: rows[a][1] - 1 });
      return;
    }
    if (key === 'sonar' || key === 'coating' || key === 'plating' || key === 'armour') {
      // below the waterline or part of the hull: a small fitting on deck marks where it is
      if (right > left) parts.push({ slot: i, id, key, a0, a1: a0, c0: right, c1: right });
      return;
    }
    if (narrow < 2) return;
    // inboard of the port walkway (left), as wide as the part wants and the deck allows
    const room = right - left; // cells from left + 1 to right
    let w = WIDE.has(key) ? Math.max(1, room - (room >= 4 ? 1 : 0)) : BLOCK.has(key) ? Math.min(2, room) : 1;
    w = Math.max(1, Math.min(w, room));
    const c0 = left + 1 + Math.floor((room - w) / 2);
    const c1 = c0 + w - 1;
    parts.push({ slot: i, id, key, a0, a1, c0, c1 });
  });
  const gangwayRow = house ? (house.face === 'fore' ? Math.min(bowRow, house.a1 + 1) : Math.max(1, house.a0 - 1)) : 3;
  const mid = Math.round((Bt - 1) / 2);
  return {
    Lt, Bt, family, rows, house, parts, cannons, gangwayRow, bowRow,
    wheel: house ? null : { a: 1, c: Math.min(rows[1][1] - 1, mid + 1) },
    hatch: house ? null : { a: 2, c: Math.min(rows[2][1] - 1, mid + 1) },
  };
}

/** Deck cells you can stand on (plan coordinates), and which are taken by fittings. */
export function deckCells(plan) {
  const walk = [];
  const taken = new Set();
  const key = (a, c) => `${a},${c}`;
  for (const p of plan.parts) for (let a = p.a0; a <= p.a1; a++) for (let c = p.c0; c <= p.c1; c++) taken.add(key(a, c));
  for (const g of plan.cannons) taken.add(key(g.a, g.c));
  if (plan.house) for (let a = plan.house.a0; a <= plan.house.a1; a++) for (let c = plan.house.c0; c <= plan.house.c1; c++) if (a !== plan.house.door.a || c !== plan.house.door.c) taken.add(key(a, c));
  if (plan.wheel) taken.add(key(plan.wheel.a, plan.wheel.c));
  for (let a = 1; a < plan.Lt - 1; a++) {
    const [c0, c1] = plan.rows[a];
    for (let c = c0 + 1; c < c1; c++) walk.push({ a, c });
  }
  return { walk, taken: (a, c) => taken.has(key(a, c)) };
}

// ======================================================================= below decks
/**
 * The rooms below decks for a vessel: the wheelhouse (the wheel, the
 * logbook, the chart table, the radio — on sailing ships, the captain's
 * cabin), crew cabins, the mess, the engine room and the hold, sized by the
 * ship. Returns a map definition (src/content/maps format).
 *   exit — { map, spot } the door leads back to (the deck at the berth).
 */
export function belowDecks(vessel, model, exit) {
  const look = model.look || {};
  const family = familyOf(look.hull);
  const fit = (look.fit || fitFor(model)).filter(Boolean);
  const size = model.size || Math.max(1, Math.min(4, Math.round((look.len || 3) / 2)));
  const W = Math.max(16, Math.min(30, Math.round((look.len || 3) * 3.4) + 4));
  const H = 11;
  const id = `ship_${vessel.id}`;
  // the shell: hull-shaped (a pointed bow at the right), walls inside
  const grid = Array.from({ length: H }, () => Array(W).fill('x'));
  for (let y = 0; y < H; y++) {
    const taper = Math.max(0, Math.abs(y - (H - 1) / 2) - 2.5);
    const x1 = W - 1 - Math.round(taper * 1.6);
    for (let x = 0; x <= x1; x++) grid[y][x] = y === 0 || y === H - 1 || x === 0 || x === x1 ? 'W' : 'f';
  }
  const set = (x, y, ch) => { if (grid[y]?.[x] && grid[y][x] !== 'x') grid[y][x] = ch; };
  // a corridor along the middle (row 5), rooms above and below
  const wall = (x, y0, y1) => { for (let y = y0; y <= y1; y++) set(x, y, 'W'); };
  const hwall = (x0, x1, y) => { for (let x = x0; x <= x1; x++) set(x, y, 'W'); };
  hwall(1, W - 2, 4);
  hwall(1, W - 2, 6);
  const sail = family === 'sail';
  const props = [];
  let n = 0;
  const P = (type, x, y, o = {}) => props.push({ id: `${id}_${type}_${n++}`, type, x, y, ...o });
  // rooms along the top: the wheelhouse (stern), cabins; along the bottom: mess, engine room, hold
  const cuts = [1, 7, Math.round(W * 0.55), W - 2];
  for (const x of cuts.slice(1, -1)) { wall(x, 1, 3); wall(x, 7, 9); }
  // doorways off the corridor
  const door = (x, y) => set(x, y, 'f');
  door(4, 4); door(Math.round((cuts[1] + cuts[2]) / 2), 4); door(Math.round((cuts[2] + W) / 2) - 1, 4);
  door(4, 6); door(Math.round((cuts[1] + cuts[2]) / 2), 6); door(Math.round((cuts[2] + W) / 2) - 1, 6);
  // the wheelhouse / captain's cabin (top left)
  P('shipwheel', 3, 1, { name: 'Ship\'s wheel', interact: { kind: 'logistics', action: 'wheel', vessel: vessel.id, name: 'ship\'s wheel' }, examine: `The ${vessel.name}'s wheel.` });
  P('logbook', 5, 1, { name: 'Logbook', interact: { kind: 'logistics', action: 'logbook', vessel: vessel.id, name: 'logbook' }, examine: `The ${vessel.name}'s logbook.` });
  P(sail ? 'chest' : 'terminal', 1, 2, sail ? { examine: 'The captain\'s sea chest. Charts, a sextant wrapped in oilcloth, a bottle that is mostly empty.' } : { w: 1, examine: family === 'future' ? 'A navigation console humming with a calm voice that apologises for the weather.' : 'The radio and the radar screen, a green sweep going round and round.' });
  P('table', 2, 3, { examine: 'The chart table: today\'s course pencilled in, a coffee ring where the harbour should be.' });
  // cabins (top middle and right)
  const bunks = Math.min(6, 1 + size * 2);
  for (let i = 0; i < bunks; i++) {
    const x = cuts[1] + 1 + i * 2;
    if (x + 1 >= W - 3) break;
    P('cot', x, 1, { examine: i === 0 ? 'The mate\'s bunk, blanket folded with suspicious precision.' : 'A crew bunk. A photo of somebody\'s dog taped to the bulkhead.' });
  }
  P('chest', cuts[2] - 2, 3, { examine: 'A locker of oilskins and spare boots, all of them left feet.' });
  // the mess and galley (bottom left)
  P('stove', 1, 7, { examine: 'The galley stove, rails round the top so the pans don\'t go overboard in a swell.' });
  P('table', 3, 8, { w: 2, examine: 'The mess table. Dents from forty years of mugs set down hard.' });
  P('chair', 3, 9); P('chair', 4, 9);
  // the engine room (bottom middle): what drives her
  const engines = fit.filter((c) => /diesel|eco_engine|gas_turbine|fusion_drive/.test(c));
  const power = fit.filter((c) => /generator|fusion_core/.test(c));
  let ex = cuts[1] + 1;
  if (sail) P('barrel', ex, 9, { examine: 'Fresh water, salt pork and ship\'s biscuit. The sails do the rest.' });
  for (const c of engines) { if (ex + 1 >= cuts[2]) break; P('engine', ex, 8, { w: 2, examine: { c_diesel: 'The diesel: big, warm, smelling of oil. A brass plate says it was overhauled "recently".', c_eco_engine: 'The eco engine, clean enough to eat off. Nobody does.', c_gas_turbine: 'A gas turbine in a soundproof box that is not soundproof.', c_fusion_drive: 'The fusion drive\'s housing, warm to the touch and faintly blue at the seams.' }[c] }); ex += 3; }
  for (const c of power) { if (ex + 1 >= cuts[2]) break; P('generator', ex, 9, { w: 2, h: 1, examine: c === 'c_fusion_core' ? 'The fusion core: a sealed sphere and a sign, DO NOT KNOCK.' : 'A generator, thrumming. The lights flicker when someone opens the fridge.' }); ex += 3; }
  // the hold (bottom right): cargo if she has some
  const hold = vessel.cargo?.units || 0;
  const cap = model.capacity || 0;
  const holdBoxes = Math.min(10, Math.round(((hold || cap * 0.3) / Math.max(1, cap)) * 10));
  for (let i = 0; i < holdBoxes; i++) {
    const x = cuts[2] + 1 + (i % 5) * 2;
    const y = 8 + Math.floor(i / 5);
    if (x >= W - 3 || y >= H - 1) continue;
    P(i % 3 === 2 ? 'barrel' : 'crate', x, y, { examine: hold ? `Part of the cargo: ${hold} units in all.` : 'Dunnage and lashing gear, waiting for the next cargo.' });
  }
  if (!cap) P('display', cuts[2] + 2, 8, { examine: model.kind === 'warship' ? 'The magazine. Rows of shells, everything stencilled and counted twice.' : 'An empty hold, swept and smelling of whatever it last carried.' });
  // the way up: a ladder at the stern end of the corridor
  const exitX = 0;
  grid[5][0] = 'D';
  return {
    id, name: vessel.name, kind: 'interior', ship: vessel.id,
    music: 'mus_workshop', ambience: 'amb_indoor',
    tiles: grid.map((r) => r.join('')),
    doors: [{ id: `${id}_exit`, x: exitX, y: 5, label: 'the deck', to: exit }],
    spots: { entry: { x: exitX + 1, y: 5, facing: 'right' } },
    keepClear: [[exitX + 1, 5]],
    props,
  };
}
