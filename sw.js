// PWA with careful caching: index, manifest, icons are cached; app.js is network-first (cached as fallback).
const CACHE = 'lagree-pages-min-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon-180.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    // app.js is network-first so iterations appear quickly
    if (url.pathname.endsWith('/app.js')) {
      e.respondWith(
        fetch(e.request).then(resp => {
          // cache latest as fallback
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        }).catch(() => caches.match(e.request))
      );
      return;
    }
    // everything else: cache-first, then network
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => cached))
    );
  }
});
