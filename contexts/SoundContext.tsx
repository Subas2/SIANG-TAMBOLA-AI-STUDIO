import React, { createContext, useContext, useRef, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { rhymes } from '../constants';
import { useSpeech } from './SpeechContext';
import { mockDB } from '../services/mockApi';

declare global {
    interface Window {
        Tone: any;
    }
}

// 1. More descriptive sound types
export type SoundType = 
    'click' | 
    'notification' | 
    'numberCall' | 
    'swoosh' | 
    'prizeClaim' | 
    'ticketBook' | 
    'gameStart' | 
    'gameEnd' |
    'welcome' |
    'success' |
    'error' |
    'tick';

// 2. Options for playSound for more dynamic sounds
export interface SoundOptions {
    number?: number;
    isRhyme?: boolean;
    volume?: number; // in decibels, e.g., -10
    pitch?: string | number; // e.g., "C4", "G3" or frequency in Hz
}

interface SoundContextType {
    // Updated signature
    playSound: (sound: SoundType, options?: SoundOptions) => Promise<void>;
}

const SoundContext = createContext<SoundContextType | null>(null);

export const useSound = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
};

export const SoundProvider: React.FC<{ children: ReactNode; settings?: any }> = ({ children, settings }) => {
    const { speak, warmup } = useSpeech();
    const synths = useRef<any>({});
    const lastPlayTimes = useRef<Record<string, number>>({});
    const isInitialized = useRef(false);

    const currentSettings = settings || mockDB.settings;

    // 3. Initialize more synths for varied sounds
    const initialize = useCallback(() => {
        if (!window.Tone || isInitialized.current) return;

        try {
            // Warmup speech synthesis
            warmup();

            // Create effects for richer sounds
            const reverb = new window.Tone.Reverb(0.5).toDestination();
            const delay = new window.Tone.FeedbackDelay("8n", 0.3).connect(reverb);

            // Click: A soft, quick pluck for UI interactions
            synths.current.click = new window.Tone.MembraneSynth({
                pitchDecay: 0.01,
                octaves: 2,
                envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
            }).toDestination();

            // Notification: A gentle, two-tone chime
            synths.current.notification = new window.Tone.Synth({
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 },
            }).connect(delay);

            // Number Call: A bouncy FM synth for clear number indication
            synths.current.numberCall = new window.Tone.FMSynth({
                harmonicity: 3,
                modulationIndex: 10,
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
                modulationEnvelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 0.2 },
            }).connect(reverb);

            // Swoosh: Good for transitions
            synths.current.swoosh = new window.Tone.NoiseSynth({
                noise: { type: 'white' },
                envelope: { attack: 0.005, decay: 0.15, sustain: 0 }
            }).toDestination();
            
            // Ticket Book: A satisfying 'plink' sound
            synths.current.ticketBook = new window.Tone.PluckSynth({
                attackNoise: 1,
                dampening: 4000,
                resonance: 0.7
            }).toDestination();

            // Prize Claim: A celebratory arpeggio
            synths.current.prizeClaim = new window.Tone.PolySynth(window.Tone.Synth, {
                 oscillator: { type: 'fatsawtooth' },
                 envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.4 },
            }).connect(delay);

            // Game Start: An uplifting sequence
            synths.current.gameStart = new window.Tone.PolySynth().toDestination();

            // Game End: A conclusive, gentle chime sequence
            synths.current.gameEnd = new window.Tone.PolySynth().toDestination();
            
            // Welcome: A warm, inviting chord
            synths.current.welcome = new window.Tone.PolySynth(window.Tone.Synth, {
                oscillator: { type: 'fatsine' },
                envelope: { attack: 0.1, decay: 0.5, sustain: 0.3, release: 1 },
            }).connect(reverb);

            // Success: A bright, rising arpeggio
            synths.current.success = new window.Tone.PolySynth(window.Tone.Synth, {
                oscillator: { type: 'triangle8' },
                envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.3 },
            }).connect(delay);

            // Error: A low, subtle dissonant chord
            synths.current.error = new window.Tone.PolySynth(window.Tone.FMSynth, {
                harmonicity: 1.5,
                modulationIndex: 5,
                envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.3 },
            }).toDestination();

            // Tick: A very short, high-pitched click for countdowns
            synths.current.tick = new window.Tone.MembraneSynth({
                pitchDecay: 0.001,
                octaves: 1,
                envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
            }).toDestination();
            synths.current.tick.volume.value = -10;

            isInitialized.current = true;

        } catch (error) {
            console.error("Failed to initialize Tone.js synths:", error);
        }
    }, []);

    useEffect(() => {
        // Updated to use Tone.start() for better browser compatibility and added touchend
        const startAudioContext = () => {
            if (window.Tone && window.Tone.context.state !== 'running') {
                window.Tone.start().then(() => {
                    initialize();
                });
            } else {
                initialize();
            }
            document.body.removeEventListener('click', startAudioContext);
            document.body.removeEventListener('touchend', startAudioContext);
        };
        document.body.addEventListener('click', startAudioContext);
        document.body.addEventListener('touchend', startAudioContext);
        return () => {
             document.body.removeEventListener('click', startAudioContext);
             document.body.removeEventListener('touchend', startAudioContext);
        }
    }, [initialize]);

    // 4. Implement the dynamic sound logic
    const playSound = useCallback(async (sound: SoundType, options: SoundOptions = {}) => {
        if (!isInitialized.current || !window.Tone || window.Tone.context.state !== 'running') return;

        let now = window.Tone.now();
        
        // Ensure strictly increasing start times to avoid Web Audio API errors
        // when triggering sounds rapidly in the same execution loop.
        const lastTime = lastPlayTimes.current[sound] || 0;
        if (now <= lastTime) {
            now = lastTime + 0.005; // Add 5ms buffer
        }
        let latestTime = now;

        try {
            const synth = synths.current[sound];
            if (!synth) return;

            // Apply temporary volume if provided
            const originalVolume = synth.volume.value;
            if (options.volume !== undefined) {
                synth.volume.value = options.volume;
            }

            switch (sound) {
                case 'click':
                    synth.triggerAttackRelease(options.pitch || 'C2', '8n', now);
                    break;
                case 'notification':
                    synth.triggerAttackRelease(options.pitch || 'A5', '16n', now);
                    synth.triggerAttackRelease('E6', '16n', now + 0.1);
                    latestTime = now + 0.1;
                    break;
                case 'numberCall': {
                    const number = options.number;
                    if (typeof number === 'number') {
                        // Speech Synthesis Logic
                        let textToSpeak = `Number ${number}`;
                        if (options.isRhyme && rhymes[number]) {
                            textToSpeak = rhymes[number];
                        }
                        
                        // Tone.js Sound Logic
                        const freq = (options.pitch as number) || (200 + (number / 90) * 600);

                        if (number > 85) {
                            synth.triggerAttackRelease(freq, '16n', now);
                            synth.triggerAttackRelease(freq * 1.5, '16n', now + 0.1);
                            latestTime = now + 0.1;
                        } 
                        else if (options.isRhyme && rhymes[number]) {
                             synth.triggerAttackRelease(freq, '8n', now);
                             synth.triggerAttackRelease(freq / 1.25, '8n', now + 0.15);
                             latestTime = now + 0.15;
                        } 
                        else {
                            synth.triggerAttackRelease(freq, '8n', now);
                        }
                        
                        await speak(textToSpeak);
                    } else {
                        synth.triggerAttackRelease(options.pitch || 440, '8n', now);
                    }
                    break;
                }
                case 'swoosh':
                    synth.triggerAttackRelease('4n', now);
                    break;
                case 'ticketBook':
                    synth.triggerAttackRelease(options.pitch || 'C5', now);
                    break;
                case 'prizeClaim':
                    // A quick, celebratory arpeggio
                    const notes = ["C5", "E5", "G5", "C6"];
                    synth.triggerAttackRelease(notes[0], '16n', now);
                    synth.triggerAttackRelease(notes[1], '16n', now + 0.1);
                    synth.triggerAttackRelease(notes[2], '16n', now + 0.2);
                    synth.triggerAttackRelease(notes[3], '8n', now + 0.3);
                    latestTime = now + 0.3;
                    break;
                case 'gameStart':
                    synth.triggerAttackRelease(["C4", "E4", "G4"], "8n", now);
                    synth.triggerAttackRelease(["C5"], "4n", now + 0.2);
                    latestTime = now + 0.2;
                    break;
                case 'gameEnd':
                    synth.triggerAttackRelease(["G5", "E5", "C5"], "8n", now);
                    break;
                case 'welcome':
                    synth.triggerAttackRelease(["C4", "E4", "G4", "C5"], "1n", now);
                    setTimeout(() => speak("Welcome to Siang Tambola"), 200);
                    break;
                case 'success':
                    synth.triggerAttackRelease("C5", "16n", now);
                    synth.triggerAttackRelease("E5", "16n", now + 0.1);
                    synth.triggerAttackRelease("G5", "16n", now + 0.2);
                    latestTime = now + 0.2;
                    break;
                case 'error':
                    synth.triggerAttackRelease(["C3", "C#3"], "8n", now);
                    break;
                case 'tick':
                    synth.triggerAttackRelease(options.pitch || 'C4', '16n', now);
                    break;
                default:
                    // Fallback for any unhandled sounds
                    synths.current.click?.triggerAttackRelease('C1', '8n', now);
            }

            // Reset volume after a short delay if it was changed
            if (options.volume !== undefined) {
                setTimeout(() => {
                    if (synths.current && synths.current[sound]) {
                        synths.current[sound].volume.value = originalVolume;
                    }
                }, 1000);
            }

            lastPlayTimes.current[sound] = latestTime;
        } catch(error) {
            console.error(`Failed to play sound '${sound}':`, error);
        }
    }, [speak]);

    const value = useMemo(() => ({ playSound }), [playSound]);

    return (
        <SoundContext.Provider value={value}>
            {children}
        </SoundContext.Provider>
    );
};
