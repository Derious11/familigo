export interface Message {
    id: string;
    familyCircleId: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Date;
    type: 'text' | 'system';
}
