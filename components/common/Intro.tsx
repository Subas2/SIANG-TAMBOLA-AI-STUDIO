import React from 'react';

export const Intro: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center animated-colorful-bg">
            <div className="text-center animate-fade-in">
                <div className="relative w-48 h-48 mx-auto mb-4 animate-icon-intro">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-full h-full">
                      <defs>
                        <linearGradient id="intro-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{stopColor: '#a855f7', stopOpacity: 1}} />
                          <stop offset="100%" style={{stopColor: '#ec4899', stopOpacity: 1}} />
                        </linearGradient>
                      </defs>
                      <rect width="32" height="32" rx="6" fill="url(#intro-grad)"/>
                      <rect x="4" y="8" width="24" height="16" rx="3" fill="rgba(255,255,255,0.2)"/>
                      <circle cx="10" cy="12" r="2" fill="white"/>
                      <circle cx="22" cy="12" r="2" fill="white"/>
                      <circle cx="16" cy="20" r="2" fill="white"/>
                    </svg>
                </div>
                <h1 className="text-4xl font-bold text-white animate-smoke-in" style={{ fontFamily: "'Lobster', cursive" }}>
                    Siang Tambola
                </h1>
            </div>
        </div>
    );
};
