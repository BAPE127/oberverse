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
    weapon: { look: 'ar', kind: 'gun', damage: 24, range: 14, cooldown: 0.12, auto: true, lethal: true, ammo: 'item_ammo_rifle', mag: 30, reload: 2.2, spread: 4, noise: 24, sound: 'sfx_gunshot_smg', held: 'longgun' } }],
  ['item_sniper_rifle', { name: 'Sniper Rifle', category: 'weapon', price: 700, tags: ['weapon', 'gun'], icon: 'longgun', arms: { value: 650, family: 'small' },
    description: 'A bolt-action precision rifle with a long scope. Rifle rounds.',
    weapon: { look: 'sniper', kind: 'gun', damage: 120, range: 26, cooldown: 1.6, lethal: true, ammo: 'item_ammo_rifle', mag: 5, reload: 3.0, spread: 0.2, noise: 28, sound: 'sfx_gunshot_heavy', held: 'longgun' } }],
  ['item_lmg', { name: 'Light Machine Gun', category: 'weapon', price: 900, tags: ['weapon', 'gun'], icon: 'longgun', arms: { value: 800, family: 'small' },
    description: 'A belt-fed light machine gun. Heavy, loud, persuasive. Rifle rounds.',
    weapon: { look: 'lmg', kind: 'gun', damage: 20, range: 13, cooldown: 0.08, auto: true, lethal: true, ammo: 'item_ammo_rifle', mag: 100, reload: 4.5, spread: 8, noise: 28, sound: 'sfx_gunshot_smg', held: 'longgun' } }],
  ['item_rpg', { name: 'RPG Launcher', category: 'weapon', price: 1000, tags: ['weapon', 'gun', 'heavy'], icon: 'longgun', arms: { value: 900, family: 'heavy' },
    description: 'A reusable shoulder-fired launcher. Fires RPG rockets that explode on impact (2.5-tile blast). Using it is a major crime.',
    weapon: { look: 'rpg', kind: 'gun', projectile: 'rocket', damage: 110, blast: 2.5, range: 16, cooldown: 1.0, lethal: true, ammo: 'item_rpg_rocket', mag: 1, reload: 2.5, spread: 1, noise: 30, sound: 'sfx_rocket', held: 'longgun' } }],
  ['item_rpg_rocket', { name: 'RPG Rocket', category: 'ammo', price: 240, bundle: 1, tags: ['heavy', 'ammo'], icon: 'ammo', arms: { value: 220, family: 'heavy' },
    description: 'A rocket-propelled grenade for the RPG launcher.' }],
  ['item_missile_guided', { name: 'Skylance Guided Missile', category: 'heavy', price: 2800, tags: ['heavy'], icon: 'machine', arms: { value: 2600, family: 'missile' },
    description: 'A man-portable guided missile with a seeker head. Use it: it locks on to the nearest person in range (never an imported character) — 3.5-tile blast. Point, lock, regret.',
    use: { heavy: 'guided', text: 'You shoulder the Skylance and squeeze.' } }],
  ['item_missile_cruise', { name: 'Longbow Cruise Missile', category: 'heavy', price: 9500, tags: ['heavy'], icon: 'machine', arms: { value: 9000, family: 'missile' },
    description: 'A long-range cruise missile. Use it: it strikes where you\'re aiming 2.5 seconds later — a 5-tile blast. Stand well back.',
    use: { heavy: 'cruise', text: 'You punch in the coordinates of where you\'re pointing.' } }],
  ['item_drone_attack', { name: 'Hornet Attack Drone', category: 'heavy', price: 1700, tags: ['heavy', 'drone'], icon: 'machine', arms: { value: 1600, family: 'drone' },
    description: 'A quadcopter with a warhead and a short attention span. Use it: it hovers by you for a minute and dives at whoever you fight (never an imported character).',
    use: { heavy: 'drone_attack', text: 'You toss the Hornet into the air.' } }],
  ['item_drone_strike', { name: 'Kestrel Strike Drone', category: 'heavy', price: 5500, tags: ['heavy', 'drone'], icon: 'machine', arms: { value: 5200, family: 'drone' },
    description: 'A strike drone with four small missiles. Use it: for ninety seconds it fires on whoever you fight (never an imported character).',
    use: { heavy: 'drone_strike', text: 'The Kestrel unfolds its wings and climbs.' } }],
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

/**
 * The armourer's workbench (v0.19.0): hand-make ONE weapon, or a box of its
 * ammunition, for yourself — straight from parts on the loading dock, no staff.
 * minutes: game time it takes. requires: a research node (as at the stations).
 */
const B = (out, inputs, minutes, requires = null, count = 1) => ({ out, in: inputs, minutes, requires, count });
export const BENCH_RECIPES = {
  pistol: B('item_pistol', { item_ap_steel: 3, item_ap_springs: 1, item_ap_polymer: 2 }, 30),
  smg: B('item_smg', { item_ap_steel: 4, item_ap_springs: 3, item_ap_polymer: 2 }, 40, 'smg'),
  shotgun: B('item_shotgun', { item_ap_steel: 5, item_ap_springs: 1, item_ap_polymer: 2 }, 40, 'shotgun'),
  assault: B('item_assault_rifle', { item_ap_steel: 4, item_ap_springs: 2, item_ap_polymer: 3, item_ap_optics: 1 }, 60, 'assault'),
  sniper: B('item_sniper_rifle', { item_ap_steel: 5, item_ap_springs: 1, item_ap_polymer: 2, item_ap_optics: 2 }, 70, 'precision'),
  lmg: B('item_lmg', { item_ap_steel: 7, item_ap_springs: 4, item_ap_polymer: 2 }, 80, 'lmg'),
  rpg: B('item_rpg', { item_ap_steel: 4, item_ap_polymer: 2, item_ap_optics: 1 }, 60, 'rpg'),
  guided: B('item_missile_guided', { item_ap_motor: 1, item_ap_explosive: 1, item_ap_guidance: 1, item_ap_optics: 1, item_ap_electronics: 1, item_ap_airframe: 1 }, 90, 'guided'),
  cruise: B('item_missile_cruise', { item_ap_motor: 2, item_ap_explosive: 2, item_ap_guidance: 2, item_ap_optics: 2, item_ap_electronics: 2, item_ap_airframe: 2 }, 150, 'cruise'),
  drone_attack: B('item_drone_attack', { item_ap_airframe: 1, item_ap_electronics: 2, item_ap_battery: 2, item_ap_explosive: 1 }, 80, 'drone_attack'),
  drone_strike: B('item_drone_strike', { item_ap_airframe: 2, item_ap_electronics: 4, item_ap_battery: 2, item_ap_explosive: 2, item_ap_guidance: 1 }, 120, 'drone_strike'),
  // ammunition: a box (the shop's bundle size) per run
  ammo_9mm: B('item_ammo_9mm', { item_ap_steel: 1, item_ap_propellant: 1 }, 15, null, 20),
  ammo_shells: B('item_ammo_shells', { item_ap_steel: 1, item_ap_propellant: 1, item_ap_polymer: 1 }, 15, 'shotgun', 8),
  ammo_rifle: B('item_ammo_rifle', { item_ap_steel: 1, item_ap_propellant: 2 }, 20, 'assault', 10),
  rpg_rocket: B('item_rpg_rocket', { item_ap_explosive: 1, item_ap_propellant: 2, item_ap_steel: 1 }, 30, 'rpg', 1),
};

// ------------------------------------------------------------ crates (v0.19.0)
// Owner's answers: stations make whole crates (no more hundreds of single
// guns to track); every crate is one standard lot; countries order 5–50
// crates; single weapons and their ammo for yourself are hand-made at the
// armourer's workbench in each works.
/** A crate is one standard lot: CRATE.units weapons' worth of parts and value, made in CRATE.minutes × one weapon's time. */
export const CRATE = { units: 5, minutes: 3, minOrder: 5, maxOrder: 50 };
/** recipe id → [weapon item, plural name, single value, family] */
const CRATED = {
  pistol: ['item_pistol', '9mm Pistols', 140, 'small'],
  smg: ['item_smg', 'Submachine Guns', 260, 'small'],
  shotgun: ['item_shotgun', 'Pump Shotguns', 220, 'small'],
  assault: ['item_assault_rifle', 'Assault Rifles', 480, 'small'],
  sniper: ['item_sniper_rifle', 'Sniper Rifles', 650, 'small'],
  lmg: ['item_lmg', 'Light Machine Guns', 800, 'small'],
  rpg: ['item_rpg', 'RPG Launchers', 900, 'heavy'],
  rpg_rocket: ['item_rpg_rocket', 'RPG Rockets', 220, 'heavy'],
  guided: ['item_missile_guided', 'Skylance Missiles', 2600, 'missile'],
  cruise: ['item_missile_cruise', 'Longbow Cruise Missiles', 9000, 'missile'],
  drone_attack: ['item_drone_attack', 'Hornet Drones', 1600, 'drone'],
  drone_strike: ['item_drone_strike', 'Kestrel Drones', 5200, 'drone'],
};
export const CRATE_ITEMS = Object.fromEntries(Object.entries(CRATED).map(([rid, [weapon, plural, value, family]]) => [`item_crate_${rid}`, {
  name: `Crate of ${plural}`, category: 'arms_crate', price: 0, tags: ['arms', 'crate'], icon: 'crate',
  arms: { value: value * CRATE.units, family, crate: true, contains: weapon },
  description: `A stencilled export crate: one standard lot of ${plural.toLowerCase()}. Sold to countries by the crate (orders of ${CRATE.minOrder}–${CRATE.maxOrder}).`,
}]));

// v0.19.0: the weapon recipes make whole crates (same ids, so stations already set to them carry on)
for (const rid of Object.keys(CRATED)) {
  const r = ARMS_RECIPES[rid];
  ARMS_RECIPES[rid] = { ...r, in: Object.fromEntries(Object.entries(r.in).map(([id, n]) => [id, n * CRATE.units])), out: `item_crate_${rid}`, minutes: r.minutes * CRATE.minutes, single: r.out };
}

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
export const WHOLESALE = { share: 0.5, dailyBudget: 15000 };

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

/**
 * The fictional countries on the terminal's globe, and their economies (v0.14).
 * budget/income in obols; wants: price multiplier by weapon family;
 * aggression: daily chance factor of starting a war with a rival.
 */
export const COUNTRIES = {
  varn: { name: 'Varnistan', color: '#e8a24a', lat: 38, lon: 52, budget: 240000, income: 18000, wants: { small: 1.2, heavy: 1.0, missile: 0.8, drone: 0.8 }, aggression: 0.6, rivals: ['caldera', 'ostmark'], blurb: 'A mountain republic that has been "about to have elections" for nineteen years.' },
  ostmark: { name: 'The Ostmark Union', color: '#7aa8e8', lat: 54, lon: 18, budget: 480000, income: 36000, wants: { small: 0.9, heavy: 1.0, missile: 1.3, drone: 1.2 }, aggression: 0.3, rivals: ['varn', 'sund'], blurb: 'Seven provinces, one parliament, eight opinions.' },
  caldera: { name: 'Republic of Caldera', color: '#e86a5a', lat: -8, lon: 34, budget: 180000, income: 15000, wants: { small: 1.3, heavy: 1.2, missile: 0.9, drone: 0.7 }, aggression: 0.5, rivals: ['varn', 'pallas'], blurb: 'Built on a volcano. Politically, also built on a volcano.' },
  sund: { name: 'Kingdom of Sund', color: '#9ae87a', lat: 61, lon: -14, budget: 150000, income: 12000, wants: { small: 1.0, heavy: 0.8, missile: 1.0, drone: 1.1 }, aggression: 0.2, rivals: ['ostmark'], blurb: 'A fishing monarchy whose king is eleven and very serious.' },
  pallas: { name: 'Free State of Pallas', color: '#d87ae8', lat: 12, lon: -38, budget: 120000, income: 10800, wants: { small: 1.4, heavy: 1.3, missile: 0.6, drone: 0.6 }, aggression: 0.7, rivals: ['caldera', 'lirre'], blurb: 'Free, according to the name. A state, according to some. Under international embargo.' },
  teshvar: { name: 'Teshvar', color: '#e8d84a', lat: 28, lon: 96, budget: 720000, income: 48000, wants: { small: 0.8, heavy: 1.0, missile: 1.5, drone: 1.4 }, aggression: 0.4, rivals: ['morrow'], blurb: 'Desert oil sheikdom; its sheikh owns a yacht shaped like a smaller yacht.' },
  morrow: { name: 'Morrow Isles', color: '#4ad8c8', lat: -32, lon: 148, budget: 210000, income: 18000, wants: { small: 1.0, heavy: 1.1, missile: 1.2, drone: 1.3 }, aggression: 0.5, rivals: ['teshvar'], blurb: 'Two hundred islands, two hundred navies.' },
  lirre: { name: 'Grand Duchy of Lirre', color: '#c8c8e8', lat: 46, lon: -72, budget: 360000, income: 24000, wants: { small: 1.0, heavy: 1.0, missile: 1.0, drone: 1.0 }, aggression: 0.05, rivals: [], blurb: 'Neutral. Aggressively, belligerently neutral. Buys from everyone.' },
};
/** Where your shipments leave from on the globe. */
export const HQ = { name: 'Halvermouth', lat: 49, lon: -30 };

/** Shipping companies (v0.14). fee: share of cargo value; reliability: chance it arrives; embargo: will run embargoed cargo (embargoRisk: extra chance of seizure). */
export const SHIPPERS = {
  halver: { name: 'Halver Freight & Sons', fee: 0.06, reliability: 0.72, days: 3, embargo: false, blurb: 'Cheap, slow, and their ships are older than their captains.' },
  morrow: { name: 'Morrow Blue Line', fee: 0.1, reliability: 0.88, days: 2, embargo: false, blurb: 'Respectable container line. Asks to see paperwork. Usually reads it.' },
  stork: { name: 'Stork Air Charter', fee: 0.22, reliability: 0.96, days: 1, embargo: false, blurb: 'Overnight air freight. Expensive and almost never lost.' },
  pipecreek: { name: 'Pipecreek Logistics', fee: 0.15, reliability: 0.82, days: 4, embargo: true, embargoRisk: 0.25, blurb: 'Lucas\'s cousin. Doesn\'t ask questions. Doesn\'t answer them either.' },
  ghost: { name: 'Ghost Fleet', fee: 0.3, reliability: 0.86, days: 3, embargo: true, embargoRisk: 0.12, blurb: 'Ships with no names and captains with several. Embargo runs a speciality.' },
};

export const MARKET = {
  /** Price boost per family while a country is at war. */
  warMult: { small: 1.5, heavy: 2, missile: 2.5, drone: 2.2 },
  /** Each unit sold to a country lowers what it pays for that family (recovers 30% a day). */
  saturationPerUnit: 0.012, // per crate (v0.19.0) saturationMax: 0.6, saturationDecay: 0.3,
  insuranceRate: 0.08, insurancePayout: 0.6,
  /** A country this hostile won't buy from you; hostility fades 5 a day. */
  refuseHostility: 60,
  minWarDays: 5, warEndChance: 0.15, warStartChance: 0.05, embargoOnAggressor: 0.4,
  initialWars: [['varn', 'caldera']],
  initialEmbargoes: ['pallas'],
};
