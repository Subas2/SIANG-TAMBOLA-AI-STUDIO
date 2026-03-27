import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { Game, Prize } from '../../types';
import { mockDB } from '../../services/mockApi';
import { AnimatedView } from '../common/AnimatedView';
import { useToast } from '../../contexts/ToastContext';

// Extend window for html2canvas
declare global {
    interface Window {
        html2canvas: any;
    }
}

interface WinnerSheetPreviewProps {
    gameData: Game;
    prizes: Prize[];
    onClose: () => void;
}

const formatDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return '';
    
    const dateTimeString = timeStr.includes('M') ? `${dateStr} ${timeStr}` : `${dateStr}T${timeStr}`;
    const dateObj = new Date(dateTimeString);
    
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
};

export const WinnerSheetPreview: React.FC<WinnerSheetPreviewProps> = ({ gameData, prizes, onClose }) => {
    const { title, date, time, theme, bannerStyle, backgroundImage } = gameData;
    const sheetRef = useRef<HTMLDivElement>(null);
    const toast = useToast();

    const formattedDateTime = formatDateTime(date, time);
    
    const PRIZE_COLUMN_THRESHOLD = 6;
    const shouldSplitColumns = (prizes || []).length > PRIZE_COLUMN_THRESHOLD;
    const firstColumnPrizes = shouldSplitColumns ? (prizes || []).slice(0, Math.ceil((prizes || []).length / 2)) : (prizes || []);
    const secondColumnPrizes = shouldSplitColumns ? (prizes || []).slice(Math.ceil((prizes || []).length / 2)) : [];

    const handleDownload = async () => {
        if (!sheetRef.current || !window.html2canvas) {
            toast.show('Preview library is loading. Please try again.', { type: 'warning' });
            return;
        }
        toast.show('Preparing download...', { type: 'info' });
        try {
            if (document.fonts?.ready) {
                await document.fonts.ready.catch(() => {});
            }
            await new Promise(resolve => setTimeout(resolve, 500));
    
            const canvas = await window.html2canvas(sheetRef.current, {
                useCORS: true,
                backgroundColor: null,
                scale: 2,
                logging: false,
            });
            const link = document.createElement('a');
            link.download = 'tambola-winners.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.show('Winner sheet download started!');
        } catch (e) {
            console.error("Failed to render winner sheet:", e);
            toast.show('Could not download the sheet. Please try again.', { type: 'error' });
        }
    };
    
    const handleShare = async () => {
        const shareText = `Check out the winners for our Tambola game: ${title} on ${formattedDateTime}!`;
    
        if (!navigator.share) {
            toast.show('Web Share API is not supported. Try downloading instead.', { type: 'info' });
            return;
        }
    
        if (!sheetRef.current || !window.html2canvas) {
            toast.show('Banner library not ready. Sharing text only.', { type: 'info' });
            await navigator.share({ title: 'Siang Tambola Winners', text: shareText });
            return;
        }
    
        toast.show('Preparing winner sheet for sharing...', { type: 'info' });
        try {
            if (document.fonts?.ready) await document.fonts.ready.catch(console.error);
            await new Promise(resolve => setTimeout(resolve, 500));
    
            const canvas = await window.html2canvas(sheetRef.current, {
                useCORS: true,
                backgroundColor: null,
                scale: 2,
                logging: false,
            });
    
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Could not create blob from canvas');
            
            const file = new File([blob], 'tambola-winners.png', { type: 'image/png' });
    
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ title: 'Siang Tambola Winners', text: shareText, files: [file] });
            } else {
                await navigator.share({ title: 'Siang Tambola Winners', text: shareText });
            }
        } catch (error) {
             if ((error as DOMException).name !== 'AbortError') {
                console.error('Error sharing banner:', error);
                toast.show('Could not share the sheet.', { type: 'error' });
            }
        }
    };

    const selectedTheme = mockDB.themes.find(t => t._id === theme) || mockDB.themes[4];

    const stylesWithCustomBackgrounds = ['classic_gold', 'modern_gradient', 'neon_glow', 'minimal_white', 'glassmorphism', 'retro_arcade', 'futuristic_blue', 'comic_pop', 'elegant_black', 'rainbow_wave', 'festival_lights', 'metallic_silver', 'nature_green', 'oceanic', 'candy_pastel', 'fire_flame', 'space_galaxy', 'vintage_paper', 'royal_purple', 'cyberpunk'];

    let wrapperClasses = `banner-wrapper ${bannerStyle}`;
    if (!backgroundImage && !stylesWithCustomBackgrounds.includes(bannerStyle)) {
        wrapperClasses += ` bg-gradient-to-br ${selectedTheme.gradient}`;
    }
    
    const renderPrizeColumn = (prizesToRender: Prize[]) => (
        <div className="flex flex-col">
            {prizesToRender.map((prize) => (
                <div key={prize.name} className="py-2 border-b last:border-b-0" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                    <div className="flex justify-between items-start font-bold text-base" style={{ color: 'var(--header-color)' }}>
                        <span className="flex-grow pr-2">{prize.name}</span>
                        <span className="flex-shrink-0">₹{prize.value}</span>
                    </div>
                    <div className="pl-2 mt-1 space-y-1 text-sm">
                        {(prize.claimedBy || []).map(winner => (
                            <div key={`${winner.playerId}-${winner.ticketId}`} className="flex justify-between">
                                <span>{winner.name}</span>
                                <span className="font-mono">TKT #{winner.ticketId}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const popupContent = (
        <div className="fixed inset-0 overflow-y-auto flex items-start sm:items-center justify-center p-4 z-50">
            <style>{`
                /* All banner styles from GamePreviewBanner.tsx are included here */
                @keyframes neon-flicker { 0%, 100% { text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #f0f, 0 0 20px #f0f; } 50% { text-shadow: 0 0 5px #fff, 0 0 8px #fff, 0 0 12px #f0f, 0 0 16px #f0f; } }
                @keyframes rainbow-bg { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                @keyframes fire-flicker { 0% { text-shadow: 0 0 10px #fef08a, 0 0 20px #f59e0b, 0 0 30px #d97706; } 50% { text-shadow: 0 0 12px #fef08a, 0 0 24px #f59e0b, 0 0 35px #d97706; } 100% { text-shadow: 0 0 10px #fef08a, 0 0 20px #f59e0b, 0 0 30px #d97706; } }

                .banner-wrapper { padding: 16px; position: relative; }
                .banner-wrapper, .banner-wrapper * { box-sizing: border-box; }
                /* Default Element Styles */
                .banner-wrapper { color: #fff; text-shadow: 1px 1px 3px rgba(0,0,0,0.4); display: flex; flex-direction: column; gap: 8px; }
                .banner-wrapper .banner-title { font-size: 1.5rem; line-height: 2rem; font-weight: 700; text-align: center; }
                .banner-wrapper .banner-place { font-size: 1rem; line-height: 1.5rem; font-weight: 600; text-align: center; }
                .banner-wrapper .banner-subtitle { font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; text-align: center; margin-top: 4px; }
                .banner-wrapper .banner-datetime { text-align: center; margin-top: 8px; font-size: 1.125rem; line-height: 1.75rem; font-weight: 600; background-color: rgba(0,0,0,0.2); border-radius: 0.375rem; padding: 6px 0; }
                .banner-wrapper .banner-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); text-align: center; margin: 12px 0; }
                .banner-wrapper .banner-details-label { font-size: 0.75rem; line-height: 1rem; text-transform: uppercase; font-weight: 600; }
                .banner-wrapper .banner-details-value { font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; }
                .banner-wrapper .banner-prizes { background: #fff; color: #1f2937; border-radius: 0.5rem; padding: 8px; }
                .banner-wrapper .banner-prizes-title { text-align: center; font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; margin-bottom: 4px; color: #f59e0b; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); }
                .banner-wrapper .banner-prizes-grid { display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem; line-height: 1rem; border-top: 2px solid #d1d5db; padding-top: 4px; }
                .banner-wrapper .banner-prizes-header, .banner-wrapper .banner-prize-row { display: flex; justify-content: space-between; align-items: flex-start; }
                .banner-wrapper .banner-prizes-header { font-weight: 700; color: #8b5cf6; padding-bottom: 2px; }
                .banner-wrapper .banner-prize-row { padding-top: 2px; padding-bottom: 2px; }
                .banner-wrapper .banner-prize-name { flex-grow: 1; padding-right: 8px; word-break: break-word; }
                .banner-wrapper .banner-prize-value { flex-shrink: 0; text-align: right; }
                .banner-wrapper .banner-description { text-align: center; margin-top: 8px; background: rgba(0,0,0,0.2); border-radius: 0.5rem; padding: 8px; font-size: 0.875rem; line-height: 1.25rem; }
                .banner-wrapper .banner-footer { text-align: center; margin-top: 12px; background: #6b21a8; border-radius: 0.5rem; padding: 8px; font-weight: 700; }
                .classic_gold { font-family: 'Cinzel Decorative', serif; background: #1a1a1a; color: #e6c569; border: 4px solid #b38b25; text-shadow: 1px 1px 2px #000; } .classic_gold::before { content: '👑'; position: absolute; top: 12px; left: 16px; font-size: 1.5rem; opacity: 0.5; } .classic_gold .banner-title { font-size: 2.2rem; color: #fff; } .classic_gold .banner-subtitle { color: #d4af37; text-transform: uppercase; } .classic_gold .banner-details-value { color: #fff; } .classic_gold .banner-prizes { background: rgba(255,215,0,0.05); border: 1px solid #b38b25; color: #e6c569; } .classic_gold .banner-prizes * { color: #e6c569; } .classic_gold .banner-prizes-title, .classic_gold .banner-prizes-header { color: #fff; }
                .modern_gradient { font-family: 'Poppins', sans-serif; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; } .modern_gradient .banner-title { font-size: 2.5rem; } .modern_gradient .banner-subtitle { font-weight: 400; font-size: 1rem; } .modern_gradient .banner-datetime, .modern_gradient .banner-details, .modern_gradient .banner-prizes, .modern_gradient .banner-footer, .modern_gradient .banner-description { background: rgba(255,255,255,0.1); backdrop-filter: blur(5px); border-radius: 8px; } .modern_gradient .banner-prizes { color: #fff; } .modern_gradient .banner-prizes * { color: #fff; }
                .neon_glow { font-family: 'Orbitron', sans-serif; background: #1a001a; border: 2px solid #f0f; box-shadow: 0 0 15px #f0f, inset 0 0 15px #f0f; } .neon_glow .banner-title { color: #fff; animation: neon-flicker 2s infinite alternate; font-size: 2rem; } .neon_glow .banner-subtitle { color: #0ff; text-shadow: 0 0 5px #0ff, 0 0 10px #0ff; } .neon_glow .banner-datetime { background: transparent; border: 1px solid #0ff; color: #0ff; } .neon_glow .banner-prizes { background: rgba(0,0,0,0.5); border: 1px solid #f0f; color: #fff; } .neon_glow .banner-prizes * { color: #fff; } .neon_glow .banner-prizes-title { color: #f0f; animation: neon-flicker 2s 0.5s infinite alternate; }
                .minimal_white { font-family: 'Poppins', sans-serif; background: #f9fafb; color: #111827; text-shadow: none; } .minimal_white .banner-title { font-size: 2rem; color: #1f2937; } .minimal_white .banner-subtitle { color: #6b7280; font-weight: 600; letter-spacing: 1px; } .minimal_white .banner-datetime { background-color: #e5e7eb; padding: 8px; } .minimal_white .banner-prizes { background: transparent; border: 1px solid #d1d5db; color: #1f2937;} .minimal_white .banner-prizes * { color: #1f2937; }
                .glassmorphism { font-family: 'Poppins', sans-serif; color: #fff; background: rgba(31, 41, 55, 0.3); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); } .glassmorphism .banner-title { font-size: 2rem; } .glassmorphism .banner-datetime, .glassmorphism .banner-details, .glassmorphism .banner-prizes, .glassmorphism .banner-footer, .glassmorphism .banner-description { background: transparent; text-shadow: 1px 1px 3px rgba(0,0,0,0.3); } .glassmorphism .banner-prizes { border: 1px solid rgba(255,255,255,0.1); color: #fff; background: rgba(0,0,0,0.1); } .glassmorphism .banner-prizes * { color: #fff; }
                .retro_arcade { font-family: 'Press Start 2P', cursive; background: #000; color: #fff; border: 4px solid #fff; image-rendering: pixelated; text-transform: uppercase; } .retro_arcade .banner-title { color: #ff00ff; font-size: 1.6rem; text-shadow: 3px 3px 0 #00ffff; } .retro_arcade .banner-subtitle { color: #ffff00; } .retro_arcade .banner-datetime { background: transparent; border: 2px dashed #ffff00; color: #ffff00; padding: 2px 0; } .retro_arcade .banner-prizes { background: transparent; border: none; color: #fff; } .retro_arcade .banner-prizes-grid { border: none; } .retro_arcade .banner-prizes-title { display: none; } .retro_arcade .banner-prizes-header { color: #ffff00; padding: 4px; background: #0000ff;} .retro_arcade .banner-prize-row { background: rgba(255,255,255,0.1); padding: 2px 4px; }
                .futuristic_blue { font-family: 'Orbitron', sans-serif; background: #01041a; color: #b0c4de; border: 1px solid #4682b4; } .futuristic_blue::after { content: ''; position: absolute; top:0; left: 0; right: 0; bottom: 0; background-image: linear-gradient(rgba(70,130,180,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(70,130,180,0.2) 1px, transparent 1px); background-size: 20px 20px; pointer-events: none; } .futuristic_blue .banner-title { color: #fff; text-shadow: 0 0 10px #add8e6; } .futuristic_blue .banner-subtitle { color: #87ceeb; } .futuristic_blue .banner-prizes { background: rgba(70,130,180,0.1); border: 1px solid #4682b4; color: #b0c4de; } .futuristic_blue .banner-prizes * { color: #b0c4de; }
                .comic_pop { font-family: 'Bangers', cursive; background: #ffd700; border: 4px solid #000; color: #000; text-shadow: 2px 2px #fff; } .comic_pop .banner-title { color: #e62e2d; font-size: 2.5rem; -webkit-text-stroke: 2px #000; text-shadow: 3px 3px 0 #fff; transform: rotate(-3deg); } .comic_pop .banner-subtitle { background: #3d94f6; color: #fff; padding: 5px; transform: skew(-10deg); text-shadow: 2px 2px 0 #000; } .comic_pop .banner-prizes { background: #fff; border: 2px solid #000; border-radius: 0; clip-path: polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%); } .comic_pop .banner-prizes-title, .comic_pop .banner-prizes-header { color: #3d94f6; }
                .elegant_black { font-family: 'Playfair Display', serif; background: #121212; color: #dcdcdc; border: 1px solid #444; } .elegant_black .banner-title { font-size: 2.5rem; letter-spacing: 2px; } .elegant_black .banner-subtitle { font-style: italic; color: #aaa; } .elegant_black .banner-details { border-top: 1px solid #444; border-bottom: 1px solid #444; margin: 16px 0; padding: 8px 0; } .elegant_black .banner-prizes { background: #222; color: #dcdcdc; } .elegant_black .banner-prizes * { color: #dcdcdc; }
                .rainbow_wave { font-family: 'Pacifico', cursive; background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff); background-size: 400% 400%; animation: rainbow-bg 15s ease infinite; color: #fff; text-shadow: 2px 2px 4px #000; } .rainbow_wave .banner-title { font-size: 2.8rem; } .rainbow_wave .banner-prizes { background: rgba(0,0,0,0.4); color: #fff; } .rainbow_wave .banner-prizes * { color: #fff; }
                .festival_lights { font-family: 'Lobster', cursive; background: #2d0036; color: #fff; } .festival_lights::before { content: '✨'; position: absolute; top: 10px; right: 15px; font-size: 1.5rem; } .festival_lights .banner-title { color: #ffdd44; text-shadow: 0 0 10px #ffdd44; font-size: 2.5rem; } .festival_lights .banner-subtitle { color: #ff99aa; } .festival_lights .banner-prizes { background: rgba(255,255,255,0.1); border: 1px dashed #ffdd44; color: #fff; } .festival_lights .banner-prizes * { color: #fff; }
                .metallic_silver { font-family: 'Oswald', sans-serif; background: linear-gradient(135deg, #d3d3d3, #a9a9a9, #d3d3d3); color: #222; border: 2px solid #555; } .metallic_silver .banner-title { background: linear-gradient(#eee, #999); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 1px 1px 1px #fff; } .metallic_silver .banner-prizes { background: #eee; border: 1px solid #aaa; color: #222; } .metallic_silver .banner-prizes * { color: #222; }
                .nature_green { font-family: 'Pacifico', cursive; background: #3a5a40 url('https://www.transparenttextures.com/patterns/leaves.png'); color: #f2e8cf; border: 3px solid #dad7cd; } .nature_green .banner-title { color: #dad7cd; font-size: 2.4rem; } .nature_green .banner-prizes { background: rgba(242, 232, 207, 0.1); border: 1px solid #a3b18a; color: #f2e8cf; } .nature_green .banner-prizes * { color: #f2e8cf; }
                .oceanic { font-family: 'Roboto', sans-serif; background: linear-gradient(to top, #00c6fb, #005bea); color: #fff; } .oceanic .banner-title { font-family: 'Lobster', cursive; font-size: 2.5rem; } .oceanic .banner-prizes { background: rgba(255,255,255,0.2); color: #fff; } .oceanic .banner-prizes * { color: #fff; }
                .candy_pastel { font-family: 'Gochi Hand', cursive; background: #ffc3a0; color: #8e44ad; } .candy_pastel .banner-title { color: #fff; text-shadow: 2px 2px 0 #d35400; font-size: 2.4rem; } .candy_pastel .banner-prizes { background: #fff; color: #8e44ad; } .candy_pastel .banner-prizes * { color: #8e44ad; }
                .fire_flame { font-family: 'Anton', sans-serif; background: #4d0000; color: #ffeb3b; } .fire_flame .banner-title { animation: fire-flicker 2s infinite; font-size: 2.8rem; } .fire_flame .banner-subtitle { color: #ff9800; } .fire_flame .banner-prizes { background: rgba(0,0,0,0.5); border: 1px solid #ff9800; color: #ffeb3b; } .fire_flame .banner-prizes * { color: #ffeb3b; }
                .space_galaxy { font-family: 'Orbitron', sans-serif; background: #0c0a1a url('https://www.transparenttextures.com/patterns/stardust.png'); color: #e0e0ff; border: 2px solid #3d3d8d; } .space_galaxy .banner-title { color: #fff; text-shadow: 0 0 8px #fff, 0 0 12px #4d4dff, 0 0 16px #4d4dff; letter-spacing: 1px; } .space_galaxy .banner-subtitle { color: #a0a0ff; text-transform: uppercase; } .space_galaxy .banner-prizes { background: rgba(20, 10, 50, 0.6); border: 1px solid rgba(77, 77, 255, 0.4); backdrop-filter: blur(3px); color: #e0e0ff; } .space_galaxy .banner-prizes * { color: #e0e0ff; }
                .vintage_paper { font-family: 'Uncial Antiqua', cursive; background: #e6e2d3 url('https://www.transparenttextures.com/patterns/old-paper.png'); color: #4a4a4a; border: 1px solid #c9c1a5; } .vintage_paper .banner-title { font-family: 'Lobster', cursive; color: #8c0000; text-shadow: 1px 1px #d4c8a9; } .vintage_paper .banner-prizes { background: rgba(255,255,255,0.4); border: 1px solid #c9c1a5; color: #4a4a4a; } .vintage_paper .banner-prizes * { color: #4a4a4a; } .vintage_paper .banner-prizes-title { color: #8c0000; }
                .royal_purple { font-family: 'Berkshire Swash', cursive; background: #4a044e; color: #fcd34d; border: 3px solid #fcd34d; padding: 20px; border-image: linear-gradient(45deg, #fcd34d, #d97706) 1; } .royal_purple .banner-title { font-size: 2.2rem; } .royal_purple .banner-prizes { background: rgba(252, 211, 77, 0.1); color: #fef08a; } .royal_purple .banner-prizes * { color: #fef08a; } .royal_purple .banner-prizes-title { color: #fcd34d; }
                .cyberpunk { font-family: 'Orbitron', sans-serif; background: #000; color: #00ff00; border: 1px solid #00ff00; text-shadow: 0 0 5px #00ff00; } .cyberpunk::before { content: 'SYS_MSG: GAME_LOADED'; position: absolute; top: 5px; left: 5px; font-size: 0.6rem; opacity: 0.7; } .cyberpunk .banner-title { color: #ff00ff; text-shadow: 0 0 5px #ff00ff; } .cyberpunk .banner-datetime { background-color: #00ff00; color: #000; text-shadow: none; font-weight: bold; padding: 2px 0; } .cyberpunk .banner-prizes { background: transparent; border: 1px solid #00ff00; color: #00ff00; } .cyberpunk .banner-prizes * { color: #00ff00; }
            `}</style>
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
            
            <AnimatedView animationClass="animate-scale-in" soundEffect="swoosh" isPopup={true} className="relative w-full max-w-sm z-10">
                 <div className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
                    <div ref={sheetRef}>
                        <div className={wrapperClasses}>
                             {backgroundImage && (
                                <>
                                    <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url(${backgroundImage})` }} />
                                    <div className="absolute inset-0 bg-black/50 z-10" />
                                </>
                            )}
                            <div className="relative z-20">
                                <h2 className="banner-title">{title}</h2>
                                <p className="banner-place">{formattedDateTime}</p>

                                <div className="banner-prizes mt-4">
                                    <h3 className="banner-prizes-title">🏆 WINNERS LIST 🏆</h3>
                                    <div className="banner-prizes-grid">
                                        {shouldSplitColumns ? (
                                            <div className="grid grid-cols-2 gap-x-4 items-start">
                                                {renderPrizeColumn(firstColumnPrizes)}
                                                {renderPrizeColumn(secondColumnPrizes)}
                                            </div>
                                        ) : (
                                            (prizes || []).map((prize) => (
                                                <div key={prize.name} className="py-2 border-b last:border-b-0" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                                                    <div className="flex justify-between items-start font-bold text-base" style={{ color: 'var(--header-color)' }}>
                                                        <span className="flex-grow pr-2">{prize.name}</span>
                                                        <span className="flex-shrink-0">₹{prize.value}</span>
                                                    </div>
                                                    <div className="pl-2 mt-1 space-y-1 text-sm">
                                                        {(prize.claimedBy || []).map(winner => (
                                                            <div key={`${winner.playerId}-${winner.ticketId}`} className="flex justify-between">
                                                                <span>{winner.name}</span>
                                                                <span className="font-mono">TKT #{winner.ticketId}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="banner-footer">
                                    <p>Shared from Siang Tambola!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="flex-shrink-0 p-4 bg-white flex justify-between items-center border-t border-gray-200">
                        <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Close</button>
                        <div className="flex gap-2">
                            <button onClick={handleShare} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600" title="Share"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg></button>
                            <button onClick={handleDownload} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-3 text-sm rounded-lg shadow-md">Download</button>
                        </div>
                    </div>
                </div>
            </AnimatedView>
        </div>
    );
    
    return ReactDOM.createPortal(popupContent, document.body);
};