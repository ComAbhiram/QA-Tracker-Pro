'use client';

import { useState, useEffect } from 'react';
import { useGuestMode } from '@/contexts/GuestContext';
import { supabase } from '@/lib/supabase';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import Loader from '@/components/ui/Loader';
import { AlertCircle, Bug, Code2, Zap } from 'lucide-react';

interface ProjectBugData {
    projectName: string;
    totalBugs: number;
    htmlBugs: number;
    functionalBugs: number;
}

export default function BugsReport() {
    const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();
    const [loading, setLoading] = useState(true);
    const [bugData, setBugData] = useState<ProjectBugData[]>([]);

    useEffect(() => {
        const fetchBugData = async () => {
            if (isGuestLoading) return;

            setLoading(true);
            try {
                let query = supabase
                    .from('tasks')
                    .select('project_name, bug_count, html_bugs, functional_bugs, team_id');

                if (isGuest && selectedTeamId) {
                    query = query.eq('team_id', selectedTeamId);
                } else if (isGuest && !selectedTeamId) {
                    // Safety net for manager mode without team selected
                    setBugData([]);
                    setLoading(false);
                    return;
                }

                const { data, error } = await query;

                if (error) throw error;

                if (data) {
                    // Aggregate data by project
                    const aggregator: Record<string, ProjectBugData> = {};

                    data.forEach(task => {
                        const projectName = task.project_name || 'Unknown Project';
                        if (!aggregator[projectName]) {
                            aggregator[projectName] = {
                                projectName,
                                totalBugs: 0,
                                htmlBugs: 0,
                                functionalBugs: 0
                            };
                        }
                        aggregator[projectName].totalBugs += (Number(task.bug_count) || 0);
                        aggregator[projectName].htmlBugs += (Number(task.html_bugs) || 0);
                        aggregator[projectName].functionalBugs += (Number(task.functional_bugs) || 0);
                    });

                    // Convert to array and sort by total bugs descending
                    const sortedData = Object.values(aggregator)
                        .filter(item => item.totalBugs > 0) // Only show projects with bugs
                        .sort((a, b) => b.totalBugs - a.totalBugs);

                    setBugData(sortedData);
                }
            } catch (error) {
                console.error('Error fetching bug report data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBugData();
    }, [isGuest, selectedTeamId, isGuestLoading]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader size="lg" />
            </div>
        );
    }

    // Chart Colors
    const COLORS = {
        total: '#6366f1',      // Indigo
        html: '#ec4899',       // Pink
        functional: '#eab308'  // Yellow
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Bug className="text-rose-500" size={32} />
                        Bugs Report
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Overview of bugs reported by QA Team across all projects
                    </p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
                    Total Projects with Bugs: <span className="text-slate-900 font-bold ml-1">{bugData.length}</span>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Chart Section - Takes up 2 columns on large screens */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-slate-800">Bugs Overview by Project</h3>
                    </div>

                    {bugData.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                            <Bug size={48} className="opacity-20 mb-4" />
                            <p>No bugs reported yet.</p>
                        </div>
                    ) : (
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={bugData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="projectName"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        interval={0}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="htmlBugs" name="HTML Bugs" stackId="a" fill={COLORS.html} radius={[0, 0, 4, 4]} barSize={40} />
                                    <Bar dataKey="functionalBugs" name="Functional Bugs" stackId="a" fill={COLORS.functional} radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Summary Cards Side Panel */}
                <div className="space-y-6">
                    {/* Total Bugs Card */}
                    <div className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-2xl border border-rose-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
                                <Bug size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-rose-600/80">Total Bugs</p>
                                <h4 className="text-2xl font-bold text-rose-900">
                                    {bugData.reduce((acc, curr) => acc + curr.totalBugs, 0)}
                                </h4>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="p-2 bg-pink-100 rounded-lg text-pink-600 w-fit mb-3">
                                <Code2 size={20} />
                            </div>
                            <p className="text-xs text-slate-500 font-medium">HTML Bugs</p>
                            <h4 className="text-xl font-bold text-slate-800 mt-1">
                                {bugData.reduce((acc, curr) => acc + curr.htmlBugs, 0)}
                            </h4>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600 w-fit mb-3">
                                <Zap size={20} />
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Functional</p>
                            <h4 className="text-xl font-bold text-slate-800 mt-1">
                                {bugData.reduce((acc, curr) => acc + curr.functionalBugs, 0)}
                            </h4>
                        </div>
                    </div>
                </div>

                {/* Detailed Table Section - Full Width */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800">Project Bug Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Project Name</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs text-center">HTML Bugs</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs text-center">Functional Bugs</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs text-center">Total Bugs</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Share of Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {bugData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">No data available</td>
                                    </tr>
                                ) : (
                                    bugData.map((project, index) => {
                                        const globalTotal = bugData.reduce((acc, curr) => acc + curr.totalBugs, 0);
                                        const percentage = globalTotal > 0 ? Math.round((project.totalBugs / globalTotal) * 100) : 0;

                                        return (
                                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-800">{project.projectName}</td>
                                                <td className="px-6 py-4 text-center text-pink-600 font-medium bg-pink-50/30">{project.htmlBugs}</td>
                                                <td className="px-6 py-4 text-center text-yellow-600 font-medium bg-yellow-50/30">{project.functionalBugs}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-800 bg-slate-50/50">{project.totalBugs}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                        </div>
                                                        <span className="text-xs text-slate-500 w-8">{percentage}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
