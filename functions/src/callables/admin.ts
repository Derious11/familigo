import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { db } from '../init';
import { auditAction, requireAppAdmin } from '../adminAudit';

function documentId(value: unknown): string {
    if (typeof value !== 'string' || !value || value.includes('/') || value.length > 1500) {
        throw new functions.https.HttpsError('invalid-argument', 'A valid record ID is required.');
    }
    return value;
}

export const approveWaitlistUsers = functions.https.onCall(async (data, context) => {
    const actorId = requireAppAdmin(context);
    if (!Array.isArray(data?.userIds) || data.userIds.length < 1 || data.userIds.length > 50) {
        throw new functions.https.HttpsError('invalid-argument', 'Select between 1 and 50 accounts.');
    }
    const ids: string[] = [...new Set<string>(data.userIds.map(documentId))];
    return db.runTransaction(async transaction => {
        const refs = ids.map(id => db.collection('users').doc(id));
        const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
        const approved: string[] = [];
        const skipped: string[] = [];
        snapshots.forEach((snapshot, index) => {
            if (!snapshot.exists || snapshot.data()?.status !== 'pending_approval') {
                skipped.push(ids[index]);
                return;
            }
            transaction.update(refs[index], { status: 'active', approvedAt: admin.firestore.FieldValue.serverTimestamp(), approvedBy: actorId });
            auditAction(transaction, actorId, 'account_approved', ids[index]);
            approved.push(ids[index]);
        });
        return { approved, skipped };
    });
});

export const revokeAccessInvite = functions.https.onCall(async (data, context) => {
    const actorId = requireAppAdmin(context);
    const ref = db.collection('accessInvites').doc(documentId(data?.inviteId));
    await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        const invite = snapshot.data();
        if (!invite) throw new functions.https.HttpsError('not-found', 'Invitation not found.');
        if (invite.claimedBy) throw new functions.https.HttpsError('failed-precondition', 'This invitation has been redeemed. Revoking it cannot remove an existing account’s access.');
        if (invite.revokedAt) return;
        transaction.update(ref, { revokedAt: admin.firestore.FieldValue.serverTimestamp(), revokedBy: actorId });
        auditAction(transaction, actorId, 'invite_revoked', ref.id, { email: invite.email });
    });
    return { success: true };
});

export const updateAdminFeedback = functions.https.onCall(async (data, context) => {
    const actorId = requireAppAdmin(context);
    const id = documentId(data?.feedbackId);
    if (!['new', 'investigating', 'resolved'].includes(data?.status) || typeof data?.internalNotes !== 'string' || data.internalNotes.length > 5000) {
        throw new functions.https.HttpsError('invalid-argument', 'Select a feedback status and keep notes under 5,000 characters.');
    }
    await db.runTransaction(async transaction => {
        const feedback = await transaction.get(db.collection('feedback').doc(id));
        if (!feedback.exists) throw new functions.https.HttpsError('not-found', 'Feedback not found.');
        transaction.set(db.collection('adminFeedback').doc(id), {
            status: data.status, internalNotes: data.internalNotes.trim(), updatedBy: actorId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Note contents stay out of the activity log.
        auditAction(transaction, actorId, 'feedback_updated', id, { status: data.status });
    });
    return { success: true };
});
