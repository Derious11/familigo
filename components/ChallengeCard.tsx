
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Challenge, Reply, User } from '../types';
import { onRepliesUpdate, updateReaction } from '../services/firebaseService';
import LogWeightReplyModal from './LogWeightReplyModal';
import CreateReplyModal from './CreateReplyModal';
import { TrashIcon } from './Icons';
import ConfirmDeleteModal from './ConfirmDeleteModal';

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
    const { currentUser, deleteReply, deleteChallenge, familyCircle } = context || {};
    const [replies, setReplies] = useState<Reply[]>([]);
    const [isLogWeightModalOpen, setIsLogWeightModalOpen] = useState(false);
    const [isCreateReplyModalOpen, setIsCreateReplyModalOpen] = useState(false);
    
    // State for deletion confirmation
    const [itemToDelete, setItemToDelete] = useState<{ type: 'reply' | 'challenge', id: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const isChallenger = currentUser?.id === challenge.challenger.id;
    
    useEffect(() => {
        const unsubscribe = onRepliesUpdate(challenge.id, setReplies);
        return () => unsubscribe();
    }, [challenge.id]);

    const hasReplied = currentUser && challenge.completedBy?.includes(currentUser.id);

    const handleReply = () => {
        if (!currentUser || hasReplied || !isActive) return;

        if (challenge.exercise.name === 'Weight Check-in') {
            setIsLogWeightModalOpen(true);
        } else {
            setIsCreateReplyModalOpen(true);
        }
    };

    const handleReaction = (replyId: string, emoji: string) => {
        updateReaction(replyId, emoji);
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

            {replies.length > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-sm mb-3 text-brand-text-secondary dark:text-gray-400">Replies:</h4>
                    <div className="space-y-4">
                        {replies.map(reply => (
                            <ReplyCard key={reply.id} reply={reply} onReact={(emoji) => handleReaction(reply.id, emoji)} onDeleteClick={() => setItemToDelete({ type: 'reply', id: reply.id })} />
                        ))}
                    </div>
                </div>
            )}

            {currentUser && !hasReplied && isActive && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleReply}
                        className="w-full bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
                    >
                        I Did It!
                    </button>
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
            <ConfirmDeleteModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDeletion}
                isLoading={isDeleting}
                title={itemToDelete?.type === 'challenge' ? 'Delete Challenge' : 'Delete Reply'}
                message={`Are you sure you want to delete this ${itemToDelete?.type}? This action cannot be undone.`}
            />
        </div>
    );
};

const ReplyCard: React.FC<{ reply: Reply; onReact: (emoji: string) => void; onDeleteClick: () => void; }> = ({ reply, onReact, onDeleteClick }) => {
    const context = useContext(AppContext);
    const { currentUser } = context || {};
    const emojis = ['💪', '🔥', '😂', '🙌'];
    const canDelete = currentUser && currentUser.id === reply.user.id;

    return (
        <div className="flex items-start gap-3">
            <img className="w-10 h-10 rounded-full mt-1" src={reply.user.avatarUrl} alt={reply.user.name} />
            <div className="flex-1">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 relative group">
                     {canDelete && (
                        <button 
                            onClick={onDeleteClick}
                            className="absolute top-2 right-2 p-1 rounded-full bg-gray-200/50 dark:bg-gray-600/50 text-gray-500 dark:text-gray-300 transition-colors hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
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
                 <div className="flex items-center gap-2 mt-1">
                    {emojis.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => onReact(emoji)}
                            className="text-xs bg-gray-200/80 dark:bg-gray-600/80 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full px-2 py-1 transition-transform transform hover:scale-110"
                        >
                            {emoji} {reply.reactions[emoji] || ''}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChallengeCard;
