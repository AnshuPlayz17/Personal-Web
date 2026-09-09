const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');

/**
 * Genuine offline testing.
 *
 * Playwright's context.setOffline() does not apply to requests a service
 * worker makes — verified directly: with the context offline, a navigation to
 * a missing page still returned the server's real 404, which means the
 * worker's fetch reached the network. Any "works offline" test built on
 * setOffline therefore passes whether or not offline support exists.
 *
 * So these tests serve a copy of the site from a server they own, and kill it.
 * That is the only way to make the worker's own fetch actually fail.
 */

const SITE_FILES = [
  'index.html', 'style.css', 'script.js', 'sw.js', 'offline.html', 'manifest.webmanifest',
];
const SITE_DIRS = ['assets'];

let dir, server, port, origin;

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
    s.on('error', reject);
  });
}

async function waitForServer(url, up, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ok = await fetch(url).then((r) => r.ok).catch(() => false);
    if (ok === up) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`server did not go ${up ? 'up' : 'down'} in time`);
}

function startServer() {
  server = spawn('npx', ['--yes', 'http-server', dir, '-p', String(port), '-c-1', '--silent', '-a', '127.0.0.1'], {
    stdio: 'ignore',
    detached: true,
  });
  return waitForServer(`${origin}/index.html`, true);
}

async function stopServer() {
  if (!server) return;
  try { process.kill(-server.pid, 'SIGKILL'); } catch (e) { /* already gone */ }
  server = null;
  await waitForServer(`${origin}/index.html`, false);
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-offline-'));
  for (const f of SITE_FILES) fs.copyFileSync(path.join(process.cwd(), f), path.join(dir, f));
  for (const d of SITE_DIRS) fs.cpSync(path.join(process.cwd(), d), path.join(dir, d), { recursive: true });
  port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  await startServer();
});

test.afterAll(async () => {
  await stopServer();
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

test('the site renders with the server genuinely gone', async ({ page }) => {
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 20000 });
  await page.waitForTimeout(2000); // let the precache finish

  await stopServer();

  // Prove the server is really down before crediting the worker for anything.
  const reachable = await page.evaluate((o) => fetch(o + '/sw.js', { cache: 'no-store' }).then(() => true).catch(() => false), origin);
  expect(reachable, 'server must be down for this test to mean anything').toBe(false);

  await page.goto(`${origin}/index.html`);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('#projects')).toBeAttached();

  // Styled, not a bare fallback.
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');

  // And the font came from cache too.
  const fontLoaded = await page.evaluate(() => document.fonts.check('16px Inter'));
  expect(fontLoaded).toBe(true);

  await startServer();
});

test('an uncached page falls back to the offline page when the network is down', async ({ page }) => {
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 20000 });
  await page.waitForTimeout(2000);

  await stopServer();
  await page.goto(`${origin}/never-cached.html`).catch(() => {});
  await expect(page.locator('h1')).toContainText(/offline/i);
  await expect(page.locator('a[href*="index.html"]')).toBeVisible();

  await startServer();
});

test('a redeploy is picked up immediately, never served stale', async ({ page }) => {
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 20000 });
  await page.waitForTimeout(1500);

  // Stand in for a deploy: change the file the worker has already cached.
  const original = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(dir, 'index.html'), original.replace('Engineering ideas', 'REDEPLOYED MARKER'));

  await page.goto(`${origin}/index.html`);
  await expect(page.locator('h1')).toContainText('REDEPLOYED MARKER');

  fs.writeFileSync(path.join(dir, 'index.html'), original);
});
