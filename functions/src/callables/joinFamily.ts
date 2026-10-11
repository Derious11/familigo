import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { db } from "../init";
import { assertInviteCapacity } from "../invitePolicy";

export const joinFamily = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Please sign in to join a family.");
  const uid = context.auth.uid;
  const code = data?.inviteCode;
  if (typeof code !== "string" || !code || code.length > 128) throw new functions.https.HttpsError("invalid-argument", "An invite code is required.");
  const circles = await db.collection("familyCircles").where("inviteCode", "==", code).limit(1).get();
  if (circles.empty) throw new functions.https.HttpsError("not-found", "Invalid invite code.");
  const circleRef = circles.docs[0].ref;
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async transaction => {
    const [circleSnap, userSnap] = await Promise.all([transaction.get(circleRef), transaction.get(userRef)]);
    const circle = circleSnap.data();
    const user = userSnap.data();
    if (!circle || circle.inviteCode !== code || !user) throw new functions.https.HttpsError("not-found", "Circle or account not found.");
    if (user.role !== "adult") throw new functions.https.HttpsError("failed-precondition", "Teens must use their email invitation.");
    if (circle.memberIds?.includes(uid)) return { success: true, familyId: circleRef.id, alreadyMember: true };
    if ((user.familyCircleId && user.familyCircleId !== circleRef.id) || !["active", "pending_approval"].includes(user.status)) {
      throw new functions.https.HttpsError("failed-precondition", "This account cannot join this circle.");
    }
    const memberIds: string[] = circle.memberIds || [];
    const members = await Promise.all(memberIds.map(id => transaction.get(db.collection("users").doc(id))));
    const inviter = members.find((member, index) => circle.adminIds?.includes(memberIds[index]) && member.data()?.status === "active");
    if (!inviter) throw new functions.https.HttpsError("failed-precondition", "An approved family admin is required to join this circle.");
    const count = typeof circle.inviteCount === "number" ? circle.inviteCount :
      members.filter((member, index) => memberIds[index] !== circle.adminIds[0] && ["adult", "teen"].includes(member.data()?.role)).length;
    assertInviteCapacity(count);
    transaction.update(userRef, { familyCircleId: circleRef.id, status: "active", approvedBy: inviter.id, approvedAt: admin.firestore.FieldValue.serverTimestamp() });
    transaction.update(circleRef, { inviteCount: count + 1, memberIds: admin.firestore.FieldValue.arrayUnion(uid), [`members.${uid}`]: true });
    return { success: true, familyId: circleRef.id };
  });
});
