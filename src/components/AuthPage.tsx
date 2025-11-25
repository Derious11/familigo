import React, { useState } from 'react';
import { signUpWithEmail, signInWithEmail, signInWithGoogle, onAuthStateChanged } from '../services/authService';

interface AuthPageProps {
    mode: 'login' | 'signup';
    onSwitchMode: () => void;
    onPrivacy: () => void;
}

const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5 mr-3" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.3 64.5c-24.3-23.6-57.5-38.6-96.6-38.6-74.9 0-136.6 61.2-136.6 137.2s61.7 137.2 136.6 137.2c79.4 0 119.1-57.8 124.5-87.3H248V261.8h239.2c.8 12.3 1.2 24.6 1.2 37z"></path>
    </svg>
);


const AuthPage: React.FC<AuthPageProps> = ({ mode, onSwitchMode, onPrivacy }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isLogin = mode === 'login';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (isLogin) {
            const { error } = await signInWithEmail(email, password);
            if (error) {
                setError(error);
                setIsLoading(false);
            }
        } else {
            if (!name) {
                setError('Please enter your name.');
                setIsLoading(false);
                return;
            }
            const { error } = await signUpWithEmail(name, email, password);
            if (error) {
                setError(error);
                setIsLoading(false);
            }
        }
        // On auth success, the onAuthStateChanged listener in App.tsx handles the state change,
        // which causes this component to unmount. We only need to handle the loading state on failure.
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setIsLoading(true);
        const { error } = await signInWithGoogle();
        if (error) {
            setError(error);
        }
        // If the sign-in is successful, onAuthStateChanged handles the state update.
        // If there's an error or the user cancels, we must reset the loading state.
        setIsLoading(false);
    };


    return (
        <div className="bg-brand-surface dark:bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-md">
            <h2 className="text-3xl font-bold text-center mb-6 text-brand-text-primary dark:text-gray-100">
                {isLogin ? 'Welcome Back!' : 'Create Your Account'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand-blue focus:border-brand-blue bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                            required
                        />
                    </div>
                )}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand-blue focus:border-brand-blue bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand-blue focus:border-brand-blue bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                        required
                        minLength={6}
                    />
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (isLogin ? 'Log In' : 'Sign Up')}
                    </button>
                </div>
            </form>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-brand-surface dark:bg-gray-800 text-brand-text-secondary dark:text-gray-400">Or</span>
                    </div>
                </div>

                <div className="mt-6">
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        <GoogleIcon />
                        {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
                    </button>
                </div>
            </div>

            <p className="mt-8 text-center text-sm text-brand-text-secondary dark:text-gray-400">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <button onClick={onSwitchMode} className="font-medium text-brand-blue hover:underline ml-1">
                    {isLogin ? 'Sign up' : 'Log in'}
                </button>
            </p>
            <div className="mt-4 text-center">
                <button
                    onClick={onPrivacy}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                >
                    Privacy Policy
                </button>
            </div>
        </div>
    );
};

export default AuthPage;