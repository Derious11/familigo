import { doc, getDoc, updateDoc, collection, writeBatch, serverTimestamp, deleteDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { User } from '../types';

export const sendMessage = async (familyCircleId: string, user: User, text: string, type: 'text' | 'system' = 'text') => {
    const senderName = user.name?.trim() || 'Family member';
    if (!text.trim() || text.length > 2000) throw new Error('Messages must contain 1 to 2000 characters.');
    if (senderName.length > 120) throw new Error('Your display name must be 120 characters or fewer to send a message.');
    const messagesRef = collection(db, 'messages');
    const batch = writeBatch(db);
    batch.set(doc(messagesRef), {
        familyCircleId,
        senderId: user.id,
        senderName,
        text,
        type,
        timestamp: serverTimestamp(),
        authoredBy: auth.currentUser?.uid,
    });

    // Atomically increment the message count on the family circle
    const circleRef = doc(db, 'familyCircles', familyCircleId);
    batch.update(circleRef, {
        messageCount: increment(1)
    });
    await batch.commit();
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
