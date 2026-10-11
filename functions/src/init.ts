import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK.
// This gives the functions access to other Firebase services.
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const messaging = admin.messaging();
export const storage = admin.storage();

// Resolve links from the runtime project, keeping development links isolated.
export const getAppBaseUrl = (): string => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || admin.app().options.projectId;
  if (!projectId) throw new Error("Firebase runtime project ID is unavailable.");
  return projectId === "familigo-11643" ? "https://www.familigo.life" : `https://${projectId}.web.app`;
};
