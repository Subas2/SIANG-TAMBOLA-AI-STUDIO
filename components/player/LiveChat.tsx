import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, User } from '../../types';

interface LiveChatProps {
    gameId: string;
    messages: ChatMessage[];
    currentUser: User;
    typingUsers: { senderId: string; senderName: string; }[];
    onSendMessage: (message: string) => void;
    onTyping: () => void;
    onEmoji: (emoji: string) => void;
}

const Avatar: React.FC<{ user: { name: string; photo?: string } }> = ({ user }) => {
    const getInitials = (name: string) => {
        const names = name.split(' ');
        if ((names || []).length > 1) {
            return `${names[0][0]}${names[(names || []).length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const colors = ['bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-teal-500'];
    const color = colors[user.name.charCodeAt(0) % (colors || []).length];

    return (
        <div className="w-8 h-8 rounded-full flex-shrink-0">
            {user.photo ? (
                <img src={user.photo} alt={user.name} className="w-full h-full object-cover rounded-full" />
            ) : (
                <div className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold text-xs ${color}`}>
                    {getInitials(user.name)}
                </div>
            )}
        </div>
    );
};

const TypingIndicator: React.FC<{ typers: { senderName: string }[] }> = ({ typers }) => {
    if ((typers || []).length === 0) {
        return <div className="h-6" />;
    }

    const names = typers.map(t => t.senderName).join(', ');
    const text = `${names} ${(typers || []).length > 1 ? 'are' : 'is'} typing...`;

    return (
        <div className="h-6 px-2 flex items-center">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 italic">
                <div className="flex gap-1 items-end">
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                </div>
                <span>{text}</span>
            </div>
        </div>
    );
};


export const LiveChat: React.FC<LiveChatProps> = ({ gameId, messages, currentUser, typingUsers, onSendMessage, onTyping, onEmoji }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    const emojis = ['🎉', '🤞', '🔥', '😂', '😢'];
    const typers = typingUsers.filter(u => u.senderId !== currentUser._id);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-grow overflow-y-auto pr-2 pl-3 py-3 space-y-3">
                {messages.map((msg, index) => {
                    const isCurrentUser = msg.senderId === currentUser._id;
                    const isSystemMessage = msg.senderId === 'system' || msg.senderName === 'Game Host';
                    
                    if (isSystemMessage) {
                        return (
                             <div key={`${msg.timestamp}-${index}`} className="text-center my-2">
                                <span className="bg-slate-700 text-purple-300 text-xs font-semibold px-2 py-1 rounded-full">{msg.message}</span>
                            </div>
                        )
                    }

                    return (
                        <div key={`${msg.senderId}-${msg.timestamp}-${index}`} className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            {!isCurrentUser && <Avatar user={{ name: msg.senderName, photo: msg.senderAvatar }} />}
                             <div className="group relative">
                                <div className={`p-2 rounded-lg max-w-xs ${isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200'}`}>
                                    {!isCurrentUser && <p className="text-xs font-bold text-purple-300">{msg.senderName}</p>}
                                    <p className="text-sm break-words">{msg.message}</p>
                                </div>
                                <div className={`absolute bottom-0 text-[10px] text-gray-400 px-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isCurrentUser ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <TypingIndicator typers={typers} />
            <div className="flex-shrink-0 p-3 border-t border-slate-700/50">
                <div className="flex justify-around mb-2">
                    {emojis.map(emoji => (
                        <button key={emoji} onClick={() => onEmoji(emoji)} className="text-2xl transform hover:scale-125 transition-transform">
                            {emoji}
                        </button>
                    ))}
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            onTyping();
                        }}
                        placeholder="Type a message..."
                        className="flex-grow p-2 bg-slate-700 border border-slate-600 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};