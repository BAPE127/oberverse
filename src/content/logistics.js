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
};

/** Port types: what they berth, cost and charge. maxSize is the largest ship size (1–4) that fits; foreign ships pay `fee` per call. */
export const PORT_TYPES = {
  harbor: { name: 'Basic harbour', berths: 3, maxSize: 2, price: 9000, upkeep: 40, fee: 120, services: ['berths'] },
  commercial: { name: 'Commercial port', berths: 5, maxSize: 3, price: 26000, upkeep: 110, fee: 320, services: ['berths', 'repairs', 'reefer power'] },
  heavy: { name: 'Heavy cargo terminal', berths: 6, maxSize: 4, price: 60000, upkeep: 260, fee: 700, services: ['berths', 'repairs', 'reefer power', 'heavy cranes'] },
  naval: { name: 'Naval base', berths: 5, maxSize: 3, price: 52000, upkeep: 230, fee: 600, services: ['berths', 'repairs', 'armoury'] },
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
  low: { name: 'Low End', size: 1, wear: 1.2, slots: 1 },
  medium: { name: 'Medium End', size: 2, wear: 1.0, slots: 2 },
  high: { name: 'High End', size: 3, wear: 0.8, slots: 3 },
  superhigh: { name: 'Super High End', size: 4, wear: 0.7, slots: 4 },
  futuristic: { name: 'Futuristic', size: 3, wear: 0.4, slots: 5, needsPortType: 'advanced' },
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
 * needs: a tag the ship must have; risk: 'low' | 'medium' | 'high' (piracy comes in a later update).
 */
export const CONTRACT_TYPES = {
  general: { name: 'General merchandise', units: [8, 80], rate: 22, base: 600, slack: 1.7, needs: null, risk: 'low', clients: ['cl_halver_mills', 'cl_lirre_neutral', 'cl_dunmere_post', 'cl_sund_royal'] },
  bulk: { name: 'Bulk materials', units: [60, 400], rate: 10, base: 1000, slack: 2.0, needs: null, minUnits: 60, risk: 'low', clients: ['cl_halver_mills', 'cl_caldera_mining'] },
  machinery: { name: 'Machinery', units: [20, 160], rate: 32, base: 1400, slack: 1.7, needs: 'heavy', risk: 'medium', clients: ['cl_ostmark_turbine', 'cl_oberoil'] },
  reefer: { name: 'Refrigerated goods', units: [10, 60], rate: 36, base: 800, slack: 1.4, needs: 'reefer', risk: 'low', clients: ['cl_lantern_fish', 'cl_morrow_fruit'] },
  urgent: { name: 'Urgent delivery', units: [4, 14], rate: 64, base: 1200, slack: 1.15, needs: null, earlyBonus: 0.2, risk: 'medium', clients: ['cl_dunmere_post', 'cl_oberoil', 'cl_meridian_tech'] },
  highvalue: { name: 'High-value freight', units: [6, 30], rate: 56, base: 1800, slack: 1.6, needs: null, risk: 'high', clients: ['cl_teshvar_luxe', 'cl_lirre_neutral'] },
  special: { name: 'Specialised cargo', units: [10, 60], rate: 75, base: 3000, slack: 1.5, needs: 'advanced', risk: 'medium', clients: ['cl_meridian_tech'] },
};
