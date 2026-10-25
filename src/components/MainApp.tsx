import React,{ lazy,Suspense,useContext,useEffect,useState } from 'react';
import { AppContext } from '../App';
import { resendVerificationEmail } from '../services/authService';
import { View } from '../types';
const CreateChallengeModal = lazy(() => import('./Challenges/CreateChallengeModal'));
const Chat = lazy(() => import('./Chat'));
import Feed from './Feed';
const FeedbackModal = lazy(() => import('./Feedback/FeedbackModal'));
import Header from './Header';
const History = lazy(() => import('./History'));
import { ChatBubbleLeftIcon,PlusIcon } from './Icons';
const Profile = lazy(() => import('./Profile'));
import './app.css';
import AchievementCelebration from './AchievementCelebration';
import { InstallCard } from '../pwa/PwaProvider';
import PushNotificationProvider from '../pwa/PushNotificationProvider';
const MainApp: React.FC = () => {
    const [activeView, setActiveView] = useState<View>(() => new URLSearchParams(location.search).get('view') === 'chat' ? 'chat' : 'feed');
    const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [verificationEmailSent, setVerificationEmailSent] = useState(false);
    const context = useContext(AppContext);
    const { currentUser } = context;
    useEffect(() => {
        const open = (event: Event) => {
            const view = (event as CustomEvent).detail;
            if (['feed', 'chat', 'profile', 'history'].includes(view)) setActiveView(view);
        };
        window.addEventListener('familigo-notification-open', open);
        return () => window.removeEventListener('familigo-notification-open', open);
    }, []);
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
                return <History onCreateChallenge={() => setIsCreateChallengeModalOpen(true)} />;
            case 'profile':
                return <Profile />;
            case 'chat':
                return <Chat />;
            case 'feed':
            default:
                return <Feed onCreateChallenge={() => setIsCreateChallengeModalOpen(true)}/>;
        }
    };
    return (<PushNotificationProvider key={currentUser.id} userId={currentUser.id}><div className={`min-h-screen bg-brand-background dark:bg-gray-900 font-sans text-brand-text-primary dark:text-gray-100 ${'app-shell'}`}>

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
                    {activeView === 'feed' && <InstallCard />}
                    <Suspense fallback={<p role="status">Loading…</p>}>{renderView()}</Suspense>
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

            <Suspense fallback={<p role="status">Loading…</p>}>{isCreateChallengeModalOpen && (<CreateChallengeModal onClose={() => setIsCreateChallengeModalOpen(false)}/>)}

            {isFeedbackModalOpen && (<FeedbackModal onClose={() => setIsFeedbackModalOpen(false)}/>)}
            </Suspense>
            {currentUser?.familyCircleId && <AchievementCelebration actorId={currentUser.id} familyCircleId={currentUser.familyCircleId} onView={() => {setActiveView('profile'); setTimeout(() => document.getElementById('achievements')?.scrollIntoView({behavior: 'auto'}), 100);}}/>}
        </div></PushNotificationProvider>);
};
export default MainApp;
