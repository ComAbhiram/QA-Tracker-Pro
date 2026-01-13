
'use client';

import { Task } from '@/lib/types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardChartsProps {
    tasks: Task[];
}

export default function DashboardCharts({ tasks }: DashboardChartsProps) {
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
    const statusCounts = tasks.reduce((acc, task) => {
        if (task.status !== 'Completed') {
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
        <div className="flex flex-col gap-6 mb-8 w-full">

            {/* Project Status Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800">Project Status Distribution</h3>
                    <select className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-600">
                        <option>Last 30 days</option>
                    </select>
                </div>
                <div className="h-[300px] w-full">
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
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Resource Allocation */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800">Resource Allocation</h3>
                    <button className="text-xs text-slate-400 hover:text-sky-600 transition-colors">Export</button>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={resourceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#f0f9ff' }} />
                            <Bar dataKey="tasks" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Task Completion Trend */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800">Task Completion Trend</h3>
                    <button className="text-xs text-slate-400 hover:text-sky-600 transition-colors">Export</button>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}
