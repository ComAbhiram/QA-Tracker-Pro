'use client';

import { Edit, Trash2, ArrowUpDown, ChevronDown, ChevronRight, CheckCircle, AlertCircle, Clock, ChevronLeft, Save, X } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Task } from '@/lib/types'; // Import Task type
import ResizableHeader from '@/components/ui/ResizableHeader';
import useColumnResizing from '@/hooks/useColumnResizing';

interface BudgetTableProps {
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
    tasks: Task[]; // Add tasks prop
    onEdit: (project: any) => void;
    onDelete: (projectId: string) => void;
    onUpdateProject: (id: string, data: any) => Promise<void>; // New prop for inline updates
}

export default function BudgetTable({ projects, tasks, onEdit, onDelete, onUpdateProject }: BudgetTableProps) {
    const [sortField, setSortField] = useState<string>('project_name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

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

    const toggleExpand = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
    };

    // Aggregate Data per Project
    const projectsWithAggregates = useMemo(() => {
        return projects.map(project => {
            // Find tasks for this project
            // Match primarily by project name (case-insensitive) as IDs might not link perfectly in this overview view
            const projectTasks = tasks.filter(t =>
                t.projectName?.trim().toLowerCase() === project.project_name?.trim().toLowerCase()
            );

            // Calculate Aggregates
            const totalAllotted = projectTasks.reduce((sum, t) => sum + (Number(t.daysAllotted) || 0), 0);

            let totalTimeTakenSeconds = 0;
            projectTasks.forEach(t => {
                if (t.timeTaken) {
                    const parts = t.timeTaken.split(':').map(Number);
                    if (parts.length === 3) {
                        totalTimeTakenSeconds += (parts[0] * 3600) + (parts[1] * 60) + parts[2];
                    }
                }
            });
            const totalTimeTakenDays = totalTimeTakenSeconds / (3600 * 8); // Assuming 8 hour work day

            // Calculate Deviation: Allotted - Taken (Positive = Under/On Time, Negative = Overdue/Late?) 
            // WAIT: Deviation logic in Task is usually (Taken - Allotted) or vice versa?
            // Existing code used: stats.totalAllottedDays - timeTakenDays. 
            // Let's stick to that: Positive = Under Budget (Good), Negative = Over Budget (Bad).
            const deviation = totalAllotted - totalTimeTakenDays;

            // Activity %: Average? Or Weighted?
            // Existing logic: Sum of activity percentage. That is weird for a % field. 
            // Usually it should be Average. But existing API was doing SUM.
            // Let's do Average for meaningful display, or Weighted by Days?
            // For now, let's do Average of non-zero tasks field
            const activeTasks = projectTasks.filter(t => t.activityPercentage !== null);
            const avgActivity = activeTasks.length > 0
                ? activeTasks.reduce((sum, t) => sum + (Number(t.activityPercentage) || 0), 0) / activeTasks.length
                : 0;

            // Resources: Collect unique assignees
            const uniqueResources = new Set<string>();
            projectTasks.forEach(t => {
                if (t.assignedTo) uniqueResources.add(t.assignedTo);
                if (t.assignedTo2) uniqueResources.add(t.assignedTo2);
                if (t.additionalAssignees) t.additionalAssignees.forEach(a => uniqueResources.add(a));
            });
            const resourceString = Array.from(uniqueResources).sort().join(', ');

            return {
                ...project,
                projectTasks, // Attach tasks for expanded view
                // Override with calculated if we have tasks, else fallback
                allotted_time_days_calc: projectTasks.length > 0 ? totalAllotted : project.allotted_time_days_calc,
                hs_time_taken_days: projectTasks.length > 0 ? totalTimeTakenDays : project.hs_time_taken_days,
                deviation_calc: projectTasks.length > 0 ? deviation : project.deviation_calc,
                activity_percentage: projectTasks.length > 0 ? Math.round(avgActivity) : project.activity_percentage,
                resources: projectTasks.length > 0 ? resourceString : project.resources
            };
        });
    }, [projects, tasks]);


    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedProjects = [...projectsWithAggregates].sort((a, b) => {
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

    // Inline Editing State
    const [editingCell, setEditingCell] = useState<{ projectId: string, field: string } | null>(null);
    const [editValue, setEditValue] = useState<string | number>('');
    const [isSaving, setIsSaving] = useState(false);

    const startEditing = (projectId: string, field: string, value: any) => {
        setEditingCell({ projectId, field });
        setEditValue(value === null || value === undefined ? '' : value);
    };

    const cancelEditing = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const saveEditing = async () => {
        if (!editingCell) return;

        setIsSaving(true);
        try {
            const updateData = { [editingCell.field]: editValue === '' ? null : editValue };
            await onUpdateProject(editingCell.projectId, updateData);
            setEditingCell(null);
        } catch (error) {
            console.error('Failed to save:', error);
            // Optionally show error toast
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveEditing();
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-colors">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                <table className="w-full text-xs text-slate-800 dark:text-slate-200 border-collapse table-fixed border border-slate-400 dark:border-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100">
                        <tr className="border-b border-slate-500 dark:border-slate-600">
                            <ResizableHeader label="Project Name" sortKey="project_name" widthKey="project_name" width={columnWidths.project_name} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} />
                            <ResizableHeader label="Resources" widthKey="resources" width={columnWidths.resources} isSortable={false} onResizeStart={startResizing} />
                            <ResizableHeader label="Activity %" sortKey="activity_percentage" widthKey="activity_percentage" width={columnWidths.activity_percentage} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="HS Time (Days)" sortKey="hs_time_taken_days" widthKey="hs_time_taken_days" width={columnWidths.hs_time_taken_days} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="Allotted" sortKey="allotted_time_days_calc" widthKey="allotted_time_days_calc" width={columnWidths.allotted_time_days_calc} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="Deviation" widthKey="deviation_calc" width={columnWidths.deviation_calc} isSortable={false} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="TL Effort" sortKey="tl_confirmed_effort_days" widthKey="tl_confirmed_effort_days" width={columnWidths.tl_confirmed_effort_days} currentSortKey={sortField} sortDirection={sortDirection} onSort={handleSort} onResizeStart={startResizing} className="text-center" />
                            <ResizableHeader label="Blockers" widthKey="blockers" width={columnWidths.blockers} isSortable={false} onResizeStart={startResizing} />
                            <ResizableHeader label="Actions" widthKey="actions" width={columnWidths.actions} isSortable={false} onResizeStart={startResizing} className="text-center" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {currentProjects.map((project, index) => {
                            const deviation = project.deviation_calc;
                            const isExpanded = expandedProjects.has(project.id);
                            const hasTasks = project.projectTasks && project.projectTasks.length > 0;

                            const isEditingTLEffort = editingCell?.projectId === project.id && editingCell?.field === 'tl_confirmed_effort_days';
                            const isEditingBlockers = editingCell?.projectId === project.id && editingCell?.field === 'blockers';

                            return (
                                <>
                                    <tr
                                        key={`${project.id}-${index}`}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-400 dark:border-slate-700 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/30'} ${isExpanded ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                                    >
                                        <td className="px-2 py-2 truncate font-bold text-slate-900 dark:text-slate-100 border-r border-slate-400 dark:border-slate-700">
                                            <div className="flex items-center gap-2">
                                                {hasTasks ? (
                                                    <button
                                                        onClick={() => toggleExpand(project.id)}
                                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </button>
                                                ) : (
                                                    <span className="w-6" /> // spacer
                                                )}
                                                <span title={project.project_name} className="truncate">{project.project_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 truncate text-slate-800 dark:text-slate-200 border-r border-slate-400 dark:border-slate-700">
                                            <div className="truncate" title={project.resources || ''}>
                                                {project.resources || '-'}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-center border-r border-slate-400 dark:border-slate-700">
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                                                {project.activity_percentage != null ? `${project.activity_percentage}%` : '-'}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 text-center font-medium text-slate-800 dark:text-slate-200 border-r border-slate-400 dark:border-slate-700">
                                            {project.hs_time_taken_days != null ? project.hs_time_taken_days.toFixed(2) : '0.00'}
                                        </td>
                                        <td className="px-2 py-2 text-center font-medium text-slate-800 dark:text-slate-200 border-r border-slate-400 dark:border-slate-700">
                                            {project.allotted_time_days_calc != null ? project.allotted_time_days_calc.toFixed(2) : '-'}
                                        </td>
                                        <td className="px-2 py-2 text-center font-bold border-r border-slate-400 dark:border-slate-700">
                                            <span className={
                                                deviation === null || deviation === undefined ? 'text-slate-400 dark:text-slate-500' :
                                                    deviation > 0 ? 'text-green-700 dark:text-green-400' :
                                                        deviation < 0 ? 'text-red-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                                            }>
                                                {deviation !== null && deviation !== undefined ? deviation.toFixed(2) : '-'}
                                            </span>
                                        </td>

                                        {/* Editable TL Effort */}
                                        <td
                                            className="px-2 py-2 text-center font-medium text-slate-800 dark:text-slate-200 border-r border-slate-400 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                                            onClick={() => !isEditingTLEffort && startEditing(project.id, 'tl_confirmed_effort_days', project.tl_confirmed_effort_days)}
                                        >
                                            {isEditingTLEffort ? (
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={saveEditing}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                    className="w-full text-center bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    step="0.1"
                                                />
                                            ) : (
                                                project.tl_confirmed_effort_days != null ? project.tl_confirmed_effort_days.toFixed(1) : '-'
                                            )}
                                        </td>

                                        {/* Editable Blockers */}
                                        <td
                                            className="px-2 py-2 truncate text-slate-800 dark:text-slate-200 border-r border-slate-400 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                                            onClick={() => !isEditingBlockers && startEditing(project.id, 'blockers', project.blockers)}
                                        >
                                            {isEditingBlockers ? (
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={saveEditing}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                    className="w-full bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                <div className="truncate" title={project.blockers || ''}>
                                                    {project.blockers || '-'}
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-2 py-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => onEdit(project)}
                                                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(project.id)}
                                                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Tasks View */}
                                    {isExpanded && hasTasks && (
                                        <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-300 dark:border-slate-700/50">
                                            <td colSpan={10} className="px-4 py-3 shadow-inner dark:shadow-slate-900/50">
                                                <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-x-auto custom-scrollbar">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-slate-100/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                                            <tr>
                                                                <th className="px-3 py-2 w-8">#</th>
                                                                <th className="px-3 py-2">Task / Sub-Phase</th>
                                                                <th className="px-3 py-2">Assignee</th>
                                                                <th className="px-3 py-2">Status</th>
                                                                <th className="px-3 py-2 text-center">Start</th>
                                                                <th className="px-3 py-2 text-center">End</th>
                                                                <th className="px-3 py-2 text-center">Allotted</th>
                                                                <th className="px-3 py-2 text-center">Taken</th>
                                                                <th className="px-3 py-2 text-center">Dev</th>
                                                                <th className="px-3 py-2">Bugs (H/F/T)</th>
                                                                <th className="px-3 py-2">Comments</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                            {project.projectTasks.map((task: any, tIndex: number) => {
                                                                const taskDeviation = task.deviation || 0;
                                                                return (
                                                                    <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                                        <td className="px-3 py-2 text-slate-400 dark:text-slate-500">{tIndex + 1}</td>
                                                                        <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">
                                                                            {task.subPhase || task.projectType || 'Task'}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                                                            {[task.assignedTo, task.assignedTo2, ...(task.additionalAssignees || [])].filter(Boolean).join(', ')}
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${task.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                                                                                task.status === 'In Progress' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                                                                                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                                                }`}>
                                                                                {task.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                                            {task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                                            {task.endDate ? new Date(task.endDate).toLocaleDateString() : '-'}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400">
                                                                            {task.daysAllotted ? Number(task.daysAllotted).toFixed(2) : '-'}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400" title={task.timeTaken || ''}>
                                                                            {task.daysTaken ? Number(task.daysTaken).toFixed(2) : '-'}
                                                                        </td>
                                                                        <td className={`px-3 py-2 text-center font-medium ${taskDeviation > 0 ? 'text-green-600 dark:text-green-400' : taskDeviation < 0 ? 'text-red-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
                                                                            }`}>
                                                                            {taskDeviation !== 0 ? taskDeviation.toFixed(2) : '-'}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700" title="HTML / Functional / Total">
                                                                                {task.htmlBugs || 0} / {task.functionalBugs || 0} / {task.bugCount || 0}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={task.comments || ''}>
                                                                            {task.comments || '-'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div >

            {/* Pagination */}
            < div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between" >
                <div className="text-xs text-slate-500 dark:text-slate-400">
                    Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, projects.length)}</span> of <span className="font-medium">{projects.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 min-w-[3rem] text-center">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div >
        </div >
    );
}
