import { Capacitor } from '@capacitor/core';

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => Capacitor.isNativePlatform() || window.matchMedia('(display-mode: standalone)').matches || !!(navigator as Navigator & { standalone?: boolean }).standalone;
export const isEmbeddedBrowser = () => /Instagram|FBAN|FBAV|GSA|Gmail|Line\/|; wv\)/i.test(navigator.userAgent);

let registration: Promise<ServiceWorkerRegistration> | undefined;
export function registerAppWorker() {
    if (import.meta.env.DEV || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return undefined;
    // A new app bundle gets a fresh URL even if an edge cache retains an older worker.
    const workerURL = new URL('/firebase-messaging-sw.js', window.location.origin);
    workerURL.searchParams.set('v', new URL(import.meta.url).pathname);
    registration ??= navigator.serviceWorker.register(workerURL.href, { scope: '/', updateViaCache: 'none' }).catch(error => {
        registration = undefined;
        throw error;
    });
    return registration;
}
