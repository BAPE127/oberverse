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
  // v0.53.1: a themed panel's look (Marty's paper showroom) must not leak into the next panel —
  // the cage's text read dark grey on navy after visiting the car lot
  {
    const ink = await page.evaluate(() => {
      const ui = window.oberverse.ui;
      ui.openPanel('dealer', { dealer: 'fender' });
      ui.closeAllPanels();
      ui.openPanel('logbook', {});
      const p = document.querySelector('#modal-body p, #modal-body div');
      const c = p ? getComputedStyle(p).color : 'none';
      ui.closeAllPanels(); ui.afterModalClose();
      return { c, cls: document.querySelector('#modal-body').className };
    });
    const m = /rgb\((\d+), (\d+), (\d+)/.exec(ink.c);
    record('panel text stays light after a themed panel', Boolean(m) && (+m[1] + +m[2] + +m[3]) / 3 > 150 && !/dealer/.test(ink.cls), JSON.stringify(ink));
  }
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

  // Inventory, tablet (the old journal), map panels
  for (const [key, name, title] of [['KeyI', 'inventory', 'inventory'], ['KeyJ', 'tablet', 'oberpad'], ['KeyM', 'map', 'map']]) {
    await closeAll();
    await page.keyboard.press(key);
    await wait(300);
    record(`${name} panel opens`, (await page.textContent('#modal-title')).toLowerCase().includes(title));
    await shot(`05-${name}`);
    await page.keyboard.press('Escape');
    await wait(200);
  }

  // The OberPad (v0.83.0): the home screen of icons, an app with a back arrow, and the Loans flow — terms before money, then Accept
  await closeAll();
  await page.evaluate(() => { const ui = window.oberverse.ui; const g = ui.game; g.player.money = 3_000_000; g.corp.ensureWorld(); g.market.state; g.clock.total += 1440; g.corp.dailyTick(); const r = g.corp.exchange.board().find((x) => x.source === 'generated'); g.corp.exchange.buy(r.ticker, 200); ui.openPanel('tablet', { tab: 'Home' }); });
  await wait(300);
  record('OberPad home shows icons and no wall of words', (await page.$$('.tb-grid .tb-icon')).length >= 4 && (await page.textContent('#modal-body')).split(/\s+/).length < 120);
  await page.click('.tb-grid .tb-icon:has-text("Bank")'); await wait(200);
  await page.click('.tb-seg button:has-text("Loans")'); await wait(200);
  const m0 = await page.evaluate(() => window.oberverse.ui.game.player.money);
  await page.click('.tb-btn.pri'); await wait(200);
  const chip = page.locator('.tb-label:has-text("How much") + .tb-chips .tb-chip').first();
  const lent = Number((await chip.textContent()).split('·')[0].replace(/[^0-9]/g, '')); // whatever the first amount on offer is: the room depends on the share price
  await chip.click(); await wait(250);
  const terms = await page.textContent('#modal-body');
  record('OberPad: a loan shows its terms before any money moves', terms.includes('you repay') && (await page.evaluate(() => window.oberverse.ui.game.player.money)) === m0);
  await page.click('.tb-terms .tb-btn.pri'); await wait(250);
  record('OberPad: Accept signs the loan', lent > 0 && (await page.evaluate(() => window.oberverse.ui.game.player.money)) === m0 + lent);
  await page.click('.tb-back'); await wait(200);
  record('OberPad: the back arrow returns to the home screen', (await page.textContent('#modal-body')).includes('Good '));
  await closeAll();

  // OberPad stage 2 (v0.84.0): the heavy apps open on a summary, with the whole old page one tap down
  await page.evaluate(() => { const ui = window.oberverse.ui; const g = ui.game; g.aero.buyFirm(); g.corp.ensureWorld(); g.corp.group.form(); ui.openPanel('tablet', { tab: 'Management' }); });
  await wait(300);
  const mText = await page.textContent('#modal-body');
  record('OberPad: Management opens on a short summary, not a wall of settings', mText.split(/\s+/).length < 150 && !mText.includes('Treasury policy'));
  await page.click('.tb-fold > summary'); await wait(300);
  record('OberPad: the fold opens the full Management page', (await page.textContent('#modal-body')).includes('Budgets'));
  await page.evaluate(() => window.oberverse.ui.openPanel('tablet', { tab: 'Exchange' })); await wait(300);
  record('OberPad: Exchange opens on your holdings, the board one tap down', (await page.textContent('#modal-body')).includes('Your shares are worth'));
  await closeAll();

  // OberPad finished (v0.85.0): Business and Standing open on summaries too
  await page.evaluate(() => { const ui = window.oberverse.ui; const g = ui.game; g.player.money = 5_000_000; g.arms.buyLicence(); g.arms.buy('aw1'); ui.openPanel('tablet', { tab: 'Business' }); });
  await wait(300);
  const bText = await page.textContent('#modal-body');
  record('OberPad: Business opens on a summary of the arms trade', bText.includes('Your arms trade') && bText.split(/\s+/).length < 120);
  await page.click('.tb-fold > summary'); await wait(400);
  record('OberPad: the Business fold opens the works console', (await page.textContent('#modal-body')).toUpperCase().includes('OVERWATCH'));
  await page.evaluate(() => window.oberverse.ui.openPanel('tablet', { tab: 'Standing' })); await wait(300);
  record('OberPad: Standing opens on a summary', (await page.textContent('#modal-body')).includes('How the borough sees you'));
  await closeAll();

  // The headquarters (v0.86.0): bought from the Group app, from the parent's own account; the door opens
  await page.evaluate(() => { const ui = window.oberverse.ui; const g = ui.game; g.player.money = 5_000_000; g.corp.contribute('parent', 200_000); while (ui.panelStack.length) ui.closePanel(); ui.openPanel('tablet', { tab: 'Group' }); });
  await wait(300);
  const parent0 = await page.evaluate(() => window.oberverse.ui.game.corp.account('parent').cash);
  await page.click('.tb-row:has-text("Small Office") .tb-mini'); await wait(250);
  const terms2 = await page.textContent('#modal-body');
  record('Headquarters: Buy shows the terms and spends nothing', terms2.includes('Buy The Ledger Row Office?') && (await page.evaluate(() => window.oberverse.ui.game.corp.account('parent').cash)) === parent0);
  await page.click('.tb-terms .tb-btn.pri'); await wait(300);
  record('Headquarters: the parent pays exactly the price and the door opens', parent0 - (await page.evaluate(() => window.oberverse.ui.game.corp.account('parent').cash)) === 25000 && await page.evaluate(() => { const g = window.oberverse.ui.game; return g.playerCanPass(g.maps.get('halvermouth').doors.find((d) => d.building === 'b_hq_small')); }));
  await closeAll();

  // Furnishing (v0.88.0): the Furnish screen shows the price before any money moves, then the parent pays exactly that and the hall changes
  await page.evaluate(() => { const ui = window.oberverse.ui; while (ui.panelStack.length) ui.closePanel(); ui.openPanel('tablet', { tab: 'Group' }); });
  await wait(300);
  const fur0 = await page.evaluate(() => window.oberverse.ui.game.corp.account('parent').cash);
  await page.click('.tb-row:has-text("Small Office") .tb-mini'); await wait(250);
  await page.click('.tb-sw:nth-child(2)'); await wait(250);
  const furTerms = await page.textContent('#modal-body');
  record('Furnishing: the choice shows its price and spends nothing until confirmed', furTerms.includes('Desks: Oak?') && furTerms.includes('400 obols once') && (await page.evaluate(() => window.oberverse.ui.game.corp.account('parent').cash)) === fur0);
  await page.click('.tb-terms .tb-btn.pri'); await wait(300);
  const furAfter = await page.evaluate(() => { const g = window.oberverse.ui.game; return { cash: g.corp.account('parent').cash, desks: g.hq.styleOf('small').desks, color: g.maps.get('hq_small').props.find((p) => p.type === 'desk').color }; });
  record('Furnishing: the parent pays exactly the price and the desks change', fur0 - furAfter.cash === 400 && furAfter.desks === 'oak' && furAfter.color === '#b98a56', JSON.stringify(furAfter));
  await closeAll();

  // Officers at work (v0.87.0): the parent's hires get bodies in the office it owns; the office has only so many seats
  const offi = await page.evaluate(() => { const g = window.oberverse.ui.game; g.player.money = 5_000_000; const pe = g.corp.personnel; const role = ['ceo', 'cfo', 'coo', 'controller', 'cso', 'cpo', 'hrd', 'accountant', 'analyst'].find((q) => pe.candidates().some((x) => x.roles.includes(q))); const c = pe.candidates().find((x) => x.roles.includes(role)); const r = pe.offer(c.id, { role, employer: 'parent', pay: c.floor + 5 }); g.hq.minuteTick(); return { ok: r.ok, body: Boolean(r.person && g.npcs.get(r.person.id)?.profile.hqStaff) }; });
  record('Officers: a hire at the parent gets a body in the office it owns', offi.ok && offi.body);
  const seat = await page.evaluate(() => { const g = window.oberverse.ui.game; const pe = g.corp.personnel; let last = null; for (const role of ['ceo', 'cfo', 'coo', 'controller', 'cso', 'cpo', 'hrd', 'gm', 'accountant', 'analyst']) { if (pe.holders('parent', role).length) continue; const c = pe.candidates().find((x) => x.roles.includes(role) && !pe.holders('parent').some((p) => p.id === x.id)); if (!c) continue; last = pe.offer(c.id, { role, employer: 'parent', pay: c.floor + 5 }); if (!last.ok && /seats/.test(last.text)) break; } return last ? last.text : ''; });
  record('Officers: the small office has only three seats', /seats for 3 officers/.test(seat), seat);

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

  // v0.59.0: the aerospace terminal's pages all draw (Roost owned, a satellite up, a launch on the pad)
  await closeAll();
  const pages = await page.evaluate(async () => {
    const ui = window.oberverse.ui;
    const g = ui.game;
    g.player.money = 30e6;
    g.aero.buyFirm();
    const A = g.aero;
    const P = A.cfg.products.st_relay;
    A.state.satellites.SMOKE = { id: 'SMOKE', name: 'Smoke-01', product: 'st_relay', role: 'comms', service: { ...P.service }, owner: A.roost.id, manufacturer: A.roost.id, own: true, status: 'operational', capability: 1, lifeDays: 60, commissioned: g.clock.total, endsAt: g.clock.total + 60 * 1440, price: 1, opex: 600, value: 100000, book: 90000, hardened: false, config: {} };
    A.roost.books.fleet = 90000;
    const seen = [];
    for (const mode of ['floor', 'tenders', 'contracts', 'supply', 'hangar', 'research', 'orbit', 'standing', 'books', 'meridian']) {
      ui.openPanel('aerospace', { mode });
      await new Promise((r) => setTimeout(r, 120));
      seen.push([mode, document.querySelector('.ao') ? document.querySelector('.ao').textContent.length : 0]);
      if (mode === 'books') for (const label of ['Month by month', 'Cash flow', 'Balance sheet', 'By line of work']) { [...document.querySelectorAll('.ao-chip')].find((b) => b.textContent === label)?.click(); await new Promise((r) => setTimeout(r, 80)); seen.push([label, document.querySelector('.ao-sheet').textContent.length]); }
    }
    return seen;
  });
  record('the aerospace terminal draws every page (floor, tenders, research, orbit, books…)', pages.every(([, n]) => n > 300), JSON.stringify(pages.filter(([, n]) => n <= 300)));
  await closeAll();
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
