import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { Theme } from '../types';
import { api, mockDB, subscribeToDbChanges } from '../services/mockApi';

interface ThemeContextType {
  activeTheme: Theme;
  setActiveTheme: (theme: Theme, isCustom?: boolean) => void;
  getThemeStyle: (theme: Theme) => React.CSSProperties;
  getThemeClasses: (theme: Theme) => string;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const unsubscribe = subscribeToDbChanges(() => {
            forceUpdate(c => c + 1);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const defaultTheme = mockDB.themes?.[4] ?? { _id: 'theme5', name: 'Grape', gradient: 'from-purple-500 to-violet-600', textColor: 'text-white', cardTextColor: 'text-gray-800' };
    const themeId = mockDB.settings.activeThemeId;
    const customHue = mockDB.settings.customThemeHue;
    let activeTheme = defaultTheme;

    if (typeof customHue === 'number') {
        activeTheme = {
            _id: 'custom',
            name: `Custom Hue ${customHue}`,
            hue: customHue,
            textColor: 'text-white',
            cardTextColor: 'text-gray-800',
            gradient: '' // This will be handled by getThemeStyle
        };
    } else if (themeId) {
        activeTheme = mockDB.themes.find(t => t._id === themeId) || defaultTheme;
    }

    const setActiveTheme = useCallback((theme: Theme, isCustom: boolean = false) => {
        if (isCustom && typeof theme.hue === 'number') {
            api.admin.updateSettings({ activeThemeId: null, customThemeHue: theme.hue });
        } else {
            if (mockDB.settings.activeThemeId !== theme._id || mockDB.settings.customThemeHue !== null) {
                api.admin.updateSettings({ activeThemeId: theme._id, customThemeHue: null });
            }
        }
    }, []);

    const getThemeStyle = useCallback((theme: Theme): React.CSSProperties => {
        if (!theme) return {};
        if (theme.hue !== undefined && theme.hue !== null) {
        return { background: `linear-gradient(to right, hsl(${theme.hue}, 80%, 60%), hsl(${(parseInt(String(theme.hue)) + 40) % 360}, 80%, 60%))` };
        }
        return {};
    }, []);
  
    const getThemeClasses = useCallback((theme: Theme): string => {
        if (!theme) return 'bg-slate-900';
        if (theme.gradient) {
            return `bg-gradient-to-br ${theme.gradient}`;
        }
        // If a hue is present, an inline style will be used. Don't return a conflicting class.
        if (theme.hue !== undefined && theme.hue !== null) {
            return '';
        }
        return 'bg-slate-900';
    }, []);

    const value = useMemo(() => ({ activeTheme, setActiveTheme, getThemeStyle, getThemeClasses }), [activeTheme, setActiveTheme, getThemeStyle, getThemeClasses]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};