// Content registry: the single import point for all authored game content.
// New characters, maps, quests etc. are registered here (see docs/CONTENT_FORMAT.md).
import lanternside from './maps/lanternside.js';
import interiors from './maps/interiors.js';
import oberMaps from './maps/oberFields.js';
import westbrookMaps from './maps/westbrook.js';
import halvermouthMaps from './maps/halvermouth.js';
import yardsMaps from './maps/yards.js';
import lariatMaps from './maps/lariat.js';
import starlingMaps from './maps/starling.js';
import { ARMS_ITEMS, CRATE_ITEMS, CRATE, BENCH_RECIPES, ARMS_STATIONS, ARMS_RECIPES, ARMS_RESEARCH, RESEARCH_BRANCHES, ARMS_WAREHOUSES, ARMS_LICENCE_PRICE, WHOLESALE, STAFF_NAMES, STAFF_SKILLS, STAFF_QUIRKS, COUNTRIES, HQ, SHIPPERS, MARKET } from './arms.js';
import { PROP_TYPES } from './props.js';
import { ITEMS } from './items.js';
import { FACTS } from './facts.js';
import { DOCS } from './docs.js';
import { CONTAINERS } from './containers.js';
import { SHOPS } from './shops.js';
import { FACTIONS } from './factions.js';
import { QUESTS } from './quests.js';
import { EVENTS } from './events.js';
import { MOODS } from './moods.js';
import { NOTICES } from './notices.js';
import { REGIONS } from './world.js';
import { LOGISTICS, PORTS, PORT_TYPES, CARGO_CLASSES, CARGO_SHIPS, CLIENTS, CONTRACT_TYPES, PIRATE_WATERS, RISK, BONUSES, WARSHIP_CLASSES, WARSHIPS, MISSION_TYPES, SHIPYARD, TECH, HULLS, COMPONENTS, SHIP_COLOURS } from './logistics.js';
import { addSeams } from '../world/regions.js';
import { SONGS, MOTIFS, AUDIO_REGISTRY } from './audio.js';
import mags from './characters/mags.js';
import osric from './characters/osric.js';
import tibbs from './characters/tibbs.js';
import moneybucks from './characters/moneybucks.js';
import oberStaff from './characters/oberStaff.js';
import dlgMags from './dialogue/mags.js';
import dlgOsric from './dialogue/osric.js';
import dlgTibbs from './dialogue/tibbs.js';
import dlgMoneybucks from './dialogue/moneybucks.js';
import dlgOberStaff from './dialogue/oberStaff.js';
import masonCrew from './characters/mason.js';
import dlgMasonCrew from './dialogue/mason.js';
import { PUNS } from './dialogue/mason.js';
import police from './characters/police.js';
import dlgPolice from './dialogue/police.js';
import sums from './characters/sums.js';
import dlgSums from './dialogue/sums.js';
import sal from './characters/sal.js';
import dlgSal from './dialogue/sal.js';
import { WAREHOUSES, RECIPES, DELIVERIES, UNLOCKS } from './warehouses.js';
import lucasChars from './characters/lucas.js';
import dlgLucas from './dialogue/lucas.js';
import captainOber from './characters/ober.js';
import dlgCaptainOber from './dialogue/ober.js';
import { PLOTS, BLUEPRINTS } from './properties.js';
import { withPlots } from '../world/plots.js';
import { CAR_MODELS, DEALERS, PARKED_CARS, DRIVING, carPropsToVehicles } from './vehicles.js';
import { SIGNATURE_PARKED, SIGNATURE_PARKED_GROWN } from './signatureCars.js';
import { buildTransit, addStreetFurniture } from './transit.js';
import { widenAll, shiftPoint } from '../world/widen.js';
import dealerChars from './characters/dealers.js';
import dlgDealers from './dialogue/dealers.js';
import lariatChars from './characters/lariat.js';
import dlgLariat from './dialogue/lariat.js';
import casinoChars from './characters/casino.js';
import dlgCasino from './dialogue/casino.js';
import aeroChars from './characters/aerospace.js';
import dlgAero from './dialogue/aerospace.js';
import { DAIRY, LEAD_COWS, LASSO, HERD_REWARD } from './dairy.js';
import { AERO, BAYS as AERO_BAYS, FACILITIES as AERO_FACILITIES, MATERIALS as AERO_MATERIALS, SUPPLIERS as AERO_SUPPLIERS, RIVAL_SUPPLIER_PREMIUM, FREIGHT as AERO_FREIGHT, PIPELINES as AERO_PIPELINES, RESEARCH as AERO_RESEARCH, PRODUCTS as AERO_PRODUCTS, CUSTOMERS as AERO_CUSTOMERS, TENDER_RATE, BUDGET_START, BUDGET_DAILY, AERO_PEOPLE } from './aerospace.js';
import { FARM_PLOTS, FARM_CROPS, FARM, LIVESTOCK, FARM_MARKET, PASTURE } from './farming.js';
import { OCCUPATIONS, RESIDENCES, LIFE, LIFE_EXCEPTIONS, PATROLS, ERRANDS } from './life.js';
import { towerMaps, addTowers, TOWERS } from './towers.js';
import { casinoMaps, phonographLobby, PHONOGRAPH_TOWER, CASINO } from './casino.js';
import { SPECIAL_ITEMS, addSpecialWeapons } from './specialWeapons.js';
import { homeMaps, addHomes, homeContainers, homeResidences, markHomes, LODGING } from './homes.js';
import { buildPatrols } from '../world/patrols.js';
import { growStreets, shiftContent } from '../world/grow.js';
import { placeInteriors, realInterior } from '../world/interiors.js';

/** Ids registered twice (a later entry silently replaces an earlier one): the validator reports these. */
export const DUPLICATE_IDS = [];
const byId = (list) => {
  const out = {};
  for (const x of list) {
    if (out[x.id]) DUPLICATE_IDS.push(x.id);
    out[x.id] = x;
  }
  return out;
};
/** Registries keyed by id also carry that id on each entry (used for cooldowns, logs and saves). */
const withIds = (reg) => Object.fromEntries(Object.entries(reg).map(([id, v]) => [id, { ...v, id }]));

const MAPS = byId([lanternside, ...interiors, ...oberMaps, ...westbrookMaps, ...halvermouthMaps, ...yardsMaps, ...lariatMaps, ...starlingMaps, ...homeMaps(), ...towerMaps(), ...casinoMaps()]);
// v0.20.0: four-tile roads. Widen the outdoor maps, then fix up everything authored in the old coordinates.
const SHIFTS = widenAll(MAPS);
REGIONS.coast.maps.westbrook.x = -(MAPS.westbrook.tiles[0].length - 1);
REGIONS.coast.maps.ober_fields.x = MAPS.lanternside.tiles[0].length - 1;
const TRANSIT = buildTransit(SHIFTS);
addStreetFurniture(MAPS, TRANSIT);
addHomes(MAPS); // v0.36.0: front doors for the new homes (final coordinates)
addTowers(MAPS); // v0.41.0: tower lobbies, lifts and floors
const ALL_CONTAINERS = { ...CONTAINERS, ...homeContainers() };
addSpecialWeapons(MAPS, ALL_CONTAINERS); // v0.45.0: one-of-a-kind weapons, kept in people's homes
const HOMES_LIFE = homeResidences();
markHomes(MAPS, { ...RESIDENCES, ...HOMES_LIFE.residences }, LIFE);
const PATROL_ROUTES = buildPatrols(MAPS, PATROLS); // v0.32.0: police beats, as spots on the pavement
addSeams(MAPS, REGIONS, PROP_TYPES);
const STREET_CARS = carPropsToVehicles(MAPS);
const PARKED = PARKED_CARS.map((c) => shiftPoint(SHIFTS, c));
const DEALERS_W = Object.fromEntries(Object.entries(DEALERS).map(([id, d]) => {
  const sp = (o) => shiftPoint(SHIFTS, { map: d.map, ...o });
  const lot = sp(d.lot);
  const lotEnd = sp({ x: d.lot.x + d.lot.w - 1, y: d.lot.y + d.lot.h - 1 });
  const strip = ({ map, ...o }) => o;
  return [id, { ...d, delivery: strip(sp(d.delivery)), lot: { x: lot.x, y: lot.y, w: lotEnd.x - lot.x + 1, h: lotEnd.y - lot.y + 1 }, display: d.display.map((s) => strip(sp(s))) }];
}));

// v0.32.0: a schedule block that names a patrol beat starts at the beat's first waypoint
const ALL_CHARACTERS = byId([mags, osric, tibbs, moneybucks, ...oberStaff, ...masonCrew, ...police, ...sums, ...sal, ...lucasChars, ...dealerChars, ...captainOber, ...lariatChars, ...casinoChars, ...aeroChars]);
for (const c of Object.values(ALL_CHARACTERS)) for (const b of c.schedule || []) if (b.patrol && !b.spot) b.spot = PATROL_ROUTES[b.patrol]?.[0];

/** Content before property plots are expanded (tests add fixture plots to this). */
export const BASE_CONTENT = {
  maps: MAPS,
  regions: REGIONS,
  propTypes: PROP_TYPES,
  items: { ...ITEMS, ...ARMS_ITEMS, ...CRATE_ITEMS, ...SPECIAL_ITEMS },
  facts: FACTS,
  docs: DOCS,
  containers: ALL_CONTAINERS,
  towers: { ...TOWERS, phonograph: PHONOGRAPH_TOWER }, // v0.52.0: the Phonograph Grand
  casino: CASINO,
  lodging: LODGING, // v0.36.0: where the arms works' hired hands sleep
  shops: SHOPS,
  factions: FACTIONS,
  quests: QUESTS,
  events: withIds(EVENTS),
  moods: MOODS,
  notices: NOTICES,
  songs: SONGS,
  motifs: MOTIFS,
  audioRegistry: AUDIO_REGISTRY,
  characters: ALL_CHARACTERS,
  dialogues: byId([dlgMags, dlgOsric, dlgTibbs, dlgMoneybucks, ...dlgOberStaff, ...dlgMasonCrew, ...dlgPolice, ...dlgSums, ...dlgSal, ...dlgLucas, ...dlgDealers, ...dlgCaptainOber, ...dlgLariat, ...dlgCasino, ...dlgAero]),
  puns: PUNS,
  warehouses: WAREHOUSES,
  recipes: RECIPES,
  deliveries: DELIVERIES,
  unlocks: UNLOCKS,
  arms: { crate: CRATE, bench: BENCH_RECIPES, stations: ARMS_STATIONS, recipes: ARMS_RECIPES, research: ARMS_RESEARCH, branches: RESEARCH_BRANCHES, licencePrice: ARMS_LICENCE_PRICE, wholesale: WHOLESALE, staffNames: STAFF_NAMES, staffSkills: STAFF_SKILLS, quirks: STAFF_QUIRKS, countries: COUNTRIES, hq: HQ, shippers: SHIPPERS, market: MARKET },
  armsWarehouses: ARMS_WAREHOUSES,
  transit: TRANSIT,
  logistics: { rules: LOGISTICS, ports: PORTS, portTypes: PORT_TYPES, classes: CARGO_CLASSES, ships: { ...CARGO_SHIPS, ...WARSHIPS }, dealership: Object.keys(CARGO_SHIPS), warshipDealership: Object.keys(WARSHIPS), warshipClasses: WARSHIP_CLASSES, clients: CLIENTS, contractTypes: CONTRACT_TYPES, pirateWaters: PIRATE_WATERS, risk: RISK, bonuses: BONUSES, missionTypes: MISSION_TYPES, shipyard: SHIPYARD, tech: TECH, hulls: HULLS, components: COMPONENTS, colours: SHIP_COLOURS },
  roadShifts: SHIFTS, // v0.20.0: authored → widened tile coordinates, per map (for older saves)
  vehicles: { models: CAR_MODELS, dealers: DEALERS_W, parked: [...PARKED, ...SIGNATURE_PARKED, ...STREET_CARS], driving: DRIVING },
  blueprints: BLUEPRINTS,
  dairy: { config: DAIRY, cows: LEAD_COWS, lasso: LASSO, reward: HERD_REWARD },
  aerospace: { aero: AERO, bays: AERO_BAYS, facilities: AERO_FACILITIES, materials: AERO_MATERIALS, suppliers: AERO_SUPPLIERS, rivalPremium: RIVAL_SUPPLIER_PREMIUM, freight: AERO_FREIGHT, pipelines: AERO_PIPELINES, research: AERO_RESEARCH, products: AERO_PRODUCTS, customers: AERO_CUSTOMERS, tenderRate: TENDER_RATE, budgetStart: BUDGET_START, budgetDaily: BUDGET_DAILY, people: AERO_PEOPLE }, // v0.55.0
  life: { occupations: OCCUPATIONS, residences: { ...RESIDENCES, ...HOMES_LIFE.residences }, homes: LIFE, exceptions: LIFE_EXCEPTIONS, patrols: PATROLS, patrolRoutes: PATROL_ROUTES, errands: ERRANDS },
  farming: { plots: FARM_PLOTS, crops: FARM_CROPS, config: FARM, livestock: LIVESTOCK, market: FARM_MARKET, pasture: PASTURE },
  plots: {},
  startingMap: 'player_flat',
  startingSpot: 'entry',
};

// v0.47.0: seamless buildings. The towns grow so every building holds its interior; every
// street coordinate in the content moves with them (once — everything above is in the widened
// coordinates); then each interior is laid over its building and the seams are re-stitched.
const STREETS = ['lanternside', 'westbrook', 'ober_fields', 'halvermouth', 'yards', 'lariat', 'starling_flats'];
const GROWTH = growStreets(MAPS, REGIONS, (id, b) => {
  const I = realInterior(MAPS, MAPS[id], b);
  return I ? { W: I.def.tiles[0].length, H: I.def.tiles.length, ex: I.exit.x } : null;
}, STREETS);
{
  const { maps: _m, regions: _r, roadShifts: _s, propTypes: _p, items: _i, ...rest } = BASE_CONTENT;
  shiftContent(rest, GROWTH);
  shiftContent(PLOTS, GROWTH);
  BASE_CONTENT.vehicles.parked.push(...SIGNATURE_PARKED_GROWN); // v0.52.0: already in grown coordinates
  const by = MAPS.yards.berths;
  if (by) MAPS.yards.berths = { ...by, piers: by.piers.map((x) => GROWTH.yards.fx(x)), row: GROWTH.yards.fy(by.row) };
}
REGIONS.coast.maps.westbrook.x = -(MAPS.westbrook.tiles[0].length - 1);
REGIONS.coast.maps.ober_fields.x = MAPS.lanternside.tiles[0].length - 1;
// v0.52.0: the Phonograph Grand's lobby is the size of its building on the grown street
MAPS.phonograph_lobby = phonographLobby(MAPS.halvermouth);
placeInteriors(MAPS, REGIONS, STREETS);
{
  const b = MAPS.halvermouth.buildings.find((x) => x.id === 'b_phonograph');
  // the forecourt: a marquee pylon and the valet's stand either side of the door
  const d = b.door;
  MAPS.halvermouth.props.push(
    { id: 'pg_pylon', type: 'marquee_pylon', x: d.x - 4, y: d.y + 1, examine: 'A tall black pylon studded with bulbs: THE PHONOGRAPH GRAND · CASINO · LOUNGE · OPEN ALL HOURS.' },
    { id: 'pg_valet', type: 'valet_stand', x: d.x + 3, y: d.y + 1 },
  );
  for (const id of ['phonograph_octavius', 'phonograph_spade', 'phonograph_staff']) MAPS[id].aloft = { tower: 'phonograph', over: 'halvermouth', x: b.x + b.w / 2, y: b.y + b.h / 2 };
}
addSeams(MAPS, REGIONS, PROP_TYPES);
BASE_CONTENT.growShifts = GROWTH; // widened → grown tile coordinates (for saves from before v0.47.0)

export const CONTENT = withPlots(BASE_CONTENT, PLOTS);

export default CONTENT;
