const { test, expect } = require('@playwright/test');

/**
 * Behaviour of the site's interactive parts. Runs on Chromium, Firefox and
 * WebKit, so anything engine-specific shows up here rather than in a bug
 * report from a visitor.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('page loads', () => {
  test('reaches DOMContentLoaded and settles', async ({ page }) => {
    // Regression guard: an infinite MutationObserver loop once hung the page
    // before DOMContentLoaded, so assert the document actually completes.
    await expect.poll(() => page.evaluate(() => document.readyState)).toBe('complete');
  });

  test('has no console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      // The YouTube poster is a deliberate third-party request and may be
      // blocked by a network policy; that is not a site defect.
      if (m.type() === 'error' && !m.text().includes('ytimg')) errors.push(m.text());
    });
    await page.reload();
    await page.waitForTimeout(1200);
    expect(errors).toEqual([]);
  });

  test('title and single h1', async ({ page }) => {
    await expect(page).toHaveTitle(/Anshu Arunav/);
    await expect(page.locator('h1')).toHaveCount(1);
  });
});

test.describe('theme', () => {
  test('toggles and persists across a reload', async ({ page }) => {
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.locator('#themeToggle').click();
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(after).not.toBe(before);
    expect(['light', 'dark']).toContain(after);

    await page.reload();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe(after);
  });

  test('the toggle relabels itself for screen readers', async ({ page }) => {
    const label1 = await page.locator('#themeToggle').getAttribute('aria-label');
    await page.locator('#themeToggle').click();
    const label2 = await page.locator('#themeToggle').getAttribute('aria-label');
    expect(label1).not.toBe(label2);
    expect(label1).toMatch(/switch to/i);
  });
});

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens, closes on Escape, and holds focus while open', async ({ page }) => {
    const toggle = page.locator('#menuToggle');
    await expect(toggle).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobileMenu')).toBeVisible();
    // Content behind the sheet must not be reachable by Tab.
    await expect.poll(() => page.evaluate(() => document.getElementById('main').inert)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => page.evaluate(() => document.getElementById('main').inert)).toBe(false);
  });

  test('a menu link closes the sheet and navigates', async ({ page }) => {
    await page.locator('#menuToggle').click();
    await page.locator('#mobileMenu a[href="#projects"]').click();
    await expect(page.locator('#menuToggle')).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeGreaterThan(100);
  });
});

test.describe('contact form', () => {
  test('errors are hidden until a bad submit', async ({ page }) => {
    // Regression guard: `display: flex` on the error text once overrode the
    // [hidden] attribute, showing three red errors on every page load.
    const errs = page.locator('.field__err');
    for (let i = 0; i < (await errs.count()); i++) {
      await expect(errs.nth(i)).toBeHidden();
    }
  });

  test('an empty submit reports every field and focuses the first', async ({ page }) => {
    await page.locator('#contactForm button[type=submit]').click();
    const errs = page.locator('.field__err');
    for (let i = 0; i < (await errs.count()); i++) {
      await expect(errs.nth(i)).toBeVisible();
    }
    await expect(page.locator('#formStatus')).not.toBeEmpty();
    await expect(page.locator('#cf-name')).toBeFocused();
  });

  test('a bad email is rejected, a good one clears', async ({ page }) => {
    await page.locator('#cf-name').fill('Test Person');
    await page.locator('#cf-email').fill('not-an-email');
    await page.locator('#cf-msg').fill('Hello');
    await page.locator('#contactForm button[type=submit]').click();
    await expect(page.locator('#cf-email-err')).toBeVisible();

    await page.locator('#cf-email').fill('someone@example.com');
    await expect(page.locator('#cf-email-err')).toBeHidden();
  });
});

test.describe('navigation', () => {
  test('the indicator tracks the active section', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      document.querySelector('#projects').scrollIntoView();
    });
    await expect(page.locator('.nav__links a.is-active')).toHaveCount(1);
    await expect(page.locator('#navIndicator')).toHaveClass(/is-on/);
    // The pill's width is transitioned over 420ms, so poll rather than
    // sampling once and catching it mid-animation.
    await expect
      .poll(() => page.locator('#navIndicator').evaluate((el) => parseFloat(getComputedStyle(el).width)))
      .toBeGreaterThan(10);
  });

  test('back-to-top appears after scrolling and returns to the top', async ({ page }) => {
    const btn = page.locator('#toTop');
    await expect(btn).toBeHidden();

    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, window.innerHeight * 3);
    });
    await expect(btn).toBeVisible();

    await btn.click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeLessThan(50);
  });

  test('every in-page anchor resolves to a real element', async ({ page }) => {
    const missing = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => h !== '#' && !document.querySelector(h))
    );
    expect(missing).toEqual([]);
  });
});

test.describe('project details', () => {
  test('each project exposes a How it works disclosure that opens', async ({ page }) => {
    const details = page.locator('details.detail');
    await expect(details).toHaveCount(4);
    await details.first().locator('summary').click();
    await expect.poll(() => details.first().evaluate((d) => d.open)).toBe(true);
  });
});

test.describe('video facade', () => {
  test('stays a facade until clicked, then becomes a real iframe', async ({ page }) => {
    await expect(page.locator('iframe')).toHaveCount(0);
    await page.locator('.video__facade').click();
    await expect(page.locator('.video iframe')).toHaveCount(1);
    const src = await page.locator('.video iframe').getAttribute('src');
    expect(src).toContain('youtube-nocookie.com');
  });
});

test.describe('résumé', () => {
  test('the button is visible and the PDF is actually served', async ({ page, request }) => {
    const btn = page.locator('#resumeBtn');
    await expect(btn).toBeVisible();
    const href = await btn.getAttribute('href');
    const res = await request.get(`/${href}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('pdf');
  });
});

test.describe('resilience', () => {
  test.use({ javaScriptEnabled: false });

  test('the whole page still reads with scripting off', async ({ page }) => {
    await page.goto('/index.html');
    // Regression guard: reveal styles once hid everything below the fold
    // whenever JavaScript did not run.
    const hidden = await page.evaluate(
      () => [...document.querySelectorAll('[data-reveal]')].filter((e) => +getComputedStyle(e).opacity < 0.9).length
    );
    expect(hidden).toBe(0);
    await expect(page.locator('#projects h2')).toBeVisible();
    await expect(page.locator('#contact h2')).toBeVisible();
  });

  test('the stats show real figures, not the animation start value', async ({ page }) => {
    await page.goto('/index.html');
    // The markup used to ship "0" and rely on the count-up to fill it in, so
    // without scripting the strip read "Top 0" and "0x".
    const shown = await page.evaluate(() =>
      [...document.querySelectorAll('[data-count]')].map((e) => ({
        shown: e.textContent.trim(),
        want: e.getAttribute('data-count'),
      }))
    );
    expect(shown.length).toBeGreaterThan(0);
    for (const s of shown) expect(s.shown).toBe(s.want);
  });
});

test.describe('reduced motion', () => {
  test('nothing animates and nothing stays hidden', async ({ page }) => {
    // Set explicitly rather than via test.use: describe-level `reducedMotion`
    // is silently ignored in this Playwright version, which made an earlier
    // version of this test pass against a page that was still animating.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    const state = await page.evaluate(() => ({
      animating: [...document.querySelectorAll('*')].filter((e) => {
        const n = getComputedStyle(e).animationName;
        return n && n !== 'none';
      }).length,
      hidden: [...document.querySelectorAll('[data-reveal]')].filter((e) => +getComputedStyle(e).opacity < 0.9).length,
    }));
    expect(state.animating).toBe(0);
    expect(state.hidden).toBe(0);
  });
});

test.describe('responsive', () => {
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/index.html');
      await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 30));
        }
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
