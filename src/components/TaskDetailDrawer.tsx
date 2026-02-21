'use client';

import { useState, useEffect } from 'react';
import { X, Clock, ChevronRight, User, Calendar, Flag, Hash, Tag, MessageSquare, AlertCircle } from 'lucide-react';
import { PCNotification } from '@/contexts/NotificationContext';

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
    High: 'text-red-600 dark:text-red-400',
    Medium: 'text-amber-600 dark:text-amber-400',
    Low: 'text-emerald-600 dark:text-emerald-400',
};

export default function TaskDetailDrawer({ notif, onClose }: { notif: PCNotification; onClose: () => void }) {
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
                                        { icon: <Flag size={13} />, label: 'Priority', value: task.priority || '—', className: (priorityColors as any)[task.priority] },
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
