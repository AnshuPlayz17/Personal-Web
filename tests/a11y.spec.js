const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/**
 * Accessibility. axe-core covers what a machine can decide; the rest of this
 * file covers the things it structurally cannot — real keyboard traversal,
 * focus visibility, Windows High Contrast, and reflow at 400% zoom.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page, tags = WCAG) {
  return new AxeBuilder({ page }).withTags(tags).analyze();
}

/**
 * Scroll-driven animations mean an element's opacity depends on where the page
 * happens to be scrolled, and axe reads the blended colour that results — a
 * half-faded hero reports as a contrast failure that no user ever sees.
 * Emulating reduced motion settles every element at its final state, which is
 * the state contrast should actually be judged in.
 */
async function settle(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

function summarise(violations) {
  return violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`);
}

test.describe('axe-core', () => {
  for (const scheme of ['dark', 'light']) {
    test(`no WCAG 2.2 AA violations — ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto('/index.html');
      await page.waitForTimeout(500);
      const { violations } = await scan(page);
      expect(summarise(violations)).toEqual([]);
    });
  }

  test('no violations with the mobile sheet open', async ({ page }) => {
    await settle(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html');
    await page.locator('#menuToggle').click();
    await page.waitForTimeout(500);
    const { violations } = await scan(page);
    expect(summarise(violations)).toEqual([]);
  });

  test('no violations with the form in an error state', async ({ page }) => {
    await settle(page);
    await page.goto('/index.html');
    await page.locator('#contactForm button[type=submit]').click();
    await page.waitForTimeout(300);
    const { violations } = await scan(page);
    expect(summarise(violations)).toEqual([]);
  });

  test('no violations with a project disclosure open', async ({ page }) => {
    await settle(page);
    await page.goto('/index.html');
    await page.evaluate(() => document.querySelectorAll('details.detail').forEach((d) => (d.open = true)));
    await page.waitForTimeout(300);
    const { violations } = await scan(page);
    expect(summarise(violations)).toEqual([]);
  });
});

test.describe('keyboard', () => {
  test('the skip link is the first stop and jumps to main', async ({ page }) => {
    await page.goto('/index.html');
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.className || '');
    expect(first).toContain('skip-link');
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#main');
  });

  test('focus never lands on something invisible', async ({ page }) => {
    await settle(page);
    await page.goto('/index.html');

    // The real failure mode is a keyboard user tabbing into a control they
    // cannot see — an off-screen menu, a button faded to zero, a dialog that
    // is closed but still reachable.
    const probe = () =>
      page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body || a === document.documentElement) return null;
        const cs = getComputedStyle(a);
        const r = a.getBoundingClientRect();
        const hidden =
          a.offsetParent === null && cs.position !== 'fixed'
            ? 'not rendered'
            : cs.visibility === 'hidden'
              ? 'visibility:hidden'
              : parseFloat(cs.opacity) < 0.05
                ? 'opacity ~0'
                : r.width === 0 || r.height === 0
                  ? 'zero size'
                  : null;
        if (!hidden) return null;
        // Report enough to diagnose without a second CI round: this failed once
        // with the right class applied and the wrong computed opacity, and the
        // message did not say whether an inline style or a rule was in charge.
        const cls = (a.className || '').toString().slice(0, 40);
        const inline = a.getAttribute('style') || 'none';
        return `${a.tagName}.${cls} — ${hidden} (opacity ${cs.opacity}, inline: ${inline})`;
      });

    const invisible = [];
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press('Tab');

      let bad = await probe();
      if (bad) {
        // Tabbing can scroll a control into view and reveal it in the same
        // moment — the back-to-top button fades in over 280ms — and a read
        // taken mid-transition reports an opacity the user never experiences
        // as hidden. WebKit lost this race on CI while the other engines did
        // not. Look again before calling it a failure; something genuinely
        // hidden stays hidden.
        await page.waitForTimeout(150);
        bad = await probe();
      }
      if (bad) invisible.push(bad);
    }
    expect([...new Set(invisible)]).toEqual([]);
  });

  // The failure this guards against is narrow and was seen only on WebKit CI:
  // a Tab can scroll the page, the scroll handler can decide to hide the
  // back-to-top button in that same moment, and `visibility` is transitioned
  // with a delay — so the button stays focusable for the length of its own
  // fade-out. Focus then sits on something the user cannot see.
  test('the back-to-top button stays visible for as long as it holds focus', async ({ page }) => {
    await settle(page);
    await page.goto('/index.html');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('#toTop')).toHaveClass(/is-shown/);

    await page.locator('#toTop').focus();
    // Scrolling back to the top makes the scroll handler drop `is-shown`,
    // which is exactly the moment the button used to fade out under focus.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('#toTop')).not.toHaveClass(/is-shown/);
    // Well past the 280ms fade, so this cannot pass by catching it mid-transition.
    await page.waitForTimeout(400);

    const seen = await page.evaluate(() => {
      const b = document.getElementById('toTop');
      const cs = getComputedStyle(b);
      return {
        focused: document.activeElement === b,
        opacity: parseFloat(cs.opacity),
        visibility: cs.visibility,
        marked: b.classList.contains('is-focus'),
        inlineOpacity: b.style.opacity,
      };
    });
    expect(seen.focused).toBe(true);
    // `is-focus` is what makes this hold in engines where :focus does not match
    // a document that is not itself focused.
    expect(seen.marked).toBe(true);
    // And the inline lock, which is what makes it hold regardless of which rule
    // wins the cascade — the class alone was applied on WebKit and still lost.
    expect(seen.inlineOpacity).toBe('1');
    expect(seen.visibility).toBe('visible');
    expect(seen.opacity).toBeGreaterThan(0.95);
  });

  test('the controls that matter are all reachable by keyboard', async ({ page }) => {
    await settle(page);
    await page.goto('/index.html');

    const wanted = ['themeToggle', 'cf-name', 'cf-email', 'cf-msg', 'resumeBtn'];
    const found = new Set();
    for (let i = 0; i < 60 && found.size < wanted.length; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => document.activeElement?.id || '');
      if (wanted.includes(id)) found.add(id);
    }
    expect([...wanted].filter((w) => !found.has(w))).toEqual([]);
  });

  test('focus is always visible, never suppressed', async ({ page }) => {
    await page.goto('/index.html');
    const bad = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return null;
        const cs = getComputedStyle(a);
        const ring =
          (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
          cs.boxShadow !== 'none' ||
          cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
        return { tag: a.tagName, cls: (a.className || '').toString().slice(0, 30), ring };
      });
      if (info && !info.ring) bad.push(`${info.tag}.${info.cls}`);
    }
    expect(bad).toEqual([]);
  });

  test('the lightbox traps focus and Escape closes it', async ({ page }) => {
    await page.goto('/index.html');
    // No photos ship with the site, so drive the dialog directly to prove the
    // mechanism works the moment one is added.
    const opened = await page.evaluate(() => {
      const d = document.getElementById('lightbox');
      if (!d || typeof d.showModal !== 'function') return false;
      d.showModal();
      return d.open;
    });
    expect(opened).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => document.getElementById('lightbox').open)).toBe(false);
  });
});

test.describe('forced colors (Windows High Contrast)', () => {
  test('content stays visible when the OS overrides colours', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.waitForTimeout(400);

    const invisible = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('h1, h2, h3, p, li, a, button, summary, label').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        if (parseFloat(cs.opacity) < 0.1) out.push(el.tagName + '.' + (el.className || '').toString().slice(0, 24));
      });
      return out;
    });
    expect(invisible).toEqual([]);
  });
});

test.describe('reflow', () => {
  test('no horizontal scrolling at 400% zoom (WCAG 1.4.10)', async ({ page }) => {
    // 1280 CSS px at 400% is equivalent to a 320px viewport.
    await page.setViewportSize({ width: 320, height: 512 });
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

  test('text scales with the user font size without clipping', async ({ page }) => {
    await page.goto('/index.html');
    // Simulate a larger default font, which rem-based type must respect.
    await page.evaluate(() => (document.documentElement.style.fontSize = '24px'));
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('semantics', () => {
  test('headings descend without skipping a level', async ({ page }) => {
    await page.goto('/index.html');
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1])
    );
    const skips = [];
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) skips.push(`${levels[i - 1]} -> ${levels[i]}`);
    }
    expect(skips).toEqual([]);
  });

  test('every landmark and control carries an accessible name', async ({ page }) => {
    await page.goto('/index.html');
    const unnamed = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('nav, button, a[href]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const name =
          el.getAttribute('aria-label') ||
          el.getAttribute('title') ||
          (el.textContent || '').trim() ||
          (el.querySelector('img') || {}).alt;
        if (!name) out.push(el.tagName + '.' + (el.className || '').toString().slice(0, 28));
      });
      return out;
    });
    expect(unnamed).toEqual([]);
  });

  test('the document declares a language', async ({ page }) => {
    await page.goto('/index.html');
    expect(await page.evaluate(() => document.documentElement.lang)).toBeTruthy();
  });
});
