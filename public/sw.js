/* sw.js - lets ShopNest work as an installed app, also with no internet.
   Pages, CSS and JS: try the internet first (so updates show up), use the saved copy when offline.
   Photos and icons: use the saved copy first (they rarely change).
   Change VERSION when you change this file, so old saved copies are thrown away. */
const VERSION = "shopnest-v18";
const SHELL = [
  "./", "index.html", "privacy.html", "manifest.webmanifest", "css/style.css",
  "js/core/removed.js", "js/core/i18n.js", "js/i18n/ne.js", "js/i18n/hi.js", "js/i18n/ja.js", "js/core/data.js", "js/core/auth.js", "js/core/art.js", "js/core/core.js",
  "js/pages/home.js", "js/pages/product.js", "js/pages/cart.js", "js/pages/checkout.js",
  "js/pages/sell.js", "js/pages/account.js", "js/main.js",
  "img/app/icon-192.png", "img/app/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // Google sign-in, fonts: leave to the browser
  if (url.pathname.includes("/api/")) return; // the shop server's answers must always be fresh, never saved
  const isMedia = /\.(png|jpe?g|svg|webp|ico)$/i.test(url.pathname);
  e.respondWith(isMedia ? cacheFirst(req) : networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    // "no-cache": always ask the server (a quick check when nothing changed), never the browser's
    // own saved copy, so the reload button and F5 always show the newest pages, CSS and JS
    const res = await fetch(req, { cache: "no-cache" });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // ignoreSearch: style.css?v=3 is served from the saved style.css
    return (await cache.match(req, { ignoreSearch: true }))
      || (req.mode === "navigate" && await cache.match("index.html"))
      || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}
