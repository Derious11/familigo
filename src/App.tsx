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
    // Alias the import to avoid naming conflicts with the local function
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

import LandingPageA from './components/Auth/LandingPageA';
import LandingPageB from './components/Auth/LandingPageB';

import RoleGate from './pages/RoleGate';
import ParentsLanding from './pages/ParentsLanding';
import TeensLanding from './pages/TeensLanding';
import EarlyAccess from './pages/EarlyAccess';
import AdminPage from './pages/AdminPage';

export const AppContext = React.createContext(null);


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
    if (path === '/early-access') return 'early-access';
    if (path === '/login') return 'login';

    // Authenticated section
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


    /* ------------------------------------------------------------------------
       AUTH LISTENER
       ------------------------------------------------------------------------ */
    useEffect(() => {
        const unsub = onAuthStateChanged(async (firebaseUser) => {
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
       USER + FAMILY SUBSCRIPTIONS
       ------------------------------------------------------------------------ */
    useEffect(() => {
        if (!authUser) return;

        let unsubUser = null;
        let unsubFamily = null;
        let subscribedFamilyId: string | null = null;

        const targetUserId = viewingAsUserId || authUser.id;
        setAuthState('loading');

        unsubUser = onUserUpdate(targetUserId, (updatedUser) => {
            if (!updatedUser) return;

            const isAuthUser = updatedUser.id === authUser.id;
            const mergedUser = isAuthUser
                ? {
                    ...updatedUser,
                    emailVerified: authUser.emailVerified,
                    isAdmin: authUser.isAdmin
                }
                : updatedUser;

            setCurrentUser(mergedUser);

            // Family circle subscription
            if (updatedUser.familyCircleId) {
                if (!unsubFamily || subscribedFamilyId !== updatedUser.familyCircleId) {
                    if (unsubFamily) unsubFamily();

                    subscribedFamilyId = updatedUser.familyCircleId;
                    unsubFamily = onFamilyCircleUpdate(
                        updatedUser.familyCircleId,
                        (circle) => {
                            setFamilyCircle(circle);
                            setAuthState('authenticated');
                        }
                    );
                } else {
                    setAuthState('authenticated');
                }
            } else {
                if (unsubFamily) unsubFamily();
                setFamilyCircle(null);
                setAuthState('authenticated');
            }
        });

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

        // After login → redirect into app
        if (path === '/login' || path === '/signin' || path === '/auth') {
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

    const addReply = useCallback(
        async (
            challengeId: string,
            payload: AddReplyPayload,
            parentId?: string,
            isCompletion: boolean = false,
            contributionValue?: number
        ) => {
            if (!currentUser || !familyCircle) return;

            let mediaUrl: string | undefined;
            if (payload.image) {
                mediaUrl = await uploadReplyImage(payload.image);
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
        },
        [currentUser, familyCircle]
    );

    // FIX: Uses the alias 'deleteReplyFromFirestore' and passes familyCircle.id
    const deleteReply = useCallback(async (replyId: string) => {
        if (!familyCircle) return;
        await deleteReplyFromFirestore(replyId, familyCircle.id);
    }, [familyCircle]);

    const addChallenge = useCallback(
        async (
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
        },
        [currentUser, familyCircle]
    );

    // FIX: Added safety check and dependency
    const deleteChallenge = useCallback(async (challengeId: string) => {
        if (!familyCircle) return;
        await deleteChallengeAndReplies(challengeId, familyCircle.id);
    }, [familyCircle]);

    const updateCurrentUser = useCallback((data: Partial<User>) => {
        setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
    }, []);

    const switchProfile = useCallback(
        (userId: string) => {
            if (authUser && userId === authUser.id) {
                setViewingAsUserId(null);
            } else {
                setViewingAsUserId(userId);
            }
        },
        [authUser]
    );


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
    }),
        [
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
        content = (
            <PrivacyPolicy onBack={() => (window.location.href = '/')} />
        );
    } else if (route === 'delete-account') {
        content = (
            <DeleteAccount onBack={() => (window.location.href = '/')} />
        );
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
        const path = window.location.pathname.toLowerCase();

        if (currentUser && !familyCircle) {
            // onboarding
            content = (
                <OnboardingFlow
                    user={currentUser}
                    setFamilyCircle={setFamilyCircle}
                />
            );
        } else if (path === '/app/admin') {
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
   FINAL EXPORT WRAPPER
   ============================================================================ */
export default function WrappedApp() {
    return (
        <NotificationProvider>
            <App />
        </NotificationProvider>
    );
}