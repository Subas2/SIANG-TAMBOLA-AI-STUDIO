import React, { useMemo, useState } from 'react';
import { Game, User, Ticket } from '../../types';
import { mockDB } from '../../services/mockApi';
import { DashboardTabs } from '../common/DashboardTabs';
import { AnimatedView } from '../common/AnimatedView';
import { Modal } from '../common/Modal';

interface AnalyticsDashboardProps {
    onBack: () => void;
    games: Game[];
}

interface PlayerStats {
    wins: number;
    totalPrizeValue: number;
    player?: User;
}

// Modal Component for displaying booked/unbooked tickets
interface BookedStatusTicketsModalProps {
    isOpen: boolean;
    games: Game[];
    tickets: Ticket[];
    viewType: 'booked' | 'unbooked';
    onClose: () => void;
}

const BookedStatusTicketsModal: React.FC<BookedStatusTicketsModalProps> = ({ isOpen, games, tickets, viewType, onClose }) => {
    const title = viewType === 'booked' ? "All Booked Tickets" : "All Unbooked Tickets";
    const filterStatus = viewType === 'booked' ? 'booked' : 'available';

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" title={title}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {games.map(game => {
                    const gameTickets = tickets.filter(t => t.game === game._id && t.status === filterStatus).sort((a,b) => a.serialNumber - b.serialNumber);
                    if ((gameTickets || []).length === 0) return null;

                    return (
                        <div key={game._id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                            <h3 className="font-bold text-indigo-400 mb-2">{game.title} ({(gameTickets || []).length} tickets)</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {gameTickets.map(ticket => (
                                    <div
                                        key={ticket._id}
                                        className={`w-10 h-6 flex items-center justify-center text-xs font-bold rounded ${
                                            viewType === 'booked'
                                                ? 'bg-green-500 text-white shadow-md'
                                                : 'bg-slate-700 text-gray-300'
                                        }`}
                                        title={`Ticket #${ticket.serialNumber}`}
                                    >
                                        {ticket.serialNumber}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
};

// Modal Component for displaying generated tickets
interface GeneratedTicketsModalProps {
    isOpen: boolean;
    games: Game[];
    tickets: Ticket[];
    onClose: () => void;
}

const GeneratedTicketsModal: React.FC<GeneratedTicketsModalProps> = ({ isOpen, games, tickets, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" title="All Generated Tickets">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {games.map(game => {
                    const gameTickets = tickets.filter(t => t.game === game._id).sort((a,b) => a.serialNumber - b.serialNumber);
                    if ((gameTickets || []).length === 0) return null;

                    return (
                        <div key={game._id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                            <h3 className="font-bold text-indigo-400 mb-2">{game.title} ({(gameTickets || []).length} tickets)</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {gameTickets.map(ticket => (
                                    <div
                                        key={ticket._id}
                                        className={`w-10 h-6 flex items-center justify-center text-xs font-bold rounded ${
                                            ticket.status === 'booked'
                                                ? 'bg-green-500 text-white shadow-md'
                                                : 'bg-slate-700 text-gray-300'
                                        }`}
                                        title={`Ticket #${ticket.serialNumber} - ${ticket.status}`}
                                    >
                                        {ticket.serialNumber}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
};

const StatCard: React.FC<{ label: string; value: string | number; subValue?: string, className?: string, onClick?: () => void }> = ({ label, value, subValue, className, onClick }) => (
    <div className={`bg-slate-800/80 p-3 rounded-lg shadow-md border border-slate-700 ${className} ${onClick ? 'cursor-pointer hover:bg-slate-700/80 transition-colors' : ''}`} onClick={onClick}>
        <p className="text-sm text-gray-400 truncate">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subValue && <p className="text-[10px] text-gray-500">{subValue}</p>}
    </div>
);

const LeaderboardList: React.FC<{ title: string; items: { name: string; value: string; photo?: string }[] }> = ({ title, items }) => (
    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
        <h3 className="text-sm font-semibold text-indigo-400 mb-2">{title}</h3>
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-800/50 p-1.5 rounded-md">
                    <div className="flex items-center gap-2 overflow-hidden">
                         <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                            {item.photo ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover rounded-full" /> : item.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-200 truncate">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-300 flex-shrink-0 ml-2">{item.value}</span>
                </div>
            ))}
        </div>
    </div>
);

const BarChart: React.FC<{ data: { name: string; value: string }[] }> = ({ data }) => {
    const chartData = useMemo(() => {
        return data.map(item => ({
            name: item.name,
            value: parseFloat(item.value.replace('₹', ''))
        })).filter(item => !isNaN(item.value));
    }, [data]);

    const { max, min, yAxisLabels, zeroLinePosition } = useMemo(() => {
        if ((chartData || []).length === 0) return { max: 100, min: -100, yAxisLabels: [], zeroLinePosition: 50 };
        
        const values = chartData.map(d => d.value);
        let maxVal = Math.max(0, ...values);
        let minVal = Math.min(0, ...values);
        
        const padding = (maxVal - minVal) * 0.1;
        maxVal += padding;
        minVal -= padding;

        if (minVal >= 0) minVal = 0;
        if (maxVal <= 0) maxVal = 0;
        
        if (maxVal === minVal) {
            maxVal += 100;
            minVal -= 100;
        }

        const range = maxVal - minVal;
        const numberOfTicks = 5;
        const labels = [];
        for (let i = 0; i <= numberOfTicks; i++) {
            const value = maxVal - (i * (range / numberOfTicks));
            labels.push({ value: Math.round(value) });
        }
        
        const zeroPos = range > 0 ? (maxVal / range) * 100 : 50;

        return { max: maxVal, min: minVal, yAxisLabels: labels, zeroLinePosition: zeroPos };
    }, [chartData]);
    
    if ((chartData || []).length === 0) {
        return <div className="text-center text-gray-400 py-8">No completed games with financial data.</div>;
    }

    return (
        <div className="w-full h-80 bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex gap-4">
            {/* Y-Axis */}
            <div className="h-full flex flex-col justify-between relative text-xs text-gray-400">
                {yAxisLabels.map(label => (
                    <span key={label.value} className="transform -translate-y-1/2">₹{label.value}</span>
                ))}
            </div>
            {/* Chart Area */}
            <div className="flex-grow h-full border-l border-slate-600 flex justify-around relative overflow-hidden">
                {/* Zero Line */}
                <div className="absolute w-full border-t border-slate-500" style={{ top: `${zeroLinePosition}%` }} />
                
                {/* Bars */}
                {chartData.map((item, index) => {
                    const isProfit = item.value >= 0;
                    const range = max - min;
                    const barHeightPercent = range > 0 ? (Math.abs(item.value) / range) * 100 : 0;
                    
                    const barStyle: React.CSSProperties = {
                        height: `${barHeightPercent}%`,
                        ...(isProfit ? { top: `${zeroLinePosition - barHeightPercent}%` } : { top: `${zeroLinePosition}%` })
                    };

                    return (
                        <div key={index} className="h-full w-full flex flex-col justify-end items-center group relative px-1">
                             <div 
                                className={`w-full max-w-8 rounded-t-sm transition-all duration-300 absolute ${isProfit ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'}`}
                                style={barStyle}
                             >
                                <div className="absolute left-1/2 -translate-x-1/2 w-max bg-slate-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bottom-full mb-2">
                                    <strong>{isProfit ? 'Profit' : 'Loss'}:</strong> ₹{item.value.toFixed(2)}
                                </div>
                             </div>
                             <span className="text-[10px] text-gray-400 text-center writing-mode-vertical-rl transform rotate-180 whitespace-nowrap h-24 truncate absolute -bottom-24">{item.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onBack, games }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'ticket_status'>('overview');
    const [isTicketListModalOpen, setIsTicketListModalOpen] = useState(false);
    const [ticketStatusModalView, setTicketStatusModalView] = useState<'booked' | 'unbooked' | null>(null);
    
    const analyticsData = useMemo(() => {
        // --- Part 1: Historical & Financial Stats (from completed games) ---
        const completedGames = games.filter(g => g.status === 'completed');
        
        let totalRevenue = 0;
        let totalPrizeMoney = 0;
        let totalAgentCommission = 0;
        
        const gameProfits: { name: string; value: string }[] = [];
        const agentCommissions: { [agentId: string]: { name: string; photo?: string, total: number } } = {};
        const playerStats: { [playerId: string]: PlayerStats } = {};

        completedGames.forEach(game => {
            const bookedTickets = mockDB.tickets.filter(t => t.game === game._id && t.status === 'booked');
            const gameRevenue = (bookedTickets || []).length * game.ticketPrice;
            const gamePrizeMoney = (game.prizes || []).reduce((sum, prize) => sum + ((prize.claimedBy || []).length > 0 ? Number(prize.value) : 0), 0);
            const gameAgentCommission = bookedTickets.reduce((sum, ticket) => sum + (ticket.commission || 0), 0);
            
            totalRevenue += gameRevenue;
            totalPrizeMoney += gamePrizeMoney;
            totalAgentCommission += gameAgentCommission;

            gameProfits.push({ name: game.title, value: `₹${(gameRevenue - gamePrizeMoney - gameAgentCommission).toFixed(2)}` });

            bookedTickets.forEach(ticket => {
                if(ticket.bookedByAgent && ticket.commission) {
                    const agent = mockDB.users.find(u => u._id === ticket.bookedByAgent);
                    if(agent) {
                        if(!agentCommissions[agent._id]) agentCommissions[agent._id] = { name: agent.name, photo: agent.photo, total: 0 };
                        agentCommissions[agent._id].total += ticket.commission;
                    }
                }
            });

            game.prizes.forEach(prize => {
                if (prize.claimedBy && (prize.claimedBy || []).length > 0) {
                     prize.claimedBy.forEach(winner => {
                        if (!playerStats[winner.playerId]) {
                            playerStats[winner.playerId] = {
                                wins: 0,
                                totalPrizeValue: 0,
                                player: mockDB.users.find(u => u._id === winner.playerId)
                            };
                        }
                        playerStats[winner.playerId].wins += 1;
                        const prizeValuePerWinner = (Number(prize.value) || 0) / (prize.claimedBy || []).length;
                        playerStats[winner.playerId].totalPrizeValue += prizeValuePerWinner;
                    });
                }
            });
        });

        const leaderboardData = Object.values(playerStats).sort((a, b) => b.totalPrizeValue - a.totalPrizeValue);
        const mvp = (leaderboardData || []).length > 0 ? { name: leaderboardData[0].player?.name || 'N/A', value: leaderboardData[0].totalPrizeValue } : { name: 'N/A', value: 0 };
        const topGames = gameProfits.sort((a, b) => parseFloat(b.value.slice(1)) - parseFloat(a.value.slice(1))).slice(0, 5);
        const topAgents = Object.values(agentCommissions).sort((a,b) => b.total - a.total).slice(0, 5).map(a => ({ name: a.name, photo: a.photo, value: `₹${a.total.toFixed(2)}` }));
        const bookedTicketsForCompletedGames = mockDB.tickets.filter(t => t.status === 'booked' && (completedGames || []).some(g => g._id === t.game)).length;
        const averageTicketsPerGame = (completedGames || []).length > 0 ? bookedTicketsForCompletedGames / (completedGames || []).length : 0;


        // --- Part 2: Live Ticket & Engagement Stats (from ALL games) ---
        const allGamesWithTickets = games.filter(g => g.tickets && (g.tickets || []).length > 0);
        const totalTicketsGenerated = allGamesWithTickets.reduce((sum, game) => sum + (game.tickets || []).length, 0);
        
        const allBookedTickets = mockDB.tickets.filter(t => t.status === 'booked' && t.player && allGamesWithTickets.some(g => g._id === t.game));
        const totalTicketsBooked = (allBookedTickets || []).length;
        const totalPlayers = new Set(allBookedTickets.map(t => t.player)).size;

        let halfSheetsBooked = 0;
        let fullSheetsBooked = 0;

        const playerTicketsByGame = allBookedTickets.reduce((acc, ticket) => {
            const key = `${ticket.game}-${ticket.player}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(ticket);
            return acc;
        }, {} as Record<string, Ticket[]>);

        for (const key in playerTicketsByGame) {
            const tickets = playerTicketsByGame[key].sort((a, b) => a.serialNumber - b.serialNumber);
            const checkedIndices = new Set<number>();

            for (let i = 0; i <= (tickets || []).length - 6; i++) {
                if (checkedIndices.has(i)) continue;
                let isFullSheet = true;
                for (let j = 0; j < 5; j++) {
                    if (tickets[i + j + 1].serialNumber !== tickets[i + j].serialNumber + 1) {
                        isFullSheet = false;
                        break;
                    }
                }
                if (isFullSheet) {
                    fullSheetsBooked++;
                    for (let j = 0; j < 6; j++) checkedIndices.add(i + j);
                }
            }
            for (let i = 0; i <= (tickets || []).length - 3; i++) {
                if (checkedIndices.has(i)) continue;
                let isHalfSheet = true;
                for (let j = 0; j < 2; j++) {
                    if (tickets[i + j + 1].serialNumber !== tickets[i + j].serialNumber + 1) {
                        isHalfSheet = false;
                        break;
                    }
                }
                if (isHalfSheet) {
                    halfSheetsBooked++;
                    for (let j = 0; j < 3; j++) checkedIndices.add(i + j);
                }
            }
        }
        
        const gameTicketStats = allGamesWithTickets.map(game => {
            const bookedCount = mockDB.tickets.filter(t => t.game === game._id && t.status === 'booked').length;
            const generatedCount = (game.tickets || []).length;
            return {
                id: game._id,
                title: game.title,
                generated: generatedCount,
                booked: bookedCount,
                unbooked: generatedCount - bookedCount,
                bookingPercentage: generatedCount > 0 ? (bookedCount / generatedCount) * 100 : 0
            };
        }).sort((a, b) => b.bookingPercentage - a.bookingPercentage);

        return {
            totalRevenue,
            totalPrizeMoney,
            totalAgentCommission,
            netProfit: totalRevenue - totalPrizeMoney - totalAgentCommission,
            totalCompletedGames: (completedGames || []).length,
            gameProfits,
            topGames,
            topAgents,
            averageTicketsPerGame,
            mvp,
            totalTicketsGenerated,
            totalTicketsBooked,
            bookingPercentage: totalTicketsGenerated > 0 ? (totalTicketsBooked / totalTicketsGenerated) * 100 : 0,
            gameTicketStats,
            totalPlayers,
            halfSheetsBooked,
            fullSheetsBooked,
        };

    }, [games]);

    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'ticket_status', label: 'Ticket Status' }
    ];
    
    const allGamesWithTickets = useMemo(() => games.filter(g => g.tickets && (g.tickets || []).length > 0), [games]);

    return (
        <div className="p-2">
            
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-lg space-y-4">
                <h2 className="text-xl font-bold text-center text-gray-100">Analytics Dashboard</h2>

                <DashboardTabs tabs={tabs} setActiveTab={setActiveTab as (tab: string) => void} activeTab={activeTab} />

                {activeTab === 'overview' && (
                    <AnimatedView className="space-y-4 pt-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-2">Financial Overview (Completed Games)</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                <StatCard label="Total Revenue" value={`₹${analyticsData.totalRevenue.toFixed(2)}`} subValue={`from ${analyticsData.totalCompletedGames} games`} />
                                <StatCard label="Prizes Paid Out" value={`- ₹${analyticsData.totalPrizeMoney.toFixed(2)}`} />
                                <StatCard label="Agent Commissions" value={`- ₹${analyticsData.totalAgentCommission.toFixed(2)}`} />
                                <StatCard 
                                    label="Net Profit" 
                                    value={`₹${analyticsData.netProfit.toFixed(2)}`}
                                    className={analyticsData.netProfit >= 0 ? 'bg-green-500/20 !border-green-500/50' : 'bg-red-500/20 !border-red-500/50'}
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-2">Net Profit Per Game (Completed)</h3>
                            <BarChart data={analyticsData.gameProfits} />
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-2">Engagement Metrics (All Games)</h3>
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                <StatCard label="Tickets Booked" value={analyticsData.totalTicketsBooked} />
                                <StatCard label="Avg Tickets/Game (Completed)" value={analyticsData.averageTicketsPerGame.toFixed(1)} />
                                <StatCard label="Unique Players" value={analyticsData.totalPlayers} />
                                <StatCard label="Half Sheets" value={analyticsData.halfSheetsBooked} />
                                <StatCard label="Full Sheets" value={analyticsData.fullSheetsBooked} />
                                <StatCard label="MVP (Completed Games)" value={analyticsData.mvp.name} subValue={`Won ₹${analyticsData.mvp.value.toFixed(2)}`} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <LeaderboardList title="🏆 Top 5 Profitable Games (Completed)" items={analyticsData.topGames} />
                            <LeaderboardList title="🌟 Top 5 Agents (by Commission)" items={analyticsData.topAgents} />
                        </div>
                    </AnimatedView>
                )}
                {activeTab === 'ticket_status' && (
                    <AnimatedView className="space-y-4 pt-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-2">Overall Ticket Status (All Games)</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <StatCard 
                                    label="Total Tickets Generated" 
                                    value={analyticsData.totalTicketsGenerated}
                                    onClick={() => setIsTicketListModalOpen(true)}
                                />
                                <StatCard
                                    label="Total Tickets Booked"
                                    value={analyticsData.totalTicketsBooked}
                                    onClick={() => setTicketStatusModalView('booked')}
                                />
                                <StatCard
                                    label="Unbooked Tickets"
                                    value={analyticsData.totalTicketsGenerated - analyticsData.totalTicketsBooked}
                                    onClick={() => setTicketStatusModalView('unbooked')}
                                />
                                <StatCard label="Booking Rate" value={`${analyticsData.bookingPercentage.toFixed(1)}%`} className="bg-sky-500/20 !border-sky-500/50" />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                            <h3 className="text-sm font-semibold text-indigo-400 mb-2">Per-Game Ticket Status</h3>
                            <div className="max-h-[40vh] overflow-y-auto pr-2">
                                <div className="space-y-2">
                                    <div className="grid grid-cols-5 gap-2 text-xs font-bold text-gray-400 px-2 pb-1 border-b border-slate-700 sticky top-0 bg-slate-900/50 z-10">
                                        <div className="col-span-2">Game Title</div>
                                        <div className="text-right">Booked</div>
                                        <div className="text-right">Unbooked</div>
                                        <div className="text-right">Rate</div>
                                    </div>
                                    {analyticsData.gameTicketStats.map(stat => (
                                        <div key={stat.id} className="grid grid-cols-5 gap-2 text-sm text-gray-200 px-2 py-1.5 bg-slate-800/50 rounded-md items-center">
                                            <div className="col-span-2 truncate">{stat.title}</div>
                                            <div className="text-right">{stat.booked}/{stat.generated}</div>
                                            <div className="text-right">{stat.unbooked}</div>
                                            <div className="text-right font-semibold">
                                                <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1" title={`${stat.bookingPercentage.toFixed(1)}%`}>
                                                    <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${stat.bookingPercentage}%` }}></div>
                                                </div>
                                                <span className="text-xs text-amber-300">{stat.bookingPercentage.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </AnimatedView>
                )}
            </div>
            
            <GeneratedTicketsModal
                isOpen={isTicketListModalOpen}
                games={allGamesWithTickets}
                tickets={mockDB.tickets}
                onClose={() => setIsTicketListModalOpen(false)}
            />
            
            {ticketStatusModalView && (
                <BookedStatusTicketsModal
                    isOpen={!!ticketStatusModalView}
                    games={allGamesWithTickets}
                    tickets={mockDB.tickets}
                    viewType={ticketStatusModalView}
                    onClose={() => setTicketStatusModalView(null)}
                />
            )}
        </div>
    );
};
