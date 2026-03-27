import React from 'react';
import { rhymes } from '../../constants';
import { mockDB } from '../../services/mockApi';

interface LastCalledNumberDisplayProps {
    lastCalled: number | null;
}

export const LastCalledNumberDisplay: React.FC<LastCalledNumberDisplayProps> = ({ lastCalled }) => {
    if (lastCalled === null) {
        return null;
    }

    const rhyme = mockDB.settings.useRhymes ? rhymes[lastCalled] : null;

    return (
        <div className="mt-4 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-4 rounded-xl shadow-lg text-center animate-fade-in-up">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Last Number</h3>
            <div className="text-7xl lg:text-8xl font-bold text-amber-300" style={{ textShadow: '0 0 15px rgba(252, 211, 77, 0.7), 0 0 25px rgba(245, 158, 11, 0.5)' }}>
                {lastCalled}
            </div>
            {rhyme && (
                <p className="text-lg text-gray-200 mt-2 italic">"{rhyme}"</p>
            )}
        </div>
    );
};
