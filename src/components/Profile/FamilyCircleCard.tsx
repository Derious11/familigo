import React, { useState } from 'react';
import { UserGroupIcon, LinkIcon, CheckIcon, ArrowRightStartOnRectangleIcon } from '../Icons';
import { FamilyCircle, User } from '../../types'; // Adjust path if needed
import AvatarImage from '../ui/AvatarImage';

interface FamilyCircleCardProps {
    familyCircle: FamilyCircle;
    currentUser: User;
    isImpersonating: boolean;
    originalUserId?: string | null;
    onManage: () => void;
    onSwitchProfile: (userId: string) => void;
}

const FamilyCircleCard: React.FC<FamilyCircleCardProps> = ({
    familyCircle,
    currentUser,
    isImpersonating,
    originalUserId,
    onManage,
    onSwitchProfile
}) => {

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
                            {familyCircle.motto && (
                                <p className="text-sm text-gray-500 italic mt-1">"{familyCircle.motto}"</p>
                            )}
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
                        {familyCircle.members.map(member => {
                            // Can only switch to child accounts if you are an adult (or impersonating one, though usually you'd only switch FROM parent TO child)
                            // Actually, if I am a parent, I can switch to my children.
                            // If I am impersonating a child, I can't switch to another child directly (usually), I have to exit first.
                            // But for simplicity, let's allow switching if the current user is an adult OR if we want to allow hopping between siblings (if desired).
                            // The easier rule: If member is child, show switch option.

                            const isChild = member.role === 'child';
                            const isMe = member.id === currentUser.id;
                            const canSwitchTo = isChild && !isMe && (currentUser.role === 'adult' || isImpersonating);

                            return (
                                <button
                                    key={member.id}
                                    onClick={() => canSwitchTo ? onSwitchProfile(member.id) : null}
                                    disabled={!canSwitchTo && !isMe} // Disable click if not switchable (unless it's me, just for feedback?)
                                    className={`flex items-center gap-2 pr-4 pl-1 py-1 rounded-full border transition-all ${isMe
                                        ? 'bg-brand-blue/10 border-brand-blue ring-2 ring-brand-blue/20'
                                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700'
                                        } ${canSwitchTo ? 'hover:bg-blue-50 cursor-pointer hover:border-blue-200' : 'cursor-default'}`}
                                >
                                    <AvatarImage
                                        userId={member.id}
                                        cacheKey={member.avatarUpdatedAt?.getTime?.()}
                                        alt={member.name}
                                        className="w-8 h-8 rounded-full bg-white"
                                    />
                                    <div className="flex flex-col items-start">
                                        <span className={`text-sm font-medium ${isMe ? 'text-brand-blue' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {member.name.split(' ')[0]} {isMe && "(You)"}
                                        </span>
                                    </div>

                                    {/* Switch Icon for switchable profiles */}
                                    {canSwitchTo && (
                                        <div className="ml-1 p-1 bg-white dark:bg-gray-600 rounded-full text-brand-blue shadow-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Exit Impersonation Mode */}
                {isImpersonating && originalUserId && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={() => onSwitchProfile(originalUserId)}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-bold text-sm"
                        >
                            <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                            Exit Child View
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default FamilyCircleCard;
