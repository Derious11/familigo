import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

import { db } from "../init";

export const redeemTeenInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const inviteCode = data?.inviteCode;
  if (!inviteCode || typeof inviteCode !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invite code is required."
    );
  }

  const userId = context.auth.uid;
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "User profile not found."
    );
  }

  const circleQuery = await db
    .collection("familyCircles")
    .where("inviteCode", "==", inviteCode)
    .limit(1)
    .get();

  if (circleQuery.empty) {
    throw new functions.https.HttpsError(
      "not-found",
      "This invite link is invalid."
    );
  }

  const circleDoc = circleQuery.docs[0];
  const circleData = circleDoc.data() as { memberIds?: string[] };

  if (circleData.memberIds?.includes(userId)) {
    return { success: true, familyCircleId: circleDoc.id, alreadyMember: true };
  }

  const batch = db.batch();

  batch.update(userRef, {
    familyCircleId: circleDoc.id,
    role: "teen",
    status: "pending_approval",
  });

  batch.update(circleDoc.ref, {
    memberIds: admin.firestore.FieldValue.arrayUnion(userId),
    [`members.${userId}`]: true,
  });

  await batch.commit();

  return { success: true, familyCircleId: circleDoc.id };
});
