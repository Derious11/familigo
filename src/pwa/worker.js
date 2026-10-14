import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Build-time constants contain only public Firebase configuration and static asset URLs.
const CACHE = `familigo-shell-${__PWA_VERSION__}`;
const ASSETS = __PWA_ASSETS__;
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).catch(async error => {
        await caches.delete(CACHE);
        throw error;
    }));
});
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        // Keep the previous release's files while an existing tab still uses them.
        const keys = (await caches.keys()).filter(key => key.startsWith('familigo-shell-'));
        const obsolete = keys.filter(key => key !== CACHE).slice(0, -1);
        await Promise.all(obsolete.map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
    if (event.request.mode === 'navigate') {
        // Pin HTML and its hashed assets to one release; never cache user responses.
        event.respondWith(caches.open(CACHE).then(cache => cache.match('/index.html')).then(shell => shell || fetch(event.request)));
    } else if (ASSETS.includes(url.pathname)) {
        event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(asset => asset || fetch(event.request)));
    } else if (/^\/assets\/.*\.(js|css)$/.test(url.pathname)) {
        // Existing tabs may request a lazy chunk from the previous release.
        event.respondWith(caches.match(url.pathname).then(asset => asset || fetch(event.request)));
    }
});

// Register before Firebase's click handler so all notification types share safe routing.
self.addEventListener('notificationclick', event => {
    event.stopImmediatePropagation();
    event.notification.close();
    const data = event.notification.data || {};
    const target = new URL(data.url || data.FCM_MSG?.fcmOptions?.link || data.FCM_MSG?.notification?.click_action || '/app', self.location.origin);
    const safeURL = target.origin === self.location.origin && /^\/app(?:\/|$)/.test(target.pathname) ? target.href : `${self.location.origin}/app`;
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const existing = windows.find(client => {
            const url = new URL(client.url);
            return url.origin === self.location.origin && /^\/app\/?$/.test(url.pathname);
        });
        if (existing) {
            // Preserve open drafts: deliver a route request instead of forcing a reload.
            await existing.focus();
            existing.postMessage({ type: 'NOTIFICATION_OPEN', url: safeURL });
        } else await self.clients.openWindow(safeURL);
    })());
});
if ('PushManager' in self && 'Notification' in self) {
const messaging = getMessaging(initializeApp(__FIREBASE_CONFIG__));
onBackgroundMessage(messaging, payload => {
    // Firebase automatically displays notification payloads. Only display data-only messages here.
    if (payload.notification) return;
    return self.registration.showNotification(payload.data?.title || 'FamiliGo', {
        body: payload.data?.body || 'Your family has an update.',
        icon: '/assets/brand/icon-192.png',
        data: { url: payload.data?.url || '/app' },
    });
});
}
