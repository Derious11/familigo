import React from 'react';
import { BellIcon, ShieldCheckIcon } from '../Icons';
import { User, FamilyCircle } from '../../types';
import AvatarImage from '../ui/AvatarImage';

interface ProfileSettingsProps {
    currentUser: User;
    hasNotificationsEnabled: boolean;
    isNotificationToggleLoading: boolean;
    onToggleNotifications: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenPrivacy: () => void;
    onSignOut: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
    currentUser,
    hasNotificationsEnabled,
    isNotificationToggleLoading,
    onToggleNotifications,
    onOpenPrivacy,
    onSignOut
}) => {
    return (
        <div className="bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-2">

            {/* Notification Toggle */}
            <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center">
                        <BellIcon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-200">Notifications</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={hasNotificationsEnabled} onChange={onToggleNotifications} disabled={isNotificationToggleLoading} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                </label>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4"></div>

            {/* Privacy */}
            <button onClick={onOpenPrivacy} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors text-left">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center">
                        <ShieldCheckIcon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-200">Privacy Policy</span>
                </div>
                <span className="text-gray-400">›</span>
            </button>



            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4"></div>

            {/* Sign Out */}
            <button onClick={onSignOut} className="w-full p-4 text-center text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                Sign Out
            </button>
        </div>
    );
};

export default ProfileSettings;
