// Starling Flats (v0.55.0) — the high plain east of the Ober Fields, through the
// Escarpment Cut at Wellhead Circle. Its own region (loaded through the Cut,
// like the city through its gates).
//
//   Mesa Road (y 14–17) runs east from the Cut along the top of the map;
//   north of it, Starling: Derrick Row (the Ober's Oil crew's houses, a short
//   walk from the refinery), the Park people's houses, the Contrail Café;
//   Campus Drive (x 26–29) runs south past the security gate to Range Road
//   (y 108–111) along the bottom.
//   The Park: the freight depot, Roost Aeroworks (Billie's office and hangar,
//   its apron), Meridian Aerospace (the HQ tower, the final assembly hall,
//   the flight-line hall, space systems, the engine test stand, the paint
//   shop, its apron); the taxiway and runway 09/27 across the middle; the
//   flight-operations building and control tower south of it; the launch
//   complex (vertical integration building, pad, service tower, propellant
//   farm) behind its fence in the south-east, launch control outside it; the
//   old boneyard in the south-west.
//
// Coordinates are final (roads already 4 wide). Preview: `npm run map -- starling_flats`.
import { MapBuilder, roomTiles } from '../../world/mapBuilder.js';
import { PRODUCTS, HALLS } from '../aerospace.js';

const W = 180;
const H = 120;
const m = new MapBuilder(W, H, '.');

// ---------------------------------------------------------------- the lie of the land: scrub, dirt and dry grass
for (let k = 0; k < 70; k++) {
  const x = (k * 37) % (W - 8);
  const y = 20 + ((k * 53) % (H - 30));
  m.rect(x, y, 2 + (k % 3), 1 + (k % 2), ':');
}
// ---------------------------------------------------------------- pavements, then roads over them
m.rect(0, 13, 150, 1, ',').rect(0, 18, 150, 1, ','); // Mesa Road
m.rect(25, 18, 1, 90, ',').rect(30, 18, 1, 90, ','); // Campus Drive
m.rect(25, 107, 152, 1, ',').rect(25, 112, 152, 1, ','); // Range Road
m.rect(0, 14, 150, 4, '='); // Mesa Road
m.rect(26, 18, 4, 94, '='); // Campus Drive
m.rect(26, 108, 151, 4, '='); // Range Road
// ---------------------------------------------------------------- the airfield (tarmac 'a'; markings come from `airfield`)
const airfield = {
  runways: [{ id: '09/27', x: 34, y: 66, w: 139, h: 6, ends: ['09', '27'] }],
  taxiways: [{ x: 34, y: 60, w: 135, h: 4 }, { x: 44, y: 54, w: 4, h: 6 }, { x: 166, y: 60, w: 3, h: 6 }, { x: 34, y: 60, w: 3, h: 6 }],
  aprons: [{ id: 'roost_apron', company: 'roost', x: 32, y: 42, w: 22, h: 12, slots: [[34, 44], [41, 44], [48, 44]] }, { id: 'meridian_apron', company: 'meridian', x: 62, y: 50, w: 90, h: 10, slots: [[64, 51], [75, 51], [86, 51], [97, 51], [108, 51], [119, 51], [130, 51], [141, 51]] }],
  hold: [[36, 64], [164, 64]],
};
for (const r of [...airfield.runways, ...airfield.taxiways, ...airfield.aprons]) m.rect(r.x, r.y, r.w, r.h, 'a');
// ---------------------------------------------------------------- yards, pads and paths
m.rect(2, 29, 22, 8, 'g'); // the freight depot's truck yard
m.rect(24, 31, 2, 4, 'g'); // ...and its way onto Campus Drive
m.rect(31, 27, 7, 1, ','); // the walk from the drive to the Roost office
m.rect(58, 19, 3, 16, 'g'); // Meridian Way, down from Mesa Road
m.rect(58, 33, 94, 2, 'g'); // the service road in front of Meridian's halls
m.rect(150, 35, 2, 15, 'g'); // ...round the east end to
m.rect(62, 48, 90, 2, 'g'); // the apron road
m.rect(72, 28, 1, 5, ',').rect(135, 31, 1, 2, ',').rect(142, 43, 1, 5, ','); // walks from the HQ, flight-line and paint-shop doors
m.rect(150, 80, 14, 14, 'g'); // the launch pad's hard standing
m.rect(162, 94, 13, 12, 'g'); // pad 2's hard standing (the Roost site)
m.rect(136, 80, 14, 16, 'g'); // the propellant farm and the crawlerway
m.rect(124, 96, 20, 2, 'g'); // from the integration building to
m.rect(140, 96, 4, 11, 'g'); // the pad road, down to the launch-complex gate
m.rect(100, 104, 4, 3, ','); // launch control's walk
m.rect(40, 83, 2, 24, 'g').rect(42, 83, 9, 1, ','); // flight operations' road down to Range Road, and its walk
m.rect(4, 82, 22, 18, ':'); // the boneyard's packed dirt
// a paved walk from each house down to the Mesa Road pavement
const HOUSE_X = [4, 15, 26, 37, 48, 59, 70, 81, 92, 103, 114];
for (const x of HOUSE_X) m.rect(x + 4, 12, 1, 1, ',');
m.rect(135, 12, 1, 1, ','); // the café's step

// ---------------------------------------------------------------- buildings
const B = (id, name, x, y, w, h, o = {}) => ({
  id, name, mapLabel: o.label ?? name, x, y, w, h,
  roof: o.roof || '#6a6e76', wall: o.wall || '#d8dce0', trim: o.trim || '#3a3e46', sign: o.sign, signColor: o.signColor, flatRoof: o.flatRoof ?? true, awning: o.awning, columns: o.columns, tower: o.tower, glass: o.glass,
  door: o.door, hall: o.hall,
});
const staff = (owners, hours = { from: '06:00', to: '21:00' }, message, aeroHall) => ({ key: 'item_none', owners, hours, ...(message ? { message } : {}), ...(aeroHall ? { aeroHall } : {}) });
const MERIDIAN_STAFF = ['npc_imogen', 'npc_ailie', 'npc_rudy', 'npc_tina'];
const ROOST_STAFF = ['npc_billie', 'npc_wrenna'];
const houseColours = [['#6a4a3a', '#efe6d4'], ['#3a4a6a', '#e6dcc8'], ['#5a6a3a', '#f2e8d8'], ['#7a3a2a', '#e8dcc4'], ['#4a5a5a', '#efe6d6'], ['#5a3a5a', '#ece4d8'], ['#3a5a4a', '#e8e0cc'], ['#6a5a3a', '#f2e8d8'], ['#2a4a6a', '#e8e4dc'], ['#7a5a2a', '#f0e6d2'], ['#4a3a2a', '#e6dcc8']];
const buildings = [
  // Starling: eleven houses on the north side of Mesa Road (front doors come from src/content/homes.js)
  ...HOUSE_X.map((x, i) => B(`sf_house_${i + 1}`, 'House', x, 5, 9, 7, { roof: houseColours[i][0], wall: houseColours[i][1], trim: '#4a3a2a', flatRoof: false, label: '' })),
  B('sf_cafe', 'Contrail Café', 128, 3, 14, 9, { roof: '#c8402a', wall: '#f2ead8', sign: 'CONTRAIL CAFÉ', awning: '#e8c04a', flatRoof: false, door: { x: 135, y: 11, lock: staff(['npc_billie', 'npc_wrenna', ...MERIDIAN_STAFF], { from: '06:00', to: '22:00' }, 'CONTRAIL CAFÉ — "Open 06:00 to 22:00. Self-service. Pay the jar."') } }),
  // the Park
  B('sf_freight', 'Starling Freight Receiving', 4, 20, 18, 9, { roof: '#5a5f66', wall: '#b9b4aa', sign: 'FREIGHT RECEIVING', door: { x: 13, y: 28, lock: staff([...ROOST_STAFF, ...MERIDIAN_STAFF], { from: '06:00', to: '20:00' }, 'STARLING FREIGHT RECEIVING. "Deliveries 06:00–20:00. All consignments signed for, counted and inspected."') } }),
  B('sf_roost_office', 'Roost Aeroworks — Office', 33, 20, 9, 7, { roof: '#7a5a2a', wall: '#e8dcc4', trim: '#5a3a1e', sign: 'ROOST AEROWORKS', signColor: '#c8402a', flatRoof: false, door: { x: 37, y: 26, to: { map: 'roost_office', spot: 'entry' }, lock: staff(ROOST_STAFF, { from: '07:00', to: '19:00' }) } }),
  B('sf_roost_hangar', 'Roost Aeroworks — Hangar 1', 33, 29, 18, 12, { roof: '#8a7a5a', wall: '#c8bca4', trim: '#5a4a32', sign: 'ROOST · HANGAR 1', signColor: '#c8402a', door: { x: 42, y: 40, to: { map: 'roost_hangar', spot: 'entry' }, lock: staff(ROOST_STAFF, { from: '06:00', to: '20:00' }) } }),
  B('sf_meridian_hq', 'Meridian Aerospace — Headquarters', 64, 19, 16, 9, { roof: '#2e3a4e', wall: '#2e3a4e', trim: '#1a2230', sign: 'MERIDIAN AEROSPACE', signColor: '#c8a040', tower: 9, glass: '#7aa8d0', door: { x: 72, y: 27, to: { map: 'meridian_lobby', spot: 'entry' }, lock: staff(MERIDIAN_STAFF, { from: '07:00', to: '19:00' }, 'MERIDIAN AEROSPACE CORPORATION — "Reception open 07:00–19:00. Visitors please sign in."') } }),
  B('sf_meridian_assembly', 'Meridian — Final Assembly Hall', 84, 15 + 4, 36, 14, { roof: '#9aa0a8', wall: '#d8dce2', trim: '#2e3a4e', sign: 'MERIDIAN · FINAL ASSEMBLY', signColor: '#2e3a4e', door: { x: 102, y: 32, to: { map: 'meridian_assembly', spot: 'entry' }, lock: staff(MERIDIAN_STAFF, { from: '06:00', to: '22:00' }, 'MERIDIAN FINAL ASSEMBLY. "Authorised personnel only. Hard hats beyond this point."') } }),
  B('sf_meridian_flightline', 'Meridian — Flight-Line Hall', 122, 19, 26, 12, { roof: '#9aa0a8', wall: '#d8dce2', trim: '#2e3a4e', sign: 'MERIDIAN · FLIGHT LINE', signColor: '#2e3a4e', door: { x: 135, y: 30, to: { map: 'meridian_flightline', spot: 'entry' }, lock: staff(MERIDIAN_STAFF, { from: '06:00', to: '22:00' }, 'MERIDIAN FLIGHT-LINE HALL. "Light aircraft · secure integration. Escort required."') } }),
  B('sf_meridian_space', 'Meridian — Space Systems', 84, 35, 30, 12, { roof: '#8a929c', wall: '#e8ecf0', trim: '#2e3a4e', sign: 'MERIDIAN SPACE SYSTEMS', signColor: '#2e3a4e', door: { x: 99, y: 46, to: { map: 'meridian_space', spot: 'entry' }, lock: staff(MERIDIAN_STAFF, { from: '06:00', to: '22:00' }, 'MERIDIAN SPACE SYSTEMS. "Clean rooms beyond. Gowns, gloves, no biscuits."') } }),
  B('sf_meridian_paint', 'Meridian — Paint Shop', 136, 35, 12, 8, { roof: '#6a6e76', wall: '#c8ccd2', sign: 'PAINT', door: { x: 142, y: 42, lock: staff(MERIDIAN_STAFF, { from: '06:00', to: '20:00'}, 'MERIDIAN PAINT SHOP. The smell of solvent and a sign: "DOOR SHUT — BOOTH RUNNING".') } }),
  B('sf_flightops', 'Flight Operations Office', 44, 76, 12, 7, { roof: '#3a4a5a', wall: '#e8ecf0', sign: 'FLIGHT OPS', door: { x: 50, y: 82, lock: staff(['npc_ailie', 'npc_billie'], { from: '06:00', to: '22:00' }, 'STARLING FLIGHT OPERATIONS. "Crews and handling agents only. Weather briefings on the board outside."') } }),
  B('sf_launch_control', 'Launch Control', 96, 96, 12, 8, { roof: '#5a5e62', wall: '#a8aca8', trim: '#3a3e42', sign: 'LAUNCH CONTROL', door: { x: 102, y: 103, to: { map: 'launch_control', spot: 'entry' }, lock: staff(['npc_tina', 'npc_imogen'], { from: '06:00', to: '22:00' }, 'LAUNCH CONTROL. "Range personnel only. If the red light is on, you\'re already too late."') } }),
  // Roost's halls (v0.57.0): plots that become buildings when the player builds them (src/content/aerospace.js HALLS)
  ...Object.entries(HALLS).filter(([, H]) => H.building).map(([key, H]) => B(H.building, `Roost Aeroworks — ${H.name}`, H.at.x, H.at.y, H.w, H.h, {
    roof: key === 'lab' ? '#8a8a9a' : '#8a7a5a', wall: key === 'lab' ? '#d8d8e0' : '#c8bca4', trim: '#5a4a32', sign: H.sign, signColor: '#c8402a', hall: key,
    door: { x: H.at.x + Math.floor(H.w / 2), y: H.at.y + H.h - 1, to: { map: H.room, spot: 'entry' },
      lock: staff(ROOST_STAFF, { from: H.hours[0], to: H.hours[1] }, `ROOST AEROWORKS — ${H.short.toUpperCase()}. "Open ${H.hours[0]}–${H.hours[1]}. Hard hats beyond this point."`, key) } })),
  B('sf_vib', 'Vertical Integration Building', 124, 82, 12, 14, { roof: '#d8dce2', wall: '#e8ecf0', trim: '#2e3a4e', sign: 'MERIDIAN · VIB', signColor: '#2e3a4e', door: { x: 130, y: 95, to: { map: 'meridian_vib', spot: 'entry' }, lock: staff(MERIDIAN_STAFF, { from: '06:00', to: '22:00' }, 'VERTICAL INTEGRATION BUILDING. "Rocket stacking in progress. Look up — but not for long."') } }),
];

// ---------------------------------------------------------------- props
const props = [];
let n = 0;
const P = (type, x, y, o = {}) => props.push({ id: `sf_${type}_${n++}`, type, x, y, ...o });
/** An aircraft on display: its footprint is its span by its length (src/content/aerospace.js looks). */
const AC = (x, y, o) => { const L = PRODUCTS[o.model].look; P('aircraft', x, y, { w: L.span, h: L.len, ...o }); };
// --- the Cut and the way in
P('bigsign', 22, 19, { w: 3, h: 2, text: 'STARLING FLATS', sub: 'AEROSPACE PARK · POP. 214', examine: 'STARLING FLATS — AEROSPACE PARK. "Pop. 214. Altitude: high. Ambition: higher."' });
P('roadsign', 0, 19, { w: 4, h: 2, text: '← OBER FIELDS', sub: 'THE CUT · REFINERY 1 MI', examine: 'WEST — THE CUT · OBER\'S OIL REFINERY · LANTERNSIDE.' });
for (let x = 6; x < 148; x += 10) { P('streetlamp', x, 13); if (x + 5 < 148) P('streetlamp', x + 5, 18); }
for (let y = 22; y < 106; y += 10) { P('streetlamp', 25, y); P('streetlamp', 30, y + 5); }
for (let x = 34; x < 176; x += 12) P('streetlamp', x, 107);
// --- the security gate on Campus Drive
P('booth', 31, 21, { examine: 'The Park\'s security booth. A guard\'s logbook, a radio, and a photograph of every vehicle that has ever annoyed him.' });
P('boom_barrier', 26, 22, { w: 4, h: 1, raised: true, solid: false, examine: 'A red-and-white boom barrier. It lifts for anyone with a pass, a delivery, or a sufficiently confident wave.' });
P('sign', 31, 19, { examine: 'STARLING FLATS AEROSPACE PARK. "All visitors report to the gate. Photography of hangars, rockets and Billie Roost\'s Skylark is permitted. Photography of the secure hall is not."' });
// --- Starling: yards, fences, trees, mailboxes
HOUSE_X.forEach((x, i) => {
  P('mailbox', x + 6, 12);
  P('tree', x + (i % 2 ? 1 : 7), 1);
  P('fence', x, 4, { w: 9, h: 1 });
  if (i % 3 === 0) P('flowerbed', x + 1, 12);
});
P('watertower', 150, 2, { w: 4, h: 5, examine: 'The Starling water tower, painted with a starling in flight and, in smaller letters, "MERIDIAN AEROSPACE · ROOST AEROWORKS · OBER\'S OIL — NEIGHBOURS".' });
P('noticeboard', 126, 12, { examine: 'STARLING NOTICES: "Runway closed Tuesday 02:00–04:00 (Meridian night trials)." · "LOST: one torque wrench, sentimental value, answers to Wrenna." · "Rocket launches: you will be told. You will also hear."' });
P('bench', 124, 12); P('bench', 144, 12); P('busstop', 120, 13, { examine: 'A bus shelter. No bus comes up through the Cut yet; the timetable says "SOON" in Billie\'s handwriting.' });
for (const [x, y] of [[126, 1], [142, 1], [158, 6], [166, 10], [172, 3]]) P('tree', x, y);
// --- the freight depot
P('loadingbay', 5, 29, { w: 3, h: 1, examine: 'Loading dock 1: the trucks back up from the docks at Mill Road, and from the refinery through the Cut.' });
P('loadingbay', 16, 29, { w: 3, h: 1, examine: 'Loading dock 2. A clipboard: every lot counted, weighed and signed for before it goes to stores.' });
P('car', 5, 31, { w: 3, h: 1, color: '#3a5a8a', examine: 'A flatbed with an aluminium consignment from Royal Sund Aluminium, strapped and sheeted.' });
P('car', 12, 33, { w: 3, h: 1, color: '#8a2a24', examine: 'An Ober\'s Oil tanker truck: aviation fuel for the Park\'s tanks.' });
P('crate', 18, 31); P('crate', 19, 31); P('crate', 18, 32); P('barrel', 21, 30); P('barrel', 21, 31);
P('tank', 2, 21, { w: 2, h: 2, examine: 'The Park\'s aviation-fuel tank, filled from Ober\'s Oil tankers. A gauge, a placard, and a NO SMOKING sign that has been heavily underlined.' });
// --- Roost Aeroworks
P('sign', 32, 27, { examine: 'ROOST AEROWORKS — "Fine aircraft since before you were born." Underneath, newer: "FOR SALE — see Billie."', interact: { kind: 'aerospace', action: 'sale', name: 'sale notice' } });
P('windsock', 52, 42, { examine: 'The Roost windsock: faded orange, patched twice, and still the most honest instrument on the Park.' });
P('tug', 50, 50, { w: 2, h: 1, color: '#e8c04a', examine: 'A tiny aircraft tug with ROOST stencilled on it and a seat cushion Billie knitted.' });
P('engine_stand', 52, 46, { examine: 'A piston engine on a stand, cowling off, plugs out. A tag: "SKYLARK #31 — Wrenna, do NOT let Billie \'tune\' this."' });
// the expansion land (v0.57.0): the halls themselves are drawn from the simulation (a building site, then the building)
P('sign', 57, 29, { examine: 'ROOST AEROWORKS — EXPANSION LAND. "Hangar 2 north of the office, the laboratory here, and the assembly hall, the widebody hall and the space annex across Campus Drive. Ask at the terminal."' });
P('sign', 24, 37, { examine: 'ROOST AEROWORKS — WEST WORKS. "Plots for the assembly hall, the widebody hall and the space annex. Hard hats beyond this point, and a building permit in your pocket."' });
// the building sites (v0.57.0): drawn over a hall's plot until it's built, then they go
for (const [key, H] of Object.entries(HALLS)) if (H.building) P('hall_site', H.at.x, H.at.y, { w: H.w, h: H.h, aero: { company: 'roost', hall: key }, hiddenUnless: { aeroHall: { id: key, built: false } }, examine: `A plot reserved for Roost Aeroworks: ${H.name}. ${H.text}` });
// the facilities Roost can build on the apron side: drawn from the simulation (a site, then the thing)
P('aero_facility', 55, 44, { w: 3, h: 3, aero: { company: 'roost', facility: 'engine_cell' }, examine: 'Roost\'s engine test cell, if it ever gets one: a fenced pad, a blast deflector and a very understanding set of neighbours.' });
P('aero_facility', 54, 49, { w: 4, h: 3, aero: { company: 'roost', facility: 'inspection' }, examine: 'The inspection gantry, if Roost ever buys one: X-ray, ultrasound and laser trackers on rails over a parking bay.' });
AC(34, 51, { model: 'ap_skylark', livery: 'roost', heading: 0, examine: 'Billie\'s own Skylark, the Rosie: thirty years old, polished every Sunday, flown every Monday. Not for sale. Never for sale.' });
// --- Meridian: the forecourt, flags, the share board
for (const x of [64, 67, 76, 79]) P('flagpole', x, 28, { color: '#2e3a4e' });
P('bigsign', 81, 26, { w: 2, h: 2, text: 'MRDN', sub: 'HALVERMOUTH EXCHANGE', color: '#c8a040', examine: 'A lit board by the HQ doors: MERIDIAN AEROSPACE CORPORATION — MRDN, with the day\'s price and the order book.', interact: { kind: 'aerospace', action: 'board', name: 'share board' } });
P('statue', 61, 21, { w: 2, h: 3, label: 'FIRST FLIGHT', examine: '"THE FIRST MERIDIAN" — a bronze of a little monoplane on a plinth. The plaque: "From the Free Port to the Flats, 41 years. Forward."' });
for (const [x, y] of [[62, 25], [82, 19], [120, 19], [150, 22], [150, 30], [116, 44]]) P('tree', x, y);
P('dish', 116, 37, { w: 2, h: 2, examine: 'A satellite dish on the space-systems roof line: testing a transponder before it goes up.' });
// the engine test stand and its blast walls
P('test_stand', 120, 35, { w: 3, h: 3, examine: 'Meridian\'s engine test stand: a turbofan bolted into a steel frame, an intake screen, and a blast deflector pointing at the scrub. When it runs, Starling\'s windows hum.' });
P('blast_wall', 123, 35, { w: 1, h: 3 }); P('blast_wall', 119, 35, { w: 1, h: 3 });
P('sign', 118, 34, { examine: 'ENGINE TEST STAND — "When the beacon is lit, ear defenders on. When the beacon is lit and you can\'t hear this sign, you\'re too close."' });
P('barrel', 125, 35); P('barrel', 126, 35); P('crate', 127, 36); P('tug', 129, 37, { w: 2, h: 1, color: '#2e3a4e', examine: 'A Meridian towing tractor, navy blue, with a flashing beacon and a very serious driver\'s seat.' });
// Meridian's apron: two of its own aircraft live here (the company jet and a test aircraft), the rest come and go
AC(141, 51, { model: 'ap_swift', livery: 'meridian', heading: 0, examine: 'Meridian\'s company jet, a Swift LJ-2 in navy and gold. Imogen Hale flies in it, works in it, and occasionally sleeps in it.' });
AC(130, 51, { model: 'af_kestrel', livery: 'test', heading: 0, examine: 'A Kestrel T-3 in orange-and-white test colours, bristling with instrumentation. Ailie Ronn\'s office, she says.' });
for (const [x, y] of [[62, 47], [118, 47], [148, 47]]) P('runway_sign', x, y, { text: 'APRON' });
// --- the airfield: edge lights, signs, windsocks, the tower
for (let x = 36; x < 172; x += 6) { P('runway_light', x, 65); P('runway_light', x, 72); }
for (let y = 66; y < 72; y++) { P('runway_light', 33, y, { color: 'green' }); P('runway_light', 173, y, { color: 'red' }); }
for (let x = 174; x < 180; x += 2) P('runway_light', x, 69, { color: 'white' });
P('runway_sign', 38, 64, { text: '09 ← A' }); P('runway_sign', 162, 64, { text: 'A → 27' });
P('windsock', 34, 74, { examine: 'The runway 09 windsock, standing straight out. Somewhere a pilot is saying "bit of a crosswind".' });
P('windsock', 168, 74, { examine: 'The runway 27 windsock. On a launch day it points away from the pad, and everyone is grateful.' });
P('control_tower', 58, 74, { w: 3, h: 3, examine: 'Starling Tower: a glass cab on a concrete stalk. From up there you can see the refinery flare, Lariat\'s water tower and, on a clear day, the sea.' });
P('radar', 64, 76, { w: 2, h: 2, examine: 'The approach radar, turning once every four seconds, patiently.' });
P('noticeboard', 52, 83, { examine: 'METEOROLOGICAL BRIEFING: "CAVOK. Wind 270/08. Launch window 14:00–16:00 if Tina says so."' });
P('car', 41, 84, { w: 2, h: 1, color: '#f4f4f0', examine: 'A FOLLOW ME car, chequered on the roof. It has never been followed by anything faster than Billie.' });
// --- the launch complex
for (let x = 118; x < 178; x++) if (x < 140 || x > 143) P('chainfence', x, 106, { razor: true });
for (let x = 118; x < 178; x++) P('chainfence', x, 78, { razor: true });
for (let y = 79; y < 106; y++) { P('chainfence', 118, y, { razor: true, vertical: true }); P('chainfence', 177, y, { razor: true, vertical: true }); }
P('boom_barrier', 140, 106, { w: 4, h: 1, raised: true, solid: false, examine: 'The launch-complex gate. On launch days it stays down and the guard wears ear defenders.' });
P('sign', 144, 107, { examine: 'LAUNCH COMPLEX — DANGER AREA. "No entry without range clearance. When the siren sounds, you are inside the hazard area. Leave. Faster."' });
P('launch_pad', 150, 82, { w: 10, h: 10, company: 'meridian', examine: 'Meridian\'s launch pad: a concrete deck over a flame trench the size of a canal, scorched black, and a water deluge system that could empty a lake.' });
P('launch_pad', 164, 95, { w: 10, h: 10, company: 'roost', examine: 'A surveyed pad site inside the fence, staked out years ago "for when Roost goes to space". A launch pad for your company can be built here (the aerospace terminal, Facilities).' });
P('sign', 163, 94, { examine: 'PAD 2 — RESERVED. "Roost Aeroworks launch site. Some day." The paint is very old.' });
P('launch_tower', 160, 82, { w: 2, h: 3, examine: 'The mobile service tower: a red lattice of steel thirty storeys tall, with swing arms that reach out to the rocket and a lift that groans the whole way up.' });
P('propellant_sphere', 137, 81, { w: 3, h: 3, color: '#e8ecf0', examine: 'The liquid-oxygen sphere: white, frosted at the valves, venting little plumes of fog.' });
P('propellant_sphere', 137, 86, { w: 3, h: 3, color: '#d8dce2', examine: 'The kerosene sphere. The kerosene comes from Ober\'s Oil, through the Cut, by the tanker-load.' });
P('tank', 141, 82, { w: 2, h: 2, examine: 'A high-pressure helium tank. It hisses quietly to itself.' });
P('tank', 141, 86, { w: 2, h: 2, examine: 'A deluge-water tank, for the pad on launch day.' });
P('pipe', 143, 84); P('pipe', 144, 84); P('pipe', 145, 84); P('pipe', 146, 84); P('pipe', 147, 84); P('pipe', 148, 84); P('pipe', 149, 84);
P('radar', 170, 98, { w: 2, h: 2, examine: 'A range-tracking radar: it follows every launch until the rocket is a dot, then a rumour.' });
P('blast_wall', 146, 93, { w: 4, h: 1 }); P('blast_wall', 162, 93, { w: 4, h: 1 });
// ground station and launch control
for (const [x, y] of [[104, 84], [108, 84], [112, 84], [106, 89], [110, 89]]) P('dish', x, y, { w: 2, h: 2, examine: 'A ground-station dish, tracking something over the horizon. They all turn together, like sunflowers.' });
P('sign', 108, 95, { examine: 'STARLING GROUND STATION — Meridian Space Systems. "Telemetry, tracking and command. Please do not wave at the dishes."' });
P('car', 98, 104, { w: 2, h: 1, color: '#2e3a4e', examine: 'Tina Minus\'s car. On the dashboard, a stopwatch.' });
// --- the boneyard (south-west): old aircraft nobody has the heart to scrap
AC(6, 84, { model: 'ap_puffin', wreck: true, heading: 0.3, examine: 'An old turboprop airliner in a faded livery, engines gone, tail number painted over. Swallows nest in the cockpit.' });
AC(16, 90, { model: 'ap_meadowlark', wreck: true, heading: -0.5, examine: 'A Meadowlark with one wing. The other is in Billie\'s garden as a bench.' });
AC(7, 95, { model: 'af_kestrel', wreck: true, heading: 1.2, examine: 'A retired Kestrel trainer, ROOST\'s first and only military aircraft (a prototype, never bought). Billie still talks to it.' });
P('scrap', 20, 84, { w: 2, h: 1 }); P('scrap', 22, 96, { w: 2, h: 1 }); P('engine_stand', 14, 98);
P('sign', 4, 81, { examine: 'THE BONEYARD. "Aircraft rest here. Please don\'t take bits. (Wrenna, this means you.)"' });
for (const [x, y] of [[2, 106], [8, 104], [14, 108], [20, 103], [22, 76], [36, 100], [60, 96], [70, 88], [84, 100], [90, 82]]) P(k(x, y) ? 'tree' : 'bush', x, y);
function k(x, y) { return (x * 7 + y * 3) % 2 === 0; }
// the edges of the plain: scrub along the south and east
for (let x = 2; x < 178; x += 6) if (x < 24 || x > 31) P(x % 4 ? 'bush' : 'tree', x, H - 1);
for (let y = 22; y < 104; y += 7) if (y < 60 || y > 74) P('bush', 179, y);

export const starlingFlats = {
  id: 'starling_flats',
  name: 'Starling Flats',
  kind: 'outdoor',
  music: { day: 'mus_fields', night: 'mus_fields' },
  ambience: 'amb_fields',
  tiles: m.rows(),
  airfield,
  areas: [
    { id: 'area_starling', name: 'Starling', x: 0, y: 0, w: 150, h: 13 },
    { id: 'area_mesa_road', name: 'Mesa Road', x: 0, y: 13, w: 150, h: 6 },
    { id: 'area_freight', name: 'Starling Freight Receiving', x: 0, y: 19, w: 25, h: 19 },
    { id: 'area_roost', name: 'Roost Aeroworks', x: 31, y: 19, w: 30, h: 35 },
    { id: 'area_roost_west', name: 'Roost West Works', x: 0, y: 38, w: 25, h: 38 },
    { id: 'area_meridian', name: 'Meridian Aerospace', x: 61, y: 19, w: 92, h: 41 },
    { id: 'area_airfield', name: 'Starling Field — runway 09/27', x: 19, y: 60, w: 161, h: 14 },
    { id: 'area_flightops', name: 'Flight Operations', x: 31, y: 74, w: 40, h: 20 },
    { id: 'area_launch', name: 'The Launch Complex', x: 118, y: 78, w: 60, h: 29 },
    { id: 'area_ground_station', name: 'Starling Ground Station', x: 94, y: 78, w: 24, h: 29 },
    { id: 'area_boneyard', name: 'The Boneyard', x: 0, y: 76, w: 25, h: 32 },
    { id: 'area_range_road', name: 'Range Road', x: 25, y: 107, w: 155, h: 13 },
  ],
  buildings,
  doors: [
    // the Cut: Mesa Road runs west down through the escarpment to Wellhead Circle
    ...[14, 15, 16, 17].map((y, i) => ({ id: `door_sf_cut_${i}`, x: 0, y, keepTile: true, gateway: 'The Ober Fields', label: 'The Cut, west to the Ober Fields', to: { map: 'ober_fields', spot: 'cut_east' } })),
  ],
  spots: {
    west_gate: { x: 2, y: 15, facing: 'right' },
    gate_guard: { x: 31, y: 23, facing: 'left' },
    freight_dock: { x: 9, y: 30, facing: 'up' },
    roost_yard: { x: 45, y: 42, facing: 'down' },
    roost_apron: { x: 40, y: 47, facing: 'down' },
    meridian_forecourt: { x: 72, y: 29, facing: 'up' },
    meridian_apron: { x: 100, y: 49, facing: 'down' },
    test_stand_watch: { x: 121, y: 39, facing: 'up' },
    runway_view: { x: 52, y: 75, facing: 'up' },
    tower_base: { x: 59, y: 78, facing: 'up' },
    pad_view: { x: 145, y: 95, facing: 'up' },
    ground_station: { x: 108, y: 93, facing: 'up' },
    boneyard: { x: 13, y: 94, facing: 'down' },
    cafe_door_out: { x: 135, y: 12, facing: 'down' },
    cafe_bench: { x: 125, y: 13, facing: 'down' },
    roost_office_door_out: { x: 37, y: 27, facing: 'down' },
    roost_hangar_door_out: { x: 42, y: 41, facing: 'down' },
    ...Object.fromEntries(Object.values(HALLS).filter((H) => H.room).map((H) => [`${H.room}_door_out`, { x: H.at.x + Math.floor(H.w / 2), y: H.at.y + H.h, facing: 'down' }])),
    meridian_lobby_door_out: { x: 72, y: 28, facing: 'down' },
    meridian_assembly_door_out: { x: 102, y: 33, facing: 'down' },
    meridian_flightline_door_out: { x: 135, y: 31, facing: 'down' },
    meridian_space_door_out: { x: 99, y: 47, facing: 'down' },
    launch_control_door_out: { x: 102, y: 104, facing: 'down' },
    meridian_vib_door_out: { x: 130, y: 96, facing: 'down' },
  },
  props,
};

// ---------------------------------------------------------------- interiors
const room = (id, name, w, h, outSpot, o = {}) => ({
  id, name, kind: 'interior', music: o.music || 'mus_workshop', ambience: 'amb_indoor',
  tiles: roomTiles(w, h, o.floor || 'g', Math.floor(w / 2), o.extra || []),
  doors: [{ id: `door_${id}_exit`, x: Math.floor(w / 2), y: h - 1, to: { map: 'starling_flats', spot: outSpot } }],
  spots: { entry: { x: Math.floor(w / 2), y: h - 2, facing: 'up' }, ...(o.spots || {}) },
  keepClear: [[Math.floor(w / 2), h - 2]],
  props: o.props || [],
  ...(o.floorStyle ? { floorStyle: o.floorStyle } : {}),
});

/** Billie's office: the terminal, her desk, forty years of trophies. */
export const roostOffice = room('roost_office', 'Roost Aeroworks — Office', 9, 7, 'roost_office_door_out', {
  floor: 'f', music: 'mus_home',
  spots: { desk: { x: 2, y: 2, facing: 'right' }, terminal: { x: 6, y: 2, facing: 'up' }, window: { x: 4, y: 1, facing: 'up' } },
  props: [
    { id: 'ro_terminal', type: 'terminal', x: 6, y: 1, interact: { kind: 'aerospace', action: 'terminal', company: 'roost', name: 'aerospace terminal' }, examine: 'The Roost terminal: a beige computer older than most of its users, a mouse mat of a Skylark, and the whole business on a single screen.' },
    { id: 'ro_desk', type: 'desk', x: 1, y: 1, w: 2, examine: 'Billie\'s desk: invoices pinned under a propeller hub, a coffee ring on every one, and a photograph of a woman in a leather helmet holding a cup bigger than her head.' },
    { id: 'ro_trophies', type: 'shelf', x: 1, y: 4, w: 2, examine: 'Air-race trophies, forty years of them: the Coast Cup, the Escarpment Dash, the Halvermouth Pylon (third, "a pigeon got in the way").' },
    { id: 'ro_painting', type: 'painting', x: 3, y: 0, w: 2, examine: 'A painting of the first Roost hangar: one plane, one woman, one very small sign.' },
    { id: 'ro_plant', type: 'plant', x: 7, y: 4 },
    { id: 'ro_chair', type: 'chair', x: 4, y: 4 },
  ],
});

/** The Roost hangar: one light bay (the build is drawn from the simulation), the workbench, the parts racks. */
export const roostHangar = room('roost_hangar', 'Roost Aeroworks — Hangar 1', 18, 12, 'roost_hangar_door_out', {
  spots: { bench: { x: 2, y: 3, facing: 'up' }, bay: { x: 9, y: 8, facing: 'up' }, racks: { x: 15, y: 3, facing: 'up' }, wrenna: { x: 6, y: 8, facing: 'right' } },
  props: [
    { id: 'rh_bay_1', type: 'bay_slot', x: 4, y: 2, w: 10, h: 7, aero: { company: 'roost', slot: 'h1_a' }, examine: 'Light assembly bay 1: jigs, a work platform and whatever Roost is building today.' },
    { id: 'rh_bench', type: 'workbench', x: 1, y: 1, w: 2, examine: 'Wrenna\'s workbench: every tool outlined in marker on the pegboard, and one outline empty ("SOMEBODY", it says underneath).' },
    { id: 'rh_toolrack', type: 'toolrack', x: 15, y: 1, w: 2, examine: 'Parts racks: rib sections, cowlings, a box of rivets labelled "RIVETS (GOOD)" and one labelled "RIVETS (BILLIE)".' },
    { id: 'rh_engine', type: 'engine_stand', x: 15, y: 5, examine: 'A Skylark engine on a stand, ready to hang.' },
    { id: 'rh_crate_1', type: 'crate', x: 1, y: 9 }, { id: 'rh_crate_2', type: 'crate', x: 2, y: 9 }, { id: 'rh_barrel', type: 'barrel', x: 16, y: 9 },
    { id: 'rh_board', type: 'noticeboard', x: 7, y: 0, examine: 'The build board: each aircraft in the hangar, its stage and its due date, in Wrenna\'s capitals.' },
  ],
});

/** Meridian's lobby: reception, the share board, the models, Imogen's corner office behind glass. */
export const meridianLobby = room('meridian_lobby', 'Meridian Aerospace — Headquarters', 16, 9, 'meridian_lobby_door_out', {
  floor: 'c', music: 'mus_home',
  extra: [[11, 1, 1, 4, 'W'], [11, 3, 1, 1, 'c']],
  spots: { reception: { x: 7, y: 3, facing: 'down' }, ceo: { x: 13, y: 2, facing: 'down' }, board: { x: 3, y: 2, facing: 'up' } },
  props: [
    { id: 'ml_desk', type: 'counter', x: 5, y: 4, w: 4, examine: 'The reception desk: polished navy, a visitors\' book, and a bowl of mints shaped like tiny satellites.' },
    { id: 'ml_board', type: 'terminal', x: 3, y: 1, interact: { kind: 'aerospace', action: 'board', name: 'MRDN board' }, examine: 'A screen: MRDN — the share price, the order book, the last deliveries.' },
    { id: 'ml_model_1', type: 'display', x: 1, y: 3, examine: 'A model of the Condor 300 widebody in Skyward Airlines colours, on a stand that looks like a cloud.' },
    { id: 'ml_model_2', type: 'display', x: 1, y: 6, examine: 'A model of the Heron launcher, with a tiny Relay satellite in its fairing.' },
    { id: 'ml_ceo_desk', type: 'desk', x: 12, y: 1, w: 2, examine: 'Imogen Hale\'s desk: three screens, a slide rule (ornamental), a slide rule (in use), and a framed rejection letter from a flying school, dated forty years ago.' },
    { id: 'ml_plant_1', type: 'plant', x: 10, y: 6 }, { id: 'ml_plant_2', type: 'plant', x: 14, y: 6 },
    { id: 'ml_painting', type: 'painting', x: 6, y: 0, w: 3, examine: 'A portrait of Meridian\'s founder at the Free Port, squinting at a sky full of things that hadn\'t been built yet.' },
  ],
});

/** Final assembly: two heavy bays and the widebody bay, under a gantry crane. */
export const meridianAssembly = room('meridian_assembly', 'Meridian — Final Assembly Hall', 36, 14, 'meridian_assembly_door_out', {
  spots: { floor: { x: 18, y: 11, facing: 'up' }, office: { x: 2, y: 2, facing: 'right' }, wide: { x: 26, y: 11, facing: 'up' } },
  props: [
    { id: 'ma_heavy_1', type: 'bay_slot', x: 2, y: 2, w: 10, h: 8, aero: { company: 'meridian', bay: 'heavy_1' }, examine: 'Heavy assembly bay 1.' },
    { id: 'ma_heavy_2', type: 'bay_slot', x: 13, y: 2, w: 10, h: 8, aero: { company: 'meridian', bay: 'heavy_2' }, examine: 'Heavy assembly bay 2.' },
    { id: 'ma_wide_1', type: 'bay_slot', x: 24, y: 1, w: 11, h: 10, aero: { company: 'meridian', bay: 'wide_1' }, examine: 'The widebody bay: the biggest roof on the Flats.' },
    { id: 'ma_gantry', type: 'gantry', x: 1, y: 1, w: 34, h: 1, examine: 'An overhead gantry crane running the length of the hall, with a hook that could lift a house.' },
    { id: 'ma_racks', type: 'toolrack', x: 1, y: 11, w: 3 }, { id: 'ma_crate_1', type: 'crate', x: 32, y: 12 }, { id: 'ma_crate_2', type: 'crate', x: 33, y: 12 },
    { id: 'ma_engine_1', type: 'engine_stand', x: 6, y: 11 }, { id: 'ma_engine_2', type: 'engine_stand', x: 30, y: 12 },
    { id: 'ma_board', type: 'noticeboard', x: 12, y: 0, examine: 'The line board: every airframe on the floor, its stage, its customer and how many days late Rudy will let it be (none).' },
  ],
});

/** The flight-line hall: two light bays and, behind a fence, the secure bay. */
export const meridianFlightline = room('meridian_flightline', 'Meridian — Flight-Line Hall', 26, 12, 'meridian_flightline_door_out', {
  spots: { floor: { x: 13, y: 9, facing: 'up' } },
  props: [
    { id: 'mf_light_1', type: 'bay_slot', x: 1, y: 1, w: 7, h: 6, aero: { company: 'meridian', bay: 'light_1' }, examine: 'Light assembly bay 1.' },
    { id: 'mf_light_2', type: 'bay_slot', x: 8, y: 1, w: 7, h: 6, aero: { company: 'meridian', bay: 'light_2' }, examine: 'Light assembly bay 2.' },
    { id: 'mf_secure_1', type: 'bay_slot', x: 16, y: 1, w: 9, h: 7, aero: { company: 'meridian', bay: 'secure_1' }, examine: 'The secure integration bay, behind its own fence. Whatever is in there is somebody\'s air force\'s business.' },
    ...Array.from({ length: 9 }, (_, i) => ({ id: `mf_fence_${i}`, type: 'chainfence', x: 16 + i, y: 8 })),
    { id: 'mf_sign', type: 'sign', x: 15, y: 8, examine: 'SECURE AREA — "Cleared personnel only beyond this fence. Yes, you. No, not you."' },
    { id: 'mf_bench', type: 'workbench', x: 1, y: 9, w: 2 }, { id: 'mf_rack', type: 'toolrack', x: 4, y: 10, w: 2 },
  ],
});

/** Space systems: the rocket integration bay and two clean rooms. */
export const meridianSpace = room('meridian_space', 'Meridian — Space Systems', 30, 12, 'meridian_space_door_out', {
  floor: 't',
  spots: { floor: { x: 15, y: 9, facing: 'up' } },
  extra: [[19, 1, 1, 7, 'W'], [19, 5, 1, 1, 't']],
  props: [
    { id: 'ms_rocket_1', type: 'bay_slot', x: 1, y: 1, w: 17, h: 6, aero: { company: 'meridian', bay: 'rocket_1' }, examine: 'The rocket integration bay: stages on cradles, being joined like very expensive sausages.' },
    { id: 'ms_clean_1', type: 'bay_slot', x: 20, y: 1, w: 4, h: 5, aero: { company: 'meridian', bay: 'clean_1' }, examine: 'Clean room 1, behind glass. Somebody in a bunny suit waves.' },
    { id: 'ms_clean_2', type: 'bay_slot', x: 25, y: 1, w: 4, h: 5, aero: { company: 'meridian', bay: 'clean_2' }, examine: 'Clean room 2, behind glass.' },
    { id: 'ms_gowns', type: 'wardrobe', x: 20, y: 8, examine: 'Clean-room gowns, hoods and overshoes, each with a name tag. One says "VISITOR (DON\'T TOUCH ANYTHING)".' },
    { id: 'ms_bench', type: 'workbench', x: 2, y: 9, w: 2, examine: 'A bench of flight computers being soak-tested, each blinking a slightly different shade of patience.' },
    { id: 'ms_crate', type: 'crate', x: 16, y: 9 },
  ],
});

/** The vertical integration building: where a rocket stands up before it goes to the pad. */
export const meridianVib = room('meridian_vib', 'Vertical Integration Building', 12, 14, 'meridian_vib_door_out', {
  floor: 'g',
  spots: { floor: { x: 6, y: 12, facing: 'up' } },
  props: [
    { id: 'mv_stack', type: 'bay_slot', x: 3, y: 1, w: 6, h: 9, aero: { company: 'meridian', pad: true }, examine: 'The stacking cell: a rocket stands here, stage on stage, before the crawler takes it to the pad.' },
    { id: 'mv_platform_l', type: 'scaffold', x: 1, y: 2, w: 1, h: 7 }, { id: 'mv_platform_r', type: 'scaffold', x: 10, y: 2, w: 1, h: 7 },
    { id: 'mv_crate', type: 'crate', x: 1, y: 11 }, { id: 'mv_rack', type: 'toolrack', x: 9, y: 11, w: 2 },
  ],
});

/** Launch control: consoles, the big board, the countdown clock. */
export const launchControl = room('launch_control', 'Launch Control', 12, 8, 'launch_control_door_out', {
  floor: 'c', music: 'mus_home',
  spots: { director: { x: 6, y: 2, facing: 'up' }, console_a: { x: 2, y: 4, facing: 'up' }, console_b: { x: 9, y: 4, facing: 'up' } },
  props: [
    { id: 'lc_wall', type: 'monitor_wall', x: 2, y: 0, w: 8, examine: 'The big board: weather, range safety, propellant, telemetry, and a countdown clock that is, today, counting nothing.' },
    { id: 'lc_desk', type: 'desk', x: 5, y: 1, w: 2, examine: 'The launch director\'s console. A red cover over a red switch, and a sticky note: "NOT THE COFFEE MACHINE".', interact: { kind: 'aerospace', action: 'board', name: 'launch board' } },
    { id: 'lc_console_a', type: 'desk', x: 1, y: 3, w: 2 }, { id: 'lc_console_b', type: 'desk', x: 9, y: 3, w: 2 },
    { id: 'lc_plant', type: 'plant', x: 10, y: 6 }, { id: 'lc_chair', type: 'chair', x: 6, y: 5 },
  ],
});

/**
 * Roost's halls (v0.57.0): one room per hall, a bay_slot prop per slot (the build is drawn from the
 * simulation, like Hangar 1's), the workbench and racks, the parts crates.
 */
const hallRooms = Object.entries(HALLS).filter(([, H]) => H.room).map(([key, H]) => {
  const cx = Math.floor(H.w / 2);
  const bottom = H.h - 2;
  const props = [
    ...H.slots.map((sl) => ({ id: `${H.room}_${sl.id}`, type: 'bay_slot', x: sl.x, y: sl.y, w: sl.w, h: sl.h, aero: { company: 'roost', slot: sl.id }, examine: `${H.short}: a ${sl.fits[0]} assembly bay — jigs, a work platform and whatever Roost is building today.` })),
    { id: `${H.room}_board`, type: 'noticeboard', x: cx, y: 0, examine: `The ${H.short.toLowerCase()} board: each unit in the hall, its stage and its due date.` },
  ];
  if (key === 'lab') {
    props.push(
      { id: 'rl_bench_1', type: 'workbench', x: 1, y: 1, w: 2, examine: 'A test bench: a strain gauge, a cracked wing rib and a mug that says WORLD\'S OKAYEST AERODYNAMICIST.' },
      { id: 'rl_bench_2', type: 'workbench', x: 3, y: 1, w: 2, examine: 'Materials testing: a coupon of aluminium, a coupon of titanium, and a tray of coupons that failed in interesting ways.' },
      { id: 'rl_model', type: 'display', x: 4, y: 3, examine: 'A wind-tunnel model of the Skylark with wool tufts glued to its wings. In the tunnel, the tufts lie flat; in the pub, the story gets better.' },
      { id: 'rl_shelf', type: 'shelf', x: 1, y: 4, w: 2, examine: 'Reports bound in blue card: every research programme Roost has run, and several it wishes it hadn\'t.' },
      { id: 'rl_terminal', type: 'terminal', x: 2, y: 3, interact: { kind: 'aerospace', action: 'terminal', company: 'roost', name: 'laboratory terminal' }, examine: 'A lab terminal wired into the Roost network: the research tree, and a screensaver of a very slowly rotating propeller.' },
      { id: 'rl_plant', type: 'plant', x: 4, y: 6 },
    );
  } else {
    props.push(
      { id: `${H.room}_bench`, type: 'workbench', x: 1, y: bottom, w: 2, examine: 'A workbench: every tool outlined in marker on the pegboard.' },
      { id: `${H.room}_rack`, type: 'toolrack', x: H.w - 4, y: bottom, w: 2, examine: 'Parts racks: ribs, cowlings, and a box of rivets labelled "RIVETS (GOOD)".' },
      { id: `${H.room}_crate_1`, type: 'crate', x: 4, y: bottom }, { id: `${H.room}_crate_2`, type: 'crate', x: 5, y: bottom }, { id: `${H.room}_barrel`, type: 'barrel', x: H.w - 2, y: bottom },
    );
  }
  return { ...room(H.room, `Roost Aeroworks — ${H.name}`, H.w, H.h, `${H.room}_door_out`, { props, spots: { bench: { x: 3, y: bottom, facing: 'up' } } }), hall: key };
});

export default [starlingFlats, roostOffice, roostHangar, ...hallRooms, meridianLobby, meridianAssembly, meridianFlightline, meridianSpace, meridianVib, launchControl];
