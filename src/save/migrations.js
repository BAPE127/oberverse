// Save migrations. Each entry upgrades a save from `from` to `from + 1`.
// Never delete a migration: old saves must keep loading. See docs/SAVE_FORMAT.md.
//
// Schema history:
//   1 — v0.1.0 initial schema.
//
// Example for a future change (keep this pattern):
//   { from: 1, describe: 'Add player.title', up: (save) => { save.state.player.title ??= null; return save; } },
export const MIGRATIONS = [];

/**
 * @param {object} save parsed save envelope
 * @param {number} target schema version to reach
 * @param {Array} migrations migration list (injectable for tests)
 * @returns {{save: object, applied: string[]}}
 */
export function migrate(save, target, migrations = MIGRATIONS) {
  const applied = [];
  let current = save.saveVersion;
  while (current < target) {
    const m = migrations.find((x) => x.from === current);
    if (!m) throw new Error(`No migration from save schema ${current} to ${current + 1}.`);
    save = m.up(save);
    current += 1;
    save.saveVersion = current;
    applied.push(`${m.from}→${current}: ${m.describe || 'migration'}`);
  }
  return { save, applied };
}
