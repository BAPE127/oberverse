// Hollowmoor Lot (v0.98.0; redrawn as a military base in v0.103.6): the company's own ground, a fenced lot on the shore road west of Mill Road Yards (the east gate of this map is the Yards' west
// gate). Final coordinates. Preview: `npm run map -- hollowmoor_lot`.
//
// Zones, north to south: the administration and personnel rows (offices, barracks, mess, medical, range), the command and stores row, the main road from the gate, the motor pool and its vehicle
// yard, the works (factory row, fuel dump), and, behind an inner fence, the airfield: the hangars, an apron with its stands, three helipads, a taxiway and a runway with its lights, a tower and
// windsocks. A chain-link fence with razor wire runs round the lot, with guard towers at the corners and a gatehouse. The parked vehicles and aircraft are drawn live from the company's own stores
// (src/engine/drawParked.js) at the stands listed below; nothing is drawn that the company does not own.
//
// Every facility Mason's Os can build has its fixed SLOT here (src/content/facilities.js): a building that stands on the map from the start but is a SITE until the company has built it
// (the same way Roost's halls work): stakes while it is only a place on the survey, a scaffold while Mason's Os works, the building when it is done. The fence and the gate are
// part of the base from the day the lot is bought. Unbuilt, a slot is a blocked patch of ground; built, it has a room inside (generated from its `look`, src/content/baseKit.js).
import { MapBuilder } from '../../world/mapBuilder.js';
import { FACILITIES, LOT } from '../facilities.js';
import { KIT, lookOf } from '../baseKit.js';

export const HM_W = 112;
export const HM_H = 112;

/** Where each facility stands: x, y, w, h in tiles (the door is at the bottom centre). */
export const SLOTS = {
  office: [10, 10, 10, 7], bunk: [24, 10, 12, 7], barracks_a: [40, 10, 14, 8], mess: [58, 10, 12, 8], medical: [74, 10, 10, 8], range: [88, 10, 14, 12],
  cage: [10, 24, 8, 6], command: [22, 24, 16, 9], barracks_b: [42, 24, 14, 8], armoury: [60, 24, 12, 8], depot: [76, 24, 12, 8], training: [90, 25, 12, 9],
  motor: [10, 42, 22, 10], barracks_c: [36, 42, 14, 9], hospital: [54, 42, 14, 10], depot_b: [72, 42, 12, 8],
  factory: [10, 62, 24, 10], works: [38, 62, 24, 10], hangars: [10, 76, 32, 10],
};

/** The lot's fence: x from FENCE.x0 to FENCE.x1, y from FENCE.y0 to FENCE.y1 (props), with the gate in the east side at GATE rows. */
export const FENCE = { x0: 6, x1: 105, y0: 6, y1: 108, gateY0: 36, gateY1: 39 };

/** The airfield behind the inner fence (the markings come from this, as at Starling Flats). */
export const AIRFIELD = {
  runways: [{ id: '09/27', x: 12, y: 102, w: 88, h: 6, ends: ['09', '27'] }],
  taxiways: [{ x: 12, y: 98, w: 88, h: 4 }],
  aprons: [{ id: 'hm_apron', x: 8, y: 86, w: 83, h: 12, slots: [[12, 88], [28, 88], [44, 88], [60, 88], [76, 88]] }],
  hold: [[16, 100], [96, 100]],
};
/** Where the company's machines park. Ground vehicles in the yard below the motor pool; helicopters on the pads, then the apron; aircraft on the apron stands (nose up). */
export const PARK = {
  ground: [[11, 54.6], [16, 54.6], [21, 54.6], [26, 54.6], [31, 54.6], [11, 57.4], [16, 57.4], [21, 57.4], [26, 57.4], [31, 57.4]],
  helipads: [[76, 78], [82, 78], [88, 78]],
  apron: [[15, 92], [31, 92], [47, 92], [63, 92], [79, 92]],
};
/** The inner fence's line (y) and the road through its gate (x). */
export const INNER = { y: 74, roadX0: 100, roadX1: 103 };

const m = new MapBuilder(HM_W, HM_H, '.');
m.rect(0, 0, HM_W, 1, 'R').rect(0, HM_H - 1, HM_W, 1, 'R').rect(0, 0, 1, HM_H, 'r').rect(HM_W - 1, 0, 1, 36, 'r').rect(HM_W - 1, 40, 1, HM_H - 40, 'r'); // the edge of the map (the road leaves east at rows 36–39)
// ground: concrete hardstand under every building, paths between the rows, tarmac for the yard, the apron, the taxiway and the runway
for (const [x, y, w, h] of Object.values(SLOTS)) m.rect(x - 2, y - 1, w + 4, h + 3, 'g');
m.rect(8, 19, 96, 2, 'g').rect(8, 32, 96, 2, 'g').rect(8, 53, 96, 1, 'g'); // the cross paths between the rows of buildings
m.rect(7, 36, 98, 4, '=').rect(105, 36, 7, 4, '='); // the lot's road, out through the gate in the east fence and on to the Yards
m.rect(7, 35, 98, 1, ',').rect(7, 40, 98, 1, ','); // its pavements
m.rect(105, 35, 7, 1, ',').rect(105, 40, 7, 1, ',');
m.rect(8, 53, 30, 6, 'a'); // the vehicle yard below the motor pool
m.rect(86, 44, 14, 14, 'g'); // the parade ground
m.rect(INNER.roadX0, 41, 4, 59, 'a'); // the road down to the airfield
m.rect(66, 62, 20, 10, 'g'); // the fuel dump's pad
m.rect(72, 74, 20, 10, 'g'); // the helipads' pad
for (const r of [...AIRFIELD.runways, ...AIRFIELD.taxiways, ...AIRFIELD.aprons]) m.rect(r.x, r.y, r.w, r.h, 'a');
m.rect(8, 86, 40, 1, 'g'); // the apron's edge in front of the hangars
m.rect(100, 40, 1, 1, ',');

const buildings = Object.values(FACILITIES).map((F) => {
  const [x, y, w, h] = SLOTS[F.slot]; const look = lookOf(F.id); const K = KIT[look];
  return {
    id: `hm_${F.slot}`, name: F.name, mapLabel: F.name, x, y, w, h, roof: F.roof || '#6a6a58', wall: F.wall || K.wall, trim: K.trim, sign: F.sign, signColor: '#e8e0c8', flatRoof: true, trade: F.trade, facility: F.id, look,
    door: { x: x + Math.floor(w / 2), y: y + h - 1, lock: { key: 'item_none', facility: F.id, message: `${F.name}: Mason's Os has not built it yet.` } },
    // v0.103.2: the company's command terminal stands in the site office: the whole business is run from it (people, squads, armoury, supply, generals, contracts, the strategic map)
    ...(F.id === 'site_office' ? { terminal: { interact: { kind: 'war', action: 'terminal', name: 'command terminal' }, examine: 'The company\'s command terminal: a ruggedised screen on a steel desk, bolted down. Roster, stores, supply orders, contracts and the war map, all on one screen. A sticky note: "NOT A TABLET. DO NOT TAKE HOME."' } } : {}),
  };
});

const props = [];
let n = 0;
const P = (type, x, y, o = {}) => props.push({ id: `hm_${type}_${n++}`, type, x, y, ...o });
// the sites: stakes on the survey, a scaffold while Mason's Os works
for (const F of Object.values(FACILITIES)) {
  const [x, y, w, h] = SLOTS[F.slot];
  const at = (state) => ({ facility: { slot: F.id, state } });
  P('stake', x, y, { hiddenUnless: { facility: { slot: F.id, state: 'none', lot: true } } }); P('stake', x + w - 1, y + h - 1, { hiddenUnless: { facility: { slot: F.id, state: 'none', lot: true } } });
  P('scaffold', x, y, { w, h, examine: `${F.name}: Mason's Os is working here. A sign: "FOUNDATIONS. Pardon our dust."`, hiddenUnless: at('foundation') });
  P('scaffold', x, y, { w, h, examine: `${F.name}: the frame is up. A sign: "FRAME. Hard hats beyond this point."`, hiddenUnless: at('frame') });
  P('scaffold', x, y, { w, h, examine: `${F.name}: walls and roof on; the crew is fitting it out.`, hiddenUnless: at('fitted') });
  P('sign', x + Math.floor(w / 2) + 1, y + h, { examine: `${F.name} (stage ${F.stage}). ${F.text || ''}`, hiddenUnless: { facility: { slot: F.id, state: ['none', 'permit', 'foundation', 'frame', 'fitted'], lot: true } } });
}
// the fence: chain-link with razor wire, all round, with the gate in the east side and a second fence across the lot's south end with its own gate for the airfield road
const fenceAt = (x, y) => P('chainfence', x, y, { razor: true, examine: 'A chain-link fence with razor wire along the top. Somebody has measured the gaps between the strands.' });
for (let x = FENCE.x0; x <= FENCE.x1; x++) { fenceAt(x, FENCE.y0); fenceAt(x, FENCE.y1); }
for (let y = FENCE.y0 + 1; y < FENCE.y1; y++) { fenceAt(FENCE.x0, y); if (y < FENCE.gateY0 || y > FENCE.gateY1) fenceAt(FENCE.x1, y); }
for (let x = FENCE.x0 + 1; x < FENCE.x1; x++) if (x < INNER.roadX0 || x > INNER.roadX1) fenceAt(x, INNER.y);
// the gate: a gatehouse booth each side, the boom, signs, bollards, the notice board
P('bigsign', 93, 41, { w: 3, h: 2, text: 'HOLLOWMOOR LOT', sub: 'PRIVATE · BY APPOINTMENT', examine: 'HOLLOWMOOR LOT. "Private ground. Callers by appointment. Dogs, regrettably, are not by appointment."' });
P('boom_barrier', 104, 36, { w: 1, h: 4, raised: true, solid: false, examine: 'The lot\'s boom barrier. It is up. There is nobody to put it down yet.' });
P('booth', 103, 34, { examine: 'The gatehouse: a chair, a radio and a ledger of vehicles in and out, in pencil.' });
P('booth', 103, 41, { examine: 'The second guard post. Empty at the moment; a mug of tea says it is not for long.' });
P('sign', 102, 35, { examine: 'GATE. "Deliveries to the site office. Everything else to the site office as well."' });
P('noticeboard', 99, 41, { examine: 'THE NOTICE BOARD: "Mason\'s Os: foundations Mondays, frames Thursdays, finishing whenever the weather allows. Permits are the Civic Office\'s, and so are the forms."' });
P('bollard', 104, 35); P('bollard', 104, 40);
for (const [x, y] of [[6, 6], [102, 6], [102, 105], [6, 105]]) P('control_tower', x === 6 ? x + 1 : x, y === 6 ? y + 1 : y - 0, { examine: 'A guard tower: a searchlight, a rail and a person with binoculars who is not supposed to be looking at you.' });
for (let x = 14; x < 100; x += 14) { P('streetlamp', x, 35); P('streetlamp', x + 7, 40); }
for (let y = 50; y < 100; y += 12) P('streetlamp', 99, y);
// headquarters: radar, dish and the flags
P('radar', 62, 34, { examine: 'The base\'s surveillance radar, turning patiently. It has never reported anything more exciting than gulls.' }); P('dish', 66, 34, { examine: 'A satellite dish aimed at a spot in the sky that only the signaller can name.' });
P('flagpole', 24, 34, { color: '#8a2a30' }); P('flagpole', 36, 34, { color: '#e8c84a' });
for (const x of [88, 92, 96]) P('flagpole', x, 44, { color: x === 92 ? '#8a2a30' : '#e8c84a' });
P('bench', 87, 56); P('bench', 95, 56);
// the range's berm and the training ground's kit
for (let x = 88; x < 102; x += 2) P('blast_wall', x, 23, { examine: 'The range berm: a bank of earth and concrete with a great many small dents in it.' });
P('trench', 87, 59, { w: 2 }); P('trench', 90, 59, { w: 2 }); P('tent', 93, 59, { w: 2 }); P('tent', 96, 59, { w: 2 });
// the vehicle yard
P('sign', 9, 59, { examine: 'VEHICLE YARD. "Park nose out. Handbrake on. The sergeant is watching."' });
for (const [x, y] of [[34, 53], [34, 56]]) P('barrel', x, y);
// the fuel dump
for (const [x, y] of [[68, 64], [72, 64], [68, 68], [72, 68]]) P('tank', x, y, { examine: 'A fuel tank, stencilled with a number and a warning. The warning is longer than the number.' });
P('pipe', 70, 66); P('pipe', 71, 66); P('pipe', 76, 66); P('pipe', 76, 67); P('barrel', 66, 63); P('barrel', 66, 64); P('barrel', 66, 65); P('crate', 80, 70);
P('sign', 66, 61, { examine: 'FUEL DUMP. "No smoking. No lighters. No poetry about smoking."' });
P('watertower', 80, 62, { examine: 'The base\'s water tower. Painted on it: HOLLOWMOOR. Somebody added a bird.' });
// the airfield: the inner gate, helipads, tower, lights, signs, windsocks
P('boom_barrier', INNER.roadX0, INNER.y, { w: 4, h: 1, raised: true, solid: false, examine: 'The airfield gate. It is up; a sign says that the pilots may not be.' });
P('sign', INNER.roadX0 - 1, INNER.y + 1, { examine: 'AIRFIELD. "Aircraft have the right of way. So does everything that is bigger than you."' });
for (const [x, y] of PARK.helipads) P('helipad', x - 2, y - 2, { w: 4, h: 4 });
P('control_tower', 94, 90, { examine: 'The base tower: a glass cab on a concrete stalk. From up there you can see the whole airfield, the runway and the sea beyond the fence.' }); P('radar', 94, 94, { examine: 'The approach radar.' });
P('windsock', 92, 96, { examine: 'The windsock. It points the way the wind is going, with confidence.' }); P('windsock', 14, 96, { examine: 'The second windsock, in disagreement with the first by about four degrees.' });
for (let x = 14; x < 100; x += 6) { P('runway_light', x, 101); P('runway_light', x, 108 - 1); }
for (let y = 102; y < 108; y++) { P('runway_light', 11, y, { color: 'green' }); P('runway_light', 100, y, { color: 'red' }); }
P('runway_sign', 14, 100, { text: '09 ← A' }); P('runway_sign', 94, 100, { text: 'A → 27' });
P('engine_stand', 44, 87); P('tug', 48, 88, { w: 2, h: 1 });
for (const [x, y] of [[8, 61], [60, 73], [100, 8], [3, 30], [3, 60], [3, 90]]) P('tree', x, y);

export const hollowmoorLot = {
  id: 'hollowmoor_lot', name: 'Hollowmoor Lot', kind: 'outdoor', music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city', tiles: m.rows(),
  airfield: AIRFIELD,
  areas: [{ id: 'area_hm_road', name: 'The Hollowmoor Road', x: 98, y: 30, w: 14, h: 12 }, { id: 'area_hm_lot', name: 'Hollowmoor Lot', x: 6, y: 6, w: 99, h: 69 }, { id: 'area_hm_airfield', name: 'Hollowmoor Airfield', x: 6, y: 75, w: 99, h: 34 }],
  buildings,
  doors: [36, 37, 38, 39].map((y, i) => ({ id: `door_hm_east_${i}`, x: HM_W - 1, y, keepTile: true, gateway: 'Mill Road Yards', label: 'The shore road east, to Mill Road Yards', to: { map: 'yards', spot: 'hollowmoor_gate' } })),
  spots: { east_gate: { x: 108, y: 37, facing: 'left' }, gate_inside: { x: 100, y: 37, facing: 'left' }, site_office: { x: 15, y: 18, facing: 'down' }, notice: { x: 99, y: 42, facing: 'up' },
    airfield: { x: 101, y: 90, facing: 'down' }, apron: { x: 23, y: 96, facing: 'up' }, runway: { x: 50, y: 104, facing: 'right' }, parade: { x: 92, y: 52, facing: 'up' }, yard: { x: 20, y: 60, facing: 'up' },
    ...Object.fromEntries(Object.entries(SLOTS).flatMap(([slot, [x, y, w, h]]) => [[`hm_${slot}_out`, { x: x + Math.floor(w / 2), y: y + h, facing: 'down' }]])) },
  props,
};

export default [hollowmoorLot];
