import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../App';
import Modal from '../ui/Modal';
import AvatarImage from '../ui/AvatarImage';

export default function ProfileSelector({ onClose, onViewProfile, onManage }: { onClose: () => void; onViewProfile: () => void; onManage: () => void }) {
    const context = useContext(AppContext);
    if (!context?.currentUser) return null;
    const { currentUser, familyCircle, originalUserId, isImpersonating, switchProfile } = context;
    const parent = familyCircle?.members.find(member => member.id === originalUserId);
    const children = familyCircle?.members.filter(member => member.role === 'child' && member.parentId === originalUserId) || [];
    const select = (id: string) => { onClose(); if (id !== currentUser.id) switchProfile(id); };
    return createPortal(<Modal isOpen onClose={onClose} title="Choose a profile">
        <p className="text-sm text-gray-500 mb-4">Currently using {currentUser.name}{isImpersonating ? ' · Child view' : ''}</p>
        {isImpersonating && originalUserId && <button onClick={() => select(originalUserId)} className="w-full mb-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-brand-blue font-bold text-left">← Back to {parent?.name || 'your profile'}</button>}
        <div className="space-y-2">
            {[...(!isImpersonating ? [currentUser] : []), ...children].map(member => <button key={member.id} onClick={() => select(member.id)} aria-pressed={member.id === currentUser.id} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700 text-left">
                <AvatarImage userId={member.id} hasAvatar={member.hasAvatar} cacheKey={member.avatarUpdatedAt?.getTime?.()} alt="" className="w-10 h-10 rounded-full" />
                <span className="flex-1 break-words">{member.name}<span className="block text-xs text-gray-500">{member.role === 'child' ? 'Child profile' : 'Your profile'}</span></span>
                {member.id === currentUser.id && <span className="text-sm text-brand-blue">✓ Active</span>}
            </button>)}
        </div>
        <div className="mt-4 border-t pt-3 space-y-2">
            <button onClick={onViewProfile} className="w-full p-3 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700">View profile</button>
            {!isImpersonating && familyCircle && <button onClick={onManage} className="w-full p-3 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700">Manage family</button>}
        </div>
    </Modal>, document.body);
}
