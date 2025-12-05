import React from 'react';
import { ChartBarIcon, FireIcon, CheckIcon } from '../Icons';

interface ActivityHeatmapProps {
    activityMap: Record<string, number>;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activityMap }) => {
    // Heatmap Logic
    const heatmapDays = Array.from({ length: 28 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (27 - i));
        return d.toISOString().split('T')[0];
    });

    // Calculate active days for the summary header
    const activeDaysCount = heatmapDays.reduce((acc, date) => {
        return acc + ((activityMap?.[date] || 0) > 0 ? 1 : 0);
    }, 0);

    return (
        <div className="bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ChartBarIcon className="w-5 h-5 text-brand-blue" />
                        Monthly Momentum
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        You've been active <span className="font-bold text-brand-blue">{activeDaysCount}</span> of the last 28 days.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-xs font-bold text-gray-400">{day}</div>
                ))}
                {heatmapDays.map((date, idx) => {
                    const count = activityMap?.[date] || 0;
                    const isActive = count > 0;
                    const isHighActivity = count > 4;

                    // Visual Logic: Circles instead of squares
                    return (
                        <div key={date} className="flex flex-col items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2
                                    ${isActive
                                        ? isHighActivity
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-orange-200 shadow-md transform scale-105'
                                            : 'bg-green-100 dark:bg-green-900 border-green-400 text-green-600 dark:text-green-300'
                                        : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-300'
                                    }`}
                            >
                                {isActive ? (
                                    isHighActivity ? <FireIcon className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />
                                ) : (
                                    <span className="text-[10px]">{new Date(date).getDate()}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActivityHeatmap;
