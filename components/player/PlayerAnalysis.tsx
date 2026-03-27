import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Game, Ticket } from '../../types';

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="bg-slate-900/50 p-2 rounded-lg flex items-center gap-2 border border-slate-700">
        <div className="p-2 bg-indigo-500/20 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
        </div>
    </div>
);

export const PlayerAnalysis: React.FC<{ games: Game[], tickets: Ticket[] }> = ({ games, tickets }) => {
    const { user } = useAuth();

    const stats = useMemo(() => {
        if (!user) return { totalTicketsBooked: 0, totalGamesPlayed: 0, totalPrizeMoneyWon: 0, claims: [] };
        
        const playerTickets = tickets.filter(t => t.player === user._id);
        const totalTicketsBooked = (playerTickets || []).length;

        const gameIds = [...new Set(playerTickets.map(t => t.game))];
        const totalGamesPlayed = (gameIds || []).length;
        
        let totalPrizeMoneyWon = 0;
        const claims: { gameTitle: string, prizeName: string, prizeValue: string }[] = [];

        games.forEach(game => {
            game.prizes.forEach(prize => {
                const playerWins = prize.claimedBy.filter(winner => winner.playerId === user._id);
                if ((playerWins || []).length > 0) {
                    const prizeValuePerWinner = (Number(prize.value) || 0) / (prize.claimedBy || []).length;
                    totalPrizeMoneyWon += prizeValuePerWinner * (playerWins || []).length;
                    playerWins.forEach(win => {
                        claims.push({
                            gameTitle: game.title,
                            prizeName: prize.name,
                            prizeValue: prizeValuePerWinner.toFixed(2),
                        });
                    });
                }
            });
        });

        return { totalTicketsBooked, totalGamesPlayed, totalPrizeMoneyWon, claims };
    }, [user, games, tickets]);

    return (
        <div className="animate-fade-in-up">
            <div className="bg-slate-800/60 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-700/50">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">My Lifetime Analysis</h2>
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <StatCard 
                        value={stats.totalGamesPlayed} 
                        label="Games Played" 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>} 
                    />
                    <StatCard 
                        value={stats.totalTicketsBooked} 
                        label="Tickets Booked" 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" /></svg>}
                    />
                    <StatCard 
                        value={`₹${stats.totalPrizeMoneyWon.toFixed(2)}`} 
                        label="Prizes Won" 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>}
                    />
                </div>
                
                <h3 className="text-xl font-bold text-gray-200 mb-3">My Winnings</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {(stats.claims || []).length > 0 ? (
                        stats.claims.map((claim, index) => (
                            <div key={index} className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-100">{claim.prizeName}</p>
                                    <p className="text-xs text-gray-400">{claim.gameTitle}</p>
                                </div>
                                <p className="font-bold text-lg text-green-400">₹{claim.prizeValue}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-center py-4">You haven't won any prizes yet. Keep playing!</p>
                    )}
                </div>
            </div>
        </div>
    );
};