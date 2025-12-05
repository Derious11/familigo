import React from 'react';
import { User, FamilyCircle } from '../../types';

interface ProfileSwitcherProps {
    currentUser: User;
    familyCircle: FamilyCircle | null;
    isImpersonating: boolean;
    originalUserId: string | null;
    onSwitch: (userId: string) => void;
    onOpenSettings: () => void;
}

const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
    currentUser,
    familyCircle,
    isImpersonating,
    originalUserId,
    onSwitch,
    onOpenSettings
}) => {

    // Safety check: If not an adult and not impersonating, show nothing
    if (currentUser.role !== 'adult' && !isImpersonating) return null;

    return (
        <div className="bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>🔄</span> Switch Profile
                </h3>
            </div>

            {/* State A: Parent View - Show Kids */}
            {!isImpersonating && (
                <div>
                    <p className="text-sm text-gray-500 mb-4">Tap a child's profile to log challenges for them.</p>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Render Children */}
                        {familyCircle?.members
                            .filter(m => m.role === 'child' && m.id !== currentUser.id)
                            .map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => onSwitch(child.id)}
                                    className="flex flex-col items-center group"
                                >
                                    <div className="relative w-16 h-16 mb-2 transition-transform group-hover:scale-105">
                                        <img
                                            src={child.avatarUrl}
                                            alt={child.name}
                                            className="w-full h-full rounded-2xl object-cover border-2 border-transparent group-hover:border-brand-blue shadow-sm"
                                        />
                                        <div className="absolute -bottom-1 -right-1 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                                            KID
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate w-full text-center">
                                        {child.name.split(' ')[0]}
                                    </span>
                                </button>
                            ))
                        }

                        {/* Empty State */}
                        {familyCircle?.members.filter(m => m.role === 'child').length === 0 && (
                            <div className="col-span-3 text-center py-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-300">
                                <p className="text-xs text-gray-400">No child profiles found.</p>
                                <button
                                    onClick={onOpenSettings}
                                    className="text-xs text-brand-blue font-bold mt-1 hover:underline"
                                >
                                    + Add Child in Settings
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* State B: Impersonating View - Show Exit Button */}
            {isImpersonating && originalUserId && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">
                            🔒
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">Parent Mode</p>
                            <p className="text-xs text-gray-500">Switch back to your account</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onSwitch(originalUserId)}
                        className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-red-50"
                    >
                        Exit Child View
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfileSwitcher;
