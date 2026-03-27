import React, { useState, useMemo } from 'react';
import { Prize, User, Ticket, Game, Theme } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { mockDB } from '../../services/mockApi';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from './Modal';
import { TambolaTicket } from './TambolaTicket';
import { WinnerSheetPreview } from './WinnerSheetPreview';

interface WinnerListProps {
    prizes: Prize[];
    game: Game | null;
}

interface SelectedWinnerInfo {
    player: User;
    ticket: Ticket;
    game: Game;
}

const getBannerStyles = (bannerStyle: string | undefined, theme: Theme | undefined) => {
    // Default styles, if no specific style matches
    const styles = {
        container: `bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-4 rounded-xl shadow-lg`,
        title: `text-lg font-bold text-center text-amber-300`,
        prizeCard: `bg-amber-500/20 p-3 rounded-lg shadow-sm border border-amber-500/30`,
        prizeName: `font-bold text-amber-200`,
        prizeValue: `font-semibold text-cyan-300`,
        winnerText: `text-gray-100`,
        agentText: `text-cyan-300`,
        ticketText: `text-gray-400`,
        infoButton: `bg-sky-500/50 text-white hover:bg-sky-500/80`,
    };
    
    const applyStyle = (styleConfig: Partial<typeof styles>) => Object.assign(styles, styleConfig);

    switch (bannerStyle) {
        case 'classic_gold':
            applyStyle({
                container: `bg-[#1a1a1a] border-2 border-[#b38b25] p-4 rounded-xl shadow-lg font-['Cinzel_Decorative'] text-[#e6c569]`,
                title: `font-bold text-center text-2xl text-white`,
                prizeCard: `bg-black/20 p-3 rounded-lg border border-[#b38b25]`,
                prizeName: `font-bold text-[#d4af37]`,
                prizeValue: `font-semibold text-white`,
                winnerText: `text-[#e6c569]`, agentText: `text-white`, ticketText: `text-[#b38b25]`,
                infoButton: `bg-[#b38b25]/50 text-white hover:bg-[#b38b25]/80`,
            });
            break;
        case 'modern_gradient':
            applyStyle({
                container: `font-['Poppins'] bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-xl shadow-lg text-white`,
                title: `font-bold text-center text-2xl text-white`,
                prizeCard: `bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20`,
                prizeName: `font-bold text-white`, prizeValue: `font-semibold text-white`,
                winnerText: `text-gray-100`, agentText: `text-indigo-200`, ticketText: `text-gray-300`,
                infoButton: `bg-white/20 text-white hover:bg-white/30`,
            });
            break;
        case 'neon_glow':
             applyStyle({
                container: `font-['Orbitron'] bg-[#1a001a] border-2 border-[#f0f] p-4 rounded-xl shadow-[0_0_15px_#f0f,inset_0_0_15px_#f0f]`,
                title: `font-bold text-center text-white animate-[neon-flicker_2s_infinite_alternate] text-2xl`,
                prizeCard: `bg-black/50 p-3 rounded-lg border border-[#f0f]`,
                prizeName: `font-bold text-[#0ff] [text-shadow:0_0_5px_#0ff]`,
                prizeValue: `font-semibold text-white`,
                winnerText: `text-white`, agentText: `text-[#0ff]`, ticketText: `text-gray-400`,
                infoButton: `bg-[#0ff]/50 text-black hover:bg-[#0ff]/80`,
            });
            break;
        case 'minimal_white':
             applyStyle({
                container: `bg-gray-100 border border-gray-200 p-4 rounded-xl shadow-lg text-gray-800 font-['Poppins']`,
                title: `font-bold text-center text-2xl text-gray-900`,
                prizeCard: `bg-white p-3 rounded-lg border border-gray-200`,
                prizeName: `font-bold text-indigo-600`, prizeValue: `font-semibold text-gray-700`,
                winnerText: `text-gray-800`, agentText: `text-indigo-700`, ticketText: `text-gray-500`,
                infoButton: `bg-gray-200 text-gray-800 hover:bg-gray-300`,
            });
            break;
        case 'glassmorphism':
            applyStyle({
                container: `font-['Poppins'] bg-slate-800/50 backdrop-blur-md border border-white/20 p-4 rounded-xl shadow-lg text-white`,
                title: `font-bold text-center text-2xl text-white`,
                prizeCard: `bg-black/20 backdrop-blur-sm p-3 rounded-lg border border-white/10`,
                prizeName: `font-bold text-white`, prizeValue: `font-semibold text-white`,
                winnerText: `text-gray-200`, agentText: `text-indigo-300`, ticketText: `text-gray-300`,
                infoButton: `bg-white/10 text-white hover:bg-white/20`,
            });
            break;
        case 'retro_arcade':
            applyStyle({
                container: `font-['Press_Start_2P'] bg-black border-4 border-white p-4 rounded-none shadow-lg text-white uppercase`,
                title: `text-center text-2xl text-yellow-300 [text-shadow:2px_2px_0_#f0f]`,
                prizeCard: `bg-transparent p-3 border-2 border-dashed border-blue-500`,
                prizeName: `font-bold text-blue-400`, prizeValue: `font-semibold text-yellow-300`,
                winnerText: `text-white`, agentText: `text-green-400`, ticketText: `text-gray-400`,
                infoButton: `bg-blue-500/80 text-white hover:bg-blue-500`,
            });
            break;
        case 'futuristic_blue':
            applyStyle({
                container: `font-['Orbitron'] bg-[#01041a] border border-[#4682b4] p-4 rounded-xl shadow-lg text-[#b0c4de]`,
                title: `font-bold text-center text-2xl text-white [text-shadow:0_0_10px_#add8e6]`,
                prizeCard: `bg-white/5 p-3 rounded-lg border border-[#4682b4]/50`,
                prizeName: `font-bold text-[#87ceeb]`, prizeValue: `font-semibold text-white`,
                winnerText: `text-[#b0c4de]`, agentText: `text-[#87ceeb]`, ticketText: `text-gray-400`,
                infoButton: `bg-[#4682b4]/50 text-white hover:bg-[#4682b4]/80`,
            });
            break;
        case 'comic_pop':
            applyStyle({
                container: `font-['Bangers'] bg-yellow-300 border-4 border-black p-4 rounded-xl shadow-lg text-black`,
                title: `font-bold text-center text-4xl text-[#e62e2d] [-webkit-text-stroke:2px_#000] [text-shadow:3px_3px_0_#fff]`,
                prizeCard: `bg-white p-3 rounded-lg border-2 border-black`,
                prizeName: `font-bold text-blue-600`, prizeValue: `font-semibold text-black`,
                winnerText: `text-black`, agentText: `text-blue-700`, ticketText: `text-gray-600`,
                infoButton: `bg-blue-500 text-white hover:bg-blue-600`,
            });
            break;
        case 'elegant_black':
            applyStyle({
                container: `font-['Playfair_Display'] bg-[#121212] border border-[#444] p-4 rounded-xl shadow-lg text-[#dcdcdc]`,
                title: `font-bold text-center text-2xl text-white tracking-wider`,
                prizeCard: `bg-[#222] p-3 rounded-lg border border-[#444]`,
                prizeName: `font-bold text-white`, prizeValue: `font-semibold text-white`,
                winnerText: `text-[#dcdcdc]`, agentText: `text-gray-300`, ticketText: `text-gray-500`,
                infoButton: `bg-[#444]/50 text-white hover:bg-[#444]`,
            });
            break;
        case 'nature_green':
            applyStyle({
                container: `font-['Pacifico'] bg-[#3a5a40] p-4 rounded-xl shadow-lg text-[#f2e8cf] border-2 border-[#dad7cd]`,
                title: `font-bold text-center text-2xl text-white`,
                prizeCard: `bg-white/10 p-3 rounded-lg border border-[#a3b18a]`,
                prizeName: `font-bold text-white`, prizeValue: `font-semibold text-white`,
                winnerText: `text-[#f2e8cf]`, agentText: `text-white`, ticketText: `text-gray-300`,
                infoButton: `bg-[#a3b18a]/50 text-white hover:bg-[#a3b18a]`,
            });
            break;
    }
    return styles;
};


export const WinnerList: React.FC<WinnerListProps> = ({ prizes, game }) => {
    const { user } = useAuth();
    const toast = useToast();
    const [selectedWinner, setSelectedWinner] = useState<SelectedWinnerInfo | null>(null);
    const [showWinnerSheet, setShowWinnerSheet] = useState(false);
    
    const winnersByPrize = useMemo(() => (prizes || []).filter(p => p.claimedBy && (p.claimedBy || []).length > 0), [prizes]);
    const gameTheme = useMemo(() => game ? mockDB.themes.find(t => t._id === game.theme) : undefined, [game]);
    const styles = useMemo(() => getBannerStyles(game?.bannerStyle, gameTheme), [game?.bannerStyle, gameTheme]);


    if ((winnersByPrize || []).length === 0) {
        return null;
    }
    
    const handleShare = async () => {
        if (game) {
            setShowWinnerSheet(true);
        } else {
            toast.show("Game data not available to generate a winner sheet.", { type: 'error' });
        }
    };

    const getAgentName = (ticketId: number): string | null => {
        if (!game) return null;
        const winningTicket = mockDB.tickets.find(t => t.game === game._id && t.serialNumber === ticketId);
        if (winningTicket && winningTicket.bookedByAgent) {
            const agent = mockDB.users.find(u => u._id === winningTicket.bookedByAgent);
            return agent ? agent.name : null;
        }
        return null;
    };
    
    const handleShowInfo = (winner: { name: string; ticketId: number; playerId: string; }) => {
        if (!game) {
            toast.show("Game information is missing.", { type: 'error' });
            return;
        }
        const player = mockDB.users.find(u => u._id === winner.playerId);
        const ticket = mockDB.tickets.find(t => t.game === game._id && t.serialNumber === winner.ticketId);
        
        if (player && ticket && game) {
            setSelectedWinner({ player, ticket, game });
        } else {
            toast.show("Could not find winner details.", { type: 'error' });
        }
    };

    return (
        <>
            {game?.bannerStyle === 'neon_glow' && (
                <style>{`
                    @keyframes neon-flicker { 0%, 100% { text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #f0f, 0 0 20px #f0f; } 50% { text-shadow: 0 0 5px #fff, 0 0 8px #fff, 0 0 12px #f0f, 0 0 16px #f0f; } }
                `}</style>
            )}
            <div className={styles.container}>
                <div className="flex justify-center items-center mb-3 relative">
                    <h3 className={styles.title}>🏆 Winners 🏆</h3>
                    <button
                        onClick={handleShare}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 p-1"
                        title="Share Winners"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                        </svg>
                    </button>
                </div>
                <div className="space-y-3">
                    {winnersByPrize.map(prize => {
                        const dividedValue = (Number(prize.value) / (prize.claimedBy || []).length).toFixed(2);
                        return (
                            <div key={prize.name} className={styles.prizeCard}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className={styles.prizeName}>{prize.name}</p>
                                        <p className="text-xs text-gray-400">Total Prize: ₹{prize.value}/-</p>
                                    </div>
                                    {(prize.claimedBy || []).length > 1 && (
                                        <div className="text-right">
                                            <p className={styles.prizeValue}>Shared by {(prize.claimedBy || []).length}</p>
                                            <p className="text-xs text-gray-400">₹{dividedValue} each</p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                                    {prize.claimedBy.map(winner => {
                                        const agentName = getAgentName(winner.ticketId);
                                        const canShowAgent = user?.role === 'admin' || user?.role === 'agent';
                                        const canShowInfo = user?.role === 'admin';

                                        return (
                                            <div key={`${winner.playerId}-${winner.ticketId}`} className="flex justify-between items-center text-sm">
                                                <div>
                                                    <p className={styles.winnerText}>{winner.name}</p>
                                                    {agentName && canShowAgent && <p className={`text-xs ${styles.agentText}`}>via {agentName}</p>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-xs ${styles.ticketText}`}>Tkt #{winner.ticketId}</p>
                                                    {canShowInfo && (
                                                        <button
                                                            onClick={() => handleShowInfo(winner)}
                                                            className={`${styles.infoButton} font-bold py-1 px-2 rounded-md text-[10px] transition-colors`}
                                                        >
                                                            Info
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {showWinnerSheet && game && (
                <WinnerSheetPreview
                    gameData={game}
                    prizes={winnersByPrize}
                    onClose={() => setShowWinnerSheet(false)}
                />
            )}

            <Modal isOpen={!!selectedWinner} onClose={() => setSelectedWinner(null)} size="xs" title="Winner Information">
                {selectedWinner && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-400">Name</p>
                            <p className="font-bold text-lg text-white">{selectedWinner.player.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Phone</p>
                            <p className="font-bold text-lg text-white">{selectedWinner.player.phone || 'Not available'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-2">Winning Ticket</p>
                            <div className="flex justify-center">
                                <TambolaTicket
                                    ticket={selectedWinner.ticket}
                                    calledNumbers={selectedWinner.game.calledNumbers}
                                    game={selectedWinner.game}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};
