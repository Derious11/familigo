
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '../App';
import { Challenge } from '../types';
import { onChallengesUpdate } from '../services/challengeService';
import Leaderboard from './Leaderboard';
import { ChevronDownIcon } from './Icons';
import AvatarImage from './ui/AvatarImage';

const History: React.FC = () => {
    const context = useContext(AppContext);
    const { familyCircle } = context || {};
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLogbookOpen, setIsLogbookOpen] = useState(false); // Default closed to focus on leaderboard

    useEffect(() => {
        if (!context?.familyCircle) return;

        const unsubscribe = onChallengesUpdate(context.familyCircle.id, (newChallenges) => {
            setChallenges(newChallenges);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [context?.familyCircle]);

    const historyChallenges = useMemo(() => {
        const now = new Date();
        return challenges.filter(c => c.expiresAt <= now);
    }, [challenges]);

    if (isLoading) {
        return (
            <div className="text-center py-12 text-brand-text-secondary dark:text-gray-400">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Leaderboard />

            <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md">
                <button
                    className="w-full flex justify-between items-center p-4 sm:p-6 text-left"
                    onClick={() => setIsLogbookOpen(!isLogbookOpen)}
                    aria-expanded={isLogbookOpen}
                >
                    <h2 className="text-xl font-bold text-brand-text-primary dark:text-gray-100">Past Challenges</h2>
                    <ChevronDownIcon className={`w-6 h-6 text-brand-text-secondary dark:text-gray-400 transition-transform duration-300 ${isLogbookOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLogbookOpen && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                        {historyChallenges.length > 0 ? (
                            <ul className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                                {historyChallenges.map(challenge => (
                                    <HistoryItem key={challenge.id} challenge={challenge} />
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-8 text-brand-text-secondary dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                                <p>No challenges in your history yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface HistoryItemProps {
    challenge: Challenge;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ challenge }) => {
    const context = useContext(AppContext);
    const { familyCircle } = context || {};

    const completedMembers = useMemo(() => {
        if (!familyCircle || !challenge.completedBy) return [];
        return familyCircle.members.filter(member => challenge.completedBy.includes(member.id));
    }, [familyCircle, challenge.completedBy]);

    return (
        <li className="flex items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg w-full">
            <div className="text-center w-16 mr-4 flex-shrink-0">
                <p className="font-bold text-brand-blue dark:text-blue-400 text-sm">{challenge.timestamp.toLocaleDateString(undefined, { month: 'short' })}</p>
                <p className="text-2xl font-bold text-brand-text-primary dark:text-gray-100">{challenge.timestamp.getDate()}</p>
            </div>
            <div className="flex-grow">
                <p className="font-semibold text-brand-text-primary dark:text-gray-100">{challenge.exercise.name}</p>
                <p className="text-sm text-brand-text-secondary dark:text-gray-400">{challenge.target}</p>
            </div>
            <div className="flex items-center -space-x-2">
                {completedMembers.map(member => (
                    <AvatarImage
                        key={member.id}
                        userId={member.id}
                        cacheKey={member.avatarUpdatedAt?.getTime?.()}
                        alt={member.name}
                        title={member.name}
                        className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800"
                    />
                ))}
            </div>
        </li>
    );
};

export default History;
