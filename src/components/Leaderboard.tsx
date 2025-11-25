import React, { useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { TrophyIcon, FireIcon } from './Icons';

const Leaderboard: React.FC = () => {
    const { familyCircle } = useContext(AppContext);

    const leaderboardData = useMemo(() => {
        if (!familyCircle) return [];

        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        });

        return familyCircle.members.map(member => {
            let weeklyScore = 0;
            if (member.activityMap) {
                last7Days.forEach(date => {
                    weeklyScore += member.activityMap![date] || 0;
                });
            }
            // Fallback to streak if no activity map (for legacy data)
            if (weeklyScore === 0) weeklyScore = member.streak;

            return {
                ...member,
                weeklyScore
            };
        }).sort((a, b) => b.weeklyScore - a.weeklyScore);
    }, [familyCircle]);

    if (!familyCircle) return null;

    const top3 = leaderboardData.slice(0, 3);
    const rest = leaderboardData.slice(3);

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-brand-text-primary dark:text-white">Weekly Leaderboard</h2>
                <p className="text-sm text-brand-text-secondary dark:text-gray-400">Based on activity in the last 7 days</p>
            </div>

            {/* Top 3 Podium */}
            <div className="flex justify-center items-end gap-4 mb-8">
                {/* 2nd Place */}
                {top3[1] && (
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <img src={top3[1].avatarUrl} alt={top3[1].name} className="w-16 h-16 rounded-full border-4 border-gray-300 shadow-lg" />
                            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-gray-300 text-gray-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                2nd
                            </div>
                        </div>
                        <p className="mt-4 font-semibold text-sm text-gray-700 dark:text-gray-300">{top3[1].name}</p>
                        <p className="text-xs text-gray-500 font-bold">{top3[1].weeklyScore} pts</p>
                        <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-t-lg mt-2 opacity-50"></div>
                    </div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                    <div className="flex flex-col items-center z-10">
                        <div className="relative">
                            <TrophyIcon className="w-8 h-8 text-yellow-400 absolute -top-10 left-1/2 transform -translate-x-1/2 animate-bounce" />
                            <img src={top3[0].avatarUrl} alt={top3[0].name} className="w-20 h-20 rounded-full border-4 border-yellow-400 shadow-xl" />
                            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                                1st
                            </div>
                        </div>
                        <p className="mt-4 font-bold text-base text-gray-900 dark:text-white">{top3[0].name}</p>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 font-bold">{top3[0].weeklyScore} pts</p>
                        <div className="h-24 w-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-t-lg mt-2 opacity-80 flex items-end justify-center pb-2">
                            <FireIcon className="w-6 h-6 text-orange-500" />
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <img src={top3[2].avatarUrl} alt={top3[2].name} className="w-16 h-16 rounded-full border-4 border-orange-300 shadow-lg" />
                            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-orange-300 text-orange-900 text-xs font-bold px-2 py-0.5 rounded-full">
                                3rd
                            </div>
                        </div>
                        <p className="mt-4 font-semibold text-sm text-gray-700 dark:text-gray-300">{top3[2].name}</p>
                        <p className="text-xs text-gray-500 font-bold">{top3[2].weeklyScore} pts</p>
                        <div className="h-12 w-16 bg-orange-100 dark:bg-orange-900/20 rounded-t-lg mt-2 opacity-50"></div>
                    </div>
                )}
            </div>

            {/* Rest of the list */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {rest.map((member, index) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <div className="flex items-center gap-4">
                            <span className="text-gray-400 font-bold w-6 text-center">{index + 4}</span>
                            <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full" />
                            <span className="font-medium text-gray-700 dark:text-gray-200">{member.name}</span>
                        </div>
                        <span className="font-bold text-gray-500 dark:text-gray-400">{member.weeklyScore} pts</span>
                    </div>
                ))}
                {rest.length === 0 && top3.length > 0 && (
                    <div className="p-4 text-center text-gray-400 text-sm">
                        That's everyone!
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
