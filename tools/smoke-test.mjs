// Browser smoke test: opens the standalone index.html straight from disk
// (file://, no server — exactly how players run it), drives it in headless
// Chromium with Playwright, checks for runtime errors and writes screenshots
// to tools/out/. Requires Playwright (globally installed is fine):
//   npm run smoke            standalone index.html via file://
//   npm run smoke -- --dev   multi-file dev.html via the local dev server
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { startServer } from '../server.js';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try { return require('playwright'); } catch { /* fall through */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return require(`${globalRoot}/playwright`);
}

const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PORT = 8765;
const VERSION = readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();
const versionRe = new RegExp(VERSION.replace(/\./g, '\\.'));
const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const DEV = process.argv.includes('--dev');
const server = DEV ? await startServer(PORT, '127.0.0.1') : null;
const URL_UNDER_TEST = DEV ? `http://127.0.0.1:${PORT}/dev.html` : new URL('../index.html', import.meta.url).href;
console.log(`Testing ${URL_UNDER_TEST}`);
const { chromium } = loadPlaywright();
const launchOpts = { headless: true };
try { require('node:fs').accessSync('/opt/pw-browsers/chromium'); } catch { /* use default */ }
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const addError = (msg) => { if (!errors.includes(msg)) errors.push(msg); };
page.on('pageerror', (e) => addError(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') addError(`console: ${m.text()}`); });
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });
const state = () => page.evaluate(() => {
  const g = window.oberverse.ui.game;
  return { state: window.oberverse.ui.state, map: g.player.map, x: g.player.x, y: g.player.y, time: g.clock.timeString, money: g.player.money, paused: g.paused, warnings: g.warnings };
});
const hold = async (key, ms) => { await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); };
const closeAll = () => page.evaluate(() => { const ui = window.oberverse.ui; ui.closeAllPanels(); if (ui.dialogue.open) ui.dialogue.close(); ui.afterModalClose(); });

try {
  await page.goto(URL_UNDER_TEST);
  await wait(1500);
  record('title screen renders', await page.isVisible('#screen-title'));
  const ver = await page.textContent('#title-version');
  record('version shown on title', versionRe.test(ver), ver);
  await shot('01-title');

  await page.click('text=New game');
  await page.fill('#new-name', 'Smoke');
  await page.click('#new-start');
  await wait(800);
  let s = await state();
  record('new game starts in the flat', s.state === 'playing' && s.map === 'player_flat', JSON.stringify(s));
  await shot('02-flat');

  // Read the letter on the desk: walk up to the back wall, the desk is beside us
  await hold('KeyW', 1400);
  const prompt = await page.textContent('#hud-prompt');
  await page.keyboard.press('KeyE');
  await wait(400);
  record('reading the letter opens a document', await page.isVisible('#modal:not(.hidden) .doc'), `prompt was "${prompt}"`);
  await shot('03-letter');
  await page.keyboard.press('Escape');
  await wait(200);
  record('escape closes the document', !(await page.isVisible('#modal:not(.hidden)')));

  // Leave the flat
  await hold('KeyS', 2600);
  await wait(500);
  s = await state();
  record('walking out of the door reaches Lanternside', s.map === 'lanternside', JSON.stringify(s));
  await hold('KeyS', 500);
  await hold('KeyD', 900);
  await shot('04-outside');

  // Inventory, journal, map panels
  for (const [key, name] of [['KeyI', 'inventory'], ['KeyJ', 'journal'], ['KeyM', 'map']]) {
    await closeAll();
    await page.keyboard.press(key);
    await wait(300);
    record(`${name} panel opens`, (await page.textContent('#modal-title')).toLowerCase().includes(name === 'inventory' ? 'inventory' : name));
    await shot(`05-${name}`);
    await page.keyboard.press('Escape');
    await wait(200);
  }

  // Teleport next to Mags (test hook) and talk to her
  await closeAll();
  await page.evaluate(() => {
    const g = window.oberverse.ui.game;
    const mags = g.npcs.get('npc_mags');
    g.changeMap(mags.map, 'entry');
    g.player.x = mags.x + 32; g.player.y = mags.y; g.player.facing = 'left';
  });
  await wait(400);
  await page.keyboard.press('KeyE');
  await wait(600);
  record('dialogue opens with Mags', await page.isVisible('#dialogue:not(.hidden)'));
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Space'); await wait(250); }
  await shot('06-dialogue');
  const opts = await page.$$eval('#dlg-options button', (b) => b.map((x) => x.textContent));
  record('dialogue offers topics', opts.length >= 3, opts.join(' | '));
  // Dialogue → shop hand-off: "What's good today?" opens the café shop
  const menuIdx = opts.findIndex((o) => o.includes("What's good today"));
  await page.keyboard.press(`Digit${menuIdx + 1}`);
  await wait(300);
  for (let i = 0; i < 4 && !(await page.isVisible('#modal:not(.hidden)')); i++) { await page.keyboard.press('Space'); await wait(250); }
  record('shop opens from dialogue', (await page.textContent('#modal-title')) === 'The Kettle & Crumb');
  const moneyBefore = (await state()).money;
  await page.click('#modal-body .item-row button.primary');
  await wait(200);
  const moneyAfter = (await state()).money;
  record('buying deducts money', moneyAfter < moneyBefore, `${moneyBefore} -> ${moneyAfter}`);
  await shot('06b-shop');
  await page.keyboard.press('Escape');
  await wait(300);
  record('dialogue resumes after shop', await page.isVisible('#dlg-options button'));

  // Ask about…
  const opts2 = await page.$$eval('#dlg-options button', (b) => b.map((x) => x.textContent));
  await page.keyboard.press(`Digit${opts2.findIndex((o) => o.includes('Ask about')) + 1}`);
  await wait(300);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Space'); await wait(150); }
  await page.fill('#dlg-ask-input', 'gulls');
  await page.press('#dlg-ask-input', 'Enter');
  await page.waitForFunction(() => !window.oberverse.ui.dialogue.typing, null, { timeout: 5000 });
  const askText = await page.textContent('#dlg-text');
  record('ask-about answers in character', /gull|bun|hungry/i.test(askText), askText.slice(0, 80));
  await closeAll();

  // Container: the wardrobe in the flat
  await page.evaluate(() => { const g = window.oberverse.ui.game; g.changeMap('player_flat', 'entry'); g.player.x = 7.5 * 32; g.player.y = 2.6 * 32; g.player.facing = 'right'; });
  await wait(300);
  await page.keyboard.press('KeyE');
  await wait(300);
  record('wardrobe opens as a container', (await page.textContent('#modal-title')) === 'Wardrobe');
  const takeButtons = await page.$$('#modal-body .item-row button');
  if (takeButtons.length) await takeButtons[0].click();
  await wait(200);
  await shot('06c-container');
  await closeAll();

  // Sleep in the bed
  await page.evaluate(() => { const g = window.oberverse.ui.game; g.clock.total = 21 * 60 + 30; g.player.x = 2.6 * 32; g.player.y = 2.4 * 32; g.player.facing = 'left'; });
  await wait(300);
  await page.keyboard.press('KeyE');
  await wait(300);
  await page.click('#modal-body button.primary');
  await wait(1200);
  const slept = await state();
  record('sleeping advances to the next morning', slept.time === '07:00' || slept.time === '07:01', slept.time);
  await closeAll();

  // Save, change state, load
  await closeAll();
  await page.keyboard.press('F5');
  await wait(300);
  const before = await state();
  await page.evaluate(() => { const g = window.oberverse.ui.game; g.player.money += 500; });
  await page.keyboard.press('F9');
  await wait(600);
  const after = await state();
  record('quick save + quick load restores state', after.money === before.money && after.map === before.map, `${before.money} -> ${after.money}`);

  // Night lighting
  await page.evaluate(() => { const g = window.oberverse.ui.game; g.changeMap('lanternside', 'civic_door_out'); g.clock.total = 22 * 60 + 30; });
  await wait(1200);
  await shot('07-night');
  await page.evaluate(() => { const g = window.oberverse.ui.game; g.clock.total = 24 * 60 + 13 * 60; g.changeMap('lanternside', 'cafe_door_out'); });
  await wait(1500);
  await shot('08-day-canal');

  // Pause menu shows version
  await closeAll();
  await page.keyboard.press('Escape');
  await wait(300);
  const pauseText = await page.textContent('#modal-body');
  record('pause menu shows version', versionRe.test(pauseText));
  await shot('09-pause');
  await page.keyboard.press('Escape');

  s = await state();
  record('no game warnings', s.warnings.length === 0, s.warnings.join('; '));

  // Saves survive closing and reopening the page
  await closeAll();
  await page.keyboard.press('F5');
  await wait(300);
  await page.reload();
  await wait(1200);
  const menu = await page.textContent('#title-menu');
  record('saves persist across a page reload (Continue offered)', /Continue/.test(menu), menu.slice(0, 60));
  await page.click('#title-menu button.primary');
  await wait(600);
  s = await state();
  record('Continue resumes the saved game', s.state === 'playing', JSON.stringify({ map: s.map, time: s.time }));
} catch (err) {
  record('smoke test script', false, err.stack);
} finally {
  const persisted = await page.evaluate(() => window.oberverse.ui.saves.storage !== undefined && typeof window.localStorage !== 'undefined').catch(() => false);
  record('saves use browser storage', persisted);
  record('no page errors', errors.length === 0, errors.join(' || '));
  await browser.close();
  server?.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} smoke checks passed. Screenshots in tools/out/.`);
process.exit(failed.length ? 1 : 0);
