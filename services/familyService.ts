import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    addDoc,
    getDocs,
    writeBatch,
    documentId
} from "firebase/firestore";
import { db } from '../firebaseConfig';
import { User, FamilyCircle } from '../types';

export const getUserFamilyCircle = async (familyId: string): Promise<FamilyCircle | null> => {
    const circleDocRef = doc(db, 'familyCircles', familyId);
    const circleDoc = await getDoc(circleDocRef);
    if (!circleDoc.exists()) return null;

    const circleData = circleDoc.data() as { name: string; inviteCode: string; memberIds: string[], chatName?: string, messageCount?: number };

    let members: User[] = [];
    if (circleData.memberIds?.length) {
        const membersQuery = query(collection(db, 'users'), where(documentId(), 'in', circleData.memberIds));
        const membersSnapshot = await getDocs(membersQuery);
        members = membersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
    }

    return {
        id: circleDoc.id,
        name: circleData.name,
        inviteCode: circleData.inviteCode,
        members,
        chatName: circleData.chatName,
        messageCount: circleData.messageCount
    };
};

export const createFamilyCircle = async (userId: string, familyName: string): Promise<FamilyCircle> => {
    const user = await getDoc(doc(db, 'users', userId));
    if (!user.exists()) throw new Error("User not found for creating circle");

    const inviteCode = `${familyName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newCircleData = {
        name: familyName,
        inviteCode: inviteCode,
        memberIds: [userId],
        messageCount: 0,
    };

    const circleRef = await addDoc(collection(db, "familyCircles"), newCircleData);
    await updateDoc(doc(db, 'users', userId), { familyCircleId: circleRef.id });

    return {
        id: circleRef.id,
        ...newCircleData,
        members: [{ id: userId, ...user.data() } as User],
    };
};

export const joinFamilyCircle = async (userId: string, inviteCode: string): Promise<{ circle: FamilyCircle | null, error: string | null }> => {
    const q = query(collection(db, 'familyCircles'), where('inviteCode', '==', inviteCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { circle: null, error: "Invalid invite code. Please check and try again." };
    }

    const circleDoc = querySnapshot.docs[0];
    const circleData = circleDoc.data() as { name: string; inviteCode: string; memberIds: string[] };

    if (circleData.memberIds.includes(userId)) {
        // User is already in the circle, just return it.
        const familyCircle = await getUserFamilyCircle(circleDoc.id);
        return { circle: familyCircle, error: null };
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', userId), { familyCircleId: circleDoc.id });
    batch.update(circleDoc.ref, { memberIds: [...circleData.memberIds, userId] });
    await batch.commit();

    const familyCircle = await getUserFamilyCircle(circleDoc.id);
    return { circle: familyCircle, error: null };
};

// Note: onFamilyCircleUpdate was in firebaseService.ts but logic was slightly mixed with chatName.
// I'll put it here.
import { onSnapshot } from "firebase/firestore";

export const onFamilyCircleUpdate = (familyCircleId: string, callback: (circle: FamilyCircle | null) => void): (() => void) => {
    const circleRef = doc(db, 'familyCircles', familyCircleId);
    return onSnapshot(circleRef, async (docSnapshot) => {
        if (docSnapshot.exists()) {
            const circleData = docSnapshot.data() as { name: string; inviteCode: string; memberIds: string[], chatName?: string, messageCount?: number };

            // We need to fetch member details to construct the full FamilyCircle object
            // This is a bit expensive to do on every update, but necessary if we want the full object.
            let members: User[] = [];
            if (circleData.memberIds?.length) {
                const membersQuery = query(collection(db, 'users'), where(documentId(), 'in', circleData.memberIds));
                const membersSnapshot = await getDocs(membersQuery);
                members = membersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
            }

            const circle: FamilyCircle = {
                id: docSnapshot.id,
                name: circleData.name,
                chatName: circleData.chatName,
                inviteCode: circleData.inviteCode,
                members,
                messageCount: circleData.messageCount || 0,
            };
            callback(circle);
        } else {
            callback(null);
        }
    });
};
