import { collection, doc, documentId, FirestoreError, onSnapshot, query, runTransaction, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User } from '../types';

export interface WeeklyAdventure {
    target: number;
    trailTarget: number;
    startsAt: Timestamp;
    endsAt: Timestamp;
    createdBy: string;
}
export function watchAdventure(familyId: string, weekId: string, next: (adventure: WeeklyAdventure | null) => void, error: (error: FirestoreError) => void) {
    return onSnapshot(doc(db, 'familyCircles', familyId, 'weeklyAdventures', weekId), snapshot => next(snapshot.exists() ? snapshot.data() as WeeklyAdventure : null), error);
}
export async function startAdventure(familyId: string, week: { id: string; start: Date; end: Date }, target: number, memberCount: number, actorId: string) {
    if (!Number.isInteger(target) || target < 7 || target > 100000) throw new Error('Choose a whole-number goal between 7 and 100,000.');
    const ref = doc(db, 'familyCircles', familyId, 'weeklyAdventures', week.id);
    await runTransaction(db, async transaction => {
        if ((await transaction.get(ref)).exists()) throw new Error('Your family has already started this week’s adventure.');
        transaction.set(ref, { target, trailTarget: Math.ceil(target / Math.max(1, memberCount)), startsAt: Timestamp.fromDate(week.start), endsAt: Timestamp.fromDate(week.end), createdBy: actorId, createdAt: serverTimestamp() });
    });
}
export function watchLeaderboardMembers(memberIds: string[], next: (members: User[]) => void, error: (error: FirestoreError) => void) {
    if (!memberIds.length) { next([]); return () => {}; }
    // Firestore permits up to 30 IDs per disjunction; keep large family circles supported.
    const batches = Array.from({ length: Math.ceil(memberIds.length / 30) }, (_, i) => memberIds.slice(i * 30, i * 30 + 30));
    const results = new Map<number, User[]>();
    const unsubscribes = batches.map((ids, index) => onSnapshot(query(collection(db, 'users'), where(documentId(), 'in', ids)), snapshot => {
        results.set(index, snapshot.docs.map(item => ({ ...item.data(), id: item.id, avatarUpdatedAt: item.data().avatarUpdatedAt?.toDate?.() } as User)));
        if (results.size === batches.length) next([...results.values()].flat());
    }, error));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
}
