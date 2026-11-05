// Hollowmoor Lot (v0.98.0): the company's own ground, a fenced lot on the shore road west of Mill Road Yards (the east gate of this map is the Yards' west gate). Final coordinates.
// Preview: `npm run map -- hollowmoor_lot`.
//
// Every facility Mason's Os can build has its fixed SLOT here (src/content/facilities.js): a building that stands on the map from the start but is a SITE until the company has built it
// (the same way Roost's halls work): stakes while it is only a place on the survey, a scaffold while Mason's Os works, the building when it is done. The fence and the gate are
// part of the base from the day the lot is bought. Unbuilt, a slot is a blocked patch of ground; built, it has a room inside (generated, as for any building without a made one).
import { MapBuilder } from '../../world/mapBuilder.js';
import { FACILITIES, LOT } from '../facilities.js';

export const HM_W = 112;
export const HM_H = 76;

/** Where each facility stands: x, y, w, h in tiles (the door is at the bottom centre). */
export const SLOTS = {
  office: [10, 10, 10, 7], bunk: [24, 10, 12, 7], barracks_a: [40, 10, 14, 8], mess: [58, 10, 12, 8], medical: [74, 10, 10, 8], range: [88, 10, 14, 12],
  cage: [10, 24, 8, 6], command: [22, 24, 16, 9], barracks_b: [42, 24, 14, 8], armoury: [60, 24, 12, 8], depot: [76, 24, 12, 8], training: [90, 25, 12, 9],
  motor: [10, 42, 22, 10], barracks_c: [36, 42, 14, 9], hospital: [54, 42, 14, 10], depot_b: [72, 42, 12, 8],
  factory: [10, 56, 24, 10], works: [38, 56, 24, 10], hangars: [66, 56, 30, 10],
};

const m = new MapBuilder(HM_W, HM_H, '.');
m.rect(0, 0, HM_W, 1, 'R').rect(0, HM_H - 1, HM_W, 1, 'R').rect(0, 0, 1, HM_H, 'r').rect(HM_W - 1, 0, 1, 36, 'r').rect(HM_W - 1, 40, 1, HM_H - 40, 'r'); // the edge of the map (the road leaves east at rows 36–39)
m.rect(6, 6, 99, 65, 'r').rect(7, 7, 97, 63, '.'); // the fence
m.rect(7, 36, 98, 4, '=').rect(105, 36, 7, 4, '='); // the lot's road, out through the gate in the east fence and on to the Yards
m.rect(7, 35, 98, 1, ',').rect(7, 40, 98, 1, ','); // its pavements
m.rect(105, 35, 7, 1, ',').rect(105, 40, 7, 1, ',');
m.rect(8, 19, 96, 2, ':').rect(8, 32, 96, 2, ':').rect(8, 53, 96, 2, ':'); // the cross paths between the rows of buildings
m.rect(100, 40, 1, 1, ',');

const buildings = Object.values(FACILITIES).map((F) => {
  const [x, y, w, h] = SLOTS[F.slot];
  return {
    id: `hm_${F.slot}`, name: F.name, mapLabel: F.name, x, y, w, h, roof: F.roof || '#6a6a58', wall: F.wall || '#a8a690', trim: '#3a3a30', sign: F.sign, signColor: '#e8e0c8', flatRoof: true, trade: F.trade, facility: F.id,
    door: { x: x + Math.floor(w / 2), y: y + h - 1, lock: { key: 'item_none', facility: F.id, message: `${F.name}: Mason's Os has not built it yet.` } },
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
// the gate and the fence
P('bigsign', 93, 41, { w: 3, h: 2, text: 'HOLLOWMOOR LOT', sub: 'PRIVATE · BY APPOINTMENT', examine: 'HOLLOWMOOR LOT. "Private ground. Callers by appointment. Dogs, regrettably, are not by appointment."' });
P('boom_barrier', 104, 36, { w: 1, h: 4, raised: true, solid: false, examine: 'The lot\'s boom barrier. It is up. There is nobody to put it down yet.' });
P('sign', 102, 35, { examine: 'GATE. "Deliveries to the site office. Everything else to the site office as well."' });
P('noticeboard', 99, 41, { examine: 'THE NOTICE BOARD: "Mason\'s Os: foundations Mondays, frames Thursdays, finishing whenever the weather allows. Permits are the Civic Office\'s, and so are the forms."' });
for (let x = 14; x < 100; x += 14) { P('streetlamp', x, 35); P('streetlamp', x + 7, 40); }
for (const [x, y] of [[8, 8], [22, 20], [56, 20], [72, 21], [102, 8], [102, 50], [8, 52], [86, 52], [60, 52], [8, 68]]) P('tree', x, y);
P('flagpole', 8, 34, { color: '#8a2a30' });
P('crate', 100, 42); P('barrel', 102, 42); P('crate', 100, 44);
P('bollard', 104, 35); P('bollard', 104, 40);

export const hollowmoorLot = {
  id: 'hollowmoor_lot', name: 'Hollowmoor Lot', kind: 'outdoor', music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city', tiles: m.rows(),
  areas: [{ id: 'area_hm_road', name: 'The Hollowmoor Road', x: 98, y: 30, w: 14, h: 12 }, { id: 'area_hm_lot', name: 'Hollowmoor Lot', x: 6, y: 6, w: 99, h: 65 }],
  buildings,
  doors: [36, 37, 38, 39].map((y, i) => ({ id: `door_hm_east_${i}`, x: HM_W - 1, y, keepTile: true, gateway: 'Mill Road Yards', label: 'The shore road east, to Mill Road Yards', to: { map: 'yards', spot: 'hollowmoor_gate' } })),
  spots: { east_gate: { x: 108, y: 37, facing: 'left' }, gate_inside: { x: 100, y: 37, facing: 'left' }, site_office: { x: 15, y: 18, facing: 'down' }, notice: { x: 99, y: 42, facing: 'up' },
    ...Object.fromEntries(Object.entries(SLOTS).flatMap(([slot, [x, y, w, h]]) => [[`hm_${slot}_out`, { x: x + Math.floor(w / 2), y: y + h, facing: 'down' }]])) },
  props,
};

export default [hollowmoorLot];
