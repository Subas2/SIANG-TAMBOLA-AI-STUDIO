import React, { useState, useEffect, useCallback } from 'react';
import { TicketRequest, AgentRequest, Game, User, Ticket } from '../../types';
import { api } from '../../services/mockApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface MyRequestsViewProps {
    games: Game[];
    tickets: Ticket[];
}

export const MyRequestsView: React.FC<MyRequestsViewProps> = ({ games, tickets: allTickets }) => {
    const { user } = useAuth();
    const toast = useToast();
    const [ticketRequests, setTicketRequests] = useState<TicketRequest[]>([]);
    const [agentRequests, setAgentRequests] = useState<AgentRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [tReqs, aReqs] = await Promise.all([
                api.player.getMyTicketRequests(user._id),
                api.player.getMyAgentRequests(user._id)
            ]);
            setTicketRequests(tReqs);
            setAgentRequests(aReqs);
        } catch (error) {
            console.error('Failed to fetch requests:', error);
            toast.show('Failed to load your requests.', { type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const getGameInfo = (ticketIds: string[]) => {
        if (!ticketIds || ticketIds.length === 0) return null;
        const firstTicket = allTickets.find(t => t._id === ticketIds[0]);
        if (!firstTicket) return null;
        return games.find(g => g._id === firstTicket.game);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'text-green-400 bg-green-400/10';
            case 'rejected':
            case 'rejected_by_admin': return 'text-red-400 bg-red-400/10';
            case 'pending': return 'text-yellow-400 bg-yellow-400/10';
            default: return 'text-gray-400 bg-gray-400/10';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-white">My Requests</h1>
                <button 
                    onClick={fetchRequests}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Refresh"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Ticket Requests Section */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-indigo-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" />
                    </svg>
                    Ticket Requests
                </h2>
                
                {ticketRequests.length === 0 ? (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                        <p className="text-gray-400">No ticket requests found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {ticketRequests.map((req) => {
                            const game = getGameInfo(req.ticketIds);
                            return (
                                <div key={req._id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-white text-lg">
                                                {game ? game.title : 'Ticket Request'}
                                            </h3>
                                            {game && (
                                                <p className="text-xs text-gray-400">
                                                    {game.date} at {game.time}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(req.status)}`}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                        <div className="bg-slate-900/50 p-2 rounded-lg">
                                            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Tickets</p>
                                            <p className="text-gray-200 font-mono">{req.ticketIds.length} Requested</p>
                                        </div>
                                        <div className="bg-slate-900/50 p-2 rounded-lg">
                                            <p className="text-gray-500 text-xs uppercase font-bold mb-1">Requested On</p>
                                            <p className="text-gray-200">
                                                {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    {req.rejectionReason && (
                                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <p className="text-xs font-bold text-red-400 uppercase mb-1">Rejection Reason</p>
                                            <p className="text-sm text-gray-300">{req.rejectionReason}</p>
                                        </div>
                                    )}

                                    {req.history && req.history.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-700">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">History</p>
                                            <div className="space-y-2">
                                                {req.history.map((entry, i) => (
                                                    <div key={i} className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-400">
                                                            {entry.action} by {entry.by}
                                                        </span>
                                                        <span className="text-gray-500">
                                                            {new Date(entry.timestamp).toLocaleString()}
                                                        </span>
                                                        {entry.reason && (
                                                            <p className="text-gray-400 italic mt-1 w-full text-[10px]">
                                                                Note: {entry.reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Agent Requests Section */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Agent Applications
                </h2>

                {agentRequests.length === 0 ? (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                        <p className="text-gray-400">No agent applications found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {agentRequests.map((req) => (
                            <div key={req._id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">Agent Application</h3>
                                        <p className="text-xs text-gray-400">Applied for: {req.newUsername}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(req.status)}`}>
                                        {req.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-slate-900/50 p-2 rounded-lg">
                                        <p className="text-gray-500 text-xs uppercase font-bold mb-1">Phone</p>
                                        <p className="text-gray-200">{req.phone}</p>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded-lg">
                                        <p className="text-gray-500 text-xs uppercase font-bold mb-1">Applied On</p>
                                        <p className="text-gray-200">
                                            {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-3">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Reason for applying</p>
                                    <p className="text-sm text-gray-300 italic">"{req.reason}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};
