import React, { useState, useEffect, useRef } from 'react';

export const ScrollToTopButton: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const toggleVisibility = () => {
        if (window.pageYOffset > window.innerHeight * 0.2) {
            setIsVisible(true);
            
            // Clear existing timeout
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
            
            // Set new timeout to hide after 5 seconds
            hideTimeoutRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 5000);
        } else {
            setIsVisible(false);
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        setIsVisible(false);
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => {
            window.removeEventListener('scroll', toggleVisibility);
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    return (
        <button
            id="scroll-to-top-button"
            onClick={scrollToTop}
            aria-label="Go to top"
            className={`fixed bottom-5 right-5 z-50 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full shadow-lg transition-all duration-300 ease-in-out
                ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
        </button>
    );
};