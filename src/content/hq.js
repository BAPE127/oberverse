// The headquarters (v0.86.0): three offices on the paving of Halvermouth that the parent company can buy — a small office, a corporate
// centre and a tower. Each is a real building from the first day, shut and "for sale" until bought; its hall is exactly the size of the
// building, so the street does not move (the same trick as the banks). What they do is room and presence, never money:
// desks, officer seats and what it costs to keep. Nothing here creates cash.
//
//   desks     the work places in the hall (officers sit here, from v0.87.0)
//   seats     how many officers (executives and managers of the parent) the building holds
//   upkeep    what the parent pays a day to keep it open (rates, heat, cleaning) — paid whether or not anyone is in
//   price     what the parent pays once; from its own account only
export const HQ_TIERS = {
  small: { id: 'small', name: 'The Ledger Row Office', short: 'Small Office', price: 25000, upkeep: 60, desks: 4, seats: 3, floors: 1,
    text: 'A brick office with a reception desk, four desks and a back room. Enough for a chief executive, a chief financial officer and one more.',
    roof: '#7a3a2e', wall: '#b86a54', trim: '#4a2a22', sign: 'OFFICE',
    at: { x: 55, y: 33, w: 9, h: 7, doorX: 59 } },
  mid: { id: 'mid', name: 'The Corporate Centre', short: 'Corporate Centre', price: 600000, upkeep: 900, desks: 12, seats: 8, floors: 1,
    text: 'A glass-and-steel block with a lobby, an open floor of twelve desks and a boardroom.',
    roof: '#3a4a6a', wall: '#7f93b0', trim: '#2a3450', sign: 'CENTRE', flatRoof: true,
    at: { x: 162, y: 20, w: 12, h: 9, doorX: 167 } },
  tower: { id: 'tower', name: 'The Tower', short: 'The Tower', price: 6000000, upkeep: 9000, desks: 24, seats: 12, floors: 1,
    text: 'A landmark of dark glass: a marble lobby, twenty-four desks and a boardroom. (The upper floors come later.)',
    roof: '#1f2a4a', wall: '#3f5078', trim: '#c9a24a', sign: 'TOWER', flatRoof: true, columns: true,
    at: { x: 141, y: 20, w: 14, h: 13, doorX: 147 } },
};
export const HQ_ORDER = ['small', 'mid', 'tower'];
export const hqMapId = (tier) => `hq_${tier}`;
export const hqBuildingId = (tier) => `b_hq_${tier}`;

/** The building on the street for a tier. */
export function hqBuilding(tier) {
  const T = HQ_TIERS[tier];
  const { x, y, w, h, doorX } = T.at;
  return {
    id: hqBuildingId(tier), name: T.name, mapLabel: T.name, x, y, w, h, sign: T.sign, roof: T.roof, wall: T.wall, trim: T.trim, flatRoof: T.flatRoof, columns: T.columns,
    door: { x: doorX, y: y + h - 1, to: { map: hqMapId(tier), spot: 'entry' }, lock: { key: 'item_none', hq: tier, message: `${T.name}: for sale, and shut. A notice in the window: "Enquire at your parent company's tablet."` } },
    interior: hqMapId(tier),
  };
}

/**
 * The hall of a tier: the size of its building, the door at the foot. Desks in rows (a desk, its chair, a free tile to stand on, a walkway:
 * three rows apiece), a reception beside the door, windows along the top, and a boardroom where there is room.
 */
export function hqInterior(tier) {
  const T = HQ_TIERS[tier];
  const { w: W, h: H, doorX } = T.at;
  const dx = doorX - T.at.x;
  const rows = tier === 'small' ? 1 : tier === 'mid' ? 2 : 3;
  const perRow = T.desks / rows;
  const props = [];
  const spots = { entry: { x: dx, y: H - 2, facing: 'up' } };
  props.push({ id: `hq_${tier}_plant_b`, type: 'plant', x: 1, y: 1 });
  props.push({ id: `hq_${tier}_rug`, type: 'rug', x: dx - 1, y: H - 3, w: 3, h: 1, color: '#2a3a5a' });
  for (let x = 2; x < W - 2; x += 3) props.push({ id: `hq_${tier}_win_${x}`, type: 'window', x, y: 0 });
  let n = 0;
  const cols = []; // desk columns: left to right, skipping the one in front of the door
  for (let x = 1; cols.length < perRow; x++) if (x !== dx) cols.push(x);
  const recX = Math.max(dx + 2, cols[perRow - 1] + 1); // the reception sits beside the door, clear of the last desk's standing place
  props.push({ id: `hq_${tier}_reception`, type: 'counter', x: recX, y: H - 2, w: 2, color: '#4a3a2e', label: 'RECEPTION', examine: 'The reception desk. A bell, a visitors\' book and a brass plate with the company\'s name.' });
  spots.reception = { x: recX - 1, y: H - 2, facing: 'right' };
  if (W - 2 > cols[perRow - 1] + 2) props.push({ id: `hq_${tier}_plant_a`, type: 'plant', x: W - 2, y: H - 2 }); // (beside the reception, where there is room)
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < perRow; k++) {
      const x = cols[k];
      const y = 2 + 3 * r;
      n += 1;
      props.push({ id: `hq_${tier}_desk_${n}`, type: 'desk', x, y, color: '#6a4a2e' }, { id: `hq_${tier}_chair_${n}`, type: 'chair', x, y: y + 1 });
      spots[`desk_${n}`] = { x, y: y + 2, facing: 'up' }; // where an officer stands to work: at the chair, from the walkway
    }
  }
  if (tier !== 'small') {
    props.push({ id: `hq_${tier}_board`, type: 'table', x: W - 4, y: 2, w: 3, color: '#3a2a1e', label: 'BOARDROOM', examine: 'The boardroom table. Twelve chairs, one of which is yours.' });
    spots.boardroom = { x: W - 3, y: 4, facing: 'up' };
  }
  if (tier === 'tower') props.push({ id: 'hq_tower_painting', type: 'painting', x: Math.floor(W / 2) + 2, y: 1, examine: 'A portrait of the founder. It has your eyes.' });
  return {
    id: hqMapId(tier), name: T.name, kind: 'interior', music: 'mus_civic', ambience: 'amb_indoor', wallStyle: 'grand', floorStyle: { t: 4 },
    tiles: roomTilesFor(W, H, dx, [[W - 2, 0, 1, 1, 'D']]),
    doors: [
      { id: `door_hq_${tier}_exit`, x: dx, y: H - 1, to: { map: 'halvermouth', spot: `${hqBuildingId(tier)}_out` } },
      // v0.87.0: the staff quarters, behind the hall, for the officers who work here (and for you)
      { id: `door_hq_${tier}_quarters`, x: W - 2, y: 0, label: 'Staff quarters', to: { map: hqQuartersId(tier), spot: 'entry' }, lock: { key: 'item_none', hq: tier, message: 'Staff quarters. The company keeps rooms behind the hall for its officers.' } },
    ],
    spots: { ...spots, quarters_door: { x: W - 2, y: 1, facing: 'down' } }, keepClear: [[dx, H - 2], [W - 2, 1]], props,
  };
}

export const hqQuartersId = (tier) => `hq_${tier}_quarters`;

/** The rooms behind a hall (v0.87.0): a cot for every officer's seat, a table and a stove. Not a street building, so nothing outside moves. */
export function hqQuarters(tier) {
  const T = HQ_TIERS[tier];
  const perRow = 6;
  const rows = Math.ceil(T.seats / perRow);
  const W = 2 * perRow + 2;
  const H = 3 * rows + 4;
  const dx = Math.floor(W / 2);
  const props = [];
  const spots = { entry: { x: dx, y: H - 2, facing: 'up' }, common: { x: dx, y: H - 3, facing: 'up' } };
  for (let k = 0; k < T.seats; k++) {
    const x = 1 + 2 * (k % perRow);
    const y = 1 + 3 * Math.floor(k / perRow);
    props.push({ id: `hq_${tier}_cot_${k + 1}`, type: 'cot', x, y });
    spots[`bed_${k + 1}`] = { x: x + 1, y: y + 1, facing: 'left' }; // beside the cot (a cot is 1×2)
  }
  props.push({ id: `hq_${tier}_q_table`, type: 'table', x: dx - 1, y: H - 4, w: 3, examine: 'A table, a kettle and a rota in a neat hand: "WHOSE TURN TO MAKE THE MINUTES". Every name has been initialled.' });
  props.push({ id: `hq_${tier}_q_stove`, type: 'stove', x: W - 2, y: H - 2 });
  return {
    id: hqQuartersId(tier), name: `${T.name} — staff quarters`, kind: 'interior', music: 'mus_home', ambience: 'amb_indoor', dwelling: true, // the officers live here, so beds are allowed (the validator's rule: beds only in homes)
    tiles: roomTilesFor(W, H, dx),
    doors: [{ id: `door_hq_${tier}_quarters_exit`, x: dx, y: H - 1, to: { map: hqMapId(tier), spot: 'quarters_door' } }],
    spots, keepClear: [[dx, H - 2]], props,
  };
}
// (the room's tiles come from the shared builder; imported lazily so this file stays plain data for the content tests)
import { roomTiles } from '../world/mapBuilder.js';
const roomTilesFor = (W, H, dx, extra = []) => roomTiles(W, H, 't', dx, extra);

/** Put the three offices on the street and their halls beside it (called once, before the interiors are laid over the buildings). */
export function addHq(MAPS) {
  const S = MAPS.halvermouth;
  for (const tier of HQ_ORDER) {
    MAPS[hqMapId(tier)] = hqInterior(tier);
    MAPS[hqQuartersId(tier)] = hqQuarters(tier); // v0.87.0
    S.buildings.push(hqBuilding(tier));
    const T = HQ_TIERS[tier];
    // a board in front: FOR SALE until the parent buys it, then a brass plate
    S.props.push(
      { id: `hq_${tier}_forsale`, type: 'sign', x: T.at.doorX + 2, y: T.at.y + T.at.h, examine: `"${T.name} — FOR SALE. Viewings by appointment: your parent company's tablet, Group."`, hiddenUnless: { hq: { tier, owned: false } } },
      { id: `hq_${tier}_plate`, type: 'sign', x: T.at.doorX + 2, y: T.at.y + T.at.h, examine: `A brass plate: "${T.name}. Head office."`, hiddenUnless: { hq: { tier, owned: true } } },
    );
  }
}
