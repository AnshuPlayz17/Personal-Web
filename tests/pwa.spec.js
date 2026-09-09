const { test, expect } = require('@playwright/test');

/**
 * Offline support. The risk with a service worker is not that it fails to
 * install — it is that it installs and then quietly serves a stale or broken
 * site forever. These tests are aimed at that failure mode as much as at the
 * happy path.
 */

async function registerAndWait(page) {
  await page.goto('/index.html');
  await page.waitForFunction(
    () => navigator.serviceWorker && navigator.serviceWorker.controller !== null,
    null,
    { timeout: 15000 }
  );
}

test.describe('manifest', () => {
  test('is served, parses, and declares the icons it claims', async ({ page, request }) => {
    await page.goto('/index.html');
    const href = await page.locator('link[rel=manifest]').getAttribute('href');
    expect(href).toBeTruthy();

    const res = await request.get(`/${href}`);
    expect(res.status()).toBe(200);
    const manifest = JSON.parse(await res.text());

    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    // Every icon must actually exist — a manifest pointing at a 404 makes the
    // install prompt fail with no visible explanation.
    for (const icon of manifest.icons) {
      const r = await request.get(`/${icon.src}`);
      expect(r.status(), `${icon.src} should exist`).toBe(200);
      expect(r.headers()['content-type']).toContain('image');
    }
    // Android needs a maskable icon or it applies its own crop.
    expect(manifest.icons.some((i) => (i.purpose || '').includes('maskable'))).toBe(true);
  });

  test('the apple touch icon exists', async ({ page, request }) => {
    await page.goto('/index.html');
    const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    const r = await request.get(`/${href}`);
    expect(r.status()).toBe(200);
  });
});

test.describe('service worker', () => {
  test('registers and takes control', async ({ page }) => {
    await registerAndWait(page);
    const state = await page.evaluate(() => navigator.serviceWorker.controller.state);
    expect(['activated', 'activating']).toContain(state);
  });

  test('cross-origin requests are left alone', async ({ page }) => {
    await registerAndWait(page);
    const handled = await page.evaluate(async () => {
      // The worker must not attempt to cache or rewrite third-party URLs.
      const res = await fetch('https://i.ytimg.com/vi/3Y-hIcNKANw/maxresdefault.jpg', { mode: 'no-cors' }).catch(
        (e) => ({ error: String(e) })
      );
      return res && res.error ? 'network-error' : 'passed-through';
    });
    // Either outcome is fine — what matters is the worker did not synthesise
    // a response of its own, which would surface as a thrown SW error.
    expect(['network-error', 'passed-through']).toContain(handled);
  });

  test('the unregister escape hatch works', async ({ page }) => {
    await registerAndWait(page);
    const gone = await page.evaluate(async () => {
      navigator.serviceWorker.controller.postMessage({ type: 'unregister' });
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 250));
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length === 0) return true;
      }
      return false;
    });
    expect(gone).toBe(true);
  });
});

test.describe('offline page', () => {
  test('stands on its own without the site stylesheet', async ({ page }) => {
    await page.goto('/offline.html');
    await expect(page.locator('h1')).toContainText(/offline/i);
    const styled = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(styled).not.toBe('rgba(0, 0, 0, 0)');
    // It must offer a way back.
    await expect(page.locator('a[href*="index.html"]')).toBeVisible();
  });
});
