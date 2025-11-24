import React, { useState } from 'react';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import PrivacyPolicy from './PrivacyPolicy';

type AuthView = 'landing' | 'login' | 'signup' | 'privacy';

const AuthFlow: React.FC = () => {
    const [view, setView] = useState<AuthView>('landing');

    const renderView = () => {
        switch (view) {
            case 'login':
                return <AuthPage mode="login" onSwitchMode={() => setView('signup')} onPrivacy={() => setView('privacy')} />;
            case 'signup':
                return <AuthPage mode="signup" onSwitchMode={() => setView('login')} onPrivacy={() => setView('privacy')} />;
            case 'privacy':
                return <PrivacyPolicy onBack={() => setView('landing')} />;
            case 'landing':
            default:
                return <LandingPage onNavigate={setView} />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-in-out forwards;
                }
            `}</style>
            <div className="w-full max-w-md animate-fade-in">
                {renderView()}
            </div>
        </div>
    );
};

export default AuthFlow;
