import { addDoc, collection, serverTimestamp, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Feedback } from "../types";

export const submitFeedback = async (
    feedbackData: Omit<Feedback, "id" | "timestamp">
) => {
    try {
        // Sanitize feedbackData to remove undefined values
        const sanitizedData = Object.fromEntries(
            Object.entries(feedbackData).filter(([_, v]) => v !== undefined)
        );

        await addDoc(collection(db, "feedback"), {
            ...sanitizedData,
            timestamp: serverTimestamp(),
            status: "new", // Internal status for admin review
        });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        throw error;
    }
};

export const getAllFeedback = async (): Promise<Feedback[]> => {
    try {
        const q = query(collection(db, "feedback"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate(),
        } as Feedback));
    } catch (error) {
        console.error("Error fetching feedback:", error);
        return [];
    }
};

export const deleteFeedback = async (id: string) => {
    try {
        await deleteDoc(doc(db, "feedback", id));
    } catch (error) {
        console.error("Error deleting feedback:", error);
        throw error;
    }
};
