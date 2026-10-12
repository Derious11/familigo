import React from 'react';
import { ChartBarIcon, FireIcon, CheckIcon } from '../Icons';
import { buildActivityCalendar } from '../../lib/activityCalendar.mjs';

interface ActivityHeatmapProps {
    activityMap: Record<string, number>;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activityMap }) => {
    const { monthLabel, leadingDays, days } = buildActivityCalendar();

    // Calculate active days for the summary header
    const activeDaysCount = days.reduce((acc, { key }) => {
        return acc + ((activityMap?.[key] || 0) > 0 ? 1 : 0);
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
                        You've been active <span className="font-bold text-brand-blue">{activeDaysCount}</span> {activeDaysCount === 1 ? 'day' : 'days'} this month.
                    </p>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">{monthLabel}</p>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-gray-500 dark:text-gray-400"><abbr title={day} className="no-underline">{day.slice(0, 2)}</abbr></div>
                ))}
                {Array.from({ length: leadingDays }, (_, index) => <div key={`blank-${index}`} aria-hidden="true" />)}
                {days.map(({ key, day, label, isToday, isFuture }) => {
                    const count = activityMap?.[key] || 0;
                    const isActive = count > 0;
                    const isHighActivity = count > 4;

                    // Visual Logic: Circles instead of squares
                    return (
                        <div key={key} className="flex flex-col items-center" aria-label={`${label}: ${isActive ? `${count} ${count === 1 ? 'activity' : 'activities'}` : isFuture ? 'upcoming' : 'no activity'}${isToday ? ', today' : ''}`} aria-current={isToday ? 'date' : undefined} title={`${label}${isToday ? ' (today)' : ''} — ${isFuture && !isActive ? 'Upcoming' : `${count} activities`}`}>
                            <div
                                aria-hidden="true"
                                className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 ${isToday ? 'ring-2 ring-brand-blue ring-offset-2 ring-offset-white dark:ring-offset-gray-800' : ''}
                                    ${isActive
                                        ? isHighActivity
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-orange-200 shadow-md transform scale-105'
                                            : 'bg-green-100 dark:bg-green-900 border-green-400 text-green-600 dark:text-green-300'
                                        : isFuture ? 'bg-transparent border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}
                            >
                                <span className="text-[11px] font-semibold">{day}</span>
                                {isActive && <span className={`absolute -right-1 -top-1 rounded-full p-0.5 ${isHighActivity ? 'bg-orange-500 text-white' : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'}`}>{isHighActivity ? <FireIcon className="w-2.5 h-2.5" /> : <CheckIcon className="w-2.5 h-2.5" />}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActivityHeatmap;
