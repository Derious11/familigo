import React from 'react';
import { ShieldCheckIcon } from '../Icons';
import { Badge } from '../../types';

interface BadgeCollectionProps {
    badges: Omit<Badge, 'unlocked'>[];
    unlockedIds: Set<string>;
    isLoading: boolean;
}

const BadgeCollection: React.FC<BadgeCollectionProps> = ({ badges, unlockedIds, isLoading }) => {
    return (
        <div className="bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Recent Achievements</h3>

            {isLoading ? (
                <div className="py-4 text-center text-sm text-gray-400">Loading trophies...</div>
            ) : (
                // Changed to horizontal scroll for better "collection" feel
                <div className="flex overflow-x-auto pb-4 gap-4 -mx-2 px-2 snap-x">
                    {badges.map(badge => {
                        const isUnlocked = unlockedIds.has(badge.id);
                        // Sort unlocked first visually
                        if (!isUnlocked) return null; // Optional: Only show unlocked in this quick view? 
                        // Let's show all but highlight unlocked - wait, the original code had `if (!isUnlocked) return null;` commented out?
                        // Original code:
                        // if (!isUnlocked) return null; // Optional: Only show unlocked in this quick view? 
                        // Let's show all but highlight unlocked
                        // Actually, looking at the original code provided in the prompt:
                        // 294:                             if (!isUnlocked) return null; // Optional: Only show unlocked in this quick view? 
                        // It seems the user wants to show only unlocked ones or maybe all?
                        // The comment says "Let's show all but highlight unlocked" but the code `if (!isUnlocked) return null;` effectively hides locked ones.
                        // However, line 306 shows a placeholder for locked badges count.
                        // So I will stick to the logic: Show unlocked ones, and then a summary card for locked ones.

                        return (
                            <div
                                key={badge.id}
                                className="flex-shrink-0 w-24 snap-center flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-b from-yellow-50 to-white dark:from-gray-700 dark:to-gray-800 border border-yellow-200 dark:border-gray-600 shadow-sm"
                            >
                                <div className="text-3xl">{badge.icon}</div>
                                <span className="text-xs font-bold text-center leading-tight text-gray-700 dark:text-gray-200 line-clamp-2">{badge.name}</span>
                            </div>
                        );
                    })}
                    {/* Show placeholder for locked badges count */}
                    <div className="flex-shrink-0 w-24 flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300">
                        <div className="text-gray-300 mb-1"><ShieldCheckIcon className="w-8 h-8" /></div>
                        <span className="text-xs text-gray-400 text-center">
                            {badges.length - unlockedIds.size} Locked
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BadgeCollection;
