import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Game, Ticket, User } from '../../types';
import { gameService } from '../../services/gameService';

import { TambolaTicket } from '../common/TambolaTicket';
import { useToast } from '../../contexts/ToastContext';
import { SheetBundle } from '../common/SheetBundle';
import { useAuth } from '../../contexts/AuthContext';

interface MyTicketsViewProps {
    games: Game[];
    tickets: Ticket[];
    user: User;
    onUnbook?: (ticketId: string) => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({ games, tickets, user, onUnbook }) => {
    const [myTickets, setMyTickets] = useState<Ticket[]>([]);
    const [trackedTicketIds, setTrackedTicketIds] = useState<string[]>([]);
    const toast = useToast();
    const { user: loggedInUser } = useAuth();
    const [visiblePhonePlayerIds, setVisiblePhonePlayerIds] = useState<Set<string>>(new Set());

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

    const fetchMyTickets = useCallback(async () => {
        if (!user) return;
        
        const bookedTickets = await gameService.getMyTickets(user._id);
        
        // Filter out any tickets that might not be fully booked (though getMyTickets should only return booked ones)
        const approvedTickets = bookedTickets.filter(t => t.status === 'booked');
        
        setMyTickets(approvedTickets);
    }, [user]);

    useEffect(() => {
        fetchMyTickets();
    }, [fetchMyTickets]);

    const handleToggleMyTickets = async (ticketId: string) => {
        if (!user) return;
        const isTracked = trackedTicketIds.includes(ticketId);
        const isBookedByMe = myTickets.some(t => t._id === ticketId && t.player === user._id);
    
        // Optimistic UI update
    
        // If the ticket is tracked (and not booked by me), untracking it should remove it from the view.
        if (isTracked && !isBookedByMe) {
            setMyTickets(prev => prev.filter(t => t._id !== ticketId));
        }
        setTrackedTicketIds(prev => isTracked ? prev.filter(id => id !== ticketId) : [...prev, ticketId]);
    
        try {
            if (isTracked) {
                await gameService.removeFromMyTickets({ userId: user._id, ticketId });
                toast.show('Ticket removed from your list.');
            } else {
                await gameService.addToMyTickets({ userId: user._id, ticketId });
                toast.show('Ticket added to your list for tracking.');
            }
        } catch (error) {
            toast.show('Failed to update tracking.', { type: 'error' });
            // Revert on error
            fetchMyTickets();
        }
    };
    
    const handleTrackSheet = useCallback(async (ticketIds: string[]) => {
        if (!user) return;
    
        const isCurrentlyTracked = ticketIds.every(id => trackedTicketIds.includes(id));
    
        // --- OPTIMISTIC UPDATE ---
        if (isCurrentlyTracked) {
            const ticketIdsSet = new Set(ticketIds);
            // Remove the entire sheet from the current view when untracking.
            setMyTickets(prev => prev.filter(t => !ticketIdsSet.has(t._id)));
        }
        // Update tracked IDs optimistically for both tracking and untracking.
        setTrackedTicketIds(prev => {
            const ticketIdsSet = new Set(ticketIds);
            if (isCurrentlyTracked) {
                return prev.filter(id => !ticketIdsSet.has(id));
            } else {
                const newIds = ticketIds.filter(id => !prev.includes(id));
                return [...prev, ...newIds];
            }
        });
    
        try {
            const apiCalls = ticketIds.map(ticketId =>
                isCurrentlyTracked
                    ? gameService.removeFromMyTickets({ userId: user._id, ticketId })
                    : gameService.addToMyTickets({ userId: user._id, ticketId })
            );
            await Promise.all(apiCalls);
    
            toast.show(`Sheet successfully ${isCurrentlyTracked ? 'untracked' : 'tracked'}.`);
        } catch (error) {
            toast.show(`Failed to update sheet tracking.`, { type: 'error' });
            // Revert on error
            fetchMyTickets();
        }
    }, [user, trackedTicketIds, toast, fetchMyTickets]);

    const handleClaimPrize = async (ticketId: string, prizeName: string) => {
        if (!user) return;
        const ticket = myTickets.find(t => t._id === ticketId);
        if (!ticket) return;

        try {
            const result = await gameService.claimPrize({
                playerId: user._id,
                gameId: ticket.game,
                ticketId: ticket._id,
                prizeName,
            });
            toast.show(result.message || 'Claim submitted!', { type: 'success' });
        } catch (error) {
            toast.show((error as Error).message, { type: 'error' });
        }
    };

    const { sheets, individuals } = useMemo(() => {
        const sheetsMap: { [key: string]: Ticket[] } = {};
        const individualsList: Ticket[] = [];
        const processedSheetIds = new Set<string>();

        myTickets.forEach(ticket => {
            if (ticket.sheetId && !processedSheetIds.has(ticket.sheetId)) {
                // Find all tickets belonging to this sheet from the main `myTickets` list
                const sheetTickets = myTickets.filter(t => t.sheetId === ticket.sheetId);
                if (sheetTickets.length > 0) {
                    sheetsMap[ticket.sheetId] = sheetTickets.sort((a, b) => a.serialNumber - b.serialNumber);
                    processedSheetIds.add(ticket.sheetId);
                }
            } else if (!ticket.sheetId) {
                individualsList.push(ticket);
            }
        });
        
        // FIX: Corrected a recursive dependency where `individuals` was used in its own definition by using a temporary `individualsList`.
        return { sheets: sheetsMap, individuals: individualsList };
    }, [myTickets]);

    if (myTickets.length === 0) {
        return <p className="text-gray-400 text-center py-8">You have no booked or tracked tickets.</p>;
    }
    
    const canClaim = loggedInUser?._id === user._id;

    return (
        <>
            <div className="mx-auto max-w-screen-xl grid gap-y-8 gap-x-4 justify-items-center items-start grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(Object.values(sheets) as Ticket[][]).map((sheetTickets, index) => {
                    const game = games.find(g => g._id === sheetTickets[0].game);
                    if (!game) return null;

                    const sheetTicketIds = sheetTickets.map(t => t._id);
                    const isSheetTracked = sheetTicketIds.length > 0 && sheetTicketIds.every(id => trackedTicketIds.includes(id));

                    return (
                        <SheetBundle
                            key={`${sheetTickets[0].sheetId}-${index}`}
                            tickets={sheetTickets}
                            game={game}
                            onUnbook={onUnbook}
                            onTrackSheet={handleTrackSheet}
                            isSheetTracked={isSheetTracked}
                            onClaimPrize={canClaim ? handleClaimPrize : undefined}
                            onShowPhoneRequest={handleTogglePhoneVisibility}
                            visiblePhonePlayerIds={visiblePhonePlayerIds}
                        />
                    );
                })}
                {individuals.map((ticket, index) => {
                    const game = games.find(g => g._id === ticket.game);
                    if (!game) return null;
                    
                    return (
                        <div key={`${ticket._id}-${index}`} className="flex justify-center w-full max-w-[360px]">
                            <TambolaTicket
                                ticket={ticket}
                                calledNumbers={game.calledNumbers || []}
                                game={game}
                                showActions={true}
                                onAddToMyTickets={() => handleToggleMyTickets(ticket._id)}
                                displayMode="remove"
                                isTracked={trackedTicketIds.includes(ticket._id)}
                                onUnbook={onUnbook}
                                onClaimPrize={canClaim ? (prizeName) => handleClaimPrize(ticket._id, prizeName) : undefined}
                                onShowPhoneRequest={handleTogglePhoneVisibility}
                                isPhoneVisible={visiblePhonePlayerIds.has(ticket.player || '')}
                            />
                        </div>
                    );
                })}
            </div>
        </>
    );
};