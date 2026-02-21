'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, ExternalLink, Info } from 'lucide-react';
import { useNotifications, PCNotification } from '@/contexts/NotificationContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

const actionColors: Record<string, string> = {
    created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    assigned: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
};

function NotificationItem({ notif, onRead }: { notif: PCNotification; onRead: (id: string) => void }) {
    const router = useRouter();
    return (
        <div
            onClick={() => {
                onRead(notif.id);
                router.push('/notifications');
            }}
            className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${!notif.is_read ? 'border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
        >
            <div className="pt-0.5">
                <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${actionColors[notif.action] || 'bg-slate-100 text-slate-600'}`}>
                    {notif.action}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{notif.project_name}</p>
                {notif.task_name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{notif.task_name}</p>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{timeAgo(notif.created_at)}</p>
            </div>
            {!notif.is_read && (
                <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500 shrink-0" />
            )}
        </div>
    );
}

export default function NotificationBell() {
    const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const recent = notifications.slice(0, 10);

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell button */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                title="Notifications"
            >
                <Bell size={18} className={unreadCount > 0 ? 'animate-[wiggle_1s_ease-in-out]' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] text-[10px] font-bold bg-indigo-600 text-white rounded-full flex items-center justify-center px-1 leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-11 z-[200] w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <Bell size={15} className="text-indigo-500" />
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                                title="Mark all as read"
                            >
                                <CheckCheck size={14} /> All read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
                        {recent.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-slate-400 dark:text-slate-500">
                                <Info size={32} className="mb-2 opacity-40" />
                                <p className="text-sm font-medium">No notifications yet</p>
                            </div>
                        ) : (
                            recent.map(n => (
                                <NotificationItem
                                    key={n.id}
                                    notif={n}
                                    onRead={(id) => markRead(id)}
                                />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5">
                        <Link
                            href="/notifications"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                        >
                            <ExternalLink size={12} /> View all notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
