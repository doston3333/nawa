const CACHE_NAME = "nawa-shell-v2";
const SHELL_ASSETS = [
  "/",
  "/profiles",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const isSameOrigin = (url) => url.origin === self.location.origin;
const isApiRequest = (url) => url.pathname.startsWith("/api/");
const isCacheableResponse = (response) => response.status === 200 && !response.redirected;
const isPublicStaticAsset = (request, url) =>
  SHELL_ASSETS.includes(url.pathname) ||
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname.startsWith("/fonts/") ||
  (request.destination === "script" && url.pathname.startsWith("/_next/")) ||
  (request.destination === "style" && url.pathname.startsWith("/_next/")) ||
  (request.destination === "font" && url.pathname.startsWith("/_next/"));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Only public shell/static resources belong in Cache Storage. Profile data is
      // cookie-dependent and is persisted by the profile-scoped IndexedDB layer.
      for (const asset of SHELL_ASSETS) {
        const response = await fetch(asset, { credentials: "same-origin" });
        // A redirect can be a profile picker/login response. Never cache it under
        // the requested public URL, and let network failures fail installation so
        // the browser can retry rather than activating an empty shell.
        if (isCacheableResponse(response)) {
          await cache.put(asset, response.clone());
        }
      }
    })
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
  if (isCacheableResponse(response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
};

const networkOnly = async (request) => {
  try {
    return await fetch(request);
  } catch {
    // Profile APIs are deliberately not read from Cache Storage. The UI reads
    // previously loaded profile data from profile-scoped IndexedDB instead.
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Mutation requests always go directly to the app's outbox/sync client.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (isApiRequest(url)) {
    event.respondWith(networkOnly(request));
    return;
  }

  if (isPublicStaticAsset(request, url)) {
    event.respondWith(cacheFirst(request));
  }
});
