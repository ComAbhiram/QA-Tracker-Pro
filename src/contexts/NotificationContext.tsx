'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { isPCMode, selectedPCName } = useGuestMode();
    const [notifications, setNotifications] = useState<PCNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!isPCMode || !selectedPCName) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/notifications?pc_name=${encodeURIComponent(selectedPCName)}&page=1&page_size=50`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
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

    // Real-time subscription
    useEffect(() => {
        if (!isPCMode || !selectedPCName) return;

        const channel = supabase
            .channel(`pc_notifications_${selectedPCName}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'pc_notifications',
                    filter: `pc_name=eq.${selectedPCName}`,
                },
                (payload) => {
                    const newNotif = payload.new as PCNotification;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

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
