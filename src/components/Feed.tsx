import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '../App';
import ChallengeCard from './ChallengeCard';
import { Challenge } from '../types';
import { onChallengesUpdate } from '../services/challengeService';

const Feed: React.FC = () => {
    const context = useContext(AppContext);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!context?.familyCircle) return;

        const unsubscribe = onChallengesUpdate(context.familyCircle.id, (newChallenges) => {
            setChallenges(newChallenges);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [context?.familyCircle]);

    const activeChallenges = useMemo(() => {
        const now = new Date();
        return challenges.filter(c => c.expiresAt > now);
    }, [challenges]);


    if (isLoading) {
        return (
            <div className="text-center py-12 text-brand-text-secondary">
                <p>Loading feed...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-bold text-brand-text-primary dark:text-gray-100 mb-4 px-1">Active Challenges</h2>
                    {activeChallenges.length > 0 ? (
                        <div className="space-y-6">
                            {activeChallenges.map(challenge => (
                                <ChallengeCard key={challenge.id} challenge={challenge} isActive={true} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-brand-text-secondary dark:text-gray-400 bg-brand-surface dark:bg-gray-800 rounded-lg">
                            <p className="font-semibold text-lg">No active challenges!</p>
                            <p>Create a new challenge to get the family moving.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Feed;