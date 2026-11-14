// WII – skupni service worker za vse aplikacije (omogoča namestitev kot aplikacijo in hitrejši zagon)
// Vsaka aplikacija ima v svojem manifestu svoj "scope" (npr. ./posta.html), zato se nameščene
// aplikacije med seboj ne prekrivajo, čeprav so na isti domeni.
const CACHE = 'wii-pos-v8';
const APPS = ['posta', 'oddaja', 'blagajna', 'terminal', 'mail', 'urnik', 'fon', 'alarm'];
const PAGES = ['./posta.html', './oddaja.html', './blagajna.html', './terminal.html', './wii-mail.html', './urnik.html', './fon.html', './alarm.html'];
const SHELL = PAGES.concat(
  APPS.map(a => './manifest-' + a + '.webmanifest'),
  ...APPS.map(a => ['./icon-' + a + '-180.png', './icon-' + a + '-192.png', './icon-' + a + '-512.png'])
);

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
  if (url.pathname.endsWith('.webmanifest')) { // manifest vedno najprej z omrežja, da spremembe (scope, ikone) takoj veljajo
    e.respondWith(fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
      .catch(() => caches.match(req)));
    return;
  }
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html');
  if (isPage) { // najprej omrežje (vedno nova verzija), sicer predpomnilnik – vedno ISTA stran, nikoli druga aplikacija
    e.respondWith(fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || new Response(
        '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WII</title>' +
        '<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#eef2f7;color:#1f2937;text-align:center">' +
        '<div><h2>Ni povezave</h2><p>Preveri internetno povezavo in poskusi znova.</p></div>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  })));
});

// klik na obvestilo o dohodnem klicu (WIIfon) odpre aplikacijo
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.includes('fon.html'));
    return c ? c.focus() : self.clients.openWindow('./fon.html');
  }));
});
