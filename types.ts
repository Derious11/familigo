
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
    lastReadMessageCount?: number;
    coverPhotoUrl?: string;
    xp?: number;
    level?: number;
    activityMap?: Record<string, number>; // Date string (YYYY-MM-DD) -> count
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
    contributionValue?: number;
}

export interface Challenge {
    id: string;
    type: 'individual' | 'team';
    challenger: { id: string, name: string, avatarUrl: string };
    exercise: Exercise;
    target: string; // Description for individual, or summary for team
    goalTotal?: number;
    currentTotal?: number;
    unit?: string;
    mediaUrl?: string;
    timestamp: Date;
    familyCircleId: string;
    replies?: Reply[]; // Kept for potential future use or old data structures
    expiresAt: Date;
    completedBy: string[];
}

export interface Message {
    id: string;
    familyCircleId: string;
    senderId: string;
    senderName: string;
    senderAvatarUrl: string;
    text: string;
    timestamp: Date;
    type: 'text' | 'system';
}

export interface FamilyCircle {
    id: string;
    name: string;
    chatName?: string;
    inviteCode: string;
    members: User[];
    challenges?: Challenge[]; // Kept for potential future use or old data structures
    messageCount?: number;
    avatarUrl?: string;
    motto?: string;
    adminIds?: string[];
}

export type View = 'feed' | 'history' | 'profile' | 'chat';

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export interface AddReplyPayload {
    image?: Blob;
    text?: string;
}