'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGuestMode } from '@/contexts/GuestContext';
import { supabase } from '@/lib/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Loader from '@/components/ui/Loader';
import { AlertCircle, Bug, Code2, Zap, Search, ArrowUpDown, X } from 'lucide-react';
import { DatePicker } from '@/components/DatePicker';

interface ProjectBugData {
    projectName: string;
    totalBugs: number;
    htmlBugs: number;
    functionalBugs: number;
}

type SortKey = 'projectName' | 'totalBugs' | 'htmlBugs' | 'functionalBugs';

export default function BugsReport() {
    const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();
    const [loading, setLoading] = useState(true);
    const [rawData, setRawData] = useState<any[]>([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
        key: 'totalBugs',
        direction: 'desc'
    });

    // 1. Fetch Raw Data (Once or when Team changes)
    useEffect(() => {
        const fetchTasks = async () => {
            if (isGuestLoading) return;
            setLoading(true);
            try {
                let query = supabase
                    .from('tasks')
                    .select('project_name, bug_count, html_bugs, functional_bugs, team_id, start_date, created_at');

                // Global QA Team ID - If selected, show ALL bugs (Super Admin behavior)
                const isQATeamGlobal = selectedTeamId === 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

                if (isGuest && selectedTeamId && !isQATeamGlobal) {
                    query = query.eq('team_id', selectedTeamId);
                }

                const { data, error } = await query;
                if (error) throw error;
                if (data) setRawData(data);
            } catch (error) {
                console.error('Error fetching bug data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, [isGuest, selectedTeamId, isGuestLoading]);

    // 2. Process Data (Filter & Aggregate & Sort)
    const processedData = useMemo(() => {
        // A. Filter Rows
        const filteredRows = rawData.filter(task => {
            // Date Filter (using start_date of task as "Project Date" proxy)
            if (startDate) {
                const taskDate = task.start_date ? new Date(task.start_date) : new Date(task.created_at);
                if (taskDate < startDate) return false;
            }
            if (endDate) {
                const taskDate = task.start_date ? new Date(task.start_date) : new Date(task.created_at);
                // Set end date to end of day
                const eod = new Date(endDate);
                eod.setHours(23, 59, 59, 999);
                if (taskDate > eod) return false;
            }
            return true;
        });

        // B. Aggregate
        const aggregator: Record<string, ProjectBugData> = {};
        filteredRows.forEach(task => {
            const projectName = task.project_name || 'Unknown Project';

            if (!aggregator[projectName]) {
                aggregator[projectName] = { projectName, totalBugs: 0, htmlBugs: 0, functionalBugs: 0 };
            }
            aggregator[projectName].totalBugs += (Number(task.bug_count) || 0);
            aggregator[projectName].htmlBugs += (Number(task.html_bugs) || 0);
            aggregator[projectName].functionalBugs += (Number(task.functional_bugs) || 0);
        });

        let results = Object.values(aggregator).filter(p => p.totalBugs > 0);

        // C. Search Filter (by Project Name)
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            results = results.filter(p => p.projectName.toLowerCase().includes(lowerQuery));
        }

        // D. Sort
        results.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            // Numbers
            return sortConfig.direction === 'asc'
                ? (aValue as number) - (bValue as number)
                : (bValue as number) - (aValue as number);
        });

        return results;
    }, [rawData, searchQuery, startDate, endDate, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader size="lg" /></div>;

    const COLORS = { total: '#6366f1', html: '#ec4899', functional: '#eab308' };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header with Controls */}
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Bug className="text-rose-500" size={32} />
                        Bugs Report
                    </h1>
                    <p className="text-slate-500 mt-1">Overview of bugs reported across projects</p>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 w-full sm:w-[200px] bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
                        />
                    </div>

                    <div className="h-full w-px bg-slate-200 hidden sm:block mx-1"></div>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <DatePicker date={startDate} setDate={setStartDate} placeholder="Start Date" className="w-[130px] h-[38px] text-xs" />
                        </div>
                        <span className="text-slate-400 text-xs">to</span>
                        <div className="relative">
                            <DatePicker date={endDate} setDate={setEndDate} placeholder="End Date" className="w-[130px] h-[38px] text-xs" />
                        </div>
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(undefined); setEndDate(undefined); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Section (Hidden if no data) */}
            {processedData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                        <h3 className="font-bold text-lg text-slate-800 mb-6">Bugs Overview by Project</h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={processedData.slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="projectName" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
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
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-2xl border border-rose-100 shadow-sm">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-rose-100 rounded-xl text-rose-600"><Bug size={24} /></div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-rose-600/80">Total Bugs</p>
                                    <h4 className="text-2xl font-bold text-rose-900">{processedData.reduce((acc, curr) => acc + curr.totalBugs, 0)}</h4>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="p-2 bg-pink-100 rounded-lg text-pink-600 w-fit mb-3"><Code2 size={20} /></div>
                                <p className="text-xs text-slate-500 font-medium">HTML Bugs</p>
                                <h4 className="text-xl font-bold text-slate-800 mt-1">{processedData.reduce((acc, curr) => acc + curr.htmlBugs, 0)}</h4>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600 w-fit mb-3"><Zap size={20} /></div>
                                <p className="text-xs text-slate-500 font-medium">Functional</p>
                                <h4 className="text-xl font-bold text-slate-800 mt-1">{processedData.reduce((acc, curr) => acc + curr.functionalBugs, 0)}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 text-slate-400">
                    <Search size={48} className="opacity-20 mb-4" />
                    <p>No projects found matching your criteria.</p>
                </div>
            )}

            {/* Detailed Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Project Bug Breakdown</h3>
                    <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md">{processedData.length} projects found</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <SortHeader label="Project Name" sortKey="projectName" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label="HTML Bugs" sortKey="htmlBugs" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortHeader label="Functional Bugs" sortKey="functionalBugs" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortHeader label="Total Bugs" sortKey="totalBugs" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <th className="px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Share of Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedData.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No data available</td></tr>
                            ) : (
                                processedData.map((project, index) => {
                                    const globalTotal = processedData.reduce((acc, curr) => acc + curr.totalBugs, 0);
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
    );
}

// Helper Component for Sortable Headers
function SortHeader({ label, sortKey, currentSort, onSort, align = 'left' }: { label: string, sortKey: SortKey, currentSort: { key: SortKey, direction: 'asc' | 'desc' }, onSort: (key: SortKey) => void, align?: 'left' | 'center' | 'right' }) {
    const isActive = currentSort.key === sortKey;
    return (
        <th
            className={`px-6 py-4 font-semibold text-slate-600 uppercase tracking-wider text-xs cursor-pointer hover:bg-slate-100 transition-colors group ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
            onClick={() => onSort(sortKey)}
        >
            <div className={`flex items-center gap-2 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
                {label}
                <div className={`flex flex-col ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                    {isActive && currentSort.direction === 'asc' ? <ArrowUpDown size={14} className="rotate-180" /> : <ArrowUpDown size={14} />}
                </div>
            </div>
        </th>
    );
}
