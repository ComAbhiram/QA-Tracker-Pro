'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { TrendingUp, User, Activity, Calendar, Edit, Grid3x3, Table2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { StandardTableStyles } from '@/components/ui/standard/TableStyles';
import TaskModal from '@/components/TaskModal';
import ResizableHeader from '@/components/ui/ResizableHeader';
import useColumnResizing from '@/hooks/useColumnResizing';
import { PriorityBadge } from '@/components/ui/standard/PriorityBadge';

import { useGuestMode } from '@/contexts/GuestContext';

export default function ForecastProjects() {
    const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'box' | 'table'>('table');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const { columnWidths, startResizing } = useColumnResizing({
        projectName: 300,
        subPhase: 150,
        projectType: 120,
        priority: 100,
        pc: 100,
        assignedTo: 120,
        assignedTo2: 120,
        startDate: 100,
        comments: 200,
        sprintLink: 80
    });

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

            if (error) throw error;

            setTasks(tasks.map(t => t.id === selectedTask?.id ? { ...t, ...updatedTask } : t));
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Failed to update task');
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;

            setTasks(tasks.filter(t => t.id !== taskId));
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        }
    };

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTasks = useMemo(() => {
        let sortableTasks = [...tasks];
        if (sortConfig !== null) {
            sortableTasks.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Task];
                let bValue: any = b[sortConfig.key as keyof Task];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableTasks;
    }, [tasks, sortConfig]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-[1800px] mx-auto space-y-8 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-sm">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Forecast Projects</h1>
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded-full">
                                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                        </div>
                        <p className="text-slate-500 font-medium">Upcoming projects and planned work</p>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1">
                    <button
                        onClick={() => toggleView('table')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'table'
                            ? 'bg-purple-50 text-purple-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Table2 size={18} />
                        <span className="text-sm">Table View</span>
                    </button>
                    <button
                        onClick={() => toggleView('box')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'box'
                            ? 'bg-purple-50 text-purple-700 font-semibold'
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
                        <Calendar className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Forecast Projects</h3>
                    <p className="text-slate-500">There are no projects currently in forecast status.</p>
                </div>
            ) : viewMode === 'box' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedTasks.map((task) => (
                        <div key={task.id} onClick={() => handleTaskClick(task)} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                        task.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                                            task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                'bg-green-100 text-green-700'
                                    }`}>
                                    {task.priority || 'Normal'}
                                </span>
                                {task.startDate && (
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium bg-slate-50 px-2 py-1 rounded-lg">
                                        <Calendar size={12} />
                                        {format(new Date(task.startDate), 'MMM d')}
                                    </div>
                                )}
                            </div>

                            <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-1 group-hover:text-purple-600 transition-colors">{task.projectName}</h3>
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                                <Activity size={14} />
                                <span>{task.subPhase || 'No phase'}</span>
                                <span className="text-slate-300">•</span>
                                <span>{task.projectType || 'General'}</span>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="flex -space-x-2">
                                    {task.assignedTo && (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-700 font-bold text-xs" title={`Assigned: ${task.assignedTo}`}>
                                            {task.assignedTo.charAt(0)}
                                        </div>
                                    )}
                                    {task.assignedTo2 && (
                                        <div className="w-8 h-8 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center text-pink-700 font-bold text-xs" title={`Assigned: ${task.assignedTo2}`}>
                                            {task.assignedTo2.charAt(0)}
                                        </div>
                                    )}
                                    {(!task.assignedTo && !task.assignedTo2) && (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400">
                                            <User size={14} />
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">PC</p>
                                    <p className="text-sm font-semibold text-slate-700">{task.pc || '-'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-xs text-slate-800 border-collapse table-fixed border border-slate-900">
                            <thead>
                                <tr className="border-b border-black bg-slate-50">
                                    <ResizableHeader
                                        label="Project"
                                        sortKey="projectName"
                                        widthKey="projectName"
                                        width={columnWidths.projectName}
                                        currentSortKey={sortConfig?.key}
                                        sortDirection={sortConfig?.direction}
                                        onSort={requestSort}
                                        onResizeStart={startResizing}
                                    />
                                    <ResizableHeader
                                        label="Phase/Task"
                                        sortKey="subPhase"
                                        widthKey="subPhase"
                                        width={columnWidths.subPhase}
                                        currentSortKey={sortConfig?.key}
                                        sortDirection={sortConfig?.direction}
                                        onSort={requestSort}
                                        onResizeStart={startResizing}
                                    />
                                    <ResizableHeader
                                        label="Type"
                                        sortKey="projectType"
                                        widthKey="projectType"
                                        width={columnWidths.projectType}
                                        currentSortKey={sortConfig?.key}
                                        sortDirection={sortConfig?.direction}
                                        onSort={requestSort}
                                        onResizeStart={startResizing}
                                    />
                                    <ResizableHeader
                                        label="Priority"
                                        sortKey="priority"
                                        widthKey="priority"
                                        width={columnWidths.priority}
                                        currentSortKey={sortConfig?.key}
                                        sortDirection={sortConfig?.direction}
                                        onSort={requestSort}
                                        onResizeStart={startResizing}
                                    />
                                    <ResizableHeader
                                        label="PC"
                                        sortKey="pc"
                                        widthKey="pc"
                                        width={columnWidths.pc}
                                        currentSortKey={sortConfig?.key}
                                        sortDirection={sortConfig?.direction}
                                        onSort={requestSort}
                                        onResizeStart={startResizing}
                                    />
                                    <ResizableHeader
                                        label="Assignee 1"
                                        sortKey="assignedTo"
                                        widthKey="assignedTo"
                                        width={columnWidths.assignedTo}
                                        currentSortKey={sortConfig?.key}
                                        sortDirection={sortConfig?.direction}
                                        onSort={requestSort}
                                        onResizeStart={startResizing}
                                    />
                                    <ResizableHeader
                                        label="Assignee 2"
                                        sortKey="assignedTo2"
                                        widthKey="assignedTo2"
                                        width={columnWidths.assignedTo2}
                                        currentSortKey={sortConfig?.key}
                                        sortDirection={sortConfig?.direction}
                                        onSort={requestSort}
                                        onResizeStart={startResizing}
                                    />
                                    <ResizableHeader
                                        label="Start Date"
                                        sortKey="startDate"
                                        widthKey="startDate"
                                        width={columnWidths.startDate}
                                        currentSortKey={sortConfig?.key}
                                        sortDirection={sortConfig?.direction}
                                        onSort={requestSort}
                                        onResizeStart={startResizing}
                                    />
                                    <ResizableHeader
                                        label="Comments"
                                        widthKey="comments"
                                        width={columnWidths.comments}
                                        isSortable={false}
                                        onResizeStart={startResizing}
                                    />
                                    <ResizableHeader
                                        label="Sprint Link"
                                        widthKey="sprintLink"
                                        width={columnWidths.sprintLink}
                                        isSortable={false}
                                        onResizeStart={startResizing}
                                    />
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        className="border-b border-slate-900 hover:bg-slate-50 cursor-pointer transition-colors group"
                                        onClick={() => handleTaskClick(task)}
                                    >
                                        <td className="px-2 py-2 truncate border-r border-slate-900 font-bold text-slate-900" title={task.projectName}>{task.projectName}</td>
                                        <td className="px-2 py-2 truncate border-r border-slate-900">{task.subPhase || '-'}</td>
                                        <td className="px-2 py-2 truncate border-r border-slate-900">{task.projectType || '-'}</td>
                                        <td className="px-2 py-2 truncate border-r border-slate-900">
                                            <PriorityBadge priority={task.priority} />
                                        </td>
                                        <td className="px-2 py-2 truncate border-r border-slate-900">{task.pc || '-'}</td>
                                        <td className="px-2 py-2 truncate border-r border-slate-900">{task.assignedTo || '-'}</td>
                                        <td className="px-2 py-2 truncate border-r border-slate-900">{task.assignedTo2 || '-'}</td>
                                        <td className="px-2 py-2 truncate border-r border-slate-900">
                                            {task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : '-'}
                                        </td>
                                        <td className="px-2 py-2 truncate border-r border-slate-900" title={task.comments || ''}>
                                            {task.comments || '-'}
                                        </td>
                                        <td className="px-2 py-2 truncate text-center">
                                            {task.sprintLink ? (
                                                <a href={task.sprintLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
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

            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                task={selectedTask}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
            />
        </div>
    );
}
