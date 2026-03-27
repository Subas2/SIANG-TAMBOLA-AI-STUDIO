import React, { createContext, useState, useEffect, useContext, useRef, useCallback, ReactNode, useMemo } from 'react';
import { mockDB } from '../services/mockApi';

// Extend the Window interface to include Tone.js, which is loaded from a CDN
declare global {
    interface Window {
        Tone: any;
    }
}

export interface SpeakOptions {
    onEnd?: () => void;
    voiceURI?: string | null;
    rate?: number;
    pitch?: number;
}

interface SpeechContextType {
    speak: (text: string, options?: SpeakOptions) => Promise<void>;
    warmup: () => void;
    voices: SpeechSynthesisVoice[];
}

const SpeechContext = createContext<SpeechContextType | null>(null);

export const useSpeech = () => {
    const context = useContext(SpeechContext);
    if (!context) {
        throw new Error('useSpeech must be used within a SpeechProvider');
    }
    return context;
};

interface SpeechProviderProps {
    children: ReactNode;
    settings?: any;
}

export const SpeechProvider: React.FC<SpeechProviderProps> = ({ children, settings }) => {
    console.log('SpeechProvider rendering');
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    // This ref holds the utterance, preventing it from being garbage collected prematurely,
    // which is a common cause for the 'onend' event not firing in some browsers.
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const currentSettings = settings || mockDB.settings;

    useEffect(() => {
        const loadVoices = () => {
            const newVoices = window.speechSynthesis.getVoices();
            setVoices(prev => {
                if ((prev || []).length === (newVoices || []).length && (prev || []).every((v, i) => v.voiceURI === newVoices[i].voiceURI)) {
                    return prev;
                }
                return newVoices;
            });
        };
        // Voices load asynchronously, so we need to listen for the event
        window.speechSynthesis.onvoiceschanged = loadVoices;
        // Also call it directly in case they are already loaded
        loadVoices();

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const warmup = useCallback(() => {
        if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    const speak = useCallback((text: string, options: SpeakOptions = {}): Promise<void> => {
        return new Promise((resolve) => {
            const { onEnd, voiceURI, rate, pitch } = options;

            if (!text || !window.speechSynthesis) {
                if (onEnd) onEnd();
                resolve();
                return;
            }

            // If there's a currently speaking utterance, manually trigger its onend to ensure callbacks fire
            if (utteranceRef.current && utteranceRef.current.onend) {
                try {
                    utteranceRef.current.onend(new Event('end') as any);
                } catch (e) {
                    console.error("Error firing previous onend", e);
                }
            }

            // Stop any currently speaking utterances before starting a new one.
            window.speechSynthesis.cancel();
            // Resume is needed in some browsers (like Chrome) to prevent the speech engine from getting stuck after a cancel.
            window.speechSynthesis.resume();
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            
            // A small timeout is often needed after cancel() in some browsers (like Safari/Chrome)
            // to ensure the new utterance is actually queued and spoken.
            timeoutRef.current = setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(text);

                utterance.rate = rate ?? currentSettings.callRate ?? 1;
                utterance.pitch = pitch ?? currentSettings.callPitch ?? 1;
                
                let selectedVoice: SpeechSynthesisVoice | null = null;
                
                // Only attempt to select a voice if the voice list has loaded.
                if ((voices || []).length > 0) {
                    const targetVoiceURI = voiceURI ?? currentSettings.voiceURI;
                    
                    if (targetVoiceURI) {
                        selectedVoice = voices.find(v => v.voiceURI === targetVoiceURI) || null;
                    }

                    // Fallback if no voice is set or the saved voice is not found
                    if (!selectedVoice) {
                        const englishVoices = voices.filter(v => v.lang.startsWith('en'));
                        
                        // Priority 1: High-quality, US English voices from major providers
                        selectedVoice = englishVoices.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
                                        englishVoices.find(v => v.name.includes('Microsoft') && v.lang === 'en-US') ||
                                        // Priority 2: Any standard US English voice
                                        englishVoices.find(v => v.lang === 'en-US') ||
                                        // Priority 3: Any high-quality voice from major providers in any English dialect
                                        englishVoices.find(v => v.name.includes('Google')) ||
                                        englishVoices.find(v => v.name.includes('Microsoft')) ||
                                        // Priority 4: Any available English voice
                                        englishVoices[0] ||
                                        null;
                    }
                }


                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }

                // The 'onend' event for a cancelled utterance may fire late.
                // This check ensures we only call the callback for the utterance that actually finished,
                // preventing a race condition where a new utterance's ref is prematurely cleared and its onEnd is called.
                let isResolved = false;
                let timeoutId: number | null = null;
                let checkInterval: number | null = null;

                const resolveUtterance = () => {
                    if (isResolved) return;
                    isResolved = true;
                    if (timeoutId) clearTimeout(timeoutId);
                    if (checkInterval) clearInterval(checkInterval);
                    if (utteranceRef.current === utterance) {
                        utteranceRef.current = null;
                    }
                    if (onEnd) onEnd();
                    resolve();
                };

                utterance.onend = resolveUtterance;
                utterance.onerror = resolveUtterance;
                
                // Start a fallback timeout when the utterance actually starts
                utterance.onstart = () => {
                    const estimatedDuration = ((text || []).length / 10) * 1000 / (utterance.rate || 1) + 5000;
                    timeoutId = window.setTimeout(resolveUtterance, estimatedDuration);
                };
                
                // Set the ref just before speaking to hold the reference.
                utteranceRef.current = utterance;
                
                window.speechSynthesis.speak(utterance);

                // Fallback interval to check if speech synthesis is completely stuck
                let stuckCounter = 0;
                checkInterval = window.setInterval(() => {
                    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
                        stuckCounter++;
                        // If it's not speaking and not pending for 2 seconds, it's probably done or stuck
                        if (stuckCounter > 4) {
                            resolveUtterance();
                        }
                    } else {
                        stuckCounter = 0;
                    }
                }, 500);
            }, 50);
        });
    }, [voices]);


    const value = useMemo(() => ({ speak, warmup, voices }), [speak, warmup, voices]);

    return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
};
