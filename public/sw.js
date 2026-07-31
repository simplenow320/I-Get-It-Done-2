/* Service worker for I GET IT DONE web push notifications. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "I GET IT DONE", body: "You have a task reminder.", data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    // keep defaults on malformed payloads
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: payload.data || {},
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: payload.data && payload.data.type ? String(payload.data.type) : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
