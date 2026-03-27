import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { mockDB } from '../../services/mockApi';
import { Theme } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface ThemeManagementProps {
    onBack: () => void;
    themes: Theme[];
}

export const ThemeManagement: React.FC<ThemeManagementProps> = ({ onBack, themes }) => {
    const { setActiveTheme, activeTheme } = useTheme();
    const toast = useToast();
    const [hue, setHue] = useState(activeTheme.hue || 240);
    
    const readymadeThemes = [
        { name: 'Crimson', gradient: 'from-red-500 to-pink-500', hue: 0 },
        { name: 'Sunshine', gradient: 'from-yellow-400 to-orange-500', hue: 45 },
        { name: 'Lime', gradient: 'from-lime-400 to-green-500', hue: 90 },
        { name: 'Forest', gradient: 'from-green-600 to-teal-700', hue: 140 },
        { name: 'Aqua', gradient: 'from-cyan-400 to-blue-500', hue: 180 },
        { name: 'Sky', gradient: 'from-sky-400 to-indigo-500', hue: 210 },
        { name: 'Grape', gradient: 'from-purple-500 to-violet-600', hue: 270 },
        { name: 'Rose', gradient: 'from-pink-400 to-rose-500', hue: 330 },
        { name: 'Midnight', gradient: 'from-gray-800 to-slate-900', hue: 220 },
        { name: 'Indigo Dream', gradient: 'from-indigo-500 to-fuchsia-600', hue: 250 },
        { name: 'Teal Appeal', gradient: 'from-teal-400 to-cyan-600', hue: 170 },
        { name: 'Amber Glow', gradient: 'from-amber-400 to-orange-600', hue: 35 },
        { name: 'Lava Glow', gradient: 'from-orange-500 to-yellow-400', hue: 40 },
    ];

    const handleSaveTheme = () => {
        const newTheme: Theme = {
            _id: `custom_hue_${hue}`,
            name: `Custom Hue ${hue}`,
            hue: hue,
            textColor: 'text-white',
            cardTextColor: 'text-slate-900',
            gradient: ''
        };
        setActiveTheme(newTheme, true);
        toast.show(`Custom theme applied!`);
    };

    const handleSelectReadymade = (theme: {name: string, gradient: string, hue: number}) => {
        setHue(theme.hue);
        const existingTheme = (themes || []).find(t => t.name === theme.name);
        if (existingTheme) {
            setActiveTheme(existingTheme);
        }
    };

    return (
        <div className="p-4">
            <div className="bg-white/50 backdrop-blur-md p-6 rounded-xl shadow-lg max-w-lg mx-auto">
                <h2 className="text-xl font-bold mb-4 text-gray-700">Theme Customizer</h2>
                
                <div 
                    className="w-full h-20 rounded-lg mb-4 flex items-center justify-center text-white font-bold text-2xl shadow-inner"
                    style={{ background: `linear-gradient(to right, hsl(${hue}, 80%, 60%), hsl(${(hue + 40) % 360}, 80%, 60%))` }}
                >
                    Theme Preview
                </div>

                <div className="space-y-3">
                    <label htmlFor="hue-slider" className="block font-medium text-gray-700">
                        Adjust Theme Color (Hue: {hue})
                    </label>
                    <input
                        id="hue-slider"
                        type="range"
                        min="0"
                        max="360"
                        value={hue}
                        onChange={(e) => setHue(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <button 
                    onClick={handleSaveTheme}
                    className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md"
                >
                    Save & Apply Theme
                </button>

                <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Readymade Themes</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {readymadeThemes.map(theme => (
                            <button 
                                key={theme.name}
                                onClick={() => handleSelectReadymade(theme)}
                                className={`w-10 h-10 rounded-full cursor-pointer shadow-md transform hover:scale-110 transition-transform duration-200 bg-gradient-to-br ${theme.gradient}`}
                                title={theme.name}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};