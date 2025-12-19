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
    isAdmin?: boolean; // From Firebase Custom Claims
    role?: UserRole;
    birthDate?: Date;
    parentId?: string; // For teens and children
    avatarUrl: string;
    streak: number;
    lastActiveDate?: Date;
    badges: Badge[];
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
    earlyAccessData?: {
        kidCount?: number;
        kidAges?: string;
        parentEmail?: string;
        challengeTarget?: string;
    };
}

export interface User {
    id: string;
    name: string;
    email?: string; // Optional for child accounts
    isAdmin?: boolean;
    role?: UserRole;
    birthDate?: Date;
    parentId?: string;
    avatarUrl: string;
    streak: number;
    lastActiveDate?: Date;
    badges: Badge[];
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
    activityMap?: Record<string, number>;

    // Auth & Access Control
    status?: 'active' | 'pending_approval' | 'suspended';
    approvedAt?: any;
    approvedBy?: string;

    // Early Access (parents / teens requesting beta)
    earlyAccessData?: {
        kidCount?: number;
        kidAges?: string;
        parentEmail?: string;
        challengeTarget?: string;
    };

    // ✅ NEW: Invite-based onboarding (teen 13+)
    inviteContext?: {
        inviteCode: string;
        familyCircleId: string;
        invitedBy: string; // parent name or id
    };
}


export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';
