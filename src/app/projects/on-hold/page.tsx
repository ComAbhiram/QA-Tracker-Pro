'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { PauseCircle, User, Activity, Grid3x3, Table2, ExternalLink, Pencil, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { StandardTableStyles } from '@/components/ui/standard/TableStyles';
import TaskModal from '@/components/TaskModal';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import { useToast } from '@/contexts/ToastContext';
import ResizableHeader from '@/components/ui/ResizableHeader';
import useColumnResizing from '@/hooks/useColumnResizing';
import { PriorityBadge } from '@/components/ui/standard/PriorityBadge';

export default function OnHoldProjects() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'box' | 'table'>('table');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null); // For details view
    const [editingTask, setEditingTask] = useState<Task | null>(null); // For edit view

    const { success, error: toastError } = useToast();

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
        fetchOnHoldTasks();
        // Load view preference from localStorage
        const savedView = localStorage.getItem('onHoldViewMode');
        if (savedView === 'table' || savedView === 'box') {
            setViewMode(savedView);
        }
    }, []);

    const fetchOnHoldTasks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'On Hold')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setTasks(data.map(mapTaskFromDB));
            }
        } catch (error) {
            console.error('Error fetching on hold tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleView = (mode: 'box' | 'table') => {
        setViewMode(mode);
        localStorage.setItem('onHoldViewMode', mode);
    };

    // --- Modal Handlers ---

    const handleViewDetails = (task: Task) => {
        setSelectedTask(task);
        setIsDetailsModalOpen(true);
    };

    const handleEditTask = (task: Task) => {
        // Close details if open
        setIsDetailsModalOpen(false);
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const saveTask = async (taskData: Partial<Task>) => {
        const dbPayload: any = {
            project_name: taskData.projectName,
            sub_phase: taskData.subPhase,
            status: taskData.status,
            assigned_to: taskData.assignedTo,
            assigned_to2: taskData.assignedTo2,
            additional_assignees: taskData.additionalAssignees || [],
            pc: taskData.pc,
            start_date: taskData.startDate || null,
            end_date: taskData.endDate || null,
            actual_completion_date: taskData.actualCompletionDate ? new Date(taskData.actualCompletionDate).toISOString() : null,
            start_time: taskData.startTime || null,
            end_time: taskData.endTime || null,
            bug_count: taskData.bugCount,
            html_bugs: taskData.htmlBugs,
            functional_bugs: taskData.functionalBugs,
            deviation_reason: taskData.deviationReason,
            sprint_link: taskData.sprintLink,
            days_allotted: Number(taskData.daysAllotted) || 0,
            time_taken: taskData.timeTaken || '00:00:00',
            days_taken: Number(taskData.daysTaken) || 0,
            deviation: Number(taskData.deviation) || 0,
            activity_percentage: Number(taskData.activityPercentage) || 0,
            comments: taskData.comments,
            include_saturday: taskData.includeSaturday || false,
            include_sunday: taskData.includeSunday || false,
            team_id: taskData.teamId,
            project_type: taskData.projectType,
            priority: taskData.priority
        };

        try {
            if (editingTask) {
                const { error } = await supabase
                    .from('tasks')
                    .update(dbPayload)
                    .eq('id', editingTask.id);

                if (error) throw error;
                success('Task updated successfully');

                // If status changed from On Hold, remove it from list
                if (taskData.status !== 'On Hold') {
                    setTasks(prev => prev.filter(t => t.id !== editingTask.id));
                } else {
                    // Update local state
                    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
                }
            }
            setIsTaskModalOpen(false);
            setEditingTask(null);
        } catch (error: any) {
            console.error('Error saving task:', error);
            toastError(error.message || 'Failed to save task');
        }
    };

    const deleteTask = async (taskId: number) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);
            if (error) throw error;
            success('Task deleted successfully');
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setIsTaskModalOpen(false);
        } catch (error: any) {
            console.error('Error deleting task:', error);
            toastError(error.message || 'Failed to delete task');
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-[1800px] mx-auto space-y-8 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-sm">
                        <PauseCircle size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">On Hold Projects</h1>
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-bold rounded-full">
                                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                        </div>
                        <p className="text-slate-500 font-medium">Projects temporarily paused or awaiting action</p>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1">
                    <button
                        onClick={() => toggleView('table')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'table'
                            ? 'bg-amber-50 text-amber-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Table2 size={18} />
                        <span className="text-sm">Table View</span>
                    </button>
                    <button
                        onClick={() => toggleView('box')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'box'
                            ? 'bg-amber-50 text-amber-700 font-semibold'
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
                        <PauseCircle className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Projects On Hold</h3>
                    <p className="text-slate-500">There are no projects currently on hold.</p>
                </div>
            ) : viewMode === 'box' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedTasks.map((task) => (
                        <div key={task.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all group relative">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-indigo-600"
                                >
                                    <Pencil size={16} />
                                </button>
                            </div>

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
                                        {format(new Date(task.startDate), 'MMM d, yyyy')}
                                    </div>
                                )}
                            </div>

                            <div onClick={() => handleViewDetails(task)} className="cursor-pointer">
                                <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-1 group-hover:text-amber-600 transition-colors">{task.projectName}</h3>
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
                                        onClick={() => handleViewDetails(task)}
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

            {/* Task Modal for Editing */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
                task={editingTask}
                onSave={saveTask}
                onDelete={editingTask ? () => deleteTask(editingTask.id) : undefined}
            />

            {/* Read-Only Details Modal */}
            <TaskDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                task={selectedTask}
                onEdit={() => selectedTask && handleEditTask(selectedTask)}
            />
        </div>
    );
}
