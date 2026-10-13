import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildHtml, bundle } from '../tools/build.mjs';

test('index.html is up to date with dev.html, styles.css and src/ (run `npm run build`)', () => {
  const committed = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(committed === buildHtml(), 'index.html is stale — run `npm run build` and commit it');
});

test('the standalone page is self-contained (no module scripts, external files or network)', () => {
  const html = buildHtml();
  assert.doesNotMatch(html, /<script[^>]+src=/, 'no external scripts');
  assert.doesNotMatch(html, /<link[^>]+rel=["']stylesheet/, 'no external stylesheets');
  assert.doesNotMatch(html, /type=["']module["']/, 'classic script so file:// works');
  assert.match(html, /GENERATED FILE/);
});

test('the bundle is valid JavaScript containing every module once', () => {
  const js = bundle('src/main.js');
  assert.doesNotThrow(() => new Function(js));
  const ids = [...js.matchAll(/^__m\["([^"]+)"\] =/gm)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('src/content/index.js') && ids.at(-1) === 'src/main.js');
});
