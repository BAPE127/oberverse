// The grounds of Ironcrest Hall and of Willowmere (v0.94.1): each a small map of its own, reached by road from the Crown Quarter's east gates (Palace
// Road to Ironcrest, the Crown Gate Road to Willowmere). Coordinates are final. Preview: `npm run map -- ironcrest_grounds`.
//
//   IRONCREST: a walled compound ("discipline, hard stone, one road in, guards at every turn"): the gate in the west wall with its gatehouse, the guards'
//   cottages, the Hall in the north and the range and armoury in the north-east; lawns, hedges and a statue south of the drive.
//   WILLOWMERE: "light, lake, glass, an open garden gate": no wall; the house, the staff cottages, a glass conservatory and a garden pavilion along the
//   north side of the drive, the lake and a pier to the south.
import { MapBuilder } from '../../world/mapBuilder.js';
import { IRONCREST, WILLOWMERE } from './mansions.js';
import { ESTATE_DEFS, ESTATE_OWNERS } from '../estates.js';

const W = 110;
const H = 72;

const B = (id, name, x, y, w, h, o = {}) => ({
  id, name, mapLabel: o.label ?? name, x, y, w, h, roof: o.roof || '#8a8478', wall: o.wall || '#d8d2c4', trim: o.trim || '#4a4438', sign: o.sign, signColor: o.signColor, flatRoof: o.flatRoof ?? true, columns: o.columns, tower: o.tower, trade: o.trade,
  door: o.door ?? { x: x + Math.floor(w / 2), y: y + h - 1, lock: { key: 'item_none', ...(o.owners ? { owners: o.owners } : {}), message: o.closed || `${name}: the door is shut.` } },
});

function edges(m) {
  m.rect(0, 0, W, 1, 'R').rect(0, H - 1, W, 1, 'R').rect(W - 1, 0, 1, H, 'r');
  m.rect(0, 0, 1, 34, 'r').rect(0, 38, 1, H - 38, 'r'); // the edge of the map (the road leaves at rows 34–37)
}
function drive(m) {
  m.rect(0, 33, 100, 1, ',').rect(0, 38, 100, 1, ','); // the drive's pavements
  m.rect(0, 34, 100, 4, '='); // the drive
  m.rect(100, 32, 6, 8, 'm'); // the turning circle at the end
}
const doorsWest = (to, label) => [34, 35, 36, 37].map((y, i) => ({ id: `door_${to.map}_${i}`, x: 0, y, keepTile: true, gateway: 'The Crown Quarter', label, to }));

// ================================================================== IRONCREST
const im = new MapBuilder(W, H, '.');
edges(im);
im.rect(14, 4, 93, 63, 'r').rect(15, 5, 91, 61, '.'); // the compound wall
drive(im); // (after the wall: the drive runs through the gate in it)
im.rect(50, 33, 36, 1, 'm'); // the forecourt along the Hall's front
im.rect(23, 20, 1, 12, ',').rect(98, 26, 1, 6, ','); // the paths to the cottages and the range
im.rect(26, 47, 32, 10, 'g'); // the parade ground
im.rect(20, 40, 76, 1, ':').rect(66, 40, 1, 24, ':').rect(30, 52, 56, 1, ':'); // garden paths south of the drive
const IRON_OWN = ESTATE_OWNERS.ironcrest;
const ironBuildings = [
  B('ic_hall', 'Ironcrest Hall', 50, 9, IRONCREST.w, IRONCREST.h, { label: 'Ironcrest Hall', sign: 'IRONCREST HALL', signColor: '#e8e0d0', roof: '#4a4a52', wall: '#a8a49c', trim: '#2a2a30', columns: true, flatRoof: false, tower: 3,
    door: { x: 50 + IRONCREST.dx, y: 9 + IRONCREST.h - 1, to: { map: 'ironcrest_hall', spot: 'entry' }, lock: { key: 'item_none', owners: IRON_OWN, flag: ESTATE_DEFS.ironcrest.flag, hours: { from: '09:00', to: '21:00' }, flagMessage: 'IRONCREST HALL. Callers are received by invitation. The steward keeps the book; the guards keep the steward.' } } }),
  B('ih_cottages', 'The Guards\' Cottages', 18, 21, 11, 12, { sign: 'GUARDS\' COTTAGES', wall: '#8a867e', roof: '#4a4a52', trade: 'house' }),
  B('ic_gatehouse', 'The Gatehouse', 30, 27, 8, 6, { sign: 'GATEHOUSE', wall: '#8a867e', roof: '#4a4a52', trade: 'office', owners: IRON_OWN, closed: 'THE GATEHOUSE. Guards only.' }),
  B('ic_range', 'The Range & Armoury', 92, 17, 12, 16, { sign: 'RANGE & ARMOURY', wall: '#7a766e', roof: '#3a3a40', trade: 'storage', owners: IRON_OWN, closed: 'THE RANGE & ARMOURY. A steel door, a red light and a sign: "LIVE FIRE. THE GUARDS WILL SAY WHEN."' }),
];
const ip = []; let n = 0;
const IP = (type, x, y, o = {}) => ip.push({ id: `ig_${type}_${n++}`, type, x, y, ...o });
IP('bigsign', 5, 31, { w: 3, h: 2, text: 'IRONCREST HALL', sub: 'PRIVATE ROAD · BY INVITATION', examine: 'IRONCREST HALL. "Private road. Callers are received by invitation, between nine and nine. The gate is attended."' });
IP('boom_barrier', 20, 34, { w: 1, h: 4, raised: true, solid: false, examine: 'The gate\'s boom barrier. It is up. Dagger is watching it. It would be very wise to go on being up.' });
IP('sign', 22, 33, { examine: 'GATE. "Visitors report to the gatehouse. Photography of the guards is permitted; of the armoury, regrettable."' });
IP('booth', 28, 33, { examine: 'The gate booth: a chair, a flask, a radio and a log in which every vehicle since the wall was built is entered in pencil.' });
for (let x = 22; x < 98; x += 12) { IP('streetlamp', x, 33); IP('streetlamp', x + 6, 38); }
for (const [x, y] of [[20, 8], [28, 12], [36, 8], [22, 17], [92, 8], [96, 12], [100, 8], [20, 44], [26, 56], [34, 62], [86, 46], [92, 56], [98, 62], [44, 60], [78, 60], [58, 62]]) IP('tree', x, y);
for (let x = 18; x < 48; x += 2) IP('bush', x, 6); for (let x = 88; x < 104; x += 2) IP('bush', x, 6);
IP('fountain', 62, 44, { w: 3, h: 3, examine: 'A cold stone fountain in the shape of a fist holding a trowel. Water comes out of the wrist. Nobody has ever seen it dry.' });
IP('statue', 38, 44, { w: 2, h: 3, label: 'THE FIRST SENTRY', examine: 'A bronze sentry with a rifle, standing very straight. The plaque: "He Held The Line." Beneath it, in smaller letters, "(He Was Not Asked To Move.)"' });
for (const [x, y] of [[44, 41], [76, 41], [50, 56], [74, 56]]) IP('bench', x, y);
IP('flowerbed', 54, 42); IP('flowerbed', 58, 42); IP('flowerbed', 70, 42); IP('flowerbed', 74, 42);
for (let x = 26; x < 58; x += 2) IP('bush', x, 58); // a clipped hedge along the parade ground
IP('flagpole', 42, 46, { color: '#8a2a30' });
IP('flagpole', 48, 33, { color: '#8a2a30' }); IP('flagpole', 87, 33, { color: '#8a2a30' });
IP('noticeboard', 94, 33, { examine: 'RANGE NOTICE: "Live fire Monday and Thornday, 14:00 to 16:00. Hearing protection is not optional. Neither is silence."' });
IP('crate', 89, 24); IP('barrel', 89, 26); IP('crate', 89, 28);
IP('bollard', 100, 34); IP('bollard', 100, 37);
export const ironcrestGrounds = {
  id: 'ironcrest_grounds', name: 'Ironcrest Hall', kind: 'outdoor', music: { day: 'mus_civic', night: 'mus_civic' }, ambience: 'amb_city', tiles: im.rows(),
  areas: [{ id: 'area_ic_road', name: 'The Ironcrest Road', x: 0, y: 30, w: 14, h: 10 }, { id: 'area_ic_compound', name: 'Ironcrest Compound', x: 14, y: 4, w: 93, h: 62 }],
  buildings: ironBuildings,
  doors: doorsWest({ map: 'crown_quarter', spot: 'ironcrest_gate' }, 'Palace Road west, to the Crown Quarter'),
  spots: { west_gate: { x: 2, y: 35, facing: 'right' }, ih_gate: { x: 21, y: 33, facing: 'right' }, ironcrest_hall_out: { x: 50 + IRONCREST.dx, y: 33, facing: 'down' }, forecourt: { x: 60, y: 34, facing: 'up' } },
  props: ip,
};

// ================================================================== WILLOWMERE
const wm = new MapBuilder(W, H, '.');
edges(wm);
drive(wm);
wm.rect(30, 42, 60, 24, '~'); // the lake
wm.rect(58, 39, 3, 11, 'p'); // the pier, out from the drive's pavement
wm.rect(30, 39, 28, 3, ':').rect(61, 39, 29, 3, ':'); // the shore path
wm.rect(14, 33, 1, 1, ',');
const WM_OWN = ESTATE_OWNERS.willowmere;
const willowBuildings = [
  B('wm_hall', 'Willowmere', 40, 11, WILLOWMERE.w, WILLOWMERE.h, { label: 'Willowmere', sign: 'WILLOWMERE', signColor: '#2a5a4a', roof: '#4a6a5a', wall: '#ece4d0', trim: '#2a4a3a', columns: true, flatRoof: false, tower: 2,
    door: { x: 40 + WILLOWMERE.dx, y: 11 + WILLOWMERE.h - 1, to: { map: 'willowmere_hall', spot: 'entry' }, lock: { key: 'item_none', owners: WM_OWN, flag: ESTATE_DEFS.willowmere.flag, hours: { from: '09:00', to: '21:00' }, flagMessage: 'WILLOWMERE. Susan likes visitors; the steward decides which, and when. She keeps the book.' } } }),
  B('wm_cottages', 'The Staff Cottages', 14, 21, 11, 12, { sign: 'STAFF COTTAGES', wall: '#d8d0b8', roof: '#6a7a5a', trade: 'house' }),
  B('wm_conservatory', 'The Glass Conservatory', 76, 21, 14, 12, { sign: 'THE CONSERVATORY', wall: '#c8e0dc', roof: '#8ab8b0', trade: 'hotel', owners: WM_OWN, closed: 'THE CONSERVATORY. Fundraising dinners, by invitation. The glass is the point; the door is locked.' }),
  B('wm_pavilion', 'The Garden Pavilion', 93, 23, 11, 10, { sign: 'GARDEN PAVILION', wall: '#e4dcc4', roof: '#7a8a6a', trade: 'office', owners: WM_OWN, closed: 'THE GARDEN PAVILION. Meetings, by arrangement with the steward.' }),
];
const wp = []; n = 0;
const WP = (type, x, y, o = {}) => wp.push({ id: `wg_${type}_${n++}`, type, x, y, ...o });
WP('bigsign', 5, 31, { w: 3, h: 2, text: 'WILLOWMERE', sub: 'THE GATE IS OPEN', examine: 'WILLOWMERE. "The gate is open. The cameras, regrettably, are also open. Callers are received by arrangement."' });
WP('boom_barrier', 22, 34, { w: 1, h: 4, raised: true, solid: false, examine: 'A garden gate that is a boom barrier in disguise. It is up. It has never been seen down. Susan says this is a statement.' });
WP('sign', 24, 33, { examine: 'WILLOWMERE. "Walk in. Wipe your feet. Mind the geese."' });
for (let x = 22; x < 98; x += 12) { WP('streetlamp', x, 33); WP('streetlamp', x + 6, 38); }
for (const [x, y] of [[10, 8], [18, 12], [28, 6], [32, 14], [80, 8], [88, 6], [96, 10], [104, 14], [10, 44], [18, 58], [26, 62], [94, 46], [100, 58], [96, 64], [8, 31]]) WP('tree', x, y);
for (const [x, y] of [[34, 40], [44, 40], [72, 40], [86, 40], [30, 46], [90, 50], [28, 58], [92, 62]]) WP('bush', x, y); // reeds
WP('boat', 64, 54, { w: 3, h: 2, examine: 'A rowing boat tied to nothing, drifting about the lake with a lazy air. Fenn says it goes where it likes and returns when it is hungry.' });
WP('bench', 62, 39, { examine: 'A bench at the end of the shore path, facing the water. A cushion sits on it that nobody remembers buying.' }); WP('bench', 56, 39);
WP('flowerbed', 44, 33); WP('flowerbed', 50, 33); WP('flowerbed', 66, 33);
for (const [x, y] of [[32, 18], [36, 24], [74, 14]]) WP('tree', x, y);
WP('flagpole', 38, 33, { color: '#2a5a9a' }); WP('flagpole', 75, 33, { color: '#2a5a9a' });
WP('noticeboard', 96, 33, { examine: 'THE GARDEN: "Open to the neighbours on Moonday afternoons. Please do not feed the ducks the leaflets."' });
WP('bollard', 100, 34); WP('bollard', 100, 37);
export const willowmereGrounds = {
  id: 'willowmere_grounds', name: 'Willowmere', kind: 'outdoor', music: { day: 'mus_fields', night: 'mus_fields' }, ambience: 'amb_fields', tiles: wm.rows(),
  areas: [{ id: 'area_wm_drive', name: 'The Willowmere Drive', x: 0, y: 30, w: 106, h: 10 }, { id: 'area_wm_lake', name: 'Willowmere Lake', x: 30, y: 39, w: 62, h: 28 }, { id: 'area_wm_garden', name: 'Willowmere Gardens', x: 1, y: 4, w: 105, h: 28 }],
  buildings: willowBuildings,
  doors: doorsWest({ map: 'crown_quarter', spot: 'willowmere_gate' }, 'The Gate Road west, to the Crown Quarter'),
  spots: { west_gate: { x: 2, y: 35, facing: 'right' }, wm_lake: { x: 59, y: 39, facing: 'down' }, willowmere_hall_out: { x: 40 + WILLOWMERE.dx, y: 33, facing: 'down' }, garden: { x: 70, y: 33, facing: 'up' } },
  props: wp,
};

export default [ironcrestGrounds, willowmereGrounds];
