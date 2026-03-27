import React, { useState, useEffect } from 'react';

interface TimeControlBarProps {
    cycleStartedAt: number | null | undefined;
    cycleEndsAt: number | null | undefined;
    isAutoCalling: boolean;
}

export const TimeControlBar: React.FC<TimeControlBarProps> = ({ cycleStartedAt, cycleEndsAt, isAutoCalling }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!isAutoCalling || !cycleStartedAt || !cycleEndsAt) {
            setProgress(0);
            return;
        }

        let animationFrameId: number;

        const updateProgress = () => {
            const now = Date.now();
            const totalDuration = cycleEndsAt - cycleStartedAt;
            const elapsed = now - cycleStartedAt;
            
            if (totalDuration <= 0) {
                setProgress(100);
            } else {
                const currentProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
                setProgress(currentProgress);
                
                if (currentProgress < 100) {
                    animationFrameId = requestAnimationFrame(updateProgress);
                }
            }
        };

        animationFrameId = requestAnimationFrame(updateProgress);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [cycleStartedAt, cycleEndsAt, isAutoCalling]);

    if (!isAutoCalling || !cycleStartedAt || !cycleEndsAt) {
        return null;
    }

    return (
        <div className="w-full bg-slate-700/50 rounded-full h-2 mt-4 overflow-hidden shadow-inner">
            <div 
                className="bg-indigo-500 h-2 rounded-full transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
};
