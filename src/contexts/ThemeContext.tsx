'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
    isModernLook: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isModernLook, setIsModernLook] = useState(false);

    useEffect(() => {
        // Check localStorage on mount
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'modern') {
            setIsModernLook(true);
            document.documentElement.classList.add('modern-look');
        }
    }, []);

    const toggleTheme = () => {
        setIsModernLook((prev) => {
            const newState = !prev;
            if (newState) {
                document.documentElement.classList.add('modern-look');
                localStorage.setItem('theme', 'modern');
            } else {
                document.documentElement.classList.remove('modern-look');
                localStorage.setItem('theme', 'classic');
            }
            return newState;
        });
    };

    return (
        <ThemeContext.Provider value={{ isModernLook, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
