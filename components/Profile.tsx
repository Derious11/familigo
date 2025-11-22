import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '../App';
import { FireIcon, PencilIcon, LinkIcon, CheckIcon, ScaleIcon, BellIcon } from './Icons';
import { Badge } from '../types';
import { getBadges } from '../services/userService';
import EditProfilePictureModal from './EditProfilePictureModal';
import UpdateWeightModal from './UpdateWeightModal';
import WeightChart from './WeightChart';
import { requestNotificationPermission, revokeNotificationPermission } from '../services/pushNotificationService';

const Profile: React.FC = () => {
    const context = useContext(AppContext);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [isLinkCopied, setIsLinkCopied] = useState(false);
    const [allBadges, setAllBadges] = useState<Omit<Badge, 'unlocked'>[]>([]);
    const [isLoadingBadges, setIsLoadingBadges] = useState(true);
    const [isNotificationToggleLoading, setIsNotificationToggleLoading] = useState(false);

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
            setTimeout(() => setIsLinkCopied(false), 2000); // Reset after 2 seconds
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
            // The onAuthStateChanged listener in App.tsx will eventually receive the
            // updated user data from Firestore and trigger a re-render with the correct toggle state.
            setIsNotificationToggleLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center">
                <div className="relative">
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-24 h-24 rounded-full border-4 border-brand-blue shadow-lg mb-4" />
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="absolute bottom-4 -right-1 bg-brand-blue hover:bg-blue-600 text-white p-2 rounded-full shadow-md transition-transform transform hover:scale-110"
                        aria-label="Change profile picture"
                    >
                        <PencilIcon className="w-5 h-5" />
                    </button>
                </div>

                <h2 className="text-3xl font-bold text-brand-text-primary dark:text-gray-100">{currentUser.name}</h2>
                <div className="mt-4 flex items-center gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-orange-500 dark:text-orange-400 flex items-center justify-center gap-1">
                            <FireIcon className="w-6 h-6" /> {currentUser.streak}
                        </p>
                        <p className="text-sm text-brand-text-secondary dark:text-gray-400">Day Streak</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-brand-green">{currentUser.badges.filter(b => b.unlocked).length}</p>
                        <p className="text-sm text-brand-text-secondary dark:text-gray-400">Badges</p>
                    </div>
                </div>
            </div>

            <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold mb-4 text-brand-text-primary dark:text-gray-100">Settings</h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-full">
                            <BellIcon className="w-6 h-6 text-brand-blue dark:text-blue-300" />
                        </div>
                        <div>
                            <p className="font-semibold text-brand-text-primary dark:text-gray-100">Push Notifications</p>
                            <p className="text-sm text-brand-text-secondary dark:text-gray-400">For new challenges and replies</p>
                        </div>
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
            </div>

            <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-brand-text-primary dark:text-gray-100">Health Stats</h3>
                    <button
                        onClick={() => setIsWeightModalOpen(true)}
                        className="text-sm bg-gray-200/60 hover:bg-gray-300/80 dark:bg-gray-700/70 dark:hover:bg-gray-600/90 text-brand-text-secondary dark:text-gray-300 font-semibold py-2 px-3 rounded-lg transition-colors"
                    >
                        Update Weight
                    </button>
                </div>
                <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex items-center gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-full">
                        <ScaleIcon className="w-6 h-6 text-brand-blue dark:text-blue-300" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-brand-text-secondary dark:text-gray-400">Current Weight</p>
                        <p className="text-2xl font-bold text-brand-text-primary dark:text-gray-100">
                            {currentUser.currentWeight ? `${currentUser.currentWeight} ${currentUser.weightUnit || 'lbs'}` : 'Not set'}
                        </p>
                    </div>
                </div>
                <WeightChart data={currentUser.weightHistory} unit={currentUser.weightUnit} />
            </div>

            {familyCircle && (
                <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-6">
                    <h3 className="text-xl font-bold mb-4 text-brand-text-primary dark:text-gray-100">Family Circle</h3>

                    <div className="mb-6">
                        <p className="text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-2">Share this link to invite family:</p>
                        <div className="flex items-center gap-2 mt-1 bg-gray-100 dark:bg-gray-700/60 p-2 rounded-lg">
                            <p className="font-mono text-lg font-bold text-brand-blue dark:text-blue-300 tracking-widest flex-grow truncate">{familyCircle.inviteCode}</p>
                            <button
                                onClick={handleShareInviteLink}
                                className={`flex items-center justify-center gap-1.5 font-semibold py-2 px-3 rounded-md transition-all duration-200 text-sm w-32 ${isLinkCopied
                                    ? 'bg-brand-green text-white'
                                    : 'bg-brand-blue hover:bg-blue-600 text-white'
                                    }`}
                                aria-live="polite"
                            >
                                {isLinkCopied ? (
                                    <>
                                        <CheckIcon className="w-4 h-4" />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="w-4 h-4" />
                                        <span>Copy Link</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-3 text-brand-text-primary dark:text-gray-100">Members ({familyCircle.members.length})</h4>
                        <ul className="space-y-3">
                            {familyCircle.members.map(member => (
                                <li key={member.id} className="flex items-center gap-3">
                                    <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full" />
                                    <span className="font-medium text-brand-text-primary dark:text-gray-200">{member.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold mb-4 text-brand-text-primary dark:text-gray-100">Badges</h3>
                {isLoadingBadges ? (
                    <p className="text-brand-text-secondary dark:text-gray-400">Loading badges...</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {allBadges.map(badge => (
                            <BadgeItem key={badge.id} badge={{ ...badge, unlocked: unlockedBadgeIds.has(badge.id) }} />
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-4">
                <button
                    onClick={signOut}
                    className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-brand-text-secondary dark:text-gray-300 font-bold py-3 px-4 rounded-lg transition-colors"
                >
                    Sign Out
                </button>
            </div>

            {isEditModalOpen && <EditProfilePictureModal onClose={() => setIsEditModalOpen(false)} />}
            {isWeightModalOpen && <UpdateWeightModal onClose={() => setIsWeightModalOpen(false)} />}
        </div>
    );
};

const BadgeItem: React.FC<{ badge: Badge }> = ({ badge }) => {
    return (
        <div className={`p-4 rounded-lg text-center transition-opacity ${badge.unlocked ? 'bg-green-100/70 dark:bg-green-500/20' : 'bg-gray-100 dark:bg-gray-700 opacity-60'}`}>
            <div className={`text-4xl mx-auto mb-2 ${!badge.unlocked && 'filter grayscale'}`}>{badge.icon}</div>
            <p className="font-semibold text-sm text-brand-text-primary dark:text-gray-100">{badge.name}</p>
            <p className="text-xs text-brand-text-secondary dark:text-gray-400">{badge.description}</p>
        </div>
    );
};

export default Profile;
