import React from 'react';
import { Prize } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface DividendsListProps {
    prizes: Prize[];
}

export const DividendsList: React.FC<DividendsListProps> = React.memo(({ prizes }) => {
    const { activeTheme } = useTheme();
    if (!prizes || (prizes || []).length === 0) {
        return null;
    }

    return (
        <div className="mt-4 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-4 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-center text-gray-200 mb-2">Winning Pattern Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {prizes.map(prize => {
                    const winners = prize.claimedBy;
                    const isClaimed = winners && (winners || []).length > 0;
                    const numericPrizeValue = Number(prize.value) || 0;
                    const dividedValue = isClaimed ? (numericPrizeValue / (winners || []).length).toFixed(2) : numericPrizeValue.toFixed(2);

                    return (
                        <div 
                            key={prize.name} 
                            className={`p-2 rounded-lg text-sm transition-all duration-300 ${
                                isClaimed
                                    ? 'bg-green-500/30 border-2 border-green-500/50' 
                                    : 'bg-yellow-500/20'
                            }`}
                        >
                            <p className="font-bold text-gray-100">{prize.name}</p>
                            <p className="text-xs text-gray-400">
                                Prize: <span className="font-bold text-amber-300">₹{dividedValue}/-</span> {isClaimed && (winners || []).length > 1 ? `(shared)` : ''}
                            </p>
                            {isClaimed && (
                                <div className="text-xs text-green-300 font-semibold mt-1">
                                    {winners.map((winner, index) => (
                                        <div key={index} className="break-words">Won by: {winner.name} (Tkt #{winner.ticketId})</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});