// WII POS – service worker (omogoča namestitev kot aplikacijo in hitrejši zagon)
const CACHE = 'wii-pos-v3';
const SHELL = ['./blagajna.html', './terminal.html', './wii-mail.html', './manifest-mail.webmanifest', './icon-mail-192.png', './icon-mail-512.png', './icon-mail-180.png', './manifest-blagajna.webmanifest', './manifest-terminal.webmanifest',
  './icon-blagajna-192.png', './icon-blagajna-512.png', './icon-blagajna-180.png',
  './icon-terminal-192.png', './icon-terminal-512.png', './icon-terminal-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('firebaseio.com') || url.hostname.endsWith('firebasedatabase.app')) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html');
  if (isPage) { // najprej omrežje (vedno nova verzija), sicer predpomnilnik
    e.respondWith(fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./blagajna.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  })));
});
