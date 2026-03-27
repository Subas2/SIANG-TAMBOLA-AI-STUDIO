import React, { useState, useEffect, useCallback } from 'react';
import { Payment, Ticket } from '../../types';
import { api, mockDB } from '../../services/mockApi';
import { useToast } from '../../contexts/ToastContext';

interface PaymentVerificationProps {
    onBack: () => void;
    payments: Payment[];
}

export const PaymentVerification: React.FC<PaymentVerificationProps> = ({ onBack, payments: initialPayments }) => {
    const [payments, setPayments] = useState<Payment[]>(initialPayments);
    const toast = useToast();
    const [loadingPaymentId, setLoadingPaymentId] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(true);

    const fetchPayments = useCallback(async () => {
        const pendingPayments = initialPayments.filter(p => p.status === 'pending_agent_confirmation' || p.status === 'paid_by_agent');
        const sortedPayments = pendingPayments.sort((a, b) => {
            // Prioritize 'paid_by_agent' status
            if (a.status === 'paid_by_agent' && b.status !== 'paid_by_agent') return -1;
            if (a.status !== 'paid_by_agent' && b.status === 'paid_by_agent') return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setPayments(prev => JSON.stringify(prev) === JSON.stringify(sortedPayments) ? prev : sortedPayments);
    }, [initialPayments]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleAction = async (action: 'approve' | 'reject', paymentId: string, playerName: string) => {
        setLoadingPaymentId(paymentId);
        try {
            if (action === 'approve') {
                await api.admin.approvePayment({ paymentId });
                toast.show(`Payment for ${playerName} approved.`);
            } else {
                await api.admin.rejectPayment({ paymentId });
                toast.show(`Payment for ${playerName} rejected.`);
            }
            fetchPayments();
        } catch (error) {
            console.error(`Failed to ${action} payment:`, error);
            toast.show(`Error: Could not ${action} payment.`, { type: 'error' });
        } finally {
            setLoadingPaymentId(null);
        }
    };

    return (
        <div className="p-2">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-xl shadow-lg w-full md:w-3/5 mx-auto">
                <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left">
                    <h2 className="text-xl font-bold text-gray-100">Pending Verifications ({(payments || []).length})</h2>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {isOpen && (
                    <div className="px-4 pb-4 animate-fade-in-down">
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 border-t border-slate-700 pt-4">
                            {(payments || []).length > 0 ? (payments || []).map(payment => {
                                const tickets = payment.ticketIds.map(id => mockDB.tickets.find(t => t._id === id)).filter((t): t is Ticket => !!t);
                                const ticketNumbers = tickets.map(t => t.serialNumber).sort((a,b) => a-b).join(', ');
                                const agent = mockDB.users.find(u => u._id === payment.agentId);
                                const isLoading = loadingPaymentId === payment._id;

                                const isPaidByAgent = payment.status === 'paid_by_agent';

                                return (
                                    <div key={payment._id} className={`p-3 rounded-lg transition-colors border-l-4 ${isPaidByAgent ? 'bg-green-500/10 border-green-500' : 'bg-slate-700/50 border-yellow-500'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-gray-100">
                                                    <span className="text-indigo-400">{payment.playerName}</span>
                                                </p>
                                                <p className="text-sm text-gray-400">by Agent: {agent?.name || 'N/A'}</p>
                                                <p className="text-sm text-gray-400">Game: {mockDB.games.find(g => g._id === payment.gameId)?.title}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg text-amber-300">₹{payment.amount}</p>
                                                <p className="text-xs text-gray-400">{(payment.ticketIds || []).length} Tickets</p>
                                                 <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${isPaidByAgent ? 'bg-green-500 text-white' : 'bg-yellow-500 text-slate-900'}`}>
                                                    {isPaidByAgent ? 'Paid by Agent' : 'Awaiting Agent'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-center font-mono bg-slate-800/50 p-1 rounded mt-2 text-gray-300">
                                            Ticket Numbers: {ticketNumbers}
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => handleAction('reject', payment._id, payment.playerName)}
                                                disabled={isLoading}
                                                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-md text-xs transition-colors disabled:opacity-50 flex items-center justify-center"
                                            >
                                                {isLoading ? <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Reject'}
                                            </button>
                                            <button
                                                onClick={() => handleAction('approve', payment._id, payment.playerName)}
                                                disabled={isLoading}
                                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md text-xs transition-colors disabled:opacity-50 flex items-center justify-center"
                                            >
                                                {isLoading ? <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Approve'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="text-gray-400 text-center py-6">No pending payments.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};