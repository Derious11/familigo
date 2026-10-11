import * as functions from "firebase-functions/v1";
import { db } from "../init";
import { assertInviteAdmin } from "../invitePolicy";
export const validateTeenInvite = functions.https.onCall(async (data) => {
  const code = data?.code;
  if (typeof code !== "string" || !code || code.includes("/") || code.length > 128) throw new functions.https.HttpsError("invalid-argument", "A valid invitation is required.");
  const snapshot = await db.collection("teenInvites").doc(code).get();
  if (!snapshot.exists || snapshot.data()?.claimedBy) throw new functions.https.HttpsError("not-found", "Please ask your family admin for a new email invitation.");
  const invite = snapshot.data()!;
  const circleSnap = await db.collection("familyCircles").doc(invite.familyCircleId).get();
  if (!circleSnap.exists) throw new functions.https.HttpsError("not-found", "Circle not found.");
  assertInviteAdmin(circleSnap.data()!, invite.invitedBy);
  return { valid: true, familyCircleId: circleSnap.id, familyName: circleSnap.data()!.name };
});
