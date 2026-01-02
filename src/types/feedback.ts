import { UserRole } from "./user";

export interface Feedback {
    id: string;
    userId: string;
    userName?: string; // Added for admin view
    userEmail?: string; // Added for admin view
    role: UserRole;
    context: string; // The URL or page name where feedback was submitted
    issue: string; // "What were you trying to do?"
    whatWorked?: string; // "What worked / didn't?"
    rating?: number; // 1-5
    screenshotUrl?: string;
    timestamp: Date;
    userAgent?: string;
    version?: string; // App version if available
}
