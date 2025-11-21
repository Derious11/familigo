

import React, { useState, useContext } from 'react';
import { View } from '../types';
import Header from './Header';
import Feed from './Feed';
import History from './History';
import Profile from './Profile';
import { AppContext } from '../App';
import { resendVerificationEmail } from '../services/firebaseService';
import CreateChallengeModal from './CreateChallengeModal';
import Chat from './Chat';
import { PlusIcon } from './Icons';

const MainApp: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('feed');
    const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
    const context = useContext(AppContext);
    const { currentUser } = context || {};
    const [verificationEmailSent, setVerificationEmailSent] = useState(false);

    const handleResendEmail = async () => {
        const { success } = await resendVerificationEmail();
        if (success) {
            setVerificationEmailSent(true);
            setTimeout(() => setVerificationEmailSent(false), 5000); // Reset after 5s
        }
    };

    const renderView = () => {
        switch (activeView) {
            case 'history':
                return <History />;
            case 'profile':
                return <Profile />;
            case 'chat':
                return <Chat />;
            case 'feed':
            default:
                return <Feed />;
        }
    };

    return (
        <div className="min-h-screen bg-brand-background dark:bg-gray-900 font-sans text-brand-text-primary dark:text-gray-100">
            {currentUser && !currentUser.emailVerified && (
                <div className="bg-yellow-100 border-b-2 border-yellow-300 dark:bg-yellow-900/50 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 p-3 text-center text-sm sticky top-0 z-50">
                    {verificationEmailSent ? (
                        <span>Verification email sent! Check your inbox.</span>
                    ) : (
                        <>
                            Please check your email to verify your account.
                            <button onClick={handleResendEmail} className="font-bold underline ml-2 hover:text-yellow-900 dark:hover:text-yellow-100">
                                Resend email
                            </button>
                        </>
                    )}
                </div>
            )}
            <div className="max-w-2xl mx-auto pb-24">
                <Header activeView={activeView} setActiveView={setActiveView} />
                <main className="p-4">
                    {renderView()}
                </main>
            </div>

            <button
                onClick={() => setIsCreateChallengeModalOpen(true)}
                className="fixed bottom-6 right-6 bg-brand-blue hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-transform transform hover:scale-110 z-40"
                aria-label="Create new challenge"
            >
                <PlusIcon className="w-8 h-8" />
            </button>

            {isCreateChallengeModalOpen && (
                <CreateChallengeModal onClose={() => setIsCreateChallengeModalOpen(false)} />
            )}
        </div>
    );
};

export default MainApp;