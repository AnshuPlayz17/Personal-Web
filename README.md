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
- **Performance.** Fonts are self-hosted variable woff2 files, so there is no
  third-party request on the critical path; the `latin-ext` subsets only
  download if a page ever uses those characters. The YouTube embed is a
  click-to-load facade. Hero animations settle rather than looping forever,
  and pause entirely once the hero scrolls out of view.

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

## Links

- [LinkedIn](https://www.linkedin.com/in/anshu-arunav-ab3454425/)
- [GitHub](https://github.com/AnshuPlayz17)
- [Instagram](https://www.instagram.com/aanshu_arunavv/)
