import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Game, Ticket } from '../../types';
import { api, mockDB } from '../../services/mockApi';
import { useToast } from '../../contexts/ToastContext';
import { GameActionsMenu } from './GameActionsMenu';

interface ManageGamesProps {
    tickets: Ticket[];
    games: Game[];
    onViewGame: (game: Game) => void;
    onEditGame: (game: Game) => void;
    onDeleteRequest: (gameId: string) => void;
    onTicketsGenerated: () => void;
    onShareRequest: (game: Game) => void;
}

const formatDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return { date: '', time: '' };
    const dateTimeString = timeStr.includes('M') ? `${dateStr} ${timeStr}` : `${dateStr}T${timeStr}`;
    const dateObj = new Date(dateTimeString);
    if (isNaN(dateObj.getTime())) return { date: 'Invalid Date', time: '' };

    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return { date: formattedDate, time: formattedTime };
};


const CountdownTimer: React.FC<{ targetDate: string, targetTime: string }> = ({ targetDate, targetTime }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const dateTimeString = targetTime.includes('M') ? `${targetDate} ${targetTime}` : `${targetDate}T${targetTime}`;
            const target = new Date(dateTimeString).getTime();
            const now = new Date().getTime();
            const difference = target - now;

            if (difference <= 0) {
                setTimeLeft('Starting soon...');
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            let timeStr = '';
            if (days > 0) timeStr += `${days}d `;
            if (hours > 0 || days > 0) timeStr += `${hours}h `;
            timeStr += `${minutes}m ${seconds}s`;
            setTimeLeft(timeStr);
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [targetDate, targetTime]);

    return (
        <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs bg-amber-400/10 px-2 py-1 rounded-md border border-amber-400/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Starts in: {timeLeft}</span>
        </div>
    );
};

export const ManageGames: React.FC<ManageGamesProps> = React.memo(({ games, tickets, onViewGame, onEditGame, onDeleteRequest, onTicketsGenerated, onShareRequest }) => {
    const toast = useToast();
    const [loadingTicketGameId, setLoadingTicketGameId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const [activeTab, setActiveTab] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming');

    const filteredGames = useMemo(() => {
        if (activeTab === 'upcoming') {
            return games
                .filter(g => g.status === 'upcoming')
                .sort((a, b) => {
                    const aDateTime = new Date(`${a.date} ${a.time}`).getTime();
                    const bDateTime = new Date(`${b.date} ${b.time}`).getTime();
                    return aDateTime - bDateTime;
                });
        } else if (activeTab === 'ongoing') {
            const ongoing = games.filter(g => g.status === 'ongoing');
            const upcoming = games
                .filter(g => g.status === 'upcoming')
                .sort((a, b) => {
                    const aDateTime = new Date(`${a.date} ${a.time}`).getTime();
                    const bDateTime = new Date(`${b.date} ${b.time}`).getTime();
                    return aDateTime - bDateTime;
                });
            
            const nearestUpcoming = upcoming.length > 0 ? [upcoming[0]] : [];
            
            return [...ongoing, ...nearestUpcoming].sort((a, b) => {
                if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
                if (a.status !== 'ongoing' && b.status === 'ongoing') return 1;
                const aDateTime = new Date(`${a.date} ${a.time}`).getTime();
                const bDateTime = new Date(`${b.date} ${b.time}`).getTime();
                return aDateTime - bDateTime;
            });
        } else { // 'completed'
            return games
                .filter(g => g.status === 'completed')
                .sort((a, b) => {
                    const aDateTime = new Date(`${a.date} ${a.time}`).getTime();
                    const bDateTime = new Date(`${b.date} ${b.time}`).getTime();
                    return bDateTime - aDateTime;
                });
        }
    }, [games, activeTab]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId]!.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        const handleScroll = () => {
            if (openMenuId) {
                setOpenMenuId(null);
            }
        };

        if (openMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [openMenuId]);

    const handleGenerateTickets = (gameId: string) => {
        setLoadingTicketGameId(gameId);
        setTimeout(async () => {
            try {
                await api.admin.generateTicketsForGame({ gameId });
                toast.show('Tickets generated successfully!');
                onTicketsGenerated();
            } catch (error: any) {
                toast.show(error.message || 'Failed to generate tickets.', { type: 'error' });
            } finally {
                setLoadingTicketGameId(null);
            }
        }, 500);
    };

    const handleToggleMenu = (gameId: string) => {
        setOpenMenuId(prevId => (prevId === gameId ? null : gameId));
    };
    
    const statusClasses: { [key: string]: string } = {
        upcoming: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        ongoing: 'bg-green-500/20 text-green-300 border border-green-500/30 animate-pulse',
        completed: 'bg-slate-600/50 text-slate-400 border border-slate-600/60',
    };

    return (
        <div>
            <div className="flex bg-slate-900/50 p-1 rounded-lg mb-4">
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'upcoming' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-slate-700'}`}
                >
                    Upcoming
                </button>
                <button
                    onClick={() => setActiveTab('ongoing')}
                    className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'ongoing' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-slate-700'}`}
                >
                    Ongoing
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'completed' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-slate-700'}`}
                >
                    Completed
                </button>
            </div>

            {(filteredGames || []).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredGames.map(game => {
                        const { date, time } = formatDateTime(game.date, game.time);
                        const displayedPrizes = (game.prizes || []).slice(0, 2);
                        const remainingPrizes = (game.prizes || []).length - (displayedPrizes || []).length;
                        
                        const bookedCount = (tickets || []).filter(t => t.game === game._id && t.status === 'booked').length;
                        const bookingPercentage = game.ticketLimit > 0 ? (bookedCount / game.ticketLimit) * 100 : 0;

                        return (
                            <div
                                key={game._id}
                                className={`relative bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-xl shadow-lg transition-all duration-300 flex flex-col ${openMenuId === game._id ? 'z-20' : 'z-10'}`}
                            >
                                <div className="absolute top-2 right-2 z-30" onClick={e => e.stopPropagation()} ref={el => { menuRefs.current[game._id] = el; }}>
                                    <GameActionsMenu
                                        game={game}
                                        onViewGame={onViewGame}
                                        onEditGame={onEditGame}
                                        onDeleteRequest={onDeleteRequest}
                                        onShareRequest={() => onShareRequest(game)}
                                        isOpen={openMenuId === game._id}
                                        onToggle={() => handleToggleMenu(game._id)}
                                    />
                                </div>
                                
                                <div
                                    onClick={() => {
                                        if (game.status === 'ongoing') {
                                            onViewGame(game);
                                        } else {
                                            toast.show("Use the menu (⋮) to start or manage this game.", { type: 'info' });
                                        }
                                    }} 
                                    className={`w-full text-left p-4 flex flex-col flex-grow cursor-pointer rounded-xl hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${game.status === 'upcoming' ? 'cursor-default' : ''}`}
                                    aria-label={game.status === 'ongoing' ? `Go to Control Panel for ${game.title}` : `View details for ${game.title}`}
                                >
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-lg text-gray-100 pr-8 truncate">{game.title}</h3>
                                        </div>
                                        
                                        <div className="flex items-center flex-wrap gap-x-2 gap-y-2 mt-2 text-xs">
                                            <span className={`px-2 py-0.5 font-semibold rounded-full capitalize ${statusClasses[game.status]}`}>
                                                {game.status}
                                            </span>
                                            {game.status === 'upcoming' && activeTab === 'ongoing' && (
                                                <CountdownTimer targetDate={game.date} targetTime={game.time} />
                                            )}
                                            <span className={`px-2 py-0.5 font-semibold rounded-full capitalize ${game.isBookingOpen ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                                                Booking {game.isBookingOpen ? 'Open' : 'Closed'}
                                            </span>
                                            <span className="text-gray-400">{date} • {time}</span>
                                            <span className="text-gray-400">|</span>
                                            <span className="text-gray-400">Price: <span className="font-semibold text-amber-300">₹{game.ticketPrice}</span></span>
                                        </div>
                                        
                                        <div className="mt-3 space-y-1">
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>Booking Progress</span>
                                                <span>{bookedCount} / {game.ticketLimit}</span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                                                <div className="bg-gradient-to-r from-green-400 to-teal-500 h-1.5 rounded-full" style={{ width: `${bookingPercentage}%` }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-700/50">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Top Prizes</h4>
                                        {(game.prizes || []).length > 0 ? (
                                            <ul className="space-y-0.5">
                                                {displayedPrizes.map((prize, index) => (
                                                    <li key={`${prize.name}-${index}`} className="flex justify-between text-xs text-gray-300">
                                                        <span className="truncate pr-2">{prize.name}</span>
                                                        <span className="font-semibold flex-shrink-0">₹{prize.value}</span>
                                                    </li>
                                                ))}
                                                {remainingPrizes > 0 && (
                                                    <li className="text-xs text-gray-500 text-center mt-1">+ {remainingPrizes} more</li>
                                                )}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-gray-500 mt-1">No prizes set.</p>
                                        )}
                                    </div>
                                    {game.status === 'upcoming' && (game.tickets || []).length !== game.ticketLimit && (
                                        <div className="mt-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerateTickets(game._id);
                                                }}
                                                disabled={loadingTicketGameId === game._id}
                                                className="w-full flex items-center justify-center gap-2 bg-green-600/80 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                                            >
                                                {loadingTicketGameId === game._id ? (
                                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h5.25m-5.25 0h5.25m-5.25 0h5.25M3 4.5h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H3a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 013 4.5z" /></svg>
                                                )}
                                                <span>{loadingTicketGameId === game._id ? 'Generating...' : ((game.tickets || []).length > 0 ? 'Re-generate Tickets' : 'Generate Tickets')}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                 <p className="text-gray-400 text-center py-8">No {activeTab === 'upcoming' ? 'upcoming' : activeTab === 'ongoing' ? 'ongoing' : 'completed'} games found.</p>
            )}
        </div>
    );
});
