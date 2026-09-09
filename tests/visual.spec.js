const { test, expect } = require('@playwright/test');

/**
 * Visual regression.
 *
 * Chromium only: Firefox and WebKit binaries cannot be downloaded in the
 * authoring environment, so their baselines could never be generated or
 * trusted here. Behaviour on those engines is covered by functional.spec.js,
 * which CI runs on all three.
 *
 * Every shot is taken with reduced motion on. That is not a shortcut — with
 * scroll-driven animations an element's opacity depends on scroll position,
 * so without it the same page yields a different image every run. Reduced
 * motion settles everything at its final state, which is the state worth
 * diffing.
 */

test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are Chromium-only');

const PARTS = [
  ['nav', '.nav'],
  ['hero', '.hero'],
  ['stats', '#stats'],
  ['about', '#about'],
  ['capabilities', '#skills'],
  ['project-card', '.project >> nth=0'],
  ['project-nfc', '.project >> nth=1'],
  ['timeline', '.timeline'],
  ['reel', '#reel'],
  ['recognition', '#awards'],
  ['contact', '#contact'],
  ['footer', '.footer'],
];

async function prepare(page, scheme) {
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await page.goto('/index.html');
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    // Freeze the count-ups at their final values so the numbers never differ.
    document.querySelectorAll('[data-count]').forEach((e) => (e.textContent = e.getAttribute('data-count')));
  });
  // Hide the decorative grain and aurora. They are per-pixel noise: they make
  // the baselines several times larger, and a diff in them tells you nothing
  // about whether the layout regressed.
  await page.addStyleTag({ content: '.grain, .aurora { display: none !important; }' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

/**
 * Section-level rather than full-page shots, deliberately. A whole-page
 * baseline at three viewports came to roughly 8 MB and, when it changed, only
 * told you that something somewhere moved. Section shots are a twentieth of
 * the weight and point straight at what broke. Page-level layout is covered
 * instead by the overflow assertions in functional.spec.js.
 */
test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const scheme of ['dark', 'light']) {
    for (const [name, selector] of PARTS) {
      test(`${name} — ${scheme}`, async ({ page }) => {
        await prepare(page, scheme);
        await expect(page.locator(selector)).toHaveScreenshot(`desktop-${name}-${scheme}.png`);
      });
    }
  }
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const [name, selector] of PARTS) {
    test(`${name} — dark`, async ({ page }) => {
      await prepare(page, 'dark');
      await expect(page.locator(selector)).toHaveScreenshot(`mobile-${name}-dark.png`);
    });
  }
});

test.describe('states', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('form showing validation errors', async ({ page }) => {
    await prepare(page, 'dark');
    await page.locator('#contactForm button[type=submit]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#contactForm')).toHaveScreenshot('state-form-errors.png');
  });

  test('project disclosure expanded', async ({ page }) => {
    await prepare(page, 'dark');
    await page.evaluate(() => (document.querySelector('details.detail').open = true));
    await page.waitForTimeout(200);
    await expect(page.locator('.project').first()).toHaveScreenshot('state-detail-open.png');
  });

  test('mobile menu open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepare(page, 'dark');
    await page.locator('#menuToggle').click();
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot('state-mobile-menu.png');
  });
});
