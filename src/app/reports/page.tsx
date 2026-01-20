'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { getEffectiveStatus } from '@/utils/taskUtils';
import { getTeamMemberByHubstaffName } from '@/lib/team-members-config';
import { BarChart3, TrendingUp, Users, Calendar, Download, Filter } from 'lucide-react';

export default function Reports() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [teamMembers, setTeamMembers] = useState<{ id: number; name: string }[]>([]);
    const [projects, setProjects] = useState<string[]>([]);

    // Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedQA, setSelectedQA] = useState('');
    const [selectedProject, setSelectedProject] = useState('');

    useEffect(() => {
        fetchTasks();
        fetchFilters();
    }, []);

    async function fetchFilters() {
        // Fetch users
        try {
            const res = await fetch('/api/hubstaff/users');
            if (res.ok) {
                const data = await res.json();
                setTeamMembers(data.members || []);
            }
        } catch (e) {
            console.error('Error fetching users', e);
        }

        // Fetch projects
        const { data } = await supabase.from('projects').select('name').eq('status', 'active');
        if (data) {
            setProjects(data.map(p => p.name));
        }
    }

    async function fetchTasks() {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTasks(data.map(mapTaskFromDB));
        }
        setLoading(false);
    }



    const getFilteredTasks = () => {
        return tasks.filter(t => {
            const effectiveStatus = getEffectiveStatus(t);

            // Filter by Project
            if (selectedProject && t.projectName !== selectedProject) return false;

            // Filter by QA
            // Filter by QA
            if (selectedQA) {
                // Get config to find the short name (e.g. "Aswathi") from Hubstaff name (e.g. "Aswathi M Ashok")
                const memberConfig = getTeamMemberByHubstaffName(selectedQA);
                const shortName = memberConfig?.name;

                const qName = selectedQA.trim().toLowerCase();
                const sName = shortName ? shortName.trim().toLowerCase() : '';

                // Check primary assignee
                const assigned1 = (t.assignedTo || '').trim().toLowerCase();
                const match1 = assigned1 === qName || (sName && assigned1 === sName);

                // Check secondary assignee
                const assigned2 = (t.assignedTo2 || '').trim().toLowerCase();
                const match2 = assigned2 === qName || (sName && assigned2 === sName);

                // If strict matches fail, try relaxed partial matching (e.g. "minnu" inside "minnu sebastian")
                if (!match1 && !match2) {
                    const fuzzy1 = (assigned1 && qName.includes(assigned1)) || (assigned1 && assigned1.includes(qName));
                    const fuzzy2 = (assigned2 && qName.includes(assigned2)) || (assigned2 && assigned2.includes(qName));

                    if (!fuzzy1 && !fuzzy2) return false;
                }
            }

            // Filter by Date (checking overlapping intervals or simple created_at filtering; 
            // User requested "from to end date wise". Interpreting as tasks active in this range)
            if (dateRange.start && dateRange.end) {
                if (!t.startDate || !t.endDate) return false; // Skip if no dates
                const rangeStart = new Date(dateRange.start).toISOString().split('T')[0];
                const rangeEnd = new Date(dateRange.end).toISOString().split('T')[0];
                const taskStart = new Date(t.startDate).toISOString().split('T')[0];
                const taskEnd = new Date(t.endDate).toISOString().split('T')[0];
                // Check overlap
                return taskStart <= rangeEnd && taskEnd >= rangeStart;
            }

            return true;
        });
    };

    const filteredTasks = getFilteredTasks();

    // Calculate statistics based on FILTERED tasks
    const stats = {
        total: filteredTasks.length,
        completed: filteredTasks.filter(t => t.status === 'Completed').length,
        inProgress: filteredTasks.filter(t => getEffectiveStatus(t) === 'In Progress').length,
        overdue: filteredTasks.filter(t => getEffectiveStatus(t) === 'Overdue').length
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
                        <label className="text-sm font-medium text-slate-600 mb-1 block">QA Member</label>
                        <select
                            value={selectedQA}
                            onChange={e => setSelectedQA(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">All QA Members</option>
                            {teamMembers.map(m => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Project</label>
                        <select
                            value={selectedProject}
                            onChange={e => setSelectedProject(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
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
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500">Total Tasks</div>
                        <BarChart3 className="text-sky-500" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500">Completed</div>
                        <TrendingUp className="text-emerald-500" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-emerald-600">{stats.completed}</div>
                    <div className="text-sm text-slate-500 mt-1">
                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500">In Progress</div>
                        <Calendar className="text-blue-500" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-slate-500">Overdue</div>
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
                                    <td className="px-6 py-4 border-r border-slate-50">{data.total}</td>
                                    <td className="px-6 py-4 border-r border-slate-50">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            {data.completed}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
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
                            <div key={status} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="text-sm text-slate-500 mb-1">{status}</div>
                                <div className="text-2xl font-bold text-slate-800">{count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
