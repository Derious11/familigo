
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '../App';
import { Challenge, Reply, User } from '../types';
import { onRepliesUpdate, updateReaction } from '../services/firebaseService';
import LogWeightReplyModal from './LogWeightReplyModal';
import LogActivityModal from './LogActivityModal';
import CreateReplyModal from './CreateReplyModal';
import { TrashIcon } from './Icons';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import confetti from 'canvas-confetti';

interface ChallengeCardProps {
    challenge: Challenge;
    isActive: boolean;
}

const Countdown: React.FC<{ expiryDate: Date }> = ({ expiryDate }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +expiryDate - +new Date();
            let newTimeLeft = '';

            if (difference > 0) {
                const hours = Math.floor(difference / (1000 * 60 * 60));
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                newTimeLeft = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} left`;
            } else {
                newTimeLeft = 'Expired';
            }
            setTimeLeft(newTimeLeft);
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [expiryDate]);

    return <span className="text-xs font-mono bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded-md">{timeLeft}</span>;
};

const ProgressTracker: React.FC<{ challenge: Challenge; members: User[] }> = ({ challenge, members }) => {
    if (!members || members.length === 0) return null;

    if (challenge.type === 'team' && challenge.goalTotal) {
        const current = challenge.currentTotal || 0;
        const goal = challenge.goalTotal;
        const progress = Math.min((current / goal) * 100, 100);

        return (
            <div className="my-4">
                <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="font-semibold text-brand-text-secondary dark:text-gray-400">Team Goal</span>
                    <span className="font-bold text-brand-text-primary dark:text-gray-200">{current} / {goal} {challenge.unit}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="bg-brand-blue h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        );
    }

    const completedMembers = members.filter(member => challenge.completedBy?.includes(member.id));
    const progress = (challenge.completedBy?.length / members.length) * 100;

    return (
        <div className="my-4">
            <div className="flex justify-between items-center mb-1 text-sm">
                <span className="font-semibold text-brand-text-secondary dark:text-gray-400">Progress</span>
                <span className="font-bold text-brand-text-primary dark:text-gray-200">{challenge.completedBy?.length || 0} / {members.length}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-brand-green h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            {completedMembers.length > 0 && (
                <div className="flex items-center -space-x-2 mt-2">
                    {completedMembers.map(member => (
                        <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800" />
                    ))}
                </div>
            )}
        </div>
    );
};


const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, isActive }) => {
    const context = useContext(AppContext);
    const { currentUser, deleteReply, deleteChallenge, familyCircle, addReply } = context || {};
    const [replies, setReplies] = useState<Reply[]>([]);
    const [isLogWeightModalOpen, setIsLogWeightModalOpen] = useState(false);
    const [isLogActivityModalOpen, setIsLogActivityModalOpen] = useState(false);
    const [isCreateReplyModalOpen, setIsCreateReplyModalOpen] = useState(false);
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [mainComment, setMainComment] = useState('');
    const [isPostingMainComment, setIsPostingMainComment] = useState(false);

    // State for deletion confirmation
    const [itemToDelete, setItemToDelete] = useState<{ type: 'reply' | 'challenge', id: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isChallenger = currentUser?.id === challenge.challenger.id;

    useEffect(() => {
        const unsubscribe = onRepliesUpdate(challenge.id, setReplies);
        return () => unsubscribe();
    }, [challenge.id]);

    const { topLevelReplies, repliesByParent } = useMemo(() => {
        const topLevel: Reply[] = [];
        const byParent: Record<string, Reply[]> = {};
        replies.forEach(reply => {
            if (reply.parentId) {
                if (!byParent[reply.parentId]) {
                    byParent[reply.parentId] = [];
                }
                byParent[reply.parentId].push(reply);
            } else {
                topLevel.push(reply);
            }
        });
        // Sort children replies by timestamp
        for (const parentId in byParent) {
            byParent[parentId].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }
        return { topLevelReplies: topLevel, repliesByParent: byParent };
    }, [replies]);

    const hasReplied = currentUser && challenge.completedBy?.includes(currentUser.id);

    const handleCompleteChallenge = () => {
        if (!currentUser || !isActive) return;

        // For individual challenges, prevent multiple completions
        if (challenge.type !== 'team' && hasReplied) return;

        // Trigger confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        if (challenge.exercise.name === 'Weight Check-in') {
            setIsLogWeightModalOpen(true);
        } else if (challenge.type === 'team') {
            // We'll reuse the LogWeightReplyModal logic but adapted for generic activity logging
            // For now, let's assume we will create a new modal or adapt the existing one.
            // Let's use a new state for LogActivityModal
            setIsLogActivityModalOpen(true);
        } else {
            setIsCreateReplyModalOpen(true);
        }
    };

    const handleReaction = (replyId: string, emoji: string) => {
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
            if (itemToDelete.type === 'reply' && deleteReply) {
                await deleteReply(itemToDelete.id);
            } else if (itemToDelete.type === 'challenge' && deleteChallenge) {
                await deleteChallenge(itemToDelete.id);
            }
        } catch (error) {
            console.error(`Failed to delete ${itemToDelete.type}:`, error);
        } finally {
            setIsDeleting(false);
            setItemToDelete(null);
        }
    };

    return (
        <div className={`bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all ${isActive ? 'shadow-lg' : 'opacity-75'}`}>
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <img className="w-12 h-12 rounded-full" src={challenge.challenger.avatarUrl} alt={challenge.challenger.name} />
                        <div>
                            <p className="font-bold text-brand-text-primary dark:text-gray-100">{challenge.challenger.name}</p>
                            <p className="text-sm text-brand-text-secondary dark:text-gray-400">
                                challenged everyone to <span className="font-semibold">{challenge.exercise.name}!</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isChallenger && (
                            <button
                                onClick={() => setItemToDelete({ type: 'challenge', id: challenge.id })}
                                className="p-1.5 rounded-full text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                aria-label="Delete challenge"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        )}
                        {isActive && <Countdown expiryDate={challenge.expiresAt} />}
                    </div>
                </div>
            </div>
            {challenge.mediaUrl && (
                <img className="w-full h-56 object-cover" src={challenge.mediaUrl} alt="Challenge media" />
            )}
            <div className="p-4">
                <div className="bg-brand-blue/10 rounded-lg p-3 text-center">
                    <p className="text-brand-blue dark:text-blue-300 font-bold text-2xl">{challenge.target}</p>
                </div>
                {familyCircle && isActive && <ProgressTracker challenge={challenge} members={familyCircle.members} />}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleMainCommentSubmit} className="flex items-start gap-2">
                    <img className="w-8 h-8 rounded-full mt-1" src={currentUser?.avatarUrl} alt={currentUser?.name} />
                    <textarea
                        value={mainComment}
                        onChange={(e) => setMainComment(e.target.value)}
                        rows={1}
                        placeholder="Add a comment..."
                        className="flex-grow text-sm p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-brand-blue focus:border-brand-blue resize-none"
                    />
                    <button
                        type="submit"
                        disabled={!mainComment.trim() || isPostingMainComment}
                        className="bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                        Post
                    </button>
                </form>
            </div>

            {replies.length > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                        {topLevelReplies.map(reply => (
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
                        ))}
                    </div>
                </div>
            )}

            {currentUser && isActive && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    {challenge.type === 'team' ? (
                        <button
                            onClick={handleCompleteChallenge}
                            className="w-full bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-brand-blue/90 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg active:scale-95"
                        >
                            Log Activity
                        </button>
                    ) : (
                        !hasReplied && (
                            <button
                                onClick={handleCompleteChallenge}
                                className="w-full bg-gradient-to-r from-brand-green to-emerald-600 hover:from-brand-green/90 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg active:scale-95 animate-pulse"
                            >
                                I Did It!
                            </button>
                        )
                    )}
                </div>
            )}
            {isLogWeightModalOpen && (
                <LogWeightReplyModal
                    challenge={challenge}
                    onClose={() => setIsLogWeightModalOpen(false)}
                />
            )}
            {isCreateReplyModalOpen && (
                <CreateReplyModal
                    challengeId={challenge.id}
                    onClose={() => setIsCreateReplyModalOpen(false)}
                />
            )}
            {isLogActivityModalOpen && (
                <LogActivityModal
                    challenge={challenge}
                    onClose={() => setIsLogActivityModalOpen(false)}
                />
            )}
            <ConfirmDeleteModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDeletion}
                isLoading={isDeleting}
                title={itemToDelete?.type === 'challenge' ? 'Delete Challenge' : 'Delete Reply'}
                message={`Are you sure you want to delete this ${itemToDelete?.type}? This will also remove any nested replies. This action cannot be undone.`}
            />
        </div>
    );
};

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
        await addReply(challengeId, { text }, parentId, false); // isCompletion is false for threaded replies
        setIsSubmitting(false);
        setText('');
        onCancel();
    };

    return (
        <form onSubmit={handleSubmit} className="mt-2 ml-10">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Write a reply..."
                className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:ring-brand-blue focus:border-brand-blue"
                autoFocus
            />
            <div className="flex items-center justify-end gap-2 mt-2">
                <button type="button" onClick={onCancel} className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:underline">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!text.trim() || isSubmitting}
                    className="bg-brand-blue hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Posting...' : 'Post'}
                </button>
            </div>
        </form>
    );
};

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
                <img className="w-10 h-10 rounded-full mt-1" src={reply.user.avatarUrl} alt={reply.user.name} />
                <div className="flex-1">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 relative group">
                        {canDelete && (
                            <button
                                onClick={() => onDeleteClick(reply.id)}
                                className="absolute top-2 right-2 p-1 rounded-full bg-gray-200/50 dark:bg-gray-600/50 text-gray-500 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
                                aria-label="Delete reply"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                        <p className="font-semibold text-sm text-brand-text-primary dark:text-gray-100">{reply.user.name}</p>
                        {reply.text && (
                            <p className="text-md text-brand-text-primary dark:text-gray-200 mt-1 whitespace-pre-wrap">{reply.text}</p>
                        )}
                        {reply.mediaUrl && <img src={reply.mediaUrl} alt="Reply media" className="mt-2 rounded-md w-full h-40 object-cover" />}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-2">
                            {emojis.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => onReact(reply.id, emoji)}
                                    className="text-xs bg-gray-200/80 dark:bg-gray-600/80 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full px-2 py-1 transition-transform transform hover:scale-110"
                                >
                                    {emoji} {reply.reactions[emoji] || ''}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => onToggleReply(reply.id)} className="text-xs font-semibold text-brand-text-secondary dark:text-gray-400 hover:underline">
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
                <div className="mt-4 pl-6 border-l-2 border-gray-200 dark:border-gray-600 space-y-4">
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
