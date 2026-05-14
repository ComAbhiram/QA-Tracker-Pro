'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useGuestMode } from '@/contexts/GuestContext';
import { supabase } from '@/lib/supabase';

export interface PCNotification {
    id: string;
    pc_name: string;
    task_id: number | null;
    project_name: string;
    task_name: string | null;
    action: 'created' | 'updated' | 'assigned';
    changes: Record<string, { old: any; new: any }> | null;
    is_read: boolean;
    created_at: string;
}

interface NotificationContextType {
    notifications: PCNotification[];
    unreadCount: number;
    isLoading: boolean;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    refetch: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 15000; // Poll every 15 seconds as fallback

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { isPCMode, selectedPCName } = useGuestMode();
    const [notifications, setNotifications] = useState<PCNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const latestCreatedAt = useRef<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!isPCMode || !selectedPCName) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/notifications?pc_name=${encodeURIComponent(selectedPCName)}&page=1&page_size=50`);
            if (res.ok) {
                const data = await res.json();
                const notifs: PCNotification[] = data.notifications || [];
                setNotifications(notifs);
                setUnreadCount(data.unreadCount || 0);
                if (notifs.length > 0) {
                    latestCreatedAt.current = notifs[0].created_at;
                }
            }
        } catch (err) {
            console.error('[NotificationContext] fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isPCMode, selectedPCName]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Polling fallback (runs every 15s) — ensures new notifications appear even if Realtime isn't enabled
    useEffect(() => {
        if (!isPCMode || !selectedPCName) return;
        const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [isPCMode, selectedPCName, fetchNotifications]);

    // Supabase Real-time subscription (supplementary — instant updates when Realtime is enabled)
    useEffect(() => {
        if (!isPCMode || !selectedPCName) return;

        const channel = supabase
            .channel(`pc_notifications_${selectedPCName}_${Date.now()}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'pc_notifications',
                    filter: `pc_name=eq.${selectedPCName}`,
                },
                (payload) => {
                    console.log('[NotificationContext] Real-time notification received:', payload.new);
                    const newNotif = payload.new as PCNotification;
                    setNotifications(prev => {
                        // Avoid duplicates
                        if (prev.some(n => n.id === newNotif.id)) return prev;
                        return [newNotif, ...prev];
                    });
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe((status) => {
                console.log('[NotificationContext] Realtime subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isPCMode, selectedPCName]);

    const markRead = useCallback(async (id: string) => {
        if (!selectedPCName) return;
        await fetch('/api/notifications/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pc_name: selectedPCName, id }),
        });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, [selectedPCName]);

    const markAllRead = useCallback(async () => {
        if (!selectedPCName) return;
        await fetch('/api/notifications/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pc_name: selectedPCName }),
        });
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    }, [selectedPCName]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, isLoading, markRead, markAllRead, refetch: fetchNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
}
