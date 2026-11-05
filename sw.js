/* Offline support: always try the network first, fall back to the cache. */
var CACHE = 'nba-eras-v409';
var SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'engine.js',
  'rules.js', 'season.js',
  'events.js',
  'league.js',
  'coaches.js',
  'history.js', 'realdata.js', 'data/real-records.json',
  'phone.js',
  'modern.css',
  'fonts.css',
  'manifest.webmanifest',
  'data/teams-1946.json',
  'data/players-1946.json',
  'data/draft-1947.json',
  'data/draft-2027.json',
  'data/teams-2026.json',
  'data/players-2026.json',
  'data/coaches-2026.json',
  'data/gms-2026.json','data/gms-2025.json','data/schedule-2025.json','data/coaches-2025.json','data/players-2025-open.json','data/draft-2026.json','data/teams-2025.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

/* Network first, so a new build reaches the phone on the next open; the cache is only the offline fallback. */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' }).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); });
    })
  );
});
