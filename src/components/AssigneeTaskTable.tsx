'use client';

import { useState } from 'react';
import { Task, isTaskOverdue, getOverdueDays, Leave } from '@/lib/types';
import { format, addDays } from 'date-fns';
import { AlertCircle, CalendarClock, Palmtree } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { calculateAvailability } from '@/lib/availability';

interface AssigneeTaskTableProps {
    assignee: string;
    tasks: Task[];
    leaves: Leave[];
    onEditTask: (task: Task) => void;
}

export default function AssigneeTaskTable({ assignee, tasks, leaves, onEditTask }: AssigneeTaskTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // Reduced to 5 per user for better compactness, or could be 10

    const totalItems = tasks.length;
    const items = tasks; // We will paginate this array

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTasks = items.slice(startIndex, endIndex);

    // Styling constants matching Daily Reports image
    const headerStyle = "bg-[#1e293b] text-white";

    const availabilityDate = calculateAvailability(tasks, leaves);
    const activeLeaves = leaves.filter(l => new Date(l.leave_date) >= new Date());

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            {/* Header Section */}
            <div className="bg-yellow-500 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {assignee.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">{assignee}</h3>
                        <p className="text-white/80 text-sm font-medium">{totalItems} active task{totalItems !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Availability Info */}
                <div className="flex flex-col md:items-end text-white">
                    <div className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 shadow-xl transform transition-transform hover:scale-105 duration-200">
                        <CalendarClock size={22} className="text-white animate-pulse" />
                        <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider opacity-90 leading-none mb-1 text-yellow-100">Available From</p>
                            <p className="text-base font-extrabold leading-none text-white drop-shadow-sm">{format(availabilityDate, 'MMM d, yyyy')}</p>
                        </div>
                    </div>

                    {activeLeaves.length > 0 && (
                        <div className="mt-2 text-right">
                            <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-white/90">
                                <Palmtree size={12} />
                                <span>Upcoming Leaves:</span>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2 mt-1">
                                {activeLeaves.slice(0, 3).map(l => (
                                    <span key={l.id} className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/20 text-[10px] border border-white/10">
                                        {format(new Date(l.leave_date), 'MMM d')}
                                    </span>
                                ))}
                                {activeLeaves.length > 3 && <span className="text-[10px] opacity-80">+{activeLeaves.length - 3} more</span>}
                            </div>
                        </div>
                    )}
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
                            {/* Edit column removed */}
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
                            <tr
                                key={task.id}
                                onClick={() => onEditTask(task)}
                                className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-all group"
                                title="Click to edit task"
                            >
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
                                {/* Edit cell removed */}
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
                                            <div className="w-8 h-8 rounded-full bg-yellow-100 border-2 border-white flex items-center justify-center text-xs font-bold text-yellow-600" title={task.assignedTo2}>
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
                                        <a href={task.sprintLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>
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
