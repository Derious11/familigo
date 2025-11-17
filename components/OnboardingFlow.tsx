
import React, { useState, useEffect } from 'react';
import { User, FamilyCircle } from '../types';
import { createFamilyCircle, joinFamilyCircle } from '../services/firebaseService';

interface OnboardingFlowProps {
    user: User;
    setFamilyCircle: (circle: FamilyCircle) => void;
}

type OnboardingStep = 'initial' | 'create' | 'join' | 'created';

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ user, setFamilyCircle }) => {
    const [step, setStep] = useState<OnboardingStep>('initial');
    const [familyName, setFamilyName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [newCircle, setNewCircle] = useState<FamilyCircle | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const pendingInviteCode = sessionStorage.getItem('pendingInviteCode');
        if (pendingInviteCode) {
            setStep('join');
            setInviteCode(pendingInviteCode);
            // Clear the code from storage so it's not used again
            sessionStorage.removeItem('pendingInviteCode');
        }
    }, []);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!familyName) {
            setError("Please enter a name for your family circle.");
            return;
        }
        setIsLoading(true);
        const circle = await createFamilyCircle(user.id, familyName);
        setNewCircle(circle);
        setIsLoading(false);
        setStep('created');
    };

    const handleJoinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!inviteCode) {
            setError("Please enter an invite code.");
            return;
        }
        setIsLoading(true);
        const { circle, error } = await joinFamilyCircle(user.id, inviteCode);
        setIsLoading(false);
        if (circle) {
            setFamilyCircle(circle);
        } else {
            setError(error || "An unknown error occurred.");
        }
    };
    
    const renderStep = () => {
        switch (step) {
            case 'create':
                return (
                     <form onSubmit={handleCreateSubmit} className="w-full">
                        <h2 className="text-2xl font-bold text-center mb-2 dark:text-gray-100">Create Your Circle</h2>
                        <p className="text-center text-brand-text-secondary dark:text-gray-400 mb-6">Give your family circle a fun name!</p>
                        <input
                            type="text"
                            value={familyName}
                            onChange={(e) => setFamilyName(e.target.value)}
                            placeholder="e.g., The Miller Mob"
                            className="w-full text-center text-lg p-3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                        />
                        {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full mt-4 bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50">
                             {isLoading ? 'Creating...' : 'Create'}
                        </button>
                         <button onClick={() => setStep('initial')} className="w-full mt-2 text-sm text-brand-text-secondary dark:text-gray-400 hover:underline">Back</button>
                    </form>
                );
            case 'join':
                return (
                     <form onSubmit={handleJoinSubmit} className="w-full">
                        <h2 className="text-2xl font-bold text-center mb-2 dark:text-gray-100">Join a Circle</h2>
                        <p className="text-center text-brand-text-secondary dark:text-gray-400 mb-6">Enter the invite code from your family.</p>
                        <input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            placeholder="ABC-1234"
                            className="w-full text-center tracking-widest font-mono text-lg p-3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                        />
                         {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full mt-4 bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50">
                           {isLoading ? 'Joining...' : 'Join'}
                        </button>
                         <button onClick={() => setStep('initial')} className="w-full mt-2 text-sm text-brand-text-secondary dark:text-gray-400 hover:underline">Back</button>
                    </form>
                );
            case 'created':
                return (
                    <div className="w-full text-center">
                        <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">Circle Created!</h2>
                        <p className="text-brand-text-secondary dark:text-gray-400 mb-4">Share this code with your family so they can join:</p>
                        <div className="bg-blue-100/50 dark:bg-blue-900/30 border-2 border-dashed border-brand-blue rounded-lg p-4 mb-6">
                            <p className="font-mono text-3xl font-bold text-brand-blue dark:text-blue-300 tracking-widest">{newCircle?.inviteCode}</p>
                        </div>
                        <button onClick={() => setFamilyCircle(newCircle!)} className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105">
                           Let's Go!
                        </button>
                    </div>
                );
            case 'initial':
            default:
                return (
                    <>
                        <h1 className="text-4xl font-bold text-center mb-2 dark:text-gray-100">Welcome, {user.name}!</h1>
                        <p className="text-lg text-center text-brand-text-secondary dark:text-gray-400 mb-8">Let's get you set up.</p>
                        <div className="w-full space-y-4">
                            <button onClick={() => setStep('create')} className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg transition-transform transform hover:scale-105 text-lg">
                                Create a Family Circle
                            </button>
                             <button onClick={() => setStep('join')} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-brand-text-secondary dark:text-gray-300 font-bold py-4 px-4 rounded-lg transition-colors text-lg">
                                Join an Existing Circle
                            </button>
                        </div>
                    </>
                );

        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-brand-surface dark:bg-gray-800 p-8 rounded-2xl shadow-lg flex flex-col items-center">
                 {renderStep()}
            </div>
        </div>
    );
};

export default OnboardingFlow;