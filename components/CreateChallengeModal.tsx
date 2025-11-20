import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { getExercises } from '../services/firebaseService';
import { XMarkIcon } from './Icons';
import { Exercise } from '../types';

interface CreateChallengeModalProps {
    onClose: () => void;
}

const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({ onClose }) => {
    const context = useContext(AppContext);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoadingExercises, setIsLoadingExercises] = useState(true);
    const [exerciseName, setExerciseName] = useState('');
    const [target, setTarget] = useState('');

    // Team Challenge State
    const [challengeType, setChallengeType] = useState<'individual' | 'team'>('individual');
    const [goalTotal, setGoalTotal] = useState('');
    const [unit, setUnit] = useState('');
    const [duration, setDuration] = useState(3);

    const [error, setError] = useState('');

    useEffect(() => {
        const fetchExercises = async () => {
            try {
                const fetchedExercises = await getExercises();
                setExercises(fetchedExercises);
                if (fetchedExercises.length > 0) {
                    setExerciseName(fetchedExercises[0].name);
                }
            } catch (err) {
                console.error("Failed to fetch exercises:", err);
                setError("Could not load exercises. Please try again later.");
            } finally {
                setIsLoadingExercises(false);
            }
        };
        fetchExercises();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!exerciseName) {
            setError('Please select an exercise.');
            return;
        }

        const selectedExercise = exercises.find(ex => ex.name === exerciseName);
        if (!selectedExercise) {
            setError('Please select a valid exercise.');
            return;
        }

        if (challengeType === 'individual') {
            if (!target) {
                setError('Please set a target.');
                return;
            }
            context?.addChallenge(selectedExercise, target, undefined, 'individual');
        } else {
            if (!goalTotal || !unit) {
                setError('Please set a goal amount and unit.');
                return;
            }
            const goal = parseInt(goalTotal);
            if (isNaN(goal) || goal <= 0) {
                setError('Please enter a valid goal amount.');
                return;
            }

            const teamTarget = `${goal} ${unit} in ${duration} days`;
            context?.addChallenge(selectedExercise, teamTarget, undefined, 'team', goal, unit, duration);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md relative animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-center mb-4 text-brand-text-primary dark:text-gray-100">New Challenge</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                            <button
                                type="button"
                                onClick={() => setChallengeType('individual')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${challengeType === 'individual' ? 'bg-white dark:bg-gray-600 shadow text-brand-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                Individual
                            </button>
                            <button
                                type="button"
                                onClick={() => setChallengeType('team')}
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${challengeType === 'team' ? 'bg-white dark:bg-gray-600 shadow text-brand-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                Team
                            </button>
                        </div>

                        <div>
                            <label htmlFor="exercise" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Exercise</label>
                            <select
                                id="exercise"
                                value={exerciseName}
                                onChange={(e) => setExerciseName(e.target.value)}
                                disabled={isLoadingExercises}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-brand-text-primary dark:text-gray-100 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm rounded-md disabled:opacity-50"
                            >
                                {isLoadingExercises ? (
                                    <option>Loading exercises...</option>
                                ) : (
                                    exercises.map(ex => <option key={ex.name}>{ex.name}</option>)
                                )}
                            </select>
                        </div>

                        {challengeType === 'individual' ? (
                            <div>
                                <label htmlFor="target" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Target (e.g., "10 Reps" or "30 Seconds")</label>
                                <input
                                    type="text"
                                    id="target"
                                    value={target}
                                    onChange={(e) => setTarget(e.target.value)}
                                    placeholder="Enter reps or time"
                                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-brand-text-primary dark:text-gray-100 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="goalTotal" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Goal Amount</label>
                                        <input
                                            type="number"
                                            id="goalTotal"
                                            value={goalTotal}
                                            onChange={(e) => setGoalTotal(e.target.value)}
                                            placeholder="e.g., 1000"
                                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-brand-text-primary dark:text-gray-100 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="unit" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Unit</label>
                                        <input
                                            type="text"
                                            id="unit"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            placeholder="e.g. Reps"
                                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-brand-text-primary dark:text-gray-100 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="duration" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400">Duration: {duration} Days</label>
                                    <input
                                        type="range"
                                        id="duration"
                                        min="1"
                                        max="30"
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-2"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>1 Day</span>
                                        <span>30 Days</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <div className="pt-2 space-y-2">
                            <button
                                type="submit"
                                className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                            >
                                Post Challenge
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

export default CreateChallengeModal;