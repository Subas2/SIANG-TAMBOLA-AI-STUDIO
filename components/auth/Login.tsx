import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockDB } from '../../services/mockApi';

interface LoginProps {
    role?: 'admin' | 'agent';
}

const AtmosphericBackground = React.memo(({ role }: { role?: 'admin' | 'agent' }) => {
    const raindrops = useMemo(() => Array.from({ length: 150 }).map((_, i) => {
        const style = {
            left: `${Math.random() * 100}%`,
            animationName: 'rain-fall',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDuration: `${0.4 + Math.random() * 0.4}s`,
            animationDelay: `${Math.random() * 5}s`,
        };
        return <div key={i} className="absolute top-[-100px] w-px h-20 bg-gradient-to-b from-transparent to-white/30" style={style}></div>;
    }), []);

    const birds = useMemo(() => {
        return Array.from({ length: 5 }).map((_, i) => {
            const style = {
                top: `${10 + Math.random() * 20}%`,
                '--scale': `${0.6 + Math.random() * 0.5}`,
                animationName: 'fly-across',
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationDuration: `${15 + Math.random() * 10}s`,
                animationDelay: `${Math.random() * 20}s`,
            };
            // A simple bird shape made with borders to avoid complex SVGs or images.
            return (
                <div key={i} className="absolute w-8 h-8" style={style as React.CSSProperties}>
                    <div className="w-full h-full bg-black opacity-60" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>
                </div>
            );
        });
    }, []);
    

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
            {/* Background Image with Ken Burns Effect */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                    backgroundImage: `url(${role === 'admin' 
                        ? 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' 
                        : 'https://images.pexels.com/photos/1118873/pexels-photo-1118873.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'})`, 
                    animation: 'kenburns-effect 40s infinite ease-in-out' 
                }}
            />
            {/* Dark Overlay */}
            <div className={`absolute inset-0 ${role === 'admin' ? 'bg-slate-900/70' : 'bg-black/60'}`} />

            {/* Rain Effect */}
            <div className="absolute inset-0 pointer-events-none">
                {raindrops}
            </div>

            {/* Flying Birds */}
            <div className="absolute inset-0 pointer-events-none">
                {birds}
            </div>
        </div>
    );
});

export const Login: React.FC<LoginProps> = ({ role }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, loginWithGoogle, isAuthReady } = useAuth();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const buttonContainerRef = useRef<HTMLDivElement>(null);
    const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const loginBgImage = mockDB.settings.loginBackgroundImage;

    const isRunawayConditionMet = !username.trim() || !password.trim();

    const title = role === 'admin' ? "Admin Portal" : role === 'agent' ? "Agent Hub" : "Siang Tambola";
    const subtitle = role === 'admin' ? "Management & Control Center" : role === 'agent' ? "Agent Booking & Management" : "The Ultimate Online Housie Experience";


    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!buttonRef.current || !buttonContainerRef.current || !isRunawayConditionMet) {
                setButtonPosition({ x: 0, y: 0 });
                return;
            }

            const containerRect = buttonContainerRef.current.getBoundingClientRect();
            const buttonCenterX = containerRect.left + containerRect.width / 2;
            const buttonCenterY = containerRect.top + containerRect.height / 2;
            
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            const dx = buttonCenterX - mouseX;
            const dy = buttonCenterY - mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const escapeRadius = 180;
            const escapeDistance = 150;

            if (distance < escapeRadius) {
                const angle = Math.atan2(dy, dx);
                const newX = escapeDistance * Math.cos(angle);
                const newY = escapeDistance * Math.sin(angle);
                setButtonPosition({ x: newX, y: newY });
            } else {
                setButtonPosition({ x: 0, y: 0 });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isRunawayConditionMet]);

    useEffect(() => {
        if (!username.trim()) {
            setProfilePhoto(null);
            return;
        }

        const findAndSetPhoto = () => {
            const foundUser = mockDB.users.find(
                u => u.username.toLowerCase() === username.toLowerCase()
            );
            const newPhoto = (foundUser && foundUser.role !== 'player') ? foundUser.photo : null;
            
            setProfilePhoto(currentPhoto => {
                if (currentPhoto !== newPhoto) {
                    return newPhoto;
                }
                return currentPhoto;
            });
        };

        findAndSetPhoto();

        const intervalId = setInterval(findAndSetPhoto, 1500);

        return () => clearInterval(intervalId);
    }, [username]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRunawayConditionMet) {
             setError('Please fill in both fields correctly.');
             return;
        }
        setError('');
        setIsLoading(true);

        setTimeout(async () => {
            const result = await login(username, password);
            if (!result.success) {
                setError(result.message || 'An unknown login error occurred.');
            }
            setIsLoading(false);
        }, 500);
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newUsername = e.target.value;
        setUsername(newUsername);
        setError('');
    };

    const accentColor = role === 'admin' ? 'from-indigo-500 to-blue-600' : role === 'agent' ? 'from-teal-500 to-emerald-600' : 'from-purple-500 to-pink-500';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {loginBgImage ? (
                <div className="fixed inset-0 -z-10 bg-black">
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ 
                            backgroundImage: `url(${loginBgImage})`,
                            animation: 'kenburns-effect 40s infinite ease-in-out'
                        }}
                    />
                    <div className="absolute inset-0 bg-black/60" />
                </div>
            ) : (
                <AtmosphericBackground role={role} />
            )}
            <div className="w-full max-w-sm relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white" style={{ fontFamily: "'Lobster', cursive" }}>
                        <span className={`bg-clip-text text-transparent bg-gradient-to-r ${accentColor}`}>
                          {title}
                        </span>
                    </h1>
                    <p className="text-slate-400 mt-2">{subtitle}</p>
                </div>
                
                <div className="relative">
                     <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-slate-800/80 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-slate-700/80 shadow-lg z-10 overflow-hidden transition-opacity duration-300 opacity-100`}>
                        {profilePhoto ? (
                            <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover animate-scale-in" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${role === 'admin' ? 'text-blue-400' : role === 'agent' ? 'text-teal-400' : 'text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        )}
                    </div>

                    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-8 pt-14 rounded-2xl shadow-lg">
                                <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={handleUsernameChange}
                                            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            required
                                        />
                                    </div>
                                    
                                    {error && (
                                        <p className="text-sm text-red-400 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>
                                    )}

                                    <div ref={buttonContainerRef} className="relative h-12">
                                        <button
                                            ref={buttonRef}
                                            type="submit"
                                            disabled={isLoading}
                                            style={{
                                                transform: `translate(${buttonPosition.x}px, ${buttonPosition.y}px)`,
                                            }}
                                            className={`w-2/5 mx-auto bg-gradient-to-r ${accentColor} text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center absolute left-1/2 -translate-x-1/2`}
                                        >
                                            {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                            {isLoading ? 'Signing In...' : 'Sign In'}
                                        </button>
                                    </div>
                                </form>
                    </div>
                </div>
            </div>
        </div>
    );
};