import { usePostHog } from 'posthog-js/react';
import React,{ useEffect,useState } from 'react';
import { createFamilyCircle,joinFamilyCircle } from '../services/familyService';
import { FamilyCircle,User } from '../types';
import AccountStateFrame from './AccountStateFrame';
interface OnboardingFlowProps {
    user: User;
    setFamilyCircle: (circle: FamilyCircle) => void;
    readOnly?: boolean;
}
type OnboardingStep = 'initial' | 'create' | 'join' | 'created';
const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ user, setFamilyCircle, readOnly = false }) => {
    const [step, setStep] = useState<OnboardingStep>(user.familyCreationApproved ? 'create' : 'initial');
    const [familyName, setFamilyName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [newCircle, setNewCircle] = useState<FamilyCircle | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const posthog = usePostHog();
    useEffect(() => {
        if (readOnly)
            return;
        if (user.familyCreationApproved) {
            sessionStorage.removeItem('pendingInviteCode');
            setStep('create');
            return;
        }
        const pendingInviteCode = sessionStorage.getItem('pendingInviteCode');
        if (pendingInviteCode) {
            setStep('join');
            setInviteCode(pendingInviteCode);
            // Clear the code from storage so it's not used again
            sessionStorage.removeItem('pendingInviteCode');
        }
    }, [readOnly, user.familyCreationApproved]);
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (readOnly) {
            setError('This is a visual review. No family will be created.');
            return;
        }
        if (!familyName.trim()) {
            setError("Please enter a name for your family circle.");
            return;
        }
        setIsLoading(true);
        try {
            const circle = await createFamilyCircle(user.id, familyName.trim());
            // Track event
            posthog?.group('family', circle.id);
            posthog?.capture('family_circle_created', {
                $groups: { family: circle.id },
                family_id: circle.id,
            });
            posthog?.capture('family_circle_joined', {
                $groups: { family: circle.id },
                family_id: circle.id,
                join_source: 'invite_code'
            });
            // Skip 'created' step and jump straight to app -> profile -> manage family
            sessionStorage.setItem('justCreatedFamily', 'true');
            setNewCircle(circle);
            setIsLoading(false);
            setFamilyCircle(circle);
        }
        catch {
            setError('Could not create your family. Please try again.');
        }
        finally {
            setIsLoading(false);
        }
        // Note: setFamilyCircle triggers App.tsx to switch to MainApp
    };
    const handleJoinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (readOnly) {
            setError('This is a visual review. No family will be joined.');
            return;
        }
        if (!inviteCode) {
            setError("Please enter an invite code.");
            return;
        }
        setIsLoading(true);
        try {
            const { circle, error } = await joinFamilyCircle(inviteCode.trim());
            setIsLoading(false);
            if (circle) {
                setFamilyCircle(circle);
            }
            else {
                setError(error || "An unknown error occurred.");
            }
        }
        catch {
            setError('Could not join this family. Please try again.');
        }
        finally {
            setIsLoading(false);
        }
    };
    const renderStep = () => {
        switch (step) {
            case 'create':
                return (<form onSubmit={handleCreateSubmit} className="w-full">
                        <h2 className="text-2xl font-bold text-center mb-2 dark:text-gray-100">Create Your Circle</h2>
                        <p className="text-center text-brand-text-secondary dark:text-gray-400 mb-6">Give your family circle a fun name!</p>
                        <input type="text" aria-label="Family name" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="e.g., The Miller Mob" className="w-full text-center text-lg p-3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-brand-blue focus:border-brand-blue"/>
                        {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full mt-4 bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50">
                            {isLoading ? 'Creating...' : 'Create'}
                        </button>
                        <button type="button" onClick={() => setStep('initial')} className="w-full mt-2 text-sm text-brand-text-secondary dark:text-gray-400 hover:underline">Back</button>
                    </form>);
            case 'join':
                return (<form onSubmit={handleJoinSubmit} className="w-full">
                        <h2 className="text-2xl font-bold text-center mb-2 dark:text-gray-100">Join a Circle</h2>
                        <p className="text-center text-brand-text-secondary dark:text-gray-400 mb-6">Enter the invite code from your family.</p>
                        <input type="text" aria-label="Family invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="ABC-1234" className="w-full text-center tracking-widest font-mono text-lg p-3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-brand-blue focus:border-brand-blue"/>
                        {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full mt-4 bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50">
                            {isLoading ? 'Joining...' : 'Join'}
                        </button>
                        <button type="button" onClick={() => setStep('initial')} className="w-full mt-2 text-sm text-brand-text-secondary dark:text-gray-400 hover:underline">Back</button>
                    </form>);
            case 'created':
                return (<div className="w-full text-center">
                        <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">Circle Created!</h2>
                        <p className="text-brand-text-secondary dark:text-gray-400 mb-4">Share this code with your family so they can join:</p>
                        <div className="bg-blue-100/50 dark:bg-blue-900/30 border-2 border-dashed border-brand-blue rounded-lg p-4 mb-6">
                            <p className="font-mono text-3xl font-bold text-brand-blue dark:text-blue-300 tracking-widest">{newCircle?.inviteCode}</p>
                        </div>
                        <button onClick={() => setFamilyCircle(newCircle!)} className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105">
                            Let's Go!
                        </button>
                    </div>);
            case 'initial':
            default:
                return (<>
                        <h1 className="text-4xl font-bold text-center mb-2 dark:text-gray-100">Welcome, {user.name}!</h1>
                        <p className="text-lg text-center text-brand-text-secondary dark:text-gray-400 mb-8">Let's get you set up.</p>
                        <div className="w-full space-y-4">
                            {user.role !== 'teen' && (<button onClick={() => setStep('create')} className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg transition-transform transform hover:scale-105 text-lg">
                                    Create a Family Circle
                                </button>)}
                            <button onClick={() => setStep('join')} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-brand-text-secondary dark:text-gray-300 font-bold py-4 px-4 rounded-lg transition-colors text-lg">
                                Join an Existing Circle
                            </button>
                        </div>
                    </>);
        }
    };
    return <AccountStateFrame><p className="app-eyebrow">Your adventure starts together</p><img className="app-account-gogo" src="/assets/brand/gogo-wave.webp" width="1024" height="1536" alt="GoGo waving hello."/>{renderStep()}</AccountStateFrame>;
};
export default OnboardingFlow;
