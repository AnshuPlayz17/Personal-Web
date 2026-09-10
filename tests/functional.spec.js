const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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

test.describe('headline', () => {
  test('the reveal mask does not clip descenders', async ({ page }) => {
    // `line-height: 0.98` pulls the line box tighter than the font's natural
    // height, so the mask's bottom edge once cut straight through the g in
    // "Engineering" and the y in "reality".
    //
    // Rendering the same region twice — once masked, once with the mask
    // removed — needs no stored baseline, so this runs on every engine and
    // catches the problem wherever it appears.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: '.grain, .aurora { display: none !important; }' });
    await page.waitForTimeout(400);

    const clip = await page.evaluate(() => {
      const r = document.querySelector('.display').getBoundingClientRect();
      return { x: Math.floor(r.x) - 4, y: Math.floor(r.y) - 10, width: Math.ceil(r.width) + 8, height: Math.ceil(r.height) + 60 };
    });

    const masked = await page.screenshot({ clip });
    await page.addStyleTag({ content: '.display .line { overflow: visible !important; }' });
    await page.waitForTimeout(200);
    const unmasked = await page.screenshot({ clip });

    expect(Buffer.compare(masked, unmasked), 'masked headline should render identically to an unmasked one').toBe(0);
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

  // The form used to have no address to send to and pushed people to LinkedIn
  // instead. Now that CONTACT_EMAIL is set, a valid submit must take the email
  // branch: no LinkedIn popup, and the success status the mailto path sets.
  test('a valid submit hands off to email, not the LinkedIn fallback', async ({ page }) => {
    // window.location cannot be redefined in Chromium, and a mailto: never
    // becomes a request, so watch what the two branches do differently instead:
    // the fallback opens a window and returns before setting `is-ok`.
    await page.evaluate(() => {
      window.__popups = 0;
      const open = window.open;
      window.open = function (...a) { window.__popups++; return open.apply(this, a); };
    });

    await page.fill('#cf-name', 'Test Person');
    await page.fill('#cf-email', 'test@example.com');
    await page.fill('#cf-msg', 'Hello, this is a message.');
    await page.locator('#contactForm button[type=submit]').click();

    await expect(page.locator('#formStatus')).toHaveClass(/is-ok/);
    await expect(page.locator('#formStatus')).toContainText(/email app/i);
    expect(await page.evaluate(() => window.__popups)).toBe(0);
  });

  // And the address itself, which the behaviour above cannot see.
  test('a contact address is actually configured', async ({ request }) => {
    const src = await (await request.get('/script.js')).text();
    const m = src.match(/var CONTACT_EMAIL\s*=\s*'([^']*)'/);
    expect(m, 'CONTACT_EMAIL declaration not found').not.toBeNull();
    expect(m[1]).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
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
  test('every project card carries a disclosure that opens', async ({ page }) => {
    await expect(page.locator('.project')).toHaveCount(5);
    const details = page.locator('.project details.detail');
    await expect(details).toHaveCount(5);
    const n = await details.count();
    for (let i = 0; i < n; i++) {
      await details.nth(i).locator('summary').click();
      await expect.poll(() => details.nth(i).evaluate((d) => d.open)).toBe(true);
    }
  });

  // The cards are named after real projects on the résumé. A rename that only
  // lands in one of the two is the failure worth catching.
  test('all five résumé projects are on the page', async ({ page }) => {
    for (const [id, name] of [
      ['p-vex', 'VEX 19109M'],
      ['p-calenda', 'Calenda'],
      ['p-skysaver', 'SkySaver'],
      ['p-tappy', 'Tappy'],
      ['p-neopark', 'NeoPark'],
    ]) {
      await expect(page.locator(`#${id} h3`)).toHaveText(new RegExp(name));
    }
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

  // The published PDF once printed edge to edge, with no margin on any side,
  // because the stylesheet's `@page { margin: 0 }` silently overrode the margin
  // passed to Chromium's pdf(). It looked fine in a browser and wrong on paper,
  // and nothing here would have caught it. This reads the shipped file.
  test('the PDF has real margins and is a single page', async () => {
    const buf = fs.readFileSync(path.join(__dirname, '..', 'assets', 'anshu-arunav-resume.pdf'));
    const raw = buf.toString('latin1');

    expect((raw.match(/\/Type\s*\/Page[^s]/g) || []).length, 'should be one page').toBe(1);

    const media = raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/);
    expect(media, '/MediaBox not found').not.toBeNull();
    const [pageW, pageH] = [parseFloat(media[1]), parseFloat(media[2])];

    // The page content is drawn inside a clip rectangle set at the top of the
    // content stream, in the scale that stream's first `cm` establishes.
    let header = null;
    let i = 0;
    while (i < buf.length) {
      const s0 = buf.indexOf('stream', i);
      if (s0 === -1) break;
      let p0 = s0 + 6;
      if (buf[p0] === 0x0d) p0++;
      if (buf[p0] === 0x0a) p0++;
      const e0 = buf.indexOf('endstream', p0);
      if (e0 === -1) break;
      try {
        const inflated = zlib.inflateSync(buf.subarray(p0, e0));
        if (inflated.includes('BT')) { header = inflated.subarray(0, 200).toString('latin1'); break; }
      } catch (_) { /* not a flate stream */ }
      i = e0 + 9;
    }
    expect(header, 'no text-bearing content stream found').not.toBeNull();

    const scale = parseFloat(header.match(/^([\d.\-]+)\s/)[1]);
    const clip = header.match(/([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+re/);
    expect(clip, 'no clip rectangle in the content stream').not.toBeNull();

    const [x, y, w, h] = clip.slice(1, 5).map((v) => parseFloat(v) * scale);
    const margins = { left: x, right: pageW - x - w, top: y, bottom: pageH - y - h };

    // 28pt is a bit under 0.4in — comfortably clears the 0.5/0.6in the résumé
    // uses, and nowhere near the 0 that shipped.
    for (const [side, value] of Object.entries(margins)) {
      expect(value, `${side} margin is ${value.toFixed(1)}pt`).toBeGreaterThan(28);
    }
  });

  test('it is also reachable from the contact list and the footer', async ({ page }) => {
    await expect(page.locator('.contact__side a[href$="anshu-arunav-resume.pdf"]')).toHaveCount(1);
    await expect(page.locator('.footer a[href$="anshu-arunav-resume.pdf"]')).toHaveCount(1);
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
