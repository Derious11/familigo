import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const validateTeenInvite = functions.https.onCall(
    async (data, _context) => {
        const { code } = data;

        if (!code) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Invite code is required."
            );
        }

        const snapshot = await db
            .collection("familyCircles")
            .where("inviteCode", "==", code)
            .limit(1)
            .get();

        if (snapshot.empty) {
            throw new functions.https.HttpsError(
                "not-found",
                "This invite link is invalid."
            );
        }

        const doc = snapshot.docs[0];
        const family = doc.data();

        return {
            valid: true,
            familyCircleId: doc.id,
            familyName: family.name,
        };
    }
);
