import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type ParentEarlyAccessPayload = {
    role: "parent";
    name: string;
    email: string;
    kidCount: number | "";
    kidAges?: string;
    status: "pending";
    createdAt: string;
};

type TeenEarlyAccessPayload = {
    role: "teen";
    nickname: string;
    age: number | "";
    parentEmail: string;
    challengeTarget?: string;
    status: "pending";
    createdAt: string;
};

export type EarlyAccessPayload =
    | ParentEarlyAccessPayload
    | TeenEarlyAccessPayload;

/**
 * ✅ Submits an Early Access request to Firestore
 * Collection: early_access_requests
 */
export async function submitEarlyAccessRequest(
    payload: EarlyAccessPayload
) {
    try {
        const ref = collection(db, "early_access_requests");

        const docRef = await addDoc(ref, {
            ...payload,
            status: "pending",
            createdAt: serverTimestamp(), // ✅ authoritative server time
        });

        console.log("✅ Early access stored with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Firestore Early Access write failed:", error);
        throw error;
    }
}
