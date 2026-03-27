import React, { useEffect, ReactNode } from 'react';
import { useSound } from '../../contexts/SoundContext';
import { SoundType } from '../../contexts/SoundContext';

interface AnimatedViewProps {
    children: ReactNode;
    animationClass?: string;
    className?: string;
    soundEffect?: SoundType;
    isPopup?: boolean;
}

export const AnimatedView: React.FC<AnimatedViewProps> = ({ children, animationClass = 'animate-fade-in-up', className = '', soundEffect, isPopup = false }) => {
    const { playSound } = useSound();

    useEffect(() => {
        if (soundEffect) {
            playSound(soundEffect);
        }
        if (isPopup) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            if (isPopup) {
                document.body.style.overflow = 'auto';
            }
        };
    }, [playSound, soundEffect, isPopup]);
    
    return (
        <div className={`${className} ${animationClass}`}>
            {children}
        </div>
    );
};
