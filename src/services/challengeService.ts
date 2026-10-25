import { doc, collection, query, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
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
import { User, Exercise } from '../types';



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
const deleteContent = async (kind: 'reply' | 'challenge', targetId: string, familyCircleId: string): Promise<void> => {
    if (!navigator.onLine) throw new Error('Reconnect before deleting content.');
    const {jobId} = await achievementCall<{jobId:string}>('deleteFamilyContent', {kind, targetId, familyCircleId});
    await new Promise<void>((resolve, reject) => {
        let unsubscribe = () => {};
        const timeout = window.setTimeout(() => { unsubscribe(); reject(new Error('Deletion is still processing. Retry to check its status.')); }, 60000);
        unsubscribe = onSnapshot(doc(db,'contentDeletionJobs',jobId), snapshot => {
            if (snapshot.data()?.status === 'complete') { window.clearTimeout(timeout); unsubscribe(); resolve(); }
        }, error => { window.clearTimeout(timeout); unsubscribe(); reject(error); });
    });
};
export const deleteReply = (replyId: string, familyCircleId: string) => deleteContent('reply',replyId,familyCircleId);
export const deleteChallengeAndReplies = (challengeId: string, familyCircleId: string) => deleteContent('challenge',challengeId,familyCircleId);

export const updateReaction = async (replyId: string, emoji: string, actorId: string, familyCircleId: string) =>
    achievementCall('recordChallengeReaction', {replyId, emoji, actorId, familyCircleId});
