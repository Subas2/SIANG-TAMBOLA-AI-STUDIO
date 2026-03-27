import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface ControlPanelAuthWallProps {
    onSuccess: () => void;
    onBack: () => void;
}

export const ControlPanelAuthWall: React.FC<ControlPanelAuthWallProps> = ({ onSuccess, onBack }) => {
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
                <p className="text-gray-400 mb-6">Enter your password to access the Game Control Panel.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Admin Password"
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
                        {isLoading ? 'Verifying...' : 'Unlock Control Panel'}
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-gray-300 font-medium py-2 px-4 rounded-lg transition-all duration-300"
                    >
                        Back to Dashboard
                    </button>
                </form>
                <div className="mt-6">
                </div>
            </div>
        </div>
    );
};
