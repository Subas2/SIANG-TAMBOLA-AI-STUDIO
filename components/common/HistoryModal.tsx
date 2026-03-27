import React from 'react';
import { HistoryEntry } from '../../types';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryEntry[];
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 p-6 rounded-xl shadow-xl w-full max-w-md border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Request History</h3>
                <div className="space-y-4">
                    {history.map((entry, index) => (
                        <div key={index} className="border-l-2 border-slate-600 pl-4 py-1">
                            <p className="text-sm font-semibold text-gray-200">{entry.action} by {entry.by}</p>
                            <p className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString()}</p>
                            {entry.reason && <p className="text-xs text-red-300 mt-1 italic">Reason: {entry.reason}</p>}
                        </div>
                    ))}
                </div>
                <button onClick={onClose} className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    Close
                </button>
            </div>
        </div>
    );
};
