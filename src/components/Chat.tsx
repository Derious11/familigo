import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../App';
import { onMessagesUpdate, sendMessage, updateFamilyCircleChatName, deleteMessage, markChatAsRead } from '../services/chatService';
import { Message } from '../types';
import { PaperAirplaneIcon, PencilIcon, CheckIcon, XMarkIcon, TrashIcon } from './Icons';
import { requestNotificationPermission } from '../services/webPushService';

const Chat: React.FC = () => {
    const context = useContext(AppContext);
    const { currentUser, familyCircle } = context || {};
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [chatName, setChatName] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!familyCircle || !currentUser) return;

        setChatName(familyCircle.chatName || 'Family Chat');

        // Request notification permission when entering chat
        requestNotificationPermission(currentUser.id);

        // Mark chat as read
        markChatAsRead(currentUser.id, familyCircle.id);

        const unsubscribe = onMessagesUpdate(familyCircle.id, (updatedMessages) => {
            setMessages(updatedMessages);
            // Also mark as read when new messages arrive if we are in the chat view
            if (currentUser.familyCircleId) {
                markChatAsRead(currentUser.id, currentUser.familyCircleId);
            }
        });

        return () => unsubscribe();
    }, [familyCircle, currentUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !familyCircle) return;

        const text = newMessage.trim();
        setNewMessage('');

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const tempMessage: Message = {
            id: tempId,
            familyCircleId: familyCircle.id,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatarUrl: currentUser.avatarUrl,
            text: text,
            type: 'text',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, tempMessage]);

        try {
            await sendMessage(familyCircle.id, currentUser, text);
        } catch (error) {
            console.error("Failed to send message:", error);
            // Revert optimistic update on failure
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setNewMessage(text); // Restore text
            alert("Failed to send message. Please try again.");
        }
    };

    const handleRenameChat = async () => {
        if (!chatName.trim() || !currentUser || !familyCircle) return;

        if (chatName !== familyCircle.chatName) {
            await updateFamilyCircleChatName(familyCircle.id, currentUser, chatName);
        }
        setIsRenaming(false);
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (window.confirm('Are you sure you want to delete this message?')) {
            await deleteMessage(messageId);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!currentUser || !familyCircle) return null;

    return (
        <div className="flex flex-col h-[calc(100vh-180px)]">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm rounded-t-lg border-b border-gray-200 dark:border-gray-700">
                {isRenaming ? (
                    <div className="flex items-center gap-2 flex-1">
                        <input
                            type="text"
                            value={chatName}
                            onChange={(e) => setChatName(e.target.value)}
                            className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:text-white"
                            autoFocus
                        />
                        <button onClick={handleRenameChat} className="text-green-500 hover:text-green-600">
                            <CheckIcon className="w-6 h-6" />
                        </button>
                        <button onClick={() => { setIsRenaming(false); setChatName(familyCircle.chatName || 'Family Chat'); }} className="text-red-500 hover:text-red-600">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-brand-text-primary dark:text-gray-100">
                            {familyCircle.chatName || 'Family Chat'}
                        </h2>
                        <button onClick={() => setIsRenaming(true)} className="text-gray-400 hover:text-brand-blue transition-colors">
                            <PencilIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-background dark:bg-gray-900">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.senderId === currentUser.id;
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId || messages[index - 1].type === 'system');

                    if (msg.type === 'system') {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full">
                                    {msg.senderName} {msg.text}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 group`}>
                            {!isMe && (
                                <div className="w-8 h-8 flex-shrink-0">
                                    {showAvatar ? (
                                        <img src={msg.senderAvatarUrl} alt={msg.senderName} className="w-8 h-8 rounded-full object-cover" />
                                    ) : <div className="w-8" />}
                                </div>
                            )}

                            {isMe && (
                                <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                                    title="Delete message"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}

                            <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${isMe
                                ? 'bg-brand-blue text-white rounded-br-none'
                                : 'bg-white dark:bg-gray-800 text-brand-text-primary dark:text-gray-100 rounded-bl-none'
                                }`}>
                                {!isMe && showAvatar && (
                                    <p className="text-xs font-bold text-brand-blue mb-1">{msg.senderName}</p>
                                )}
                                <p className="break-words">{msg.text}</p>
                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {formatTime(msg.timestamp)}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-blue bg-gray-50 dark:bg-gray-700 text-brand-text-primary dark:text-white"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-brand-blue text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                    <PaperAirplaneIcon className="w-6 h-6" />
                </button>
            </form>
        </div>
    );
};

export default Chat;
