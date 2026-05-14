'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Search, CheckCheck, Inbox, Clock, SlidersHorizontal, X, ChevronRight, User, Calendar, Flag, Hash, Tag, MessageSquare, AlertCircle } from 'lucide-react';
import { useGuestMode } from '@/contexts/GuestContext';
import { useNotifications, PCNotification } from '@/contexts/NotificationContext';

const actionConfig: Record<string, { label: string; color: string; dot: string }> = {
    created: { label: 'Created', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/60', dot: 'bg-emerald-500' },
    updated: { label: 'Updated', color: 'bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800/60', dot: 'bg-sky-500' },
    assigned: { label: 'Assigned', color: 'bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800/60', dot: 'bg-violet-500' },
};

const fieldLabels: Record<string, string> = {
    status: 'Status', assigned_to: 'Assignee', assigned_to2: 'Alt. Assignee',
    pc: 'PC', start_date: 'Start Date', end_date: 'End Date',
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
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatTaskDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const statusColors: Record<string, string> = {
    'Yet to Start': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Completed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'On Hold': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};
const priorityColors: Record<string, string> = {
    High: 'text-red-600 dark:text-red-400', Medium: 'text-amber-600 dark:text-amber-400', Low: 'text-emerald-600 dark:text-emerald-400',
};

// Task Detail Drawer
function TaskDetailDrawer({ notif, onClose }: { notif: PCNotification; onClose: () => void }) {
    const [task, setTask] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!notif.task_id) { setIsLoading(false); return; }
        setIsLoading(true);
        fetch(`/api/tasks/${notif.task_id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { setTask(data?.task || null); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    }, [notif.task_id]);

    const cfg = actionConfig[notif.action] ?? actionConfig.updated;
    const hasChanges = notif.changes && Object.keys(notif.changes).length > 0;

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300]" onClick={onClose} />
            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-[310] overflow-y-auto animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between z-10">
                    <div>
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1 ${cfg.color}`}>{cfg.label}</span>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-tight">{notif.project_name}</h2>
                        {notif.task_name && <p className="text-xs text-slate-500 dark:text-slate-400">{notif.task_name}</p>}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Notification meta */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Clock size={12} />
                        <span>{formatDate(notif.created_at)}</span>
                    </div>

                    {/* Change diff */}
                    {hasChanges && (
                        <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/50 overflow-hidden">
                            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-800/40">
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Changes Made</span>
                            </div>
                            <div className="divide-y divide-amber-100/80 dark:divide-amber-900/30">
                                {Object.entries(notif.changes!).map(([field, change]) => (
                                    <div key={field} className="px-4 py-3 flex items-center gap-3 bg-white dark:bg-slate-900">
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-24 shrink-0">{fieldLabels[field] || field}</span>
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-xs line-through text-red-500 dark:text-red-400 truncate">{String(change.old || '—')}</span>
                                            <ChevronRight size={12} className="text-slate-400 shrink-0" />
                                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate">{String(change.new || '—')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Full task details */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Task Details</h3>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                            </div>
                        ) : !task ? (
                            <div className="flex flex-col items-center py-8 gap-2 text-slate-400">
                                <AlertCircle size={28} />
                                <p className="text-xs">Task details not available</p>
                                {!notif.task_id && <p className="text-xs text-slate-400/70">No task ID linked to this notification</p>}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {[
                                        { icon: <Tag size={13} />, label: 'Project', value: task.project_name },
                                        { icon: <Hash size={13} />, label: 'Phase', value: task.sub_phase || '—' },
                                        { icon: <User size={13} />, label: 'Assignee', value: task.assigned_to || '—' },
                                        { icon: <User size={13} />, label: 'Alt. Assignee', value: task.assigned_to2 || '—' },
                                        { icon: <Flag size={13} />, label: 'Priority', value: task.priority || '—', className: priorityColors[task.priority] },
                                        { icon: <Calendar size={13} />, label: 'Start Date', value: formatTaskDate(task.start_date) },
                                        { icon: <Calendar size={13} />, label: 'End Date', value: formatTaskDate(task.end_date) },
                                    ].map(row => (
                                        <div key={row.label} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900">
                                            <span className="text-slate-400 shrink-0">{row.icon}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0">{row.label}</span>
                                            <span className={`text-xs font-semibold text-slate-800 dark:text-slate-100 truncate ${row.className || ''}`}>{row.value}</span>
                                        </div>
                                    ))}
                                    {/* Status */}
                                    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900">
                                        <span className="text-slate-400 shrink-0"><Hash size={13} /></span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0">Status</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[task.status] || statusColors['Yet to Start']}`}>{task.status || '—'}</span>
                                    </div>
                                    {task.comments && (
                                        <div className="flex items-start gap-3 px-4 py-3 bg-white dark:bg-slate-900">
                                            <span className="text-slate-400 shrink-0 pt-0.5"><MessageSquare size={13} /></span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0">Comments</span>
                                            <span className="text-xs text-slate-700 dark:text-slate-300 flex-1">{task.comments}</span>
                                        </div>
                                    )}
                                    {task.current_updates && (
                                        <div className="flex items-start gap-3 px-4 py-3 bg-white dark:bg-slate-900">
                                            <span className="text-slate-400 shrink-0 pt-0.5"><MessageSquare size={13} /></span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0">Updates</span>
                                            <span className="text-xs text-slate-700 dark:text-slate-300 flex-1">{task.current_updates}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function NotificationCard({ notif, onRead, onView }: { notif: PCNotification; onRead: (id: string) => void; onView: (n: PCNotification) => void }) {
    const cfg = actionConfig[notif.action] ?? actionConfig.updated;
    const hasChanges = notif.changes && Object.keys(notif.changes).length > 0;

    return (
        <div
            onClick={() => { onRead(notif.id); onView(notif); }}
            className={`group relative flex gap-4 px-5 py-4 cursor-pointer transition-all duration-200
                ${!notif.is_read
                    ? 'bg-gradient-to-r from-indigo-50/70 via-white to-white dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 border-l-[3px] border-indigo-500'
                    : 'bg-white dark:bg-slate-900 border-l-[3px] border-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                }
            `}
        >
            <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1 ${cfg.color}`}>{cfg.label}</span>
                        <p className={`text-sm font-bold truncate ${!notif.is_read ? 'text-slate-900 dark:text-slate-50' : 'text-slate-700 dark:text-slate-200'}`}>{notif.project_name}</p>
                        {notif.task_name && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{notif.task_name}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap"><Clock size={9} />{timeAgo(notif.created_at)}</span>
                        {!notif.is_read && <span className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900" />}
                    </div>
                </div>
                {hasChanges && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {Object.entries(notif.changes!).slice(0, 4).map(([field, change]) => (
                            <span key={field} className="inline-flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                                <span className="opacity-70">{fieldLabels[field] || field}:</span>
                                <span className="line-through opacity-50">{String(change.old || '–').substring(0, 12)}</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-emerald-700 dark:text-emerald-400">{String(change.new || '–').substring(0, 12)}</span>
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-400 dark:text-slate-600">{formatDate(notif.created_at)}</p>
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Click to view details →</span>
                </div>
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
    const [selectedNotif, setSelectedNotif] = useState<PCNotification | null>(null);
    const PAGE_SIZE = 10;

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
        } finally { setIsLoading(false); }
    }, [selectedPCName, currentPage, search, actionFilter, readFilter, fromDate, toDate]);

    useEffect(() => { fetchFiltered(); }, [fetchFiltered]);
    useEffect(() => { setCurrentPage(1); }, [search, actionFilter, readFilter, fromDate, toDate]);

    // Refetch on tab focus
    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === 'visible') fetchFiltered(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [fetchFiltered]);

    // Refetch when context updates (polling/realtime)
    useEffect(() => { fetchFiltered(); }, [unreadCount]); // eslint-disable-line

    const handleMarkRead = async (id: string) => {
        await markRead(id);
        setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };
    const handleMarkAllRead = async () => {
        await markAllRead();
        setAllNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };
    const handleView = (notif: PCNotification) => setSelectedNotif(notif);

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
        <>
            {/* Task Detail Drawer */}
            {selectedNotif && <TaskDetailDrawer notif={selectedNotif} onClose={() => setSelectedNotif(null)} />}

            <div className="w-full px-4 lg:px-8 py-8 space-y-5 animate-in fade-in duration-300">
                {/* ── Header ── */}
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
                                <p className="text-indigo-200 text-sm mt-0.5">Task activity for <span className="text-white font-bold">{selectedPCName}</span></p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {unreadCount > 0 && <span className="text-xs font-bold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">{unreadCount} unread</span>}
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 rounded-full">
                                    <CheckCheck size={13} /> Mark all read
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="relative flex gap-6 mt-5 pt-4 border-t border-white/20">
                        <div><p className="text-2xl font-black">{total}</p><p className="text-xs text-indigo-200">Total</p></div>
                        <div><p className="text-2xl font-black">{unreadCount}</p><p className="text-xs text-indigo-200">Unread</p></div>
                        <div><p className="text-2xl font-black">{total - unreadCount}</p><p className="text-xs text-indigo-200">Read</p></div>
                    </div>
                </div>

                {/* ── Filter Bar ── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <SlidersHorizontal size={15} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Filters</span>
                        {hasActiveFilters && (
                            <button onClick={() => { setSearch(''); setActionFilter('all'); setReadFilter('all'); setFromDate(''); setToDate(''); }} className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors font-medium">
                                <X size={12} /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="p-4 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input type="text" placeholder="Search project or task..." value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 border border-slate-200/80 dark:border-slate-700/50 transition-all" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                                <option value="all">All Actions</option>
                                <option value="created">Created</option>
                                <option value="updated">Updated</option>
                                <option value="assigned">Assigned</option>
                            </select>
                            <select value={readFilter} onChange={e => setReadFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                                <option value="all">All</option>
                                <option value="unread">Unread</option>
                                <option value="read">Read</option>
                            </select>
                            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                        </div>
                    </div>
                    {hasActiveFilters && (
                        <div className="px-4 pb-3">
                            <span className="inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                                {total} result{total !== 1 ? 's' : ''} matching filters
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Feed ── */}
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
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{hasActiveFilters ? 'Try adjusting your filters' : 'Notifications will appear here when tasks are created or updated'}</p>
                            </div>
                            {hasActiveFilters && <button onClick={() => { setSearch(''); setActionFilter('all'); setReadFilter('all'); setFromDate(''); setToDate(''); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2">Clear filters</button>}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{allNotifications.length} of {total} notifications</span>
                                {unreadLocal > 0 && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Click to view task details</span>}
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                {allNotifications.map(notif => (
                                    <NotificationCard key={notif.id} notif={notif} onRead={handleMarkRead} onView={handleView} />
                                ))}
                            </div>
                        </>
                    )}
                    {/* ── Pagination (always visible) ── */}
                    {total > 0 && (
                        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/40">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Showing{' '}
                                <span className="font-bold text-slate-700 dark:text-slate-200">{(currentPage - 1) * PAGE_SIZE + 1}</span>
                                {' '}–{' '}
                                <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * PAGE_SIZE, total)}</span>
                                {' '}of{' '}
                                <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span>
                                {' '}notifications
                            </span>
                            <div className="flex items-center gap-1.5">
                                {/* Prev */}
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                                >← Prev</button>

                                {/* Page Numbers */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                        if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((p, idx) =>
                                        p === '...' ? (
                                            <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p as number)}
                                                className={`w-8 h-8 text-xs font-bold rounded-lg transition-all border ${currentPage === p
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200 dark:shadow-indigo-950'
                                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 hover:border-indigo-200 dark:hover:text-indigo-400'
                                                    }`}
                                            >{p}</button>
                                        )
                                    )
                                }

                                {/* Next */}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                                >Next →</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
