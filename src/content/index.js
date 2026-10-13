// Content registry: the single import point for all authored game content.
// New characters, maps, quests etc. are registered here (see docs/CONTENT_FORMAT.md).
import lanternside from './maps/lanternside.js';
import interiors from './maps/interiors.js';
import oberMaps from './maps/oberFields.js';
import westbrookMaps from './maps/westbrook.js';
import halvermouthMaps from './maps/halvermouth.js';
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
import { PLOTS, BLUEPRINTS } from './properties.js';
import { withPlots } from '../world/plots.js';

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
/** Registries keyed by id also carry that id on each entry (used for cooldowns, logs and saves). */
const withIds = (reg) => Object.fromEntries(Object.entries(reg).map(([id, v]) => [id, { ...v, id }]));

const MAPS = byId([lanternside, ...interiors, ...oberMaps, ...westbrookMaps, ...halvermouthMaps]);
addSeams(MAPS, REGIONS, PROP_TYPES);

/** Content before property plots are expanded (tests add fixture plots to this). */
export const BASE_CONTENT = {
  maps: MAPS,
  regions: REGIONS,
  propTypes: PROP_TYPES,
  items: ITEMS,
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
  characters: byId([mags, osric, tibbs, moneybucks, ...oberStaff, ...masonCrew, ...police]),
  dialogues: byId([dlgMags, dlgOsric, dlgTibbs, dlgMoneybucks, ...dlgOberStaff, ...dlgMasonCrew, ...dlgPolice]),
  puns: PUNS,
  blueprints: BLUEPRINTS,
  plots: {},
  startingMap: 'player_flat',
  startingSpot: 'entry',
};

export const CONTENT = withPlots(BASE_CONTENT, PLOTS);

export default CONTENT;
