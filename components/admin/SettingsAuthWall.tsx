import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface SettingsAuthWallProps {
    onSuccess: () => void;
    onBack: () => void;
}

export const SettingsAuthWall: React.FC<SettingsAuthWallProps> = ({ onSuccess, onBack }) => {
    const { user } = useAuth();
    const toast = useToast();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        setTimeout(() => {
            if (user && password === user.password) {
                toast.show('Access granted!');
                onSuccess();
            } else {
                toast.show('Incorrect password. Please try again.', { type: 'error' });
                setPassword('');
            }
            setIsLoading(false);
        }, 300); // Simulate check
    };

    return (
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <div className="mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-100 mb-2">Secure Area</h2>
                <p className="text-gray-400 mb-6">Please enter your password to access the settings.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                            required
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
                    >
                        {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isLoading ? 'Verifying...' : 'Unlock Settings'}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-slate-800 px-2 text-sm text-gray-400">or use</span>
                    </div>
                </div>

                <div className="flex justify-center gap-4">
                    <button disabled className="p-3 bg-slate-700 rounded-full text-gray-500 cursor-not-allowed" title="Fingerprint (Coming Soon)">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M9 12h6" /></svg>
                    </button>
                     <button disabled className="p-3 bg-slate-700 rounded-full text-gray-500 cursor-not-allowed" title="PIN (Coming Soon)">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 11-12 0 6 6 0 0112 0zM7 8a1 1 0 11-2 0 1 1 0 012 0zm5 0a1 1 0 11-2 0 1 1 0 012 0zm-2 4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
                    </button>
                </div>
                
                <div className="mt-6">
                </div>
            </div>
        </div>
    );
};
