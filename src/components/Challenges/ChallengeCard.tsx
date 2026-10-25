import React,{ useContext,useEffect,useMemo,useState } from 'react';
import { AppContext } from '../../App';
import { EXERCISES } from '../../constants';
import { updateReaction } from '../../services/challengeService';
import { Challenge,Reply } from '../../types';
import { useLiveCollection } from '../../hooks/useLiveCollection';
import ConfirmDeleteModal from '../ConfirmDeleteModal';
import { ChatBubbleLeftIcon,ClockIcon,TrashIcon } from '../Icons';
import AvatarImage from '../ui/AvatarImage';
import CreateReplyModal from './CreateReplyModal';
import ExerciseVideo from './ExerciseVideo';
import LogActivityModal from './LogActivityModal';
import LogWeightReplyModal from './LogWeightReplyModal';

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

    const [isLogWeightModalOpen, setIsLogWeightModalOpen] = useState(false);
    const [isLogActivityModalOpen, setIsLogActivityModalOpen] = useState(false);
    const [isCreateReplyModalOpen, setIsCreateReplyModalOpen] = useState(false);
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [mainComment, setMainComment] = useState('');
    const [isPostingMainComment, setIsPostingMainComment] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const {items:recentReplies, loading:repliesLoading, error:repliesError, hasMore, loadMore, retry} = useLiveCollection<Reply>('replies', [['challengeId',challenge.id],['familyCircleId',challenge.familyCircleId]], showComments);
    const replies = useMemo(() => [...recentReplies].reverse(), [recentReplies]);
    const [itemToDelete, setItemToDelete] = useState<{
        type: 'reply' | 'challenge';
        id: string;
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [actionError, setActionError] = useState('');

    const bundledGuide = EXERCISES.find(exercise =>
        exercise.name.toLowerCase() === challenge.exercise.name.toLowerCase()
    )?.visualGuideUrl;
    const guideUrl = bundledGuide?.startsWith('/assets/')
        ? bundledGuide
        : challenge.exercise.visualGuideUrl;
    const isVideoGuide = /\.mp4(?:[?#]|$)/i.test(guideUrl || '');
    const isChallenger = currentUser?.id === challenge.challenger.id;

    /* ---------- Load Replies ---------- */

    /* ---------- Threading ---------- */
    const { topLevelReplies, repliesByParent } = useMemo(() => {
        const top: Reply[] = [];
        const map: Record<string, Reply[]> = {};

        replies.forEach((r) => {
            if (r.parentId && replies.some(parent => parent.id === r.parentId)) {
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

        if (challenge.exercise.name === 'Weight Check-in')
            setIsLogWeightModalOpen(true);
        else if (challenge.type === 'team')
            setIsLogActivityModalOpen(true);
        else setIsCreateReplyModalOpen(true);
    };

    const handleReaction = async (replyId: string, emoji: string) => {
        if (!currentUser) return;
        try { await updateReaction(replyId, emoji, currentUser.id, challenge.familyCircleId); setActionError(''); }
        catch { setActionError('Could not save your reaction. Please try again.'); }
    };

    const handleMainCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mainComment.trim() || !addReply || isPostingMainComment) return;
        setIsPostingMainComment(true);
        try {
            await addReply(challenge.id, { text: mainComment }, undefined, false);
            setMainComment('');
            setActionError('');
        } catch {
            setActionError('Could not post your comment. Your draft is still here. Please try again.');
        } finally {
            setIsPostingMainComment(false);
        }
    };

    const confirmDeletion = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            if (itemToDelete.type === 'reply' && deleteReply)
                await deleteReply(itemToDelete.id);
            else if (itemToDelete.type === 'challenge' && deleteChallenge)
                await deleteChallenge(itemToDelete.id);
        } catch {
            setActionError('Could not delete this item. Please try again.');
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
            const count = challenge.completedBy?.filter(id => familyCircle.members.some(member => member.id === id)).length || 0;
            const total = familyCircle.members.length;
            progress = (count / total) * 100;
            progressText = `${count}/${total}`;
        }
    }

    const theme = isTeamChallenge
        ? { bar: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' }
        : { bar: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' };

    return (
        <div className={`app-challenge-card bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4 ${!isActive ? 'opacity-75 grayscale-[0.5]' : ''}`}>
            {actionError && <p role="alert" className="p-3 text-sm text-red-600">{actionError}</p>}
            {/* Header */}
            <div className="app-challenge-header flex items-center justify-between px-4 pt-4 pb-2">
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
                        <button aria-label={`Delete ${challenge.exercise.name} challenge`} onClick={() => setItemToDelete({ type: 'challenge', id: challenge.id })}>
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="app-challenge-body px-4 pb-4">
                <h3 className="text-xl font-bold">{challenge.exercise.name}</h3>
                <p className="text-sm mb-3">{challenge.target}</p>

                {guideUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden shadow-sm aspect-video">
                        {isVideoGuide ? (
                            <ExerciseVideo
                                key={guideUrl}
                                src={guideUrl}
                                name={challenge.exercise.name}
                            />
                        ) : (
                        <img
                            src={guideUrl}
                            loading="lazy"
                            decoding="async"
                            alt={challenge.exercise.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        )}
                    </div>
                )}

                {familyCircle && (
                    <>
                        <div className="app-challenge-progress flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{progressText}</span>
                        </div>
                        <ProgressBar progress={progress} colorClass={theme.bar} />
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="app-challenge-actions px-4 pb-4 flex gap-3">
                {isActive && (
                    <button
                        onClick={handleCompleteChallenge}
                        disabled={!isTeamChallenge && hasReplied}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 ${!isTeamChallenge && hasReplied
                            ? 'bg-green-500/60 cursor-default shadow-none'
                            : 'bg-green-500 hover:bg-green-600 shadow-green-500/30'
                            }`}
                    >
                        {!isTeamChallenge && hasReplied ? '✓ Done' : isTeamChallenge ? 'Log Contribution' : 'Mark Complete'}
                    </button>
                )}
                <button aria-label={`${showComments ? 'Hide' : 'Show'} comments for ${challenge.exercise.name}`} aria-expanded={showComments} onClick={() => setShowComments((s) => !s)}>
                    <ChatBubbleLeftIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Comments */}
            {showComments && (
                <div className="p-4 space-y-4">
                    {repliesError && <p role="alert">Unable to load comments. <button onClick={retry}>Try again</button></p>}
                    {(hasMore || repliesLoading) && <button disabled={repliesLoading} onClick={loadMore} className="min-h-11 underline">{repliesLoading ? 'Loading comments…' : 'Load older comments'}</button>}
                    <form onSubmit={handleMainCommentSubmit} className="flex gap-2 items-start">
                        <AvatarImage
                            userId={currentUser?.id}
                            cacheKey={currentUser?.avatarUpdatedAt?.getTime?.()}
                        hasAvatar={currentUser?.hasAvatar}
                            className="w-8 h-8 rounded-full mt-1"
                        />
                        <div className="flex-1 relative">
                            <textarea
                                value={mainComment}
                                aria-label="Write a comment"
                                onChange={(e) => setMainComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="w-full text-sm rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-0 focus:ring-2 focus:ring-brand-blue resize-none shadow-sm dark:text-gray-100 placeholder:text-gray-400"
                                rows={1}
                                onKeyDown={(e) => {
                                    // Submit on Enter (without Shift)
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleMainCommentSubmit(e);
                                    }
                                    // Auto-resize
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto'; // Reset
                                    target.style.height = `${target.scrollHeight}px`; // Set to scroll height
                                }}
                            />
                            {mainComment.trim() && (
                                <button
                                    type="submit"
                                    aria-label="Post comment"
                                    disabled={isPostingMainComment}
                                    className="absolute right-2 top-2 p-1 text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-all"
                                >
                                    {/* PaperAirplaneIcon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </form>

                    {topLevelReplies.map((reply) => (
                        <ReplyCard
                            key={reply.id}
                            reply={reply}
                            childReplies={repliesByParent[reply.id] || []}
                            repliesByParent={repliesByParent}
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

            {isLogWeightModalOpen && (
                <LogWeightReplyModal
                    challenge={challenge}
                    onClose={() => setIsLogWeightModalOpen(false)}
                />
            )}

            {isLogActivityModalOpen && (
                <LogActivityModal
                    challenge={challenge}
                    onClose={() => setIsLogActivityModalOpen(false)}
                />
            )}

            {isCreateReplyModalOpen && (
                <CreateReplyModal
                    challengeId={challenge.id}
                    onClose={() => setIsCreateReplyModalOpen(false)}
                />
            )}
        </div>
    );
};

/* ---------- Reply Card ---------- */
/* ---------- Reply Card ---------- */
const ReplyCard: React.FC<{
    reply: Reply;
    onReact: (replyId: string, emoji: string) => void;
    onDeleteClick: (replyId: string) => void;
    childReplies: Reply[];
    repliesByParent?: Record<string, Reply[]>;
    onToggleReply: (replyId: string) => void;
    replyingToId: string | null;
    challengeId: string;
}> = ({ reply, onReact, onDeleteClick, childReplies, repliesByParent = {} }) => {
    return (
        <div className="flex gap-3">
            <AvatarImage
                userId={reply.user.id}
                cacheKey={reply.user.avatarUpdatedAt?.getTime?.()}
                className="w-8 h-8 rounded-full"
            />
            <div className="flex-1">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl rounded-tl-none px-4 py-2 inline-block">
                    <b className="text-sm text-gray-900 dark:text-gray-100">{reply.user.name}</b>

                    {reply.mediaUrl && (
                        <div className="mt-2 mb-1">
                            <div className="relative rounded-lg overflow-hidden h-40 w-auto inline-block border border-gray-200 dark:border-gray-600">
                                <img
                                    src={reply.mediaUrl}
                                    loading="lazy"
                                    decoding="async"
                                    alt="Challenge Proof"
                                    className="h-full w-auto object-cover max-w-full"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 text-center font-bold uppercase tracking-wider backdrop-blur-sm">
                                    Completed the Challenge
                                </div>
                            </div>
                        </div>
                    )}

                    {reply.text && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{reply.text}</p>}
                    <div className="flex gap-2 mt-2" role="group" aria-label="React to challenge update">{['❤️', '👏', '💪'].map(emoji => <button key={emoji} onClick={() => onReact(reply.id, emoji)} className="px-2 min-h-11 rounded-lg border border-gray-200 dark:border-gray-600" aria-label={`React ${emoji}`}>{emoji} {reply.reactions?.[emoji] || ''}</button>)}</div>
                </div>
                {childReplies.map(child => <ReplyCard key={child.id} reply={child} childReplies={repliesByParent[child.id] || []} repliesByParent={repliesByParent} onReact={onReact} onDeleteClick={onDeleteClick} onToggleReply={() => {}} replyingToId={null} challengeId={child.challengeId}/>)}
            </div>
        </div>
    );
};

export default ChallengeCard;
