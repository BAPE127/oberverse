import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAME_VERSION, SAVE_SCHEMA_VERSION, BUILD_CHANNEL } from '../src/core/version.js';
import { RELEASE_NOTES } from '../src/core/releaseNotes.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('VERSION, package.json, manifest and the game agree', () => {
  const manifest = JSON.parse(read('oberverse-manifest.json'));
  assert.equal(read('VERSION').trim(), GAME_VERSION);
  assert.equal(JSON.parse(read('package.json')).version, GAME_VERSION);
  assert.equal(manifest.version, GAME_VERSION);
  assert.equal(manifest.saveSchemaVersion, SAVE_SCHEMA_VERSION);
  assert.equal(manifest.buildChannel, BUILD_CHANNEL);
});

test('newest release note and changelog entry match the version', () => {
  assert.equal(RELEASE_NOTES[0].version, GAME_VERSION);
  const top = /^## \[(\d+\.\d+\.\d+)\]/m.exec(read('CHANGELOG.md'));
  assert.ok(top, 'CHANGELOG.md has a version heading');
  assert.equal(top[1], GAME_VERSION);
  assert.match(read('VERSION_HISTORY.md'), new RegExp(GAME_VERSION.replace(/\./g, '\\.')));
});

test('version is semantic', () => {
  assert.match(GAME_VERSION, /^\d+\.\d+\.\d+$/);
});
