import React, { useMemo } from 'react';
import { mockDB } from '../../services/mockApi';
import { User } from '../../types';

interface LeaderboardProps {
    onBack: () => void;
    showBackButton?: boolean;
}

interface PlayerStats {
    wins: number;
    totalPrizeValue: number;
    player?: User;
}

const RankMedal: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank > 3) {
        return <span className="text-sm font-bold text-gray-400 w-8 text-center">{rank}</span>;
    }
    const colors = {
        1: 'text-yellow-400',
        2: 'text-gray-300',
        3: 'text-orange-400',
    };
    // @ts-ignore
    const medalColor = colors[rank];
    return (
        <span className={`text-2xl font-bold ${medalColor} w-8 text-center`}>
            {rank === 1 && '🥇'}
            {rank === 2 && '🥈'}
            {rank === 3 && '🥉'}
        </span>
    );
};

export const Leaderboard: React.FC<LeaderboardProps> = ({ onBack, showBackButton = true }) => {
    const leaderboardData = useMemo(() => {
        const playerStats: { [playerId: string]: PlayerStats } = {};

        mockDB.games.forEach(game => {
            game.prizes.forEach(prize => {
                if (prize.claimedBy && prize.claimedBy.length > 0) {
                    prize.claimedBy.forEach(winner => {
                        if (!playerStats[winner.playerId]) {
                            playerStats[winner.playerId] = {
                                wins: 0,
                                totalPrizeValue: 0,
                                player: mockDB.users.find(u => u._id === winner.playerId)
                            };
                        }
                        playerStats[winner.playerId].wins += 1;
                        const prizeValuePerWinner = (Number(prize.value) || 0) / prize.claimedBy.length;
                        playerStats[winner.playerId].totalPrizeValue += prizeValuePerWinner;
                    });
                }
            });
        });

        return Object.values(playerStats)
            .sort((a, b) => {
                if (b.wins !== a.wins) {
                    return b.wins - a.wins;
                }
                return b.totalPrizeValue - a.totalPrizeValue;
            });
    }, []);

    return (
        <div className="p-2">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-100">🏆 Player Leaderboard 🏆</h2>
                
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                    {leaderboardData.length > 0 ? leaderboardData.map((stats, index) => (
                        <div key={stats.player?._id || index} className="bg-slate-700/50 p-3 rounded-lg flex items-center hover:bg-slate-700 transition-colors shadow-sm">
                            <RankMedal rank={index + 1} />
                            <div className="flex items-center gap-3 ml-3 flex-grow">
                                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg overflow-hidden">
                                     {stats.player?.photo ? (
                                        <img src={stats.player.photo} alt={stats.player.name} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <span>{stats.player?.name.charAt(0) || '?'}</span>
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-100">{stats.player?.name || 'Unknown Player'}</p>
                                    <p className="text-xs text-gray-400">@{stats.player?.username || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="font-bold text-lg text-amber-300">{stats.wins} Wins</p>
                                <p className="text-xs text-gray-300">₹{stats.totalPrizeValue.toFixed(2)}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-gray-400 text-center py-8">No prize winners yet. The leaderboard is empty.</p>
                    )}
                </div>
            </div>
        </div>
    );
};