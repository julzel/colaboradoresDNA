const CACHE_PREFIX = "colaboradores-dna-";
// Bump for cache-schema changes. Mutable assets revalidate independently of this version.
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const PRECACHE_URLS = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/images/dna_blue.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }))),
      )
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
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cached(request) {
  return caches
    .open(CACHE_NAME)
    .then((cache) => cache.match(request))
    .catch(() => undefined);
}

async function fetchAndCache(request, revalidate = false) {
  const response = await fetch(request, revalidate ? { cache: "no-cache" } : undefined);
  if (response.ok && !response.redirected) {
    // Storage failures must not turn a successful network request into an error.
    await caches
      .open(CACHE_NAME)
      .then((cache) => cache.put(request, response.clone()))
      .catch(() => undefined);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.waitUntil(fetchAndCache("/offline.html", true).catch(() => undefined));
    event.respondWith(
      fetch(request).catch(
        async () => (await cached("/offline.html")) ?? Response.error(),
      ),
    );
    return;
  }

  const isImmutableAsset = url.pathname.startsWith("/_next/static/");
  const isMutableAsset =
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/offline.html";

  if (!isImmutableAsset && !isMutableAsset) {
    return;
  }

  if (isMutableAsset) {
    // Serve cached artwork immediately, while checking for a newer deployment.
    const refresh = fetchAndCache(request, true);
    event.waitUntil(refresh.catch(() => undefined));
    event.respondWith(cached(request).then((response) => response ?? refresh));
  } else {
    // Next.js chunks have content hashes, so their URLs already identify a version.
    event.respondWith(
      cached(request).then((response) => response ?? fetchAndCache(request)),
    );
  }
});
