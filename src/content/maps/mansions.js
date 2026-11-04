// Ironcrest Hall and Willowmere (v0.94.1): each mansion's main hall is laid over its building's footprint (so the grounds do not move); rooms open off
// its north wall, each its own small map, in three zones:
//   VISITOR   the hall itself and (at Willowmere) the open study: open once the house has invited you (the estate's `_invited` flag), 09:00–21:00.
//   PRIVATE   the quarters, the study, the war room: the leader, the household, and those the leader trusts (the `_trusted` flag, later releases).
//   STAFF     the kitchen, the security room: the household only.
// Josiah Vegas sleeps in Ironcrest's private quarters and Susan in Willowmere's: they are their homes.
import { roomTiles } from '../../world/mapBuilder.js';
import { ESTATE_DEFS, ESTATE_OWNERS } from '../estates.js';

export const IRONCREST = { w: 36, h: 24, dx: 17, steward: { x: 20, y: 20, facing: 'right' } };
export const WILLOWMERE = { w: 34, h: 22, dx: 17, steward: { x: 19, y: 18, facing: 'right' } };

const HOURS = { from: '09:00', to: '21:00' };
const lockOf = (estate, zone) => {
  const E = ESTATE_DEFS[estate]; const owners = ESTATE_OWNERS[estate];
  if (zone === 'visitor') return { key: 'item_none', owners, flag: E.flag, hours: HOURS, flagMessage: `${E.name} receives callers by invitation. The steward keeps the book.` };
  if (zone === 'private') return { key: 'item_none', owners, flag: E.trusted, message: 'PRIVATE. The family\'s rooms. A closed door, a good lock and a very polite silence.' };
  return { key: 'item_none', owners, message: 'STAFF ONLY. The household\'s own.' };
};

// [key, door x, zone, name, w, h, floor, note, props]  — props: [type, x, y, w, examine, extra]
const IRON_ROOMS = [
  ['quarters', 3, 'private', 'Private quarters', 15, 10, 'c', 'A bed made with a ruler, a wardrobe of identical suits and a window that looks at the gate.', [['bed', 2, 1, 1, 'A bed made so tightly a coin would bounce. The pillow has been struck level.', { color: '#1e2a44' }], ['wardrobe', 5, 1, 1, 'Eleven dark suits, one light one, kept "for emergencies of a social kind".'], ['desk', 9, 1, 3, 'A bedside desk: a lamp, a pen and tomorrow\'s speech, face down.'], ['chair', 10, 2, 1], ['painting', 6, 0, 3, 'A framed photograph of Vegas as a young officer, saluting a sandbag.'], ['rug', 3, 5, 6, 'A plain grey rug, dead centre.'], ['plant', 13, 7]]],
  ['study', 8, 'private', 'The study', 13, 10, 'c', 'Books on law, strategy and one on gardening, never opened. A desk with nothing out of place.', [['desk', 3, 2, 5, 'The leader\'s desk: a blotter, a seal, a single pen. A drawer that is not locked, because nobody would dare.'], ['chair', 5, 3, 1], ['shelf', 1, 1, 3, 'Bound laws of Sund, with the amendments tabbed in red.'], ['shelf', 9, 1, 3, 'Military histories. Several are about winning by waiting. He does not seem to have noticed.'], ['painting', 5, 0, 3, 'A map of Sund, the whole chain, with the capital circled twice.'], ['plant', 11, 7]]],
  ['war', 13, 'private', 'The war room', 17, 11, 't', 'A big table, a bigger map and a polling wall. Here the party fights the next election and, in rehearsal, every other kind.', [['table', 4, 3, 9, 'The war-room table: Sund\'s nine states in coloured pins, a pile of poll sheets, a compass nobody needs.'], ['monitor_wall', 3, 0, 11, 'The polling wall: the latest polls by state. The Order line is red; whoever is behind stands furthest from it.', { interact: { kind: 'bank', tab: 'Politics' } }], ['chair', 3, 6, 1], ['chair', 13, 6, 1], ['cabinet', 15, 1, 1, 'A locked cabinet of "contingencies". The key is on Blackwood\'s ring, and Blackwood has never used it.'], ['plant', 1, 8]]],
  ['security', 26, 'staff', 'Security room', 11, 9, 't', 'Cameras on the gate, the wall, the road and the armoury. Dagger has a chair here that has never been sat in by anyone else.', [['monitor_wall', 1, 0, 9, 'Every camera on the estate: the gate, the road, the wall and the range. In one, a hare is sitting on the lawn, unchallenged.'], ['desk', 3, 3, 5, 'The control desk: a radio, a rota and a sticker that says WE SEE YOU, in a tone that suggests apology.'], ['chair', 5, 4, 1], ['cabinet', 9, 5]]],
  ['staff', 31, 'staff', 'Kitchen and staff room', 16, 10, 't', 'A scrubbed table, a range that is never allowed to go out, and a roster on the wall in four colours.', [['stove', 2, 1, 2, 'Agatha Alder\'s range. It has fed a household, a war room and a firing squad of sandwiches.'], ['table', 5, 4, 6, 'A long scrubbed table; places laid for the household. Nobody sits in Dagger\'s place.'], ['cabinet', 12, 1, 1, 'A larder, orderly to the point of menace.'], ['shelf', 1, 6, 3, 'Preserves in jars, labelled by year and temper.'], ['plant', 14, 7]]],
];
const WILLOW_ROOMS = [
  ['quarters', 3, 'private', 'Private quarters', 15, 10, 'c', 'A bed that is never quite made, a window onto the lake and a chair with three newspapers on it.', [['bed', 2, 1, 1, 'A bed with the covers thrown back and a speech under the pillow.', { color: '#2a6a5a' }], ['wardrobe', 5, 1, 1, 'Coats in every colour but grey. A scarf hangs on every hook, and none on its own.'], ['desk', 9, 1, 3, 'A bedside desk with a lamp, a pen without a lid and a phone off the hook.'], ['chair', 10, 2, 1], ['painting', 6, 0, 3, 'A watercolour of the lake at dawn, signed "S." in a hurry.'], ['rug', 3, 5, 6, 'A hand-woven rug in nine colours that do not go together and somehow do.'], ['plant', 13, 7]]],
  ['study', 8, 'visitor', 'The open study', 15, 10, 'f', 'A big desk, a bigger window, a door that is never closed. Susan holds her surgeries here; the sign on the door says "PLEASE KNOCK. THEN COME IN."', [['desk', 4, 2, 5, 'Susan\'s desk: seven open files, a half-eaten apple and a speech marked "FINAL (5)". A mug: WORLD\'S MOST OVERCOMMITTED.'], ['chair', 6, 3, 1], ['chair', 5, 5, 1], ['chair', 8, 5, 1], ['shelf', 1, 1, 3, 'Constitutions, two books on gardening, and a paperback with its cover torn off: "research".'], ['painting', 6, 0, 4, 'A map of every church hall in Sund where Liberty has ever held a meeting. There are a great many.'], ['plant', 13, 7]]],
  ['security', 27, 'staff', 'Discreet security', 11, 9, 't', 'The cameras are in the reeds, the trellis and the weathervane. Nobody can see them, which is the whole idea.', [['monitor_wall', 1, 0, 9, 'A wall of cameras you cannot see in the garden: the gate, the lake, the lane. One shows a heron looking back at it.'], ['desk', 3, 3, 5, 'A control desk with a rota and a bicycle bell, which is the alarm.'], ['chair', 5, 4, 1]]],
  ['staff', 31, 'staff', 'Kitchen and staff room', 16, 10, 't', 'A kitchen that cooks for twelve and is asked to feed forty. A roster on the wall in three colours and a hopeful biscuit tin.', [['stove', 2, 1, 2, 'Mirabel Thorne\'s range. The soup has learned to stretch.'], ['table', 5, 4, 6, 'A long table with a place laid for the household and, always, a spare for whoever turns up.'], ['cabinet', 12, 1, 1, 'A larder of jars, each labelled in a cheerful hand.'], ['plant', 14, 7]]],
];

function side(estate, [key, x, zone, name, w, h, floor, note, props]) {
  const cx = Math.floor(w / 2);
  const id = `${estate}_${key}`;
  const E = ESTATE_DEFS[estate];
  const out = {
    id, name: `${E.name} — ${name}`, kind: 'interior', music: 'mus_civic', ambience: 'amb_indoor', wallStyle: 'grand', floorStyle: { t: 4 },
    tiles: roomTiles(w, h, floor, cx),
    doors: [{ id: `door_${id}_exit`, x: cx, y: h - 1, to: { map: `${estate}_hall`, spot: `d_${key}` } }],
    spots: { entry: { x: cx, y: h - 2, facing: 'up' } }, keepClear: [[cx, h - 2]], zone,
    props: [{ id: `${id}_note`, type: 'sign', x: w - 2, y: 1, examine: note }, ...props.map(([type, px, py, pw, examine, extra], i) => ({ id: `${id}_${i}`, type, x: px, y: py, ...(pw > 1 ? { w: pw } : {}), ...(examine ? { examine } : {}), ...(extra || {}) }))],
  };
  if (key === 'quarters') Object.assign(out.spots, { bed: { x: 3, y: 1, facing: 'down' }, chair: { x: 10, y: 3, facing: 'left' } });
  if (key === 'staff') out.spots.entry = { x: cx, y: h - 2, facing: 'up' };
  return out;
}

function hall(estate, D, rooms, hallProps, spots) {
  const E = ESTATE_DEFS[estate];
  const { w: W, h: H, dx: DX } = D;
  return {
    id: `${estate}_hall`, name: `${E.name} — the great hall`, kind: 'interior', music: 'mus_manor', ambience: 'amb_indoor', wallStyle: 'grand', floorStyle: { t: 4 }, owner: E.leader,
    tiles: roomTiles(W, H, 't', DX, [...rooms.map((r) => [r[1], 0, 1, 1, 'D']), [DX - 2, 2, 5, H - 4, 'c']]),
    doors: [
      { id: `door_${estate}_exit`, x: DX, y: H - 1, to: { map: `${estate}_grounds`, spot: `${estate}_hall_out` } },
      ...rooms.map((r) => ({ id: `door_${estate}_${r[0]}`, x: r[1], y: 0, label: `${r[3]} (${r[2] === 'visitor' ? 'visitors, by invitation' : r[2] === 'private' ? 'private' : 'staff only'})`, to: { map: `${estate}_${r[0]}`, spot: 'entry' }, lock: lockOf(estate, r[2]) })),
    ],
    spots: { entry: { x: DX, y: H - 2, facing: 'up' }, steward: D.steward, ...spots, ...Object.fromEntries(rooms.map((r) => [`d_${r[0]}`, { x: r[1], y: 1, facing: 'down' }])) },
    keepClear: [[DX, H - 2], ...rooms.map((r) => [r[1], 1])],
    props: hallProps,
  };
}

const ironProps = [
  { id: 'ic_hearth', type: 'stove', x: 28, y: 12, w: 2, examine: 'A stone hearth you could roast a sentry in. A fire is laid and has been since the day it was built; it is lit only for visitors who are known.' },
  { id: 'ic_table', type: 'table', x: 6, y: 13, w: 9, color: '#2a1a14', examine: 'A dining table for twenty: iron-grey cloth, plain silver and a place card for each guest in the same hand. Nobody sits in the wrong place twice.' },
  ...[6, 8, 10, 12, 14].flatMap((x, i) => [{ id: `ic_chair_a${i}`, type: 'chair', x, y: 12 }, { id: `ic_chair_b${i}`, type: 'chair', x, y: 14 }]),
  { id: 'ic_trophy', type: 'display', x: 4, y: 20, w: 6, examine: 'A trophy gallery: marksmanship cups, a ceremonial sword, and a framed letter of thanks from a grateful fire brigade. Under it, in pencil: "(NOT FOR THE FIRE)".' },
  { id: 'ic_trophy2', type: 'display', x: 24, y: 20, w: 6, examine: 'More cups. The engraved dates stop in the same year, the year Vegas was first elected, and the cups after it are all for the party.' },
  { id: 'ic_portrait', type: 'painting', x: 14, y: 0, w: 5, examine: 'A portrait of Josiah Vegas in dress uniform, looking at the viewer as though checking their papers.' },
  { id: 'ic_crest', type: 'painting', x: 22, y: 0, w: 4, examine: 'The crest of the Order Party: a closed gate on a field of grey. The motto is one word, "ORDER", and under it, smaller, "(PLEASE)".' },
  { id: 'ic_flag1', type: 'flagpole', x: 2, y: 3, color: '#8a2a30' }, { id: 'ic_flag2', type: 'flagpole', x: 33, y: 3, color: '#8a2a30' },
  { id: 'ic_col1', type: 'column', x: 8, y: 8 }, { id: 'ic_col2', type: 'column', x: 26, y: 8 }, { id: 'ic_col3', type: 'column', x: 8, y: 18 }, { id: 'ic_col4', type: 'column', x: 26, y: 18 },
  { id: 'ic_book', type: 'noticeboard', x: 21, y: 21, examine: 'THE BOOK OF CALLERS. Every visitor is entered, with the hour, the purpose and the hour they left. The last page is blank. Mr Blackwood prefers it that way.' },
  { id: 'ic_steward', type: 'desk', x: 21, y: 20, w: 2, color: '#2a1a14', examine: 'The steward\'s desk: the diary, the keys and a bell that is never rung because Blackwood is already there.' },
  { id: 'ic_plant1', type: 'plant', x: 1, y: 22 }, { id: 'ic_plant2', type: 'plant', x: 34, y: 22 },
  { id: 'ic_politics', type: 'terminal', x: 30, y: 4, interact: { kind: 'bank', tab: 'Politics' }, examine: 'A terminal in the hall: who governs, the books, the latest polls. The same page your tablet shows.' },
];
const willowProps = [
  { id: 'wm_shelf1', type: 'shelf', x: 2, y: 5, w: 8, examine: 'The long library: eight metres of books, none shelved in any order the household can explain. "It is by when I read them," says Susan.' },
  { id: 'wm_shelf2', type: 'shelf', x: 24, y: 5, w: 8, examine: 'More of the long library, with a ladder, a cat and a note: "PLEASE RETURN BOOKS TO WHERE THEY WERE. (NOBODY KNOWS.)"' },
  { id: 'wm_table', type: 'table', x: 6, y: 11, w: 8, color: '#8a6a4a', examine: 'A long oak table with no cloth and thirty mismatched chairs, set for however many come.' },
  ...[6, 8, 10, 12].flatMap((x, i) => [{ id: `wm_chair_a${i}`, type: 'chair', x, y: 10 }, { id: `wm_chair_b${i}`, type: 'chair', x, y: 12 }]),
  { id: 'wm_piano', type: 'piano', x: 26, y: 12, examine: 'A grand piano with a speech on the music stand. Susan plays it badly and with great confidence.' },
  { id: 'wm_window1', type: 'window', x: 4, y: 0 }, { id: 'wm_window2', type: 'window', x: 29, y: 0 },
  { id: 'wm_portrait', type: 'painting', x: 13, y: 0, w: 5, examine: 'A portrait of Susan at her desk, laughing at something out of frame. The painter has noted: "(SITTER MOVED THROUGHOUT)".' },
  { id: 'wm_crest', type: 'painting', x: 21, y: 0, w: 4, examine: 'The Liberty League\'s crest: an open door on a field of blue. The motto is "LIBERTY", and below it, hand-lettered, "(KNOCK)".' },
  { id: 'wm_flag1', type: 'flagpole', x: 2, y: 3, color: '#2a5a9a' }, { id: 'wm_flag2', type: 'flagpole', x: 31, y: 3, color: '#2a5a9a' },
  { id: 'wm_book', type: 'noticeboard', x: 21, y: 19, examine: 'THE VISITORS\' BOOK. Everyone signs; Susan reads every name and writes back on a postcard. Some are still waiting for a reply.' },
  { id: 'wm_steward', type: 'desk', x: 20, y: 18, w: 2, color: '#8a6a4a', examine: 'The steward\'s desk: a diary, a ring of keys, a tin of biscuits and a note: "TELL HER SHE HAS A MEETING".' },
  { id: 'wm_plant1', type: 'plant', x: 1, y: 20 }, { id: 'wm_plant2', type: 'plant', x: 32, y: 20 }, { id: 'wm_plant3', type: 'plant', x: 15, y: 20 },
  { id: 'wm_politics', type: 'terminal', x: 27, y: 4, interact: { kind: 'bank', tab: 'Politics' }, examine: 'A terminal in the long library: who governs, the books, the latest polls. The same page your tablet shows.' },
];

export default [
  hall('ironcrest', IRONCREST, IRON_ROOMS, ironProps, { fireside: { x: 27, y: 14, facing: 'right' } }),
  ...IRON_ROOMS.map((r) => side('ironcrest', r)),
  hall('willowmere', WILLOWMERE, WILLOW_ROOMS, willowProps, { window: { x: 4, y: 3, facing: 'down' } }),
  ...WILLOW_ROOMS.map((r) => side('willowmere', r)),
];
