"use strict";

/* =========================================
   NEXUS AI — SERVICE WORKER
========================================= */

const VERSION = "v8";
const APP_CACHE = `nexus-ai-app-${VERSION}`;
const LIB_CACHE = "nexus-ai-lib-v1"; // pinned third-party libraries (versioned URLs never change)
const KEEP_CACHES = [APP_CACHE, LIB_CACHE];

const INDEX_URL = "./index.html";

// Files saved for offline use on install. Missing files are skipped, not fatal.
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./auth.js",
  "./manifest.json",
  "./favicon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

const SCOPE_PATH = new URL(self.registration.scope).pathname;

/* ---------- Install ---------- */

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);

      await Promise.allSettled(
        APP_FILES.map(async file => {
          // "reload" skips the browser's HTTP cache so we store fresh copies
          const response = await fetch(new Request(file, { cache: "reload" }));

          if (!response.ok) {
            throw new Error(`${file} returned ${response.status}`);
          }

          await cache.put(file, response);
        })
      );

      await self.skipWaiting();
    })()
  );
});

/* ---------- Activate ---------- */

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key.startsWith("nexus-ai-") && !KEEP_CACHES.includes(key))
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

/* ---------- Strategies ---------- */

// Your own files: always try the network first so updates appear immediately,
// and fall back to the saved copy when offline.
async function networkFirst(event, request) {
  try {
    const isNavigation = request.mode === "navigate";

    const response = await fetch(
      request,
      isNavigation ? undefined : { cache: "no-cache" }
    );

    if (response.ok) {
      const copy = response.clone();

      event.waitUntil(
        caches
          .open(APP_CACHE)
          .then(cache => cache.put(request, copy))
          .catch(() => {})
      );
    }

    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // Only page loads fall back to index.html, never scripts or images
    if (request.mode === "navigate") {
      const page = await caches.match(INDEX_URL);
      if (page) return page;
    }

    return new Response("You're offline and this file isn't saved yet.", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

// Versioned third-party files (Firebase, Lucide): once saved, they never change.
async function cacheFirst(event, request) {
  const cache = await caches.open(LIB_CACHE);
  const cached = await cache.match(request);

  if (cached) return cached;

  const response = await fetch(request);

  // Only store normal (CORS) responses. Opaque ones waste a lot of storage quota.
  if (response.ok) {
    const copy = response.clone();
    event.waitUntil(cache.put(request, copy).catch(() => {}));
  }

  return response;
}

function isCacheableLibrary(url) {
  return (
    (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) ||
    (url.hostname === "unpkg.com" && url.pathname.startsWith("/lucide@"))
  );
}

/* ---------- Fetch ---------- */

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;
  if (request.headers.has("range")) return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    // Stay inside this app's folder (matters on GitHub Pages project sites)
    if (!url.pathname.startsWith(SCOPE_PATH)) return;

    event.respondWith(networkFirst(event, request));
    return;
  }

  if (isCacheableLibrary(url)) {
    event.respondWith(cacheFirst(event, request));
  }

  // Everything else (Firebase auth API, your Cloudflare Worker, Google fonts)
  // goes straight to the network and is never cached.
});
