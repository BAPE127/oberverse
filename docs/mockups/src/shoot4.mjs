import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const pw = require(`${execSync('npm root -g').toString().trim()}/playwright`);
const b = await pw.chromium.launch({ headless: true });
const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
for (const [f, out] of [['pol-oberpad-1', 'proposal-pol-oberpad-overview'], ['pol-oberpad-2', 'proposal-pol-oberpad-diplomacy'], ['pol-oberpad-3', 'proposal-pol-oberpad-influence'], ['war-oberpad-1', 'proposal-war-oberpad-company'], ['war-oberpad-2', 'proposal-war-oberpad-command']]) {
  await page.goto(`file://${process.cwd()}/${f}.html`); await page.waitForTimeout(500);
  await page.screenshot({ path: `${process.cwd()}/../${out}.png`, fullPage: true }); console.log(out);
}
console.log(errs.length ? errs : 'ok'); await b.close();
