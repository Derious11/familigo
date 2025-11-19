
export interface User {
    id: string;
    name: string;
    email: string;
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
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
}

export interface Exercise {
    name: string;
    description: string;
    visualGuideUrl: string;
}

export interface Reply {
    id: string;
    user: { id: string, name: string, avatarUrl: string };
    mediaUrl?: string;
    text?: string;
    reactions: { [emoji: string]: number };
    timestamp: Date;
    challengeId: string;
    familyCircleId: string;
    parentId?: string;
}

export interface Challenge {
    id: string;
    challenger: { id: string, name: string, avatarUrl: string };
    exercise: Exercise;
    target: string;
    mediaUrl?: string;
    timestamp: Date;
    familyCircleId: string;
    replies?: Reply[]; // Kept for potential future use or old data structures
    expiresAt: Date;
    completedBy: string[];
}

export interface FamilyCircle {
    id: string;
    name: string;
    inviteCode: string;
    members: User[];
    challenges?: Challenge[]; // Kept for potential future use or old data structures
}

export type View = 'feed' | 'history' | 'profile';

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export interface AddReplyPayload {
    image?: Blob;
    text?: string;
}