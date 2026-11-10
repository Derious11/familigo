// Import the functions you need from the SDKs you need
import { app } from './firebaseAuth';
export { auth } from './firebaseAuth';
import { getFirestore, setLogLevel, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";
import {getFunctions, connectFunctionsEmulator} from 'firebase/functions';

export const db = getFirestore();
export const storage = getStorage();
export const getWebMessaging = async () => {
    if (typeof window === 'undefined' || !await isSupported()) return null;
    return getMessaging(app);
};

// This mode uses a demo project and localhost only; it cannot modify live Firebase data.
if (import.meta.env.MODE === 'emulator') {
    connectFirestoreEmulator(db, '127.0.0.1', 8085);
    connectStorageEmulator(storage, '127.0.0.1', 9195);
    connectFunctionsEmulator(getFunctions(), '127.0.0.1', 5005);
}

// Add this:
setLogLevel("error");
