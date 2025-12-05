import React, { useState } from 'react';
import { CameraIcon, PencilIcon, FireIcon, ShieldCheckIcon, ScaleIcon } from '../Icons';
import CoverPhotoPicker from './CoverPhotoPicker';
import { User } from '../../types'; // Adjust path if needed

interface ProfileHeaderProps {
    currentUser: User;
    onUpdateCover: (url: string) => Promise<void>;
    onEditProfile: () => void;
    onUpdateWeight: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ currentUser, onUpdateCover, onEditProfile, onUpdateWeight }) => {
    const [isEditingCover, setIsEditingCover] = useState(false);

    const handleSaveCover = async (url: string) => {
        await onUpdateCover(url);
        setIsEditingCover(false);
    };

    // --- Logic for Gamification & Stats ---
    const currentLevel = currentUser.level || 1;
    const currentXp = currentUser.xp || 0;
    // XP Logic
    const xpProgress = Math.min((currentXp % 500) / 500 * 100, 100);

    return (
        <div className="bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700 relative z-10">
            {/* Cover Photo Area */}
            <div className="h-40 bg-gray-200 dark:bg-gray-700 relative">
                {currentUser.coverPhotoUrl ? (
                    <img src={currentUser.coverPhotoUrl} alt="Cover" className="w-full h-full object-cover opacity-90 transition-opacity duration-500" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-300 to-purple-400"></div>
                )}

                {/* Floating Edit Cover Button */}
                <button
                    onClick={() => setIsEditingCover(!isEditingCover)}
                    className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-all shadow-sm"
                >
                    <CameraIcon className="w-5 h-5" />
                </button>

                {/* IMPROVED: Preset Picker Popover */}
                {isEditingCover && (
                    <CoverPhotoPicker
                        currentCoverUrl={currentUser.coverPhotoUrl}
                        onSave={handleSaveCover}
                        onCancel={() => setIsEditingCover(false)}
                    />
                )}
            </div>

            {/* Profile Info & XP Bar */}
            <div className="px-6 pb-6 relative">
                <div className="flex justify-between items-end -mt-14 mb-4">
                    {/* Avatar with Edit Button */}
                    <div className="relative group">
                        <div className="w-28 h-28 rounded-full border-[5px] border-white dark:border-gray-800 shadow-xl bg-white overflow-hidden">
                            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                        </div>
                        <button
                            onClick={onEditProfile}
                            className="absolute bottom-1 right-1 bg-brand-blue hover:bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-gray-800 transition-transform hover:scale-105"
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Level Badge */}
                    <div className="flex flex-col items-end">
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md transform rotate-1">
                            Level {currentLevel}
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex items-baseline justify-between mb-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{currentUser.name}</h2>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{currentXp} XP</span>
                    </div>

                    {/* Gamified XP Bar */}
                    <div className="relative w-full h-5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-brand-blue rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${xpProgress}%` }}
                        >
                            <div className="w-full h-full bg-white/20 animate-pulse"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">
                            {500 - (currentXp % 500)} XP to Level {currentLevel + 1}
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-700 pt-6">
                    <div className="text-center group cursor-default">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 mb-2 group-hover:scale-110 transition-transform">
                            <FireIcon className="w-7 h-7" />
                        </div>
                        <div className="text-xl font-black text-gray-800 dark:text-gray-100">{currentUser.streak}</div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Day Streak</div>
                    </div>

                    <div className="text-center group cursor-default">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 mb-2 group-hover:scale-110 transition-transform">
                            <ShieldCheckIcon className="w-7 h-7" />
                        </div>
                        <div className="text-xl font-black text-gray-800 dark:text-gray-100">{currentUser.badges.filter(b => b.unlocked).length}</div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Badges</div>
                    </div>

                    <button onClick={onUpdateWeight} className="text-center group">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-brand-blue mb-2 group-hover:scale-110 transition-transform">
                            <ScaleIcon className="w-7 h-7" />
                        </div>
                        <div className="text-xl font-black text-gray-800 dark:text-gray-100 flex items-center justify-center gap-1">
                            {currentUser.currentWeight || '--'} <span className="text-xs font-normal text-gray-400">{currentUser.weightUnit || 'lbs'}</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Update</div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;
