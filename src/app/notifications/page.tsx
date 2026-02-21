'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Search, CheckCheck, Filter, ChevronDown, Info, Clock, Inbox } from 'lucide-react';
import { useGuestMode } from '@/contexts/GuestContext';
import { useNotifications, PCNotification } from '@/contexts/NotificationContext';
import { useRouter } from 'next/navigation';

const actionColors: Record<string, string> = {
    created: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    updated: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    assigned: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
};

const fieldLabels: Record<string, string> = {
    status: 'Status', assigned_to: 'Assignee', assigned_to2: 'Secondary Assignee',
    pc: 'PC', start_date: 'Start Date', end_date: 'End Date',
    priority: 'Priority', sub_phase: 'Task/Phase', project_name: 'Project Name',
    bug_count: 'Bug Count', comments: 'Comments', current_updates: 'Updates',
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

export default function NotificationsPage() {
    const { isPCMode, selectedPCName } = useGuestMode();
    const { notifications: contextNotifs, unreadCount, markRead, markAllRead, refetch } = useNotifications();
    const router = useRouter();

    // Filters
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [readFilter, setReadFilter] = useState('all'); // 'all' | 'unread' | 'read'
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
            const params = new URLSearchParams({
                pc_name: selectedPCName,
                page: String(currentPage),
                page_size: String(PAGE_SIZE),
            });
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

    useEffect(() => {
        fetchFiltered();
    }, [fetchFiltered]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, actionFilter, readFilter, fromDate, toDate]);

    const handleMarkRead = async (id: string) => {
        await markRead(id);
        setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const handleMarkAllRead = async () => {
        await markAllRead();
        setAllNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    if (!isPCMode) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-slate-400">
                <Bell size={48} className="opacity-20" />
                <p className="text-lg font-semibold">Notifications are only available in PC Mode</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
                            <Bell className="text-indigo-600 dark:text-indigo-400" size={22} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Notifications</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Task updates for <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedPCName}</span>
                            </p>
                        </div>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors border border-indigo-200 dark:border-indigo-800"
                    >
                        <CheckCheck size={16} /> Mark all as read
                        <span className="ml-1 bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>
                    </button>
                )}
            </div>

            {/* Filters Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by project or task name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200 placeholder:text-slate-400"
                    />
                </div>

                {/* Filter row */}
                <div className="flex flex-wrap gap-2">
                    {/* Action type */}
                    <select
                        value={actionFilter}
                        onChange={e => setActionFilter(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20"
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
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="all">All</option>
                        <option value="unread">Unread</option>
                        <option value="read">Read</option>
                    </select>

                    {/* Date from */}
                    <input
                        type="date"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="From date"
                    />
                    {/* Date to */}
                    <input
                        type="date"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="To date"
                    />

                    {/* Clear filters */}
                    {(search || actionFilter !== 'all' || readFilter !== 'all' || fromDate || toDate) && (
                        <button
                            onClick={() => { setSearch(''); setActionFilter('all'); setReadFilter('all'); setFromDate(''); setToDate(''); }}
                            className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                    {total} notification{total !== 1 ? 's' : ''} found
                </div>
            </div>

            {/* Notification List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent" />
                    </div>
                ) : allNotifications.length === 0 ? (
                    <div className="flex flex-col items-center py-16 gap-3 text-slate-400 dark:text-slate-500">
                        <Inbox size={40} className="opacity-30" />
                        <p className="font-semibold text-sm">No notifications found</p>
                        <p className="text-xs">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {allNotifications.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => handleMarkRead(notif.id)}
                                className={`flex gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${!notif.is_read ? 'border-l-4 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10' : 'border-l-4 border-transparent'}`}
                            >
                                {/* Action badge */}
                                <div className="pt-0.5 shrink-0">
                                    <span className={`inline-block text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${actionColors[notif.action] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                        {notif.action}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{notif.project_name}</p>
                                            {notif.task_name && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{notif.task_name}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                <Clock size={10} /> {timeAgo(notif.created_at)}
                                            </span>
                                            {!notif.is_read && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                        </div>
                                    </div>

                                    {/* Changes summary */}
                                    {notif.changes && Object.keys(notif.changes).length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {Object.entries(notif.changes).slice(0, 4).map(([field, change]) => (
                                                <span key={field} className="inline-flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                                    <span className="font-semibold">{fieldLabels[field] || field}:</span>
                                                    <span className="line-through opacity-60">{change.old || '–'}</span>
                                                    <span>→</span>
                                                    <span className="font-medium">{change.new || '–'}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
