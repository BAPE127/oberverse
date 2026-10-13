import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validateContent } from '../tools/validate-content.mjs';
import { CONTENT } from '../src/content/index.js';
import { compileSong } from '../src/audio/music.js';

test('content validates with no errors', () => {
  const { errors } = validateContent(CONTENT);
  assert.deepEqual(errors, []);
});

test('the validator catches broken references', () => {
  const broken = {
    ...CONTENT,
    quests: { ...CONTENT.quests, q_bad: { title: 'x', start: 'nope', stages: { a: { journal: 'j' } }, triggers: [{ event: 'map:entered', advance: 'zzz' }] } },
    characters: { ...CONTENT.characters, npc_mags: { ...CONTENT.characters.npc_mags, knowledge: ['fact_does_not_exist'] } },
  };
  const { errors } = validateContent(broken);
  assert.ok(errors.some((e) => e.includes('start stage nope')));
  assert.ok(errors.some((e) => e.includes('fact_does_not_exist')));
  assert.ok(errors.some((e) => e.includes('advance zzz')));
});

test('all songs compile into whole bars', () => {
  for (const [id, s] of Object.entries(CONTENT.songs)) {
    const c = compileSong(s);
    assert.equal(c.melodySteps, c.totalSteps, id);
    assert.ok(c.events.length > 10, id);
  }
});

test('every major character has a motif, voice and personality that drives behaviour', () => {
  for (const c of Object.values(CONTENT.characters).filter((x) => x.tier === 'major')) {
    assert.ok(CONTENT.motifs[c.motif], `${c.id} motif`);
    assert.ok(c.voice?.pitch, `${c.id} voice`);
    for (const k of ['sociability', 'conscientiousness', 'impulsiveness']) assert.equal(typeof c.personality[k], 'number', `${c.id}.${k}`);
  }
});

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test('the game has no network or external AI dependency', () => {
  const src = new URL('../src/', import.meta.url).pathname;
  for (const file of walk(src).filter((f) => f.endsWith('.js'))) {
    const code = readFileSync(file, 'utf8');
    assert.doesNotMatch(code, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|https?:\/\//, file);
  }
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/);
});
