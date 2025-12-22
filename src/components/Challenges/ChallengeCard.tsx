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
import AvatarImage from '../ui/AvatarImage';

interface ChallengeCardProps {
    challenge: Challenge;
    isActive: boolean;
}

/* ---------- Countdown ---------- */
const Countdown: React.FC<{ expiryDate: Date }> = ({ expiryDate }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const calculate = () => {
            const diff = +expiryDate - +new Date();
            if (diff <= 0) return setTimeLeft('Expired');

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            setIsUrgent(hours < 24);

            if (hours > 24) {
                const days = Math.floor(hours / 24);
                setTimeLeft(`${days}d ${hours % 24}h left`);
            } else {
                setTimeLeft(`${hours}h ${minutes}m left`);
            }
        };

        calculate();
        const timer = setInterval(calculate, 60000);
        return () => clearInterval(timer);
    }, [expiryDate]);

    return (
        <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isUrgent
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
        >
            <ClockIcon className="w-3 h-3" />
            {timeLeft}
        </span>
    );
};

/* ---------- Progress Bar ---------- */
const ProgressBar: React.FC<{ progress: number; colorClass: string }> = ({
    progress,
    colorClass,
}) => (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2 overflow-hidden">
        <div
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${progress}%` }}
        />
    </div>
);

/* ---------- Main Component ---------- */
const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, isActive }) => {
    const context = useContext(AppContext);
    const { currentUser, deleteReply, deleteChallenge, familyCircle, addReply } =
        context || {};

    const [replies, setReplies] = useState<Reply[]>([]);
    const [isLogWeightModalOpen, setIsLogWeightModalOpen] = useState(false);
    const [isLogActivityModalOpen, setIsLogActivityModalOpen] = useState(false);
    const [isCreateReplyModalOpen, setIsCreateReplyModalOpen] = useState(false);
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [mainComment, setMainComment] = useState('');
    const [isPostingMainComment, setIsPostingMainComment] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{
        type: 'reply' | 'challenge';
        id: string;
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isChallenger = currentUser?.id === challenge.challenger.id;

    /* ---------- Load Replies ---------- */
    useEffect(() => {
        const unsubscribe = onRepliesUpdate(
            challenge.id,
            challenge.familyCircleId,
            setReplies
        );

        return () => {
            unsubscribe();
            try {
                confetti.reset();
            } catch { }
        };
    }, [challenge.id, challenge.familyCircleId]);

    /* ---------- Threading ---------- */
    const { topLevelReplies, repliesByParent } = useMemo(() => {
        const top: Reply[] = [];
        const map: Record<string, Reply[]> = {};

        replies.forEach((r) => {
            if (r.parentId) {
                (map[r.parentId] ||= []).push(r);
            } else {
                top.push(r);
            }
        });

        Object.values(map).forEach((arr) =>
            arr.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        );

        return { topLevelReplies: top, repliesByParent: map };
    }, [replies]);

    const hasReplied =
        currentUser && challenge.completedBy?.includes(currentUser.id);

    /* ---------- Handlers ---------- */
    const handleCompleteChallenge = () => {
        if (!currentUser || !isActive) return;
        if (challenge.type !== 'team' && hasReplied) return;

        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });

        if (challenge.exercise.name === 'Weight Check-in')
            setIsLogWeightModalOpen(true);
        else if (challenge.type === 'team')
            setIsLogActivityModalOpen(true);
        else setIsCreateReplyModalOpen(true);
    };

    const handleReaction = (replyId: string, emoji: string) => {
        setReplies((cur) =>
            cur.map((r) =>
                r.id === replyId
                    ? {
                        ...r,
                        reactions: {
                            ...r.reactions,
                            [emoji]: (r.reactions[emoji] || 0) + 1,
                        },
                    }
                    : r
            )
        );
        updateReaction(replyId, emoji);
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
            if (itemToDelete.type === 'reply' && deleteReply)
                await deleteReply(itemToDelete.id);
            else if (itemToDelete.type === 'challenge' && deleteChallenge)
                await deleteChallenge(itemToDelete.id);
        } finally {
            setIsDeleting(false);
            setItemToDelete(null);
        }
    };

    /* ---------- Progress ---------- */
    const isTeamChallenge = challenge.type === 'team';
    let progress = 0;
    let progressText = '';

    if (familyCircle?.members.length) {
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
        <div className={`bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4 ${!isActive ? 'opacity-75 grayscale-[0.5]' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                    <AvatarImage
                        userId={challenge.challenger.id}
                        cacheKey={challenge.challenger.avatarUpdatedAt?.getTime?.()}
                        alt={challenge.challenger.name}
                        className="w-6 h-6 rounded-full border"
                    />
                    <span className="text-xs">
                        <b>{challenge.challenger.name}</b> challenged you
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isActive && <Countdown expiryDate={challenge.expiresAt} />}
                    {isChallenger && (
                        <button onClick={() => setItemToDelete({ type: 'challenge', id: challenge.id })}>
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="px-4 pb-4">
                <h3 className="text-xl font-bold">{challenge.exercise.name}</h3>
                <p className="text-sm mb-3">{challenge.target}</p>

                {familyCircle && (
                    <>
                        <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{progressText}</span>
                        </div>
                        <ProgressBar progress={progress} colorClass={theme.bar} />
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex gap-3">
                {isActive && (
                    <button
                        onClick={handleCompleteChallenge}
                        disabled={!isTeamChallenge && hasReplied}
                        className="flex-1 py-2 rounded-xl font-bold text-white"
                    >
                        {!isTeamChallenge && hasReplied ? '✓ Done' : isTeamChallenge ? 'Log Contribution' : 'Mark Complete'}
                    </button>
                )}
                <button onClick={() => setShowComments((s) => !s)}>
                    <ChatBubbleLeftIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Comments */}
            {showComments && (
                <div className="p-4 space-y-4">
                    <form onSubmit={handleMainCommentSubmit} className="flex gap-2">
                        <AvatarImage
                            userId={currentUser?.id}
                            cacheKey={currentUser?.avatarUpdatedAt?.getTime?.()}
                            className="w-8 h-8 rounded-full"
                        />
                        <textarea
                            value={mainComment}
                            onChange={(e) => setMainComment(e.target.value)}
                            className="flex-1 text-sm"
                        />
                    </form>

                    {topLevelReplies.map((reply) => (
                        <ReplyCard
                            key={reply.id}
                            reply={reply}
                            childReplies={repliesByParent[reply.id] || []}
                            onReact={handleReaction}
                            onDeleteClick={(id) => setItemToDelete({ type: 'reply', id })}
                            onToggleReply={(id) => setReplyingToId((c) => (c === id ? null : id))}
                            replyingToId={replyingToId}
                            challengeId={challenge.id}
                        />
                    ))}
                </div>
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

/* ---------- Reply Card ---------- */
const ReplyCard: React.FC<{
    reply: Reply;
    onReact: (replyId: string, emoji: string) => void;
    onDeleteClick: (replyId: string) => void;
    childReplies: Reply[];
    onToggleReply: (replyId: string) => void;
    replyingToId: string | null;
    challengeId: string;
}> = ({ reply, onReact, onDeleteClick, childReplies }) => {
    return (
        <div className="flex gap-3">
            <AvatarImage
                userId={reply.user.id}
                cacheKey={reply.user.avatarUpdatedAt?.getTime?.()}
                className="w-8 h-8 rounded-full"
            />
            <div>
                <b>{reply.user.name}</b>
                <p>{reply.text}</p>
            </div>
        </div>
    );
};

export default ChallengeCard;
