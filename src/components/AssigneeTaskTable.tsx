'use client';

import { useState } from 'react';
import { Task, isTaskOverdue, getOverdueDays } from '@/lib/types';
import { format } from 'date-fns';
import { Edit2, AlertCircle } from 'lucide-react';
import Pagination from '@/components/Pagination';

interface AssigneeTaskTableProps {
    assignee: string;
    tasks: Task[];
    onEditTask: (task: Task) => void;
}

export default function AssigneeTaskTable({ assignee, tasks, onEditTask }: AssigneeTaskTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // Reduced to 5 per user for better compactness, or could be 10

    const totalItems = tasks.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    // Styling constants matching Daily Reports image
    const headerStyle = "bg-[#1e293b] text-white";

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-sky-500 to-indigo-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {assignee.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">{assignee}</h3>
                        <p className="text-white/80 text-sm">{totalItems} task{totalItems !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-600 border-collapse">
                    <thead className={`${headerStyle} border border-slate-600`}>
                        <tr>
                            <th className="px-5 py-4 font-semibold text-left border-r border-slate-600">Project</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">Type</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">Priority</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">Edit</th>
                            <th className="px-5 py-4 font-semibold text-left border-r border-slate-600">Phase</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">PC</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">Assignees</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">Status</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">Start</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">End</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">Actual End</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">Bugs (H/F/T)</th>
                            <th className="px-5 py-4 font-semibold text-left border-r border-slate-600">Comments</th>
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">Deviation</th>
                            <th className="px-4 py-4 font-semibold text-left">Sprint</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTasks.map(task => (
                            <tr key={task.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-all group">
                                <td className="px-5 py-4 font-semibold text-slate-800 border-r border-slate-200">{task.projectName}</td>
                                <td className="px-4 py-4 text-slate-600 border-r border-slate-200">{task.projectType || '-'}</td>
                                <td className="px-4 py-4 text-slate-600 border-r border-slate-200">
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
                                <td className="px-4 py-4 border-r border-slate-200">
                                    <button
                                        onClick={() => onEditTask(task)}
                                        className="text-slate-400 hover:text-sky-600 hover:bg-sky-50 p-2 rounded-lg transition-all"
                                        title="Edit Task"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </td>
                                <td className="px-5 py-4 font-medium text-slate-600 border-r border-slate-200">{task.subPhase || '-'}</td>
                                <td className="px-4 py-4 border-r border-slate-200">{task.pc || '-'}</td>
                                <td className="px-4 py-4 border-r border-slate-200">
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {task.assignedTo && (
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-600" title={task.assignedTo}>
                                                {task.assignedTo.charAt(0)}
                                            </div>
                                        )}
                                        {task.assignedTo2 && (
                                            <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-bold text-purple-600" title={task.assignedTo2}>
                                                {task.assignedTo2.charAt(0)}
                                            </div>
                                        )}
                                        {task.additionalAssignees?.map((assignee, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-600" title={assignee}>
                                                {assignee.charAt(0)}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-4 border-r border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                task.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}>
                                            {task.status}
                                        </span>
                                        {isTaskOverdue(task) && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                <AlertCircle size={12} />
                                                {getOverdueDays(task)}d overdue
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-slate-500 font-medium border-r border-slate-200">{task.startDate ? format(new Date(task.startDate), 'MMM d') : '-'}</td>
                                <td className="px-4 py-4 text-slate-500 font-medium border-r border-slate-200">{task.endDate ? format(new Date(task.endDate), 'MMM d') : '-'}</td>
                                <td className="px-4 py-4 text-slate-500 font-medium border-r border-slate-200">{task.actualCompletionDate ? format(new Date(task.actualCompletionDate), 'MMM d') : '-'}</td>
                                <td className="px-4 py-4 text-center border-r border-slate-200">
                                    <div className="flex flex-col text-xs">
                                        <span className="font-bold text-slate-700">T: {task.bugCount}</span>
                                        <span className="text-slate-500">H: {task.htmlBugs}</span>
                                        <span className="text-slate-500">F: {task.functionalBugs}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-sm text-slate-500 max-w-sm truncate border-r border-slate-200" title={task.comments || ''}>
                                    {task.comments || '-'}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-500 max-w-xs truncate border-r border-slate-200" title={task.deviationReason || ''}>
                                    {task.deviationReason || '-'}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-500 max-w-xs truncate" title={task.sprintLink || ''}>
                                    {task.sprintLink ? (
                                        <a href={task.sprintLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                                            Link
                                        </a>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Per-Assignee Pagination */}
            {totalItems > itemsPerPage && (
                <div className="mt-4 mb-4">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
}
