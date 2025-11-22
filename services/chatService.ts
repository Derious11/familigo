import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    addDoc,
    serverTimestamp,
    onSnapshot,
    orderBy,
    deleteDoc,
    increment,
    Timestamp
} from "firebase/firestore";
import { db } from '../firebaseConfig';
import { User, Message } from '../types';

export const sendMessage = async (familyCircleId: string, user: User, text: string, type: 'text' | 'system' = 'text') => {
    const messagesRef = collection(db, 'messages');
    await addDoc(messagesRef, {
        familyCircleId,
        senderId: user.id,
        senderName: user.name,
        senderAvatarUrl: user.avatarUrl,
        text,
        type,
        timestamp: serverTimestamp(),
    });

    // Atomically increment the message count on the family circle
    const circleRef = doc(db, 'familyCircles', familyCircleId);
    await updateDoc(circleRef, {
        messageCount: increment(1)
    });
};

export const onMessagesUpdate = (familyCircleId: string, callback: (messages: Message[]) => void): (() => void) => {
    const q = query(
        collection(db, 'messages'),
        where('familyCircleId', '==', familyCircleId),
        orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp as Timestamp | null;
            return {
                id: doc.id,
                ...data,
                timestamp: timestamp ? timestamp.toDate() : new Date(),
            } as Message;
        });
        callback(messages);
    });
};

export const updateFamilyCircleChatName = async (familyCircleId: string, user: User, newName: string) => {
    const circleRef = doc(db, 'familyCircles', familyCircleId);
    await updateDoc(circleRef, { chatName: newName });

    // Send a system message about the rename
    await sendMessage(familyCircleId, user, `renamed the chat to "${newName}"`, 'system');
};

export const deleteMessage = async (messageId: string) => {
    const messageRef = doc(db, 'messages', messageId);
    await deleteDoc(messageRef);
};

export const markChatAsRead = async (userId: string, familyCircleId: string) => {
    const circleRef = doc(db, 'familyCircles', familyCircleId);
    const circleDoc = await getDoc(circleRef);

    if (circleDoc.exists()) {
        const currentMessageCount = circleDoc.data().messageCount || 0;
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            lastReadMessageCount: currentMessageCount
        });
    }
};
