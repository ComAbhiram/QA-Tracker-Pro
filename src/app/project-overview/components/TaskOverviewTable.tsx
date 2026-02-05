'use client';

import { Task, isTaskOverdue, getOverdueDays } from '@/lib/types';
import { format } from 'date-fns';
import { Edit2, AlertCircle, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface TaskOverviewTableProps {
    tasks: Task[];
    onEdit: (task: Task) => void;
}

export default function TaskOverviewTable({ tasks, onEdit }: TaskOverviewTableProps) {
    const [sortField, setSortField] = useState<string>('projectName');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedTasks = [...tasks].sort((a, b) => {
        const aVal: any = a[sortField as keyof Task];
        const bVal: any = b[sortField as keyof Task];

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

    const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentTasks = sortedTasks.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-600 border-collapse">
                    <thead className="bg-slate-50 text-slate-700 sticky top-0 z-10">
                        <tr>
                            <th className="px-5 py-4 font-semibold text-left border border-slate-400 min-w-[150px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('projectName')}>
                                <div className="flex items-center gap-2">Project <ArrowUpDown size={14} /></div>
                            </th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400 min-w-[100px]">Type</th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('priority')}>
                                <div className="flex items-center gap-2">Priority <ArrowUpDown size={14} /></div>
                            </th>
                            <th className="px-5 py-4 font-semibold text-left border border-slate-400">Phase</th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400">PC</th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400 min-w-[120px]">Assignees</th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                                <div className="flex items-center gap-2">Status <ArrowUpDown size={14} /></div>
                            </th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('startDate')}>
                                <div className="flex items-center gap-2">Start <ArrowUpDown size={14} /></div>
                            </th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('endDate')}>
                                <div className="flex items-center gap-2">End <ArrowUpDown size={14} /></div>
                            </th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400">Actual End</th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400">Time Taken</th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400">Activity %</th>
                            <th className="px-4 py-4 font-semibold text-center border border-slate-400">Bugs (T/H/F)</th>
                            <th className="px-5 py-4 font-semibold text-left border border-slate-400 max-w-[200px]">Comments</th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400">Deviation</th>
                            <th className="px-4 py-4 font-semibold text-left border border-slate-400">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentTasks.map((task, index) => (
                            <tr key={`${task.id}-${index}`} className={`hover:bg-slate-50/50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                <td className="px-5 py-4 font-semibold text-slate-800 border border-slate-400">
                                    <div className="truncate max-w-[200px]" title={task.projectName}>{task.projectName}</div>
                                </td>
                                <td className="px-4 py-4 text-slate-600 border border-slate-400">{task.projectType || '-'}</td>
                                <td className="px-4 py-4 text-slate-600 border border-slate-400">
                                    {task.priority && (
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${task.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                                            task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                                task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-green-100 text-green-700'
                                            }`}>
                                            {task.priority}
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-4 font-medium text-slate-600 border border-slate-400">{task.subPhase || '-'}</td>
                                <td className="px-4 py-4 border border-slate-400">{task.pc || '-'}</td>
                                <td className="px-4 py-4 border border-slate-400">
                                    <div className="flex -space-x-2 overflow-hidden hover:space-x-1 transition-all">
                                        {task.assignedTo && (
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0" title={`Primary: ${task.assignedTo}`}>
                                                {task.assignedTo.charAt(0)}
                                            </div>
                                        )}
                                        {task.assignedTo2 && (
                                            <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0" title={`Secondary: ${task.assignedTo2}`}>
                                                {task.assignedTo2.charAt(0)}
                                            </div>
                                        )}
                                        {task.additionalAssignees?.map((assignee, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-600 flex-shrink-0" title={`Additional: ${assignee}`}>
                                                {assignee.charAt(0)}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-4 border border-slate-400">
                                    <div className="flex flex-col gap-1">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold w-fit border ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                task.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}>
                                            {task.status}
                                        </span>
                                        {isTaskOverdue(task) && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 w-fit">
                                                <AlertCircle size={10} />
                                                {getOverdueDays(task)}d late
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-slate-500 font-medium border border-slate-400 text-xs whitespace-nowrap">
                                    {task.startDate ? format(new Date(task.startDate), 'MMM d') : '-'}
                                </td>
                                <td className="px-4 py-4 text-slate-500 font-medium border border-slate-400 text-xs whitespace-nowrap">
                                    {task.endDate ? format(new Date(task.endDate), 'MMM d') : '-'}
                                </td>
                                <td className="px-4 py-4 text-slate-500 font-medium border border-slate-400 text-xs whitespace-nowrap">
                                    {task.actualCompletionDate ? format(new Date(task.actualCompletionDate), 'MMM d') : '-'}
                                </td>
                                <td className="px-4 py-4 text-slate-600 font-mono text-xs border border-slate-400">
                                    {task.timeTaken || '00:00:00'}
                                </td>
                                <td className="px-4 py-4 text-center border border-slate-400">
                                    <span className="font-bold text-slate-700">{task.activityPercentage || 0}%</span>
                                </td>
                                <td className="px-4 py-4 text-center border border-slate-400">
                                    <div className="text-xs font-mono">
                                        <span className="text-slate-900 font-bold" title="Total">{task.bugCount}</span>
                                        <span className="text-slate-400 mx-1">/</span>
                                        <span className="text-orange-600" title="HTML">{task.htmlBugs}</span>
                                        <span className="text-slate-400 mx-1">/</span>
                                        <span className="text-red-600" title="Functional">{task.functionalBugs}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-sm text-slate-500 max-w-[200px] truncate border border-slate-400" title={task.comments || ''}>
                                    {task.comments || '-'}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-500 max-w-xs truncate border border-slate-400" title={task.deviationReason || ''}>
                                    {task.deviationReason || '-'}
                                </td>
                                <td className="px-4 py-4 border border-slate-400">
                                    <button
                                        onClick={() => onEdit(task)}
                                        className="text-slate-400 hover:text-sky-600 hover:bg-sky-50 p-2 rounded-lg transition-all"
                                        title="Edit Task"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                    Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, tasks.length)}</span> of <span className="font-medium">{tasks.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-medium text-slate-600 min-w-[3rem] text-center">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
