import React, { useState } from 'react';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';

type AuthView = 'landing' | 'login' | 'signup';

const AuthFlow: React.FC = () => {
    const [view, setView] = useState<AuthView>('landing');

    const renderView = () => {
        switch (view) {
            case 'login':
                return <AuthPage mode="login" onSwitchMode={() => setView('signup')} />;
            case 'signup':
                return <AuthPage mode="signup" onSwitchMode={() => setView('login')} />;
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
