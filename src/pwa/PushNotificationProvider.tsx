import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getWebMessaging } from '../firebaseConfig';
import { isDevicePushDisabled, requestNotificationPermission, revokeNotificationPermission, syncGrantedNotifications } from '../services/webPushService';
import { isIOS, isStandalone } from './platform';
import Modal from '../components/ui/Modal';

interface DeviceNotifications {
    enabled: boolean;
    busy: boolean;
    enable: () => Promise<void>;
    disable: () => Promise<void>;
}
const Context = createContext<DeviceNotifications | null>(null);
export const useDeviceNotifications = () => useContext(Context);

export default function PushNotificationProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
    const [enabled, setEnabled] = useState(false);
    const [busy, setBusy] = useState(false);
    const [promptOpen, setPromptOpen] = useState(false);
    const [error, setError] = useState('');
    const native = Capacitor.isNativePlatform();

    useEffect(() => {
        let cancelled = false;
        if (native || typeof Notification === 'undefined' || (isIOS() && !isStandalone())) return;
        const initialise = async () => {
            if (!await getWebMessaging() || cancelled) return;
            if (Notification.permission === 'default') { setPromptOpen(true); return; }
            if (Notification.permission !== 'granted' || isDevicePushDisabled(userId)) return;
            setBusy(true);
            try {
                await syncGrantedNotifications(userId);
                if (!cancelled) setEnabled(true);
            } catch (cause) {
                if (!cancelled) { setError(cause instanceof Error ? cause.message : 'Could not register notifications.'); setPromptOpen(true); }
            } finally { if (!cancelled) setBusy(false); }
        };
        initialise().catch(() => {});
        return () => { cancelled = true; };
    }, [userId, native]);

    // Keep the permission request in the button's user gesture, as required by iOS.
    const enable = async () => {
        setBusy(true);
        setError('');
        try {
            const result = await requestNotificationPermission(userId);
            if (!result.success) throw new Error(result.error || 'Could not enable notifications.');
            setEnabled(true);
            setPromptOpen(false);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not enable notifications.');
            setPromptOpen(true);
        } finally { setBusy(false); }
    };
    const disable = async () => {
        setBusy(true);
        try { await revokeNotificationPermission(userId); setEnabled(false); }
        finally { setBusy(false); }
    };

    return <Context.Provider value={native ? null : { enabled, busy, enable, disable }}>
        {children}
        <Modal isOpen={promptOpen} onClose={() => !busy && setPromptOpen(false)} title="Stay in the family loop" footer={<div className="flex flex-col gap-3">
            <button disabled={busy} onClick={enable} className="rounded-xl bg-brand-blue text-white p-3 font-semibold disabled:opacity-60">{busy ? 'Setting up…' : 'Enable notifications'}</button>
            <button disabled={busy} onClick={() => setPromptOpen(false)} className="p-2 text-gray-600 dark:text-gray-300">Maybe later</button>
        </div>}>
            <img src="/assets/brand/icon-180.png" alt="" className="w-16 h-16 rounded-2xl mb-4" />
            <p>Get a heads-up when your family sends a message, starts a challenge, or celebrates an activity.</p>
            <p className="mt-3 text-sm text-gray-500">Your phone will ask for permission. You can change this any time in Profile settings.</p>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 text-red-800 p-3">{error}{typeof Notification !== 'undefined' && Notification.permission === 'denied' && ' Allow notifications in your phone or browser settings, then try again.'}</p>}
        </Modal>
    </Context.Provider>;
}
