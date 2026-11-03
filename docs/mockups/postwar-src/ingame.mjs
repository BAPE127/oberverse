// Drives the real game (dev.html on the local server) and drops a mock map into it, then screenshots the real renderer.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(`${execSync('npm root -g').toString().trim()}/playwright`); }
export async function open(port = 8431, w = 1600, h = 900) {
  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`http://127.0.0.1:${port}/dev.html`); await page.waitForTimeout(1500);
  await page.click('text=New game'); await page.fill('#new-name', 'Wren'); await page.click('#new-start'); await page.waitForTimeout(1200);
  return { browser, page, errs };
}
