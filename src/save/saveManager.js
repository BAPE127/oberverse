// Save slots on top of a key/value storage (localStorage in the browser, an
// in-memory Map in tests). Every write keeps the previous save as a backup;
// a corrupt slot falls back to its backup instead of being destroyed.
import { GAME_VERSION, SAVE_SCHEMA_VERSION } from '../core/version.js';
import { makeEnvelope, validateSave } from './saveSchema.js';
import { migrate } from './migrations.js';

export const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
const PREFIX = 'oberverse.save.';

export class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

export function defaultStorage() {
  try {
    const ls = globalThis.localStorage;
    const probe = '__oberverse_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return new MemoryStorage();
  }
}

export class SaveManager {
  constructor(storage = defaultStorage()) {
    this.storage = storage;
  }

  key(slot) {
    return PREFIX + slot;
  }

  /** @returns {{ok:boolean, error?:string}} */
  save(slot, game) {
    if (!SLOTS.includes(slot)) return { ok: false, error: `Unknown slot ${slot}` };
    try {
      const env = makeEnvelope(game.serialize(), game.saveMeta(), GAME_VERSION);
      const json = JSON.stringify(env);
      const prev = this.storage.getItem(this.key(slot));
      if (prev) this.storage.setItem(this.key(slot) + '.bak', prev);
      this.storage.setItem(this.key(slot), json);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: `Could not save: ${err.message || err}` };
    }
  }

  /** Parse + validate + migrate a raw JSON string. */
  parse(raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, errors: ['The save file is not valid JSON (it may be truncated or corrupt).'], warnings: [] };
    }
    if (data && Number.isInteger(data.saveVersion) && data.saveVersion < SAVE_SCHEMA_VERSION) {
      try {
        const { save, applied } = migrate(data, SAVE_SCHEMA_VERSION);
        const res = validateSave(save);
        res.migrated = applied;
        return res;
      } catch (err) {
        return { ok: false, errors: [err.message], warnings: [] };
      }
    }
    return validateSave(data);
  }

  /**
   * Load a slot into the game. Falls back to the slot backup if the main
   * save is unreadable. Never deletes anything.
   */
  load(slot, game) {
    const raw = this.storage.getItem(this.key(slot));
    if (!raw) return { ok: false, errors: ['That slot is empty.'], warnings: [] };
    let res = this.parse(raw);
    let usedBackup = false;
    if (!res.ok) {
      const bak = this.storage.getItem(this.key(slot) + '.bak');
      const bres = bak ? this.parse(bak) : null;
      if (bres?.ok) {
        res = { ...bres, warnings: [...bres.warnings, `Main save was unreadable (${res.errors.join(' ')}); loaded the backup instead.`] };
        usedBackup = true;
      } else return res;
    }
    try {
      game.loadState(res.save.state);
    } catch (err) {
      return { ok: false, errors: [`Save could not be applied: ${err.message}`], warnings: res.warnings };
    }
    return { ok: true, warnings: res.warnings, migrated: res.migrated || [], usedBackup, savedWith: res.save.gameVersion };
  }

  /** Slot listing for menus. */
  list() {
    return SLOTS.map((slot) => {
      const raw = this.storage.getItem(this.key(slot));
      if (!raw) return { slot, empty: true };
      try {
        const env = JSON.parse(raw);
        return { slot, empty: false, meta: env.meta || {}, savedAt: env.savedAt, gameVersion: env.gameVersion, saveVersion: env.saveVersion };
      } catch {
        return { slot, empty: false, corrupt: true };
      }
    });
  }

  mostRecent() {
    return this.list()
      .filter((s) => !s.empty && !s.corrupt)
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0] || null;
  }

  exportSlot(slot) {
    return this.storage.getItem(this.key(slot));
  }

  /** Import a save file's text into a slot after validating it. */
  importToSlot(slot, raw) {
    const res = this.parse(raw);
    if (!res.ok) return res;
    const prev = this.storage.getItem(this.key(slot));
    if (prev) this.storage.setItem(this.key(slot) + '.bak', prev);
    this.storage.setItem(this.key(slot), JSON.stringify(res.save));
    return { ok: true, warnings: res.warnings };
  }

  delete(slot) {
    const prev = this.storage.getItem(this.key(slot));
    if (prev) this.storage.setItem(this.key(slot) + '.bak', prev);
    this.storage.removeItem(this.key(slot));
  }
}

const SETTINGS_KEY = 'oberverse.settings';
export const DEFAULT_SETTINGS = { master: 0.8, music: 0.6, sfx: 0.8, ambience: 0.5, voice: 0.6, muted: false, textSpeed: 'normal', showFps: false, timeScale: 1, pixelArt: true };

export function loadSettings(storage = defaultStorage()) {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings, storage = defaultStorage()) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
