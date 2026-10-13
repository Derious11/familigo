// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, setLogLevel, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import {getFunctions, connectFunctionsEmulator} from 'firebase/functions';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = __FIREBASE_CONFIG__;

// Initialize Firebase. This sets up the default app instance.
const app = initializeApp(firebaseConfig);

// Get services using the default app instance.
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
export const messaging = typeof window === 'undefined' ? null : getMessaging(app);

// This mode uses a demo project and localhost only; it cannot modify live Firebase data.
if (import.meta.env.MODE === 'emulator') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9095', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8085);
    connectStorageEmulator(storage, '127.0.0.1', 9195);
    connectFunctionsEmulator(getFunctions(), '127.0.0.1', 5005);
}

// Add this:
setLogLevel("error");
