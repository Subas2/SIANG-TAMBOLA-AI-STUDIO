import React, { useRef, useMemo } from 'react';
import { Ticket, Game } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { mockDB } from '../../services/mockApi';
import { validateClaim } from '../../services/gameUtils';
import { useToast } from '../../contexts/ToastContext';

// Add html2canvas to window
declare global {
    interface Window {
        html2canvas: any;
    }
}

interface TambolaTicketProps {
    ticket: Ticket;
    calledNumbers: number[];
    game?: Game;
    showActions?: boolean;
    onBook?: () => void;
    onAddToMyTickets?: () => void;
    isTracked?: boolean;
    isSelectable?: boolean;
    isSelected?: boolean;
    onSelect?: (ticketId: string) => void;
    pendingRequestInfo?: { playerName: string };
    onUnbook?: (ticketId: string) => void;
    onClaimPrize?: (prizeName: string) => void;
    displayMode?: 'track' | 'remove';
    onShowPhoneRequest?: (playerId: string) => void;
    isPhoneVisible?: boolean;
}

export const TambolaTicket: React.FC<TambolaTicketProps> = React.memo(({ ticket, calledNumbers, game, showActions = false, onBook, onAddToMyTickets, isTracked, isSelectable = false, isSelected = false, onSelect, pendingRequestInfo, onUnbook, onClaimPrize, displayMode = 'track', onShowPhoneRequest, isPhoneVisible }) => {
    const { user } = useAuth();
    const ticketRef = useRef<HTMLDivElement>(null);
    const ticketTheme = game?.ticketTheme || 'default';
    const toast = useToast();

    const player = useMemo(() => ticket.status === 'booked' && ticket.player ? mockDB.users.find(u => u._id === ticket.player) : null, [ticket.player, ticket.status]);

    const themeClasses = useMemo(() => ({
        default: {
            wrapper: 'bg-slate-900/70 border-slate-600',
            headerText: 'text-amber-300',
            gridBorder: 'border-slate-700/50',
            gridBg: 'bg-black/30',
            cellBg: 'bg-slate-900/50',
            numberUncalled: 'bg-slate-200 text-slate-800',
            numberCalled: 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-[0_0_10px_theme(colors.pink.400)]'
        },
        festive: {
            wrapper: 'ticket-theme-festive', headerText: 'ticket-header-text', gridBorder: 'ticket-grid-border', gridBg: 'ticket-grid-bg', cellBg: 'ticket-cell-bg', numberUncalled: 'ticket-number-uncalled', numberCalled: 'ticket-number-called'
        },
        classic: {
            wrapper: 'ticket-theme-classic', headerText: 'ticket-header-text', gridBorder: 'ticket-grid-border', gridBg: 'ticket-grid-bg', cellBg: 'ticket-cell-bg', numberUncalled: 'ticket-number-uncalled', numberCalled: 'ticket-number-called'
        },
        floral: {
            wrapper: 'ticket-theme-floral', headerText: 'ticket-header-text', gridBorder: 'ticket-grid-border', gridBg: 'ticket-grid-bg', cellBg: 'ticket-cell-bg', numberUncalled: 'ticket-number-uncalled', numberCalled: 'ticket-number-called'
        },
        patriotic: {
            wrapper: 'ticket-theme-patriotic', headerText: 'ticket-header-text', gridBorder: 'ticket-grid-border', gridBg: 'ticket-grid-bg', cellBg: 'ticket-cell-bg', numberUncalled: 'ticket-number-uncalled', numberCalled: 'ticket-number-called'
        }
    }), []);
    
    const claimablePrizes = useMemo(() => {
        if (!game || !user || !onClaimPrize || game.status !== 'ongoing') {
            return [];
        }

        const unclaimedPrizes = game.prizes.filter(prize => {
            const hasUserClaimed = (prize.claimedBy || []).some(c => c.playerId === user._id);
            const hasAnyoneClaimed = (prize.claimedBy || []).length > 0;
            const isSecondHouse = prize.name.toLowerCase().trim() === 'second house';
            
            if (hasUserClaimed) return false;
            if (hasAnyoneClaimed && !isSecondHouse) return false;
            return true;
        });

        return unclaimedPrizes.filter(prize => {
            const isValid = validateClaim(ticket, calledNumbers, prize.name, game, mockDB.tickets);
            return isValid === true || isValid === null;
        });
    }, [game, user, ticket, calledNumbers, onClaimPrize]);

    const handleCopyPhone = (e: React.MouseEvent, phone: string | undefined) => {
        e.stopPropagation();
        if (phone) {
            navigator.clipboard.writeText(phone);
            toast.show('Phone number copied!');
        }
    };

    const currentTheme = themeClasses[(ticketTheme) as keyof typeof themeClasses] || themeClasses.default;
    const useBannerBg = game?.useBannerBackgroundOnTickets && game.ticketBackgroundImage;
    
    const wrapperClass = `relative backdrop-blur-md border rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden w-full max-w-[360px] ${!useBannerBg ? currentTheme.wrapper : 'border-slate-600'} ${isSelectable && !pendingRequestInfo ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-indigo-500' : 'hover:border-slate-500'} p-[clamp(8px,1.2vw,14px)] text-[clamp(12px,1.1vw,16px)]`;

    const backgroundStyles: React.CSSProperties = useBannerBg ? {
        backgroundImage: `url(${game.ticketBackgroundImage})`,
        filter: game.ticketBackgroundSettings?.blur ? `blur(${game.ticketBackgroundSettings.blur}px)` : 'none',
    } : {};

    const overlayStyles: React.CSSProperties = useBannerBg ? {
        backgroundColor: `rgba(0, 0, 0, ${(game.ticketBackgroundSettings?.dimOverlay ?? 20) / 100})`,
    } : {};

    const gridBgClass = useBannerBg ? 'bg-transparent' : currentTheme.gridBg;
    const cellBgClass = useBannerBg ? 'bg-transparent' : currentTheme.cellBg;

    const handleActionClick = (e: React.MouseEvent, action: (() => void) | (() => Promise<void>)) => {
        e.stopPropagation();
        action();
    };

    const handleSelect = () => {
        if (onSelect && !pendingRequestInfo && ticket.status === 'available') {
            onSelect(ticket._id);
        }
    };
    
    const handleShare = async () => {
        if (!ticketRef.current || !window.html2canvas) {
            console.error("Share functionality not ready.");
            return;
        }

        const elementToCapture = ticketRef.current;
        const actionsElement = elementToCapture.querySelector('.ticket-actions-bar');

        if (actionsElement) {
            (actionsElement as HTMLElement).style.visibility = 'hidden';
        }

        try {
            const canvas = await window.html2canvas(elementToCapture, { 
                backgroundColor: null,
                useCORS: true,
                scale: 2
            });
            const dataUrl = canvas.toDataURL('image/png');
            
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
            
            if (!blob) {
                console.error("Failed to generate blob from canvas.");
                return;
            }

            if (navigator.share) {
                const file = new File([blob], `tambola-ticket-${ticket.serialNumber}.png`, { type: 'image/png' });

                const shareData: ShareData = {
                    title: `Tambola Ticket #${ticket.serialNumber}`,
                    text: `Check out this Tambola ticket!`,
                    files: [file],
                };

                // Conditionally add URL to avoid errors in sandboxed environments
                if (window.location.href && window.location.href.startsWith('http')) {
                    shareData.url = window.location.href;
                }

                await navigator.share(shareData);
            } else {
                const link = document.createElement('a');
                link.download = `tambola-ticket-${ticket.serialNumber}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Error sharing ticket:', error);
        } finally {
            if (actionsElement) {
                (actionsElement as HTMLElement).style.visibility = 'visible';
            }
        }
    };


    const showBookOrRequestButton = ticket.status === 'available' && onBook;
    const canUnbook = user?.role === 'admin' && ticket.status === 'booked';

    return (
        <div className={wrapperClass} onClick={handleSelect} ref={ticketRef}>
             {ticket.sheetId && ticket.status === 'booked' && (
                <div className="absolute top-0 left-0 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg z-20 shadow-lg">
                    SHEET
                </div>
            )}
            {useBannerBg && (
                <div 
                    className="absolute inset-0 bg-cover bg-center z-0" 
                    style={backgroundStyles}
                />
            )}
            {useBannerBg && (
                 <div
                    className="absolute inset-0 z-[5]"
                    style={overlayStyles}
                />
            )}
            
            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-start mb-1 px-1">
                    {/* Left Side: Ticket Number */}
                    <h4 className={`font-mono font-bold text-sm ${currentTheme.headerText}`}>TKT #{ticket.serialNumber}</h4>

                    {/* Right Side: Status or Player Name */}
                    <div className="text-right min-w-0">
                        {player ? (
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5">
                                    {onShowPhoneRequest && (
                                        <button
                                            onClick={(e) => handleActionClick(e, () => onShowPhoneRequest(player._id))}
                                            className="text-gray-400 hover:text-white"
                                            title="Show player phone number"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                    <p className="text-xs font-semibold text-gray-300 truncate">{player.name}</p>
                                </div>
                                {isPhoneVisible && (
                                    <div className="flex items-center gap-1.5 mt-0.5 animate-fade-in-up">
                                        <p className="text-xs text-indigo-300 font-mono">{player.phone || 'No phone'}</p>
                                        {player.phone && (
                                            <button 
                                                onClick={(e) => handleCopyPhone(e, player.phone)} 
                                                className="text-gray-400 hover:text-white"
                                                title="Copy phone number"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : !pendingRequestInfo ? (
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold rounded-full transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-green-400 text-slate-900'} pl-2 pr-1 py-0.5`}>
                                Available
                                <span className={`h-2.5 w-2.5 rounded-full border ${isSelected ? 'border-white/50 bg-white' : 'border-slate-900/50 bg-white/50'}`}></span>
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* Grid */}
                <div className={`grid grid-cols-9 border-t border-l ${currentTheme.gridBorder} rounded-lg overflow-hidden ${gridBgClass} shadow-inner`}>
                    {ticket.numbers.flat().map((num, index) => {
                        const isCalled = num !== null && calledNumbers.includes(num);

                        const gridCellClass = `h-8 border-r border-b ${currentTheme.gridBorder} flex items-center justify-center p-0.5 ${cellBgClass}`;

                        if (num === null) {
                            return <div key={index} className={gridCellClass}></div>;
                        }
                        
                        let chipClass = 'ticket-number-chip w-full h-full rounded-full flex items-center justify-center font-bold font-sans text-[clamp(12px,1.1vw,16px)]';

                        if (isCalled) {
                            chipClass += ` ${currentTheme.numberCalled} scale-105 animate-subtle-called-glow`;
                        } else {
                            chipClass += ` ${currentTheme.numberUncalled} shadow-sm`;
                        }

                        return (
                            <div key={index} className={gridCellClass}>
                                <div className={chipClass}>
                                     <span style={{ transform: 'translateY(0.5px)' }}>{num}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Actions */}
                {showActions && (
                    <div className="ticket-actions-bar flex items-stretch gap-1 mt-1.5">
                        {onAddToMyTickets && (
                            <button
                                title={isTracked ? (displayMode === 'remove' ? 'Remove from My Tickets' : 'Stop Tracking Ticket') : 'Track Ticket'}
                                onClick={(e) => handleActionClick(e, onAddToMyTickets)}
                                className={`flex-1 flex items-center justify-center gap-1 font-semibold py-0.5 px-2 rounded-md text-[10px] shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
                                    ${isTracked
                                        ? (displayMode === 'remove' ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300 focus:ring-red-500' : 'bg-green-600/20 hover:bg-green-600/30 text-green-300 focus:ring-green-500')
                                        : 'bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 focus:ring-sky-500'
                                    }`}
                            >
                                {isTracked ? (
                                    displayMode === 'remove' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                        </svg>
                                    )
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                )}
                                <span className="leading-tight">{
                                    isTracked
                                        ? (displayMode === 'remove' ? 'Remove' : 'Tracked')
                                        : 'Track'
                                }</span>
                            </button>
                        )}

                        {showBookOrRequestButton && onBook && (
                            <button 
                                onClick={(e) => handleActionClick(e, onBook)} 
                                className="flex-1 flex items-center justify-center gap-1 bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold py-0.5 px-2 rounded-md text-[10px] shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" />
                                </svg>
                                <span className="leading-tight">{user?.role === 'player' ? 'Request' : 'Book'}</span>
                            </button>
                        )}



                        {canUnbook && onUnbook && !ticket.sheetId && (
                            <button
                                title="Unbook Ticket"
                                onClick={(e) => handleActionClick(e, () => onUnbook(ticket._id))}
                                className={`flex-1 flex items-center justify-center gap-1 font-semibold py-0.5 px-2 rounded-md text-[10px] shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 bg-red-600/20 hover:bg-red-600/30 text-red-300 focus:ring-red-500`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l-3 3m3-3l3 3m0 0v-2a4 4 0 00-4-4H8m0 0H7a2 2 0 00-2 2v1" />
                                </svg>
                                <span className="leading-tight">Unbook</span>
                            </button>
                        )}
                        
                        <button
                            title="Share Ticket as Image"
                            onClick={(e) => handleActionClick(e, handleShare)}
                            className="flex-1 flex items-center justify-center gap-1 font-semibold py-0.5 px-2 rounded-md text-[10px] shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 focus:ring-teal-500"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                               <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                            </svg>
                            <span className="leading-tight">Share</span>
                        </button>
                    </div>
                )}
            </div>
            
            {/* Claimable Prizes Section */}
            {(claimablePrizes || []).length > 0 && (
                <div className="relative z-20 mt-2 space-y-1 p-1">
                    {claimablePrizes.map((prize, index) => (
                        <button
                            key={`${prize.name}-${index}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onClaimPrize) {
                                    onClaimPrize(prize.name);
                                }
                            }}
                            className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-bold py-2 px-3 rounded-lg text-sm shadow-lg transform hover:scale-105 transition-transform animate-subtle-glow"
                        >
                            Claim {prize.name}!
                        </button>
                    ))}
                </div>
            )}


            {/* Overlay for Pending Request */}
            {pendingRequestInfo && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-center p-2 z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400 animate-spin mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-yellow-400 font-bold text-sm">Requested by</p>
                    <p className="text-white font-bold text-lg -mt-1">{pendingRequestInfo.playerName}</p>
                </div>
            )}
        </div>
    );
});
