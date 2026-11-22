/**
 * Rebuilds assets/anshu-arunav-resume.pdf from resume.html.
 *
 *   node tools/resume/build.mjs
 *
 * The résumé is typeset here rather than converted from the Word original, so
 * it matches the site's typography. Two things are deliberately left out of the
 * published file: the phone number and the age line. A phone number committed
 * to a public repo's history cannot be taken back.
 *
 * Margins live in the stylesheet's @page rule and nowhere else. Chromium lets a
 * CSS @page margin override the margin passed to pdf(), so passing both is how
 * this once shipped printing edge to edge: the CSS said 0 and quietly won.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { createServer } from 'http';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const PORT = 8899;

// The @font-face points at the site's self-hosted Inter over http, so serve the
// repo while the page renders.
const types = { '.woff2': 'font/woff2', '.html': 'text/html', '.css': 'text/css' };
const server = createServer((req, res) => {
  try {
    const body = readFileSync(join(root, decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'content-type': types[extname(req.url)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
await page.setContent(readFileSync(join(here, 'resume.html'), 'utf8'), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);

const out = join(root, 'assets', 'anshu-arunav-resume.pdf');
await page.pdf({ path: out, format: 'Letter', printBackground: true });
await browser.close();
server.close();

// Fail loudly rather than ship a two-page or edge-to-edge résumé: tests/
// functional.spec.js asserts the same properties, but not before this runs.
const buf = readFileSync(out);
const raw = buf.toString('latin1');
const pages = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;
if (pages !== 1) throw new Error(`résumé is ${pages} pages; it must fit on one`);
if (raw.includes('647')) throw new Error('phone number found in the published PDF');
console.log(`wrote ${out} — ${pages} page, ${(buf.length / 1024).toFixed(0)} KB`);
