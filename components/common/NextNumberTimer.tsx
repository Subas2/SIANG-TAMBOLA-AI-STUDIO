
import React from 'react';

interface NextNumberTimerProps {
    duration: number; // in seconds
    remaining: number; // in seconds
    size?: number;
    strokeWidth?: number;
}

export const NextNumberTimer: React.FC<NextNumberTimerProps> = ({ duration, remaining, size = 60, strokeWidth = 5 }) => {
    if (duration <= 0 || remaining < 0) {
        return (
            <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
                <p className="text-2xl font-bold text-gray-500">-</p>
            </div>
        );
    }

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    // Ensure progress is between 0 and 1
    const progress = Math.min(1, Math.max(0, remaining / duration));
    const offset = circumference * (1 - progress);

    return (
        <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                {/* Background track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="stroke-slate-700/50"
                    fill="transparent"
                />
                {/* Progress ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="stroke-indigo-400"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                 <p className="text-xl font-bold text-indigo-400 leading-none">{Math.ceil(remaining)}<span className="text-xs align-baseline">s</span></p>
                 <p className="text-[9px] font-bold text-gray-400 uppercase">Next In</p>
            </div>
        </div>
    );
};
