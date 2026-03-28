import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api, mockDB } from '../../services/mockApi';
import { Game, Ticket, User, Prize, TicketRequest, Payment } from '../../types';
import { LiveDisplay } from '../common/LiveDisplay';
import { TambolaBoard } from '../common/TambolaBoard';
import { TimeControlBar } from '../common/TimeControlBar';
import { DividendsList } from '../common/DividendsList';
import { AnnouncementDisplay } from '../common/AnnouncementDisplay';
import UpcomingGameCountdown from '../common/UpcomingGameCountdown';
import { AgentTicketBooking } from './AgentTicketBooking';
import { MyTicketsView } from '../admin/MyTicketsView';
import { TicketRequests } from '../admin/TicketRequests';
import { WinnerList } from '../common/WinnerList';
import { WinnerPopup } from '../common/WinnerPopup';
import { useSound } from '../../contexts/SoundContext';
import { useSpeech } from '../../contexts/SpeechContext';
import { DashboardTabs } from '../common/DashboardTabs';
import { AgentAnalytics } from './AgentAnalytics';
import { CommunityLinks } from '../common/CommunityLinks';
import { rhymes } from '../../constants';
// FIX: Corrected the casing of the import for 'SearchTicket' to resolve a module resolution error.
import { SearchTicket } from '../common/SearchTicket';
import { DraggableModal } from '../common/DraggableModal';
import { LiveChat } from '../common/LiveChat';
import { Leaderboard } from '../admin/Leaderboard';
import { Modal } from '../common/Modal';
import { announcementState } from '../../services/announcementState';
import { useGamePresence } from '../../hooks/useGamePresence';
import { isUsingMockData } from '../../services/mockApi';

interface AgentDashboardProps {
    games: Game[];
    tickets: Ticket[];
    ticketRequests: TicketRequest[];
    payments: Payment[];
    onTicketUpdate: () => void;
    dbUsers: User[];
    page: string;
    onNavigate: (page: string) => void;
    settings: any;
}

interface AvailableGamesListModalProps {
    isOpen: boolean;
    onClose: () => void;
    games: Game[];
    onSelectGame: (gameId: string) => void;
}

const AvailableGamesListModal: React.FC<AvailableGamesListModalProps> = ({ isOpen, onClose, games, onSelectGame }) => {
    const formatDateTime = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return '';
        const dateTimeString = timeStr.includes('M') ? `${dateStr} ${timeStr}` : `${dateStr}T${timeStr}`;
        const dateObj = new Date(dateTimeString);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';

        return dateObj.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Available Games">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {(games || []).length > 0 ? (games || []).map(game => (
                    <div key={game._id} className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors">
                        <div>
                            <p className="font-semibold text-gray-100">{game.title}</p>
                            <p className="text-xs text-gray-400">{formatDateTime(game.date, game.time)}</p>
                        </div>
                        <button 
                            onClick={() => onSelectGame(game._id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors"
                        >
                            View Tickets
                        </button>
                    </div>
                )) : (
                    <p className="text-gray-400 text-center py-4">No available games at the moment.</p>
                )}
            </div>
        </Modal>
    );
};

interface Reaction {
    id: number;
    emoji: string;
    x: number;
    y: number;
}

interface PresenceUser {
    user_id: string;
    name: string;
    photo?: string;
}

const agentTabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'all_tickets', label: 'All Tickets' },
    { key: 'my_tickets', label: 'My Tickets' },
];

const AgentQuickActions: React.FC<{
    onViewChange: (view: string) => void;
    hasPendingRequests: boolean;
    onAvailableGameClick: () => void;
}> = ({ onViewChange, hasPendingRequests, onAvailableGameClick }) => {
    
    const actions = [
        { key: 'winners', title: 'Winners', icon: 'M16 18.5v-5.5a4.5 4.5 0 00-9 0v5.5m-1.5 0V13a6 6 0 0112 0v5.5m-6-16v1.5m0 0a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-4.5 0v-1.5A2.25 2.25 0 0112 2.5zM9 13.5a3 3 0 116 0 3 3 0 016 0z', action: () => onViewChange('winners'), color: 'text-amber-400' },
        { key: 'my_analysis', title: 'My Analysis', icon: 'M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM10.5 1.5V10.5L18 18', action: () => onViewChange('my_analysis'), color: 'text-teal-400' },
        { key: 'ticket_requests', title: 'Ticket Requests', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', action: () => onViewChange('ticket_requests'), color: 'text-yellow-400' },
        { key: 'community', title: 'Community', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.14-4.244a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243zm-2.121 9.435A9.094 9.094 0 0112 18c2.828 0 5.378-.888 7.47-2.372A3 3 0 0018 15.045V12H6v3.045A3 3 0 007.879 18.375z', action: () => onViewChange('community'), color: 'text-blue-400' },
        { key: 'leaderboard', title: 'Leaderboard', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z', action: () => onViewChange('leaderboard'), color: 'text-red-400' },
        { key: 'available_game', title: 'Available Game', icon: 'M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h5.25m-5.25 0h5.25m-5.25 0h5.25M3 4.5h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H3a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 013 4.5z', action: onAvailableGameClick, color: 'text-green-400' },
    ];

    return (
        <div className="p-2">
            <h2 className="text-md font-bold text-gray-200 mb-2 px-1">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2">
                {actions.map(action => {
                    const showDot = action.key === 'ticket_requests' && hasPendingRequests;
                    return (
                        <button 
                            key={action.key}
                            onClick={action.action} 
                            className={'relative bg-slate-700/70 hover:bg-slate-600/70 p-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center justify-center aspect-w-1 aspect-h-1'}
                        >
                            {showDot && (
                                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-1 ring-slate-700/70" />
                            )}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 mb-1 ${action.color}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                            </svg>
                            <h3 className="text-xs font-semibold text-center text-gray-200">{action.title}</h3>
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

const CalledNumbersDisplay: React.FC<{ calledNumbers: number[] }> = ({ calledNumbers }) => {
    if ((calledNumbers || []).length === 0) {
        return null;
    }

    return (
        <div className="mt-4 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-4 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-center text-gray-200 mb-3">
                Called Numbers ({(calledNumbers || []).length})
            </h3>
            <div className="flex flex-wrap justify-center gap-2 p-1 bg-black/20 rounded-lg">
                {calledNumbers.slice().reverse().map((num, index) => (
                    <div 
                        key={`${num}-${index}`}
                        className="w-9 h-9 flex items-center justify-center bg-slate-700 text-gray-200 font-bold text-sm rounded-md shadow-sm"
                    >
                        {num}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ games, tickets, ticketRequests, payments, onTicketUpdate, dbUsers, page, onNavigate, settings }) => {
    const { user } = useAuth();
    const { playSound } = useSound();
    const { speak } = useSpeech();
    const { ongoingGame, nextUpcomingGame } = useMemo(() => {
        const currentOngoing = games.find(g => g.status === 'ongoing');
        
        let gameForDisplay: Game | null = null;
        let gameForTimer: Game | null = null;
    
        if (currentOngoing) {
            gameForDisplay = currentOngoing;
        } else {
            const upcomingGames = games
                .filter(g => g.status === 'upcoming')
                .sort((a, b) => {
                    const aDateTime = new Date(`${a.date} ${a.time}`).getTime();
                    const bDateTime = new Date(`${b.date} ${b.time}`).getTime();
                    return aDateTime - bDateTime;
                });
            const nextGame = upcomingGames[0] || null;

            if (nextGame) {
                const nextGameTime = new Date(`${nextGame.date} ${nextGame.time}`).getTime();
                const now = Date.now();
                const twentyFourHours = 24 * 60 * 60 * 1000;
                
                if (nextGameTime > now && nextGameTime - now < twentyFourHours) {
                    gameForTimer = nextGame;
                }
                gameForDisplay = nextGame;
            } else {
                const completedGames = games
                    .filter(g => g.status === 'completed')
                    .sort((a, b) => {
                        const aDate = new Date(`${a.date} ${a.time}`);
                        const bDate = new Date(`${b.date} ${b.time}`);
                        return bDate.getTime() - aDate.getTime();
                    });
                gameForDisplay = completedGames[0] || null;
            }
        }
        return { ongoingGame: gameForDisplay, nextUpcomingGame: gameForTimer };
    }, [games]);

    const [announcement, setAnnouncement] = useState(settings.announcement);
    const [lastCalled, setLastCalled] = useState<number | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [latestWinner, setLatestWinner] = useState<{ playerName: string; prizeName: string; } | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [timerTotalDuration, setTimerTotalDuration] = useState(settings.callDelay);
    const prevCycleEndsAt = useRef(0);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [showAvailableGames, setShowAvailableGames] = useState(false);
    const prevGamesRef = useRef<Game[]>([]);
    const prevOngoingGameRefForNumbers = useRef<Game | null>(null);
    
    const { onlineUsers, broadcastTypingUsers, sendTypingStatus } = useGamePresence(ongoingGame?._id, ongoingGame?.status, user);
    const isCurrentlyTypingRef = useRef(false);
    const typingTimeoutRef = useRef<number | null>(null);

    const handleSendMessage = useCallback((message: string) => {
        if (!user || !ongoingGame) return;
        api.player.sendChatMessage({
            gameId: ongoingGame._id,
            senderId: user._id,
            senderName: user.name,
            message,
        });
    }, [user, ongoingGame]);

    const handleTyping = useCallback(() => {
        if (!user) return;
        if (!isCurrentlyTypingRef.current) {
            isCurrentlyTypingRef.current = true;
            sendTypingStatus(true);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
            isCurrentlyTypingRef.current = false;
            sendTypingStatus(false);
        }, 2000);
    }, [user, sendTypingStatus]);

    const handleEmoji = (emoji: string) => {
        const newReaction: Reaction = {
            id: Date.now(),
            emoji,
            x: Math.random() * 80 + 10,
            y: Math.random() * 20 + 80,
        };
        setReactions(prev => [...prev, newReaction]);
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== newReaction.id));
        }, 3000);
    };

    const hasPendingRequests = useMemo(() => {
        if (!user) return false;
        return ticketRequests.some(r => r.agentId === user._id && r.status === 'pending');
    }, [ticketRequests, user]);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnnouncement(prev => {
                if (settings.announcement?.id !== prev?.id) {
                    return settings.announcement;
                }
                return prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    
    // This effect handles ALL spoken announcements (winners, game over, etc.)
    useEffect(() => {
        const prevGames = prevGamesRef.current;
        if (!prevGames) {
            prevGamesRef.current = games;
            return;
        }

        games.forEach(currentGame => {
            const prevGame = prevGames.find(p => p._id === currentGame._id);
            if (!prevGame || prevGame.status === 'completed') {
                return;
            }

            const prevAnnouncements = prevGame.announcements || [];
            const currentAnnouncements = currentGame.announcements || [];

            if ((currentAnnouncements || []).length > (prevAnnouncements || []).length) {
                const latestTimestamp = Math.max(0, ...currentAnnouncements.map(a => a.timestamp));
                
                if (latestTimestamp > announcementState.lastWinnerAnnouncementTimestamp) {
                    const prevTimestamps = new Set(prevAnnouncements.map(a => a.timestamp));
                    const newMessages = currentAnnouncements.filter(a => !prevTimestamps.has(a.timestamp)).map(a => a.text);
                    
                    if ((newMessages || []).length > 0) {
                        const fullMessage = newMessages.join(' ');
                        const lastWinnerMessage = [...newMessages].reverse().find(msg => msg.startsWith('Congratulations!'));

                        if (!isMuted) {
                            const lastCalledNumber = (currentGame.calledNumbers || []).length > 0 ? currentGame.calledNumbers[(currentGame.calledNumbers || []).length - 1] : null;
                            
                            let finalMessage = fullMessage;
                            if (lastCalledNumber && fullMessage.startsWith('Congratulations')) {
                                const numberText = (settings.useRhymes && rhymes[lastCalledNumber]) 
                                    ? rhymes[lastCalledNumber] 
                                    : `Number ${lastCalledNumber}`;
                                finalMessage = `${numberText}. ${fullMessage}`;
                            }
                            const onEndCallback = lastWinnerMessage ? () => setLatestWinner(null) : undefined;
                            speak(finalMessage, { onEnd: onEndCallback });
                        }
                        
                        if (lastWinnerMessage) {
                            const match = lastWinnerMessage.match(/Congratulations! (.*) (has|have) won (.*)!/);
                            if (match) {
                                setLatestWinner(prev => {
                                    const next = { playerName: match[1], prizeName: match[3] };
                                    return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
                                });
                            }
                        }
                    }
                    announcementState.lastWinnerAnnouncementTimestamp = latestTimestamp;
                }
            }
        });

        prevGamesRef.current = games;
    }, [games, isMuted, speak]);

    // This effect ONLY handles number announcements for the ONGOING game.
    useEffect(() => {
        if (!ongoingGame || ongoingGame.status !== 'ongoing' || isMuted) {
            prevOngoingGameRefForNumbers.current = null;
            return;
        }

        const prevGame = prevOngoingGameRefForNumbers.current;
        prevOngoingGameRefForNumbers.current = ongoingGame;

        if (!prevGame) {
            return; // Initial render or game switch, don't announce.
        }
        
        const hasWinnerAnnouncementThisTurn = (ongoingGame.announcements || []).length > 0;
        
        const newLastCalled = (ongoingGame.calledNumbers || []).length > 0
            ? ongoingGame.calledNumbers[(ongoingGame.calledNumbers || []).length - 1]
            : null;
    
        const prevLastCalled = (prevGame.calledNumbers || []).length > 0
            ? prevGame.calledNumbers[(prevGame.calledNumbers || []).length - 1]
            : null;

        if (newLastCalled !== null && newLastCalled !== prevLastCalled) {
            if (!hasWinnerAnnouncementThisTurn) {
                playSound('numberCall', { number: newLastCalled, isRhyme: settings.useRhymes });
            }
        }
    }, [ongoingGame, isMuted, playSound, settings.useRhymes]);

    useEffect(() => {
        if (ongoingGame) {
            const newLastCalled = (ongoingGame.calledNumbers || []).length > 0
                ? ongoingGame.calledNumbers[(ongoingGame.calledNumbers || []).length - 1]
                : null;
            setLastCalled(prev => prev === newLastCalled ? prev : newLastCalled);
        } else {
            setLastCalled(prev => prev === null ? prev : null);
        }
    }, [ongoingGame?.calledNumbers]);

     useEffect(() => {
        let intervalId: ReturnType<typeof setInterval> | null = null;
        if (ongoingGame?.cycleEndsAt && ongoingGame.isAutoCalling) {
            const update = () => {
                const remaining = Math.max(0, (ongoingGame.cycleEndsAt! - Date.now()) / 1000);
                setCountdown(remaining);
            };
            update();
            intervalId = setInterval(update, 100);
        } else {
            setCountdown(0);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [ongoingGame?.cycleEndsAt, ongoingGame?.isAutoCalling]);

    useEffect(() => {
        if (ongoingGame?.isAutoCalling && ongoingGame.cycleEndsAt && ongoingGame.cycleEndsAt !== prevCycleEndsAt.current) {
            const newDuration = (ongoingGame.cycleEndsAt - Date.now()) / 1000;
            setTimerTotalDuration(Math.max(0, newDuration));
            prevCycleEndsAt.current = ongoingGame.cycleEndsAt;
        } else if (!ongoingGame?.isAutoCalling) {
            setTimerTotalDuration(settings.callDelay);
            prevCycleEndsAt.current = 0;
        }
    }, [ongoingGame?.isAutoCalling, ongoingGame?.cycleEndsAt, settings.callDelay]);

    if (!user) return null;

    const mainTabViews = ['dashboard', 'all_tickets'];
    const isMainTabView = mainTabViews.includes(page);

    const availableGamesForBooking = games.filter(g => ['upcoming', 'ongoing'].includes(g.status));

    const renderContent = () => {
        switch(page) {
            case 'winners':
                return (
                    <div className="bg-slate-800/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-slate-700">
                        <h1 className="text-2xl font-bold text-gray-100 mb-4">Winners</h1>
                        {ongoingGame ? (
                            <WinnerList prizes={ongoingGame.prizes || []} game={ongoingGame} />
                        ) : (
                            <p className="text-gray-400 text-center">No ongoing game to show winners for.</p>
                        )}
                    </div>
                );
            case 'my_analysis':
                return <AgentAnalytics onBack={() => onNavigate('dashboard')} games={games} tickets={tickets} payments={payments} />;
            case 'ticket_requests':
                return <TicketRequests games={games} tickets={tickets} user={user} requests={ticketRequests} onUpdate={onTicketUpdate} />;
            case 'community':
                return <CommunityLinks />;
            case 'all_tickets':
                return <AgentTicketBooking games={games} tickets={tickets} onTicketUpdate={onTicketUpdate} dbUsers={dbUsers} />;
            case 'my_tickets':
                return <MyTicketsView games={games} tickets={tickets} user={user} onUnbook={() => {}} />;
            case 'leaderboard':
                return <Leaderboard onBack={() => onNavigate('dashboard')} showBackButton={false} />;
            case 'dashboard':
            default:
                return (
                    <>
                         <div className="bg-slate-800/60 backdrop-blur-md rounded-xl shadow-lg mb-2 border border-slate-700">
                             <AgentQuickActions 
                                onViewChange={onNavigate} 
                                hasPendingRequests={hasPendingRequests}
                                onAvailableGameClick={() => setShowAvailableGames(true)}
                            />
                        </div>

                        <UpcomingGameCountdown games={games} />
                        <AnnouncementDisplay announcement={announcement} user={user} />

                        <div className="mt-2 bg-slate-800/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h1 className="text-2xl font-bold text-gray-100">Welcome, {user?.name}!</h1>
                            </div>
                            <LiveDisplay 
                                lastCalled={lastCalled} 
                                showControls={false}
                                isMuted={isMuted}
                                onToggleMute={() => setIsMuted(!isMuted)}
                                timerDuration={timerTotalDuration}
                                timerRemaining={countdown}
                                onChatClick={ongoingGame ? () => setIsChatOpen(true) : undefined}
                            />
                            {ongoingGame && (
                                <TimeControlBar 
                                    cycleStartedAt={ongoingGame.cycleStartedAt} 
                                    cycleEndsAt={ongoingGame.cycleEndsAt} 
                                    isAutoCalling={ongoingGame.isAutoCalling} 
                                />
                            )}
                            <TambolaBoard calledNumbers={ongoingGame?.calledNumbers || []} lastCalled={lastCalled} />
                            <CalledNumbersDisplay calledNumbers={ongoingGame?.calledNumbers || []} />
                            <SearchTicket games={games} tickets={tickets} activeGame={ongoingGame} />
                            <DividendsList prizes={ongoingGame?.prizes || []} />
                        </div>
                    </>
                );
        }
    };
    
    return (
        <>
            <div className="p-2">
                {isMainTabView && (
                    <div className="bg-slate-800/60 backdrop-blur-md rounded-xl shadow-lg mb-2 border border-slate-700">
                        <DashboardTabs tabs={agentTabs} activeTab={page} setActiveTab={onNavigate} className="bg-black/20" />
                    </div>
                )}

                {renderContent()}
            </div>

            <WinnerPopup 
                isOpen={!!latestWinner}
                winnerName={latestWinner?.playerName || ''} 
                prizeName={latestWinner?.prizeName || ''} 
                onClose={() => setLatestWinner(null)} 
            />

            {ongoingGame && user && (
                <DraggableModal
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    title={`${(onlineUsers || []).length} Player${(onlineUsers || []).length === 1 ? '' : 's'} Online`}
                >
                    <style>{`
                        @keyframes float-up { to { transform: translateY(-150px); opacity: 0; } }
                        .reaction-emoji { animation: float-up 3s ease-out forwards; }
                    `}</style>
                    <div className="relative h-full w-full">
                         <LiveChat
                            gameId={ongoingGame._id}
                            messages={ongoingGame.chatMessages}
                            currentUser={user}
                            typingUsers={broadcastTypingUsers}
                            onSendMessage={handleSendMessage}
                            onTyping={handleTyping}
                            onEmoji={handleEmoji}
                        />
                         <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                            {reactions.map(r => (
                                <span key={r.id} className="reaction-emoji absolute text-4xl" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
                                    {r.emoji}
                                </span>
                            ))}
                        </div>
                    </div>
                </DraggableModal>
            )}

            <AvailableGamesListModal 
                isOpen={showAvailableGames}
                onClose={() => setShowAvailableGames(false)}
                games={availableGamesForBooking}
                onSelectGame={(gameId) => {
                    onNavigate('all_tickets');
                    setShowAvailableGames(false);
                }}
            />
        </>
    );
};