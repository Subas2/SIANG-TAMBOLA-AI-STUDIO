import React from 'react';
import { mockDB } from '../../services/mockApi';
import { useTheme } from '../../contexts/ThemeContext';

interface ActivePlayersProps {
    onBack: () => void;
}

export const ActivePlayers: React.FC<ActivePlayersProps> = ({ onBack }) => {
    const onlinePlayers = mockDB.users.filter(u => u.role === 'player');
    const { activeTheme } = useTheme();
    
    return (
        <div className="p-4">
            <div className="bg-white/50 backdrop-blur-md p-6 rounded-xl shadow-lg">
                <h2 className={`text-xl font-bold mb-4 ${activeTheme.cardTextColor}`}>Active Players ({onlinePlayers.length})</h2>
                <div className="space-y-2">
                    {onlinePlayers.map((player, index) => (
                        <div key={`${player._id}-${index}`} className="flex items-center gap-3 bg-green-50/80 p-2 rounded-md">
                             <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <p className="font-semibold text-gray-700">{player.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};