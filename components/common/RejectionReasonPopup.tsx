import React, { useState } from 'react';
import { Modal } from './Modal';

interface RejectionReasonPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    playerName: string;
}

export const RejectionReasonPopup: React.FC<RejectionReasonPopupProps> = ({ isOpen, onClose, onConfirm, playerName }) => {
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(reason.trim());
        setReason(''); // Clear reason after sending
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" title={`Reject Request for ${playerName}`}>
            <form onSubmit={handleSubmit}>
                <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-300 mb-2">
                    Reason for rejection (optional)
                </label>
                <textarea
                    id="rejectionReason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Tickets already booked, payment issue..."
                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md h-24 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">
                        Cancel
                    </button>
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">
                        Confirm Rejection
                    </button>
                </div>
            </form>
        </Modal>
    );
};