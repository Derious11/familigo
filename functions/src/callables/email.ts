import * as functions from "firebase-functions/v1";
import { Resend } from "resend";
import { defineString } from "firebase-functions/params";

const resendApiKeyParam = defineString("RESEND_API_KEY");

/**
 * Cloud Function to send a teen invite email using Resend.
 * Callable from the client.
 */
export const sendTeenInviteEmail = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const { email, inviteCode, familyName, teenName, parentName } = data;

    if (!email || !inviteCode || !familyName || !teenName || !parentName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields."
      );
    }

    const resendApiKey = resendApiKeyParam.value();
    if (!resendApiKey) {
      throw new functions.https.HttpsError(
        "internal",
        "Email service is not configured."
      );
    }

    const resend = new Resend(resendApiKey);

    const inviteLink = `https://familigo-11643.web.app/join?inviteCode=${inviteCode}`;

    try {
      const payload = {
        from: "FamiliGo <noreply@familigo.life>",
        to: email,
        subject: "You're invited to join FamiliGo!",
        template: {
          id: "e6db585e-67fd-4cba-9143-bcc7c483933a",
          variables: {
            teenName,
            parentName,
            familyName,
            inviteLink,
          },
        },
      };

      console.log("Sending email via Resend:", payload);

      // Correct for resend@6.5.2
      const { data: emailData, error } = await resend.emails.send(payload as any);

      if (error) {
        console.error("Resend Error:", error);
        throw new functions.https.HttpsError(
          "internal",
          `Failed to send email: ${error.message}`
        );
      }

      return { success: true, messageId: emailData?.id };
    } catch (err: any) {
      console.error("Send email error:", err);

      throw new functions.https.HttpsError(
        "internal",
        err.message || "Unknown error"
      );
    }
  }
);
