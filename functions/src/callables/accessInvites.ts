import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { createHash, randomBytes } from 'crypto';
import { Resend } from 'resend';
import { db, getAppBaseUrl } from '../init';
import { normalizeInviteEmail } from '../invitePolicy';
import { auditAction, requireAppAdmin } from '../adminAudit';

const resendApiKey = defineSecret('RESEND_API_KEY');

export const sendAccessInvite = functions.runWith({ secrets: [resendApiKey] }).https.onCall(async (data, context) => {
    const actorId = requireAppAdmin(context);
    const email = normalizeInviteEmail(data?.email);
    const ref = db.collection('accessInvites').doc(createHash('sha256').update(email).digest('hex'));
    const key = resendApiKey.value();
    if (!key) throw new functions.https.HttpsError('failed-precondition', 'Email service is not configured.');
    const invite = await db.runTransaction(async transaction => {
        const existing = (await transaction.get(ref)).data();
        if (existing?.claimedBy) throw new functions.https.HttpsError('already-exists', 'This recipient has already redeemed an invitation.');
        if (existing && !existing.revokedAt && existing.expiresAt.toMillis() > Date.now()) {
            if (data?.resend === true && existing.deliveryStatus === 'sent') {
                const sendAttemptId = randomBytes(12).toString('hex');
                transaction.update(ref, { sendAttemptId, deliveryStatus: 'pending' });
                auditAction(transaction, actorId, 'invite_resend_requested', ref.id, { email });
                return { ...existing, sendAttemptId };
            }
            return existing;
        }
        const record = {
            email, code: randomBytes(12).toString('hex').toUpperCase(), invitedBy: actorId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 14 * 86400000), deliveryStatus: 'pending', sendAttemptId: 'initial',
        };
        transaction.set(ref, record);
        auditAction(transaction, actorId, 'invite_created', ref.id, { email });
        return record;
    });
    try {
        const { error, data: result } = await new Resend(key).emails.send({
            from: 'FamiliGo <noreply@familigo.life>', to: email,
            subject: 'You’re pre-approved to create your FamiliGo family circle',
            text: `You're invited by the FamiliGo app admin to start your family! Your access is already approved.\n\nCreate your parent account here: ${getAppBaseUrl()}/early-access?accessCode=${invite.code}\n\nUse the email address that received this invitation. Your invite code is included in the link and will approve your account automatically during signup, then take you to create your family circle.\n\nYour invite code: ${invite.code}\n\nAlready have an account? Sign in at ${getAppBaseUrl()}/login and enter this code on the approval screen.\n\nThis code expires in 14 days from its original issue date.\n\nNeed help? Contact support@familigo.life.`,
        }, { idempotencyKey: `access-invite-${invite.code}-${invite.sendAttemptId || 'initial'}` });
        if (error) throw new Error('Email provider rejected the invitation.');
        // Preserve redemption state if the recipient claims while delivery completes.
        await db.runTransaction(async transaction => {
            const latest = (await transaction.get(ref)).data();
            if (latest?.code !== invite.code) return;
            transaction.update(ref, { deliveryStatus: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp(), messageId: result?.id || null });
            auditAction(transaction, actorId, 'invite_sent', ref.id, { email });
        });
    } catch {
        await db.runTransaction(async transaction => {
            const latest = (await transaction.get(ref)).data();
            if (latest?.code !== invite.code) return;
            transaction.update(ref, { deliveryStatus: 'failed' });
            auditAction(transaction, actorId, 'invite_delivery_failed', ref.id, { email });
        });
        throw new functions.https.HttpsError('internal', 'Could not confirm invitation delivery. Retry the same email address to reuse its code.');
    }
    return { success: true };
});

export const redeemAccessInvite = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Please sign in.');
    // Possession of the emailed code plus a matching authenticated email
    // authorizes the pre-approved invitation during signup.
    const email = normalizeInviteEmail(context.auth.token.email);
    const code = data?.code;
    if (typeof code !== 'string' || !/^[A-F0-9]{24}$/.test(code)) throw new functions.https.HttpsError('invalid-argument', 'Enter a valid invite code.');
    const inviteRef = db.collection('accessInvites').doc(createHash('sha256').update(email).digest('hex'));
    const userRef = db.collection('users').doc(context.auth.uid);
    await db.runTransaction(async transaction => {
        const [inviteSnap, userSnap] = await Promise.all([transaction.get(inviteRef), transaction.get(userRef)]);
        const invite = inviteSnap.data();
        const user = userSnap.data();
        if (!invite || invite.code !== code) throw new functions.https.HttpsError('not-found', 'This code does not match an invitation for your email address.');
        if (invite.revokedAt) throw new functions.https.HttpsError('failed-precondition', 'This invitation has been revoked. Please contact the app administrator.');
        if (invite.claimedBy === context.auth!.uid && user?.status === 'active') return;
        if (invite.claimedBy || invite.expiresAt.toMillis() <= Date.now()) throw new functions.https.HttpsError('failed-precondition', 'This invitation has expired or has already been used.');
        if (!user || user.role !== 'adult' || user.status !== 'pending_approval' || user.familyCircleId) throw new functions.https.HttpsError('failed-precondition', 'This invitation is for the first parent creating a new family circle.');
        transaction.update(userRef, { status: 'active', familyCreationApproved: true, approvedBy: invite.invitedBy, approvedAt: admin.firestore.FieldValue.serverTimestamp() });
        transaction.update(inviteRef, { claimedBy: context.auth!.uid, claimedAt: admin.firestore.FieldValue.serverTimestamp() });
        auditAction(transaction, context.auth!.uid, 'invite_redeemed', inviteRef.id, { invitedBy: invite.invitedBy });
    });
    return { success: true };
});
