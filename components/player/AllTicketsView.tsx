import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Game, Ticket, TicketRequest, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { api, mockDB, subscribeToDbChanges } from '../../services/mockApi';
import { TambolaTicket } from '../common/TambolaTicket';
import { BookingFormPopup } from '../agent/BookingFormPopup';
import { useToast } from '../../contexts/ToastContext';
import { SheetSelectionPopup } from '../agent/SheetSelectionPopup';
import { FloatingCTAButton } from '../common/FloatingCTAButton';
import { SheetBundle } from '../common/SheetBundle';

interface AllTicketsViewProps {
    games: Game[];
    tickets: Ticket[];
    onTicketUpdate: () => void;
    settings: any;
}

const TICKETS_PER_PAGE = 50;

export const AllTicketsView: React.FC<AllTicketsViewProps> = ({ games, tickets, onTicketUpdate, settings }) => {
    const { user, updateUser } = useAuth();
    const toast = useToast();
    const [trackedTicketIds, setTrackedTicketIds] = useState<string[]>([]);
    const [bookingInfo, setBookingInfo] = useState<{ type: 'single', ticket: Ticket } | { type: 'multiple', ticketIds: string[] } | null>(null);
    const [ticketStatusFilter, setTicketStatusFilter] = useState<'available' | 'booked'>('available');
    const [pendingRequests, setPendingRequests] = useState<TicketRequest[]>([]);
    const [showSheetPopup, setShowSheetPopup] = useState<3 | 6 | 10 | null>(null);
    const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(TICKETS_PER_PAGE);
    const [dbUsers, setDbUsers] = useState<User[]>([]);

    useEffect(() => {
        setDbUsers(mockDB.users);
        const unsubscribe = subscribeToDbChanges(() => {
            setDbUsers([...mockDB.users]);
        });
        return () => unsubscribe();
    }, []);

    const isRequestingEnabled = settings.isPlayerTicketRequestEnabled ?? true;

    const availableGames = useMemo(() => games.filter(g => ['upcoming', 'ongoing'].includes(g.status)), [games]);
    const [selectedGameId, setSelectedGameId] = useState<string>(availableGames[0]?._id || '');

    useEffect(() => {
        if ((availableGames || []).length > 0 && !(availableGames || []).some(g => g._id === selectedGameId)) {
            setSelectedGameId(availableGames[0]._id);
        } else if ((availableGames || []).length === 0) {
            setSelectedGameId('');
        }
    }, [availableGames, selectedGameId]);

    const fetchPendingRequests = useCallback(async () => {
        const reqs = await api.admin.getTicketRequests();
        setPendingRequests(prev => JSON.stringify(prev) === JSON.stringify(reqs) ? prev : reqs);
    }, []);

    useEffect(() => {
        if(!user) return;
        const fetchTracked = async () => {
            const ids = await api.user.getMyTrackedTickets(user._id);
            setTrackedTicketIds(prev => JSON.stringify(prev) === JSON.stringify(ids) ? prev : ids);
        };
        fetchTracked();
        fetchPendingRequests();

        return () => {};
    }, [user?._id, tickets, fetchPendingRequests, onTicketUpdate]);
    
    useEffect(() => {
        setSelectedTicketIds([]);
        setVisibleCount(TICKETS_PER_PAGE);
    }, [selectedGameId, ticketStatusFilter]);

    const pendingTicketInfo = useMemo(() => {
        const ticketIdToRequestMap = new Map<string, { playerName: string }>();
        for (const request of pendingRequests) {
            for (const ticketId of request.ticketIds) {
                ticketIdToRequestMap.set(ticketId, { playerName: request.playerName });
            }
        }
        return ticketIdToRequestMap;
    }, [pendingRequests]);
    
    const allPendingTicketIds = useMemo(() => Array.from(pendingTicketInfo.keys()), [pendingTicketInfo]);
    
    const ticketsByGame = useMemo(() => {
        return availableGames
            .filter(game => game._id === selectedGameId)
            .map(game => {
                const displayTickets = tickets
                    .filter(t => t.game === game._id && t.status === ticketStatusFilter && !trackedTicketIds.includes(t._id))
                    .filter(ticket => {
                        if (!searchTerm.trim()) return true;
                        const lowerSearch = (searchTerm || '').toLowerCase();

                        // Check serial number
                        if (String(ticket.serialNumber).includes(lowerSearch)) return true;

                        // For booked tickets, check player and agent names
                        if (ticket.status === 'booked') {
                            const player = ticket.player ? dbUsers.find(u => u._id === ticket.player) : null;
                            if (player && (player.name || '').toLowerCase().includes(lowerSearch)) return true;

                            const agent = ticket.bookedByAgent ? dbUsers.find(u => u._id === ticket.bookedByAgent) : null;
                            if (agent && (agent.name || '').toLowerCase().includes(lowerSearch)) return true;
                        }
                        return false;
                    })
                    .sort((a, b) => a.serialNumber - b.serialNumber);
                return { game, displayTickets };
            })
            .filter(gameGroup => (gameGroup.displayTickets || []).length > 0);
    }, [availableGames, selectedGameId, tickets, ticketStatusFilter, searchTerm, dbUsers]);


    const handleTicketSelect = (ticketId: string) => {
        setSelectedTicketIds(prev => {
            const newSelection = prev.includes(ticketId)
                ? prev.filter(id => id !== ticketId)
                : [...prev, ticketId];
            return newSelection;
        });
    };

    const handleToggleMyTickets = async (ticketId: string) => {
        if (!user) return;

        // Prevent guest users from tracking tickets, as they don't have a persistent ID.
        if (user._id.startsWith('player_guest_')) {
            toast.show('Please request a ticket first to create a profile for tracking.', { type: 'info' });
            return;
        }

        const isTracked = trackedTicketIds.includes(ticketId);
        
        // Save original state for potential revert on error.
        const originalTrackedIds = [...trackedTicketIds];
        
        // Optimistic UI update
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
            // Revert optimistic update on error
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
            
            onTicketUpdate();
            
            toast.show(`Sheet successfully ${isCurrentlyTracked ? 'untracked' : 'tracked'}.`);
        } catch (error) {
            toast.show(`Failed to update sheet tracking.`, { type: 'error' });
        }
    }, [user, trackedTicketIds, toast, onTicketUpdate]);

    const handleCloseBooking = useCallback(() => {
        setBookingInfo(null);
    }, []);

    const handleRequestTickets = async (playerName: string, playerNumber: string, agentId?: string) => {
        if (!user || !bookingInfo || !agentId) return;

        const ticketIdsToRequest = bookingInfo.type === 'single' && bookingInfo.ticket ? [bookingInfo.ticket._id] : (bookingInfo.type === 'multiple' ? bookingInfo.ticketIds : []);
        if ((ticketIdsToRequest || []).length === 0) return;
        
        try {
            let playerIdForRequest = user._id;

            // If the user is a guest, find or create a real player record before submitting.
            // This ensures a valid UUID is sent to the database.
            if (user._id.startsWith('player_guest_')) {
                const realPlayer = await api.user.findOrCreatePlayer(playerName, playerNumber);
                playerIdForRequest = realPlayer._id;
                updateUser(realPlayer);
            }

            await api.player.requestTickets({ playerId: playerIdForRequest, ticketIds: ticketIdsToRequest, agentId, playerName, playerPhone: playerNumber });
            toast.show(`Your request for ${(ticketIdsToRequest || []).length} ticket(s) has been submitted.`);
            fetchPendingRequests();
        } catch (error) {
            toast.show((error as Error).message, { type: 'error' });
        } finally {
            handleCloseBooking();
            setSelectedTicketIds([]);
            onTicketUpdate();
        }
    };

    const handleSheetSelection = (ticketIds: string[]) => {
        // This is a sheet booking, not a manual selection. Open booking form directly.
        setBookingInfo({ type: 'multiple', ticketIds });
        setShowSheetPopup(null);
        // Clear any previous manual selection to avoid confusion
        if ((selectedTicketIds || []).length > 0) {
            setSelectedTicketIds([]);
        }
    };

    const selectedGame = availableGames.find(g => g._id === selectedGameId);
    const isBookingEnabledForGame = selectedGame ? selectedGame.isBookingOpen : false;
    const showCTA = (selectedTicketIds || []).length > 0
        && ticketStatusFilter === 'available';

    const ticketCounts = useMemo(() => {
        if (!selectedGameId) return { available: 0, booked: 0 };
        const gameTickets = tickets.filter(t => t.game === selectedGameId);
        return {
            available: (gameTickets || []).filter(t => t.status === 'available').length,
            booked: (gameTickets || []).filter(t => t.status === 'booked').length
        };
    }, [tickets, selectedGameId]);


    return (
        <div className="bg-slate-800/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-slate-700" ref={containerRef}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-gray-100">All Tickets</h2>
                <select 
                    value={selectedGameId} 
                    onChange={e => setSelectedGameId(e.target.value)}
                    className="w-full sm:w-80 p-2 text-base border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                    {availableGames.map(game => (
                        <option key={game._id} value={game._id}>{game.title}</option>
                    ))}
                </select>
            </div>

            <div className="border-b border-slate-700">
                <div className="flex">
                    <button
                        onClick={() => setTicketStatusFilter('available')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors flex items-center gap-2 ${ticketStatusFilter === 'available' ? 'border-b-2 border-indigo-400 text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        Available
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${ticketStatusFilter === 'available' ? 'bg-indigo-500/20' : 'bg-slate-700'}`}>{ticketCounts.available}</span>
                    </button>
                    <button
                        onClick={() => setTicketStatusFilter('booked')}
                        className={`px-4 py-2 font-semibold text-sm transition-colors flex items-center gap-2 ${ticketStatusFilter === 'booked' ? 'border-b-2 border-indigo-400 text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                        Booked
                         <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${ticketStatusFilter === 'booked' ? 'bg-indigo-500/20' : 'bg-slate-700'}`}>{ticketCounts.booked}</span>
                    </button>
                </div>
            </div>

            {ticketStatusFilter === 'available' && isRequestingEnabled && isBookingEnabledForGame && (
                <div className="bg-slate-900/70 border border-slate-700 p-3 rounded-lg my-4">
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setShowSheetPopup(3)} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-3 rounded-md text-xs">Request Half Sheet (3)</button>
                        <button onClick={() => setShowSheetPopup(6)} className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-md text-xs">Request Full Sheet (6)</button>
                        <button onClick={() => setShowSheetPopup(10)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 rounded-md text-xs">Request Bundle (10)</button>
                    </div>
                </div>
            )}
            
            <div className="my-4 w-3/5 max-w-lg mx-auto">
                <input
                    type="text"
                    placeholder="Search by Serial No, Player..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 text-base border border-slate-600 bg-slate-700 text-white rounded-md"
                />
            </div>

            <div className="space-y-4">
                {(ticketsByGame || []).length > 0 ? (
                    ticketsByGame.map(({ game, displayTickets }) => {
                        const hasMore = (displayTickets || []).length > visibleCount;
                        const ticketsToShow = displayTickets.slice(0, visibleCount);

                        if (ticketStatusFilter === 'booked') {
                            const sheetsMap: { [key: string]: Ticket[] } = {};
                            const individuals: Ticket[] = [];
                            displayTickets.forEach(ticket => {
                                if (ticket.sheetId) {
                                    if (!sheetsMap[ticket.sheetId]) sheetsMap[ticket.sheetId] = [];
                                    sheetsMap[ticket.sheetId].push(ticket);
                                } else {
                                    individuals.push(ticket);
                                }
                            });
                            Object.values(sheetsMap).forEach(sheet => sheet.sort((a, b) => a.serialNumber - b.serialNumber));

                            return (
                                <div key={game._id}>
                                    <h2 className="text-xl font-bold text-gray-200 mb-2">{game.title}</h2>
                                    <div className="mx-auto max-w-screen-xl grid gap-y-8 gap-x-4 justify-items-center items-start grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {Object.values(sheetsMap).map(sheetTickets => {
                                            const sheetTicketIds = sheetTickets.map(t => t._id);
                                            const isSheetTracked = (sheetTicketIds || []).length > 0 && (sheetTicketIds || []).every(id => (trackedTicketIds || []).includes(id));
                                            return (
                                                <SheetBundle
                                                    key={sheetTickets[0].sheetId}
                                                    tickets={sheetTickets}
                                                    game={game}
                                                    onTrackSheet={handleTrackSheet}
                                                    isSheetTracked={isSheetTracked}
                                                />
                                            );
                                        })}
                                        {individuals.map(ticket => (
                                            <div key={ticket._id} className="flex justify-center w-full max-w-[360px]">
                                                <TambolaTicket
                                                    ticket={ticket}
                                                    calledNumbers={game.calledNumbers || []}
                                                    showActions={true}
                                                    game={game}
                                                    onAddToMyTickets={() => handleToggleMyTickets(ticket._id)}
                                                    isTracked={trackedTicketIds.includes(ticket._id)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        
                        // Rendering for 'available' tickets with pagination
                        return (
                            <div key={game._id}>
                                <h2 className="text-xl font-bold text-gray-200 mb-2">{game.title}</h2>
                                <div className="mx-auto max-w-screen-xl grid gap-4 justify-items-center [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
                                    {ticketsToShow.map(ticket => {
                                            const pendingRequest = pendingTicketInfo.get(ticket._id);
                                            return (
                                                <TambolaTicket 
                                                    key={ticket._id}
                                                    ticket={ticket}
                                                    calledNumbers={[]}
                                                    game={game}
                                                    showActions={true}
                                                    onBook={game.isBookingOpen && !pendingRequest && isRequestingEnabled ? () => setBookingInfo({ type: 'single', ticket: ticket }) : undefined}
                                                    onAddToMyTickets={() => handleToggleMyTickets(ticket._id)}
                                                    isTracked={trackedTicketIds.includes(ticket._id)}
                                                    isSelectable={ticket.status === 'available' && game.isBookingOpen && !pendingRequest && isRequestingEnabled}
                                                    isSelected={selectedTicketIds.includes(ticket._id)}
                                                    onSelect={ticket.status === 'available' && game.isBookingOpen && !pendingRequest && isRequestingEnabled ? () => handleTicketSelect(ticket._id) : undefined}
                                                    pendingRequestInfo={pendingRequest}
                                                />
                                            );
                                        })
                                    }
                                </div>
                                {hasMore && (
                                    <div className="mt-6 text-center">
                                        <button
                                            onClick={() => setVisibleCount(prev => prev + TICKETS_PER_PAGE)}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                                        >
                                            Load More ({visibleCount} / {(displayTickets || []).length})
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="text-gray-400 text-center py-4">
                        {searchTerm ? 'No tickets match your search.' : `No ${ticketStatusFilter} tickets for this game.`}
                    </p>
                )}
            </div>

            <BookingFormPopup
                isOpen={!!bookingInfo}
                onClose={handleCloseBooking}
                bookingInfo={bookingInfo}
                onConfirm={handleRequestTickets}
            />

            <SheetSelectionPopup
                isOpen={!!showSheetPopup}
                sheetSize={showSheetPopup!}
                onClose={() => setShowSheetPopup(null)}
                games={selectedGame ? [selectedGame] : []}
                tickets={tickets}
                onSelect={handleSheetSelection}
                pendingTicketIds={allPendingTicketIds}
            />
            
            {ticketStatusFilter === 'available' && (
                <FloatingCTAButton
                    isVisible={showCTA}
                    onClick={() => setBookingInfo({ type: 'multiple', ticketIds: selectedTicketIds })}
                    onClose={() => {
                        setSelectedTicketIds([]);
                    }}
                    label="Request Selected"
                    count={(selectedTicketIds || []).length}
                    containerRef={containerRef}
                />
            )}
        </div>
    );
};