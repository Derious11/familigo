import * as functions from 'firebase-functions/v1';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from '../init';
import {canAct} from '../achievements/backend';

const identifier = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid content identifier.');
  }
  return value;
};

// Keep the challenge locked until the durable, bounded cascade finishes.
// Creating replies/reactions reads this same document in a transaction.
export const deleteFamilyContent = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  const uid = context.auth.uid;
  const targetId = identifier(data?.targetId);
  const familyId = identifier(data?.familyCircleId);
  const kind = data?.kind;
  if (!['challenge', 'reply'].includes(kind)) throw new functions.https.HttpsError('invalid-argument', 'Invalid content type.');
  const jobId = `${kind}_${targetId}`;
  const jobRef = db.collection('contentDeletionJobs').doc(jobId);
  return db.runTransaction(async tx => {
    const existing = await tx.get(jobRef);
    if (existing.exists) {
      if (existing.data()!.requestedBy !== uid || existing.data()!.familyId !== familyId) {
        throw new functions.https.HttpsError('permission-denied', 'This deletion belongs to another account.');
      }
      return {jobId};
    }
    const targetRef = db.collection(kind === 'challenge' ? 'challenges' : 'replies').doc(targetId);
    const target = (await tx.get(targetRef)).data();
    if (!target || target.familyCircleId !== familyId) throw new functions.https.HttpsError('not-found', 'Content unavailable.');
    const challengeId = kind === 'challenge' ? targetId : identifier(target.challengeId);
    const challengeRef = db.collection('challenges').doc(challengeId);
    const challenge = kind === 'challenge' ? target : (await tx.get(challengeRef)).data();
    if (!challenge || challenge.familyCircleId !== familyId) throw new functions.https.HttpsError('not-found', 'Challenge unavailable.');
    const authorId = identifier(kind === 'challenge' ? target.challenger?.id : target.user?.id);
    const [authorSnap, familySnap, callerSnap] = await Promise.all([
      tx.get(db.collection('users').doc(authorId)), tx.get(db.collection('familyCircles').doc(familyId)), tx.get(db.collection('users').doc(uid)),
    ]);
    const author = authorSnap.data(); const family = familySnap.data(); const caller = callerSnap.data();
    if (!author || !family || !caller || caller.status !== 'active' ||
      !canAct(uid, authorId, author, familyId, family) ||
      (uid !== authorId && caller.role !== 'adult')) {
      throw new functions.https.HttpsError('permission-denied', 'Only the author or their active parent may delete this content.');
    }
    if (challenge.deletingJobId) throw new functions.https.HttpsError('failed-precondition', 'Another deletion is in progress. Please try again.');
    tx.update(challengeRef, {deletingJobId: jobId});
    tx.create(jobRef, {kind, targetId, challengeId, familyId, requestedBy: uid, step: 0, status: 'pending', createdAt: FieldValue.serverTimestamp()});
    if (kind === 'reply') tx.create(jobRef.collection('tasks').doc(targetId), {parentId: targetId});
    return {jobId};
  });
});

// Exported separately for emulator tests. The transaction prevents duplicate
// trigger deliveries from racing a completion or reopening a finished job.
export async function processDeletionStep(jobId: string, expectedStep: number): Promise<void> {
  const jobRef = db.collection('contentDeletionJobs').doc(jobId);
  await db.runTransaction(async tx => {
    const job = (await tx.get(jobRef)).data();
    if (!job || job.status !== 'pending' || job.step !== expectedStep) return;
    const challengeRef = db.collection('challenges').doc(job.challengeId);
    const challenge = (await tx.get(challengeRef)).data();
    if (challenge?.deletingJobId !== jobId) throw new Error('Deletion lock is missing.');
    const tasks = job.kind === 'reply' ? await tx.get(jobRef.collection('tasks').limit(1)) : null;
    const task = tasks?.docs[0];
    const rows = job.kind === 'challenge' || task ? await tx.get(
      db.collection('replies').where('familyCircleId', '==', job.familyId)
        .where(job.kind === 'challenge' ? 'challengeId' : 'parentId', '==', job.kind === 'challenge' ? job.challengeId : task!.id).limit(100),
    ) : null;
    if (rows && !rows.empty) {
      for (const row of rows.docs) {
        if (row.data().challengeId !== job.challengeId) throw new Error('Reply belongs to another challenge.');
        if (job.kind === 'reply') tx.set(jobRef.collection('tasks').doc(row.id), {parentId: row.id});
        tx.delete(row.ref);
      }
    } else if (task) {
      tx.delete(task.ref);
    } else {
      if (job.kind === 'challenge') tx.delete(challengeRef);
      else {
        tx.delete(db.collection('replies').doc(job.targetId));
        tx.update(challengeRef, {deletingJobId: FieldValue.delete()});
      }
      tx.update(jobRef, {status: 'complete', completedAt: FieldValue.serverTimestamp()});
      return;
    }
    tx.update(jobRef, {step: job.step + 1});
  });
}

export const continueContentDeletion = functions.runWith({failurePolicy: true}).firestore
  .document('contentDeletionJobs/{jobId}').onWrite(async change => {
    const job = change.after.data();
    if (job?.status === 'pending') await processDeletionStep(change.after.id, job.step);
  });
