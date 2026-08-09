const CACHE = "snpplanner-v5-14";

const FILES = [
    "./styles.css",
    "./manifest.json"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(FILES))
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const request = event.request;
    const url = new URL(request.url);

    // Always fetch the app shell and JavaScript from the network first so a
    // second browser/device cannot keep running an older SNP Planner build.
    if (
        request.mode === "navigate" ||
        url.pathname.endsWith(".html") ||
        url.pathname.endsWith(".js")
    ) {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(response => response || fetch(request))
    );
});
