'use client';

import { X, Calendar, User, Briefcase, Activity, Layers, Pencil, Link as LinkIcon, AlertCircle, Clock } from 'lucide-react';
import { Task } from '@/lib/types';
import { format } from 'date-fns';

interface TaskDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    onEdit: (task: Task) => void;
}

export default function TaskDetailsModal({ isOpen, onClose, task, onEdit }: TaskDetailsModalProps) {
    if (!isOpen || !task) return null;

    // Helper for Status Color - Matching the rest of the app
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Overdue': return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'On Hold': return 'bg-amber-100 text-amber-800 border-amber-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    // Helper for Priority Color
    const getPriorityColor = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="relative h-24 bg-gradient-to-r from-indigo-500 to-purple-600 p-6 flex items-start justify-between">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button
                            onClick={() => onEdit(task)}
                            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-all shadow-sm group"
                            title="Edit Task"
                        >
                            <Pencil size={18} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 bg-black/20 hover:bg-black/30 text-white rounded-lg backdrop-blur-sm transition-all shadow-sm"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 -mt-10 relative">

                    {/* Title Block */}
                    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-5 mb-6">
                        <div className="flex flex-wrap gap-2 mb-3">
                            {task.projectType && (
                                <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 uppercase tracking-wide">
                                    {task.projectType}
                                </span>
                            )}
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wide flex items-center gap-1.5 ${getStatusColor(task.status)}`}>
                                <Activity size={12} />
                                {task.status}
                            </span>
                            {task.priority && (
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wide ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 leading-tight mb-1">{task.projectName}</h2>
                        {task.subPhase && (
                            <p className="text-slate-500 font-medium flex items-center gap-2">
                                <Layers size={14} />
                                {task.subPhase}
                            </p>
                        )}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Assignees */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                                <User size={12} /> Assigned To
                            </label>
                            <div className="space-y-1">
                                <div className="font-semibold text-slate-700">{task.assignedTo || 'Unassigned'}</div>
                                {task.assignedTo2 && (
                                    <div className="font-semibold text-slate-600 text-sm">{task.assignedTo2}</div>
                                )}
                                {task.additionalAssignees?.map((assignee, i) => (
                                    <div key={i} className="font-semibold text-slate-500 text-xs">{assignee}</div>
                                ))}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                                <Calendar size={12} /> Timeline
                            </label>
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Start:</span>
                                    <span className="font-medium text-slate-700">{task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : 'TBD'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">End:</span>
                                    <span className="font-medium text-slate-700">{task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : 'TBD'}</span>
                                </div>
                                {task.actualCompletionDate && (
                                    <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-200">
                                        <span className="text-emerald-600 font-medium">Completed:</span>
                                        <span className="font-bold text-emerald-700">{format(new Date(task.actualCompletionDate), 'MMM d')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PC & Misc */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-100 shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                <Briefcase size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase">Project Coordinator</p>
                                <p className="text-sm font-semibold text-slate-700">{task.pc || 'N/A'}</p>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}
