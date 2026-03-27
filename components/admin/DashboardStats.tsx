import React from 'react';
import { Game } from '../../types';
import { mockDB } from '../../services/mockApi';

interface DashboardStatsProps {
    games: Game[];
    onNavigate: (page: string) => void;
}

const StatCard: React.FC<{ label: string; value: string | number; subtext?: string; onClick?: () => void; icon: React.ReactNode; }> = ({ label, value, subtext, onClick, icon }) => (
    <button
        onClick={onClick}
        disabled={!onClick}
        className="bg-slate-700/70 p-1.5 rounded-lg shadow-sm hover:bg-slate-600/70 transition-colors duration-200 text-left w-full disabled:cursor-default disabled:hover:bg-slate-700/70"
    >
        <div className="flex items-start justify-between">
            <div className="flex-grow">
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-[11px] font-semibold text-gray-300">{label}</p>
            </div>
            <div className="p-1.5 bg-slate-800/50 rounded-full">
                {icon}
            </div>
        </div>
        {subtext && <p className="text-[9px] text-gray-400 mt-1">{subtext}</p>}
    </button>
);

export const DashboardStats: React.FC<DashboardStatsProps> = ({ games, onNavigate }) => {
    const ongoingGame = games.find(g => g.status === 'ongoing');

    let activePlayers = 0;
    let ticketsBooked: string | number = 'N/A';
    let prizesClaimed: string | number = 'N/A';
    let pendingClaims = 0;

    let activePlayersSubtext = "no ongoing game";
    let ticketsBookedSubtext = "no ongoing game";
    let prizesClaimedSubtext = "no ongoing game";
    let pendingClaimsSubtext = "total";

    if (ongoingGame) {
        const gameTickets = mockDB.tickets.filter(t => t.game === ongoingGame._id);
        const bookedTickets = gameTickets.filter(t => t.status === 'booked' && t.player);
        activePlayers = new Set(bookedTickets.map(t => t.player)).size;

        ticketsBooked = `${(bookedTickets || []).length} / ${(gameTickets || []).length}`;

        const claimedPrizesCount = (ongoingGame.prizes || []).filter(p => (p.claimedBy || []).length > 0).length;
        prizesClaimed = `${claimedPrizesCount} / ${(ongoingGame.prizes || []).length}`;

        pendingClaims = (mockDB.claims || []).filter(c => c.game === ongoingGame._id && c.status === 'pending').length;
        
        activePlayersSubtext = "in current game";
        ticketsBookedSubtext = "live";
        prizesClaimedSubtext = "live";
        pendingClaimsSubtext = "live";

    } else {
        const upcomingGames = games
            .filter(g => g.status === 'upcoming')
            .sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime());
        
        const nextUpcomingGame = upcomingGames[0];

        if (nextUpcomingGame) {
            const gameTickets = mockDB.tickets.filter(t => t.game === nextUpcomingGame._id);
            const bookedTickets = gameTickets.filter(t => t.status === 'booked');
            
            activePlayers = 0;
            ticketsBooked = `${(bookedTickets || []).length} / ${(gameTickets || []).length}`;
            prizesClaimed = `0 / ${(nextUpcomingGame.prizes || []).length}`;
            
            activePlayersSubtext = "upcoming game";
            ticketsBookedSubtext = "for next game";
            prizesClaimedSubtext = "for next game";

        } else {
            // No ongoing and no upcoming games, show hyphens
            ticketsBooked = '-';
            prizesClaimed = '-';
        }

        // Always show total pending claims when no game is live
        pendingClaims = (mockDB.claims || []).filter(c => c.status === 'pending').length;
    }

    return (
        <div className="p-2">
            <div className="grid grid-cols-4 gap-2">
                <StatCard
                    label="Active Players"
                    value={activePlayers}
                    subtext={activePlayersSubtext}
                    onClick={() => onNavigate('player_management')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                <StatCard
                    label="Tickets Booked"
                    value={ticketsBooked}
                    subtext={ticketsBookedSubtext}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" /></svg>}
                />
                <StatCard
                    label="Prizes Claimed"
                    value={prizesClaimed}
                    subtext={prizesClaimedSubtext}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>}
                />
                <StatCard
                    label="Pending Claims"
                    value={pendingClaims}
                    subtext={pendingClaimsSubtext}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
            </div>
        </div>
    );
};