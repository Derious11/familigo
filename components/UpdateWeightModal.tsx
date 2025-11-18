import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { XMarkIcon } from './Icons';
import { updateUserWeight } from '../services/firebaseService';
import { User } from '../types';

interface UpdateWeightModalProps {
    onClose: () => void;
}

const UpdateWeightModal: React.FC<UpdateWeightModalProps> = ({ onClose }) => {
    const context = useContext(AppContext);
    const { currentUser, updateCurrentUser } = context || {};
    
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
        if (!currentUser || !updateCurrentUser) return;

        setIsLoading(true);
        setError('');
        try {
            await updateUserWeight(currentUser.id, weightValue, unit);

            const newHistoryEntry = { value: weightValue, timestamp: new Date() };
            const updatedHistory = [...(currentUser.weightHistory || []), newHistoryEntry];
            
            updateCurrentUser({ 
                currentWeight: weightValue, 
                weightUnit: unit,
                weightHistory: updatedHistory,
            });

            onClose();
        } catch (err) {
            setError('Failed to update weight. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm relative animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-center mb-4 text-brand-text-primary dark:text-gray-100">Update Weight</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="weight" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Your Weight</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    type="number"
                                    id="weight"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    placeholder="e.g., 150"
                                    className="block w-full pr-12 sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-brand-text-primary dark:text-gray-100 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                                    step="0.1"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center">
                                    <select
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value as 'lbs' | 'kg')}
                                        className="h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 dark:text-gray-300 sm:text-sm rounded-md focus:ring-0 focus:border-0"
                                    >
                                        <option>lbs</option>
                                        <option>kg</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
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

export default UpdateWeightModal;