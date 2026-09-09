# Content to add

The site is built and deployed. What's left is content only you have. Roughly
in order of how much each one is worth.

## 1. Contact email

In `script.js`, near the top:

```js
var CONTACT_EMAIL = '';   // ← your address
```

Until it's set, the contact form validates normally and then sends people to
LinkedIn. Worth deciding deliberately: putting an address on a public page
means scrapers will find it. Using LinkedIn only is a legitimate choice.

## 2. Depth in the project write-ups

The site carries all five projects from your résumé — VEX 19109M, Calenda,
SkySaver, Tappy and NeoPark — each with a **How it works** breakdown. Those are
accurate but general. What would make them genuinely good is the part only you
can write:

- What was the hardest problem, and what did the first attempt get wrong?
- What did you measure or test to know it was fixed?
- What would you do differently with another month?

Two or three sentences per project. Add them inside the `.detail__note`
paragraph in `index.html`. Specific beats polished — "the servo browned out the
Arduino until I moved it to its own supply" is worth more than any adjective.

SkySaver and Tappy need this most: they're the newest and the least documented,
and right now the site can only describe what they do, not what was hard about
them.

## 3. Résumé — done

`assets/anshu-arunav-resume.pdf` is live, regenerated from your fourth draft,
and linked from three places: the hero button, the contact list and the footer.

It was typeset from your Word document rather than converted from it, because
the converter available here couldn't open any file at all. The wording is
yours, unchanged; only the layout is new, so it matches the site.

Two things were left out of the public PDF deliberately: your **phone number**
and the **"AGE 13"** line. Both were in the original. A phone number published
on a public site and committed to public git history is permanently scrapable
and effectively impossible to take back, which is a different risk from an
email address. Your email, city and school are all still there.

To update it later, replace the PDF at that path — nothing else needs to change.
To include the phone number after all, say so and it can be regenerated.

## 4. Photos — optional, and the page doesn't wait for them

Every project card draws its own artwork in CSS — a different composition per
project, not the same placeholder five times — so the page is finished as it
stands and nothing on it reads as a missing image.

If you ever do get a photo of the robot or the NeoPark build, dropping one in
is still a two-minute job: `assets/images/README.md` has the snippet. Until
then this is not outstanding work, and the rest of this list matters more.

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


## If the site ever looks out of date after you deploy

A service worker caches the site so it works offline. HTML, CSS and JS are
network-first, so a deploy should be visible on the next load — but if
something ever looks stale, paste this into the browser console on the site
and reload:

```js
navigator.serviceWorker.controller?.postMessage({ type: 'unregister' });
```

That removes the worker and everything it cached. The site keeps working; it
just loses offline support until your next visit re-registers it.
