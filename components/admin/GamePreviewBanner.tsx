import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { mockDB } from '../../services/mockApi';
import { AnimatedView } from '../common/AnimatedView';
import { Theme } from '../../types';
import { useToast } from '../../contexts/ToastContext';

// Extend window for html2canvas
declare global {
    interface Window {
        html2canvas: any;
    }
}

interface GameData {
    title: string;
    place: string;
    subTitle: string;
    date: string;
    time: string;
    ticketPrice: number;
    ticketLimit: number;
    theme: string;
    fontFamily?: string; // Made optional
    bannerStyle: string;
    description: string;
    backgroundImage?: string;
    website?: string;
}

interface PrizeInfo {
    name: string;
    value: string;
    enabled: boolean;
}

interface GamePreviewBannerProps {
    gameData: GameData;
    prizes: PrizeInfo[];
    onClose: () => void;
}

const formatDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return '';
    
    // Handle both "HH:mm" (from form) and "H:mm AM/PM" (from existing game object)
    const dateTimeString = timeStr.includes('M') ? `${dateStr} ${timeStr}` : `${dateStr}T${timeStr}`;
    const dateObj = new Date(dateTimeString);
    
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    const formattedTime = dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    return `${formattedDate} • ${formattedTime}`;
};

export const GamePreviewBanner: React.FC<GamePreviewBannerProps> = ({ gameData, prizes, onClose }) => {
    const { title, place, subTitle, date, time, ticketPrice, ticketLimit, theme, bannerStyle, description, backgroundImage, website } = gameData;
    const bannerRef = useRef<HTMLDivElement>(null);
    const toast = useToast();

    const formattedDateTime = formatDateTime(date, time);
    const totalPrizePool = (prizes || []).reduce((sum, prize) => sum + (Number(prize.value) || 0), 0);
    const hasPrizePool = totalPrizePool > 0;
    const prizePoolFontSize = totalPrizePool.toLocaleString('en-IN').length > 6 ? '1rem' : '1.25rem';
    
    const PRIZE_COLUMN_THRESHOLD = 8;
    const shouldSplitColumns = (prizes || []).length > PRIZE_COLUMN_THRESHOLD;
    const firstColumnPrizes = shouldSplitColumns ? (prizes || []).slice(0, Math.ceil((prizes || []).length / 2)) : (prizes || []);
    const secondColumnPrizes = shouldSplitColumns ? (prizes || []).slice(Math.ceil((prizes || []).length / 2)) : [];

    const handleDownload = async () => {
        if (!bannerRef.current || !window.html2canvas) {
            toast.show('Preview library is loading. Please try again.', { type: 'warning' });
            return;
        }
        toast.show('Preparing download...', { type: 'info' });
        try {
            if (document.fonts?.ready) {
                await document.fonts.ready.catch(() => {});
            }
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for images
    
            const canvas = await window.html2canvas(bannerRef.current, {
                useCORS: true,
                backgroundColor: null,
                scale: 2,
                logging: false,
            });
            const link = document.createElement('a');
            link.download = 'tambola-banner.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.show('Banner download started!');
        } catch (e) {
            console.error("Failed to render banner:", e);
            toast.show('Could not download the banner. Please try again.', { type: 'error' });
        }
    };
    
    const handleShare = async (platform: 'whatsapp' | 'native') => {
        const shareText = `Join our Tambola game: ${title}!\n🗓️ ${formattedDateTime}\n🎟️ Price: ₹${ticketPrice}/-`;
    
        if (platform === 'whatsapp') {
            toast.show('Preparing for WhatsApp...', { type: 'info' });
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
            window.open(whatsappUrl, '_blank');
            toast.show('WhatsApp is ready for you to share!', { type: 'success' });
            return;
        }
    
        if (!navigator.share) {
            toast.show('Web Share API is not supported on your browser.', { type: 'info' });
            return;
        }
    
        const shareData: { title: string; text: string; url?: string; } = {
            title: 'Siang Tambola Game',
            text: shareText,
        };
        if (window.location.href && window.location.href.startsWith('http')) {
            shareData.url = window.location.href;
        }
    
        if (!bannerRef.current || !window.html2canvas) {
            toast.show('Banner library not ready. Sharing text only.', { type: 'info' });
            try {
                await navigator.share(shareData);
                toast.show('Game details shared successfully!');
            } catch (error) {
                if ((error as DOMException).name !== 'AbortError') {
                    console.error('Text-only share failed:', error);
                    toast.show('Could not share game details.', { type: 'error' });
                }
            }
            return;
        }
    
        toast.show('Preparing banner for sharing...', { type: 'info' });
        try {
            if (document.fonts?.ready) await document.fonts.ready.catch(console.error);
            await new Promise(resolve => setTimeout(resolve, 500));
    
            const canvas = await window.html2canvas(bannerRef.current, {
                useCORS: true,
                backgroundColor: null,
                scale: 2,
                logging: false,
            });
    
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Could not create blob from canvas');
            
            const file = new File([blob], 'tambola-banner.png', { type: 'image/png' });
    
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    ...shareData,
                    files: [file],
                });
                toast.show('Banner shared successfully!');
            } else {
                toast.show('Image sharing not supported. Sharing text only.', { type: 'info' });
                await navigator.share(shareData);
                toast.show('Game details shared successfully!');
            }
        } catch (error) {
             if ((error as DOMException).name !== 'AbortError') {
                console.error('Error sharing banner with image, falling back to text share:', error);
                toast.show('Could not generate image. Sharing text only.', { type: 'warning', duration: 4000 });
                try {
                    await navigator.share(shareData);
                    toast.show('Shared text details successfully!');
                } catch (shareError) {
                     if ((shareError as DOMException).name !== 'AbortError') {
                        console.error('Fallback text share failed:', shareError);
                        toast.show('Could not share game details.', { type: 'error' });
                     }
                }
            }
        }
    };
    
    const selectedTheme = mockDB.themes.find(t => t._id === theme) || mockDB.themes[4];

    const stylesWithCustomBackgrounds = [
        'classic_gold', 'modern_gradient', 'neon_glow', 'minimal_white', 'glassmorphism', 
        'retro_arcade', 'futuristic_blue', 'comic_pop', 'elegant_black', 'rainbow_wave', 
        'festival_lights', 'metallic_silver', 'nature_green', 'oceanic', 'candy_pastel', 
        'fire_flame', 'space_galaxy', 'vintage_paper', 'royal_purple', 'cyberpunk'
    ];

    let wrapperClasses = `banner-wrapper ${bannerStyle}`;
    if (!backgroundImage && !stylesWithCustomBackgrounds.includes(bannerStyle)) {
        wrapperClasses += ` bg-gradient-to-br ${selectedTheme.gradient}`;
    }

    const popupContent = (
        <div className="fixed inset-0 overflow-y-auto flex items-start sm:items-center justify-center p-4 z-50">
            <style>
                {`
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
                .banner-wrapper .banner-details { display: grid; text-align: center; margin: 12px 0; gap: 0.5rem; }
                .banner-wrapper .banner-details-label { font-size: 0.75rem; line-height: 1rem; text-transform: uppercase; font-weight: 600; }
                .banner-wrapper .banner-details-value { font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; }
                .banner-wrapper .banner-prizes { background: #fff; color: #1f2937; border-radius: 0.5rem; padding: 8px; }
                .banner-wrapper .banner-prizes-title { text-align: center; font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; margin-bottom: 4px; color: #f59e0b; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); }
                .banner-wrapper .banner-prizes-grid { display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem; line-height: 1rem; border-top: 2px solid #d1d5db; padding-top: 4px; }
                .banner-wrapper .banner-prizes-header, .banner-wrapper .banner-prize-row { display: flex; justify-content: space-between; align-items: flex-start; }
                .banner-wrapper .banner-prizes-header { font-weight: 700; color: #8b5cf6; padding-bottom: 2px; }
                .banner-wrapper .banner-prize-row { padding-top: 2px; padding-bottom: 2px; }
                .banner-wrapper .banner-prize-name { flex-grow: 1; padding-right: 8px; word-break: break-word; }
                .banner-wrapper .banner-prize-value { flex-shrink: 0; text-align: right; font-weight: 700; min-width: 60px; }
                .banner-wrapper .banner-description { text-align: center; margin-top: 8px; background: rgba(0,0,0,0.2); border-radius: 0.5rem; padding: 8px; font-size: 0.875rem; line-height: 1.25rem; }
                .banner-wrapper .banner-footer { text-align: center; margin-top: 8px; background: rgba(0,0,0,0.2); border-radius: 0.5rem; padding: 8px; font-size: 0.875rem; line-height: 1.25rem; }
                
                /* --- 20 UNIQUE STYLES --- */
                /* 1. Classic Gold */
                .classic_gold { font-family: 'Cinzel Decorative', serif; background: #1a1a1a; color: #e6c569; border: 4px solid #b38b25; text-shadow: 1px 1px 2px #000; }
                .classic_gold::before { content: '👑'; position: absolute; top: 12px; left: 16px; font-size: 1.5rem; opacity: 0.5; }
                .classic_gold .banner-title { font-size: 2.2rem; color: #fff; }
                .classic_gold .banner-subtitle { color: #d4af37; text-transform: uppercase; }
                .classic_gold .banner-details-value { color: #fff; }
                .classic_gold .banner-prizes { background: rgba(255,215,0,0.05); border: 1px solid #b38b25; color: #e6c569; }
                .classic_gold .banner-prizes * { color: #e6c569; }
                .classic_gold .banner-prizes-title, .classic_gold .banner-prizes-header { color: #fff; }

                /* 2. Modern Gradient */
                .modern_gradient { font-family: 'Poppins', sans-serif; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
                .modern_gradient .banner-title { font-size: 2.5rem; }
                .modern_gradient .banner-subtitle { font-weight: 400; font-size: 1rem; }
                .modern_gradient .banner-datetime, .modern_gradient .banner-details, .modern_gradient .banner-prizes, .modern_gradient .banner-footer, .modern_gradient .banner-description { background: rgba(255,255,255,0.1); backdrop-filter: blur(5px); border-radius: 8px; }
                .modern_gradient .banner-prizes { color: #fff; }
                .modern_gradient .banner-prizes * { color: #fff; }

                /* 3. Neon Glow */
                .neon_glow { font-family: 'Orbitron', sans-serif; background: #1a001a; border: 2px solid #f0f; box-shadow: 0 0 15px #f0f, inset 0 0 15px #f0f; }
                .neon_glow .banner-title { color: #fff; animation: neon-flicker 2s infinite alternate; font-size: 2rem; }
                .neon_glow .banner-subtitle { color: #0ff; text-shadow: 0 0 5px #0ff, 0 0 10px #0ff; }
                .neon_glow .banner-datetime { background: transparent; border: 1px solid #0ff; color: #0ff; }
                .neon_glow .banner-prizes { background: rgba(0,0,0,0.5); border: 1px solid #f0f; color: #fff; }
                .neon_glow .banner-prizes * { color: #fff; }
                .neon_glow .banner-prizes-title { color: #f0f; animation: neon-flicker 2s 0.5s infinite alternate; }

                /* 4. Minimal White */
                .minimal_white { font-family: 'Poppins', sans-serif; background: #f9fafb; color: #111827; text-shadow: none; }
                .minimal_white .banner-title { font-size: 2rem; color: #1f2937; }
                .minimal_white .banner-subtitle { color: #6b7280; font-weight: 600; letter-spacing: 1px; }
                .minimal_white .banner-datetime { background-color: #e5e7eb; padding: 8px; }
                .minimal_white .banner-prizes { background: transparent; border: 1px solid #d1d5db; color: #1f2937;}
                .minimal_white .banner-prizes * { color: #1f2937; }

                /* 5. Glassmorphism */
                .glassmorphism { font-family: 'Poppins', sans-serif; color: #fff; background: rgba(31, 41, 55, 0.3); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
                .glassmorphism .banner-title { font-size: 2rem; }
                .glassmorphism .banner-datetime, .glassmorphism .banner-details, .glassmorphism .banner-prizes, .glassmorphism .banner-footer, .glassmorphism .banner-description { background: transparent; text-shadow: 1px 1px 3px rgba(0,0,0,0.3); }
                .glassmorphism .banner-prizes { border: 1px solid rgba(255,255,255,0.1); color: #fff; background: rgba(0,0,0,0.1); }
                .glassmorphism .banner-prizes * { color: #fff; }

                /* 6. Retro Arcade */
                .retro_arcade { font-family: 'Press Start 2P', cursive; background: #000; color: #fff; border: 4px solid #fff; image-rendering: pixelated; text-transform: uppercase; }
                .retro_arcade .banner-title { color: #ff00ff; font-size: 1.6rem; text-shadow: 3px 3px 0 #00ffff; }
                .retro_arcade .banner-subtitle { color: #ffff00; }
                .retro_arcade .banner-datetime { background: transparent; border: 2px dashed #ffff00; color: #ffff00; padding: 2px 0; }
                .retro_arcade .banner-prizes { background: transparent; border: none; color: #fff; }
                .retro_arcade .banner-prizes-grid { border: none; }
                .retro_arcade .banner-prizes-title { display: none; }
                .retro_arcade .banner-prizes-header { color: #ffff00; padding: 4px; background: #0000ff;}
                .retro_arcade .banner-prize-row { background: rgba(255,255,255,0.1); padding: 2px 4px; }

                /* 7. Futuristic Blue */
                .futuristic_blue { font-family: 'Orbitron', sans-serif; background: #01041a; color: #b0c4de; border: 1px solid #4682b4; }
                .futuristic_blue::after { content: ''; position: absolute; top:0; left: 0; right: 0; bottom: 0; background-image: linear-gradient(rgba(70,130,180,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(70,130,180,0.2) 1px, transparent 1px); background-size: 20px 20px; pointer-events: none; }
                .futuristic_blue .banner-title { color: #fff; text-shadow: 0 0 10px #add8e6; }
                .futuristic_blue .banner-subtitle { color: #87ceeb; }
                .futuristic_blue .banner-prizes { background: rgba(70,130,180,0.1); border: 1px solid #4682b4; color: #b0c4de; }
                .futuristic_blue .banner-prizes * { color: #b0c4de; }
                
                /* 8. Comic Pop */
                .comic_pop { font-family: 'Bangers', cursive; background: #ffd700; border: 4px solid #000; color: #000; text-shadow: 2px 2px #fff; }
                .comic_pop .banner-title { color: #e62e2d; font-size: 2.5rem; -webkit-text-stroke: 2px #000; text-shadow: 3px 3px 0 #fff; transform: rotate(-3deg); }
                .comic_pop .banner-subtitle { background: #3d94f6; color: #fff; padding: 5px; transform: skew(-10deg); text-shadow: 2px 2px 0 #000; }
                .comic_pop .banner-prizes { background: #fff; border: 2px solid #000; border-radius: 0; clip-path: polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%); }
                .comic_pop .banner-prizes-title, .comic_pop .banner-prizes-header { color: #3d94f6; }

                /* 9. Elegant Black */
                .elegant_black { font-family: 'Playfair Display', serif; background: #121212; color: #dcdcdc; border: 1px solid #444; }
                .elegant_black .banner-title { font-size: 2.5rem; letter-spacing: 2px; }
                .elegant_black .banner-subtitle { font-style: italic; color: #aaa; }
                .elegant_black .banner-details { border-top: 1px solid #444; border-bottom: 1px solid #444; margin: 16px 0; padding: 8px 0; }
                .elegant_black .banner-prizes { background: #222; color: #dcdcdc; }
                .elegant_black .banner-prizes * { color: #dcdcdc; }

                /* 10. Rainbow Wave */
                .rainbow_wave { font-family: 'Pacifico', cursive; background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff); background-size: 400% 400%; animation: rainbow-bg 15s ease infinite; color: #fff; text-shadow: 2px 2px 4px #000; }
                .rainbow_wave .banner-title { font-size: 2.8rem; }
                .rainbow_wave .banner-prizes { background: rgba(0,0,0,0.4); color: #fff; }
                .rainbow_wave .banner-prizes * { color: #fff; }

                /* 11. Festival Lights */
                .festival_lights { font-family: 'Lobster', cursive; background: #2d0036; color: #fff; }
                .festival_lights::before { content: '✨'; position: absolute; top: 10px; right: 15px; font-size: 1.5rem; }
                .festival_lights .banner-title { color: #ffdd44; text-shadow: 0 0 10px #ffdd44; font-size: 2.5rem; }
                .festival_lights .banner-subtitle { color: #ff99aa; }
                .festival_lights .banner-prizes { background: rgba(255,255,255,0.1); border: 1px dashed #ffdd44; color: #fff; }
                .festival_lights .banner-prizes * { color: #fff; }

                /* 12. Metallic Silver */
                .metallic_silver { font-family: 'Oswald', sans-serif; background: linear-gradient(135deg, #d3d3d3, #a9a9a9, #d3d3d3); color: #222; border: 2px solid #555; }
                .metallic_silver .banner-title { background: linear-gradient(#eee, #999); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 1px 1px 1px #fff; }
                .metallic_silver .banner-prizes { background: #eee; border: 1px solid #aaa; color: #222; }
                .metallic_silver .banner-prizes * { color: #222; }

                /* 13. Nature Green */
                .nature_green { font-family: 'Pacifico', cursive; background: #3a5a40 url('https://www.transparenttextures.com/patterns/leaves.png'); color: #f2e8cf; border: 3px solid #dad7cd; }
                .nature_green .banner-title { color: #dad7cd; font-size: 2.4rem; }
                .nature_green .banner-prizes { background: rgba(242, 232, 207, 0.1); border: 1px solid #a3b18a; color: #f2e8cf; }
                .nature_green .banner-prizes * { color: #f2e8cf; }
                
                /* 14. Oceanic */
                .oceanic { font-family: 'Roboto', sans-serif; background: linear-gradient(to top, #00c6fb, #005bea); color: #fff; }
                .oceanic .banner-title { font-family: 'Lobster', cursive; font-size: 2.5rem; }
                .oceanic .banner-prizes { background: rgba(255,255,255,0.2); color: #fff; }
                .oceanic .banner-prizes * { color: #fff; }

                /* 15. Candy Pastel */
                .candy_pastel { font-family: 'Gochi Hand', cursive; background: #ffc3a0; color: #8e44ad; }
                .candy_pastel .banner-title { color: #fff; text-shadow: 2px 2px 0 #d35400; font-size: 2.4rem; }
                .candy_pastel .banner-prizes { background: #fff; color: #8e44ad; }
                .candy_pastel .banner-prizes * { color: #8e44ad; }

                /* 16. Fire & Flame */
                .fire_flame { font-family: 'Anton', sans-serif; background: #4d0000; color: #ffeb3b; }
                .fire_flame .banner-title { animation: fire-flicker 2s infinite; font-size: 2.8rem; }
                .fire_flame .banner-subtitle { color: #ff9800; }
                .fire_flame .banner-prizes { background: rgba(0,0,0,0.5); border: 1px solid #ff9800; color: #ffeb3b; }
                .fire_flame .banner-prizes * { color: #ffeb3b; }

                /* 17. Space Galaxy */
                .space_galaxy { font-family: 'Orbitron', sans-serif; background: #0c0a1a url('https://www.transparenttextures.com/patterns/stardust.png'); color: #e0e0ff; border: 2px solid #3d3d8d; }
                .space_galaxy .banner-title { color: #fff; text-shadow: 0 0 8px #fff, 0 0 12px #4d4dff, 0 0 16px #4d4dff; letter-spacing: 1px; }
                .space_galaxy .banner-subtitle { color: #a0a0ff; text-transform: uppercase; }
                .space_galaxy .banner-prizes { background: rgba(20, 10, 50, 0.6); border: 1px solid rgba(77, 77, 255, 0.4); backdrop-filter: blur(3px); color: #e0e0ff; }
                .space_galaxy .banner-prizes * { color: #e0e0ff; }

                /* 18. Vintage Paper */
                .vintage_paper { font-family: 'Uncial Antiqua', cursive; background: #e6e2d3 url('https://www.transparenttextures.com/patterns/old-paper.png'); color: #4a4a4a; border: 1px solid #c9c1a5; }
                .vintage_paper .banner-title { font-family: 'Lobster', cursive; color: #8c0000; text-shadow: 1px 1px #d4c8a9; }
                .vintage_paper .banner-prizes { background: rgba(255,255,255,0.4); border: 1px solid #c9c1a5; color: #4a4a4a; }
                .vintage_paper .banner-prizes * { color: #4a4a4a; }
                .vintage_paper .banner-prizes-title { color: #8c0000; }

                /* 19. Royal Purple */
                .royal_purple { font-family: 'Berkshire Swash', cursive; background: #4a044e; color: #fcd34d; border: 3px solid #fcd34d; padding: 20px; border-image: linear-gradient(45deg, #fcd34d, #d97706) 1; }
                .royal_purple .banner-title { font-size: 2.2rem; }
                .royal_purple .banner-prizes { background: rgba(252, 211, 77, 0.1); color: #fef08a; }
                .royal_purple .banner-prizes * { color: #fef08a; }
                .royal_purple .banner-prizes-title { color: #fcd34d; }

                /* 20. Cyberpunk */
                .cyberpunk { font-family: 'Orbitron', sans-serif; background: #000; color: #00ff00; border: 1px solid #00ff00; text-shadow: 0 0 5px #00ff00; }
                .cyberpunk::before { content: 'SYS_MSG: GAME_LOADED'; position: absolute; top: 5px; left: 5px; font-size: 0.6rem; opacity: 0.7; }
                .cyberpunk .banner-title { color: #ff00ff; text-shadow: 0 0 5px #ff00ff; }
                .cyberpunk .banner-datetime { background-color: #00ff00; color: #000; text-shadow: none; font-weight: bold; padding: 2px 0; }
                .cyberpunk .banner-prizes { background: transparent; border: 1px solid #00ff00; color: #00ff00; }
                .cyberpunk .banner-prizes * { color: #00ff00; }
                `}
            </style>
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
            
            <AnimatedView animationClass="animate-scale-in" soundEffect="swoosh" isPopup={true} className="relative w-full max-w-sm z-10">
                 <div className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
                    <div ref={bannerRef}>
                        <div
                            className={wrapperClasses}
                        >
                             {backgroundImage && (
                                <>
                                    <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url(${backgroundImage})` }} />
                                    <div className="absolute inset-0 bg-black/50 z-10" />
                                </>
                            )}
                            <div className="relative z-20">
                                <h2 className="banner-title">{title}</h2>
                                <p className="banner-place">{place}</p>
                                <h3 className="banner-subtitle">{subTitle}</h3>

                                <div className="banner-datetime">
                                    <p>{formattedDateTime}</p>
                                </div>

                                <div className={`banner-details grid ${hasPrizePool ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                    <div>
                                        <p className="banner-details-label">Ticket Price</p>
                                        <p className="banner-details-value">₹{ticketPrice}/-</p>
                                    </div>
                                    {hasPrizePool && (
                                        <div>
                                            <p className="banner-details-label">Total Prizes</p>
                                            <p className="banner-details-value" style={{ fontSize: prizePoolFontSize }}>
                                                ₹{totalPrizePool.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="banner-details-label">Ticket Limit</p>
                                        <p className="banner-details-value">{ticketLimit} ONLY</p>
                                    </div>
                                </div>

                                <div className="banner-prizes">
                                    <h3 className="banner-prizes-title">AWARDS</h3>
                                    <div className="banner-prizes-grid">
                                        {shouldSplitColumns ? (
                                            <>
                                                {/* Headers */}
                                                <div className="grid grid-cols-2 gap-x-4">
                                                    <div className="banner-prizes-header"><span>DIVIDENDS</span><span>PRIZE</span></div>
                                                    <div className="banner-prizes-header"><span>DIVIDENDS</span><span>PRIZE</span></div>
                                                </div>
                                                {/* Rows */}
                                                <div className="grid grid-cols-2 gap-x-4">
                                                    <div className="flex flex-col" style={{gap: '4px'}}>
                                                        {firstColumnPrizes.map((prize, index) => (
                                                            <div key={`prize-col1-${index}`} className="banner-prize-row">
                                                                <div className="banner-prize-name">{prize.name}</div>
                                                                <div className="banner-prize-value">₹{prize.value}/-</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-col" style={{gap: '4px'}}>
                                                        {secondColumnPrizes.map((prize, index) => (
                                                            <div key={`prize-col2-${index}`} className="banner-prize-row">
                                                                <div className="banner-prize-name">{prize.name}</div>
                                                                <div className="banner-prize-value">₹{prize.value}/-</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="banner-prizes-header">
                                                    <span>DIVIDENDS</span>
                                                    <span>PRIZE</span>
                                                </div>
                                                {(prizes || []).map((prize, index) => (
                                                    <div key={`prize-${index}`} className="banner-prize-row">
                                                        <div className="banner-prize-name">{prize.name}</div>
                                                        <div className="banner-prize-value">₹{prize.value}/-</div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {description && (
                                    <div className="banner-description">
                                        <p>{description}</p>
                                    </div>
                                )}
                                {website && (
                                    <div className="banner-footer">
                                        <p>Visit our website for more detail</p>
                                        <p style={{fontSize: '0.75rem', opacity: 0.8, wordBreak: 'break-all'}}>{website.replace(/^(https?:\/\/)?(www\.)?/, '')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="flex-shrink-0 p-4 bg-white flex justify-between items-center border-t border-gray-200">
                        <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                            Close
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => handleShare('whatsapp')} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600" title="Share on WhatsApp">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.086l.001.004 4.919 1.305z"/></svg>
                            </button>
                            <button onClick={() => handleShare('native')} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600" title="Share">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                            </button>
                            <button onClick={handleDownload} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-3 text-sm rounded-lg shadow-md">
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            </AnimatedView>
        </div>
    );
    
    return ReactDOM.createPortal(popupContent, document.body);
};