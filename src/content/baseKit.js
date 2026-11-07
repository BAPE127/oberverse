// What each building on Hollowmoor Lot looks like (v0.103.6): pure data. `LOOK_OF` says what a facility is (so its room has the right furniture and its walls the right marks), `KIT` the colours and
// marks of each look. The walkable lot (src/content/maps/hollowmoor.js), the painter (src/engine/drawPixelBuildings.js) and the terminal's base map (src/ui/osint/base.js) all read this one table.
//
//   style        the room's wall style (src/engine/drawPixelGround.js WALLS)    wall, trim   the colours on the terminal map and the cutaway painter        steel   corrugated sheet walls      hazard   yellow-and-black kerb at the foot
//   slits        narrow windows (armoury, command)    emblem  the mark on the back wall: cross | star | gear | wing | target | diamond
//   big          a hangar's wide door leaves          roof    the roof seen from above on the terminal map: flat | arch | saw | pitched
export const LOOK_OF = {
  site_office: 'office', bunkhouse: 'barracks', range: 'range', cage: 'armoury', command: 'command', barracks_a: 'barracks', barracks_b: 'barracks', mess: 'mess', medical: 'medical', motor_pool: 'motor',
  armoury: 'armoury', depot: 'depot', tank_factory: 'factory', helicopter_works: 'factory', hangars: 'hangar', barracks_c: 'barracks', hospital: 'medical', training: 'training', depot_b: 'depot',
};

export const KIT = {
  office: { style: 'navy', wall: '#b3ad92', trim: '#4a4a3a', emblem: 'star', roof: 'flat', tone: '#b3ad92' },
  barracks: { style: 'olive', wall: '#8f9a78', trim: '#3b4430', emblem: null, roof: 'pitched', tone: '#8f9a78' },
  mess: { style: 'khaki', wall: '#aa9c78', trim: '#4a3a28', emblem: null, roof: 'pitched', tone: '#aa9c78' },
  medical: { style: 'concrete', wall: '#d8d6cc', trim: '#9a3a3a', emblem: 'cross', roof: 'flat', tone: '#d8d6cc' },
  range: { style: 'olive', wall: '#8a8f7a', trim: '#3a3e30', emblem: 'target', roof: 'flat', tone: '#8a8f7a' },
  armoury: { style: 'concrete', wall: '#7a7e72', trim: '#2e322a', emblem: 'diamond', slits: true, roof: 'flat', tone: '#7a7e72' },
  command: { style: 'navy', wall: '#7a8a8e', trim: '#2a3a3e', emblem: 'star', slits: true, roof: 'flat', tone: '#7a8a8e' },
  motor: { style: 'steel', wall: '#85867a', trim: '#3a3a30', emblem: 'gear', steel: true, hazard: true, roof: 'saw', tone: '#85867a' },
  hangar: { style: 'steel', wall: '#9aa2aa', trim: '#46505a', emblem: 'wing', steel: true, hazard: true, big: true, roof: 'arch', tone: '#9aa2aa' },
  factory: { style: 'steel', wall: '#868c98', trim: '#3a404c', emblem: 'gear', steel: true, hazard: true, roof: 'saw', tone: '#868c98' },
  depot: { style: 'steel', wall: '#8a8672', trim: '#3a3626', emblem: 'diamond', steel: true, roof: 'pitched', tone: '#8a8672' },
  training: { style: 'olive', wall: '#7d8a68', trim: '#343e28', emblem: 'target', roof: 'flat', tone: '#7d8a68' },
};

export const lookOf = (facilityId) => LOOK_OF[facilityId] || 'office';
