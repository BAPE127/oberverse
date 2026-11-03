// The world atlas (v0.92.0): which country and state any point of land belongs to, its climate, and where the named places, rivers and roads are.
// Pure functions over src/content/atlas.js and the world's own geography. Nothing here is stored in a save: it is the shape of the world.
import { ATLAS } from '../content/atlas.js';
import { landGrid, GRID_RES } from './globe.js';
import { relief as reliefAt, biome as climateAt, elevation } from './geography.js';

export const BIOMES = ['sea', 'ice', 'tundra', 'taiga', 'forest', 'grassland', 'steppe', 'desert', 'savanna', 'jungle', 'mountain', 'volcanic'];
export const BIOME_NAMES = { sea: 'Open sea', ice: 'Ice sheet', tundra: 'Tundra', taiga: 'Taiga', forest: 'Forest', grassland: 'Grassland', steppe: 'Steppe', desert: 'Desert', savanna: 'Savanna', jungle: 'Jungle', mountain: 'Mountains', volcanic: 'Volcanic' };
const D = Math.PI / 180;
const MAXD = 22; // a state claims land only within this many degrees (÷ its weight) of its heart
const GW = 360 * GRID_RES;
const GH = 180 * GRID_RES + 1;

const STATES = ATLAS.states;
const STATE_INDEX = Object.fromEntries(STATES.map((s, k) => [s.id, k]));
const ICE = STATE_INDEX.fr_southern_ice;

const dist = (a, b, c, d) => { const x = ((((b - d) + 540) % 360) - 180) * Math.cos(((a + c) / 2) * D); return Math.hypot(a - c, x); };

/** The state (an index into ATLAS.states) of a point of land, or -1 where no state claims it. */
function stateIndexAt(lat, lon) {
  if (lat < -64) return ICE;
  let best = -1; let bd = 1e9;
  for (let k = 0; k < STATES.length; k++) {
    if (k === ICE) continue;
    const s = STATES[k];
    const d = dist(lat, lon, s.seed[0], s.seed[1]) / s.w;
    if (d < bd) { bd = d; best = k; }
  }
  return bd < MAXD ? best : -1;
}

let GRID = null; // per half-degree cell: 255 = sea, 254 = land no state claims, else the state's index
function stateGrid() {
  if (GRID) return GRID;
  const el = landGrid().data;
  GRID = new Uint8Array(GW * GH).fill(255);
  for (let j = 0; j < GH; j++) {
    const lat = 90 - j / GRID_RES;
    for (let i = 0; i < GW; i++) {
      if (el[j * GW + i] < 0) continue;
      const k = stateIndexAt(lat, i / GRID_RES - 180);
      GRID[j * GW + i] = k < 0 ? 254 : k;
    }
  }
  return GRID;
}

const cellOf = (lat, lon) => {
  const j = Math.max(0, Math.min(GH - 1, Math.round((90 - lat) * GRID_RES)));
  const i = ((Math.round((((lon + 180) % 360) + 360) % 360 * GRID_RES)) % GW + GW) % GW;
  return j * GW + i;
};

/** The state at a point (its record, with `index`), or null at sea. The half-degree grid answers; a point the grid calls sea but the world's exact shape calls land (a narrow spit, a small island) is answered by the same rule. */
export function stateAt(lat, lon) {
  let k = stateGrid()[cellOf(lat, lon)];
  if (k === 255 && elevation(lat, lon) >= 0.02) k = stateIndexAt(lat, lon) < 0 ? 254 : stateIndexAt(lat, lon);
  return k >= 254 ? null : { ...STATES[k], index: k };
}
/** The country id at a point, or null at sea / unclaimed. */
export function countryAt(lat, lon) { return stateAt(lat, lon)?.country ?? null; }

/** Land's climate at a point: the world's own (ice, tundra, desert, forest, grass) refined by relief, latitude and the state's character. */
export function biomeAt(lat, lon) {
  let el = landGrid().data[cellOf(lat, lon)];
  if (el < 0) { el = elevation(lat, lon); if (el < 0.02) return 'sea'; }
  const a = Math.abs(lat);
  const st = stateAt(lat, lon);
  const rel = reliefAt(lat, lon, el);
  if (a > 72) return 'ice';
  if ((el > 2.1 || (rel > 0.95 && el > 1.1)) && a < 70) return 'mountain';
  let b;
  if (st?.biome && !(st.biome === 'mountain' && rel < 0.12)) b = st.biome;
  else {
    const g = climateAt(lat, lon, el);
    b = g === 'ice' ? 'ice' : g === 'tundra' ? 'tundra' : g === 'desert' ? 'desert' : g === 'forest' ? (a > 48 ? 'taiga' : a < 14 ? 'jungle' : 'forest') : (a < 22 ? 'savanna' : 'grassland');
  }
  if (st?.biome === 'volcanic' && rel <= 0.25) b = 'savanna';
  if (b === 'steppe' && st?.biome !== 'steppe') b = 'grassland';
  return b;
}

/** Per half-degree cell (same grid as landGrid): the country (index into `ids`, -1 where none) and the state (index into atlasStates(), 255 where none). */
let MAPS = null;
export function atlasGrids() {
  if (MAPS) return MAPS;
  const ids = Object.keys(ATLAS.countries);
  const of = STATES.map((s) => ids.indexOf(s.country));
  const sg = stateGrid();
  const country = new Int8Array(sg.length);
  const state = new Uint8Array(sg.length);
  for (let n = 0; n < sg.length; n++) { const k = sg[n]; country[n] = k >= 254 ? -1 : of[k]; state[n] = k >= 254 ? 255 : k; }
  MAPS = { ids, country, state, w: GW, h: GH };
  return MAPS;
}

export const atlasCountries = () => ATLAS.countries;
export const atlasStates = () => STATES;
export const statesOf = (country) => STATES.filter((s) => s.country === country);
export const atlasPlaces = () => ATLAS.places;
export const placesOf = (stateId) => ATLAS.places.filter((p) => p.state === stateId);
export const atlasMilitary = () => ATLAS.military;
export const atlasTheatres = () => ATLAS.theatres;
export const atlasRivers = () => ATLAS.rivers;
/** Roads as pairs of places: { a, b, main } */
export function atlasRoads() { return ATLAS.roads.map(([a, b, kind]) => ({ a: ATLAS.places[a], b: ATLAS.places[b], main: kind === 1 })); }

/** The nearest named place to a point (within `within` degrees), or null. */
export function nearestPlace(lat, lon, within = 4) {
  let best = null; let bd = within;
  for (const p of ATLAS.places) { const d = dist(lat, lon, p.lat, p.lon); if (d < bd) { bd = d; best = p; } }
  return best;
}

/** Everything the Atlas can say about one point of the world. */
export function atlasAt(lat, lon) {
  const st = stateAt(lat, lon);
  if (!st) return null;
  return { state: st, country: ATLAS.countries[st.country], countryId: st.country, biome: biomeAt(lat, lon), place: nearestPlace(lat, lon, 1.2) };
}
