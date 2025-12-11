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
    Timestamp,
} from "firebase/firestore";
import { auth, db } from '../firebaseConfig';
import { User, UserRole } from '../types';
import { checkAndUpdateStreak, getBadges } from './userService';

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

                // Convert weightHistory timestamps from Firestore Timestamps to JS Dates
                if (userData.weightHistory && Array.isArray(userData.weightHistory)) {
                    userData.weightHistory = userData.weightHistory.map((entry: any) => ({
                        ...entry,
                        timestamp: entry.timestamp instanceof Timestamp ? entry.timestamp.toDate() : new Date(), // Defensive check
                    }));
                }

                // Convert lastActiveDate from Firestore Timestamp to JS Date
                if (userData.lastActiveDate && userData.lastActiveDate instanceof Timestamp) {
                    userData.lastActiveDate = userData.lastActiveDate.toDate();
                }

                const idTokenResult = await firebaseUser.getIdTokenResult(true);
                const isAdmin = !!idTokenResult.claims.admin;

                const user: User = {
                    id: firebaseUser.uid,
                    emailVerified: firebaseUser.emailVerified,
                    isAdmin,
                    ...userData,
                } as User;

                // Check and update streak
                checkAndUpdateStreak(user);

                callback(user);
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

export const signUpWithEmail = async (name: string, email: string, pass: string, role: UserRole = 'adult', birthDate?: Date): Promise<{ user: User | null, error: string | null }> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const { user } = userCredential;

        await sendEmailVerification(user);

        const allBadges = await getBadges();

        const newUser: Omit<User, 'id' | 'emailVerified'> = {
            name,
            email: user.email!,
            role,
            birthDate,
            avatarUrl: `https://i.pravatar.cc/150?u=${user.uid}`,
            streak: 1,
            lastActiveDate: new Date(),
            badges: allBadges.map(b => ({ ...b, unlocked: false })),
            weightUnit: 'lbs',
            weightHistory: [],
            notificationTokens: [],
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
                role: 'adult', // Default to adult for Google Sign In for now
                birthDate: new Date(), // Default to today or handle later
                avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
                streak: 1,
                lastActiveDate: new Date(),
                badges: allBadges.map(b => ({ ...b, unlocked: false })),
                weightUnit: 'lbs',
                weightHistory: [],
                notificationTokens: [],
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
