import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, AgentRequest, Game, Ticket } from '../types';
import { api } from '../services/mockApi';
import { Modal } from './common/Modal';
import { useToast } from '../contexts/ToastContext';
import { ConfirmationPopup } from './common/ConfirmationPopup';

interface AddAgentPopupProps {
    isOpen: boolean;
    onAdd: (agentData: Omit<User, '_id' | 'role'>) => Promise<void>;
    onClose: () => void;
}

// Reusable Input Component for the new form design
const InputWithIcon = ({ id, name, type = "text", value, onChange, placeholder, required, children, ...props }: { id: string, name: string, type?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string, required?: boolean, children: React.ReactNode, [key: string]: any }) => (
    <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {children}
        </div>
        <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className="w-full pl-10 p-2.5 border border-slate-600 bg-slate-700/50 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            {...props}
        />
    </div>
);


const AddAgentPopup: React.FC<AddAgentPopupProps> = ({ isOpen, onAdd, onClose }) => {
    const [formData, setFormData] = useState({ name: '', phone: '', address: '', email: '', username: '', password: '', photo: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            // This resets the form to its initial state every time it's opened,
            // preventing any stale "submitting" or form data from a previous interaction.
            setFormData({ name: '', phone: '', address: '', email: '', username: '', password: '', photo: '' });
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            // 1. Remove all non-digit characters.
            let cleaned = value.replace(/\D/g, '');
            // 2. Handle country codes and leading zeros for Indian numbers
            if ((cleaned || []).length > 10) {
                if (cleaned.startsWith('91')) {
                    cleaned = cleaned.substring(2);
                } else if (cleaned.startsWith('0')) {
                    cleaned = cleaned.substring(1);
                }
            }
            // 3. Keep only the last 10 digits.
            const numericValue = cleaned.slice(-10);
            setFormData({ ...formData, [name]: numericValue });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast.show('Photo size should not exceed 2MB.', { type: 'error' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.photo) {
            toast.show('Please upload a profile photo.', { type: 'error' });
            return;
        }
        if (!/^\d{10}$/.test(formData.phone)) {
            toast.show('Please enter a valid 10-digit mobile number.', { type: 'error' });
            return;
        }
        setIsSubmitting(true);
        try {
            await onAdd(formData);
            // On success, the parent's `onAdd` function will close the modal.
        } catch (error) {
            // The parent `onAdd` function is responsible for showing the error toast.
            // We just need to ensure the loading state is reset.
            console.error("Failed to add agent:", error);
        } finally {
            // This block guarantees the submitting state is reset, regardless of success or failure.
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" hideHeader disableContentPadding>
             <div className="relative bg-slate-800 text-white rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[85vh]">
                <div className="p-6 bg-gradient-to-br from-indigo-600/50 to-purple-700/50 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">Create New Agent Profile</h2>
                    <p className="text-sm text-indigo-200 mt-1">Add a new agent to the system with their details and credentials.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex-grow overflow-hidden flex flex-col">
                    <div className="overflow-y-auto px-6 pt-6 space-y-6 flex-grow">
                        {/* Photo Upload */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative group">
                                <div className="w-28 h-28 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-slate-600 shadow-lg">
                                    {formData.photo ? (
                                        <img src={formData.photo} alt="Agent Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                 <label htmlFor="agent-photo" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </label>
                            </div>
                             <input id="agent-photo" name="photo" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                             <p className="text-xs text-gray-400">Profile Photo (Required)</p>
                        </div>
                        
                        {/* Login Credentials */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Login Credentials</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <InputWithIcon id="username" name="username" value={formData.username} onChange={handleChange} placeholder="Username" required>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                </InputWithIcon>
                               <InputWithIcon id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password" required>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                </InputWithIcon>
                            </div>
                        </div>

                        {/* Personal Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputWithIcon id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                </InputWithIcon>
                                 <InputWithIcon id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Phone Number" required pattern="\d{10}" title="Phone number must be 10 digits" inputMode="numeric">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </InputWithIcon>
                            </div>
                             <InputWithIcon id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address (Optional)">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                            </InputWithIcon>
                             <InputWithIcon id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Full Address (Optional)">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </InputWithIcon>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-slate-700 bg-slate-900/50">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="bg-slate-700 hover:bg-slate-600 text-gray-100 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-wait">
                            {isSubmitting && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {isSubmitting ? 'Adding...' : 'Add Agent'}
                        </button>
                    </div>
                </form>
             </div>
        </Modal>
    );
};

interface EditAgentPopupProps {
    isOpen: boolean;
    agent: User;
    onUpdate: (agentId: string, agentData: Partial<User>) => Promise<void>;
    onClose: () => void;
}

const EditAgentPopup: React.FC<EditAgentPopupProps> = ({ isOpen, agent, onUpdate, onClose }) => {
    const [formData, setFormData] = useState({ name: '', phone: '', address: '', email: '', username: '', photo: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (isOpen && agent) {
            setFormData({
                name: agent.name || '',
                phone: agent.phone || '',
                address: agent.address || '',
                email: agent.email || '',
                username: agent.username || '',
                photo: agent.photo || ''
            });
            setIsSubmitting(false);
        }
    }, [isOpen, agent]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            let cleaned = value.replace(/\D/g, '');
            if ((cleaned || []).length > 10) {
                if (cleaned.startsWith('91')) {
                    cleaned = cleaned.substring(2);
                } else if (cleaned.startsWith('0')) {
                    cleaned = cleaned.substring(1);
                }
            }
            const numericValue = cleaned.slice(-10);
            setFormData({ ...formData, [name]: numericValue });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.show('Photo size should not exceed 2MB.', { type: 'error' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
            toast.show('Please enter a valid 10-digit mobile number.', { type: 'error' });
            return;
        }
        setIsSubmitting(true);
        try {
            await onUpdate(agent._id, formData);
        } catch (error) {
            console.error("Failed to update agent:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" hideHeader disableContentPadding>
             <div className="relative bg-slate-800 text-white rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[85vh]">
                <div className="p-6 bg-gradient-to-br from-indigo-600/50 to-purple-700/50 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">Edit Agent Profile</h2>
                    <p className="text-sm text-indigo-200 mt-1">Update the agent's details and contact information.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex-grow overflow-hidden flex flex-col">
                    <div className="overflow-y-auto px-6 pt-6 space-y-6 flex-grow">
                        {/* Photo Upload */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative group">
                                <div className="w-28 h-28 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-slate-600 shadow-lg">
                                    {formData.photo ? (
                                        <img src={formData.photo} alt="Agent Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                 <label htmlFor="edit-agent-photo" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </label>
                            </div>
                             <input id="edit-agent-photo" name="photo" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                             <p className="text-xs text-gray-400">Profile Photo</p>
                        </div>
                        
                        {/* Login Credentials */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Login Credentials</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <InputWithIcon id="edit-username" name="username" value={formData.username} onChange={handleChange} placeholder="Username" required>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                </InputWithIcon>
                            </div>
                        </div>

                        {/* Personal Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputWithIcon id="edit-name" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                </InputWithIcon>
                                 <InputWithIcon id="edit-phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Phone Number" required pattern="\d{10}" title="Phone number must be 10 digits" inputMode="numeric">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </InputWithIcon>
                            </div>
                             <InputWithIcon id="edit-email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address (Optional)">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                            </InputWithIcon>
                             <InputWithIcon id="edit-address" name="address" value={formData.address} onChange={handleChange} placeholder="Full Address (Optional)">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </InputWithIcon>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex justify-end gap-3 p-6 border-t border-slate-700 bg-slate-900/50">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="bg-slate-700 hover:bg-slate-600 text-gray-100 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-wait">
                            {isSubmitting && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
             </div>
        </Modal>
    );
};

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

    useEffect(() => {
        if (isOpen) {
            setUsername(request.newUsername);
            setPassword('');
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen, request.newUsername]);

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


interface AgentManagementProps {
    onBack: () => void;
    games: Game[];
    tickets: Ticket[];
    dbUsers: User[];
    agentRequests: AgentRequest[];
    onUpdate?: () => void;
}

// FIX: New modal component to show agent request details.
interface AgentRequestInfoModalProps {
    isOpen: boolean;
    request: AgentRequest;
    onClose: () => void;
}

const AgentRequestInfoModal: React.FC<AgentRequestInfoModalProps> = ({ isOpen, request, onClose }) => {
    
    const InfoField: React.FC<{ label: string; value: string; children: React.ReactNode }> = ({ label, value, children }) => (
        <div className="flex items-start gap-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <div className="p-2 bg-indigo-500/20 rounded-full flex-shrink-0">
                {children}
            </div>
            <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-semibold text-gray-100 break-all">{value || 'Not Provided'}</p>
            </div>
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Agent Request Details">
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-2">
                    <img src={request.photo} alt={request.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-600" />
                    <div>
                        <h3 className="text-xl font-bold text-white">{request.name}</h3>
                        <p className="text-sm text-gray-400">@{request.newUsername}</p>
                    </div>
                </div>

                <div className="space-y-3 text-sm">
                    <InfoField label="Phone Number" value={request.phone}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </InfoField>
                    <InfoField label="Email Address" value={request.email}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </InfoField>
                    <InfoField label="Address" value={request.address}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </InfoField>
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                        <p className="text-xs text-gray-400">Reason for Request</p>
                        <p className="text-gray-100 font-medium italic mt-1">"{request.reason}"</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

interface ResetCredentialsPopupProps {
    isOpen: boolean;
    agent: User;
    onClose: () => void;
    onConfirm: (data: { newUsername: string, newPassword: string }) => Promise<void>;
}

const ResetCredentialsPopup: React.FC<ResetCredentialsPopupProps> = ({ isOpen, agent, onClose, onConfirm }) => {
    const [newUsername, setNewUsername] = useState(agent.username);
    const [newPassword, setNewPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            setNewUsername(agent.username);
            setNewPassword('');
        }
    }, [isOpen, agent.username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword.trim()) {
            toast.show('New password cannot be empty.', { type: 'error' });
            return;
        }
        setIsSubmitting(true);
        try {
            await onConfirm({ newUsername, newPassword });
        } catch(e) {
            // Error is handled by the parent, just need to stop submitting state
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" title={`Reset Credentials for ${agent.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">New Username</label>
                    <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">New Password</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center">
                        {isSubmitting && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isSubmitting ? 'Resetting...' : 'Confirm Reset'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export const AgentManagement: React.FC<AgentManagementProps> = ({ onBack, games, tickets, dbUsers, agentRequests, onUpdate }) => {
    const toast = useToast();
    const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);
    const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<'all_agents' | 'active_agents' | 'requests'>('all_agents');
    const [approvingRequest, setApprovingRequest] = useState<AgentRequest | null>(null);
    const [viewingRequest, setViewingRequest] = useState<AgentRequest | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void; } | null>(null);

    const agents = useMemo(() => dbUsers.filter(u => u.role === 'agent'), [dbUsers]);
    const requests = useMemo(() => agentRequests.filter(r => r.status === 'pending'), [agentRequests]);

    const activeAgents = useMemo(() => {
        const activeGameIds = new Set(
            games
                .filter(g => g.status === 'ongoing' || g.status === 'upcoming')
                .map(g => g._id)
        );

        const activeAgentIds = new Set(
            tickets
                .filter(t => t.bookedByAgent && activeGameIds.has(t.game))
                .map(t => t.bookedByAgent as string)
        );

        return agents.filter(agent => activeAgentIds.has(agent._id));
    }, [agents, games, tickets]);

    const handleAddAgent = useCallback(async (agentData: Omit<User, '_id' | 'role'>) => {
        try {
            await api.admin.addAgent(agentData);
            toast.show('Agent added successfully!');
            onUpdate?.();
            setIsAddPopupOpen(false);
        } catch (error) {
            toast.show((error as Error).message, { type: 'error' });
            throw error;
        }
    }, [toast, onUpdate]);

    const handleUpdateAgent = useCallback(async (agentId: string, agentData: Partial<User>) => {
        try {
            await api.admin.updateAgent(agentId, agentData);
            toast.show('Agent updated successfully!');
            onUpdate?.();
            setIsEditPopupOpen(false);
            if (selectedAgent && selectedAgent._id === agentId) {
                setSelectedAgent({ ...selectedAgent, ...agentData });
            }
        } catch (error) {
            toast.show((error as Error).message, { type: 'error' });
            throw error;
        }
    }, [toast, onUpdate, selectedAgent]);
    
    const handleAction = useCallback(async (action: 'approve' | 'reject', request: AgentRequest) => {
        if (action === 'approve') {
            setApprovingRequest(request);
        } else {
            try {
                await api.admin.rejectAgentRequest({ requestId: request._id });
                toast.show('Agent request rejected.');
                onUpdate?.();
            } catch(error) {
                 toast.show((error as Error).message, { type: 'error' });
            }
        }
    }, [toast, onUpdate]);

    const handleConfirmApproval = useCallback(async (credentials: { username: string, password: string }) => {
        if (!approvingRequest) return;
        try {
            await api.admin.approveAgentRequest({
                requestId: approvingRequest._id,
                username: credentials.username,
                password: credentials.password,
            });
            toast.show(`Agent account for ${approvingRequest.name} created successfully.`);
            setApprovingRequest(null);
            onUpdate?.();
        } catch (error) {
            throw error;
        }
    }, [approvingRequest, toast, onUpdate]);

    const handleToggleAgentBookingStatus = useCallback(async (agentId: string) => {
        try {
            const { agent: updatedAgent } = await api.admin.toggleAgentBookingStatus({ agentId });
            toast.show("Agent's booking status updated successfully!");
            onUpdate?.();
            if (updatedAgent) {
                setSelectedAgent(updatedAgent);
            }
        } catch (error) {
            toast.show((error as Error).message, { type: 'error' });
        }
    }, [toast, onUpdate]);

    const handleToggleAgentVisibility = useCallback(async (agentId: string) => {
        try {
            const { agent: updatedAgent } = await api.admin.toggleAgentVisibility({ agentId });
            toast.show("Agent's visibility has been updated.");
            onUpdate?.();
            if (updatedAgent) {
                setSelectedAgent(updatedAgent);
            }
        } catch (error) {
            const errorMessage = (error as Error).message;
            // Only show toast for non-schema errors. The child component will handle the schema error UI.
            if (!errorMessage.includes("isVisibleToPlayers")) {
                toast.show(errorMessage, { type: 'error' });
            }
            // Re-throw to allow child component to react to the error.
            throw error;
        }
    }, [toast, onUpdate]);

    const handleDeleteAgentRequest = useCallback((agentId: string) => {
        const agent = agents.find(a => a._id === agentId);
        if (!agent) return;

        setConfirmAction({
            message: `Are you sure you want to delete agent "${agent.name}"? This action is irreversible and will delete associated payments.`,
            onConfirm: async () => {
                try {
                    await api.admin.deleteAgent({ agentId });
                    toast.show('Agent deleted successfully!');
                    onUpdate?.();
                    setSelectedAgent(null);
                } catch (error) {
                    toast.show((error as Error).message, { type: 'error' });
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    }, [agents, toast, onUpdate]);

    return (
        <div className="p-2">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-100">Agent Management</h2>
                    <button onClick={() => setIsAddPopupOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">Add Agent</button>
                </div>
                
                <div className="flex bg-slate-900/50 p-1 rounded-lg mb-4">
                    <button onClick={() => setActiveTab('all_agents')} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'all_agents' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-slate-700'}`}>All Agents</button>
                    <button onClick={() => setActiveTab('active_agents')} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'active_agents' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-slate-700'}`}>Active Agents</button>
                    <button onClick={() => setActiveTab('requests')} className={`w-full text-center py-2 text-sm font-semibold rounded-md transition-colors relative ${activeTab === 'requests' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:bg-slate-700'}`}>
                        Requests 
                        {(requests || []).length > 0 && <span className="absolute top-1 right-2 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-slate-800" />}
                    </button>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {activeTab === 'all_agents' && (
                        (agents || []).length > 0 ? (agents || []).map(agent => (
                            <div key={agent._id} onClick={() => setSelectedAgent(agent)} className="bg-slate-700/50 p-2 rounded-md flex justify-between items-center hover:bg-slate-700 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <img src={agent.photo} alt={agent.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                                    <div>
                                        <p className="font-semibold text-gray-100">{agent.name}</p>
                                        <p className="text-xs text-gray-400">@{agent.username}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 rounded-full ${agent.isBookingAllowed ?? true ? 'bg-green-400' : 'bg-red-500'}`} title={agent.isBookingAllowed ?? true ? 'Booking Allowed' : 'Booking Blocked'}></span>
                                    <p className="text-sm text-gray-300">{agent.phone}</p>
                                </div>
                            </div>
                        )) : <p className="text-gray-400 text-center py-4">No agents have been added.</p>
                    )}
                     {activeTab === 'active_agents' && (
                        (activeAgents || []).length > 0 ? (activeAgents || []).map(agent => (
                            <div key={agent._id} onClick={() => setSelectedAgent(agent)} className="bg-slate-700/50 p-2 rounded-md flex justify-between items-center hover:bg-slate-700 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <img src={agent.photo} alt={agent.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                                    <div>
                                        <p className="font-semibold text-gray-100">{agent.name}</p>
                                        <p className="text-xs text-gray-400">@{agent.username}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 rounded-full ${agent.isBookingAllowed ?? true ? 'bg-green-400' : 'bg-red-500'}`} title={agent.isBookingAllowed ?? true ? 'Booking Allowed' : 'Booking Blocked'}></span>
                                    <p className="text-sm text-gray-300">{agent.phone}</p>
                                </div>
                            </div>
                        )) : <p className="text-gray-400 text-center py-4">No agents have activity in upcoming or ongoing games.</p>
                    )}
                     {activeTab === 'requests' && (
                        (requests || []).length > 0 ? (requests || []).map(req => (
                             <div key={req._id} className="bg-slate-700/50 p-3 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center hover:bg-slate-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <img src={req.photo} alt={req.name} className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                                    <div>
                                        <p className="font-semibold text-gray-100">{req.name}</p>
                                        <p className="text-xs text-gray-400">{req.phone}</p>
                                        <p className="text-xs text-indigo-300 italic mt-1">"{req.reason}"</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                                    <button onClick={() => setViewingRequest(req)} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors">Info</button>
                                    <button onClick={() => handleAction('reject', req)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors">Reject</button>
                                    <button onClick={() => handleAction('approve', req)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors">Approve</button>
                                </div>
                            </div>
                        )) : <p className="text-gray-400 text-center py-4">No pending agent requests.</p>
                    )}
                </div>
            </div>
            <AddAgentPopup isOpen={isAddPopupOpen} onClose={() => setIsAddPopupOpen(false)} onAdd={handleAddAgent} />
            {selectedAgent && <AgentInfoPopup isOpen={!!selectedAgent} agent={selectedAgent} onClose={() => setSelectedAgent(null)} onStatusToggle={handleToggleAgentBookingStatus} onDelete={handleDeleteAgentRequest} onVisibilityToggle={handleToggleAgentVisibility} onEdit={() => setIsEditPopupOpen(true)} games={games} tickets={tickets} />}
            {selectedAgent && <EditAgentPopup isOpen={isEditPopupOpen} agent={selectedAgent} onClose={() => setIsEditPopupOpen(false)} onUpdate={handleUpdateAgent} />}
            {approvingRequest && <CreateAgentCredentialsPopup 
                isOpen={!!approvingRequest}
                request={approvingRequest}
                onClose={() => setApprovingRequest(null)}
                onConfirm={handleConfirmApproval}
            />}
            {viewingRequest && (
                <AgentRequestInfoModal
                    isOpen={!!viewingRequest}
                    request={viewingRequest}
                    onClose={() => setViewingRequest(null)}
                />
            )}
            {confirmAction && (
                <ConfirmationPopup
                    isOpen={!!confirmAction}
                    message={confirmAction.message}
                    onConfirm={confirmAction.onConfirm}
                    onClose={() => setConfirmAction(null)}
                />
            )}
        </div>
    );
};


interface AgentInfoPopupProps {
    isOpen: boolean;
    agent: User;
    onClose: () => void;
    onStatusToggle: (agentId: string) => Promise<void>;
    onDelete: (agentId: string) => void;
    onVisibilityToggle: (agentId: string) => Promise<void>;
    onEdit: () => void;
    games: Game[];
    tickets: Ticket[];
}

const AgentInfoPopup: React.FC<AgentInfoPopupProps> = ({ isOpen, agent, onClose, onStatusToggle, onDelete, onVisibilityToggle, onEdit, games, tickets }) => {
    const [isResetPopupOpen, setIsResetPopupOpen] = useState(false);
    const toast = useToast();
    const agentTickets = tickets.filter(t => t.bookedByAgent === agent._id);
    const totalCommission = agentTickets.reduce((sum, ticket) => sum + (ticket.commission || 0), 0);
    const totalSalesValue = agentTickets.reduce((sum, ticket) => {
        const game = games.find(g => g._id === ticket.game);
        return sum + (game?.ticketPrice || 0);
    }, 0);
    const [visibilityControlDisabled, setVisibilityControlDisabled] = useState(false);
    const [visibilityError, setVisibilityError] = useState('');

    useEffect(() => {
        // Reset the disabled state when the agent changes or the modal is re-opened
        if (isOpen) {
            setVisibilityControlDisabled(false);
            setVisibilityError('');
        }
    }, [isOpen, agent._id]);

    const handleResetConfirm = async ({ newUsername, newPassword }: { newUsername: string, newPassword: string }) => {
        try {
            await api.admin.updateAgentCredentials({ agentId: agent._id, newUsername, newPassword });
            toast.show("Agent credentials updated successfully!");
            setIsResetPopupOpen(false);
            onClose(); // Close the main info popup as well
        } catch (error) {
            toast.show((error as Error).message, { type: 'error' });
            throw error; // Re-throw to inform child component
        }
    };
    
    const handleToggleStatus = async () => {
        await onStatusToggle(agent._id);
    };

    const handleToggleVisibility = async () => {
        setVisibilityControlDisabled(false);
        setVisibilityError('');
        try {
            await onVisibilityToggle(agent._id);
        } catch (error) {
            const errorMessage = (error as Error).message;
            if (errorMessage.includes("isVisibleToPlayers")) {
                setVisibilityControlDisabled(true);
                // Set a user-friendly error message for the tooltip
                setVisibilityError("Visibility control disabled: Please add an 'isVisibleToPlayers' (boolean) column to your 'users' table in Supabase.");
            }
            // Other errors are handled by the parent's toast notification.
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="sm" hideHeader disableContentPadding>
                 <div className="w-full max-w-md text-white overflow-hidden">
                    {/* Header */}
                    <div className="p-6 flex items-center gap-4 relative">
                         <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-indigo-400">
                            {agent.photo ? (
                                <img src={agent.photo} alt={agent.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{agent.name}</h2>
                            <p className="text-sm text-gray-400">@{agent.username}</p>
                        </div>
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <button onClick={onEdit} className="absolute top-4 right-12 text-gray-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 pb-6 space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center bg-slate-800/70 p-3 rounded-xl border border-slate-700">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Tickets Booked</p>
                                <p className="text-2xl font-bold mt-1">{(agentTickets || []).length}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Total Sales</p>
                                <p className="text-2xl font-bold mt-1 text-sky-400">₹{totalSalesValue.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">Commission</p>
                                <p className="text-2xl font-bold mt-1 text-green-400">₹{totalCommission.toFixed(2)}</p>
                            </div>
                        </div>
                        
                        {/* Contact Info */}
                        <div>
                            <h3 className="text-base font-semibold mb-4 text-gray-300">Contact Information</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-center gap-4">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-gray-200">{agent.phone || 'Not Provided'}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-gray-200">{agent.email || 'Not Provided'}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span className="text-gray-200">{agent.address || 'Not Provided'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Permissions */}
                        <div>
                            <h3 className="text-base font-semibold mb-2 text-gray-300">Permissions</h3>
                            <div className="bg-slate-900/50 p-3 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-100">Ticket Booking</p>
                                        <p className={`text-xs font-bold ${agent.isBookingAllowed ?? true ? 'text-green-400' : 'text-red-400'}`}>
                                            {agent.isBookingAllowed ?? true ? 'Allowed' : 'Blocked'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleToggleStatus}
                                        className={`font-bold py-1 px-3 rounded-md text-xs transition-colors text-white ${agent.isBookingAllowed ?? true ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
                                    >
                                        {agent.isBookingAllowed ?? true ? 'Block' : 'Unblock'}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-100">Visible to Players</p>
                                        <p className={`text-xs font-bold ${agent.isVisibleToPlayers ?? true ? 'text-green-400' : 'text-red-400'}`}>
                                            {agent.isVisibleToPlayers ?? true ? 'Visible' : 'Hidden'}
                                        </p>
                                    </div>
                                    <div className="relative group">
                                        <button
                                            onClick={handleToggleVisibility}
                                            disabled={visibilityControlDisabled}
                                            className={`font-bold py-1 px-3 rounded-md text-xs transition-colors text-white ${agent.isVisibleToPlayers ?? true ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {agent.isVisibleToPlayers ?? true ? 'Hide' : 'Show'}
                                        </button>
                                        {visibilityControlDisabled && (
                                            <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-xs rounded py-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg border border-slate-700">
                                                {visibilityError}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-700 flex items-center gap-2">
                             <button
                                onClick={() => setIsResetPopupOpen(true)}
                                className="w-full flex items-center justify-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M5.222 14.888a8.954 8.954 0 0111.664-1.222 8.954 8.954 0 011.222 11.664M19 19v-5h-5" />
                                </svg>
                                Reset Credentials
                            </button>
                            <button
                                onClick={() => onDelete(agent._id)}
                                className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Agent
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
            {isOpen && <ResetCredentialsPopup
                isOpen={isResetPopupOpen}
                onClose={() => setIsResetPopupOpen(false)}
                agent={agent}
                onConfirm={handleResetConfirm}
            />}
        </>
    );
};