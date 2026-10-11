import * as functions from "firebase-functions/v1";
export const MAX_CIRCLE_INVITES = 5;
export function normalizeInviteEmail(value: unknown): string {
  if (typeof value !== "string" || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new functions.https.HttpsError("invalid-argument", "A valid invite email is required.");
  }
  return value.trim().toLowerCase();
}
export function assertInviteCapacity(count: number): void {
  if (count >= MAX_CIRCLE_INVITES) throw new functions.https.HttpsError("resource-exhausted", "This circle has reached its limit of 5 invitations.");
}
export function assertInviteAdmin(circle: FirebaseFirestore.DocumentData, uid: string): void {
  if (!circle.adminIds?.includes(uid) || !circle.memberIds?.includes(uid)) {
    throw new functions.https.HttpsError("permission-denied", "Only a family admin can invite someone to this circle.");
  }
}
