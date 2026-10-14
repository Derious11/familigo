import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transform } from 'esbuild';

async function service({ permission = 'default', key = 'test-public-key', ios = false, standalone = true, saveFails = false } = {}) {
    const events = [];
    const stored = new Map();
    const registration = { scope: '/' };
    const firebase = {
        getToken: async (_, options) => { events.push(['token', options]); return 'test-device-token'; },
        onMessage: () => () => {},
    };
    const modules = {
        'firebase/messaging': firebase,
        '../firebaseConfig': { getWebMessaging: async () => { events.push(['messaging']); return {}; } },
        './userService': {
            addNotificationToken: async (...args) => { events.push(['save', ...args]); if (saveFails) throw new Error('Unable to save this device.'); },
            removeNotificationToken: async (...args) => events.push(['remove', ...args]),
        },
        '../pwa/platform': { isIOS: () => ios, isStandalone: () => standalone, registerAppWorker: async () => registration },
    };
    const notification = { permission, requestPermission: async () => { events.push(['permission']); notification.permission = 'granted'; return 'granted'; } };
    const result = await transform(readFileSync(new URL('../src/services/webPushService.ts', import.meta.url), 'utf8'), {
        loader: 'ts', format: 'cjs', define: { 'import.meta.env.VITE_FIREBASE_VAPID_KEY': JSON.stringify(key) },
    });
    const module = { exports: {} };
    vm.runInNewContext(result.code, { module, exports: module.exports, require: name => modules[name], Notification: notification,
        navigator: { serviceWorker: { ready: Promise.resolve(registration) } }, console: { log() {}, error() {} },
        localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) } });
    return { ...module.exports, events, notification, registration };
}

test('opt-in requests permission first and registers the shared worker before reporting success', async () => {
    const push = await service();
    const result = await push.requestNotificationPermission('test-user');
    assert.equal(result.success, true);
    assert.equal(push.events[0][0], 'permission');
    const token = push.events.find(event => event[0] === 'token');
    assert.equal(token[1].serviceWorkerRegistration, push.registration);
    assert.equal(token[1].vapidKey, 'test-public-key');
    assert.deepEqual(push.events.at(-1), ['save', 'test-user', 'test-device-token']);
});

test('existing permission refreshes the device token without another OS permission prompt', async () => {
    const push = await service({ permission: 'granted' });
    await push.syncGrantedNotifications('test-user');
    assert.equal(push.events.some(event => event[0] === 'permission'), false);
    assert.deepEqual(push.events.at(-1), ['save', 'test-user', 'test-device-token']);
});

test('missing configuration and non-installed iOS return actionable errors without prompting', async () => {
    for (const options of [{ key: '' }, { ios: true, standalone: false }]) {
        const push = await service(options);
        const result = await push.requestNotificationPermission('test-user');
        assert.equal(result.success, false);
        assert.match(result.error, /configured|Home Screen/);
        assert.equal(push.events.length, 0);
    }
});

test('failed token storage never reports notifications enabled', async () => {
    const push = await service({ saveFails: true });
    const result = await push.requestNotificationPermission('test-user');
    assert.equal(result.success, false);
    assert.match(result.error, /Unable to save/);
});

test('disabling this device removes only its token and remembers the local opt-out', async () => {
    const push = await service({ permission: 'granted' });
    await push.syncGrantedNotifications('test-user');
    await push.revokeNotificationPermission('test-user');
    assert.deepEqual(push.events.at(-1), ['remove', 'test-user', 'test-device-token']);
    assert.equal(push.isDevicePushDisabled('test-user'), true);
    await push.requestNotificationPermission('test-user');
    assert.equal(push.isDevicePushDisabled('test-user'), false);
});

test('blocked permissions do not clear other devices or request permission during opt-out', async () => {
    const push = await service({ permission: 'denied' });
    await push.revokeNotificationPermission('test-user');
    assert.equal(push.events.length, 0);
    assert.equal(push.isDevicePushDisabled('test-user'), true);
});

test('each app release registers a versioned worker at the existing root scope', async () => {
    const calls = [];
    for (const bundle of ['index-old.js', 'index-new.js']) {
        const result = await transform(readFileSync(new URL('../src/pwa/platform.ts', import.meta.url), 'utf8'), {
            loader: 'ts', format: 'cjs', define: { 'import.meta.env.DEV': 'false', 'import.meta.url': JSON.stringify(`https://familigo.test/assets/${bundle}`) },
        });
        const module = { exports: {} };
        vm.runInNewContext(result.code, { module, exports: module.exports, URL,
            require: () => ({ Capacitor: { isNativePlatform: () => false } }),
            window: { location: { origin: 'https://familigo.test' } },
            navigator: { serviceWorker: { register: async (url, options) => { calls.push([new URL(url), options]); return {}; } } },
        });
        await module.exports.registerAppWorker();
        await module.exports.registerAppWorker();
    }
    assert.equal(calls.length, 2);
    assert.equal(calls[0][0].pathname, '/firebase-messaging-sw.js');
    assert.equal(calls[0][1].scope, '/');
    assert.equal(calls[0][1].updateViaCache, 'none');
    assert.notEqual(calls[0][0].href, calls[1][0].href);
});
