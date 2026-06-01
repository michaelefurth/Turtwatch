/* TurtWatch service worker — receives Web Push and shows notifications
   (reminders & good mornings). Push payloads are sent by the Supabase
   `send-reminders` Edge Function. See docs/17-push-notifications.md. */

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
