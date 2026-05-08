// 체크메이트 — 서비스 워커 v3 (앱 아이콘 배지 지원)
const VERSION = "v3";

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

  // 앱 아이콘 배지 카운트 (위젯 흉내내기 C). payload에 badge 숫자가 있으면 갱신.
  // navigator.setAppBadge: iOS 16.4+, Android Chrome 등 지원. 미지원 환경은 자동 무시.
  const tasks = [self.registration.showNotification(title, options)];
  if (typeof data.badge === "number" && "setAppBadge" in self.navigator) {
    if (data.badge > 0) {
      tasks.push(self.navigator.setAppBadge(data.badge).catch(() => {}));
    } else {
      tasks.push(self.navigator.clearAppBadge().catch(() => {}));
    }
  }
  event.waitUntil(Promise.all(tasks));
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
