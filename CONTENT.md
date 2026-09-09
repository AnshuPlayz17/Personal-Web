# Content to add

The site is built and deployed. What's left is content only you have. Roughly
in order of how much each one is worth.

## 1. Photos — the biggest single improvement

A robotics portfolio with no photos of any robot is asking people to take your
word for it. Two photos change the whole page:

- `assets/images/neopark.jpg`
- `assets/images/vex-19109m.jpg`

Add the file, then paste the four-line snippet from `assets/images/README.md`
into the matching `<!-- Photo slot -->` comment in `index.html`. The styling,
lazy-loading and click-to-zoom are already built.

## 2. Résumé

Save a PDF to `assets/anshu-arunav-resume.pdf`, then in `index.html` find the
`Résumé` button and delete the word `hidden` from its tag. It ships hidden so
the site never offers a download that isn't there.

## 3. Contact email

In `script.js`, near the top:

```js
var CONTACT_EMAIL = '';   // ← your address
```

Until it's set, the contact form validates normally and then sends people to
LinkedIn. Worth deciding deliberately: putting an address on a public page
means scrapers will find it. Using LinkedIn only is a legitimate choice.

## 4. Depth in the project write-ups

Each project has a **How it works** section that's accurate but general. What
would make it genuinely good is the part only you can write:

- What was the hardest problem, and what did the first attempt get wrong?
- What did you measure or test to know it was fixed?
- What would you do differently with another month?

Two or three sentences per project. Add them inside the `.detail__note`
paragraph in `index.html`. Specific beats polished — "the servo browned out the
Arduino until I moved it to its own supply" is worth more than any adjective.

## 5. Writing — optional

The placeholder Writing section was removed; it advertised three posts that
didn't exist, which reads worse than having no section at all. If you want it
back, write one real post first — the NeoPark build log is the obvious one —
and it can be reinstated around actual content.

## 6. Custom domain — the only thing that costs money

Everything above is free. A domain (`anshuarunav.com`, roughly $10–15/year) is
the one paid item, and it's genuinely optional — `anshuplayz17.github.io` works
fine and costs nothing.

If you ever do buy one: add a file named `CNAME` at the repo root containing
just the domain, point an `ALIAS`/`ANAME` record at `anshuplayz17.github.io`,
then enable **Enforce HTTPS** in Settings → Pages. GitHub issues the
certificate free.
