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
    documentId,
    arrayUnion,
    arrayRemove,
    deleteField,
    Timestamp,
    serverTimestamp
} from "firebase/firestore";
import { db } from '../firebaseConfig';
import { User, FamilyCircle } from '../types';
import { getBadges } from './userService';

const mapUserSnapshot = (snapshot: any): User => {
    const data = snapshot.data() as User;
    const avatarUpdatedAt = data.avatarUpdatedAt instanceof Timestamp
        ? data.avatarUpdatedAt.toDate()
        : data.avatarUpdatedAt;

    return {
        id: snapshot.id,
        ...data,
        avatarUpdatedAt,
    } as User;
};

export const getUserFamilyCircle = async (familyId: string): Promise<FamilyCircle | null> => {
    const circleDocRef = doc(db, 'familyCircles', familyId);
    const circleDoc = await getDoc(circleDocRef);
    if (!circleDoc.exists()) return null;

    const circleData = circleDoc.data() as { name: string; inviteCode: string; memberIds: string[], chatName?: string, messageCount?: number, avatarUrl?: string, motto?: string, adminIds?: string[] };

    let members: User[] = [];
    if (circleData.memberIds?.length) {
        const membersQuery = query(collection(db, 'users'), where(documentId(), 'in', circleData.memberIds));
        const membersSnapshot = await getDocs(membersQuery);
        members = membersSnapshot.docs.map(mapUserSnapshot);
    }

    return {
        id: circleDoc.id,
        name: circleData.name,
        inviteCode: circleData.inviteCode,
        members,
        chatName: circleData.chatName,
        messageCount: circleData.messageCount,
        avatarUrl: circleData.avatarUrl,
        motto: circleData.motto,
        adminIds: circleData.adminIds || []
    };
};

export const createFamilyCircle = async (userId: string, familyName: string): Promise<FamilyCircle> => {
    const user = await getDoc(doc(db, 'users', userId));
    if (!user.exists()) throw new Error("User not found for creating circle");

    const creator = mapUserSnapshot(user);

    const inviteCode = `${familyName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newCircleData = {
        name: familyName,
        inviteCode: inviteCode,
        memberIds: [userId],
        members: {
            [userId]: true,
        },
        adminIds: [userId], // Creator is the first admin
        messageCount: 0,
        betaApproved: false, // Beta Requirement: Families start as pending
    };

    const circleRef = await addDoc(collection(db, "familyCircles"), newCircleData);
    await updateDoc(doc(db, 'users', userId), { familyCircleId: circleRef.id });

    return {
        id: circleRef.id,
        ...newCircleData,
        members: [creator],
    };
};

export const joinFamilyCircle = async (userId: string, inviteCode: string): Promise<{ circle: FamilyCircle | null, error: string | null }> => {
    const q = query(collection(db, 'familyCircles'), where('inviteCode', '==', inviteCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { circle: null, error: "Invalid invite code. Please check and try again." };
    }

    const circleDoc = querySnapshot.docs[0];
    // Raw firestore data has memberIds, but FamilyCircle type has members: User[]
    const circleData = circleDoc.data() as {
        name: string;
        inviteCode: string;
        memberIds: string[];
        betaApproved?: boolean;
    };

    // Beta Requirement: Only Adults can join via code
    // We need to fetch the user to check role, or rely on caller? 
    // Ideally we check user role from DB to be secure.
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) return { circle: null, error: "User not found." };

    const userData = userDoc.data() as User;
    if (userData.role !== 'adult') {
        return { circle: null, error: "Only adults can join via invite code. Teens must use the email invite link." };
    }

    if (circleData.memberIds.includes(userId)) {
        // User is already in the circle, just return it.
        const familyCircle = await getUserFamilyCircle(circleDoc.id);
        return { circle: familyCircle, error: null };
    }

    const batch = writeBatch(db);

    // Beta Requirement: Auto-approve if family is beta approved
    let newStatus = userData.status;
    let approvedUpdates = {};

    if (circleData.betaApproved) {
        newStatus = 'active';
        approvedUpdates = {
            approvedAt: serverTimestamp(),
            approvedBy: 'auto'
        };
    }

    batch.update(userDocRef, {
        familyCircleId: circleDoc.id,
        status: newStatus,
        ...approvedUpdates
    });

    batch.update(circleDoc.ref, {
        memberIds: arrayUnion(userId), // atomic array union
        [`members.${userId}`]: true, // keeping legacy structure for now
    });
    await batch.commit();

    const familyCircle = await getUserFamilyCircle(circleDoc.id);
    return { circle: familyCircle, error: null };
};

export const redeemTeenInvite = async (userId: string, familyId: string): Promise<{ success: boolean; error: string | null }> => {
    try {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);
        const familyRef = doc(db, 'familyCircles', familyId);

        // 1. Update User: Link to family, keep status='pending_approval' (default from auth)
        batch.update(userRef, {
            familyCircleId: familyId,
            role: 'teen', // Enforce role
            status: 'pending_approval'
        });

        // 2. Update Family: Add member
        batch.update(familyRef, {
            memberIds: arrayUnion(userId),
            [`members.${userId}`]: true
        });

        await batch.commit();
        return { success: true, error: null };
    } catch (e: any) {
        console.error("Redeem Invite Error", e);
        return { success: false, error: e.message };
    }
};

export const approveTeenMember = async (familyId: string, teenUserId: string, adminUserId: string): Promise<void> => {
    // 1. Verify Requestor is Admin of this family (Optimistically or Security Rules will enforce)
    // Security rules should enforce "request.auth.uid in resource.data.adminIds"

    const batch = writeBatch(db);
    const teenRef = doc(db, 'users', teenUserId);

    batch.update(teenRef, {
        status: 'active',
        approvedAt: serverTimestamp(),
        approvedBy: adminUserId
    });

    await batch.commit();
};

export const approveFamilyBeta = async (familyId: string, appAdminId: string): Promise<void> => {
    const familyRef = doc(db, 'familyCircles', familyId);
    const familyDoc = await getDoc(familyRef);

    if (!familyDoc.exists()) throw new Error("Family not found");

    const data = familyDoc.data() as FamilyCircle;
    // Find the creator/admin. Usually the first one in adminIds or just handle all current admins.
    // For simplicity, let's look for the first adminId
    const creatorId = data.adminIds?.[0];

    const batch = writeBatch(db);

    // 1. Approve Family
    batch.update(familyRef, { betaApproved: true });

    // 2. Approve Creator
    if (creatorId) {
        batch.update(doc(db, 'users', creatorId), {
            status: 'active',
            approvedAt: serverTimestamp(),
            approvedBy: appAdminId // 'AppAdmin' or specific ID
        });
    }

    await batch.commit();
};

// Note: onFamilyCircleUpdate was in firebaseService.ts but logic was slightly mixed with chatName.
// I'll put it here.
import { onSnapshot } from "firebase/firestore";

export const onFamilyCircleUpdate = (
    familyCircleId: string,
    callback: (circle: FamilyCircle | null) => void,
    onError?: (error: any) => void
): (() => void) => {
    const circleRef = doc(db, 'familyCircles', familyCircleId);
    return onSnapshot(
        circleRef,
        async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const circleData = docSnapshot.data() as { name: string; inviteCode: string; memberIds: string[], chatName?: string, messageCount?: number, avatarUrl?: string, motto?: string, adminIds?: string[] };

                // We need to fetch member details to construct the full FamilyCircle object
                // This is a bit expensive to do on every update, but necessary if we want the full object.
                let members: User[] = [];
                if (circleData.memberIds?.length) {
                    const membersQuery = query(collection(db, 'users'), where(documentId(), 'in', circleData.memberIds));
                    const membersSnapshot = await getDocs(membersQuery);
                    members = membersSnapshot.docs.map(mapUserSnapshot);
                }

                const circle: FamilyCircle = {
                    id: docSnapshot.id,
                    name: circleData.name,
                    chatName: circleData.chatName,
                    inviteCode: circleData.inviteCode,
                    members,
                    messageCount: circleData.messageCount || 0,
                    avatarUrl: circleData.avatarUrl,
                    motto: circleData.motto,
                    adminIds: circleData.adminIds || [],
                };
                callback(circle);
            } else {
                callback(null);
            }
        },
        (error) => {
            console.warn("[FamilyService] onFamilyCircleUpdate blocked:", error.code || error.message);
            if (onError) onError(error);
        }
    );
};
export const updateFamilyProfile = async (familyId: string, data: { avatarUrl?: string; motto?: string }): Promise<void> => {
    const familyRef = doc(db, 'familyCircles', familyId);
    await updateDoc(familyRef, data);
};

export const promoteToAdmin = async (familyId: string, userId: string): Promise<void> => {
    const familyRef = doc(db, 'familyCircles', familyId);
    await updateDoc(familyRef, {
        adminIds: arrayUnion(userId)
    });
};

export const removeFromFamily = async (familyId: string, userId: string): Promise<void> => {
    const batch = writeBatch(db);
    const familyRef = doc(db, 'familyCircles', familyId);
    const userRef = doc(db, 'users', userId);

    batch.update(familyRef, {
        memberIds: arrayRemove(userId),
        adminIds: arrayRemove(userId),
        [`members.${userId}`]: deleteField(),
    });
    batch.update(userRef, {
        familyCircleId: deleteField()
    });

    await batch.commit();
};

export const createChildProfile = async (
    parentId: string,
    familyId: string,
    name: string,
    birthDate: Date
): Promise<User> => {

    const childRef = doc(collection(db, "users"));

    const newChildData: Omit<User, "id" | "emailVerified"> = {
        name,
        role: "child",
        birthDate,
        parentId,
        familyCircleId: familyId,
        avatarUpdatedAt: new Date(),
        streak: 0,
        lastActiveDate: new Date(),
        badges: [],
        weightUnit: "lbs",
        weightHistory: [],
        notificationTokens: [],
    };

    const batch = writeBatch(db);

    batch.set(childRef, newChildData);

    const familyRef = doc(db, "familyCircles", familyId);
    batch.update(familyRef, {
        memberIds: arrayUnion(childRef.id),
        [`members.${childRef.id}`]: true,
    });

    await batch.commit();

    return {
        id: childRef.id,
        ...newChildData,
        emailVerified: false,
    } as User;
};
