import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useSound } from './SoundContext';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
    duration: number;
}

interface ToastOptions {
    type?: ToastType;
    duration?: number;
}

interface ToastContextType {
    show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// --- Individual Toast Component ---

interface ToastProps extends Toast {
    onClose: () => void;
}

const ToastComponent: React.FC<ToastProps> = ({ id, message, type, duration, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onClose, 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    const typeConfig = {
        success: {
            bg: 'bg-green-600/80',
            border: 'border-green-500/50',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        },
        error: {
            bg: 'bg-red-600/80',
            border: 'border-red-500/50',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
        },
        warning: {
            bg: 'bg-yellow-600/80',
            border: 'border-yellow-500/50',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.636-1.21 2.525-1.21 3.162 0l5.517 10.518c.636 1.21-.29 2.766-1.581 2.766H4.321c-1.291 0-2.217-1.556-1.581-2.766L8.257 3.099zM10 12a1 1 0 110-2 1 1 0 010 2zm-1-3a1 1 0 011-1h.008a1 1 0 010 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
        },
        info: {
            bg: 'bg-slate-700/80',
            border: 'border-slate-600/50',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
        },
    };

    const role = (type === 'error' || type === 'warning') ? 'alert' : 'status';
    const animationClass = isExiting ? 'animate-fade-out-down' : 'animate-fade-in-up';
    const currentConfig = typeConfig[type];

    return (
        <div
            role={role}
            aria-live="polite"
            className={`pointer-events-auto w-full max-w-sm rounded-lg shadow-lg backdrop-blur-md text-white border flex items-center justify-between p-3 ${currentConfig.bg} ${currentConfig.border} ${animationClass}`}
        >
            <div className="flex items-center gap-3">
                <span className="flex-shrink-0">{currentConfig.icon}</span>
                <span className="text-sm font-medium">{message}</span>
            </div>
            <button onClick={handleClose} className="ml-4 -mr-1 p-1 text-white/70 hover:text-white flex-shrink-0 rounded-full hover:bg-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
        </div>
    );
};


// --- Toast Provider ---
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const { playSound } = useSound();

    const show = useCallback((message: string, options: ToastOptions = {}) => {
        // Use the type from options, or default to 'info'.
        const { type = 'info', duration = 3000 } = options;
        const newToast: Toast = {
            id: Date.now(),
            message,
            type,
            duration,
        };
        setToasts(prevToasts => [...prevToasts, newToast]);

        // Play sound based on type
        switch (type) {
            case 'success':
                playSound('success');
                break;
            case 'error':
                playSound('error');
                break;
            case 'warning':
            case 'info':
                playSound('notification');
                break;
            default:
                break;
        }
    }, [playSound]);

    const removeToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

    const toastContainer = (
        <div className="fixed top-4 right-4 z-[100] w-full max-w-sm space-y-2 pointer-events-none">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );

    const value = useMemo(() => ({ show }), [show]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            {ReactDOM.createPortal(toastContainer, document.body)}
        </ToastContext.Provider>
    );
};