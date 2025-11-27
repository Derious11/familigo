import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '../App';
import { FireIcon, PencilIcon, LinkIcon, CheckIcon, ScaleIcon, BellIcon, CameraIcon, ShieldCheckIcon } from './Icons';
import { Badge } from '../types';
import { getBadges, updateCoverPhoto } from '../services/userService';
import EditProfilePictureModal from './EditProfilePictureModal';
import UpdateWeightModal from './UpdateWeightModal';
import WeightChart from './WeightChart';
import FamilySettingsModal from './FamilySettingsModal';
import { requestNotificationPermission, revokeNotificationPermission } from '../services/pushRouter';
import PrivacyPolicy from './PrivacyPolicy';

const Profile: React.FC = () => {
    const context = useContext(AppContext);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [isFamilySettingsOpen, setIsFamilySettingsOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isLinkCopied, setIsLinkCopied] = useState(false);
    const [allBadges, setAllBadges] = useState<Omit<Badge, 'unlocked'>[]>([]);
    const [isLoadingBadges, setIsLoadingBadges] = useState(true);
    const [isNotificationToggleLoading, setIsNotificationToggleLoading] = useState(false);
    const [isEditingCover, setIsEditingCover] = useState(false);
    const [coverPhotoInput, setCoverPhotoInput] = useState('');

    if (!context || !context.currentUser) {
        return <div>Loading profile...</div>;
    }

    const { currentUser, familyCircle, signOut, updateCurrentUser } = context;

    const hasNotificationsEnabled = useMemo(() => {
        return currentUser.notificationTokens && currentUser.notificationTokens.length > 0;
    }, [currentUser.notificationTokens]);

    useEffect(() => {
        const fetchBadges = async () => {
            try {
                const badgesData = await getBadges();
                setAllBadges(badgesData);
            } catch (error) {
                console.error("Failed to fetch badges:", error);
            } finally {
                setIsLoadingBadges(false);
            }
        };
        fetchBadges();
    }, []);

    const unlockedBadgeIds = new Set(currentUser.badges.filter(b => b.unlocked).map(b => b.id));

    const handleShareInviteLink = () => {
        if (familyCircle) {
            const inviteLink = `${window.location.origin}${window.location.pathname}?inviteCode=${familyCircle.inviteCode}`;
            navigator.clipboard.writeText(inviteLink);
            setIsLinkCopied(true);
            setTimeout(() => setIsLinkCopied(false), 2000);
        }
    };

    const handleNotificationToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const enable = e.target.checked;
        setIsNotificationToggleLoading(true);

        try {
            if (enable) {
                const result = await requestNotificationPermission(currentUser.id);
                if (result.success) {
                    const tokens = currentUser.notificationTokens || [];
                    if (result.token && !tokens.includes(result.token)) {
                        updateCurrentUser({
                            notificationTokens: [...tokens, result.token],
                        });
                    }
                } else {
                    alert(`Could not enable notifications: ${result.error}`);
                }
            } else {
                await revokeNotificationPermission(currentUser.id);
                updateCurrentUser({ notificationTokens: [] });
            }
        } catch (error) {
            console.error("Failed to toggle notifications:", error);
            alert("An unexpected error occurred. Please try again.");
        } finally {
            setIsNotificationToggleLoading(false);
        }
    };

    const handleSaveCoverPhoto = async () => {
        if (!coverPhotoInput) return;
        try {
            await updateCoverPhoto(currentUser.id, coverPhotoInput);
            setIsEditingCover(false);
            setCoverPhotoInput('');
        } catch (error) {
            console.error("Failed to update cover photo:", error);
            alert("Failed to update cover photo.");
        }
    };

    // Calculate XP Progress
    const currentLevel = currentUser.level || 1;
    const currentXp = currentUser.xp || 0;
    const xpForNextLevel = currentLevel * 500; // Simple formula
    const xpProgress = Math.min((currentXp % 500) / 500 * 100, 100); // Simplified visualization

    // Heatmap Data Generation (Last 365 days or just current month?)
    // Let's show last 28 days for simplicity in mobile view
    const heatmapDays = Array.from({ length: 28 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (27 - i));
        return d.toISOString().split('T')[0];
    });

    return (
        <div className="space-y-6 pb-20">
            {/* Profile Header with Cover Photo */}
            <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="h-32 bg-gray-300 dark:bg-gray-700 relative">
                    {currentUser.coverPhotoUrl && (
                        <img src={currentUser.coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
                    )}
                    <button
                        onClick={() => setIsEditingCover(!isEditingCover)}
                        className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                    >
                        <CameraIcon className="w-5 h-5" />
                    </button>
                    {isEditingCover && (
                        <div className="absolute top-12 right-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-xl flex gap-2 z-10">
                            <input
                                type="text"
                                placeholder="Image URL..."
                                value={coverPhotoInput}
                                onChange={(e) => setCoverPhotoInput(e.target.value)}
                                className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            />
                            <button onClick={handleSaveCoverPhoto} className="text-xs bg-brand-blue text-white px-2 py-1 rounded">Save</button>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6 relative">
                    <div className="flex justify-between items-end -mt-12 mb-4">
                        <div className="relative">
                            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg bg-white" />
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="absolute bottom-0 right-0 bg-brand-blue hover:bg-blue-600 text-white p-1.5 rounded-full shadow-md border-2 border-white dark:border-gray-800"
                            >
                                <PencilIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="text-right mb-1">
                            <div className="text-sm font-bold text-brand-blue dark:text-blue-400">Level {currentLevel}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{currentXp} XP</div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-brand-text-primary dark:text-gray-100">{currentUser.name}</h2>
                        {/* XP Bar */}
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-brand-blue h-2.5 rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }}></div>
                        </div>
                        <p className="text-xs text-right text-gray-400 mt-1">{500 - (currentXp % 500)} XP to next level</p>
                    </div>

                    <div className="flex items-center justify-around text-center border-t border-gray-100 dark:border-gray-700 pt-4">
                        <div>
                            <p className="text-2xl font-bold text-orange-500 dark:text-orange-400 flex items-center justify-center gap-1">
                                <FireIcon className="w-6 h-6" /> {currentUser.streak}
                            </p>
                            <p className="text-xs text-brand-text-secondary dark:text-gray-400 uppercase tracking-wide">Streak</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-brand-green">{currentUser.badges.filter(b => b.unlocked).length}</p>
                            <p className="text-xs text-brand-text-secondary dark:text-gray-400 uppercase tracking-wide">Badges</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-500">{currentUser.currentWeight || '-'}</p>
                            <p className="text-xs text-brand-text-secondary dark:text-gray-400 uppercase tracking-wide">{currentUser.weightUnit || 'lbs'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Heatmap */}
            <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4 text-brand-text-primary dark:text-gray-100">Activity (Last 28 Days)</h3>
                <div className="grid grid-cols-7 gap-2">
                    {heatmapDays.map(date => {
                        const count = currentUser.activityMap?.[date] || 0;
                        let bgClass = 'bg-gray-100 dark:bg-gray-700';
                        if (count > 0) bgClass = 'bg-green-200 dark:bg-green-900/40';
                        if (count > 2) bgClass = 'bg-green-300 dark:bg-green-800/60';
                        if (count > 5) bgClass = 'bg-green-500 dark:bg-green-600';

                        return (
                            <div key={date} className={`aspect-square rounded-md ${bgClass} flex items-center justify-center text-[10px] text-transparent hover:text-gray-500 transition-colors cursor-default`} title={`${date}: ${count} activities`}>
                                {count}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Badges Section */}
            <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4 text-brand-text-primary dark:text-gray-100">Badges</h3>
                {isLoadingBadges ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading badges...</div>
                ) : allBadges.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">No badges available</div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        {allBadges.map(badge => {
                            const isUnlocked = unlockedBadgeIds.has(badge.id);
                            return (
                                <div
                                    key={badge.id}
                                    className={`flex flex-col items-center p-3 rounded-lg transition-all ${isUnlocked
                                        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-600'
                                        : 'bg-gray-100 dark:bg-gray-700/50 opacity-60'
                                        }`}
                                    title={badge.description}
                                >
                                    <div className="relative">
                                        <div className={`text-4xl mb-2 ${!isUnlocked && 'grayscale'}`}>
                                            {badge.icon}
                                        </div>
                                        {isUnlocked && (
                                            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                                                <CheckIcon className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <p className={`text-xs font-semibold text-center ${isUnlocked
                                        ? 'text-gray-900 dark:text-gray-100'
                                        : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {badge.name}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Family Circle Section */}
            {familyCircle && (
                <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-brand-text-primary dark:text-gray-100">Family Circle</h3>
                        <button
                            onClick={() => setIsFamilySettingsOpen(true)}
                            className="text-sm text-brand-blue font-semibold hover:underline"
                        >
                            Manage
                        </button>
                    </div>

                    <div className="mb-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg flex items-center gap-4">
                        {familyCircle.avatarUrl ? (
                            <img src={familyCircle.avatarUrl} alt={familyCircle.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center text-2xl">🏠</div>
                        )}
                        <div>
                            <h4 className="font-bold text-lg text-gray-900 dark:text-white">{familyCircle.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">"{familyCircle.motto || 'Family Fitness Goals'}"</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-2">Invite Code:</p>
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/60 p-2 rounded-lg">
                            <p className="font-mono text-lg font-bold text-brand-blue dark:text-blue-300 tracking-widest flex-grow truncate">{familyCircle.inviteCode}</p>
                            <button
                                onClick={handleShareInviteLink}
                                className={`p-2 rounded-md transition-all duration-200 ${isLinkCopied ? 'text-green-600 bg-green-100' : 'text-gray-600 hover:bg-gray-200'}`}
                            >
                                {isLinkCopied ? <CheckIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-brand-text-secondary dark:text-gray-400 uppercase tracking-wide">Members</h4>
                        <div className="flex -space-x-2 overflow-hidden py-2">
                            {familyCircle.members.map(member => (
                                <img
                                    key={member.id}
                                    src={member.avatarUrl}
                                    alt={member.name}
                                    className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-800"
                                    title={member.name}
                                />
                            ))}
                            <button
                                onClick={() => setIsFamilySettingsOpen(true)}
                                className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-xs font-bold"
                            >
                                +{familyCircle.members.length}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings & Other */}
            <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold mb-4 text-brand-text-primary dark:text-gray-100">Settings</h3>

                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <BellIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">Push Notifications</span>
                    </div>
                    <label htmlFor="notification-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="notification-toggle"
                            className="sr-only peer"
                            checked={hasNotificationsEnabled}
                            onChange={handleNotificationToggle}
                            disabled={isNotificationToggleLoading}
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <ScaleIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">Update Weight</span>
                    </div>
                    <button onClick={() => setIsWeightModalOpen(true)} className="text-brand-blue font-semibold text-sm">Update</button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">Privacy Policy</span>
                    </div>
                    <button onClick={() => setIsPrivacyOpen(true)} className="text-brand-blue font-semibold text-sm">View</button>
                </div>

                <div className="pt-4">
                    <button
                        onClick={signOut}
                        className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {isEditModalOpen && <EditProfilePictureModal onClose={() => setIsEditModalOpen(false)} />}
            {isWeightModalOpen && <UpdateWeightModal onClose={() => setIsWeightModalOpen(false)} />}
            {isFamilySettingsOpen && <FamilySettingsModal onClose={() => setIsFamilySettingsOpen(false)} />}
            {isPrivacyOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsPrivacyOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
                        <PrivacyPolicy onBack={() => setIsPrivacyOpen(false)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
