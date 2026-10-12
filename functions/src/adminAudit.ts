import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { db } from './init';

export function requireAppAdmin(context: functions.https.CallableContext): string {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Please sign in.');
    if (context.auth.token.admin !== true) throw new functions.https.HttpsError('permission-denied', 'Only an app administrator can perform this action.');
    return context.auth.uid;
}

export function auditAction(transaction: FirebaseFirestore.Transaction, actorId: string, action: string, targetId: string, details: Record<string, unknown> = {}): void {
    transaction.set(db.collection('adminAudit').doc(), {
        actorId, action, targetId, details, timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}
