// Save slots on top of a key/value storage (localStorage in the browser, an
// in-memory Map in tests). Every write keeps the previous save as a backup
// when there is room for it; a corrupt slot falls back to its backup instead of
// being destroyed. Storage is small (browsers allow about 5 million characters
// for everything), so a backup is best-effort: it never stops a save, a full
// storage frees backups before it gives up, and deleting a slot really frees it (v0.103.4).
import { GAME_VERSION, SAVE_SCHEMA_VERSION } from '../core/version.js';
import { makeEnvelope, validateSave } from './saveSchema.js';
import { migrate } from './migrations.js';

export const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
const PREFIX = 'oberverse.save.';
/** What browsers allow localStorage to hold, in characters (nearly all: 5 million). Only used to show how full it is. */
export const STORAGE_LIMIT = 5_000_000;
const isQuota = (err) => /quota|exceeded|storage is full|NS_ERROR_DOM_QUOTA/i.test(`${err?.name || ''} ${err?.message || ''}`) || err?.code === 22 || err?.code === 1014;

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

  /** Every key this game keeps in storage (saves, their backups, the settings). */
  keys() {
    const st = this.storage; const out = [];
    try {
      if (typeof st.length === 'number' && typeof st.key === 'function') { for (let i = 0; i < st.length; i++) { const k = st.key(i); if (k && k.startsWith('oberverse.')) out.push(k); } }
      else if (st.map) for (const k of st.map.keys()) if (k.startsWith('oberverse.')) out.push(k);
    } catch { /* an unreadable storage reports nothing */ }
    return out;
  }

  /** How much of the storage the game uses, in characters, and what each slot and its backup take. */
  usage() {
    const size = (k) => (this.storage.getItem(k) || '').length;
    const slots = SLOTS.map((slot) => ({ slot, bytes: size(this.key(slot)), backup: size(this.key(slot) + '.bak') }));
    const used = this.keys().reduce((a, k) => a + k.length + size(k), 0);
    return { used, limit: STORAGE_LIMIT, free: Math.max(0, STORAGE_LIMIT - used), slots, backups: slots.reduce((a, x) => a + x.backup, 0) };
  }

  /** Drop the backups (`except` keeps one slot's). Backups are copies of older saves; the saves themselves are never touched. Returns the characters freed. */
  dropBackups(except = null) {
    let freed = 0;
    for (const slot of SLOTS) {
      if (slot === except) continue;
      const k = this.key(slot) + '.bak'; const v = this.storage.getItem(k);
      if (v) { freed += v.length; this.storage.removeItem(k); }
    }
    return freed;
  }

  /** @returns {{ok:boolean, error?:string, quota?:boolean, backup?:boolean}} */
  save(slot, game) {
    if (!SLOTS.includes(slot)) return { ok: false, error: `Unknown slot ${slot}` };
    let json;
    try {
      json = JSON.stringify(makeEnvelope(game.serialize(), game.saveMeta(), GAME_VERSION));
    } catch (err) {
      return { ok: false, error: `Could not save: ${err.message || err}` };
    }
    const key = this.key(slot);
    const prev = this.storage.getItem(key);
    // 1. the backup of the last save, if it fits (never a reason to refuse the save itself)
    let backup = false;
    if (prev) { try { this.storage.setItem(key + '.bak', prev); backup = true; } catch { /* no room for a backup: carry on */ } }
    // 2. the save; when the storage is full, free what can be spared and try again: this slot's backup, then every other backup
    const attempts = [() => {}, () => { this.storage.removeItem(key + '.bak'); backup = false; }, () => { this.dropBackups(); backup = false; }];
    let last = null;
    for (const free of attempts) {
      try { free(); this.storage.setItem(key, json); return { ok: true, backup }; } catch (err) { last = err; if (!isQuota(err)) break; }
    }
    if (isQuota(last)) {
      const u = this.usage();
      return { ok: false, quota: true, needed: json.length, error: `Storage is full: this save needs ${(json.length / 1e6).toFixed(2)} million characters and the browser allows about ${(STORAGE_LIMIT / 1e6).toFixed(0)} million for everything (${(u.used / 1e6).toFixed(2)} million used). Delete a save you no longer need from Load game, then save again.` };
    }
    return { ok: false, error: `Could not save: ${last?.message || last}` };
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
    if (prev) { try { this.storage.setItem(this.key(slot) + '.bak', prev); } catch { /* no room for a backup */ } }
    try { this.storage.setItem(this.key(slot), JSON.stringify(res.save)); } catch (err) {
      if (!isQuota(err)) return { ok: false, errors: [`Could not store it: ${err.message || err}`], warnings: [] };
      this.dropBackups();
      try { this.storage.setItem(this.key(slot), JSON.stringify(res.save)); } catch { return { ok: false, errors: ['Storage is full: delete a save you no longer need, then import again.'], warnings: [] }; }
    }
    return { ok: true, warnings: res.warnings };
  }

  /** Delete a slot for good, with its backup: the space is freed (v0.103.4; before, a "deleted" slot was kept as a backup and freed nothing). Returns the characters freed. */
  delete(slot) {
    if (!SLOTS.includes(slot)) return 0;
    const k = this.key(slot); let freed = 0;
    for (const key of [k, k + '.bak']) { const v = this.storage.getItem(key); if (v) { freed += v.length; this.storage.removeItem(key); } }
    return freed;
  }
}

const SETTINGS_KEY = 'oberverse.settings';
export const DEFAULT_SETTINGS = { master: 0.8, music: 0.6, sfx: 0.8, ambience: 0.5, voice: 0.6, muted: false, textSpeed: 'normal', showFps: false, timeScale: 1 };

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
