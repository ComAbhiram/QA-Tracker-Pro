'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { getEffectiveStatus } from '@/utils/taskUtils';
import { getTeamMemberByHubstaffName } from '@/lib/team-members-config';
import { BarChart3, TrendingUp, Users, Calendar, Download, Filter, X } from 'lucide-react';
import Combobox from '@/components/ui/Combobox';
import TaskOverviewTable from '../project-overview/components/TaskOverviewTable';
import TaskModal from '@/components/TaskModal';

import { useGuestMode } from '@/contexts/GuestContext';

export default function Reports() {
    const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState<{ id: number; name: string }[]>([]);
    const [projects, setProjects] = useState<{ id: string; label: string }[]>([]);

    // Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedQA, setSelectedQA] = useState('');
    const [selectedProject, setSelectedProject] = useState('');

    // Modal State
    const [filteredModal, setFilteredModal] = useState<{
        isOpen: boolean;
        title: string;
        tasks: Task[];
    }>({ isOpen: false, title: '', tasks: [] });

    // Task Edit State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Helper for status colors
    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300';
        if (s === 'in progress') return 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300';
        if (s === 'overdue') return 'bg-red-50 text-red-700 border-red-200 hover:border-red-300';
        if (s === 'rejected' || s.includes('rejected')) return 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300';
        if (s === 'on hold') return 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300';
        if (s === 'forecast') return 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300';
        if (s === 'yet to start') return 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300';
        if (s === 'being developed') return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-300';
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300';
    };

    const handleMetricClick = (type: 'total' | 'completed' | 'inProgress' | 'overdue' | 'assignee' | 'status', assignee?: string, status?: string) => {
        let tasksToShow = [...filteredTasks];
        let title = '';

        if (type === 'total') {
            title = 'All Tasks';
        } else if (type === 'completed') {
            tasksToShow = tasksToShow.filter(t => t.status === 'Completed');
            title = 'Completed Tasks';
        } else if (type === 'inProgress') {
            tasksToShow = tasksToShow.filter(t => getEffectiveStatus(t) === 'In Progress');
            title = 'In Progress Tasks';
        } else if (type === 'overdue') {
            tasksToShow = tasksToShow.filter(t => getEffectiveStatus(t) === 'Overdue');
            title = 'Overdue Tasks';
        } else if (type === 'status' && status) {
            tasksToShow = tasksToShow.filter(t => getEffectiveStatus(t) === status);
            title = `${status} Tasks`;
        } else if (type === 'assignee' && assignee) {
            const assigneeName = assignee === 'Unassigned' ? null : assignee;

            // Filter by assignee name (handling primary and secondary)
            tasksToShow = tasksToShow.filter(t =>
                (t.assignedTo === assigneeName) ||
                (t.assignedTo2 === assigneeName) ||
                (t.additionalAssignees && t.additionalAssignees.includes(assigneeName!)) ||
                (assignee === 'Unassigned' && !t.assignedTo)
            );

            if (status === 'Completed') {
                tasksToShow = tasksToShow.filter(t => t.status === 'Completed');
                title = `${assignee} - Completed Tasks`;
            } else if (status === 'In Progress') {
                tasksToShow = tasksToShow.filter(t => getEffectiveStatus(t) === 'In Progress');
                title = `${assignee} - In Progress Tasks`;
            } else {
                title = `${assignee} - All Tasks`;
            }
        }

        setFilteredModal({
            isOpen: true,
            title: title + ` (${tasksToShow.length})`,
            tasks: tasksToShow
        });
    };

    useEffect(() => {
        if (!isGuestLoading) {
            fetchTasks();
            fetchFilters();
        }
    }, [isGuest, selectedTeamId, isGuestLoading]);

    async function fetchFilters() {
        // Fetch users based on role
        try {
            const { getCurrentUserTeam } = await import('@/utils/userUtils');
            const userTeam = await getCurrentUserTeam();
            const isSuperAdmin = userTeam?.role === 'super_admin';

            if (isSuperAdmin) {
                const res = await fetch('/api/hubstaff/users');
                if (res.ok) {
                    const data = await res.json();
                    setTeamMembers(data.members || []);
                }
            } else {
                if (userTeam?.team_id) {
                    const { data, error } = await supabase
                        .from('team_members')
                        .select('id, name')
                        .eq('team_id', userTeam.team_id)
                        .order('name');

                    if (!error && data) {
                        setTeamMembers(data as any[]);
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching users', e);
        }

        // Fetch projects
        const { data } = await supabase.from('projects').select('name').eq('status', 'active');
        if (data) {
            setProjects(data.map(p => ({ id: p.name, label: p.name })));
        }
    }

    async function fetchTasks() {
        let query = supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        // Manager/Guest Mode Filtering
        if (isGuest) {
            if (selectedTeamId) {
                query = query.eq('team_id', selectedTeamId);
            } else {
                console.warn('Manager Mode: selectedTeamId is missing, blocking data fetch.');
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
        }

        const { data, error } = await query;

        if (!error && data) {
            setTasks(data.map(mapTaskFromDB));
        }
        setLoading(false);
    }

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const saveTask = async (taskData: Partial<Task>) => {
        if (!editingTask) return;

        try {
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

            const { data, error } = await supabase
                .from('tasks')
                .update(dbPayload)
                .eq('id', editingTask.id)
                .select()
                .single();

            if (error) throw error;

            // Update local state
            const updatedTask = mapTaskFromDB(data);

            // Update main tasks list
            setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

            // Update filtered modal tasks if open
            setFilteredModal(prev => ({
                ...prev,
                isOpen: prev.isOpen, // Keep open
                tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
            }));

            setIsTaskModalOpen(false);
            setEditingTask(null);
            alert('Task updated successfully');
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Failed to update task');
        }
    };

    const getFilteredTasks = () => {
        return tasks.filter(t => {
            const effectiveStatus = getEffectiveStatus(t);

            // Filter by Project
            if (selectedProject && t.projectName !== selectedProject) return false;

            // Filter by QA
            if (selectedQA) {
                const memberConfig = getTeamMemberByHubstaffName(selectedQA);
                const shortName = memberConfig?.name;
                const qName = selectedQA.trim().toLowerCase();
                const sName = shortName ? shortName.trim().toLowerCase() : '';

                const assigned1 = (t.assignedTo || '').trim().toLowerCase();
                const match1 = assigned1 === qName || (sName && assigned1 === sName);

                const assigned2 = (t.assignedTo2 || '').trim().toLowerCase();
                const match2 = assigned2 === qName || (sName && assigned2 === sName);

                if (!match1 && !match2) {
                    const fuzzy1 = (assigned1 && qName.includes(assigned1)) || (assigned1 && assigned1.includes(qName));
                    const fuzzy2 = (assigned2 && qName.includes(assigned2)) || (assigned2 && assigned2.includes(qName));
                    if (!fuzzy1 && !fuzzy2) return false;
                }
            }

            // Filter by Date
            if (dateRange.start && dateRange.end) {
                if (!t.startDate || !t.endDate) return false;
                const taskStart = t.startDate.substring(0, 10);
                const taskEnd = t.endDate.substring(0, 10);
                return taskStart <= dateRange.end && taskEnd >= dateRange.start;
            }

            return true;
        });
    };

    const filteredTasks = getFilteredTasks();

    // Calculate statistics
    const stats = {
        total: filteredTasks.length,
        completed: filteredTasks.filter(t => t.status === 'Completed').length,
        inProgress: filteredTasks.filter(t => getEffectiveStatus(t) === 'In Progress').length,
        overdue: filteredTasks.filter(t => {
            // Don't count rejected tasks as overdue
            if (t.status === 'Rejected') return false;
            return getEffectiveStatus(t) === 'Overdue';
        }).length
    };

    // Group by assignee
    const tasksByAssignee = filteredTasks.reduce((acc, task) => {
        const assignee = task.assignedTo || 'Unassigned';
        if (!acc[assignee]) {
            acc[assignee] = { total: 0, completed: 0, inProgress: 0 };
        }
        acc[assignee].total++;
        if (task.status === 'Completed') acc[assignee].completed++;
        if (getEffectiveStatus(task) === 'In Progress') acc[assignee].inProgress++;
        return acc;
    }, {} as Record<string, { total: number; completed: number; inProgress: number }>);

    // Group by status
    const tasksByStatus = filteredTasks.reduce((acc, task) => {
        const status = getEffectiveStatus(task);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const exportReport = () => {
        const headers = ['Project Name', 'Phase', 'Status', 'Start Date', 'End Date', 'Assignee', 'Rejection Reason', 'Comments'];
        const csvContent = [
            headers.join(','),
            ...filteredTasks.map(t => [
                `"${t.projectName}"`,
                `"${t.subPhase || ''}"`,
                `"${getEffectiveStatus(t)}"`,
                t.startDate || '',
                t.endDate || '',
                `"${t.assignedTo || ''}"`,
                `"${t.deviationReason || ''}"`,
                `"${t.comments || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qa_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-slate-500">Loading reports...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Reports & Analytics</h1>
                    <p className="text-slate-500 mt-1">Comprehensive overview of project metrics</p>
                </div>
                <button
                    onClick={exportReport}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm"
                >
                    <Download size={18} />
                    Export Report
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Date Range</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                            <span className="self-center text-slate-400">-</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Member</label>
                        <select
                            value={selectedQA}
                            onChange={e => setSelectedQA(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">All Members</option>
                            {teamMembers.map(m => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Project</label>
                        <Combobox
                            options={[{ id: '', label: 'All Projects' }, ...projects]}
                            value={selectedProject}
                            onChange={(val) => setSelectedProject(val ? String(val) : '')}
                            placeholder="Select Project..."
                            searchPlaceholder="Search projects..."
                            emptyMessage="No projects found."
                        />
                    </div>
                    <button
                        onClick={() => { setDateRange({ start: '', end: '' }); setSelectedQA(''); setSelectedProject(''); }}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg text-sm transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={exportReport}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div
                    onClick={() => handleMetricClick('total')}
                    className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-sky-200 group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500 group-hover:text-sky-600 transition-colors">Total Tasks</div>
                        <BarChart3 className="text-sky-500" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
                </div>

                <div
                    onClick={() => handleMetricClick('completed')}
                    className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-emerald-200 group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500 group-hover:text-emerald-600 transition-colors">Completed</div>
                        <TrendingUp className="text-emerald-500" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-emerald-600">{stats.completed}</div>
                    <div className="text-sm text-slate-500 mt-1">
                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
                    </div>
                </div>

                <div
                    onClick={() => handleMetricClick('inProgress')}
                    className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-blue-200 group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500 group-hover:text-blue-600 transition-colors">In Progress</div>
                        <Calendar className="text-blue-500" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
                </div>

                <div
                    onClick={() => handleMetricClick('overdue')}
                    className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-red-200 group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500 group-hover:text-red-600 transition-colors">Overdue</div>
                        <Users className="text-red-500" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-red-600">{stats.overdue}</div>
                </div>
            </div>

            {/* By Assignee */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Tasks by Assignee</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 border-r border-slate-100">Assignee</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 border-r border-slate-100">Total</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 border-r border-slate-100">Completed</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600">In Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(tasksByAssignee).map(([assignee, data]) => (
                                <tr key={assignee} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-800 border-r border-slate-50">{assignee}</td>

                                    {/* Total Column Clickable */}
                                    <td
                                        onClick={() => handleMetricClick('assignee', assignee)}
                                        className="px-6 py-4 border-r border-slate-50 cursor-pointer hover:bg-sky-50 transition-colors text-sky-600 font-bold"
                                        title="View All Tasks for Assignee"
                                    >
                                        {data.total}
                                    </td>

                                    {/* Completed Column Clickable */}
                                    <td
                                        onClick={() => handleMetricClick('assignee', assignee, 'Completed')}
                                        className="px-6 py-4 border-r border-slate-50 cursor-pointer hover:bg-emerald-50 transition-colors"
                                        title="View Completed Tasks"
                                    >
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            {data.completed}
                                        </span>
                                    </td>

                                    {/* In Progress Column Clickable */}
                                    <td
                                        onClick={() => handleMetricClick('assignee', assignee, 'In Progress')}
                                        className="px-6 py-4 cursor-pointer hover:bg-blue-50 transition-colors"
                                        title="View In Progress Tasks"
                                    >
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                            {data.inProgress}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* By Status */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Tasks by Status</h2>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(tasksByStatus).map(([status, count]) => (
                            <div
                                key={status}
                                onClick={() => handleMetricClick('status', undefined, status)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${getStatusColor(status)}`}
                            >
                                <div className="text-sm font-medium opacity-80 mb-1">{status}</div>
                                <div className="text-3xl font-bold">{count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Drill-down Modal */}
            {filteredModal.isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-7xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-800">{filteredModal.title}</h2>
                            <button
                                onClick={() => setFilteredModal(prev => ({ ...prev, isOpen: false }))}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            <TaskOverviewTable
                                tasks={filteredModal.tasks}
                                onEdit={handleEditTask}
                            />
                        </div>
                    </div>
                </div>
            )}

            {isTaskModalOpen && editingTask && (
                <TaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    task={editingTask}
                    onSave={saveTask}
                />
            )}
        </div>
    );
}
