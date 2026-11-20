// THALIE Studio : service worker (ouverture hors connexion)
const CACHE = 'thalie-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // jamais en cache : données et connexion Firebase
  if (/firestore\.googleapis\.com|identitytoolkit|securetoken|firebaseinstallations|googleapis\.com\/v1/.test(url.href)) return;
  const sameOrigin = url.origin === self.location.origin;
  if (req.mode === 'navigate' || (sameOrigin && url.pathname.endsWith('.html'))) {
    // page : réseau d'abord (toujours la dernière version), cache en secours
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)); return r; })
      .catch(() => caches.match('./index.html').then((m) => m || caches.match('./'))));
    return;
  }
  // le reste (React, polices, Firebase SDK…) : cache d'abord, mise à jour en arrière-plan
  e.respondWith(caches.match(req).then((m) => {
    const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; }).catch(() => m);
    return m || net;
  }));
});
