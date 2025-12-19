import * as functions from "firebase-functions/v1";
import { Resend } from "resend";
import { defineString } from "firebase-functions/params";

const resendApiKeyParam = defineString("RESEND_API_KEY");

/**
 * Triggered when a user document is written.
 * Checks if status changed from pending_approval -> active.
 * Sends welcome email.
 */
export const onUserStatusChanged = functions.firestore
    .document("users/{userId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if status changed to 'active'
        if (before.status !== "active" && after.status === "active") {
            console.log(`User ${context.params.userId} approved. Sending welcome email.`);

            const email = after.email;
            const name = after.name || "Family Hero";

            if (!email) {
                console.log("No email found for user.");
                return;
            }

            const resendApiKey = resendApiKeyParam.value();
            if (!resendApiKey) {
                console.error("RESEND_API_KEY not set.");
                return;
            }

            const resend = new Resend(resendApiKey);

            try {
                await resend.emails.send({
                    from: "FamiliGo <noreply@familigo.life>",
                    to: email,
                    subject: "Your FamiliGo Account is Approved! 🚀",
                    html: `
                    <h1>Welcome to FamiliGo!</h1>
                    <p>Hi ${name},</p>
                    <p>Great news! Your account has been approved and your family beta access is ready.</p>
                    <p>You can now log in and start your family fitness journey.</p>
                    <br/>
                    <a href="https://familigo.life/app" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to App</a>
                `,
                });
                console.log("Welcome email sent.");
            } catch (error) {
                console.error("Failed to send welcome email:", error);
            }
        }
    });
