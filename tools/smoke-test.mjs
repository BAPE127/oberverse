// Browser smoke test: opens the standalone index.html straight from disk
// (file://, no server — exactly how players run it), drives it in headless
// Chromium with Playwright, checks for runtime errors and writes screenshots
// to tools/out/. Requires Playwright (globally installed is fine):
//   npm run smoke            standalone index.html via file://
//   npm run smoke -- --dev   multi-file dev.html via the local dev server
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
// v0.104.0: in the isometric view on-foot keys follow the screen: W alone walks north-west, so world-north is W and D together,
// world-south is S and A, world-east is D and S, world-west is W and A.
const hold = async (keys, ms) => { const ks = [].concat(keys); for (const k of ks) await page.keyboard.down(k); await wait(ms); for (const k of ks) await page.keyboard.up(k); };
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
  const tNew = await page.evaluate(() => performance.now());
  await page.click('#new-start');
  // docs/RENDERING.md 7: the world is drawn by three.js (WebGL) when it can be: headless Chromium has a software GL, so it must be in 3D mode
  await page.waitForFunction(() => (window.oberverse?.ui?.renderer?.world3d?.frameNo || 0) > 0, null, { timeout: 20000 }).catch(() => {});
  const first3d = (await page.evaluate(() => performance.now())) - tNew;
  await wait(800);
  let s = await state();
  record('new game starts in the flat', s.state === 'playing' && s.map === 'player_flat', JSON.stringify(s));
  const m3 = await page.evaluate(() => { const R = window.oberverse.ui.renderer; return { mode: R.mode, iso: R.iso, isoNow: R.isoNow, w3d: Boolean(R.world3d), glVisible: getComputedStyle(document.getElementById('game3d')).display, frames: R.world3d?.frameNo || 0, software: R.world3d?.software, quality: R.quality }; });
  record('3d: the renderer is in 3D mode with a live WebGL canvas under the 2D one', m3.mode === '3d' && m3.iso && m3.isoNow && m3.w3d && m3.glVisible === 'block' && m3.frames > 0, JSON.stringify({ ...m3, firstFrameMs: Math.round(first3d) }));
  await shot('02-flat');

  // Read the letter on the desk: walk up to the back wall, the desk is beside us
  await hold(['KeyW', 'KeyD'], 1400); // (north)
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
  await hold(['KeyS', 'KeyA'], 2600); // (south)
  await wait(500);
  s = await state();
  record('walking out of the door reaches Lanternside', s.map === 'lanternside', JSON.stringify(s));
  await hold(['KeyS', 'KeyA'], 500);
  await hold(['KeyD', 'KeyS'], 900); // (east)
  await shot('04-outside');

  // ---- the 3D view (docs/RENDERING.md 7): the camera, people facing the way they walk, light, the 2D fallback, numbers. Screenshots: 3d-*.png
  // (Early in the run on purpose: the world is still the day-one town, with the cafe, its people and an open street; the later steps grow it.)
  // (A software GL turns the shadow map off by default; the pictures are taken with it on.)
  const at3d = (code) => page.evaluate(async (code) => {
    const ui = window.oberverse.ui; const g = ui.game; const R = ui.renderer; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    while (ui.panelStack.length) ui.closePanel();
    const AF = Object.getPrototypeOf(async function () {}).constructor;
    return new AF('ui', 'g', 'R', 'T', code)(ui, g, R, T);
  }, code);
  await closeAll();
  await at3d(`R.quality = 'high'; R.qualityChosen = true; g.clock.total = 13 * 60; g.changeMap('lanternside', 'cafe_door_out'); R.snapCamera(); await T(2500);`);
  const cam = await at3d(`
    // the 3D camera against the 2D mapping, on the live canvas: every point lands on the pixel toScreen gives
    const W = R.world3d, p = new R.world3d.camera.position.constructor(); let worst = 0;
    for (const [dx, dy, z] of [[0, 0, 0], [200, 90, 0], [-150, 300, 46], [400, -250, 120], [32, 32, 420]]) {
      const wx = g.player.x + dx, wy = g.player.y + dy;
      p.set(wx / 32, z / 32, wy / 32).project(W.camera);
      const a = R.toScreen(wx, wy, z), bx = (p.x + 1) / 2 * R.canvas.width, by = (1 - p.y) / 2 * R.canvas.height;
      worst = Math.max(worst, Math.hypot(a.x - bx, a.y - by));
    }
    return { worst: Math.round(worst * 1000) / 1000, stats: W.stats, mode: R.mode };`);
  record('3d: the live WebGL camera lands world points on the pixels toScreen gives (within 0.5 px)', cam.worst < 0.5 && cam.mode === '3d' && cam.stats.calls > 0, JSON.stringify(cam));
  await shot('3d-street');
  const inside = await at3d(`g.changeMap('cafe', 'entry'); R.snapCamera(); await T(3500);
    const b = g.maps.get('lanternside').buildings.find((q) => q.id === 'b_cafe'); const e = [...R.world3d.mapScenes.get('lanternside').buildings.values()].find((q) => q.b === b);
    return { open: R.bld.stateOf(b).t, roofed: Boolean(e.roofed?.group.visible), openVisible: Boolean(e.open?.visible), figures: R.world3d.stats.figures, props: R.world3d.stats.props };`);
  record('3d: inside the cafe the room is open (the roof gone, its walls, props and people drawn)', inside.open === 1 && !inside.roofed && inside.openVisible && inside.figures >= 2 && inside.props > 3, JSON.stringify(inside));
  await shot('3d-interior');
  const night = await at3d(`g.changeMap('lanternside', 'civic_door_out'); g.clock.total = 22 * 60 + 30; R.snapCamera(); await T(3500); return { lights: R.world3d.stats.lights, darkness: g.clock.darkness, dark2d: R.world3d.host.ctx === R.ctx };`);
  record('3d: at night the street lamps and lit doors are real lights (and the 2D darkness overlay is off)', night.lights > 0 && night.darkness > 0.45, JSON.stringify(night));
  await shot('3d-night');
  // people: eight walkers, one in each direction; each figure turns to face the way it goes
  const walk = await at3d(`g.clock.total = 13 * 60; g.changeMap('lanternside', 'cafe_door_out'); R.snapCamera(); await T(1500);
    const ns = [...g.npcs.values()].filter((n) => !n.dead && !n.profile.appearance.species).slice(0, 8);
    const start = { x: g.player.x, y: g.player.y };
    const saved = ns.map((n) => ({ n, map: n.map, x: n.x, y: n.y, moving: n.moving, activity: n.activity, hostile: n.hostile }));
    ns.forEach((n) => { n.map = g.player.map; n.hostile = null; n.moving = true; n.activity = 'idle'; n.riding = null; n.downUntil = 0; });
    const k = { n: 0 };
    g.paused = true; // (the simulation's own walking would fight the staged walk)
    const id = setInterval(() => { k.n++; ns.forEach((n, i) => { const a = i * Math.PI / 4; if (k.n === 1) { n.x = start.x + Math.cos(a) * 44; n.y = start.y + Math.sin(a) * 44; } else { n.x += Math.cos(a) * 0.5; n.y += Math.sin(a) * 0.5; } n.animTime = (n.animTime || 0) + 0.02; }); }, 20);
    await T(2500);
    const out = ns.map((n, i) => { const a = i * Math.PI / 4; const m = R.world3d.figures.get(n)?.motion; let d = m ? Math.abs(m.yaw - Math.atan2(Math.cos(a), Math.sin(a))) : 9; d = Math.min(d, Math.PI * 2 - d); return Math.round(d * 100) / 100; });
    clearInterval(id); g.paused = false; for (const q of saved) Object.assign(q.n, { map: q.map, x: q.x, y: q.y, moving: q.moving, activity: q.activity, hostile: q.hostile }); return out;`);
  record('3d: eight people walking in eight directions each face the way they go (within 0.35 rad)', walk.length === 8 && walk.every((d) => d < 0.35), JSON.stringify(walk));
  await shot('3d-people');
  const aimed = await at3d(`const g2 = g; g.inventory.add('item_revolver', 1, { silent: true }); g.combat.equip('item_revolver'); const c = R.toScreen(g.player.x + 120, g.player.y - 60, 18); ui.mouse.x = c.x; ui.mouse.y = c.y; ui.mouse.movedAt = ui.time; await T(1500);
    const m = R.world3d.figures.get(g.player)?.motion; let d = m ? Math.abs(m.yaw - Math.atan2(120, -60)) : 9; d = Math.min(d, Math.PI * 2 - d); return { d: Math.round(d * 100) / 100, hold: Boolean(R.world3d.figures.get(g.player)) };`);
  record('3d: aiming a gun with the mouse turns the player\'s figure to the aim', aimed.hold && aimed.d < 0.2, JSON.stringify(aimed));
  await shot('3d-aim');
  // gunfire in 3D (src/engine3d/combatfx3d.js): a bullet and a blood pool the simulation holds are meshes in the WebGL canvas: the pixels there change when the effect layer is switched off for a frame
  const fxPix = await at3d(`const W3 = R.world3d; const gl = W3.gl.getContext(); const H = R.canvas3d.height; const M = g.player.map; const X = g.player.x + 70; const Y = g.player.y + 10;
    const px = (x, y) => { const o = new Uint8Array(4 * 25); gl.readPixels(Math.round(x) - 2, H - Math.round(y) - 2, 5, 5, gl.RGBA, gl.UNSIGNED_BYTE, o); return o; };
    const dif = (a, b) => { let m = 0; for (let i = 0; i < a.length; i += 4) m = Math.max(m, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2])); return Math.round(m); };
    g.combat.bullets.push({ map: M, x: X, y: Y - 18, dx: 1, dy: 0, left: 900, speed: 0, kind: null, hurts: null, born: g.realTime });
    g.combat.decals.push({ kind: 'pool', map: M, x: X + 40, y: Y + 30, size: 1, at: g.realTime - 10 });
    const spots = [R.toScreen(X, Y, 23), R.toScreen(X + 40, Y + 30, 0)];
    W3.render(0.016); const on = spots.map((q) => px(q.x, q.y));
    W3.cfx.group.visible = false; W3.render(0.016); const off = spots.map((q) => px(q.x, q.y)); W3.cfx.group.visible = true;
    const n = { bullets: W3.cfx.stats.streaks, decals: W3.cfx.stats.decals };
    g.combat.bullets.pop(); g.combat.decals.pop(); W3.render(0.016);
    return { tracer: dif(on[0], off[0]), blood: dif(on[1], off[1]), n };`);
  record('3d: a bullet streak and a blood pool appear in the WebGL canvas (pixels change when the effect layer is off)', fxPix.tracer > 40 && fxPix.blood > 20, JSON.stringify(fxPix));
  await at3d(`ui.mouse.movedAt = -1e9; g.combat.equip(null); g.inventory.remove('item_revolver', 1);`); // (leave the pockets as they were: a giftable item adds a dialogue option later)
  const car = await at3d(`const m = g.maps.get('halvermouth'); g.changeMap('halvermouth', Object.keys(m.spots)[0]); g.clock.total = 14 * 60; R.snapCamera();
    const c = g.vehicles.carsOn('halvermouth')[0]; Object.assign(c, { x: g.player.x + 60, y: g.player.y + 90, angle: 0.4, speed: 0 }); await T(2500);
    const e = R.world3d.vehicles.get(c); return { has: Boolean(e), fallback: Boolean(e?.obj.userData.fallback), rot: e ? Math.round(e.obj.rotation.y * 1000) / 1000 : null, want: -0.4, vehicles: R.world3d.stats.vehicles };`);
  record('3d: a car on the road is a model turned by -angle (the fallback two-box car until a builder is registered)', car.has && Math.abs(car.rot - car.want) < 0.01 && car.vehicles >= 1, JSON.stringify(car));
  await shot('3d-car');
  const aloft = await at3d(`const m = [...g.maps.values()].find((q) => q.def && q.def.aloft && !q.def.aloft.roof); g.changeMap(m.id, Object.keys(m.spots)[0]); R.snapCamera(); await T(3000); return { map: g.player.map, mode: R.mode, calls: R.world3d.stats.calls };`);
  record('3d: an aloft tower floor is drawn open', aloft.mode === '3d' && aloft.calls > 0, JSON.stringify(aloft));
  await shot('3d-aloft');
  await at3d(`g.clock.total = 10 * 60; g.changeMap('fort_gullcrest', 'south_gate'); R.snapCamera(); await T(3000);`);
  await shot('3d-fort');
  // memory: the maps just left are dropped (the scenes, ground quads and geometries do not pile up)
  const mem = await at3d(`const out = []; for (const id of ['lanternside', 'halvermouth', 'fort_gullcrest', 'lanternside', 'halvermouth']) { g.changeMap(id, Object.keys(g.maps.get(id).spots)[0]); R.snapCamera(); await T(1200); out.push([R.world3d.gl.info.memory.geometries, R.world3d.gl.info.memory.textures, R.world3d.ground.size]); } return out;`);
  record('3d: the ground quads stay under their cap while the player moves between maps', mem.every((r) => r[2] <= 150), JSON.stringify(mem));
  // numbers: frame time over 200 frames in two views, and what the GPU was asked to draw
  const numbers = await at3d(`
    const frames = async (n) => { const t = []; let last = performance.now(); await new Promise((res) => { let i = 0; const f = () => { const now = performance.now(); t.push(now - last); last = now; if (++i < n) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); return t; };
    const out = {};
    for (const [name, map, spot] of [['halvermouth', 'halvermouth', 'north_gate'], ['lanternside', 'lanternside', 'cafe_door_out']]) {
      g.clock.total = 12 * 60; g.changeMap(map, spot); R.snapCamera(); await T(2500);
      for (const q of ['low', 'high']) {
        R.quality = q; await T(800);
        const t = await frames(200); const s = R.world3d.stats;
        out[name + '-' + q] = { avgFrameMs: Math.round(t.reduce((a, b) => a + b, 0) / t.length * 10) / 10, jsMs: Math.round(s.frameMs * 10) / 10, calls: s.calls, triangles: s.triangles, geometries: s.geometries, textures: s.textures, quads: s.quads, buildings: s.buildings, props: s.props, figures: s.figures, software: s.software };
      }
    }
    return out;`);
  writeFileSync(`${OUT}3d-numbers.json`, JSON.stringify({ firstFrameMs: Math.round(first3d), ...numbers }, null, 2));
  record('3d: frame numbers measured (software GL in headless Chromium; see tools/out/3d-numbers.json)', Object.values(numbers).every((n) => n.calls > 0 && n.avgFrameMs > 0), JSON.stringify(numbers));
  await at3d(`R.quality = 'low'; g.changeMap('lanternside', 'cafe_door_out'); R.snapCamera(); await T(1000);`);
  // the Canvas 2D isometric view as the fallback and for comparison, switched live from the console
  const two = await at3d(`R.mode = 'iso2d'; await T(1500); return { mode: R.mode, iso: R.iso, isoNow: R.isoNow, gl: getComputedStyle(document.getElementById('game3d')).display };`);
  record('iso2d: the mode switch works live; the 2D isometric view draws and the WebGL canvas is hidden', two.mode === 'iso2d' && two.iso && two.isoNow && two.gl === 'none', JSON.stringify(two));
  await shot('3d-iso2d-fallback');
  const flat = await at3d(`R.mode = 'flat'; await T(600); const f = { mode: R.mode, iso: R.iso, isoNow: R.isoNow }; R.mode = '3d'; await T(1500); return { ...f, back: R.mode, gl: getComputedStyle(document.getElementById('game3d')).display };`);
  record('3d: the old top-down view is still one setting away and 3D comes back', flat.mode === 'flat' && !flat.iso && !flat.isoNow && flat.back === '3d' && flat.gl === 'block', JSON.stringify(flat));
  await closeAll();


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
  // Managers (v0.89.0): one short screen; the price is read before any money moves; the boxes are ticks
  await page.evaluate(() => { const ui = window.oberverse.ui; const g = ui.game; g.aero.buyFirm(); g.corp.ensureWorld(); g.corp.group.form(); g.corp.contribute('aerospace', 600000); ui.openPanel('tablet', { tab: 'Managers' }); });
  await wait(300);
  const mText = await page.textContent('#modal-body');
  record('Managers: opens on a short screen with a hire button, not a wall of settings', mText.split(/\s+/).length < 120 && mText.includes('Hire a manager'), String(mText.split(/\s+/).length));
  const aero0 = await page.evaluate(() => window.oberverse.ui.game.corp.cashOf('aerospace'));
  await page.click('.tb-mgr .tb-btn.pri'); await wait(250);
  const hireText = await page.textContent('#modal-body');
  record('Managers: hiring shows the wage and the fee and spends nothing until confirmed', hireText.includes('a day, and') && hireText.includes('to sign') && (await page.evaluate(() => window.oberverse.ui.game.corp.cashOf('aerospace'))) === aero0);
  await page.click('.tb-terms .tb-btn.pri'); await wait(300);
  const hired = await page.evaluate(() => { const g = window.oberverse.ui.game; const x = g.corp.personnel.holders('aerospace', 'manager')[0]; return { x: Boolean(x), fee: x ? x.salary * 10 : 0, paid: 0 }; });
  record('Managers: the manager is hired at the flat wage with every box ticked', hired.x && (await page.$$('.tb-check.on')).length === 5);
  await page.click('.tb-check:nth-child(1)'); await wait(250);
  record('Managers: unticking a box is one tap and takes effect', await page.evaluate(() => { const g = window.oberverse.ui.game; const x = g.corp.personnel.holders('aerospace', 'manager')[0]; return g.corp.personnel.may(x, 'reorder') === false; }));
  // The business screens and the inbox (v0.90.0)
  await page.evaluate(() => { const ui = window.oberverse.ui; const g = ui.game; g.clock.total += 1440; g.corp.management.dailyTick(); while (ui.panelStack.length) ui.closePanel(); ui.openPanel('tablet', { tab: 'Home' }); });
  await wait(300);
  record('OberPad: Home has one "Needs you" card with a count', /Needs you\s*\d+/.test((await page.textContent('#modal-body')).replace(/\n/g, ' ')));
  await page.evaluate(() => window.oberverse.ui.openPanel('tablet', { tab: 'Aerospace' })); await wait(300);
  const aText = await page.textContent('#modal-body');
  record('OberPad: a business screen is the same shape — result, three figures, Do next, manager, one fold, and few words', aText.includes('Made this month') && (await page.$$('.tb-tile')).length === 3 && (await page.$$('.tb-fold')).length === 1 && aText.split(/\s+/).length < 90, String(aText.split(/\s+/).length));
  await page.evaluate(() => window.oberverse.ui.openPanel('tablet', { tab: 'Needs' })); await wait(300);
  const needsBefore = await page.evaluate(() => ({ n: window.oberverse.ui.game.corp.management.peek().pending.length, cash: window.oberverse.ui.game.corp.cashOf('aerospace') }));
  await page.click('.tb-btns .tb-btn.pri'); await wait(350);
  const needsAfter = await page.evaluate(() => ({ n: window.oberverse.ui.game.corp.management.peek().pending.length, cash: window.oberverse.ui.game.corp.cashOf('aerospace') }));
  record('OberPad: Yes in the inbox answers the request, once, and the firm pays for it', needsBefore.n >= 1 && needsAfter.n === needsBefore.n - 1 && needsAfter.cash < needsBefore.cash, JSON.stringify([needsBefore, needsAfter]));
  // The take-off notice (v0.91.0)
  await page.evaluate(() => { const ui = window.oberverse.ui; while (ui.panelStack.length) ui.closePanel(); const g = ui.game; const A = g.aero; const id = A.registerAircraft(A.roost, { id: 'U-smoke', product: 'ap_skylark', contract: null, config: {} }); const ac = A.state.aircraft[id]; A.announceDeparture(ac, A.clearForDeparture(ac)); });
  await wait(500);
  const wnText = await page.evaluate(() => document.getElementById('watchnote').innerText);
  record('Take-off notice: a big card at the bottom left counts down to the take-off', /takes off in \d+ min|taking off now/.test(wnText) && wnText.includes('Watch it'), wnText.replace(/\s+/g, ' '));
  await page.click('#watchnote .wn-go'); await wait(700);
  record('Take-off notice: Watch it takes you to the runway viewpoint on Starling Field', (await page.evaluate(() => window.oberverse.ui.game.currentMap().id)) === 'starling_flats');
  await page.evaluate(() => window.oberverse.ui.openPanel('tablet', { tab: 'Exchange' })); await wait(300);
  record('OberPad: Exchange opens on your holdings, the board one tap down', (await page.textContent('#modal-body')).includes('Your shares are worth'));
  await closeAll();

  // OberPad finished (v0.85.0): Business and Standing open on summaries too
  await page.evaluate(() => { const ui = window.oberverse.ui; const g = ui.game; g.player.money = 5_000_000; g.arms.buyLicence(); g.arms.buy('aw1'); ui.openPanel('tablet', { tab: 'Business' }); });
  await wait(300);
  const bText = await page.textContent('#modal-body');
  record('OberPad: the arms business is labelled Arms', (await page.textContent('.tb-nav .tb-title')).includes('Arms') && (await page.textContent('.tb-seg')).includes('Arms'));
  record('OberPad: Business opens on the same short screen as every business (result, figures, Do next)', bText.includes('Made this month') && bText.split(/\s+/).length < 90, String(bText.split(/\s+/).length));
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
  await page.click('.tb-row:has-text("Small Office") .tb-mini.pri'); await wait(250);
  await page.click('.tb-sw:nth-child(2)'); await wait(250);
  const furTerms = await page.textContent('#modal-body');
  record('Furnishing: the choice shows its price and spends nothing until confirmed', furTerms.includes('Desks: Oak?') && furTerms.includes('400 obols once') && (await page.evaluate(() => window.oberverse.ui.game.corp.account('parent').cash)) === fur0);
  await page.click('.tb-terms .tb-btn.pri'); await wait(300);
  const furAfter = await page.evaluate(() => { const g = window.oberverse.ui.game; return { cash: g.corp.account('parent').cash, desks: g.hq.styleOf('small').desks, color: g.maps.get('hq_small').props.find((p) => p.type === 'desk').color }; });
  record('Furnishing: the parent pays exactly the price and the desks change', fur0 - furAfter.cash === 400 && furAfter.desks === 'oak' && furAfter.color === '#b98a56', JSON.stringify(furAfter));
  await closeAll();

  // Officers at work (v0.87.0): the parent's hires get bodies in the office it owns; the office has only so many seats
  const offi = await page.evaluate(() => { const g = window.oberverse.ui.game; g.player.money = 5_000_000; const pe = g.corp.personnel; const r = pe.hire('group_manager', 'parent'); g.hq.minuteTick(); return { ok: r.ok, body: Boolean(r.person && g.npcs.get(r.person.id)?.profile.hqStaff) }; });
  record('Officers: a hire at the parent gets a body in the office it owns', offi.ok && offi.body);
  const seat = await page.evaluate(() => { const g = window.oberverse.ui.game; const pe = g.corp.personnel; let last = null; for (let i = 0; i < 6; i++) { last = pe.hire('office', 'parent'); if (!last.ok) break; } return last ? last.text : ''; });
  record('Officers: the small office has only three seats', /seats for 3 officers/.test(seat), seat);

  // Teleport next to Mags (test hook) and talk to her
  await closeAll();
  await page.evaluate(() => {
    const g = window.oberverse.ui.game;
    const mags = g.npcs.get('npc_mags');
    // she must be at the counter for the shop: a long run can land in her break or one of her natters, so step the clock until she is back
    for (let i = 0; i < 200 && !(mags.activity === 'work' && mags.map === 'cafe'); i++) g.skipTime(5);
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
  // v0.92.0: the Atlas on the arms terminal's globe and in Fleet Command
  const atlas = await page.evaluate(async () => {
    const ui = window.oberverse.ui;
    const g = ui.game;
    g.player.money = Math.max(g.player.money, 5e6);
    if (!g.getFlag('arms_licence')) g.arms.buyLicence();
    if (!g.arms.ownedIds().length) g.arms.buy('aw1');
    const out = {};
    ui.openPanel('terminal', { warehouse: g.arms.ownedIds()[0], tab: 'Overview' });
    await new Promise((r) => setTimeout(r, 300));
    const btn = document.querySelector('.os-mini[title^="The world atlas"]');
    out.terminalButton = Boolean(btn);
    btn?.click();
    for (let i = 0; i < 3; i++) document.querySelector('.os-mini[title="Zoom in"]')?.click();
    await new Promise((r) => setTimeout(r, 400));
    out.terminalOn = Boolean(btn?.classList.contains('on'));
    btn?.click(); // leave it as it was
    ui.closeAllPanels();
    ui.openPanel('fleet', {});
    await new Promise((r) => setTimeout(r, 400));
    const fb = [...document.querySelectorAll('.fc-btn')].find((b) => /Atlas/.test(b.textContent));
    out.fleetButton = Boolean(fb);
    fb?.click();
    await new Promise((r) => setTimeout(r, 400));
    out.fleetOn = Boolean([...document.querySelectorAll('.fc-btn')].find((b) => /Atlas/.test(b.textContent))?.classList.contains('on'));
    [...document.querySelectorAll('.fc-btn')].find((b) => /Atlas/.test(b.textContent))?.click();
    return out;
  });
  record('the Atlas switches on in the arms terminal globe and in Fleet Command without errors', atlas.terminalButton && atlas.terminalOn && atlas.fleetButton && atlas.fleetOn, JSON.stringify(atlas));
  // v0.93.0: the Politics app (read-only) opens from the tablet and shows who governs
  const pol = await page.evaluate(async () => {
    const ui = window.oberverse.ui;
    while (ui.panelStack.length) ui.closePanel();
    ui.openPanel('tablet', { tab: 'Politics' });
    await new Promise((r) => setTimeout(r, 300));
    const text = document.querySelector('#modal-body')?.textContent || '';
    return { text: text.slice(0, 300), ok: /Government of Sund/.test(text) && /Josiah Vegas|Susan/.test(text) };
  });
  record('the Politics app opens on the tablet and names the government and its leader', pol.ok, pol.text.slice(0, 120));
  // v0.94.0: the Government and Polls sections of the Politics app
  const pol2 = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const out = {};
    for (const t of ['Government', 'Polls']) {
      ui.polTab = t; while (ui.panelStack.length) ui.closePanel(); ui.openPanel('tablet', { tab: 'Politics' });
      await new Promise((r) => setTimeout(r, 250));
      const text = document.querySelector('#modal-body')?.textContent || '';
      out[t] = t === 'Government' ? /policies in force/.test(text) && /state's books/.test(text) : /Approval of the government/.test(text) && /±/.test(text);
    }
    ui.polTab = 'Overview';
    return out;
  });
  record('the Politics app shows the Government (policies, the state\'s books) and the Polls (with margins)', pol2.Government && pol2.Polls, JSON.stringify(pol2));

  // v0.95.0: the Vote (election and donations) and Influence (standing, doors, an offer shown plainly) sections
  const pol3 = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const out = {};
    const see = async (tab) => { ui.polTab = tab; while (ui.panelStack.length) ui.closePanel(); ui.openPanel('tablet', { tab: 'Politics' }); await new Promise((r) => setTimeout(r, 250)); return document.querySelector('#modal-body')?.textContent || ''; };
    g.player.money = Math.max(g.player.money, 200000);
    out.vote = /The next election/.test(await see('Campaign')) && /Donate to/.test(document.querySelector('#modal-body').textContent);
    const before = g.player.money;
    document.querySelectorAll('#modal-body .tb-chip')[1]?.click(); await new Promise((r) => setTimeout(r, 250));
    out.donated = g.player.money < before && /public and recorded|Public and recorded/.test(document.querySelector('#modal-body')?.textContent || '');
    out.influence = /Your standing/.test(await see('Influence')) && /Money alone does not open a door/.test(document.querySelector('#modal-body').textContent);
    const ask = [...document.querySelectorAll('#modal-body .tb-mini')].find((b) => /Ask/.test(b.textContent));
    if (ask) { ask.click(); await new Promise((r) => setTimeout(r, 250)); }
    out.contact = /Ask for a meeting/.test(document.querySelector('#modal-body')?.textContent || '');
    const choose = [...document.querySelectorAll('#modal-body .tb-mini')].find((b) => /Choose/.test(b.textContent));
    if (choose) { choose.click(); await new Promise((r) => setTimeout(r, 250)); }
    ui.polOffer = null; ui.polTab = 'Overview';
    return out;
  });
  record('the Politics app shows the Vote (the election, public donations) and Influence (your standing, who will see you, an offer before any money moves)', Object.values(pol3).every(Boolean), JSON.stringify(pol3));

  // v0.96.0: the World (diplomacy) section, with six segments in the bar
  const pol4 = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const out = {};
    ui.polTab = 'Diplomacy'; while (ui.panelStack.length) ui.closePanel(); ui.openPanel('tablet', { tab: 'Politics' });
    await new Promise((r) => setTimeout(r, 300));
    const text = document.querySelector('#modal-body')?.textContent || '';
    out.world = /The world today/.test(text) && /Kingdom of Sund|Varnistan/.test(text) && /Hostile|Tense|Cool|Neutral|Warm|Friendly/.test(text);
    const bars = [...document.querySelectorAll('#modal-body .tb-seg')];
    const seg = bars.find((b) => b.children.length === 6);
    out.sixSegments = Boolean(seg) && seg.getBoundingClientRect().height > 30; // not squeezed away by a long page
    out.atHome = /At home/.test(text); // v0.97.0: unrest
    ui.polTab = 'Influence'; while (ui.panelStack.length) ui.closePanel(); ui.openPanel('tablet', { tab: 'Politics' });
    await new Promise((r) => setTimeout(r, 300));
    out.partyRow = /Your own party/.test(document.querySelector('#modal-body')?.textContent || '');
    ui.polParty = true; ui.polTab = 'Influence'; while (ui.panelStack.length) ui.closePanel(); ui.openPanel('tablet', { tab: 'Politics' });
    await new Promise((r) => setTimeout(r, 300));
    out.partyScreen = /Found one/.test(document.querySelector('#modal-body')?.textContent || '');
    ui.polParty = false;
    ui.polTab = 'Overview';
    return out;
  });
  record('the Politics app shows the World (relations, quarrels, wars, unrest at home), its six-segment bar is not squeezed away, and your own party can be founded from Influence', Object.values(pol4).every(Boolean), JSON.stringify(pol4));
  // v0.94.1: the estates and the party offices load and draw
  const est = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const out = {};
    while (ui.panelStack.length) ui.closePanel();
    g.clock.total = (g.clock.day - 1) * 1440 + 10 * 60;
    for (const [map, spot] of [['crown_quarter', 'ironcrest_gate'], ['ironcrest_grounds', 'west_gate'], ['ironcrest_hall', 'entry'], ['ironcrest_war', 'entry'], ['willowmere_grounds', 'wm_lake'], ['willowmere_hall', 'entry'], ['order_hq', 'entry'], ['liberty_hq', 'entry']]) {
      g.changeMap(map, spot); await new Promise((r) => setTimeout(r, 200)); out[map] = g.player.map === map;
    }
    g.changeMap('halvermouth', 'north_gate');
    return out;
  });
  record('the estates and both party offices load and draw (gates, grounds, halls, the war room, the lake)', Object.values(est).every(Boolean), JSON.stringify(est));
  // v0.98.0: Fort Gullcrest and Hollowmoor Lot load and draw, and the Military app registers a company, takes money in, and shows the base
  const war = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const out = {};
    while (ui.panelStack.length) ui.closePanel();
    g.clock.total = (g.clock.day - 1) * 1440 + 10 * 60;
    for (const [map, spot] of [['fort_gullcrest', 'south_gate'], ['hollowmoor_lot', 'east_gate'], ['hollowmoor_lot', 'site_office']]) {
      g.changeMap(map, spot); await new Promise((r) => setTimeout(r, 250)); out[`${map}:${spot}`] = g.player.map === map;
    }
    g.changeMap('halvermouth', 'north_gate');
    g.setFlag('arms_licence', true); g.player.money += 400000;
    ui.openPanel('tablet', { tab: 'Military' }); await new Promise((r) => setTimeout(r, 300));
    out.register = /Register one/.test(document.querySelector('#modal-body')?.textContent || '');
    g.war.found('Smoke Test Company'); g.war.fund(300000); g.war.buyLicence(); g.war.buyLot();
    while (ui.panelStack.length) ui.closePanel(); ui.openPanel('tablet', { tab: 'Military' }); await new Promise((r) => setTimeout(r, 300));
    const text = document.querySelector('#modal-body')?.textContent || '';
    out.company = /Smoke Test Company/.test(text);
    // v0.103.4: the OberPad's Military app is minimal and opens the command terminal
    out.tabletMinimal = !document.querySelector('#modal-body .tb-seg') || ![...document.querySelectorAll('#modal-body .tb-seg button')].some((b) => /Troops|Stores|Missions/.test(b.textContent));
    const openBtn = [...document.querySelectorAll('#modal-body button')].find((b) => /Open the command terminal/.test(b.textContent));
    out.tabletButton = Boolean(openBtn); openBtn?.click(); await new Promise((r) => setTimeout(r, 400));
    out.terminalOpens = Boolean(document.querySelector('.osx-nav')) && document.querySelector('#modal-panel')?.classList.contains('osx-panel');
    // the seven sections, each one drawn with its own content and no error
    const SEC = [['Command Overview', /Operational summary/], ['Base Operations', /Base map/], ['Procurement', /Supplier marketplace/], ['Internal Logistics', /Your businesses|Transfer from my businesses/], ['Mission Control', /Mission/], ['Global Intelligence', /World map/], ['Theater Operations', /Theaters/]];
    out.sevenInRail = [...document.querySelectorAll('.osx-nav button')].length === 7;
    for (const [name, re] of SEC) {
      [...document.querySelectorAll('.osx-nav button')].find((b) => b.textContent.includes(name))?.click(); await new Promise((r) => setTimeout(r, 450));
      out[`osx_${name}`] = re.test(document.querySelector('.osx-main')?.textContent || '') && !/could not be drawn/.test(document.querySelector('.osx-scroll')?.textContent || '');
    }
    out.topBar = /Funds/.test(document.querySelector('.osx-top')?.textContent || '') && /Readiness/.test(document.querySelector('.osx-top')?.textContent || '') && /Operations/.test(document.querySelector('.osx-top')?.textContent || '');
    // Base Operations: the map is a canvas and a facility can be selected (by the same state a click sets) and expanded
    ui.osx.section = 'base'; ui.osx.base = { tab: 'map', sel: 'site_office' }; ui.closePanel(); ui.openPanel('militaryterminal'); await new Promise((r) => setTimeout(r, 500));
    out.baseMap = Boolean(document.querySelector('.osx-mapbox canvas')) && /Site office/.test(document.querySelector('.osx-main')?.textContent || '') && /Facility type/.test(document.querySelector('.osx-main')?.textContent || '');
    // Procurement: a cart, a review and a confirmed order that takes the money once; the goods arrive on their day when time is passed with the terminal's own control
    const cash0 = g.war.cash(); const sup = g.war.suppliers().find((x) => x.id === 'caldera_field_supply'); const un = sup.items.find((i) => i.item === 'uniform');
    ui.osx.section = 'procurement'; ui.osx.proc = { supplier: 'all', cat: 'all', q: '', sel: null, qty: {}, cart: [{ supplier: sup.id, id: un.id, qty: 12 }], review: true, token: 'smoke-1', tab: 'market' };
    ui.closePanel(); ui.openPanel('militaryterminal'); await new Promise((r) => setTimeout(r, 450));
    out.cartShown = /Order summary/.test(document.querySelector('.osx-main')?.textContent || '');
    const conf = [...document.querySelectorAll('.osx-side button')].find((b) => /Confirm purchase/.test(b.textContent)); conf?.click(); await new Promise((r) => setTimeout(r, 300));
    out.orderPaid = g.war.cash() === cash0 - 12 * un.price && g.war.orders().transit.length === 1;
    const u0 = g.war.stock()['supply:uniform'] || 0;
    // v0.103.7: "Next event" runs time up to the next thing that happens; press it until the order has arrived (other events, such as construction, may come first)
    for (let k = 0; k < 14 && g.war.orders().delivered.length < 1; k++) { const nm = [...document.querySelectorAll('.osx-top button')].find((b) => /Next event/.test(b.textContent)); if (!nm || nm.disabled) break; nm.click(); for (let i = 0; i < 120; i++) { await new Promise((r) => setTimeout(r, 250)); if (!/Time passing/.test(document.querySelector('.osx-top')?.textContent || '')) break; } await new Promise((r) => setTimeout(r, 200)); }
    out.nextEventButton = /Next event|No event pending/.test(document.querySelector('.osx-top')?.textContent || '') && !/Next morning/.test(document.querySelector('.osx-top')?.textContent || '');
    out.timePassed = (g.war.stock()['supply:uniform'] || 0) === u0 + 12 && g.war.orders().delivered.length === 1;
    // Internal Logistics: a free transfer from the Arms works moves goods and no money
    g.setFlag('owns_aw1', true); const cage = g.world.containers.ct_aw1_cage; cage.items.item_pistol = 10;
    const w0 = g.war.cash(); const p0 = player0(g);
    function player0(gg) { return gg.player.money; }
    ui.osx.section = 'logistics'; ui.osx.log = { tab: 'transfer', source: 'arms:aw1', sel: 'arms:aw1:item_pistol', qty: 4, review: true, busy: false }; ui.closePanel(); ui.openPanel('militaryterminal'); await new Promise((r) => setTimeout(r, 450));
    [...document.querySelectorAll('.osx-side button')].find((b) => /Confirm free transfer/.test(b.textContent))?.click(); await new Promise((r) => setTimeout(r, 300));
    out.transferFree = g.war.cash() === w0 && g.player.money === p0 && cage.items.item_pistol === 6 && (g.war.stock()['arms:aw1:item_pistol'] || 0) === 4;
    // Global Intelligence with a war on the record: the overlays draw
    g.world.market.wars = [{ a: 'ostmark', b: 'varn', since: g.clock.day }]; g.corp.geo.ensure().lastDay = 0; g.corp.geo.dailyTick(); // (what the debug command `war ostmark varn` does, then the geopolitical record's own morning tick)
    ui.osx.section = 'intel'; ui.closePanel(); ui.openPanel('militaryterminal'); await new Promise((r) => setTimeout(r, 700));
    out.worldMap = Boolean(document.querySelector('.osx-mapbox canvas')) && /Ostmark Union and Varnistan/.test(document.querySelector('.osx-main')?.textContent || '');
    // Theater Operations: a theater the company is NOT in loads, and a front can be selected
    ui.osx.section = 'theaters'; ui.osx.theatre = 'th_halden'; ui.osx.thp = { tab: 'fronts', front: null, prov: null }; ui.closePanel(); ui.openPanel('militaryterminal'); await new Promise((r) => setTimeout(r, 6500));
    out.theatreObserved = /You are observing/.test(document.querySelector('.osx-main')?.textContent || '') && Boolean(document.querySelector('.osx-mapbox canvas'));
    [...document.querySelectorAll('.osx-main .osx-row.tap')].find((x) => /front/i.test(x.textContent))?.click(); await new Promise((r) => setTimeout(r, 400));
    out.frontSelected = /Provinces on the line/.test(document.querySelector('.osx-main')?.textContent || '');
    ui.osx = null; while (ui.panelStack.length) ui.closePanel(); ui.openPanel('tablet', { tab: 'Military' }); await new Promise((r) => setTimeout(r, 250));
    // v0.100.0: an engagement is planned from a screen that says what is missing (nothing is spawned)
    const Cmp = g.war.state().company; (Cmp.engagements ||= []).push({ id: 'Nsmoke', kind: 'hold', title: 'Hold Smoke Crossing', text: 'x', client: 'The Ostmark Union', place: 'Smoke Crossing', terrain: 'rural', goal: 'defence', days: 6, needs: { troops: 12, tanks: 1, helicopters: 0, medics: 2 }, enemy: { troops: 12, armour: 1, air: 0, skill: 1 }, pay: 90000, state: 'open', offered: g.clock.day, expires: g.clock.day + 20, order: null, result: null });
    ui.milEng = 'Nsmoke'; ui.milSub = 'Engagement'; while (ui.panelStack.length) ui.closePanel(); ui.openPanel('militaryterminal'); await new Promise((r) => setTimeout(r, 450));
    out.Engagement = /One way or the other/.test(document.querySelector('.osx-main')?.textContent || '');
    // v0.103.4: planning an engagement in Mission Control keeps the panel open, shows an assessment, and delegates (needs a built base, a squad and a general)
    {
      g.war.fund(8_000_000); const days = (n) => { for (let i = 0; i < n; i++) { g.clock.total += 1440; g.war.dailyTick(); } };
      for (const id of ['site_office', 'bunkhouse', 'range', 'cage']) g.war.commission(id); days(60);
      for (const id of ['command', 'barracks_a', 'barracks_b', 'mess', 'medical', 'motor_pool', 'armoury', 'depot']) g.war.commission(id); days(60);
      g.war.buySupply('uniform', 40); g.war.buySupply('rations', 500);
      for (const r of ['officer', ...Array(6).fill('rifleman'), 'medic']) g.war.hire(r); days(8); g.war.organise(); g.war.hireGeneral('odalys');
      (Cmp.engagements ||= []).push({ id: 'Nplan', kind: 'hold', title: 'Hold Plan Crossing', text: 'x', client: 'The Ostmark Union', place: 'Plan Crossing', terrain: 'rural', goal: 'defence', days: 4, needs: { troops: 4, tanks: 0, helicopters: 0, medics: 0 }, enemy: { troops: 4, armour: 0, air: 0, skill: 1 }, pay: 50000, state: 'open', offered: g.clock.day, expires: g.clock.day + 20, order: null, result: null });
      ui.osx = { section: 'missions', maps: {}, msg: null, game: g, tab: 'open' }; ui.milSub = null; ui.milEng = null; while (ui.panelStack.length) ui.closePanel(); ui.openPanel('militaryterminal'); await new Promise((r) => setTimeout(r, 500));
      const mt = () => document.querySelector('.osx-main')?.textContent || '';
      [...document.querySelectorAll('.osx-main .osx-row')].find((x) => /Hold Plan Crossing/.test(x.textContent))?.click(); await new Promise((r) => setTimeout(r, 400));
      document.querySelector('.osx-main .tb-row.tap')?.click(); await new Promise((r) => setTimeout(r, 400));
      out.planStaysOpen = /Hold Plan Crossing/.test(mt()) && /Assessment/.test(mt());
      [...document.querySelectorAll('.osx-main button')].find((b) => /Give it to/.test(b.textContent))?.click(); await new Promise((r) => setTimeout(r, 500));
      out.planDelegated = g.war.missions().active.some((m) => m.id === 'Nplan');
      // v0.103.5: hiring troops and battalions are in the terminal (Base Operations): hire, raise (a mini template from the squad), designer save, enlist list
      ui.milSub = null; ui.milEng = null; ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'people', sel: null } }; while (ui.panelStack.length) ui.closePanel(); ui.openPanel('militaryterminal'); await new Promise((r) => setTimeout(r, 500));
      const n0 = g.war.people().length; [...document.querySelectorAll('.osx-main .osx-hire')].find((c) => /Rifleman/.test(c.textContent))?.querySelector('button')?.click(); await new Promise((r) => setTimeout(r, 300)); // (v0.103.6: a card per class on the squad board)
      out.hireInTerminal = g.war.people().length === n0 + 1;
      g.war.hire('officer'); g.war.hire('rifleman'); days(8); g.war.organise(); // (the first squad is away on the engagement: a second one is formed for the battalion)
      [...document.querySelectorAll('.osx-tabs button')].find((b) => /Battalions/.test(b.textContent))?.click(); await new Promise((r) => setTimeout(r, 400));
      out.forcesPanels = /Raise a battalion/.test(mt()) && /Battalion designer/.test(mt()) && /Enlist in a theater/.test(mt());
      g.war.saveTemplate({ name: 'Smoke Mini', line: ['inf'], support: [], attach: [] }); ui.closePanel(); ui.openPanel('militaryterminal'); await new Promise((r) => setTimeout(r, 400));
      [...document.querySelectorAll('.osx-main button')].find((b) => b.textContent === 'Smoke Mini')?.click(); await new Promise((r) => setTimeout(r, 300));
      [...document.querySelectorAll('.osx-main input[type=checkbox]')].pop()?.click(); await new Promise((r) => setTimeout(r, 300)); // (the last squad is the one with an officer)
      [...document.querySelectorAll('.osx-main button')].find((b) => /Raise battalion/.test(b.textContent))?.click(); await new Promise((r) => setTimeout(r, 500));
      out.battalionRaised = (g.war.peek().war.battalions || []).length === 1 && /Battalions/.test(mt());
      [...document.querySelectorAll('.osx-main button')].find((b) => /Stand down/.test(b.textContent))?.click(); await new Promise((r) => setTimeout(r, 300));
      out.battalionStoodDown = (g.war.peek().war.battalions || []).length === 0;
      ui.milSub = null; ui.milEng = null; ui.osx = null; while (ui.panelStack.length) ui.closePanel();
    }
    // v0.101.0: a battle opens, draws frames, takes an order, and runs to its end and files its result, with no errors
    for (const recipe of ['city', 'fields']) {
      const sk = g.war.skirmish(recipe); while (ui.panelStack.length) ui.closePanel(); ui.openPanel('battle', { id: sk.id }); await new Promise((r) => setTimeout(r, 400));
      const H = ui.battleHandle; const f0 = ui.battleFrames || 0; await new Promise((r) => setTimeout(r, 300));
      out[`battle_${recipe}`] = Boolean(H) && (ui.battleFrames || 0) > f0 && document.querySelector('.bt-canvas')?.width > 300;
      // docs/RENDERING.md 7 (3D-4): the battle runs in three.js, a WebGL canvas under the 2D one that draws the ground, buildings, props and units; the 2D canvas is a transparent overlay
      { const gl = document.querySelector('.bt-gl'); const st = H.view.r3?.stats || {}; const c2 = document.querySelector('.bt-canvas');
        out[`battle_${recipe}_3d`] = Boolean(H.view.r3) && Boolean(gl) && gl.width === c2.width && gl.height === c2.height && getComputedStyle(gl).display === 'block' && gl.nextElementSibling === c2 && st.calls > 5 && st.triangles > 500 && st.units >= 8 && !H.view.r3.lost; }
      const ids = H.B.units.filter((u) => u.side === 'p').map((u) => u.id); H.S.sel = new Set(ids); H.give({ type: 'amove', x: H.B.map.objective.x, y: H.B.map.objective.y }, 'attack-move');
      // v0.103.11: a right click opens the order menu at the cursor; its Move here item gives the order (a ping is drawn) and closes the menu
      { const cv = document.querySelector('.bt-canvas'); const rc = cv.getBoundingClientRect(); H.S.sel = new Set(ids); H.S.pings.length = 0;
        cv.dispatchEvent(new PointerEvent('pointerdown', { button: 2, clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2, bubbles: true, pointerId: 7 })); await new Promise((r) => setTimeout(r, 120));
        const mi = [...document.querySelectorAll('.bt-menu .bt-mi')]; const menu = document.querySelector('.bt-menu'); out[`battle_${recipe}_menu`] = mi.length >= 6 && mi.some((b) => /Move here/.test(b.textContent)) && mi.some((b) => /Hold position/.test(b.textContent)) && !menu.classList.contains('hidden');
        mi.find((b) => /Move here/.test(b.textContent))?.click(); await new Promise((r) => setTimeout(r, 60)); out[`battle_${recipe}_menuOrder`] = menu.classList.contains('hidden') && H.S.pings.length > 0;
        out[`battle_${recipe}_barSlim`] = document.querySelectorAll('.bt-bar button').length <= 14 && document.querySelector('.bt-bar').getBoundingClientRect().height < 60; }
      // the isometric battle: a click picks the unit under it and a move order lands on the tile under the cursor
      { const cv = document.querySelector('.bt-canvas'); H.S.speed = 0; H.S.formation = 'none'; const u0 = H.B.units.find((u) => u.side === 'p' && u.kind === 'inf'); H.S.sel = new Set();
        const p = H.view.chest(u0); const pe = (t, x, y, b = 0) => cv.dispatchEvent(new PointerEvent(t, { button: b, clientX: x, clientY: y, bubbles: true, pointerId: 9 }));
        pe('pointerdown', p.x, p.y); pe('pointerup', p.x, p.y); out[`battle_${recipe}_pick`] = H.S.sel.has(u0.id);
        const rc = cv.getBoundingClientRect(); const tx = rc.left + rc.width * 0.6; const ty = rc.top + rc.height * 0.6; const want = H.view.toTile(tx, ty);
        H.S.mode = 'move'; pe('pointerdown', tx, ty); const o = H.B.byId.get(u0.id).order;
        out[`battle_${recipe}_orderAtCursor`] = Boolean(o) && Math.hypot(o.x - want.x, o.y - want.y) < 1; }
      // a selected unit behind a roofed building is visible through the hole: its pixels in the WebGL canvas change when the figure is switched off for a few frames, and with the holes off the building hides it
      if (recipe === 'city') {
        const V = H.view; const B = H.B; const R3 = V.r3; const gl = document.querySelector('.bt-gl'); const frames = async (n) => { const f = ui.battleFrames; while (ui.battleFrames < f + n) await new Promise((r) => setTimeout(r, 20)); };
        const b = [...B.map.buildings].sort((a, c) => c.floors - a.floors || Math.abs(a.x - B.map.w / 2) - Math.abs(c.x - B.map.w / 2))[0]; const u = B.units.find((q) => q.side === 'p' && q.kind === 'inf');
        H.S.speed = 0; u.x = b.x + b.w / 2; u.y = b.y - 1.2; u.path = []; u.order = { type: 'hold' }; H.S.sel = new Set([u.id]); V.cam.zoom = 1.5; V.center(u.x, u.y); await frames(8);
        const grab = () => { const o = document.createElement('canvas'); o.width = gl.width; o.height = gl.height; const g2 = o.getContext('2d'); g2.drawImage(gl, 0, 0); return g2; };
        const px = (g2, x, y) => { const d = g2.getImageData(Math.round(x) - 2, Math.round(y) - 2, 5, 5).data; let r = 0; let g = 0; let bl = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; } const n = d.length / 4; return [r / n, g / n, bl / n]; };
        const diff = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
        const pts = [32, 22, 12].map((z) => V.toCanvas(u.x * 32, u.y * 32, z)); const far = V.toCanvas((u.x + 9) * 32, u.y * 32, 0);
        const sample = async (noHoles, hidden, n) => { R3.noHoles = noHoles; R3.hidden = hidden ? new Set([u.id]) : null; await frames(n); const g2 = grab(); return { pts: pts.map((p) => px(g2, p.x, p.y)), far: px(g2, far.x, far.y) }; };
        const a = await sample(false, false, 14); const c = await sample(false, true, 4); const d = await sample(true, false, 16); const e = await sample(true, true, 4); // (the hole eases in and out over about ten frames) R3.noHoles = false; R3.hidden = null; await frames(3);
        const seenThrough = a.pts.filter((p, i) => diff(p, c.pts[i]) > 30).length; const wallOnly = d.pts.filter((p, i) => diff(p, e.pts[i]) > 8).length;
        out.battle_city_behindVisible = seenThrough >= 2 && wallOnly === 0 && diff(a.far, c.far) < 6;
        out.battle_city_behindDetail = JSON.stringify({ seenThrough, wallOnly, far: Math.round(diff(a.far, c.far)), floors: b.floors });
        // the same for a friendly unit that is NOT selected (v0.104.x: every friendly unit is seen through the buildings in front of it), and a second, unselected one beside it
        const u2 = B.units.find((q) => q.side === 'p' && q.kind === 'inf' && q.id !== u.id);
        R3.noHoles = false; R3.hidden = null; H.S.sel = new Set(); if (u2) { u2.x = b.x + b.w / 2 + 2.4; u2.y = b.y - 1.2; u2.path = []; u2.order = { type: 'hold' }; }
        const pts2 = [32, 22, 12].map((z) => V.toCanvas(u.x * 32, u.y * 32, z));
        const sample2 = async (hidden, n) => { R3.hidden = hidden ? new Set([u.id, u2?.id]) : null; await frames(n); const g2 = grab(); return pts2.map((p) => px(g2, p.x, p.y)); };
        const un0 = await sample2(false, 16); const un1 = await sample2(true, 4); R3.hidden = null;
        const seenUnselected = un0.filter((p, i) => diff(p, un1[i]) > 30).length;
        out.battle_city_unselectedBehindVisible = seenUnselected >= 2 && !H.S.sel.has(u.id);
        out.battle_city_unselectedDetail = JSON.stringify({ seenUnselected, unitsInFoci: H.view.foci(B, ui, new Set()).filter((q) => q.kind === 'inf').length });
      }
      H.view.cam.zoom = 0.4; await new Promise((r) => setTimeout(r, 150)); H.view.cam.zoom = 3; await new Promise((r) => setTimeout(r, 150)); H.view.cam.zoom = 1; // far, close and command tiers draw
      H.step(40); await new Promise((r) => setTimeout(r, 250)); (window.__battleShots = window.__battleShots || {})[recipe] = (() => { const gl = document.querySelector('.bt-gl'); const c2 = document.querySelector('.bt-canvas'); const o = document.createElement('canvas'); o.width = c2.width; o.height = c2.height; const g2 = o.getContext('2d'); if (gl) g2.drawImage(gl, 0, 0, o.width, o.height); g2.drawImage(c2, 0, 0); return o.toDataURL('image/png'); })(); // the picture mid-fight, written to tools/out/ after the checks
      H.step(6000); await new Promise((r) => setTimeout(r, 200));
      out[`battle_${recipe}_end`] = H.B.over && Boolean(g.war.battle(sk.id)?.result) && /battle|field|lost|hard-won/i.test(document.querySelector('.bt-over')?.textContent || '');
      ui.closePanel(); await new Promise((r) => setTimeout(r, 100));
      out[`battle_${recipe}_glClosed`] = !document.querySelector('.bt-gl') && !ui.battleHandle; out.battle_worldIntact = Boolean(ui.renderer.world3d) && !ui.renderer.world3d.lost && !ui.renderer.world3d.gl.getContext().isContextLost();
    }
    // v0.103.0: the strategic map opens with no theatre, lists the order of battle, and its enlist and raise screens open
    while (ui.panelStack.length) ui.closePanel(); ui.openPanel('strategic'); await new Promise((r) => setTimeout(r, 300));
    out.strategic = Boolean(document.querySelector('.stc-canvas')) && /ORDER OF BATTLE/.test(document.querySelector('.stc-left')?.textContent || '');
    [...document.querySelectorAll('.stc-left button')].find((b) => /Enlist/.test(b.textContent))?.click(); await new Promise((r) => setTimeout(r, 150));
    out.strategic_enlist = /ENLIST IN A THEATRE/.test(document.querySelector('.stc-modal')?.textContent || '') && /Halden Front/.test(document.querySelector('.stc-modal')?.textContent || '');
    [...document.querySelectorAll('.stc-modal button')].find((b) => /Close/.test(b.textContent))?.click(); [...document.querySelectorAll('.stc-left button')].find((b) => /Raise a battalion/.test(b.textContent))?.click(); await new Promise((r) => setTimeout(r, 150));
    out.strategic_raise = /RAISE A BATTALION/.test(document.querySelector('.stc-modal')?.textContent || '') && /WHAT THIS NEEDS/.test(document.querySelector('.stc-modal')?.textContent || '');
    ui.closePanel();
    ui.milSub = null; ui.osx = null;
    ui.milTab = 'Company';
    return out;
  });
  record('Fort Gullcrest and Hollowmoor Lot load and draw, and the minimal OberPad app opens the command terminal, whose seven sections, base map, procurement order, free transfer, time controls, world map and an uninvolved theater all work', Object.values(war).every(Boolean), JSON.stringify(war));
  // v0.93.1: the Crown Gate, the Crown Quarter and Halver House's lobby draw without errors
  const crown = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game;
    while (ui.panelStack.length) ui.closePanel();
    const out = {};
    g.clock.total = (g.clock.day - 1) * 1440 + 10 * 60;
    for (const [map, spot] of [['halvermouth', 'crown_gate'], ['crown_quarter', 'west_gate'], ['crown_quarter', 'halver_house_steps'], ['halver_house', 'entry'], ['halver_president', 'entry']]) {
      g.changeMap(map, spot);
      await new Promise((r) => setTimeout(r, 250));
      out[map] = g.player.map === map;
    }
    g.changeMap('halvermouth', 'north_gate');
    return out;
  });
  record('the Crown Quarter and Halver House load and draw (gate, district, lobby, the President\'s office)', Object.values(crown).every(Boolean), JSON.stringify(crown));
  await closeAll();
  s = await state();
  record('no game warnings', s.warnings.length === 0, s.warnings.join('; '));

  // v0.103.6: the squad board, the factory floors, the base map and the walkable lot as a military base. The company builds everything first (stage by stage, through the real construction rules).
  await closeAll();
  const rig = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const out = {}; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    const days = (n) => { for (let i = 0; i < n; i++) { g.clock.total += 1440; g.war.dailyTick(); } };
    for (const stage of [1, 2, 3]) { for (const f of g.war.facilities().filter((x) => x.stage === stage && x.state === 'none')) { g.player.money += f.cost + 1000; g.war.fund(f.cost + 1000); g.war.commission(f.id); } days(60); }
    out.allBuilt = g.war.facilities().every((f) => f.state === 'built');
    g.player.money += 6_000_000; g.war.fund(6_000_000); g.war.buySupply('uniform', 60); g.war.buySupply('rations', 400);
    const q = g.war.squadCreate(); const hr = g.war.hire('marksman', q.id); g.war.hire('uav', q.id); g.war.hire('signaller'); g.war.hire('engineer');
    out.hiredIntoSquad = hr.ok && (g.war.squads().find((s) => s.id === q.id)?.incoming || []).length >= 1;
    ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'people', sel: q.id } }; ui.openPanel('militaryterminal'); await T(600);
    const main = () => document.querySelector('.osx-main')?.textContent || '';
    out.squadBoard = /Squad board/.test(main()) && document.querySelectorAll('.osx-hire').length >= 12 && /Marksman/.test(main()) && /UAV operator/.test(main()) && document.querySelectorAll('.osx-sq').length >= 1 && document.querySelectorAll('.osx-slot.train').length >= 1 && document.querySelectorAll('.osx-sqart').length >= 2 && !/could not be drawn/.test(document.querySelector('.osx-scroll')?.textContent || '');
    return out;
  });
  record('the squad board offers every class, hires into a squad and shows the training place', Object.values(rig).every(Boolean), JSON.stringify(rig));
  await shot('war-squad-board');
  { const shots = await page.evaluate(() => window.__battleShots || {}); for (const [k, url] of Object.entries(shots)) writeFileSync(`${OUT}battle-${k}.png`, Buffer.from(url.split(',')[1], 'base64')); }
  const fl = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const out = {}; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    g.war.hire('technician'); for (let i = 0; i < 12; i++) g.war.hire('technician');
    for (const k of ['plate', 'engine', 'optics', 'rotor', 'avionics']) g.war.buySupply(k, 30);
    g.war.order('anvil', 1); g.war.order('wren', 1); for (let i = 0; i < 6; i++) { g.clock.total += 1440; g.war.dailyTick(); }
    ui.closePanel(); ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'works', works: 'tank_factory', sel: null } }; ui.openPanel('militaryterminal'); await T(600);
    out.factoryFloor = /floor/i.test(document.querySelector('.osx-main')?.textContent || '') && document.querySelectorAll('.osx-fbay').length >= 2 && document.querySelectorAll('.osx-model').length >= 4;
    return out;
  });
  record('the tank factory floor shows its lines and the models with pictures', Object.values(fl).every(Boolean), JSON.stringify(fl));
  await shot('war-factory-floor');
  // v0.103.8: the research tab (the tree to tier 4), starting a project, and the locked tiers on the squad board
  const rsr = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const out = {}; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    ui.closePanel(); ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'research', sel: null } }; ui.openPanel('militaryterminal'); await T(600);
    const main = () => document.querySelector('.osx-main')?.textContent || '';
    out.researchTab = /TIER 3/.test(main()) && /TIER 4/.test(main()) && document.querySelectorAll('.osx-fbay').length >= 8 && !/could not be drawn/.test(document.querySelector('.osx-scroll')?.textContent || '');
    const r = g.war.startResearch('energy_cells'); out.researchStarted = r.ok && g.war.research().active?.id === 'energy_cells';
    ui.closePanel(); ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'research', sel: null } }; ui.openPanel('militaryterminal'); await T(500);
    out.researchActive = /Under way/.test(main()) && /Energy cells/.test(main());
    ui.closePanel(); ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'people', sel: null } }; ui.openPanel('militaryterminal'); await T(500);
    out.lockedTiers = [...document.querySelectorAll('.osx-loadrow button')].filter((b) => /^T[34]$/.test(b.textContent)).every((b) => b.disabled) && [...document.querySelectorAll('.osx-loadrow button')].some((b) => /Hardsuit/.test(b.textContent) && b.disabled);
    return out;
  });
  record('the Research tab shows the tree, a project starts and shows under way, and tiers 3 and 4 are locked on the squad board until researched', Object.values(rsr).every(Boolean), JSON.stringify(rsr));
  await shot('war-research');
  // v0.103.9: the Air wings tab: raise a wing from aircraft in the hangars, base it, fly a mission; and the strategic map's Airlift order button
  const air = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const out = {}; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    const C = g.war.state().company; for (const [id, type] of [['Sa1', 'af_falcon'], ['Sa2', 'af_falcon']]) C.equipment.push({ id, kind: 'aircraft', type, name: 'Falcon', source: 'aero', origin: null, location: 'facility:hangars', status: 'stored', assignedTo: null, day: 1 });
    if (!g.war.state().war?.employer) g.war.enlist({ theatre: 'th_halden', side: 'ostmark' });
    const w1 = g.war.raiseWing('Smoke Wing', ['Sa1', 'Sa2']); out.raised = w1.ok;
    const A = g.war.air(); out.airfields = A.airfields.length > 3; g.war.deployWing(w1.id, A.airfields[0].id);
    const tg = g.war.wingTargets(w1.id); out.targets = tg.length > 0; const m = g.war.wingMission(w1.id, 'recon', tg[0]?.id); out.flew = m.ok;
    ui.closePanel(); ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'air', sel: null } }; ui.openPanel('militaryterminal'); await T(600);
    const main = () => document.querySelector('.osx-main')?.textContent || '';
    out.airTab = /SMOKE WING/i.test(main()) && /Reconnaissance/.test(main()) && /flown today/i.test(main()) && !/could not be drawn/.test(document.querySelector('.osx-scroll')?.textContent || '');
    out.check = g.war.check().length === 0;
    return out;
  });
  record('the Air wings tab raises a wing, bases it, flies a mission and shows it flown', Object.values(air).every(Boolean), JSON.stringify(air));
  await shot('war-air-wings');
  // v0.103.10: the Fleets and Contracts tabs: lend a ship from the shipping company into a fleet, base it, and take an embassy's offer
  const nav = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const out = {}; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    g.player.money += 30_000_000; g.logistics.buyCompany?.(); const b = g.logistics.buyShip('corvette', 'port_millroad', 'Smoke Corvette'); out.ship = Boolean(b?.ok);
    if (!g.war.state().war?.employer) g.war.enlist({ theatre: 'th_halden', side: 'ostmark' });
    const f = g.war.raiseFleet('Smoke Fleet', [b.vessel.id]); out.fleet = f.ok; const N = g.war.navy(); out.bases = N.bases.length > 3; out.sail = g.war.deployFleet(f.id, N.bases[0].id).ok;
    ui.closePanel(); ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'fleets', sel: null } }; ui.openPanel('militaryterminal'); await T(600);
    const main = () => document.querySelector('.osx-main')?.textContent || '';
    out.fleetsTab = /SMOKE FLEET/i.test(main()) && /Bombardment/.test(main()) && /Blockade/.test(main()) && /lent/i.test(main());
    g.politics.ensureDiplomacy(g.politics.ensure()).relations.ostmark.score = 80; g.war.state().war.intl.seen = null; out.offers = g.war.intl().offers.length > 0;
    ui.closePanel(); ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'contracts', sel: null } }; ui.openPanel('militaryterminal'); await T(600);
    out.contractsTab = /Offers from the embassies/.test(main()) && /Take the contract/.test(main()) && /Ostmark/.test(main());
    out.check = g.war.check().length === 0;
    return out;
  });
  record('the Fleets tab lends a ship into a fleet and bases it, and the Contracts tab shows the embassies\' offers', Object.values(nav).every(Boolean), JSON.stringify(nav));
  await shot('war-fleets');
  const bm = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const out = {}; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    ui.closePanel(); ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'works', works: 'motor_pool', sel: null } }; ui.openPanel('militaryterminal'); await T(500);
    out.parkedStrip = document.querySelectorAll('.osx-mach').length >= 1;
    ui.closePanel(); ui.osx = { section: 'base', maps: {}, msg: null, game: g, base: { tab: 'map', sel: 'hangars' } }; ui.openPanel('militaryterminal'); await T(700);
    out.baseMapDrawn = Boolean(document.querySelector('.osx-mapbox canvas')) && !/could not be drawn/.test(document.querySelector('.osx-scroll')?.textContent || '');
    return out;
  });
  record('the redrawn base map draws and the parked machines are listed', Object.values(bm).every(Boolean), JSON.stringify(bm));
  await shot('war-base-map');
  const lot = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const out = {}; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    while (ui.panelStack.length) ui.closePanel(); ui.osx = null;
    g.clock.total = (g.clock.day - 1) * 1440 + 11 * 60;
    g.changeMap('hollowmoor_lot', 'runway'); await T(500); out.runway = g.player.map === 'hollowmoor_lot' && Boolean(g.maps.get('hollowmoor_lot').def.airfield?.runways?.length);
    g.changeMap('hollowmoor_lot', 'yard'); await T(400); out.yard = g.player.map === 'hollowmoor_lot' && g.war.equipment().length >= 1;
    return out;
  });
  record('Hollowmoor Lot loads as a military base: the runway, and the vehicle yard with the company\'s machines', Object.values(lot).every(Boolean), JSON.stringify(lot));
  await shot('war-base-yard');
  await closeAll();

  // v0.104.0: the isometric view. Tower t_ledgerline in Halvermouth: the player behind it stays visible through a
  // see-through hole, inside it the room is open, in front of it nothing is hidden. (Screenshots: iso-tower-*.png)
  const isoStep = (mode) => page.evaluate(async (mode) => {
    const ui = window.oberverse.ui; const g = ui.game; const R = ui.renderer; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    while (ui.panelStack.length) ui.closePanel();
    const m = g.maps.get('halvermouth');
    const b = m.buildings.find((q) => q.id === 't_ledgerline');
    g.changeMap('halvermouth', Object.keys(m.spots)[0]);
    if (mode === 'inside') g.changeMap(b.interior, 'entry');
    else { g.player.x = (b.x + b.w / 2) * 32; g.player.y = (b.y + (mode === 'behind' ? -1.6 : b.h + 3.2)) * 32; }
    R.snapCamera();
    await T(2200); // (3D: a frame takes longer on a software GL; the state is eased per frame)
    const st = R.bld.stateOf(b);
    const e = R.world3d && [...(R.world3d.mapScenes.get('halvermouth')?.buildings.values() || [])].find((q) => q.b === b);
    const g3 = e ? { roofed: Boolean(e.roofed?.group.visible), open: Boolean(e.open?.visible), hole: R.world3d.holeUniforms.on.value, holeR: Math.round(R.world3d.holeUniforms.value[0].z) } : null; // (v0.104.x: one shared set of holes; the depth rule leaves everything behind the player whole)
    // what is really on screen: render one frame and read pixels back (same task, so the drawing buffer is still there)
    const W3 = R.world3d; const gl = W3.gl.getContext(); const H = R.canvas3d.height;
    const px = (x, y) => { const o = new Uint8Array(4); gl.readPixels(Math.round(x), H - Math.round(y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, o); return [o[0], o[1], o[2]]; };
    const dist = (a, c) => Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
    const holesBefore = W3.foci.filter((f) => f.fade > 0.01).map((f) => f.key);
    const fig = W3.figures.get(g.player)?.fig;
    const spots = [[0, 18], [0, 6], [0, 30]].map(([dx, z]) => R.toScreen(g.player.x, g.player.y, z));
    const far = R.toScreen(g.player.x, g.player.y, 18); far.x += 330; far.y += 40;
    W3.render(0.016); const withFig = spots.map((q) => px(q.x, q.y)); const farOn = px(far.x, far.y);
    if (fig) fig.root.visible = false;
    // (the figure is switched off for one frame: where the figure stood must change)
    const vis0 = fig?.root.visible; fig && (fig.root.visible = false);
    const orig = W3.updateActors; W3.updateActors = function (...a) { orig.apply(this, a); const f2 = this.figures.get(g.player); if (f2) f2.fig.root.visible = false; };
    W3.render(0.016); const noFig = spots.map((q) => px(q.x, q.y));
    W3.updateActors = orig;
    W3.noHoles = true; // and with every hole forced off, a pixel well away from the ellipse must not change
    W3.render(0.016); const farOff = px(far.x, far.y); W3.noHoles = false;
    const figureSeen = spots.some((q, i) => dist(withFig[i], noFig[i]) > 25);
    const farSolid = dist(farOn, farOff) < 12;
    const holes = W3.foci.map((f) => [f.key, f.covered, Math.round(f.fade * 100)]);
    const inBox = m.buildings.filter((q) => g.player.x >= q.x * 32 && g.player.x < (q.x + q.w) * 32 && g.player.y >= q.y * 32 && g.player.y < (q.y + q.h) * 32).map((q) => q.id);
    const open3 = [...W3.mapScenes.entries()].filter(([, v]) => v.group.visible).map(([k]) => k);
    return { iso: R.isoNow, map: g.player.map, open: st.t, fade: st.fade, hidden: R.hiddenMaps.has(b.interior), g3, figureSeen, farSolid, holesBefore, withFig, noFig, farOn, farOff, inBox, holes, open3 };
  }, mode);
  let iv = await isoStep('behind');
  record('iso: behind a tower the player is seen through a see-through hole (3D: a soft ellipse through everything in front of the player)', iv.iso && iv.map === 'halvermouth' && iv.holes.some(([k, c, f]) => k === 'player' && c && f >= 95) && iv.open === 0 && iv.hidden && iv.g3 && iv.g3.roofed && iv.g3.hole === 1 && iv.g3.holeR > 50 && iv.figureSeen && iv.farSolid, JSON.stringify(iv));
  await shot('3d-tower-behind');
  iv = await isoStep('inside');
  record('iso: inside the tower the room is open (no roof, its interior drawn)', iv.iso && iv.map === 'ledgerline_hall' && iv.open > 0.8 && !iv.hidden && iv.g3 && !iv.g3.roofed && iv.g3.open && iv.holesBefore.length === 0, JSON.stringify(iv));
  await shot('3d-tower-inside');
  iv = await isoStep('front');
  record('iso: in front of the tower nothing is hidden or faded', iv.iso && iv.fade === 0 && iv.open === 0 && iv.hidden && iv.g3 && iv.g3.roofed && !iv.g3.open && iv.g3.hole === 0, JSON.stringify(iv));
  await shot('3d-tower-front');
  // v0.104.x: a tree in front of the player opens the same hole: the canopy pixels change with the hole off, the figure shows through, a pixel well away does not change
  const tree = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const R = ui.renderer; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    while (ui.panelStack.length) ui.closePanel();
    const m = g.maps.get('lanternside'); g.changeMap('lanternside', Object.keys(m.spots)[0]);
    const t = m.props.find((q) => q.type === 'tree' && q.x > 12 && q.x < 60 && q.y > 4 && !m.blockedTile(q.x - 1, q.y - 1) && !m.blockedTile(q.x - 2, q.y - 2) && !m.buildings.some((b) => q.x > b.x - 6 && q.x < b.x + b.w + 3 && q.y > b.y - 6 && q.y < b.y + b.h + 3));
    g.player.x = (t.x - 0.35) * 32; g.player.y = (t.y - 0.35) * 32; R.snapCamera(); await T(2200);
    const W3 = R.world3d; const gl = W3.gl.getContext(); const H = R.canvas3d.height;
    const px = (x, y) => { const o = new Uint8Array(4); gl.readPixels(Math.round(x), H - Math.round(y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, o); return [o[0], o[1], o[2]]; };
    const dist = (a, c) => Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
    const canopy = [30, 44, 58].map((z) => R.toScreen((t.x + 0.5) * 32, (t.y + 0.5) * 32, z)); const far = R.toScreen(g.player.x, g.player.y, 18); far.x += 330; far.y += 40;
    const body = [6, 18, 30].map((z) => R.toScreen(g.player.x, g.player.y, z));
    W3.render(0.016); const on = canopy.map((q) => px(q.x, q.y)); const farOn = px(far.x, far.y); const bodyOn = body.map((q) => px(q.x, q.y)); const covered = W3.foci.map((f) => [f.key, f.covered, Math.round(f.fade * 100)]);
    W3.noHoles = true; W3.render(0.016); const off = canopy.map((q) => px(q.x, q.y)); const farOff = px(far.x, far.y); const bodyOff = body.map((q) => px(q.x, q.y)); W3.noHoles = false;
    return { canopyCut: on.filter((p, i) => dist(p, off[i]) > 20).length, farSame: dist(farOn, farOff) < 12, bodyHidden: bodyOff.filter((p, i) => dist(p, bodyOn[i]) > 20).length, covered, tile: [t.x, t.y] };
  });
  record('3d: a tree in front of the player is cut by the see-through hole (canopy pixels change with the hole off, the pixels far away do not)', tree.canopyCut >= 1 && tree.farSame && tree.covered.some(([k, c]) => k === 'player' && c), JSON.stringify(tree));
  await shot('3d-tree-front');
  // aim: with the mouse on an NPC's chest on screen, the aim vector points at that NPC
  const aim = await page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const R = ui.renderer; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    const npc = [...g.npcs.values()].find((n) => !n.dead);
    const out = [];
    for (const [dx, dy] of [[90, 30], [-70, 60], [40, -80], [-120, -20]]) {
      npc.map = g.player.map; npc.x = g.player.x + dx; npc.y = g.player.y + dy;
      const c = R.toScreen(npc.x, npc.y, 18); // the chest, on screen
      ui.mouse.x = c.x; ui.mouse.y = c.y; ui.mouse.movedAt = ui.time;
      await T(150);
      const a = g.player.aim;
      if (!a) { out.push(999); continue; }
      let d = Math.abs(Math.atan2(a.y, a.x) - Math.atan2(dy, dx)) * 180 / Math.PI;
      if (d > 180) d = 360 - d;
      out.push(Math.round(d * 100) / 100);
    }
    ui.mouse.movedAt = -1e9;
    return out;
  });
  record('iso: a shot aimed at an NPC\'s chest on screen goes to that NPC (within 3 degrees)', aim.length === 4 && aim.every((d) => d < 3), JSON.stringify(aim));
  await closeAll();

  // v0.104.0 phase 5: the isometric view's gameplay — a car with volume that is driven, a shot that goes where it was aimed, a Wrath in the iso plane
  const isoStage = () => page.evaluate(async () => {
    const ui = window.oberverse.ui; const g = ui.game; const R = ui.renderer; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    while (ui.panelStack.length) ui.closePanel();
    const m = g.maps.get('halvermouth');
    g.changeMap('halvermouth', Object.keys(m.spots)[0]);
    await T(300);
    let spot = null; // an open block of street, 16 x 12 tiles, clear of buildings and walls
    for (let ty = 4; ty < m.height - 14 && !spot; ty += 2) for (let tx = 4; tx < m.width - 18 && !spot; tx += 2) {
      let ok = true;
      for (let y = ty; y < ty + 12 && ok; y++) for (let x = tx; x < tx + 16; x++) if (m.blockedTile(x, y) || m.buildings.some((b) => x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 3)) { ok = false; break; }
      if (ok) spot = [tx, ty];
    }
    if (!spot) return null;
    const cx = (spot[0] + 8) * 32; const cy = (spot[1] + 6) * 32;
    for (const n of g.npcs.values()) if (n.map === 'halvermouth' && Math.hypot(n.x - cx, n.y - cy) < 900) { n.x = 64; n.y = 64; }
    for (const c of g.vehicles.carsOn('halvermouth')) if (Math.hypot(c.x - cx, c.y - cy) < 500) { c.x = 96; c.y = 96; }
    g.player.x = cx; g.player.y = cy; g.player.driving = null;
    R.snapCamera();
    await T(300);
    return { cx, cy, iso: R.isoNow };
  });
  // (1) a car: get in with E, drive, the car moves and the camera stays on it; get out
  const st1 = await isoStage();
  const drive0 = await page.evaluate(async (st) => {
    const ui = window.oberverse.ui; const g = ui.game; const T = (ms) => new Promise((r) => setTimeout(r, ms));
    const car = g.vehicles.carsOn('halvermouth')[0];
    Object.assign(car, { owner: 'player', x: st.cx + 70, y: st.cy + 30, angle: 0.4, speed: 0, map: 'halvermouth' });
    g.player.x = car.x - 20; g.player.y = car.y + 34;
    await T(300);
    return { id: car.id, x: car.x, y: car.y, prompt: document.getElementById('hud-prompt').textContent };
  }, st1);
  await page.keyboard.press('KeyE'); await wait(400);
  const driving = await page.evaluate(() => window.oberverse.ui.game.player.driving);
  record('iso: E gets into an owned car', driving === drive0.id, JSON.stringify({ prompt: drive0.prompt, driving }));
  await page.keyboard.down('KeyW'); await wait(2200);
  await shot('3d-car-driving');
  const drive1 = await page.evaluate(() => { const ui = window.oberverse.ui; const g = ui.game; const R = ui.renderer; const car = g.vehicles.car(g.player.driving); const c = R.toScreen(car.x, car.y, 8); return { x: car.x, y: car.y, sx: c.x, sy: c.y, w: R.canvas.width, h: R.canvas.height, py: [g.player.x, g.player.y] }; });
  await page.keyboard.up('KeyW');
  const moved = Math.hypot(drive1.x - drive0.x, drive1.y - drive0.y);
  record('iso: driving moves the car, the player rides with it and the camera follows (the car is near the middle of the screen)', moved > 30 && Math.hypot(drive1.py[0] - drive1.x, drive1.py[1] - drive1.y) < 1 && Math.abs(drive1.sx - drive1.w / 2) < drive1.w * 0.12 && Math.abs(drive1.sy - drive1.h / 2) < drive1.h * 0.15, JSON.stringify({ moved: Math.round(moved), ...drive1 }));
  await wait(900); // (let it roll to a stop)
  await page.keyboard.down('KeyS'); await wait(1200); await page.keyboard.up('KeyS'); await wait(300);
  await page.keyboard.press('KeyE'); await wait(400);
  const out = await page.evaluate(() => { const g = window.oberverse.ui.game; return { driving: g.player.driving }; });
  record('iso: E gets out of the car, on foot again', !out.driving, JSON.stringify(out));
  await closeAll();

  // (2) a gun: the mouse aims on screen, the bullet leaves along the aim (projected), and the player faces it
  const st2 = await isoStage();
  await page.evaluate(() => { const g = window.oberverse.ui.game; g.inventory.add('item_revolver', 1, { silent: true }); g.inventory.add('item_ammo_38', 30, { silent: true }); g.combat.equip('item_revolver'); g.player.mags = g.player.mags || {}; g.player.mags.item_revolver = 6; });
  const shots = [];
  for (const [dx, dy] of [[140, -60], [-90, -110]]) {
    const tgt = await page.evaluate(({ dx, dy }) => { const ui = window.oberverse.ui; const g = ui.game; const R = ui.renderer; const c = R.toScreen(g.player.x + dx, g.player.y + dy, 18); const r = R.canvas.getBoundingClientRect(); return { x: r.left + c.x * (r.width / R.canvas.width), y: r.top + c.y * (r.height / R.canvas.height) }; }, { dx, dy });
    await page.mouse.move(tgt.x, tgt.y); await wait(250);
    await page.mouse.down(); await wait(70);
    shots.push(await page.evaluate(({ dx, dy }) => { const g = window.oberverse.ui.game; const b = g.combat.bullets[g.combat.bullets.length - 1]; const R = window.oberverse.ui.renderer; if (!b) return null; let d = Math.abs(Math.atan2(b.dy, b.dx) - Math.atan2(dy, dx)) * 180 / Math.PI; if (d > 180) d = 360 - d; return { deg: Math.round(d * 100) / 100, n: g.combat.bullets.length, face: R.motion.get(g.player)?.face }; }, { dx, dy }));
    if (shots.length === 1) await shot('3d-gunfire');
    await page.mouse.up(); await wait(600);
  }
  record('iso: a shot fired at the mouse spawns a bullet whose direction is the aim (within 6 degrees)', shots.length === 2 && shots.every((q) => q && q.deg < 6 && q.n >= 1), JSON.stringify(shots));
  await page.evaluate(() => { const ui = window.oberverse.ui; ui.mouse.movedAt = -1e9; ui.game.combat.equip(null); });
  await closeAll();

  // (3) the Wrath in the iso view: Sir Moneybucks is attacked; the cutscene plays on the iso world, and afterwards the game goes on as it always did
  const st3 = await isoStage();
  const wrathBefore = await page.evaluate((st) => {
    const ui = window.oberverse.ui; const g = ui.game; const n = g.npcs.get('npc_moneybucks');
    n.map = 'halvermouth'; n.x = st.cx + 36; n.y = st.cy + 4; n.moving = false; g.player.money = 1000;
    g.combat.smite(n, null);
    return { money: g.player.money, day: g.clock.day };
  }, st3);
  await wait(4300);
  const mid = await page.evaluate(() => { const ui = window.oberverse.ui; const g = ui.game; return { wrath: Boolean(g.combat.wrath), iso: ui.renderer.isoNow, theme: g.combat.wrath?.theme, struck: g.combat.wrath?.struck }; });
  await shot('3d-wrath-oil');
  record('iso: during the Wrath the world is drawn by the iso renderer and the cutscene is running', mid.wrath && mid.iso && mid.theme === 'oil' && mid.struck >= 3, JSON.stringify(mid));
  await wait(6000);
  record('iso: the Wrath ends with the struck-down card', (await page.evaluate(() => window.oberverse.ui.game.combat.wrath?.over === true)) && (await page.isVisible('#modal:not(.hidden)')));
  await page.click('#modal-body button.primary'); await wait(600);
  const wrathAfter = await page.evaluate(() => { const ui = window.oberverse.ui; const g = ui.game; return { wrath: g.combat.wrath, map: g.player.map, money: g.player.money, health: g.player.health, time: g.clock.timeString, day: g.clock.day, iso: ui.renderer.isoNow, state: ui.state }; });
  record('iso: after the Wrath you rise at home next morning having lost at least half your money (the morning bills come after), and the iso view is back', wrathAfter.wrath === null && wrathAfter.map === 'player_flat' && wrathAfter.money <= wrathBefore.money / 2 && wrathAfter.health === 100 && /^08:0\d$/.test(wrathAfter.time) && wrathAfter.day === wrathBefore.day + 1 && wrathAfter.iso && wrathAfter.state === 'playing', JSON.stringify(wrathAfter));
  await shot('3d-wrath-after');
  await closeAll();


  // a lost WebGL context must not throw: the game goes on in the 2D isometric view
  const lost = await at3d(`const gl = R.world3d.gl.getContext(); const ext = gl.getExtension('WEBGL_lose_context'); if (!ext) return { skipped: true }; ext.loseContext(); await T(1500); return { mode: R.mode, w3d: Boolean(R.world3d), gl: getComputedStyle(document.getElementById('game3d')).display, state: ui.state };`);
  record('3d: a lost WebGL context drops to the 2D isometric view without an error', lost.skipped || (lost.mode === 'iso2d' && lost.state === 'playing'), JSON.stringify(lost));
  await shot('3d-context-lost');

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
