// Minimal offline app-shell cache. TaxiLab is a data-driven app behind
// auth, so this intentionally does NOT cache API responses or data pages --
// only the static shell (icons, manifest) so the PWA installs cleanly and
// shows something other than a browser error if launched with no network.
const CACHE_NAME = "taxilab-shell-v1";
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isShellAsset = SHELL_ASSETS.includes(url.pathname);
  if (!isShellAsset) return; // let everything else (pages, API) hit the network normally

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
  );
});
