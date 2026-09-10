/* ==========================================================================
   Anshu Arunav — Portfolio behaviour
   No dependencies. Every effect degrades cleanly and respects
   prefers-reduced-motion.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------
     Set CONTACT_EMAIL to the address you want the contact form to open
     a pre-filled email to, e.g. 'you@example.com'. While it is empty the
     form politely redirects people to LinkedIn instead of failing.
     ------------------------------------------------------------------ */
  var CONTACT_EMAIL = 'anshuarunav@gmail.com';
  var LINKEDIN_URL  = 'https://www.linkedin.com/in/anshu-arunav-ab3454425/';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };


  /* ==================================================================
     THEME
     ================================================================== */
  (function theme() {
    var btn  = $('#themeToggle');
    var root = document.documentElement;
    if (!btn) return;

    function currentIsDark() {
      var set = root.getAttribute('data-theme');
      if (set) return set === 'dark';
      return !window.matchMedia('(prefers-color-scheme: light)').matches;
    }

    function sync() {
      var dark = currentIsDark();
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      var meta = document.querySelector('meta[name="theme-color"]:not([media])');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', dark ? '#0b0a09' : '#faf7f2');
    }

    btn.addEventListener('click', function () {
      var next = currentIsDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('aa-theme', next); } catch (e) {}
      sync();
    });

    sync();
  })();


  /* ==================================================================
     NAV: elevation, scroll progress, active section
     ================================================================== */
  (function navState() {
    var nav      = $('#nav');
    var progress = $('#scrollProgress');
    var links    = $$('.nav__links a');
    var bar      = $('#navIndicator');
    var linkWrap = $('.nav__links');
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    var ticking = false;

    // The pill that slides between sections. Driven straight from the active
    // link below — deliberately not a MutationObserver, since the pill lives
    // inside the element that would be observed and would retrigger it.
    function place(el) {
      if (!bar) return;
      if (!el) { bar.classList.remove('is-on'); return; }
      bar.style.setProperty('--ix', el.offsetLeft + 'px');
      bar.style.setProperty('--iw', el.offsetWidth + 'px');
      bar.classList.add('is-on');
    }

    if (bar && linkWrap) {
      // Preview on hover, settle back to the active section on leave.
      links.forEach(function (a) {
        a.addEventListener('mouseenter', function () { place(a); });
      });
      linkWrap.addEventListener('mouseleave', function () {
        place(document.querySelector('.nav__links a.is-active'));
      });
    }

    function update() {
      var y   = window.scrollY || window.pageYOffset;
      var max = document.documentElement.scrollHeight - window.innerHeight;

      if (nav) nav.classList.toggle('is-scrolled', y > 8);
      if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

      // Active link — the last section whose top has passed the nav line.
      var line    = y + window.innerHeight * 0.32;
      var current = null;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= line) current = sections[i];
      }
      var activeLink = null;
      links.forEach(function (a) {
        var on = !!current && a.getAttribute('href') === '#' + current.id;
        a.classList.toggle('is-active', on);
        if (on) activeLink = a;
      });
      place(activeLink);

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });
    update();
  })();


  /* ==================================================================
     MOBILE MENU
     ================================================================== */
  (function mobileMenu() {
    var toggle = $('#menuToggle');
    var sheet  = $('#mobileMenu');
    if (!toggle || !sheet) return;

    var items = $$('a', sheet);
    items.forEach(function (a, i) { a.style.setProperty('--i', i); });

    var main = document.getElementById('main');

    function open() {
      sheet.hidden = false;
      // Next frame so the transition has a starting state to animate from.
      window.requestAnimationFrame(function () { sheet.classList.add('is-open'); });
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      document.body.style.overflow = 'hidden';
      // Keep Tab inside the sheet instead of wandering through the page behind it.
      if (main && 'inert' in HTMLElement.prototype) main.inert = true;
    }

    function close() {
      sheet.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      document.body.style.overflow = '';
      if (main && 'inert' in HTMLElement.prototype) main.inert = false;
      window.setTimeout(function () {
        if (!sheet.classList.contains('is-open')) sheet.hidden = true;
      }, reduceMotion.matches ? 0 : 280);
    }

    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') { close(); } else { open(); }
    });

    items.forEach(function (a) { a.addEventListener('click', close); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        close();
        toggle.focus();
      }
    });

    window.matchMedia('(min-width: 861px)').addEventListener('change', function (e) {
      if (e.matches && toggle.getAttribute('aria-expanded') === 'true') close();
    });
  })();


  /* ==================================================================
     SCROLL REVEAL
     ================================================================== */
  (function reveal() {
    var scrollDriven = document.documentElement.classList.contains('sdm');
    var targets = scrollDriven ? [] : $$('[data-reveal]');
    var lines   = $$('.display .line');
    var all     = $$('[data-reveal]').concat(lines);

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      all.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    // Stagger siblings inside a shared container for a natural wave.
    var groups = {};
    targets.forEach(function (el) {
      var key = el.parentElement ? (el.parentElement.className || 'root') : 'root';
      groups[key] = groups[key] || [];
      el.style.setProperty('--d', Math.min(groups[key].length * 70, 350) + 'ms');
      groups[key].push(el);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });

    // The headline is above the fold — play it on load, not on scroll.
    lines.forEach(function (line, i) {
      line.style.setProperty('--d', (i * 90 + 80) + 'ms');
      window.requestAnimationFrame(function () { line.classList.add('is-in'); });
    });
  })();


  /* ==================================================================
     STAT COUNT-UP
     ================================================================== */
  (function counters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      nums.forEach(function (n) { n.textContent = n.getAttribute('data-count'); });
      return;
    }

    function run(el) {
      // Years and other literal values shouldn't tick up from zero.
      if (el.getAttribute('data-plain') === 'true') {
        el.textContent = el.getAttribute('data-count');
        return;
      }
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var start  = performance.now();
      var dur    = 1100;

      (function step(now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);           // easeOutCubic
        el.textContent = String(Math.round(target * eased));
        if (p < 1) window.requestAnimationFrame(step);
      })(start);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    nums.forEach(function (n) {
      // The markup carries the real figure so it is correct with scripting
      // off, in a print taken before this runs, and to anything that reads
      // the page without executing it. Zero it only now, immediately before
      // animating up to that same figure.
      if (n.getAttribute('data-plain') !== 'true') n.textContent = '0';
      io.observe(n);
    });

    /* Printing must not catch a counter mid-tick. Snapping the values is not
       enough on its own: the observer is still armed, so a stat scrolling
       into view afterwards would restart the animation from zero and put
       that on the page. Stop the observer as well. */
    function finalize() {
      io.disconnect();
      nums.forEach(function (n) { n.textContent = n.getAttribute('data-count'); });
    }

    window.addEventListener('beforeprint', finalize);
    if (window.matchMedia) {
      var printQuery = window.matchMedia('print');
      if (printQuery.addEventListener) {
        printQuery.addEventListener('change', function (e) { if (e.matches) finalize(); });
      }
    }
  })();


  /* ==================================================================
     HERO PARALLAX (pointer only, motion-safe)
     ================================================================== */
  (function parallax() {
    var visual = $('.hero__visual');
    if (!visual || reduceMotion.matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var raf = null, tx = 0, ty = 0;

    window.addEventListener('mousemove', function (e) {
      var cx = (e.clientX / window.innerWidth) - 0.5;
      var cy = (e.clientY / window.innerHeight) - 0.5;
      tx = cx * -18;
      ty = cy * -18;
      if (!raf) {
        raf = window.requestAnimationFrame(function () {
          visual.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
          raf = null;
        });
      }
    }, { passive: true });
  })();


  /* ==================================================================
     YOUTUBE FACADE
     Loads the real iframe only on click — saves ~1MB on first paint.
     ================================================================== */
  (function videoFacade() {
    var facade = $('.video__facade');
    if (!facade) return;

    facade.addEventListener('click', function () {
      var id = facade.getAttribute('data-video');
      if (!id) return;

      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id +
                  '?autoplay=1&rel=0&modestbranding=1';
      frame.title = 'VEX Robotics reveal video';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; ' +
                    'gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      frame.setAttribute('loading', 'lazy');

      facade.replaceWith(frame);
      frame.focus();
    });
  })();


  /* ==================================================================
     CONTACT FORM
     Validates inline, then hands off to the visitor's mail client.
     ================================================================== */
  (function contactForm() {
    var form = $('#contactForm');
    if (!form) return;

    var status = $('#formStatus');
    var fields = [
      { input: $('#cf-name'),  err: $('#cf-name-err'),  test: function (v) { return v.trim().length > 0; } },
      { input: $('#cf-email'), err: $('#cf-email-err'), test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); } },
      { input: $('#cf-msg'),   err: $('#cf-msg-err'),   test: function (v) { return v.trim().length > 0; } }
    ];

    function setValid(f, ok) {
      var wrap = f.input.closest('.field');
      if (wrap) wrap.classList.toggle('is-invalid', !ok);
      if (f.err) f.err.hidden = ok;
      f.input.setAttribute('aria-invalid', String(!ok));
    }

    // Only re-validate a field once it has been marked invalid — no nagging
    // while someone is still typing their first attempt.
    fields.forEach(function (f) {
      if (!f.input) return;
      f.input.addEventListener('input', function () {
        var wrap = f.input.closest('.field');
        if (wrap && wrap.classList.contains('is-invalid')) setValid(f, f.test(f.input.value));
      });
      f.input.addEventListener('blur', function () {
        if (f.input.value.trim() !== '') setValid(f, f.test(f.input.value));
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var firstBad = null;
      fields.forEach(function (f) {
        if (!f.input) return;
        var ok = f.test(f.input.value);
        setValid(f, ok);
        if (!ok && !firstBad) firstBad = f.input;
      });

      if (firstBad) {
        status.textContent = 'Please fix the highlighted fields.';
        status.classList.remove('is-ok');
        firstBad.focus();
        return;
      }

      var name = fields[0].input.value.trim();
      var mail = fields[1].input.value.trim();
      var body = fields[2].input.value.trim();

      if (!CONTACT_EMAIL) {
        status.textContent = 'Email delivery isn’t configured yet — opening LinkedIn so you can message me directly.';
        status.classList.remove('is-ok');
        window.open(LINKEDIN_URL, '_blank', 'noopener');
        return;
      }

      var href = 'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent('Portfolio enquiry from ' + name) +
        '&body='    + encodeURIComponent(body + '\n\n— ' + name + '\n' + mail);

      window.location.href = href;
      status.textContent = 'Opening your email app with the message ready to send.';
      status.classList.add('is-ok');
    });
  })();


  /* ==================================================================
     PROJECT PHOTOS + LIGHTBOX
     Photos are optional. A card only swaps from its generated artwork
     to a photo once that photo has actually decoded, so a missing file
     degrades to the artwork rather than a broken image.
     ================================================================== */
  (function photos() {
    var shots = $$('.project__photo');

    shots.forEach(function (img) {
      function ok() {
        var media = img.closest('.project__media');
        if (media) media.classList.add('has-photo');
      }
      // A cached image can finish before this runs.
      if (img.complete && img.naturalWidth > 0) { ok(); }
      else {
        img.addEventListener('load', ok);
        img.addEventListener('error', function () { img.remove(); });
      }
    });

    var box = $('#lightbox');
    var boxImg = $('#lightboxImg');
    var boxCap = $('#lightboxCap');
    var closeBtn = box && $('.lightbox__close', box);
    if (!box || !boxImg || typeof box.showModal !== 'function') return;

    var lastFocus = null;

    function openBox(img) {
      lastFocus = document.activeElement;
      boxImg.src = img.currentSrc || img.src;
      boxImg.alt = img.alt || '';
      if (boxCap) boxCap.textContent = img.alt || '';
      box.showModal();
      if (closeBtn) closeBtn.focus();
    }

    function closeBox() {
      box.close();
    }

    shots.forEach(function (img) {
      img.addEventListener('click', function () {
        // Only zoom a photo that actually rendered.
        if (img.closest('.project__media').classList.contains('has-photo')) openBox(img);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeBox);

    // Click the backdrop (outside the image) to dismiss.
    box.addEventListener('click', function (e) {
      if (e.target === box) closeBox();
    });

    box.addEventListener('close', function () {
      boxImg.removeAttribute('src');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
  })();


  /* ==================================================================
     HERO IDLE
     Pause the hero's looping animations once it's scrolled away. Offscreen
     compositing costs battery and keeps the page from ever settling.
     ================================================================== */
  (function heroIdle() {
    var hero = $('.hero');
    if (!hero || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      document.body.classList.toggle('hero-idle', !entries[0].isIntersecting);
    }, { threshold: 0 });

    io.observe(hero);
  })();


  /* ==================================================================
     POINTER GLOW
     Feeds the cursor position to CSS as percentages. Only custom
     properties change, so this never triggers layout.
     ================================================================== */
  (function glow() {
    if (reduceMotion.matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var cards = $$('.glass-card');
    var queued = false, pending = [];

    function flush() {
      pending.forEach(function (p) {
        p.el.style.setProperty('--px', p.x + '%');
        p.el.style.setProperty('--py', p.y + '%');
      });
      pending = [];
      queued = false;
    }

    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        pending.push({
          el: card,
          x: Math.round(((e.clientX - r.left) / r.width) * 100),
          y: Math.round(((e.clientY - r.top) / r.height) * 100)
        });
        if (!queued) { queued = true; window.requestAnimationFrame(flush); }
      }, { passive: true });
    });
  })();


  /* ==================================================================
     BACK TO TOP
     ================================================================== */
  (function toTop() {
    var btn = $('#toTop');
    if (!btn) return;

    var ticking = false;
    function check() {
      ticking = false;
      var show = window.scrollY > window.innerHeight * 1.2;
      // Never take this button away while it holds focus. Hiding it starts an
      // opacity transition, and a running transition's value outranks every
      // declaration in the cascade — inline styles and !important included — so
      // the button computes to opacity 0 while all three of its rules say 1.
      // Measured: mid-transition, `opacity: 1 !important` inline still computes
      // to 0.006. Declaring harder cannot win this; not starting the transition
      // can. Leaving a focused control where the user put it is also just right.
      if (!show && document.activeElement === btn) return;
      btn.classList.toggle('is-shown', show);
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(check); }
    }, { passive: true });

    // Keep the button visible for as long as it holds focus. Two things make
    // this necessary rather than decorative: `visibility` is transitioned with
    // a delay so the button stays focusable for the length of its own fade-out,
    // and a Tab can scroll the page, so the scroll handler can decide to hide
    // the button in the same frame focus arrives on it. The CSS :focus rule
    // covers that in a focused window; this covers it everywhere, because the
    // event fires even where :focus does not match.
    // The class alone was not enough: WebKit CI reported this button as
    // `to-top is-shown is-focus` and still computed opacity ~0, so the class was
    // applied and its rule was not winning. Rather than guess which rule lost,
    // set the properties inline — an inline declaration does not depend on the
    // cascade at all. The class stays because the CSS rule is what covers the
    // no-JS case, and because it makes the state visible in a DOM dump.
    var FOCUS_LOCK = { opacity: '1', visibility: 'visible', transform: 'none', transition: 'none' };
    btn.addEventListener('focus', function () {
      btn.classList.add('is-focus');
      for (var k in FOCUS_LOCK) btn.style[k] = FOCUS_LOCK[k];
    });
    btn.addEventListener('blur', function () {
      btn.classList.remove('is-focus');
      for (var k in FOCUS_LOCK) btn.style[k] = '';
      check();   // it may have been held open only because it had focus
    });

    btn.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion.matches ? 'auto' : 'smooth'
      });
      // Send focus somewhere sensible rather than leaving it on a button
      // that has just faded out.
      var logo = $('.nav__logo');
      if (logo) logo.focus();
    });

    check();
  })();


  /* ==================================================================
     PRINTING

     A closed <details> keeps its contents out of the print job, and CSS
     alone cannot reliably open one. Open them all before printing and put
     them back afterwards so the screen is unchanged.
     ================================================================== */
  (function printing() {
    var reopened = [];
    var expanded = false;

    function expand() {
      // Both `beforeprint` and the print media query fire for one print job.
      // Without this guard the second call recorded an empty list, and the
      // disclosures stayed open on screen after printing.
      if (expanded) return;
      expanded = true;

      reopened = $$('details:not([open])');
      reopened.forEach(function (d) { d.open = true; });
    }

    function restore() {
      if (!expanded) return;
      expanded = false;
      reopened.forEach(function (d) { d.open = false; });
      reopened = [];
    }

    window.addEventListener('beforeprint', expand);
    window.addEventListener('afterprint', restore);

    // Safari has historically fired neither event; the media query listener
    // covers it.
    if (window.matchMedia) {
      var mq = window.matchMedia('print');
      if (mq.addEventListener) {
        mq.addEventListener('change', function (e) { (e.matches ? expand : restore)(); });
      }
    }
  })();


  /* ==================================================================
     OFFLINE SUPPORT

     Registered after load so it never competes with the first paint.
     Failure is silent and harmless: without a worker the site simply
     behaves as it always has.
     ================================================================== */
  (function offline() {
    if (!('serviceWorker' in navigator)) return;
    // Service workers need a secure context; file:// and plain http won't do.
    if (!window.isSecureContext) return;

    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        /* no offline support this visit; nothing else changes */
      });
    });
  })();


  /* ==================================================================
     MISC
     ================================================================== */
  (function misc() {
    var year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  })();

})();
