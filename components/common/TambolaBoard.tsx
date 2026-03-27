import React from 'react';

interface TambolaBoardProps {
    calledNumbers: number[];
    lastCalled: number | null;
    manualQueue?: number[];
    onNumberClick?: (number: number) => void;
}

export const TambolaBoard: React.FC<TambolaBoardProps> = React.memo(({ calledNumbers, lastCalled, manualQueue = [], onNumberClick }) => {
    return (
        <div className="bg-slate-900/30 backdrop-blur-sm p-2 rounded-xl shadow-inner border border-slate-700/50">
            <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 90 }, (_, i) => i + 1).map(num => {
                    const isCalled = calledNumbers.includes(num);
                    const isLastCalledNum = num === lastCalled;
                    const isQueued = manualQueue.includes(num);
                    
                    let cellClass = 'bg-slate-700/50 text-gray-300 shadow-sm';

                    if (isLastCalledNum) {
                        cellClass = 'bg-red-500 text-white shadow-lg scale-110 transform ring-4 ring-red-400 animate-pulse';
                    } else if (isQueued) {
                        cellClass = 'bg-purple-500 text-white shadow-md scale-105 transform ring-2 ring-purple-300';
                    } else if (isCalled) {
                        cellClass = 'bg-green-500/80 text-white scale-105 transform';
                    }

                    if (onNumberClick && !isCalled) {
                        cellClass += ' cursor-pointer hover:bg-slate-600/60';
                    }

                    const handleClick = () => {
                        if (onNumberClick && !isCalled) {
                            onNumberClick(num);
                        }
                    };

                    return (
                        <div 
                            key={num} 
                            className={`w-full aspect-square flex items-center justify-center text-xs font-semibold rounded-full transition-all duration-300 ${cellClass}`}
                            onClick={handleClick}
                        >
                            {num}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});