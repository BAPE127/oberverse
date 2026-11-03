// Halver House, the Office of the President (v0.93.1). The main hall is laid over the building's footprint (40 × 32, so the street does not move);
// ten rooms open off it, each its own small map, in three zones:
//
//   PUBLIC        open to anyone in office hours (08:00–18:00): the press briefing room and the public records hall; the lobby, the visitors' book and the
//                 security screening are in the hall itself.
//   APPOINTMENT   the waiting gallery, the chief of staff, the cabinet room and the staff offices: locked until you are on the list (the `halver_appointment` flag,
//                 which a later release grants when someone arranges a meeting).
//   RESTRICTED    the President's office, two private negotiation rooms and security control: locked (the `halver_pass` flag, a pass or a persuaded aide).
//
// Nobody is inside yet: the President, the staff, the guards and the ambassadors arrive with the People release. The zones are enforced by the doors.
import { roomTiles } from '../../world/mapBuilder.js';
import { HOUSE_OWNERS } from '../capital.js';

export const HALVER_HOUSE = { w: 40, h: 32, dx: 19 };
const { w: W, h: H, dx: DX } = HALVER_HOUSE;

const HOURS = { from: '08:00', to: '18:00' };
const ZONES = {
  public: { key: 'item_none', hours: HOURS, message: 'Open to the public, 08:00–18:00.' },
  appointment: { key: 'item_none', flag: 'halver_appointment', hours: HOURS, message: 'BY APPOINTMENT. The aide at reception checks a list you are not yet on.' },
  restricted: { key: 'item_none', flag: 'halver_pass', message: 'RESTRICTED. A guard, a camera and a sign: "PASS REQUIRED. A PASS IS NOT A SMILE."' },
};

/** The ten rooms: door x on the hall's north wall, zone, size, floor, and what is in them. */
const ROOMS = [
  { key: 'press', x: 2, zone: 'public', name: 'The Press Briefing Room', w: 17, h: 11, floor: 't', note: 'A podium, forty seats and a camera pit. The Press Secretary briefs here at noon on Thorndays.',
    props: [['desk', 6, 1, 5, 'The podium: a seal, a glass of water nobody has ever drunk and a card that says "SAY LESS".'], ['bench', 2, 4, 6, 'Forty folding seats in rows. Some have a name taped on: the reporters\' places.'], ['bench', 9, 4, 6], ['bench', 2, 6, 6], ['bench', 9, 6, 6], ['monitor_wall', 3, 0, 5, 'A wall of screens, all showing the same politician from different angles.'], ['plant', 14, 8], ['noticeboard', 14, 0, 1, 'BRIEFINGS: "Noon, Thornday. Questions will be taken. Answers will be given. They will not be the same."']] },
  { key: 'waiting', x: 6, zone: 'appointment', name: 'The Waiting Gallery', w: 15, h: 9, floor: 'c', note: 'Chairs along the walls and a clock. Appointments are called by name.',
    props: [['bench', 1, 2, 5, 'Hard chairs, in a row. The cushions have been removed "for the comfort of the speed of meetings".'], ['bench', 1, 5, 5], ['bench', 9, 2, 5], ['bench', 9, 5, 5], ['painting', 6, 0, 3, 'A portrait of a former President looking at his watch.'], ['plant', 13, 1], ['desk', 6, 3, 2, 'The aides\' desk: a list of names, a bell and a mug labelled "DO NOT ASK ABOUT THE LIST".']] },
  { key: 'chief', x: 10, zone: 'appointment', name: 'The Chief of Staff\'s Office', w: 11, h: 9, floor: 'c', note: 'A tidy desk, a wall planner and a door that is open exactly as far as the Chief of Staff wants.',
    props: [['desk', 3, 2, 5, 'The Chief of Staff\'s desk: three phones, one of which rings.'], ['shelf', 1, 1, 2, 'Binders by month. Every spine is labelled in the same careful hand: "HANDLED".'], ['painting', 6, 0, 3, 'A planner of the whole term, 120 days in a grid. A third of it is already crossed out.'], ['plant', 9, 6]] },
  { key: 'cabinet', x: 14, zone: 'appointment', name: 'The Cabinet Room', w: 17, h: 11, floor: 'c', note: 'A long table and a chair for each minister. The cabinet meets here on Thorndays.',
    props: [['table', 4, 3, 9, 'The cabinet table: oak, long, and ringed by chairs with name cards. The cards are turned over when the minister is out of favour.'], ['painting', 6, 0, 5, 'A map of Sund, the whole chain from Kingsfjord down to Halvermouth, with the Hald Reach pencilled over in blue.'], ['chair', 3, 5], ['chair', 13, 5], ['plant', 1, 8], ['plant', 14, 8]] },
  { key: 'staff', x: 18, zone: 'appointment', name: 'The Staff Offices', w: 19, h: 11, floor: 'c', note: 'Speechwriters, analysts and a printer that is always out of paper.',
    props: [['desk', 2, 2, 4, 'Speechwriters\' desks: drafts with the adjectives crossed out.'], ['desk', 8, 2, 4, 'Analysts\' desks: three spreadsheets and a rubber duck.'], ['desk', 14, 2, 4, 'The communications desk: a mock-up of a poster that says "STEADY".'], ['shelf', 1, 7, 3], ['crate', 16, 8], ['plant', 17, 8]] },
  { key: 'security', x: 22, zone: 'restricted', name: 'Security Control', w: 11, h: 9, floor: 't', note: 'Cameras, a radio rack and a chair that has been sat in for nineteen years.',
    props: [['monitor_wall', 1, 0, 9, 'A wall of cameras: every door, every corridor, the Square, the Gate. In one, a pigeon is asleep on the barrier.'], ['desk', 3, 3, 5, 'The control desk: a radio, a logbook and a sticker: "IF YOU SEE SOMETHING, YOU ARE ON CAMERA".'], ['chair', 5, 4], ['cabinet', 9, 5]] },
  { key: 'president', x: 26, zone: 'restricted', name: 'The President\'s Office', w: 21, h: 13, floor: 'c', note: 'A desk, a map table and a private door. Whoever holds this room is the one the country argues about.',
    props: [['desk', 7, 3, 7, 'The President\'s desk: a blotter, a seal and a drawer that sticks.'], ['chair', 10, 4], ['table', 3, 7, 5, 'The map table: Sund laid out with coloured pins for every embassy, every embargo and every war.'], ['painting', 5, 0, 5, 'The President\'s portrait gallery of predecessors. The last two frames are empty, pending the vote.'], ['painting', 14, 0, 4, 'A framed photograph of the King at seven, saluting a fish.'], ['flagpole', 18, 2], ['plant', 1, 3], ['plant', 19, 9], ['rug', 6, 6, 9, 'A crimson rug the size of a small garden.']] },
  { key: 'negotiation_a', x: 30, zone: 'restricted', name: 'Private Negotiation Room A', w: 11, h: 9, floor: 'c', note: 'Two chairs, one table, no windows. For ambassadors.',
    props: [['table', 3, 3, 5, 'A table and two chairs, exactly opposite each other. The legs are bolted down so no one can move closer.'], ['chair', 2, 3], ['chair', 8, 3], ['plant', 9, 1]] },
  { key: 'negotiation_b', x: 34, zone: 'restricted', name: 'Private Negotiation Room B', w: 11, h: 9, floor: 'c', note: 'The same room, with a better chair for whoever is losing.',
    props: [['table', 3, 3, 5, 'A table, two chairs, and a cupboard holding a very good bottle of something for whoever agrees.'], ['chair', 2, 3], ['chair', 8, 3], ['cabinet', 9, 1]] },
  { key: 'records', x: 37, zone: 'public', name: 'The Public Records Hall', w: 15, h: 11, floor: 't', note: 'Laws, budgets and the poll archive, on shelves anyone may read in office hours.',
    props: [['shelf', 1, 1, 5, 'The laws of Sund, bound by year. The thinnest volume is the year nothing was passed.'], ['shelf', 8, 1, 5, 'Budgets: every one balanced on paper, and several in fact.'], ['desk', 5, 5, 4, 'The records clerk\'s desk: a stamp, a bell and a sign: "ASK. IT IS IN HERE SOMEWHERE."'], ['terminal', 11, 5, 1, 'The poll archive terminal. The Politics page on your tablet reads the same record.', { interact: { kind: 'bank', tab: 'Politics' } }], ['bench', 2, 8, 4], ['plant', 13, 8]] },
];

const prop = (roomKey, i, [type, x, y, w, examine, extra]) => ({ id: `hh_${roomKey}_${i}`, type, x, y, ...(w > 1 ? { w } : {}), ...(examine ? { examine } : {}), ...(extra || {}) });

function sideRoom(r) {
  const cx = Math.floor(r.w / 2);
  return {
    id: `halver_${r.key}`, name: `Halver House — ${r.name}`, kind: 'interior', music: 'mus_civic', ambience: 'amb_indoor', wallStyle: 'grand', floorStyle: { t: 4 },
    tiles: roomTiles(r.w, r.h, r.floor, cx),
    doors: [{ id: `door_halver_${r.key}_exit`, x: cx, y: r.h - 1, to: { map: 'halver_house', spot: `d_${r.key}` } }],
    spots: { entry: { x: cx, y: r.h - 2, facing: 'up' } },
    keepClear: [[cx, r.h - 2]],
    zone: r.zone,
    props: [
      { id: `hh_${r.key}_note`, type: 'sign', x: r.w - 2, y: 1, examine: r.note },
      ...r.props.map((p, i) => prop(r.key, i, p)),
    ],
  };
}

/** The main hall: the lobby with its reception, visitors' book and security screening; the ten doors along the north wall. */
export const halverHouse = {
  id: 'halver_house', name: 'Halver House — the Grand Lobby', kind: 'interior', music: 'mus_civic', ambience: 'amb_indoor', wallStyle: 'grand', floorStyle: { t: 4 },
  tiles: roomTiles(W, H, 't', DX, [...ROOMS.map((r) => [r.x, 0, 1, 1, 'D']), [DX - 2, 2, 5, H - 4, 'c']]),
  doors: [
    { id: 'door_halver_exit', x: DX, y: H - 1, to: { map: 'crown_quarter', spot: 'cq_halver_house_out' } },
    ...ROOMS.map((r) => ({ id: `door_halver_${r.key}`, x: r.x, y: 0, label: `${r.name} (${r.zone === 'public' ? 'public' : r.zone === 'appointment' ? 'by appointment' : 'restricted'})`, to: { map: `halver_${r.key}`, spot: 'entry' }, lock: { ...ZONES[r.zone], owners: HOUSE_OWNERS } })),
  ],
  spots: {
    entry: { x: DX, y: H - 2, facing: 'up' },
    reception: { x: DX, y: 20, facing: 'up' },
    screening: { x: DX - 6, y: H - 4, facing: 'right' },
    visitors_book: { x: DX + 5, y: 20, facing: 'left' },
    ...Object.fromEntries(ROOMS.map((r) => [`d_${r.key}`, { x: r.x, y: 1, facing: 'down' }])),
  },
  keepClear: [[DX, H - 2], ...ROOMS.map((r) => [r.x, 1])],
  props: [
    { id: 'hh_reception', type: 'desk', x: DX - 3, y: 18, w: 7, color: '#4a3a2e', examine: 'The reception desk: a bell, a visitors\' book, a lamp with a green shade and a receptionist\'s coffee that has gone cold on principle.' },
    { id: 'hh_book', type: 'noticeboard', x: DX + 4, y: 20, examine: 'THE VISITORS\' BOOK. Every visitor signs. The last page says "A. NONYMOUS (HE WAS NOT)". Under it: "WELCOME TO HALVER HOUSE — PUBLIC HOURS 08:00–18:00".' },
    { id: 'hh_info', type: 'display', x: DX - 8, y: 20, w: 3, examine: 'The information desk: a map of the building (with the president\'s office marked "NO"), pamphlets on how the Assembly works and a rack of postcards of the King at seven.' },
    { id: 'hh_arch_l', type: 'gatepost', x: DX - 3, y: H - 6, examine: 'The security arch: a metal frame with a red light that is always, fractionally, about to be amber. Guards will stand here when the staff arrive.' },
    { id: 'hh_arch_r', type: 'gatepost', x: DX + 3, y: H - 6, examine: 'The other side of the security arch. Bags go on the table to the left; opinions go through free.' },
    { id: 'hh_bags', type: 'table', x: DX - 8, y: H - 6, w: 3, examine: 'The bag-check table: a tray, a tray and a third tray. A sign: "PLEASE DO NOT PLACE THE KING\'S PORTRAIT ON THE BELT".' },
    { id: 'hh_rope_l', type: 'velvet_rope', x: DX - 3, y: 12, w: 2, examine: 'A velvet rope along the carpet: the visitors\' way. Beyond it, the doors to the rooms.' },
    { id: 'hh_rope_r', type: 'velvet_rope', x: DX + 2, y: 12, w: 2, examine: 'A velvet rope along the carpet.' },
    { id: 'hh_king', type: 'painting', x: DX - 6, y: 0, w: 4, examine: 'A portrait of the King of Sund, aged eleven, on a very large chair. His feet do not reach the floor. He has been asked to look dignified and has settled on "worried".' },
    { id: 'hh_crest', type: 'painting', x: DX + 2, y: 0, w: 4, examine: 'The crest of Sund: a fish, a crown and a very small motto: "WE WILL SEE".' },
    { id: 'hh_col_1', type: 'column', x: 6, y: 8 }, { id: 'hh_col_2', type: 'column', x: 12, y: 8 }, { id: 'hh_col_3', type: 'column', x: 27, y: 8 }, { id: 'hh_col_4', type: 'column', x: 33, y: 8 },
    { id: 'hh_col_5', type: 'column', x: 6, y: 20 }, { id: 'hh_col_6', type: 'column', x: 33, y: 20 },
    { id: 'hh_bench_1', type: 'bench', x: 3, y: 15, w: 4 }, { id: 'hh_bench_2', type: 'bench', x: 31, y: 15, w: 4 }, { id: 'hh_bench_3', type: 'bench', x: 3, y: 26, w: 4 }, { id: 'hh_bench_4', type: 'bench', x: 33, y: 26, w: 4 },
    { id: 'hh_flag_l', type: 'flagpole', x: 2, y: 20 }, { id: 'hh_flag_r', type: 'flagpole', x: 37, y: 20 },
    { id: 'hh_plant_1', type: 'plant', x: 1, y: H - 2 }, { id: 'hh_plant_2', type: 'plant', x: W - 2, y: H - 2 },
    { id: 'hh_politics', type: 'terminal', x: 33, y: 11, interact: { kind: 'bank', tab: 'Politics' }, examine: 'A public terminal by the records hall: who governs, the term and where the parties differ. The same page your tablet shows.' },
    { id: 'hh_zones', type: 'noticeboard', x: 8, y: 11, examine: 'HALVER HOUSE. PUBLIC (green): the press room and the records hall, 08:00–18:00. BY APPOINTMENT (amber): waiting gallery, chief of staff, cabinet room, staff offices. RESTRICTED (red): the President\'s office, negotiation rooms A and B, security control. Doors are locked as shown.' },
  ],
};

export default [halverHouse, ...ROOMS.map(sideRoom)];
