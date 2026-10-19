// World simulation rules (v0.32.0): every persistent character has a life —
// a home (a residence and a unit in it), an occupation (which says how they
// get about, how they take interruptions, and how they persist), and a
// schedule (in their profile) whose sleep block is in that home.
//
// tools/validate-content.mjs enforces this for every character: a home that
// exists, a bed in it that matches the sleep block, occupancy within the
// unit's capacity (private units hold one household), an occupation that
// exists — or a documented exception in LIFE_EXCEPTIONS. New characters,
// buildings, towns and jobs plug in here; see docs/WORLD_SIMULATION.md.

/**
 * Occupations: reusable behaviour profiles.
 *   transport  'walk' | 'transit' (walks, takes the bus for long trips) | 'drive' | 'patrol'
 *   interrupt  'resume' (a conversation or event pauses them; they pick up where they were)
 *   persist    'persistent' (saved, never despawned)
 */
export const OCCUPATIONS = {
  shopkeeper: { name: 'Shopkeeper', transport: 'walk', interrupt: 'resume', persist: 'persistent' },
  clerk: { name: 'Clerk / office worker', transport: 'transit', interrupt: 'resume', persist: 'persistent' },
  tradesperson: { name: 'Tradesperson', transport: 'walk', interrupt: 'resume', persist: 'persistent' },
  labourer: { name: 'Labourer', transport: 'transit', interrupt: 'resume', persist: 'persistent' },
  executive: { name: 'Executive', transport: 'drive', interrupt: 'resume', persist: 'persistent' },
  household_staff: { name: 'Household staff', transport: 'walk', interrupt: 'resume', persist: 'persistent' },
  security: { name: 'Security', transport: 'walk', interrupt: 'resume', persist: 'persistent' },
  police: { name: 'Police officer', transport: 'patrol', interrupt: 'resume', persist: 'persistent', patrols: true },
  gang: { name: 'Gang member', transport: 'walk', interrupt: 'resume', persist: 'persistent' },
  dealer: { name: 'Car dealer', transport: 'drive', interrupt: 'resume', persist: 'persistent' },
  mariner: { name: 'Mariner', transport: 'walk', interrupt: 'resume', persist: 'persistent' },
  farmer: { name: 'Farmer / ranch hand', transport: 'drive', interrupt: 'resume', persist: 'persistent' },
  casual: { name: 'Casual worker / unemployed', transport: 'walk', interrupt: 'resume', persist: 'persistent' },
  scientist: { name: 'Scientist', transport: 'walk', interrupt: 'resume', persist: 'persistent' },
  livestock: { name: 'Livestock', transport: 'walk', interrupt: 'resume', persist: 'persistent' },
  entertainer: { name: 'Entertainer', transport: 'walk', interrupt: 'resume', persist: 'persistent' }, // v0.52.0
  inmate: { name: 'Inmate', transport: 'walk', interrupt: 'resume', persist: 'persistent' },
};

/**
 * Residences: real places with units. type: house | farmhouse | flat (over a
 * shop) | apartment | rooming_house | dormitory | estate | staff_quarters |
 * quarters (living where they work) | houseboat | camp (rough sleeping).
 * Each unit: the interior (or outdoor) map, its beds (spot names on that
 * map), capacity, and whether unrelated people may share it.
 */
// v0.36.0: everyone who used to sleep at work (the café, the station bunks, the Abacus, the
// gun shop…) lives in a real home now — generated in src/content/homes.js and merged in by
// src/content/index.js. No beds in shops or workplaces (the checker enforces it).
export const RESIDENCES = {
  // Lanternside & the coast
  res_osric_house: { name: 'Osric Vane\'s house', type: 'house', units: { house: { map: 'osric_house', beds: ['bed'], capacity: 1 } } },
  res_manor: {
    name: 'Moneybucks Manor', type: 'estate',
    units: {
      master_suite: { map: 'manor', beds: ['master_bed'], capacity: 1 },
      staff_quarters: { map: 'manor', beds: ['staff_bed1', 'staff_bed2', 'staff_bed3', 'staff_bed4'], capacity: 4, shared: true },
    },
  },
  res_bunkhouse: { name: 'The Ober\'s Oil bunkhouse', type: 'dormitory', units: { dorm: { map: 'bunkhouse', beds: ['bunk1', 'bunk2', 'bunk3', 'bunk4', 'bunk5'], capacity: 5, shared: true } } },
  // Westbrook: the Plumb Line Apartments — four flats off a shared hall (v0.32.0)
  res_plumb_line: {
    name: 'Plumb Line Apartments', type: 'apartment',
    units: {
      apt_1: { map: 'plumb_unit_1', beds: ['bed'], capacity: 1 },
      apt_2: { map: 'plumb_unit_2', beds: ['bed'], capacity: 1 },
      apt_3: { map: 'plumb_unit_3', beds: ['bed'], capacity: 1 },
      apt_4: { map: 'plumb_unit_4', beds: ['bed'], capacity: 1 },
      apt_5: { map: 'plumb_unit_5', beds: ['bed'], capacity: 1 }, // v0.36.0: Marty
    },
  },
  // Halvermouth
  res_sumps_camp: {
    name: 'The Sumps camp', type: 'camp',
    units: {
      tents_north: { map: 'halvermouth', beds: ['sumps_tents'], capacity: 4, shared: true },
      tents_west: { map: 'halvermouth', beds: ['sumps_tents_w'], capacity: 4, shared: true },
      south_shacks: { map: 'halvermouth', beds: ['sumps_south'], capacity: 3, shared: true },
      shore: { map: 'halvermouth', beds: ['sumps_shore'], capacity: 1 },
    },
  },
  // the Yards
  res_salty_ober: { name: 'The Salty Ober (houseboat)', type: 'houseboat', units: { cabin: { map: 'salty_ober', beds: ['bunk'], capacity: 1 } } },
  // Lariat
  res_chuckie_ranch: { name: 'Chuckie\'s ranch house', type: 'farmhouse', units: { house: { map: 'chuckie_house', beds: ['bed'], capacity: 1 } } },
  res_hollister: { name: 'The Hollister farmhouse', type: 'farmhouse', units: { house: { map: 'hollister_house', beds: ['bed'], capacity: 1 } } },
  // v0.52.0: the Phonograph Grand — the owner's penthouse and the magician's rooms at the top of the
  // tower (an estate: they live where they work), and the staff quarters on 3
  res_phonograph: {
    name: 'The Phonograph Grand (residences)', type: 'estate',
    units: {
      penthouse: { map: 'phonograph_octavius', beds: ['bed'], capacity: 1 },
      spade_rooms: { map: 'phonograph_spade', beds: ['bed'], capacity: 1 },
    },
  },
  res_phonograph_staff: { name: 'The Phonograph Grand — staff quarters', type: 'dormitory', units: { bunks: { map: 'phonograph_staff', beds: ['bed_1', 'bed_2', 'bed_3', 'bed_4', 'bed_5', 'bed_6'], capacity: 6, shared: true } } },
  res_bluebonnet: {
    name: 'Bluebonnet Boarding House', type: 'rooming_house',
    units: Object.fromEntries(['opal', 'lupe', 'wade', 'rosa', 'dale', 'lorna'].map((k) => [`room_${k}`, { map: 'boarding_house', beds: [`bed_${k}`], capacity: 1 }])),
  },
};

/** Who lives where, and what they do. `home` is 'residence/unit'. */
export const LIFE = {
  npc_mags: { home: 'res_gullwing11/flat_1', occupation: 'shopkeeper' },
  npc_osric: { home: 'res_osric_house/house', occupation: 'clerk' },
  npc_tibbs: { home: 'res_gullwing11/flat_2', occupation: 'tradesperson' },
  npc_moneybucks: { home: 'res_manor/master_suite', occupation: 'executive' },
  npc_crisp: { home: 'res_manor/staff_quarters', occupation: 'household_staff' },
  npc_agnes: { home: 'res_manor/staff_quarters', occupation: 'clerk' },
  npc_silas: { home: 'res_manor/staff_quarters', occupation: 'security' },
  npc_mabel: { home: 'res_manor/staff_quarters', occupation: 'household_staff' },
  npc_gideon: { home: 'res_bunkhouse/dorm', occupation: 'labourer' },
  npc_ruby: { home: 'res_bunkhouse/dorm', occupation: 'labourer' },
  npc_hank: { home: 'res_bunkhouse/dorm', occupation: 'labourer' },
  npc_pip: { home: 'res_bunkhouse/dorm', occupation: 'labourer' },
  npc_otto: { home: 'res_bunkhouse/dorm', occupation: 'labourer' },
  npc_delphine: { home: 'res_gullwing11/flat_3', occupation: 'scientist' },
  npc_mason: { home: 'res_plumb_line/apt_1', occupation: 'tradesperson' },
  npc_dee: { home: 'res_plumb_line/apt_2', occupation: 'tradesperson' },
  npc_barnaby: { home: 'res_plumb_line/apt_3', occupation: 'labourer' },
  npc_quinn: { home: 'res_plumb_line/apt_4', occupation: 'clerk' },
  npc_lawrence: { home: 'res_harbourline/flat_1', occupation: 'police' },
  ...Object.fromEntries(['justin', 'warren', 'bailey', 'miranda', 'hugh'].map((k, i) => [`npc_${k}`, { home: `res_harbourline/flat_${i + 2}`, occupation: 'police' }])),
  npc_arthur: { home: 'res_shack_arthur/home', occupation: 'gang' },
  ...Object.fromEntries(['al', 'percy', 'minnie', 'dee_nom', 'tony', 'max'].map((k, i) => [`npc_${k}`, { home: `res_shack_crew_${'abc'[Math.floor(i / 2)]}/home`, occupation: 'gang' }])),
  ...Object.fromEntries(['ray', 'dot', 'fern', 'sol'].map((k) => [`npc_${k}`, { home: 'res_sumps_camp/tents_north', occupation: 'casual' }])),
  ...Object.fromEntries(['mo', 'lena', 'hattie', 'pearl'].map((k) => [`npc_${k}`, { home: 'res_sumps_camp/tents_west', occupation: 'casual' }])),
  ...Object.fromEntries(['bill', 'nico', 'bram'].map((k) => [`npc_${k}`, { home: 'res_sumps_camp/south_shacks', occupation: 'casual' }])),
  npc_gus: { home: 'res_sumps_camp/shore', occupation: 'casual' },
  npc_sal: { home: 'res_atlas/flat_3', occupation: 'shopkeeper' },
  npc_lucas: { home: 'res_atlas/flat_1', occupation: 'shopkeeper' },
  npc_marty: { home: 'res_plumb_line/apt_5', occupation: 'dealer' },
  npc_julian: { home: 'res_atlas/flat_2', occupation: 'dealer' },
  npc_ober: { home: 'res_salty_ober/cabin', occupation: 'mariner' },
  npc_chuckie: { home: 'res_chuckie_ranch/house', occupation: 'farmer' },
  npc_earl: { home: 'res_hollister/house', occupation: 'farmer' },
  npc_wes: { home: 'res_lariat_tolliver/home', occupation: 'shopkeeper' },
  ...Object.fromEntries(['opal', 'lupe', 'dale', 'lorna'].map((k) => [`npc_${k}`, { home: `res_bluebonnet/room_${k}`, occupation: 'shopkeeper' }])),
  npc_wade: { home: 'res_bluebonnet/room_wade', occupation: 'farmer', transport: 'transit' }, // no truck: he takes the No. 2 into the city
  npc_rosa: { home: 'res_bluebonnet/room_rosa', occupation: 'tradesperson' },
  npc_octavius: { home: 'res_phonograph/penthouse', occupation: 'executive' },
  npc_morganius: { home: 'res_phonograph/spade_rooms', occupation: 'entertainer' },
  npc_vera: { home: 'res_phonograph_staff/bunks', occupation: 'clerk', transport: 'walk' },
  npc_brock: { home: 'res_phonograph_staff/bunks', occupation: 'security' },
};

/** Characters who don't need a home, and why. Exceptions must be justified; ordinary residents never go here. */
/**
 * v0.35.0: errand places. A schedule block with `errand: '<kind>'` (and
 * optionally `errandChance`, `meet`) goes to one of these on some days
 * instead of its usual spot — only to places in the same region as that spot,
 * open (`hours`) when the block starts. See src/sim/errands.js.
 */
export const ERRANDS = {
  // free time on the coast and in the city: tea, the pier, the parks
  outing: [
    { spot: 'cafe:table_corner', label: 'a pot of tea at the Kettle & Crumb', hours: { from: '07:00', to: '18:00' } },
    { spot: 'cafe:table_center', label: 'a slice of cake at the Kettle & Crumb', hours: { from: '07:00', to: '18:00' } },
    { spot: 'lanternside:park_pond', label: 'feeding the ducks in Gullwing Park' },
    { spot: 'lanternside:pier_end', label: 'a walk to the end of the pier' },
    { spot: 'lanternside:canal_footbridge', label: 'watching the boats from the footbridge' },
    { spot: 'lanternside:square_bench', label: 'people-watching in the square' },
    { spot: 'lanternside:quay_edge', label: 'sitting on the quay' },
    { spot: 'westbrook:birdwatch', label: 'watching the gulls on the canal basin' },
    { spot: 'halvermouth:plaza_center', label: 'an evening in Civic Plaza' },
    { spot: 'halvermouth:park_center', label: 'a turn round the park' },
  ],
  // an evening out in Lariat
  lariat_evening: [
    { spot: 'diner:booth', label: 'supper at the Mesquite Diner', hours: { from: '06:00', to: '21:00' } },
    { spot: 'diner:stool', label: 'pie at the diner counter', hours: { from: '06:00', to: '21:00' } },
    { spot: 'lariat:town_square', label: 'a stroll round Lariat Square' },
    { spot: 'lariat:main_bench', label: 'a bench on Main Street' },
    { spot: 'lariat:diner_bench', label: 'sitting out by the diner' },
  ],
};

export const LIFE_EXCEPTIONS = {
  npc_petty: { occupation: 'inmate', reason: 'Held in the Precinct 1 cells (story: "permanently in the cell next to yours").' },
  ...Object.fromEntries(['bessie', 'clementine', 'duchess', 'patsy', 'daisy'].map((k) => [`cow_${k}`, { occupation: 'livestock', reason: 'Livestock: lives in the lead cows\' paddock at Chuckie\'s Cheese.' }])),
};

/**
 * Police patrol beats (v0.32.0). points: rough waypoints [x, y] on the map
 * (snapped at load to the nearest pavement, and added as spots
 * patrol_<id>_<i>), or existing spot refs 'map:spot' (beats can cross maps).
 * dwell: game minutes an officer stops at each waypoint.
 */
export const PATROLS = {
  beat_civic: { name: 'Civic Plaza and Bank Row', map: 'halvermouth', dwell: 6, points: [[44, 18], [56, 18], [65, 18], [65, 30], [65, 39], [52, 39], [44, 39], [44, 30]] },
  beat_eastend: { name: 'The East End and the East Gate', map: 'halvermouth', dwell: 6, points: [[70, 18], [91, 18], [96, 18], [108, 39], [91, 39], [70, 39]] },
  beat_park: { name: 'Founders Park', map: 'halvermouth', dwell: 8, points: [[96, 44], [106, 54], [118, 44], [118, 64], [106, 57], [96, 64]] },
  beat_sumps: { name: 'The Sumps and the Mission', map: 'halvermouth', dwell: 7, points: [[16, 44], [16, 57], [5, 51], [16, 66], [28, 66], [39, 54], [28, 44]] },
  beat_docks: { name: 'The Docks and Quay Road', map: 'halvermouth', dwell: 6, points: [[44, 78], [66, 78], [92, 78], [108, 78], [92, 70], [66, 70]] },
  beat_lanternside: { name: 'Lanternside', dwell: 10, points: ['lanternside:square_bench', 'lanternside:fountain_side', 'lanternside:canal_footbridge', 'lanternside:quay_edge', 'lanternside:park_bench'] },
  beat_westbrook: { name: 'Westbrook and the Lots', dwell: 10, points: ['westbrook:survey', 'westbrook:birdwatch', 'westbrook:lots_sign'] },
  beat_oilfields: { name: 'The Ober Fields', dwell: 12, points: ['ober_fields:field_entrance', 'ober_fields:inspection_point', 'ober_fields:gate_post'] },
};
