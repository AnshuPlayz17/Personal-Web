# Anshu Arunav — Portfolio

Personal site for Anshu Arunav: student engineer at University of Toronto Schools
working in robotics, embedded systems and automation.

**Live sections:** hero · about · capabilities · selected work · experience ·
reel · recognition · writing · contact

## Stack

Plain HTML, CSS and JavaScript. No build step, no framework, no runtime
dependencies — open `index.html` and it works.

```
index.html   markup and content
style.css    design tokens + all styling
script.js    theme, navigation, reveals, counters, contact form
```

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
- **Performance.** The YouTube embed is a click-to-load facade, so the first
  paint doesn't pull in the player.

## Configuration

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

Settings → Pages → Source: `main` (or this branch), folder `/root`.

## Links

- [LinkedIn](https://www.linkedin.com/in/anshu-arunav-ab3454425/)
- [GitHub](https://github.com/AnshuPlayz17)
- [Instagram](https://www.instagram.com/aanshu_arunavv/)
