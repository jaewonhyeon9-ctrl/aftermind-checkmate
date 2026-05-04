// 체크메이트 — 서비스 워커 v2 (Web Push 지원)
const VERSION = "v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", () => {
  // 네트워크 우선, SW 가로채지 않음
});

// 푸시 메시지 수신
self.addEventListener("push", (event) => {
  let data = { title: "체크메이트", body: "" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }
  const title = data.title || "체크메이트";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "default",
    data: { url: data.url || "/today" },
    requireInteraction: false,
    vibrate: [120, 60, 120],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 — 앱으로 이동
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/today";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.navigate?.(url);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
