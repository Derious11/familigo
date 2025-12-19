import {
    doc,
    updateDoc,
    serverTimestamp,
    increment,
    collection,
    query,
    where,
    getDocs,
    documentId,
    arrayUnion,
    arrayRemove,
    orderBy,
    onSnapshot,
    Timestamp,
    getDoc
} from "firebase/firestore";
import { db } from '../firebaseConfig';
import { User, Badge } from '../types';

import { auth } from '../firebaseConfig';

export const onUserUpdate = (userId: string, callback: (user: User | null) => void): (() => void) => {
    // console.log(`[UserService] Listening to user doc: ${userId}`);

    const userDocRef = doc(db, 'users', userId);

    return onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();

            // Convert weightHistory timestamps
            if (userData.weightHistory && Array.isArray(userData.weightHistory)) {
                userData.weightHistory = userData.weightHistory.map((entry: any) => ({
                    ...entry,
                    timestamp: entry.timestamp instanceof Timestamp ? entry.timestamp.toDate() : new Date(),
                }));
            }

            // Convert lastActiveDate
            if (userData.lastActiveDate && userData.lastActiveDate instanceof Timestamp) {
                userData.lastActiveDate = userData.lastActiveDate.toDate();
            }

            const user: User = {
                id: docSnapshot.id,
                emailVerified: userData.emailVerified,
                // Note: emailVerified is usually on Auth object, but we might store it or not. 
                // For now, assume it's merged in App.tsx or we just take what's in Firestore + ID.
                ...userData,
                activityMap: userData.activityMap || {}, // Ensure activityMap is initialized
            } as User;
            callback(user);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error(`[UserService] Error listening to user ${userId}:`, error);
        // We might want to notify the UI or force a sign-out if permission is lost
    });
};


export const checkAndUpdateStreak = async (user: User) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let lastActive = user.lastActiveDate;

    // If no lastActiveDate, treat as if active today (for new users) or handle legacy
    if (!lastActive) {
        // If it's a legacy user with 0 streak, set to 1 and today
        // If they have a streak but no date, assume they are continuing today
        const newStreak = user.streak > 0 ? user.streak : 1;
        await updateDoc(doc(db, 'users', user.id), {
            lastActiveDate: serverTimestamp(),
            streak: newStreak
        });
        return;
    }

    // Normalize lastActive to midnight for comparison
    const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

    const diffTime = Math.abs(today.getTime() - lastActiveDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Already active today, do nothing
        return;
    } else if (diffDays === 1) {
        // Consecutive day, increment streak
        await updateDoc(doc(db, 'users', user.id), {
            streak: increment(1),
            lastActiveDate: serverTimestamp()
        });
        await addXp(user.id, 10); // +10 XP for maintaining streak
    } else {
        // Missed a day (or more), reset streak
        await updateDoc(doc(db, 'users', user.id), {
            streak: 1,
            lastActiveDate: serverTimestamp()
        });
        await addXp(user.id, 5); // +5 XP for coming back
    }
};

export const getBadges = async (): Promise<Omit<Badge, 'unlocked'>[]> => {
    const badgesCol = collection(db, 'badges');
    const q = query(badgesCol, orderBy(documentId())); // Order by ID for consistency
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        icon: doc.data().icon,
    }));
};

export const updateUserAvatar = async (userId: string, avatarUrl: string): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { avatarUrl });
};

export const updateUserWeight = async (userId: string, weight: number, unit: 'lbs' | 'kg'): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        currentWeight: weight,
        weightUnit: unit,
        weightHistory: arrayUnion({ value: weight, timestamp: new Date() }),
    });
};

export const addNotificationToken = async (userId: string, token: string): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        notificationTokens: arrayUnion(token)
    });
};

export const removeNotificationToken = async (userId: string, token?: string): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    if (token) {
        // If a specific token is provided, remove only that one.
        await updateDoc(userDocRef, {
            notificationTokens: arrayRemove(token)
        });
    } else {
        // If no token is provided, clear all tokens for the user.
        // This is a safe fallback to ensure notifications are fully disabled.
        await updateDoc(userDocRef, {
            notificationTokens: []
        });
    }
};

export const getUserTokens = async (userIds: string[]): Promise<string[]> => {
    if (userIds.length === 0) return [];
    const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', userIds));
    const snapshot = await getDocs(usersQuery);
    const tokens: string[] = [];
    snapshot.forEach(doc => {
        const user = doc.data() as User;
        if (user.notificationTokens) {
            tokens.push(...user.notificationTokens);
        }
    });
    return tokens;
};

export const updateCoverPhoto = async (userId: string, coverPhotoUrl: string): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { coverPhotoUrl });
};

export const addXp = async (userId: string, amount: number): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) return;

    const userData = userDoc.data() as User;
    const currentXp = userData.xp || 0;
    // const currentLevel = userData.level || 1; // Unused variable
    const newXp = currentXp + amount;

    // Simple leveling formula: Level = floor(sqrt(XP / 100)) + 1
    // or just every 1000 XP is a level? Let's go with a progressive curve.
    // Level 1: 0-100
    // Level 2: 101-300 (200 xp)
    // Level 3: 301-600 (300 xp)
    // Formula: XP = 50 * (Level^2 - Level)
    // Inverse: Level = (1 + sqrt(1 + 8 * XP / 100)) / 2  <-- roughly

    // Let's stick to a simpler one for now: Level * 500 XP required for next level.
    // Actually, let's just use a fixed threshold for simplicity in MVP: 100 XP per level? Too fast.
    // Let's say: Level = 1 + Math.floor(newXp / 500);
    const newLevel = 1 + Math.floor(newXp / 500);

    const today = new Date().toISOString().split('T')[0];
    const activityMap = userData.activityMap || {};
    const currentDayCount = activityMap[today] || 0;


    await updateDoc(userDocRef, {
        xp: newXp,
        level: newLevel,
        [`activityMap.${today}`]: currentDayCount + 1
    });
};

export const getPendingUsers = async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('status', '==', 'pending_approval'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const approveUser = async (userId: string, adminId: string): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        status: 'active',
        approvedAt: serverTimestamp(),
        approvedBy: adminId
    });
};
