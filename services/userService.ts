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
    Timestamp
} from "firebase/firestore";
import { db } from '../firebaseConfig';
import { User, Badge } from '../types';

export const onUserUpdate = (userId: string, callback: (user: User | null) => void): (() => void) => {
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
                emailVerified: userData.emailVerified, // Ensure this is preserved if in doc, else might need to merge from auth? 
                // Note: emailVerified is usually on Auth object, but we might store it or not. 
                // For now, assume it's merged in App.tsx or we just take what's in Firestore + ID.
                ...userData,
            } as User;
            callback(user);
        } else {
            callback(null);
        }
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
    } else {
        // Missed a day (or more), reset streak
        await updateDoc(doc(db, 'users', user.id), {
            streak: 1,
            lastActiveDate: serverTimestamp()
        });
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
        weightHistory: arrayUnion({ value: weight, timestamp: serverTimestamp() }),
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
