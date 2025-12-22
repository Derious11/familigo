import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where, // <--- CRITICAL IMPORT
    addDoc,
    getDocs,
    serverTimestamp,
    onSnapshot,
    orderBy,
    writeBatch,
    increment,
    Timestamp,
    arrayUnion,
} from "firebase/firestore";
import { db } from '../firebaseConfig';
import { User, Challenge, Reply, Exercise } from '../types';
import { getUserTokens, addXp } from './userService';
import { sendPushNotification } from "./webPushService";

const normalizeAvatarMetadata = <T extends { avatarUpdatedAt?: any }>(entity: T) => {
    if (!entity) return entity;
    const avatarUpdatedAt =
        entity.avatarUpdatedAt instanceof Timestamp
            ? entity.avatarUpdatedAt.toDate()
            : entity.avatarUpdatedAt;
    return { ...entity, avatarUpdatedAt };
};

export const getExercises = async (): Promise<Exercise[]> => {
    const exercisesCol = collection(db, 'exercises');
    const q = query(exercisesCol, orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Exercise);
};

export const onChallengesUpdate = (familyCircleId: string, callback: (challenges: Challenge[]) => void, onError?: (error: Error) => void): (() => void) => {
    // SECURITY FIX: Added where('familyCircleId', '==', familyCircleId)
    const q = query(
        collection(db, 'challenges'),
        where('familyCircleId', '==', familyCircleId),
        // orderBy('timestamp', 'desc') // Ensure you have an index for familyCircleId + timestamp
    );

    return onSnapshot(q, (querySnapshot) => {
        const challenges = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp as Timestamp | null;
            const expiresAt = data.expiresAt as Timestamp | null;
            return {
                id: doc.id,
                ...data,
                challenger: normalizeAvatarMetadata(data.challenger),
                timestamp: timestamp ? timestamp.toDate() : new Date(),
                expiresAt: expiresAt ? expiresAt.toDate() : new Date(Date.now() + 48 * 60 * 60 * 1000),
                completedBy: data.completedBy || [],
            } as Challenge
        });
        // Client-side sort is safer if index is missing
        challenges.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        callback(challenges);
    }, (error) => {
        console.error("[ChallengeService] Snapshot error:", error);
        if (onError) onError(error);
    });
};

// SECURITY FIX: Added familyCircleId parameter
export const onRepliesUpdate = (challengeId: string, familyCircleId: string, callback: (replies: Reply[]) => void): (() => void) => {
    // SECURITY FIX: Must filter by familyCircleId to satisfy rules
    const q = query(
        collection(db, 'replies'),
        where('challengeId', '==', challengeId),
        where('familyCircleId', '==', familyCircleId)
    );

    return onSnapshot(q, (querySnapshot) => {
        const replies = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp as Timestamp | null;
            return {
                id: doc.id,
                ...data,
                user: normalizeAvatarMetadata(data.user),
                timestamp: timestamp ? timestamp.toDate() : new Date(),
            } as Reply
        });
        replies.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        callback(replies);
    });
};

export const addChallengeToFamily = async (
    challenger: User,
    familyCircleId: string,
    exercise: Exercise,
    target: string,
    mediaUrl?: string,
    type: 'individual' | 'team' = 'individual',
    goalTotal?: number,
    unit?: string,
    durationDays: number = 2
) => {
    const batch = writeBatch(db);
    const challengesRef = collection(db, 'challenges');

    const userChallengesQuery = query(
        challengesRef,
        where('challenger.id', '==', challenger.id),
        where('familyCircleId', '==', familyCircleId)
    );
    const userChallengesSnapshot = await getDocs(userChallengesQuery);
    const isFirstChallenge = userChallengesSnapshot.empty;

    const expirationDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const newChallenge: any = {
        challenger: {
            id: challenger.id,
            name: challenger.name,
        },
        familyCircleId, // This field allows the Read/Write
        exercise,
        target,
        type,
        mediaUrl: mediaUrl || exercise.visualGuideUrl,
        timestamp: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expirationDate),
        completedBy: [],
    };

    if (type === 'team') {
        newChallenge.goalTotal = goalTotal;
        newChallenge.currentTotal = 0;
        newChallenge.unit = unit;
    }
    const newChallengeRef = doc(challengesRef);
    batch.set(newChallengeRef, newChallenge);

    if (isFirstChallenge) {
        const userDocRef = doc(db, 'users', challenger.id);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentBadges = userData.badges || [];
            const isBadgeUnlocked = currentBadges.some((b: any) => b.id === 'b1' && b.unlocked);

            if (!isBadgeUnlocked) {
                const updatedBadges = currentBadges.map((badge: any) => {
                    if (badge.id === 'b1') {
                        return { ...badge, unlocked: true };
                    }
                    return badge;
                });
                batch.update(userDocRef, { badges: updatedBadges });
            }
        }
    }

    await batch.commit();
};

export const addReplyToChallenge = async (
    user: User,
    challengeId: string,
    familyCircleId: string,
    mediaUrl?: string,
    text?: string,
    parentId?: string,
    isCompletion: boolean = false,
    contributionValue?: number
) => {
    const batch = writeBatch(db);

    const replyRef = doc(collection(db, 'replies'));
    const newReply: any = {
        user: {
            id: user.id,
            name: user.name,
        },
        challengeId,
        familyCircleId, // Essential for Security Rules
        reactions: {},
        timestamp: serverTimestamp(),
    };
    if (text) newReply.text = text;
    if (mediaUrl) newReply.mediaUrl = mediaUrl;
    if (parentId) newReply.parentId = parentId;
    if (contributionValue) newReply.contributionValue = contributionValue;

    batch.set(replyRef, newReply);

    const challengeRef = doc(db, 'challenges', challengeId);

    if (isCompletion) {
        batch.update(challengeRef, {
            completedBy: arrayUnion(user.id)
        });
    }

    if (contributionValue) {
        batch.update(challengeRef, {
            currentTotal: increment(contributionValue)
        });
    }

    await batch.commit();

    let xpAmount = 10;
    if (contributionValue) {
        xpAmount += contributionValue;
    }
    await addXp(user.id, xpAmount);
};

// SECURITY FIX: Added familyCircleId parameter
export const deleteReply = async (replyId: string, familyCircleId: string): Promise<void> => {
    // SECURITY FIX: Must filter children by familyCircleId too
    const childrenQuery = query(
        collection(db, 'replies'),
        where('parentId', '==', replyId),
        where('familyCircleId', '==', familyCircleId)
    );
    const childrenSnapshot = await getDocs(childrenQuery);

    const batch = writeBatch(db);

    if (!childrenSnapshot.empty) {
        for (const childDoc of childrenSnapshot.docs) {
            batch.delete(childDoc.ref);
        }
    }

    const replyRef = doc(db, 'replies', replyId);
    batch.delete(replyRef);

    await batch.commit();
};

// SECURITY FIX: Added familyCircleId parameter
export const deleteChallengeAndReplies = async (challengeId: string, familyCircleId: string): Promise<void> => {
    const batch = writeBatch(db);

    // 1. Delete the challenge
    const challengeRef = doc(db, 'challenges', challengeId);
    batch.delete(challengeRef);

    // 2. Delete replies (SECURELY)
    const repliesQuery = query(
        collection(db, 'replies'),
        where('challengeId', '==', challengeId),
        where('familyCircleId', '==', familyCircleId) // <--- THIS WAS THE MISSING KEY
    );

    const repliesSnapshot = await getDocs(repliesQuery);
    repliesSnapshot.forEach(replyDoc => {
        batch.delete(replyDoc.ref);
    });

    await batch.commit();
};

export const updateReaction = async (replyId: string, emoji: string) => {
    const replyRef = doc(db, 'replies', replyId);
    await updateDoc(replyRef, {
        [`reactions.${emoji}`]: increment(1)
    });
};

export const getRepliesForFamily = async (familyCircleId: string): Promise<Reply[]> => {
    const q = query(collection(db, 'replies'), where('familyCircleId', '==', familyCircleId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reply));
};
