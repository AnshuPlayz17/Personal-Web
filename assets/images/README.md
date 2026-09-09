# Images

Drop a photo in here, then paste four lines into `index.html` to show it.

It's two steps rather than one on purpose: the page ships with no reference to
these files, so visitors never trigger a 404 for a photo that isn't there yet.
The styling, lazy-loading and click-to-zoom are already built and waiting.

| Filename | Where it shows | What to shoot |
|---|---|---|
| `neopark.jpg` | NeoPark project card | The build itself — Arduino, RFID reader, gate arm, LCD. Wiring visible is better than tidy. |
| `vex-19109m.jpg` | VEX project card | The robot on the field, ideally mid-match or at competition. |

## The snippet

In `index.html`, find the `<!-- Photo slot -->` comment inside the project you
want, and replace that comment with:

```html
<img class="project__photo" src="assets/images/neopark.jpg"
     alt="The NeoPark prototype: Arduino, RFID reader, servo-driven gate arm and LCD."
     loading="lazy" decoding="async" width="1200" height="900" data-zoom>
```

Change the `src` and `alt` for the other project. That's it — the photo fades in
over the placeholder artwork and becomes click-to-zoom. If the file is ever
missing or misspelled, the artwork simply stays and nothing breaks.

## Guidance

- **Landscape, roughly 4:3.** They're rendered into a 4:3-ish frame with
  `object-fit: cover`, so the subject should sit near the centre.
- **About 1600px wide** is plenty. Bigger just costs load time.
- **Compress before committing.** Aim under ~300 KB each. [Squoosh](https://squoosh.app)
  is free and runs in the browser.
- **JPG for photos.** Use PNG only for screenshots or diagrams.

## Alt text

Each photo already has alt text written in `index.html`. If what you shoot
differs from what's described there, update the `alt` attribute to match —
it's what screen readers and search engines read.

## Adding more

Any `<img class="project__photo" ... data-zoom>` inside a `.project__media`
picks up the same behaviour. `data-zoom` is what opens it in the lightbox.
