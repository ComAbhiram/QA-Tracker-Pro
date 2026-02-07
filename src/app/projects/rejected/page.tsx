
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { AlertCircle, User, Calendar, Activity, Grid3x3, Table2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function RejectedProjects() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'box' | 'table'>('box');

    useEffect(() => {
        fetchRejectedTasks();
        // Load view preference from localStorage
        const savedView = localStorage.getItem('rejectedViewMode');
        if (savedView === 'table' || savedView === 'box') {
            setViewMode(savedView);
        }
    }, []);

    const fetchRejectedTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'Rejected')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setTasks(data.map(mapTaskFromDB));
            }
        } catch (error) {
            console.error('Error fetching rejected tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleView = (mode: 'box' | 'table') => {
        setViewMode(mode);
        localStorage.setItem('rejectedViewMode', mode);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl shadow-sm">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Rejected Projects</h1>
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-bold rounded-full">
                                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                        </div>
                        <p className="text-slate-500 font-medium">History of cancelled or rejected tasks with reasons</p>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1">
                    <button
                        onClick={() => toggleView('box')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'box'
                            ? 'bg-red-50 text-red-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Grid3x3 size={18} />
                        <span className="text-sm">Box View</span>
                    </button>
                    <button
                        onClick={() => toggleView('table')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'table'
                            ? 'bg-red-50 text-red-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Table2 size={18} />
                        <span className="text-sm">Table View</span>
                    </button>
                </div>
            </div>

            {tasks.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">No Rejected Projects</h3>
                    <p className="text-slate-500">All projects are moving forward smoothly!</p>
                </div>
            ) : viewMode === 'box' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="bg-white rounded-2xl border border-slate-400 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
                        >
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-red-50 bg-red-50/30">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-2 py-1 rounded-full tracking-wide">
                                        Rejected
                                    </span>
                                    <span className="text-slate-400 text-xs flex items-center gap-1">
                                        {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : 'No date'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-red-700 transition-colors">
                                    {task.projectName}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                    <Activity size={14} className="text-slate-400" />
                                    {task.subPhase}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <AlertCircle size={12} />
                                        Reason for Rejection
                                    </label>
                                    <div className="bg-red-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed border border-slate-400/50">
                                        {task.deviationReason || (
                                            <span className="italic text-slate-400">No reason provided</span>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-400 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                            <User size={14} />
                                        </div>
                                        <span className="font-medium">{task.assignedTo || 'Unassigned'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-slate-600">
                            <thead className="bg-red-50 border-b-2 border-slate-400">
                                <tr>
                                    <th className="px-5 py-4 font-semibold text-slate-700 text-left border-r border-slate-400">Project</th>
                                    <th className="px-4 py-4 font-semibold text-slate-700 text-left border-r border-slate-400">Phase/Task</th>
                                    <th className="px-4 py-4 font-semibold text-slate-700 text-left border-r border-slate-400">PC</th>
                                    <th className="px-4 py-4 font-semibold text-slate-700 text-left border-r border-slate-400">Assignee 1</th>
                                    <th className="px-4 py-4 font-semibold text-slate-700 text-left border-r border-slate-400">Assignee 2</th>
                                    <th className="px-4 py-4 font-semibold text-slate-700 text-left border-r border-slate-400">Date</th>
                                    <th className="px-4 py-4 font-semibold text-slate-700 text-left border-r border-slate-400">Rejection Reason</th>
                                    <th className="px-4 py-4 font-semibold text-slate-700 text-left">Sprint Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task) => (
                                    <tr key={task.id} className="border-b border-slate-400 hover:bg-red-50/20 transition-all">
                                        <td className="px-5 py-4 font-semibold text-slate-800 border-r border-slate-400">{task.projectName}</td>
                                        <td className="px-4 py-4 font-medium text-slate-600 border-r border-slate-400">{task.subPhase || '-'}</td>
                                        <td className="px-4 py-4 text-slate-600 border-r border-slate-400">{task.pc || '-'}</td>
                                        <td className="px-4 py-4 text-slate-600 border-r border-slate-400">{task.assignedTo || '-'}</td>
                                        <td className="px-4 py-4 text-slate-600 border-r border-slate-400">{task.assignedTo2 || '-'}</td>
                                        <td className="px-4 py-4 text-slate-500 font-medium border-r border-slate-400">
                                            {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 max-w-md border-r border-slate-400" title={task.deviationReason || ''}>
                                            {task.deviationReason || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-500">
                                            {task.sprintLink ? (
                                                <a href={task.sprintLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                                                    <ExternalLink size={14} />
                                                    Link
                                                </a>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
