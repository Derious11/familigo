import {getFunctions, httpsCallable} from "firebase/functions";
import {
    doc,
    updateDoc,
    serverTimestamp,
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
    Unsubscribe,
    deleteField
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { User, Badge } from "../types";

/* ============================================================
   USER SNAPSHOT (PERMISSION-SAFE)
   ============================================================ */

export const onUserUpdate = (
    userId: string,
    callback: (user: User | null) => void
): Unsubscribe => {

    const userRef = doc(db, "users", userId);
    let unsub: Unsubscribe | null = null;

    try {
        unsub = onSnapshot(
            userRef,
            (snap) => {
                if (!snap.exists()) {
                    callback(null);
                    return;
                }

                const data = snap.data();

                // --- Normalize timestamps safely ---
                if (Array.isArray(data.weightHistory)) {
                    data.weightHistory = data.weightHistory.map((entry: any) => ({
                        ...entry,
                        timestamp:
                            entry?.timestamp instanceof Timestamp
                                ? entry.timestamp.toDate()
                                : entry?.timestamp,
                    }));
                }

                if (data.lastActiveDate instanceof Timestamp) {
                    data.lastActiveDate = data.lastActiveDate.toDate();
                }

                const user: User = {
                    id: snap.id,
                    name: data.name ?? "",
                    email: data.email || undefined,
                    avatarUrl: data.avatarUrl || undefined,
                    hasAvatar: data.hasAvatar,
                    avatarUpdatedAt: data.avatarUpdatedAt instanceof Timestamp
                        ? data.avatarUpdatedAt.toDate()
                        : data.avatarUpdatedAt,
                    streak: typeof data.streak === "number" ? data.streak : 0,
                    badges: Array.isArray(data.badges) ? data.badges : [],
                    achievementCount: data.achievementCount,
                    emailVerified: !!data.emailVerified,
                    familyCircleId: data.familyCircleId,
                    role: data.role,
                    parentId: data.parentId,
                    xp: data.xp ?? 0,
                    level: data.level ?? 1,
                    status: data.status,
                    familyCreationApproved: data.familyCreationApproved === true,
                    currentWeight: data.currentWeight,
                    weightUnit: data.weightUnit,
                    weightHistory: data.weightHistory,
                    notificationTokens: data.notificationTokens,
                    coverPhotoUrl: data.coverPhotoUrl,
                    activityMap: data.activityMap || {},
                    lastReadMessageCount: data.lastReadMessageCount ?? 0,
                };

                callback(user);
            },
            (error) => {
                // 🔒 CRITICAL: snapshot failures must NOT break the app
                console.warn(
                    `[UserService] onUserUpdate blocked for ${userId}:`,
                    error.code || error.message
                );
                callback(null);
            }
        );
    } catch (err) {
        console.error("[UserService] Failed to attach snapshot:", err);
        callback(null);
    }

    return () => {
        if (unsub) unsub();
    };
};

/* ============================================================
   STREAKS & XP
   ============================================================ */

export const checkAndUpdateStreak = async (_user: User) => {
    await httpsCallable(getFunctions(), "recordSignIn")({});
};

/* ============================================================
   BADGES
   ============================================================ */

export const getBadges = async (): Promise<Omit<Badge, "unlocked">[]> => {
    const q = query(collection(db, "badges"), orderBy(documentId()));
    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        icon: doc.data().icon,
    }));
};

/* ============================================================
   PROFILE UPDATES
   ============================================================ */

export const updateUserAvatar = async (
    userId: string,
    avatarUrl?: string
) => {
    await updateDoc(doc(db, "users", userId), {
        avatarUpdatedAt: serverTimestamp(),
        hasAvatar: true,
        avatarUrl: avatarUrl ?? deleteField(),
    });
};

export const updateDisplayName = async (
    userId: string,
    name: string
) => {
    await updateDoc(doc(db, "users", userId), { name });
};

export const updateCoverPhoto = async (
    userId: string,
    coverPhotoUrl: string
) => {
    await updateDoc(doc(db, "users", userId), { coverPhotoUrl });
};

export const updateUserWeight = async (
    userId: string,
    weight: number,
    unit: "lbs" | "kg"
) => {
    await updateDoc(doc(db, "users", userId), {
        currentWeight: weight,
        weightUnit: unit,
        weightHistory: arrayUnion({
            value: weight,
            timestamp: new Date(),
        }),
    });
};

/* ============================================================
   NOTIFICATIONS
   ============================================================ */

export const addNotificationToken = async (
    userId: string,
    token: string
) => {
    await updateDoc(doc(db, "users", userId), {
        notificationTokens: arrayUnion(token),
    });
};

export const removeNotificationToken = async (
    userId: string,
    token?: string
) => {
    await updateDoc(doc(db, "users", userId), {
        notificationTokens: token ? arrayRemove(token) : [],
    });
};

export const getUserTokens = async (
    userIds: string[]
): Promise<string[]> => {
    if (!userIds.length) return [];

    const q = query(
        collection(db, "users"),
        where(documentId(), "in", userIds)
    );

    const snap = await getDocs(q);
    const tokens: string[] = [];

    snap.forEach((doc) => {
        const user = doc.data() as User;
        if (Array.isArray(user.notificationTokens)) {
            tokens.push(...user.notificationTokens);
        }
    });

    return tokens;
};

/* ============================================================
   ADMIN
   ============================================================ */

export const getPendingUsers = async (): Promise<User[]> => {
    const q = query(
        collection(db, "users"),
        where("status", "==", "pending_approval")
    );
    const snap = await getDocs(q);

    return snap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as User)
    );
};

export const approveUser = async (
    userId: string,
    adminId: string
) => {
    await updateDoc(doc(db, "users", userId), {
        status: "active",
        approvedAt: serverTimestamp(),
        approvedBy: adminId,
    });
};
