import React, { useState, useEffect } from 'react';
import { User, TicketRequest, Game } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';

interface TicketRequestFormPopupProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    games: Game[];
    dbUsers: User[];
    onSubmit: (formData: Omit<TicketRequest, '_id' | 'status' | 'created_at'>) => void;
}

export const TicketRequestFormPopup: React.FC<TicketRequestFormPopupProps> = ({ isOpen, onClose, user, games, dbUsers, onSubmit }) => {
    const toast = useToast();
    const [agents, setAgents] = useState<User[]>([]);
    const [formData, setFormData] = useState({
        playerName: user.name || '',
        playerPhone: user.phone || '',
        ticketIds: [] as string[],
        agentId: 'admin' as string,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setAgents(dbUsers.filter(u => u.role === 'agent'));
    }, [dbUsers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.playerName.trim() || !formData.playerPhone.trim()) {
            toast.show('Please fill in all required fields.', { type: 'error' });
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit({
                playerId: user._id,
                playerName: formData.playerName,
                playerPhone: formData.playerPhone,
                ticketIds: formData.ticketIds,
                agentId: formData.agentId,
                history: []
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" title="Request Tickets">
            <form onSubmit={handleSubmit} className="space-y-4 p-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Player Name</label>
                    <input type="text" value={formData.playerName} onChange={e => setFormData({...formData, playerName: e.target.value})} className="w-full p-2 rounded bg-slate-700 text-white" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Phone</label>
                    <input type="tel" value={formData.playerPhone} onChange={e => setFormData({...formData, playerPhone: e.target.value})} className="w-full p-2 rounded bg-slate-700 text-white" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Choose Agent or Admin</label>
                    <select value={formData.agentId} onChange={e => setFormData({...formData, agentId: e.target.value})} className="w-full p-2 rounded bg-slate-700 text-white" required>
                        <option value="admin">Admin</option>
                        {agents.map(agent => (
                            <option key={agent._id} value={agent._id}>{agent.name}</option>
                        ))}
                    </select>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition">
                    {isSubmitting ? 'Processing...' : 'Submit Request'}
                </button>
            </form>
        </Modal>
    );
};
