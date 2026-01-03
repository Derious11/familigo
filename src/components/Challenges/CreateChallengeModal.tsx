import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../../App';
import { getExercises } from '../../services/challengeService';
import { Exercise } from '../../types';
import Modal from '../ui/Modal';
import { ChevronDownIcon, UserGroupIcon, UserIcon, BoltIcon } from '../Icons';

interface CreateChallengeModalProps {
    onClose: () => void;
}

// --- VISUAL PRESETS ---
const EXERCISE_PRESETS = [
    { name: 'Push-ups', emoji: '💪', defaultTarget: '20 Reps', defaultUnit: 'Reps' },
    { name: 'Squats', emoji: '🏋️', defaultTarget: '30 Reps', defaultUnit: 'Reps' },
    { name: 'Plank', emoji: '⏱️', defaultTarget: '1 Minute', defaultUnit: 'Minutes' },
    { name: 'Run', emoji: '🏃', defaultTarget: '1 Mile', defaultUnit: 'Miles' },
    { name: 'Go for a Walk', emoji: '🚶', defaultTarget: '30 Minutes', defaultUnit: 'Minutes' },
    { name: 'Burpees', emoji: '🔥', defaultTarget: '15 Reps', defaultUnit: 'Reps' },
];

const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({ onClose }) => {
    const context = useContext(AppContext);

    // Data State
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoadingExercises, setIsLoadingExercises] = useState(true);

    // Form State
    const [challengeType, setChallengeType] = useState<'individual' | 'team'>('individual');
    const [exerciseName, setExerciseName] = useState('');
    const [target, setTarget] = useState('');

    // Team Specific State
    const [goalTotal, setGoalTotal] = useState('');
    const [unit, setUnit] = useState('');
    const [duration, setDuration] = useState(3);

    const [error, setError] = useState<string>('');
    const [isCustomMode, setIsCustomMode] = useState(false);

    // Custom Dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // --- INIT ---
    useEffect(() => {
        const fetchExercises = async () => {
            try {
                const fetchedExercises = await getExercises();
                setExercises(fetchedExercises);
            } catch (err) {
                console.error('Failed to fetch exercises:', err);
                setError('Could not load exercises.');
            } finally {
                setIsLoadingExercises(false);
            }
        };
        fetchExercises();

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- HANDLERS ---
    const handlePresetClick = (preset: typeof EXERCISE_PRESETS[0]) => {
        setExerciseName(preset.name);
        setIsCustomMode(false);
        setError('');

        if (challengeType === 'individual') {
            setTarget(preset.defaultTarget);
        } else {
            const numericPart = parseInt(preset.defaultTarget);
            if (!isNaN(numericPart)) {
                setGoalTotal((numericPart * 10).toString());
                setUnit(preset.defaultUnit);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!context) return;
        if (!exerciseName) {
            setError('Please select an exercise.');
            return;
        }

        const selectedExercise = exercises.find(ex => ex.name.toLowerCase() === exerciseName.toLowerCase());

        const exercisePayload = selectedExercise || {
            id: 'temp',
            name: exerciseName,
            description: '',
            videoUrl: '',
            visualGuideUrl: ''
        };

        if (challengeType === 'individual') {
            if (!target.trim()) {
                setError('Please set a target.');
                return;
            }
            context.addChallenge(exercisePayload, target.trim(), undefined, 'individual');
        } else {
            if (!goalTotal || !unit.trim()) {
                setError('Please set a goal amount and unit.');
                return;
            }
            const goal = parseInt(goalTotal, 10);
            const teamTarget = `${goal} ${unit.trim()} in ${duration} days`;

            context.addChallenge(
                exercisePayload,
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

    // --- THEME ENGINE (BRIGHTER COLORS) ---
    const isIndividual = challengeType === 'individual';

    const theme = {
        // Solo Mode: Fresh Emerald/Teal Gradients
        individual: {
            activeBorder: 'border-emerald-400',
            activeBg: 'bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30',
            activeRing: 'ring-emerald-400',
            activeText: 'text-emerald-800 dark:text-emerald-300',
            activeShadow: 'shadow-md shadow-emerald-100 dark:shadow-none',
            hoverBorder: 'hover:border-emerald-300',
            hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/10',
            buttonGradient: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-200',
            iconColor: 'text-emerald-600'
        },
        // Team Mode: Vibrant Blue/Indigo Gradients
        team: {
            activeBorder: 'border-blue-400',
            activeBg: 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30',
            activeRing: 'ring-blue-400',
            activeText: 'text-blue-800 dark:text-blue-300',
            activeShadow: 'shadow-md shadow-blue-100 dark:shadow-none',
            hoverBorder: 'hover:border-blue-300',
            hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-900/10',
            buttonGradient: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-200',
            iconColor: 'text-blue-600'
        }
    };

    const currentTheme = isIndividual ? theme.individual : theme.team;

    return (
        <Modal isOpen={true} onClose={onClose} title="New Challenge">
            <div className="space-y-6 pb-2">

                {/* 1. TYPE TOGGLE */}
                {/* 1. TYPE TOGGLE */}
                <div className="grid grid-cols-2 gap-3 p-1">
                    <button
                        type="button"
                        onClick={() => setChallengeType('individual')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 ${isIndividual
                            ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm'
                            : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <UserIcon className={`w-6 h-6 mb-1 ${isIndividual ? 'text-emerald-500' : 'grayscale opacity-50'}`} />
                        <span className="text-xs font-bold">Solo Challenge</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setChallengeType('team')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 ${!isIndividual
                            ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
                            : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <UserGroupIcon className={`w-6 h-6 mb-1 ${!isIndividual ? 'text-blue-500' : 'grayscale opacity-50'}`} />
                        <span className="text-xs font-bold">Team Goal</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">

                    {/* 2. EXERCISE SELECTION */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-sm font-bold text-gray-800 dark:text-gray-200">Choose Activity</label>
                            <button
                                type="button"
                                onClick={() => setIsCustomMode(!isCustomMode)}
                                className={`text-xs font-bold hover:underline ${currentTheme.iconColor}`}
                            >
                                {isCustomMode ? 'Show Presets' : 'Search All'}
                            </button>
                        </div>

                        {!isCustomMode ? (
                            /* --- PRESETS GRID (Brighter) --- */
                            <div className="grid grid-cols-3 gap-3">
                                {EXERCISE_PRESETS.map((preset) => {
                                    const isSelected = exerciseName === preset.name;
                                    return (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => handlePresetClick(preset)}
                                            className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${isSelected
                                                ? `${currentTheme.activeBorder} ${currentTheme.activeBg} ring-1 ${currentTheme.activeRing} ${currentTheme.activeShadow} scale-105`
                                                : `border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 ${currentTheme.hoverBorder} ${currentTheme.hoverBg} hover:shadow-lg hover:-translate-y-1`
                                                }`}
                                        >
                                            <span className="text-2xl mb-1 filter drop-shadow-sm">{preset.emoji}</span>
                                            <span className={`text-xs font-bold ${isSelected
                                                ? currentTheme.activeText
                                                : 'text-gray-600 dark:text-gray-400'
                                                }`}>
                                                {preset.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            /* --- DROPDOWN SELECTOR (High Contrast) --- */
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-bold text-gray-900 dark:text-white hover:border-blue-300 transition-all shadow-sm focus:ring-2 focus:ring-blue-200"
                                >
                                    <span>{exerciseName || 'Select from list...'}</span>
                                    <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 animate-fade-in ring-1 ring-black/5">
                                        {exercises.map((ex) => (
                                            <div
                                                key={ex.name}
                                                onClick={() => { setExerciseName(ex.name); setIsDropdownOpen(false); }}
                                                className={`px-4 py-3 cursor-pointer text-sm font-medium transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${exerciseName === ex.name
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {ex.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 3. GOAL INPUTS */}
                    <div className={`p-4 rounded-xl border transition-colors duration-300 ${isIndividual ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'} dark:bg-gray-800 dark:border-gray-700`}>

                        {isIndividual ? (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={target}
                                        onChange={(e) => setTarget(e.target.value)}
                                        placeholder="e.g. 20 Reps"
                                        className="w-full px-3 py-2 text-xl font-black border-b-2 border-emerald-200 bg-transparent text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none placeholder-emerald-200/50 transition-colors"
                                    />
                                    <BoltIcon className="w-6 h-6 text-emerald-300 absolute right-2 top-2" />
                                </div>
                                <p className="text-[10px] text-emerald-600/70 mt-1 font-medium">What does "Done" look like?</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Group Goal</label>
                                        <input
                                            type="number"
                                            value={goalTotal}
                                            onChange={(e) => setGoalTotal(e.target.value)}
                                            placeholder="1000"
                                            className="w-full px-3 py-2 text-xl font-black border-b-2 border-blue-200 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none placeholder-blue-200/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit</label>
                                        <input
                                            type="text"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            placeholder="Reps"
                                            className="w-full px-3 py-2 text-xl font-black border-b-2 border-blue-200 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none placeholder-blue-200/50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Duration</label>
                                        <span className="text-xs font-bold bg-white text-blue-700 shadow-sm border border-blue-100 px-2 py-0.5 rounded-md">{duration} Days</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={30}
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 dark:bg-gray-600"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {error && <div className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg font-bold">{error}</div>}

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`flex-[2] py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${currentTheme.buttonGradient} dark:shadow-none`}
                        >
                            {isIndividual ? <UserIcon className="w-5 h-5" /> : <UserGroupIcon className="w-5 h-5" />}
                            {isIndividual ? 'Post Challenge' : 'Start Team Goal'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default CreateChallengeModal;