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
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from '../firebaseConfig';
import { User, FamilyCircle } from '../types';
import { getBadges } from './userService';
import { ADVENTURE_THEMES } from '../lib/adventureThemes.mjs';

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

    const circleData = circleDoc.data() as { name: string; inviteCode: string; memberIds: string[], chatName?: string, messageCount?: number, avatarUrl?: string, motto?: string, adminIds?: string[], adventureTheme?: FamilyCircle['adventureTheme'] };

    let members: User[] = [];
    if (circleData.memberIds?.length) {
        const ids = [...new Set(circleData.memberIds)];
        const batches: string[][] = [];
        for (let i = 0; i < ids.length; i += 30) batches.push(ids.slice(i, i + 30));
        const snapshots = await Promise.all(batches.map(batch => getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch)))));
        members = snapshots.flatMap(snapshot => snapshot.docs.map(mapUserSnapshot));
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
        adminIds: circleData.adminIds || [],
        adventureTheme: circleData.adventureTheme,
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
        betaApproved: creator.familyCreationApproved === true,
    };

    // Bootstrap membership atomically so rules can validate the new circle with getAfter.
    const circleRef = doc(collection(db, "familyCircles"));
    const batch = writeBatch(db);
    batch.set(circleRef, newCircleData);
    batch.update(doc(db, 'users', userId), { familyCircleId: circleRef.id });
    await batch.commit();

    return {
        id: circleRef.id,
        ...newCircleData,
        members: [creator],
    };
};

export const joinFamilyCircle = async (inviteCode: string): Promise<{ circle: FamilyCircle | null, error: string | null }> => {
    try {
        const functions = getFunctions();
        const joinFamilyFn = httpsCallable(functions, 'joinFamily');

        const result: any = await joinFamilyFn({ inviteCode });

        if (result.data.success) {
            const familyCircle = await getUserFamilyCircle(result.data.familyId);
            return { circle: familyCircle, error: null };
        } else {
            return { circle: null, error: result.data.message || "Failed to join family." };
        }
    } catch (error: any) {
        console.error("Error joining family:", error);
        return { circle: null, error: error.message || "Failed to join family." };
    }
};

export const redeemTeenInvite = async (inviteCode: string): Promise<{ success: boolean; error: string | null }> => {
    try {
        const functions = getFunctions();
        const redeemInviteFn = httpsCallable(functions, 'redeemTeenInvite');

        const result: any = await redeemInviteFn({ inviteCode });
        if (result.data?.success) {
            return { success: true, error: null };
        }
        return { success: false, error: result.data?.message || "Failed to redeem invite." };
    } catch (e: any) {
        console.error("Redeem Invite Error", e);
        return { success: false, error: e.message || "Failed to redeem invite." };
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
    let stopped = false;
    let memberKey = '';
    let memberUnsubscribes: (() => void)[] = [];
    let memberBatches: User[][] = [];
    let circleData: any = null;
    const emit = () => {
        if (!stopped && circleData && memberBatches.every(Boolean)) callback({
            ...circleData, id:familyCircleId, members:memberBatches.flat(),
            messageCount:circleData.messageCount || 0, adminIds:circleData.adminIds || [],
        });
    };
    const fail = (error: any) => { if (!stopped) onError?.(error); };
    const unsubscribe = onSnapshot(doc(db,'familyCircles',familyCircleId), snapshot => {
        if (stopped) return;
        if (!snapshot.exists()) { memberUnsubscribes.forEach(stop=>stop()); memberUnsubscribes=[]; memberKey=''; circleData=null; callback(null); return; }
        circleData = snapshot.data();
        const ids: string[] = [...new Set<string>(circleData.memberIds || [])].sort();
        const key = JSON.stringify(ids);
        if (key !== memberKey) {
            memberUnsubscribes.forEach(stop=>stop());
            memberUnsubscribes=[];
            memberKey=key;
            const batches: string[][]=[];
            for (let i=0;i<ids.length;i+=30) batches.push(ids.slice(i,i+30));
            memberBatches=Array(batches.length).fill(null);
            memberUnsubscribes=batches.map((batch,index)=>onSnapshot(query(collection(db,'users'),where(documentId(),'in',batch)), members=>{
                if (stopped || memberKey !== key) return;
                memberBatches[index]=members.docs.map(mapUserSnapshot);
                emit();
            }, fail));
        }
        emit();
    }, fail);
    return () => { stopped=true; unsubscribe(); memberUnsubscribes.forEach(stop=>stop()); };
};
export const updateFamilyProfile = async (familyId: string, data: { avatarUrl?: string; motto?: string }): Promise<void> => {
    const familyRef = doc(db, 'familyCircles', familyId);
    await updateDoc(familyRef, data);
};
export async function updateFamilyAdventureTheme(familyId: string, themeId: string): Promise<void> {
    if (!ADVENTURE_THEMES.some(theme => theme.id === themeId)) throw new Error('Choose one of the four adventure themes.');
    await updateDoc(doc(db, 'familyCircles', familyId), { adventureTheme: themeId });
}

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
        hasAvatar: false,
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
