import React from 'react';
import { Modal } from './Modal';

interface ConfirmationPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    message: string;
}

export const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({ isOpen, onClose, onConfirm, message }) => {
    
    const handleConfirmClick = () => {
        onConfirm();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xs" title="Confirm Action">
            <div>
                <p className="text-gray-200 mb-6">{message}</p>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">
                        Cancel
                    </button>
                    <button onClick={handleConfirmClick} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">
                        Confirm
                    </button>
                </div>
            </div>
        </Modal>
    );
};
