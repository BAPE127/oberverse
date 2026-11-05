// Fort Gullcrest (v0.98.0): the government's own base on the Hald Reach, a walled fort north of Lariat (mock-up `proposal-war-national-base.png`), its own map reached up FM 38 from
// Lariat's north gate. Final coordinates. Preview: `npm run map -- fort_gullcrest`.
//
// A garrison of six lives in the barracks block and keeps it: the gate (day and night watch), the perimeter patrol, the Colonel's command post and the Sergeant Major's parade. The
// buildings are the Crown's: their doors are shut to you (soldiers and the garrison's own go through). The fort's tanks, aircraft and full garrison come with later releases; here
// it is a place, with a gate, walls, hangars and a life, and a government that is not your company.
import { MapBuilder } from '../../world/mapBuilder.js';
import { FORT_OWNERS } from '../fort.js';

export const FG_W = 120;
export const FG_H = 84;
const m = new MapBuilder(FG_W, FG_H, '.');
m.rect(0, 0, FG_W, 1, 'R').rect(0, FG_H - 1, 1, 1, 'R').rect(0, 0, 1, FG_H, 'r').rect(FG_W - 1, 0, 1, FG_H, 'r'); // the edge of the map
m.rect(0, FG_H - 1, 55, 1, 'r').rect(61, FG_H - 1, 59, 1, 'r'); // (the road leaves south at columns 56–59)
m.rect(6, 4, 108, 76, 'r').rect(7, 5, 106, 74, '.'); // the fort's wall
m.rect(56, 79, 4, 5, '='); // the road in from Lariat, through the gate in the south wall
m.rect(56, 78, 4, 1, '=');
m.rect(55, 79, 1, 5, ',').rect(60, 79, 1, 5, ',');
m.rect(56, 58, 4, 21, '=').rect(8, 58, 104, 4, '='); // the main road north to the cross road
m.rect(7, 57, 105, 1, ',').rect(7, 62, 105, 1, ',');
m.rect(58, 48, 4, 10, ':'); // the way up to the command post
m.rect(92, 30, 18, 12, 'g'); // the parade ground
m.rect(78, 6, 32, 3, '='); // the apron and runway strip, top right
const B = (id, name, x, y, w, h, o = {}) => ({
  id, name, mapLabel: o.label ?? name, x, y, w, h, roof: o.roof || '#6a6e5a', wall: o.wall || '#9a9e86', trim: '#3a3e30', sign: o.sign, signColor: '#e8e4cc', flatRoof: true, trade: o.trade || 'office', tower: o.tower,
  door: o.door ?? { x: x + Math.floor(w / 2), y: y + h - 1, lock: { key: 'item_none', owners: FORT_OWNERS, message: o.closed || `${name}: Army property. The door is shut to you.` } },
});
const buildings = [
  B('fg_barracks1', 'Barracks 1', 10, 8, 16, 10, { sign: 'BARRACKS 1', trade: 'house' }),
  B('fg_barracks2', 'Barracks 2', 30, 8, 16, 10, { sign: 'BARRACKS 2', trade: 'house' }),
  B('fg_barracks3', 'Barracks 3', 10, 22, 16, 10, { sign: 'BARRACKS 3', trade: 'house' }),
  B('fg_mess', 'Mess hall', 30, 22, 16, 10, { sign: 'MESS HALL', trade: 'diner' }),
  B('fg_hospital', 'Hospital', 10, 38, 14, 10, { sign: 'HOSPITAL', wall: '#c8bcb4', roof: '#9a8a82' }),
  B('fg_depot', 'Supply depot', 28, 38, 14, 10, { sign: 'SUPPLY DEPOT', trade: 'storage' }),
  B('fg_command', 'Command post', 50, 38, 18, 10, { sign: 'COMMAND', wall: '#b8a868', roof: '#7a6e3a', closed: 'COMMAND. A sentry, a bell and a sign: "Appointments only. The Colonel is always busy."' }),
  B('fg_hangars', 'Aircraft hangars', 76, 12, 30, 12, { sign: 'HANGARS', trade: 'storage', wall: '#7a8590', roof: '#4a5560' }),
  B('fg_armoury', 'Armoury', 76, 28, 14, 10, { sign: 'ARMOURY', trade: 'storage', wall: '#8a867a' }),
  B('fg_motor', 'Motor pool', 10, 64, 26, 10, { sign: 'MOTOR POOL', trade: 'storage', wall: '#7a7e8a', roof: '#4a4e5a' }),
  B('fg_range', 'Training range', 80, 64, 26, 10, { sign: 'TRAINING RANGE', trade: 'storage', wall: '#7a8a6a' }),
  B('fg_quarters', 'The Barracks Block', 38, 64, 14, 10, { sign: 'BARRACKS BLOCK', trade: 'house', wall: '#8a8e76', label: 'The Barracks Block' }),
  B('fg_gatehouse', 'The Guardhouse', 64, 66, 9, 7, { sign: 'GUARDHOUSE', trade: 'office' }),
];
const props = []; let n = 0;
const P = (type, x, y, o = {}) => props.push({ id: `fg_${type}_${n++}`, type, x, y, ...o });
P('bigsign', 52, 80, { w: 3, h: 2, text: 'FORT GULLCREST', sub: 'SUND ARMY · AUTHORISED PERSONNEL', examine: 'FORT GULLCREST. "The Crown\'s base on the Hald Reach. Authorised personnel only. Everyone else: the gate, and then the road."' });
P('boom_barrier', 56, 76, { w: 4, h: 1, raised: false, solid: false, examine: 'The gate\'s boom barrier. It is down, as it is whenever it is not being waved at.' });
P('sign', 61, 77, { examine: 'GATE. "Vehicles stop. Pedestrians stop. Visitors stop, and then wait."' });
P('booth', 61, 75, { examine: 'The gate post: a chair, a radio and a ledger in which the day\'s traffic is entered with a pencil that has been sharpened too many times.' });
for (let y = 62; y > 50; y -= 6) { P('streetlamp', 55, y); P('streetlamp', 60, y); }
for (let x = 12; x < 106; x += 16) { P('streetlamp', x, 57); P('streetlamp', x + 8, 62); }
P('flagpole', 49, 48, { color: '#2a5a9a' }); P('flagpole', 68, 48, { color: '#2a5a9a' });
P('flagpole', 100, 29, { color: '#2a5a9a' });
P('statue', 64, 52, { w: 2, h: 3, label: 'THE UNKNOWN CLERK', examine: 'A bronze figure at a desk, holding a pen. The plaque: "Without Whom." Nobody has ever found out whom.' });
for (const [x, y] of [[8, 6], [8, 34], [28, 34], [48, 6], [70, 20], [70, 50], [8, 52], [112, 50], [112, 26]]) P('tree', x, y);
P('noticeboard', 98, 43, { examine: 'PARADE ORDERS: "Boots clean. Belts straight. Opinions, to yourself."' });
P('bench', 94, 43); P('bench', 104, 43);
P('crate', 78, 40); P('crate', 80, 40); P('barrel', 82, 40);
P('bollard', 55, 78); P('bollard', 60, 78);
export const fortGullcrest = {
  id: 'fort_gullcrest', name: 'Fort Gullcrest', kind: 'outdoor', music: { day: 'mus_halvermouth', night: 'mus_halvermouth' }, ambience: 'amb_city', tiles: m.rows(),
  areas: [{ id: 'area_fg_road', name: 'The Gullcrest Road', x: 50, y: 74, w: 16, h: 10 }, { id: 'area_fg', name: 'Fort Gullcrest', x: 6, y: 4, w: 108, h: 76 }],
  buildings,
  doors: [56, 57, 58, 59].map((x, i) => ({ id: `door_fg_south_${i}`, x, y: FG_H - 1, keepTile: true, gateway: 'Lariat', label: 'FM 38 south, to Lariat', to: { map: 'lariat', spot: 'north_gate' } })),
  spots: {
    south_gate: { x: 57, y: FG_H - 3, facing: 'up' }, gate_post: { x: 62, y: 76, facing: 'left' }, command_out: { x: 58, y: 49, facing: 'down' }, parade: { x: 98, y: 36, facing: 'down' },
    patrol_a: { x: 9, y: 59, facing: 'right' }, patrol_b: { x: 56, y: 60, facing: 'right' }, patrol_c: { x: 108, y: 59, facing: 'up' }, patrol_d: { x: 108, y: 30, facing: 'up' }, patrol_e: { x: 70, y: 56, facing: 'left' }, patrol_f: { x: 28, y: 56, facing: 'left' },
  },
  props,
};
export default [fortGullcrest];
