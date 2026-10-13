import {
    doc,


    collection,
    query,
    where, // <--- CRITICAL IMPORT

    getDocs,

    onSnapshot,
    orderBy,
    writeBatch,

    Timestamp,

} from "firebase/firestore";
import { db } from '../firebaseConfig';
import {achievementCall} from './achievementService';

// A lost response must reuse its original request ID when the member retries.
const pendingRequests = new Map<string, string>();
const recordActivity = async (name: string, data: Record<string, unknown>) => {
    // Uploaded proof URLs can change on retry; they do not change the action.
    const {mediaUrl: _mediaUrl, ...identity} = data;
    const bytes = new TextEncoder().encode(JSON.stringify(identity));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
    const key = `familigo-request:${data.actorId}:${name}:${hash}`;
    let requestId = pendingRequests.get(key);
    try { requestId ||= localStorage.getItem(key) || undefined; } catch { /* Use memory if storage is unavailable. */ }
    requestId ||= doc(collection(db, 'challenges')).id;
    pendingRequests.set(key, requestId);
    try { localStorage.setItem(key, requestId); } catch { /* In-memory retries remain idempotent. */ }
    const result = await achievementCall(name, {...data, requestId});
    pendingRequests.delete(key);
    try { localStorage.removeItem(key); } catch { /* No effect on the committed action. */ }
    return result;
};
import { EXERCISES } from '../constants';
import { User, Challenge, Reply, Exercise } from '../types';



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
    const exercises = new Map(EXERCISES.map(exercise => [exercise.name.toLowerCase(), exercise]));
    snapshot.docs.forEach(doc => {
        const exercise = doc.data() as Exercise;
        const fallback = exercises.get(exercise.name.toLowerCase());
        exercises.set(exercise.name.toLowerCase(), {
            ...exercise,
            visualGuideUrl: fallback?.visualGuideUrl.startsWith('/assets/')
                ? fallback.visualGuideUrl
                : exercise.visualGuideUrl,
        });
    });
    return [...exercises.values()].sort((a, b) => a.name.localeCompare(b.name));
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
    challenger: User, familyCircleId: string, exercise: Exercise, target: string,
    mediaUrl?: string, type: 'individual' | 'team' = 'individual', goalTotal?: number,
    unit?: string, durationDays: number = 2
) => recordActivity('recordChallenge', {
    actorId: challenger.id, familyCircleId, exercise, target, mediaUrl: mediaUrl || exercise.visualGuideUrl,
    type, goalTotal: goalTotal || null, unit: unit || '', durationDays,
});

export const addReplyToChallenge = async (
    user: User, challengeId: string, familyCircleId: string, mediaUrl?: string,
    text?: string, parentId?: string, isCompletion = false, contributionValue?: number
) => recordActivity('recordChallengeReply', {
    actorId: user.id, challengeId, familyCircleId, mediaUrl: mediaUrl || '', text: text || '',
    parentId: parentId || '', isCompletion, contributionValue: contributionValue || 0,
});
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

export const updateReaction = async (replyId: string, emoji: string, actorId: string, familyCircleId: string) =>
    achievementCall('recordChallengeReaction', {replyId, emoji, actorId, familyCircleId});
export const getRepliesForFamily = async (familyCircleId: string): Promise<Reply[]> => {
    const q = query(collection(db, 'replies'), where('familyCircleId', '==', familyCircleId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reply));
};
