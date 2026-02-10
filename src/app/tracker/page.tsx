'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task, Leave } from '@/lib/types';
import { Search, Plus, Download, CalendarClock, X } from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import AssigneeTaskTable from '@/components/AssigneeTaskTable';
import { useGuestMode } from '@/contexts/GuestContext';
import { calculateAvailability } from '@/lib/availability';

export default function Tracker() {
    const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Availability Check State
    const [isAvailabilityCheckOpen, setIsAvailabilityCheckOpen] = useState(false);
    const [checkDate, setCheckDate] = useState('');
    const [availableMembers, setAvailableMembers] = useState<string[]>([]);
    const [hasChecked, setHasChecked] = useState(false);

    // Fetch ALL active tasks (no pagination in query)
    useEffect(() => {
        if (isGuestLoading) return; // Wait for guest session to initialize

        async function fetchData() {
            setLoading(true);

            // 1. Fetch Tasks
            let taskQuery = supabase
                .from('tasks')
                .select('*')
                .not('status', 'in', '("Completed","Rejected")') // Robust filtering
                .order('start_date', { ascending: false });

            if (searchTerm) {
                taskQuery = taskQuery.or(`project_name.ilike.%${searchTerm}%,assigned_to.ilike.%${searchTerm}%,sub_phase.ilike.%${searchTerm}%`);
            }

            // Manager/Guest Mode Filtering
            if (isGuest) {
                if (selectedTeamId) {
                    taskQuery = taskQuery.eq('team_id', selectedTeamId);
                } else {
                    console.warn('Manager Mode: selectedTeamId is missing, blocking data fetch.');
                    taskQuery = taskQuery.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { data: taskData, error: taskError } = await taskQuery;

            if (taskError) {
                console.error('Error fetching tasks:', taskError);
            } else {
                let filteredData = taskData || [];

                // Client-side fallback to ensure Rejected/Completed are hidden
                filteredData = filteredData.filter(t => t.status !== 'Rejected' && t.status !== 'Completed');

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

            // 2. Fetch Leaves (Active team only)
            try {
                const leavesRes = await fetch('/api/leaves');
                if (leavesRes.ok) {
                    const leavesData = await leavesRes.json();
                    setLeaves(leavesData.leaves || []);
                }
            } catch (error) {
                console.error('Error fetching leaves:', error);
            }

            setLoading(false);
        }
        fetchData();
    }, [searchTerm, dateFilter, isGuest, selectedTeamId, isGuestLoading]);

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
            include_saturday: taskData.includeSaturday || false,
            include_sunday: taskData.includeSunday || false,
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
            .not('status', 'in', '("Completed","Rejected")')
            .order('start_date', { ascending: false });

        if (data) {
            // Client-side fallback
            const filtered = data.filter((t: any) => t.status !== 'Rejected' && t.status !== 'Completed');
            setTasks(filtered.map(mapTaskFromDB));
        }
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

    const handleCheckAvailability = () => {
        if (!checkDate) return;

        const targetDate = new Date(checkDate);
        targetDate.setHours(0, 0, 0, 0);

        const available: string[] = [];

        // Iterate over all assignees in groupedTasks
        Object.keys(groupedTasks).forEach(assignee => {
            if (assignee === 'Unassigned') return; // Skip Unassigned
            const assigneeTasks = groupedTasks[assignee];
            const assigneeLeaves = leaves.filter(l => l.team_member_name === assignee);

            const availableFrom = calculateAvailability(assigneeTasks, assigneeLeaves);
            availableFrom.setHours(0, 0, 0, 0);

            if (availableFrom <= targetDate) {
                available.push(assignee);
            }
        });

        setAvailableMembers(available.sort());
        setHasChecked(true);
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
                        onClick={() => { setIsAvailabilityCheckOpen(true); setHasChecked(false); setCheckDate(''); setAvailableMembers([]); }}
                        className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-lg shadow-indigo-200"
                    >
                        <CalendarClock size={18} /> Check Resource Availability
                    </button>
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

            {/* Availability Check Modal */}
            {isAvailabilityCheckOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">Check Availability</h3>
                            <button onClick={() => setIsAvailabilityCheckOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Date needed from</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={checkDate}
                                        onChange={(e) => setCheckDate(e.target.value)}
                                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    />
                                    <button
                                        onClick={handleCheckAvailability}
                                        disabled={!checkDate}
                                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Check
                                    </button>
                                </div>
                            </div>

                            {hasChecked && (
                                <div className="animate-in slide-in-from-bottom-2 duration-300">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                                        {availableMembers.length} Available Member{availableMembers.length !== 1 ? 's' : ''}
                                    </h4>

                                    {availableMembers.length > 0 ? (
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                            {availableMembers.map(member => (
                                                <div key={member} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xs">
                                                        {member.charAt(0)}
                                                    </div>
                                                    <span className="font-semibold">{member}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                                            <p className="text-slate-500">No members available on this date.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                    // Sort authors alphabetically and exclude "Unassigned"
                    Object.keys(groupedTasks).filter(key => key !== 'Unassigned').sort().map((assignee) => (
                        <AssigneeTaskTable
                            key={assignee}
                            assignee={assignee}
                            tasks={groupedTasks[assignee]}
                            leaves={leaves.filter(l => l.team_member_name === assignee)}
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
