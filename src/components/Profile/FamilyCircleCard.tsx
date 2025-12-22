import React, { useState } from 'react';
import { UserGroupIcon, LinkIcon, CheckIcon } from '../Icons';
import { FamilyCircle } from '../../types'; // Adjust path if needed
import AvatarImage from '../ui/AvatarImage';

interface FamilyCircleCardProps {
    familyCircle: FamilyCircle;
    onManage: () => void;
}

const FamilyCircleCard: React.FC<FamilyCircleCardProps> = ({ familyCircle, onManage }) => {
    const [isLinkCopied, setIsLinkCopied] = useState(false);

    const handleShareInviteLink = () => {
        if (familyCircle) {
            const inviteLink = `${window.location.origin}${window.location.pathname}?inviteCode=${familyCircle.inviteCode}`;
            navigator.clipboard.writeText(inviteLink);
            setIsLinkCopied(true);
            setTimeout(() => setIsLinkCopied(false), 2000);
        }
    };

    return (
        <div className="bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-3xl overflow-hidden border-2 border-white dark:border-gray-600">
                            {familyCircle.avatarUrl ? <img src={familyCircle.avatarUrl} alt="" className="w-full h-full object-cover" /> : "🏠"}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{familyCircle.name}</h3>
                            <p className="text-xs font-medium text-brand-blue uppercase tracking-wide">Family Circle</p>
                        </div>
                    </div>
                    <button
                        onClick={onManage}
                        className="px-4 py-2 bg-white dark:bg-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Manage
                    </button>
                </div>
            </div>

            <div className="p-6">
                {/* Members Grid */}
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Team Members</p>
                    <div className="flex flex-wrap gap-3">
                        {familyCircle.members.map(member => (
                            <div key={member.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 pr-4 pl-1 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                                <AvatarImage
                                    userId={member.id}
                                    cacheKey={member.avatarUpdatedAt?.getTime?.()}
                                    alt={member.name}
                                    className="w-8 h-8 rounded-full bg-white"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{member.name.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Collapsed Invite Code - Clean Look */}
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-gray-600 rounded-md text-gray-500">
                            <UserGroupIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Invite Code</p>
                            <p className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200 tracking-wider">{familyCircle.inviteCode}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleShareInviteLink}
                        className={`p-2 rounded-lg transition-all ${isLinkCopied ? 'bg-green-100 text-green-700' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500'}`}
                    >
                        {isLinkCopied ? <CheckIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FamilyCircleCard;
