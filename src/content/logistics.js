// Ober & Sons Maritime (v0.21.0): the shipping company Captain Ober sells
// you. Every tunable number for the logistics business lives here — prices,
// ships, ports, contracts, time and wear — so balance is changed in one place.
// See docs/LOGISTICS.md, docs/SHIPS.md and docs/PORTS.md.
//
// Ports and ships have permanent ids (never rename them: saves refer to them).

/** The company, the rules and the clock. */
export const LOGISTICS = {
  company: 'Ober & Sons Maritime',
  seller: 'npc_ober', // works whether or not he's in the content (the sale is a system, not a dialogue)
  price: 40000,
  starterPorts: ['port_millroad', 'port_sund', 'port_lirre'],
  starterShip: { model: 'gullwing_cutter', name: 'Gullwing Lass', port: 'port_millroad' },
  homePort: 'port_millroad',
  maxPorts: 30,
  physicalBerths: 3, // the Yards docks show three owned ports' berths (pick which)
  /** Real voyage hours = km ÷ (knots × 1.852) ÷ seaTime: compressed so the far side of the world is days, not weeks. */
  seaTime: 6,
  loadHoursBase: 2, loadHoursPerUnit: 0.04,
  /** Condition lost per 1,000 km sailed (× the ship's wear); repairs cost a share of the ship's price per point. */
  wearPerKkm: 1.6, repairPerPoint: 0.0015, minSailCondition: 25,
  /** Delay chance per 1,000 km = (1 − reliability) × this, more when worn; each delay adds 6–18 hours. */
  delayPerKkm: 0.35, delayHours: [6, 18],
  /** Contracts: how many each owned port offers a day, how long an offer stands, late rules. */
  contractsPerPort: 2, maxAvailable: 14, offerDays: 2, lateGraceDays: 2, latePenaltyPerDay: 0.15, failPenalty: 0.1, cancelPenalty: 0.1,
  /** A ship's own daily upkeep is charged at 06:00 with the ports'; unpaid upkeep becomes arrears and holds sailings. */
  upkeepHour: 6,
  /** v0.22.0 — arms exports in your own ships: they load from the cages at Mill Road Docks; an embargo run is seized by customs with this chance (rolled at departure). */
  armsPort: 'port_millroad', armsLoadHoursPerCrate: 0.25, ownEmbargoSeizure: 0.22,
  /** v0.23.0 — missions: offers per owned port a day, how many on offer at once, up to how many ships per mission. */
  missionsPerPort: 1, maxMissions: 6, missionShips: 3, missionOfferDays: 3,
};

/** Port types: what they berth, cost and charge. maxSize is the largest ship size (1–4) that fits; foreign ships pay `fee` per call. */
export const PORT_TYPES = {
  harbor: { name: 'Basic harbour', berths: 3, maxSize: 2, price: 9000, upkeep: 40, fee: 120, services: ['berths'] },
  commercial: { name: 'Commercial port', berths: 5, maxSize: 3, price: 26000, upkeep: 110, fee: 320, services: ['berths', 'repairs', 'reefer power'] },
  heavy: { name: 'Heavy cargo terminal', berths: 6, maxSize: 4, price: 60000, upkeep: 260, fee: 700, services: ['berths', 'repairs', 'reefer power', 'heavy cranes'] },
  naval: { name: 'Naval base', berths: 5, maxSize: 4, price: 52000, upkeep: 230, fee: 600, services: ['berths', 'repairs', 'armoury'] },
  advanced: { name: 'Advanced port', berths: 8, maxSize: 4, price: 150000, upkeep: 520, fee: 1200, services: ['berths', 'repairs', 'reefer power', 'heavy cranes', 'advanced dock'] },
};

/**
 * The world's ports (lat/lon on the globe; the coast is found automatically).
 * country: one of the arms market's countries, or null for a free port.
 * local: on Halvermouth's own coast.
 */
const port = (name, lat, lon, country, type, o = {}) => ({ name, lat, lon, country, type, ...o });
export const PORTS = {
  // home waters
  port_millroad: port('Mill Road Docks, Halvermouth', 51, -25, null, 'commercial', { local: true, blurb: 'Ober & Sons\' home berth on the south quay of Mill Road Yards. Rust, gulls, and the best fish-and-chip van on the coast.' }),
  port_lanternside: port('Lanternside Quay', 49, -24, null, 'harbor', { local: true, blurb: 'A stone quay under the lighthouse. Small boats, big opinions.' }),
  port_gullwing: port('Gullwing Point', 47, -22, null, 'harbor', { local: true, blurb: 'A breakwater, a crane and a café that has been "opening soon" since the crane arrived.' }),
  // Kingdom of Sund
  port_sund: port('Sund Harbour', 52, -4, 'sund', 'harbor', { blurb: 'Fishing boats, a royal yacht with stabilisers, and herring everywhere.' }),
  port_kingsfjord: port('Kingsfjord', 72, -6, 'sund', 'commercial', { blurb: 'A deep fjord where the young king reviews the fishing fleet every Monday.' }),
  // Grand Duchy of Lirre
  port_lirre: port('Port Lirre', 36, -78, 'lirre', 'commercial', { blurb: 'Neutral waters, neutral harbourmaster, neutral coffee.' }),
  port_lirre_north: port('Duchess Bay', 57, -66, 'lirre', 'harbor', { blurb: 'A pretty harbour with a customs house that is also a museum about customs.' }),
  // The Ostmark Union
  port_ostmark: port('Ostmark Gate', 51, 1, 'ostmark', 'heavy', { blurb: 'Seven provinces\' worth of cranes. They are all slightly different colours.' }),
  port_ostmark_naval: port('Seventh Province Naval Yard', 63, 32, 'ostmark', 'naval', { blurb: 'Grey ships, grey sheds, grey paperwork in triplicate.' }),
  port_ostmark_east: port('Halden Roads', 49, 32, 'ostmark', 'commercial', { blurb: 'A busy roadstead where everybody queues politely.' }),
  // Varnistan
  port_varn: port('Port Varn', 45, 40, 'varn', 'commercial', { blurb: 'The republic\'s only real port. The election posters are nineteen years old.' }),
  port_varn_south: port('Kestrel Landing', 33, 64, 'varn', 'harbor', { blurb: 'A small military-ish harbour below the Kestrel Pass.' }),
  // Republic of Caldera
  port_caldera: port('Caldera Bay', -3, 44, 'caldera', 'commercial', { blurb: 'A harbour in a flooded crater. The water is warm. Suspiciously warm.' }),
  port_caldera_west: port('Ashport', -16, 27, 'caldera', 'harbor', { blurb: 'Everything is grey, including the tea.' }),
  // Free State of Pallas
  port_pallas: port('Pallas Free Harbour', 15, -27, 'pallas', 'harbor', { blurb: '"Free" harbour. Several flags, one crane, many questions.' }),
  port_pallas_south: port('Coup Cove', 1, -39, 'pallas', 'harbor', { blurb: 'Named after the last government. And the one before.' }),
  // Teshvar
  port_teshvar: port('Teshvar Oil Terminal', 33, 84, 'teshvar', 'heavy', { blurb: 'Tankers the size of towns, and the sheikh\'s yacht-shaped yacht.' }),
  port_teshvar_gold: port('Golden Quay', 18, 102, 'teshvar', 'advanced', { blurb: 'Gold-leaf bollards and dockers in sunglasses. The price list is in gold leaf too.' }),
  // Morrow Isles
  port_morrow: port('Morrow Main Harbour', -30, 136, 'morrow', 'commercial', { blurb: 'Two hundred islands share one harbour master. He is very tired.' }),
  port_morrow_naval: port('Isle of Navies', -39, 159, 'morrow', 'naval', { blurb: 'Every island\'s navy moors here. Every navy has an admiral. There are no sailors left.' }),
  port_morrow_reef: port('Reef Town', -24, 156, 'morrow', 'harbor', { blurb: 'Turquoise water, coral, and a smuggling museum run by retired smugglers.' }),
  // free ports and the rest of the world
  port_westreach: port('Westreach', 33, -150, null, 'commercial', { blurb: 'A free port on the far western coast. Everything costs more and arrives later.' }),
  port_coldwater: port('Coldwater', 42, -168, null, 'harbor', { blurb: 'Icebergs in summer. The harbour cat has a coat.' }),
  port_sunmouth: port('Sunmouth', 12, -126, null, 'heavy', { blurb: 'An equatorial megaport where the cranes never stop and the sun never sets (it does; they just don\'t notice).' }),
  port_marrow: port('Marrow Strait', -21, -132, null, 'harbor', { blurb: 'A narrow strait with a lighthouse keeper who charges by the look.' }),
  port_capelow: port('Cape Low', -36, -93, null, 'commercial', { blurb: 'The bottom of the western continent: storms, ropes and stories.' }),
  port_greyhook: port('Greyhook', -48, -72, null, 'naval', { blurb: 'A cold, quiet naval anchorage. Nobody admits who it belongs to.' }),
  port_southwind: port('Southwind Isle', -54, -6, null, 'harbor', { blurb: 'A rock, a hut, a pier. The pier is new.' }),
  port_meridian: port('Meridian Free Port', -20, 64, null, 'advanced', { blurb: 'A gleaming free port on the meridian line. Its dock robots have union representation.' }),
  port_coral: port('Coral Sound', -36, 116, null, 'harbor', { blurb: 'A sound full of coral and a harbour full of sound.' }),
  port_eastwatch: port('Eastwatch', 60, 130, null, 'commercial', { blurb: 'The northern route\'s last stop before the ice.' }),
  port_frostbay: port('Frostbay', 75, -100, null, 'harbor', { blurb: 'Open three months a year. The other nine, it is a skating rink.' }),
  port_oldmoor: port('Oldmoor', 63, -62, null, 'harbor', { blurb: 'A fog-bound fishing town where every boat is called Mary.' }),
  port_dunmere: port('Dunmere', 21, -6, null, 'commercial', { blurb: 'A crossroads harbour between the continents. Everybody passes through; nobody admits to staying.' }),
};

/**
 * Cargo ship classes: size gates which ports berth them; wear multiplies hull
 * wear; slots are upgrade potential (used by the shipyard in a later update).
 */
export const CARGO_CLASSES = {
  low: { name: 'Low End', size: 1, wear: 1.2, slots: 1, combat: { attack: 0, defense: 5, detection: 10, stealth: 15, mounts: 0 } },
  medium: { name: 'Medium End', size: 2, wear: 1.0, slots: 2, combat: { attack: 0, defense: 10, detection: 15, stealth: 10, mounts: 0 } },
  high: { name: 'High End', size: 3, wear: 0.8, slots: 3, combat: { attack: 0, defense: 15, detection: 20, stealth: 5, mounts: 0 } },
  superhigh: { name: 'Super High End', size: 4, wear: 0.7, slots: 4, combat: { attack: 0, defense: 20, detection: 25, stealth: 0, mounts: 0 } },
  futuristic: { name: 'Futuristic', size: 3, wear: 0.4, slots: 5, needsPortType: 'advanced', combat: { attack: 0, defense: 30, detection: 60, stealth: 40, mounts: 0 } },
};

/**
 * The cargo ship catalogue sold at the dealership. capacity in cargo units
 * (an arms crate is one unit); speed in knots; range in km per voyage;
 * reliability 0–1 (delays); opex obols per day at sea; upkeep per day in port.
 * tags: what contracts they can take (reefer, heavy, bulk, container, express, advanced).
 * look: how it's drawn (hull silhouette and colours; the shipyard will let you choose).
 */
const ship = (name, cls, o) => ({ name, kind: 'cargo', cls, ...o });
export const CARGO_SHIPS = {
  gullwing_cutter: ship('Gullwing Cutter', 'low', { price: 6000, capacity: 20, speed: 13, range: 10000, reliability: 0.9, opex: 70, upkeep: 15, tags: [], blurb: 'A stubby little coaster. Cheap to run, cheap to buy, cheap-looking. Captain Ober learned to sail on one.', look: { hull: 'coaster', color: '#3a6a8a', trim: '#e8e2d4', len: 3 } }),
  tide_runner: ship('Tide Runner', 'low', { price: 8500, capacity: 14, speed: 22, range: 7000, reliability: 0.86, opex: 95, upkeep: 18, tags: ['express'], blurb: 'Small, fast, and loud. For urgent parcels and people who like spray.', look: { hull: 'runner', color: '#c0402a', trim: '#f2f0ea', len: 3 } }),
  lantern_coaster: ship('Lantern Coaster', 'low', { price: 9500, capacity: 28, speed: 12, range: 12000, reliability: 0.97, opex: 80, upkeep: 18, tags: [], blurb: 'Built in Lanternside, maintained by people who love it. Never late, never quick.', look: { hull: 'coaster', color: '#2f6b4f', trim: '#e8c35a', len: 3.4 } }),
  westbrook_freighter: ship('Westbrook Freighter', 'medium', { price: 22000, capacity: 60, speed: 15, range: 17000, reliability: 0.92, opex: 180, upkeep: 40, tags: ['heavy'], blurb: 'The general-purpose workhorse of the coast. Boring in the best way.', look: { hull: 'freighter', color: '#4a4a52', trim: '#c9a24a', len: 4.5 } }),
  bluecap_container: ship('Bluecap Container Ship', 'medium', { price: 27000, capacity: 75, speed: 17, range: 18000, reliability: 0.9, opex: 210, upkeep: 45, tags: ['container'], blurb: 'Neat stacks of coloured boxes, a blue cap on the bridge. Moves general cargo efficiently.', look: { hull: 'container', color: '#2a4a8a', trim: '#f2f0ea', len: 5 } }),
  morrow_reefer: ship('Morrow Reefer', 'medium', { price: 30000, capacity: 45, speed: 18, range: 17000, reliability: 0.91, opex: 230, upkeep: 55, tags: ['reefer'], blurb: 'Refrigerated holds for fish, fruit and anything else that sulks when warm.', look: { hull: 'freighter', color: '#e8e2d4', trim: '#4ad8c8', len: 4.5 } }),
  iron_quay_carrier: ship('Iron Quay Carrier', 'high', { price: 68000, capacity: 140, speed: 16, range: 24000, reliability: 0.93, opex: 420, upkeep: 90, tags: ['heavy', 'container'], blurb: 'A heavy-lift carrier with its own cranes. Machinery, turbines, the odd locomotive.', look: { hull: 'heavylift', color: '#8a3a32', trim: '#e8c35a', len: 6 } }),
  longshore_bulk: ship('Longshore Bulk Carrier', 'high', { price: 61000, capacity: 180, speed: 13, range: 26000, reliability: 0.94, opex: 380, upkeep: 85, tags: ['bulk'], blurb: 'A long, low hull full of grain, ore or gravel. Slow as a wet week; holds a mountain.', look: { hull: 'bulk', color: '#3a4a3a', trim: '#c9c6bd', len: 6.5 } }),
  grand_meridian: ship('Grand Meridian Superfreighter', 'superhigh', { price: 165000, capacity: 420, speed: 18, range: 40000, reliability: 0.95, opex: 980, upkeep: 220, tags: ['heavy', 'container', 'bulk'], blurb: 'A container city that floats. Needs a heavy terminal to berth. Enormous margins — if you can fill it.', look: { hull: 'container', color: '#1e2a3a', trim: '#d9c08a', len: 8 } }),
  starwake_advanced: ship('Starwake Advanced Freighter', 'futuristic', { price: 340000, capacity: 220, speed: 34, range: 80000, reliability: 0.99, opex: 520, upkeep: 160, tags: ['express', 'reefer', 'container', 'advanced'], blurb: 'Hydrofoil-lifted, fuel-cell driven, crewed by six and a very calm computer. Berths only at advanced ports.', look: { hull: 'starwake', color: '#e8eef4', trim: '#4ad8e8', len: 6 } }),
};

/** Fictional shipping clients (original). */
export const CLIENTS = {
  cl_halver_mills: { name: 'Halver Mills & Grain', blurb: 'Flour, feed and a very old family feud.' },
  cl_lantern_fish: { name: 'Lanternside Fish Co-op', blurb: 'Everything smells of herring, including the invoices.' },
  cl_oberoil: { name: 'Ober\'s Oil (spares division)', blurb: 'Sir Moneybucks\'s company. Pays on time; expects gratitude.' },
  cl_ostmark_turbine: { name: 'Ostmark Turbine Works', blurb: 'Seven factories, one turbine design, eight instruction manuals.' },
  cl_teshvar_luxe: { name: 'Teshvar Luxe Imports', blurb: 'Gold taps, marble cats, chandeliers for the sheikh\'s yacht\'s yacht.' },
  cl_morrow_fruit: { name: 'Morrow Isles Fruit Board', blurb: 'Two hundred islands, two hundred kinds of mango.' },
  cl_lirre_neutral: { name: 'Lirre Neutral Trading House', blurb: 'Buys from everyone, sells to everyone, judges no one.' },
  cl_sund_royal: { name: 'Royal Sund Provisioners', blurb: 'Supplies the palace. The king checks the inventory himself.' },
  cl_caldera_mining: { name: 'Caldera Mining Collective', blurb: 'Ore, sulphur and an alarming amount of dynamite paperwork.' },
  cl_meridian_tech: { name: 'Meridian Applied Sciences', blurb: 'Crates marked DO NOT TILT, DO NOT FREEZE, DO NOT ASK.' },
  cl_dunmere_post: { name: 'Dunmere Parcel Post', blurb: 'Late is their brand. They pay extra for anyone who isn\'t.' },
};

/**
 * Contract templates. rate: obols per unit per 1,000 km; base: flat fee (a busy Gullwing Cutter clears ~1,500 obols a day);
 * slack: deadline = time at 14 knots × slack (urgent is tight, bonus for early);
 * needs: a tag the ship must have. Risk isn't a label here: it comes from the route's water and the
 * cargo's value (RISK.cargoValue) — see src/systems/piracy.js.
 */
export const CONTRACT_TYPES = {
  general: { name: 'General merchandise', units: [8, 80], rate: 22, base: 600, slack: 1.7, needs: null, clients: ['cl_halver_mills', 'cl_lirre_neutral', 'cl_dunmere_post', 'cl_sund_royal'] },
  bulk: { name: 'Bulk materials', units: [60, 400], rate: 10, base: 1000, slack: 2.0, needs: null, minUnits: 60, clients: ['cl_halver_mills', 'cl_caldera_mining'] },
  machinery: { name: 'Machinery', units: [20, 160], rate: 32, base: 1400, slack: 1.7, needs: 'heavy', clients: ['cl_ostmark_turbine', 'cl_oberoil'] },
  reefer: { name: 'Refrigerated goods', units: [10, 60], rate: 36, base: 800, slack: 1.4, needs: 'reefer', clients: ['cl_lantern_fish', 'cl_morrow_fruit'] },
  urgent: { name: 'Urgent delivery', units: [4, 14], rate: 64, base: 1200, slack: 1.15, needs: null, earlyBonus: 0.2, clients: ['cl_dunmere_post', 'cl_oberoil', 'cl_meridian_tech'] },
  highvalue: { name: 'High-value freight', units: [6, 30], rate: 56, base: 1800, slack: 1.6, needs: null, clients: ['cl_teshvar_luxe', 'cl_lirre_neutral'] },
  special: { name: 'Specialised cargo', units: [10, 60], rate: 75, base: 3000, slack: 1.5, needs: 'advanced', clients: ['cl_meridian_tech'] },
};

// ======================================================================
// v0.23.0 — piracy, warships, escorts and naval missions
// ======================================================================

/**
 * Dangerous waters (lat/lon centre, radius km, danger 0–1). The arms market's
 * wars and embargoes add their own zones at the belligerents' main ports
 * (RISK.warZone / RISK.embargoZone) — the world's politics, not a second system.
 */
export const PIRATE_WATERS = {
  pz_pallas: { name: 'the Pallas Reach', lat: 8, lon: -36, radius: 1700, danger: 0.55, blurb: 'Free-State "coastguards" who charge tolls at gunpoint.' },
  pz_kestrel: { name: 'the Kestrel Narrows', lat: 12, lon: 46, radius: 1800, danger: 0.5, blurb: 'Deserters from both sides of the Kestrel war, with boats.' },
  pz_marrow: { name: 'Marrow Strait', lat: -20, lon: -132, radius: 1000, danger: 0.6, blurb: 'A narrow strait, a lighthouse, and the Marrow Brothers.' },
  pz_morrow: { name: 'the Morrow Shoals', lat: -28, lon: 150, radius: 1400, danger: 0.45, blurb: 'Two hundred islands, two hundred navies, several hundred pirates.' },
  pz_sunmouth: { name: 'the Sunmouth Approaches', lat: 6, lon: -122, radius: 1500, danger: 0.35, blurb: 'Busy, hot, and full of people who "fell off" cargo ships.' },
  pz_meridian: { name: 'the Meridian Gap', lat: -16, lon: 62, radius: 1300, danger: 0.3, blurb: 'Smugglers\' water. Mostly they just want to be left alone.' },
};

/** How voyage risk is worked out (see docs/LOGISTICS.md#piracy). */
export const RISK = {
  warZone: { radius: 1600, danger: 0.6 }, // round each warring country's main port
  embargoZone: { radius: 1200, danger: 0.4 }, // round an embargoed country's main port
  base: 0.008, // any voyage: a petty thief at a quay
  perDangerKkm: 0.09, // + this × (danger-weighted km ÷ 1,000)
  maxChance: 0.85,
  cargoValue: { highvalue: 1.4, arms: 1.3, special: 1.2 },
  /** Worst outcome allowed by the most dangerous water on the route: safe water never costs you a ship or a cargo. */
  severity: [[0.2, 'delay'], [0.5, 'cargo'], [1.01, 'captured']],
  guards: { defense: 25, costShare: 0.03, min: 200 },
  insurance: { rate: 0.06, payout: 0.6 },
  ransom: { share: 0.05, min: 1500 },
  outcomes: ['repelled', 'delay', 'ransom', 'cargo', 'captured'],
};

/**
 * Fleet bonuses (abilities): scope says where they apply; each applies once
 * however many ships carry it.
 *   fleet — every voyage   · port — voyages leaving the port where the ship is docked
 *   group — the convoy the ship escorts
 */
export const BONUSES = {
  fleet_comms: { name: 'Fleet communications', scope: 'fleet', escortStrength: 0.15, text: 'Escorts anywhere in your fleet coordinate: +15% escort strength.' },
  fleet_support: { name: 'Fleet support', scope: 'port', chance: -0.15, text: 'Voyages leaving the port where this ship is docked: −15% chance of trouble.' },
  fleet_shield: { name: 'Aegis network', scope: 'fleet', chance: -0.1, text: 'Every voyage you send: −10% chance of trouble.' },
  hazard_sensors: { name: 'Hazard sensors', scope: 'group', defense: 15, text: 'The convoy it escorts: +15 defence.' },
};

/** Warship classes (for the dealership's filters). */
export const WARSHIP_CLASSES = {
  sail: { name: 'Sail', blurb: 'Wind-driven: cheap to run, slow, romantic.' },
  modern: { name: 'Modern', blurb: 'Diesel, gas turbines and radar.' },
  historic: { name: 'Historic', blurb: 'Armour plate and enormous guns.' },
  futuristic: { name: 'Futuristic', blurb: 'Rare, specialised and eye-wateringly expensive.' },
};

/**
 * The warship catalogue (kind 'warship'). combat: attack, defense, detection,
 * stealth (0–100) and weapon mounts — the same numbers a future playable
 * encounter would read. capacity is 0 unless the hull really carries cargo.
 * size gates ports like cargo ships; needsPortType restricts berthing.
 */
const war = (name, family, o) => ({ name, kind: 'warship', cls: family, ...o });
export const WARSHIPS = {
  schooner: war('Schooner', 'sail', { price: 12000, capacity: 0, speed: 14, range: 8000, reliability: 0.9, opex: 60, upkeep: 15, size: 1, combat: { attack: 15, defense: 15, detection: 25, stealth: 30, mounts: 2 }, tags: ['coastal', 'escort'], bonuses: [], blurb: 'Light, cheap and handy along a coast. Two swivel guns and a lot of sail.', look: { hull: 'schooner', color: '#e8e2d4', trim: '#7a4a2a', len: 3.2 } }),
  brig: war('Brig', 'sail', { price: 30000, capacity: 8, speed: 12, range: 14000, reliability: 0.92, opex: 110, upkeep: 30, size: 2, combat: { attack: 25, defense: 30, detection: 25, stealth: 15, mounts: 6 }, tags: ['escort', 'patrol'], bonuses: [], blurb: 'Two masts, a dozen guns, good legs. Holds a little cargo below.', look: { hull: 'brig', color: '#2a2a2e', trim: '#c9a24a', len: 3.8 } }),
  galleon: war('Galleon', 'sail', { price: 90000, capacity: 40, speed: 9, range: 20000, reliability: 0.88, opex: 260, upkeep: 70, size: 3, combat: { attack: 30, defense: 40, detection: 20, stealth: 5, mounts: 16 }, tags: ['escort', 'patrol', 'transport'], bonuses: [], blurb: 'A floating castle with a real hold. Slow, imposing, and surprisingly useful.', look: { hull: 'galleon', color: '#6a3a1e', trim: '#e0b84a', len: 5.2 } }),
  manowar: war('Man-o\'-war', 'sail', { price: 180000, capacity: 15, speed: 10, range: 20000, reliability: 0.9, opex: 480, upkeep: 120, size: 3, combat: { attack: 55, defense: 60, detection: 30, stealth: 5, mounts: 40 }, tags: ['escort', 'patrol'], bonuses: [], blurb: 'Three gun decks of polished brass and bad temper. Pirates simply leave.', look: { hull: 'manowar', color: '#1e1a16', trim: '#e8c35a', len: 6 } }),
  skiff: war('Patrol Skiff', 'modern', { price: 7000, capacity: 0, speed: 30, range: 3000, reliability: 0.88, opex: 50, upkeep: 12, size: 1, combat: { attack: 10, defense: 8, detection: 20, stealth: 40, mounts: 1 }, tags: ['coastal', 'recon'], bonuses: [], blurb: 'A fast inflatable with a machine gun and no patience. Short legs.', look: { hull: 'skiff', color: '#3a4a3a', trim: '#e8e2d4', len: 1.8 } }),
  corvette: war('Corvette', 'modern', { price: 38000, capacity: 0, speed: 26, range: 9000, reliability: 0.92, opex: 160, upkeep: 40, size: 2, combat: { attack: 35, defense: 30, detection: 45, stealth: 30, mounts: 3 }, tags: ['escort', 'patrol', 'recon'], bonuses: [], blurb: 'The small, sensible warship. Patrols and escorts at a sensible price.', look: { hull: 'warship', color: '#6f7f8f', trim: '#2a3440', len: 3.6 } }),
  frigate: war('Frigate', 'modern', { price: 72000, capacity: 0, speed: 25, range: 16000, reliability: 0.94, opex: 260, upkeep: 65, size: 2, combat: { attack: 45, defense: 45, detection: 55, stealth: 20, mounts: 4 }, tags: ['escort', 'patrol'], bonuses: ['fleet_comms'], blurb: 'The all-rounder: escorts well, patrols well, and its radio room links the fleet.', look: { hull: 'warship', color: '#5a6a7a', trim: '#e8e2d4', len: 4.4 } }),
  destroyer: war('Destroyer', 'modern', { price: 150000, capacity: 0, speed: 32, range: 14000, reliability: 0.93, opex: 520, upkeep: 120, size: 3, combat: { attack: 70, defense: 60, detection: 60, stealth: 20, mounts: 6 }, tags: ['escort', 'patrol'], bonuses: [], blurb: 'Fast and hard-hitting. Expensive to run; very persuasive.', look: { hull: 'warship', color: '#4a5560', trim: '#c0402a', len: 5.2 } }),
  cruiser: war('Cruiser', 'modern', { price: 230000, capacity: 0, speed: 26, range: 30000, reliability: 0.95, opex: 700, upkeep: 170, size: 3, combat: { attack: 70, defense: 70, detection: 75, stealth: 10, mounts: 8 }, tags: ['escort', 'patrol', 'recon'], bonuses: ['fleet_support'], blurb: 'Long range and a command centre: the ships that leave its port sail safer.', look: { hull: 'warship', color: '#3e4a56', trim: '#e0b84a', len: 6 } }),
  battleship: war('Battleship', 'historic', { price: 320000, capacity: 0, speed: 18, range: 15000, reliability: 0.9, opex: 1200, upkeep: 300, size: 4, combat: { attack: 95, defense: 90, detection: 40, stealth: 0, mounts: 12 }, tags: ['escort'], bonuses: [], blurb: 'Nine big guns and a hull like a cliff. Slow, thirsty, blind as a bat — and terrifying.', look: { hull: 'battleship', color: '#5a5e64', trim: '#2a2a2e', len: 7.5 } }),
  sentinel: war('Starwatch Sentinel', 'futuristic', { price: 450000, capacity: 0, speed: 40, range: 60000, reliability: 0.99, opex: 600, upkeep: 160, size: 3, needsPortType: ['advanced', 'naval'], combat: { attack: 70, defense: 75, detection: 90, stealth: 85, mounts: 4 }, tags: ['escort', 'recon', 'patrol'], bonuses: ['hazard_sensors'], blurb: 'A low, black, angular escort that is mostly invisible and entirely awake.', look: { hull: 'starwake', color: '#1a1e24', trim: '#c83a4a', len: 5 } }),
  aegis: war('Aegis Bastion', 'futuristic', { price: 600000, capacity: 0, speed: 30, range: 60000, reliability: 0.99, opex: 800, upkeep: 220, size: 4, needsPortType: ['advanced', 'naval'], combat: { attack: 60, defense: 95, detection: 95, stealth: 30, mounts: 6 }, tags: ['escort', 'patrol'], bonuses: ['fleet_shield'], blurb: 'A fleet-defence platform whose sensor net protects every voyage you send.', look: { hull: 'starwake', color: '#d8dee6', trim: '#4a8ae8', len: 6.2 } }),
};

/**
 * Naval missions (offered at your ports). score weights say which combat
 * stats matter (normalised 0–100); difficulty is 0–1; hours on station;
 * reward in obols; needs: requirements; effect: what success does to the world.
 */
export const MISSION_TYPES = {
  patrol: { name: 'Coastal patrol', weights: { detection: 0.4, speed: 0.3, defense: 0.3 }, difficulty: [0.15, 0.45], hours: [24, 60], reward: [3000, 8000], needs: { tag: 'patrol' }, client: 'Port authority', text: 'Show the flag along the coast and report anything odd.' },
  deterrence: { name: 'Piracy deterrence', weights: { attack: 0.5, defense: 0.3, detection: 0.2 }, difficulty: [0.35, 0.75], hours: [36, 72], reward: [7000, 16000], needs: { tag: 'escort' }, effect: { suppress: 5 }, client: 'Shipping underwriters', text: 'Sweep the nearest pirate waters. Success halves their danger for five days.' },
  escort_hire: { name: 'Convoy escort (for hire)', weights: { defense: 0.5, attack: 0.3, speed: 0.2 }, difficulty: [0.25, 0.6], hours: [24, 48], reward: [4000, 11000], needs: { tag: 'escort' }, client: 'A merchant line', text: 'Shepherd someone else\'s freighters through bad water.' },
  distress: { name: 'Distress response', weights: { speed: 0.6, detection: 0.4 }, difficulty: [0.2, 0.55], hours: [12, 30], reward: [5000, 12000], needs: { minSpeed: 18 }, client: 'Maritime rescue', text: 'A ship is in trouble. Get there first.' },
  protection: { name: 'Port protection', weights: { defense: 0.6, attack: 0.4 }, difficulty: [0.1, 0.35], hours: [48, 96], reward: [3000, 7000], needs: { tag: 'escort' }, effect: { protect: 4 }, client: 'Your own harbourmaster', text: 'Guard the approaches. Success: voyages leaving this port face 30% less trouble for four days.' },
  recon: { name: 'Reconnaissance', weights: { detection: 0.5, stealth: 0.3, speed: 0.2 }, difficulty: [0.3, 0.65], hours: [18, 40], reward: [4000, 9000], needs: { tag: 'recon' }, client: 'An insurer who doesn\'t give their name', text: 'Find out what\'s really happening in the nearest dangerous water, unseen.' },
  transport: { name: 'Special transport', weights: { defense: 0.5, speed: 0.5 }, difficulty: [0.2, 0.5], hours: [24, 48], reward: [6000, 14000], needs: { capacity: 8 }, client: 'A delegation that prefers not to fly', text: 'Carry a small, important party safely. Needs room aboard (8+ units).' },
};
