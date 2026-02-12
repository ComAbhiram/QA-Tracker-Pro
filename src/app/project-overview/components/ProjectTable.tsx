'use client';

import { Edit, Trash2, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
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

import ResizableHeader from '@/components/ui/ResizableHeader';
import useColumnResizing from '@/hooks/useColumnResizing';

export default function ProjectTable({ projects, onEdit, onDelete }: ProjectTableProps) {
    const [sortField, setSortField] = useState<string>('project_name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Column Resizing Hook
    const { columnWidths, startResizing } = useColumnResizing({
        project_name: 250,
        resources: 200,
        activity_percentage: 100,
        pc: 80,
        hs_time_taken_days: 100,
        allotted_time_days_calc: 100,
        deviation_calc: 100,
        tl_confirmed_effort_days: 100,
        blockers: 150,
        actions: 100
    });

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

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentProjects = sortedProjects.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                <table className="w-full text-xs text-slate-800 border-collapse table-fixed border border-slate-400">
                    <thead className="bg-slate-50 text-slate-900">
                        <tr className="border-b border-slate-500">
                            <ResizableHeader label="Project Name" sortKey="project_name" widthKey="project_name" width={columnWidths.project_name} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} />
                            <ResizableHeader label="Resources" widthKey="resources" width={columnWidths.resources} isSortable={false} onResizeStart={startResizing} />
                            <ResizableHeader label="Activity %" sortKey="activity_percentage" widthKey="activity_percentage" width={columnWidths.activity_percentage} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="PC" sortKey="pc" widthKey="pc" width={columnWidths.pc} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="HS Time (Days)" sortKey="hs_time_taken_days" widthKey="hs_time_taken_days" width={columnWidths.hs_time_taken_days} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="Allotted" sortKey="allotted_time_days_calc" widthKey="allotted_time_days_calc" width={columnWidths.allotted_time_days_calc} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="Deviation" widthKey="deviation_calc" width={columnWidths.deviation_calc} isSortable={false} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="TL Effort" sortKey="tl_confirmed_effort_days" widthKey="tl_confirmed_effort_days" width={columnWidths.tl_confirmed_effort_days} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="Blockers" widthKey="blockers" width={columnWidths.blockers} isSortable={false} onResizeStart={startResizing} />
                            <ResizableHeader label="Actions" widthKey="actions" width={columnWidths.actions} isSortable={false} onResizeStart={startResizing} className="text-center" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentProjects.map((project, index) => {
                            const deviation = project.deviation_calc;

                            return (
                                <tr
                                    key={`${project.id}-${index}`}
                                    className={`hover:bg-slate-50 transition-colors border-b border-slate-400 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                >
                                    <td className="px-2 py-2 truncate font-bold text-slate-900 border-r border-slate-400" title={project.project_name}>
                                        {project.project_name}
                                    </td>
                                    <td className="px-2 py-2 truncate text-slate-800 border-r border-slate-400">
                                        <div className="truncate" title={project.resources || ''}>
                                            {project.resources || '-'}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 text-center border-r border-slate-400">
                                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                                            {project.activity_percentage != null ? `${project.activity_percentage}%` : '-'}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 text-center text-slate-800 border-r border-slate-400">
                                        {project.pc || '-'}
                                    </td>
                                    <td className="px-2 py-2 text-center font-medium text-slate-800 border-r border-slate-400">
                                        {project.hs_time_taken_days != null ? project.hs_time_taken_days.toFixed(2) : '0.00'}
                                    </td>
                                    <td className="px-2 py-2 text-center font-medium text-slate-800 border-r border-slate-400">
                                        {project.allotted_time_days_calc != null ? project.allotted_time_days_calc.toFixed(2) : '-'}
                                    </td>
                                    <td className="px-2 py-2 text-center font-bold border-r border-slate-400">
                                        <span className={
                                            deviation === null || deviation === undefined ? 'text-slate-400' :
                                                deviation > 0 ? 'text-red-700' :
                                                    deviation < 0 ? 'text-red-700' : 'text-green-700'
                                        }>
                                            {deviation !== null && deviation !== undefined ? deviation.toFixed(2) : '-'}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 text-center font-medium text-slate-800 border-r border-slate-400">
                                        {project.tl_confirmed_effort_days != null ? project.tl_confirmed_effort_days.toFixed(1) : '-'}
                                    </td>
                                    <td className="px-2 py-2 truncate text-slate-800 border-r border-slate-400">
                                        <div className="truncate" title={project.blockers || ''}>
                                            {project.blockers || '-'}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => onEdit(project)}
                                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(project.id)}
                                                className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                    Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, projects.length)}</span> of <span className="font-medium">{projects.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-medium text-slate-600 min-w-[3rem] text-center">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
