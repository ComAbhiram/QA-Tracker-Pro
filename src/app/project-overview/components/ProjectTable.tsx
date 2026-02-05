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
        // New calculated fields
        allotted_time_days_calc?: number;
        hs_time_taken_days?: number;
        activity_percentage?: number;
        deviation_calc?: number;
    }>;
    onEdit: (project: any) => void;
    onDelete: (projectId: string) => void;
}

export default function ProjectTable({ projects, onEdit, onDelete }: ProjectTableProps) {
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

        // Specific handling for calculated fields if they are nested or named differently, 
        // but here they are top - level on the project object now.
        if (sortField === 'allotted_time_days') aVal = a.allotted_time_days_calc || 0;
        if (sortField === 'allotted_time_days') bVal = b.allotted_time_days_calc || 0;

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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('project_name')}>
                                <div className="flex items-center gap-2">
                                    Project Name
                                    <ArrowUpDown size={12} />
                                </div>
                            </th>
                            {/* Location column removed */}
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Resources</th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('activity_percentage')}>
                                <div className="flex items-center justify-center gap-2">
                                    Activity %
                                    <ArrowUpDown size={12} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">PC</th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('hs_time_taken_days')}>
                                <div className="flex items-center justify-center gap-2">
                                    HS Time (Days)
                                    <ArrowUpDown size={12} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('allotted_time_days_calc')}>
                                <div className="flex items-center justify-center gap-2">
                                    Allotted
                                    <ArrowUpDown size={12} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Deviation</th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('tl_confirmed_effort_days')}>
                                <div className="flex items-center justify-center gap-2">
                                    TL Effort
                                    <ArrowUpDown size={12} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Blockers</th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedProjects.map((project, index) => {
                            // Use calculated deviation from API
                            const deviation = project.deviation_calc;

                            return (
                                <tr
                                    key={project.id}
                                    className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                >
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                                        {project.project_name}
                                    </td>
                                    {/* Location cell removed */}
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        <div className="max-w-[200px] truncate" title={project.resources || ''}>
                                            {project.resources || '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center">
                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {project.activity_percentage != null ? `${project.activity_percentage}%` : '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center text-slate-600">
                                        {project.pc || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center font-medium text-slate-700">
                                        {project.hs_time_taken_days != null ? project.hs_time_taken_days.toFixed(2) : '0.00'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center font-medium text-slate-700">
                                        {project.allotted_time_days_calc != null ? project.allotted_time_days_calc.toFixed(2) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center font-bold">
                                        <span className={
                                            deviation === null || deviation === undefined ? 'text-slate-400' :
                                                deviation > 0 ? 'text-red-600' : // Positive deviation means Allotted > Time Taken? Wait. Deviation = Allotted - HS Time. If Allotted (5) - Time (3) = 2 (Under budget). If Allotted (5) - Time (7) = -2 (Over budget).
                                                    // Usually: Deviation = Time Taken - Allotted. But user asked: "Deviation : find automtically by Allotted -HS Time"
                                                    // So: Allotted (5) - HS (3) = +2 (Good). Allotted (5) - HS (7) = -2 (Bad).
                                                    deviation < 0 ? 'text-red-600' : 'text-green-600'
                                        }>
                                            {deviation !== null && deviation !== undefined ? deviation.toFixed(2) : '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center font-medium text-slate-700">
                                        {project.tl_confirmed_effort_days != null ? project.tl_confirmed_effort_days.toFixed(1) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        <div className="max-w-[150px] truncate" title={project.blockers || ''}>
                                            {project.blockers || '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onEdit(project)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(project.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
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
