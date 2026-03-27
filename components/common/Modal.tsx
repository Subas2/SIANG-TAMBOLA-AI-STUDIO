import React, { useEffect, useRef, useCallback, ReactNode } from 'react';
import ReactDOM from 'react-dom';

type ModalSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeMap: Record<ModalSize, string> = {
    xs: '420px',
    sm: '560px',
    md: '720px',
    lg: '920px',
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    size?: ModalSize;
    title?: string;
    hideHeader?: boolean;
    disableContentPadding?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    size = 'sm',
    title,
    hideHeader = false,
    disableContentPadding = false
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isOpen]);

    // Close on escape key
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    // Focus trapping
    useEffect(() => {
        if (!isOpen) return;

        document.addEventListener('keydown', handleKeyDown);

        const panel = modalRef.current;
        if (!panel) return;

        const focusableElements = panel.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select'
        );
        
        if ((focusableElements || []).length === 0) {
            panel.focus(); // Focus the modal panel itself if no focusable elements
            return;
        };

        const firstElement = focusableElements[0];
        const lastElement = (focusableElements || [])[(focusableElements || []).length - 1];
        
        // Try to find the first input/textarea/select to prioritize for forms.
        const firstInput = panel.querySelector<HTMLElement>(
            'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );

        // Focus the first input if available, otherwise focus the first focusable element (e.g., close button).
        const elementToFocus = firstInput || firstElement;
        elementToFocus.focus();

        const handleTabKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        
        panel.addEventListener('keydown', handleTabKeyPress);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            panel.removeEventListener('keydown', handleTabKeyPress);
        };
    }, [isOpen, handleKeyDown]);


    if (!isOpen) {
        return null;
    }

    const modalContent = (
        <div
            className="fixed inset-0 z-50 animate-scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title && !hideHeader ? "modal-title" : undefined}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Scroll container */}
            <div
                className="relative z-10 flex min-h-full items-start justify-center overflow-y-auto overscroll-contain p-4 sm:p-6"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
            >
                {/* Panel */}
                <div
                    ref={modalRef}
                    className="relative my-6 w-full max-w-[var(--modal-max)] rounded-xl bg-slate-800 shadow-2xl border border-slate-700/50 flex flex-col"
                    style={{
                        '--modal-max': sizeMap[size],
                        width: 'min(92vw, var(--modal-max))'
                    } as React.CSSProperties}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    tabIndex={-1} // Make the panel focusable
                >
                    {!hideHeader && title && (
                        <div className="flex-shrink-0 flex justify-between items-center p-[clamp(12px,2.5vw,20px)] border-b border-slate-700">
                             <h2 id="modal-title" className="text-[clamp(18px,2.5vw,22px)] font-bold text-gray-100 break-words min-w-0">{title}</h2>
                             <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors flex-shrink-0 ml-4" aria-label="Close modal">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                    <div className={`flex-grow ${disableContentPadding ? '' : 'p-[clamp(12px,2.5vw,20px)]'} text-[clamp(14px,2vw,16px)]`}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};