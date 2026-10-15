// Content registry: the single import point for all authored game content.
// New characters, maps, quests etc. are registered here (see docs/CONTENT_FORMAT.md).
import lanternside from './maps/lanternside.js';
import interiors from './maps/interiors.js';
import oberMaps from './maps/oberFields.js';
import westbrookMaps from './maps/westbrook.js';
import halvermouthMaps from './maps/halvermouth.js';
import yardsMaps from './maps/yards.js';
import lariatMaps from './maps/lariat.js';
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
import { SIGNATURE_PARKED } from './signatureCars.js';
import { buildTransit, addStreetFurniture } from './transit.js';
import { widenAll, shiftPoint } from '../world/widen.js';
import dealerChars from './characters/dealers.js';
import dlgDealers from './dialogue/dealers.js';
import lariatChars from './characters/lariat.js';
import dlgLariat from './dialogue/lariat.js';
import { DAIRY, LEAD_COWS, LASSO, HERD_REWARD } from './dairy.js';
import { FARM_PLOTS, FARM_CROPS, FARM, LIVESTOCK, FARM_MARKET, PASTURE } from './farming.js';
import { OCCUPATIONS, RESIDENCES, LIFE, LIFE_EXCEPTIONS, PATROLS, ERRANDS } from './life.js';
import { buildPatrols } from '../world/patrols.js';

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

const MAPS = byId([lanternside, ...interiors, ...oberMaps, ...westbrookMaps, ...halvermouthMaps, ...yardsMaps, ...lariatMaps]);
// v0.20.0: four-tile roads. Widen the outdoor maps, then fix up everything authored in the old coordinates.
const SHIFTS = widenAll(MAPS);
REGIONS.coast.maps.westbrook.x = -(MAPS.westbrook.tiles[0].length - 1);
REGIONS.coast.maps.ober_fields.x = MAPS.lanternside.tiles[0].length - 1;
const TRANSIT = buildTransit(SHIFTS);
addStreetFurniture(MAPS, TRANSIT);
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
const ALL_CHARACTERS = byId([mags, osric, tibbs, moneybucks, ...oberStaff, ...masonCrew, ...police, ...sums, ...sal, ...lucasChars, ...dealerChars, ...captainOber, ...lariatChars]);
for (const c of Object.values(ALL_CHARACTERS)) for (const b of c.schedule || []) if (b.patrol && !b.spot) b.spot = PATROL_ROUTES[b.patrol]?.[0];

/** Content before property plots are expanded (tests add fixture plots to this). */
export const BASE_CONTENT = {
  maps: MAPS,
  regions: REGIONS,
  propTypes: PROP_TYPES,
  items: { ...ITEMS, ...ARMS_ITEMS, ...CRATE_ITEMS },
  facts: FACTS,
  docs: DOCS,
  containers: CONTAINERS,
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
  dialogues: byId([dlgMags, dlgOsric, dlgTibbs, dlgMoneybucks, ...dlgOberStaff, ...dlgMasonCrew, ...dlgPolice, ...dlgSums, ...dlgSal, ...dlgLucas, ...dlgDealers, ...dlgCaptainOber, ...dlgLariat]),
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
  life: { occupations: OCCUPATIONS, residences: RESIDENCES, homes: LIFE, exceptions: LIFE_EXCEPTIONS, patrols: PATROLS, patrolRoutes: PATROL_ROUTES, errands: ERRANDS },
  farming: { plots: FARM_PLOTS, crops: FARM_CROPS, config: FARM, livestock: LIVESTOCK, market: FARM_MARKET, pasture: PASTURE },
  plots: {},
  startingMap: 'player_flat',
  startingSpot: 'entry',
};

export const CONTENT = withPlots(BASE_CONTENT, PLOTS);

export default CONTENT;
