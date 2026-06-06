/* TurtWatch service worker — offline app-shell caching + Web Push.
   Push payloads are sent by the Supabase `send-reminders` Edge Function.
   See docs/17-push-notifications.md. */

const CACHE = "turtwatch-v1";
const APP_SHELL = ["/", "/index.html", "/turtle.svg", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()).catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // never intercept cross-origin (Supabase API/Storage, font CDNs, etc.)
  if (url.origin !== self.location.origin) return;

  // navigations: network-first so deploys propagate; fall back to the cached
  // shell when offline so the app still opens.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/index.html", copy)); return res; })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Vite-hashed assets are immutable → cache-first.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
      })),
    );
    return;
  }

  // other same-origin GETs (icons, svg): cache, fall back to network.
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "TurtWatch 🐢";
  const options = {
    body: data.body || "Time for today's turtle!",
    icon: "/turtle.svg",
    badge: "/turtle.svg",
    tag: data.tag || "turtwatch",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  const target = new URL(url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      // prefer a window already on our origin; navigate it where supported
      for (const w of wins) {
        let sameOrigin = false;
        try { sameOrigin = new URL(w.url).origin === self.location.origin; } catch (_e) { sameOrigin = false; }
        if (sameOrigin) {
          if (w.navigate) return w.navigate(target).then((c) => (c || w).focus()).catch(() => w.focus());
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
