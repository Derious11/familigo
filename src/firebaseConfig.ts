// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = __FIREBASE_CONFIG__;

// Initialize Firebase. This sets up the default app instance.
const app = initializeApp(firebaseConfig);

// Get services using the default app instance.
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
export const messaging = getMessaging(app);

// Add this:
setLogLevel("error");
