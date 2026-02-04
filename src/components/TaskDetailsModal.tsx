'use client';

import { X, Calendar, User, Briefcase, Activity, Layers, Pencil, Link as LinkIcon, AlertCircle, Clock, Bug, Zap, FileText, ExternalLink } from 'lucide-react';
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
        const s = status?.toLowerCase() || '';
        if (s === 'completed') return 'bg-emerald-600 text-white border-emerald-600';
        if (s === 'in progress' || s === 'being developed') return 'bg-blue-600 text-white border-blue-600';
        if (s === 'overdue') return 'bg-rose-600 text-white border-rose-600';
        if (s === 'on hold') return 'bg-slate-500 text-white border-slate-500';
        if (s === 'rejected') return 'bg-red-600 text-white border-red-600';
        if (s === 'yet to start' || s === 'forecast' || s === 'urgent') return 'bg-amber-500 text-white border-amber-500';
        if (s.includes('qa') || s === 'ready for qa') return 'bg-purple-600 text-white border-purple-600';
        return 'bg-sky-600 text-white border-sky-600';
    };

    // Helper for Priority Color
    const getPriorityColor = (priority: string | null) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'bg-rose-600 text-white border-rose-600';
            case 'medium': return 'bg-amber-500 text-white border-amber-500';
            case 'low': return 'bg-slate-500 text-white border-slate-500';
            default: return 'bg-slate-400 text-white border-slate-400';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="relative h-24 bg-gradient-to-r from-indigo-500 to-purple-600 p-6 flex items-start justify-between flex-shrink-0">
                    <div className="text-white/90">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Activity size={18} /> Task Details
                        </h3>
                        <p className="text-xs text-white/70">View full project information</p>
                    </div>
                    <div className="flex gap-2">
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
                <div className="px-8 pb-8 pt-6 flex-1 overflow-y-auto custom-scrollbar">

                    {/* Title Block */}
                    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-5 mb-6">
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-bold border border-indigo-600 uppercase tracking-wide">
                                {task.projectType || 'No Type'}
                            </span>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wide flex items-center gap-1.5 ${getStatusColor(task.status)}`}>
                                <Activity size={12} />
                                {task.status}
                            </span>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wide ${getPriorityColor(task.priority)}`}>
                                {task.priority || 'No Priority'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 leading-tight mb-1">{task.projectName}</h2>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <Layers size={14} />
                            {task.subPhase || 'No Sub-phase specified'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

                        {/* Assignees */}
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <User size={12} /> Assigned To
                            </label>
                            <div className="space-y-1">
                                <div className="font-semibold text-slate-700">{task.assignedTo || 'Unassigned'}</div>
                                {task.assignedTo2 && (
                                    <div className="font-semibold text-slate-600 text-sm">{task.assignedTo2}</div>
                                )}
                                {(!task.assignedTo && !task.assignedTo2) && (
                                    <div className="text-slate-400 italic text-sm">No primary assignees</div>
                                )}
                                <div className="pt-2 mt-2 border-t border-slate-200">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Additional</label>
                                    {task.additionalAssignees && task.additionalAssignees.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {task.additionalAssignees.map((assignee, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-600 font-medium">
                                                    {assignee}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-xs italic">None</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Calendar size={12} /> Timeline
                            </label>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Start Date:</span>
                                    <span className="font-medium text-slate-700">{task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : 'TBD'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">End Date:</span>
                                    <span className="font-medium text-slate-700">{task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : 'TBD'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Actual Completion:</span>
                                    <span className={`font-medium ${task.actualCompletionDate ? 'text-emerald-700' : 'text-slate-400 italic'}`}>
                                        {task.actualCompletionDate ? format(new Date(task.actualCompletionDate), 'MMM d, yyyy') : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs pt-2 mt-2 border-t border-slate-200">
                                    <span className="text-slate-400">Status:</span>
                                    {(() => {
                                        const end = task.endDate ? new Date(task.endDate) : null;
                                        const completed = task.actualCompletionDate ? new Date(task.actualCompletionDate) : null;
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);

                                        if (completed) {
                                            if (end && completed > end) {
                                                const diffTime = completed.getTime() - end.getTime();
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                return <span className="text-rose-600 font-bold">Completed (Late by {diffDays}d)</span>;
                                            }
                                            const start = task.startDate ? new Date(task.startDate) : completed;
                                            const diffTime = Math.abs(completed.getTime() - start.getTime());
                                            const tookDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                            return <span className="text-emerald-600 font-bold">Completed in {tookDays} days</span>;
                                        }

                                        if (end && today > end) {
                                            const diffTime = today.getTime() - end.getTime();
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                            return <span className="text-rose-600 font-bold">Overdue by {diffDays} days</span>;
                                        }

                                        return <span className="text-blue-600 font-bold">{task.status}</span>;
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Bugs & Quality */}
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Bug size={12} /> Quality Assurance
                            </label>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-white p-2 rounded-lg border border-slate-100">
                                    <div className="text-lg font-bold text-slate-700">{task.htmlBugs || 0}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">HTML</div>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-slate-100">
                                    <div className="text-lg font-bold text-slate-700">{task.functionalBugs || 0}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Func</div>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-slate-100">
                                    <div className={`text-lg font-bold ${task.bugCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>{task.bugCount || 0}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Total</div>
                                </div>
                            </div>
                        </div>

                        {/* Sprint & PC */}
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-sm md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Briefcase size={12} /> Project Coordinator
                                </label>
                                <div className="font-semibold text-slate-700">{task.pc || 'N/A'}</div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Zap size={12} /> Sprint / Sync Up
                                </label>
                                <div className="font-medium text-slate-700 mb-1">{task.sprint || 'No Sprint specified'}</div>
                                {task.sprintLink ? (
                                    <a href={task.sprintLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">
                                        <ExternalLink size={10} /> View Sprint Link
                                    </a>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">No link provided</span>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Updates & Comments */}
                    <div className="space-y-4">
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <FileText size={12} /> Current Updates
                            </label>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                {task.currentUpdates || <span className="text-slate-400 italic">No updates recorded.</span>}
                            </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <AlertCircle size={12} /> Deviation & Comments
                            </label>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs font-bold text-rose-600 uppercase block mb-1">Deviation Reason</span>
                                    <p className="text-sm text-slate-600">
                                        {task.deviationReason || <span className="text-slate-400 italic">None</span>}
                                    </p>
                                </div>
                                <div className="pt-2 border-t border-slate-200">
                                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">General Notes</span>
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                        {task.comments || <span className="text-slate-400 italic">No comments</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
