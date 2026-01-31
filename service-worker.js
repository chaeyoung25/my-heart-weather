const CACHE_NAME = 'heart-weather-final-v1';
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 백그라운드 푸시 알림 수신 로직
self.addEventListener('push', (event) => {
  let data = { title: '마음날씨 ☀️', body: '새로운 소식이 도착했습니다!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'icon.png',
    badge: 'icon.png',
    vibrate: [200, 100, 200],
    data: { url: '/' },
    tag: 'heart-weather-push',
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});