import React, { createContext, useContext, useState, useEffect } from 'react';

type Dimension = 'ground' | 'space';

interface ThemeContextType {
    dimension: Dimension;
    toggleDimension: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dimension, setDimension] = useState<Dimension>(() => {
        const saved = localStorage.getItem('dimension');
        return (saved as Dimension) || 'ground';
    });

    useEffect(() => {
        localStorage.setItem('dimension', dimension);
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
