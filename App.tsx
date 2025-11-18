
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, FamilyCircle, AuthState, Exercise, AddReplyPayload } from './types';
import { onAuthStateChanged, getUserFamilyCircle, signOutUser, addChallengeToFamily, addReplyToChallenge, deleteReply as deleteReplyFromFirestore, uploadReplyImage, deleteChallengeAndReplies } from './services/firebaseService';
import MainApp from './components/MainApp';
import AuthFlow from './components/AuthFlow';
import OnboardingFlow from './components/OnboardingFlow';
import { auth } from './firebaseConfig';
import { initializeFCM } from './services/pushNotificationService';

export const AppContext = React.createContext<{
    currentUser: User | null;
    familyCircle: FamilyCircle | null;
    addReply: (challengeId: string, payload: AddReplyPayload, parentId?: string, isCompletion?: boolean) => Promise<void>;
    deleteReply: (replyId: string) => Promise<void>;
    addChallenge: (exercise: Exercise, target: string, mediaUrl?: string) => Promise<void>;
    deleteChallenge: (challengeId: string) => Promise<void>;
    signOut: () => void;
    setFamilyCircle: (circle: FamilyCircle | null) => void;
    updateCurrentUser: (userData: Partial<User>) => void;
} | null>(null);


const App: React.FC = () => {
    const [authState, setAuthState] = useState<AuthState>('loading');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [familyCircle, setFamilyCircle] = useState<FamilyCircle | null>(null);

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
        // Initialize Firebase Cloud Messaging to listen for foreground notifications
        initializeFCM();
    }, []);

    useEffect(() => {
        if (typeof auth === 'undefined') return;

        const unsubscribe = onAuthStateChanged(async (user) => {
            if (user) {
                setCurrentUser(user);
                setAuthState('loading'); 
                if (user.familyCircleId) {
                    const circle = await getUserFamilyCircle(user.familyCircleId);
                    setFamilyCircle(circle);
                } else {
                    setFamilyCircle(null);
                }
                setAuthState('authenticated');
            } else {
                setCurrentUser(null);
                setFamilyCircle(null);
                setAuthState('unauthenticated');
            }
        });
        return () => unsubscribe();
    }, []);

    const signOut = () => {
        signOutUser();
    };

    const addReply = useCallback(async (challengeId: string, payload: AddReplyPayload, parentId?: string, isCompletion: boolean = false) => {
        if (!currentUser || !familyCircle) return;
        
        let mediaUrl: string | undefined = undefined;
        if (payload.image) {
            mediaUrl = await uploadReplyImage(payload.image);
        }
        
        await addReplyToChallenge(currentUser, challengeId, familyCircle.id, mediaUrl, payload.text, parentId, isCompletion);
    }, [currentUser, familyCircle]);

    const deleteReply = useCallback(async (replyId: string) => {
        await deleteReplyFromFirestore(replyId);
    }, []);

    const addChallenge = useCallback(async (exercise: Exercise, target: string, mediaUrl?: string) => {
        if (!currentUser || !familyCircle) return;
        await addChallengeToFamily(currentUser, familyCircle.id, exercise, target, mediaUrl);
    }, [currentUser, familyCircle]);

    const deleteChallenge = useCallback(async (challengeId: string) => {
        await deleteChallengeAndReplies(challengeId);
    }, []);

    const updateCurrentUser = useCallback((userData: Partial<User>) => {
        setCurrentUser(prevUser => prevUser ? { ...prevUser, ...userData } : null);
    }, []);

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
    }), [currentUser, familyCircle, addReply, deleteReply, addChallenge, deleteChallenge, updateCurrentUser]);


    const renderContent = () => {
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
        <AppContext.Provider value={appContextValue}>
            <div className="min-h-screen bg-brand-background dark:bg-gray-900 font-sans text-brand-text-primary dark:text-gray-100">{renderContent()}</div>
        </AppContext.Provider>
    );
};

export default App;