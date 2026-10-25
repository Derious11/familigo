import React,{ useContext,useEffect,useLayoutEffect,useMemo,useRef,useState } from 'react';
import { AppContext } from '../../App';
import { deleteMessage,markChatAsRead,sendMessage,updateFamilyCircleChatName } from '../../services/chatService';
import { Message } from '../../types';
import { useLiveCollection } from '../../hooks/useLiveCollection';
import AppTabIntro from '../AppTabIntro';
import { CheckIcon,PaperAirplaneIcon,PencilIcon,TrashIcon,XMarkIcon } from '../Icons';
import AvatarImage from '../ui/AvatarImage';
import {BADGES} from '../../services/achievementService';
import '../Profile/achievements.css';
const Chat: React.FC = () => {
    const context = useContext(AppContext);
    const { currentUser, familyCircle } = context || {};
    const {items:latest, loading, error, hasMore, loadMore, retry} = useLiveCollection<Message>('messages', [['familyCircleId',familyCircle?.id]], !!familyCircle?.id);
    const messages = useMemo(() => [...latest].reverse(), [latest]);
    const [isSending, setIsSending] = useState(false);
    const [actionError, setActionError] = useState('');
    const scrollState = useRef({bottom:true, id:'', offset:0});
    const [newMessage, setNewMessage] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [chatName, setChatName] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => { setChatName(familyCircle?.chatName || 'Family Chat'); }, [familyCircle?.chatName]);
    useEffect(() => {
        if (!currentUser?.id || !familyCircle?.id) return;
        markChatAsRead(currentUser.id, familyCircle.id).catch(() => setActionError('Unable to mark chat as read.'));
    }, [currentUser?.id, familyCircle?.id, familyCircle?.messageCount]);
    const rememberScroll = () => {
        const panel = messagesContainerRef.current;
        if (!panel) return;
        const top = panel.getBoundingClientRect().top;
        const first = [...panel.querySelectorAll<HTMLElement>('[data-message-id]')].find(element => element.getBoundingClientRect().bottom > top);
        scrollState.current = {bottom:panel.scrollHeight-panel.scrollTop-panel.clientHeight < 60, id:first?.dataset.messageId || '', offset:first ? first.getBoundingClientRect().top-top : 0};
    };
    useLayoutEffect(() => {
        const panel = messagesContainerRef.current;
        if (!panel) return;
        if (scrollState.current.bottom) panel.scrollTop = panel.scrollHeight;
        else {
            const anchor = [...panel.querySelectorAll<HTMLElement>('[data-message-id]')].find(element => element.dataset.messageId === scrollState.current.id);
            if (anchor) panel.scrollTop += anchor.getBoundingClientRect().top-panel.getBoundingClientRect().top-scrollState.current.offset;
        }
    }, [messages]);
    const getAvatarCacheKey = (userId: string) => {
        const member = familyCircle?.members.find((m) => m.id === userId);
        return member?.avatarUpdatedAt?.getTime?.();
    };
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!navigator.onLine) { alert('Reconnect before sending a message. Your draft is still here.'); return; }
        if (!newMessage.trim() || !currentUser || !familyCircle)
            return;
        if (isSending) return;
        const text = newMessage.trim();
        setIsSending(true);
        try {
            await sendMessage(familyCircle.id, currentUser, text);
            setNewMessage('');
            setActionError('');
            scrollState.current.bottom = true;
            const panel = messagesContainerRef.current;
            if (panel) panel.scrollTop = panel.scrollHeight;
        } catch {
            setActionError('Failed to send message. Your draft is still here. Please try again.');
        } finally { setIsSending(false); }
    };
    const handleRenameChat = async () => {
        if (!chatName.trim() || !currentUser || !familyCircle)
            return;
        if (chatName !== familyCircle.chatName) {
            try { await updateFamilyCircleChatName(familyCircle.id, currentUser, chatName); }
            catch { setActionError('Could not rename chat. Please try again.'); return; }
        }
        setIsRenaming(false);
    };
    const handleDeleteMessage = async (messageId: string) => {
        if (window.confirm('Are you sure you want to delete this message?')) {
            try { await deleteMessage(messageId); } catch { setActionError('Could not delete the message. Please try again.'); }
        }
    };
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    if (!currentUser || !familyCircle)
        return null;
    return (<div className="app-chat-page">
        {<AppTabIntro eyebrow="Your family huddle" title="Keep the cheers going." description="Share a little encouragement, plan your next challenge, or say hello."/>}
        <div className="app-chat-panel flex flex-col h-[calc(100vh-180px)]">
            {/* Chat Header */}
            <div className="app-chat-header flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm rounded-t-lg border-b border-gray-200 dark:border-gray-700">
                {isRenaming ? (<div className="flex items-center gap-2 flex-1">
                        <input type="text" aria-label="Chat name" value={chatName} onChange={(e) => setChatName(e.target.value)} className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:text-white" autoFocus/>
                        <button aria-label="Save chat name" onClick={handleRenameChat} className="text-green-500 hover:text-green-600">
                            <CheckIcon className="w-6 h-6"/>
                        </button>
                        <button aria-label="Cancel renaming chat" onClick={() => { setIsRenaming(false); setChatName(familyCircle.chatName || 'Family Chat'); }} className="text-red-500 hover:text-red-600">
                            <XMarkIcon className="w-6 h-6"/>
                        </button>
                    </div>) : (<div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-brand-text-primary dark:text-gray-100">
                            {familyCircle.chatName || 'Family Chat'}
                        </h2>
                        <button aria-label="Rename family chat" onClick={() => setIsRenaming(true)} className="text-gray-400 hover:text-brand-blue transition-colors">
                            <PencilIcon className="w-4 h-4"/>
                        </button>
                    </div>)}
            </div>

            {/* Messages List */}
            <div ref={messagesContainerRef} onScroll={rememberScroll} className="app-chat-messages flex-1 overflow-y-auto p-4 space-y-4 bg-brand-background dark:bg-gray-900 scrollbar-hide" role="log" aria-label="Family messages" aria-live="polite" aria-relevant="additions">
                {error && <p role="alert">Unable to load messages. <button onClick={retry}>Try again</button></p>}
                {(hasMore || loading) && <button disabled={loading} onClick={() => {rememberScroll(); scrollState.current.bottom=false; loadMore();}} className="min-h-11 underline">{loading ? 'Loading messages…' : 'Load older messages'}</button>}
                {!loading && !error && messages.length === 0 && (<div className="text-center text-gray-400 mt-10">
                        {<img src="/assets/brand/gogo-wave.webp" width="1024" height="1536" alt="GoGo waving hello." className="app-chat-empty-gogo"/>}
                        <p>No messages yet. Start the conversation!</p>
                    </div>)}

                {messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.id;
            if (msg.type === 'achievement') {
                const badge = BADGES.find(b => b.id === msg.badgeId);
                return <div key={msg.id} data-message-id={msg.id} className="achievement-announcement"><span aria-hidden="true">{badge?.icon || '🏆'}</span><div>{msg.senderId && <AvatarImage userId={msg.senderId} alt={msg.senderName} className="w-8 h-8 rounded-full mb-2" cacheKey={getAvatarCacheKey(msg.senderId)}/>}<b>{msg.senderName} unlocked {badge?.name || 'an achievement'}!</b><p>{msg.text}</p><details><summary>Badge details</summary><p>{badge?.description}</p><small>{msg.timestamp.toLocaleDateString()}</small></details></div></div>;
            }
            const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId || messages[index - 1].type === 'system');
            if (msg.type === 'system') {
                return (<div key={msg.id} data-message-id={msg.id} className="flex justify-center my-4">
                                <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full">
                                    {msg.senderName} {msg.text}
                                </span>
                            </div>);
            }
            return (<div key={msg.id} data-message-id={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 group`}>
                            {!isMe && (<div className="w-8 h-8 flex-shrink-0">
                                    {showAvatar ? (<AvatarImage userId={msg.senderId} alt={msg.senderName} className="w-8 h-8 rounded-full object-cover" cacheKey={getAvatarCacheKey(msg.senderId)}/>) : <div className="w-8"/>}
                                </div>)}

                            {isMe && (<button onClick={() => handleDeleteMessage(msg.id)} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1" title="Delete message" aria-label="Delete message">
                                    <TrashIcon className="w-4 h-4"/>
                                </button>)}

                            <div className={`app-message-bubble ${isMe ? 'app-message-own' : ''} max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${isMe
                    ? 'bg-brand-blue text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-800 text-brand-text-primary dark:text-gray-100 rounded-bl-none'}`}>
                                {!isMe && showAvatar && (<p className="text-xs font-bold text-brand-blue mb-1">{msg.senderName}</p>)}
                                <p className="break-words">{msg.text}</p>
                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {formatTime(msg.timestamp)}
                                </p>
                            </div>
                        </div>);
        })}
                <div ref={messagesEndRef}/>
            </div>

            {actionError && <p role="alert" className="p-3 text-sm">{actionError}</p>}
            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="app-chat-composer p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <input type="text" aria-label="Message your family" maxLength={2000} disabled={isSending} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-blue bg-gray-50 dark:bg-gray-700 text-brand-text-primary dark:text-white"/>
                <button type="submit" aria-label="Send message" disabled={isSending || !newMessage.trim()} className="p-2 bg-brand-blue text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md">
                    <PaperAirplaneIcon className="w-6 h-6"/>
                </button>
            </form>
        </div>
        </div>);
};
export default Chat;
