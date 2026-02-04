'use client';

import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

interface ProjectTableProps {
    projects: Array<{
        id: string;
        project_name: string;
        location: string | null;
        pc: string | null;
        allotted_time_days: number | null;
        tl_confirmed_effort_days: number | null;
        blockers: string | null;
        task_count: number;
        resources: string | null;
    }>;
    hubstaffDataCache: Record<string, {
        hs_time_taken_days: number;
        activity_percentage: number;
        team_breakdown: {
            design_days: number;
            fe_dev_days: number;
            be_dev_days: number;
            testing_days: number;
        };
        member_activities: Array<{
            user_name: string;
            activity_percentage: number;
        }>;
    }>;
    onEdit: (project: any) => void;
    onDelete: (projectId: string) => void;
}

export default function ProjectTable({ projects, hubstaffDataCache, onEdit, onDelete }: ProjectTableProps) {
    const [sortField, setSortField] = useState<string>('project_name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedProjects = [...projects].sort((a, b) => {
        let aVal: any = a[sortField as keyof typeof a];
        let bVal: any = b[sortField as keyof typeof b];

        // Handle Hubstaff data sorting
        if (sortField === 'hs_time_taken_days' || sortField === 'activity_percentage') {
            aVal = hubstaffDataCache[a.project_name]?.[sortField as keyof typeof hubstaffDataCache[string]] || 0;
            bVal = hubstaffDataCache[b.project_name]?.[sortField as keyof typeof hubstaffDataCache[string]] || 0;
        }

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'string') {
            return sortDirection === 'asc'
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-indigo-600" onClick={() => handleSort('project_name')}>
                                <div className="flex items-center gap-2">
                                    Project Name
                                    <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-indigo-600" onClick={() => handleSort('location')}>
                                <div className="flex items-center gap-2">
                                    Location
                                    <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Resources</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold cursor-pointer hover:bg-indigo-600" onClick={() => handleSort('activity_percentage')}>
                                <div className="flex items-center justify-center gap-2">
                                    Activity %
                                    <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">PC</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold cursor-pointer hover:bg-indigo-600" onClick={() => handleSort('hs_time_taken_days')}>
                                <div className="flex items-center justify-center gap-2">
                                    HS Time
                                    <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold cursor-pointer hover:bg-indigo-600" onClick={() => handleSort('allotted_time_days')}>
                                <div className="flex items-center justify-center gap-2">
                                    Allotted
                                    <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">Deviation</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold cursor-pointer hover:bg-indigo-600" onClick={() => handleSort('tl_confirmed_effort_days')}>
                                <div className="flex items-center justify-center gap-2">
                                    TL Effort
                                    <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Blockers</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedProjects.map((project, index) => {
                            const hubstaffData = hubstaffDataCache[project.project_name];
                            const deviation = project.allotted_time_days && hubstaffData
                                ? project.allotted_time_days - hubstaffData.hs_time_taken_days
                                : null;

                            return (
                                <tr
                                    key={project.id}
                                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                        }`}
                                >
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                                        {project.project_name}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {project.location || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        <div className="max-w-[150px] truncate" title={project.resources || ''}>
                                            {project.resources || '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center relative group">
                                        <div className="inline-flex items-center justify-center px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold cursor-help">
                                            {hubstaffData?.activity_percentage != null ? `${hubstaffData.activity_percentage}%` : '-'}
                                        </div>
                                        {hubstaffData?.member_activities && hubstaffData.member_activities.length > 0 && (
                                            <div className="absolute z-20 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-slate-200 rounded-lg shadow-xl p-3 min-w-[180px]">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Member Activity</p>
                                                {hubstaffData.member_activities.map((member, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-[11px] mb-1">
                                                        <span className="text-slate-600 truncate mr-2">{member.user_name}</span>
                                                        <span className="font-bold text-indigo-600">{member.activity_percentage}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {project.pc || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center font-semibold text-slate-700 relative group">
                                        <span className="cursor-help">{hubstaffData?.hs_time_taken_days != null ? hubstaffData.hs_time_taken_days.toFixed(2) : '-'}</span>
                                        {hubstaffData?.team_breakdown && (
                                            <div className="absolute z-20 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-slate-200 rounded-lg shadow-xl p-3 min-w-[150px]">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-100 pb-1">Team Breakdown</p>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[11px] text-purple-600">
                                                        <span>Design:</span> <span>{hubstaffData.team_breakdown.design_days.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] text-blue-600">
                                                        <span>FE Dev:</span> <span>{hubstaffData.team_breakdown.fe_dev_days.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] text-green-600">
                                                        <span>BE Dev:</span> <span>{hubstaffData.team_breakdown.be_dev_days.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] text-orange-600">
                                                        <span>Testing:</span> <span>{hubstaffData.team_breakdown.testing_days.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center font-semibold text-slate-700">
                                        {project.allotted_time_days != null ? project.allotted_time_days.toFixed(1) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center font-bold">
                                        <span className={
                                            deviation === null ? 'text-slate-400' :
                                                deviation > 0 ? 'text-green-600' :
                                                    deviation < 0 ? 'text-red-600' :
                                                        'text-slate-700'
                                        }>
                                            {deviation !== null ? deviation.toFixed(1) : '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center font-semibold text-slate-700">
                                        {project.tl_confirmed_effort_days != null ? project.tl_confirmed_effort_days.toFixed(1) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        <div className="max-w-[150px] truncate" title={project.blockers || ''}>
                                            {project.blockers || '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onEdit(project)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(project.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
