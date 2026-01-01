import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    User,
    FamilyCircle,
    AuthState,
    Exercise,
    AddReplyPayload
} from './types';

import {
    onAuthStateChanged,
    signOutUser
} from './services/authService';

import { onUserUpdate } from './services/userService';
import { onFamilyCircleUpdate } from './services/familyService';

import {
    addChallengeToFamily,
    addReplyToChallenge,
    deleteReply as deleteReplyFromFirestore,
    deleteChallengeAndReplies
} from './services/challengeService';

import { uploadReplyImage } from './services/storageService';

import MainApp from './components/MainApp';
import AuthFlow from './components/Auth/AuthFlow';
import OnboardingFlow from './components/OnboardingFlow';

import { NotificationProvider } from './contexts/NotificationContext';

import PrivacyPolicy from './components/Auth/PrivacyPolicy';
import DeleteAccount from './components/Auth/DeleteAccount';
import PendingApproval from './components/Auth/PendingApproval';

import LandingPageA from './components/Auth/LandingPageA';
import LandingPageB from './components/Auth/LandingPageB';

import RoleGate from './pages/RoleGate';
import ParentsLanding from './pages/ParentsLanding';
import TeensLanding from './pages/TeensLanding';
import EarlyAccess from './pages/EarlyAccess';
import AdminPage from './pages/AdminPage';
import InviteParent from './pages/InviteParent';
import ClaimInvite from './pages/ClaimInvite';

export const AppContext = React.createContext<any>(null);

/* ============================================================================
   ROUTING HELPER
============================================================================ */
const getPublicRoute = () => {
    const path = window.location.pathname.toLowerCase();

    if (path === '/privacy') return 'privacy';
    if (path === '/delete-account') return 'delete-account';

    if (path === '/landingpagea') return 'landing-a';
    if (path === '/landingpageb') return 'landing-b';

    if (path === '/') return 'role-gate';
    if (path === '/parents') return 'parents';
    if (path === '/teens') return 'teens';
    if (path === '/invite-parent') return 'invite-parent';
    if (path === '/early-access') return 'early-access';
    if (path === '/login') return 'login';
    if (path === '/claim-invite') return 'claim-invite';

    if (path.startsWith('/app')) return 'app';

    return 'unknown';
};

/* ============================================================================
   MAIN APP
============================================================================ */
const App: React.FC = () => {
    const [authState, setAuthState] = useState<AuthState>('loading');
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [familyCircle, setFamilyCircle] = useState<FamilyCircle | null>(null);
    const [viewingAsUserId, setViewingAsUserId] = useState<string | null>(null);
    const [familyError, setFamilyError] = useState<string | null>(null);

    /* ------------------------------------------------------------------------
       AUTH LISTENER
    ------------------------------------------------------------------------ */
    useEffect(() => {
        const unsub = onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                setAuthUser(firebaseUser);
            } else {
                setAuthUser(null);
                setCurrentUser(null);
                setFamilyCircle(null);
                setViewingAsUserId(null);
                setAuthState('unauthenticated');
            }
        });
        return () => unsub();
    }, []);

    /* ------------------------------------------------------------------------
       USER + FAMILY SUBSCRIPTIONS (SAFE)
    ------------------------------------------------------------------------ */
    useEffect(() => {
        if (!authUser) return;

        let unsubUser: (() => void) | null = null;
        let unsubFamily: (() => void) | null = null;
        let subscribedFamilyId: string | null = null;

        const startSubscriptions = (targetUserId: string) => {
            // Reset state while switching
            setAuthState('loading');
            setFamilyError(null);

            // Always clean old subs before starting new ones
            if (unsubUser) unsubUser();
            if (unsubFamily) unsubFamily();
            unsubUser = null;
            unsubFamily = null;
            unsubUser = onUserUpdate(targetUserId, (updatedUser) => {
                if (!updatedUser) {
                    const isImpersonating = targetUserId !== authUser.id;

                    if (isImpersonating) {
                        setViewingAsUserId(null);
                        return;
                    }

                    setCurrentUser(null);
                    setFamilyCircle(null);
                    setAuthState('authenticated');
                    return;
                }

                const isAuthUser = updatedUser.id === authUser.id;
                const mergedUser = isAuthUser
                    ? {
                        ...updatedUser,
                        emailVerified: authUser.emailVerified,
                        isAdmin: (authUser as any).isAdmin,
                    }
                    : updatedUser;

                setCurrentUser(mergedUser);

                const familyId = updatedUser.familyCircleId;

                // 🔑 CASE 1: User has NO family → app is ready immediately
                if (!familyId) {
                    if (unsubFamily) unsubFamily();
                    unsubFamily = null;
                    subscribedFamilyId = null;
                    setFamilyCircle(null);
                    setAuthState('authenticated');
                    return;
                }

                // 🔑 CASE 2: User HAS family → wait for family snapshot
                if (!unsubFamily || subscribedFamilyId !== familyId) {
                    if (unsubFamily) unsubFamily();

                    subscribedFamilyId = familyId;
                    unsubFamily = onFamilyCircleUpdate(familyId, (circle) => {
                        setFamilyError(null);
                        setFamilyCircle(circle);
                        setAuthState('authenticated'); // ✅ ONLY HERE
                    }, (error) => {
                        setFamilyError(error?.message || 'Missing or insufficient permissions while reading family data.');
                        setFamilyCircle(null);
                        setAuthState('authenticated');
                    });
                }
            });
        };

        const targetUserId = viewingAsUserId || authUser.id;
        startSubscriptions(targetUserId);

        return () => {
            if (unsubUser) unsubUser();
            if (unsubFamily) unsubFamily();
        };
    }, [authUser, viewingAsUserId]);

    /* ------------------------------------------------------------------------
       CLEAN URL REDIRECTS
    ------------------------------------------------------------------------ */
    useEffect(() => {
        if (authState !== 'authenticated') return;

        const path = window.location.pathname.toLowerCase();

        // Approved users should never see auth/funnel pages
        if (
            currentUser?.status === 'active' &&
            (path === '/login' ||
                path === '/early-access' ||
                path === '/invite-parent')
        ) {
            window.history.replaceState({}, '', '/app');
        }

        // After login → redirect into app
        if (path === '/login') {
            window.history.replaceState({}, '', '/app');
        }

        // Onboarding
        if (currentUser && !familyCircle && !path.startsWith('/app/onboarding')) {
            window.history.replaceState({}, '', '/app/onboarding');
        }
    }, [authState, currentUser, familyCircle]);

    /* ------------------------------------------------------------------------
       CONTEXT ACTIONS
    ------------------------------------------------------------------------ */
    const signOut = () => signOutUser();

    const addReply = useCallback(async (
        challengeId: string,
        payload: AddReplyPayload,
        parentId?: string,
        isCompletion = false,
        contributionValue?: number
    ) => {
        if (!currentUser || !familyCircle) return;

        let mediaUrl: string | undefined;
        if (payload.image) {
            mediaUrl = await uploadReplyImage(currentUser.id, challengeId, payload.image);
        }

        await addReplyToChallenge(
            currentUser,
            challengeId,
            familyCircle.id,
            mediaUrl,
            payload.text,
            parentId,
            isCompletion,
            contributionValue
        );
    }, [currentUser, familyCircle]);

    const deleteReply = useCallback(async (replyId: string) => {
        if (!familyCircle) return;
        await deleteReplyFromFirestore(replyId, familyCircle.id);
    }, [familyCircle]);

    const addChallenge = useCallback(async (
        exercise: Exercise,
        target: string,
        mediaUrl?: string,
        type: 'individual' | 'team' = 'individual',
        goalTotal?: number,
        unit?: string,
        durationDays?: number
    ) => {
        if (!currentUser || !familyCircle) return;

        await addChallengeToFamily(
            currentUser,
            familyCircle.id,
            exercise,
            target,
            mediaUrl,
            type,
            goalTotal,
            unit,
            durationDays
        );
    }, [currentUser, familyCircle]);

    const deleteChallenge = useCallback(async (challengeId: string) => {
        if (!familyCircle) return;
        await deleteChallengeAndReplies(challengeId, familyCircle.id);
    }, [familyCircle]);

    const updateCurrentUser = useCallback((data: Partial<User>) => {
        setCurrentUser(prev => (prev ? { ...prev, ...data } : null));
    }, []);

    const switchProfile = useCallback((userId: string) => {
        if (authUser && userId === authUser.id) {
            setViewingAsUserId(null);
        } else {
            setViewingAsUserId(userId);
        }
    }, [authUser]);

    /* ------------------------------------------------------------------------
       CONTEXT VALUE
    ------------------------------------------------------------------------ */
    const contextValue = useMemo(() => ({
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
    }), [
        currentUser,
        familyCircle,
        addReply,
        deleteReply,
        addChallenge,
        deleteChallenge,
        updateCurrentUser,
        switchProfile,
        viewingAsUserId,
        authUser
    ]);

    /* ------------------------------------------------------------------------
       ROUTING
    ------------------------------------------------------------------------ */
    const route = getPublicRoute();
    let content = null;

    // PUBLIC ROUTES
    if (route === 'privacy') {
        content = <PrivacyPolicy onBack={() => (window.location.href = '/')} />;
    } else if (route === 'delete-account') {
        content = <DeleteAccount onBack={() => (window.location.href = '/')} />;
    } else if (route === 'landing-a') {
        content = <LandingPageA />;
    } else if (route === 'landing-b') {
        content = <LandingPageB />;
    } else if (route === 'role-gate') {
        content = <RoleGate />;
    } else if (route === 'parents') {
        content = <ParentsLanding />;
    } else if (route === 'teens') {
        content = <TeensLanding />;
    } else if (route === 'invite-parent') {
        content = <InviteParent />;
    } else if (route === 'claim-invite') {
        content = <ClaimInvite />;
    } else if (route === 'early-access') {
        content = <EarlyAccess />;
    } else if (authState === 'unauthenticated' && route === 'login') {
        content = <AuthFlow />;
    }

    // LOADING
    else if (authState === 'loading') {
        content = (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    // AUTHENTICATED ROUTES
    else if (authState === 'authenticated') {
        if (familyError) {
            content = (
                <div className="flex items-center justify-center h-screen px-4">
                    <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl max-w-md shadow-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-100">
                        <h2 className="text-lg font-bold mb-2">Unable to load family data</h2>
                        <p className="text-sm mb-4">{familyError}</p>
                        <p className="text-sm text-red-700 dark:text-red-200">Please ensure this account is a member of the family circle and that family membership maps are populated.</p>
                    </div>
                </div>
            );
        } else if (currentUser?.status === 'pending_approval') {
            content = (
                <OnboardingFlow
                    user={currentUser}
                    setFamilyCircle={setFamilyCircle}
                />
            );
        } else if (window.location.pathname.toLowerCase() === '/app/admin') {
            content = <AdminPage />;
        } else {
            content = <MainApp />;
        }
    }

    // FALLBACK
    else {
        content = <AuthFlow />;
    }

    return (
        <AppContext.Provider value={contextValue}>
            {content}
        </AppContext.Provider>
    );
};

/* ============================================================================
   FINAL EXPORT
============================================================================ */
export default function WrappedApp() {
    return (
        <NotificationProvider>
            <App />
        </NotificationProvider>
    );
}
