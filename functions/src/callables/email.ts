import { getAppBaseUrl, db } from "../init";
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import { defineSecret } from "firebase-functions/params";
import { createHash, randomUUID } from "crypto";
import { assertInviteAdmin, assertInviteCapacity, normalizeInviteEmail } from "../invitePolicy";
const resendApiKeyParam = defineSecret("RESEND_API_KEY");

export const sendTeenInviteEmail = functions.runWith({ secrets: [resendApiKeyParam] }).https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Please sign in to send an invitation.");
  const uid = context.auth.uid;
  const email = normalizeInviteEmail(data?.email);
  const familyCircleId = data?.familyCircleId;
  const teenName = data?.teenName;
  if (typeof familyCircleId !== "string" || !familyCircleId || familyCircleId.includes("/") ||
      typeof teenName !== "string" || !teenName.trim() || teenName.length > 100) {
    throw new functions.https.HttpsError("invalid-argument", "Circle and teen name are required.");
  }
  const apiKey = resendApiKeyParam.value();
  if (!apiKey) throw new functions.https.HttpsError("internal", "Email service is not configured.");
  const circleRef = db.collection("familyCircles").doc(familyCircleId);
  const emailId = createHash("sha256").update(email).digest("hex");
  // Reserve atomically before sending; retries reuse the slot and token.
  const invitation = await db.runTransaction(async transaction => {
    const [circleSnap, adminSnap] = await Promise.all([
      transaction.get(circleRef), transaction.get(db.collection("users").doc(uid)),
    ]);
    if (!circleSnap.exists) throw new functions.https.HttpsError("not-found", "Circle not found.");
    const circle = circleSnap.data()!;
    assertInviteAdmin(circle, uid);
    if (adminSnap.data()?.status !== "active") throw new functions.https.HttpsError("permission-denied", "An approved family admin must send the invitation.");
    const existingCode = circle.invitationIds?.[emailId];
    if (existingCode) {
      const existing = await transaction.get(db.collection("teenInvites").doc(existingCode));
      if (!existing.exists) throw new functions.https.HttpsError("failed-precondition", "Invitation record is missing.");
      if (existing.data()?.claimedBy) throw new functions.https.HttpsError("already-exists", "This invitation has already been accepted.");
      return { code: existingCode as string, familyName: circle.name, parentName: adminSnap.data()?.name || "Your family admin" };
    }
    let count = circle.inviteCount;
    if (typeof count !== "number") {
      const members = await Promise.all((circle.memberIds || []).map((id: string) => transaction.get(db.collection("users").doc(id))));
      count = members.filter((member, index) => circle.memberIds[index] !== circle.adminIds[0] && ["teen", "adult"].includes(member.data()?.role)).length;
    }
    assertInviteCapacity(count);
    const code = randomUUID();
    transaction.create(db.collection("teenInvites").doc(code), {
      email, familyCircleId, invitedBy: uid, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(circleRef, { inviteCount: count + 1, [`invitationIds.${emailId}`]: code });
    return { code, familyName: circle.name, parentName: adminSnap.data()?.name || "Your family admin" };
  });
  const resend = new Resend(apiKey);
  const { data: emailData, error } = await resend.emails.send({
    from: "FamiliGo <noreply@familigo.life>", to: email, subject: "You're invited to join FamiliGo!",
    template: { id: "e6db585e-67fd-4cba-9143-bcc7c483933a", variables: {
      teenName: teenName.trim(), parentName: invitation.parentName, familyName: invitation.familyName,
      inviteLink: `${getAppBaseUrl()}/claim-invite?code=${invitation.code}`, familyCircleId,
    } },
  } as any);
  if (error) {
    console.error("Invitation delivery failed", { code: error.name });
    throw new functions.https.HttpsError("internal", "Email delivery failed. Retry this recipient without using another invitation slot.");
  }
  return { success: true, messageId: emailData?.id };
});
