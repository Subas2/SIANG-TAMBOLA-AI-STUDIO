import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';

interface ClockPopupProps {
    isOpen: boolean;
    onClose: () => void;
    initialTime: string; // Expects "HH:mm"
    onTimeSelect: (time: string) => void; // Returns "HH:mm"
}

const CLOCK_RADIUS = 110;
const NUMBER_RADIUS = 28;

export const ClockPopup: React.FC<ClockPopupProps> = ({ isOpen, onClose, initialTime, onTimeSelect }) => {
    const [mode, setMode] = useState<'hour' | 'minute'>('hour');
    const [hour, setHour] = useState(12);
    const [minute, setMinute] = useState(0);
    const [period, setPeriod] = useState<'AM' | 'PM'>('PM');

    useEffect(() => {
        const [h, m] = initialTime.split(':').map(Number);
        const newPeriod = h >= 12 ? 'PM' : 'AM';
        let newHour = h % 12;
        if (newHour === 0) newHour = 12;

        setHour(newHour);
        setMinute(m);
        setPeriod(newPeriod);
    }, [initialTime]);

    const handleConfirm = () => {
        let hour24 = hour;
        if (period === 'PM' && hour !== 12) {
            hour24 += 12;
        }
        if (period === 'AM' && hour === 12) {
            hour24 = 0;
        }
        const formattedTime = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onTimeSelect(formattedTime);
    };

    const handleHourSelect = (selectedHour: number) => {
        setHour(selectedHour);
        setMode('minute');
    };
    
    const handleMinuteSelect = (selectedMinute: number) => {
        setMinute(selectedMinute);
    };

    const numbers = useMemo(() => {
        if (mode === 'hour') {
            return Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }));
        } else {
            return Array.from({ length: 12 }, (_, i) => ({ value: i * 5, label: `${String(i * 5).padStart(2, '0')}` }));
        }
    }, [mode]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xs" hideHeader disableContentPadding>
            <div 
                className="w-full max-w-xs text-white flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 bg-slate-900/50 rounded-t-xl">
                    <div className="flex justify-center items-center text-5xl font-mono tracking-widest">
                        <button className={`px-2 py-1 rounded ${mode === 'hour' ? 'bg-indigo-600/50' : ''}`} onClick={() => setMode('hour')}>
                            {String(hour).padStart(2, '0')}
                        </button>
                        <span className="animate-pulse">:</span>
                        <button className={`px-2 py-1 rounded ${mode === 'minute' ? 'bg-indigo-600/50' : ''}`} onClick={() => setMode('minute')}>
                            {String(minute).padStart(2, '0')}
                        </button>
                    </div>
                    <div className="flex justify-center gap-2 mt-2">
                        <button 
                            onClick={() => setPeriod('AM')}
                            className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${period === 'AM' ? 'bg-indigo-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}
                        >AM</button>
                        <button 
                            onClick={() => setPeriod('PM')}
                            className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${period === 'PM' ? 'bg-indigo-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}
                        >PM</button>
                    </div>
                </div>
                
                <div className="flex justify-center items-center p-6">
                    <div className="relative" style={{ width: CLOCK_RADIUS * 2, height: CLOCK_RADIUS * 2 }}>
                        <div className="w-full h-full bg-slate-900/50 rounded-full border-4 border-slate-700"></div>
                        {numbers.map(({ value, label }, index) => {
                            const angle = (index / numbers.length) * 2 * Math.PI - (Math.PI / 2);
                            const x = CLOCK_RADIUS + (CLOCK_RADIUS - (NUMBER_RADIUS / 2) - 15) * Math.cos(angle) - (NUMBER_RADIUS / 2);
                            const y = CLOCK_RADIUS + (CLOCK_RADIUS - (NUMBER_RADIUS / 2) - 15) * Math.sin(angle) - (NUMBER_RADIUS / 2);
                            
                            const isSelected = (mode === 'hour' && value === hour) || (mode === 'minute' && value === minute);

                            return (
                                <button
                                    key={value}
                                    onClick={() => mode === 'hour' ? handleHourSelect(value) : handleMinuteSelect(value)}
                                    className={`absolute flex items-center justify-center rounded-full font-semibold transition-all duration-200
                                        ${isSelected 
                                            ? 'bg-indigo-500 text-white shadow-lg scale-110' 
                                            : 'bg-slate-700 hover:bg-slate-600 text-gray-200'
                                        }`}
                                    style={{
                                        left: `${x}px`,
                                        top: `${y}px`,
                                        width: `${NUMBER_RADIUS}px`,
                                        height: `${NUMBER_RADIUS}px`,
                                        fontSize: '12px'
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-2 p-4 bg-slate-900/50 rounded-b-xl border-t border-slate-700">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg text-sm">Cancel</button>
                    <button onClick={handleConfirm} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm">OK</button>
                </div>
            </div>
        </Modal>
    );
};
