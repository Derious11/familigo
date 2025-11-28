
import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { XMarkIcon } from './Icons';
import { updateUserWeight } from '../services/userService';
import { Challenge } from '../types';

interface LogWeightReplyModalProps {
    onClose: () => void;
    challenge: Challenge;
}

const LogWeightReplyModal: React.FC<LogWeightReplyModalProps> = ({ onClose, challenge }) => {
    const context = useContext(AppContext);
    const { currentUser, updateCurrentUser, addReply } = context || {};

    const [weight, setWeight] = useState<string>(currentUser?.currentWeight?.toString() || '');
    const [unit, setUnit] = useState<'lbs' | 'kg'>(currentUser?.weightUnit || 'lbs');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const weightValue = parseFloat(weight);
        if (isNaN(weightValue) || weightValue <= 0) {
            setError('Please enter a valid weight.');
            return;
        }
        if (!currentUser || !updateCurrentUser || !addReply) return;

        setIsLoading(true);
        setError('');
        try {
            // 1. Update user's weight profile
            await updateUserWeight(currentUser.id, weightValue, unit);

            const newHistoryEntry = { value: weightValue, timestamp: new Date() };
            const updatedHistory = [...(currentUser.weightHistory || []), newHistoryEntry];

            updateCurrentUser({
                currentWeight: weightValue,
                weightUnit: unit,
                weightHistory: updatedHistory
            });

            // 2. Add a reply to the challenge with a generic message for privacy
            const replyText = 'Logged their weight!';
            // The third argument (parentId) is undefined.
            // The fourth argument (isCompletion) is true, marking the challenge as done.
            await addReply(challenge.id, { text: replyText }, undefined, true);

            onClose();
        } catch (err) {
            setError('Failed to log weight. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-sm relative animate-fade-in-up border border-white/20" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-center mb-1 text-brand-text-primary dark:text-gray-100">Log Your Weight</h2>
                    <p className="text-center text-sm text-brand-text-secondary dark:text-gray-400 mb-4">Complete the challenge by entering your weight.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="weight-log" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Your Weight</label>
                            <div className="mt-1">
                                <input
                                    type="number"
                                    id="weight-log"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    placeholder="e.g., 150"
                                    className="block w-full sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-brand-text-primary dark:text-gray-100 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                                    step="0.1"
                                />
                                <div className="flex mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setUnit('lbs')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${unit === 'lbs' ? 'bg-white dark:bg-gray-600 text-brand-blue shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        lbs
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUnit('kg')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${unit === 'kg' ? 'bg-white dark:bg-gray-600 text-brand-blue shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        kg
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-brand-green to-emerald-600 hover:from-brand-green/90 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50"
                            >
                                {isLoading ? 'Submitting...' : 'Submit & Complete'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default LogWeightReplyModal;
