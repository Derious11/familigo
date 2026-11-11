import Modal from '../../ui/Modal';
import React, { useState, useRef, useContext } from 'react';
import { AppContext } from '../../../App';
import { XMarkIcon } from '../../Icons';
import { updateUserWeight } from '../../../services/userService';
import { User } from '../../../types';

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
    const weightRequest = useRef({key:'', id:''});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        const weightValue = parseFloat(weight);
        if (isNaN(weightValue) || weightValue <= 0) {
            setError('Please enter a valid weight.');
            return;
        }
        if (!currentUser || !updateCurrentUser) return;

        setIsLoading(true);
        setError('');
        try {
            const key = JSON.stringify([weightValue, unit]);
            if (weightRequest.current.key !== key) weightRequest.current = {key, id:crypto.randomUUID()};
            await updateUserWeight(currentUser.id, weightValue, unit, weightRequest.current.id);


            updateCurrentUser({
                currentWeight: weightValue,
                weightUnit: unit,
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
        <Modal isOpen={true} onClose={() => { if (!isLoading) onClose(); }} title="Update Weight">
            <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="weight" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Your Weight</label>
                            <div className="mt-1">
                                <input
                                    type="number"
                                    id="weight"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    placeholder="e.g., 150"
                                    className="block w-full sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-brand-text-primary dark:text-gray-100 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                                    step="0.1"
                                />
                                <div className="flex mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                    <button
                                        type="button"
                                        aria-pressed={unit === 'lbs'} onClick={() => setUnit('lbs')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${unit === 'lbs' ? 'bg-white dark:bg-gray-600 text-brand-blue shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        lbs
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={unit === 'kg'} onClick={() => setUnit('kg')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${unit === 'kg' ? 'bg-white dark:bg-gray-600 text-brand-blue shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        kg
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && <p role="alert" className="text-red-600 dark:text-red-300 text-sm text-center">{error}</p>}

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
        </Modal>
    );
};

export default UpdateWeightModal;