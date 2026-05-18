'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, Clock, TrendingUp, Download, FileSpreadsheet } from 'lucide-react';
import { HubstaffDailyActivity, formatDuration, getActivityColor } from '@/lib/hubstaff';
import { formatTime, getMonthName, type MonthlyData } from '@/lib/hubstaff-utils';
import { mapHubstaffNameToQA } from '@/lib/hubstaff-name-mapping';
import CustomRangeTable from '@/components/CustomRangeTable';
import Combobox from '@/components/ui/Combobox';

interface TeamMember {
    id: number;
    name: string;
}

type ViewMode = 'daily' | 'monthly' | 'hr-daily' | 'custom-range';

export default function Attendance() {
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedUserId, setSelectedUserId] = useState<string>(''); // Empty = all members
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [activityData, setActivityData] = useState<HubstaffDailyActivity | null>(null);
    const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
    const [hrDailyData, setHrDailyData] = useState<any | null>(null); // Department-based structure
    const [hrSelectedDate, setHrSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Custom Range State
    const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [customRangeData, setCustomRangeData] = useState<HubstaffDailyActivity | null>(null);

    // Filter State for Custom Range
    const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [teams, setTeams] = useState<string[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string>('');

    const [error, setError] = useState<string | null>(null);

    // Fetch team members on component mount
    useEffect(() => {
        const fetchTeamMembers = async () => {
            try {
                const response = await fetch('/api/hubstaff/users');
                if (response.ok) {
                    const data = await response.json();
                    setTeamMembers(data.members || []);
                }
            } catch (err) {
                console.error('Error fetching team members:', err);
            }
        };

        const fetchProjects = async () => {
            try {
                const response = await fetch('/api/hubstaff/projects');
                if (response.ok) {
                    const data = await response.json();
                    setProjects(data.projects || []);
                }
            } catch (err) {
                console.error('Error fetching projects:', err);
            }
        };

        const fetchTeams = async () => {
            // Fetch distinct teams from recent activity data
            try {
                const response = await fetch('/api/hubstaff/teams');
                if (response.ok) {
                    const data = await response.json();
                    setTeams(data.teams || []);
                }
            } catch (err) {
                console.error('Error fetching teams:', err);
            }
        };

        fetchTeamMembers();
        fetchProjects();
        fetchTeams();
        fetchHubstaffData(); // Auto-fetch activity data for today
    }, []);

    const fetchHubstaffData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Build URL with optional userId parameter
            let url = `/api/hubstaff?date=${selectedDate}`;
            if (selectedUserId) {
                url += `&userId=${selectedUserId}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Failed to fetch Hubstaff data');
            }

            const data = await response.json();
            setActivityData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
            console.error('Error fetching Hubstaff data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyData = async () => {
        setLoading(true);
        setError(null);

        try {
            let url = `/api/hubstaff/monthly?month=${selectedMonth}&year=${selectedYear}`;
            if (selectedUserId) {
                url += `&userId=${selectedUserId}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Failed to fetch monthly data');
            }

            const data = await response.json();
            setMonthlyData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch monthly data');
            console.error('Error fetching monthly data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHRDailyData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch department-based HR data
            const url = `/api/hubstaff/hr-daily?date=${hrSelectedDate}`;
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch HR daily data');
            }

            const data = await response.json();
            setHrDailyData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch HR daily data');
            console.error('Error fetching HR daily data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomRangeData = async () => {
        setLoading(true);
        setError(null);
        setCustomRangeData(null);

        if (customStartDate > customEndDate) {
            setError('Start date cannot be after end date');
            setLoading(false);
            return;
        }

        try {
            let url = `/api/hubstaff?startDate=${customStartDate}&endDate=${customEndDate}`;
            if (selectedUserId) {
                url += `&userId=${selectedUserId}`;
            }
            if (selectedProjectId) {
                url += `&projectId=${selectedProjectId}`;
            }
            if (selectedTeam) {
                url += `&team=${encodeURIComponent(selectedTeam)}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Failed to fetch custom range data');
            }

            const data = await response.json();
            // Aggregate data if needed (the API now returns aggregated activities)
            // But we might need to massage it to match HubstaffDailyActivity if the API return type differs slightly
            // The API returns { date, totalTime, activities: [...] } which matches well enough
            setCustomRangeData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
            console.error('Error fetching custom range data:', err);
        } finally {
            setLoading(false);
        }
    };

    const exportReport = () => {
        if (!activityData) return;

        let report = `Hubstaff Activity Report - ${selectedDate}\n`;
        report += `Generated: ${new Date().toLocaleString()}\n\n`;
        report += `Total Time: ${formatDuration(activityData.totalTime)}\n`;
        report += `Team Members: ${activityData.activities.length}\n\n`;

        report += `=== TEAM BREAKDOWN ===\n`;
        activityData.activities.forEach(activity => {
            report += `\n${activity.userName}\n`;
            report += `  Time Worked: ${formatDuration(activity.timeWorked)}\n`;
            report += `  Activity: ${activity.activityPercentage}%\n`;
            if (activity.projectName) {
                report += `  Project: ${activity.projectName}\n`;
            }
        });

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hubstaff_report_${selectedDate}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportHRDailyReport = () => {
        if (!hrDailyData) return;

        // Create CSV format matching the department structure
        let csv = 'Department,Name,Floor Time,HS TIME,HS-%,Projects\n';

        hrDailyData.departments.forEach((dept: string) => {
            const members = hrDailyData.departmentData[dept] || [];
            members.forEach((member: any) => {
                const hsTime = member.timeWorked > 0 ? formatTime(member.timeWorked) : '0m';
                const projects = member.projects.length > 0 ? member.projects.join(' / ') : 'N/A';
                csv += `"${dept}","${member.name}","","${hsTime}",${member.activityPercentage}%,"${projects}"\n`;
            });
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hr_daily_report_${hrSelectedDate}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 tracking-tight flex items-center gap-2">
                        Team Attendance & Activity <span className="text-xs font-normal text-slate-500 align-middle ml-2 px-2.5 py-0.5 rounded-full bg-slate-900/60 border border-slate-800">v2.2</span>
                    </h1>
                    <p className="text-slate-400 mt-1 font-medium text-sm">Hubstaff time tracking integration & live diagnostics</p>
                </div>
            </div>

            {/* View Mode Tabs */}
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-1.5 flex flex-wrap md:flex-nowrap gap-1.5 transition-all">
                {(['daily', 'monthly', 'hr-daily', 'custom-range'] as ViewMode[]).map((mode) => {
                    const labelMap: Record<ViewMode, string> = {
                        daily: 'Daily View',
                        monthly: 'Monthly View',
                        'hr-daily': 'For HR (Daily)',
                        'custom-range': 'Custom Range'
                    };
                    const isActive = viewMode === mode;
                    return (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`flex-1 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 transform active:scale-95 ${
                                isActive
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/20 border-t border-white/10'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                            }`}
                        >
                            {labelMap[mode]}
                        </button>
                    );
                })}
            </div>

            {/* Daily View */}
            {viewMode === 'daily' && (
                <>
                    {/* Date and Team Member Selectors */}
                    <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 backdrop-blur-md transition-all">
                        <div className="flex flex-col md:flex-row gap-4 items-end flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-bold text-slate-300 mb-2">
                                    Team Member
                                </label>
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-slate-900/80 text-white font-semibold transition-all hover:border-slate-700"
                                >
                                    <option value="" className="bg-slate-950 text-white">All Members</option>
                                    {teamMembers.map((member) => (
                                        <option key={member.id} value={member.id} className="bg-slate-950 text-white">
                                            {member.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-bold text-slate-300 mb-2">
                                    Select Date
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-slate-900/80 text-white font-semibold transition-all hover:border-slate-700"
                                />
                            </div>
                            <button
                                onClick={fetchHubstaffData}
                                disabled={loading}
                                className="glint-effect px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                            >
                                {loading ? 'Loading...' : 'Fetch Activity'}
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                            <h3 className="font-semibold text-red-900 dark:text-red-400 mb-2">Error</h3>
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Activity Data */}
                    {activityData && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-amber-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Total Time</div>
                                        <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-amber-400">
                                            <Clock size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tight">
                                        {formatDuration(activityData.totalTime)}
                                    </div>
                                </div>

                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-purple-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Team Members</div>
                                        <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/20 text-purple-400">
                                            <Users size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tight">
                                        {activityData.activities.length}
                                    </div>
                                </div>

                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-emerald-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Avg Activity</div>
                                        <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
                                            <TrendingUp size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tight">
                                        {(() => {
                                            const weightedActivity = activityData.activities.reduce((sum, a) => sum + (a.activityPercentage * a.timeWorked), 0);
                                            const activeTime = activityData.activities.reduce((sum, a) => sum + (a.activityPercentage > 0 ? a.timeWorked : 0), 0);
                                            if (activeTime === 0) return '0';
                                            return Math.round(weightedActivity / activeTime);
                                        })()}
                                        %
                                    </div>
                                </div>

                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-blue-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Date</div>
                                        <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20 text-blue-400">
                                            <Calendar size={20} />
                                        </div>
                                    </div>
                                    <div className="text-lg font-extrabold text-white">
                                        {new Date(selectedDate).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Team Activity Table */}
                            <div className="glass-card-premium rounded-2xl border border-slate-800/80 overflow-hidden transition-all">
                                <div className="p-6 border-b border-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/20">
                                    <h2 className="text-xl font-bold text-white tracking-tight">Team Activity Breakdown</h2>
                                    <button
                                        onClick={exportReport}
                                        className="glint-effect flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-850 text-slate-200 border border-slate-750/80 rounded-xl hover:bg-slate-800 hover:text-white transition-all font-bold w-full sm:w-auto shadow-md"
                                    >
                                        <Download size={18} />
                                        Export Report
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-900/60 border-b border-slate-800/80">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-bold text-slate-300 border-r border-slate-800/50 uppercase tracking-wider text-xs">Team Member</th>
                                                <th className="px-6 py-4 text-left font-bold text-slate-300 border-r border-slate-800/50 uppercase tracking-wider text-xs">Project</th>
                                                <th className="px-6 py-4 text-left font-bold text-slate-300 border-r border-slate-800/50 uppercase tracking-wider text-xs">Time Worked</th>
                                                <th className="px-6 py-4 text-left font-bold text-slate-300 uppercase tracking-wider text-xs">Activity Level</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {activityData.activities.map((activity, index) => (
                                                <tr key={index} className="hover:bg-slate-800/20 transition-all duration-200">
                                                    <td className="px-6 py-4 font-bold text-white border-r border-slate-800/30 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                                                            {activity.userName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                        </div>
                                                        <span className="font-semibold">{activity.userName}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 border-r border-slate-800/30 font-medium">
                                                        {activity.projectName || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 border-r border-slate-800/30">
                                                        <span className="font-bold text-white">
                                                            {formatDuration(activity.timeWorked)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${getActivityColor(activity.activityPercentage).replace('bg-emerald-50 text-emerald-700 border-emerald-200', 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5').replace('bg-blue-50 text-blue-700 border-blue-200', 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5').replace('bg-amber-50 text-amber-700 border-amber-200', 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5').replace('bg-red-50 text-red-700 border-red-200', 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5')}`}>
                                                            {activity.activityPercentage}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Empty State */}
                    {!activityData && !loading && !error && (
                        <div className="glass-card-premium rounded-2xl p-12 text-center border border-slate-800/80 transition-all">
                            <Users className="mx-auto text-slate-500 mb-4 animate-bounce" size={48} />
                            <h3 className="text-xl font-bold text-white mb-2">No Activity Data</h3>
                            <p className="text-slate-400 text-sm max-w-md mx-auto">Select a date and click "Fetch Activity" to load real-time Hubstaff team diagnostics</p>
                        </div>
                    )}
                </>
            )}

            {/* Monthly View */}
            {viewMode === 'monthly' && (
                <>
                    {/* Month/Year Selectors */}
                    <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 backdrop-blur-md transition-all">
                        <div className="flex flex-col md:flex-row gap-4 items-end flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-bold text-slate-300 mb-2">
                                    Month
                                </label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-slate-900/80 text-white font-semibold transition-all hover:border-slate-700"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month} className="bg-slate-950 text-white">
                                            {getMonthName(month)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-bold text-slate-300 mb-2">
                                    Year
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-slate-900/80 text-white font-semibold transition-all hover:border-slate-700"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                        <option key={year} value={year} className="bg-slate-950 text-white">
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={fetchMonthlyData}
                                disabled={loading}
                                className="glint-effect px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                            >
                                {loading ? 'Loading...' : 'Fetch Monthly Data'}
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                            <h3 className="font-semibold text-red-900 dark:text-red-400 mb-2">Error</h3>
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Monthly Data */}
                    {monthlyData && (
                        <>
                            {/* Monthly Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-amber-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Total Time</div>
                                        <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-amber-400">
                                            <Clock size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tight">
                                        {formatTime(monthlyData.totalTime)}
                                    </div>
                                </div>

                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-purple-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Active QAs</div>
                                        <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/20 text-purple-400">
                                            <Users size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tight">
                                        {monthlyData.qaBreakdown.length}
                                    </div>
                                </div>

                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-emerald-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Avg Activity</div>
                                        <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
                                            <TrendingUp size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tight">
                                        {monthlyData.avgActivity}%
                                    </div>
                                </div>

                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-blue-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Active Days</div>
                                        <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20 text-blue-400">
                                            <Calendar size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tight">
                                        {monthlyData.totalDays}
                                    </div>
                                </div>
                            </div>

                            {/* QA Breakdown Table */}
                            <div className="glass-card-premium rounded-2xl border border-slate-800/80 overflow-hidden transition-all">
                                <div className="p-6 border-b border-slate-800/60 bg-slate-900/20">
                                    <h2 className="text-xl font-bold text-white tracking-tight">QA Monthly Breakdown - {getMonthName(selectedMonth)} {selectedYear}</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-900/60 border-b border-slate-800/80">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-bold text-slate-300 border-r border-slate-800/50 uppercase tracking-wider text-xs">QA Name</th>
                                                <th className="px-6 py-4 text-left font-bold text-slate-300 border-r border-slate-800/50 uppercase tracking-wider text-xs">Total Time</th>
                                                <th className="px-6 py-4 text-left font-bold text-slate-300 border-r border-slate-800/50 uppercase tracking-wider text-xs">Avg Activity</th>
                                                <th className="px-6 py-4 text-left font-bold text-slate-300 border-r border-slate-800/50 uppercase tracking-wider text-xs">Days Active</th>
                                                <th className="px-6 py-4 text-left font-bold text-slate-300 uppercase tracking-wider text-xs">Top Projects</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {monthlyData.qaBreakdown.map((qa, index) => (
                                                <tr key={index} className="hover:bg-slate-800/20 transition-all duration-200">
                                                    <td className="px-6 py-4 font-bold text-white border-r border-slate-800/30 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                                                            {qa.qaName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                        </div>
                                                        <span className="font-semibold">{qa.qaName}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 border-r border-slate-800/30 font-medium">
                                                        {formatTime(qa.totalTime)}
                                                    </td>
                                                    <td className="px-6 py-4 border-r border-slate-800/30">
                                                        <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${getActivityColor(qa.avgActivity).replace('bg-emerald-50 text-emerald-700 border-emerald-200', 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5').replace('bg-blue-50 text-blue-700 border-blue-200', 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5').replace('bg-amber-50 text-amber-700 border-amber-200', 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5').replace('bg-red-50 text-red-700 border-red-200', 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5')}`}>
                                                            {qa.avgActivity}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 border-r border-slate-800/30 font-medium">
                                                        {qa.daysActive}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 font-medium">
                                                        {qa.projects.slice(0, 2).map(p => p.projectName).join(', ')}
                                                        {qa.projects.length > 2 && ` +${qa.projects.length - 2} more`}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="glass-card-premium rounded-2xl p-12 text-center border border-slate-800/80 transition-all">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500 mx-auto mb-4"></div>
                            <p className="text-slate-400 font-medium">Fetching monthly analytics... This may take a moment.</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!monthlyData && !loading && !error && (
                        <div className="glass-card-premium rounded-2xl p-12 text-center border border-slate-800/80 transition-all">
                            <Calendar className="mx-auto text-slate-500 mb-4 animate-pulse" size={48} />
                            <h3 className="text-xl font-bold text-white mb-2">No Monthly Data</h3>
                            <p className="text-slate-400 text-sm max-w-md mx-auto">Select a month and year, then click "Fetch Monthly Data" to compile team records</p>
                        </div>
                    )}
                </>
            )}

            {/* HR Daily View */}
            {viewMode === 'hr-daily' && (
                <>
                    {/* Date Selector */}
                    <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 backdrop-blur-md transition-all">
                        <div className="flex flex-col md:flex-row gap-4 items-end flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-bold text-slate-300 mb-2">
                                    Select Date
                                </label>
                                <input
                                    type="date"
                                    value={hrSelectedDate}
                                    onChange={(e) => setHrSelectedDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-slate-900/80 text-white font-semibold transition-all hover:border-slate-700"
                                />
                            </div>
                            <button
                                onClick={fetchHRDailyData}
                                disabled={loading}
                                className="glint-effect px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                            >
                                {loading ? 'Loading...' : 'Fetch Data'}
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mt-4">
                            <h3 className="font-bold text-red-400 mb-2">Error</h3>
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    {/* HR Daily Data Table */}
                    {hrDailyData && (
                        <div className="glass-card-premium rounded-2xl border border-slate-800/80 overflow-hidden transition-all mt-6">
                            <div className="p-6 border-b border-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/20">
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">HR Daily Report</h2>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {new Date(hrSelectedDate).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <button
                                    onClick={exportHRDailyReport}
                                    className="glint-effect flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-500/20 rounded-xl transition-all font-bold w-full sm:w-auto shadow-md"
                                >
                                    <FileSpreadsheet size={18} />
                                    Export CSV
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80">
                                        <tr>
                                            <th className="px-4 py-3.5 text-left font-bold text-slate-300 border-r border-slate-800/50 text-xs uppercase tracking-wider">Department</th>
                                            <th className="px-4 py-3.5 text-left font-bold text-slate-300 border-r border-slate-800/50 text-xs uppercase tracking-wider">Name</th>
                                            <th className="px-4 py-3.5 text-left font-bold text-slate-300 border-r border-slate-800/50 text-xs uppercase tracking-wider">Floor Time</th>
                                            <th className="px-4 py-3.5 text-left font-bold text-slate-300 border-r border-slate-800/50 text-xs uppercase tracking-wider">HS TIME</th>
                                            <th className="px-4 py-3.5 text-left font-bold text-slate-300 border-r border-slate-800/50 text-xs uppercase tracking-wider">HS-%</th>
                                            <th className="px-4 py-3.5 text-left font-bold text-slate-300 text-xs uppercase tracking-wider">Projects</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {hrDailyData.departments && hrDailyData.departments.map((dept: string, deptIndex: number) => {
                                            const members = hrDailyData.departmentData[dept] || [];
                                            if (members.length === 0) return null;

                                            return members.map((member: any, memberIndex: number) => (
                                                <tr
                                                    key={`${dept}-${memberIndex}`}
                                                    className={`hover:bg-slate-800/20 transition-colors ${deptIndex % 2 === 0 ? 'bg-slate-950/20' : 'bg-slate-900/10'}`}
                                                >
                                                    {/* Department name only on first row of each department */}
                                                    {memberIndex === 0 ? (
                                                        <td
                                                            rowSpan={members.length}
                                                            className="px-4 py-3 font-bold text-white border-r border-slate-800/80 bg-slate-900/40 align-top text-sm"
                                                        >
                                                            {dept}
                                                        </td>
                                                    ) : null}
                                                    <td className="px-4 py-3 font-bold text-white border-r border-slate-800/40 text-sm flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold uppercase shadow-sm">
                                                            {member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                                        </div>
                                                        <span className="font-semibold">{member.name}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 border-r border-slate-800/40 italic text-sm">
                                                        {/* Blank for HR to fill manually */}
                                                        -
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-slate-800/40 text-sm">
                                                        <span className="font-bold text-white">
                                                            {member.timeWorked > 0 ? formatTime(member.timeWorked) : '0m'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-slate-800/40">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${member.activityPercentage >= 70 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            member.activityPercentage >= 50 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                member.activityPercentage > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                    'bg-red-505/10 text-red-400 border-red-500/20'
                                                            }`}>
                                                            {member.activityPercentage}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400 text-xs font-medium">
                                                        {member.projects.length > 0 ? member.projects.join(', ') : 'N/A'}
                                                    </td>
                                                </tr>
                                            ));
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Row */}
                            <div className="bg-slate-900/40 px-6 py-4 border-t border-slate-800/60 transition-colors">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div className="text-sm font-bold text-white">
                                        Total Team Members: {
                                            hrDailyData.departments ?
                                                hrDailyData.departments.reduce((sum: number, dept: string) =>
                                                    sum + (hrDailyData.departmentData[dept]?.length || 0), 0
                                                ) : 0
                                        }
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        <span className="font-semibold text-amber-400">Note:</span> Floor Time column is left blank intentionally for manual entry
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!hrDailyData && !loading && !error && (
                        <div className="glass-card-premium rounded-2xl p-12 text-center border border-slate-800/80 transition-all mt-6">
                            <FileSpreadsheet className="mx-auto text-slate-500 mb-4 animate-bounce" size={48} />
                            <h3 className="text-xl font-bold text-white mb-2">No HR Data</h3>
                            <p className="text-slate-400 text-sm max-w-md mx-auto">Select a date and click "Fetch Data" to render department structured ledger reports</p>
                        </div>
                    )}
                </>
            )}

            {/* Custom Range View */}
            {viewMode === 'custom-range' && (
                <>
                    {/* Range Selectors */}
                    <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 backdrop-blur-md transition-all">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">
                                    Team Member
                                </label>
                                <Combobox
                                    options={[{ id: '', label: 'All Members' }, ...teamMembers.map(m => ({ id: String(m.id), label: m.name }))]}
                                    value={selectedUserId}
                                    onChange={(val) => setSelectedUserId(val ? String(val) : '')}
                                    placeholder="Select Member..."
                                    searchPlaceholder="Search members..."
                                    emptyMessage="No members found."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">
                                    Project
                                </label>
                                <Combobox
                                    options={[{ id: '', label: 'All Projects' }, ...projects.map(p => ({ id: String(p.id), label: p.name }))]}
                                    value={selectedProjectId}
                                    onChange={(val) => setSelectedProjectId(val ? String(val) : '')}
                                    placeholder="Select Project..."
                                    searchPlaceholder="Search projects..."
                                    emptyMessage="No projects found."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">
                                    Team
                                </label>
                                <Combobox
                                    options={[{ id: '', label: 'All Teams' }, ...teams.map(t => ({ id: t, label: t }))]}
                                    value={selectedTeam}
                                    onChange={(val) => setSelectedTeam(val ? String(val) : '')}
                                    placeholder="Select Team..."
                                    searchPlaceholder="Search teams..."
                                    emptyMessage="No teams found."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-slate-900/80 text-white font-semibold transition-all hover:border-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-slate-900/80 text-white font-semibold transition-all hover:border-slate-700"
                                />
                            </div>
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={fetchCustomRangeData}
                                disabled={loading}
                                className="glint-effect px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                            >
                                {loading ? 'Loading...' : 'Fetch Range'}
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                            <h3 className="font-semibold text-red-900 dark:text-red-400 mb-2">Error</h3>
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Custom Range Data */}
                    {customRangeData && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 mt-6">
                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-amber-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Total Time</div>
                                        <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-amber-400">
                                            <Clock size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tight">
                                        {formatDuration(customRangeData.totalTime)}
                                    </div>
                                </div>

                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-purple-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Team Members</div>
                                        <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/20 text-purple-400">
                                            <Users size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tight">
                                        {new Set(customRangeData.activities.map(a => a.userId)).size}
                                    </div>
                                </div>

                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-emerald-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Avg Activity</div>
                                        <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
                                            <TrendingUp size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-white tracking-tight">
                                        {(() => {
                                            const weightedActivity = customRangeData.activities.reduce((sum, a) => sum + (a.activityPercentage * a.timeWorked), 0);
                                            const activeTime = customRangeData.activities.reduce((sum, a) => sum + (a.activityPercentage > 0 ? a.timeWorked : 0), 0);
                                            if (activeTime === 0) return '0';
                                            return Math.round(weightedActivity / activeTime);
                                        })()}
                                        %
                                    </div>
                                </div>

                                <div className="glass-card-premium rounded-2xl p-6 border border-slate-800/80 transition-all hover:translate-y-[-2px] hover:border-blue-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-400 font-medium text-sm">Range</div>
                                        <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20 text-blue-400">
                                            <Calendar size={20} />
                                        </div>
                                    </div>
                                    <div className="text-sm font-extrabold text-white">
                                        {new Date(customStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(customEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>

                            {/* New Hierarchical Table */}
                            <CustomRangeTable activities={customRangeData.activities} />
                        </>
                    )}

                    {/* Empty State */}
                    {!customRangeData && !loading && !error && (
                        <div className="glass-card-premium rounded-2xl p-12 text-center border border-slate-800/80 transition-all mt-6">
                            <Calendar className="mx-auto text-slate-500 mb-4 animate-bounce" size={48} />
                            <h3 className="text-xl font-bold text-white mb-2">No Range Data</h3>
                            <p className="text-slate-400 text-sm max-w-md mx-auto">Select dates and click "Fetch Range" to generate advanced range reports</p>
                        </div>
                    )}
                </>
            )
            }
        </div >
    );
}
