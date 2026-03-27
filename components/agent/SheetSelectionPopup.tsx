import React, { useState, useMemo } from 'react';
import { Game, Ticket } from '../../types';
import { Modal } from '../common/Modal';

interface SheetSelectionPopupProps {
    isOpen: boolean;
    onClose: () => void;
    games: Game[];
    tickets: Ticket[];
    sheetSize: 3 | 6 | 10;
    onSelect: (ticketIds: string[]) => void;
    pendingTicketIds: string[];
}

export const SheetSelectionPopup: React.FC<SheetSelectionPopupProps> = ({ isOpen, onClose, games, tickets, sheetSize, onSelect, pendingTicketIds }) => {
    const [selectedStartTicket, setSelectedStartTicket] = useState<Ticket | null>(null);
    const pendingTicketIdsSet = useMemo(() => new Set(pendingTicketIds), [pendingTicketIds]);

    const handleConfirm = () => {
        if (!selectedStartTicket) return;

        const ticketIds: string[] = [];
        for (let i = 0; i < sheetSize; i++) {
            const ticket = tickets.find(t => t.serialNumber === selectedStartTicket.serialNumber + i && t.game === selectedStartTicket.game);
            if (ticket) ticketIds.push(ticket._id);
        }
        if ((ticketIds || []).length === sheetSize) {
            onSelect(ticketIds);
        }
    };
    
    const getTitle = (size: 3 | 6 | 10): string => {
        if (size === 3) return `Select Starting Ticket for Half Sheet (3)`;
        if (size === 6) return `Select Starting Ticket for Full Sheet (6)`;
        if (size === 10) return `Select Starting Ticket for 10-Ticket Bundle`;
        return `Select Starting Ticket for ${size}-Ticket Sheet`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" title={getTitle(sheetSize)}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {games.map(game => {
                    const gameTickets = tickets.filter(t => t.game === game._id && t.status === 'available').sort((a,b) => a.serialNumber - b.serialNumber);
                    if ((gameTickets || []).length < sheetSize) return null;

                    const validStartPoints = gameTickets.filter((ticket, index) => {
                        if (index + sheetSize > (gameTickets || []).length) return false;
                        
                        for (let i = 0; i < sheetSize; i++) {
                            const currentTicket = gameTickets[index + i];
                            if (pendingTicketIdsSet.has(currentTicket._id)) {
                                return false; // Ticket is part of a pending request
                            }
                            if (i > 0 && currentTicket.serialNumber !== gameTickets[index + i - 1].serialNumber + 1) {
                                return false; // Sequence is broken
                            }
                        }
                        return true;
                    });

                    if ((validStartPoints || []).length === 0) return null;

                    return (
                        <div key={game._id}>
                            <h3 className="font-bold mb-2 text-indigo-400">{game.title}</h3>
                            <div className="flex flex-wrap gap-2">
                                {validStartPoints.map(ticket => {
                                    const isSelected = selectedStartTicket && ticket._id === selectedStartTicket._id;
                                    return (
                                        <button 
                                            key={ticket._id} 
                                            onClick={() => setSelectedStartTicket(ticket)} 
                                            className={`font-semibold py-1 px-3 rounded-full text-sm transition-all duration-200 ${
                                                isSelected 
                                                ? 'bg-green-500 text-white ring-2 ring-offset-2 ring-offset-slate-800 ring-green-400' 
                                                : 'bg-slate-700 hover:bg-slate-600 text-gray-200'
                                            }`}
                                        >
                                            #{ticket.serialNumber} - #{ticket.serialNumber + sheetSize - 1}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                <button 
                    onClick={handleConfirm} 
                    disabled={!selectedStartTicket}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-500 disabled:cursor-not-allowed"
                >
                    Confirm Selection
                </button>
            </div>
        </Modal>
    );
};
