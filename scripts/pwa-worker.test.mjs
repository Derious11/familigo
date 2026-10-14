import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker() {
    const handlers = {};
    const cached = new Map([['familigo-shell-old', new Map([['/assets/old.js', 'old bundle']])]]);
    let skipped = false;
    let background;
    const notifications = [];
    const messages = [];
    const windows = [];
    const shell = new Map();
    const caches = {
        open: async name => {
            if (!cached.has(name)) cached.set(name, shell);
            const entries = cached.get(name);
            return { addAll: async urls => urls.forEach(url => entries.set(url, `cached:${url}`)), match: async url => entries.get(url) };
        },
        keys: async () => [...cached.keys()],
        delete: async key => cached.delete(key),
        match: async url => { for (const entries of cached.values()) if (entries.has(url)) return entries.get(url); },
    };
    const self = {
        PushManager: {}, Notification: {},
        location: { origin: 'https://familigo.test' },
        addEventListener: (type, handler) => handlers[type] = handler,
        skipWaiting: () => { skipped = true; },
        clients: {
            claim: async () => {}, matchAll: async () => windows,
            openWindow: async url => messages.push(url),
        },
        registration: { showNotification: async (...args) => notifications.push(args) },
    };
    const source = readFileSync(new URL('../src/pwa/worker.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
    vm.runInNewContext(source, { self, caches, URL, fetch: async () => 'network', initializeApp: () => ({}), getMessaging: () => ({}), onBackgroundMessage: (_, handler) => background = handler,
        __PWA_VERSION__: 'new', __PWA_ASSETS__: ['/index.html', '/assets/new.js'], __FIREBASE_CONFIG__: {} });
    const lifecycle = async type => { let pending; handlers[type]({ waitUntil: promise => pending = promise }); await pending; };
    const fetch = async (url, mode = 'cors', method = 'GET') => {
        let result;
        handlers.fetch({ request: { url, mode, method }, respondWith: response => result = response });
        return result;
    };
    return { handlers, cached, lifecycle, fetch, background: (...args) => background(...args), notifications, messages, windows, skipped: () => skipped };
}

test('offline launch uses the same release HTML and assets; API responses are never cached', async () => {
    const app = worker();
    await app.lifecycle('install');
    assert.equal(app.skipped(), false);
    assert.equal(await app.fetch('https://familigo.test/app?invite=private', 'navigate'), 'cached:/index.html');
    assert.equal(await app.fetch('https://familigo.test/assets/new.js'), 'cached:/assets/new.js');
    assert.equal(await app.fetch('https://familigo.test/api/family'), undefined);
    assert.equal(await app.fetch('https://firestore.googleapis.com/private'), undefined);
    assert.equal(await app.fetch('https://familigo.test/app', 'cors', 'POST'), undefined);
});

test('updates are user-controlled and retain the previous release for open tabs', async () => {
    const app = worker();
    const previous = app.cached.get('familigo-shell-old');
    app.cached.clear();
    app.cached.set('familigo-shell-older', new Map());
    app.cached.set('familigo-shell-old', previous);
    await app.lifecycle('install');
    await app.lifecycle('activate');
    assert.equal(await app.fetch('https://familigo.test/assets/old.js'), 'old bundle');
    assert.equal(app.cached.size, 2);
    app.handlers.message({ data: { type: 'SKIP_WAITING' } });
    assert.equal(app.skipped(), true);
});

test('Firebase notification payloads are not displayed twice', async () => {
    const app = worker();
    await app.background({ notification: { title: 'Automatically displayed' } });
    assert.equal(app.notifications.length, 0);
    await app.background({ data: { title: 'Chat', body: 'Hello', url: '/app?view=chat' } });
    assert.equal(app.notifications[0][0], 'Chat');
    assert.equal(app.notifications[0][1].data.url, '/app?view=chat');
});

test('notification taps focus existing windows without reloading and reject outside links', async () => {
    const app = worker();
    app.windows.push({ url: 'https://familigo.test/app', focus: async () => {}, postMessage: message => app.messages.push(message) });
    let pending;
    const click = async data => {
        app.handlers.notificationclick({ notification: { data, close: () => {} }, stopImmediatePropagation: () => {}, waitUntil: promise => pending = promise });
        await pending;
    };
    await click({ FCM_MSG: { fcmOptions: { link: 'https://familigo.test/app?view=chat' } } });
    assert.equal(app.messages[0].url, 'https://familigo.test/app?view=chat');
    await click({ url: 'https://evil.test/app' });
    assert.equal(app.messages[1].url, 'https://familigo.test/app');
    await click({ url: '/application' });
    assert.equal(app.messages[2].url, 'https://familigo.test/app');
    await click({ FCM_MSG: { notification: { click_action: 'https://familigo.test/app?view=chat' } } });
    assert.equal(app.messages[3].url, 'https://familigo.test/app?view=chat');
});
