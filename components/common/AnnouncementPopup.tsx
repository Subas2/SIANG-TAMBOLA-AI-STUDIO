import React, { useState } from 'react';
import { Modal } from './Modal';

interface AnnouncementPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (text: string) => void;
}

export const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({ isOpen, onClose, onSend }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSend(text.trim());
            setText(''); // Clear text after sending
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Make an Announcement">
            <form onSubmit={handleSubmit}>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md h-24 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                />
                <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">
                        Cancel
                    </button>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                        Send Announcement
                    </button>
                </div>
            </form>
        </Modal>
    );
};
