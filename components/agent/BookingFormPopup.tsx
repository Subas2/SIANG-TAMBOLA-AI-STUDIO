import React, { useState, useEffect } from 'react';
import { Ticket } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { mockDB } from '../../services/mockApi';
import { Modal } from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';

interface BookingFormPopupProps {
    isOpen: boolean;
    onClose: () => void;
    bookingInfo: { type: 'single'; ticket?: Ticket } | { type: 'multiple'; ticketIds: string[] } | null;
    onConfirm: (playerName: string, playerNumber: string, agentId?: string) => Promise<void>;
}

export const BookingFormPopup: React.FC<BookingFormPopupProps> = ({ isOpen, onClose, bookingInfo, onConfirm }) => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [agentId, setAgentId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const recipients = mockDB.users.filter(u => u.role === 'admin' || (u.role === 'agent' && (u.isBookingAllowed ?? true) && (u.isVisibleToPlayers ?? true) && !u.isBlocked));
    const toast = useToast();

    useEffect(() => {
        // Reset state when modal is opened/closed or bookingInfo changes
        setName(user?.name || '');
        setPhone(user?.phone || '');
        
        // Set default agent to admin if available
        const admin = recipients.find(u => u.role === 'admin');
        setAgentId(admin?._id || '');
        
        setIsSubmitting(false);
    }, [isOpen, bookingInfo, user]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        // 1. Remove all non-digit characters.
        let cleaned = input.replace(/\D/g, '');

        // 2. If the number is longer than 10 digits, it might have a country code or leading zero.
        // This handles formats like `+91...`, `91...`, and `0...`.
        if ((cleaned || []).length > 10) {
            if (cleaned.startsWith('91')) {
                cleaned = cleaned.substring(2);
            } else if (cleaned.startsWith('0')) {
                cleaned = cleaned.substring(1);
            }
        }
        
        // 3. Keep only the last 10 digits.
        setPhone(cleaned.slice(-10));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^\d{10}$/.test(phone)) {
            toast.show('Please enter a valid 10-digit mobile number.', { type: 'error' });
            return;
        }
        setIsSubmitting(true);
        try {
            await onConfirm(name, phone, agentId);
        } catch (error) {
            console.error("Booking confirmation failed:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTitle = () => {
        if (!bookingInfo) return 'Book Tickets';
        if (user?.role === 'player') {
            const count = bookingInfo.type === 'multiple' ? (bookingInfo.ticketIds || []).length : 1;
            return `Request ${count} Ticket${count > 1 ? 's' : ''}`;
        }
        if (bookingInfo.type === 'single' && bookingInfo.ticket) {
            return `Book Ticket #${bookingInfo.ticket.serialNumber}`;
        }
        if (bookingInfo.type === 'multiple') {
            return `Book ${(bookingInfo.ticketIds || []).length} Ticket(s)`;
        }
        return 'Book Tickets';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xs" title={getTitle()}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Player Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Phone Number</label>
                    <input 
                        type="tel" 
                        value={phone} 
                        onChange={handlePhoneChange} 
                        className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                        required 
                        pattern="\d{10}" 
                        title="Phone number must be 10 digits" 
                        inputMode="numeric" 
                        placeholder="e.g. 9876543210"
                    />
                </div>
                {user?.role === 'player' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Request from</label>
                        <select value={agentId} onChange={e => setAgentId(e.target.value)} className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500" required>
                            <option value="" disabled>Choose an agent or admin</option>
                            {recipients.map(recipient => (
                                <option key={recipient._id || recipient.name} value={recipient._id}>
                                    {recipient.name} {recipient.role === 'admin' ? '(Admin)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-wait flex items-center justify-center">
                        {isSubmitting && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isSubmitting ? 'Processing...' : (user?.role === 'player' ? 'Confirm Request' : 'Confirm Booking')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};