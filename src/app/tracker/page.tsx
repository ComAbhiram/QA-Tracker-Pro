'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task, isTaskOverdue, getOverdueDays } from '@/lib/types';
import { format } from 'date-fns';
import { Search, Plus, Edit2, AlertCircle } from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import Pagination from '@/components/Pagination';

export default function Tracker() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        async function fetchTasks() {
            setLoading(true);
            let query = supabase
                .from('tasks')
                .select('*')
                .neq('status', 'Completed') // Tracker usually shows active tasks
                .order('start_date', { ascending: false });

            if (searchTerm) {
                query = query.or(`project_name.ilike.%${searchTerm}%,assigned_to.ilike.%${searchTerm}%,sub_phase.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching tasks:', error);
            } else {
                let filteredData = data || [];

                if (dateFilter) {
                    const selectedDate = new Date(dateFilter);
                    selectedDate.setHours(0, 0, 0, 0);

                    filteredData = filteredData.filter(t => {
                        const start = t.start_date ? new Date(t.start_date) : null;
                        const end = t.end_date ? new Date(t.end_date) : null;
                        if (!start) return false;
                        start.setHours(0, 0, 0, 0);
                        if (end) end.setHours(0, 0, 0, 0);
                        return start <= selectedDate && (!end || end >= selectedDate);
                    });
                }

                setTasks(filteredData.map(mapTaskFromDB));
            }
            setLoading(false);
        }
        fetchTasks();
    }, [searchTerm, dateFilter]);

    const handleAddTask = () => {
        setEditingTask(null);
        setIsTaskModalOpen(true);
    };

    const handleEditTask = (task: Task) => {
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
            team_id: taskData.teamId,
        };

        if (editingTask) {
            // Exclude team_id from update if not intending to transfer ownership
            const { team_id, ...updatePayload } = dbPayload;

            const { error } = await supabase
                .from('tasks')
                .update(updatePayload)
                .eq('id', editingTask.id);

            if (error) {
                console.error('Error updating task:', error);
                alert(`Failed to save task: ${error.message}`);
                return;
            }
        } else {
            const { error } = await supabase
                .from('tasks')
                .insert([dbPayload]);

            if (error) {
                console.error('Error creating task:', error);
                alert(`Failed to create task: ${error.message}`);
                return;
            }
        }

        // Refresh tasks
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .neq('status', 'Completed')
            .order('start_date', { ascending: false });

        if (data) setTasks((data || []).map(mapTaskFromDB));
        setIsTaskModalOpen(false);
    };

    const handleDeleteTask = async (taskId: number) => {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        } else {
            // Refresh tasks
            const { data } = await supabase
                .from('tasks')
                .select('*')
                .neq('status', 'Completed')
                .order('start_date', { ascending: false });

            if (data) setTasks((data || []).map(mapTaskFromDB));
            setIsTaskModalOpen(false);
        }
    };

    // Pagination logic
    const totalItems = tasks.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    // Reset to page 1 when search or date filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFilter]);

    // Group by assignee (using paginated tasks)
    const groupedTasks = paginatedTasks.reduce((acc, task) => {
        const assignee = task.assignedTo || 'Unassigned';
        if (!acc[assignee]) acc[assignee] = [];
        acc[assignee].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    return (
        <div className="max-w-[1800px] mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Task Tracker</h1>
                    <p className="text-slate-500">Track all active QA tasks by assignee</p>
                </div>
                <button
                    onClick={handleAddTask}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={18} /> New Task
                </button>
            </header>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by project, assignee, or phase..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                        />
                    </div>
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                    />
                </div>
            </div>

            {/* Grouped Tasks */}
            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading tasks...</div>
                ) : Object.keys(groupedTasks).length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No tasks found</div>
                ) : (
                    Object.entries(groupedTasks).map(([assignee, assigneeTasks]) => (
                        <div key={assignee} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-sky-500 to-indigo-600 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {assignee.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{assignee}</h3>
                                        <p className="text-white/80 text-sm">{assigneeTasks.length} task{assigneeTasks.length !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-slate-600 border-collapse">
                                    <thead className="bg-slate-50 border border-slate-400">
                                        <tr>
                                            <th className="px-5 py-4 font-semibold text-slate-600 text-left border border-slate-400">Project</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">Type</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">Priority</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">Edit</th>
                                            <th className="px-5 py-4 font-semibold text-slate-600 text-left border border-slate-400">Phase</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">PC</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">Assignees</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">Status</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">Start</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">End</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">Actual End</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">Bugs (H/F/T)</th>
                                            <th className="px-5 py-4 font-semibold text-slate-600 text-left border border-slate-400">Comments</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left border border-slate-400">Deviation</th>
                                            <th className="px-4 py-4 font-semibold text-slate-600 text-left">Sprint</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assigneeTasks.map(task => (
                                            <tr key={task.id} className="border-b border-slate-400 hover:bg-slate-50/50 transition-all group">
                                                <td className="px-5 py-4 font-semibold text-slate-800 border border-slate-400">{task.projectName}</td>
                                                <td className="px-4 py-4 text-slate-600 border border-slate-400">{task.projectType || '-'}</td>
                                                <td className="px-4 py-4 text-slate-600 border border-slate-400">
                                                    {task.priority && (
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${task.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                                                            task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                                                task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-green-100 text-green-700'
                                                            }`}>
                                                            {task.priority}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 border border-slate-400">
                                                    <button
                                                        onClick={() => handleEditTask(task)}
                                                        className="text-slate-400 hover:text-sky-600 hover:bg-sky-50 p-2 rounded-lg transition-all"
                                                        title="Edit Task"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4 font-medium text-slate-600 border border-slate-400">{task.subPhase || '-'}</td>
                                                <td className="px-4 py-4 border border-slate-400">{task.pc || '-'}</td>
                                                <td className="px-4 py-4 border border-slate-400">
                                                    <div className="flex -space-x-2 overflow-hidden">
                                                        {/* Primary Assignee */}
                                                        {task.assignedTo && (
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-600" title={task.assignedTo}>
                                                                {task.assignedTo.charAt(0)}
                                                            </div>
                                                        )}
                                                        {/* Secondary Assignee */}
                                                        {task.assignedTo2 && (
                                                            <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-bold text-purple-600" title={task.assignedTo2}>
                                                                {task.assignedTo2.charAt(0)}
                                                            </div>
                                                        )}
                                                        {/* Additional Assignees */}
                                                        {task.additionalAssignees?.map((assignee, i) => (
                                                            <div key={i} className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-600" title={assignee}>
                                                                {assignee.charAt(0)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 border border-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                            task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                task.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-100' :
                                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                                            }`}>
                                                            {task.status}
                                                        </span>
                                                        {isTaskOverdue(task) && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                                <AlertCircle size={12} />
                                                                {getOverdueDays(task)}d overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-slate-500 font-medium border-r border-slate-50">{task.startDate ? format(new Date(task.startDate), 'MMM d') : '-'}</td>
                                                <td className="px-4 py-4 text-slate-500 font-medium border-r border-slate-50">{task.endDate ? format(new Date(task.endDate), 'MMM d') : '-'}</td>
                                                <td className="px-4 py-4 text-slate-500 font-medium border-r border-slate-50">{task.actualCompletionDate ? format(new Date(task.actualCompletionDate), 'MMM d') : '-'}</td>
                                                <td className="px-4 py-4 text-center border-r border-slate-50">
                                                    <div className="flex flex-col text-xs">
                                                        <span className="font-bold text-slate-700">T: {task.bugCount}</span>
                                                        <span className="text-slate-500">H: {task.htmlBugs}</span>
                                                        <span className="text-slate-500">F: {task.functionalBugs}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-slate-500 max-w-sm truncate border-r border-slate-50" title={task.comments || ''}>
                                                    {task.comments || '-'}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-slate-500 max-w-xs truncate border-r border-slate-50" title={task.deviationReason || ''}>
                                                    {task.deviationReason || '-'}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-slate-500 max-w-xs truncate" title={task.sprintLink || ''}>
                                                    {task.sprintLink ? (
                                                        <a href={task.sprintLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
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
                    ))
                )}
            </div>

            {/* Pagination */}
            {!loading && totalItems > 0 && (
                <div className="mt-6">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                task={editingTask}
                onSave={saveTask}
                onDelete={handleDeleteTask}
            />
        </div>
    );
}
