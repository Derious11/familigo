export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
}

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

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';
