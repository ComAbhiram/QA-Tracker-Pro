'use client';

import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    LayoutDashboard, CheckCircle2, AlertCircle, Bug, Clock,
    RefreshCw, TrendingUp
} from 'lucide-react';
import { Task, mapTaskFromDB } from '@/lib/types';

import { useGuestMode } from '@/contexts/GuestContext';

export default function AnalyticsPage() {
    const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isGuestLoading) {
            fetchData();
        }
    }, [isGuest, selectedTeamId, isGuestLoading]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Reuse the project-overview API which returns all tasks
            let url = '/api/project-overview';

            // Manager/Guest Mode Filtering
            if (isGuest) {
                if (selectedTeamId) {
                    url += `?teamId=${selectedTeamId}`;
                } else {
                    console.warn('Manager Mode: selectedTeamId is missing, blocking API call.');
                    setTasks([]);
                    setLoading(false);
                    return;
                }
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.tasks) {
                setTasks(data.tasks.map(mapTaskFromDB));
            }
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Aggregation Logic ---

    // 1. Task Status Distribution
    const statusCounts = tasks.reduce((acc, task) => {
        const status = task.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const statusData = Object.keys(statusCounts).map(status => ({
        name: status,
        value: statusCounts[status]
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // 2. Bugs by Project (Top 5)
    const bugsByProject = tasks.reduce((acc, task) => {
        const project = task.projectName;
        if (!acc[project]) {
            acc[project] = { name: project, total: 0, html: 0, functional: 0 };
        }
        acc[project].total += (task.bugCount || 0);
        acc[project].html += (task.htmlBugs || 0);
        acc[project].functional += (task.functionalBugs || 0);
        return acc;
    }, {} as Record<string, any>);

    const bugsData = Object.values(bugsByProject)
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 5);

    // 3. Team Workload
    const workload = tasks.reduce((acc, task) => {
        const assignee = task.assignedTo || 'Unassigned';
        acc[assignee] = (acc[assignee] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const workloadData = Object.keys(workload).map(name => ({
        name,
        tasks: workload[name]
    })).sort((a, b) => b.tasks - a.tasks);

    // 4. Priority Breakdown
    const priorityCounts = tasks.reduce((acc, task) => {
        const priority = task.priority || 'None';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const priorityData = Object.keys(priorityCounts).map(p => ({
        name: p,
        count: priorityCounts[p]
    }));

    // Summary Metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const completionRate = totalTasks ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0';
    const totalBugs = tasks.reduce((sum, t) => sum + (t.bugCount || 0), 0);
    const overdueTasks = tasks.filter(t => {
        // Don't count rejected tasks as overdue
        if (t.status === 'Rejected') return false;
        if (!t.endDate || t.status === 'Completed') return false;
        return new Date(t.endDate) < new Date();
    }).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-[1920px] mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Analytics Dashboard</h1>
                        <p className="text-slate-600 mt-1">Real-time insights and performance metrics</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <RefreshCw size={18} />
                        Refresh Data
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <SummaryCard
                        title="Total Tasks"
                        value={totalTasks}
                        icon={<LayoutDashboard className="text-blue-600" />}
                        bg="bg-blue-50"
                    />
                    <SummaryCard
                        title="Completion Rate"
                        value={`${completionRate}%`}
                        icon={<CheckCircle2 className="text-emerald-600" />}
                        bg="bg-emerald-50"
                    />
                    <SummaryCard
                        title="Total Bugs"
                        value={totalBugs}
                        icon={<Bug className="text-red-600" />}
                        bg="bg-red-50"
                    />
                    <SummaryCard
                        title="Overdue Tasks"
                        value={overdueTasks}
                        icon={<AlertCircle className="text-orange-600" />}
                        bg="bg-orange-50"
                    />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Status Distribution */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-indigo-600" />
                            Task Status Distribution
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bugs by Project */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Bug size={20} className="text-red-600" />
                            Top Projects by Bugs
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={bugsData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" fontSize={12} tickFormatter={(val) => val.slice(0, 10) + '...'} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="html" name="HTML Bugs" stackId="a" fill="#fb923c" />
                                    <Bar dataKey="functional" name="Functional Bugs" stackId="a" fill="#ef4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Team Workload */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-blue-600" />
                            Team Workload (Tasks Assigned)
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={workloadData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="tasks" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Priority Breakdown */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <AlertCircle size={20} className="text-purple-600" />
                            Tasks by Priority
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={priorityData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ title, value, icon, bg }: { title: string, value: string | number, icon: React.ReactNode, bg: string }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
            </div>
        </div>
    );
}
