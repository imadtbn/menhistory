const CACHE_NAME = "mth-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./figures/index.html",
  "./categories/index.html",
  "./regions/index.html",
  "./eras/index.html",
  "./pages/about.html",
  "./pages/methodology.html",
  "./pages/sources.html",
  "./pages/privacy.html",
  "./assets/css/main.css",
  "./assets/css/components.css",
  "./assets/css/responsive.css",
  "./assets/js/app.js",
  "./assets/js/app-helpers.js",
  "./assets/js/search.js",
  "./assets/js/filters.js",
  "./assets/js/figures.js",
  "./assets/js/pages.js",
  "./assets/js/utils.js",
  "./data/categories.json",
  "./data/regions.json",
  "./data/eras.json",
  "./data/featured.json",
  "./data/figures/index.json",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        STATIC_ASSETS.map((url) => cache.add(url).catch(() => null))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // الشبكة أولاً لملفات JSON (لأنها قد تتغير)
  if (request.url.includes("/data/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache first للأصول الثابتة
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached || Response.error());
    })
  );
});