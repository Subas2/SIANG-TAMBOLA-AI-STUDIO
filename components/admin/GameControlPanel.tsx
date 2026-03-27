import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Game, Claim, User, Ticket } from '../../types';
import { gameService } from '../../services/gameService';
import { dbService } from '../../services/db';
import { subscribeToDbChanges, mockDB } from '../../services/mockApi';
import { Modal } from '../common/Modal';
import { TambolaTicket } from '../common/TambolaTicket';
import { useSpeech } from '../../contexts/SpeechContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmationPopup } from '../common/ConfirmationPopup';

interface GameControlPanelProps {
    game: Game | null;
    onBack: () => void;
    fetchGames: () => void;
    tickets: Ticket[];
    settings: any;
    dbUsers: User[];
}

interface PlayerTicketsModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: User;
    tickets: Ticket[];
    game: Game;
    onUnbook: (ticketId: string) => void;
}

const PlayerTicketsModal: React.FC<PlayerTicketsModalProps> = ({ isOpen, onClose, player, tickets, game, onUnbook }) => {
    const playerTickets = tickets.filter(t => t.game === game._id && t.player === player._id);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" title={`${player.name}'s Tickets`}>
            <div className="max-h-[60vh] overflow-y-auto">
                <div className="mx-auto max-w-screen-xl grid gap-4 justify-items-center [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
                    {(playerTickets || []).length > 0 ? (playerTickets || []).map((ticket, index) => (
                        <TambolaTicket key={`${ticket._id}-${index}`} ticket={ticket} calledNumbers={game.calledNumbers} showActions={true} game={game} onUnbook={onUnbook} />
                    )) : <p className="text-gray-400 col-span-full text-center py-8">No tickets found for this player in this game.</p>}
                </div>
            </div>
        </Modal>
    );
};


export const GameControlPanel: React.FC<GameControlPanelProps> = ({ game: initialGame, onBack, fetchGames, tickets, settings, dbUsers }) => {
    const [game, setGame] = useState(initialGame);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [claimsTab, setClaimsTab] = useState<'pending' | 'history'>('pending');
    const [manualNumber, setManualNumber] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ message: string, onConfirm: () => void } | null>(null);
    const [viewingPlayer, setViewingPlayer] = useState<User | null>(null);
    const [callDelay, setCallDelay] = useState(settings.callDelay);
    const { speak } = useSpeech();
    const { activeTheme } = useTheme();
    const toast = useToast();

    const fetchGameAndClaims = useCallback(async () => {
        if (!initialGame) return;
        const updatedGame = mockDB.games.find(g => g._id === initialGame._id);
        if (updatedGame) {
            setGame(updatedGame);
        }
        const updatedClaims = await gameService.getClaims(initialGame._id) as unknown as Claim[];
        setClaims(updatedClaims);
    }, [initialGame]);

    useEffect(() => {
        fetchGameAndClaims();
        const unsubscribe = subscribeToDbChanges(fetchGameAndClaims);
        return () => unsubscribe();
    }, [fetchGameAndClaims]);

    useEffect(() => {
        setCallDelay(settings.callDelay);
    }, [settings.callDelay]);

    const playersInGame = useMemo(() => {
        if (!game) return [];
        const gameTickets = tickets.filter(t => t.game === game._id && t.status === 'booked' && t.player);
        const playerIds = [...new Set(gameTickets.map(t => t.player as string))];
        return dbUsers.filter(u => playerIds.includes(u._id));
    }, [game, tickets, dbUsers]);
    
    const handleAction = async (action: 'approve' | 'reject', claimId: string) => {
        if (!game) return;
        if (action === 'approve') {
            const response = await gameService.approveClaim(claimId);
            if (response.success && response.player && response.prize) {
                // The announcement is now handled by the useEffect watching game state.
                // speak(`Congratulations! ${response.player.name} has won ${response.prize.name}!`, () => {});
                toast.show(`Claim for ${response.prize.name} approved.`);
            } else {
                toast.show('Failed to approve claim.', { type: 'error' });
            }
        } else {
            await gameService.rejectClaim(claimId);
            toast.show('Claim rejected.');
        }
        fetchGames();
    };

    const handleManualCall = async () => {
        if (!game) return;
        const num = parseInt(manualNumber);
        if (isNaN(num) || num < 1 || num > 90) {
            toast.show('Please enter a valid number between 1 and 90.', { type: 'error' });
            return;
        }
        if (game.calledNumbers.includes(num)) {
            toast.show(`Number ${num} has already been called.`, { type: 'warning' });
            return;
        }
        await gameService.manualCallNumber(game._id, num);
        toast.show(`Number ${num} called manually.`);
        setManualNumber('');
        fetchGames();
    };

    const handleEndGame = async () => {
        if (game) {
            await gameService.endGame(game._id);
            toast.show(`Game "${game.title}" has been ended.`);
            fetchGames();
        }
    };
    
    const handleResetGame = async () => {
        if (game) {
            await gameService.resetGame(game._id);
            toast.show(`Game "${game.title}" has been reset.`);
            fetchGames();
            onBack();
        }
    };

    const handleToggleAutoCall = async () => {
        if (game) {
            await gameService.toggleAutoCall(game._id);
            toast.show(`Auto-call ${game.isAutoCalling ? 'paused' : 'resumed'}.`);
            fetchGames();
        }
    };

    const handleUnbookRequest = (ticketId: string) => {
        const confirmUnbook = async () => {
            try {
                await gameService.unbookTicket(ticketId);
                toast.show('Ticket has been unbooked successfully.');
                fetchGames();
            } catch (error) {
                toast.show((error as Error).message, { type: 'error' });
            }
        };

        setConfirmAction({
            message: "Are you sure you want to unbook this ticket? This will update player and payment records.",
            onConfirm: confirmUnbook
        });
        setShowConfirm(true);
    };

    const handleCallModeChange = async (newMode: 'auto' | 'mix') => {
        if (!game) return;
        try {
            await gameService.updateGame(game._id, { callMode: newMode });
            toast.show(`Call mode set to ${newMode}.`);
            // The component's state will automatically update from the subscription/polling.
        } catch (error) {
            toast.show('Failed to update call mode.', { type: 'error' });
        }
    };
    
    if (!game) {
        return (
            <div className="p-4">
                <p className="text-center text-gray-500">No active game selected.</p>
            </div>
        );
    }

    const { title, status, calledNumbers, isAutoCalling } = game;
    const isGameActive = status === 'ongoing';

    return (
        <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    <div className="bg-white/50 backdrop-blur-md p-4 rounded-xl shadow-lg">
                        <h3 className={`font-bold text-lg mb-3 ${activeTheme.cardTextColor}`}>Game State</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Title:</span> <span className="font-bold text-gray-800">{title}</span></div>
                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Status:</span> <span className={`font-bold uppercase ${isGameActive ? 'text-green-600' : 'text-gray-500'}`}>{status}</span></div>
                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Numbers Called:</span> <span className="font-bold text-gray-800">{(calledNumbers || []).length} / 90</span></div>
                            <div className="flex justify-between"><span className="font-semibold text-gray-600">Tickets Booked:</span> <span className="font-bold text-gray-800">{(playersInGame || []).length > 0 ? (tickets || []).filter(t => t.game === game._id && t.status === 'booked').length : 0}</span></div>
                        </div>
                    </div>

                    <div className="bg-white/50 backdrop-blur-md p-4 rounded-xl shadow-lg">
                        <h3 className={`font-bold text-lg mb-3 ${activeTheme.cardTextColor}`}>Game Controls</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={handleToggleAutoCall} disabled={!isGameActive} className={`p-2 rounded-lg font-bold text-white transition-colors ${isAutoCalling ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'} disabled:bg-gray-400 disabled:cursor-not-allowed`}>
                                {isAutoCalling ? 'Pause Auto' : 'Resume Auto'}
                            </button>
                            <button onClick={() => { setConfirmAction({ message: 'Are you sure you want to end this game? This will mark it as completed.', onConfirm: handleEndGame }); setShowConfirm(true); }} disabled={!isGameActive} className="p-2 rounded-lg font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                                End Game
                            </button>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-300">
                            <label className="text-sm font-semibold text-gray-600">Call Mode</label>
                            <div className="flex bg-gray-200/50 p-1 rounded-lg mt-1">
                                <button
                                    type="button"
                                    onClick={() => handleCallModeChange('auto')}
                                    className={`w-full text-center py-1.5 text-sm font-bold rounded-md transition-colors ${game.callMode === 'auto' ? 'bg-indigo-500 text-white shadow' : 'text-gray-700 hover:bg-white/50'}`}
                                >
                                    Auto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCallModeChange('mix')}
                                    className={`w-full text-center py-1.5 text-sm font-bold rounded-md transition-colors ${game.callMode === 'mix' ? 'bg-indigo-500 text-white shadow' : 'text-gray-700 hover:bg-white/50'}`}
                                >
                                    Mix
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {game.callMode === 'auto'
                                    ? "Auto: Only random numbers are called."
                                    : "Mix: Manual queue is used before random."}
                            </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-300">
                            <label className="text-sm font-semibold text-gray-600">Live Number Timer Speed (Seconds)</label>
                            <div className="flex items-center gap-4 mt-2">
                                <input 
                                    type="range" 
                                    min="2" 
                                    max="15" 
                                    value={callDelay} 
                                    onChange={async (e) => {
                                        const newDelay = parseInt(e.target.value);
                                        setCallDelay(newDelay);
                                        await gameService.updateSettings({ callDelay: newDelay });
                                        fetchGames();
                                    }} 
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="font-bold text-gray-800 w-8 text-center">{callDelay}s</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-300">
                             <h4 className="text-sm font-semibold text-gray-600 mb-2">Danger Zone</h4>
                             <button
                                onClick={() => { setConfirmAction({ message: 'Are you sure you want to reset this game? This will clear all called numbers, prize claims, and set the status to "upcoming". This action cannot be undone.', onConfirm: handleResetGame }); setShowConfirm(true); }}
                                disabled={game.status === 'upcoming'}
                                className="w-full p-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                   <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7V9a1 1 0 01-2 0V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13V11a1 1 0 112 0v2a1 1 0 01-1 1h-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                                Reset Game
                             </button>
                        </div>
                    </div>

                    <div className="bg-white/50 backdrop-blur-md p-4 rounded-xl shadow-lg">
                        <h3 className={`font-bold text-lg mb-3 ${activeTheme.cardTextColor}`}>Manual Call</h3>
                        <div className="flex gap-2">
                            <input type="number" value={manualNumber} onChange={e => setManualNumber(e.target.value)} placeholder="1-90" className="w-full p-2 border rounded-md" disabled={!isGameActive} />
                            <button onClick={handleManualCall} disabled={!isGameActive} className="p-2 px-4 rounded-lg font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors disabled:bg-gray-400">Call</button>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <div className="bg-white/50 backdrop-blur-md p-4 rounded-xl shadow-lg">
                        <div className="border-b border-gray-300 mb-2">
                            <nav className="-mb-px flex space-x-4">
                                <button onClick={() => setClaimsTab('pending')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${claimsTab === 'pending' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                    Pending Claims
                                </button>
                                <button onClick={() => setClaimsTab('history')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${claimsTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                    History
                                </button>
                            </nav>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {claimsTab === 'pending' && claims.filter(c => c.status === 'pending').map(claim => (
                                <div key={claim._id} className="bg-yellow-100/80 p-2 rounded-lg text-sm">
                                    <p><span className="font-bold">{dbUsers.find(u=>u._id === claim.player)?.name}</span> claims <span className="font-bold">{claim.prizeName}</span></p>
                                    <p className="text-xs">Ticket: #{tickets.find(t=>t._id === claim.ticket)?.serialNumber}</p>
                                    <div className="flex gap-2 mt-1">
                                        <button onClick={() => handleAction('approve', claim._id)} className="bg-green-500 text-white px-2 py-1 text-xs rounded-md w-full">Approve</button>
                                        <button onClick={() => handleAction('reject', claim._id)} className="bg-red-500 text-white px-2 py-1 text-xs rounded-md w-full">Reject</button>
                                    </div>
                                </div>
                            ))}
                             {claimsTab === 'history' && claims.filter(c => c.status !== 'pending').map((claim, index) => (
                                <div key={`${claim._id}-${index}`} className={`p-2 rounded-lg text-sm ${claim.status === 'approved' ? 'bg-green-100/80' : 'bg-red-100/80'}`}>
                                    <p><span className="font-bold">{dbUsers.find(u=>u._id === claim.player)?.name}</span> claimed <span className="font-bold">{claim.prizeName}</span></p>
                                    <p className={`text-xs font-bold uppercase ${claim.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>{claim.status}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white/50 backdrop-blur-md p-4 rounded-xl shadow-lg">
                        <h3 className={`font-bold text-lg mb-3 ${activeTheme.cardTextColor}`}>Players in Game ({(playersInGame || []).length})</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {playersInGame.map((player, index) => (
                                <div key={`${player._id}-${index}`} className="bg-gray-100/80 p-2 rounded-lg flex justify-between items-center">
                                    <p className="font-semibold text-sm text-gray-800">{player.name}</p>
                                    <button onClick={() => setViewingPlayer(player)} className="text-xs bg-blue-500 text-white font-bold py-1 px-3 rounded-full">View Tickets</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationPopup
                isOpen={showConfirm}
                onClose={() => { setShowConfirm(false); setConfirmAction(null); }}
                message={confirmAction?.message || ''}
                onConfirm={() => { if (confirmAction) confirmAction.onConfirm(); setShowConfirm(false); setConfirmAction(null); }}
            />

            
            {viewingPlayer && <PlayerTicketsModal 
                isOpen={!!viewingPlayer}
                onClose={() => setViewingPlayer(null)}
                player={viewingPlayer}
                tickets={tickets}
                game={game}
                onUnbook={handleUnbookRequest}
            />}
            
        </div>
    );
};
