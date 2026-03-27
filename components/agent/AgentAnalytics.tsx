import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockDB } from '../../services/mockApi';
import { User, Ticket, Game, Payment } from '../../types';

interface AgentAnalyticsProps {
    onBack: () => void;
    games: Game[];
    tickets: Ticket[];
    payments: Payment[];
}

const StatCard: React.FC<{ label: string; value: string | number; subValue?: string, className?: string }> = ({ label, value, subValue, className }) => (
    <div className={`bg-slate-800/80 p-1.5 rounded-md shadow-sm border border-slate-700 ${className}`}>
        <p className="text-[10px] text-gray-400 truncate">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
        {subValue && <p className="text-[8px] text-gray-500">{subValue}</p>}
    </div>
);

const InfoList: React.FC<{ title: string; items: { primary: string; secondary: string; value: string }[] }> = ({ title, items }) => (
     <div className="bg-slate-900/50 p-1.5 rounded-md border border-slate-700">
        <h3 className="text-sm font-semibold text-indigo-400 mb-1 px-1">{title}</h3>
        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {(items || []).length > 0 ? (items || []).map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-800/50 p-1 rounded-sm">
                    <div className="overflow-hidden">
                        <p className="text-[11px] font-medium text-gray-200 truncate">{item.primary}</p>
                        <p className="text-[9px] text-gray-400 truncate">{item.secondary}</p>
                    </div>
                    <span className="text-xs font-bold text-amber-300 flex-shrink-0 ml-1">{item.value}</span>
                </div>
            )) : <p className="text-xs text-gray-500 text-center py-2">No data available.</p>}
        </div>
    </div>
);


export const AgentAnalytics: React.FC<AgentAnalyticsProps> = ({ onBack, games, tickets, payments }) => {
    const { user } = useAuth();

    const analyticsData = useMemo(() => {
        if (!user) {
            return {
                // Sales & Commission
                totalTicketsBooked: 0,
                totalSalesValue: 0,
                earnedCommission: 0,
                projectedCommission: 0,
                // Payment Overview
                totalCollected: 0,
                pendingConfirmations: 0,
                toSettle: 0,
                // Performance
                uniquePlayers: 0,
                avgTicketsPerPlayer: 0,
                ongoingGamesCount: 0,
                topEarningGame: 'N/A',
                // Lists
                salesOpportunities: [],
                recentPayments: [],
                topPlayers: [],
            };
        }
        
        const myBookedTickets = (tickets || []).filter(t => t.bookedByAgent === user._id);
        const myPayments = (payments || []).filter(p => p.agentId === user._id);

        // Sales & Commission
        const totalTicketsBooked = (myBookedTickets || []).length;
        let earnedCommission = 0;
        let projectedCommission = 0;
        let totalSalesValue = 0;

        myBookedTickets.forEach(ticket => {
            const game = (games || []).find(g => g._id === ticket.game);
            if (game) {
                totalSalesValue += game.ticketPrice;
                if (game.status === 'completed') {
                    earnedCommission += ticket.commission || 0;
                } else {
                    projectedCommission += ticket.commission || 0;
                }
            }
        });

        // Payment Overview
        const totalCollected = myPayments
            .filter(p => p.status === 'paid_by_agent' || p.status === 'approved')
            .reduce((sum, p) => sum + p.amount, 0);

        const pendingConfirmations = (myPayments || []).filter(p => p.status === 'pending_agent_confirmation').length;
        
        const toSettle = myPayments
            .filter(p => p.status === 'paid_by_agent')
            .reduce((sum, p) => sum + p.amount, 0);

        // Performance
        const uniquePlayers = new Set(myBookedTickets.map(t => t.player).filter(Boolean)).size;
        const avgTicketsPerPlayer = uniquePlayers > 0 ? (totalTicketsBooked / uniquePlayers) : 0;

        const ongoingGameIds = new Set(myBookedTickets
            .map(ticket => (games || []).find(g => g._id === ticket.game))
            .filter((g): g is Game => !!g && g.status === 'ongoing')
            .map(g => g._id));
        const ongoingGamesCount = ongoingGameIds.size;
        
        const commissionByGame: { [gameId: string]: { game: Game, total: number } } = {};
        myBookedTickets.forEach(ticket => {
            const game = (games || []).find(g => g._id === ticket.game);
            if (game && game.status === 'completed') {
                if (!commissionByGame[game._id]) commissionByGame[game._id] = { game, total: 0 };
                commissionByGame[game._id].total += ticket.commission || 0;
            }
        });
        const topEarningGame = Object.values(commissionByGame).sort((a,b) => b.total - a.total)[0]?.game.title || 'N/A';
        
        // Lists
        const salesOpportunityGames = Array.from(new Set(myBookedTickets
            .map(t => (games || []).find(g => g._id === t.game))
            .filter((g): g is Game => !!g && (g.status === 'ongoing' || g.status === 'upcoming'))
        ));

        const salesOpportunities = salesOpportunityGames.map(game => {
            const totalTickets = (tickets || []).filter(t => t.game === game._id).length;
            const bookedTickets = (tickets || []).filter(t => t.game === game._id && t.status === 'booked').length;
            return {
                primary: game.title,
                secondary: game.status,
                value: `${totalTickets - bookedTickets} left`
            };
        }).filter(item => parseInt(item.value) > 0);

        const recentPayments = myPayments
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map(p => ({
                primary: p.playerName,
                secondary: new Date(p.created_at).toLocaleDateString(),
                value: `₹${p.amount}`
            }));

        const playerTicketCounts = myBookedTickets.reduce((acc, ticket) => {
            if (ticket.player) {
                acc[ticket.player] = (acc[ticket.player] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const topPlayers = Object.entries(playerTicketCounts)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, 5)
            .map(([playerId, count]) => {
                return {
                    primary: 'Player ' + playerId.slice(-4),
                    secondary: '',
                    value: `${count} Tix`
                };
            });

        return {
            totalTicketsBooked,
            totalSalesValue,
            earnedCommission,
            projectedCommission,
            totalCollected,
            pendingConfirmations,
            toSettle,
            uniquePlayers,
            avgTicketsPerPlayer: avgTicketsPerPlayer.toFixed(1),
            ongoingGamesCount,
            topEarningGame,
            salesOpportunities,
            recentPayments,
            topPlayers,
        };

    }, [user, games, tickets, payments]);

    return (
        <div className="p-1 animate-fade-in-up">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-1.5 rounded-lg shadow-lg space-y-2">
                <h2 className="text-lg font-bold text-center text-gray-100">My Analysis</h2>
                
                {/* Sales & Commission */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-1 px-1">Sales & Commission</h3>
                    <div className="grid grid-cols-2 gap-1.5">
                        <StatCard label="Tickets Booked" value={analyticsData.totalTicketsBooked} />
                        <StatCard label="Total Sales Value" value={`₹${analyticsData.totalSalesValue.toFixed(2)}`} />
                        <StatCard label="Earned Commission" value={`₹${analyticsData.earnedCommission.toFixed(2)}`} subValue="(Completed)" className="bg-green-500/20 !border-green-500/50"/>
                        <StatCard label="Projected Commission" value={`₹${analyticsData.projectedCommission.toFixed(2)}`} subValue="(Active)" className="bg-sky-500/20 !border-sky-500/50"/>
                    </div>
                </div>

                {/* Payment Overview */}
                 <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-1 px-1">Payment Overview</h3>
                    <div className="grid grid-cols-3 gap-1.5">
                        <StatCard label="Total Collected" value={`₹${analyticsData.totalCollected.toFixed(2)}`} />
                        <StatCard label="Pending Confirm" value={analyticsData.pendingConfirmations} className="bg-yellow-500/20 !border-yellow-500/50" />
                        <StatCard label="To Settle (Admin)" value={`₹${analyticsData.toSettle.toFixed(2)}`} />
                    </div>
                </div>

                {/* Performance */}
                 <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-1 px-1">Performance</h3>
                    <div className="grid grid-cols-4 gap-1.5">
                        <StatCard label="Unique Players" value={analyticsData.uniquePlayers} />
                        <StatCard label="Avg Tix/Player" value={analyticsData.avgTicketsPerPlayer} />
                        <StatCard label="Ongoing Games" value={analyticsData.ongoingGamesCount} />
                        <StatCard label="Top Earning Game" value={analyticsData.topEarningGame} className="col-span-4" />
                    </div>
                </div>

                {/* Lists */}
                 <div className="space-y-1.5">
                    <InfoList title="Sales Opportunities" items={analyticsData.salesOpportunities} />
                    <InfoList title="Recent Payments" items={analyticsData.recentPayments} />
                    <InfoList title="Top Players" items={analyticsData.topPlayers} />
                </div>
            </div>
        </div>
    );
};