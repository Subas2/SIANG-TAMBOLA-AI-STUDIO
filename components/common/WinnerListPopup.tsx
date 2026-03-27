import React from 'react';
import { Game, Prize } from '../../types';
import { WinnerList } from './WinnerList';
import { Modal } from './Modal';

interface WinnerListPopupProps {
    isOpen: boolean;
    onClose: () => void;
    game: Game | null;
}

export const WinnerListPopup: React.FC<WinnerListPopupProps> = ({ isOpen, onClose, game }) => {
    if (!game) return null;
    
    const winners = (game.prizes || []).filter(p => p.claimedBy && (p.claimedBy || []).length > 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" title="Winner's List">
            <div className="max-h-[60vh] overflow-y-auto">
                {(winners || []).length > 0 ? (
                    <WinnerList prizes={game.prizes} game={game} />
                ) : (
                    <p className="text-gray-400 text-center py-4">No winners have been declared yet.</p>
                )}
            </div>
        </Modal>
    );
};
