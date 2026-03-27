import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Game, Prize, User, Ticket, TicketRequest, AgentRequest, Payment, Settings as SettingsType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSpeech } from '../../contexts/SpeechContext';
import { useTheme } from '../../contexts/ThemeContext';
import { gameService } from '../../services/gameService';
import { dbService } from '../../services/db';
import { mockDB } from '../../services/mockApi'; // Keep for now until fully removed

import { rhymes } from '../../constants';
import { LiveDisplay } from '../common/LiveDisplay';
import { TambolaBoard } from '../common/TambolaBoard';
import { TimeControlBar } from '../common/TimeControlBar';
import { DividendsList } from '../common/DividendsList';
import { AnnouncementPopup } from '../common/AnnouncementPopup';
import { AnnouncementDisplay } from '../common/AnnouncementDisplay';
import { GameControlPanel } from './GameControlPanel';
import { GameForm } from './GameForm';
import { ThemeManagement } from './ThemeManagement';
import { ManageGames } from './ManageGames';
import { Settings } from './Settings';
import { TicketRequests } from './TicketRequests';
import { AgentManagement } from '../AgentManagement';
import { AgentTicketBooking } from '../agent/AgentTicketBooking';
import { MyTicketsView } from './MyTicketsView';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { PlayerManagement } from './PlayerManagement';
import { WinnerManagement } from './WinnerManagement';
import { GamePreviewBanner } from './GamePreviewBanner';
import { useSound } from '../../contexts/SoundContext';
import { WinnerPopup } from '../common/WinnerPopup';
import { WinnerListPopup } from '../common/WinnerListPopup';
import { Leaderboard } from './Leaderboard';
import { DashboardTabs } from '../common/DashboardTabs';
import { useToast } from '../../contexts/ToastContext';
import { DashboardStats } from './DashboardStats';
// FIX: Corrected the casing of the import for 'SearchTicket' to resolve a module resolution error. The filename should be 'SearchTicket.tsx'.
import { SearchTicket } from '../common/SearchTicket';
import { DraggableModal } from '../common/DraggableModal';
import { LiveChat } from '../common/LiveChat';
import { PaymentVerification } from './PaymentVerification';
import { ControlPanelAuthWall } from './ControlPanelAuthWall';
import { announcementState } from '../../services/announcementState';
import { Modal } from '../common/Modal';
import { ConfirmationPopup } from '../common/ConfirmationPopup';
import { useGamePresence } from '../../hooks/useGamePresence';
import { isUsingMockData } from '../../services/mockApi';

interface AdminDashboardProps {
    page: string;
    onNavigate: (page: string) => void;
    games: Game[];
    tickets: Ticket[];
    ticketRequests: TicketRequest[];
    agentRequests: AgentRequest[];
    payments: Payment[];
    claims: any[];
    themes: any[];
    dbUsers: User[];
    settings: SettingsType;
    fetchGames: () => Promise<void>;
    editingGame: Game | null;
    setEditingGame: (game: Game | null) => void;
    isControlPanelUnlocked: boolean;
    setIsControlPanelUnlocked: (unlocked: boolean) => void;
}

interface Reaction {
    id: number;
    emoji: string;
    x: number;
    y: number;
}

interface PresenceUser {
    user_id: string;
    name: string;
    photo?: string;
}

const adminTabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'all_ticket', label: 'All Ticket' },
    { key: 'my_ticket', label: 'My Ticket' },
];

const StartGameAuthWall: React.FC<{ onSuccess: () => void; onBack: () => void; gameTitle: string }> = ({ onSuccess, onBack, gameTitle }) => {
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
                toast.show('Incorrect password.', { type: 'error' });
                setPassword('');
            }
            setIsLoading(false);
        }, 300);
    };

    return (
        <Modal isOpen={true} onClose={onBack} size="xs" title="Confirm Start Game">
            <div className="text-center p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-100 mt-4">Are you sure?</h3>
                <p className="text-sm text-gray-400 mt-2">Please enter your password to start the game "{gameTitle}". This action may close booking if enabled in settings.</p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Admin Password"
                        className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                        required
                        autoFocus
                    />
                    <div className="flex gap-2 justify-center">
                         <button type="button" onClick={onBack} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center">
                            {isLoading && <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {isLoading ? 'Starting...' : 'Confirm & Start'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

const AdminProfile: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { user, updateUser } = useAuth();
    const toast = useToast();
    const [formData, setFormData] = useState<Partial<User>>(user || {});
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setFormData(user);
        }
    }, [user]);

    if (!user) {
        return <div>Loading profile...</div>;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            const numericValue = value.replace(/[^0-9]/g, '');
            setFormData({ ...formData, [name]: numericValue });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
            toast.show('Please enter a valid 10-digit mobile number.', { type: 'error' });
            return;
        }
        updateUser(formData);
        toast.show('Profile updated successfully!');
    };
    
    const handlePasswordFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
            toast.show('Please fill in both password fields.', { type: 'error' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.show('Password must be at least 6 characters.', { type: 'error' });
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.show('New passwords do not match.', { type: 'error' });
            return;
        }

        updateUser({ password: passwordData.newPassword });
        toast.show('Password updated successfully!');
        setPasswordData({ newPassword: '', confirmPassword: '' });
    };

    const inputClass = "w-full p-2 border border-slate-600 bg-slate-700/50 text-white rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    
    return (
        <div className="p-4">
            <button onClick={() => onBack()} className="mb-4 text-gray-300 hover:text-white p-2 rounded-full bg-slate-700/50 shadow-md hover:shadow-lg transition-shadow duration-200">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-6 rounded-xl shadow-lg max-w-3xl mx-auto">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 flex flex-col items-center">
                            <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-slate-600 mb-4 relative group">
                                {formData.photo ? (
                                    <img src={formData.photo} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                )}
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    aria-label="Upload new profile photo"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm bg-slate-600 hover:bg-slate-500 text-gray-200 py-1.5 px-4 rounded-lg">
                                Change Photo
                            </button>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Name</label>
                                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Username</label>
                                <input type="text" name="username" value={formData.username || ''} onChange={handleChange} className={inputClass} />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300">Phone</label>
                                <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className={inputClass} placeholder="10-digit number" pattern="\d{10}" title="Phone number must be 10 digits" inputMode="numeric" maxLength={10} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Email</label>
                                <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputClass} placeholder="admin@example.com" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300">Address</label>
                                <input type="text" name="address" value={formData.address || ''} onChange={handleChange} className={inputClass} placeholder="123 Main St, Anytown" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 border-t border-slate-700 pt-4 flex justify-end">
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">
                            Save Changes
                        </button>
                    </div>
                </form>

                <div className="mt-8 border-t border-slate-700 pt-6">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Change Password</h3>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">New Password</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordFormChange}
                                className={inputClass}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Confirm New Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordFormChange}
                                className={inputClass}
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const QuickActions: React.FC<{
    navigateTo: (page: string) => void;
    onShowWinnerList: () => void;
    pendingTicketRequestCount: number;
    pendingAgentRequestCount: number;
    pendingPaymentCount: number;
}> = ({ navigateTo, onShowWinnerList, pendingTicketRequestCount, pendingAgentRequestCount, pendingPaymentCount }) => {
    const actions = [
        { key: 'create', title: 'Create Game', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10', action: () => navigateTo('create'), color: 'text-green-400' },
        { key: 'manage_games', title: 'Manage Games', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', action: () => navigateTo('manage_game'), color: 'text-blue-400' },
        { key: 'agents', title: 'Manage Agents', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.14-4.244a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243zm-2.121 9.435A9.094 9.094 0 0112 18c2.828 0 5.378-.888 7.47-2.372A3 3 0 0018 15.045V12H6v3.045A3 3 0 007.879 18.375z', action: () => navigateTo('agent'), color: 'text-purple-400' },
        { key: 'ticket_requests', title: 'Ticket Requests', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', action: () => navigateTo('ticket_requests'), color: 'text-yellow-400' },
        { key: 'payment_verification', title: 'Payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', action: () => navigateTo('payment_verification'), color: 'text-rose-400' },
        { key: 'analytics', title: 'Analytics', icon: 'M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM10.5 1.5V10.5L18 18', action: () => navigateTo('analytics'), color: 'text-teal-400' },
        { key: 'winner_list', title: 'Winner List', icon: 'M16 18.5v-5.5a4.5 4.5 0 00-9 0v5.5m-1.5 0V13a6 6 0 0112 0v5.5m-6-16v1.5m0 0a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-4.5 0v-1.5A2.25 2.25 0 0112 2.5zM9 13.5a3 3 0 116 0 3 3 0 016 0z', action: onShowWinnerList, color: 'text-orange-400' },
        { key: 'settings', title: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z', action: () => navigateTo('settings'), color: 'text-slate-400' },
    ];

    return (
        <div className="p-2">
            <h2 className="text-md font-bold text-gray-200 mb-2 px-1">Quick Actions</h2>
            <div className="grid grid-cols-4 gap-2">
                {actions.map(action => {
                    const notificationCount =
                        action.key === 'ticket_requests' ? pendingTicketRequestCount :
                        action.key === 'agents' ? pendingAgentRequestCount :
                        action.key === 'payment_verification' ? pendingPaymentCount : 0;
                        
                    return (
                        <button key={action.title} onClick={action.action} className="relative bg-slate-700/70 p-2 rounded-lg shadow-sm hover:bg-slate-600/70 hover:shadow-md transition-all duration-300 flex flex-col items-center justify-center aspect-w-1 aspect-h-1">
                            {notificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-slate-700/70">
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                            )}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 mb-1 ${action.color}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                            </svg>
                            <h3 className="text-xs font-semibold text-center text-gray-200">{action.title}</h3>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const CalledNumbersDisplay: React.FC<{ calledNumbers: number[] }> = ({ calledNumbers }) => {
    if ((calledNumbers || []).length === 0) {
        return null;
    }

    return (
        <div className="mt-4 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-4 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-center text-gray-200 mb-3">
                Called Numbers ({(calledNumbers || []).length})
            </h3>
            <div className="flex flex-wrap justify-center gap-2 p-1 bg-black/20 rounded-lg">
                {calledNumbers.slice().reverse().map((num, index) => (
                    <div 
                        key={`${num}-${index}`}
                        className="w-9 h-9 flex items-center justify-center bg-slate-700 text-gray-200 font-bold text-sm rounded-md shadow-sm"
                    >
                        {num}
                    </div>
                ))}
            </div>
        </div>
    );
};

interface ManualQueueDisplayProps {
    manualQueue: number[];
    onClear: () => void;
}

const ManualQueueDisplay: React.FC<ManualQueueDisplayProps> = ({ manualQueue, onClear }) => {
    if ((manualQueue || []).length === 0) {
        return null;
    }

    return (
        <div className="mt-4 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-200">
                    Manual Queue ({(manualQueue || []).length})
                </h3>
                <button
                    onClick={onClear}
                    className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors"
                >
                    Clear Queue
                </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2 p-1 bg-black/20 rounded-lg">
                {manualQueue.map((num, index) => (
                    <div 
                        key={`${num}-${index}`}
                        className="w-9 h-9 flex items-center justify-center bg-purple-500 text-white font-bold text-sm rounded-md shadow-sm"
                    >
                        {num}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    page, 
    onNavigate, 
    games, 
    tickets, 
    ticketRequests, 
    agentRequests, 
    payments, 
    claims,
    themes,
    dbUsers,
    settings,
    fetchGames, 
    editingGame, 
    setEditingGame,
    isControlPanelUnlocked,
    setIsControlPanelUnlocked
}) => {
    const { user, originalUser } = useAuth();
    const { speak } = useSpeech();
    const { activeTheme } = useTheme();
    const { playSound } = useSound();
    const speakRef = useRef(speak);
    const playSoundRef = useRef(playSound);

    useEffect(() => {
        speakRef.current = speak;
    }, [speak]);

    useEffect(() => {
        playSoundRef.current = playSound;
    }, [playSound]);
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');
    const { ongoingGame, nextUpcomingGame } = useMemo(() => {
        const currentOngoing = games.find(g => g.status === 'ongoing');
        
        let display: Game | null = null;
        let timer: Game | null = null;
    
        if (currentOngoing) {
            display = currentOngoing;
        } else {
            const upcomingGames = games
                .filter(g => g.status === 'upcoming')
                .sort((a, b) => {
                    const aDateTime = new Date(`${a.date} ${a.time}`).getTime();
                    const bDateTime = new Date(`${b.date} ${b.time}`).getTime();
                    return aDateTime - bDateTime;
                });
            const nextGame = upcomingGames[0] || null;

            if (nextGame) {
                const nextGameTime = new Date(`${nextGame.date} ${nextGame.time}`).getTime();
                const now = Date.now();
                const twentyFourHours = 24 * 60 * 60 * 1000;
                
                if (nextGameTime > now && nextGameTime - now < twentyFourHours) {
                    timer = nextGame;
                }
                display = nextGame;
            } else {
                const completedGames = games
                    .filter(g => g.status === 'completed')
                    .sort((a, b) => {
                        const aDate = new Date(`${a.date} ${a.time}`);
                        const bDate = new Date(`${b.date} ${b.time}`);
                        return bDate.getTime() - aDate.getTime();
                    });
                
                if ((completedGames || []).length > 0) {
                    display = completedGames[0];
                }
            }
        }
        return { ongoingGame: display, nextUpcomingGame: timer };
    }, [games]);

    const [lastCalled, setLastCalled] = useState<number | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);
    const [announcement, setAnnouncement] = useState(settings.announcement);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [timerTotalDuration, setTimerTotalDuration] = useState(settings.callDelay);
    const prevCycleEndsAt = useRef(0);
    const [sharingGame, setSharingGame] = useState<Game | null>(null);
    const [latestWinner, setLatestWinner] = useState<{ playerName: string, prizeName: string } | null>(null);
    const [showWinnerListPopup, setShowWinnerListPopup] = useState(false);
    const [pendingTicketRequestCount, setPendingTicketRequestCount] = useState(0);
    const [pendingAgentRequestCount, setPendingAgentRequestCount] = useState(0);
    const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [startGameAuth, setStartGameAuth] = useState<Game | null>(null);
    const isAuthWallOpen = useRef(false);
    const prevGamesRef = useRef<Game[]>([]);
    const prevOngoingGameRefForNumbers = useRef<Game | null>(null);
    
    const { onlineUsers, broadcastTypingUsers, sendTypingStatus } = useGamePresence(ongoingGame?._id, ongoingGame?.status, user);
    const isCurrentlyTypingRef = useRef(false);
    const typingTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (page !== 'control_panel') {
            setIsControlPanelUnlocked(false);
        }
    }, [page, setIsControlPanelUnlocked]);

    const handleSendMessage = useCallback((message: string) => {
        if (!user || !ongoingGame) return;
        gameService.sendChatMessage({
            gameId: ongoingGame._id,
            senderId: user._id,
            senderName: user.name,
            message,
        });
    }, [user, ongoingGame]);

    const handleTyping = useCallback(() => {
        if (!user) return;
        if (!isCurrentlyTypingRef.current) {
            isCurrentlyTypingRef.current = true;
            sendTypingStatus(true);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
            isCurrentlyTypingRef.current = false;
            sendTypingStatus(false);
        }, 2000);
    }, [user, sendTypingStatus]);

    const handleEmoji = (emoji: string) => {
        const newReaction: Reaction = {
            id: Date.now(),
            emoji,
            x: Math.random() * 80 + 10,
            y: Math.random() * 20 + 80,
        };
        setReactions(prev => [...prev, newReaction]);
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== newReaction.id));
        }, 3000);
    };


    useEffect(() => {
        const validPendingReqs = ticketRequests.filter(r => {
            if (r.status !== 'pending') return false;
            const ticketsForReq = r.ticketIds.map(id => tickets.find(t => t._id === id)).filter(Boolean);
            if ((ticketsForReq || []).length !== (r.ticketIds || []).length) return false;
            if ((ticketsForReq || []).length === 0) return false;
            const gameForReq = games.find(g => g._id === ticketsForReq[0]?.game);
            return !!gameForReq;
        });
        setPendingTicketRequestCount(prev => prev === (validPendingReqs || []).length ? prev : (validPendingReqs || []).length);

        const pendingAgentReqs = agentRequests.filter(r => r.status === 'pending');
        setPendingAgentRequestCount(prev => prev === (pendingAgentReqs || []).length ? prev : (pendingAgentReqs || []).length);
        
        const pendingPaymentVerifications = payments.filter(p => p.status === 'paid_by_agent');
        setPendingPaymentCount(prev => prev === (pendingPaymentVerifications || []).length ? prev : (pendingPaymentVerifications || []).length);
    }, [ticketRequests, agentRequests, payments]);
    
    useEffect(() => {
        const interval = setInterval(() => {
            setAnnouncement(prev => {
                if (settings.announcement?.id !== prev?.id) {
                    return settings.announcement;
                }
                return prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // This effect handles ALL spoken announcements (winners, game events, etc.)
    const lastEventAnnouncementRef = useRef<Record<string, { status: string, isAutoCalling: boolean }>>({});

    // This effect ONLY handles number announcements for the ONGOING game.
    useEffect(() => {
        if (!ongoingGame || ongoingGame.status !== 'ongoing') {
            prevOngoingGameRefForNumbers.current = null;
            return;
        }

        const prevGame = prevOngoingGameRefForNumbers.current;
        prevOngoingGameRefForNumbers.current = ongoingGame;

        if (!prevGame) {
            return; // Initial render or game switch, don't announce.
        }
        
        const hasWinnerAnnouncementThisTurn = (ongoingGame.announcements || []).length > (prevGame.announcements || []).length;
        
        const newLastCalled = (ongoingGame.calledNumbers || []).length > 0
            ? ongoingGame.calledNumbers[(ongoingGame.calledNumbers || []).length - 1]
            : null;
    
        const prevLastCalled = (prevGame.calledNumbers || []).length > 0
            ? prevGame.calledNumbers[(prevGame.calledNumbers || []).length - 1]
            : null;

        if (newLastCalled !== null && newLastCalled !== prevLastCalled) {
            if (!hasWinnerAnnouncementThisTurn) {
                const handleNumberCall = async () => {
                    if (!isMuted) {
                        await playSoundRef.current('numberCall', { number: newLastCalled, isRhyme: settings.useRhymes });
                    }
                };
                handleNumberCall();
            }
        }
    }, [ongoingGame, isMuted, settings]);

    useEffect(() => {
        if (ongoingGame) {
            const newLastCalled = (ongoingGame.calledNumbers || []).length > 0
                ? ongoingGame.calledNumbers[(ongoingGame.calledNumbers || []).length - 1]
                : null;
            setLastCalled(prev => prev === newLastCalled ? prev : newLastCalled);
        } else {
            setLastCalled(prev => prev === null ? prev : null);
        }
    }, [ongoingGame?.calledNumbers]);
    useEffect(() => {
        const prevGames = prevGamesRef.current;
        if (!prevGames) {
            prevGamesRef.current = games;
            // Initialize event ref
            games.forEach(g => {
                lastEventAnnouncementRef.current[g._id] = { status: g.status, isAutoCalling: g.isAutoCalling };
            });
            return;
        }
    
        games.forEach(currentGame => {
            const prevGame = prevGames.find(p => p._id === currentGame._id);
            if (!prevGame) return;

            let currentAnnouncedState = lastEventAnnouncementRef.current[currentGame._id] || { status: prevGame.status, isAutoCalling: prevGame.isAutoCalling };

            // 1. Game Status Announcements
            if (currentGame.status !== currentAnnouncedState.status) {
                if (currentGame.status === 'ongoing' && currentAnnouncedState.status === 'upcoming') {
                    // Removed "Game has started" TTS announcement as requested
                } else if (currentGame.status === 'completed' && currentAnnouncedState.status === 'ongoing') {
                    if (!isMuted) speakRef.current(`Game ${currentGame.title} has ended. Thank you for playing!`);
                }
                currentAnnouncedState = { ...currentAnnouncedState, status: currentGame.status };
            }

            // 2. Auto-call Announcements (only for ongoing games)
            if (currentGame.status === 'ongoing' && currentGame.isAutoCalling !== currentAnnouncedState.isAutoCalling) {
                currentAnnouncedState = { ...currentAnnouncedState, isAutoCalling: currentGame.isAutoCalling };
            }
            
            lastEventAnnouncementRef.current[currentGame._id] = currentAnnouncedState;
    
            // 3. Winner Announcements
            const prevAnnouncements = prevGame.announcements || [];
            const currentAnnouncements = currentGame.announcements || [];
    
            if ((currentAnnouncements || []).length > (prevAnnouncements || []).length) {
                const latestTimestamp = Math.max(0, ...currentAnnouncements.map(a => a.timestamp));
                
                if (latestTimestamp > announcementState.lastWinnerAnnouncementTimestamp) {
                    const prevTimestamps = new Set(prevAnnouncements.map(a => a.timestamp));
                    const newMessages = currentAnnouncements.filter(a => !prevTimestamps.has(a.timestamp)).map(a => a.text);
                    
                    if ((newMessages || []).length > 0) {
                        const fullMessage = newMessages.join(' ');
                        const lastWinnerMessage = [...newMessages].reverse().find(msg => msg.startsWith('Congratulations!'));

                        const playAnnouncement = async () => {
                            let finalMessage = fullMessage;
                            const lastCalledNumber = (currentGame.calledNumbers || []).length > 0 ? currentGame.calledNumbers[(currentGame.calledNumbers || []).length - 1] : null;
                            
                            if (lastCalledNumber && fullMessage.startsWith('Congratulations')) {
                                const numberText = (settings.useRhymes && rhymes[lastCalledNumber]) 
                                    ? rhymes[lastCalledNumber] 
                                    : `Number ${lastCalledNumber}`;
                                finalMessage = `${numberText}. ${fullMessage}`;
                            }

                            if (!isMuted) {
                                await speakRef.current(finalMessage);
                                if (lastWinnerMessage) {
                                    // Add small delay (2 seconds) after speech finishes
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                }
                            } else if (lastWinnerMessage) {
                                // If muted, wait a bit so people can read the popup
                                await new Promise(resolve => setTimeout(resolve, 5000));
                            }
                            
                            if (lastWinnerMessage) {
                                setLatestWinner(null);
                                
                                const delay = settings.callDelay * 1000;
                                await gameService.updateGame(currentGame._id, { 
                                    isPausedForAnnouncement: false,
                                    cycleEndsAt: Date.now() + delay
                                });
                            }
                        };
                        playAnnouncement();
                        
                        if (lastWinnerMessage) {
                            const match = lastWinnerMessage.match(/Congratulations! (.*) (has|have) won (.*)!/);
                            if (match) {
                                setLatestWinner(prev => {
                                    const next = { playerName: match[1], prizeName: match[3] };
                                    return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
                                });
                            }
                        }
                    }
                    announcementState.lastWinnerAnnouncementTimestamp = latestTimestamp;
                }
            }
        });
    
        prevGamesRef.current = games;
    }, [games, isMuted]);

    const countdownIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (ongoingGame?.cycleEndsAt && ongoingGame.isAutoCalling) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            
            countdownIntervalRef.current = window.setInterval(() => {
                const remaining = Math.max(0, (ongoingGame.cycleEndsAt! - Date.now()) / 1000);
                setCountdown(remaining);
            }, 100); // More frequent updates for smoother timer
        } else {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
            setCountdown(null);
        }
        return () => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [ongoingGame?._id, ongoingGame?.cycleEndsAt, ongoingGame?.isAutoCalling]);

    useEffect(() => {
        if (ongoingGame?.isAutoCalling && ongoingGame.cycleEndsAt && ongoingGame.cycleEndsAt !== prevCycleEndsAt.current) {
            // A new cycle has started because cycleEndsAt has a new value.
            // The time remaining right now is the total duration for this new cycle.
            const newDuration = (ongoingGame.cycleEndsAt - Date.now()) / 1000;
            setTimerTotalDuration(Math.max(0, newDuration));
            prevCycleEndsAt.current = ongoingGame.cycleEndsAt;
        } else if (!ongoingGame?.isAutoCalling) {
            // Reset to default when not auto-calling
            setTimerTotalDuration(settings.callDelay);
            prevCycleEndsAt.current = 0;
        }
    }, [ongoingGame?.isAutoCalling, ongoingGame?.cycleEndsAt, settings.callDelay]);

    const handleToggleQueueNumber = useCallback(async (number: number) => {
        if (ongoingGame) {
             await gameService.toggleManualQueueNumber(ongoingGame._id, number);
             await fetchGames();
        }
    }, [ongoingGame, fetchGames]);
    
    const handleClearQueue = useCallback(() => {
        if (ongoingGame) {
            setConfirmAction({
                message: "Are you sure you want to clear the entire manual queue? This cannot be undone.",
                onConfirm: async () => {
                    await gameService.clearManualQueue(ongoingGame._id);
                    toast.show('Manual queue cleared.');
                    await fetchGames();
                    setConfirmAction(null);
                }
            });
        }
    }, [ongoingGame, fetchGames, toast]);

    const boardClickHandler = useCallback((num: number) => {
        if (ongoingGame?.status !== 'ongoing') {
            return;
        }
        const currentMode = ongoingGame.callMode || settings.callMode;
        if (currentMode === 'mix') {
            handleToggleQueueNumber(num);
        } else {
            toast.show("Set Call Mode to 'Mix' in the Control Panel to use the manual queue.", { type: 'info' });
        }
    }, [ongoingGame, handleToggleQueueNumber, toast]);
    
    const handleSendAnnouncement = async (text: string) => {
        await gameService.sendAnnouncement(text);
        setAnnouncement(settings.announcement);
        setShowAnnouncementPopup(false);
        toast.show('Announcement sent!');
    };

    const handleConfirmStartGame = async () => {
        if (!startGameAuth) return;
        
        // Hide popup immediately
        const gameToStart = startGameAuth;
        setStartGameAuth(null);
        isAuthWallOpen.current = false;
        setIsControlPanelUnlocked(true);

        await gameService.toggleAutoCall(gameToStart._id);
        toast.show(`Game "${gameToStart.title}" has started!`);
        await fetchGames();
    };

    const handleToggleAutoCall = async () => {
        // If a game is currently ongoing (running or paused), the button toggles its state.
        if (ongoingGame && ongoingGame.status === 'ongoing') {
            await gameService.toggleAutoCall(ongoingGame._id);
            toast.show(`Auto-call ${ongoingGame.isAutoCalling ? 'paused' : 'resumed'}.`);
            await fetchGames();
            return;
        }

        if (ongoingGame && ongoingGame.status === 'completed') {
            setConfirmAction({
                message: 'This game is over and cannot be started again.',
                onConfirm: () => { setConfirmAction(null); }
            });
            return;
        }

        // If no game is active, find the next upcoming game.
        const upcomingGames = games
            .filter(g => g.status === 'upcoming')
            .sort((a, b) => {
                const aDateTime = new Date(`${a.date} ${a.time}`).getTime();
                const bDateTime = new Date(`${b.date} ${b.time}`).getTime();
                return aDateTime - bDateTime;
            });

        const nextGameToStart = upcomingGames[0];

        if (nextGameToStart) {
            setStartGameAuth(nextGameToStart);
        } else {
            toast.show("There are no upcoming games to start.", { type: 'warning' });
        }
    };

    const handleToggleBooking = async () => {
        if (ongoingGame) {
            await gameService.toggleBooking(ongoingGame._id);
            toast.show(`Booking is now ${!ongoingGame.isBookingOpen ? 'Open' : 'Closed'}.`);
            await fetchGames();
        }
    };

    const handleStartGame = async (game: Game) => {
        if (game.status === 'ongoing') {
            onNavigate('control_panel');
            return;
        }
    
        if (game.status === 'upcoming' && !isAuthWallOpen.current) {
            isAuthWallOpen.current = true;
            setStartGameAuth(game);
        }
    };

    const handleEditGame = (game: Game) => {
        setEditingGame(game);
        onNavigate('edit_game');
    };
    
    const handleDeleteGameRequest = (gameId: string) => {
        const confirmDelete = async () => {
            await gameService.deleteGame(gameId);
            toast.show('Game deleted successfully!');
            await fetchGames();
            setConfirmAction(null);
        };

        setConfirmAction({
            message: "Are you sure you want to delete this game? This action cannot be undone.",
            onConfirm: confirmDelete,
        });
    };

    const handleUnbookRequest = (ticketId: string) => {
        const ticket = tickets.find(t => t._id === ticketId);
        const message = ticket?.sheetId 
            ? "This ticket is part of a sheet. Unbooking it will unbook all tickets in the sheet. Are you sure?"
            : "Are you sure you want to unbook this ticket? This will remove it from the player and update payment records.";

        const confirmUnbook = async () => {
            try {
                await gameService.unbookTicket(ticketId);
                toast.show('Ticket has been unbooked successfully.');
                await fetchGames();
            } catch (error) {
                toast.show((error as Error).message, { type: 'error' });
            } finally {
                setConfirmAction(null);
            }
        };
        setConfirmAction({
            message: message,
            onConfirm: confirmUnbook,
        });
    };

    const renderContent = () => {
        if (!user) return null;
        
        if (page === 'admin_profile') {
            return <AdminProfile onBack={() => onNavigate('dashboard')} />;
        }
        if (page === 'analytics') {
            return <AnalyticsDashboard onBack={() => onNavigate('dashboard')} games={games} />;
        }
        if (page === 'leaderboard') {
            return <Leaderboard onBack={() => onNavigate('dashboard')} />;
        }
        if (page === 'control_panel') {
            return isControlPanelUnlocked ? (
                <GameControlPanel game={ongoingGame} onBack={() => onNavigate('dashboard')} fetchGames={fetchGames} tickets={tickets} settings={settings} dbUsers={dbUsers} />
            ) : (
                <ControlPanelAuthWall
                    onSuccess={() => setIsControlPanelUnlocked(true)}
                    onBack={() => onNavigate('dashboard')}
                />
            );
        }
        if (page === 'player_management') {
            return <PlayerManagement onBack={() => onNavigate('dashboard')} games={games} tickets={tickets} dbUsers={dbUsers} />;
        }
        if (page === 'winner_list') {
            return <WinnerManagement onBack={() => onNavigate('dashboard')} games={games} />;
        }
        if (page === 'payment_verification') {
            return <PaymentVerification onBack={() => onNavigate('dashboard')} payments={payments} />;
        }

        switch(page) {
            case 'create':
                return <GameForm onSuccess={() => onNavigate('manage_game')} onBack={() => onNavigate('dashboard')} themes={themes} />;
            case 'edit_game':
                 return <GameForm onSuccess={() => onNavigate('manage_game')} onBack={() => onNavigate('manage_game')} initialGameData={editingGame} themes={themes} />;
            case 'themes':
                return <ThemeManagement onBack={() => onNavigate('dashboard')} themes={themes} />;
            case 'manage_game':
                 return (
                     <div className="p-4">
                          <h1 className={`text-2xl font-bold ${activeTheme.textColor} mb-4`}>Game Management</h1>
                          <ManageGames 
                              games={games} 
                              tickets={tickets}
                              onViewGame={handleStartGame} 
                              onEditGame={handleEditGame} 
                              onDeleteRequest={handleDeleteGameRequest} 
                              onTicketsGenerated={fetchGames}
                              onShareRequest={setSharingGame}
                          />
                     </div>
                 );
            case 'settings':
                return <Settings onBack={() => onNavigate('dashboard')} />;
            case 'ticket_requests':
                return <TicketRequests onBack={() => onNavigate('dashboard')} user={user} requests={ticketRequests} onUpdate={fetchGames} tickets={tickets} games={games} />;
            case 'agent':
                return <AgentManagement onBack={() => onNavigate('dashboard')} games={games} tickets={tickets} dbUsers={dbUsers} agentRequests={agentRequests} onUpdate={fetchGames} />;
            case 'dashboard':
            default:
                return (
                    <div className="p-2">
                        <div className="bg-slate-800/60 backdrop-blur-md rounded-xl shadow-lg mb-2 border border-slate-700">
                            <DashboardTabs tabs={adminTabs} activeTab={activeTab} setActiveTab={setActiveTab} className="bg-black/20" />
                            {activeTab === 'dashboard' && <QuickActions 
                                                            navigateTo={onNavigate} 
                                                            onShowWinnerList={() => { if (ongoingGame) { setShowWinnerListPopup(true); } else { toast.show("No active or completed game to show winners for.", { type: 'info' }); } }}
                                                            pendingTicketRequestCount={pendingTicketRequestCount}
                                                            pendingAgentRequestCount={pendingAgentRequestCount}
                                                            pendingPaymentCount={pendingPaymentCount}
                                                        />}
                            {activeTab === 'dashboard' && <DashboardStats games={games} onNavigate={onNavigate} />}
                        </div>
                        
                        {activeTab === 'dashboard' && <AnnouncementDisplay announcement={announcement} user={user} />}

                        {activeTab === 'dashboard' && (
                            <div className="mt-2 bg-slate-800/60 backdrop-blur-md p-4 rounded-lg shadow-lg border border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h1 className="text-xl font-bold text-gray-100">Welcome, {user.name}</h1>
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleToggleBooking} disabled={!ongoingGame} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors disabled:opacity-50">
                                            {ongoingGame?.isBookingOpen ? 'Close Booking' : 'Open Booking'}
                                        </button>
                                        <button onClick={() => onNavigate('control_panel')} disabled={!ongoingGame} className="flex items-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors disabled:opacity-50">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            Control Panel
                                        </button>
                                    </div>
                                </div>
                                <LiveDisplay 
                                    lastCalled={lastCalled} 
                                    isAutoCalling={ongoingGame?.isAutoCalling} 
                                    onToggle={handleToggleAutoCall}
                                    showControls={true}
                                    isMuted={isMuted}
                                    onToggleMute={() => setIsMuted(!isMuted)}
                                    onAnnounce={() => setShowAnnouncementPopup(true)}
                                    timerDuration={timerTotalDuration}
                                    timerRemaining={countdown !== null ? countdown : undefined}
                                    onChatClick={ongoingGame ? () => setIsChatOpen(true) : undefined}
                                />
                                {ongoingGame && (
                                    <TimeControlBar 
                                        cycleStartedAt={ongoingGame.cycleStartedAt} 
                                        cycleEndsAt={ongoingGame.cycleEndsAt} 
                                        isAutoCalling={ongoingGame.isAutoCalling} 
                                    />
                                )}
                                <TambolaBoard calledNumbers={ongoingGame?.calledNumbers || []} lastCalled={lastCalled} manualQueue={ongoingGame?.manualQueue || []} onNumberClick={boardClickHandler} />
                                <ManualQueueDisplay manualQueue={ongoingGame?.manualQueue || []} onClear={handleClearQueue} />
                                <CalledNumbersDisplay calledNumbers={ongoingGame?.calledNumbers || []} />
                                <SearchTicket games={games} tickets={tickets} activeGame={ongoingGame} onUnbook={handleUnbookRequest} />
                                <DividendsList prizes={ongoingGame?.prizes || []} />
                            </div>
                        )}
                        {activeTab === 'all_ticket' && <AgentTicketBooking games={games} tickets={tickets} onTicketUpdate={fetchGames} onUnbook={handleUnbookRequest} dbUsers={dbUsers} />}
                        {activeTab === 'my_ticket' && <MyTicketsView games={games} tickets={tickets} user={user} onUnbook={handleUnbookRequest} />}

                    </div>
                );
        }
    };
    
    return (
        <>
            {renderContent()}

            {confirmAction && <ConfirmationPopup isOpen={true} onClose={() => setConfirmAction(null)} message={confirmAction.message} onConfirm={confirmAction.onConfirm} />}
            <AnnouncementPopup isOpen={showAnnouncementPopup} onClose={() => setShowAnnouncementPopup(false)} onSend={handleSendAnnouncement} />
            {sharingGame && <GamePreviewBanner
                gameData={{...sharingGame, bannerStyle: sharingGame.bannerStyle || 'classic_gold' }}
                prizes={sharingGame.prizes.map(p => ({ name: p.name, value: String(p.value), enabled: true }))}
                onClose={() => setSharingGame(null)}
            />}
            {latestWinner && <WinnerPopup isOpen={!!latestWinner} onClose={() => setLatestWinner(null)} winnerName={latestWinner.playerName} prizeName={latestWinner.prizeName} />}
            {showWinnerListPopup && ongoingGame && <WinnerListPopup isOpen={showWinnerListPopup} onClose={() => setShowWinnerListPopup(false)} game={ongoingGame} />}
            {ongoingGame && user && (
                <DraggableModal
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    title={`${(onlineUsers || []).length} Player${(onlineUsers || []).length === 1 ? '' : 's'} Online`}
                >
                    <style>{`
                        @keyframes float-up { to { transform: translateY(-150px); opacity: 0; } }
                        .reaction-emoji { animation: float-up 3s ease-out forwards; }
                    `}</style>
                    <div className="relative h-full w-full">
                         <LiveChat
                            gameId={ongoingGame._id}
                            messages={ongoingGame.chatMessages}
                            currentUser={user}
                            typingUsers={broadcastTypingUsers}
                            onSendMessage={handleSendMessage}
                            onTyping={handleTyping}
                            onEmoji={handleEmoji}
                        />
                         <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                            {reactions.map((r, index) => (
                                <span key={`${r.id}-${index}`} className="reaction-emoji absolute text-4xl" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
                                    {r.emoji}
                                </span>
                            ))}
                        </div>
                    </div>
                </DraggableModal>
            )}
            {startGameAuth && (
                <StartGameAuthWall
                    gameTitle={startGameAuth.title}
                    onSuccess={handleConfirmStartGame}
                    onBack={() => {
                        setStartGameAuth(null);
                        isAuthWallOpen.current = false;
                    }}
                />
            )}
        </>
    );
};