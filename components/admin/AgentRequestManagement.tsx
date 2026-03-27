import React, { useState, useEffect } from 'react';
import { AgentRequest } from '../../types';
import { api } from '../../services/mockApi';
import { Modal } from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';

interface CreateAgentCredentialsPopupProps {
    isOpen: boolean;
    request: AgentRequest;
    onClose: () => void;
    onConfirm: (credentials: { username: string, password: string }) => Promise<void>;
}

const CreateAgentCredentialsPopup: React.FC<CreateAgentCredentialsPopupProps> = ({ isOpen, request, onClose, onConfirm }) => {
    const [username, setUsername] = useState(request.newUsername);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            setError('Password is required.');
            return;
        }
        setError('');
        setIsSubmitting(true);
        try {
            await onConfirm({ username, password });
            // The parent will close the modal on success
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Create Agent Credentials">
            <p className="text-sm text-gray-400 mb-4">Set the username and password for <span className="font-bold text-indigo-400">{request.name}</span>.</p>
            {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-2 rounded-md mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Username</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set a temporary password" className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-wait flex items-center justify-center">
                        {isSubmitting && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isSubmitting ? 'Creating...' : 'Confirm & Create'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};


export const AgentRequestManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [requests, setRequests] = useState<AgentRequest[]>([]);
    const [approvingRequest, setApprovingRequest] = useState<AgentRequest | null>(null);
    const toast = useToast();

    const fetchRequests = async () => {
        const data = await api.admin.getAgentRequests();
        setRequests(data);
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleConfirmApproval = async (credentials: { username: string, password: string }) => {
        if (!approvingRequest) return;

        try {
            await api.admin.approveAgentRequest({
                requestId: approvingRequest._id,
                username: credentials.username,
                password: credentials.password,
            });
            toast.show(`Agent account for ${approvingRequest.name} created successfully.`);
            setApprovingRequest(null);
            fetchRequests();
        } catch (error) {
            // This allows the popup to display the error.
            throw error;
        }
    };

    const handleReject = async (requestId: string) => {
        try {
            await api.admin.rejectAgentRequest({ requestId });
            toast.show('Agent request rejected.');
            fetchRequests(); // Re-fetch to update the list
        } catch (error) {
            toast.show((error as Error).message, { type: 'error' });
        }
    };

    return (
        <div className="p-4">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-100 mb-4">Agent Requests</h2>
                <div className="space-y-4">
                    {(requests || []).length > 0 ? (requests || []).map((req, index) => (
                        <div key={`${req._id}-${index}`} className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors">
                            <div className="flex items-center gap-3">
                                <img src={req.photo} alt={req.name} className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <p className="font-semibold text-gray-100">{req.name}</p>
                                    <p className="text-xs text-gray-400">{req.phone}</p>
                                    <p className="text-xs text-indigo-300 italic mt-1">"{req.reason}"</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleReject(req._id)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors">Reject</button>
                                <button onClick={() => setApprovingRequest(req)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors">Approve</button>
                            </div>
                        </div>
                    )) : <p className="text-gray-400 text-center py-4">No pending agent requests.</p>}
                </div>
            </div>

            {approvingRequest && (
                <CreateAgentCredentialsPopup
                    isOpen={!!approvingRequest}
                    request={approvingRequest}
                    onClose={() => setApprovingRequest(null)}
                    onConfirm={handleConfirmApproval}
                />
            )}
        </div>
    );
};