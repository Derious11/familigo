import React,{ useContext,useMemo } from 'react';
import { AppContext } from '../App';
import { Challenge } from '../types';
import { useLiveCollection } from '../hooks/useLiveCollection';
import ChallengeCard from './Challenges/ChallengeCard';
const Feed: React.FC<{
    onCreateChallenge?: () => void;
}> = ({ onCreateChallenge }) => {
    const context = useContext(AppContext);
    const {items:challenges, loading:isLoading, error, hasMore, loadMore, retry} = useLiveCollection<Challenge>('challenges', [['familyCircleId', context?.familyCircle?.id]], !!context?.familyCircle?.id);
    const activeChallenges = useMemo(() => {
        const now = new Date();
        return challenges.filter(c => c.expiresAt > now);
    }, [challenges]);
    if (isLoading && !challenges.length) {
        return (<div className="text-center py-12 text-brand-text-secondary">
                <p>Loading feed...</p>
            </div>);
    }
    return (<div>
            {<div className="app-feed-welcome"><div><p className="app-eyebrow">A little movement. A lot more together.</p><h1>Your next little win<br /><span>starts here.</span></h1><p>Pick a challenge, cheer each other on, and make today a little more playful.</p><button type="button" className="app-create-button" onClick={onCreateChallenge}>Create a challenge <span aria-hidden="true">↗</span></button></div><img src="/assets/brand/gogo-wave.webp" width="1024" height="1536" alt="GoGo waving hello."/></div>}
            <div className="space-y-8">
                <section>
                    <div className="app-feed-heading"><h2 className="text-xl font-bold text-brand-text-primary dark:text-gray-100 mb-4 px-1">Active Challenges</h2>{<span>{activeChallenges.length} {activeChallenges.length === 1 ? 'challenge' : 'challenges'}</span>}</div>
                    {error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-300">Unable to load challenges. <button onClick={retry}>Try again</button></p>}
                    {activeChallenges.length > 0 ? (<div className="space-y-6 app-challenge-grid">
                            {activeChallenges.map(challenge => (<ChallengeCard key={challenge.id} challenge={challenge} isActive={true}/>))}
                        </div>) : (<div className="text-center py-12 text-brand-text-secondary dark:text-gray-400 bg-brand-surface dark:bg-gray-800 rounded-lg">
                            <p className="font-semibold text-lg">{hasMore ? 'No active challenges in this batch.' : 'No active challenges!'}</p>
                            <p>{hasMore ? 'Load more challenges to check earlier activity.' : 'Create a new challenge to get the family moving.'}</p>
                        </div>)}
                    {(hasMore || isLoading) && <button disabled={isLoading} onClick={loadMore} className="min-h-11 p-3 underline">{isLoading ? 'Loading…' : 'Load more challenges'}</button>}
                </section>
            </div>
        </div>);
};
export default Feed;
