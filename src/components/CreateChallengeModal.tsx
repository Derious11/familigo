import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { AppContext } from '../App';
import { getExercises } from '../services/challengeService';
import { Exercise } from '../types';
import Modal from './ui/Modal';
import { ChevronDownIcon } from './Icons';

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

    const [error, setError] = useState<string>('');

    // Custom Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchExercises = async () => {
            try {
                const fetchedExercises = await getExercises();
                setExercises(fetchedExercises);
                if (fetchedExercises.length > 0) {
                    setExerciseName(fetchedExercises[0].name);
                }
            } catch (err) {
                console.error('Failed to fetch exercises:', err);
                setError('Could not load exercises. Please try again later.');
            } finally {
                setIsLoadingExercises(false);
            }
        };
        fetchExercises();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!context) {
            setError('Something went wrong. Please try again.');
            return;
        }

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
            if (!target.trim()) {
                setError('Please set a target (e.g., "10 Reps" or "30 Seconds").');
                return;
            }

            context.addChallenge(selectedExercise, target.trim(), undefined, 'individual');
        } else {
            if (!goalTotal || !unit.trim()) {
                setError('Please set a goal amount and unit.');
                return;
            }

            const goal = parseInt(goalTotal, 10);
            if (Number.isNaN(goal) || goal <= 0) {
                setError('Please enter a valid numeric goal amount.');
                return;
            }

            const teamTarget = `${goal} ${unit.trim()} in ${duration} days`;
            context.addChallenge(
                selectedExercise,
                teamTarget,
                undefined,
                'team',
                goal,
                unit.trim(),
                duration
            );
        }

        onClose();
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="New Challenge"
        >
            <div className="space-y-6 pb-4">
                {/* Toggle: Individual / Team */}
                <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                    <button
                        type="button"
                        onClick={() => setChallengeType('individual')}
                        className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${challengeType === 'individual'
                            ? 'bg-white dark:bg-gray-700 shadow text-brand-blue dark:text-blue-300'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        Individual
                    </button>
                    <button
                        type="button"
                        onClick={() => setChallengeType('team')}
                        className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${challengeType === 'team'
                            ? 'bg-white dark:bg-gray-700 shadow text-brand-blue dark:text-blue-300'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        Team
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                    data-no-autofill="true"
                >
                    {/* Custom Exercise Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-1">
                            Exercise
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isLoadingExercises || exercises.length === 0}
                            className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-brand-text-primary shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 disabled:opacity-60"
                        >
                            <span className="block truncate">
                                {isLoadingExercises ? 'Loading exercises...' : (exerciseName || 'Select an exercise')}
                            </span>
                            <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && !isLoadingExercises && exercises.length > 0 && (
                            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 sm:text-sm">
                                {exercises.map((ex) => (
                                    <div
                                        key={ex.name}
                                        onClick={() => {
                                            setExerciseName(ex.name);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-gray-100 dark:hover:bg-gray-700 ${exerciseName === ex.name ? 'bg-blue-50 dark:bg-blue-900/20 text-brand-blue' : 'text-gray-900 dark:text-gray-100'
                                            }`}
                                    >
                                        <span className={`block truncate ${exerciseName === ex.name ? 'font-semibold' : 'font-normal'}`}>
                                            {ex.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Individual vs Team fields */}
                    {challengeType === 'individual' ? (
                        <div>
                            <label
                                htmlFor="target"
                                className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400"
                            >
                                Target
                                <span className="ml-1 text-xs text-gray-400">
                                    (e.g., &quot;10 Reps&quot; or &quot;30 Seconds&quot;)
                                </span>
                            </label>
                            <input
                                id="target"
                                type="text"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                placeholder='e.g. "10 Reps" or "30 Seconds"'
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-brand-text-primary shadow-sm focus:border-brand-blue focus:outline-none focus:ring-brand-blue dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                                autoComplete="off"
                                inputMode="text"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="goalTotal"
                                        className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400"
                                    >
                                        Goal Amount
                                    </label>
                                    <input
                                        id="goalTotal"
                                        type="number"
                                        value={goalTotal}
                                        onChange={(e) => setGoalTotal(e.target.value)}
                                        placeholder="e.g., 1000"
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-brand-text-primary shadow-sm focus:border-brand-blue focus:outline-none focus:ring-brand-blue dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                                        autoComplete="off"
                                        inputMode="numeric"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="unit"
                                        className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400"
                                    >
                                        Unit
                                    </label>
                                    <input
                                        id="unit"
                                        type="text"
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        placeholder="e.g. Reps"
                                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-brand-text-primary shadow-sm focus:border-brand-blue focus:outline-none focus:ring-brand-blue dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                                        autoComplete="off"
                                        inputMode="text"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="duration"
                                    className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400"
                                >
                                    Duration: {duration} Day{duration !== 1 ? 's' : ''}
                                </label>
                                <input
                                    id="duration"
                                    type="range"
                                    min={1}
                                    max={30}
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                                    className="mt-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700 h-2"
                                />
                                <div className="mt-1 flex justify-between text-xs text-gray-500">
                                    <span>1 Day</span>
                                    <span>30 Days</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-500">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="pt-2 space-y-2">
                        <button
                            type="submit"
                            className="w-full transform rounded-lg bg-gradient-to-r from-brand-blue to-indigo-600 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-brand-blue/90 hover:to-indigo-700"
                        >
                            Post Challenge
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default CreateChallengeModal;
