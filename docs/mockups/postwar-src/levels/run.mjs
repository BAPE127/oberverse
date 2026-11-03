// Renders the Neumina level scenes with the game's own painters, under the real game HUD. Needs the dev server (PORT=8431 node server.js).
import { open } from '../ingame.mjs';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LABEL = { terrace: ['Neumina / Skyline Terraces', 'LEVEL +4  SKYLINE TERRACES'], under: ['Neumina / The Under-Levels', 'LEVEL -2  UNDER-LEVELS'], stack: ['Neumina / The Stack', 'LEVELS +4 / 0 / -2'], street: ['Neumina / Glass Mile', 'LEVEL 0  GLASS MILE'], bridge: ['Neumina / Sky Bridge 7', 'LEVEL +1  SKY BRIDGE'], inside: ['Neumina / Meridian Bank', 'LEVEL +3  FLOOR 4 OF 6'], roof: ['Neumina / Meridian Bank', 'LEVEL +6  ROOF'] };
const which = process.argv.slice(2); const names = which.length ? which : ['street', 'terrace', 'under', 'stack'];
for (const name of names) {
  const { browser, page, errs } = await open(8431, 1600, 900);
  await page.evaluate(async ([name, label]) => {
    const S = await import('/docs/mockups/postwar-src/levels/scenes2.js'); const { GameMap } = await import('/src/world/gameMap.js'); const { PROP_TYPES } = await import('/src/content/props.js');
    const ui = window.oberverse.ui, g = ui.game; g.paused = true; const d = S.def(); g.maps.set(d.id, new GameMap(d, PROP_TYPES)); g.changeMap(d.id, 'start'); g.clock.total = 1440 + 23 * 60 + 20; window.__info = { models: g.content.vehicles.models };
    const r = S.SCENES[name]({ models: g.content.vehicles.models }); r.player = r.player || { x: 30, y: 12 }; g.player.x = r.player.x * 32; g.player.y = r.player.y * 32; ui.renderer.baseZoom = 2; ui.renderer.cam.zoom = 2;
    for (const el of document.querySelectorAll('*')) if (el.children.length === 0 && /^You wake in your new flat/.test(el.textContent || '')) { const p = el.closest('[class]'); if (p) p.style.display = 'none'; }
    const cv = ui.renderer.canvas; const o = document.createElement('canvas'); o.width = cv.clientWidth; o.height = cv.clientHeight; Object.assign(o.style, { position: 'absolute', left: cv.offsetLeft + 'px', top: cv.offsetTop + 'px', width: cv.clientWidth + 'px', height: cv.clientHeight + 'px', imageRendering: 'pixelated', pointerEvents: 'none' });
    cv.parentNode.insertBefore(o, cv.nextSibling); const c = o.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(r.cv, 0, 0, o.width, o.height);
    // the player, drawn by the game's own character painter at the centre of the view
    const { drawCharacter } = await import('/src/engine/drawCharacter.js'); c.save(); c.scale(o.width / 800, o.height / 450); const sx = r.ps.x, sy = r.ps.y; c.translate(0, 0); drawCharacter(c, g.player.appearance || {}, { x: sx, y: sy, facing: 'down', moving: false, idleTime: 0 }); c.restore();
    // a small level badge in the game's HUD style
    const b = document.createElement('div'); b.textContent = label[1]; Object.assign(b.style, { position: 'absolute', left: '410px', top: '16px', padding: '10px 18px', font: '700 15px Inter, system-ui, sans-serif', color: '#fff6c8', background: 'rgba(24,22,70,0.92)', border: '2px solid #4a46b0', borderRadius: '4px', zIndex: 20 }); document.body.appendChild(b);
  }, [name, LABEL[name]]);
  await page.waitForTimeout(900); await page.screenshot({ path: join(OUT, `proposal-postwar-class-neumina-${name}.png`) }); console.log(name, errs.slice(0, 3)); await browser.close();
}
