import { GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, signInWithEmailAndPassword } from 'firebase/auth';
import {auth} from '../firebaseAuth';
import type {User, UserRole} from '../types';

export const signInWithEmail = async (email: string, pass: string): Promise<{ user: User | null, error: string | null }> => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // onAuthStateChanged will handle the user state update
        return { user: null, error: null };
    } catch (error: any) {
        return { user: null, error: "Invalid email or password." };
    }
};

export const signInWithGoogle = async (
    role: UserRole = 'adult',
    earlyAccessData?: User['earlyAccessData']
): Promise<{ user: User | null, error: string | null; cancelled?: boolean }> => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if it's a new user
        const additionalUserInfo = getAdditionalUserInfo(result);
        if (additionalUserInfo?.isNewUser) {
            // If it's a new user, create a document for them in Firestore

            const {db} = await import('../firebaseConfig');
            const {doc,setDoc,serverTimestamp} = await import('firebase/firestore');
            const newUser: Omit<User, 'id' | 'emailVerified'> = {
                name: user.displayName || 'New User',
                createdAt: new Date(),
                email: user.email!,
                role: role,
                birthDate: new Date(),
                avatarUpdatedAt: new Date(),
                streak: 1,
                lastActiveDate: new Date(),
                badges: [],
                weightUnit: 'lbs',
                weightHistory: [],
                notificationTokens: [],
                // Default new parent signups to pending_approval if they have early access data
                // Default new users to pending_approval.
                status: 'pending_approval',
                ...(earlyAccessData ? { earlyAccessData } : {})
            };
            try {
                await setDoc(doc(db, 'users', user.uid), { ...newUser, createdAt: serverTimestamp() });
            } catch (err) {
                console.error("Failed to create user profile document.", err);
                try {
                    await user.delete();
                } catch (deleteErr) {
                    console.warn("Failed to rollback auth user after profile write failure.", deleteErr);
                }
                return { user: null, error: "Unable to finish account setup. Please try again." };
            }
        } else {
            // Existing user - logic is handled by onAuthStateChanged
            // If we assume account linking is automatic, we don't need to do manual linking here.
            // However, we might want to update early access data if it's missing?
            // For now, let's keep it simple: existing users just log in.
        }

        // onAuthStateChanged will handle the rest
        return { user: null, error: null };
    } catch (error: any) {
        // Handle specific errors
        if (error.code === 'auth/popup-closed-by-user') {
            return { user: null, error: null, cancelled: true };
        }
        if (error.code === 'auth/unauthorized-domain') {
            console.error("Google Sign-In Error: Unauthorized Domain.", error);
            return { user: null, error: "This domain is not authorized. Go to your Firebase Console -> Authentication -> Settings -> Authorized domains and add the following domain: us-central1-gcp.api.scf.usercontent.goog. Please double-check for typos." };
        }
        console.error("Google Sign-In Error:", error);
        return { user: null, error: "Failed to sign in with Google. Please try again." };
    }
};
