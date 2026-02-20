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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Team Attendance & Activity <span className="text-xs font-normal text-slate-400 align-middle ml-2">v2.2</span></h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Hubstaff time tracking integration</p>
                </div>
            </div>

            {/* View Mode Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-2 flex flex-wrap md:flex-nowrap gap-2 transition-colors">
                <button
                    onClick={() => setViewMode('daily')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'daily'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                >
                    Daily View
                </button>
                <button
                    onClick={() => setViewMode('monthly')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'monthly'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                >
                    Monthly View
                </button>
                <button
                    onClick={() => setViewMode('hr-daily')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'hr-daily'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                >
                    For HR (Daily)
                </button>
                <button
                    onClick={() => setViewMode('custom-range')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'custom-range'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                >
                    Custom Range
                </button>
            </div>

            {/* Daily View */}
            {viewMode === 'daily' && (
                <>
                    {/* Date and Team Member Selectors */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Team Member
                                </label>
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                >
                                    <option value="">All Members</option>
                                    {teamMembers.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Select Date
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                            <button
                                onClick={fetchHubstaffData}
                                disabled={loading}
                                className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Total Time</div>
                                        <Clock className="text-sky-500" size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {formatDuration(activityData.totalTime)}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Team Members</div>
                                        <Users className="text-purple-500" size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {activityData.activities.length}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Avg Activity</div>
                                        <TrendingUp className="text-emerald-500" size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {(() => {
                                            const weightedActivity = activityData.activities.reduce((sum, a) => sum + (a.activityPercentage * a.timeWorked), 0);
                                            const activeTime = activityData.activities.reduce((sum, a) => sum + (a.activityPercentage > 0 ? a.timeWorked : 0), 0);
                                            if (activeTime === 0) return '0';
                                            return Math.round(weightedActivity / activeTime);
                                        })()}
                                        %
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Date</div>
                                        <Calendar className="text-blue-500" size={24} />
                                    </div>
                                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                        {new Date(selectedDate).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Team Activity Table */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Team Activity Breakdown</h2>
                                    <button
                                        onClick={exportReport}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-600 dark:bg-slate-500 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm"
                                    >
                                        <Download size={18} />
                                        Export Report
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">Team Member</th>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">Project</th>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">Time Worked</th>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300">Activity Level</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {activityData.activities.map((activity, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-50 dark:border-slate-700/50">
                                                        {activity.userName}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 border-r border-slate-50 dark:border-slate-700/50">
                                                        {activity.projectName || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 border-r border-slate-50 dark:border-slate-700/50">
                                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                                            {formatDuration(activity.timeWorked)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getActivityColor(activity.activityPercentage).replace('bg-emerald-50 text-emerald-700 border-emerald-200', 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50').replace('bg-blue-50 text-blue-700 border-blue-200', 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50').replace('bg-amber-50 text-amber-700 border-amber-200', 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50').replace('bg-red-50 text-red-700 border-red-200', 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50')}`}>
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
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-100 dark:border-slate-700 transition-colors">
                            <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={64} />
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">No Activity Data</h3>
                            <p className="text-slate-500 dark:text-slate-400">Select a date and click "Fetch Activity" to view team attendance data</p>
                        </div>
                    )}
                </>
            )}

            {/* Monthly View */}
            {viewMode === 'monthly' && (
                <>
                    {/* Month/Year Selectors */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Month
                                </label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>
                                            {getMonthName(month)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Year
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={fetchMonthlyData}
                                disabled={loading}
                                className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Total Time</div>
                                        <Clock className="text-sky-500" size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {formatTime(monthlyData.totalTime)}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Active QAs</div>
                                        <Users className="text-purple-500" size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {monthlyData.qaBreakdown.length}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Avg Activity</div>
                                        <TrendingUp className="text-emerald-500" size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {monthlyData.avgActivity}%
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Active Days</div>
                                        <Calendar className="text-blue-500" size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {monthlyData.totalDays}
                                    </div>
                                </div>
                            </div>

                            {/* QA Breakdown Table */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">QA Monthly Breakdown - {getMonthName(selectedMonth)} {selectedYear}</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">QA Name</th>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">Total Time</th>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">Avg Activity</th>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">Days Active</th>
                                                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300">Top Projects</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {monthlyData.qaBreakdown.map((qa, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-50 dark:border-slate-700/50">
                                                        {qa.qaName}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 border-r border-slate-50 dark:border-slate-700/50">
                                                        {formatTime(qa.totalTime)}
                                                    </td>
                                                    <td className="px-6 py-4 border-r border-slate-50 dark:border-slate-700/50">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getActivityColor(qa.avgActivity).replace('bg-emerald-50 text-emerald-700 border-emerald-200', 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50').replace('bg-blue-50 text-blue-700 border-blue-200', 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50').replace('bg-amber-50 text-amber-700 border-amber-200', 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50').replace('bg-red-50 text-red-700 border-red-200', 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50')}`}>
                                                            {qa.avgActivity}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 border-r border-slate-50 dark:border-slate-700/50">
                                                        {qa.daysActive}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
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
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-100 dark:border-slate-700 transition-colors">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-sky-500 mx-auto mb-4"></div>
                            <p className="text-slate-600 dark:text-slate-400">Fetching monthly data... This may take a moment.</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!monthlyData && !loading && !error && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-100 dark:border-slate-700 transition-colors">
                            <Calendar className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={64} />
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">No Monthly Data</h3>
                            <p className="text-slate-500 dark:text-slate-400">Select a month and year, then click "Fetch Monthly Data"</p>
                        </div>
                    )}
                </>
            )}

            {/* HR Daily View */}
            {viewMode === 'hr-daily' && (
                <>
                    {/* Date Selector */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Select Date
                                </label>
                                <input
                                    type="date"
                                    value={hrSelectedDate}
                                    onChange={(e) => setHrSelectedDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                            <button
                                onClick={fetchHRDailyData}
                                disabled={loading}
                                className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {loading ? 'Loading...' : 'Fetch Data'}
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

                    {/* HR Daily Data Table */}
                    {hrDailyData && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">HR Daily Report</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm"
                                >
                                    <FileSpreadsheet size={18} />
                                    Export CSV
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-800 dark:to-teal-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-white border-r border-white/20 text-sm">Department</th>
                                            <th className="px-4 py-3 text-left font-semibold text-white border-r border-white/20 text-sm">Name</th>
                                            <th className="px-4 py-3 text-left font-semibold text-white border-r border-white/20 text-sm">Floor Time</th>
                                            <th className="px-4 py-3 text-left font-semibold text-white border-r border-white/20 text-sm">HS TIME</th>
                                            <th className="px-4 py-3 text-left font-semibold text-white border-r border-white/20 text-sm">HS-%</th>
                                            <th className="px-4 py-3 text-left font-semibold text-white text-sm">Projects</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {hrDailyData.departments && hrDailyData.departments.map((dept: string, deptIndex: number) => {
                                            const members = hrDailyData.departmentData[dept] || [];
                                            if (members.length === 0) return null;

                                            return members.map((member: any, memberIndex: number) => (
                                                <tr
                                                    key={`${dept}-${memberIndex}`}
                                                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors ${deptIndex % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/30'
                                                        }`}
                                                >
                                                    {/* Department name only on first row of each department */}
                                                    {memberIndex === 0 ? (
                                                        <td
                                                            rowSpan={members.length}
                                                            className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-800/50 align-top"
                                                        >
                                                            {dept}
                                                        </td>
                                                    ) : null}
                                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-700/50">
                                                        {member.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-700/50 italic text-sm">
                                                        {/* Blank for HR to fill manually */}
                                                        -
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-700/50">
                                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                                            {member.timeWorked > 0 ? formatTime(member.timeWorked) : '0m'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-700/50">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${member.activityPercentage >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' :
                                                            member.activityPercentage >= 50 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' :
                                                                member.activityPercentage > 0 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' :
                                                                    'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'
                                                            }`}>
                                                            {member.activityPercentage}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">
                                                        {member.projects.length > 0 ? member.projects.join(', ') : 'N/A'}
                                                    </td>
                                                </tr>
                                            ));
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Row */}
                            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t-2 border-slate-200 dark:border-slate-700 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Total Team Members: {
                                            hrDailyData.departments ?
                                                hrDailyData.departments.reduce((sum: number, dept: string) =>
                                                    sum + (hrDailyData.departmentData[dept]?.length || 0), 0
                                                ) : 0
                                        }
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                        <span className="font-semibold">Note:</span> Floor Time column is blank for manual entry
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!hrDailyData && !loading && !error && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-100 dark:border-slate-700 transition-colors">
                            <FileSpreadsheet className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={64} />
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">No HR Data</h3>
                            <p className="text-slate-500 dark:text-slate-400">Select a date and click "Fetch Data" to view HR daily report</p>
                        </div>
                    )}
                </>
            )}

            {/* Custom Range View */}
            {viewMode === 'custom-range' && (
                <>
                    {/* Range Selectors */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={fetchCustomRangeData}
                                disabled={loading}
                                className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Total Time</div>
                                        <Clock className="text-sky-500" size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {formatDuration(customRangeData.totalTime)}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Team Members</div>
                                        <Users className="text-purple-500" size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {new Set(customRangeData.activities.map(a => a.userId)).size}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Avg Activity</div>
                                        <TrendingUp className="text-emerald-500" size={24} />
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                        {(() => {
                                            const weightedActivity = customRangeData.activities.reduce((sum, a) => sum + (a.activityPercentage * a.timeWorked), 0);
                                            const activeTime = customRangeData.activities.reduce((sum, a) => sum + (a.activityPercentage > 0 ? a.timeWorked : 0), 0);
                                            if (activeTime === 0) return '0';
                                            return Math.round(weightedActivity / activeTime);
                                        })()}
                                        %
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-slate-500 dark:text-slate-400">Range</div>
                                        <Calendar className="text-blue-500" size={24} />
                                    </div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
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
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-100 dark:border-slate-700 transition-colors">
                            <Calendar className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={64} />
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">No Range Data</h3>
                            <p className="text-slate-500 dark:text-slate-400">Select dates and click "Fetch Range" to view activity data</p>
                        </div>
                    )}
                </>
            )
            }
        </div >
    );
}
