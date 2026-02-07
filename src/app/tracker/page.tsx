'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task } from '@/lib/types';
import { Search, Plus, Download } from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import AssigneeTaskTable from '@/components/AssigneeTaskTable';

export default function Tracker() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Fetch ALL active tasks (no pagination in query)
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
        refreshTasks();
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
            refreshTasks();
            setIsTaskModalOpen(false);
        }
    };

    const refreshTasks = async () => {
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .neq('status', 'Completed')
            .order('start_date', { ascending: false });

        if (data) setTasks((data || []).map(mapTaskFromDB));
    };

    // Group by assignee (using ALL fetched tasks)
    const groupedTasks = tasks.reduce((acc, task) => {
        const assignee = task.assignedTo || 'Unassigned';
        if (!acc[assignee]) acc[assignee] = [];
        acc[assignee].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    const exportCSV = () => {
        const headers = ['Project Name', 'Type', 'Priority', 'Phase', 'Status', 'Start Date', 'End Date', 'Actual End', 'Assignees', 'Bug Count', 'HTML Bugs', 'Functional Bugs', 'Comments'];
        const csvContent = [
            headers.join(','),
            ...tasks.map(t => [
                `"${t.projectName}"`,
                `"${t.projectType || ''}"`,
                `"${t.priority || ''}"`,
                `"${t.subPhase || ''}"`,
                `"${t.status}"`,
                t.startDate || '',
                t.endDate || '',
                t.actualCompletionDate || '',
                `"${t.assignedTo || ''} ${t.assignedTo2 || ''} ${(t.additionalAssignees || []).join(' ')}"`.trim(),
                t.bugCount || 0,
                t.htmlBugs || 0,
                t.functionalBugs || 0,
                `"${t.comments || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tracker_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-[1800px] mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Task Tracker</h1>
                    <p className="text-slate-500">Track all active QA tasks by assignee</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportCSV}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <Download size={18} /> Export CSV
                    </button>
                    <button
                        onClick={handleAddTask}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} /> New Task
                    </button>
                </div>
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

            {/* Grouped Tasks - No global pagination, but each assignee table is paginated */}
            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading tasks...</div>
                ) : Object.keys(groupedTasks).length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No tasks found</div>
                ) : (
                    // Sort authors alphabetically
                    Object.keys(groupedTasks).sort().map((assignee) => (
                        <AssigneeTaskTable
                            key={assignee}
                            assignee={assignee}
                            tasks={groupedTasks[assignee]}
                            onEditTask={handleEditTask}
                        />
                    ))
                )}
            </div>

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
