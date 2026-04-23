self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("osbic-client-cache").then((cache) => {
      return cache.addAll(["/portal"]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
