
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, FamilyCircle, AuthState, Exercise, AddReplyPayload } from './types';
import { onAuthStateChanged, signOutUser } from './services/authService';
import { onUserUpdate } from './services/userService';
import { getUserFamilyCircle, onFamilyCircleUpdate } from './services/familyService';
import { addChallengeToFamily, addReplyToChallenge, deleteReply as deleteReplyFromFirestore, deleteChallengeAndReplies } from './services/challengeService';
import { uploadReplyImage } from './services/storageService';
import MainApp from './components/MainApp';
import AuthFlow from './components/Auth/AuthFlow';
import OnboardingFlow from './components/OnboardingFlow';
import { auth } from './firebaseConfig';

import { NotificationProvider } from './contexts/NotificationContext';
import PrivacyPolicy from './components/Auth/PrivacyPolicy';
import DeleteAccount from './components/Auth/DeleteAccount';

export const AppContext = React.createContext<{
    currentUser: User | null;
    familyCircle: FamilyCircle | null;
    addReply: (challengeId: string, payload: AddReplyPayload, parentId?: string, isCompletion?: boolean, contributionValue?: number) => Promise<void>;
    deleteReply: (replyId: string) => Promise<void>;
    addChallenge: (exercise: Exercise, target: string, mediaUrl?: string, type?: 'individual' | 'team', goalTotal?: number, unit?: string, durationDays?: number) => Promise<void>;
    deleteChallenge: (challengeId: string) => Promise<void>;
    signOut: () => void;
    setFamilyCircle: (circle: FamilyCircle | null) => void;
    updateCurrentUser: (userData: Partial<User>) => void;
    switchProfile: (userId: string) => void;
    isImpersonating: boolean;
    originalUserId?: string;
} | null>(null);


const App: React.FC = () => {
    const [authState, setAuthState] = useState<AuthState>('loading');
    const [authUser, setAuthUser] = useState<User | null>(null); // The actual authenticated user
    const [currentUser, setCurrentUser] = useState<User | null>(null); // The user currently being viewed/controlled
    const [familyCircle, setFamilyCircle] = useState<FamilyCircle | null>(null);
    const [viewingAsUserId, setViewingAsUserId] = useState<string | null>(null);

    useEffect(() => {
        // This effect runs once on app load to check for an invite code in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('inviteCode');
        if (inviteCode) {
            // Store it in session storage to survive the auth flow
            sessionStorage.setItem('pendingInviteCode', inviteCode);
            // Clean the URL to avoid it being re-processed or shared accidentally
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);



    useEffect(() => {
        if (typeof auth === 'undefined') return;

        const unsubscribeAuth = onAuthStateChanged(async (initialUser) => {
            if (initialUser) {
                setAuthUser(initialUser);
                // If we were not authenticated before, we are now.
                // We don't set 'authenticated' yet, we wait for the user data subscription.
            } else {
                setAuthUser(null);
                setCurrentUser(null);
                setFamilyCircle(null);
                setViewingAsUserId(null);
                setAuthState('unauthenticated');
            }
        });
        return () => {
            unsubscribeAuth();
        };
    }, []);

    useEffect(() => {
        if (!authUser) return;

        let unsubscribeUser: (() => void) | null = null;
        let unsubscribeFamily: (() => void) | null = null;
        let subscribedFamilyId: string | null = null;

        const targetUserId = viewingAsUserId || authUser.id;

        setAuthState('loading');

        unsubscribeUser = onUserUpdate(targetUserId, (updatedUser) => {
            if (updatedUser) {
                // Preserve emailVerified from initial auth if not in firestore (it usually isn't)
                // Only if we are viewing the auth user
                const isAuthUser = updatedUser.id === authUser.id;
                const userToSet = isAuthUser ? { ...updatedUser, emailVerified: authUser.emailVerified } : updatedUser;

                setCurrentUser(userToSet);

                // Handle family circle subscription
                if (updatedUser.familyCircleId) {
                    // Subscribe if we haven't yet, or if the ID changed
                    if (!unsubscribeFamily || subscribedFamilyId !== updatedUser.familyCircleId) {
                        if (unsubscribeFamily) unsubscribeFamily();

                        subscribedFamilyId = updatedUser.familyCircleId;
                        unsubscribeFamily = onFamilyCircleUpdate(updatedUser.familyCircleId, (circle) => {
                            setFamilyCircle(circle);
                            setAuthState('authenticated');
                        });
                    } else {
                        // Already subscribed to this family, just ensure we are authenticated
                        // This handles cases where user updates but family stays same
                        setAuthState('authenticated');
                    }
                } else {
                    if (unsubscribeFamily) {
                        unsubscribeFamily();
                        unsubscribeFamily = null;
                        subscribedFamilyId = null;
                    }
                    setFamilyCircle(null);
                    setAuthState('authenticated');
                }
            } else {
                // User document not found? Should not happen for valid users.
                // If we are impersonating and the user is gone, revert.
                if (viewingAsUserId) {
                    setViewingAsUserId(null);
                }
            }
        });

        return () => {
            if (unsubscribeUser) unsubscribeUser();
            if (unsubscribeFamily) unsubscribeFamily();
        };
    }, [authUser, viewingAsUserId]); // Re-run when authUser or viewingAsUserId changes

    const signOut = () => {
        signOutUser();
    };

    const addReply = useCallback(async (challengeId: string, payload: AddReplyPayload, parentId?: string, isCompletion: boolean = false, contributionValue?: number) => {
        if (!currentUser || !familyCircle) return;

        let mediaUrl: string | undefined = undefined;
        if (payload.image) {
            mediaUrl = await uploadReplyImage(payload.image);
        }

        await addReplyToChallenge(currentUser, challengeId, familyCircle.id, mediaUrl, payload.text, parentId, isCompletion, contributionValue);
    }, [currentUser, familyCircle]);

    const deleteReply = useCallback(async (replyId: string) => {
        await deleteReplyFromFirestore(replyId);
    }, []);

    const addChallenge = useCallback(async (exercise: Exercise, target: string, mediaUrl?: string, type: 'individual' | 'team' = 'individual', goalTotal?: number, unit?: string, durationDays?: number) => {
        if (!currentUser || !familyCircle) return;
        await addChallengeToFamily(currentUser, familyCircle.id, exercise, target, mediaUrl, type, goalTotal, unit, durationDays);
    }, [currentUser, familyCircle]);

    const deleteChallenge = useCallback(async (challengeId: string) => {
        await deleteChallengeAndReplies(challengeId);
    }, []);

    const updateCurrentUser = useCallback((userData: Partial<User>) => {
        // We only update the 'currentUser' state locally here for optimistic UI, 
        // but the actual update should happen via service calls which will trigger the subscription.
        // However, the context exposes this, so we keep it.
        setCurrentUser(prevUser => prevUser ? { ...prevUser, ...userData } : null);
    }, []);

    const switchProfile = useCallback((userId: string) => {
        if (authUser && userId === authUser.id) {
            setViewingAsUserId(null);
        } else {
            setViewingAsUserId(userId);
        }
    }, [authUser]);

    const appContextValue = useMemo(() => ({
        currentUser,
        familyCircle,
        addReply,
        deleteReply,
        addChallenge,
        deleteChallenge,
        signOut,
        setFamilyCircle,
        updateCurrentUser,
        switchProfile,
        isImpersonating: !!viewingAsUserId,
        originalUserId: authUser?.id
    }), [currentUser, familyCircle, addReply, deleteReply, addChallenge, deleteChallenge, updateCurrentUser, switchProfile, viewingAsUserId, authUser]);


    const renderContent = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const path = window.location.pathname.toLowerCase();

        if (urlParams.get('page') === 'privacy' || path === '/privacy') {
            return (
                <div className="min-h-screen bg-brand-background dark:bg-gray-900 flex items-center justify-center p-4">
                    <PrivacyPolicy onBack={() => {
                        // If we are on the dedicated route, go to root
                        if (path === '/privacy') {
                            window.location.href = '/';
                        } else {
                            // Remove the query param and reload/re-render
                            const newUrl = window.location.pathname;
                            window.history.pushState({}, '', newUrl);
                            window.location.href = newUrl;
                        }
                    }} />
                </div>
            );
        }

        if (urlParams.get('page') === 'delete-account' || path === '/delete-account') {
            return (
                <div className="min-h-screen bg-brand-background dark:bg-gray-900 flex items-center justify-center p-4">
                    <DeleteAccount onBack={() => {
                        if (path === '/delete-account') {
                            window.location.href = '/';
                        } else {
                            const newUrl = window.location.pathname;
                            window.history.pushState({}, '', newUrl);
                            window.location.href = newUrl;
                        }
                    }} />
                </div>
            );
        }

        if (authState === 'loading') {
            return (
                <div className="flex items-center justify-center h-screen">
                    <svg className="animate-spin h-8 w-8 text-brand-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            );
        }

        if (authState === 'unauthenticated') {
            return <AuthFlow />;
        }

        if (authState === 'authenticated' && currentUser) {
            if (!familyCircle) {
                return <OnboardingFlow user={currentUser} setFamilyCircle={setFamilyCircle} />;
            }
            return <MainApp />;
        }

        return <AuthFlow />; // Fallback
    };

    return (
        <NotificationProvider>
            <AppContext.Provider value={appContextValue}>
                <div className="min-h-screen bg-brand-background dark:bg-gray-900 font-sans text-brand-text-primary dark:text-gray-100">{renderContent()}</div>
            </AppContext.Provider>
        </NotificationProvider>
    );
};

export default App;