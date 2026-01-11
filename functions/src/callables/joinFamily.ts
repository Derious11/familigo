import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

import { db } from "../init";


export const joinFamily = functions.https.onCall(async (data, context) => {
    try {
        console.log("joinFamily: Called with data", JSON.stringify(data));

        // 1. Auth Check
        if (!context.auth) {
            console.warn("joinFamily: Unauthenticated call");
            throw new functions.https.HttpsError(
                "unauthenticated",
                "You must be logged in to join a family."
            );
        }
        const userId = context.auth.uid;
        console.log("joinFamily: User ID", userId);
        const { inviteCode } = data;

        if (!inviteCode) {
            console.warn("joinFamily: Missing inviteCode");
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Invite code is required."
            );
        }

        // 2. Find Family by Invite Code
        console.log("joinFamily: Querying family by inviteCode", inviteCode);
        const circleQuery = await db.collection("familyCircles")
            .where("inviteCode", "==", inviteCode)
            .limit(1)
            .get();

        if (circleQuery.empty) {
            console.warn("joinFamily: No family found for code", inviteCode);
            throw new functions.https.HttpsError(
                "not-found",
                "Invalid invite code. Please check and try again."
            );
        }

        const circleDoc = circleQuery.docs[0];
        const circleData = circleDoc.data();
        const familyId = circleDoc.id;
        console.log("joinFamily: Found family", familyId);

        // 3. User Validation
        console.log("joinFamily: Fetching user profile", userId);
        const userRef = db.collection("users").doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            console.error("joinFamily: User profile missing", userId);
            throw new functions.https.HttpsError("not-found", "User profile not found.");
        }
        const userData = userSnap.data();

        // Check Role
        if (userData?.role !== "adult") {
            console.warn("joinFamily: User is not adult", userData?.role);
            throw new functions.https.HttpsError(
                "failed-precondition",
                "Only adults can join via invite code. Teens must use the email invite link."
            );
        }

        // Check if already in family
        if (circleData.memberIds?.includes(userId)) {
            console.log("joinFamily: User already in family");
            return {
                success: true,
                familyId: familyId,
                message: "Already a member."
            };
        }

        // 4. Beta Logic / Auto-Approval
        const updateData: any = {
            familyCircleId: familyId,
        };

        if (circleData.betaApproved) {
            console.log("joinFamily: Family is beta approved, auto-approving user");
            updateData.status = "active";
            updateData.approvedAt = admin.firestore.FieldValue.serverTimestamp();
            updateData.approvedBy = "auto";
        }

        // 5. Atomic Update
        console.log("joinFamily: Executing batch update");
        const batch = db.batch();

        batch.update(userRef, updateData);

        batch.update(circleDoc.ref, {
            memberIds: admin.firestore.FieldValue.arrayUnion(userId),
            [`members.${userId}`]: true
        });

        await batch.commit();
        console.log("joinFamily: Success");

        return {
            success: true,
            familyId: familyId
        };
    } catch (error: any) {
        console.error("joinFamily: Critical Error", error);
        // Ensure we re-throw HttpsError so client gets the right code
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // For unknown errors, log and throw internal
        throw new functions.https.HttpsError("internal", error.message || "Internal server error");
    }
});
