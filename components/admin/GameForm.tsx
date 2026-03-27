import React, { useState, useEffect, useMemo } from 'react';
import { Game, TicketGenerationOptions, Theme } from '../../types';
import { api } from '../../services/mockApi';
import { useAuth } from '../../contexts/AuthContext';
import { GamePreviewBanner } from './GamePreviewBanner';
import { useTheme } from '../../contexts/ThemeContext';
import { ClockPopup } from '../common/ClockPopup';
import { useToast } from '../../contexts/ToastContext';
import { CustomSelect } from '../common/CustomSelect';
import { ImageCropperModal } from '../common/ImageCropperModal';

interface GameFormProps {
    onSuccess: () => void;
    onBack: () => void;
    initialGameData?: Game | null;
    themes: Theme[];
}

interface PrizeState {
    name: string;
    enabled: boolean;
    value: string;
}

const defaultPrizes: PrizeState[] = [
    // Early Prizes
    { name: 'Quick 5', enabled: false, value: '' },
    { name: 'Quick 6', enabled: false, value: '' },
    { name: 'Quick 7', enabled: false, value: '' },
    // Lines
    { name: 'Top Line', enabled: false, value: '' },
    { name: 'Middle Line', enabled: false, value: '' },
    { name: 'Bottom Line', enabled: false, value: '' },
    // Shapes
    { name: 'Star', enabled: false, value: '' },
    // Number-based (digit prizes)
    { name: 'Anda (Egg)', enabled: false, value: '' },
    { name: 'Panda (Stick)', enabled: false, value: '' },
    { name: 'Ugly Ducklings', enabled: false, value: '' },
    { name: 'Fat Ladies', enabled: false, value: '' },
    // Sheets
    { name: 'Half Sheet', enabled: false, value: '' },
    { name: 'Full Sheet', enabled: false, value: '' },
    // Full House
    { name: 'Full House', enabled: false, value: '' },
    { name: 'Second House', enabled: false, value: '' },
];

const defaultFormState: Partial<Game> = {
    title: 'Siang Tambola',
    place: 'Guwahati',
    subTitle: 'MINI BUMPER HOUSIE',
    ticketLimit: 50,
    ticketPrice: 10,
    date: new Date().toISOString().split('T')[0],
    time: '21:00',
    theme: 'theme5',
    bannerStyle: 'classic_gold',
    ticketTheme: 'default',
    ticketBundleDesign: 'default',
    description: 'Join us for a fun-filled game of Tambola! Great prizes to be won.',
    backgroundImage: '',
    ticketBackgroundImage: '',
    agentCommission: 10,
    useBannerBackgroundOnTickets: true,
    autoVerifyClaims: true,
    ticketBackgroundSettings: { dimOverlay: 20, blur: 0 },
    ticketGenerationOptions: { numbersPerRow: 5 },
    website: 'https://siangtambola.netlify.app',
};

const parse12hTo24h = (timeStr: string): string => {
    if (!timeStr) return '21:00';

    // Check if it's already in a valid 24h format (e.g., "21:00" or "09:00")
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) {
        return timeStr;
    }

    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
    if (!match) {
        return '21:00'; // Fallback for malformed data
    }

    let [, hour, minute, period] = match;
    let hourNum = parseInt(hour, 10);

    period = period.toLowerCase();

    if (period === 'pm' && hourNum < 12) {
        hourNum += 12;
    }
    if (period === 'am' && hourNum === 12) { // Midnight case: 12 AM is 00 hours
        hourNum = 0;
    }

    return `${String(hourNum).padStart(2, '0')}:${minute}`;
};


export const GameForm: React.FC<GameFormProps> = ({ onSuccess, onBack, initialGameData = null, themes }) => {
    const isEditing = initialGameData !== null;
    const { isAuthReady } = useAuth();
    const { activeTheme } = useTheme();
    const toast = useToast();
    const [isClockOpen, setIsClockOpen] = useState(false);
    const [form, setForm] = useState<Partial<Game>>({
        ...defaultFormState,
        ticketGenerationOptions: { ...defaultFormState.ticketGenerationOptions as TicketGenerationOptions }
    });
    const [prizes, setPrizes] = useState<PrizeState[]>(defaultPrizes.map(p => ({...p})));
    const [newPrize, setNewPrize] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [originalImage, setOriginalImage] = useState<string | null>(null);

    useEffect(() => {
        if (isEditing && initialGameData) {
            const formattedTime = parse12hTo24h(initialGameData.time);
    
            setForm({ 
                ...initialGameData, 
                time: formattedTime,
                backgroundImage: initialGameData.backgroundImage || '',
                ticketBackgroundImage: initialGameData.ticketBackgroundImage || '',
                agentCommission: initialGameData.agentCommission || 10,
                useBannerBackgroundOnTickets: initialGameData.useBannerBackgroundOnTickets ?? true,
                autoVerifyClaims: initialGameData.autoVerifyClaims ?? true,
                ticketBackgroundSettings: initialGameData.ticketBackgroundSettings ?? { dimOverlay: 20, blur: 0 },
                ticketGenerationOptions: initialGameData.ticketGenerationOptions ?? { numbersPerRow: 5 },
                ticketBundleDesign: initialGameData.ticketBundleDesign || 'default',
            });
            
            if (initialGameData.backgroundImage) {
                setOriginalImage(initialGameData.backgroundImage);
            }
            
            // Reset prizes to default, then apply game-specific ones
            const newPrizesState = defaultPrizes.map(p => ({...p})); 
            initialGameData.prizes.forEach(gamePrize => {
                const existingPrize = newPrizesState.find(p => p.name === gamePrize.name);
                if (existingPrize) {
                    existingPrize.enabled = true;
                    existingPrize.value = String(gamePrize.value);
                } else {
                    // Add custom prizes that are not in the default list
                    newPrizesState.push({ name: gamePrize.name, enabled: true, value: String(gamePrize.value) });
                }
            });
            setPrizes(newPrizesState);
        } else {
             setForm({
                ...defaultFormState,
                ticketGenerationOptions: { ...defaultFormState.ticketGenerationOptions as TicketGenerationOptions }
             });
             setPrizes(defaultPrizes.map(p => ({...p})));
        }
    }, [initialGameData, isEditing]);


    const handleTogglePrize = (index: number) => {
        const newPrizes = [...prizes];
        newPrizes[index].enabled = !newPrizes[index].enabled;
        setPrizes(newPrizes);
    };

    const handlePrizeValueChange = (index: number, value: string) => {
        const newPrizes = [...prizes];
        newPrizes[index].value = value;
        setPrizes(newPrizes);
    };

    const handleAddPrize = () => {
        if (newPrize && !prizes.find(p => p.name === newPrize)) {
            setPrizes([...prizes, { name: newPrize, enabled: true, value: '' }]);
            setNewPrize('');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.show('Image size cannot exceed 5MB.', { type: 'error' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setOriginalImage(result);
                // Set the main banner background to the full, original image
                setForm(prev => ({ ...prev, backgroundImage: result, ticketBackgroundImage: '' })); // Reset ticket bg on new upload
                // Open the cropper to create the ticket background
                setImageToCrop(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedDataUrl: string) => {
        // Set ONLY the ticket background image with the cropped result
        setForm(prev => ({ ...prev, ticketBackgroundImage: croppedDataUrl }));
        setImageToCrop(null); // Close the modal
    };

    const handleSettingsChange = (field: 'dimOverlay' | 'blur', value: number) => {
        setForm(prev => ({
            ...prev,
            ticketBackgroundSettings: {
                ...(prev.ticketBackgroundSettings ?? { dimOverlay: 20, blur: 0 }),
                [field]: value,
            }
        }));
    };
    
    const handleTicketOptionsChange = (field: 'numbersPerRow', value: number) => {
        const currentOptions = form.ticketGenerationOptions ?? { numbersPerRow: 5 };
        
        setForm(prev => ({
            ...prev,
            ticketGenerationOptions: {
                ...currentOptions,
                [field]: value,
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const enabledPrizes = prizes.filter(p => p.enabled && p.value);
        
        // Correctly preserve claimedBy array when editing
        const gamePrizes = enabledPrizes.map(p => {
            const existingPrize = isEditing && initialGameData 
                ? initialGameData.prizes.find(ip => ip.name === p.name) 
                : undefined;
            return { 
                name: p.name, 
                value: Number(p.value) || 0, 
                claimedBy: existingPrize ? existingPrize.claimedBy : [] 
            };
        });
        
        const gameData = { ...form, prizes: gamePrizes };
        
        // Simulate API call
        setTimeout(async () => {
            try {
                if (isEditing && initialGameData) {
                    const { _id, ...updateData } = gameData;
                    await api.admin.updateGame(initialGameData._id, updateData);
                    toast.show('Game updated successfully!');
                } else {
                    await api.admin.createGame(gameData);
                    toast.show('Game created successfully!');
                }
                setTimeout(() => onSuccess(), 500);
            } catch (error) {
                console.error("GameForm handleSubmit error:", error);
                toast.show(`Failed to save game: ${(error as Error).message}`, { type: 'error' });
            } finally {
                setIsLoading(false);
            }
        }, 500);
    };
    
    const handleTimeSelect = (newTime: string) => {
        setForm({...form, time: newTime });
        setIsClockOpen(false);
    };

    const handleGenerateImage = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingImage(true);
        toast.show('Generating AI image, this may take a moment...', { type: 'info', duration: 5000 });
        try {
            const base64Image = await api.admin.generateBannerImage(aiPrompt);
            if (base64Image) {
                const imageUrl = `data:image/png;base64,${base64Image}`;
                setOriginalImage(imageUrl);
                setForm(prev => ({ ...prev, backgroundImage: imageUrl, ticketBackgroundImage: '' }));
                setImageToCrop(imageUrl);
                toast.show('AI image generated successfully!');
            } else {
                throw new Error('API returned no image.');
            }
        } catch (error) {
            console.error("Error generating AI image:", error);
            toast.show('Failed to generate AI image. Please try again.', { type: 'error' });
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const themeOptions = useMemo(() => themes.map(theme => ({
        value: theme._id,
        label: (
            <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border border-white/20 flex-shrink-0 bg-gradient-to-br ${theme.gradient}`}></div>
                <span>{theme.name}</span>
            </div>
        )
    })), [themes]);

    const bannerStyleOptions = useMemo(() => [
        { value: 'classic_gold', label: 'Classic Gold' },
        { value: 'modern_gradient', label: 'Modern Gradient' },
        { value: 'neon_glow', label: 'Neon Glow' },
        { value: 'minimal_white', label: 'Minimal White' },
        { value: 'glassmorphism', label: 'Glassmorphism' },
        { value: 'retro_arcade', label: 'Retro Arcade' },
        { value: 'futuristic_blue', label: 'Futuristic Blue' },
        { value: 'comic_pop', label: 'Comic Pop' },
        { value: 'elegant_black', label: 'Elegant Black' },
        { value: 'rainbow_wave', label: 'Rainbow Wave' },
        { value: 'festival_lights', label: 'Festival Lights' },
        { value: 'metallic_silver', label: 'Metallic Silver' },
        { value: 'nature_green', label: 'Nature Green' },
        { value: 'oceanic', label: 'Oceanic' },
        { value: 'candy_pastel', label: 'Candy Pastel' },
        { value: 'fire_flame', label: 'Fire & Flame' },
        { value: 'space_galaxy', label: 'Space Galaxy' },
        { value: 'vintage_paper', label: 'Vintage Paper' },
        { value: 'royal_purple', label: 'Royal Purple' },
        { value: 'cyberpunk', label: 'Cyberpunk' },
    ], []);

    return (
        <div className="p-4">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-lg max-w-lg mx-auto">
                <h2 className="text-xl font-bold mb-3 text-gray-100">{isEditing ? 'Edit Game' : 'Create New Game'}</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-0.5">Game Title</label>
                        <input id="title" name="title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g., Siang Tambola" required className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="subTitle" className="block text-sm font-medium text-gray-300 mb-0.5">Game Subtitle</label>
                        <input id="subTitle" name="subTitle" value={form.subTitle} onChange={e => setForm({...form, subTitle: e.target.value})} placeholder="e.g., MINI BUMPER HOUSIE" required className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="place" className="block text-sm font-medium text-gray-300 mb-0.5">Place</label>
                        <input id="place" name="place" value={form.place} onChange={e => setForm({...form, place: e.target.value})} placeholder="e.g., Guwahati" required className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-0.5">Description</label>
                        <textarea id="description" name="description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g., Join us for a fun-filled game..." rows={2} className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-0.5">Website Link (Optional)</label>
                        <input id="website" name="website" type="url" value={form.website || ''} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://example.com" className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-1">
                            <label htmlFor="ticketLimit" className="block text-sm font-medium text-gray-300 mb-0.5">Ticket Limit</label>
                            <input id="ticketLimit" name="ticketLimit" type="number" value={form.ticketLimit} onChange={e => setForm({...form, ticketLimit: parseInt(e.target.value) || 0})} placeholder="e.g., 50" required className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="ticketPrice" className="block text-sm font-medium text-gray-300 mb-0.5">Ticket Price</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-gray-400">₹</span>
                                </div>
                                <input id="ticketPrice" name="ticketPrice" type="number" value={form.ticketPrice} onChange={e => setForm({...form, ticketPrice: parseInt(e.target.value) || 0})} placeholder="e.g., 10" required className="w-full p-2 pl-7 border border-slate-600 bg-slate-700 text-white rounded-md" />
                            </div>
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="agentCommission" className="block text-sm font-medium text-gray-300 mb-0.5">Agent Comm.</label>
                            <div className="relative">
                                <input id="agentCommission" name="agentCommission" type="number" value={form.agentCommission} onChange={e => setForm({...form, agentCommission: parseInt(e.target.value) || 0})} placeholder="e.g., 10" required className="w-full p-2 pr-7 border border-slate-600 bg-slate-700 text-white rounded-md" />
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-400">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-1/2">
                            <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-0.5">Game Date</label>
                            <input id="date" name="date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                        </div>
                        <div className="w-1/2">
                             <label htmlFor="time" className="block text-sm font-medium text-gray-300 mb-0.5">Game Time</label>
                            <div className="relative cursor-pointer" onClick={() => setIsClockOpen(true)}>
                                <input id="time" name="time" type="time" value={form.time} readOnly className="w-full p-2 pr-10 border border-slate-600 bg-slate-700 text-white rounded-md cursor-pointer" />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="bannerStyle" className="block text-sm font-medium text-gray-300 mb-0.5">Banner Style</label>
                        <CustomSelect
                            value={form.bannerStyle || null}
                            onChange={(value) => setForm({ ...form, bannerStyle: value })}
                            options={bannerStyleOptions}
                            placeholder="Select a style"
                        />
                    </div>
                    <div>
                        <label htmlFor="ticketTheme" className="block text-sm font-medium text-gray-300 mb-0.5">Ticket Theme</label>
                        <select id="ticketTheme" name="ticketTheme" value={form.ticketTheme || 'default'} onChange={e => setForm({...form, ticketTheme: e.target.value})} className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-md">
                            <option value="default">Default</option>
                            <option value="festive">Festive</option>
                            <option value="classic">Classic</option>
                            <option value="floral">Floral</option>
                            <option value="patriotic">Patriotic</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="ticketBundleDesign" className="block text-sm font-medium text-gray-300 mb-0.5">Ticket Bundle Design</label>
                        <CustomSelect
                            value={form.ticketBundleDesign || 'default'}
                            onChange={(value) => setForm({ ...form, ticketBundleDesign: value as any })}
                            options={[
                                { value: 'default', label: 'Default (Fan)' },
                                { value: 'stack', label: 'Stacked View' },
                                { value: 'grid', label: 'Grid View' },
                                { value: 'circular-fan', label: 'Circular Fan' },
                                { value: 'waterfall', label: 'Waterfall Cascade' },
                                { value: 'angled-stack', label: 'Angled Stack' },
                                { value: 'scattered', label: 'Scattered Pile' },
                                { value: 'book-view', label: 'Open Book' },
                                { value: 'concertina-h', label: 'Horizontal Concertina' },
                                { value: 'single-file-h', label: 'Single File (Horizontal)' },
                                { value: 'perspective', label: 'Perspective Stack' },
                                { value: 'arch', label: 'Upward Arch' },
                                { value: 'offset-stack', label: 'Offset Stack' },
                            ]}
                            placeholder="Select a bundle design"
                        />
                    </div>
                     <div>
                        <label htmlFor="theme" className="block text-sm font-medium text-gray-300 mb-0.5">App Theme</label>
                        <CustomSelect
                            value={form.theme || null}
                            onChange={(value) => setForm({ ...form, theme: value })}
                            options={themeOptions}
                            placeholder="Select a theme"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-0.5">Banner Background Image</label>
                        <div className="mt-1">
                            <label htmlFor="backgroundImage" className="cursor-pointer bg-slate-600 hover:bg-slate-500 text-gray-200 text-sm font-medium py-2 px-4 border border-slate-500 rounded-md shadow-sm">
                                {form.backgroundImage ? 'Change Image' : 'Upload Image'}
                            </label>
                            <input id="backgroundImage" name="backgroundImage" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </div>

                        <div className="mt-3 space-y-1">
                            <label htmlFor="aiPrompt" className="block text-xs font-medium text-gray-400">Or generate with AI</label>
                            <div className="flex gap-2">
                                <input 
                                    id="aiPrompt"
                                    type="text"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g., a festive carnival scene at night"
                                    className="w-full p-2 text-sm border border-slate-600 bg-slate-700 text-white rounded-md"
                                />
                                <button 
                                    type="button"
                                    onClick={handleGenerateImage}
                                    disabled={isGeneratingImage || !aiPrompt.trim()}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-md flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-wait"
                                    title="Generate with AI"
                                >
                                    {isGeneratingImage ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.375 3.375 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {(isGeneratingImage || form.backgroundImage) && (
                            <div className="mt-2 space-y-2">
                                <h4 className="text-xs font-medium text-gray-400 mb-1">Previews:</h4>
                                {isGeneratingImage ? (
                                     <div className="aspect-video w-full bg-slate-700/50 rounded-md flex items-center justify-center text-gray-400 text-sm animate-pulse border border-slate-600">
                                        Generating Image...
                                    </div>
                                ) : (
                                    form.backgroundImage && (
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-300 mb-1">Banner (Original)</p>
                                                <img src={form.backgroundImage} alt="Banner Preview" className="aspect-video w-full object-cover rounded-md border-2 border-slate-600" />
                                            </div>
                                            <div className="w-24 flex-shrink-0">
                                                <p className="text-xs text-gray-300 mb-1">Ticket BG (Cropped)</p>
                                                <div className="aspect-[2/1] w-full rounded-md border-2 border-slate-600 bg-slate-700/50 flex items-center justify-center overflow-hidden">
                                                {form.ticketBackgroundImage ? (
                                                    <img src={form.ticketBackgroundImage} alt="Ticket BG Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 text-center">No Crop Set</span>
                                                )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}
                                
                                {form.backgroundImage && !isGeneratingImage && (
                                     <div className="flex flex-col gap-1.5">
                                        <button type="button" onClick={() => setShowPreview(true)} className="w-full text-center bg-blue-600/50 hover:bg-blue-600/80 text-blue-100 text-xs font-semibold py-1 px-3 rounded-md transition-colors flex items-center justify-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                            Preview Banner
                                        </button>
                                        {originalImage && (
                                            <button type="button" onClick={() => setImageToCrop(originalImage)} className="w-full text-center bg-yellow-600/50 hover:bg-yellow-600/80 text-yellow-100 text-xs font-semibold py-1 px-3 rounded-md transition-colors flex items-center justify-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" transform="rotate(90 12 12)"/></svg>
                                                {form.ticketBackgroundImage ? 'Re-crop for Tickets' : 'Crop for Tickets'}
                                            </button>
                                        )}
                                        <button type="button" onClick={() => { setForm({ ...form, backgroundImage: '', ticketBackgroundImage: '' }); setOriginalImage(null); }} className="w-full text-center bg-red-600/50 hover:bg-red-600/80 text-red-100 text-xs font-semibold py-1 px-3 rounded-md transition-colors flex items-center justify-center gap-1">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Ticket Background from Banner</label>
                        <div className="bg-slate-700/50 p-3 rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-200 text-sm">Use banner image on tickets</span>
                                <button type="button" onClick={() => setForm({...form, useBannerBackgroundOnTickets: !form.useBannerBackgroundOnTickets})} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 ${ form.useBannerBackgroundOnTickets ? 'bg-indigo-500' : 'bg-slate-600' }`}>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${ form.useBannerBackgroundOnTickets ? 'translate-x-6' : 'translate-x-1' }`}/>
                                </button>
                            </div>
                            {form.useBannerBackgroundOnTickets && form.backgroundImage && (
                            <div className="animate-fade-in-down space-y-3">
                                <div>
                                    <label className="flex justify-between text-sm font-medium text-gray-300">
                                        <span>Overlay Dimness</span>
                                        <span className="font-bold text-indigo-300">{form.ticketBackgroundSettings?.dimOverlay ?? 20}%</span>
                                    </label>
                                    <input type="range" min="0" max="60" value={form.ticketBackgroundSettings?.dimOverlay ?? 20} onChange={(e) => handleSettingsChange('dimOverlay', parseInt(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer range-slider" />
                                </div>
                                <div>
                                    <label className="flex justify-between text-sm font-medium text-gray-300">
                                        <span>Background Blur</span>
                                        <span className="font-bold text-indigo-300">{form.ticketBackgroundSettings?.blur ?? 0}px</span>
                                    </label>
                                    <input type="range" min="0" max="4" step="0.5" value={form.ticketBackgroundSettings?.blur ?? 0} onChange={(e) => handleSettingsChange('blur', parseFloat(e.target.value))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer range-slider" />
                                </div>
                            </div>
                            )}
                            {form.useBannerBackgroundOnTickets && !form.backgroundImage && (
                                <p className="text-xs text-yellow-400 -mt-2 animate-fade-in-down">Upload or generate a banner image to use this feature.</p>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Game Automation</label>
                        <div className="bg-slate-700/50 p-3 rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-200 text-sm">Enable Auto-Claim for Prizes</span>
                                <button type="button" onClick={() => setForm(prev => ({ ...prev, autoVerifyClaims: !prev.autoVerifyClaims }))} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 ${form.autoVerifyClaims ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${form.autoVerifyClaims ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 -mt-2">If enabled, the system will automatically verify and approve valid prize claims for players.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Ticket Generation Options</label>
                        <div className="bg-slate-700/50 p-3 rounded-lg space-y-4">
                            <div>
                                <label className="flex justify-between text-sm font-medium text-gray-300">
                                    <span>Numbers Per Row</span>
                                    <span className="font-bold text-indigo-300">{form.ticketGenerationOptions?.numbersPerRow ?? 5}</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="3" max="7" 
                                    value={form.ticketGenerationOptions?.numbersPerRow ?? 5} 
                                    onChange={(e) => handleTicketOptionsChange('numbersPerRow', parseInt(e.target.value))} 
                                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    <div>
                         <div className="flex justify-between items-center mb-1">
                           <h3 className="font-bold text-sm text-gray-200">Dividends</h3>
                           <h3 className="font-bold text-sm text-gray-200">Prize</h3>
                        </div>
                        <div className="space-y-1">
                            {prizes.map((p, i) => (
                                <div key={i} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md">
                                    <div className="flex items-center">
                                        <button type="button" onClick={() => handleTogglePrize(i)} className={`relative inline-flex items-center h-4 rounded-full w-8 transition-colors duration-200 ease-in-out ${p.enabled ? 'bg-indigo-600' : 'bg-gray-500'}`}>
                                            <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${p.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                                        </button>
                                        <span className="text-sm ml-3 font-medium text-gray-200">{p.name}</span>
                                    </div>
                                    {p.enabled && <input type="number" placeholder="Prize" value={p.value} onChange={(e) => handlePrizeValueChange(i, e.target.value)} className="w-20 p-1 border border-slate-600 bg-slate-900 text-white rounded-md text-sm" />}
                                </div>
                            ))}
                        </div>
                         <div className="flex gap-2 mt-2 w-full">
                            <input value={newPrize} onChange={e => setNewPrize(e.target.value)} placeholder="Add new dividend" className="flex-grow p-2 border border-slate-600 bg-slate-700 text-white rounded-md min-w-0" />
                            <button type="button" onClick={handleAddPrize} className="bg-slate-600 hover:bg-slate-500 font-bold p-2 rounded-md flex-shrink-0">Add</button>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => setShowPreview(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 text-sm rounded-lg">Preview</button>
                        <button type="submit" disabled={isLoading || !isAuthReady} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-4 text-sm rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-wait">
                           {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                           {!isAuthReady ? 'Connecting...' : (isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Game' : 'Create Game'))}
                        </button>
                    </div>
                    {!isAuthReady && (
                        <p className="text-[10px] text-red-400 mt-2 text-center animate-pulse">
                            Waiting for Firebase connection... Please check if Anonymous Auth is enabled.
                        </p>
                    )}
                </form>
            </div>
            {showPreview && <GamePreviewBanner
                gameData={{
                    title: form.title || defaultFormState.title!,
                    place: form.place || defaultFormState.place!,
                    subTitle: form.subTitle || defaultFormState.subTitle!,
                    date: form.date || defaultFormState.date!,
                    time: form.time || defaultFormState.time!,
                    ticketPrice: form.ticketPrice ?? defaultFormState.ticketPrice!,
                    ticketLimit: form.ticketLimit ?? defaultFormState.ticketLimit!,
                    theme: form.theme || defaultFormState.theme!,
                    bannerStyle: form.bannerStyle || defaultFormState.bannerStyle!,
                    description: form.description || defaultFormState.description!,
                    backgroundImage: form.backgroundImage || defaultFormState.backgroundImage,
                    website: form.website || defaultFormState.website,
                }}
                prizes={prizes.filter(p => p.enabled)}
                onClose={() => setShowPreview(false)}
            />}

             {isClockOpen && <ClockPopup 
                isOpen={isClockOpen}
                initialTime={form.time!}
                onClose={() => setIsClockOpen(false)}
                onTimeSelect={handleTimeSelect}
            />}

            <ImageCropperModal
                isOpen={!!imageToCrop}
                imageSrc={imageToCrop}
                onClose={() => setImageToCrop(null)}
                onCrop={handleCropComplete}
            />
        </div>
    );
};