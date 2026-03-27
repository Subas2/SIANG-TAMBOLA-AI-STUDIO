import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { mockDB, api, subscribeToDbChanges } from '../../services/mockApi';
import { User, Ticket, Game } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmationPopup } from '../common/ConfirmationPopup';

// --- Player Details Modal Component ---
// This modal is used for the "View Details" action and remains for detailed views.
interface PlayerDetailsModalProps {
    isOpen: boolean;
    player: User;
    onClose: () => void;
    games: Game[];
    tickets: Ticket[];
}

interface GroupedTickets {
    game: Game;
    tickets: Ticket[];
}

const StatCard: React.FC<{ label: string; value: string | number; }> = ({ label, value }) => (
    <div className="bg-slate-800/70 p-2 rounded-lg text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold mt-1 text-white">{value}</p>
    </div>
);


const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({ isOpen, player, onClose, games, tickets }) => {
    
    const stats = useMemo(() => {
        const playerTickets = tickets.filter(t => t.player === player._id);
        const totalTicketsBooked = (playerTickets || []).length;

        const gameIds = [...new Set(playerTickets.map(t => t.game))];
        const totalGamesPlayed = (gameIds || []).length;
        
        let totalPrizeMoneyWon = 0;
        games.forEach(game => {
            game.prizes.forEach(prize => {
                const playerWins = prize.claimedBy.filter(winner => winner.playerId === player._id);
                if ((playerWins || []).length > 0) {
                    const prizeValuePerWinner = (Number(prize.value) || 0) / (prize.claimedBy || []).length;
                    totalPrizeMoneyWon += prizeValuePerWinner * (playerWins || []).length;
                }
            });
        });

        const groupedTickets = gameIds.reduce((acc, gameId) => {
            const game = games.find(g => g._id === gameId);
            if(game) {
                acc.push({
                    game,
                    tickets: playerTickets.filter(t => t.game === gameId).sort((a,b) => a.serialNumber - b.serialNumber)
                });
            }
            return acc;
        }, [] as GroupedTickets[]).sort((a, b) => new Date(b.game.date).getTime() - new Date(a.game.date).getTime());

        return { totalTicketsBooked, totalGamesPlayed, totalPrizeMoneyWon, groupedTickets };
    }, [player._id, games, tickets]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" hideHeader disableContentPadding>
            <div className="w-full max-w-md text-white flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 flex items-center gap-4 relative border-b border-slate-700">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-indigo-400">
                        {player.photo ? (
                            <img src={player.photo} alt={player.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <span className="text-xl font-bold">{player.name.charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{player.name}</h2>
                        <p className="text-sm text-gray-400">@{player.username}</p>
                    </div>
                    <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        <StatCard label="Games Played" value={stats.totalGamesPlayed} />
                        <StatCard label="Tickets Booked" value={stats.totalTicketsBooked} />
                        <StatCard label="Prizes Won" value={`₹${stats.totalPrizeMoneyWon.toFixed(2)}`} />
                    </div>
                    
                    {/* Booking History */}
                    <div>
                        <h3 className="text-base font-semibold mb-2 text-gray-300">Booking History</h3>
                        <div className="space-y-3">
                            {(stats.groupedTickets || []).length > 0 ? (stats.groupedTickets || []).map(({ game, tickets }, gameIndex) => (
                                <div key={`${game._id}-${gameIndex}`} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold text-indigo-400">{game.title}</h4>
                                        <span className="text-xs text-gray-400">{new Date(game.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tickets.map((ticket, ticketIndex) => (
                                            <div key={`${ticket._id}-${ticketIndex}`} className="bg-slate-700 text-gray-200 text-xs font-mono font-bold px-2 py-1 rounded-full">
                                                #{ticket.serialNumber}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-gray-500 text-center py-4">No booking history found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};


// --- Main PlayerManagement Component ---

interface PlayerManagementProps {
    onBack: () => void;
    games: Game[];
    tickets: Ticket[];
    dbUsers: User[];
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({ onBack, games, tickets, dbUsers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
    const toast = useToast();
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

    const [playerData, setPlayerData] = useState<{ allPlayers: User[], activePlayerIds: Set<string>, vipPlayerIds: Set<string> }>({
        allPlayers: [],
        activePlayerIds: new Set(),
        vipPlayerIds: new Set()
    });

    const fetchPlayerData = useCallback(() => {
        const allPlayers = dbUsers.filter(u => u.role === 'player');
        
        const activeGameIds = new Set(
            games
                .filter(g => g.status === 'ongoing' || g.status === 'upcoming')
                .map(g => g._id)
        );
        const activePlayerIds = new Set(
            tickets
                .filter(t => t.player && t.status === 'booked' && activeGameIds.has(t.game))
                .map(t => t.player as string)
        );

        const VIP_TICKET_THRESHOLD = 20;
        const VIP_WINNINGS_THRESHOLD = 1000;
        const vipPlayerIds = new Set<string>();

        allPlayers.forEach(player => {
            const totalTicketsBooked = tickets.filter(t => t.player === player._id).length;
            if (totalTicketsBooked > VIP_TICKET_THRESHOLD) {
                vipPlayerIds.add(player._id);
                return;
            }

            let totalWinnings = 0;
            games.forEach(game => {
                game.prizes.forEach(prize => {
                    const wins = prize.claimedBy.filter(c => c.playerId === player._id);
                    if ((wins || []).length > 0) {
                        const valuePerWinner = Number(prize.value) / (prize.claimedBy || []).length;
                        totalWinnings += valuePerWinner * (wins || []).length;
                    }
                });
            });

            if (totalWinnings > VIP_WINNINGS_THRESHOLD) {
                vipPlayerIds.add(player._id);
            }
        });
        
        setPlayerData({ allPlayers, activePlayerIds, vipPlayerIds });
    }, [games, tickets]);

    useEffect(() => {
        fetchPlayerData();
        const unsubscribe = subscribeToDbChanges(fetchPlayerData);
        return () => unsubscribe();
    }, [fetchPlayerData]);

    const { allPlayers, activePlayerIds, vipPlayerIds } = playerData;

    const filteredPlayers = useMemo(() => {
        if (!searchTerm) return allPlayers;
        return allPlayers.filter(player => 
            (player.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
            (player.username || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
            (player.phone && player.phone.includes(searchTerm))
        );
    }, [allPlayers, searchTerm]);
    
    const handleBlockPlayerRequest = async (player: User) => {
        const actionText = player.isBlocked ? 'Unblock' : 'Block';
        setConfirmAction({
            message: `Are you sure you want to ${(actionText || '').toLowerCase()} ${player.name}?`,
            onConfirm: async () => {
                try {
                    await api.admin.togglePlayerBlockStatus({ userId: player._id });
                    toast.show(`Player ${player.name} has been ${(actionText || '').toLowerCase()}ed.`);
                } catch (error) {
                    toast.show((error as Error).message, { type: 'error' });
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    };

    const tableHeaders = ["Player", "Contact", "Agent", "Games", "Spending", "Status", "Actions"];

    return (
        <div className="p-2">

            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-lg mb-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold text-gray-100">Player Management</h2>
                    <div className="relative w-full sm:w-1/3">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search players..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 pl-10 text-sm border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                        <p className="text-xs text-gray-400">Total Players</p>
                        <p className="text-xl font-bold text-white">{(allPlayers || []).length}</p>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                        <p className="text-xs text-gray-400">Active Players</p>
                        <p className="text-xl font-bold text-green-400">{activePlayerIds.size}</p>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                        <p className="text-xs text-gray-400">VIP Players 👑</p>
                        <p className="text-xl font-bold text-amber-400">{vipPlayerIds.size}</p>
                    </div>
                </div>
            </div>

             <div className="overflow-x-auto rounded-xl shadow-lg border border-slate-700">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-500 uppercase bg-slate-200">
                        <tr>
                            {tableHeaders.map(header => (
                                <th key={header} scope="col" className="px-4 py-3 font-semibold tracking-wider">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {filteredPlayers.map((player, index) => {
                            const playerTickets = tickets.filter(t => t.player === player._id);
                            
                            const dayOffset = (player.name.charCodeAt(0) + (parseInt(player._id.replace(/[^0-9]/g, '') || '1'))) % 150;
                            const joinDate = new Date();
                            joinDate.setDate(joinDate.getDate() - dayOffset);
                            const formattedJoinDate = joinDate.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' });

                            const latestTicketInfo = (playerTickets || []).length > 0 ? playerTickets
                                .map(t => ({ ticket: t, game: games.find(g => g._id === t.game) }))
                                .filter(item => item.game)
                                .sort((a, b) => new Date(`${b.game!.date} ${b.game!.time}`).getTime() - new Date(`${a.game!.date} ${a.game!.time}`).getTime())[0] : null;
                            
                            const lastActiveDate = latestTicketInfo ? new Date(latestTicketInfo.game!.date).toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' }) : 'N/A';
                            const agent = latestTicketInfo?.ticket.bookedByAgent ? mockDB.users.find(u => u._id === latestTicketInfo.ticket.bookedByAgent) : null;
                            const agentName = agent ? agent.name : 'N/A';

                            const gamesPlayed = new Set(playerTickets.map(t => t.game)).size;
                            
                            const totalSpending = playerTickets.reduce((sum, ticket) => {
                                const game = games.find(g => g._id === ticket.game);
                                return sum + (game?.ticketPrice || 0);
                            }, 0);
                            
                            let totalWinnings = 0;
                            games.forEach(game => {
                                game.prizes.forEach(prize => {
                                    const wins = prize.claimedBy.filter(c => c.playerId === player._id);
                                    if ((wins || []).length > 0) {
                                        const valuePerWinner = Number(prize.value) / (prize.claimedBy || []).length;
                                        totalWinnings += valuePerWinner * (wins || []).length;
                                    }
                                });
                            });

                            const isVIP = vipPlayerIds.has(player._id);
                            const isActive = activePlayerIds.has(player._id);
                            let status, statusClass;
                            if (player.isBlocked) {
                                status = 'Blocked';
                                statusClass = 'bg-red-100 text-red-800';
                            } else if (isVIP) {
                                status = 'Vip';
                                statusClass = 'bg-purple-100 text-purple-800';
                            } else if (isActive) {
                                status = 'Active';
                                statusClass = 'bg-green-100 text-green-800';
                            } else {
                                status = 'Inactive';
                                statusClass = 'bg-gray-100 text-gray-800';
                            }
                            
                            return (
                                <tr key={`${player._id}-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-10 h-10 rounded-full flex-shrink-0 bg-gray-200 flex items-center justify-center overflow-hidden">
                                                {isVIP && <span className="absolute top-0 right-0 text-amber-500 text-lg" style={{transform: 'translate(20%, -20%)'}}>👑</span>}
                                                {player.photo ? <img src={player.photo} alt={player.name} className="w-full h-full object-cover" loading="lazy" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{player.name}</div>
                                                <div className="text-xs text-gray-500">Joined: {formattedJoinDate}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-gray-800">{player.email || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{player.phone || 'N/A'}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-gray-800">{agentName}</div>
                                        <div className="text-xs text-gray-500">Last active: {lastActiveDate}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-gray-800 font-semibold">{gamesPlayed}</div>
                                        <div className="text-xs text-gray-500">Games played</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-gray-800 font-semibold">₹{totalSpending.toLocaleString('en-IN')}</div>
                                        <div className="text-xs text-green-600 font-medium">+₹{totalWinnings.toLocaleString('en-IN')} won</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}>{status}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3 text-gray-500">
                                            <button onClick={() => setSelectedPlayer(player)} className="hover:text-blue-600" title="Inspect Player">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                            </button>
                                            <button className="hover:text-blue-600 disabled:opacity-50" title="Chat (coming soon)" disabled>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.03-3.239A8.962 8.962 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM4.72 14.28A7 7 0 0010 16a7 7 0 005.28-2.72A7 7 0 0010 4a7 7 0 00-5.28 2.72 7 7 0 000 7.56z" clipRule="evenodd" /></svg>
                                            </button>
                                            <button onClick={() => handleBlockPlayerRequest(player)} className="hover:opacity-75" title={player.isBlocked ? "Unblock Player" : "Block Player"}>
                                                {player.isBlocked ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                 {(filteredPlayers || []).length === 0 && (
                     <div className="text-center py-8 bg-white">
                        <p className="text-gray-500">No players found matching your search.</p>
                    </div>
                )}
            </div>
            
            {selectedPlayer && (
                <PlayerDetailsModal isOpen={!!selectedPlayer} player={selectedPlayer} onClose={() => setSelectedPlayer(null)} games={games} tickets={tickets} />
            )}
            <ConfirmationPopup
                isOpen={!!confirmAction}
                message={confirmAction?.message || ''}
                onConfirm={confirmAction?.onConfirm || (() => {})}
                onClose={() => setConfirmAction(null)}
            />
        </div>
    );
};