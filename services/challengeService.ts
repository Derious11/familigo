import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
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
import { sendPushNotification } from "./pushNotificationService";

export const getExercises = async (): Promise<Exercise[]> => {
    const exercisesCol = collection(db, 'exercises');
    const q = query(exercisesCol, orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Exercise);
};

export const onChallengesUpdate = (familyCircleId: string, callback: (challenges: Challenge[]) => void): (() => void) => {
    const q = query(collection(db, 'challenges'), where('familyCircleId', '==', familyCircleId));

    return onSnapshot(q, (querySnapshot) => {
        const challenges = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp as Timestamp | null;
            const expiresAt = data.expiresAt as Timestamp | null;
            return {
                id: doc.id,
                ...data,
                timestamp: timestamp ? timestamp.toDate() : new Date(),
                expiresAt: expiresAt ? expiresAt.toDate() : new Date(Date.now() + 48 * 60 * 60 * 1000), // Fallback
                completedBy: data.completedBy || [],
            } as Challenge
        });
        challenges.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        callback(challenges);
    });
};

export const onRepliesUpdate = (challengeId: string, callback: (replies: Reply[]) => void): (() => void) => {
    const q = query(collection(db, 'replies'), where('challengeId', '==', challengeId));

    return onSnapshot(q, (querySnapshot) => {
        const replies = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp as Timestamp | null;
            return {
                id: doc.id,
                ...data,
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

    const userChallengesQuery = query(challengesRef, where('challenger.id', '==', challenger.id));
    const userChallengesSnapshot = await getDocs(userChallengesQuery);
    const isFirstChallenge = userChallengesSnapshot.empty;

    const expirationDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const newChallenge: any = {
        challenger: {
            id: challenger.id,
            name: challenger.name,
            avatarUrl: challenger.avatarUrl
        },
        familyCircleId,
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

    // Send notifications to other family members
    // Notifications are now handled by Cloud Functions
    // const circleDoc = await getDoc(doc(db, 'familyCircles', familyCircleId));
    // if (circleDoc.exists()) {
    //     const memberIds = circleDoc.data().memberIds as string[];
    //     const recipientIds = memberIds.filter(id => id !== challenger.id);
    //     const tokens = await getUserTokens(recipientIds);
    //     if (tokens.length > 0) {
    //         sendPushNotification(tokens, 'New Challenge!', `${challenger.name} challenged you to ${exercise.name}!`);
    //     }
    // }
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
            avatarUrl: user.avatarUrl,
        },
        challengeId,
        familyCircleId,
        reactions: {},
        timestamp: serverTimestamp(),
    };
    if (text) newReply.text = text;
    if (mediaUrl) newReply.mediaUrl = mediaUrl;
    if (parentId) newReply.parentId = parentId;
    if (contributionValue) newReply.contributionValue = contributionValue;

    batch.set(replyRef, newReply);

    const challengeRef = doc(db, 'challenges', challengeId);

    // Only mark challenge as completed if it's an explicit completion action
    if (isCompletion) {
        batch.update(challengeRef, {
            completedBy: arrayUnion(user.id)
        });
    }

    // If there is a contribution value, update the challenge total
    if (contributionValue) {
        batch.update(challengeRef, {
            currentTotal: increment(contributionValue)
        });
    }

    await batch.commit();

    // Award XP to the user
    // +10 XP for a reply
    // +1 XP per unit if contributionValue is present
    let xpAmount = 10;
    if (contributionValue) {
        xpAmount += contributionValue; // Simple 1:1 ratio for now, can be tuned
    }
    await addXp(user.id, xpAmount);
};

export const deleteReply = async (replyId: string): Promise<void> => {
    // First, find all children of this reply
    const childrenQuery = query(collection(db, 'replies'), where('parentId', '==', replyId));
    const childrenSnapshot = await getDocs(childrenQuery);

    const batch = writeBatch(db);

    // Delete all children recursively
    if (!childrenSnapshot.empty) {
        for (const childDoc of childrenSnapshot.docs) {
            // This simple implementation deletes direct children.
            // For deeply nested replies, a more complex recursive function would be needed.
            // For this app's scope, deleting one level down is sufficient.
            batch.delete(childDoc.ref);
        }
    }

    // Then delete the parent reply itself
    const replyRef = doc(db, 'replies', replyId);
    batch.delete(replyRef);

    await batch.commit();
};


export const deleteChallengeAndReplies = async (challengeId: string): Promise<void> => {
    const batch = writeBatch(db);

    // 1. Delete the challenge document
    const challengeRef = doc(db, 'challenges', challengeId);
    batch.delete(challengeRef);

    // 2. Find and delete all associated replies
    const repliesQuery = query(collection(db, 'replies'), where('challengeId', '==', challengeId));
    const repliesSnapshot = await getDocs(repliesQuery);
    repliesSnapshot.forEach(replyDoc => {
        batch.delete(replyDoc.ref);
    });

    // 3. Commit the batch
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
