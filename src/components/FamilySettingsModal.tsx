import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { updateFamilyProfile, promoteToAdmin, removeFromFamily } from '../services/familyService';
import { XMarkIcon, CameraIcon, TrashIcon, ShieldCheckIcon } from './Icons';

interface FamilySettingsModalProps {
    onClose: () => void;
}

const FamilySettingsModal: React.FC<FamilySettingsModalProps> = ({ onClose }) => {
    const { familyCircle, currentUser } = useContext(AppContext);
    const [name, setName] = useState(familyCircle?.name || '');
    const [motto, setMotto] = useState(familyCircle?.motto || '');
    const [avatarUrl, setAvatarUrl] = useState(familyCircle?.avatarUrl || '');
    const [isLoading, setIsLoading] = useState(false);

    if (!familyCircle || !currentUser) return null;

    console.log('FamilySettingsModal Debug:', {
        currentUserId: currentUser.id,
        adminIds: familyCircle.adminIds,
        isAdmin: familyCircle.adminIds?.includes(currentUser.id)
    });

    const isAdmin = familyCircle.adminIds?.includes(currentUser.id);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateFamilyProfile(familyCircle.id, {
                avatarUrl,
                motto
            });
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
        if (!confirm("Are you sure you want to remove this user from the family?")) return;
        try {
            await removeFromFamily(familyCircle.id, userId);
        } catch (error) {
            console.error("Failed to remove user:", error);
            alert("Failed to remove user.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Family Settings</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Identity Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Identity</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Family Name</label>
                            <input
                                type="text"
                                value={name}
                                disabled // Name change not implemented in UI yet for simplicity, or add it to updateFamilyProfile
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motto</label>
                            <input
                                type="text"
                                value={motto}
                                onChange={(e) => setMotto(e.target.value)}
                                placeholder="e.g. Stronger Together"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Avatar URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue"
                                />
                            </div>
                            {avatarUrl && (
                                <img src={avatarUrl} alt="Preview" className="mt-2 w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                            )}
                        </div>
                    </div>

                    {/* Members Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Members</h3>
                        <ul className="space-y-3">
                            {familyCircle.members.map(member => {
                                const isMemberAdmin = familyCircle.adminIds?.includes(member.id);
                                return (
                                    <li key={member.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                                    {member.name}
                                                    {isMemberAdmin && <ShieldCheckIcon className="w-4 h-4 text-brand-blue" />}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {isMemberAdmin ? 'Admin' : 'Member'}
                                                </p>
                                            </div>
                                        </div>
                                        {isAdmin && currentUser.id !== member.id && (
                                            <div className="flex items-center gap-2">
                                                {!isMemberAdmin && (
                                                    <button
                                                        onClick={() => handlePromote(member.id)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-full"
                                                        title="Promote to Admin"
                                                    >
                                                        <ShieldCheckIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleRemove(member.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-full"
                                                    title="Remove from Family"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-4 py-2 bg-brand-blue hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FamilySettingsModal;
