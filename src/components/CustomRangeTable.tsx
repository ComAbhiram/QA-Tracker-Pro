import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getActivityColor } from '@/lib/hubstaff';

interface HubstaffActivity {
    userId: number;
    userName: string;
    projectId?: number;
    projectName?: string;
    timeWorked: number;
    activityPercentage: number;
    date: string;
    team?: string;
}

interface CustomRangeTableProps {
    activities: HubstaffActivity[];
}

interface DateGroup {
    date: string;
    totalTime: number;
    weightedActivitySum: number;
    activeTimeSum: number;
    avgActivity: number;
    activities: HubstaffActivity[];
    projectCount: number;
    distinctProjects: string[];
}

export default function CustomRangeTable({ activities }: CustomRangeTableProps) {
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

    const toggleDate = (date: string) => {
        const newExpanded = new Set(expandedDates);
        if (newExpanded.has(date)) {
            newExpanded.delete(date);
        } else {
            newExpanded.add(date);
        }
        setExpandedDates(newExpanded);
    };

    // Group activities by date
    const groupedMap = activities.reduce((acc, activity) => {
        if (!acc[activity.date]) {
            acc[activity.date] = {
                date: activity.date,
                totalTime: 0,
                weightedActivitySum: 0,
                activeTimeSum: 0,
                activities: [],
                projects: new Set(),
                clients: new Set()
            };
        }

        const group = acc[activity.date];
        group.totalTime += activity.timeWorked;
        // Calculation for weighted average
        group.weightedActivitySum += (activity.activityPercentage * activity.timeWorked);
        if (activity.activityPercentage > 0) {
            group.activeTimeSum += activity.timeWorked;
        }
        group.activities.push(activity);
        if (activity.projectName) {
            group.projects.add(activity.projectName);
            // Assuming Client is part of project name or we don't have it explicitly. 
            // The screenshot shows "Client / Project", often Hubstaff projects are "Client Name / Project Name"
            // We'll leave Client column empty or try to parse if needed. For now '-' as per screenshot.
        }

        return acc;
    }, {} as Record<string, any>);

    // Convert map to array and sort by date Ascending
    const tableData: DateGroup[] = Object.values(groupedMap).map((group: any) => ({
        date: group.date,
        totalTime: group.totalTime,
        weightedActivitySum: group.weightedActivitySum,
        activeTimeSum: group.activeTimeSum,
        avgActivity: group.activeTimeSum > 0 ? Math.round(group.weightedActivitySum / group.activeTimeSum) : 0,
        activities: group.activities,
        projectCount: group.projects.size,
        distinctProjects: Array.from(group.projects) as string[]
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTimeHHMMSS = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left font-bold text-slate-700 w-10">
                                {/* Sort Icon placeholder if needed */}
                            </th>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">Date</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">Client</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">Project</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">Team</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">To-do</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">Regular hours</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">Total hours</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">Activity %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tableData.map((group) => {
                            const isExpanded = expandedDates.has(group.date);
                            return (
                                <>
                                    {/* Group Header Row */}
                                    <tr
                                        key={group.date}
                                        className="bg-slate-50/30 hover:bg-slate-50 cursor-pointer transition-colors"
                                        onClick={() => toggleDate(group.date)}
                                    >
                                        <td className="px-4 py-3 text-slate-500">
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                                            {formatDate(group.date)} ({group.activities.length})
                                        </td>
                                        <td className="px-4 py-3 text-slate-400">-</td>
                                        <td className="px-4 py-3 text-slate-800 font-medium">
                                            {group.projectCount > 1
                                                ? <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">{group.projectCount} Projects</span>
                                                : group.distinctProjects[0] || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {group.activities[0]?.team || 'Unknown Team'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400">-</td>
                                        <td className="px-4 py-3 text-slate-800 font-medium">
                                            {formatTimeHHMMSS(group.totalTime)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-800 font-bold">
                                            {formatTimeHHMMSS(group.totalTime)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-slate-700">{group.avgActivity}%</span>
                                        </td>
                                    </tr>

                                    {/* Expanded Details Rows */}
                                    {isExpanded && group.activities.map((activity, idx) => (
                                        <tr key={`${group.date}-${idx}`} className="bg-white hover:bg-slate-50/50">
                                            <td className="px-4 py-3"></td>
                                            {/* User Column - Indented and showing Avatar/Name */}
                                            <td className="px-4 py-3 pl-12 flex items-center gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center text-xs font-bold uppercase">
                                                    {activity.userName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                </div>
                                                <span className="text-slate-800 font-bold text-sm">{activity.userName}</span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">-</td>
                                            <td className="px-4 py-3 text-slate-700 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                    {activity.projectName ? activity.projectName.substring(0, 2).toUpperCase() : 'NA'}
                                                </div>
                                                <span className="font-semibold text-sm">{activity.projectName || 'Unknown'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 font-medium text-sm">
                                                {activity.team || 'Unknown Team'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">-</td>
                                            <td className="px-4 py-3 text-slate-600 text-sm font-medium">
                                                {formatTimeHHMMSS(activity.timeWorked)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 text-sm font-bold">
                                                {formatTimeHHMMSS(activity.timeWorked)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 text-sm font-bold">
                                                {activity.activityPercentage}%
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
