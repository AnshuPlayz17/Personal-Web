const { test, expect } = require('@playwright/test');

/**
 * Printing. A print job has no scroll position, so anything driven by a
 * scroll timeline sits at its starting value — which for this site means
 * transparent. Most of these assertions exist because that failure mode
 * prints a stack of blank pages and nobody notices until they are holding it.
 */

async function printMode(page) {
  await page.route('**://i.ytimg.com/**', (route) => route.abort());
  await page.goto('/index.html');
  await page.waitForTimeout(600);
  await page.emulateMedia({ media: 'print' });
  // Mirror what the browser does when a print is requested.
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.waitForTimeout(300);
}

test('nothing is transparent when printed', async ({ page }) => {
  await printMode(page);
  const faded = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('h1, h2, h3, p, li, .project, .award, .tl__card, .bento__cell').forEach((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (!r.width || !r.height) return;
      if (parseFloat(cs.opacity) < 0.9) out.push(`${el.tagName}.${(el.className || '').toString().slice(0, 24)}`);
    });
    return out;
  });
  expect(faded).toEqual([]);
});

test('interface chrome is left off the page', async ({ page }) => {
  await printMode(page);
  for (const sel of ['.nav', '.to-top', '.contact__form', '.video', '.hero__visual', '.scroll-hint']) {
    await expect(page.locator(sel).first()).toBeHidden();
  }
});

test('decorative pseudo-elements do not print', async ({ page }) => {
  await printMode(page);
  // The blanket opacity override needed for scroll reveals once un-hid the
  // pointer glow, which printed as a warm smudge across every card.
  const glow = await page.evaluate(() => {
    const c = document.querySelector('.glass-card');
    const cs = getComputedStyle(c, '::after');
    return { content: cs.content, display: cs.display };
  });
  expect(glow.display === 'none' || glow.content === 'none').toBe(true);
});

test('external links show where they go', async ({ page }) => {
  await printMode(page);
  const shown = await page.evaluate(() => {
    const a = document.querySelector('a[href^="http"]');
    return getComputedStyle(a, '::after').content;
  });
  expect(shown).toContain('http');
});

test('in-page anchors do not show a URL', async ({ page }) => {
  await printMode(page);
  const shown = await page.evaluate(() => {
    const a = document.querySelector('.footer__links a[href^="#"], a[href^="#"]');
    return getComputedStyle(a, '::after').content;
  });
  expect(['none', '""', 'normal']).toContain(shown);
});

test('stat counters print their final value, not a mid-count number', async ({ page }) => {
  // Print immediately, while the count-up would still be running. A print
  // taken a second after load once showed "Top 9" instead of "Top 10".
  await page.route('**://i.ytimg.com/**', (route) => route.abort());
  await page.goto('/index.html');
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));

  const values = await page.evaluate(() =>
    [...document.querySelectorAll('[data-count]')].map((e) => ({
      shown: e.textContent.trim(),
      want: e.getAttribute('data-count'),
    }))
  );
  expect(values.length).toBeGreaterThan(0);
  for (const v of values) expect(v.shown).toBe(v.want);
});

test('project disclosures are expanded so their content prints', async ({ page }) => {
  await printMode(page);
  const closed = await page.evaluate(() => [...document.querySelectorAll('details')].filter((d) => !d.open).length);
  expect(closed).toBe(0);
});

test('disclosures return to their closed state after printing', async ({ page }) => {
  await printMode(page);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.waitForTimeout(200);
  const open = await page.evaluate(() => [...document.querySelectorAll('details')].filter((d) => d.open).length);
  expect(open).toBe(0);
});

test('the page prints as black on white', async ({ page }) => {
  await printMode(page);
  const colors = await page.evaluate(() => {
    const b = getComputedStyle(document.body);
    return { bg: b.backgroundColor, fg: b.color };
  });
  expect(colors.bg).toBe('rgb(255, 255, 255)');
  expect(colors.fg).toBe('rgb(0, 0, 0)');
});
