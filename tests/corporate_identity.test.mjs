// Company identity and the registry (v0.60.0 part C): names the player can set and change, the
// records that appear when a business is founded (and for those a save already had), and the one
// list of every company.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame } from './helpers.mjs';
import { CONTENT } from '../src/content/index.js';
import { Game } from '../src/game/game.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { validateName } from '../src/corp/identity.js';
import { existingRows } from '../src/corp/registry.js';
import { COMPANY_IDS } from '../src/systems/corporate.js';

test('a name is trimmed, tidied, and kept sensible', () => {
  assert.deepEqual(validateName('  Vale   &  Sons  '), { ok: true, name: 'Vale & Sons' });
  assert.equal(validateName('').ok, false);
  assert.equal(validateName('   ').ok, false);
  assert.equal(validateName('ab').ok, false, 'too short');
  assert.equal(validateName('x'.repeat(41)).ok, false, 'too long');
  assert.equal(validateName('x'.repeat(40)).ok, true);
  assert.equal(validateName('<b>Bold</b>').ok, false, 'markup');
  assert.equal(validateName('Alpha\u0000Beta').ok, false, 'control characters');
  assert.equal(validateName('🚀 Rocketry').ok, false, 'emoji');
  assert.equal(validateName('-Dash Co').ok, false, 'starts with punctuation');
  assert.equal(validateName('Alpha -- Beta').ok, false, 'runs of punctuation');
  assert.equal(validateName('1 2').ok, false, 'needs letters');
  assert.equal(validateName('Café Müller GmbH').ok, true, 'accents are fine');
  assert.equal(validateName(null).ok, false);
  assert.equal(validateName(42).ok, false);
  assert.equal(validateName('Ober\'s Oil', ["ober's oil"]).ok, false, 'taken, in any case');
});

test('founding a business makes its record and asks for a name, once', () => {
  const g = newGame(801);
  g.player.money = 5000;
  const seen = [];
  g.bus.on('corp:founded', (e) => seen.push(e.id));
  assert.equal(g.corp.profile('arms'), null, 'nothing before the business exists');
  assert.ok(g.arms.buyLicence().ok);
  assert.deepEqual(seen, ['arms']);
  const c = g.corp.state.companies.arms;
  assert.equal(c.name, 'Mill Road Arms Works');
  assert.equal(c.named, false, 'the owner has not yet named it');
  assert.equal(c.legacy, false);
  assert.equal(c.founded, g.clock.day);
  assert.equal(c.sector, 'arms');
  assert.ok(g.arms.buy('aw1').ok);
  assert.deepEqual(seen, ['arms'], 'a second works does not found it again');
});

test('shipping and aerospace carry the names they were bought with', () => {
  const g = newGame(802);
  g.player.money = 10_000_000;
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.aero.buyFirm().ok);
  assert.equal(g.corp.nameOf('shipping'), 'Ober & Sons Maritime');
  assert.equal(g.corp.nameOf('aerospace'), 'Roost Aeroworks');
  assert.equal(g.corp.profile('shipping').hq.length > 0, true);
  assert.equal(g.corp.profile('aerospace').hq, 'Starling Flats');
});

test('a business is renamed, its history kept, and the terminal follows', () => {
  const g = newGame(803);
  g.player.money = 10_000_000;
  assert.ok(g.aero.buyFirm().ok);
  const r = g.corp.rename('aerospace', '  Vale   Aerospace ');
  assert.ok(r.ok, r.text);
  assert.equal(g.corp.nameOf('aerospace'), 'Vale Aerospace');
  assert.equal(g.aero.roost.name, 'Vale Aerospace');
  const c = g.corp.state.companies.aerospace;
  assert.equal(c.named, true);
  assert.deepEqual(c.names.map((n) => n.name), ['Roost Aeroworks', 'Vale Aerospace']);
  assert.ok(g.corp.rename('aerospace', 'Vale Aerospace').ok, 'keeping its own name is fine');
  assert.equal(c.names.length, 2, 'and adds nothing to the history');
  assert.ok(!g.corp.rename('aerospace', 'x').ok);
  assert.equal(g.corp.nameOf('aerospace'), 'Vale Aerospace', 'a refused name changes nothing');
  assert.ok(!g.corp.rename('arms', 'Anything Goes').ok, 'cannot rename what you do not own');
  assert.ok(!g.corp.rename('casino', 'Anything Goes').ok);
});

test('no two companies may share a name', () => {
  const g = newGame(804);
  g.player.money = 10_000_000;
  assert.ok(g.logistics.buyCompany().ok);
  assert.ok(g.aero.buyFirm().ok);
  assert.ok(!g.corp.rename('aerospace', 'ober & sons maritime').ok, 'another of your companies');
  assert.ok(!g.corp.rename('aerospace', 'Ober\'s Oil').ok, 'a listed company');
  assert.ok(!g.corp.rename('aerospace', 'Meridian Aerospace Corporation').ok, 'the rival');
  assert.ok(!g.corp.rename('aerospace', 'Halver Freight & Sons').ok, 'a carrier');
  assert.ok(g.corp.rename('aerospace', 'Roost Aeroworks').ok);
});

test('the registry holds every company once: the owner\'s, the listed, the carriers', () => {
  const g = newGame(805);
  g.player.money = 10_000_000;
  assert.ok(g.arms.buyLicence().ok);
  assert.ok(g.logistics.buyCompany().ok);
  const rows = g.corp.registry();
  const ids = rows.map((r) => r.id);
  const names = rows.map((r) => r.name.toLowerCase());
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
  assert.equal(new Set(names).size, names.length, 'unique names');
  const tickers = rows.filter((r) => r.ticker).map((r) => r.ticker);
  for (const t of ['CHZ', 'MRDN', 'OBRO']) assert.ok(tickers.includes(t), `${t} is still listed`);
  assert.equal(new Set(tickers).size, tickers.length, 'no ticker twice');
  assert.ok(rows.filter((r) => r.kind === 'player').every((r) => !r.ticker), 'and not one of the owner\'s private businesses');
  assert.equal(rows.filter((r) => r.kind === 'player').length, 2, 'only the businesses founded so far');
  assert.ok(rows.some((r) => r.kind === 'carrier'));
  assert.ok(existingRows(CONTENT).every((r) => r.sector));
  assert.ok(rows.filter((r) => r.kind === 'player').every((r) => !r.ticker), 'the owner\'s companies are never listed');
});

test('a save from v0.59 comes up with identity records, nothing moved and nobody asked', () => {
  const raw = readFileSync(new URL('./fixtures/save-v0.59.0-four-businesses.json', import.meta.url), 'utf8');
  const before = JSON.parse(raw).state;
  assert.equal(before.world.corp, undefined, 'the fixture predates the accounts');
  const sm = new SaveManager(new MemoryStorage());
  sm.storage.setItem(sm.key('slot1'), raw);
  const g = new Game(CONTENT, { seed: 1 });
  const r = sm.load('slot1', g);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.equal(g.player.money, before.player.money, 'no money appears');
  const seen = [];
  g.bus.on('corp:founded', (e) => seen.push(e.id));
  g.corp.ensureCompanies();
  assert.deepEqual(seen, [], 'nobody is asked to name a business they already run');
  for (const id of COMPANY_IDS) {
    const p = g.corp.profile(id);
    assert.ok(p, `${id} has a record`);
    assert.equal(p.legacy, true);
    assert.equal(p.named, true);
    assert.equal(g.corp.funded(id), false, `${id} starts unfunded`);
    assert.equal(g.corp.account(id).cash, 0);
    assert.equal(g.corp.account(id).contributed, 0);
  }
  assert.equal(g.corp.nameOf('shipping'), 'Ober & Sons Maritime');
  assert.equal(g.corp.nameOf('farming'), 'East Plot Farms');
  assert.equal(g.player.money, before.player.money);
  assert.equal(g.corp.state.parent, undefined, 'nothing is consolidated');
});

test('names and records survive a save and load', () => {
  const g = newGame(806);
  g.player.money = 10_000_000;
  assert.ok(g.aero.buyFirm().ok);
  assert.ok(g.corp.rename('aerospace', 'Vale Aerospace').ok);
  const sm = new SaveManager(new MemoryStorage());
  sm.save('slot1', g);
  const g2 = new Game(CONTENT, { seed: 2 });
  assert.ok(sm.load('slot1', g2).ok);
  assert.equal(g2.corp.nameOf('aerospace'), 'Vale Aerospace');
  assert.equal(g2.aero.roost.name, 'Vale Aerospace');
  assert.equal(g2.corp.profile('aerospace').names.length, 2);
});
