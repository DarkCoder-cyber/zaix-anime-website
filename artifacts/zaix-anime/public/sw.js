const CACHE_VERSION = "v2";
const STATIC_CACHE = `zaix-static-${CACHE_VERSION}`;
const API_CACHE = `zaix-api-${CACHE_VERSION}`;

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // API calls → network first, then cache (short TTL)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // Navigation requests (HTML pages) → network first, fall back to cached "/"
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Static assets → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

async function navigationHandler(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Offline: return cached index.html for SPA routing
    const cached = await cache.match(request);
    if (cached) return cached;
    const root = await cache.match("/");
    if (root) return root;
    return new Response("<h1>Offline</h1><p>Please check your connection.</p>", {
      status: 503,
      headers: { "Content-Type": "text/html" },
    });
  }
}

async function networkFirstAPI(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request.clone())
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached ?? fetchPromise;
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title ?? "Zaix Anime", {
    body: data.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    vibrate: [200, 100, 200],
    data: { url: data.url ?? "/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => "focus" in c);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return clients.openWindow(target);
    })
  );
});
