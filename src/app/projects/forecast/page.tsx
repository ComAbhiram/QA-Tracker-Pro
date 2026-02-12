'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { TrendingUp, User, Activity, Calendar, Edit, Grid3x3, Table2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { StandardTableStyles } from '@/components/ui/standard/TableStyles';
import TaskModal from '@/components/TaskModal';

import { useGuestMode } from '@/contexts/GuestContext';

export default function ForecastProjects() {
    const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'box' | 'table'>('table');

    useEffect(() => {
        if (!isGuestLoading) {
            fetchForecastTasks();
        }
        // Load view preference from localStorage
        const savedView = localStorage.getItem('forecastViewMode');
        if (savedView === 'table' || savedView === 'box') {
            setViewMode(savedView);
        }
    }, [isGuest, selectedTeamId, isGuestLoading]);

    const fetchForecastTasks = async () => {
        try {
            let query = supabase
                .from('tasks')
                .select('*')
                .eq('status', 'Forecast')
                .order('created_at', { ascending: false });

            // Manager/Guest Mode Filtering
            if (isGuest) {
                if (selectedTeamId) {
                    query = query.eq('team_id', selectedTeamId);
                } else {
                    // Prevent data leak if team ID is missing
                    console.warn('Manager Mode: selectedTeamId is missing, blocking data fetch.');
                    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { data, error } = await query;

            if (!error && data) {
                setTasks(data.map(mapTaskFromDB));
            }
        } catch (error) {
            console.error('Error fetching forecast tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleView = (mode: 'box' | 'table') => {
        setViewMode(mode);
        localStorage.setItem('forecastViewMode', mode);
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const handleSaveTask = async (updatedTask: Partial<Task>) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    project_name: updatedTask.projectName,
                    project_type: updatedTask.projectType,
                    sub_phase: updatedTask.subPhase,
                    priority: updatedTask.priority,
                    pc: updatedTask.pc,
                    assigned_to: updatedTask.assignedTo,
                    assigned_to2: updatedTask.assignedTo2,
                    additional_assignees: updatedTask.additionalAssignees || [],
                    status: updatedTask.status,
                    start_date: updatedTask.startDate || null,
                    end_date: updatedTask.endDate || null,
                    actual_completion_date: updatedTask.actualCompletionDate || null,
                    comments: updatedTask.comments,
                    current_updates: updatedTask.currentUpdates,
                    bug_count: updatedTask.bugCount,
                    html_bugs: updatedTask.htmlBugs,
                    functional_bugs: updatedTask.functionalBugs,
                    deviation_reason: updatedTask.deviationReason,
                    sprint_link: updatedTask.sprintLink,
                    include_saturday: updatedTask.includeSaturday || false,
                    include_sunday: updatedTask.includeSunday || false
                })
                .eq('id', selectedTask?.id);

            if (!error) {
                setIsModalOpen(false);
                fetchForecastTasks(); // Refresh the list
            }
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) {
                console.error('Error deleting task:', error);
                alert('Failed to delete task');
            } else {
                setIsModalOpen(false);
                fetchForecastTasks();
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-[1800px] mx-auto space-y-8 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl shadow-sm">
                            <TrendingUp size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Forecast Projects</h1>
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-bold rounded-full">
                                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                                </span>
                            </div>
                            <p className="text-slate-500 font-medium">Upcoming projects and future planning</p>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1">
                        <button
                            onClick={() => toggleView('table')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'table'
                                ? 'bg-yellow-50 text-yellow-700 font-semibold'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Table2 size={18} />
                            <span className="text-sm">Table View</span>
                        </button>
                        <button
                            onClick={() => toggleView('box')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'box'
                                ? 'bg-yellow-50 text-yellow-700 font-semibold'
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
                            <TrendingUp className="text-slate-300" size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">No Forecast Projects</h3>
                        <p className="text-slate-500">Projects marked as "Forecast" will appear here.</p>
                    </div>
                ) : viewMode === 'box' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                onClick={() => handleTaskClick(task)}
                                className="bg-white rounded-2xl border border-slate-400 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer"
                            >
                                {/* Header */}
                                <div className="p-6 pb-4 border-b border-yellow-50 bg-yellow-50/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="bg-yellow-100 text-yellow-700 text-[10px] uppercase font-bold px-2 py-1 rounded-full tracking-wide">
                                            Forecast
                                        </span>
                                        <button className="text-yellow-600 hover:text-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit size={16} />
                                        </button>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-yellow-700 transition-colors">
                                        {task.projectName}
                                    </h3>
                                    {task.subPhase && (
                                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                            <Activity size={14} className="text-slate-400" />
                                            {task.subPhase}
                                        </div>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-4">
                                    {task.projectType && (
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-400">
                                            <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Project Type</div>
                                            <div className="text-sm font-medium text-slate-700">{task.projectType}</div>
                                        </div>
                                    )}

                                    {task.priority && (
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-400">
                                            <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Priority</div>
                                            <div className="text-sm font-medium text-slate-700">{task.priority}</div>
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
                                        {task.startDate && (
                                            <span className="text-slate-400 text-xs flex items-center gap-1">
                                                <Calendar size={12} />
                                                {format(new Date(task.startDate), 'MMM d, yyyy')}
                                            </span>
                                        )}
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
                                    <th className={StandardTableStyles.headerCell}>Type</th>
                                    <th className={StandardTableStyles.headerCell}>Priority</th>
                                    <th className={StandardTableStyles.headerCell}>PC</th>
                                    <th className={StandardTableStyles.headerCell}>Assignee 1</th>
                                    <th className={StandardTableStyles.headerCell}>Assignee 2</th>
                                    <th className={StandardTableStyles.headerCell}>Start Date</th>
                                    <th className={StandardTableStyles.headerCell}>Comments</th>
                                    <th className={StandardTableStyles.headerCell}>Sprint Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task) => (
                                    <tr key={task.id} className={StandardTableStyles.row}>
                                        <td className={`${StandardTableStyles.cell} font-bold`}>{task.projectName}</td>
                                        <td className={StandardTableStyles.cell}>{task.subPhase || '-'}</td>
                                        <td className={StandardTableStyles.cell}>{task.projectType || '-'}</td>
                                        <td className={StandardTableStyles.cell}>
                                            {task.priority ? (
                                                <span className={`font-bold ${task.priority === 'High' ? 'text-orange-700' :
                                                        task.priority === 'Urgent' ? 'text-red-800' :
                                                            task.priority === 'Medium' ? 'text-amber-700' :
                                                                'text-green-700'
                                                    }`}>
                                                    {task.priority}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className={StandardTableStyles.cell}>{task.pc || '-'}</td>
                                        <td className={StandardTableStyles.cell}>{task.assignedTo || '-'}</td>
                                        <td className={StandardTableStyles.cell}>{task.assignedTo2 || '-'}</td>
                                        <td className={StandardTableStyles.cell}>
                                            {task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : '-'}
                                        </td>
                                        <td className={StandardTableStyles.cell} title={task.comments || ''}>
                                            <div className="truncate max-w-xs">{task.comments || '-'}</div>
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
                )
                }
            </div >

            {/* Task Edit Modal */}
            < TaskModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTask(null);
                }}
                task={selectedTask}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
            />
        </>
    );
}
