import React,{ useContext,useEffect,useMemo,useState } from 'react';
import { AppContext } from '../App';
import { onChallengesUpdate } from '../services/challengeService';
import { Challenge } from '../types';
import ChallengeCard from './Challenges/ChallengeCard';
const Feed: React.FC<{
    onCreateChallenge?: () => void;
}> = ({ onCreateChallenge }) => {
    const context = useContext(AppContext);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (!context?.familyCircle)
            return;
        // console.log("Feed: subscribing to challenges for family:", context.familyCircle.id);
        const unsubscribe = onChallengesUpdate(context.familyCircle.id, (newChallenges) => {
            setChallenges(newChallenges);
            setIsLoading(false);
        }, (err) => {
            console.error("Feed: error loading challenges:", err);
            setError(err.message);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [context?.familyCircle]);
    const activeChallenges = useMemo(() => {
        const now = new Date();
        return challenges.filter(c => c.expiresAt > now);
    }, [challenges]);
    if (isLoading) {
        return (<div className="text-center py-12 text-brand-text-secondary">
                <p>Loading feed...</p>
            </div>);
    }
    return (<div>
            {<div className="app-feed-welcome"><div><p className="app-eyebrow">A little movement. A lot more together.</p><h1>Your next little win<br /><span>starts here.</span></h1><p>Pick a challenge, cheer each other on, and make today a little more playful.</p><button type="button" className="app-create-button" onClick={onCreateChallenge}>Create a challenge <span aria-hidden="true">↗</span></button></div><img src="/assets/brand/gogo-wave.webp" width="1024" height="1536" alt="GoGo waving hello."/></div>}
            <div className="space-y-8">
                <section>
                    <div className="app-feed-heading"><h2 className="text-xl font-bold text-brand-text-primary dark:text-gray-100 mb-4 px-1">Active Challenges</h2>{<span>{activeChallenges.length} {activeChallenges.length === 1 ? 'challenge' : 'challenges'}</span>}</div>
                    {error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-300">Unable to load challenges. Please reload to try again.</p>}
                    {activeChallenges.length > 0 ? (<div className="space-y-6 app-challenge-grid">
                            {activeChallenges.map(challenge => (<ChallengeCard key={challenge.id} challenge={challenge} isActive={true}/>))}
                        </div>) : (<div className="text-center py-12 text-brand-text-secondary dark:text-gray-400 bg-brand-surface dark:bg-gray-800 rounded-lg">
                            <p className="font-semibold text-lg">No active challenges!</p>
                            <p>Create a new challenge to get the family moving.</p>
                        </div>)}
                </section>
            </div>
        </div>);
};
export default Feed;
