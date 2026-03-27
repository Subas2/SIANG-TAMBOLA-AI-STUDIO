import React, { useState } from 'react';
import { User, AgentRequest } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';

// Input component for consistency
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

const TextareaWithIcon = ({ id, name, value, onChange, placeholder, required, rows = 3, children }: { id: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder: string, required?: boolean, rows?: number, children: React.ReactNode }) => (
     <div className="relative">
        <div className="absolute top-3 left-0 flex items-center pl-3 pointer-events-none">
            {children}
        </div>
        <textarea
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            rows={rows}
            className="w-full pl-10 p-2.5 border border-slate-600 bg-slate-700/50 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
        />
    </div>
);

interface AgentRequestFormPopupProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onSubmit: (formData: Omit<AgentRequest, '_id' | 'status' | 'playerId'>) => void;
}

export const AgentRequestFormPopup: React.FC<AgentRequestFormPopupProps> = ({ isOpen, onClose, user, onSubmit }) => {
    const toast = useToast();
    const [formData, setFormData] = useState({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        email: user.email || '',
        photo: user.photo || '',
        newUsername: '',
        password: '',
        reason: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.photo) {
            toast.show('Please upload a photo.', { type: 'error' });
            return;
        }

        if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.email.trim() || !formData.newUsername.trim() || !formData.password.trim() || !formData.reason.trim()) {
            toast.show('Please fill in all required fields.', { type: 'error' });
            return;
        }
        
        if (!/^\d{10}$/.test(formData.phone)) {
            toast.show('Please enter a valid 10-digit mobile number.', { type: 'error' });
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            onSubmit(formData);
            // Parent component will close the modal on success
            setIsSubmitting(false);
        }, 500);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" hideHeader disableContentPadding>
            <div className="relative bg-slate-800 text-white rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[85vh]">
                <div className="p-4 bg-gradient-to-br from-indigo-600/50 to-purple-700/50 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Become an Agent</h2>
                    <p className="text-xs text-indigo-200 mt-0.5">Fill out the form below to submit your request to the admin.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
                    <div className="p-4 space-y-4 overflow-y-auto flex-grow">
                        {/* Photo Upload */}
                        <div className="flex justify-center">
                            <div className="relative group">
                                <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-slate-600 shadow-lg">
                                    {formData.photo ? (
                                        <img src={formData.photo} alt="Profile Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <label htmlFor="agent-request-photo" className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </label>
                                <input id="agent-request-photo" name="photo" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                            </div>
                        </div>

                        {/* Login Details */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Login Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <InputWithIcon id="newUsername" name="newUsername" value={formData.newUsername} onChange={handleChange} placeholder="Desired Username" required>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                </InputWithIcon>
                                <InputWithIcon id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Set Password" required>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                </InputWithIcon>
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Personal Information</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <InputWithIcon id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                </InputWithIcon>
                                <InputWithIcon id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Phone Number" required pattern="\d{10}" title="Phone number must be 10 digits" inputMode="numeric">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </InputWithIcon>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <InputWithIcon id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address" required>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                </InputWithIcon>
                                <TextareaWithIcon id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Full Address" required rows={2}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                 </TextareaWithIcon>
                            </div>
                        </div>

                        {/* Motivation */}
                         <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Motivation</h3>
                             <TextareaWithIcon id="reason" name="reason" value={formData.reason} onChange={handleChange} placeholder="Why do you want to be an agent?" required rows={2}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                             </TextareaWithIcon>
                        </div>
                    </div>
                    
                    <div className="p-4 flex-shrink-0 flex justify-end gap-3 bg-slate-900/50 border-t border-slate-700">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="bg-slate-700 hover:bg-slate-600 text-gray-100 font-bold py-1.5 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-1.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-wait text-sm">
                            {isSubmitting && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
