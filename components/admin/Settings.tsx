import React, { useState, useMemo, ReactNode } from 'react';
import { mockDB, api } from '../../services/mockApi';
import { useToast } from '../../contexts/ToastContext';
import { useSpeech } from '../../contexts/SpeechContext';
import { CustomSelect } from '../common/CustomSelect';
import { Settings as SettingsType } from '../../types';
import { AnimatedView } from '../common/AnimatedView';

interface SettingsProps {
    onBack: () => void;
}

const Toggle: React.FC<{label: string, enabled: boolean, onChange: (enabled: boolean) => void, description?: string, disabled?: boolean}> = ({ label, enabled, onChange, description, disabled }) => (
    <div>
        <div className="flex items-center justify-between">
            <span className="text-gray-200">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!enabled)}
                disabled={disabled}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                    enabled ? 'bg-indigo-500' : 'bg-slate-600'
                }`}
            >
                <span
                    className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
        </div>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
);

const SettingsCard: React.FC<{title: string, children: ReactNode}> = ({ title, children }) => (
    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-3">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const TabButton: React.FC<{isActive: boolean, onClick: () => void, icon: ReactNode, label: string}> = ({ isActive, onClick, icon, label }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            isActive 
            ? 'bg-indigo-500/20 text-indigo-300' 
            : 'text-gray-400 hover:bg-slate-700/50 hover:text-gray-200'
        }`}
    >
        <span className="w-5 h-5">{icon}</span>
        <span>{label}</span>
    </button>
);


export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
    const { voices, speak } = useSpeech();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const [settings, setSettings] = useState<SettingsType>({
        ...mockDB.settings,
        universalLink: mockDB.settings.universalLink || 'https://siangtambola.netlify.app',
        adminLink: mockDB.settings.adminLink || 'https://siangtambola.netlify.app/admin',
        agentLink: mockDB.settings.agentLink || 'https://siangtambola.netlify.app/agent',
        playerLink: mockDB.settings.playerLink || 'https://siangtambola.netlify.app/player',
    });

    const tabs = useMemo(() => [
        {
            key: 'general',
            label: 'General',
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.004.827c-.292.24-.437.613-.43.992a6.759 6.759 0 010 1.555c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437.613.43-.992a6.759 6.759 0 010-1.555c.007-.378-.138.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        },
        {
            key: 'voice',
            label: 'Voice & Sound',
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" /></svg>
        },
        {
            key: 'branding',
            label: 'Branding',
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
        },
        {
            key: 'community',
            label: 'Community',
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.14-4.244a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243zm-2.121 9.435A9.094 9.094 0 0112 18c2.828 0 5.378-.888 7.47-2.372A3 3 0 0018 15.045V12H6v3.045A3 3 0 007.879 18.375z" /></svg>
        },
        {
            key: 'links',
            label: 'Portal Links',
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
        }
    ], []);

    const handleSettingChange = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
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
                handleSettingChange('loginBackgroundImage', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        handleSettingChange('loginBackgroundImage', undefined);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await api.admin.updateSettings(settings);
            toast.show('Settings saved successfully!');
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.show('Failed to save settings. Please try again.', { type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleTestVoice = () => {
        if (!window.speechSynthesis) {
            toast.show('Speech synthesis is not supported in your browser.', { type: 'error' });
            return;
        }
        speak("This is a test of the selected voice settings.", {
            voiceURI: settings.voiceURI,
            rate: settings.callRate,
            pitch: settings.callPitch
        });
    };

    const copyToClipboard = (text: string | undefined) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            toast.show('Link copied to clipboard!');
        }, () => toast.show('Failed to copy link.', { type: 'error' }));
    };

    const voiceOptions = useMemo(() => {
        const shortenVoiceLabel = (voice: SpeechSynthesisVoice) => `${voice.name.replace(/^(Google|Microsoft)\s+/i, '').replace(/\s*\([^)]+\)/g, '')} (${voice.lang.split('-')[1] || voice.lang})`;
        return voices.filter(v => v.lang.startsWith('en')).sort((a, b) => a.name.localeCompare(b.name)).map(voice => ({ value: voice.voiceURI, label: shortenVoiceLabel(voice) }));
    }, [voices]);
    
    const communityLinkConfig = [
        { key: 'whatsappLink', label: 'WhatsApp Group Link', placeholder: 'https://chat.whatsapp.com/...', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.086l.001.004 4.919 1.305z"/></svg> },
        { key: 'facebookLink', label: 'Facebook Page', placeholder: 'https://facebook.com/...', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v2.385z"/></svg> },
        { key: 'youtubeLink', label: 'YouTube Channel', placeholder: 'https://youtube.com/...', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg> },
        { key: 'instagramLink', label: 'Instagram Profile', placeholder: 'https://instagram.com/...', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.585-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.585-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.585.069-4.85c.149-3.225 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.85-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.947s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.689-.073-4.948-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.441 1.441 1.441 1.441-.645 1.441-1.441-.645-1.44-1.441-1.44z"/></svg> },
        { key: 'websiteLink', label: 'Website', placeholder: 'https://yourwebsite.com', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45---1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg> },
    ].filter(Boolean) as { key: keyof SettingsType, label: string, placeholder: string, icon: ReactNode }[];

    return (
        <div className="p-2">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-lg max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-gray-100">App Settings</h2>
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Tabs for all screen sizes */}
                    <nav className="flex flex-col gap-1 md:w-56 flex-shrink-0">
                        {tabs.map(tab => (
                            <TabButton
                                key={tab.key}
                                label={tab.label}
                                isActive={activeTab === tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                icon={tab.icon}
                            />
                        ))}
                    </nav>
                    
                    {/* Right Content */}
                    <div className="flex-grow min-w-0">
                        {activeTab === 'general' && (
                            <AnimatedView className="space-y-4">
                                <SettingsCard title="Game Host Information">
                                    <div>
                                        <label className="text-sm text-gray-400">Host Name</label>
                                        <input type="text" value={settings.hostName || ''} onChange={e => handleSettingChange('hostName', e.target.value)} className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">Contact Number</label>
                                        <input type="text" value={settings.contactNumber || ''} onChange={e => handleSettingChange('contactNumber', e.target.value)} className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400">UPI ID</label>
                                        <input type="text" value={settings.upiId || ''} onChange={e => handleSettingChange('upiId', e.target.value)} className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                                    </div>
                                </SettingsCard>
                                <SettingsCard title="Feature Toggles">
                                    <Toggle label="Enable Live Chat" enabled={settings.isChatEnabled ?? true} onChange={val => handleSettingChange('isChatEnabled', val)} description="Allow players and agents to chat during ongoing games." />
                                    <Toggle label="Enable Player Ticket Requests" enabled={settings.isPlayerTicketRequestEnabled ?? true} onChange={val => handleSettingChange('isPlayerTicketRequestEnabled', val)} description="Allow players to request tickets directly from agents." />
                                    <Toggle label="Enable Agent Booking" enabled={settings.isAgentBookingEnabled ?? true} onChange={val => handleSettingChange('isAgentBookingEnabled', val)} description="Globally enable or disable ticket booking for all agents." />
                                </SettingsCard>
                            </AnimatedView>
                        )}
                        {activeTab === 'voice' && (
                            <AnimatedView>
                                <SettingsCard title="Voice & Sound Settings">
                                    <div>
                                        <label className="text-sm text-gray-400">Spoken Voice</label>
                                        <CustomSelect options={voiceOptions} value={settings.voiceURI} onChange={val => handleSettingChange('voiceURI', val)} placeholder="Select a voice"/>
                                    </div>
                                    <div>
                                        <label className="flex justify-between text-sm text-gray-400"><span>Voice Rate:</span><span className="font-bold text-indigo-300">{settings.callRate?.toFixed(2) || '1.00'}</span></label>
                                        <input type="range" min="0.5" max="2" step="0.05" value={settings.callRate ?? 1} onChange={e => handleSettingChange('callRate', parseFloat(e.target.value))} className="w-full" />
                                    </div>
                                    <div>
                                        <label className="flex justify-between text-sm text-gray-400"><span>Voice Pitch:</span><span className="font-bold text-indigo-300">{settings.callPitch?.toFixed(2) || '1.00'}</span></label>
                                        <input type="range" min="0" max="2" step="0.05" value={settings.callPitch ?? 1} onChange={e => handleSettingChange('callPitch', parseFloat(e.target.value))} className="w-full" />
                                    </div>
                                    <Toggle label="Use Rhymes" enabled={settings.useRhymes} onChange={val => handleSettingChange('useRhymes', val)} description="Announce numbers with traditional Tambola rhymes." />
                                    <div className="border-t border-slate-700 !my-3"></div>
                                    <div>
                                        <label className="flex justify-between text-sm text-gray-400">
                                            <span>Auto-Call Delay:</span>
                                            <span className="font-bold text-indigo-300">{settings.callDelay}s</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="2" 
                                            max="15" 
                                            step="1" 
                                            value={settings.callDelay} 
                                            onChange={e => handleSettingChange('callDelay', parseInt(e.target.value, 10))} 
                                            className="w-full" 
                                        />
                                    </div>
                                    <div className="border-t border-slate-700 !my-3"></div>
                                    <button onClick={handleTestVoice} className="w-full text-center bg-slate-600 hover:bg-slate-500 text-gray-200 text-sm font-semibold py-2 px-3 rounded-md transition-colors">Test Voice</button>
                                </SettingsCard>
                            </AnimatedView>
                        )}
                         {activeTab === 'branding' && (
                            <AnimatedView>
                                <SettingsCard title="Login Page Background">
                                    <div>
                                        <label className="text-sm text-gray-400">Custom Background Image</label>
                                        <div className="mt-2 flex items-center gap-4">
                                            <div className="w-24 h-16 bg-slate-900/50 rounded-md flex items-center justify-center overflow-hidden border border-slate-700">
                                                {settings.loginBackgroundImage ? (
                                                    <img src={settings.loginBackgroundImage} alt="Login background preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs text-gray-500 p-1 text-center">Default Animated Forest</span>
                                                )}
                                            </div>
                                            <div className="flex-grow">
                                                <input type="file" id="loginBgInput" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                <button type="button" onClick={() => document.getElementById('loginBgInput')?.click()} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg text-sm">
                                                    Change Image
                                                </button>
                                                {settings.loginBackgroundImage && (
                                                    <button type="button" onClick={handleRemoveImage} className="ml-2 bg-red-600/50 hover:bg-red-600/80 text-red-100 font-semibold py-2 px-4 rounded-lg text-sm">
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Recommended: High-resolution landscape image.</p>
                                    </div>
                                </SettingsCard>
                            </AnimatedView>
                        )}
                        {activeTab === 'community' && (
                            <AnimatedView>
                                <SettingsCard title="Community & Social Links">
                                    {communityLinkConfig.map(link => (
                                        <div key={link.key}>
                                            <label className="text-sm text-gray-400 flex items-center gap-2">{link.icon} {link.label}</label>
                                            <input type="url" value={String(settings[link.key] || '')} onChange={e => handleSettingChange(link.key, e.target.value)} placeholder={link.placeholder} className="w-full mt-1 p-2 border border-slate-600 bg-slate-700 text-white rounded-md" />
                                        </div>
                                    ))}
                                </SettingsCard>
                            </AnimatedView>
                        )}
                         {activeTab === 'links' && (
                            <AnimatedView>
                                 <SettingsCard title="Portal Links">
                                     {[
                                         { key: 'universalLink', label: 'Universal Portal' },
                                         { key: 'adminLink', label: 'Admin Portal' },
                                         { key: 'agentLink', label: 'Agent Portal' },
                                         { key: 'playerLink', label: 'Player Portal' }
                                     ].map(item => (
                                         <div key={item.key}>
                                            <label className="text-sm text-gray-400">{item.label}</label>
                                            <div className="flex gap-2 mt-1">
                                                <input type="text" value={String(settings[item.key as keyof SettingsType] || '')} readOnly className="w-full p-2 border border-slate-600 bg-slate-900/50 text-gray-300 rounded-md" />
                                                <button onClick={() => copyToClipboard(settings[item.key as keyof SettingsType] as string)} className="bg-slate-600 hover:bg-slate-500 text-white p-2 rounded-md" title="Copy link">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                </button>
                                            </div>
                                         </div>
                                     ))}
                                 </SettingsCard>
                            </AnimatedView>
                         )}
                    </div>
                </div>
                <div className="mt-6 border-t border-slate-700 pt-4 flex justify-end">
                    <button onClick={handleSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-wait">
                         {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isLoading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};