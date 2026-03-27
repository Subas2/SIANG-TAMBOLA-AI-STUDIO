import React from 'react';
import { NextNumberTimer } from './NextNumberTimer';
import { mockDB } from '../../services/mockApi';

interface LiveDisplayProps {
    lastCalled: number | null;
    isAutoCalling?: boolean;
    onToggle?: () => void;
    showControls?: boolean;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onAnnounce?: () => void;
    onChatClick?: () => void;
    timerDuration?: number;
    timerRemaining?: number;
}

export const LiveDisplay: React.FC<LiveDisplayProps> = ({ lastCalled, isAutoCalling, onToggle, showControls = true, isMuted, onToggleMute, onAnnounce, onChatClick, timerDuration, timerRemaining }) => {
    const isChatFeatureEnabled = mockDB.settings.isChatEnabled ?? true;
    
    return (
        <div className="relative flex justify-center items-center h-40 mb-4">
            {showControls && onToggle && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    <button
                        onClick={() => onToggle()}
                        className={`flex items-center gap-1.5 font-bold py-1.5 px-3 rounded-lg shadow-md transition-colors duration-300 text-sm ${
                            isAutoCalling
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                    >
                        {isAutoCalling ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-6-13.5v13.5" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                            </svg>
                        )}
                        <span>{isAutoCalling ? 'Stop' : 'Start'}</span>
                    </button>
                </div>
            )}

            <div className="relative flex flex-col items-center">
                {isChatFeatureEnabled && onChatClick && (
                    <button
                        onClick={() => onChatClick()}
                        className="mb-2 z-20 flex items-center gap-1.5 font-bold py-1.5 px-3 rounded-full shadow-lg transition-all duration-300 text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transform hover:scale-105"
                        aria-label="Open Live Chat"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Live Chat</span>
                    </button>
                )}
                <div className="bg-white rounded-full shadow-lg w-24 h-24 flex flex-col items-center justify-center border-4 border-indigo-500 z-10 animate-live-container-pulse">
                    <p className="text-xs font-bold text-gray-500 -mt-1 uppercase">Live</p>
                    <div key={lastCalled} className="text-4xl font-bold text-indigo-600 animate-scale-in">{lastCalled || '-'}</div>
                </div>
            </div>


            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
                 {typeof timerDuration === 'number' && typeof timerRemaining === 'number' && (
                     <NextNumberTimer duration={timerDuration} remaining={timerRemaining} size={48} strokeWidth={4} />
                 )}
                <div className="flex flex-col gap-3">
                    {onAnnounce && (
                        <button onClick={() => onAnnounce()} className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-500">
                              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.348 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.584 12c0 1.854-1.025 3.45-2.5 4.228V7.772c1.475.778 2.5 2.374 2.5 4.228z" />
                            </svg>
                        </button>
                    )}
                    {onToggleMute && (
                        <button onClick={() => onToggleMute()} className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200">
                            {isMuted ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};