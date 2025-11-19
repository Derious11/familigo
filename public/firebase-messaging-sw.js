// This file must be served from the root for Firebase Messaging to work.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjrXSbC6tb8YBRnV7NWF3dBZH2r-v-pBY",
  authDomain: "familigo-11643.firebaseapp.com",
  projectId: "familigo-11643",
  storageBucket: "familigo-11643.appspot.com",
  messagingSenderId: "34674887836",
  appId: "1:34674887836:web:bff36d1b66d97404dab159",
  measurementId: "G-5XW9XNW42X",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification?.title ?? "FamiliGo";
  const notificationOptions = {
    body: payload.notification?.body,
    icon: "/assets/FamiliGo_logo.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
