import { collection, getDocs, Timestamp, query, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebaseConfig';
import { User } from '../types';

export async function getAdminUsers(): Promise<User[]> {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id, createdAt: toDate(data.createdAt), lastActiveDate: toDate(data.lastActiveDate) } as User;
    });
}

export interface AccessInvite {
    id: string;
    email: string;
    code: string;
    status: 'pending' | 'sent' | 'failed' | 'claimed' | 'revoked';
    claimedBy?: string;
    createdAt?: Date;
    expiresAt: Date;
}

export async function getAccessInvites(): Promise<AccessInvite[]> {
    const snapshot = await getDocs(collection(db, 'accessInvites'));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, email: data.email, code: data.code, claimedBy: data.claimedBy, createdAt: toDate(data.createdAt), status: data.revokedAt ? 'revoked' : data.claimedBy ? 'claimed' : data.deliveryStatus, expiresAt: data.expiresAt.toDate() };
    }).sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());
}

export async function sendAccessInvite(email: string, resend = false): Promise<void> {
    await httpsCallable(getFunctions(), 'sendAccessInvite')({ email, resend });
}
export interface AchievementReconciliation {applied: boolean; members: number; newAwards: number; skippedCompletionDates: number}
export async function reconcileFamilyAchievements(familyCircleId: string, apply = false): Promise<AchievementReconciliation> {
    return (await httpsCallable<{familyCircleId: string; apply: boolean}, AchievementReconciliation>(getFunctions(), 'reconcileAchievements')({familyCircleId, apply})).data;
}

function toDate(value: unknown): Date | undefined {
    return value instanceof Timestamp ? value.toDate() : value instanceof Date ? value : undefined;
}

export interface AdminFamily {
    id: string;
    name: string;
    memberIds: string[];
    adminIds: string[];
    betaApproved: boolean;
}

export interface AdminChallenge {
    id: string;
    familyCircleId: string;
    completedBy: string[];
    type?: string;
    goalTotal?: number;
    currentTotal?: number;
    timestamp?: Date;
}

export interface AuditEvent {
    id: string;
    actorId: string;
    action: string;
    targetId: string;
    details?: { email?: string; status?: string; invitedBy?: string };
    timestamp?: Date;
}

export async function getAdminFamilies(): Promise<AdminFamily[]> {
    const snapshot = await getDocs(collection(db, 'familyCircles'));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, name: data.name || 'Unnamed family', memberIds: data.memberIds || [], adminIds: data.adminIds || [], betaApproved: data.betaApproved === true };
    });
}

export async function getAdminChallenges(): Promise<AdminChallenge[]> {
    const snapshot = await getDocs(collection(db, 'challenges'));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, familyCircleId: data.familyCircleId, completedBy: data.completedBy || [], type: data.type, goalTotal: data.goalTotal, currentTotal: data.currentTotal, timestamp: toDate(data.timestamp) };
    });
}

export async function getAdminAudit(): Promise<AuditEvent[]> {
    const snapshot = await getDocs(query(collection(db, 'adminAudit'), orderBy('timestamp', 'desc'), limit(200)));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, timestamp: toDate(doc.data().timestamp) } as AuditEvent));
}

export async function approveWaitlistUsers(userIds: string[]): Promise<{ approved: string[]; skipped: string[] }> {
    const result = await httpsCallable<{ userIds: string[] }, { approved: string[]; skipped: string[] }>(getFunctions(), 'approveWaitlistUsers')({ userIds });
    return result.data;
}

export async function revokeAccessInvite(inviteId: string): Promise<void> {
    await httpsCallable(getFunctions(), 'revokeAccessInvite')({ inviteId });
}

export async function updateAdminFeedback(feedbackId: string, status: string, internalNotes: string): Promise<void> {
    await httpsCallable(getFunctions(), 'updateAdminFeedback')({ feedbackId, status, internalNotes });
}

export async function redeemAccessInvite(code: string): Promise<void> {
    await httpsCallable(getFunctions(), 'redeemAccessInvite')({ code: code.trim().toUpperCase() });
}
