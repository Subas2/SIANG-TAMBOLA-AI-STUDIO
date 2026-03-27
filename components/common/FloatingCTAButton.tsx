import React from 'react';
import ReactDOM from 'react-dom';

interface FloatingCTAButtonProps {
    onClick: () => void;
    onClose: () => void;
    isVisible: boolean;
    label: string;
    count?: number;
    containerRef?: React.RefObject<HTMLElement>; // Kept for backwards compatibility but unused
}

export const FloatingCTAButton: React.FC<FloatingCTAButtonProps> = ({ onClick, onClose, isVisible, label, count }) => {
    if (!isVisible) {
        return null;
    }

    const buttonContent = (
        <div
            className="fixed bottom-24 right-6 z-50 flex items-stretch h-[clamp(36px,6.4vh,44px)] max-w-[calc(100vw-32px)] rounded-full text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg transition-opacity duration-300 transform focus-within:ring-4 focus-within:ring-purple-300 animate-fade-in-up"
        >
            <button
                onClick={onClick}
                aria-label={label}
                className="flex-grow h-full pl-5 pr-3 flex items-center justify-center gap-2 transform transition-transform hover:scale-105 rounded-l-full focus:outline-none"
            >
                <span>{label}</span>
                {count && count > 0 && (
                    <span className="bg-white text-purple-600 text-xs font-bold min-w-[20px] h-5 flex items-center justify-center px-2 rounded-full">
                        {count}
                    </span>
                )}
            </button>
            <div className="h-1/2 my-auto w-px bg-white/30" aria-hidden="true"></div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                aria-label="Clear selection and close"
                className="h-full px-3 flex items-center justify-center transform transition-transform hover:scale-110 rounded-r-full focus:outline-none"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );

    return ReactDOM.createPortal(buttonContent, document.body);
};