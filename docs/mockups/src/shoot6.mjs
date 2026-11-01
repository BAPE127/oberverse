import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const pw = require(`${execSync('npm root -g').toString().trim()}/playwright`);
const b = await pw.chromium.launch({ headless: true });
const page = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(`file://${process.cwd()}/flow.html`); await page.waitForTimeout(400);
await page.screenshot({ path: `${process.cwd()}/../proposal-war-flow.png`, fullPage: true }); await b.close(); console.log('ok');
