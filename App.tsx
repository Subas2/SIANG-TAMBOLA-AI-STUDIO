import React, { useState, useEffect, useCallback, lazy, Suspense, useMemo, useRef } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SpeechProvider } from './contexts/SpeechContext';
import { SoundProvider } from './contexts/SoundContext';
import { Header } from './components/common/Header';
import { api, mockDB, initializeData, subscribeToDbChanges, isUsingMockData } from './services/mockApi';
import { auth } from './firebase';
import { Game, Ticket, TicketRequest, AgentRequest, Payment, User } from './types';
import { AnimatedView } from './components/common/AnimatedView';
import { ScrollToTopButton } from './components/common/ScrollToTopButton';
import { Login } from './components/auth/Login';
import { Intro } from './components/common/Intro';

// Lazy load dashboard components for faster initial page load.
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AgentDashboard = lazy(() => import('./components/agent/AgentDashboard').then(module => ({ default: module.AgentDashboard })));
const PlayerDashboard = lazy(() => import('./components/player/PlayerDashboard').then(module => ({ default: module.PlayerDashboard })));
import { DashboardSkeleton } from './components/common/DashboardSkeleton';


interface AppRouterProps {
    page: string;
    onNavigate: (page: string) => void;
    editingGame: Game | null;
    setEditingGame: (game: Game | null) => void;
    games: Game[];
    tickets: Ticket[];
    ticketRequests: TicketRequest[];
    agentRequests: AgentRequest[];
    payments: Payment[];
    claims: any[];
    themes: any[];
    dbUsers: User[];
    settings: any;
    isControlPanelUnlocked: boolean;
    setIsControlPanelUnlocked: (unlocked: boolean) => void;
    fetchData: () => Promise<void>;
    connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
}

const AppRouter: React.FC<AppRouterProps> = ({ 
    page, onNavigate, editingGame, setEditingGame, games, tickets, 
    ticketRequests, agentRequests, payments, claims, themes, dbUsers, settings, 
    isControlPanelUnlocked, setIsControlPanelUnlocked, 
    fetchData, connectionStatus 
}) => {
    const { user } = useAuth();
    
    if (!user) return <div>Loading...</div>;
    
    const renderView = () => {
        switch(user.role) {
            case 'admin':
                return <AdminDashboard 
                            page={page} 
                            onNavigate={onNavigate} 
                            games={games}
                            tickets={tickets}
                            ticketRequests={ticketRequests}
                            agentRequests={agentRequests}
                            payments={payments}
                            claims={claims}
                            themes={themes}
                            dbUsers={dbUsers}
                            settings={settings}
                            fetchGames={fetchData}
                            editingGame={editingGame}
                            setEditingGame={setEditingGame}
                            isControlPanelUnlocked={isControlPanelUnlocked}
                            setIsControlPanelUnlocked={setIsControlPanelUnlocked}
                        />;
            case 'agent': return <AgentDashboard games={games} tickets={tickets} onTicketUpdate={fetchData} ticketRequests={ticketRequests} payments={payments} dbUsers={dbUsers} page={page} onNavigate={onNavigate} settings={settings} />;
            case 'player': return <PlayerDashboard games={games} tickets={tickets} ticketRequests={ticketRequests} onTicketUpdate={fetchData} dbUsers={dbUsers} page={page} onNavigate={onNavigate} settings={settings} claims={claims} />;
            default: return <div>Unknown Role</div>;
        }
    };

    return (
        <>
            <Header 
                onNavigate={onNavigate} 
                currentPage={page} 
                connectionStatus={connectionStatus} 
                ticketRequests={ticketRequests}
                agentRequests={agentRequests}
                payments={payments}
            />
            <Suspense fallback={<DashboardSkeleton />}>
                <AnimatedView key={user.role}>
                    {renderView()}
                </AnimatedView>
            </Suspense>
            <ScrollToTopButton />
        </>
    );
};

const AppLoader: React.FC<{ connectionStatus: 'connected' | 'reconnecting' | 'disconnected' }> = ({ connectionStatus }) => {
    const { isAuthReady } = useAuth();

    const statusInfo = {
        connected: { text: 'Connected! Loading Game...', borderColor: 'border-green-500' },
        reconnecting: { text: 'Connecting to Live Game Data...', borderColor: 'border-pink-500' },
        disconnected: { text: 'Connection failed. Using offline data.', borderColor: 'border-red-500' }
    };
    
    const currentStatus = statusInfo[connectionStatus];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white bg-slate-900">
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: "'Lobster', cursive" }}>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400">
              Siang Tambola
            </span>
          </h1>
          <p className="text-lg text-slate-300">{currentStatus.text}</p>
          <div className={`mt-8 w-16 h-16 border-4 border-dashed rounded-full animate-spin ${currentStatus.borderColor}`}></div>
        </div>
    );
};

function AppContent({ settings, setSettings }: { settings: any, setSettings: (s: any) => void }) {
    const { user, originalUser, loginAsPlayer, isAuthReady } = useAuth();
    const [showIntro, setShowIntro] = useState(true);
    const initPromiseRef = useRef<Promise<void> | null>(null);
    const [page, setPage] = useState('dashboard');
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const { activeTheme, getThemeClasses, getThemeStyle } = useTheme();
    const hasAutoLoggedInRef = useRef(false);

    const [games, setGames] = useState<Game[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [ticketRequests, setTicketRequests] = useState<TicketRequest[]>([]);
    const [agentRequests, setAgentRequests] = useState<AgentRequest[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [themes, setThemes] = useState<any[]>([]);
    const [dbUsers, setDbUsers] = useState<User[]>([]);
    const [isControlPanelUnlocked, setIsControlPanelUnlocked] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('reconnecting');
    const [appReady, setAppReady] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowIntro(false);
        }, 3800);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const path = window.location.pathname.replace(/\/$/, '');
        const isAuthPath = path === '/admin' || path === '/agent';
        // Auto-login as player if not on an auth path and auth is ready but no user is logged in
        if (isAuthReady && !user && !isAuthPath && !hasAutoLoggedInRef.current) {
            hasAutoLoggedInRef.current = true;
            loginAsPlayer();
        }
    }, [isAuthReady, user, loginAsPlayer]);

    const fetchData = useCallback(async () => {
        setGames([...mockDB.games]);
        setTickets([...mockDB.tickets]);
        setTicketRequests([...mockDB.ticketRequests]);
        setAgentRequests([...mockDB.agentRequests]);
        setPayments([...mockDB.payments]);
        setClaims([...mockDB.claims]);
        setThemes([...mockDB.themes]);
        setDbUsers([...mockDB.users]);
        setSettings({ ...mockDB.settings });
    }, []);

    // 1. Firebase is always connected once initialized
    useEffect(() => {
        if (appReady) {
            setConnectionStatus('connected');
        }
    }, [appReady]);

    // 2. Fetch initial data and set up polling fallback
    useEffect(() => {
        if (!isAuthReady) return;
        
        let isMounted = true;
        
        const init = async () => {
            // Re-initialize if user role changes (e.g. login/logout)
            initPromiseRef.current = initializeData(user?.role);
            await initPromiseRef.current;
            if (isMounted) {
                fetchData();
                setAppReady(true);
            }
        };

        init();
        const unsubscribe = subscribeToDbChanges(fetchData);

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [fetchData, isAuthReady, user?.role]);

    // Game loop management is moved here to be persistent.
    // It continues running even when the admin switches to an agent/player view.
    const lastLoopGameIdRef = useRef<string | null>(null);
    const lastLoopAutoCallRef = useRef<boolean>(false);
    const isFirstGameLoopSetup = useRef(true);

    useEffect(() => {
        const ongoingGame = games.find(g => g.status === 'ongoing');
        const isAdminSession = (user?.role === 'admin' && !originalUser) || (!!originalUser);

        if (isAdminSession) {
            const gameId = ongoingGame?._id || null;
            
            // Force isAutoCalling to false on first setup
            let isAutoCalling = ongoingGame?.isAutoCalling || false;
            if (isFirstGameLoopSetup.current) {
                isAutoCalling = false;
                isFirstGameLoopSetup.current = false;
            }

            if (gameId !== lastLoopGameIdRef.current || isAutoCalling !== lastLoopAutoCallRef.current) {
                lastLoopGameIdRef.current = gameId;
                lastLoopAutoCallRef.current = isAutoCalling;
                api.admin.manageGameLoop(ongoingGame || null);
            }
        } else {
            if (lastLoopGameIdRef.current !== null) {
                lastLoopGameIdRef.current = null;
                lastLoopAutoCallRef.current = false;
                api.admin.manageGameLoop(null);
            }
        }
    }, [games, user?.role, !!originalUser]);


    const navigateTo = (page: string) => {
        // When navigating away from the edit page, clear the game being edited.
        if (page !== 'edit_game') {
            setEditingGame(null);
        }
        setPage(page);
    };
    
    const appContainerClasses = `min-h-screen ${getThemeClasses(activeTheme)}`;
    const appContainerStyle = getThemeStyle(activeTheme);

    if (showIntro) {
        return <Intro />;
    }

    if (!appReady) {
        return (
            <div className={appContainerClasses} style={appContainerStyle}>
                <AppLoader connectionStatus={connectionStatus} />
            </div>
        );
    }
    
    const renderAppContent = () => {
        const path = window.location.pathname.replace(/\/$/, '');
        const isAuthPath = path === '/admin' || path === '/agent';
        const intendedRole = path === '/admin' ? 'admin' : path === '/agent' ? 'agent' : undefined;

        if (!user || (isAuthPath && user.role === 'player')) {
            return <AnimatedView><Login role={intendedRole} /></AnimatedView>;
        }
        return (
            <AppRouter 
                page={page} 
                onNavigate={navigateTo} 
                editingGame={editingGame}
                setEditingGame={setEditingGame}
                games={games}
                tickets={tickets}
                ticketRequests={ticketRequests}
                agentRequests={agentRequests}
                payments={payments}
                claims={claims}
                themes={themes}
                dbUsers={dbUsers}
                settings={settings}
                isControlPanelUnlocked={isControlPanelUnlocked}
                setIsControlPanelUnlocked={setIsControlPanelUnlocked}
                fetchData={fetchData}
                connectionStatus={connectionStatus}
            />
        );
    };

    return (
        <div className={appContainerClasses} style={appContainerStyle}>
            {renderAppContent()}
        </div>
    );
}

function App() {
    const [settings, setSettings] = useState<any>(mockDB.settings);

    return (
        <ThemeProvider>
            <SpeechProvider settings={settings}>
                <SoundProvider settings={settings}>
                    <ToastProvider>
                        <AuthProvider>
                            <AppContent settings={settings} setSettings={setSettings} />
                        </AuthProvider>
                    </ToastProvider>
                </SoundProvider>
            </SpeechProvider>
        </ThemeProvider>
    );
}

export default App;
