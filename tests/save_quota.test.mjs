// Save storage under a quota (v0.103.4): a backup never stops a save, a full storage frees backups before it refuses, a refusal explains itself and harms nothing, and delete really frees space.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager, MemoryStorage, STORAGE_LIMIT } from '../src/save/saveManager.js';
import { newGame, Game, CONTENT } from './helpers.mjs';

/** A storage that throws a quota error (as browsers do) once everything in it passes `limit` characters. */
class QuotaStorage extends MemoryStorage {
  constructor(limit) { super(); this.limit = limit; }
  total() { let t = 0; for (const [k, v] of this.map) t += k.length + v.length; return t; }
  setItem(k, v) {
    const old = this.map.get(k);
    const next = this.total() - (old === undefined ? 0 : k.length + old.length) + k.length + String(v).length;
    if (next > this.limit) { const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; throw e; }
    super.setItem(k, v);
  }
}
const oneSave = () => { const sm = new SaveManager(new MemoryStorage()); const g = newGame(1); sm.save('slot1', g); return { g, size: sm.storage.getItem('oberverse.save.slot1').length }; };
const loads = (sm, slot) => { const g2 = new Game(CONTENT, { seed: 9 }); return sm.load(slot, g2).ok; };

test('delete really frees the slot and its backup, and says how much; deleting an empty slot frees nothing', () => {
  const { g } = oneSave(); const sm = new SaveManager(new MemoryStorage());
  sm.save('slot1', g); sm.save('slot1', g); sm.save('auto', g);
  assert.ok(sm.usage().backups > 0 && sm.usage().slots.find((s) => s.slot === 'slot1').backup > 0);
  const before = sm.usage().used; const freed = sm.delete('slot1');
  assert.ok(freed > 0 && sm.usage().used < before - freed + 1, 'the space comes back');
  assert.equal(sm.storage.getItem('oberverse.save.slot1'), null); assert.equal(sm.storage.getItem('oberverse.save.slot1.bak'), null, 'no backup is kept of a deleted save');
  assert.equal(sm.list().find((s) => s.slot === 'slot1').empty, true);
  sm.delete('auto'); assert.equal(sm.list().find((s) => s.slot === 'auto').empty, true, 'the autosave can be deleted too');
  assert.equal(sm.delete('slot2'), 0); assert.equal(sm.delete('nonsense'), 0);
});

test('with room for only a save and a half, a second save to the same slot still succeeds (its backup is dropped, not the save)', () => {
  const { g, size } = oneSave();
  const st = new QuotaStorage(Math.round(size * 1.5)); const sm = new SaveManager(st);
  assert.ok(sm.save('slot1', g).ok);
  g.player.money = 4242;
  const r = sm.save('slot1', g); assert.ok(r.ok, r.error); assert.equal(r.backup, false, 'no room for a backup, and none was needed');
  const g2 = new Game(CONTENT, { seed: 9 }); assert.ok(sm.load('slot1', g2).ok); assert.equal(g2.player.money, 4242, 'the new save is the one that is there');
});

test('a full storage frees the other slots\' backups before it gives up, and never touches a save', () => {
  const { g, size } = oneSave();
  const st = new QuotaStorage(Math.round(size * 3.4)); const sm = new SaveManager(st);
  assert.ok(sm.save('slot1', g).ok); assert.ok(sm.save('slot1', g).ok); // slot1 and its backup: two copies
  assert.ok(sm.save('slot2', g).ok); // three copies
  const r = sm.save('slot3', g); assert.ok(r.ok, r.error); // needs a fourth: only a backup can go
  assert.ok(loads(sm, 'slot1') && loads(sm, 'slot2') && loads(sm, 'slot3'), 'every save survived');
  assert.equal(sm.usage().backups < size * 2, true);
});

test('when even one save does not fit, the refusal is a clear quota message, flagged, and the saves already there are untouched', () => {
  const { g, size } = oneSave();
  const st = new QuotaStorage(Math.round(size * 1.3)); const sm = new SaveManager(st);
  assert.ok(sm.save('slot1', g).ok);
  const r = sm.save('slot2', g);
  assert.equal(r.ok, false); assert.equal(r.quota, true); assert.ok(r.needed > 0); assert.match(r.error, /Storage is full/); assert.match(r.error, /Delete a save/);
  assert.ok(loads(sm, 'slot1'), 'the first save is intact');
  assert.equal(sm.storage.getItem('oberverse.save.slot2'), null, 'no half-written slot');
  sm.delete('slot1'); assert.ok(sm.save('slot2', g).ok, 'deleting a save makes room');
});

test('dropBackups keeps every save and can spare one slot; usage adds up and shows the limit', () => {
  const { g } = oneSave(); const sm = new SaveManager(new MemoryStorage());
  for (const s of ['slot1', 'slot2']) { sm.save(s, g); sm.save(s, g); }
  const freed = sm.dropBackups('slot2'); assert.ok(freed > 0);
  assert.equal(sm.storage.getItem('oberverse.save.slot1.bak'), null); assert.ok(sm.storage.getItem('oberverse.save.slot2.bak'), 'the spared slot keeps its backup');
  assert.ok(loads(sm, 'slot1') && loads(sm, 'slot2'));
  const u = sm.usage(); assert.equal(u.limit, STORAGE_LIMIT); assert.ok(u.used > 0 && u.free === u.limit - u.used);
});

test('an import into a full storage frees backups first, and reports plainly when it cannot fit', () => {
  const { g, size } = oneSave(); const sm0 = new SaveManager(new MemoryStorage()); sm0.save('slot1', g); const raw = sm0.exportSlot('slot1');
  const st = new QuotaStorage(Math.round(size * 2.6)); const sm = new SaveManager(st);
  sm.save('slot1', g); sm.save('slot1', g);
  const r = sm.importToSlot('slot2', raw); assert.ok(r.ok, JSON.stringify(r)); assert.ok(loads(sm, 'slot2'));
  const tiny = new SaveManager(new QuotaStorage(Math.round(size * 0.5)));
  const bad = tiny.importToSlot('slot1', raw); assert.equal(bad.ok, false); assert.match(bad.errors.join(' '), /Storage is full/);
});
