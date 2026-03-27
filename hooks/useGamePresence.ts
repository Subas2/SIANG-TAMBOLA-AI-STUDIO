import { useState } from 'react';
import { User } from '../types';

interface PresenceUser {
    user_id: string;
    name: string;
    photo?: string;
}

interface TypingUser {
    senderId: string;
    senderName: string;
}

export const useGamePresence = (gameId: string | undefined, gameStatus: string | undefined, user: User | null) => {
    const [onlineUsers] = useState<PresenceUser[]>([]);
    const [broadcastTypingUsers] = useState<TypingUser[]>([]);

    const sendTypingStatus = (isTyping: boolean) => {
        // Presence not implemented in Firebase yet
    };

    return { onlineUsers, broadcastTypingUsers, sendTypingStatus };
};
