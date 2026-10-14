
import { getToken, onMessage } from 'firebase/messaging';
import { getWebMessaging } from '../firebaseConfig';
import { addNotificationToken, removeNotificationToken } from './userService';
import { isIOS, isStandalone, registerAppWorker } from '../pwa/platform';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
let currentToken: string | null = null;
export const isWebPushConfigured = () => !!VAPID_KEY;
const optOutKey = (userId: string) => `familigo-push-disabled:${userId}`;
export function isDevicePushDisabled(userId: string) {
    try { return localStorage.getItem(optOutKey(userId)) === 'true'; } catch { return false; }
}
function setDevicePushDisabled(userId: string, disabled: boolean) {
    try { localStorage.setItem(optOutKey(userId), String(disabled)); } catch { /* Private browsing */ }
}

// Refresh this installation's token after login without asking for permission again.
export async function syncGrantedNotifications(userId: string) {
    if (!VAPID_KEY) throw new Error('Push notifications are not configured for this environment.');
    const messaging = await getWebMessaging();
    if (!messaging) throw new Error('Notifications are not supported in this browser.');
    const registration = await registerAppWorker();
    if (!registration) throw new Error('Notifications require the deployed app.');
    await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) throw new Error('Could not register this device for notifications. Please try again.');
    await addNotificationToken(userId, token);
    currentToken = token;
    return token;
}

// This function initializes the service worker and sets up a listener for foreground messages.
export const initializeWebPush = (onNotification?: (notification: { title?: string; body?: string; data?: any }) => void): (() => void) | undefined => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    getWebMessaging().then(messaging => {
        if (disposed || !messaging) return;
        unsubscribe = onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);

            const title = payload.notification?.title;
            const body = payload.notification?.body;

            if (onNotification) {
                onNotification({
                    title,
                    body,
                    data: payload.data
                });
            } else {
                // Fallback if no callback provided
                const message = title ? `${title}: ${body}` : body || "New Notification";
                alert(`New Notification:\n${message}`);
            }
        });
    }).catch(() => { /* Unsupported browsers can still use FamiliGo. */ });
    return () => { disposed = true; unsubscribe?.(); };
};

// This function requests permission from the user to send notifications.
export const requestNotificationPermission = async (userId: string): Promise<{ success: boolean; token?: string; error?: string }> => {
    if (!VAPID_KEY) {
        return { success: false, error: 'Push notifications are not configured for this environment.' };
    }
    if (isIOS() && !isStandalone()) return { success: false, error: 'Install FamiliGo using Safari → Share → Add to Home Screen, then open its home screen icon to enable notifications.' };

    try {
        if (typeof Notification === 'undefined') {
            return { success: false, error: "Notifications not supported in this environment." };
        }
        const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await syncGrantedNotifications(userId);
            if (token) {
                setDevicePushDisabled(userId, false);
                return { success: true, token };
            } else {
                return { success: false, error: 'Could not get notification token. Please try again.' };
            }
        } else {
            // This covers 'denied' and 'default' (if the user dismisses the prompt)
            return { success: false, error: 'Permission not granted. To receive notifications, please enable them in your browser settings.' };
        }
    } catch (error: any) {
        console.error('Notification registration failed:', error?.code || 'registration-error');
        let errorMessage = error?.code ? 'Notification registration failed. Please try again.' : (error?.message || 'Could not enable notifications. Please try again.');

        // Check for specific Firebase Messaging error codes to provide better feedback
        switch (error.code) {
            case 'messaging/permission-blocked':
            case 'messaging/permission-default':
                errorMessage = 'Notifications are blocked. Please go to your browser settings to allow notifications for this site.';
                break;
            case 'messaging/sw-reg-fail':
            case 'messaging/sw-not-supported':
                errorMessage = 'Could not set up notifications. Your browser might not be supported or the service worker failed to register.';
                break;
            case 'messaging/invalid-vapid-key':
                errorMessage = 'Notification setup failed due to an invalid configuration key. Please contact support.';
                break;
            case 'messaging/registration-failed':
                errorMessage = 'Notification setup failed. This might be a temporary network issue. Please try again.';
                break;
        }

        return { success: false, error: errorMessage };
    }
};

// This function revokes the notification permission by removing the token from Firestore.
export const revokeNotificationPermission = async (userId: string): Promise<void> => {
    let token = currentToken;
    if (!token && typeof Notification !== 'undefined' && Notification.permission === 'granted' && VAPID_KEY) {
        const messaging = await getWebMessaging();
        const registration = await registerAppWorker();
        if (messaging && registration) token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    }
    // Turning off this installation must not disable the user's other devices.
    if (token) await removeNotificationToken(userId, token);
    setDevicePushDisabled(userId, true);
    currentToken = null;
};


// In a real application, this function would make an API call to a backend service (e.g., Firebase Cloud Functions)
// which would then use the Firebase Admin SDK to send the notification.
// For this client-side demo, we'll just log the action to the console.
export const sendPushNotification = (tokens: string[], title: string, body: string) => {
    console.log("--- SIMULATING PUSH NOTIFICATION ---");
    console.log("Recipient Tokens:", tokens);
    console.log("Title:", title);
    console.log("Body:", body);
    console.log("-------------------------------------");
    // Example of what a backend function call might look like:
    //
    // const message = {
    //   notification: { title, body },
    //   tokens: tokens,
    // };
    // admin.messaging().sendEachForTokens(message)
};
