export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
}

export type UserRole = 'adult' | 'teen' | 'child';

export interface User {
    id: string;
    name: string;
    email?: string; // Optional for child accounts
    createdAt?: Date;
    isAdmin?: boolean; // From Firebase Custom Claims
    role?: UserRole;
    birthDate?: Date;
    parentId?: string; // For teens and children
    avatarUrl?: string;
    hasAvatar?: boolean;
    avatarUpdatedAt?: Date;
    streak: number;
    lastActiveDate?: Date;
    badges: Badge[];
    achievementCount?: number;
    familyCircleId?: string;
    emailVerified: boolean;
    currentWeight?: number;
    weightUnit?: 'lbs' | 'kg';
    weightHistory?: { value: number; timestamp: Date }[];
    notificationTokens?: string[];
    lastReadMessageCount?: number;
    coverPhotoUrl?: string;
    xp?: number;
    level?: number;
    activityMap?: Record<string, number>; // Date string (YYYY-MM-DD) -> count

    // Auth & Access Control
    status?: 'active' | 'pending_approval' | 'suspended';
    approvedAt?: any; // Firestore Timestamp
    approvedBy?: string;
    familyCreationApproved?: boolean; // Granted only by the app admin's invitation callable.
    earlyAccessData?: {
        kidCount?: number;
        kidAges?: string;
        parentEmail?: string;
        challengeTarget?: string;
    };
    inviteContext?: {
        familyCircleId?: string;
        invitedBy?: string;
    };
}

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';
