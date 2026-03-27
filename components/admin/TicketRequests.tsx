import React, { useState, useEffect, useMemo } from 'react';
import { TicketRequest, User, Ticket, Game, HistoryEntry } from '../../types';
import { api, mockDB } from '../../services/mockApi';
import { useToast } from '../../contexts/ToastContext';
import { RejectionReasonPopup } from '../common/RejectionReasonPopup';
import { HistoryModal } from '../common/HistoryModal';

// --- Main Component ---

interface TicketRequestsProps {
    onBack?: () => void;
    games: Game[];
    tickets: Ticket[];
    user: User;
    requests: TicketRequest[];
    onUpdate: () => void;
}

export const TicketRequests: React.FC<TicketRequestsProps> = ({ onBack, games, user, tickets: allTickets, requests: allRequests, onUpdate }) => {
    const { show: showToast } = useToast();
    const [loadingRequest, setLoadingRequest] = useState<string | null>(null);
    const [rejectingRequest, setRejectingRequest] = useState<TicketRequest | null>(null);
    const [selectedHistory, setSelectedHistory] = useState<HistoryEntry[] | null>(null);

    const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});

    const toggleRequestExpansion = (requestId: string) => {
        setExpandedRequests(prev => ({ ...prev, [requestId]: !prev[requestId] }));
    };

    const requests = useMemo(() => {
        let filtered = (allRequests || []);
        
        if (user.role === 'admin') {
            // Admin sees all requests, filtered by status
            filtered = filtered.filter(r => {
                if (statusFilter === 'pending') return r.status === 'pending';
                if (statusFilter === 'approved') return r.status === 'approved';
                if (statusFilter === 'rejected') return r.status === 'rejected' || r.status === 'rejected_by_admin';
                return true;
            });
        } else if (user.role === 'agent') {
            // Agent sees only their pending requests
            filtered = filtered.filter(r => r.status === 'pending' && r.agentId === user._id);
        } else {
            return [];
        }

        return filtered.sort((a, b) => {
            if (a.created_at && b.created_at) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return 0;
        });
    }, [allRequests, user, statusFilter]);
    
    const handleCopyPhone = (phone: string) => {
        navigator.clipboard.writeText(phone);
        showToast('Phone number copied!');
    };

    const handleAccept = (request: TicketRequest) => {
        setLoadingRequest(request._id);
        setTimeout(async () => {
            try {
                // If it's an override of a rejected request, we need to book tickets
                if (request.status !== 'approved') {
                     const player = await api.user.findOrCreatePlayer(request.playerName, request.playerPhone);
                     // Use a temp agent ID for admin bypass if needed, or the original agentId
                     await api.agent.bookTickets({ 
                         ticketIds: request.ticketIds, 
                         playerId: player._id, 
                         agentId: user.role === 'admin' ? 'temp_admin_bypass' : request.agentId 
                     });
                }
                
                // Then approve the request
                if (user.role === 'admin') {
                    await api.admin.approveRequest({ requestId: request._id });
                } else {
                    await api.agent.approveRequest({ requestId: request._id });
                }
                
                showToast(`Request approved and ticket(s) booked.`);
                onUpdate();

            } catch (error) {
                console.error('Failed to book tickets during request approval:', error);
                const errorMessage = (error as Error).message;
                if (errorMessage.includes('already booked')) {
                    showToast('Failed to approve: One or more tickets are already booked. Please refresh the page.', { type: 'error' });
                } else {
                    showToast(errorMessage, { type: 'error' });
                }
            } finally {
                setLoadingRequest(null);
            }
        }, 500);
    };

    const handleRejectClick = (request: TicketRequest) => {
        setRejectingRequest(request);
    };

    const handleConfirmReject = (reason: string) => {
        if (!rejectingRequest) return;

        setLoadingRequest(rejectingRequest._id);
        const requestToReject = rejectingRequest;
        setRejectingRequest(null);

        setTimeout(async () => {
            try {
                // If it was approved, we need to unbook tickets
                if (requestToReject.status === 'approved') {
                    await api.agent.unbookTickets({ ticketIds: requestToReject.ticketIds });
                }

                if (user.role === 'admin') {
                    await api.admin.rejectRequest({ requestId: requestToReject._id, reason });
                } else {
                    await api.agent.rejectRequest({ requestId: requestToReject._id, reason });
                }
                showToast(`Request from ${requestToReject.playerName} has been rejected.`);
                onUpdate();
            } catch (error) {
                showToast((error as Error).message, { type: 'error' });
            } finally {
                setLoadingRequest(null);
            }
        }, 500);
    };

    const Spinner: React.FC = () => (
        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );

    return (
        <div className="p-4">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-gray-100">Ticket Requests</h2>
                    {user.role === 'admin' && (
                        <div className="flex gap-2 w-full sm:w-auto">
                            {(['pending', 'approved', 'rejected'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${statusFilter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                    {(requests || []).length > 0 ? (requests || []).map((req, index) => {
                        const tickets = req.ticketIds.map(id => allTickets.find(t => t._id === id)).filter((t): t is Ticket => !!t);
                        if ((tickets || []).length === 0) return null;
                        
                        const game = games.find(g => g._id === tickets[0].game);
                        if (!game) return null;

                        const totalAmount = (tickets || []).length * game.ticketPrice;
                        const requestDate = new Date(parseInt(req._id.replace('req', ''))).toLocaleDateString('en-US', {
                            month: 'numeric', day: 'numeric', year: 'numeric'
                        });
                        const formattedGameTime = new Date(`${game.date} ${game.time}`).toLocaleTimeString('en-US', {
                            hour: 'numeric', minute: '2-digit', hour12: true
                        });
                        const isLoading = loadingRequest === req._id;

                        const checkIsSheet = (ticketsToCheck: Ticket[]): 'Full Sheet' | 'Half Sheet' | null => {
                            if ((ticketsToCheck || []).length !== 3 && (ticketsToCheck || []).length !== 6) {
                                return null;
                            }
                            const serials = ticketsToCheck.map(t => t.serialNumber).sort((a, b) => a - b);
                            let isConsecutive = true;
                            for (let i = 0; i < (serials || []).length - 1; i++) {
                                if (serials[i + 1] !== serials[i] + 1) {
                                    isConsecutive = false;
                                    break;
                                }
                            }
                            if (!isConsecutive) return null;

                            if ((ticketsToCheck || []).length === 6) return 'Full Sheet';
                            if ((ticketsToCheck || []).length === 3) return 'Half Sheet';
                            return null;
                        };
                        const sheetType = checkIsSheet(tickets);

                        return (
                            <div key={`${req._id}-${index}`} className="bg-white/5 p-4 rounded-xl shadow-md border border-white/10 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg text-white">{game.title}</h3>
                                                {req.status === 'pending' ? (
                                                    <span className="bg-yellow-500/20 text-yellow-300 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd"></path></svg>
                                                        Pending
                                                    </span>
                                                ) : req.status === 'approved' ? (
                                                    <span className="bg-green-500/20 text-green-300 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                                        Approved
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                                                        {req.status === 'rejected_by_admin' ? 'Rejected by Admin' : 'Rejected'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-400">Tickets: {tickets.map(t => t.serialNumber).join(', ')}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => toggleRequestExpansion(req._id)}
                                        className="text-gray-400 hover:text-white p-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {expandedRequests[req._id] && (
                                    <div className="bg-white/10 p-3 rounded-lg mt-2">
                                        <p className="text-sm text-gray-200 font-semibold">{req.playerName}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-gray-400">{req.playerPhone}</p>
                                            <button 
                                                onClick={() => handleCopyPhone(req.playerPhone)} 
                                                className="text-gray-400 hover:text-white"
                                                title="Copy phone number"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 text-sm flex-grow">
                                        <div>
                                            <p className="text-xs text-gray-400">Game</p>
                                            <p className="font-semibold text-gray-100">{game.title}</p>
                                            <p className="text-xs text-gray-400">{formattedGameTime}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Tickets</p>
                                            <p className="font-bold text-white">
                                                {sheetType ? sheetType : `${(tickets || []).length} tickets`}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                ₹{game.ticketPrice} each
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Total Amount</p>
                                            <p className="font-bold text-white">₹{totalAmount}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Request Date</p>
                                            <p className="font-semibold text-gray-100">{requestDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 flex gap-2 w-full md:w-auto">
                                        {(req.status === 'pending' || (user.role === 'admin' && req.status === 'approved')) && (
                                            <button onClick={() => handleRejectClick(req)} disabled={isLoading} className="flex-grow justify-center bg-red-600/90 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors w-full flex items-center gap-2 disabled:opacity-50">
                                                {isLoading ? <Spinner/> : (req.status === 'approved' ? 'Override Reject' : 'Reject')}
                                            </button>
                                        )}
                                        {(req.status === 'pending' || (user.role === 'admin' && (req.status === 'rejected' || req.status === 'rejected_by_admin'))) && (
                                            <button onClick={() => handleAccept(req)} disabled={isLoading} className="flex-grow justify-center bg-green-600/90 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors w-full flex items-center gap-2 disabled:opacity-50">
                                                {isLoading ? <Spinner/> : (req.status !== 'pending' ? 'Override Approve' : 'Approve')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-400 mb-2">Ticket Numbers:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {tickets.map((t) => (
                                            <span key={t._id} className="bg-gray-200/10 text-gray-300 text-xs font-mono px-2 py-1 rounded">
                                                T{String(t.serialNumber).padStart(3, '0')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={() => setSelectedHistory(req.history)} className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                                        View History
                                    </button>
                                </div>
                            </div>
                        )
                    }) : <p className="text-gray-400">No pending ticket requests.</p>}
                </div>
            </div>
            {rejectingRequest && (
                <RejectionReasonPopup
                    isOpen={!!rejectingRequest}
                    onClose={() => setRejectingRequest(null)}
                    onConfirm={handleConfirmReject}
                    playerName={rejectingRequest.playerName}
                />
            )}
            <HistoryModal isOpen={!!selectedHistory} onClose={() => setSelectedHistory(null)} history={selectedHistory || []} />
        </div>
    );
};