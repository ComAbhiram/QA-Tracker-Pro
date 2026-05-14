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
import CloseButton from '@/components/ui/CloseButton';

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
        if (s === 'completed') return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700';
        if (s === 'in progress') return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700';
        if (s === 'overdue') return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700';
        if (s === 'rejected' || s.includes('rejected')) return 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:border-rose-300 dark:hover:border-rose-700';
        if (s === 'on hold') return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700';
        if (s === 'forecast') return 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600';
        if (s === 'yet to start') return 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';
        if (s === 'being developed') return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700';
        return 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600';
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
            const effectiveTeamId = isGuest ? selectedTeamId : userTeam?.team_id;

            if (isSuperAdmin) {
                const res = await fetch('/api/hubstaff/users');
                if (res.ok) {
                    const data = await res.json();
                    setTeamMembers(data.members || []);
                }
            } else {
                if (effectiveTeamId) {
                    const { data, error } = await supabase
                        .from('team_members')
                        .select('id, name')
                        .eq('team_id', effectiveTeamId)
                        .order('name');

                    if (!error && data) {
                        setTeamMembers(data as any[]);
                    }
                }
            }

            // Fetch projects via API to ensure consistency and correct team filtering
            let projectsUrl = '/api/projects';
            if (effectiveTeamId) {
                projectsUrl += `?team_id=${effectiveTeamId}`;
            }

            const projRes = await fetch(projectsUrl);
            if (projRes.ok) {
                const projData = await projRes.json();
                if (projData.projects) {
                    setProjects(projData.projects.map((p: any) => ({
                        id: p.name,
                        label: p.name
                    })));
                }
            }
        } catch (e) {
            console.error('Error fetching filters', e);
        }
    }

    async function fetchTasks() {
        let query = supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        // Team Filtering
        if (isGuest) {
            // Guest / Manager mode - filter by selected team
            if (selectedTeamId) {
                query = query.eq('team_id', selectedTeamId);
            } else {
                console.warn('Manager Mode: selectedTeamId is missing, blocking data fetch.');
                query = query.eq('id', 0);
            }
        } else {
            // Logged-in user (e.g. QA Team / super_admin) - restrict to their own team
            try {
                const { getCurrentUserTeam } = await import('@/utils/userUtils');
                const userTeam = await getCurrentUserTeam();
                if (userTeam?.team_id) {
                    query = query.eq('team_id', userTeam.team_id);
                }
            } catch (e) {
                console.error('Error fetching user team for reports:', e);
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

    const saveTask = async (taskData: Partial<Task> | Partial<Task>[]) => {
        if (!editingTask) return;

        try {
            // Helper to handle single update/insert
            const processTask = async (t: Partial<Task>, isUpdate: boolean, id?: number) => {
                const dbPayload: any = {
                    project_name: t.projectName,
                    sub_phase: t.subPhase,
                    status: t.status,
                    assigned_to: t.assignedTo,
                    assigned_to2: t.assignedTo2,
                    additional_assignees: t.additionalAssignees || [],
                    pc: t.pc,
                    start_date: t.startDate || null,
                    end_date: t.endDate || null,
                    actual_completion_date: t.actualCompletionDate ? new Date(t.actualCompletionDate).toISOString() : null,
                    start_time: t.startTime || null,
                    end_time: t.endTime || null,
                    bug_count: t.bugCount,
                    html_bugs: t.htmlBugs,
                    functional_bugs: t.functionalBugs,
                    deviation_reason: t.deviationReason,
                    sprint_link: t.sprintLink,
                    days_allotted: Number(t.daysAllotted) || 0,
                    time_taken: t.timeTaken || '00:00:00',
                    days_taken: Number(t.daysTaken) || 0,
                    deviation: Number(t.deviation) || 0,
                    activity_percentage: Number(t.activityPercentage) || 0,
                    comments: t.comments,
                    include_saturday: t.includeSaturday || false,
                    include_sunday: t.includeSunday || false,
                    team_id: t.teamId,
                };

                if (isUpdate && id) {
                    const { data, error } = await supabase
                        .from('tasks')
                        .update(dbPayload)
                        .eq('id', id)
                        .select()
                        .single();
                    if (error) throw error;
                    return mapTaskFromDB(data);
                } else {
                    const { data, error } = await supabase
                        .from('tasks')
                        .insert([dbPayload])
                        .select()
                        .single();
                    if (error) throw error;
                    return mapTaskFromDB(data);
                }
            };

            let updatedMainTask: Task | null = null;
            let newTasks: Task[] = [];

            if (Array.isArray(taskData)) {
                const [first, ...rest] = taskData;

                // Update Main
                if (first) {
                    updatedMainTask = await processTask(first, true, editingTask.id);
                }

                // Create New
                if (rest.length > 0) {
                    // Since mapTaskFromDB returns Task, and processTask returns Promise<Task>
                    // We can use Promise.all
                    const results = await Promise.all(rest.map(t => processTask(t, false)));
                    newTasks = results;
                }

            } else {
                updatedMainTask = await processTask(taskData, true, editingTask.id);
            }

            // Update local state
            if (updatedMainTask) {
                const finalizedTask = updatedMainTask; // Capture for closure
                setTasks(prev => {
                    const mapped = prev.map(t => t.id === finalizedTask.id ? finalizedTask : t);
                    return [...mapped, ...newTasks];
                });

                setFilteredModal(prev => ({
                    ...prev,
                    isOpen: prev.isOpen,
                    tasks: prev.tasks.map(t => t.id === finalizedTask.id ? finalizedTask : t).concat(newTasks)
                }));
            }

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Reports & Analytics</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Comprehensive overview of project metrics</p>
                </div>
                <button
                    onClick={exportReport}
                    className="btn btn-info flex items-center justify-center gap-2 w-full md:w-auto"
                >
                    <Download size={18} />
                    Export Report
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Date Range</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full px-3 py-2 border dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-colors"
                            />
                            <span className="hidden sm:inline self-center text-slate-400 dark:text-slate-500">-</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full px-3 py-2 border dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-colors"
                            />
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Member</label>
                        <Combobox
                            options={[{ id: '', label: 'All Members' }, ...teamMembers.map(m => ({ id: m.name, label: m.name }))]}
                            value={selectedQA}
                            onChange={(val) => setSelectedQA(val ? String(val) : '')}
                            placeholder="Select Member..."
                            searchPlaceholder="Search members..."
                            emptyMessage="No members found."
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Project</label>
                        <Combobox
                            options={[{ id: '', label: 'All Projects' }, ...projects]}
                            value={selectedProject}
                            onChange={(val) => setSelectedProject(val ? String(val) : '')}
                            placeholder="Select Project..."
                            searchPlaceholder="Search projects..."
                            emptyMessage="No projects found."
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <button
                            onClick={() => { setDateRange({ start: '', end: '' }); setSelectedQA(''); setSelectedProject(''); }}
                            className="btn btn-secondary text-sm flex-1 sm:flex-none justify-center"
                        >
                            Reset
                        </button>
                        <button
                            onClick={exportReport}
                            className="btn btn-info flex items-center justify-center gap-2 whitespace-nowrap flex-1 sm:flex-none"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div
                    onClick={() => handleMetricClick('total')}
                    className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-sky-200 dark:hover:border-sky-800 group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">Total Tasks</div>
                        <BarChart3 className="text-sky-500 dark:text-sky-400" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</div>
                </div>

                <div
                    onClick={() => handleMetricClick('completed')}
                    className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-emerald-200 dark:hover:border-emerald-800 group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Completed</div>
                        <TrendingUp className="text-emerald-500 dark:text-emerald-400" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
                    </div>
                </div>

                <div
                    onClick={() => handleMetricClick('inProgress')}
                    className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-blue-200 dark:hover:border-blue-800 group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">In Progress</div>
                        <Calendar className="text-blue-500 dark:text-blue-400" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</div>
                </div>

                <div
                    onClick={() => handleMetricClick('overdue')}
                    className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-red-200 dark:hover:border-red-800 group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Overdue</div>
                        <Users className="text-red-500 dark:text-red-400" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
                </div>
            </div>

            {/* By Assignee */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tasks by Assignee</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700/50">Assignee</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700/50">Total</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700/50">Completed</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300">In Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(tasksByAssignee).map(([assignee, data]) => (
                                <tr key={assignee} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-50 dark:border-slate-700/30">{assignee}</td>

                                    {/* Total Column Clickable */}
                                    <td
                                        onClick={() => handleMetricClick('assignee', assignee)}
                                        className="px-6 py-4 border-r border-slate-50 dark:border-slate-700/30 cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors text-sky-600 dark:text-sky-400 font-bold"
                                        title="View All Tasks for Assignee"
                                    >
                                        {data.total}
                                    </td>

                                    {/* Completed Column Clickable */}
                                    <td
                                        onClick={() => handleMetricClick('assignee', assignee, 'Completed')}
                                        className="px-6 py-4 border-r border-slate-50 dark:border-slate-700/30 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                        title="View Completed Tasks"
                                    >
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                                            {data.completed}
                                        </span>
                                    </td>

                                    {/* In Progress Column Clickable */}
                                    <td
                                        onClick={() => handleMetricClick('assignee', assignee, 'In Progress')}
                                        className="px-6 py-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        title="View In Progress Tasks"
                                    >
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
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
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tasks by Status</h2>
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[95vw] max-w-7xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700/50">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{filteredModal.title}</h2>
                            <CloseButton onClick={() => setFilteredModal(prev => ({ ...prev, isOpen: false }))} />
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
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
