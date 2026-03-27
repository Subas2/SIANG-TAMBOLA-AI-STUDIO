import React from 'react';
import { Game } from '../../types';

interface WinnerManagementProps {
    onBack: () => void;
    games: Game[];
}

export const WinnerManagement: React.FC<WinnerManagementProps> = ({ onBack, games }) => {
    const completedGames = games.filter(g => g.status === 'completed');

    return (
        <div className="p-2">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-gray-100">Winners History</h2>
                <div className="space-y-4">
                    {(completedGames || []).length > 0 ? (completedGames || []).map(game => {
                        const winnersByPrize = (game.prizes || []).filter(p => p.claimedBy && (p.claimedBy || []).length > 0);
                        if ((winnersByPrize || []).length === 0) return null;

                        return (
                            <div key={game._id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                                <h3 className="font-bold text-indigo-400 mb-2">{game.title} - {new Date(game.date).toLocaleDateString()}</h3>
                                <div className="space-y-1">
                                    {winnersByPrize.map((prize, index) => (
                                        <div key={`${prize.name}-${index}`} className="flex justify-between items-start text-sm bg-slate-800/50 p-2 rounded">
                                            <div>
                                                <p className="font-semibold text-gray-200">{prize.name}</p>
                                                <p className="text-xs text-gray-400">Prize: ₹{prize.value}</p>
                                            </div>
                                            <div className="text-right">
                                                {prize.claimedBy.map((winner, wIndex) => (
                                                    <div key={`${winner.playerId}-${wIndex}`} className="mb-1 last:mb-0">
                                                        <p className="font-medium text-gray-100">{winner.name}</p>
                                                        <p className="text-xs text-gray-400">Ticket #{winner.ticketId}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }) : (
                        <p className="text-gray-400 text-center">No completed games with winners found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
