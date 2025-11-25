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

export interface AddReplyPayload {
    image?: Blob;
    text?: string;
}
