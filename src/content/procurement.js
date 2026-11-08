// What the company can hold and where it comes from (v0.99.0): pure data. Prices are starting figures to calibrate (docs/PROPOSAL_WAR_ARMOURY.md), set against the Aerospace ladder
// (fighters 210,000 to 2,600,000 obols). Three ways to get something, and only three:
//   works     made at the company's own tank factory or helicopter works (src/content/production.js): tanks and helicopters ONLY
//   bought    from a supplier, paid by the company: carriers, recon, artillery, anti-air, logistics, medical and engineer vehicles, and the supplies (uniforms, medicine, spares, parts)
//   transfer  moved free from your other companies: stored military aircraft from Aerospace, guns, ammunition, rockets, missiles and drones from the Arms works (never built here)
// Only eras 1 and 2 exist; era 3 (hover, stealth, laser) is future research. Perks and abilities are written on the cards in the proposal and do nothing yet.

/** Armour, firepower, speed and capacity, 1 to 5 (the four bars the combat rules will read). */
const V = (id, name, cls, source, era, price, bars, text) => ({ id, name, class: cls, source, era, price, armour: bars[0], firepower: bars[1], speed: bars[2], capacity: bars[3], text });

export const VEHICLE_CLASSES = {
  tank: 'Battle tank', helicopter: 'Helicopter', carrier: 'Armoured carrier', recon: 'Recon', artillery: 'Artillery', antiair: 'Anti-air', logistics: 'Logistics', medical: 'Medical and engineers',
};

export const VEHICLES = Object.fromEntries([
  // ---- built at the company's own works (price is the whole cost of one: the fee plus the parts, see production.js)
  V('lancer', 'Lancer light tank', 'tank', 'works', 1, 380000, [2, 2, 4, 2], 'Quick and cheap: a gun that will stop a truck and not much else.'),
  V('anvil', 'Anvil Mk1 tank', 'tank', 'works', 1, 560000, [3, 3, 3, 3], 'The company\'s main tank: fires on the move at a price in accuracy.'),
  V('hound', 'Hound tank destroyer', 'tank', 'works', 2, 720000, [2, 5, 3, 2], 'A long gun on a low hull: out-ranges tanks.'),
  V('breacher', 'Breacher dozer tank', 'tank', 'works', 2, 690000, [4, 2, 2, 3], 'A plough and a short gun: pushes through rubble and light walls.'),
  V('cinder', 'Cinder assault tank', 'tank', 'works', 2, 780000, [4, 4, 2, 3], 'Heavy, with a flame projector for buildings.'),
  V('bulwark', 'Bulwark heavy tank', 'tank', 'works', 2, 840000, [5, 4, 2, 3], 'Frontal plate that ignores the first hit.'),
  V('wren', 'Wren scout helicopter', 'helicopter', 'works', 1, 450000, [1, 1, 5, 1], 'Two seats and a camera: the eyes of a column.'),
  V('drover', 'Drover transport helicopter', 'helicopter', 'works', 1, 620000, [2, 1, 4, 5], 'Carries a squad.'),
  V('mercy', 'Mercy medevac helicopter', 'helicopter', 'works', 1, 700000, [2, 1, 4, 4], 'Takes the wounded to a hospital before they stop being wounded.'),
  V('viper', 'Viper attack helicopter', 'helicopter', 'works', 2, 980000, [2, 5, 4, 1], 'Rockets and a chin gun.'),
  V('ox', 'Ox heavy-lift helicopter', 'helicopter', 'works', 2, 1100000, [3, 1, 3, 5], 'Lifts a vehicle or a hundred crates.'),
  V('talon', 'Talon gunship', 'helicopter', 'works', 2, 1350000, [3, 5, 4, 3], 'An attack helicopter with armour and a cabin of riflemen.'),
  // ---- v0.103.8: the future vehicles, open only through the company's research (era 3: hover drives; era 4: heavy hover platforms)
  V('aegis', 'Aegis hover tank', 'tank', 'works', 3, 2000000, [3, 4, 4, 3], 'Hovers: crosses water, rubble and mud at full speed. An energy shield absorbs the next seconds of fire.'),
  V('shade', 'Shade stealth recon helicopter', 'helicopter', 'works', 3, 1500000, [1, 2, 5, 1], 'Almost silent; hard to see or lock on to. Invisible while it hovers.'),
  V('citadel', 'Citadel heavy hover tank', 'tank', 'works', 4, 2600000, [5, 5, 3, 3], 'A fusion-powered hover tank with twin energy guns and a heavy shield.'),
  V('tempest', 'Tempest energy gunship', 'helicopter', 'works', 4, 2500000, [3, 5, 5, 2], 'A stealthed gunship with energy cannon and plasma pods; carries two.'),
  // ---- bought from suppliers
  V('marten', 'Marten light carrier', 'carrier', 'bought', 1, 140000, [2, 1, 4, 3], 'Carries four, protects them from rifles.'),
  V('wolf', 'Wolf APC', 'carrier', 'bought', 1, 220000, [3, 1, 3, 4], 'A squad and a machine gun.'),
  V('badger', 'Badger IFV', 'carrier', 'bought', 2, 340000, [3, 3, 3, 4], 'Carries a squad and fires a gun while they stay inside.'),
  V('mule', 'Mule heavy carrier', 'carrier', 'bought', 2, 410000, [4, 1, 2, 5], 'A slab of armour on wheels.'),
  V('buggy', 'Scout buggy', 'recon', 'bought', 1, 40000, [1, 1, 5, 1], 'Fast, open and very easy to hit.'),
  V('armoured_car', 'Armoured car', 'recon', 'bought', 2, 120000, [2, 2, 5, 2], 'A light cannon and a radio.'),
  V('sensor_van', 'Sensor van', 'recon', 'bought', 2, 160000, [1, 1, 3, 2], 'Sees further than anyone else on the road.'),
  V('thump', 'Thump mortar carrier', 'artillery', 'bought', 1, 150000, [1, 3, 3, 2], 'Drops shells over a hill.'),
  V('hammer', 'Hammer self-propelled gun', 'artillery', 'bought', 2, 520000, [2, 5, 3, 2], 'A gun that moves after it fires.'),
  V('rainmaker', 'Rainmaker rocket launcher', 'artillery', 'bought', 2, 480000, [2, 5, 3, 2], 'Twelve rockets over a field: for an enemy that stands together. Needs a designated point.'),
  V('longbow', 'Longbow missile launcher', 'artillery', 'bought', 2, 650000, [2, 5, 2, 1], 'Fires the Arms works\' missiles from the stores, from far back. Needs a designated point.'),
  V('howitzer', 'Siege howitzer', 'artillery', 'bought', 2, 600000, [1, 5, 1, 2], 'For walls.'),
  V('skyguard', 'Skyguard twin gun', 'antiair', 'bought', 1, 190000, [1, 3, 3, 1], 'Two barrels pointed at the sky.'),
  V('falconer', 'Falconer missile AA', 'antiair', 'bought', 2, 410000, [2, 4, 3, 1], 'Missiles for aircraft that think they are safe.'),
  V('whirl', 'Whirl gatling', 'antiair', 'bought', 2, 360000, [2, 4, 3, 1], 'A wall of small shells.'),
  V('supply_truck', 'Supply truck', 'logistics', 'bought', 1, 45000, [1, 0, 3, 5], 'Food, ammunition and spares.'),
  V('fuel_tanker', 'Fuel tanker', 'logistics', 'bought', 1, 60000, [1, 0, 2, 5], 'Do not hit it.'),
  V('ammo_carrier', 'Ammo carrier', 'logistics', 'bought', 2, 90000, [1, 0, 3, 5], 'Shells for the guns.'),
  V('command_vehicle', 'Command vehicle', 'logistics', 'bought', 2, 180000, [2, 0, 3, 2], 'Maps, radios and a table.'),
  V('recovery', 'Recovery vehicle', 'logistics', 'bought', 2, 130000, [2, 0, 2, 2], 'Tows what is left.'),
  V('ambulance', 'Medevac ambulance', 'medical', 'bought', 1, 70000, [1, 0, 4, 3], 'A stretcher and a driver who does not stop.'),
  V('field_hospital', 'Field hospital', 'medical', 'bought', 2, 260000, [1, 0, 1, 4], 'Tents, a generator and a surgeon.'),
  V('bridgelayer', 'Bridgelayer', 'medical', 'bought', 2, 220000, [2, 0, 2, 2], 'Spans a ditch in a minute.'),
  V('mine_sweeper', 'Mine sweeper', 'medical', 'bought', 2, 190000, [3, 0, 2, 2], 'A flail and a brave crew.'),
  V('repair_crane', 'Repair crane', 'medical', 'bought', 2, 150000, [2, 0, 2, 2], 'Lifts engines out of vehicles.'),
  // v0.103.8: bought once researched
  V('ghost', 'Ghost stealth carrier', 'carrier', 'bought', 3, 950000, [2, 0, 5, 3], 'Hard to detect; hovers over water. Cloak: invisible until it fires or stops.'),
  V('dronecar', 'Drone carrier', 'recon', 'bought', 3, 480000, [1, 1, 3, 2], 'Launches three scout drones that mark everything in an area.'),
  V('skimmer', 'Skimmer scout', 'recon', 'bought', 3, 260000, [0, 1, 5, 1], 'Skims over anything; seen only up close.'),
  V('longshot', 'Longshot SAM', 'antiair', 'bought', 3, 900000, [1, 5, 2, 1], 'Reaches strategic bombers; two missiles per target.'),
  V('lance', 'Lance laser anti-air', 'antiair', 'bought', 3, 1200000, [2, 4, 4, 1], 'Never runs out of ammunition; heats up. Overcharge doubles its damage for a few seconds.'),
  V('warden', 'Warden shield carrier', 'carrier', 'bought', 4, 1600000, [4, 2, 3, 5], 'A heavy hover carrier under an energy shield: the safest way to bring a squad to a fight.'),
].map((v) => [v.id, v]));

/** The classes the company never builds and never buys here: they come from your other companies or not at all. */
export const NEVER_BUILT = ['aircraft', 'missile', 'gun', 'ship', 'satellite'];

/**
 * What a supplier sells by the unit. `store` is how many places in the stores one unit takes (1 each). `parts` are what the tank factory and helicopter works consume
 * (src/content/production.js). Prices in obols.
 */
export const SUPPLIES = {
  uniform: { name: 'Uniform and kit', price: 90, group: 'issue', text: 'Boots, a vest and a helmet.' },
  radio: { name: 'Field radio', price: 260, group: 'issue', text: 'Two kilometres on a good day.' },
  medicine: { name: 'Medical supplies', price: 140, group: 'issue', text: 'Bandages, morphine and a lot of tape.' },
  plate_carrier: { name: 'Plate carrier', price: 1800, group: 'issue', text: 'Plates, night-vision helmet and knee pads: armour era 2.' },
  hardsuit: { name: 'Phalanx hardsuit', price: 14000, group: 'issue', tech: { armourEra: 3 }, text: 'A sealed shell with a sensor visor: armour era 3. Researched.' },
  power_armour: { name: 'Bastion power armour', price: 60000, group: 'issue', tech: { armourEra: 4 }, text: 'Powered plate and a reactor pack: armour era 4. Researched; very costly.' },
  rations: { name: 'Rations (a day for one)', price: 6, group: 'issue', text: 'Food that keeps.' },
  spares: { name: 'Vehicle spares', price: 450, group: 'issue', text: 'Filters, belts and track links.' },
  fuel: { name: 'Fuel (a drum)', price: 180, group: 'issue', text: 'Diesel by the drum.' },
  plate: { name: 'Armour plate', price: 6000, group: 'part', text: 'Rolled steel armour, cut to the tank factory\'s patterns.' },
  engine: { name: 'Engine', price: 90000, group: 'part', text: 'A diesel for a tank, a turboshaft for a helicopter: sold as one line, fitted by the works.' },
  optics: { name: 'Optics and sights', price: 22000, group: 'part', text: 'Gun sights, periscopes and a camera.' },
  rotor: { name: 'Rotor set', price: 48000, group: 'part', text: 'Blades, hub and gearbox.' },
  avionics: { name: 'Avionics', price: 36000, group: 'part', text: 'Radios, instruments and a flight computer.' },
  core: { name: 'Power core', price: 120000, group: 'part', tech: { vehicleEra: 3 }, text: 'A compact reactor for a hover drive: sold to the works by Teshvar once the company has researched hover drives.' },
  hardpoint: { name: 'Weapon mounts', price: 14000, group: 'part', text: 'Pylons, rails and a ring for a gun.' },
};

/** The Arms works items the company may take: whatever its recipes make that is a weapon, a round, a missile or a drone. (Parts and machines never move.) */
export const ARMS_TRANSFERABLE = ['item_pistol', 'item_smg', 'item_shotgun', 'item_assault_rifle', 'item_sniper_rifle', 'item_lmg', 'item_rpg', 'item_rpg_rocket', 'item_missile_guided', 'item_missile_cruise', 'item_drone_attack', 'item_drone_strike', 'item_artillery_shell', 'item_breach_charge'];

/** What a transfer leaves behind: the trail (never money) keeps this many entries. */
export const TRANSFER_LOG = 80;

/**
 * The supply link (v0.103.2): the company keeps standing levels of what the Arms works make. The works ships what its export cage holds toward each level every morning, free (it is
 * your own company's stock moving, not a sale). What the works cannot keep up with can be bought from other manufacturers at `markup` times the item's value, arriving in `days` days.
 * `max` is the highest level that can be asked for; `flowDays` is how long the weekly figures run.
 */
export const LINK = { markup: 1.4, days: 2, max: 999, flowDays: 7, maxLog: 30 };
