'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GuestSession {
    isGuest: boolean;
    selectedTeamId: string | null;
    selectedTeamName: string | null;
}

interface GuestContextType extends GuestSession {
    isLoading: boolean;
    isReadOnly: boolean;
    setGuestSession: (teamId: string, teamName: string) => void;
    clearGuestSession: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

const GUEST_SESSION_KEY = 'qa_tracker_guest_session';
const GUEST_COOKIE_NAME = 'guest_mode';

// Helper function to set cookie
function setCookie(name: string, value: string, days: number = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

// Helper function to delete cookie
function deleteCookie(name: string) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

export function GuestProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
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
                // Ensure cookie is set
                if (parsed.isGuest) {
                    setCookie(GUEST_COOKIE_NAME, 'true');
                }
            } catch (error) {
                console.error('Failed to parse guest session:', error);
                localStorage.removeItem(GUEST_SESSION_KEY);
                deleteCookie(GUEST_COOKIE_NAME);
            }
        }
        setIsLoading(false);
    }, []);

    const setGuestSession = (teamId: string, teamName: string) => {
        const session: GuestSession = {
            isGuest: true,
            selectedTeamId: teamId,
            selectedTeamName: teamName,
        };
        setGuestSessionState(session);
        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
        // Set cookie for server-side detection
        setCookie(GUEST_COOKIE_NAME, 'true');
        // Set a special guest token for API authentication
        setCookie('guest_token', 'manager_access_token_2026', 30); // 30 days
    };

    const clearGuestSession = () => {
        const session: GuestSession = {
            isGuest: false,
            selectedTeamId: null,
            selectedTeamName: null,
        };
        setGuestSessionState(session);
        localStorage.removeItem(GUEST_SESSION_KEY);
        // Remove cookie
        deleteCookie(GUEST_COOKIE_NAME);
    };

    const value: GuestContextType = {
        ...guestSession,
        isLoading,
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
