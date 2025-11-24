
import React from 'react';

interface LandingPageProps {
    onNavigate: (view: 'login' | 'signup' | 'privacy') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    return (
        <div className="text-center">
            <img src="/assets/FamiliGo_logo.png" alt="FamiliGo Logo" className="mx-auto h-20 w-20 mb-4" />
            <h1 className="text-5xl font-bold text-brand-blue mb-4">FamiliGo</h1>
            <p className="text-xl text-brand-text-secondary dark:text-gray-400 mb-8">
                Turn fitness into a fun, shared game for the whole family.
            </p>
            <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
                <img
                    src="/assets/FamiliGo_intro.gif"
                    className="rounded-lg w-full object-cover h-48"
                    alt="FamiliGo intro animation"
                />
            </div>
            <div className="space-y-4">
                <button
                    onClick={() => onNavigate('signup')}
                    className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
                >
                    Get Started
                </button>
                <button
                    onClick={() => onNavigate('login')}
                    className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-brand-text-secondary dark:text-gray-300 font-bold py-3 px-4 rounded-lg transition-colors"
                >
                    I Already Have an Account
                </button>
            </div>
            <div className="mt-8">
                <button
                    onClick={() => onNavigate('privacy')}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                >
                    Privacy Policy
                </button>
            </div>
        </div>
    );
};

export default LandingPage;