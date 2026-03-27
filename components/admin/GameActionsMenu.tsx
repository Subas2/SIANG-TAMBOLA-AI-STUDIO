import React from 'react';
import { Game } from '../../types';

interface GameActionsMenuProps {
    game: Game;
    onViewGame: (game: Game) => void;
    onEditGame: (game: Game) => void;
    onDeleteRequest: (gameId: string) => void;
    onShareRequest: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

const MenuItem: React.FC<{ onClick: () => void, children: React.ReactNode, className?: string, disabled?: boolean }> = ({ onClick, children, className = '', disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'}`}
    >
        {children}
    </button>
);

export const GameActionsMenu: React.FC<GameActionsMenuProps> = ({
    game,
    onViewGame,
    onEditGame,
    onDeleteRequest,
    onShareRequest,
    isOpen,
    onToggle,
}) => {
    
    const handleAction = (action: () => void) => {
        action();
        onToggle(); // Closes the menu
    };

    return (
        <div className="relative">
            <button 
                onClick={onToggle} 
                className="p-2 rounded-full hover:bg-slate-700 text-gray-300 transition-colors"
                aria-label="Game actions menu"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </button>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 z-30 animate-scale-in">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <MenuItem onClick={() => handleAction(() => onViewGame(game))} className="text-gray-200">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>
                             <span>{game.status === 'ongoing' ? 'Control Panel' : 'Start & Manage'}</span>
                        </MenuItem>
                        <MenuItem onClick={() => handleAction(() => onEditGame(game))} className="text-gray-200">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                             <span>Edit</span>
                        </MenuItem>
                         <MenuItem onClick={() => handleAction(onShareRequest)} className="text-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                             <span>Preview Banner</span>
                        </MenuItem>
                        <div className="border-t border-slate-700 my-1"></div>
                        <MenuItem onClick={() => handleAction(() => onDeleteRequest(game._id))} className="text-red-400 hover:text-red-300">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                             <span>Delete</span>
                        </MenuItem>
                    </div>
                </div>
            )}
        </div>
    );
};