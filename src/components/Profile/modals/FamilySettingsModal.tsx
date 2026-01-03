import React, { useState, useContext } from 'react';
import { usePostHog } from 'posthog-js/react';
import { AppContext } from '../../../App';
import { updateFamilyProfile, promoteToAdmin, removeFromFamily, createChildProfile } from '../../../services/familyService';
import { XMarkIcon, CameraIcon, TrashIcon, ShieldCheckIcon, UserGroupIcon, UserPlusIcon, HomeIcon } from '../../Icons'; // Make sure to add the new icons
import Modal from '../../ui/Modal';
import { getFunctions, httpsCallable } from 'firebase/functions';
import AvatarImage from '../../ui/AvatarImage';

interface FamilySettingsModalProps {
    onClose: () => void;
    initialTab?: TabType;
}

type TabType = 'general' | 'members' | 'add';

const FamilySettingsModal: React.FC<FamilySettingsModalProps> = ({ onClose, initialTab = 'members' }) => {
    const { familyCircle, currentUser } = useContext(AppContext);
    const posthog = usePostHog();

    // UI State
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [isLoading, setIsLoading] = useState(false);

    // Form States
    const [name, setName] = useState(familyCircle?.name || '');
    const [motto, setMotto] = useState(familyCircle?.motto || '');
    const [avatarUrl, setAvatarUrl] = useState(familyCircle?.avatarUrl || '');

    // Add Child State
    const [childName, setChildName] = useState('');
    const [childBirthDate, setChildBirthDate] = useState('');
    const [isAddingChild, setIsAddingChild] = useState(false);

    // Invite Teen State
    const [teenEmail, setTeenEmail] = useState('');
    const [teenName, setTeenName] = useState('');
    const [isSendingInvite, setIsSendingInvite] = useState(false);

    if (!familyCircle || !currentUser) return null;

    const isAdmin = familyCircle.adminIds?.includes(currentUser.id);

    // --- Actions ---

    const handleSaveProfile = async () => {
        setIsLoading(true);
        try {
            await updateFamilyProfile(familyCircle.id, { avatarUrl, motto });
            // Optional: visual success feedback here
            onClose();
        } catch (error) {
            console.error("Failed to update family profile:", error);
            alert("Failed to save changes.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePromote = async (userId: string) => {
        if (!confirm("Are you sure you want to make this user an Admin?")) return;
        try {
            await promoteToAdmin(familyCircle.id, userId);
        } catch (error) {
            console.error("Failed to promote user:", error);
            alert("Failed to promote user.");
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this user?")) return;
        try {
            await removeFromFamily(familyCircle.id, userId);
        } catch (error) {
            console.error("Failed to remove user:", error);
            alert("Failed to remove user.");
        }
    };

    const handleAddChild = async () => {
        if (!childName || !childBirthDate) return;
        setIsAddingChild(true);
        try {
            await createChildProfile(currentUser.id, familyCircle.id, childName, new Date(childBirthDate));
            setChildName('');
            setChildBirthDate('');
            alert("Child profile created successfully!");
        } catch (error) {
            console.error("Failed to create child profile:", error);
            alert("Failed to create child profile.");
        } finally {
            setIsAddingChild(false);
        }
    };

    const handleSendInvite = async () => {
        if (!teenEmail || !teenName) return;
        setIsSendingInvite(true);
        const functions = getFunctions();
        const sendInvite = httpsCallable(functions, 'sendTeenInviteEmail');

        try {
            await sendInvite({
                email: teenEmail,
                teenName,
                parentName: currentUser.name,
                inviteCode: familyCircle.inviteCode,
                familyName: familyCircle.name,
                familyCircleId: familyCircle.id,
            });

            posthog?.capture('teen_invite_sent', {
                $groups: { family: familyCircle.id },
                family_id: familyCircle.id,
            });

            alert(`Invite sent to ${teenName}!`);
            setTeenEmail('');
            setTeenName('');
        } catch (error: any) {
            console.error("Failed to send invite:", error);
            alert(`Failed to send invite: ${error.message}`);
        } finally {
            setIsSendingInvite(false);
        }
    };

    // --- Render Helpers ---

    const renderTabs = () => (
        <div className="flex p-1 mb-4 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
            <button
                onClick={() => setActiveTab('members')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'members'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-blue dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
            >
                <UserGroupIcon className="w-4 h-4" /> Members
            </button>
            <button
                onClick={() => setActiveTab('add')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'add'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-blue dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
            >
                <UserPlusIcon className="w-4 h-4" /> Add People
            </button>
            <button
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'general'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-blue dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
            >
                <HomeIcon className="w-4 h-4" /> General
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Family Settings"
            footer={null} // We handle buttons inside tabs now for better context
        >
            <div>
                {renderTabs()}

                {/* --- TAB: MEMBERS --- */}
                {activeTab === 'members' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your family roster.</p>
                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full font-mono">
                                {familyCircle.members.length} Members
                            </span>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                            {familyCircle.members.map(member => {
                                const isMemberAdmin = familyCircle.adminIds?.includes(member.id);
                                const isMe = currentUser.id === member.id;

                                return (
                                    <div key={member.id} className="flex items-center justify-between bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <AvatarImage
                                                    userId={member.id}
                                                    cacheKey={member.avatarUpdatedAt?.getTime?.()}
                                                    alt={member.name}
                                                    className="w-10 h-10 rounded-full object-cover bg-gray-200"
                                                />
                                                {isMemberAdmin && (
                                                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5">
                                                        <ShieldCheckIcon className="w-3 h-3 text-blue-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">
                                                    {member.name} {isMe && <span className="text-gray-400 font-normal">(You)</span>}
                                                </p>
                                                <p className="text-xs text-gray-500 capitalize">
                                                    {member.role || 'Member'}
                                                </p>
                                            </div>
                                        </div>

                                        {isAdmin && !isMe && (
                                            <div className="flex items-center gap-1">
                                                {!isMemberAdmin && member.role !== 'child' && (
                                                    <button
                                                        onClick={() => handlePromote(member.id)}
                                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        title="Promote to Admin"
                                                    >
                                                        <ShieldCheckIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleRemove(member.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Remove"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                            <button onClick={onClose} className="text-gray-500 font-medium text-sm hover:underline">Close</button>
                        </div>
                    </div>
                )}

                {/* --- TAB: ADD PEOPLE --- */}
                {activeTab === 'add' && (
                    <div className="space-y-6 animate-fade-in">
                        {!isAdmin ? (
                            <div className="text-center py-8 text-gray-500">
                                Only admins can add new family members.
                            </div>
                        ) : (
                            <>
                                {/* Add Child Card */}
                                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4">
                                    <h4 className="font-bold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                                        <span>👶</span> Create Child Profile
                                    </h4>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Child's Name"
                                            value={childName}
                                            onChange={(e) => setChildName(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-800 rounded-lg bg-white dark:bg-gray-800 focus:ring-green-500 focus:border-green-500"
                                        />
                                        <input
                                            type="date"
                                            value={childBirthDate}
                                            onChange={(e) => setChildBirthDate(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-800 rounded-lg bg-white dark:bg-gray-800 focus:ring-green-500 focus:border-green-500"
                                        />
                                        <button
                                            onClick={handleAddChild}
                                            disabled={isAddingChild || !childName || !childBirthDate}
                                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 shadow-sm"
                                        >
                                            {isAddingChild ? 'Creating...' : 'Create Child Profile'}
                                        </button>
                                    </div>
                                </div>

                                <div className="relative flex py-1 items-center">
                                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                                    <span className="flex-shrink-0 mx-2 text-xs text-gray-400 font-bold">OR</span>
                                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                                </div>

                                {/* Invite Teen Card */}
                                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                    <h4 className="font-bold text-brand-blue dark:text-blue-300 mb-3 flex items-center gap-2">
                                        <span>📱</span> Invite Teen (13+)
                                    </h4>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Teen's Name"
                                            value={teenName}
                                            onChange={(e) => setTeenName(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-800 rounded-lg bg-white dark:bg-gray-800 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Teen's Email"
                                            value={teenEmail}
                                            onChange={(e) => setTeenEmail(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-800 rounded-lg bg-white dark:bg-gray-800 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <button
                                            onClick={handleSendInvite}
                                            disabled={isSendingInvite || !teenEmail || !teenName}
                                            className="w-full py-2 bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 shadow-sm"
                                        >
                                            {isSendingInvite ? 'Sending...' : 'Send Invite Email'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* --- TAB: GENERAL --- */}
                {activeTab === 'general' && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Family Name</label>
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-500">🔒</span>
                                    <span className="text-gray-600 dark:text-gray-300 font-medium">{name}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 pl-1">Family name cannot be changed.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motto</label>
                                <textarea
                                    value={motto}
                                    onChange={(e) => setMotto(e.target.value)}
                                    rows={2}
                                    placeholder="Enter family motto..."
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Family Avatar</label>

                                <div className="flex gap-3 items-start mb-3">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={avatarUrl}
                                            onChange={(e) => setAvatarUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Enter a URL or select a preset below.</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700 shadow-sm">
                                        {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar Preview" /> : <div className="w-full h-full flex items-center justify-center text-xl">🏠</div>}
                                    </div>
                                </div>

                                {/* Presets */}
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-400">PRESETS</p>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {[
                                            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Family1&backgroundColor=b6e3f4',
                                            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Family2&backgroundColor=c0aede',
                                            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Family3&backgroundColor=d1d4f9',
                                            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Family4&backgroundColor=ffdfbf',
                                            'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Family5&backgroundColor=fdcdc5',
                                            'https://api.dicebear.com/7.x/icons/svg?seed=Home&backgroundColor=b6e3f4',
                                            'https://api.dicebear.com/7.x/icons/svg?seed=Heart&backgroundColor=ffdfbf'
                                        ].map((url, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setAvatarUrl(url)}
                                                className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${avatarUrl === url
                                                    ? 'border-brand-blue scale-110 shadow-sm'
                                                    : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
                                                    }`}
                                            >
                                                <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isLoading}
                                className="px-6 py-2 bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save Details'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default FamilySettingsModal;
