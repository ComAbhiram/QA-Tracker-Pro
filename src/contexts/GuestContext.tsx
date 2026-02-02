'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GuestSession {
    isGuest: boolean;
    selectedTeamId: string | null;
    selectedTeamName: string | null;
}

interface GuestContextType extends GuestSession {
    isReadOnly: boolean;
    setGuestSession: (teamId: string, teamName: string) => void;
    clearGuestSession: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

const GUEST_SESSION_KEY = 'qa_tracker_guest_session';

export function GuestProvider({ children }: { children: ReactNode }) {
    const [guestSession, setGuestSessionState] = useState<GuestSession>({
        isGuest: false,
        selectedTeamId: null,
        selectedTeamName: null,
    });

    // Load guest session from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(GUEST_SESSION_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setGuestSessionState(parsed);
            } catch (error) {
                console.error('Failed to parse guest session:', error);
                localStorage.removeItem(GUEST_SESSION_KEY);
            }
        }
    }, []);

    const setGuestSession = (teamId: string, teamName: string) => {
        const session: GuestSession = {
            isGuest: true,
            selectedTeamId: teamId,
            selectedTeamName: teamName,
        };
        setGuestSessionState(session);
        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    };

    const clearGuestSession = () => {
        const session: GuestSession = {
            isGuest: false,
            selectedTeamId: null,
            selectedTeamName: null,
        };
        setGuestSessionState(session);
        localStorage.removeItem(GUEST_SESSION_KEY);
    };

    const value: GuestContextType = {
        ...guestSession,
        isReadOnly: guestSession.isGuest,
        setGuestSession,
        clearGuestSession,
    };

    return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export function useGuestMode() {
    const context = useContext(GuestContext);
    if (context === undefined) {
        throw new Error('useGuestMode must be used within a GuestProvider');
    }
    return context;
}
