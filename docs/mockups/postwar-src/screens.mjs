// Takes the in-engine screenshots of both mock cities. Run with the dev server up (node server.js, PORT=8431).
import { open } from './ingame.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..');
const which = process.argv.slice(2);
const SHOTS = {
  'neumina-street': { city: 'neumina2', hour: 23, at: { key: 'lotus', dx: 0, dy: 3 }, zoom: 2, crowd: ['neu', 40, 30, 14, 40, 3], cars: [40, 30, 16, 9, 3], fn: 'neuStreet' },
  'neumina-plaza': { city: 'neumina2', hour: 22, at: { tile: [85, 58] }, zoom: 1.4, crowd: ['neu', 85, 56, 16, 70, 4], cars: [85, 56, 20, 10, 4], fn: 'neuPlaza' },
  'neumina-map': { city: 'neumina2', hour: 20, at: { tile: [85, 56] }, zoom: 1, vw: 5440, vh: 3520, fn: 'neuMap' },
  'neumina-underground': { city: 'neumina2', under: true, hour: 23, at: { tile: [20, 17.4] }, zoom: 2, crowd: ['neu', 20, 17, 8, 14, 8], fn: 'neuUnder' },
  'noir-street': { city: 'halloran2', hour: 23, at: { key: 'casino', dx: 0, dy: 3 }, zoom: 2, crowd: ['noir', 0, 0, 14, 30, 5], cars: [0, 0, 16, 6, 5], fn: 'noirStreet' },
  'noir-docks': { city: 'halloran2', hour: 2, at: { key: 'pier3', dx: 0, dy: 3 }, zoom: 2, crowd: ['noir', 0, 0, 12, 16, 6], cars: [0, 0, 16, 5, 6], fn: 'noirDocks' },
  'noir-map': { city: 'halloran2', hour: 20, at: { tile: [85, 56] }, zoom: 1, vw: 5440, vh: 3520, fn: 'noirMap' },
};
for (const [name, s] of Object.entries(SHOTS)) {
  if (which.length && !which.includes(name)) continue;
  const { browser, page, errs } = await open(8431, s.vw || 1600, s.vh || 900);
  await page.evaluate(async ([s]) => {
    const C = await import(`/docs/mockups/postwar-src/${s.city}.js`); const S = await import('/docs/mockups/postwar-src/pwscene.js');
    const city = s.under ? { def: C.underground(), meta: { blds: [] } } : C.build(); const { g } = await S.install(city, { hour: s.hour }); g.paused = true;
    let tx, ty; if (s.at.key) { const b = city.def.buildings.find((q) => q.key === s.at.key); tx = b.door.x + s.at.dx; ty = b.door.y + s.at.dy; } else [tx, ty] = s.at.tile; s.pos = [tx, ty];
    if (s.crowd && s.crowd[1] === 0) { s.crowd[1] = tx; s.crowd[2] = ty; } if (s.cars && s.cars[0] === 0) { s.cars[0] = tx; s.cars[1] = ty; } if (s.crowd && s.crowd[1] === 40) { s.crowd[1] = tx; s.crowd[2] = ty; } if (s.cars && s.cars[0] === 40) { s.cars[0] = tx; s.cars[1] = ty; }
    const kind = s.city === 'neumina' ? 'neu' : 'noir'; const models = kind === 'neu' ? ['pipit', 'tempest', 'corsair', 'aurelia', 'regent', 'mule'] : ['aurelia', 'regent', 'corsair', 'dray', 'tempest'];
    const cols = kind === 'neu' ? ['#ff5ec8', '#5ee6ff', '#ffd75e', '#a98cff', '#e8e8f0', '#2a2438'] : ['#1c1c22', '#6a2a30', '#2a3a4a', '#c8b898', '#34343c'];
    if (s.crowd) S.crowd(g, city, s.crowd[0], s.crowd[1], s.crowd[2], s.crowd[3], s.crowd[4], s.crowd[5]);
    if (s.cars) S.traffic(g, city, models, s.cars[0], s.cars[1], s.cars[2], s.cars[3], s.cars[4], cols);
    S.aim(g, (s.pos[0] + 0.5) * 32, (s.pos[1] + 0.5) * 32, s.zoom); window.__S = S; window.__city = city;
  }, [s]);
  await page.waitForTimeout(1600);
  const hook = await page.evaluate(async (fn) => { const m = await import('/docs/mockups/postwar-src/dress.js'); return m[fn] ? (await m[fn](window.__S, window.__city), true) : false; }, s.fn);
  await page.waitForTimeout(400); await page.screenshot({ path: join(OUT, `proposal-postwar-game-${name}.png`) }); console.log(name, hook, errs.slice(0, 3)); await browser.close();
}
