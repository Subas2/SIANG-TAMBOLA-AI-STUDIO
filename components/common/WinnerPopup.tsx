import React, { useEffect } from 'react';
import { Modal } from './Modal';

interface WinnerPopupProps {
    isOpen: boolean;
    onClose: () => void;
    winnerName: string;
    prizeName: string;
}

export const WinnerPopup: React.FC<WinnerPopupProps> = ({ isOpen, onClose, winnerName, prizeName }) => {

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xs" hideHeader disableContentPadding>
             <div 
                className="relative bg-gradient-to-br from-amber-400 to-yellow-300 border-4 border-white rounded-xl shadow-2xl p-6 text-center text-slate-900 w-full overflow-hidden"
            >
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-2 right-2 p-2 rounded-full text-slate-800/60 hover:bg-white/30 hover:text-slate-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div className="absolute -top-10 -left-10 w-28 h-28 bg-white/20 rounded-full"></div>
                <div className="absolute -bottom-12 -right-8 w-32 h-32 bg-white/20 rounded-full"></div>
                <div className="relative">
                    <h2 className="text-2xl font-bold uppercase tracking-wider">🏆 WINNER! 🏆</h2>
                    <p className="text-4xl font-extrabold my-2">{winnerName}</p>
                    <p className="text-xl font-semibold">has won</p>
                    <p className="text-3xl font-bold text-purple-800 mt-1">{prizeName}</p>
                </div>
            </div>
        </Modal>
    );
};