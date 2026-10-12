import React,{ useContext,useEffect,useId,useState } from 'react';
import { AppContext } from '../../App';
import { getExercises } from '../../services/challengeService';
import { Exercise } from '../../types';
import { BoltIcon,CheckIcon } from '../Icons';
import Modal from '../ui/Modal';
interface CreateChallengeModalProps {
    onClose: () => void;
}
// --- VISUAL PRESETS ---
const EXERCISE_PRESETS = [
    { name: 'Push-ups', icon: 'push-ups', defaultTarget: '20 Reps', defaultUnit: 'Reps' },
    { name: 'Squats', icon: 'squats', defaultTarget: '30 Reps', defaultUnit: 'Reps' },
    { name: 'Plank', icon: 'plank', defaultTarget: '1 Minute', defaultUnit: 'Minutes' },
    { name: 'Run', icon: 'run', defaultTarget: '1 Mile', defaultUnit: 'Miles' },
    { name: 'Walk', icon: 'walk', defaultTarget: '30 Minutes', defaultUnit: 'Minutes' },
    { name: 'Burpees', icon: 'burpees', defaultTarget: '15 Reps', defaultUnit: 'Reps' }
];
const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({ onClose }) => {
    const context = useContext(AppContext);
    const formId = useId();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const closeModal = () => { if (!isSubmitting)
        onClose(); };
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
    // --- INIT ---
    useEffect(() => {
        const fetchExercises = async () => {
            try {
                const fetchedExercises = await getExercises();
                setExercises(fetchedExercises);
            }
            catch (err) {
                console.error('Failed to fetch exercises:', err);
                setError('Could not load exercises.');
            }
            finally {
                setIsLoadingExercises(false);
            }
        };
        fetchExercises();
    }, []);
    // --- HANDLERS ---
    const handlePresetClick = (preset: typeof EXERCISE_PRESETS[0]) => {
        setExerciseName(preset.name);
        setIsCustomMode(false);
        setError('');
        if (challengeType === 'individual') {
            setTarget(preset.defaultTarget);
        }
        else {
            const numericPart = parseInt(preset.defaultTarget);
            if (!isNaN(numericPart)) {
                setGoalTotal((numericPart * 10).toString());
                setUnit(preset.defaultUnit);
            }
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!context || isSubmitting)
            return;
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
        }
        else {
            if (!goalTotal || !unit.trim()) {
                setError('Please set a goal amount and unit.');
                return;
            }
            const goal = Number(goalTotal);
            if (!Number.isSafeInteger(goal) || goal <= 0) {
                setError('Choose a positive whole number for your group goal.');
                return;
            }
        }
        setIsSubmitting(true);
        try {
            if (challengeType === 'individual') {
                await context.addChallenge(exercisePayload, target.trim(), undefined, 'individual');
            }
            else {
                const goal = Number(goalTotal);
                const teamTarget = `${goal} ${unit.trim()} in ${duration} days`;
                await context.addChallenge(exercisePayload, teamTarget, undefined, 'team', goal, unit.trim(), duration);
            }
            onClose();
        }
        catch {
            setError('Could not post your challenge. Please try again.');
        }
        finally {
            setIsSubmitting(false);
        }
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
    return (<Modal isOpen={true} onClose={closeModal} title="New Challenge" trapFocus={true} className={'app-challenge-dialog'} footer={<div className="app-challenge-footer"><button type="button" disabled={isSubmitting} onClick={closeModal}>Cancel</button><button type="submit" form={formId} disabled={isSubmitting || isLoadingExercises}>{isSubmitting ? 'Posting…' : isIndividual ? 'Post Challenge' : 'Start Team Goal'}<span aria-hidden="true">↗</span></button></div>}>
            <div className="space-y-6 pb-2">
                {<div className="app-challenge-intro"><p className="app-eyebrow">Small moves. Shared wins.</p><p>Pick an activity and a goal that fits your family. Let’s make it playful.</p></div>}

                {/* 1. TYPE TOGGLE */}
                {/* 1. TYPE TOGGLE */}
                <div className="app-challenge-types grid grid-cols-2 gap-3 p-1" role="group" aria-label="Challenge type">
                    <button type="button" disabled={isSubmitting} aria-pressed={isIndividual} onClick={() => setChallengeType('individual')} className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 ${isIndividual
            ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm'
            : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <img src="/assets/brand/activities/gogo-solo.webp" srcSet="/assets/brand/activities/gogo-solo.webp 2x, /assets/brand/activities/gogo-solo@3x.webp 3x" width={48} height={48} alt="" aria-hidden="true" draggable={false} className="mb-1 h-12 w-12 object-contain" />
                        {isIndividual && <CheckIcon aria-hidden="true" className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />}
                        <span className="text-xs font-bold">Solo Challenge</span>
                    </button>
                    <button type="button" disabled={isSubmitting} aria-pressed={!isIndividual} onClick={() => setChallengeType('team')} className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 ${!isIndividual
            ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
            : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <img src="/assets/brand/activities/gogo-team.webp" srcSet="/assets/brand/activities/gogo-team.webp 2x, /assets/brand/activities/gogo-team@3x.webp 3x" width={48} height={48} alt="" aria-hidden="true" draggable={false} className="mb-1 h-12 w-12 object-contain" />
                        {!isIndividual && <CheckIcon aria-hidden="true" className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />}
                        <span className="text-xs font-bold">Team Goal</span>
                    </button>
                </div>

                <form id={formId} onSubmit={handleSubmit} className="space-y-5 animate-fade-in" aria-busy={isSubmitting}>
                    <fieldset disabled={isSubmitting} className="space-y-5 min-w-0">

                    {/* 2. EXERCISE SELECTION */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Choose Activity</span>
                            <button type="button" onClick={() => setIsCustomMode(!isCustomMode)} className={`text-xs font-bold hover:underline ${currentTheme.iconColor}`}>
                                {isCustomMode ? 'Show Presets' : 'Browse all'}
                            </button>
                        </div>

                        {!isCustomMode ? (
        /* --- PRESETS GRID (Brighter) --- */
        <div className="app-activity-presets grid grid-cols-3 gap-3" role="group" aria-label="Activities">
                                {EXERCISE_PRESETS.map((preset) => {
                const isSelected = exerciseName === preset.name;
                return (<button key={preset.name} type="button" aria-pressed={isSelected} onClick={() => handlePresetClick(preset)} className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${isSelected
                        ? `${currentTheme.activeBorder} ${currentTheme.activeBg} ring-1 ${currentTheme.activeRing} ${currentTheme.activeShadow} scale-105`
                        : `border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 ${currentTheme.hoverBorder} ${currentTheme.hoverBg} hover:shadow-lg hover:-translate-y-1`}`}>
                                            <img
                                                src={`/assets/brand/activities/gogo-${preset.icon}.webp`}
                                                srcSet={`/assets/brand/activities/gogo-${preset.icon}.webp 2x, /assets/brand/activities/gogo-${preset.icon}@3x.webp 3x`}
                                                width={48}
                                                height={48}
                                                alt=""
                                                aria-hidden="true"
                                                draggable={false}
                                                className="mb-1 h-12 w-12 object-contain"
                                            />
                                            {isSelected && <CheckIcon aria-hidden="true" className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-200" />}
                                            <span className={`text-xs font-bold ${isSelected
                        ? currentTheme.activeText
                        : 'text-gray-600 dark:text-gray-400'}`}>
                                                {preset.name}
                                            </span>
                                        </button>);
            })}
                            </div>) : (<div><label htmlFor={`${formId}-activity`} className="sr-only">Activity</label><select id={`${formId}-activity`} value={exerciseName} onChange={event => { setExerciseName(event.target.value); setError(''); }} className="app-activity-select" disabled={isLoadingExercises}><option value="">{isLoadingExercises ? 'Loading activities…' : 'Select an activity'}</option>{exercises.map(exercise => <option key={exercise.name} value={exercise.name}>{exercise.name}</option>)}</select></div>)}
                    </div>

                    {/* 3. GOAL INPUTS */}
                    <div className={`app-challenge-goal p-4 rounded-xl border transition-colors duration-300 ${isIndividual ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'} dark:bg-gray-800 dark:border-gray-700`}>

                        {isIndividual ? (<div>
                                <label htmlFor={`${formId}-target`} className="block text-xs font-bold text-gray-500 uppercase mb-1">Target</label>
                                <div className="relative">
                                    <input type="text" id={`${formId}-target`} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 20 Reps" className="w-full px-3 py-2 text-xl font-black border-b-2 border-emerald-200 bg-transparent text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none placeholder-emerald-200/50 transition-colors"/>
                                    <BoltIcon className="w-6 h-6 text-emerald-300 absolute right-2 top-2"/>
                                </div>
                                <p className="text-[10px] text-emerald-600/70 mt-1 font-medium">What does "Done" look like?</p>
                            </div>) : (<div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor={`${formId}-goal`} className="block text-xs font-bold text-gray-500 uppercase mb-1">Group Goal</label>
                                        <input type="number" id={`${formId}-goal`} min={1} step={1} value={goalTotal} onChange={(e) => setGoalTotal(e.target.value)} placeholder="1000" className="w-full px-3 py-2 text-xl font-black border-b-2 border-blue-200 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none placeholder-blue-200/50"/>
                                    </div>
                                    <div>
                                        <label htmlFor={`${formId}-unit`} className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit</label>
                                        <input type="text" id={`${formId}-unit`} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Reps" className="w-full px-3 py-2 text-xl font-black border-b-2 border-blue-200 bg-transparent text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none placeholder-blue-200/50"/>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label htmlFor={`${formId}-duration`} className="text-xs font-bold text-gray-500 uppercase">Duration</label>
                                        <span className="text-xs font-bold bg-white text-blue-700 shadow-sm border border-blue-100 px-2 py-0.5 rounded-md">{duration} Days</span>
                                    </div>
                                    <input type="range" id={`${formId}-duration`} aria-valuetext={`${duration} ${duration === 1 ? 'day' : 'days'}`} min={1} max={30} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 dark:bg-gray-600"/>
                                </div>
                            </div>)}
                    </div>

                    {error && <div role="alert" className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg font-bold">{error}</div>}


                    </fieldset>
                </form>
            </div>
        </Modal>);
};
export default CreateChallengeModal;
