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

import LandingPageA from './components/Auth/LandingPageA';
import LandingPageB from './components/Auth/LandingPageB';

import RoleGate from './pages/RoleGate';
import ParentsLanding from './pages/ParentsLanding';
import TeensLanding from './pages/TeensLanding';
import EarlyAccess from './pages/EarlyAccess';
import AdminPage from './pages/AdminPage';
import InviteParent from './pages/InviteParent';
import ClaimInvite from './pages/ClaimInvite';
import FaqPage from './pages/FaqPage';

import { usePostHog } from 'posthog-js/react';

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
    if (path === '/faq') return 'faq';
    if (path.startsWith('/app')) return 'app';

    return 'unknown';
};

/* ============================================================================
   POSTHOG HELPERS
============================================================================ */

type Role = 'parent' | 'teen' | 'child' | 'unknown';

function safeRole(user: Partial<User> | null | undefined): Role {
    const r = (user as any)?.role;
    if (r === 'parent' || r === 'teen' || r === 'child') return r;
    return 'unknown';
}

/**
 * Ensure every meaningful event has the family group attached when available.
 * Note: groups are event-scoped; calling posthog.group() helps future events,
 * but we ALSO attach $groups explicitly to prevent edge cases.
 */
function withFamilyGroup(familyId?: string | null) {
    return familyId
        ? { $groups: { family: familyId } as const }
        : {};
}

/* ============================================================================
   MAIN APP
============================================================================ */
const App: React.FC = () => {
    const posthog = usePostHog();

    const [authState, setAuthState] = useState<AuthState>('loading');
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [familyCircle, setFamilyCircle] = useState<FamilyCircle | null>(null);
    const [viewingAsUserId, setViewingAsUserId] = useState<string | null>(null);
    const [familyError, setFamilyError] = useState<string | null>(null);

    // Track app open once on mount (sanity check)
    useEffect(() => {
        posthog?.capture('app_opened', {
            route: getPublicRoute(),
            path: window.location.pathname.toLowerCase()
        });
    }, [posthog]);

    /**
     * Track route changes (simple "page view" replacement).
     * Since you're not using react-router, we listen to:
     * - initial mount
     * - back/forward navigation (popstate)
     *
     * IMPORTANT: pushes via window.history.replaceState do not emit popstate,
     * so we also capture in your redirect effect below.
     */
    useEffect(() => {
        const captureRouteView = () => {
            posthog?.capture('route_viewed', {
                route: getPublicRoute(),
                path: window.location.pathname.toLowerCase()
            });
        };

        captureRouteView(); // initial
        window.addEventListener('popstate', captureRouteView);

        return () => window.removeEventListener('popstate', captureRouteView);
    }, [posthog]);

    /* ------------------------------------------------------------------------
       AUTH LISTENER
    ------------------------------------------------------------------------ */
    useEffect(() => {
        const unsub = onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                setAuthUser(firebaseUser);

                // Identify user in PostHog if logged in
                const role = safeRole(firebaseUser);
                const familyId = (firebaseUser as any).familyCircleId ?? null;

                posthog?.identify(firebaseUser.id, {
                    email: (firebaseUser as any).email ?? undefined,
                    role,
                    family_id: familyId ?? undefined
                });

                // Register family group (enables group analytics)
                if (familyId) {
                    posthog?.group('family', familyId);
                }

                // Capture login/session established
                posthog?.capture('auth_signed_in', {
                    role,
                    ...withFamilyGroup(familyId)
                });
            } else {
                // Capture sign-out before reset
                posthog?.capture('auth_signed_out');

                setAuthUser(null);
                setCurrentUser(null);
                setFamilyCircle(null);
                setViewingAsUserId(null);
                setAuthState('unauthenticated');

                posthog?.reset();
            }
        });

        return () => unsub();
    }, [posthog]);

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

                    posthog?.capture('user_profile_missing', {
                        is_impersonating: false
                    });

                    return;
                }

                const isAuthUser = updatedUser.id === authUser.id;
                const mergedUser = isAuthUser
                    ? {
                        ...updatedUser,
                        emailVerified: (authUser as any).emailVerified,
                        isAdmin: (authUser as any).isAdmin
                    }
                    : updatedUser;

                setCurrentUser(mergedUser);

                // Keep PostHog person properties fresh (role/family can change after onboarding)
                const role = safeRole(mergedUser);
                const familyId = mergedUser.familyCircleId ?? null;

                posthog?.identify(authUser.id, {
                    role,
                    family_id: familyId ?? undefined
                });

                if (familyId) {
                    posthog?.group('family', familyId);
                }

                const isImpersonating = targetUserId !== authUser.id;

                // Capture app session ready (for retention cohorts, etc.)
                posthog?.capture('session_user_loaded', {
                    role,
                    is_impersonating: isImpersonating,
                    ...withFamilyGroup(familyId)
                });

                // CASE 1: User has NO family → app is ready immediately
                if (!familyId) {
                    if (unsubFamily) unsubFamily();
                    unsubFamily = null;
                    subscribedFamilyId = null;
                    setFamilyCircle(null);
                    setAuthState('authenticated');

                    return;
                }

                // CASE 2: User HAS family → wait for family snapshot
                if (!unsubFamily || subscribedFamilyId !== familyId) {
                    if (unsubFamily) unsubFamily();

                    subscribedFamilyId = familyId;
                    unsubFamily = onFamilyCircleUpdate(
                        familyId,
                        (circle) => {
                            setFamilyError(null);
                            setFamilyCircle(circle);
                            setAuthState('authenticated');

                            // Family data loaded successfully
                            posthog?.capture('family_loaded', {
                                role,
                                ...withFamilyGroup(familyId)
                            });
                        },
                        (error) => {
                            setFamilyError(
                                error?.message ||
                                'Missing or insufficient permissions while reading family data.'
                            );
                            setFamilyCircle(null);
                            setAuthState('authenticated');

                            // Track family load failures
                            posthog?.capture('family_load_failed', {
                                role,
                                error: error?.message ?? 'unknown_error',
                                ...withFamilyGroup(familyId)
                            });
                        }
                    );
                }
            });
        };

        const targetUserId = viewingAsUserId || authUser.id;
        startSubscriptions(targetUserId);

        return () => {
            if (unsubUser) unsubUser();
            if (unsubFamily) unsubFamily();
        };
    }, [authUser, viewingAsUserId, posthog]);

    /* ------------------------------------------------------------------------
       CLEAN URL REDIRECTS + ROUTE VIEW TRACKING
    ------------------------------------------------------------------------ */
    useEffect(() => {
        if (authState !== 'authenticated') return;

        const path = window.location.pathname.toLowerCase();

        const role = safeRole(currentUser);
        const familyId = currentUser?.familyCircleId ?? null;

        // Approved users should never see auth/funnel pages
        if (
            currentUser?.status === 'active' &&
            (path === '/login' || path === '/early-access' || path === '/invite-parent')
        ) {
            window.history.replaceState({}, '', '/app');

            // Because replaceState doesn't trigger popstate, capture route_viewed here
            posthog?.capture('route_viewed', {
                route: getPublicRoute(),
                path: '/app',
                redirected_from: path,
                ...withFamilyGroup(familyId)
            });
        }

        // After login → redirect into app
        if (path === '/login') {
            window.history.replaceState({}, '', '/app');

            posthog?.capture('route_viewed', {
                route: getPublicRoute(),
                path: '/app',
                redirected_from: '/login',
                ...withFamilyGroup(familyId)
            });
        }

        // Onboarding
        if (currentUser && !familyCircle && !path.startsWith('/app/onboarding')) {
            window.history.replaceState({}, '', '/app/onboarding');

            posthog?.capture('route_viewed', {
                route: 'app-onboarding',
                path: '/app/onboarding',
                redirected_from: path,
                role,
                ...withFamilyGroup(familyId)
            });
        }
    }, [authState, currentUser, familyCircle, posthog]);

    /* ------------------------------------------------------------------------
       CONTEXT ACTIONS
    ------------------------------------------------------------------------ */
    const signOut = () => signOutUser();

    const addReply = useCallback(
        async (
            challengeId: string,
            payload: AddReplyPayload,
            parentId?: string,
            isCompletion = false,
            contributionValue?: number
        ) => {
            if (!currentUser || !familyCircle) return;

            let mediaUrl: string | undefined;
            if (payload.image) {
                mediaUrl = await uploadReplyImage(
                    currentUser.id,
                    challengeId,
                    payload.image
                );
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

            // PostHog: meaningful engagement
            posthog?.capture('meaningful_action', {
                action_type: isCompletion ? 'challenge_completed' : 'reply_added',
                role: safeRole(currentUser),
                challenge_id: challengeId,
                has_image: !!payload.image,
                is_completion: !!isCompletion,
                contribution_value: contributionValue ?? undefined,
                ...withFamilyGroup(familyCircle.id)
            });
        },
        [currentUser, familyCircle, posthog]
    );

    const deleteReply = useCallback(
        async (replyId: string) => {
            if (!familyCircle) return;

            await deleteReplyFromFirestore(replyId, familyCircle.id);

            // Optional: track moderation/cleanup behavior (can remove if you prefer)
            posthog?.capture('reply_deleted', {
                reply_id: replyId,
                ...withFamilyGroup(familyCircle.id)
            });
        },
        [familyCircle, posthog]
    );

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

            // PostHog: onboarding + meaningful action
            // Use BOTH: specific event for funnels and generalized for WAF/retention
            posthog?.capture('challenge_started', {
                role: safeRole(currentUser),
                type,
                unit: unit ?? undefined,
                duration_days: durationDays ?? undefined,
                has_media: !!mediaUrl,
                goal_total: goalTotal ?? undefined,
                exercise_name: (exercise as any)?.name ?? undefined,
                ...withFamilyGroup(familyCircle.id)
            });

            posthog?.capture('meaningful_action', {
                action_type: 'challenge_started',
                role: safeRole(currentUser),
                type,
                ...withFamilyGroup(familyCircle.id)
            });
        },
        [currentUser, familyCircle, posthog]
    );

    const deleteChallenge = useCallback(
        async (challengeId: string) => {
            if (!familyCircle) return;

            await deleteChallengeAndReplies(challengeId, familyCircle.id);

            posthog?.capture('challenge_deleted', {
                challenge_id: challengeId,
                ...withFamilyGroup(familyCircle.id)
            });
        },
        [familyCircle, posthog]
    );

    const updateCurrentUser = useCallback((data: Partial<User>) => {
        setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
    }, []);

    const switchProfile = useCallback(
        (userId: string) => {
            const isSwitchingBack = authUser && userId === authUser.id;

            if (isSwitchingBack) {
                setViewingAsUserId(null);
            } else {
                setViewingAsUserId(userId);
            }

            // Track impersonation/profile switch for debugging behavior
            posthog?.capture('profile_switched', {
                to_user_id: userId,
                is_impersonating: !isSwitchingBack
            });
        },
        [authUser, posthog]
    );

    /* ------------------------------------------------------------------------
       CONTEXT VALUE
    ------------------------------------------------------------------------ */
    const contextValue = useMemo(
        () => ({
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
        ]
    );

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
    } else if (route === 'faq') {
        content = <FaqPage />;
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
                        <p className="text-sm text-red-700 dark:text-red-200">
                            Please ensure this account is a member of the family circle and that family membership maps are populated.
                        </p>
                    </div>
                </div>
            );
        } else if (currentUser && (currentUser.status === 'pending_approval' || !familyCircle)) {
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
