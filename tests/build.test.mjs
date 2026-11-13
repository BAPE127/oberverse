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

test('the bundler handles namespace imports, side-effect imports, `export { a as b }` and a minified closing export list', () => {
  const js = bundle('tests/fixtures/bundle/entry.js');
  delete globalThis.__bundleTest;
  new Function(js)();
  assert.deepEqual(globalThis.__bundleTest.result, { ns: ['alpha', 'b', 'c'], al: 1, b: 2, c: 3, quick: 1, wide: 2 });
  assert.equal(globalThis.__bundleTest.effectRanFirst, true);
  delete globalThis.__bundleTest;
});

test('the vendored three.js is inlined whole, with its licence file beside it, and the game still needs no network', () => {
  const js = bundle('src/main.js');
  assert.ok(js.includes('__m["src/vendor/three.module.min.js"]'));
  assert.match(js, /"WebGLRenderer": ?\w+/);
  assert.ok(readFileSync(new URL('../src/vendor/THREE-LICENSE.txt', import.meta.url), 'utf8').includes('MIT'));
  assert.doesNotMatch(buildHtml(), /<script[^>]+src=|\bimport\s*\(\s*['"]https?:|\bfetch\s*\(\s*['"]https?:/, 'no script tag, dynamic import or fetch of a remote file');
});
