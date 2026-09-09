/* ==========================================================================
   Service worker.
   
   Deliberately conservative. A service worker that caches too eagerly can
   serve a stale site to returning visitors indefinitely, and this site has
   no content hashing in its filenames to protect against that. So:
   
     - HTML, CSS and JS are network-first. The network copy always wins when
       it is reachable, so a deploy is visible on the next load. The cache is
       only ever a fallback for being offline.
     - Fonts, icons, images and the résumé are cache-first. Their contents
       change rarely and their names change when they do.
     - Only same-origin GET requests are touched. The YouTube embed, and
       anything else cross-origin, is left entirely alone.
   
   Bumping CACHE below invalidates everything from the previous version.
   ========================================================================== */

const CACHE = 'anshu-portfolio-v1';

// Enough to render the page offline. Relative so it works from a project
// subpath (anshuplayz17.github.io/Personal-Web/) as well as a custom domain.
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './offline.html',
  './manifest.webmanifest',
  './assets/fonts/inter-latin.woff2',
  './assets/fonts/jetbrains-mono-latin.woff2',
  './assets/icons/icon-192.png',
];

const CACHE_FIRST = /\.(?:woff2?|png|jpe?g|svg|webp|avif|pdf|ico)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll rejects the whole batch if any single item 404s, which would
      // leave the worker uninstalled. Failures here are not worth that.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }
  // Leave anything cross-origin completely untouched.
  if (url.origin !== self.location.origin) return;

  if (CACHE_FIRST.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return Response.error();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Only a page navigation deserves the offline page; a missing stylesheet
    // should fail as a stylesheet, not as HTML.
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./offline.html');
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

// An escape hatch: if this worker ever misbehaves, posting {type:'unregister'}
// from the page tears it down and clears everything it cached.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'unregister') {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
    );
  }
});
