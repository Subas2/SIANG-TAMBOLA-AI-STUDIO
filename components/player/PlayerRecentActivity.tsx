import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Game, Ticket } from '../../types';

const StatCard: React.FC<{ value: number; label: string; icon: React.ReactNode }> = ({ value, label, icon }) => (
    <div className="bg-slate-900/50 p-3 rounded-lg flex items-center gap-3">
        <div className="p-2 bg-indigo-500/20 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
        </div>
    </div>
);

export const PlayerRecentActivity: React.FC<{ games: Game[], tickets: Ticket[], claims: any[] }> = ({ games, tickets, claims }) => {
    const { user } = useAuth();

    const stats = useMemo(() => {
        if (!user) return { gamesJoined: 0, ticketsBooked: 0, claimsMade: 0 };

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoTimestamp = sevenDaysAgo.getTime();
        
        const gamesMap = new Map<string, Game>(games.map(g => [g._id, g]));

        // Calculate tickets and games
        const recentTickets = tickets.filter(ticket => {
            if (ticket.player !== user._id) return false;
            const game = gamesMap.get(ticket.game);
            if (!game) return false;
            // Note: Game time can be in "HH:mm" or "H:mm AM/PM". `new Date()` handles both.
            const gameDate = new Date(`${game.date} ${game.time}`).getTime();
            return gameDate >= sevenDaysAgoTimestamp;
        });

        const ticketsBooked = (recentTickets || []).length;
        const gamesJoined = new Set(recentTickets.map(t => t.game)).size;

        // Calculate claims
        const claimsMade = claims.filter(claim => {
            if (claim.player !== user._id) return false;
            const timestampString = claim._id.replace('claim', '');
            if (!/^\d+$/.test(timestampString)) return false; // Ensure it's a number
            
            const timestamp = parseInt(timestampString, 10);
            return timestamp >= sevenDaysAgoTimestamp;
        }).length;

        return { gamesJoined, ticketsBooked, claimsMade };
    }, [user, games, tickets, claims]);

    if (stats.gamesJoined === 0 && stats.ticketsBooked === 0 && stats.claimsMade === 0) {
        return null;
    }

    return (
        <div className="mt-2 bg-slate-800/60 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-700/50">
            <h3 className="text-sm font-bold text-gray-200 text-center mb-2">Recent Activity (Last 7 Days)</h3>
            <div className="grid grid-cols-3 gap-2">
                <StatCard
                    value={stats.gamesJoined}
                    label="Games Joined"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>}
                />
                <StatCard
                    value={stats.ticketsBooked}
                    label="Tickets Booked"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" /></svg>}
                />
                <StatCard
                    value={stats.claimsMade}
                    label="Claims Made"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
            </div>
        </div>
    );
};
