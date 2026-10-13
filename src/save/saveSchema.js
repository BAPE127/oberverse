// Save envelope validation. Repairs missing optional fields with safe defaults
// and reports what it changed; rejects saves missing essential data.
import { SAVE_SCHEMA_VERSION } from '../core/version.js';

export const SAVE_FORMAT_ID = 'oberverse-save';

export function makeEnvelope(state, meta, gameVersion) {
  return {
    format: SAVE_FORMAT_ID,
    saveVersion: SAVE_SCHEMA_VERSION,
    gameVersion,
    savedAt: new Date().toISOString(),
    meta,
    state,
  };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * @returns {{ok:boolean, errors:string[], warnings:string[], save?:object}}
 */
export function validateSave(save) {
  const errors = [];
  const warnings = [];
  if (!isObj(save)) return { ok: false, errors: ['Save data is not an object.'], warnings };
  if (save.format !== SAVE_FORMAT_ID) errors.push('Not an Oberverse save file.');
  if (!Number.isInteger(save.saveVersion) || save.saveVersion < 1) errors.push('Missing or invalid save schema version.');
  if (save.saveVersion > SAVE_SCHEMA_VERSION) errors.push(`Save schema ${save.saveVersion} is newer than this game supports (${SAVE_SCHEMA_VERSION}). Update the game to load it.`);
  const st = save.state;
  if (!isObj(st)) errors.push('Missing game state.');
  if (errors.length) return { ok: false, errors, warnings };

  // Essential fields
  const p = st.player;
  if (!isObj(p)) errors.push('Missing player.');
  else {
    if (typeof p.map !== 'string') errors.push('Player has no map.');
    if (!isNum(p.x) || !isNum(p.y)) errors.push('Player position is invalid.');
  }
  if (!isObj(st.clock) || !isNum(st.clock.total)) errors.push('World clock is missing or invalid.');
  if (errors.length) return { ok: false, errors, warnings };

  // Optional fields: repair with defaults
  const fix = (cond, msg, apply) => {
    if (!cond) {
      apply();
      warnings.push(msg);
    }
  };
  fix(typeof p.name === 'string' && p.name.length, 'Player name missing; defaulted.', () => (p.name = 'Wren'));
  fix(isNum(p.money) && p.money >= 0, 'Money invalid; reset to 0.', () => (p.money = 0));
  fix(isNum(p.health), 'Health missing; defaulted.', () => (p.health = 100));
  fix(isNum(p.energy), 'Energy missing; defaulted.', () => (p.energy = 80));
  fix(isObj(p.inventory), 'Inventory missing; emptied.', () => (p.inventory = {}));
  if (isObj(p.inventory)) {
    for (const [k, v] of Object.entries(p.inventory)) if (!Number.isInteger(v) || v < 0) { delete p.inventory[k]; warnings.push(`Removed invalid inventory entry ${k}.`); }
  }
  fix(isObj(p.stolen), 'Stolen-goods record missing; reset.', () => (p.stolen = {}));
  fix(isObj(p.knowledge), 'Player knowledge missing; reset.', () => (p.knowledge = {}));
  fix(isObj(p.reputation), 'Reputation missing; reset.', () => (p.reputation = {}));
  fix(isObj(p.stats), 'Stats missing; defaulted.', () => (p.stats = { charm: 2, wits: 2, grit: 2, finesse: 2 }));
  fix(isObj(p.discovered), 'Discovery record missing; reset.', () => (p.discovered = { maps: {}, areas: {} }));
  fix(isObj(st.npcs), 'NPC records missing; characters will start fresh.', () => (st.npcs = {}));
  fix(isObj(st.world), 'World state missing; reset.', () => (st.world = {}));
  fix(isObj(st.quests), 'Quest state missing; reset.', () => (st.quests = {}));
  fix(isObj(st.rng), 'RNG state missing; reseeded.', () => (st.rng = { state: 12345 }));
  for (const [id, n] of Object.entries(st.npcs)) {
    if (!isObj(n) || typeof n.map !== 'string' || !isNum(n.x) || !isNum(n.y)) {
      delete st.npcs[id];
      warnings.push(`NPC ${id} record was invalid and will be rebuilt.`);
      continue;
    }
    if (!isObj(n.relationships)) n.relationships = {};
    if (!isObj(n.knowledge)) n.knowledge = {};
    if (!isObj(n.memory) || !Array.isArray(n.memory.recent) || !Array.isArray(n.memory.significant)) {
      n.memory = { recent: [], significant: [] };
      warnings.push(`NPC ${id} memory was invalid and has been cleared.`);
    }
  }
  return { ok: true, errors, warnings, save };
}
