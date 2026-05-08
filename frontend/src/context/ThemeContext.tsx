/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

type Dimension = 'ground' | 'space';

interface ThemeContextType {
    dimension: Dimension;
    toggleDimension: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dimension, setDimension] = useState<Dimension>(() => {
        try {
            const saved = localStorage.getItem('dimension');
            if (saved === 'ground' || saved === 'space') return saved;
        } catch {
            /* Safari / gizli mod vb. */
        }
        return 'ground';
    });

    useEffect(() => {
        try {
            localStorage.setItem('dimension', dimension);
        } catch {
            /* ignore */
        }
        document.documentElement.dataset.theme = dimension;

        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        const appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        const themeColor = dimension === 'space' ? '#050510' : '#c8102e';

        themeColorMeta?.setAttribute('content', themeColor);
        appleStatusBarMeta?.setAttribute('content', dimension === 'space' ? 'black-translucent' : 'default');

        if (dimension === 'space') {
            document.documentElement.classList.add('space-dimension');
        } else {
            document.documentElement.classList.remove('space-dimension');
        }
    }, [dimension]);

    const toggleDimension = () => {
        setDimension(prev => prev === 'ground' ? 'space' : 'ground');
    };

    return (
        <ThemeContext.Provider value={{ dimension, toggleDimension }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
