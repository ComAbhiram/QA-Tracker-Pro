'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Search, CheckCheck, Inbox, Clock, SlidersHorizontal, X, Circle } from 'lucide-react';
import { useGuestMode } from '@/contexts/GuestContext';
import { useNotifications, PCNotification } from '@/contexts/NotificationContext';

const actionConfig: Record<string, { label: string; color: string; dot: string }> = {
    created: {
        label: 'Created',
        color: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/60',
        dot: 'bg-emerald-500',
    },
    updated: {
        label: 'Updated',
        color: 'bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800/60',
        dot: 'bg-sky-500',
    },
    assigned: {
        label: 'Assigned',
        color: 'bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800/60',
        dot: 'bg-violet-500',
    },
};

const fieldLabels: Record<string, string> = {
    status: 'Status', assigned_to: 'Assignee', assigned_to2: 'Alt. Assignee',
    pc: 'PC', start_date: 'Start', end_date: 'End',
    priority: 'Priority', sub_phase: 'Phase', project_name: 'Project',
    bug_count: 'Bugs', comments: 'Comments', current_updates: 'Updates',
};

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
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

function NotificationCard({ notif, onRead }: { notif: PCNotification; onRead: (id: string) => void }) {
    const cfg = actionConfig[notif.action] ?? actionConfig.updated;
    const hasChanges = notif.changes && Object.keys(notif.changes).length > 0;

    return (
        <div
            onClick={() => onRead(notif.id)}
            className={`group relative flex gap-4 px-5 py-4 cursor-pointer transition-all duration-200
                ${!notif.is_read
                    ? 'bg-gradient-to-r from-indigo-50/70 via-white to-white dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 border-l-[3px] border-indigo-500'
                    : 'bg-white dark:bg-slate-900 border-l-[3px] border-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                }
            `}
        >
            {/* Icon */}
            <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1 ${cfg.color}`}>
                            {cfg.label}
                        </span>
                        <p className={`text-sm font-bold truncate ${!notif.is_read ? 'text-slate-900 dark:text-slate-50' : 'text-slate-700 dark:text-slate-200'}`}>
                            {notif.project_name}
                        </p>
                        {notif.task_name && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{notif.task_name}</p>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            <Clock size={9} />
                            {timeAgo(notif.created_at)}
                        </span>
                        {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900" />
                        )}
                    </div>
                </div>

                {/* Change pills */}
                {hasChanges && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {Object.entries(notif.changes!).slice(0, 5).map(([field, change]) => (
                            <span key={field} className="inline-flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                                <span className="opacity-70">{fieldLabels[field] || field}:</span>
                                <span className="line-through opacity-50">{String(change.old || '–').substring(0, 15)}</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-emerald-700 dark:text-emerald-400">{String(change.new || '–').substring(0, 15)}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* Timestamp */}
                <p className="text-[10px] text-slate-400 dark:text-slate-600">{formatDate(notif.created_at)}</p>
            </div>
        </div>
    );
}

export default function NotificationsPage() {
    const { isPCMode, selectedPCName } = useGuestMode();
    const { unreadCount, markRead, markAllRead } = useNotifications();

    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [readFilter, setReadFilter] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [allNotifications, setAllNotifications] = useState<PCNotification[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const PAGE_SIZE = 20;

    const fetchFiltered = useCallback(async () => {
        if (!selectedPCName) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ pc_name: selectedPCName, page: String(currentPage), page_size: String(PAGE_SIZE) });
            if (search) params.set('search', search);
            if (actionFilter !== 'all') params.set('action', actionFilter);
            if (readFilter === 'unread') params.set('is_read', 'false');
            if (readFilter === 'read') params.set('is_read', 'true');
            if (fromDate) params.set('from', fromDate);
            if (toDate) params.set('to', toDate);
            const res = await fetch(`/api/notifications?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setAllNotifications(data.notifications || []);
                setTotal(data.total || 0);
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedPCName, currentPage, search, actionFilter, readFilter, fromDate, toDate]);

    useEffect(() => { fetchFiltered(); }, [fetchFiltered]);
    useEffect(() => { setCurrentPage(1); }, [search, actionFilter, readFilter, fromDate, toDate]);

    const handleMarkRead = async (id: string) => {
        await markRead(id);
        setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const handleMarkAllRead = async () => {
        await markAllRead();
        setAllNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    // Refetch when page becomes visible (e.g. tab focus)
    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === 'visible') fetchFiltered(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [fetchFiltered]);

    // Also refetch when context (real-time or polling) updates the global list
    useEffect(() => {
        fetchFiltered();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unreadCount]);

    const hasActiveFilters = search || actionFilter !== 'all' || readFilter !== 'all' || fromDate || toDate;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const unreadLocal = allNotifications.filter(n => !n.is_read).length;

    if (!isPCMode) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Bell size={36} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-lg font-bold text-slate-600 dark:text-slate-400">Notifications are only available in PC Mode</p>
            </div>
        );
    }

    return (
        <div className="w-full px-4 lg:px-8 py-8 space-y-5 animate-in fade-in duration-300">

            {/* ── Page Header ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 text-white p-6 shadow-lg shadow-indigo-200 dark:shadow-indigo-950">
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-400/20 rounded-full blur-2xl pointer-events-none" />
                <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner">
                            <Bell size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
                            <p className="text-indigo-200 text-sm mt-0.5">
                                Task activity for <span className="text-white font-bold">{selectedPCName}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {unreadCount > 0 && (
                            <span className="text-xs font-bold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                {unreadCount} unread
                            </span>
                        )}
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 rounded-full"
                            >
                                <CheckCheck size={13} /> Mark all read
                            </button>
                        )}
                    </div>
                </div>
                {/* Stats row */}
                <div className="relative flex gap-6 mt-5 pt-4 border-t border-white/20">
                    <div>
                        <p className="text-2xl font-black">{total}</p>
                        <p className="text-xs text-indigo-200">Total</p>
                    </div>
                    <div>
                        <p className="text-2xl font-black">{unreadCount}</p>
                        <p className="text-xs text-indigo-200">Unread</p>
                    </div>
                    <div>
                        <p className="text-2xl font-black">{total - unreadCount}</p>
                        <p className="text-xs text-indigo-200">Read</p>
                    </div>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <SlidersHorizontal size={15} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Filters</span>
                    {hasActiveFilters && (
                        <button
                            onClick={() => { setSearch(''); setActionFilter('all'); setReadFilter('all'); setFromDate(''); setToDate(''); }}
                            className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
                        >
                            <X size={12} /> Clear all
                        </button>
                    )}
                </div>
                <div className="p-4 flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search project or task..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 border border-slate-200/80 dark:border-slate-700/50 transition-all"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* Action type */}
                        <select
                            value={actionFilter}
                            onChange={e => setActionFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            <option value="all">All Actions</option>
                            <option value="created">Created</option>
                            <option value="updated">Updated</option>
                            <option value="assigned">Assigned</option>
                        </select>
                        {/* Read state */}
                        <select
                            value={readFilter}
                            onChange={e => setReadFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            <option value="all">All</option>
                            <option value="unread">Unread</option>
                            <option value="read">Read</option>
                        </select>
                        {/* Date from */}
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    </div>
                </div>
                {/* Active filter count */}
                {hasActiveFilters && (
                    <div className="px-4 pb-3">
                        <span className="inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                            {total} result{total !== 1 ? 's' : ''} matching filters
                        </span>
                    </div>
                )}
            </div>

            {/* ── Notification Feed ── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading notifications...</p>
                    </div>
                ) : allNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <Inbox size={36} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">No notifications found</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                {hasActiveFilters ? 'Try adjusting your filters' : 'Notifications will appear here when tasks are created or updated'}
                            </p>
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={() => { setSearch(''); setActionFilter('all'); setReadFilter('all'); setFromDate(''); setToDate(''); }}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                {allNotifications.length} of {total} notifications
                            </span>
                            {unreadLocal > 0 && (
                                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                                    Click to mark as read
                                </span>
                            )}
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {allNotifications.map(notif => (
                                <NotificationCard key={notif.id} notif={notif} onRead={handleMarkRead} />
                            ))}
                        </div>
                    </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 flex items-center justify-between bg-slate-50/40 dark:bg-slate-800/40">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Page <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                ← Prev
                            </button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
