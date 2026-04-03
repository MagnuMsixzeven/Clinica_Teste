/* Service Worker – OdontoAgenda Push Notifications */

self.addEventListener('install', function(e) {
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(clients.claim());
});

self.addEventListener('push', function(e) {
    let data = {title: 'OdontoAgenda', body: 'Nova notificação', icon: '/static/img/icon-192.png'};
    try {
        data = e.data.json();
    } catch (_) {
        data.body = e.data ? e.data.text() : data.body;
    }
    e.waitUntil(
        self.registration.showNotification(data.title || 'OdontoAgenda', {
            body: data.body || '',
            icon: data.icon || '/static/img/icon-192.png',
            badge: '/static/img/icon-192.png',
            tag: data.tag || 'odonto-notif',
            data: data.url || '/',
        })
    );
});

self.addEventListener('notificationclick', function(e) {
    e.notification.close();
    const url = e.notification.data || '/profissional';
    e.waitUntil(
        clients.matchAll({type: 'window', includeUncontrolled: true}).then(function(clientList) {
            for (const client of clientList) {
                if (client.url.includes('/profissional') && 'focus' in client) return client.focus();
            }
            return clients.openWindow(url);
        })
    );
});
