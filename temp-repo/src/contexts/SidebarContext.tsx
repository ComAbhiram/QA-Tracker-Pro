'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    // Default to collapsed on mobile (handled by media queries usually), 
    // but for desktop, let's start expanded or persisted.
    // For now, default to expanded (false).
    const [isCollapsed, setIsCollapsedState] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Optional: Load from local storage
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved !== null) {
            setIsCollapsedState(saved === 'true');
        }
        setIsInitialized(true);
    }, []);

    const setCollapsed = (collapsed: boolean) => {
        setIsCollapsedState(collapsed);
        localStorage.setItem('sidebarCollapsed', String(collapsed));
    };

    const toggleSidebar = () => {
        setCollapsed(!isCollapsed);
    };

    // Prevent hydration mismatch by rendering children only after init, 
    // OR just render them and accept a potential flash. 
    // A better way for layout carrying state is to suppress hydration warning on the html tag 
    // or just accept the default. 
    // For specific sidebar state, avoiding a flicker is nice.

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
