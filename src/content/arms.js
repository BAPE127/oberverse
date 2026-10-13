// The arms trade (v0.13.0): Mill Road Yards arms works, parts, components,
// weapons, workstations, the research tree, employee quirks and the
// fictional countries shown on the terminal's globe. See docs/ARMS.md.
//
// Every weapon item carries `arms: { value, family }`. `value` is what a
// buyer pays for a standard unit; research raises it per family. Lucas
// Eastrise buys wholesale at half value (v0.13); the global market opens in
// v0.14.

const part = (id, name, price, icon, description) => [`item_ap_${id}`, { name, category: 'arms_part', price, tags: ['arms', 'part'], icon, description }];
const comp = (id, name, icon, description) => [`item_ai_${id}`, { name, category: 'arms_part', price: 0, tags: ['arms', 'part', 'intermediate'], icon, description }];
const station = (id, name, kind, price, description) => [`item_st_${id}`, { name, category: 'machine', price, tags: ['machine', 'arms'], icon: 'machine', build: { type: 'machine', kind, w: 2, h: 2, domain: 'arms' }, description }];

export const ARMS_ITEMS = Object.fromEntries([
  // --- parts, ordered from the terminal; they arrive on the loading dock
  part('steel', 'Steel Bar Stock', 6, 'casing', 'Cold-rolled steel bar. Becomes barrels, receivers and warhead casings.'),
  part('polymer', 'Polymer Pellets', 4, 'casing', 'A sack of black polymer pellets for moulding stocks and grips.'),
  part('springs', 'Springs & Pins', 5, 'chip', 'A tin of springs, firing pins and detents. Rattles ominously.'),
  part('optics', 'Optics', 30, 'screen', 'Lenses, reticles and a mount. The difference between "near" and "on".'),
  part('electronics', 'Electronics Kit', 25, 'chip', 'Boards, sensors and a wiring loom in a padded box.'),
  part('battery', 'Li-ion Pack', 35, 'battery', 'A high-drain battery pack. Do not puncture. Do not lick.'),
  part('propellant', 'Propellant', 15, 'ammo', 'Double-base propellant grains. Store cool. Store far away.'),
  part('explosive', 'High Explosive', 40, 'ammo', 'Plastic explosive in olive-drab wrapping. Lucas calls it "the good clay".'),
  part('motor', 'Rocket Motor', 120, 'machine', 'A solid-fuel rocket motor, nozzle capped.'),
  part('guidance', 'Guidance Chip', 150, 'chip', 'A hardened inertial guidance chip. Export-controlled. Probably.'),
  part('airframe', 'Airframe', 110, 'machine', 'Carbon-fibre fuselage and fins, flat-packed.'),
  // --- components, made at workstations
  comp('barrel', 'Barrel', 'gun', 'A rifled steel barrel.'),
  comp('receiver', 'Receiver', 'gun', 'The heart of a firearm: the part that is legally "the gun".'),
  comp('furniture', 'Stock & Grip', 'gun', 'Moulded polymer furniture.'),
  comp('warhead', 'Warhead', 'ammo', 'A shaped-charge warhead. Handle like it hates you.'),
  comp('seeker', 'Seeker Head', 'chip', 'Guidance chip, optics and electronics in a nose cone.'),
  comp('flightctl', 'Flight Controller', 'chip', 'The brain of a drone.'),
  // --- weapons made only in the arms works (pistol, SMG and shotgun reuse the shop's items)
  ['item_assault_rifle', { name: 'Assault Rifle', category: 'weapon', price: 520, tags: ['weapon', 'gun'], icon: 'longgun', arms: { value: 480, family: 'small' },
    description: 'A select-fire assault rifle stamped PIPECREEK. Rifle rounds.',
    weapon: { kind: 'gun', damage: 24, range: 14, cooldown: 0.12, auto: true, lethal: true, ammo: 'item_ammo_rifle', mag: 30, reload: 2.2, spread: 4, noise: 24, sound: 'sfx_gunshot_smg', held: 'longgun' } }],
  ['item_sniper_rifle', { name: 'Sniper Rifle', category: 'weapon', price: 700, tags: ['weapon', 'gun'], icon: 'longgun', arms: { value: 650, family: 'small' },
    description: 'A bolt-action precision rifle with a long scope. Rifle rounds.',
    weapon: { kind: 'gun', damage: 120, range: 26, cooldown: 1.6, lethal: true, ammo: 'item_ammo_rifle', mag: 5, reload: 3.0, spread: 0.2, noise: 28, sound: 'sfx_gunshot_heavy', held: 'longgun' } }],
  ['item_lmg', { name: 'Light Machine Gun', category: 'weapon', price: 900, tags: ['weapon', 'gun'], icon: 'longgun', arms: { value: 800, family: 'small' },
    description: 'A belt-fed light machine gun. Heavy, loud, persuasive. Rifle rounds.',
    weapon: { kind: 'gun', damage: 20, range: 13, cooldown: 0.08, auto: true, lethal: true, ammo: 'item_ammo_rifle', mag: 100, reload: 4.5, spread: 8, noise: 28, sound: 'sfx_gunshot_smg', held: 'longgun' } }],
  ['item_rpg', { name: 'RPG Launcher', category: 'weapon', price: 1000, tags: ['weapon', 'heavy'], icon: 'longgun', arms: { value: 900, family: 'heavy' }, heavy: 'rpg',
    description: 'A reusable shoulder-fired launcher. Fires RPG rockets.' }],
  ['item_rpg_rocket', { name: 'RPG Rocket', category: 'ammo', price: 240, tags: ['heavy', 'ammo'], icon: 'ammo', arms: { value: 220, family: 'heavy' },
    description: 'A rocket-propelled grenade for the RPG launcher.' }],
  ['item_missile_guided', { name: 'Skylance Guided Missile', category: 'heavy', price: 2800, tags: ['heavy'], icon: 'machine', arms: { value: 2600, family: 'missile' }, heavy: 'missile',
    description: 'A man-portable guided missile with a seeker head. Point, lock, regret.' }],
  ['item_missile_cruise', { name: 'Longbow Cruise Missile', category: 'heavy', price: 9500, tags: ['heavy'], icon: 'machine', arms: { value: 9000, family: 'missile' }, heavy: 'cruise',
    description: 'A long-range cruise missile on a launch rail. It has a flight plan and a grudge.' }],
  ['item_drone_attack', { name: 'Hornet Attack Drone', category: 'heavy', price: 1700, tags: ['heavy', 'drone'], icon: 'machine', arms: { value: 1600, family: 'drone' }, heavy: 'drone',
    description: 'A quadcopter with a warhead and a short attention span.' }],
  ['item_drone_strike', { name: 'Kestrel Strike Drone', category: 'heavy', price: 5500, tags: ['heavy', 'drone'], icon: 'machine', arms: { value: 5200, family: 'drone' }, heavy: 'drone',
    description: 'A fixed-wing strike drone with a seeker and two warheads.' }],
  // --- workstations (placed with B in an arms works; staffed by employees)
  station('lathe', 'CNC Lathe', 'lathe', 400, 'Arms works station (machining). Barrels, receivers, stocks and grips.'),
  station('assembly', 'Assembly Bench', 'assembly', 300, 'Arms works station (machining). Puts guns and launchers together.'),
  station('electronics', 'Electronics Bay', 'electronics', 600, 'Arms works station (electronics). Seeker heads and flight controllers.'),
  station('explosives', 'Explosives Bay', 'explosives', 700, 'Arms works station (explosives). Warheads.'),
  station('rocket', 'Rocket Bay', 'rocket', 1500, 'Arms works station (explosives). RPG rockets and missiles.'),
  station('drone', 'Drone Bay', 'drone', 1400, 'Arms works station (electronics). Drones.'),
  station('lab', 'Research Lab', 'lab', 800, 'Arms works station (research). A scientist here earns research points for the terminal\'s research tree.'),
]);

/** Station kinds: which skill staffs them. */
export const ARMS_STATIONS = {
  lathe: { name: 'CNC Lathe', skill: 'machining', color: '#5a6a7a' },
  assembly: { name: 'Assembly Bench', skill: 'machining', color: '#7a5a3a' },
  electronics: { name: 'Electronics Bay', skill: 'electronics', color: '#3a6a5a' },
  explosives: { name: 'Explosives Bay', skill: 'explosives', color: '#8a4a2a' },
  rocket: { name: 'Rocket Bay', skill: 'explosives', color: '#6a3a3a' },
  drone: { name: 'Drone Bay', skill: 'electronics', color: '#3a4a7a' },
  lab: { name: 'Research Lab', skill: 'research', color: '#4a3a6a' },
};

const R = (station, inputs, out, minutes, requires = null) => ({ station, in: inputs, out, minutes, requires });
/** Recipes by id. `requires`: a research node. A station runs one recipe at a time (chosen with E). */
export const ARMS_RECIPES = {
  barrel: R('lathe', { item_ap_steel: 2 }, 'item_ai_barrel', 5),
  receiver: R('lathe', { item_ap_steel: 2, item_ap_springs: 1 }, 'item_ai_receiver', 6),
  furniture: R('lathe', { item_ap_polymer: 2 }, 'item_ai_furniture', 3),
  warhead: R('explosives', { item_ap_explosive: 1, item_ap_steel: 1 }, 'item_ai_warhead', 8),
  seeker: R('electronics', { item_ap_guidance: 1, item_ap_electronics: 1, item_ap_optics: 1 }, 'item_ai_seeker', 10, 'guidance'),
  flightctl: R('electronics', { item_ap_electronics: 2, item_ap_battery: 1 }, 'item_ai_flightctl', 8, 'avionics'),
  pistol: R('assembly', { item_ai_receiver: 1, item_ai_barrel: 1, item_ai_furniture: 1 }, 'item_pistol', 6),
  smg: R('assembly', { item_ai_receiver: 1, item_ai_barrel: 1, item_ai_furniture: 1, item_ap_springs: 2 }, 'item_smg', 8, 'smg'),
  shotgun: R('assembly', { item_ai_receiver: 1, item_ai_barrel: 2, item_ai_furniture: 1 }, 'item_shotgun', 8, 'shotgun'),
  assault: R('assembly', { item_ai_receiver: 1, item_ai_barrel: 1, item_ai_furniture: 2, item_ap_springs: 1, item_ap_optics: 1 }, 'item_assault_rifle', 12, 'assault'),
  sniper: R('assembly', { item_ai_receiver: 1, item_ai_barrel: 2, item_ai_furniture: 1, item_ap_optics: 2 }, 'item_sniper_rifle', 14, 'precision'),
  lmg: R('assembly', { item_ai_receiver: 2, item_ai_barrel: 2, item_ai_furniture: 1, item_ap_springs: 3 }, 'item_lmg', 16, 'lmg'),
  rpg: R('assembly', { item_ai_barrel: 2, item_ai_furniture: 1, item_ap_optics: 1 }, 'item_rpg', 12, 'rpg'),
  rpg_rocket: R('rocket', { item_ai_warhead: 1, item_ap_propellant: 2, item_ap_steel: 1 }, 'item_rpg_rocket', 8, 'rpg'),
  guided: R('rocket', { item_ap_motor: 1, item_ai_warhead: 1, item_ai_seeker: 1, item_ap_airframe: 1 }, 'item_missile_guided', 20, 'guided'),
  cruise: R('rocket', { item_ap_motor: 2, item_ai_warhead: 2, item_ai_seeker: 2, item_ap_airframe: 2 }, 'item_missile_cruise', 40, 'cruise'),
  drone_attack: R('drone', { item_ap_airframe: 1, item_ai_flightctl: 1, item_ai_warhead: 1, item_ap_battery: 1 }, 'item_drone_attack', 18, 'drone_attack'),
  drone_strike: R('drone', { item_ap_airframe: 2, item_ai_flightctl: 2, item_ai_seeker: 1, item_ai_warhead: 2 }, 'item_drone_strike', 36, 'drone_strike'),
};

/** The research tree. cost in research points; requires: other nodes; unlocks recipes or gives bonuses. */
export const ARMS_RESEARCH = {
  // Manufacturing
  jigs: { branch: 'Manufacturing', name: 'Precision Jigs', cost: 15, requires: [], bonus: { speed: 0.2 }, text: '+20% speed at every station.' },
  qa: { branch: 'Manufacturing', name: 'Quality Control', cost: 25, requires: ['jigs'], bonus: { price: { all: 0.1 } }, text: '+10% sale price on everything.' },
  lean: { branch: 'Manufacturing', name: 'Lean Supply', cost: 25, requires: [], bonus: { parts: -0.15 }, text: 'Parts cost 15% less.' },
  tooling: { branch: 'Manufacturing', name: 'Automated Tooling', cost: 50, requires: ['jigs'], bonus: { speed: 0.2 }, text: 'Another +20% station speed.' },
  // Small arms
  smg: { branch: 'Small Arms', name: 'Submachine Guns', cost: 10, requires: [], text: 'Unlocks the SMG.' },
  shotgun: { branch: 'Small Arms', name: 'Shotguns', cost: 10, requires: [], text: 'Unlocks the pump shotgun.' },
  rifling: { branch: 'Small Arms', name: 'Polygonal Rifling', cost: 20, requires: [], bonus: { price: { small: 0.15 } }, text: '+15% on small arms.' },
  assault: { branch: 'Small Arms', name: 'Assault Rifles', cost: 30, requires: ['smg'], text: 'Unlocks the assault rifle.' },
  precision: { branch: 'Small Arms', name: 'Precision Rifles', cost: 40, requires: ['assault'], text: 'Unlocks the sniper rifle.' },
  lmg: { branch: 'Small Arms', name: 'Light Machine Guns', cost: 45, requires: ['assault'], text: 'Unlocks the LMG.' },
  matchgrade: { branch: 'Small Arms', name: 'Match-Grade Finishing', cost: 60, requires: ['rifling', 'precision'], bonus: { price: { small: 0.2 } }, text: '+20% more on small arms.' },
  // Heavy weapons
  rpg: { branch: 'Heavy Weapons', name: 'Rocket Launchers', cost: 40, requires: ['shotgun'], text: 'Unlocks the RPG launcher and RPG rockets (at the rocket bay).' },
  shaped: { branch: 'Heavy Weapons', name: 'Shaped Charges', cost: 50, requires: ['rpg'], bonus: { price: { heavy: 0.2, missile: 0.1 } }, text: '+20% on heavy weapons, +10% on missiles.' },
  // Guidance & electronics
  guidance: { branch: 'Guidance & Electronics', name: 'Inertial Guidance', cost: 50, requires: [], text: 'Unlocks seeker heads (electronics bay).' },
  avionics: { branch: 'Guidance & Electronics', name: 'Avionics', cost: 40, requires: [], text: 'Unlocks flight controllers (electronics bay).' },
  guided: { branch: 'Guidance & Electronics', name: 'Guided Missiles', cost: 80, requires: ['guidance', 'rpg'], text: 'Unlocks the Skylance guided missile.' },
  cruise: { branch: 'Guidance & Electronics', name: 'Cruise Missiles', cost: 150, requires: ['guided'], text: 'Unlocks the Longbow cruise missile.' },
  countermeasures: { branch: 'Guidance & Electronics', name: 'Countermeasures', cost: 100, requires: ['guided'], bonus: { price: { missile: 0.2, drone: 0.2 } }, text: '+20% on missiles and drones.' },
  // Drones
  drone_attack: { branch: 'Drones', name: 'Attack Drones', cost: 80, requires: ['avionics'], text: 'Unlocks the Hornet attack drone.' },
  drone_strike: { branch: 'Drones', name: 'Strike Drones', cost: 140, requires: ['drone_attack', 'guidance'], text: 'Unlocks the Kestrel strike drone.' },
  swarm: { branch: 'Drones', name: 'Swarm Logic', cost: 120, requires: ['drone_attack'], bonus: { price: { drone: 0.25 } }, text: '+25% on drones.' },
};
export const RESEARCH_BRANCHES = ['Manufacturing', 'Small Arms', 'Heavy Weapons', 'Guidance & Electronics', 'Drones'];

/** Arms works for sale at Mill Road Yards. All need an arms licence. */
export const ARMS_WAREHOUSES = {
  aw1: { name: 'Yard 1 Works', map: 'aw1', price: 2500, flag: 'owns_aw1', inBay: 'ct_aw1_dock', outCrate: 'ct_aw1_cage', basePower: 3, bunks: 4, sign: 'yd_aw1_sale' },
  aw2: { name: 'Yard 2 Works', map: 'aw2', price: 6000, flag: 'owns_aw2', inBay: 'ct_aw2_dock', outCrate: 'ct_aw2_cage', basePower: 4, bunks: 6, sign: 'yd_aw2_sale' },
  aw3: { name: 'Foundry Hall', map: 'aw3', price: 12000, flag: 'owns_aw3', inBay: 'ct_aw3_dock', outCrate: 'ct_aw3_cage', basePower: 6, bunks: 10, sign: 'yd_aw3_sale' },
};

export const ARMS_LICENCE_PRICE = 500;
/** What Lucas pays: a share of value, and a daily budget. */
export const WHOLESALE = { share: 0.5, dailyBudget: 2500 };

/** Employee generation. */
export const STAFF_NAMES = {
  first: ['Ada', 'Bram', 'Cass', 'Dmitri', 'Edie', 'Faro', 'Gwen', 'Hal', 'Ines', 'Jory', 'Kit', 'Lev', 'Mina', 'Nils', 'Orla', 'Pim', 'Quill', 'Rosa', 'Sven', 'Tamsin', 'Udo', 'Vera', 'Wim', 'Xan', 'Yusra', 'Zed', 'Bea', 'Corin', 'Dana', 'Emeric'],
  last: ['Ashdown', 'Bellweather', 'Coyle', 'Drummond', 'Esterhaus', 'Fenwick', 'Grieve', 'Halloran', 'Ivanek', 'Jessop', 'Kade', 'Lisle', 'Mercer', 'Nunn', 'Okonkwo', 'Pratt', 'Quayle', 'Rourke', 'Strand', 'Tolliver', 'Underhill', 'Vance', 'Whitlock', 'Yeats', 'Zabel'],
};
export const STAFF_SKILLS = ['machining', 'electronics', 'explosives', 'research'];
export const STAFF_QUIRKS = {
  perfectionist: { name: 'Perfectionist', text: '15% slower, never complains.', speed: -0.15, morale: 1 },
  speedy: { name: 'Speed Demon', text: '25% faster; burns out (−2 morale a day).', speed: 0.25, morale: -2 },
  workaholic: { name: 'Workaholic', text: 'Hard work never lowers their morale.', workaholic: true },
  chatty: { name: 'Chatty', text: '10% slower, but cheerful (+2 morale a day).', speed: -0.1, morale: 2 },
  butterfingers: { name: 'Butterfingers', text: '20% slower. Cheap, though (wage −25%).', speed: -0.2, wage: -0.25 },
  exmilitary: { name: 'Ex-Military', text: '+25% at the explosives and rocket bays.', stations: { explosives: 0.25, rocket: 0.25 } },
  tinkerer: { name: 'Tinkerer', text: '+25% at the electronics and drone bays.', stations: { electronics: 0.25, drone: 0.25 } },
  penny: { name: 'Penny-Pincher', text: 'Asks for 20% less pay.', wage: -0.2 },
  prodigy: { name: 'Prodigy', text: '+40% in the research lab.', stations: { lab: 0.4 } },
  nightowl: { name: 'Night Owl', text: 'Works the night shift (19:00–07:00).', night: true },
};

/** The fictional countries on the terminal's globe (the market opens in v0.14). lat/lon in degrees. */
export const COUNTRIES = {
  varn: { name: 'Varnistan', color: '#e8a24a', lat: 38, lon: 52, blurb: 'A mountain republic that has been "about to have elections" for nineteen years.' },
  ostmark: { name: 'The Ostmark Union', color: '#7aa8e8', lat: 54, lon: 18, blurb: 'Seven provinces, one parliament, eight opinions.' },
  caldera: { name: 'Republic of Caldera', color: '#e86a5a', lat: -8, lon: 34, blurb: 'Built on a volcano. Politically, also built on a volcano.' },
  sund: { name: 'Kingdom of Sund', color: '#9ae87a', lat: 61, lon: -14, blurb: 'A fishing monarchy whose king is eleven and very serious.' },
  pallas: { name: 'Free State of Pallas', color: '#d87ae8', lat: 12, lon: -38, blurb: 'Free, according to the name. A state, according to some.' },
  teshvar: { name: 'Teshvar', color: '#e8d84a', lat: 28, lon: 96, blurb: 'Desert oil sheikdom; its sheikh owns a yacht shaped like a smaller yacht.' },
  morrow: { name: 'Morrow Isles', color: '#4ad8c8', lat: -32, lon: 148, blurb: 'Two hundred islands, two hundred navies.' },
  lirre: { name: 'Grand Duchy of Lirre', color: '#c8c8e8', lat: 46, lon: -72, blurb: 'Neutral. Aggressively, belligerently neutral.' },
};
