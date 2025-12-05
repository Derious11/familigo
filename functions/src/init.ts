import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK.
// This gives the functions access to other Firebase services.
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const messaging = admin.messaging();
export const storage = admin.storage();
