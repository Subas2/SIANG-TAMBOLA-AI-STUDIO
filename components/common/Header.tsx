import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api, mockDB } from '../../services/mockApi';
import { User, TicketRequest, AgentRequest, Payment } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface HeaderProps {
    onNavigate: (page: string) => void;
    currentPage: string;
    connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
    ticketRequests: TicketRequest[];
    agentRequests: AgentRequest[];
    payments: Payment[];
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage, connectionStatus, ticketRequests, agentRequests, payments }) => {
    const { user, logout, originalUser, switchUserView, revertUserView } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const userMenuRef = useRef<HTMLDivElement>(null);
    const notificationPanelRef = useRef<HTMLDivElement>(null);
    const toast = useToast();
    const isInitialLoadRef = useRef(true);
    const prevNotificationsRef = useRef<string[]>([]);

    useEffect(() => {
        // Request notification permission on component mount if not already granted or denied.
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    const notifications = useMemo(() => {
        if (!user) return [];
    
        const items: { type: string; message: string; page: string; id: string }[] = [];
        
        if (user.role === 'admin') {
            ticketRequests.filter(req => req.status === 'pending').forEach(req => items.push({ id: `tr-${req._id}`, type: 'Ticket Request', message: `${req.playerName} requested ${(req.ticketIds || []).length} ticket(s)`, page: 'ticket_requests' }));
            agentRequests.filter(req => req.status === 'pending').forEach(req => items.push({ id: `ar-${req._id}`, type: 'Agent Request', message: `${req.name} wants to be an agent`, page: 'agent' }));
            payments.filter(p => p.status === 'paid_by_agent').forEach(p => items.push({ id: `p-${p._id}`, type: 'Payment Verification', message: `Agent for ${p.playerName} marked payment`, page: 'payment_verification' }));
        } else if (user.role === 'agent') {
            ticketRequests
                .filter(req => req.agentId === user._id && req.status === 'pending')
                .forEach(req => items.push({ id: `tr-${req._id}`, type: 'Ticket Request', message: `${req.playerName} requested ${(req.ticketIds || []).length} ticket(s)`, page: 'ticket_requests' }));
        } else if (user.role === 'player') {
            ticketRequests
                .filter(req => req.playerId === user._id)
                .forEach(req => {
                    if (req.status === 'approved') {
                        items.push({ id: `tr-approved-${req._id}`, type: 'Ticket Request Approved', message: `Your request for ${(req.ticketIds || []).length} ticket(s) was approved!`, page: 'my_tickets' });
                    } else if (req.status === 'rejected') {
                        items.push({ id: `tr-rejected-${req._id}`, type: 'Ticket Request Rejected', message: `Your ticket request was rejected.`, page: 'my_requests' });
                    }
                });

            agentRequests
                .filter(req => req.playerId === user._id)
                .forEach(req => {
                    if (req.status === 'approved') {
                        items.push({ id: `ar-approved-${req._id}`, type: 'Agent Request Approved', message: `Congrats! You are now an agent. Please re-login.`, page: '' });
                    }
                });
        }
        return items.filter(item => !dismissedIds.has(item.id));
    }, [user, ticketRequests, agentRequests, payments, dismissedIds]);

    const dismissNotification = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDismissedIds(prev => new Set([...prev, id]));
    };

    useEffect(() => {
        if (!user) return;
        
        const currentIds = notifications.map(n => n.id);
        const prevIds = new Set(prevNotificationsRef.current);
        const addedNotifications = notifications.filter(n => !prevIds.has(n.id));

        if (!isInitialLoadRef.current && (addedNotifications || []).length > 0) {
            addedNotifications.forEach(newNotif => {
                toast.show(newNotif.message, { type: 'info', duration: 5000 });
                if ((newNotif.type.includes('Request') || newNotif.type.includes('Approved') || newNotif.type.includes('Rejected')) && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification(`New ${newNotif.type}`, {
                        body: newNotif.message,
                        icon: '/favicon.ico'
                    });
                }
            });
        }
        
        isInitialLoadRef.current = false;
        prevNotificationsRef.current = currentIds;
    }, [notifications, user, toast]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
            if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
                setIsNotificationPanelOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (!user) return null;
    
    const isViewingAs = !!originalUser;

    const agentToView = mockDB.users.find(u => u.role === 'agent');
    const playerToView = mockDB.users.find(u => u.role === 'player');
    const usersToView = [agentToView, playerToView].filter(Boolean) as User[];
    
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'Ticket Request':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" /></svg>;
            case 'Agent Request':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>;
            case 'Payment Verification':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
            case 'Ticket Request Approved':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'Ticket Request Rejected':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'Agent Request Approved':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>;
            default:
                return null;
        }
    };
    
    const statusInfo = {
        connected: { color: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]', text: 'Live Sync Active' },
        reconnecting: { color: 'bg-yellow-500 animate-pulse', text: 'Reconnecting to Live Sync...' },
        disconnected: { color: 'bg-red-500', text: 'Live Sync Disconnected' }
    };

    return (
        <>
            <style>
                {`
                    @keyframes glow {
                        0%, 100% { text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #a855f7, 0 0 20px #a855f7; }
                        50% { text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #ec4899, 0 0 20px #ec4899; }
                    }
                    .glowing-text {
                        animation: glow 4s ease-in-out infinite;
                    }
                `}
            </style>
            <header className="bg-slate-900/70 backdrop-blur-md shadow-lg p-2 flex justify-between items-center sticky top-0 z-20 border-b border-slate-700/50">
                {/* Left side: Menu Bar / Back Button */}
                <div className="flex items-center gap-2">
                    {(currentPage !== 'dashboard' && !isViewingAs) ? ( 
                        <button 
                            onClick={() => {
                                if (currentPage === 'edit_game') {
                                    onNavigate('manage_game');
                                } else {
                                    onNavigate('dashboard');
                                }
                            }} 
                            className="text-gray-300 hover:text-white p-2 rounded-full bg-slate-700/50 shadow-md hover:shadow-lg transition-shadow duration-200"
                            aria-label="Go back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                    ) : (
                        // Placeholder to keep the title centered when on dashboard
                        <div className="w-9 h-9"></div>
                    )}
                </div>

                {/* Center: App Title */}
                 <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-white glowing-text" style={{ fontFamily: "'Lobster', cursive" }}>
                        Siang Tambola
                    </h1>
                    <div className="group relative">
                        <span className={`block h-2.5 w-2.5 rounded-full ${statusInfo[connectionStatus].color}`}></span>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max bg-slate-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            {statusInfo[connectionStatus].text}
                        </div>
                    </div>
                </div>

                {/* Right side: User/View Switcher */}
                <div className="flex items-center gap-2">
                    {user.role === 'admin' && !isViewingAs && (
                        <button
                            onClick={() => onNavigate('themes')}
                            className="flex items-center justify-center text-gray-300 hover:text-white bg-slate-800 p-2 rounded-full"
                            aria-label="Customize theme"
                            title="Customize Theme"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                            </svg>
                        </button>
                    )}
                     <div className="relative" ref={notificationPanelRef}>
                        <button
                            onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
                            className="relative flex items-center justify-center text-gray-300 hover:text-white bg-slate-800 p-2 rounded-full"
                            aria-label="Open notifications"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.31 6.032l-1.338 2.134A9.022 9.022 0 006 21h12a9.022 9.022 0 00-3.143-3.918z" />
                            </svg>
                            {(notifications || []).length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-slate-900">
                                    {(notifications || []).length}
                                </span>
                            )}
                        </button>
                        <div className={`origin-top-right absolute -right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-[320px] rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 z-30 transition-all duration-200 ease-out ${isNotificationPanelOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                            <div className="p-3 border-b border-slate-700">
                                <h3 className="text-base font-semibold text-gray-100">Notifications</h3>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {(notifications || []).length > 0 ? (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            className="w-full text-left px-3 py-2.5 hover:bg-slate-700/50 flex items-start gap-3 cursor-pointer"
                                            onClick={() => { if (notif.page) { onNavigate(notif.page); } setIsNotificationPanelOpen(false); }}
                                        >
                                            <div className="p-1 bg-slate-900/50 rounded-full flex-shrink-0">
                                                {getNotificationIcon(notif.type)}
                                            </div>
                                            <div className="flex-grow">
                                                <p className="text-xs text-indigo-300 font-semibold">{notif.type}</p>
                                                <p className="text-sm text-gray-200 leading-tight">{notif.message}</p>
                                            </div>
                                            <button
                                                onClick={(e) => dismissNotification(notif.id, e)}
                                                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                                                title="Dismiss"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400 text-center py-6">No new notifications</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="relative" ref={userMenuRef}>
                        <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center justify-center text-gray-300 hover:text-white bg-slate-800 p-2 rounded-full" aria-label="Open user menu">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        <div className={`origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 z-30 transition-all duration-200 ease-out ${isUserMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                            <div className="py-1">
                                <div className="px-4 py-2 text-sm text-gray-300 border-b border-slate-700">
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-xs text-gray-400">@{user.username}</p>
                                    {isViewingAs && originalUser && (
                                        <p className="text-xs text-yellow-400 mt-1">Viewing as this user.</p>
                                    )}
                                </div>

                                {isViewingAs ? (
                                    <button
                                        onClick={() => { revertUserView(); setIsUserMenuOpen(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-yellow-300 hover:bg-yellow-500/20 hover:text-yellow-200 flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" />
                                        </svg>
                                        <span>Return to Admin</span>
                                    </button>
                                ) : (
                                    user.role === 'admin' && (
                                        <>
                                            <button
                                                onClick={() => { onNavigate('admin_profile'); setIsUserMenuOpen(false); }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                <span>Profile</span>
                                            </button>
                                            <div className="border-t border-slate-700 my-1">
                                                <div className="px-4 pt-2 pb-1 text-xs text-gray-400 uppercase">View As</div>
                                                <div className="max-h-48 overflow-y-auto">
                                                    {usersToView.map((otherUser, index) => (
                                                        <button
                                                            key={`${otherUser._id}-${index}`}
                                                            onClick={() => { switchUserView(otherUser._id); setIsUserMenuOpen(false); }}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 flex items-center gap-2"
                                                        >
                                                            <span>{otherUser.name} <span className="text-xs text-gray-400 capitalize">({otherUser.role})</span></span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )
                                )}
                                
                                {user.role !== 'player' && (
                                    <>
                                        <div className="border-t border-slate-700 my-1"></div>
                                        <button
                                            onClick={() => { 
                                                const role = user.role;
                                                logout(); 
                                                setIsUserMenuOpen(false); 
                                                if (role === 'admin') window.location.href = '/admin';
                                                else if (role === 'agent') window.location.href = '/agent';
                                                else window.location.href = '/';
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                            <span>Logout</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};