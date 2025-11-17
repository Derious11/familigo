
import React, { useMemo } from 'react';
import { Challenge, User } from '../types';
import { TrophyIcon } from './Icons';

interface LeaderboardProps {
    challenges: Challenge[];
    members: User[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ challenges, members }) => {

    const rankedMembers = useMemo(() => {
        const scores: { [key: string]: number } = {};

        challenges.forEach(challenge => {
            challenge.completedBy?.forEach(userId => {
                scores[userId] = (scores[userId] || 0) + 1;
            });
        });

        return members
            .map(member => ({
                ...member,
                score: scores[member.id] || 0,
            }))
            .sort((a, b) => b.score - a.score);

    }, [challenges, members]);

    if (!members || members.length === 0) {
        return <p>No members in this circle yet.</p>;
    }

    return (
        <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 mb-6">
            <h2 className="text-2xl font-bold text-center mb-4 text-brand-text-primary dark:text-gray-100">Leaderboard</h2>
            <ul className="space-y-3">
                {rankedMembers.map((member, index) => (
                    <li key={member.id} className="flex items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                        <div className="font-bold text-lg w-8 text-center text-brand-text-secondary dark:text-gray-400">{index + 1}</div>
                        <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full mx-4" />
                        <div className="flex-grow font-semibold text-brand-text-primary dark:text-gray-100">{member.name}</div>
                        <div className="flex items-center gap-2 font-bold text-xl text-brand-yellow-600">
                            {index === 0 && <TrophyIcon className="w-6 h-6 text-yellow-500" />}
                            <span>{member.score}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Leaderboard;
