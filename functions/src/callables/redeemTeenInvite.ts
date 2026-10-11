import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db } from "../init";
import { assertInviteAdmin, normalizeInviteEmail } from "../invitePolicy";
export const redeemTeenInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Please sign in to accept your invitation.");
  const uid = context.auth.uid;
  const code = data?.inviteCode;
  if (typeof code !== "string" || !code || code.includes("/") || code.length > 128) throw new functions.https.HttpsError("invalid-argument", "A valid invitation is required.");
  const inviteRef = db.collection("teenInvites").doc(code);
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async transaction => {
    const [inviteSnap, userSnap] = await Promise.all([transaction.get(inviteRef), transaction.get(userRef)]);
    if (!inviteSnap.exists) throw new functions.https.HttpsError("not-found", "Please ask your family admin for a new email invitation.");
    if (!userSnap.exists) throw new functions.https.HttpsError("not-found", "User profile not found.");
    const invite = inviteSnap.data()!;
    const user = userSnap.data()!;
    if (normalizeInviteEmail(context.auth!.token.email) !== invite.email) throw new functions.https.HttpsError("permission-denied", "Sign up using the email address that received this invitation.");
    if (invite.claimedBy && invite.claimedBy !== uid) throw new functions.https.HttpsError("failed-precondition", "This invitation has already been used.");
    if (user.role !== "teen" || (user.familyCircleId && user.familyCircleId !== invite.familyCircleId) ||
        (user.status !== "pending_approval" && user.status !== "active")) throw new functions.https.HttpsError("failed-precondition", "This account cannot accept this invitation.");
    const circleRef = db.collection("familyCircles").doc(invite.familyCircleId);
    const [circleSnap, inviterSnap] = await Promise.all([
      transaction.get(circleRef), transaction.get(db.collection("users").doc(invite.invitedBy)),
    ]);
    if (!circleSnap.exists) throw new functions.https.HttpsError("not-found", "Circle not found.");
    assertInviteAdmin(circleSnap.data()!, invite.invitedBy);
    if (inviterSnap.data()?.status !== "active") throw new functions.https.HttpsError("failed-precondition", "The inviting admin is no longer approved.");
    if (invite.claimedBy === uid) return { success: true, familyCircleId: circleRef.id, alreadyMember: true };
    transaction.update(userRef, { familyCircleId: circleRef.id, status: "active", approvedAt: admin.firestore.FieldValue.serverTimestamp(), approvedBy: invite.invitedBy });
    transaction.update(circleRef, { memberIds: admin.firestore.FieldValue.arrayUnion(uid), [`members.${uid}`]: true });
    transaction.update(inviteRef, { claimedBy: uid, claimedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true, familyCircleId: circleRef.id };
  });
});
