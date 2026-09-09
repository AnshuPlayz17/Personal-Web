# Anshu Arunav — Portfolio

Personal site for Anshu Arunav: student engineer at University of Toronto Schools
working in robotics, embedded systems and automation.

**Sections:** hero · about · capabilities · selected work · experience ·
reel · recognition · contact

## Stack

Plain HTML, CSS and JavaScript. No build step, no framework, no runtime
dependencies — open `index.html` and it works.

```
index.html          markup and content
style.css           design tokens + all styling
script.js           theme, nav, reveals, counters, lightbox, contact form
assets/fonts/       self-hosted Inter + JetBrains Mono (variable, woff2)
assets/images/      project photos — see the README in that folder
assets/og-image.png 1200x630 social share card
assets/anshu-arunav-resume.pdf  linked from the hero
```

## Lighthouse

Measured locally against this repo, mobile emulation:

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| **Score** | 99 | 100 | 100 | 100 |

Six requests, zero third-party on first load, CLS 0, TBT 0ms.

## Design notes

- **Material layering.** Translucent glass is reserved for the functional
  layer — the nav bar, the mobile menu sheet, the floating status chip and the
  video control. Content cards sit on an opaque elevated surface. This follows
  Apple's guidance that glass belongs above content, not inside it, and keeps
  the page from stacking twenty `backdrop-filter` layers.
- **Theme.** Dark by default, full light theme, and a toggle that persists to
  `localStorage`. The system preference wins until the visitor chooses.
- **Motion.** Scroll reveals, a headline mask-reveal, stat count-ups and a
  pointer parallax — all of it disabled under `prefers-reduced-motion`, which
  renders every section in its final readable state.
- **No-JS.** Content is visible by default; the reveal styles only apply once
  JavaScript has confirmed it can animate them. Nothing disappears if a script
  fails to load.
- **Print.** Printed, the page reads as a document: no interface, black on
  white, decoration stripped, blocks kept whole across page breaks, and every
  external link's destination spelled out since a reader on paper cannot
  click it. Disclosures are opened and the stat counters snapped to their
  final values before printing.
- **Offline.** A service worker caches the site so it opens without a
  connection, and the page is installable from the manifest. It is
  deliberately conservative: HTML, CSS and JS are network-first, so a deploy
  is live on the next load and the cache is only ever an offline fallback.
  Only fonts, icons, images and the résumé are cache-first. Cross-origin
  requests are never touched. `sw.js` also accepts an `unregister` message as
  an escape hatch if it ever misbehaves.
- **Performance.** Fonts are self-hosted variable woff2 files, so there is no
  third-party request on the critical path; the `latin-ext` subsets only
  download if a page ever uses those characters. The YouTube embed is a
  click-to-load facade. Hero animations settle rather than looping forever,
  and pause entirely once the hero scrolls out of view.

## Tests

The site itself stays dependency-free — everything in `package.json` is test
tooling and never ships to a visitor.

```bash
npm install
npm test              # everything, Chromium
npm run test:a11y     # accessibility only
npm run test:visual   # visual regression only
npm run report        # open the last HTML report
```

| Suite | What it covers | Engines |
|---|---|---|
| `tests/functional.spec.js` | theme, menu, form, nav, video facade, résumé, no-JS, reduced motion, overflow at 7 widths | Chromium, Firefox, WebKit |
| `tests/a11y.spec.js` | axe-core WCAG 2.2 AA in both themes, keyboard traversal, focus visibility, forced colours, 400% reflow | Chromium, Firefox, WebKit |
| `tests/visual.spec.js` | 12 sections × 2 themes at desktop, 12 at mobile, plus 3 interaction states | Chromium only |
| `tests/pwa.spec.js` | manifest validity, every declared icon really exists, worker registers and takes control, cross-origin left alone, unregister escape hatch | Chromium, Firefox, WebKit |
| `tests/offline.spec.js` | renders with the server actually killed, offline fallback page, and a redeploy never served stale | Chromium, Firefox, WebKit |
| `tests/print.spec.js` | nothing transparent, chrome hidden, link URLs shown, counters final, disclosures opened and restored | Chromium, Firefox, WebKit |

The offline suite starts and kills its own server rather than using
Playwright's `setOffline`, which does not apply to service-worker requests —
verified directly: with the context offline, a navigation still returned the
server's real 404, so any "works offline" test built on it would pass whether
or not offline support existed.

Visual baselines are Chromium-only on purpose: Firefox and WebKit binaries
cannot be downloaded in the environment these were authored in, so their
baselines could not be generated or trusted there. CI installs all three and
runs behaviour and accessibility on each, so cross-engine breakage still
surfaces on every pull request.

Baselines are section-level rather than whole-page. Full-page images came to
roughly 8 MB and, when one changed, only told you that something somewhere
had moved. Section shots are a fraction of the weight and point straight at
what broke; page-level layout is covered by the overflow assertions instead.

After an intentional visual change:

```bash
npm run test:update-snapshots
```

## Adding content

See **[CONTENT.md](CONTENT.md)** for what's left to add — photos, a résumé, the
contact address — and exactly where each one goes. The site works without any
of it; nothing is a broken link or an empty frame while it's missing.

The contact form composes a message in the visitor's mail client. Set the
destination at the top of `script.js`:

```js
var CONTACT_EMAIL = 'you@example.com';
```

While it's empty the form validates as normal and then points people to
LinkedIn instead.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploying to GitHub Pages

Settings → Pages → Source: `main`, folder `/root`. No build step.

A GitHub Action (`.github/workflows/lighthouse.yml`) runs Lighthouse against
every pull request with a performance budget, so regressions surface before
they land.

The budget's byte limits are **uncompressed**, because the server CI runs the
audit against does not gzip. GitHub Pages does, so real transfer is far
smaller — `style.css` is 62 KB on disk and 14 KB over the wire. The limits are
set with that ratio in mind: they exist to catch runaway growth, not to
approximate what a visitor actually downloads.

## Links

- [LinkedIn](https://www.linkedin.com/in/anshu-arunav-ab3454425/)
- [GitHub](https://github.com/AnshuPlayz17)
- [Instagram](https://www.instagram.com/aanshu_arunavv/)
