import {adminSnapshot, adminPage} from './adminService';
import { addDoc, collection, serverTimestamp, query, orderBy, getDocs, getDoc, QueryDocumentSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Feedback } from "../types";

export const submitFeedback = async (
    feedbackData: Omit<Feedback, "id" | "timestamp">
) => {
    try {
        // Sanitize feedbackData to remove undefined values
        const sanitizedData = Object.fromEntries(
            Object.entries(feedbackData).filter(([key, value]) => value !== undefined && !['status', 'internalNotes', 'updatedAt'].includes(key))
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

export const getAllFeedback = async (cursor?: QueryDocumentSnapshot) => {
    try {
        const snapshot = await adminSnapshot('feedback', cursor);
        const metadata = await Promise.all(snapshot.docs.map(item => getDoc(doc(db, 'adminFeedback', item.id))));
        const reviewById = new Map(metadata.map(item => [item.id, item.data()]));
        return adminPage(snapshot, snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate(),
            status: reviewById.get(doc.id)?.status || 'new',
            internalNotes: reviewById.get(doc.id)?.internalNotes || '',
            updatedAt: reviewById.get(doc.id)?.updatedAt?.toDate(),
        } as Feedback)));
    } catch (error) {
        console.error("Error fetching feedback:", error);
        throw error;
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
