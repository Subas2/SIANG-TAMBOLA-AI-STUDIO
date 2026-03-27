import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Ticket, User, Game } from '../../types';
import { mockDB, subscribeToDbChanges } from '../../services/mockApi';
import { useAuth } from '../../contexts/AuthContext';
import { TambolaTicket } from '../common/TambolaTicket';
import { SheetBundle } from '../common/SheetBundle';

interface AgentBookingsProps {
    searchTerm: string;
    selectedGameId: string;
    games: Game[];
    tickets: Ticket[];
    dbUsers: User[];
}

export const AgentBookings: React.FC<AgentBookingsProps> = ({ searchTerm, selectedGameId, games, tickets, dbUsers }) => {
    const { user } = useAuth();
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

    const groupedBookings = useMemo(() => {
        if (!user) return [];

        // Use props instead of mockDB and filter by selected game
        const gameTickets = tickets.filter(t => t.game === selectedGameId);
        const allUsers = dbUsers;
        
        const myBookings = gameTickets.filter(
            t => {
                if (user.role === 'admin') {
                    // Admins see all bookings made by any agent for the selected game.
                    return t.status === 'booked' && t.bookedByAgent && t.player;
                }
                // Agents see only their own bookings for the selected game.
                return t.bookedByAgent === user._id && t.status === 'booked' && t.player
            }
        );

        const bookingsMap: Record<string, { player: User, game: Game, tickets: Ticket[] }> = {};

        myBookings.forEach(ticket => {
            const player = allUsers.find(u => u._id === ticket.player);
            const game = games.find(g => g._id === ticket.game);
            if (!player || !game) return;

            const key = `${player._id}-${game._id}`;

            if (!bookingsMap[key]) {
                bookingsMap[key] = {
                    player,
                    game,
                    tickets: []
                };
            }
            bookingsMap[key].tickets.push(ticket);
        });
        
        const filtered = Object.values(bookingsMap).filter(booking => {
            if (!searchTerm.trim()) return true;
            const lowerSearch = (searchTerm || '').toLowerCase();

            if ((booking.player.name || '').toLowerCase().includes(lowerSearch)) return true;
            if ((booking.game.title || '').toLowerCase().includes(lowerSearch)) return true;
            if (booking.tickets.some(ticket => String(ticket.serialNumber).includes(lowerSearch))) return true;

            return false;
        });
        
        return filtered.sort((a, b) => {
            const dateA = new Date(`${a.game.date} ${a.game.time}`).getTime();
            const dateB = new Date(`${b.game.date} ${b.game.time}`).getTime();
            if(dateB !== dateA) return dateB - dateA;
            return a.player.name.localeCompare(b.player.name);
        });
    }, [user, searchTerm, selectedGameId, games, tickets, dbUsers]);
    
    const getGroupedRenderables = (tickets: Ticket[]) => {
        const sheetsMap: { [key: string]: Ticket[] } = {};
        const individualsList: Ticket[] = [];
        for (const ticket of tickets) {
            if (ticket.sheetId) {
                if (!sheetsMap[ticket.sheetId]) sheetsMap[ticket.sheetId] = [];
                sheetsMap[ticket.sheetId].push(ticket);
            } else {
                individualsList.push(ticket);
            }
        }
        Object.values(sheetsMap).forEach(sheet => sheet.sort((a, b) => a.serialNumber - b.serialNumber));
        return { sheets: Object.values(sheetsMap), individuals: individualsList };
    };

    if ((groupedBookings || []).length === 0 && !searchTerm.trim()) {
        const message = user?.role === 'admin' ? "No tickets have been booked by any agent for this game." : "You have not booked any tickets for players in this game.";
        return <p className="text-gray-400 text-center py-8">{message}</p>;
    }

    return (
        <div className="space-y-4">
            {(groupedBookings || []).length > 0 ? (groupedBookings || []).map(({ player, game, tickets }) => {
                const { sheets, individuals } = getGroupedRenderables(tickets);
                const agent = user?.role === 'admin' && tickets[0]?.bookedByAgent ? dbUsers.find(u => u._id === tickets[0].bookedByAgent) : null;
                return (
                    <div key={`${player._id}-${game._id}`} className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => handleTogglePhoneVisibility(player._id)}
                                        className="text-gray-400 hover:text-white"
                                        title="Show player phone number"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <p className="font-bold text-indigo-400">{player.name}</p>
                                </div>
                                {visiblePhonePlayerIds.has(player._id) && (
                                    <p className="text-sm text-gray-300 font-mono animate-fade-in-up pl-7">{player.phone || 'No phone'}</p>
                                )}
                                <p className="text-sm text-gray-300 pl-7">{game.title}</p>
                                {agent && (
                                    <p className="text-xs text-cyan-300 pl-7">by: {agent.name}</p>
                                )}
                            </div>
                            <div className="text-right">
                                 <p className="text-sm font-semibold text-gray-200">{(tickets || []).length} Ticket(s)</p>
                                 <p className="text-xs text-gray-400">Total: ₹{(tickets || []).length * game.ticketPrice}</p>
                            </div>
                        </div>
                        <div className="mx-auto max-w-screen-xl grid gap-y-8 gap-x-4 justify-items-center items-start grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {sheets.map(sheetTickets => (
                                <SheetBundle 
                                    key={sheetTickets[0].sheetId} 
                                    tickets={sheetTickets} 
                                    game={game} 
                                    onShowPhoneRequest={handleTogglePhoneVisibility}
                                    visiblePhonePlayerIds={visiblePhonePlayerIds}
                                />
                            ))}
                            {individuals.map(ticket => (
                                 <div key={ticket._id} className="flex justify-center w-full max-w-[360px]">
                                    <TambolaTicket 
                                        ticket={ticket} 
                                        calledNumbers={game.calledNumbers}
                                        game={game} 
                                        showActions={false}
                                        onShowPhoneRequest={handleTogglePhoneVisibility}
                                        isPhoneVisible={visiblePhonePlayerIds.has(ticket.player || '')}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }) : <p className="text-gray-400 text-center py-4">No bookings found matching your search.</p>}
        </div>
    );
};