
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { CheckCircle2, User, Activity, Calendar, Grid3x3, Table2, Edit2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { StandardTableStyles } from '@/components/ui/standard/TableStyles';

export default function CompletedProjects() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isQATeam, setIsQATeam] = useState(false);
    const [viewMode, setViewMode] = useState<'box' | 'table'>('table');

    useEffect(() => {
        fetchCompletedTasks();
        checkTeam();
        // Load view preference from localStorage
        const savedView = localStorage.getItem('completedViewMode');
        if (savedView === 'table' || savedView === 'box') {
            setViewMode(savedView);
        }
    }, []);

    const checkTeam = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            setIsQATeam(profile?.role === 'super_admin');
        }
    };

    const fetchCompletedTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'Completed')
                .order('end_date', { ascending: false });

            if (!error && data) {
                setTasks(data.map(mapTaskFromDB));
            }
        } catch (error) {
            console.error('Error fetching completed tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleView = (mode: 'box' | 'table') => {
        setViewMode(mode);
        localStorage.setItem('completedViewMode', mode);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-[1800px] mx-auto space-y-8 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                        <CheckCircle2 size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Completed Projects</h1>
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full">
                                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                        </div>
                        <p className="text-slate-500 font-medium">Archive of successfully delivered projects and tasks</p>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1">
                    <button
                        onClick={() => toggleView('table')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'table'
                            ? 'bg-emerald-50 text-emerald-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Table2 size={18} />
                        <span className="text-sm">Table View</span>
                    </button>
                    <button
                        onClick={() => toggleView('box')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'box'
                            ? 'bg-emerald-50 text-emerald-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Grid3x3 size={18} />
                        <span className="text-sm">Box View</span>
                    </button>
                </div>
            </div>

            {tasks.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">No Completed Projects Yet</h3>
                    <p className="text-slate-500">Keep working hard! Completed projects will appear here.</p>
                </div>
            ) : viewMode === 'box' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="bg-white rounded-2xl border border-slate-400 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
                        >
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-emerald-50 bg-emerald-50/30">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold px-2 py-1 rounded-full tracking-wide">
                                        Completed
                                    </span>
                                    <span className="text-slate-400 text-xs flex items-center gap-1">
                                        <Calendar size={12} />
                                        {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : 'No date'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">
                                    {task.projectName}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                    <Activity size={14} className="text-slate-400" />
                                    {task.subPhase}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                {isQATeam && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-400">
                                            <div className="text-xs text-slate-500 font-semibold uppercase mb-1">HTML Bugs</div>
                                            <div className="text-lg font-mono font-bold text-slate-700">{task.htmlBugs || 0}</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-400">
                                            <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Func. Bugs</div>
                                            <div className="text-lg font-mono font-bold text-slate-700">{task.functionalBugs || 0}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-400 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                            <User size={14} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-400 font-medium">Assignee</span>
                                            <span className="font-medium text-slate-700">{task.assignedTo || 'Unassigned'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={StandardTableStyles.container}>
                    <table className="w-full">
                        <thead className={StandardTableStyles.header}>
                            <tr>
                                <th className={StandardTableStyles.headerCell}>Project</th>
                                <th className={StandardTableStyles.headerCell}>Phase/Task</th>
                                <th className={StandardTableStyles.headerCell}>PC</th>
                                <th className={StandardTableStyles.headerCell}>Assignee 1</th>
                                <th className={StandardTableStyles.headerCell}>Assignee 2</th>
                                <th className={StandardTableStyles.headerCell}>End Date</th>
                                <th className={StandardTableStyles.headerCell}>Actual Completion</th>
                                {isQATeam && <th className={StandardTableStyles.headerCell}>Bugs</th>}
                                <th className={StandardTableStyles.headerCell}>Comments</th>
                                <th className={StandardTableStyles.headerCell}>Deviation Reason</th>
                                <th className={StandardTableStyles.headerCell}>Sprint Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => (
                                <tr key={task.id} className={StandardTableStyles.row}>
                                    <td className={`${StandardTableStyles.cell} font-bold`}>{task.projectName}</td>
                                    <td className={StandardTableStyles.cell}>{task.subPhase || '-'}</td>
                                    <td className={StandardTableStyles.cell}>{task.pc || '-'}</td>
                                    <td className={StandardTableStyles.cell}>{task.assignedTo || '-'}</td>
                                    <td className={StandardTableStyles.cell}>{task.assignedTo2 || '-'}</td>
                                    <td className={StandardTableStyles.cell}>
                                        {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : '-'}
                                    </td>
                                    <td className={`${StandardTableStyles.cell} text-emerald-600 font-medium`}>
                                        {task.actualCompletionDate ? format(new Date(task.actualCompletionDate), 'MMM d, yyyy') : '-'}
                                    </td>
                                    {isQATeam && (
                                        <td className={`${StandardTableStyles.cell} text-center font-mono`}>
                                            {task.bugCount || 0}
                                        </td>
                                    )}
                                    <td className={StandardTableStyles.cell} title={task.comments || ''}>
                                        <div className="truncate max-w-xs">{task.comments || '-'}</div>
                                    </td>
                                    <td className={StandardTableStyles.cell} title={task.deviationReason || ''}>
                                        <div className="truncate max-w-xs">{task.deviationReason || '-'}</div>
                                    </td>
                                    <td className={StandardTableStyles.cell}>
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
            )}
        </div>
    );
}
