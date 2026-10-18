#!/usr/bin/env node
// Screenshots every level (or the ones given) for acceptance: top-down with and without the plan
// calque, plus the default perspective. Fails when a page logs a console error.
//
//   node tools/shots.mjs [levelId…]   → verification/<id>-top.png, <id>-top-calque.png, <id>-iso.png

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const OUT = path.join(PROJECT, 'verification');
const PORT = 5179;
const LEVELS = ['silo2', 'silo1', 'rdc', 'e1', 'e2', 'e3', 'e4', 'toits'];
const CHROMIUM = process.env.CHROMIUM || '/usr/bin/chromium';

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : LEVELS;
mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: PROJECT, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('vite did not start')), 20000);
  server.stdout.on('data', (d) => { if (String(d).includes('Local:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', (d) => process.stderr.write(d));
});

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];
let shots = 0;
try {
  for (const id of wanted) {
    for (const [suffix, query] of [['top', 'view=top'], ['top-calque', 'view=top&calque=1'], ['iso', 'view=iso']]) {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`${id}/${suffix}: ${m.text()}`); });
      page.on('pageerror', (e) => errors.push(`${id}/${suffix}: ${e.message}`));
      await page.goto(`http://localhost:${PORT}/?level=${id}&${query}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, `${id}-${suffix}.png`) });
      await page.close();
      shots++;
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`${shots} screenshots in ${path.relative(PROJECT, OUT)}/`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
