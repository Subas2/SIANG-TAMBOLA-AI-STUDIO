import React, { useState, useRef, useEffect, ReactNode } from 'react';
import ReactDOM from 'react-dom';

interface DraggableModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title: string;
    initialPosition?: { x: number, y: number };
}

export const DraggableModal: React.FC<DraggableModalProps> = ({ isOpen, onClose, children, title, initialPosition }) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 50 });
    const modalRef = useRef<HTMLDivElement>(null);

    // Using refs for dragging state to avoid re-renders and stale closures in event listeners.
    const isDraggingRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    
    useEffect(() => {
        if (!isOpen) return;

        if (initialPosition) {
            setPosition(prev => (prev.x === initialPosition.x && prev.y === initialPosition.y) ? prev : initialPosition);
        } else {
            // Center if no position is given and it's opening for the first time
            const modalWidth = 380;
            const modalHeight = window.innerHeight * 0.65;
            const centeredPosition = {
                x: (window.innerWidth - modalWidth) / 2,
                y: (window.innerHeight - modalHeight) / 2,
            };
            setPosition(prev => (prev.x === centeredPosition.x && prev.y === centeredPosition.y) ? prev : centeredPosition);
        }
    }, [initialPosition, isOpen]);

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!modalRef.current) return;

        isDraggingRef.current = true;
        document.body.style.userSelect = 'none';
        const rect = modalRef.current.getBoundingClientRect();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        dragOffsetRef.current = {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
        
        if (!('touches' in e)) {
            e.preventDefault();
        }
    };

    useEffect(() => {
        const handleDragMove = (e: MouseEvent | TouchEvent) => {
            if (!isDraggingRef.current || !modalRef.current) return;

            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            let newX = clientX - dragOffsetRef.current.x;
            let newY = clientY - dragOffsetRef.current.y;

            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = modalRef.current;
            newX = Math.max(16, Math.min(newX, innerWidth - offsetWidth - 16));
            newY = Math.max(16, Math.min(newY, innerHeight - offsetHeight - 16));

            setPosition({ x: newX, y: newY });
        };

        const handleDragEnd = () => {
            isDraggingRef.current = false;
            document.body.style.userSelect = '';
        };

        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        // Add touch event listeners for mobile devices
        window.addEventListener('touchmove', handleDragMove);
        window.addEventListener('touchend', handleDragEnd);

        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
            document.body.style.userSelect = '';
        };
    }, []); // Empty dependency array means this effect runs only once.

    if (!isOpen) return null;

    const modalContent = (
        <div
            ref={modalRef}
            className="fixed z-50 bg-slate-800/80 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/50 flex flex-col w-[380px] h-[65vh] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] overflow-hidden animate-scale-in"
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
        >
            <div
                className="flex-shrink-0 p-3 border-b border-slate-700/50 flex justify-between items-center cursor-move"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
            >
                <h2 className="font-bold text-gray-100">{title}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="flex-grow overflow-hidden relative">
                {children}
            </div>
        </div>
    );
    
    return ReactDOM.createPortal(modalContent, document.body);
};