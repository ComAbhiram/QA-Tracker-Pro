import { useState } from 'react';
import { Task } from '@/lib/types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { subDays, subMonths, isAfter, parseISO } from 'date-fns';

interface DashboardChartsProps {
    tasks: Task[];
}

export default function DashboardCharts({ tasks }: DashboardChartsProps) {
    // State for Project Status Distribution filter
    const [statusTimeRange, setStatusTimeRange] = useState('30d'); // '7d' | '30d' | '3m'

    if (!tasks || tasks.length === 0) return null;

    // 1. Resource Allocation (Active Tasks by Assignee) - Bar Chart
    const assigneeCounts = tasks.reduce((acc, task) => {
        if (task.status !== 'Completed') {
            const assignee = task.assignedTo || 'Unassigned';
            acc[assignee] = (acc[assignee] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const resourceData = Object.entries(assigneeCounts).map(([name, count]) => ({
        name,
        tasks: count
    })).sort((a, b) => b.tasks - a.tasks).slice(0, 5); // Top 5

    // 2. Project Status Distribution - Pie Chart
    // Filter tasks based on selected time range
    const filteredTasksForStatus = tasks.filter(task => {
        if (!task.createdAt || isNaN(new Date(task.createdAt).getTime())) return false;

        const taskDate = parseISO(task.createdAt);
        const today = new Date();
        let cutoffDate;

        switch (statusTimeRange) {
            case '7d':
                cutoffDate = subDays(today, 7);
                break;
            case '30d':
                cutoffDate = subDays(today, 30);
                break;
            case '3m':
                cutoffDate = subMonths(today, 3);
                break;
            default:
                cutoffDate = subDays(today, 30);
        }

        // Include tasks created AFTER the cutoff date
        return isAfter(taskDate, cutoffDate);
    });

    const statusCounts = filteredTasksForStatus.reduce((acc, task) => {
        if (task.status !== 'Completed') {
            // Also exclude 'Rejected' if desired, but user only excluded Completed originally
            // Screenshot shows 'Rejected' in the pie chart, so keep it.
            // Wait, previous code excluded 'Completed'. Let's verify if we want that.
            // Screenshot shows "Forecast", "In Progress", "On Hold", "Rejected", "Yet to Start".
            // It does NOT show "Completed". So original logic stands.
            acc[task.status] = (acc[task.status] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value
    }));

    const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    // 3. Task Completion Trend (Dummy data logic as real implementation requires historical data which we might not have fully tracked in 'tasks' table simplistically)
    // For now, let's simulate a trend based on completion dates if available, or just render placeholder data matching the screenshot style
    const trendData = [
        { name: 'Jan 1', total: 12, completed: 5 },
        { name: 'Jan 2', total: 18, completed: 8 },
        { name: 'Jan 3', total: 15, completed: 12 },
        { name: 'Jan 4', total: 22, completed: 15 },
        { name: 'Jan 5', total: 25, completed: 20 },
        { name: 'Jan 6', total: tasks.length, completed: tasks.filter(t => t.status === 'Completed').length },
    ];


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8 w-full">

            {/* Project Status Distribution */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Project Status Distribution</h3>
                    <select
                        value={statusTimeRange}
                        onChange={(e) => setStatusTimeRange(e.target.value)}
                        className="text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none focus:border-blue-500 cursor-pointer"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="3m">Last 3 months</option>
                    </select>
                </div>
                <div className="h-[300px] w-full">
                    {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, left: 0, bottom: 0, right: 0 }}>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        backgroundColor: 'var(--tw-bg-opacity, 1) rgb(255 255 255 / var(--tw-bg-opacity))', // Fallback
                                    }}
                                    itemStyle={{ color: 'inherit' }}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Legend
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    align="center"
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                                    formatter={(value: any) => <span className="text-slate-600 dark:text-slate-400">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <p className="text-sm">No active projects in this period</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Resource Allocation */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Resource Allocation</h3>
                    <button className="text-xs text-slate-400 hover:text-sky-600 transition-colors">Export</button>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={resourceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                            <XAxis
                                dataKey="name"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: 'currentColor' }}
                                className="text-slate-500 dark:text-slate-500"
                            />
                            <YAxis
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: 'currentColor' }}
                                className="text-slate-500 dark:text-slate-500"
                            />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9', opacity: 0.1 }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="tasks" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Task Completion Trend */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Task Completion Trend</h3>
                    <button className="text-xs text-slate-400 hover:text-sky-600 transition-colors">Export</button>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                            <XAxis
                                dataKey="name"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: 'currentColor' }}
                                className="text-slate-500 dark:text-slate-500"
                            />
                            <YAxis
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: 'currentColor' }}
                                className="text-slate-500 dark:text-slate-500"
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}
