import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Game, Ticket, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { api, mockDB, subscribeToDbChanges } from '../../services/mockApi';
import { TambolaTicket } from '../common/TambolaTicket';
import { BookingFormPopup } from './BookingFormPopup';
import { useToast } from '../../contexts/ToastContext';
import { SheetSelectionPopup } from './SheetSelectionPopup';
import { FloatingCTAButton } from '../common/FloatingCTAButton';
import { AgentBookings } from './AgentBookings';
import { SheetBundle } from '../common/SheetBundle';

interface AgentTicketBookingProps {
    games: Game[];
    tickets: Ticket[];
    onTicketUpdate: () => void;
    onUnbook?: (ticketId: string) => void;
    initialGameId?: string;
    dbUsers: User[];
}

const TICKETS_PER_PAGE = 50;

export const AgentTicketBooking: React.FC<AgentTicketBookingProps> = ({ games, tickets, onTicketUpdate, onUnbook, initialGameId, dbUsers }) => {
    const { user } = useAuth();
    const toast = useToast();
    const [bookingInfo, setBookingInfo] = useState<{ type: 'single', ticket: Ticket, game: Game } | { type: 'multiple', ticketIds: string[], game: Game } | null>(null);
    const [ticketStatusFilter, setTicketStatusFilter] = useState<'available' | 'booked' | 'my_bookings'>('available');
    const [showSheetPopup, setShowSheetPopup] = useState<3 | 6 | 10 | null>(null);
    const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const [trackedTicketIds, setTrackedTicketIds] = useState<string[]>([]);
    const [visiblePhonePlayerIds, setVisiblePhonePlayerIds] = useState<Set<string>>(new Set());
    const [visibleCount, setVisibleCount] = useState(TICKETS_PER_PAGE);

    const handleTogglePhoneVisibility = useCallback((playerId: string) => {
        setVisiblePhonePlayerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(playerId)) {
                newSet.delete(playerId);
            } else {
                newSet.add(playerId);
            }
            return newSet;
        });
    }, []);

    const availableGames = useMemo(() => games.filter(g => ['upcoming', 'ongoing'].includes(g.status)), [games]);
    const [selectedGameId, setSelectedGameId] = useState<string>(initialGameId || availableGames[0]?._id || '');
    
    const isAgentBookingAllowed = user?.role === 'admin' || (user?.role === 'agent' && (user.isBookingAllowed ?? true));
    const selectedGame = availableGames.find(g => g._id === selectedGameId);
    const canBook = isAgentBookingAllowed;

    useEffect(() => {
        // When initialGameId prop changes, update the selected game.
        if (initialGameId && initialGameId !== selectedGameId) {
            setSelectedGameId(initialGameId);
        }
    }, [initialGameId, selectedGameId]);

    useEffect(() => {
        // Fallback logic: if the selected game is no longer available, select the first available one.
        if ((availableGames || []).length > 0 && !(availableGames || []).some(g => g._id === selectedGameId)) {
            setSelectedGameId(availableGames[0]._id);
        } else if ((availableGames || []).length === 0) {
            setSelectedGameId('');
        }
    }, [availableGames, selectedGameId]);

    useEffect(() => {
        setSelectedTicketIds([]);
        setVisibleCount(TICKETS_PER_PAGE);
    }, [selectedGameId, ticketStatusFilter]);
    
    const fetchTrackedTickets = useCallback(async () => {
        if (!user) return;
        const trackedIds = await api.user.getMyTrackedTickets(user._id);
        setTrackedTicketIds(prev => JSON.stringify(prev) === JSON.stringify(trackedIds) ? prev : trackedIds);
    }, [user]);

    useEffect(() => {
        fetchTrackedTickets();
        const interval = setInterval(fetchTrackedTickets, 5000); // Poll for updates
        return () => clearInterval(interval);
    }, [fetchTrackedTickets]);

    const handleToggleMyTickets = async (ticketId: string) => {
        if (!user) return;
        const isTracked = trackedTicketIds.includes(ticketId);
        const originalTrackedIds = [...trackedTicketIds];
        setTrackedTicketIds(prev => isTracked ? prev.filter(id => id !== ticketId) : [...prev, ticketId]);
        try {
            if (isTracked) {
                await api.user.removeFromMyTickets({ userId: user._id, ticketId });
                toast.show('Ticket removed from your list.');
            } else {
                await api.user.addToMyTickets({ userId: user._id, ticketId });
                toast.show('Ticket added to your list for tracking.');
            }
        } catch (error) {
            toast.show('Failed to update tracking.', { type: 'error' });
            setTrackedTicketIds(originalTrackedIds);
        }
    };

    const handleTrackSheet = useCallback(async (ticketIds: string[]) => {
        if (!user) return;
        const isCurrentlyTracked = ticketIds.every(id => trackedTicketIds.includes(id));
        try {
            const apiCalls = ticketIds.map(ticketId => 
                isCurrentlyTracked
                ? api.user.removeFromMyTickets({ userId: user._id, ticketId }) 
                : api.user.addToMyTickets({ userId: user._id, ticketId })
            );
            await Promise.all(apiCalls);
            toast.show(`Sheet successfully ${isCurrentlyTracked ? 'untracked' : 'tracked'}.`);
            fetchTrackedTickets(); // re-fetch immediately
        } catch (error) {
            toast.show(`Failed to update sheet tracking.`, { type: 'error' });
        }
    }, [user, trackedTicketIds, toast, fetchTrackedTickets]);

    const handleTicketSelect = useCallback((ticketId: string) => {
        setSelectedTicketIds(prev => {
            return prev.includes(ticketId) ? prev.filter(id => id !== ticketId) : [...prev, ticketId];
        });
    }, []);

    const handleCloseBooking = useCallback(() => {
        setBookingInfo(null);
    }, []);
    
    const handleConfirmBooking = async (playerName: string, playerNumber: string, agentId?: string) => {
        if (!user || !bookingInfo) return;

        try {
            // New logic: find or create player in the database to get a valid UUID
            const player = await api.user.findOrCreatePlayer(playerName, playerNumber);
            
            const ticketIdsToBook = bookingInfo.type === 'single' ? [bookingInfo.ticket._id] : bookingInfo.ticketIds;

            await api.agent.bookTickets({ ticketIds: ticketIdsToBook, playerId: player._id, agentId: user._id });
            toast.show(`Booked ${(ticketIdsToBook || []).length} ticket(s) for ${playerName}.`);
        } catch (error) {
            toast.show((error as Error).message, { type: 'error' });
        } finally {
            handleCloseBooking();
            setSelectedTicketIds([]);
            onTicketUpdate();
        }
    };
    
     const handleSheetSelection = (ticketIds: string[]) => {
        const game = games.find(g => g._id === tickets.find(t => t._id === ticketIds[0])?.game);
        if (game) {
            setBookingInfo({ type: 'multiple', ticketIds, game });
        }
        setShowSheetPopup(null);
        if ((selectedTicketIds || []).length > 0) setSelectedTicketIds([]);
    };

    const ticketsForSelectedGame = useMemo(() => {
        return tickets.filter(t => t.game === selectedGameId);
    }, [tickets, selectedGameId]);

    const allAvailableTickets = useMemo(() => {
        if (ticketStatusFilter !== 'available') return [];

        return ticketsForSelectedGame.filter(ticket => {
            if (ticket.status !== 'available') return false;
            if (!searchTerm.trim()) return true;
            return String(ticket.serialNumber).includes(searchTerm.trim());
        }).sort((a, b) => a.serialNumber - b.serialNumber);
    }, [ticketsForSelectedGame, searchTerm, ticketStatusFilter]);
    
    const filteredAvailableTickets = useMemo(() => {
        return allAvailableTickets.slice(0, visibleCount);
    }, [allAvailableTickets, visibleCount]);

    const { sheets, individuals } = useMemo(() => {
        if (ticketStatusFilter !== 'booked') {
            return { sheets: {}, individuals: [] };
        }
    
        const ticketsToProcess = ticketsForSelectedGame.filter(t => t.status === 'booked');
    
        const filteredTickets = ticketsToProcess.filter(ticket => {
            if (!searchTerm.trim()) return true;
            const lowerSearch = (searchTerm || '').toLowerCase().trim();
            const player = dbUsers.find(u => u._id === ticket.player);
            return String(ticket.serialNumber).includes(lowerSearch) || (player && (player.name || '').toLowerCase().includes(lowerSearch));
        });
    
        const sheetsMap: { [key: string]: Ticket[] } = {};
        const individualsList: Ticket[] = [];
        for (const ticket of filteredTickets) {
            if (ticket.sheetId) {
                if (!sheetsMap[ticket.sheetId]) sheetsMap[ticket.sheetId] = [];
                sheetsMap[ticket.sheetId].push(ticket);
            } else {
                individualsList.push(ticket);
            }
        }
        Object.values(sheetsMap).forEach(sheet => sheet.sort((a, b) => a.serialNumber - b.serialNumber));
        return { sheets: sheetsMap, individuals: individualsList };
    }, [ticketsForSelectedGame, searchTerm, ticketStatusFilter, dbUsers]);


    const showCTA = (selectedTicketIds || []).length > 0 && ticketStatusFilter === 'available';

    const ticketCounts = useMemo(() => {
        const gameTickets = ticketsForSelectedGame;
        const bookedCount = (gameTickets || []).filter(t => t.status === 'booked').length;

        // "My Bookings" count is role-aware and now scoped to the selected game.
        const myBookingsForGame = gameTickets.filter(t => {
            if (user?.role === 'admin') {
                // Admins see a count of all tickets booked by any agent FOR THIS GAME.
                return t.status === 'booked' && t.bookedByAgent;
            }
            // Agents see a count of only their own bookings FOR THIS GAME.
            return t.status === 'booked' && t.bookedByAgent === user?._id;
        });

        return {
            available: (gameTickets || []).filter(t => t.status === 'available').length,
            booked: bookedCount,
            my_bookings: (myBookingsForGame || []).length,
        };
    }, [ticketsForSelectedGame, user]);

    const availableTicketsContent = useMemo(() => {
        if ((filteredAvailableTickets || []).length > 0) {
            return (
                <div className="mx-auto max-w-screen-xl grid gap-4 justify-items-center [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
                    {filteredAvailableTickets.map(ticket => (
                        <TambolaTicket 
                            key={ticket._id} 
                            ticket={ticket} 
                            calledNumbers={[]}
                            game={selectedGame} 
                            showActions={true} 
                            onBook={canBook ? () => setBookingInfo({ type: 'single', ticket, game: selectedGame! }) : undefined}
                            isSelectable={canBook}
                            isSelected={selectedTicketIds.includes(ticket._id)}
                            onSelect={canBook ? () => handleTicketSelect(ticket._id) : undefined}
                            onAddToMyTickets={() => handleToggleMyTickets(ticket._id)}
                            isTracked={trackedTicketIds.includes(ticket._id)}
                        />
                    ))}
                </div>
            );
        }
        return <p className="text-gray-400 text-center py-8">{searchTerm.trim() ? 'No tickets match your search.' : 'No available tickets for this game.'}</p>;
    }, [filteredAvailableTickets, selectedGame, canBook, selectedTicketIds, handleTicketSelect, searchTerm, bookingInfo, trackedTicketIds, handleToggleMyTickets]);

    const bookedTicketsContent = useMemo(() => {
        const hasSheets = Object.keys(sheets || {}).length > 0;
        const hasIndividuals = (individuals || []).length > 0;

        if (!hasSheets && !hasIndividuals) {
            return <p className="text-gray-400 text-center py-8">{searchTerm.trim() ? 'No tickets match your search.' : 'No booked tickets for this game.'}</p>;
        }

        return (
            <div className="mx-auto max-w-screen-xl grid gap-y-8 gap-x-4 justify-items-center items-start grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(Object.values(sheets) as Ticket[][]).map(sheetTickets => {
                    const game = games.find(g => g._id === sheetTickets[0].game);
                    if (!game) return null;
                    
                    const sheetTicketIds = sheetTickets.map(t => t._id);
                    const isSheetTracked = (sheetTicketIds || []).length > 0 && (sheetTicketIds || []).every(id => (trackedTicketIds || []).includes(id));

                    return <SheetBundle 
                        key={sheetTickets[0].sheetId} 
                        tickets={sheetTickets} 
                        game={game} 
                        onUnbook={onUnbook} 
                        onTrackSheet={handleTrackSheet}
                        isSheetTracked={isSheetTracked}
                        onShowPhoneRequest={handleTogglePhoneVisibility}
                        visiblePhonePlayerIds={visiblePhonePlayerIds}
                    />;
                })}
                {individuals.map(ticket => {
                    const game = games.find(g => g._id === ticket.game);
                    return (
                         <div key={ticket._id} className="flex justify-center w-full max-w-[360px]">
                            <TambolaTicket
                                ticket={ticket}
                                calledNumbers={game?.calledNumbers || []}
                                showActions={true}
                                game={game}
                                onUnbook={onUnbook}
                                onAddToMyTickets={() => handleToggleMyTickets(ticket._id)}
                                isTracked={trackedTicketIds.includes(ticket._id)}
                                onShowPhoneRequest={handleTogglePhoneVisibility}
                                isPhoneVisible={visiblePhonePlayerIds.has(ticket.player || '')}
                            />
                        </div>
                    );
                })}
            </div>
        );
    }, [sheets, individuals, games, onUnbook, handleTrackSheet, trackedTicketIds, searchTerm, user, handleToggleMyTickets, visiblePhonePlayerIds]);

    return (
        <div ref={containerRef}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-gray-100">Ticket Booking</h2>
                {(availableGames || []).length > 0 && (
                    <select 
                        value={selectedGameId} 
                        onChange={e => setSelectedGameId(e.target.value)}
                        className="w-full sm:w-80 p-2 text-base border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {availableGames.map(game => (
                            <option key={game._id} value={game._id}>{game.title}</option>
                        ))}
                    </select>
                )}
            </div>
            
            <div className="border-b border-slate-700">
                <div className="flex">
                    <button
                        onClick={() => setTicketStatusFilter('available')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors flex items-center gap-2 ${ticketStatusFilter === 'available' ? 'border-b-2 border-indigo-400 text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        Available <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${ticketStatusFilter === 'available' ? 'bg-indigo-500/20' : 'bg-slate-700'}`}>{ticketCounts.available}</span>
                    </button>
                    <button
                        onClick={() => setTicketStatusFilter('booked')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors flex items-center gap-2 ${ticketStatusFilter === 'booked' ? 'border-b-2 border-indigo-400 text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        Booked <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${ticketStatusFilter === 'booked' ? 'bg-indigo-500/20' : 'bg-slate-700'}`}>{ticketCounts.booked}</span>
                    </button>
                    <button
                        onClick={() => setTicketStatusFilter('my_bookings')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors flex items-center gap-2 ${ticketStatusFilter === 'my_bookings' ? 'border-b-2 border-indigo-400 text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        My Bookings <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${ticketStatusFilter === 'my_bookings' ? 'bg-indigo-500/20' : 'bg-slate-700'}`}>{ticketCounts.my_bookings}</span>
                    </button>
                </div>
            </div>

            <div className="my-4 w-3/5 max-w-lg mx-auto">
                <input
                    type="text"
                    placeholder={
                        ticketStatusFilter === 'available' ? "Search available tickets by serial no..." :
                        ticketStatusFilter === 'booked' ? "Search booked tickets by serial no or player..." :
                        "Search my bookings by player or serial no..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 text-base border border-slate-600 bg-slate-700 text-white rounded-md"
                />
            </div>
            
            {ticketStatusFilter === 'available' && (
                <>
                    <div className="bg-slate-900/70 border border-slate-700 p-3 rounded-lg my-4">
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setShowSheetPopup(3)} disabled={!canBook} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-3 rounded-md text-xs disabled:bg-slate-500 disabled:cursor-not-allowed">Book Half Sheet (3)</button>
                            <button onClick={() => setShowSheetPopup(6)} disabled={!canBook} className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-md text-xs disabled:bg-slate-500 disabled:cursor-not-allowed">Book Full Sheet (6)</button>
                            <button onClick={() => setShowSheetPopup(10)} disabled={!canBook} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 rounded-md text-xs disabled:bg-slate-500 disabled:cursor-not-allowed">Book Bundle (10)</button>
                        </div>
                    </div>
                    {availableTicketsContent}
                    {(allAvailableTickets || []).length > visibleCount && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setVisibleCount(prev => prev + TICKETS_PER_PAGE)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                            >
                                Load More Tickets ({visibleCount} / {(allAvailableTickets || []).length})
                            </button>
                        </div>
                    )}
                </>
            )}

            {ticketStatusFilter === 'booked' && bookedTicketsContent}

            {ticketStatusFilter === 'my_bookings' && (
                 <AgentBookings 
                    searchTerm={searchTerm} 
                    selectedGameId={selectedGameId} 
                    games={games} 
                    tickets={tickets}
                    dbUsers={dbUsers}
                />
            )}

            <BookingFormPopup
                isOpen={!!bookingInfo}
                onClose={handleCloseBooking}
                bookingInfo={bookingInfo}
                onConfirm={handleConfirmBooking}
            />

            <SheetSelectionPopup
                isOpen={!!showSheetPopup}
                sheetSize={showSheetPopup!}
                onClose={() => setShowSheetPopup(null)}
                games={selectedGame ? [selectedGame] : []}
                tickets={ticketsForSelectedGame}
                onSelect={handleSheetSelection}
                pendingTicketIds={[]}
            />
            
            <FloatingCTAButton
                isVisible={showCTA}
                onClick={() => selectedGame && setBookingInfo({ type: 'multiple', ticketIds: selectedTicketIds, game: selectedGame })}
                onClose={() => { setSelectedTicketIds([]); }}
                label="Book Selected"
                count={(selectedTicketIds || []).length}
                containerRef={containerRef}
            />
        </div>
    );
};