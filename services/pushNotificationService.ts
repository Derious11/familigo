
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebaseConfig';
import { addNotificationToken, removeNotificationToken } from './firebaseService';

const VAPID_KEY = "BL2B7R5PZ_i8L6pQ8CEy0w7wJgJ-esnCkTDbI-cLo09J7T21pwhikV9Xm5aSP5Jrmw22-PCHpWz2vBxAaTR_s7M";
let currentToken: string | null = null;

// This function initializes the service worker and sets up a listener for foreground messages.
export const initializeFCM = () => {
    if ('serviceWorker' in navigator && typeof messaging !== 'undefined') {
        navigator.serviceWorker
            .register('/firebase-messaging-sw.js')
            .then((registration) => {
                console.log('Service Worker registration successful, scope is:', registration.scope);
            })
            .catch((err) => {
                console.log('Service Worker registration failed:', err);
            });
        
        // Listen for messages when the app is in the foreground
        onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            // Display a toast or other in-app notification
            // For simplicity, we'll just log it. A real app might use a toast library.
            alert(`New Notification:\n${payload.notification?.title}\n${payload.notification?.body}`);
        });
    }
};

// This function requests permission from the user to send notifications.
export const requestNotificationPermission = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (typeof messaging === 'undefined') {
        return { success: false, error: "Messaging not supported." };
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (token) {
                currentToken = token;
                await addNotificationToken(userId, token);
                return { success: true };
            } else {
                 return { success: false, error: 'Could not get notification token. Please try again.' };
            }
        } else {
            // This covers 'denied' and 'default' (if the user dismisses the prompt)
            return { success: false, error: 'Permission not granted. To receive notifications, please enable them in your browser settings.' };
        }
    } catch (error: any) {
        console.error('An error occurred while requesting permission: ', error);
        // This specifically handles the case where getToken fails because permission is blocked.
        if (error.code === 'messaging/permission-blocked') {
            return { success: false, error: 'Notifications are blocked. Please go to your browser settings to allow notifications for this site.' };
        }
        return { success: false, error: 'An unknown error occurred while enabling notifications.' };
    }
};

// This function revokes the notification permission by removing the token from Firestore.
export const revokeNotificationPermission = async (userId: string): Promise<void> => {
    // If permission is blocked, we can't get a specific token.
    // The only way to honor the user's request is to clear all tokens from the backend.
    if (Notification.permission === 'denied') {
        console.log('Permission is denied. Clearing all user tokens from backend.');
        await removeNotificationToken(userId); // This uses the fallback to clear all tokens
        currentToken = null;
        return;
    }

    // Use the locally stored token if we have it.
    if (currentToken) {
        await removeNotificationToken(userId, currentToken);
        currentToken = null; // Clear the stored token
        return;
    }

    // If no local token, try to get it from Firebase.
    try {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
            await removeNotificationToken(userId, token);
        } else {
            // Fallback if no token is found but permission isn't denied.
            await removeNotificationToken(userId);
        }
    } catch (error) {
        console.error('Could not get token to revoke permission. Falling back to clearing all tokens.', error);
        // This catch handles other errors (e.g., user dismisses prompt)
        // and ensures we still fulfill the request to stop notifications.
        await removeNotificationToken(userId);
    }
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