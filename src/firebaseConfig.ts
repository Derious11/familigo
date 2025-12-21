// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBjrXSbC6tb8YBRnV7NWF3dBZH2r-v-pBY",
  authDomain: "familigo-11643.firebaseapp.com",
  projectId: "familigo-11643",
  storageBucket: "familigo-11643.firebasestorage.com",
  messagingSenderId: "34674887836",
  appId: "1:34674887836:web:bff36d1b66d97404dab159",
  measurementId: "G-5XW9XNW42X"
};

// Initialize Firebase. This sets up the default app instance.
const app = initializeApp(firebaseConfig);

// Get services using the default app instance.
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
export const messaging = getMessaging(app);

// Add this:
setLogLevel("debug");