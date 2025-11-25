import { User } from './user';
import { Challenge } from './challenge';

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
