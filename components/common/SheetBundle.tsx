import React, { useState, useMemo } from 'react';
import { Game, Ticket } from '../../types';
import { TambolaTicket } from './TambolaTicket';

interface SheetBundleProps {
    tickets: Ticket[];
    game: Game;
    onUnbook?: (ticketId: string) => void;
    onTrackSheet?: (ticketIds: string[]) => void;
    isSheetTracked?: boolean;
    onRemove?: (ticketId: string) => void;
    onClaimPrize?: (ticketId: string, prizeName: string) => void;
    onShowPhoneRequest?: (playerId: string) => void;
    visiblePhonePlayerIds?: Set<string>;
}

export const SheetBundle: React.FC<SheetBundleProps> = React.memo(({
    tickets,
    game,
    onUnbook,
    onTrackSheet,
    isSheetTracked,
    onRemove,
    onClaimPrize,
    onShowPhoneRequest,
    visiblePhonePlayerIds,
}) => {
    const bundleDesign = game.ticketBundleDesign || 'default';
    const [userExpanded, setUserExpanded] = useState(false);
    const isExpanded = userExpanded || bundleDesign === 'grid';

    const scatteredTransforms = useMemo(() => {
        if (bundleDesign !== 'scattered' && bundleDesign !== 'angled-stack') return [];
        return tickets.map(() => ({
            rotate: Math.random() * 30 - 15,
            translateX: Math.random() * 20 - 10,
            translateY: Math.random() * 10 - 5,
        }));
    }, [tickets, bundleDesign]);


    if ((tickets || []).length === 0) return null;

    const firstTicket = tickets[0];
    const lastTicket = (tickets || [])[(tickets || []).length - 1];

    const getSheetType = (count: number): string => {
        if (count === 10) return '10 Ticket Bundle';
        if (count === 6) return 'Full Sheet';
        if (count === 3) return 'Half Sheet';
        return `${count} Ticket Bundle`;
    };
    const sheetType = getSheetType((tickets || []).length);
    const centerIndex = ((tickets || []).length - 1) / 2;
    const isTenBundle = (tickets || []).length === 10;

    const getContainerHeight = () => {
        switch (bundleDesign) {
            case 'waterfall': return `${180 + (tickets || []).length * 25}px`;
            case 'offset-stack': return `${180 + (tickets || []).length * 10}px`;
            case 'book-view': return `${180 + Math.ceil((tickets || []).length / 2) * 8}px`;
            case 'circular-fan': case 'arch': return '280px';
            case 'scattered': return '250px';
            case 'single-file-h': return '150px';
            case 'grid': return 'auto';
            default: return '210px';
        }
    };
    const containerHeight = getContainerHeight();

    const handleTrackClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onTrackSheet?.(tickets.map(t => t._id));
    };

    const renderUnexpandedView = () => {
        const parentStyle: React.CSSProperties = { height: containerHeight, width: '100%' };
        if (bundleDesign === 'book-view') {
            parentStyle.perspective = '1000px';
        }

        return (
            <div className="relative cursor-pointer" style={parentStyle} onClick={() => setUserExpanded(true)}>
                {tickets.map((ticket, index) => {
                    let transform = '';
                    let transformOrigin = 'bottom center';
                    let zIndex = (tickets || []).length - Math.abs(index - centerIndex);

                    switch (bundleDesign) {
                        case 'stack':
                            transform = `translateY(${index * 8}px) translateX(${(index - 2) * 3}px) rotate(${(index - 2) * 1.5}deg)`;
                            transformOrigin = 'top center';
                            break;
                        case 'circular-fan':
                            const rotation = -60 + (index / ((tickets || []).length - 1)) * 120;
                            transform = `rotate(${rotation}deg) translateY(80px)`;
                            break;
                        case 'waterfall':
                            transform = `translateY(${index * 25}px)`;
                            transformOrigin = 'top center';
                            break;
                        case 'angled-stack':
                             const random = scatteredTransforms[index];
                             transform = `translate(${index * 2}px, ${index * 2}px) rotate(${random.rotate}deg)`;
                             transformOrigin = 'center center';
                             break;
                        case 'scattered':
                            const sRandom = scatteredTransforms[index];
                            transform = `translate(${sRandom.translateX}px, ${sRandom.translateY}px) rotate(${sRandom.rotate}deg)`;
                            transformOrigin = 'center center';
                            break;
                        case 'book-view':
                            const side = index % 2 === 0; // true for left, false for right
                            const yOffset = Math.floor(index / 2) * 8;
                            transform = `translateX(${side ? '-50%' : '50%'}) rotateY(${side ? '20deg' : '-20deg'}) translateY(${yOffset}px) rotateZ(${side ? -2 : 2}deg)`;
                            transformOrigin = `center ${side ? 'right' : 'left'}`;
                            break;
                        case 'concertina-h':
                            transform = `translateX(${index * 15}px) rotateY(-20deg)`;
                            transformOrigin = 'center left';
                            zIndex = index;
                            break;
                        case 'single-file-h':
                             transform = `scale(0.6) translateX(${(index - centerIndex) * 180}px)`;
                             break;
                        case 'perspective':
                             transform = `scale(${1 - index * 0.05}) translateY(-${index * 15}px)`;
                             transformOrigin = 'bottom center';
                             break;
                        case 'arch':
                             const archRotation = -45 + (index / ((tickets || []).length - 1)) * 90;
                             transform = `rotate(${archRotation}deg)`;
                             transformOrigin = 'bottom center';
                             break;
                        case 'offset-stack':
                             transform = `translateX(${(index % 2 === 0 ? -1 : 1) * 10}px) translateY(${index * 10}px)`;
                             transformOrigin = 'top center';
                             break;
                        case 'default':
                        default:
                            const defaultRotation = isTenBundle ? (index - centerIndex) * 2.5 : (index - centerIndex) * 4;
                            const defaultTranslateX = isTenBundle ? (index - centerIndex) * 8 : (index - centerIndex) * 15;
                            const defaultTranslateY = isTenBundle ? Math.abs(index - centerIndex) * 2 : Math.abs(index - centerIndex) * 4;
                            transform = `rotate(${defaultRotation}deg) translateX(${defaultTranslateX}px) translateY(${defaultTranslateY}px)`;
                            zIndex = isTenBundle ? (tickets || []).length - Math.abs(index - Math.floor(centerIndex)) : zIndex;
                            break;
                    }
                    return (
                        <div
                            key={ticket._id}
                            className="absolute top-0 left-0 w-full transition-all duration-300 ease-out hover:z-20 hover:!scale-105 hover:!rotate-0 hover:!-translate-y-4 hover:!translate-x-0"
                            style={{ transform, zIndex, transformOrigin }}
                        >
                            <TambolaTicket ticket={ticket} calledNumbers={game.calledNumbers || []} game={game} showActions={false} />
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="relative group flex flex-col items-center justify-center w-full max-w-[360px]">
            <div className="relative z-10 flex items-center justify-between w-full mb-3 px-2 gap-2">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white leading-tight truncate">{sheetType}</h4>
                    <p className="text-xs text-purple-200 font-mono leading-tight truncate">#{firstTicket.serialNumber} - #{lastTicket.serialNumber}</p>
                </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    {onRemove && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(firstTicket._id); }}
                            className="flex items-center justify-center bg-red-600/80 hover:bg-red-500 text-white font-semibold p-1.5 rounded-lg text-xs shadow-lg transition-colors"
                            aria-label="Remove sheet"
                            title="Remove Sheet"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    {onTrackSheet && isSheetTracked && !onRemove && (
                        <button
                            onClick={handleTrackClick}
                            className="flex items-center justify-center bg-red-600/80 hover:bg-red-500 text-white font-semibold p-1.5 rounded-lg text-xs shadow-lg transition-colors"
                            aria-label="Untrack sheet"
                            title="Untrack Sheet"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    {onUnbook && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onUnbook(firstTicket._id); }}
                            className="flex items-center justify-center bg-red-600 hover:bg-red-500 text-white font-semibold p-1.5 rounded-lg text-xs shadow-lg transition-colors"
                            title="Unbook Sheet"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l-3 3m3-3l3 3m0 0v-2a4 4 0 00-4-4H8m0 0H7a2 2 0 00-2 2v1" />
                            </svg>
                        </button>
                    )}
                    {onTrackSheet && !isSheetTracked && (
                        <button
                            onClick={handleTrackClick}
                            className="flex items-center justify-center font-semibold p-1.5 rounded-lg text-xs shadow-lg transition-colors bg-sky-600 hover:bg-sky-500 text-white"
                            title="Add this sheet to your tracked tickets"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>
                    )}
                    {bundleDesign !== 'grid' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setUserExpanded(!userExpanded); }}
                            className="p-1.5 bg-slate-600/50 hover:bg-slate-500/50 text-white rounded-full transition-colors"
                            aria-label={isExpanded ? 'Collapse tickets' : 'Expand tickets'}
                        >
                            {isExpanded ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {isExpanded ? (
                 <div className="w-full space-y-4">
                    {tickets.map(ticket => (
                        <TambolaTicket
                            key={ticket._id}
                            ticket={ticket}
                            calledNumbers={game.calledNumbers || []}
                            game={game}
                            showActions={!!onUnbook}
                            onUnbook={onUnbook}
                            onClaimPrize={onClaimPrize ? (prizeName) => onClaimPrize(ticket._id, prizeName) : undefined}
                            onShowPhoneRequest={onShowPhoneRequest}
                            isPhoneVisible={visiblePhonePlayerIds?.has(ticket.player || '')}
                        />
                    ))}
                </div>
            ) : (
                renderUnexpandedView()
            )}
        </div>
    );
});