import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { isEmbeddedBrowser, isIOS, isStandalone, registerAppWorker } from './platform';
import Modal from '../components/ui/Modal';

interface InstallEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const PwaContext = createContext({ installed: false, canOffer: false, dismissed: false, install: () => {}, dismiss: () => {} });
export const usePwa = () => useContext(PwaContext);
const DISMISS_KEY = 'familigo-install-dismissed';
function readDismissed() {
    try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 30 * 86400000; }
    catch { return false; }
}

export default function PwaProvider({ children }: { children: React.ReactNode }) {
    const [installed, setInstalled] = useState(isStandalone);
    const [dismissed, setDismissed] = useState(readDismissed);
    const [prompt, setPrompt] = useState<InstallEvent | null>(null);
    const [help, setHelp] = useState(false);
    const [online, setOnline] = useState(navigator.onLine);
    const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
    const [confirmUpdate, setConfirmUpdate] = useState(false);
    const [installError, setInstallError] = useState('');
    const [updating, setUpdating] = useState(false);
    const [updateError, setUpdateError] = useState('');

    useEffect(() => {
        const media = window.matchMedia('(display-mode: standalone)');
        const onInstalled = () => { setInstalled(true); setPrompt(null); setHelp(false); };
        const onModeChange = () => setInstalled(isStandalone());
        const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
        const onOnline = () => setOnline(navigator.onLine);
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOnline);
        media.addEventListener('change', onModeChange);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOnline);
            media.removeEventListener('change', onModeChange);
        };
    }, []);

    useEffect(() => {
        let disposed = false;
        let registration: ServiceWorkerRegistration | undefined;
        const observe = () => {
            if (registration?.waiting && navigator.serviceWorker.controller && !disposed) setWaiting(registration.waiting);
            const worker = registration?.installing;
            worker?.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller && !disposed) setWaiting(worker);
            });
        };
        registerAppWorker()?.then(result => {
            if (disposed) return;
            registration = result;
            observe();
            registration.addEventListener('updatefound', observe);
        }).catch(() => { /* Installation help remains usable when worker registration fails. */ });
        const check = () => { if (document.visibilityState === 'visible' && navigator.onLine) registration?.update().catch(() => {}); };
        const interval = window.setInterval(check, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', check);
        const route = (event: MessageEvent) => {
            if (event.data?.type !== 'NOTIFICATION_OPEN') return;
            const url = new URL(event.data.url, location.origin);
            if (url.origin === location.origin && /^\/app(?:\/|$)/.test(url.pathname)) {
                window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
                window.dispatchEvent(new CustomEvent('familigo-notification-open', { detail: url.searchParams.get('view') || 'feed' }));
            }
        };
        navigator.serviceWorker?.addEventListener('message', route);
        return () => {
            disposed = true;
            registration?.removeEventListener('updatefound', observe);
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', check);
            navigator.serviceWorker?.removeEventListener('message', route);
        };
    }, []);

    const dismiss = () => {
        setDismissed(true);
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* Private browsing */ }
    };
    const install = async () => {
        setInstallError('');
        if (!prompt) { setHelp(true); return; }
        try {
            await prompt.prompt();
            const choice = await prompt.userChoice;
            if (choice.outcome === 'accepted') setInstalled(true);
            else dismiss();
            setPrompt(null);
        } catch { setInstallError('Installation could not start. Try your browser’s menu instead.'); setHelp(true); }
    };
    const update = () => {
        if (!waiting || updating) return;
        setUpdating(true);
        setUpdateError('');
        const reload = () => window.location.reload();
        navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
        waiting.postMessage({ type: 'SKIP_WAITING' });
        window.setTimeout(() => {
            navigator.serviceWorker.removeEventListener('controllerchange', reload);
            setUpdating(false);
            setUpdateError('The update could not finish. Please try again.');
        }, 15000);
    };

    return <PwaContext.Provider value={{ installed, dismissed, canOffer: !installed && !Capacitor.isNativePlatform() && (!!prompt || isIOS() || /Android/i.test(navigator.userAgent)), install, dismiss }}>
        <div hidden={!online}>{children}</div>
        {!online && <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            <div className="max-w-sm text-center" role="status">
                <img src="/assets/brand/icon-192.png" alt="" className="w-20 h-20 mx-auto mb-6 rounded-2xl" />
                <h1 className="text-2xl font-bold mb-3">You’re offline</h1>
                <p>Reconnect to see your family’s latest activity, log a challenge, or send a message. Your open screen will return when you’re back online.</p>
                <button className="mt-6 text-blue-600 font-semibold underline" onClick={() => setOnline(navigator.onLine)}>Check connection</button>
            </div>
        </main>}
        {waiting && online && <div role="status" className="fixed top-3 left-3 right-3 mx-auto max-w-md z-[60] rounded-xl bg-slate-900 text-white shadow-lg p-4 flex items-center justify-between gap-3" style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}>
            <span className="text-sm">A new FamiliGo version is ready.</span>
            <button onClick={() => setConfirmUpdate(true)} className="font-semibold underline whitespace-nowrap">Update</button>
        </div>}
        <Modal isOpen={help && online && !installed} onClose={() => setHelp(false)} title="Install FamiliGo" footer={<button onClick={() => setHelp(false)} className="w-full rounded-xl bg-brand-blue text-white p-3 font-semibold">Got it</button>}>
            <img src="/assets/brand/icon-180.png" alt="FamiliGo" className="w-16 h-16 rounded-2xl mb-4" />
            <p className="mb-5 text-gray-600 dark:text-gray-300">Keep your family one tap away. Add FamiliGo to your home screen.</p>
            {installError && <p role="alert" className="mb-4 text-red-600">{installError}</p>}
            {isEmbeddedBrowser() && <p className="mb-4 rounded-xl bg-blue-50 text-blue-900 p-3">First open this page in {isIOS() ? 'Safari' : 'Chrome'} using this browser’s menu. If that option is missing, copy the link below and open it there.</p>}
            {isIOS() ? <ol className="list-decimal pl-5 space-y-4">
                <li>Open FamiliGo in <strong>Safari</strong>.</li>
                <li>Tap <strong>Share</strong> <svg aria-label="Share icon" role="img" className="inline w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V3m-4 4 4-4 4 4M7 11H4v10h16V11h-3" /></svg> in the browser’s menu or toolbar.</li>
                <li>Choose <strong>Add to Home Screen</strong>. You may need to scroll or tap <strong>Edit Actions</strong> to find it.</li>
                <li>Keep <strong>Open as Web App</strong> enabled if shown, then tap <strong>Add</strong>.</li>
            </ol> : <p>Open your browser’s menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. If you don’t see either option, open this page in Chrome and try again.</p>}
            <p className="mt-5 text-sm text-gray-500">Installation happens through your browser’s menu. Then open FamiliGo using its new home screen icon.</p>
            {isEmbeddedBrowser() && <p className="mt-4 text-sm break-all select-all">{location.origin}/app</p>}
        </Modal>
        <Modal isOpen={confirmUpdate && online} onClose={() => !updating && setConfirmUpdate(false)} title="Update FamiliGo" footer={<button disabled={updating} onClick={update} className="w-full rounded-xl bg-brand-blue text-white p-3 font-semibold disabled:opacity-60">{updating ? 'Updating…' : 'Reload and update'}</button>}>
            <p>Finish or save any activity entry or message before updating. This reloads FamiliGo, and unsent drafts on this screen will be cleared.</p>
            {updateError && <p role="alert" className="mt-3 text-red-600">{updateError}</p>}
        </Modal>
    </PwaContext.Provider>;
}

export function InstallCard() {
    const pwa = usePwa();
    if (!pwa.canOffer || pwa.dismissed) return null;
    return <aside className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 dark:bg-slate-800 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3"><img src="/assets/brand/icon-192.png" alt="" className="w-12 h-12 rounded-xl" /><div><p className="font-bold">Keep your family one tap away</p><p className="text-sm text-gray-600 dark:text-gray-300">Add FamiliGo to your home screen.</p></div></div>
        <div className="mt-3 flex gap-4"><button onClick={pwa.install} className="rounded-lg bg-brand-blue px-4 py-2 text-white font-semibold">Install FamiliGo</button><button onClick={pwa.dismiss} className="text-sm text-gray-600 dark:text-gray-300">Maybe later</button></div>
    </aside>;
}
