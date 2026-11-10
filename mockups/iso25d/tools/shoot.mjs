// CONCEPT STUDY ONLY — renders the mock-up scenes to PNG with headless Chromium.
//   node mockups/iso25d/tools/shoot.mjs [sceneId ...] [--w=1920 --h=1080 --out=dir]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/')('playwright')); }
const args = process.argv.slice(2); const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const ids = args.filter((a) => !a.startsWith('--'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const srv = createServer(async (req, res) => { try { const p = join(root, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(root)) throw 0; const b = await readFile(p); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = Number(opt.w) || 1920, H = Number(opt.h) || 1080;
let list = ids;
if (!list.length) { const p0 = await b.newPage(); await p0.goto(`http://127.0.0.1:${port}/tools/list.html`); list = await p0.evaluate(async () => Object.keys((await import('../src/scenes.js')).SCENES)); await p0.close(); }
for (const id of list) {
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [page]', m.text()); }); page.on('pageerror', (e) => console.log('  [error]', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html?scene=${id}&w=${W}&h=${H}&nav=0${opt.px ? `&px=${opt.px}` : ''}`);
  try { await page.waitForFunction(() => window.__ready, null, { timeout: 240000 }); } catch { console.log(id, 'TIMED OUT'); await page.close(); continue; }
  const info = await page.evaluate(() => window.__info);
  const file = join(root, opt.out || 'out', `${id}.png`);
  await page.locator('#stage').screenshot({ path: file });
  console.log(id, JSON.stringify(info), '→', file);
  await page.close();
}
await b.close(); srv.close();
