const CACHE_NAME = "nawa-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/learn",
  "/study",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const isSameOrigin = (url) => url.origin === self.location.origin;
const isApiRequest = (url) => url.pathname.startsWith("/api/");
const isShellAsset = (request, url) =>
  SHELL_ASSETS.includes(url.pathname) ||
  request.destination === "script" ||
  request.destination === "style" ||
  request.destination === "font" ||
  request.destination === "image";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.all(SHELL_ASSETS.map((asset) => cache.add(asset).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("nawa-shell-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
};

const networkFirst = async (request) => {
  try {
    const response = await fetch(request);
    // API responses are profile-scoped. Do not persist them in a shared cache: the
    // shell remains offline-capable while profile data stays behind the sync layer.
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response("Offline", { status: 503, statusText: "Offline" });
  }
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Mutation requests always go directly to the app's outbox/sync client.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isShellAsset(request, url)) {
    event.respondWith(cacheFirst(request));
  }
});
