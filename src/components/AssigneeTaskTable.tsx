import { useState, useMemo } from 'react';
import { Task, isTaskOverdue, getOverdueDays, Leave } from '@/lib/types';
import { format, addDays } from 'date-fns';
import { AlertCircle, CalendarClock, Palmtree, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { calculateAvailability } from '@/lib/availability';

interface AssigneeTaskTableProps {
    assignee: string;
    tasks: Task[];
    leaves: Leave[];
    onEditTask: (task: Task) => void;
}

type SortKey = 'projectName' | 'projectType' | 'priority' | 'subPhase' | 'pc' | 'status' | 'startDate' | 'endDate' | 'actualCompletionDate' | 'bugCount' | 'deviation';

export default function AssigneeTaskTable({ assignee, tasks, leaves, onEditTask }: AssigneeTaskTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
    const itemsPerPage = 5;

    // Sorting Logic
    const sortedTasks = useMemo(() => {
        let sortableTasks = [...tasks];
        if (sortConfig !== null) {
            sortableTasks.sort((a, b) => {
                let aValue: any = a[sortConfig.key];
                let bValue: any = b[sortConfig.key];

                // Handle special cases
                if (sortConfig.key === 'bugCount') {
                    // Sort by total bugs (T: bugCount)
                    aValue = a.bugCount || 0;
                    bValue = b.bugCount || 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableTasks;
    }, [tasks, sortConfig]);

    const totalItems = sortedTasks.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTasks = sortedTasks.slice(startIndex, endIndex);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown size={14} className="ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
        }
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-white" /> : <ArrowDown size={14} className="ml-1 text-white" />;
    };

    // Helper for table headers to reduce boilerplate
    const SortableHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: SortKey, className?: string }) => (
        <th
            className={`px-4 py-4 font-semibold text-left border-r border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors group ${className}`}
            onClick={() => requestSort(sortKey)}
        >
            <div className="flex items-center">
                {label}
                {getSortIcon(sortKey)}
            </div>
        </th>
    );

    // Styling constants matching Daily Reports image
    const headerStyle = "bg-[#1e293b] text-white";

    // Dynamic Header Color Logic
    const getHeaderColor = (name: string) => {
        const colors = [
            'bg-slate-100 border-slate-200 text-slate-800',
            'bg-red-50 border-red-200 text-red-800',
            'bg-orange-50 border-orange-200 text-orange-800',
            'bg-amber-50 border-amber-200 text-amber-800',
            'bg-yellow-50 border-yellow-200 text-yellow-800',
            'bg-lime-50 border-lime-200 text-lime-800',
            'bg-green-50 border-green-200 text-green-800',
            'bg-emerald-50 border-emerald-200 text-emerald-800',
            'bg-teal-50 border-teal-200 text-teal-800',
            'bg-cyan-50 border-cyan-200 text-cyan-800',
            'bg-sky-50 border-sky-200 text-sky-800',
            'bg-blue-50 border-blue-200 text-blue-800',
            'bg-indigo-50 border-indigo-200 text-indigo-800',
            'bg-violet-50 border-violet-200 text-violet-800',
            'bg-purple-50 border-purple-200 text-purple-800',
            'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800',
            'bg-pink-50 border-pink-200 text-pink-800',
            'bg-rose-50 border-rose-200 text-rose-800',
        ];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    const headerColorClass = getHeaderColor(assignee);

    const availabilityDate = calculateAvailability(tasks, leaves);
    const activeLeaves = leaves.filter(l => new Date(l.leave_date) >= new Date());

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            {/* Header Section */}
            <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${headerColorClass}`}>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/60 backdrop-blur-sm border border-black/5 flex items-center justify-center font-bold text-xl shadow-sm">
                        {assignee.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-lg leading-tight opacity-90">{assignee}</h3>
                        <p className="text-sm font-medium opacity-75">{totalItems} active task{totalItems !== 1 ? 's' : ''}</p>
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
                            <SortableHeader label="Project" sortKey="projectName" className="px-5" />
                            <SortableHeader label="Type" sortKey="projectType" />
                            <SortableHeader label="Priority" sortKey="priority" />
                            <SortableHeader label="Phase" sortKey="subPhase" className="px-5" />
                            <SortableHeader label="PC" sortKey="pc" />
                            {/* Assignees not sortable for now as it's a list */}
                            <th className="px-4 py-4 font-semibold text-left border-r border-slate-600">Assignees</th>
                            <SortableHeader label="Status" sortKey="status" />
                            <SortableHeader label="Start" sortKey="startDate" />
                            <SortableHeader label="End" sortKey="endDate" />
                            <SortableHeader label="Actual End" sortKey="actualCompletionDate" />
                            <SortableHeader label="Bugs (H/F/T)" sortKey="bugCount" />
                            {/* Comments not sortable */}
                            <th className="px-5 py-4 font-semibold text-left border-r border-slate-600">Comments</th>
                            <SortableHeader label="Deviation" sortKey="deviation" />
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
