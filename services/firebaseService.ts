import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged as onFirebaseAuthStateChanged,
    sendEmailVerification,
    GoogleAuthProvider,
    signInWithPopup,
    getAdditionalUserInfo,
} from "firebase/auth";
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    collection,
    query,
    where,
    addDoc,
    serverTimestamp,
    onSnapshot,
    orderBy,
    writeBatch,
    increment,
    documentId,
    Timestamp,
    arrayUnion,
    deleteDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { auth, db, storage } from '../firebaseConfig';
import { User, FamilyCircle, Challenge, Reply, Exercise, Badge } from '../types';

// --- AUTHENTICATION ---

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
    return onFirebaseAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);

            // This function retries fetching the document to avoid a race condition during sign-up
            // where the auth state changes before the user document is written to Firestore.
            const getUserDocWithRetry = async (retries = 3, delay = 500): Promise<any | null> => {
                for (let i = 0; i < retries; i++) {
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        return userDoc;
                    }
                    // Wait before the next retry
                    await new Promise(res => setTimeout(res, delay));
                }
                return null; // Return null if not found after all retries
            };

            const userDoc = await getUserDocWithRetry();

            if (userDoc) {
                const userData = userDoc.data();
                callback({
                    id: firebaseUser.uid,
                    emailVerified: firebaseUser.emailVerified,
                    ...userData,
                } as User);
            } else {
                // If the user document doesn't exist even after retries, it's an inconsistent state.
                // It's safer to sign the user out.
                console.warn(`User document not found for uid: ${firebaseUser.uid} after retries. Forcing sign out.`);
                signOut(auth);
                callback(null);
            }
        } else {
            callback(null);
        }
    });
};

export const signUpWithEmail = async (name: string, email: string, pass: string): Promise<{ user: User | null, error: string | null }> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const { user } = userCredential;
        
        await sendEmailVerification(user);

        const allBadges = await getBadges();

        const newUser: Omit<User, 'id' | 'emailVerified'> = {
            name,
            email: user.email!,
            avatarUrl: `https://i.pravatar.cc/150?u=${user.uid}`,
            streak: 0,
            badges: allBadges.map(b => ({ ...b, unlocked: false })),
            weightUnit: 'lbs',
            weightHistory: [],
        };

        await setDoc(doc(db, 'users', user.uid), newUser);

        return { user: { id: user.uid, ...newUser, emailVerified: user.emailVerified }, error: null };
    } catch (error: any) {
        return { user: null, error: error.message };
    }
};

export const signInWithEmail = async (email: string, pass: string): Promise<{ user: User | null, error: string | null }> => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // onAuthStateChanged will handle the user state update
        return { user: null, error: null };
    } catch (error: any) {
        return { user: null, error: "Invalid email or password." };
    }
};

export const signInWithGoogle = async (): Promise<{ user: User | null, error: string | null }> => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if it's a new user
        const additionalUserInfo = getAdditionalUserInfo(result);
        if (additionalUserInfo?.isNewUser) {
            // If it's a new user, create a document for them in Firestore
            const allBadges = await getBadges();
            const newUser: Omit<User, 'id' | 'emailVerified'> = {
                name: user.displayName || 'New User',
                email: user.email!,
                avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
                streak: 0,
                badges: allBadges.map(b => ({ ...b, unlocked: false })),
                weightUnit: 'lbs',
                weightHistory: [],
            };
            await setDoc(doc(db, 'users', user.uid), newUser);
        }

        // onAuthStateChanged will handle the rest
        return { user: null, error: null };
    } catch (error: any) {
        // Handle specific errors
        if (error.code === 'auth/popup-closed-by-user') {
            return { user: null, error: null }; // Not an error to display
        }
        if (error.code === 'auth/unauthorized-domain') {
            console.error("Google Sign-In Error: Unauthorized Domain.", error);
            return { user: null, error: "This domain is not authorized. Go to your Firebase Console -> Authentication -> Settings -> Authorized domains and add the following domain: us-central1-gcp.api.scf.usercontent.goog. Please double-check for typos." };
        }
        console.error("Google Sign-In Error:", error);
        return { user: null, error: "Failed to sign in with Google. Please try again." };
    }
};


export const signOutUser = async (): Promise<void> => {
    await signOut(auth);
};


export const resendVerificationEmail = async (): Promise<{ success: boolean, error: string | null }> => {
    const user = auth.currentUser;
    if (user) {
        try {
            await sendEmailVerification(user);
            return { success: true, error: null };
        } catch (error: any) {
             return { success: false, error: error.message };
        }
    }
    return { success: false, error: "No user is currently signed in." };
};

// --- DATABASE (FIRESTORE) ---

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

export const getExercises = async (): Promise<Exercise[]> => {
    const exercisesCol = collection(db, 'exercises');
    const q = query(exercisesCol, orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Exercise);
};

export const getUserFamilyCircle = async (familyId: string): Promise<FamilyCircle | null> => {
    const circleDocRef = doc(db, 'familyCircles', familyId);
    const circleDoc = await getDoc(circleDocRef);
    if (!circleDoc.exists()) return null;

    const circleData = circleDoc.data() as { name: string; inviteCode: string; memberIds: string[] };
    
    let members: User[] = [];
    if (circleData.memberIds?.length) {
        const membersQuery = query(collection(db, 'users'), where(documentId(), 'in', circleData.memberIds));
        const membersSnapshot = await getDocs(membersQuery);
        members = membersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
    }
    
    return {
        id: circleDoc.id,
        name: circleData.name,
        inviteCode: circleData.inviteCode,
        members,
    };
};

export const createFamilyCircle = async (userId: string, familyName: string): Promise<FamilyCircle> => {
    const user = await getDoc(doc(db, 'users', userId));
    if (!user.exists()) throw new Error("User not found for creating circle");

    const inviteCode = `${familyName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newCircleData = {
        name: familyName,
        inviteCode: inviteCode,
        memberIds: [userId],
    };

    const circleRef = await addDoc(collection(db, "familyCircles"), newCircleData);
    await updateDoc(doc(db, 'users', userId), { familyCircleId: circleRef.id });

    return {
        id: circleRef.id,
        ...newCircleData,
        members: [{id: userId, ...user.data()} as User],
    };
};

export const joinFamilyCircle = async (userId: string, inviteCode: string): Promise<{ circle: FamilyCircle | null, error: string | null }> => {
    const q = query(collection(db, 'familyCircles'), where('inviteCode', '==', inviteCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { circle: null, error: "Invalid invite code. Please check and try again." };
    }

    const circleDoc = querySnapshot.docs[0];
    const circleData = circleDoc.data() as { name: string; inviteCode: string; memberIds: string[] };

    if (circleData.memberIds.includes(userId)) {
        // User is already in the circle, just return it.
        const familyCircle = await getUserFamilyCircle(circleDoc.id);
        return { circle: familyCircle, error: null };
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', userId), { familyCircleId: circleDoc.id });
    batch.update(circleDoc.ref, { memberIds: [...circleData.memberIds, userId] });
    await batch.commit();

    const familyCircle = await getUserFamilyCircle(circleDoc.id);
    return { circle: familyCircle, error: null };
};

export const onChallengesUpdate = (familyCircleId: string, callback: (challenges: Challenge[]) => void): (() => void) => {
    const q = query(collection(db, 'challenges'), where('familyCircleId', '==', familyCircleId));
    
    return onSnapshot(q, (querySnapshot) => {
        const challenges = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp as Timestamp | null;
            const expiresAt = data.expiresAt as Timestamp | null;
            return {
                id: doc.id,
                ...data,
                timestamp: timestamp ? timestamp.toDate() : new Date(),
                expiresAt: expiresAt ? expiresAt.toDate() : new Date(Date.now() + 48 * 60 * 60 * 1000), // Fallback
                completedBy: data.completedBy || [],
            } as Challenge
        });
        challenges.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        callback(challenges);
    });
};

export const onRepliesUpdate = (challengeId: string, callback: (replies: Reply[]) => void): (() => void) => {
    const q = query(collection(db, 'replies'), where('challengeId', '==', challengeId));
    
    return onSnapshot(q, (querySnapshot) => {
        const replies = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp as Timestamp | null;
            return {
                id: doc.id,
                ...data,
                timestamp: timestamp ? timestamp.toDate() : new Date(),
            } as Reply
        });
        replies.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        callback(replies);
    });
};

export const addChallengeToFamily = async (challenger: User, familyCircleId: string, exercise: Exercise, target: string, mediaUrl?: string) => {
    const batch = writeBatch(db);
    const challengesRef = collection(db, 'challenges');

    const userChallengesQuery = query(challengesRef, where('challenger.id', '==', challenger.id));
    const userChallengesSnapshot = await getDocs(userChallengesQuery);
    const isFirstChallenge = userChallengesSnapshot.empty;

    const expirationDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const newChallenge = {
        challenger: {
            id: challenger.id,
            name: challenger.name,
            avatarUrl: challenger.avatarUrl
        },
        familyCircleId,
        exercise,
        target,
        mediaUrl: mediaUrl || exercise.visualGuideUrl,
        timestamp: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expirationDate),
        completedBy: [],
    };
    const newChallengeRef = doc(challengesRef);
    batch.set(newChallengeRef, newChallenge);

    if (isFirstChallenge) {
        const userDocRef = doc(db, 'users', challenger.id);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentBadges = userData.badges || []; 
            const isBadgeUnlocked = currentBadges.some((b: any) => b.id === 'b1' && b.unlocked);

            if (!isBadgeUnlocked) {
                const updatedBadges = currentBadges.map((badge: any) => {
                    if (badge.id === 'b1') {
                        return { ...badge, unlocked: true };
                    }
                    return badge;
                });
                batch.update(userDocRef, { badges: updatedBadges });
            }
        }
    }
    
    await batch.commit();
};

export const addReplyToChallenge = async (user: User, challengeId: string, familyCircleId: string, mediaUrl?: string, text?: string) => {
    const batch = writeBatch(db);
    
    const replyRef = doc(collection(db, 'replies'));
    const newReply: any = {
        user: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
        },
        challengeId,
        familyCircleId,
        reactions: {},
        timestamp: serverTimestamp(),
    };
    if (text) newReply.text = text;
    if (mediaUrl) newReply.mediaUrl = mediaUrl;
    batch.set(replyRef, newReply);

    const challengeRef = doc(db, 'challenges', challengeId);
    batch.update(challengeRef, {
        completedBy: arrayUnion(user.id)
    });
    
    await batch.commit();
};

export const deleteReply = async (replyId: string): Promise<void> => {
    const replyRef = doc(db, 'replies', replyId);
    await deleteDoc(replyRef);
};


export const deleteChallengeAndReplies = async (challengeId: string): Promise<void> => {
    const batch = writeBatch(db);

    // 1. Delete the challenge document
    const challengeRef = doc(db, 'challenges', challengeId);
    batch.delete(challengeRef);

    // 2. Find and delete all associated replies
    const repliesQuery = query(collection(db, 'replies'), where('challengeId', '==', challengeId));
    const repliesSnapshot = await getDocs(repliesQuery);
    repliesSnapshot.forEach(replyDoc => {
        batch.delete(replyDoc.ref);
    });

    // 3. Commit the batch
    await batch.commit();
};

export const updateReaction = async (replyId: string, emoji: string) => {
    const replyRef = doc(db, 'replies', replyId);
    await updateDoc(replyRef, {
        [`reactions.${emoji}`]: increment(1)
    });
};

export const getRepliesForFamily = async (familyCircleId: string): Promise<Reply[]> => {
    const q = query(collection(db, 'replies'), where('familyCircleId', '==', familyCircleId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Reply));
};

// --- USER PROFILE & STORAGE ---
export const uploadProfileImage = async (userId: string, file: File | Blob): Promise<string> => {
    const storageRef = ref(storage, `profile-pictures/${userId}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
};

export const uploadReplyImage = async (file: Blob): Promise<string> => {
    const uniqueId = doc(collection(db, 'temp')).id; // Generate a unique ID for the path
    const storageRef = ref(storage, `reply-images/${uniqueId}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
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