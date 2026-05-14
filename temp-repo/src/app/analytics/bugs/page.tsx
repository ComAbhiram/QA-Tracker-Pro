'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGuestMode } from '@/contexts/GuestContext';
import { supabase } from '@/lib/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Loader from '@/components/ui/Loader';
import { AlertCircle, Bug, Code2, Zap, Search, ArrowUpDown, X, ChevronDown, ChevronRight, Clock, CheckCircle } from 'lucide-react';
import { DatePicker } from '@/components/DatePicker';
import { Task, mapTaskFromDB, DBTask } from '@/lib/types';

interface ProjectBugData {
    projectName: string;
    totalBugs: number;
    htmlBugs: number;
    functionalBugs: number;
    projectTasks: Task[];
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
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
        key: 'totalBugs',
        direction: 'desc'
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // 1. Fetch Raw Data (Once or when Team changes)
    useEffect(() => {
        const fetchTasks = async () => {
            if (isGuestLoading) return;
            setLoading(true);
            try {
                let query = supabase
                    .from('tasks')
                    .select('*');

                // Team Filtering
                if (isGuest) {
                    // Guest / Manager mode - filter by selected team
                    if (selectedTeamId) {
                        query = query.eq('team_id', selectedTeamId);
                    }
                } else {
                    // Logged-in user (e.g. QA Team / super_admin)
                    try {
                        const { getCurrentUserTeam } = await import('@/utils/userUtils');
                        const userTeam = await getCurrentUserTeam();
                        const { data: { user } } = await supabase.auth.getUser();
                        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user?.id).single();

                        // QA Team ID: ba60298b-8635-4cca-bcd5-7e470fad60e6
                        const isQA = profile?.role === 'super_admin' || userTeam?.team_id === 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

                        if (!isQA && userTeam?.team_id) {
                            query = query.eq('team_id', userTeam.team_id);
                        }
                    } catch (e) {
                        console.error('Error fetching user context for bugs:', e);
                    }
                }

                const { data, error } = await query;
                if (error) throw error;
                if (data) {
                    const mappedData = (data as DBTask[]).map(mapTaskFromDB);
                    setRawData(mappedData);
                }
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
        const filteredRows = (rawData as Task[]).filter(task => {
            // Date Filter (using start_date of task as "Project Date" proxy)
            if (startDate) {
                const taskDate = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
                if (taskDate < startDate) return false;
            }
            if (endDate) {
                const taskDate = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
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
            const projectName = task.projectName || 'Unknown Project';

            if (!aggregator[projectName]) {
                aggregator[projectName] = { projectName, totalBugs: 0, htmlBugs: 0, functionalBugs: 0, projectTasks: [] };
            }
            aggregator[projectName].totalBugs += (Number(task.bugCount) || 0);
            aggregator[projectName].htmlBugs += (Number(task.htmlBugs) || 0);
            aggregator[projectName].functionalBugs += (Number(task.functionalBugs) || 0);
            if ((Number(task.bugCount) || 0) > 0) {
                aggregator[projectName].projectTasks.push(task);
            }
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

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedData.slice(startIndex, startIndex + itemsPerPage);
    }, [processedData, currentPage]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, startDate, endDate]);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const toggleProject = (projectName: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(projectName)) {
                next.delete(projectName);
            } else {
                next.add(projectName);
            }
            return next;
        });
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader size="lg" /></div>;

    const COLORS = { total: '#6366f1', html: '#ec4899', functional: '#eab308' };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header with Controls */}
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <Bug className="text-rose-500 dark:text-rose-400" size={32} />
                        Bugs Report
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Overview of bugs reported across projects</p>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-none flex items-center">
                        <Search className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
                        />
                    </div>

                    <div className="h-full w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1"></div>

                    {/* Date Filters */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                        <div className="relative w-full sm:w-auto">
                            <DatePicker date={startDate} setDate={setStartDate} placeholder="Start Date" className="w-full sm:w-[130px] h-[38px] text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm" />
                        </div>
                        <span className="text-slate-400 dark:text-slate-500 text-xs hidden sm:inline">to</span>
                        <div className="relative w-full sm:w-auto mt-2 sm:mt-0">
                            <DatePicker date={endDate} setDate={setEndDate} placeholder="End Date" className="w-full sm:w-[130px] h-[38px] text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm" />
                        </div>
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(undefined); setEndDate(undefined); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Section (Hidden if no data) */}
            {processedData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col transition-colors">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-6">Bugs Overview by Project</h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={processedData.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 90 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-700 opacity-20" />
                                    <XAxis 
                                        dataKey="projectName" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: 'currentColor' }} 
                                        className="text-slate-500 dark:text-slate-400 text-[10px]" 
                                        interval={0} 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={100} 
                                        tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400 text-xs" />
                                    <Tooltip
                                        cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#fff' }} itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="top" height={36}/>
                                    <Bar dataKey="htmlBugs" name="HTML Bugs" stackId="a" fill={COLORS.html} radius={[0, 0, 4, 4]} barSize={40} />
                                    <Bar dataKey="functionalBugs" name="Functional Bugs" stackId="a" fill={COLORS.functional} radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-slate-800 p-6 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm transition-colors">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400"><Bug size={24} /></div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-rose-600/80 dark:text-rose-400/80">Total Bugs</p>
                                    <h4 className="text-2xl font-bold text-rose-900 dark:text-rose-100">{processedData.reduce((acc, curr) => acc + curr.totalBugs, 0)}</h4>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-pink-600 dark:text-pink-400 w-fit mb-3"><Code2 size={20} /></div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">HTML Bugs</p>
                                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{processedData.reduce((acc, curr) => acc + curr.htmlBugs, 0)}</h4>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400 w-fit mb-3"><Zap size={20} /></div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Functional</p>
                                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{processedData.reduce((acc, curr) => acc + curr.functionalBugs, 0)}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 transition-colors">
                    <Search size={48} className="opacity-20 mb-4" />
                    <p>No projects found matching your criteria.</p>
                </div>
            )}

            {/* Detailed Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Project Bug Breakdown</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">{processedData.length} projects found</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 border-collapse border border-slate-300 dark:border-slate-600">
                        <thead className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-300 dark:border-slate-600">
                            <tr>
                                <SortHeader label="Project Name" sortKey="projectName" currentSort={sortConfig} onSort={handleSort} />
                                <SortHeader label="HTML Bugs" sortKey="htmlBugs" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortHeader label="Functional Bugs" sortKey="functionalBugs" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <SortHeader label="Total Bugs" sortKey="totalBugs" currentSort={sortConfig} onSort={handleSort} align="center" />
                                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-xs border-r border-slate-300 dark:border-slate-600 last:border-r-0">Share of Total</th>
                            </tr>
                        </thead>
                        {processedData.length === 0 ? (
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">No data available</td></tr>
                            </tbody>
                        ) : (
                                (paginatedData as ProjectBugData[]).map((project, index) => {
                                    const globalTotal = processedData.reduce((acc, curr) => acc + curr.totalBugs, 0);
                                    const percentage = globalTotal > 0 ? Math.round((project.totalBugs / globalTotal) * 100) : 0;
                                    const isExpanded = expandedProjects.has(project.projectName);
                                    const tasksWithBugs = project.projectTasks;

                                    return (
                                        <tbody key={project.projectName} className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            <tr 
                                                className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-b border-slate-300 dark:border-slate-600 ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}
                                                onClick={() => toggleProject(project.projectName)}
                                            >
                                                <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-600">
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-slate-400 dark:text-slate-500">
                                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        </div>
                                                        {project.projectName}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-pink-600 dark:text-pink-400 font-medium bg-pink-50/10 dark:bg-pink-900/10 border-r border-slate-300 dark:border-slate-600">{project.htmlBugs}</td>
                                                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400 font-medium bg-yellow-50/10 dark:bg-yellow-900/10 border-r border-slate-300 dark:border-slate-600">{project.functionalBugs}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600">{project.totalBugs}</td>
                                                <td className="px-6 py-4 border-r-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                        </div>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 w-8">{percentage}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-slate-50/10 dark:bg-slate-900/10">
                                                    <td colSpan={5} className="px-6 py-4">
                                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-sm animate-in slide-in-from-top-1 duration-200">
                                                            <table className="w-full text-xs">
                                                                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                                    <tr>
                                                                        <th className="px-4 py-2 text-left font-semibold">Task Name</th>
                                                                        <th className="px-4 py-2 text-left font-semibold">Status</th>
                                                                        <th className="px-4 py-2 text-center font-semibold">HTML Bugs</th>
                                                                        <th className="px-4 py-2 text-center font-semibold">Functional</th>
                                                                        <th className="px-4 py-2 text-center font-semibold">Total Bugs</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                                    {tasksWithBugs.map((task) => (
                                                                        <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                                                                {task.subPhase || task.projectType || 'General Task'}
                                                                            </td>
                                                                            <td className="px-4 py-2">
                                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                                                                    task.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                                                                                    task.status === 'In Progress' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                                                                                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                                                }`}>
                                                                                    {task.status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-2 text-center text-pink-600 dark:text-pink-400 font-medium">{task.htmlBugs}</td>
                                                                            <td className="px-4 py-2 text-center text-yellow-600 dark:text-yellow-400 font-medium">{task.functionalBugs}</td>
                                                                            <td className="px-4 py-2 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/20">{task.bugCount}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    );
                                })
                            )}
                    </table>
                </div>

                {/* Pagination Controls */}
                {processedData.length > itemsPerPage && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, processedData.length)}</span> of <span className="font-medium">{processedData.length}</span> projects
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} className="rotate-180" />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.ceil(processedData.length / itemsPerPage) }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                                            currentPage === i + 1
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(Math.ceil(processedData.length / itemsPerPage), p + 1))}
                                disabled={currentPage === Math.ceil(processedData.length / itemsPerPage)}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper Component for Sortable Headers
function SortHeader({ label, sortKey, currentSort, onSort, align = 'left' }: { label: string, sortKey: SortKey, currentSort: { key: SortKey, direction: 'asc' | 'desc' }, onSort: (key: SortKey) => void, align?: 'left' | 'center' | 'right' }) {
    const isActive = currentSort.key === sortKey;
    return (
        <th
            className={`px-6 py-4 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group border-r border-slate-300 dark:border-slate-600 last:border-r-0 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
            onClick={() => onSort(sortKey)}
        >
            <div className={`flex items-center gap-2 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
                {label}
                <div className={`flex flex-col ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'}`}>
                    {isActive && currentSort.direction === 'asc' ? <ArrowUpDown size={14} className="rotate-180" /> : <ArrowUpDown size={14} />}
                </div>
            </div>
        </th>
    );
}
