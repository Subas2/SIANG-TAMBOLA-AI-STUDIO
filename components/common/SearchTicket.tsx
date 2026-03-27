import React, { useState, useEffect, useMemo } from 'react';
import { Game, Ticket } from '../../types';
import { TambolaTicket } from './TambolaTicket';
import { SheetBundle } from './SheetBundle';
import { searchState } from '../../services/searchState';

interface SearchTicketProps {
    games: Game[];
    tickets: Ticket[];
    activeGame: Game | null;
    onUnbook?: (ticketId: string) => void;
}

export const SearchTicket: React.FC<SearchTicketProps> = ({ games, tickets, activeGame, onUnbook }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Ticket[]>([]);
    const [addedTickets, setAddedTickets] = useState<Ticket[]>(searchState.addedTickets);
    const [notFoundNumbers, setNotFoundNumbers] = useState<number[]>([]);

    const updateAddedTicketsState = (updater: React.SetStateAction<Ticket[]>) => {
        const newState = typeof updater === 'function' ? updater(searchState.addedTickets) : updater;
        searchState.addedTickets = newState;
        setAddedTickets(newState);
    };
    
    useEffect(() => {
        const handler = setTimeout(() => {
            if (!searchTerm.trim()) {
                setSearchResults([]);
                setNotFoundNumbers([]);
                return;
            }

            const numbersToSearch = searchTerm.match(/\d+/g)?.map(Number) || [];
            const uniqueNumbers = [...new Set(numbersToSearch)];

            if ((uniqueNumbers || []).length === 0) {
                setSearchResults([]);
                setNotFoundNumbers([]);
                return;
            }

            // Search across all tickets regardless of active game
            const ticketsInScope = tickets;

            const foundTickets: Ticket[] = [];
            const currentAddedTicketIds = new Set(addedTickets.map(t => t._id));
            const processedTicketIds = new Set<string>();

            uniqueNumbers.forEach(ticketNumber => {
                // Find the matching ticket
                const matchingTicket = ticketsInScope.find(t => t.serialNumber === ticketNumber);

                if (matchingTicket) {
                    // If it's part of a sheet, get all tickets in that sheet
                    if (matchingTicket.sheetId) {
                        const sheetTickets = ticketsInScope.filter(t => t.sheetId === matchingTicket.sheetId);
                        sheetTickets.forEach(st => {
                            if (!processedTicketIds.has(st._id) && !currentAddedTicketIds.has(st._id)) {
                                foundTickets.push(st);
                                processedTicketIds.add(st._id);
                            }
                        });
                    } else {
                        // If it's a single ticket
                        if (!processedTicketIds.has(matchingTicket._id) && !currentAddedTicketIds.has(matchingTicket._id)) {
                            foundTickets.push(matchingTicket);
                            processedTicketIds.add(matchingTicket._id);
                        }
                    }
                }
            });

            // The `allTicketNumbersInScope` also uses the scoped list.
            const allTicketNumbersInScope = new Set(
                ticketsInScope.map(t => t.serialNumber)
            );
            const actualNotFound = uniqueNumbers.filter(num => !allTicketNumbersInScope.has(num));

            const uniqueFoundTickets = Array.from(new Map(foundTickets.map(t => [t._id, t])).values());
            uniqueFoundTickets.sort((a, b) => a.serialNumber - b.serialNumber);
            
            setSearchResults(uniqueFoundTickets);
            setNotFoundNumbers(actualNotFound);
        }, 300);

        return () => clearTimeout(handler);
    }, [searchTerm, tickets, addedTickets, activeGame]);

    const handleAddAll = () => {
        if ((searchResults || []).length === 0) return;
        
        const currentAddedIds = new Set(addedTickets.map(t => t._id));
        const newTicketsToAdd = searchResults.filter(t => !currentAddedIds.has(t._id));
        
        updateAddedTicketsState(prev => [...prev, ...newTicketsToAdd]);
        setSearchTerm('');
    };

    const handleRemoveTicket = (ticketIdToRemove: string) => {
        const ticketToRemove = tickets.find(t => t._id === ticketIdToRemove);
        if (!ticketToRemove) return;

        if (ticketToRemove.sheetId) {
            updateAddedTicketsState(prev => prev.filter(t => t.sheetId !== ticketToRemove.sheetId));
        } else {
            updateAddedTicketsState(prev => prev.filter(t => t._id !== ticketIdToRemove));
        }
    };

    const { sheets: addedSheets, individuals: addedIndividuals } = useMemo(() => {
        const sheetsMap: { [key: string]: Ticket[] } = {};
        const individualsList: Ticket[] = [];
        for (const ticket of addedTickets) {
            if (ticket.sheetId) {
                if (!sheetsMap[ticket.sheetId]) sheetsMap[ticket.sheetId] = [];
                sheetsMap[ticket.sheetId].push(ticket);
            } else {
                individualsList.push(ticket);
            }
        }
        Object.values(sheetsMap).forEach(sheet => sheet.sort((a, b) => a.serialNumber - b.serialNumber));
        // FIX: Corrected a recursive dependency where the memoized value `addedIndividuals` was used in its own definition.
        return { sheets: sheetsMap, individuals: individualsList };
    }, [addedTickets]);

    return (
        <div className="my-4">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-lg animate-fade-in-up max-w-xs mx-auto">
                <h3 className="text-lg font-semibold text-center text-gray-200 mb-3">Find Tickets</h3>
                <div className="flex gap-2 items-center">
                    <textarea
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Enter ticket no..."
                        rows={1}
                        className="flex-grow p-3 text-sm border border-slate-600 bg-slate-800 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    />
                    <button
                        onClick={handleAddAll}
                        disabled={(searchResults || []).length === 0}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        Add
                    </button>
                </div>

                <div className="mt-2 min-h-[10px] text-center">
                    {searchTerm.trim() && (
                        <div className="text-xs text-gray-400">
                            {(searchResults || []).length > 0 && `Found: ${(searchResults || []).map(t => `#${t.serialNumber}`).join(', ')}`}
                            {(searchResults || []).length > 0 && (notFoundNumbers || []).length > 0 && ` | `}
                            {(notFoundNumbers || []).length > 0 && <span className="text-yellow-400">Not Found: {(notFoundNumbers || []).join(', ')}</span>}
                        </div>
                    )}
                </div>
            </div>
            
            {(addedTickets || []).length > 0 && (
                <div className="animate-fade-in-up mt-4 p-4 bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-xl shadow-lg">
                     <h4 className="text-lg font-bold text-gray-200 text-center mb-4">Added Tickets ({(addedTickets || []).length})</h4>
                     <div className="mx-auto max-w-screen-xl grid gap-4 justify-center items-start [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
                        {Object.entries(addedSheets).map(([sheetId, sheetTickets]) => {
                             const game = games.find(g => g._id === sheetTickets[0].game);
                             if (!game) return null;
                             return (
                                 <SheetBundle
                                     key={sheetId}
                                     tickets={sheetTickets}
                                     game={game}
                                     onRemove={() => handleRemoveTicket(sheetTickets[0]._id)}
                                     onUnbook={onUnbook}
                                 />
                             );
                        })}
                        {addedIndividuals.map(ticket => {
                            const game = games.find(g => g._id === ticket.game);
                            if (!game) return null;
                            return (
                                <div key={ticket._id} className="relative group">
                                    <button
                                        onClick={() => handleRemoveTicket(ticket._id)}
                                        className="absolute top-1 right-1 z-20 p-1 bg-red-600/80 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove ticket"
                                        title="Remove Ticket"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <TambolaTicket
                                        ticket={ticket}
                                        calledNumbers={game.calledNumbers}
                                        game={game}
                                        showActions={true}
                                        onUnbook={onUnbook}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};