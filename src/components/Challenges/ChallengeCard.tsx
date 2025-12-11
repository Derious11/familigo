import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '../../App';
import { Challenge, Reply } from '../../types';
import { onRepliesUpdate, updateReaction } from '../../services/challengeService';
import LogWeightReplyModal from './LogWeightReplyModal';
import LogActivityModal from './LogActivityModal';
import CreateReplyModal from './CreateReplyModal';
import { TrashIcon, ChatBubbleLeftIcon, ClockIcon } from '../Icons';
import ConfirmDeleteModal from '../ConfirmDeleteModal';
import confetti from 'canvas-confetti';

interface ChallengeCardProps {
    challenge: Challenge;
    isActive: boolean;
}

// --- HELPER COMPONENT: Countdown ---
const Countdown: React.FC<{ expiryDate: Date }> = ({ expiryDate }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +expiryDate - +new Date();
            if (difference > 0) {
                const hours = Math.floor(difference / (1000 * 60 * 60));
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                setIsUrgent(hours < 24);

                if (hours > 24) {
                    const days = Math.floor(hours / 24);
                    setTimeLeft(`${days}d ${hours % 24}h left`);
                } else {
                    setTimeLeft(`${hours}h ${minutes}m left`);
                }
            } else {
                setTimeLeft('Expired');
            }
        };
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 60000);
        return () => clearInterval(timer);
    }, [expiryDate]);

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isUrgent
            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}>
            <ClockIcon className="w-3 h-3" />
            {timeLeft}
        </span>
    );
};

// --- HELPER COMPONENT: Progress Bar ---
const ProgressBar: React.FC<{ progress: number, colorClass: string }> = ({ progress, colorClass }) => (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2 overflow-hidden">
        <div
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${progress}%` }}
        ></div>
    </div>
);

// --- MAIN COMPONENT ---
const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, isActive }) => {
    const context = useContext(AppContext);
    const { currentUser, deleteReply, deleteChallenge, familyCircle, addReply } = context || {};

    // State
    const [replies, setReplies] = useState<Reply[]>([]);
    const [isLogWeightModalOpen, setIsLogWeightModalOpen] = useState(false);
    const [isLogActivityModalOpen, setIsLogActivityModalOpen] = useState(false);
    const [isCreateReplyModalOpen, setIsCreateReplyModalOpen] = useState(false);
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [mainComment, setMainComment] = useState('');
    const [isPostingMainComment, setIsPostingMainComment] = useState(false);

    // UI State
    const [showComments, setShowComments] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'reply' | 'challenge', id: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isChallenger = currentUser?.id === challenge.challenger.id;

    // Load Replies
    useEffect(() => {
        // FIX: Pass familyCircleId to satisfy the new query requirements
        const unsubscribe = onRepliesUpdate(
            challenge.id,
            challenge.familyCircleId,
            setReplies
        );

        return () => {
            unsubscribe();
            try { confetti.reset(); } catch (e) { /* ignore */ }
        };
    }, [challenge.id, challenge.familyCircleId]);

    // Organize Replies (Threaded)
    const { topLevelReplies, repliesByParent } = useMemo(() => {
        const topLevel: Reply[] = [];
        const byParent: Record<string, Reply[]> = {};
        replies.forEach(reply => {
            if (reply.parentId) {
                if (!byParent[reply.parentId]) byParent[reply.parentId] = [];
                byParent[reply.parentId].push(reply);
            } else {
                topLevel.push(reply);
            }
        });
        // Sort
        for (const parentId in byParent) {
            byParent[parentId].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }
        return { topLevelReplies: topLevel, repliesByParent: byParent };
    }, [replies]);

    const hasReplied = currentUser && challenge.completedBy?.includes(currentUser.id);

    // Handlers
    const handleCompleteChallenge = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!currentUser || !isActive) return;
        if (challenge.type !== 'team' && hasReplied) return;

        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });

        if (challenge.exercise.name === 'Weight Check-in') {
            setIsLogWeightModalOpen(true);
        } else if (challenge.type === 'team') {
            setIsLogActivityModalOpen(true);
        } else {
            setIsCreateReplyModalOpen(true);
        }
    };

    const handleReaction = (replyId: string, emoji: string) => {
        setReplies(current => current.map(r => {
            if (r.id === replyId) {
                const count = r.reactions[emoji] || 0;
                return { ...r, reactions: { ...r.reactions, [emoji]: count + 1 } };
            }
            return r;
        }));
        updateReaction(replyId, emoji);
    };

    const handleDeleteReplyClick = (replyId: string) => {
        setItemToDelete({ type: 'reply', id: replyId });
    };

    const handleToggleReply = (replyId: string) => {
        setReplyingToId(current => (current === replyId ? null : replyId));
    };

    const handleMainCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mainComment.trim() || !addReply) return;
        setIsPostingMainComment(true);
        await addReply(challenge.id, { text: mainComment }, undefined, false);
        setMainComment('');
        setIsPostingMainComment(false);
    };

    const confirmDeletion = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            if (itemToDelete.type === 'reply' && deleteReply) await deleteReply(itemToDelete.id);
            else if (itemToDelete.type === 'challenge' && deleteChallenge) await deleteChallenge(itemToDelete.id);
        } catch (error) {
            console.error(`Failed to delete ${itemToDelete.type}`, error);
        } finally {
            setIsDeleting(false);
            setItemToDelete(null);
        }
    };

    // Calculate Progress
    const isTeamChallenge = challenge.type === 'team';
    let progress = 0;
    let progressText = '';

    if (familyCircle && familyCircle.members.length > 0) {
        if (isTeamChallenge && challenge.goalTotal) {
            const current = challenge.currentTotal || 0;
            progress = Math.min((current / challenge.goalTotal) * 100, 100);
            progressText = `${current} / ${challenge.goalTotal} ${challenge.unit}`;
        } else {
            const count = challenge.completedBy?.length || 0;
            const total = familyCircle.members.length;
            progress = (count / total) * 100;
            progressText = `${count}/${total}`;
        }
    }

    const theme = isTeamChallenge
        ? { bar: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' }
        : { bar: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' };

    return (
        <div className={`bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md mb-4 ${isActive ? '' : 'opacity-75 grayscale-[0.5]'}`}>

            {/* --- TOP HEADER --- */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                    <img src={challenge.challenger.avatarUrl} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{challenge.challenger.name}</span> challenged you
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isActive && <Countdown expiryDate={challenge.expiresAt} />}
                    {isChallenger && (
                        <button onClick={() => setItemToDelete({ type: 'challenge', id: challenge.id })} className="text-gray-400 hover:text-red-500 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* --- SPLIT LAYOUT: Text Left, Thumbnail Right --- */}
            <div className="flex gap-4 px-4 pb-4">
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${theme.bg} ${theme.text}`}>
                            {isTeamChallenge ? 'Team Goal' : 'Solo'}
                        </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-1">
                        {challenge.exercise.name}
                    </h3>

                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                        {challenge.target}
                    </p>

                    {familyCircle && (
                        <div>
                            <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>{progressText}</span>
                            </div>
                            <ProgressBar progress={progress} colorClass={theme.bar} />
                        </div>
                    )}
                </div>

                {/* Right Side Thumbnail */}
                {challenge.mediaUrl && (
                    <div className="w-24 h-24 flex-shrink-0">
                        <img
                            src={challenge.mediaUrl}
                            alt="Challenge"
                            className="w-full h-full object-cover rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm"
                        />
                    </div>
                )}
            </div>

            {/* --- ACTION BAR --- */}
            <div className="px-4 pb-4 flex items-center gap-3">
                {isActive && (
                    <button
                        onClick={handleCompleteChallenge}
                        disabled={!isTeamChallenge && hasReplied}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2
                            ${(!isTeamChallenge && hasReplied)
                                ? 'bg-gray-100 text-gray-400 cursor-default dark:bg-gray-700 dark:text-gray-500'
                                : `text-white ${isTeamChallenge ? 'bg-brand-blue hover:bg-blue-600' : 'bg-brand-green hover:bg-green-600'}`
                            }
                        `}
                    >
                        {!isTeamChallenge && hasReplied ? (
                            <><span>✓</span> Done</>
                        ) : (
                            isTeamChallenge ? 'Log Contribution' : 'Mark Complete'
                        )}
                    </button>
                )}

                <button
                    onClick={() => setShowComments(!showComments)}
                    className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2
                        ${showComments
                            ? 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-700 dark:border-gray-600'
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                        }`}
                >
                    <ChatBubbleLeftIcon className="w-5 h-5" />
                    {replies.length > 0 && <span className="text-xs font-bold">{replies.length}</span>}
                </button>
            </div>

            {/* --- COMMENTS SECTION --- */}
            {showComments && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4 space-y-4 animate-fade-in">

                    {/* Inline Comment Input */}
                    <form onSubmit={handleMainCommentSubmit} className="flex gap-2">
                        <img className="w-8 h-8 rounded-full mt-1 flex-shrink-0" src={currentUser?.avatarUrl} alt={currentUser?.name} />
                        <div className="flex-grow relative">
                            <textarea
                                value={mainComment}
                                onChange={(e) => setMainComment(e.target.value)}
                                rows={1}
                                placeholder="Write a comment..."
                                className="w-full text-sm py-2 px-3 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-brand-blue resize-none"
                            />
                            <button
                                type="submit"
                                disabled={!mainComment.trim() || isPostingMainComment}
                                className="absolute right-2 top-1.5 text-brand-blue hover:text-blue-600 disabled:opacity-30 p-1"
                            >
                                <ChatBubbleLeftIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </form>

                    {/* Replies List */}
                    <div className="space-y-4">
                        {topLevelReplies.length === 0 ? (
                            <p className="text-center text-xs text-gray-400 py-2">No comments yet.</p>
                        ) : (
                            topLevelReplies.map(reply => (
                                <ReplyCard
                                    key={reply.id}
                                    reply={reply}
                                    onReact={handleReaction}
                                    onDeleteClick={handleDeleteReplyClick}
                                    childReplies={repliesByParent[reply.id] || []}
                                    allRepliesByParent={repliesByParent}
                                    challengeId={challenge.id}
                                    onToggleReply={handleToggleReply}
                                    replyingToId={replyingToId}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* MODALS */}
            {isLogWeightModalOpen && (
                <LogWeightReplyModal challenge={challenge} onClose={() => setIsLogWeightModalOpen(false)} />
            )}
            {isCreateReplyModalOpen && (
                <CreateReplyModal challengeId={challenge.id} onClose={() => setIsCreateReplyModalOpen(false)} />
            )}
            {isLogActivityModalOpen && (
                <LogActivityModal challenge={challenge} onClose={() => setIsLogActivityModalOpen(false)} />
            )}
            <ConfirmDeleteModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDeletion}
                isLoading={isDeleting}
                title={itemToDelete?.type === 'challenge' ? 'Delete Challenge' : 'Delete Reply'}
                message="Are you sure? This cannot be undone."
            />
        </div>
    );
};

// --- INLINE REPLY FORM (Sub-Component) ---
const InlineReplyForm: React.FC<{
    challengeId: string;
    parentId: string;
    onCancel: () => void;
}> = ({ challengeId, parentId, onCancel }) => {
    const context = useContext(AppContext);
    const { addReply } = context || {};
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !addReply) return;
        setIsSubmitting(true);
        await addReply(challengeId, { text }, parentId, false);
        setIsSubmitting(false);
        setText('');
        onCancel();
    };

    return (
        <form onSubmit={handleSubmit} className="mt-2 ml-10 animate-fade-in">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Write a reply..."
                className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                autoFocus
            />
            <div className="flex items-center justify-end gap-2 mt-2">
                <button type="button" onClick={onCancel} className="text-xs font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
                <button
                    type="submit"
                    disabled={!text.trim() || isSubmitting}
                    className="bg-brand-blue hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                    Reply
                </button>
            </div>
        </form>
    );
};

// --- REPLY CARD (Sub-Component) ---
const ReplyCard: React.FC<{
    reply: Reply;
    onReact: (replyId: string, emoji: string) => void;
    onDeleteClick: (replyId: string) => void;
    childReplies: Reply[];
    allRepliesByParent: Record<string, Reply[]>;
    challengeId: string;
    onToggleReply: (replyId: string) => void;
    replyingToId: string | null;
}> = ({ reply, onReact, onDeleteClick, childReplies, allRepliesByParent, challengeId, onToggleReply, replyingToId }) => {
    const context = useContext(AppContext);
    const { currentUser } = context || {};
    const emojis = ['💪', '🔥', '😂', '🙌'];
    const canDelete = currentUser && currentUser.id === reply.user.id;

    return (
        <div>
            <div className="flex items-start gap-3">
                <img className="w-8 h-8 rounded-full mt-1" src={reply.user.avatarUrl} alt={reply.user.name} />
                <div className="flex-1">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none p-3 relative group">
                        {canDelete && (
                            <button
                                onClick={() => onDeleteClick(reply.id)}
                                className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <TrashIcon className="w-3 h-3" />
                            </button>
                        )}
                        <p className="font-bold text-xs text-gray-900 dark:text-gray-100 mb-0.5">{reply.user.name}</p>
                        {reply.text && <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{reply.text}</p>}
                        {reply.mediaUrl && <img src={reply.mediaUrl} alt="Reply media" className="mt-2 rounded-lg w-full h-32 object-cover" />}
                    </div>

                    <div className="flex items-center gap-3 mt-1 ml-1">
                        <div className="flex items-center gap-1">
                            {emojis.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => onReact(reply.id, emoji)}
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${(reply.reactions[emoji] || 0) > 0
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {emoji} {(reply.reactions[emoji] || 0) > 0 && reply.reactions[emoji]}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => onToggleReply(reply.id)} className="text-xs font-bold text-gray-500 hover:text-gray-700">
                            Reply
                        </button>
                    </div>
                </div>
            </div>

            {replyingToId === reply.id && (
                <InlineReplyForm
                    challengeId={challengeId}
                    parentId={reply.id}
                    onCancel={() => onToggleReply(reply.id)}
                />
            )}

            {childReplies.length > 0 && (
                <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
                    {childReplies.map(child => (
                        <ReplyCard
                            key={child.id}
                            reply={child}
                            onReact={onReact}
                            onDeleteClick={onDeleteClick}
                            childReplies={allRepliesByParent[child.id] || []}
                            allRepliesByParent={allRepliesByParent}
                            challengeId={challengeId}
                            onToggleReply={onToggleReply}
                            replyingToId={replyingToId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChallengeCard;