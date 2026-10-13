import React,{ useContext,useEffect,useState } from 'react';
import { AppContext } from '../App';
import { resendVerificationEmail } from '../services/authService';
import { View } from '../types';
import CreateChallengeModal from './Challenges/CreateChallengeModal';
import Chat from './Chat';
import Feed from './Feed';
import FeedbackModal from './Feedback/FeedbackModal';
import Header from './Header';
import History from './History';
import { ChatBubbleLeftIcon,PlusIcon } from './Icons';
import Profile from './Profile';
import './app.css';
import AchievementCelebration from './AchievementCelebration';
const MainApp: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('feed');
    const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [verificationEmailSent, setVerificationEmailSent] = useState(false);
    const context = useContext(AppContext);
    const { currentUser } = context;
    useEffect(() => {
        document.getElementById('root')?.scrollTo({ top: 0, behavior: 'auto' });
    }, [activeView]);
    useEffect(() => {
        const justCreated = sessionStorage.getItem('justCreatedFamily');
        if (justCreated) {
            setActiveView('profile');
            // We do NOT remove it here, we let Profile consume it to open the modal
        }
    }, []);
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
                return <Feed onCreateChallenge={() => setIsCreateChallengeModalOpen(true)}/>;
        }
    };
    return (<div className={`min-h-screen bg-brand-background dark:bg-gray-900 font-sans text-brand-text-primary dark:text-gray-100 ${'app-shell'}`}>

            {currentUser &&
            currentUser.email &&
            currentUser.role !== 'child' &&
            !currentUser.emailVerified && (<div className="bg-yellow-100 border-b-2 border-yellow-300 dark:bg-yellow-900/50 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 p-3 text-center text-sm sticky top-0 z-50">
                        {verificationEmailSent ? (<span>Verification email sent! Check your inbox.</span>) : (<>
                                Please check your email to verify your account.
                                <button onClick={handleResendEmail} className="font-bold underline ml-2 hover:text-yellow-900 dark:hover:text-yellow-100">
                                    Resend email
                                </button>
                            </>)}
                    </div>)}

            <div className="max-w-2xl mx-auto pb-24 app-shell-width">
                <Header activeView={activeView} setActiveView={setActiveView}/>
                <main className="p-4 app-main-content">
                    {renderView()}
                </main>
            </div>

            {/* Feedback Button (Left) */}
            {(activeView !== 'chat') && <>
            <button onClick={() => setIsFeedbackModalOpen(true)} className="fixed bottom-6 left-6 bg-white dark:bg-gray-800 text-brand-text-secondary dark:text-gray-400 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 transition-transform transform hover:scale-110 z-40" aria-label="Send feedback">
                <ChatBubbleLeftIcon className="w-6 h-6"/>
            </button>

            {/* Create Challenge Button (Right) */}
            <button onClick={() => setIsCreateChallengeModalOpen(true)} className="fixed bottom-6 right-6 bg-brand-blue hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-transform transform hover:scale-110 z-40" aria-label="Create new challenge">
                <PlusIcon className="w-8 h-8"/>
            </button>
            </>}

            {isCreateChallengeModalOpen && (<CreateChallengeModal onClose={() => setIsCreateChallengeModalOpen(false)}/>)}

            {isFeedbackModalOpen && (<FeedbackModal onClose={() => setIsFeedbackModalOpen(false)}/>)}
            {currentUser?.familyCircleId && <AchievementCelebration actorId={currentUser.id} familyCircleId={currentUser.familyCircleId} onView={() => {setActiveView('profile'); setTimeout(() => document.getElementById('achievements')?.scrollIntoView({behavior: 'auto'}), 100);}}/>}
        </div>);
};
export default MainApp;
