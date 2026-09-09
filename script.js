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
  var CONTACT_EMAIL = '';
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
      meta.setAttribute('content', dark ? '#000000' : '#fbfbfd');
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
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    var ticking = false;

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
      links.forEach(function (a) {
        a.classList.toggle(
          'is-active',
          !!current && a.getAttribute('href') === '#' + current.id
        );
      });

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
    var targets = $$('[data-reveal]');
    var lines   = $$('.display .line');
    var all     = targets.concat(lines);

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

    nums.forEach(function (n) { io.observe(n); });
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
     MISC
     ================================================================== */
  (function misc() {
    var year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  })();

})();
