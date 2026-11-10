// CONCEPT STUDY ONLY — the mock-up shots. Every `map`, focus, building and person id is the game's own;
// anything staged for the composition (extra people, vehicles, set dressing) is marked `staged` here
// and listed in the study document.
const P = (id, x, y, facing, extra = {}) => ({ id, x, y, facing, ...extra });
const car = (body, x, y, angle, color, extra = {}) => ({ body, x, y, angle, color, len: { bus: 4.7, limo: 3.1, pickup: 2.6, truck: 3.4, tank: 3.6, jeep: 2.3, heli: 5, jet: 7.5 }[body] || 2.3, wid: { bus: 1.45, truck: 1.5, tank: 1.9, pickup: 1.3 }[body] || 1.2, ...extra });
const E = 0, S = Math.PI / 2, W = Math.PI, N = -Math.PI / 2;

export const SCENES = {
  a_urban: {
    map: 'halvermouth', focus: [78, 48], span: 62, radius: 48, time: 'day', shadowExtent: 64,
    title: 'Mock-up A · Halvermouth — Civic Plaza at Market Street', sub: 'Urban outdoor · Hall of Justice, First Bank of Halvermouth, Ober\'s Oil Tower, The Rialto',
    labels: { t_ober: "Ober's Oil Tower", b_bank: 'First Bank of Halvermouth', b_rialto: 'The Rialto', b_hall_of_justice: 'Hall of Justice & Mayor\'s Office', b_market_hall: 'Market Hall' },
    people: [P('you', 62.5, 53.4, 'right', { label: 'You', tag: 'player', walk: 0.2 }), P('s1', 55.5, 52.6, 'left', { walk: 0.6, label: '', appearance: { skin: '#c99a72', hair: '#2a2420', hairStyle: 'parted', outfit: '#3a4250', accent: '#b8402e', accessory: 'glasses', build: 'thin' } }), P('s2', 66.4, 58.6, 'down', { walk: 0.3, label: '', appearance: { skin: '#8a5a3c', hair: '#1c1a1a', hairStyle: 'curly', outfit: '#8a5a6a', build: 'average' } }), P('s3', 49.5, 58.5, 'right', { walk: 0.8, label: '', appearance: { skin: '#e0b090', hair: '#8a7a5a', hairStyle: 'cap', outfit: '#6a6a4a', accent: '#5a4a3a', build: 'broad' } }), P('s4', 71.4, 52.5, 'down', { label: '', appearance: { skin: '#d9a77c', hair: '#5a3a2a', hairStyle: 'bun', outfit: '#3f6a5a', build: 'average' } })],
    cars: [car('saloon', 50, 54.6, W, '#8a2f2f', { moving: 1 }), car('police', 64, 56.4, E, '#1f2a44', { moving: 1 }), car('pickup', 44, 56.5, E, '#6a7a8a', { moving: 1 }), car('limo', 43.5, 53.1, W, '#1c1c22', { parked: 1 }), car('hatch', 70.6, 62, S, '#c8b98f', { moving: 1 })],
  },
  b_residential: {
    map: 'lanternside', focus: [20, 14], span: 46, time: 'day',
    title: 'Mock-up B · Lanternside — Gullwing Row, Brindle Heights', sub: 'Residential · Number 9 (your flat), the Vane Residence, No. 11 (To Let), Gullwing Road',
    labels: { b_number9: 'No. 9 — home', b_vane_house: 'Vane Residence', b_to_let: 'No. 11 · To Let', b_cafe: 'The Kettle & Crumb' },
    people: [P('you', 10.5, 14.6, 'down', { label: 'You', tag: 'player' }), P('npc_osric', 24.5, 14.4, 'right', { walk: 0.3 }), P('npc_bailey', 33.5, 15.4, 'left', { walk: 0.7, kit: 'police' })],
    cars: [car('hatch', 20.2, 15.2, 0.0, '#5a6a7a', { parked: 1, staged: 'Osric\'s Pipit, moved onto his drive' }), car('estate', 36, 18.5, E, '#7f8f6a', { moving: 1 })], hideCars: ['car_osric'],
    dress: 'gullwing',
  },
  c_industrial: {
    map: 'ober_fields', focus: [43, 31], span: 56, radius: 40, time: 'day', shadowExtent: 56,
    title: "Mock-up C · The Ober Fields — Ober's Oil Refinery No. 1", sub: 'Industrial · refinery, tank farm, pipe runs, the oil field derricks, Moneybucks Manor beyond the County Road',
    labels: { b_refinery: "Ober's Oil Refinery No. 1", b_manor: 'Moneybucks Manor', b_bunkhouse: 'The Crew Mess' },
    cars: [car('truck', 34, 36.2, E, '#59633f', { parked: 1 }), car('pickup', 47.5, 22.3, W, '#b8402e', { parked: 1 }), car('pickup', 30, 17.4, W, '#8a8f94', { moving: 1 })],
  },
  d_interior: {
    map: 'lanternside', focus: [11.5, 26.2], span: 25, time: 'day', cutaway: ['cafe'], radius: 26,
    title: 'Mock-up D · The Kettle & Crumb — interior', sub: 'Detailed interior · walked into from Canal Row with no loading; the roof lifts, the near walls drop',
    people: [P('npc_mags', 8.5, 23.4, 'down', { holding: 'tray' }), P('npc_tibbs', 15.6, 25.5, 'left'), P('you', 9.4, 25.6, 'up', { label: 'You', tag: 'player' }), P('npc_osric', 9.5, 28.5, 'right')],
  },
  d2_interior: {
    map: 'halvermouth', focus: [131.5, 44.5], span: 40, time: 'day', cutaway: ['police_station'], radius: 34,
    title: 'Mock-up D2 · Halvermouth Police — Precinct 1', sub: 'A multi-room interior from the existing grid: front desk and holding benches, the chief\'s office, the squad room',
    people: [P('o1', 124.5, 43.4, 'down', { kit: 'police', label: 'Desk sergeant' }), P('o2', 136.5, 41.5, 'left', { kit: 'police', label: '' }), P('you', 126.5, 48.5, 'up', { label: 'You', tag: 'player' }), P('o3', 137.5, 47.5, 'down', { kit: 'police', label: '' })],
    cars: [car('police', 146.5, 44, S, '#1f2a44', { parked: 1 }), car('police', 149.5, 44.5, S, '#1f2a44', { parked: 1 }), car('police', 152.5, 43.6, S, '#1f2a44', { parked: 1 })],
  },
  e_military: {
    map: 'fort_gullcrest', focus: [72, 41], span: 62, radius: 46, time: 'day', shadowExtent: 64, cutaway: ['fort_gullcrest__fg_command'],
    title: 'Mock-up E · Fort Gullcrest — parade ground, command post and the flight line', sub: 'Specialised facility · the government base up FM 38: command post (cut away), armoury, hangars and apron',
    labels: { fg_command: 'Command post', fg_armoury: 'Armoury', fg_hangars: 'Aircraft hangars', fg_depot: 'Supply depot' },
    dress: 'fort',
  },
  e2_farm: {
    map: 'lariat', focus: [27, 91], span: 60, radius: 46, time: 'day', shadowExtent: 56,
    title: "Mock-up E2 · Lariat — Chuckie's Cheese Co.", sub: 'Rural · the dairy: freestall barns, the milking parlour, silos, paddocks and the herd',
    labels: { b_barn_1: 'Freestall Barn No. 1', b_parlour: 'Milking Parlour', b_cheese_plant: "Chuckie's Cheese Co.", b_chuckie_house: "Chuckie's Ranch House" },
  },
  f_night: {
    map: 'lanternside', focus: [17, 24], span: 44, time: 'night', cutaway: ['cafe'], maxLights: 34, exposure: 1.05,
    title: 'Mock-up F · Lanternside — Canal Row at 21:40', sub: 'Night · street lamps, lit windows, the Kettle & Crumb still open, headlights on Gullwing Road',
    people: [P('npc_mags', 8.5, 23.4, 'down'), P('npc_tibbs', 12.4, 27.5, 'right'), P('you', 20.5, 29.2, 'left', { label: 'You', tag: 'player', walk: 0.25 }), P('npc_bailey', 30.5, 20.5, 'left', { kit: 'police', walk: 0.6 })],
    cars: [car('saloon', 12, 18.5, E, '#8a2f2f', { moving: 1 }), car('bus', 31, 16.6, W, '#2f6b4f', { moving: 1 })], simCars: false,
  },
  g_snow: {
    map: 'lanternside', focus: [20, 14], span: 46, time: 'snowdusk', weather: 'snow', maxLights: 30,
    title: 'Mock-up G · Gullwing Row under snow, 16:50', sub: 'Weather · the same street as mock-up B: accumulation on roofs and gardens, slush and wheel tracks, low visibility',
    people: [P('you', 10.5, 14.6, 'down', { label: 'You', tag: 'player' }), P('npc_osric', 24.5, 14.4, 'right', { walk: 0.3 })],
    cars: [car('hatch', 20.2, 15.2, 0.0, '#5a6a7a', { parked: 1 }), car('estate', 36, 18.5, E, '#7f8f6a', { moving: 1 })], hideCars: ['car_osric'], dress: 'gullwing',
  },
  g2_rain: {
    map: 'halvermouth', focus: [78, 48], span: 62, radius: 48, time: 'night', weather: 'rain', shadowExtent: 64, maxLights: 36,
    title: 'Mock-up G2 · Bank Row in the rain, 22:15', sub: 'Weather + night · wet tarmac carries the lamps and headlights; the same view as mock-up A',
    cars: [car('saloon', 50, 54.6, W, '#8a2f2f', { moving: 1 }), car('police', 64, 56.4, E, '#1f2a44', { moving: 1 }), car('pickup', 44, 56.5, E, '#6a7a8a', { moving: 1 }), car('limo', 43.5, 53.1, W, '#1c1c22', { parked: 1 })], simCars: false,
    people: [P('you', 62.5, 53.4, 'right', { label: 'You', tag: 'player', walk: 0.2 })],
  },
  h_actors: {
    map: 'lanternside', focus: [74.5, 20.6], span: 20, radius: 24, time: 'day', hide: ['npc_bailey', 'npc_miranda'],
    title: 'Mock-up H · People and vehicles — Civic Square, Lanternside', sub: 'People built from the game\'s own appearance records; vehicles from its model table; all lit and shadowed by the same sun',
    people: [P('you', 72.5, 20.5, 'right', { label: 'You', tag: 'player', walk: 0.22 }), P('npc_mags', 74.4, 20.4, 'left', { holding: 'tray' }), P('npc_moneybucks', 77.4, 21.7, 'left'), P('npc_mason', 79.6, 23.0, 'left', { walk: 0.4 }), P('npc_tibbs', 72.6, 23.6, 'down', { holding: 'wrench' }), P('npc_osric', 70.4, 22.3, 'right', { holding: 'clipboard' }), P('pc', 68.6, 20.5, 'right', { kit: 'police', walk: 0.7, label: 'Officer Bailey', appearance: { skin: '#d9a77c', hair: '#5a4a3a', build: 'broad' } }), P('sold', 71.6, 26.6, 'right', { kit: 'soldier', holding: 'rifle', label: 'Fort Gullcrest private', appearance: { skin: '#8a5a3c', hair: '#1c1a1a' } })],
    cars: [car('bus', 71.5, 16.8, W, '#2f6b4f', { moving: 1 }), car('hatch', 79, 18.5, E, '#a35a48', { moving: 1 }), car('pickup', 66.2, 18.5, E, '#6a7a8a', { moving: 1 }), car('police', 81.5, 16.7, W, '#1f2a44', { moving: 1 })], simCars: false,
  },
  h2_sheet: {
    map: 'lanternside', focus: [75.6, 23.4], span: 23, radius: 24, time: 'day', simCars: false, hide: ['npc_bailey', 'npc_miranda'],
    title: 'Mock-up H2 · Character and vehicle sheet (staged on Civic Square)', sub: 'One model, any facing: eight directions, a six-step walk, outfits and kit swapped by data; five of the game\'s vehicle bodies',
    people: [
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => P('turn' + i, 69.4 + i * 1.75, 22.0, i * Math.PI / 4, { label: i ? '' : 'Eight facings →' })),
      ...[0, 1, 2, 3, 4, 5].map((i) => P('walk' + i, 69.4 + i * 1.75, 25.2, Math.PI / 4, { walk: i / 6, label: i ? '' : 'Walk cycle →' })),
      ...[['npc_mags', { holding: 'tray' }], ['npc_moneybucks', {}], ['npc_mason', {}], ['k1', { kit: 'police' }], ['k2', { kit: 'soldier', holding: 'rifle' }], ['npc_tibbs', { holding: 'wrench' }], ['k3', { holding: 'pistol', appearance: { skin: '#8a5a3c', hair: '#1c1a1a', hairStyle: 'long', outfit: '#7a3f4a', build: 'thin' } }]].map(([id, x], i) => P(id, 69.4 + i * 1.75, 28.4, Math.PI / 4, { ...x, label: i ? '' : 'Wardrobe and kit →' })),
    ],
    cars: [car('hatch', 66.5, 17.6, 0.45, '#a35a48'), car('pickup', 70.5, 17.6, 0.45, '#6a7a8a'), car('police', 74.5, 17.6, 0.45, '#1f2a44'), car('gt', 78.3, 17.6, 0.45, '#c8402e'), car('bus', 83.6, 17.6, 0.3, '#2f6b4f')],
  },
};
for (const [k, v] of Object.entries(SCENES)) v.id = k;
