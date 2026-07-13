// LAYR Service Worker — Push Notifications
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("push", (e) => {
  if (!e.data) return;

  const data = e.data.json();
  const { title, body, icon, url, type } = data;

  const notifIcon = icon || "/logo.svg";
  const badge = "/favicon.svg";

  e.waitUntil(
    self.registration.showNotification(title || "LAYR", {
      body: body || "",
      icon: notifIcon,
      badge,
      tag: type || "layr-notif",
      data: { url: url || "/" },
      vibrate: [100, 50, 100],
      actions: [
        { action: "open", title: "Görüntüle" },
        { action: "dismiss", title: "Kapat" },
      ],
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  if (e.action === "dismiss") return;

  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        return clients.openWindow(url);
      }),
  );
});
