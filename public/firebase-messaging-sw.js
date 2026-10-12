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
importScripts('/firebase-runtime-config.js');
const firebaseConfig = self.FIREBASE_CONFIG;

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
    icon: "/assets/brand/icon-192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
