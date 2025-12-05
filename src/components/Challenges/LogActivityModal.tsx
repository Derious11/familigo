import React, { useState, useContext } from 'react';
import { AppContext } from '../../App';
import { Challenge } from '../../types';
import Modal from '../ui/Modal';

interface LogActivityModalProps {
    onClose: () => void;
    challenge: Challenge;
}

const LogActivityModal: React.FC<LogActivityModalProps> = ({ onClose, challenge }) => {
    const context = useContext(AppContext);
    const { currentUser, addReply } = context || {};

    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        if (!currentUser || !addReply) return;

        setIsLoading(true);
        setError('');
        try {
            // Add a reply to the challenge with the contribution value
            const replyText = `Logged ${amountValue} ${challenge.unit || ''}`;
            // The third argument (parentId) is undefined.
            // The fourth argument (isCompletion) is false (or true? For team challenges, individual contribution doesn't complete the challenge for everyone, but maybe marks it as "participated"? 
            // Actually, the backend logic for addReplyToChallenge handles updating the total.
            // Let's pass isCompletion=true so it adds the user to completedBy if they haven't been added yet (tracking participation).

            await addReply(challenge.id, { text: replyText }, undefined, true, amountValue);

            onClose();
        } catch (err) {
            setError('Failed to log activity. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Log Activity"
        >
            <div className="space-y-4">
                <p className="text-center text-sm text-brand-text-secondary dark:text-gray-400">
                    Contribute to the team goal! <br />
                    <span className="font-semibold text-brand-blue">{challenge.currentTotal || 0} / {challenge.goalTotal} {challenge.unit}</span>
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="amount-log" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">
                            Amount ({challenge.unit})
                        </label>
                        <input
                            type="number"
                            id="amount-log"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={`e.g., 20`}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-brand-text-primary dark:text-gray-100 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                            step="any"
                            autoFocus
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-brand-green to-emerald-600 hover:from-brand-green/90 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50"
                        >
                            {isLoading ? 'Submitting...' : 'Log Activity'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default LogActivityModal;
