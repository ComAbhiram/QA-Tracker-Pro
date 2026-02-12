import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Task, isTaskOverdue, getOverdueDays, Leave } from '@/lib/types';
import { format } from 'date-fns';
import {
    AlertCircle,
    CalendarClock,
    Palmtree,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Loader2,
    CheckCircle2,
    Circle,
    PauseCircle,
    Clock,
    Cloud,
    XCircle
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import { calculateAvailability } from '@/lib/availability';
import ResizableHeader from '@/components/ui/ResizableHeader';
import useColumnResizing from '@/hooks/useColumnResizing';

interface AssigneeTaskTableProps {
    assignee: string;
    tasks: Task[];
    leaves: Leave[];
    onEditTask: (task: Task) => void;
    onDateUpdate: (taskId: number, field: 'start_date' | 'end_date', date: string) => Promise<void>;
}

type SortKey = 'projectName' | 'projectType' | 'priority' | 'subPhase' | 'pc' | 'status' | 'startDate' | 'endDate' | 'actualCompletionDate' | 'deviation';

export default function AssigneeTaskTable({ assignee, tasks, leaves, onEditTask, onDateUpdate }: AssigneeTaskTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
    const [editingCell, setEditingCell] = useState<{ taskId: number, field: 'start_date' | 'end_date' } | null>(null);
    const itemsPerPage = 10;

    // ... (existing column resizing hook) ...
    const { columnWidths, startResizing } = useColumnResizing({
        projectName: 300,
        projectType: 60,
        priority: 70,
        subPhase: 120,
        pc: 80,
        status: 120,
        startDate: 100, // Slightly wider for date input
        endDate: 100,   // Slightly wider for date input
        actualCompletionDate: 80,
        comments: 150,
        deviation: 100,
        sprint: 60
    });

    // ... (existing sorting logic) ...
    const sortedTasks = useMemo(() => {
        let sortableTasks = [...tasks];
        if (sortConfig !== null) {
            sortableTasks.sort((a, b) => {
                let aValue: any = a[sortConfig.key];
                let bValue: any = b[sortConfig.key];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableTasks;
    }, [tasks, sortConfig]);

    const totalItems = sortedTasks.length;
    const paginatedTasks = sortedTasks;

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown size={12} className="ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
        }
        return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="ml-1 text-slate-600" /> : <ArrowDown size={12} className="ml-1 text-slate-600" />;
    };

    const handleDateClick = (e: React.MouseEvent, taskId: number, field: 'start_date' | 'end_date') => {
        e.stopPropagation(); // Prevent opening task modal
        setEditingCell({ taskId, field });
    };

    const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>, taskId: number, field: 'start_date' | 'end_date') => {
        const newDate = e.target.value;
        await onDateUpdate(taskId, field, newDate);
        setEditingCell(null);
    };

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'In Progress': return <div className="flex items-center gap-1.5 text-blue-700 font-medium"><Loader2 size={13} className="animate-spin" /> In Progress</div>;
            case 'Completed': return <div className="flex items-center gap-1.5 text-emerald-700 font-medium"><CheckCircle2 size={13} /> Completed</div>;
            case 'Yet to Start': return <div className="flex items-center gap-1.5 text-slate-500 font-medium"><Circle size={13} /> Yet to Start</div>;
            case 'Forecast': return <div className="flex items-center gap-1.5 text-violet-600 font-medium"><Cloud size={13} /> Forecast</div>;
            case 'On Hold': return <div className="flex items-center gap-1.5 text-amber-600 font-medium"><PauseCircle size={13} /> On Hold</div>;
            case 'Ready for QA': return <div className="flex items-center gap-1.5 text-pink-600 font-medium"><Clock size={13} /> Ready for QA</div>;
            case 'Assigned to QA': return <div className="flex items-center gap-1.5 text-cyan-600 font-medium"><Clock size={13} /> Assigned to QA</div>;
            case 'Rejected': return <div className="flex items-center gap-1.5 text-red-600 font-medium"><XCircle size={13} /> Rejected</div>;
            default: return <div className="text-slate-600">{status}</div>;
        }
    };

    const getHeaderColor = (name: string) => {
        const colors = [
            'bg-slate-100 border-slate-200 text-slate-800', 'bg-red-50 border-red-200 text-red-800',
            'bg-orange-50 border-orange-200 text-orange-800', 'bg-amber-50 border-amber-200 text-amber-800',
            'bg-yellow-50 border-yellow-200 text-yellow-800', 'bg-lime-50 border-lime-200 text-lime-800',
            'bg-green-50 border-green-200 text-green-800', 'bg-emerald-50 border-emerald-200 text-emerald-800',
            'bg-teal-50 border-teal-200 text-teal-800', 'bg-cyan-50 border-cyan-200 text-cyan-800',
            'bg-sky-50 border-sky-200 text-sky-800', 'bg-blue-50 border-blue-200 text-blue-800',
            'bg-indigo-50 border-indigo-200 text-indigo-800', 'bg-violet-50 border-violet-200 text-violet-800',
            'bg-purple-50 border-purple-200 text-purple-800', 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800',
            'bg-pink-50 border-pink-200 text-pink-800', 'bg-rose-50 border-rose-200 text-rose-800',
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };
    const headerColorClass = getHeaderColor(assignee);
    const availabilityDate = calculateAvailability(tasks, leaves);
    const activeLeaves = leaves.filter(l => new Date(l.leave_date) >= new Date());

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-4">
            {/* Header Section (Compact) */}
            <div className={`px-3 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b ${headerColorClass}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm border border-black/5 flex items-center justify-center font-bold text-sm shadow-sm">
                        {assignee.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight opacity-90">{assignee}</h3>
                    </div>
                </div>

                {/* Availability Info (Compact & Single Line) */}
                <div className="flex items-center gap-3 text-slate-700">
                    <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-md border border-black/5">
                        <CalendarClock size={14} className="text-red-600" />
                        <span className="text-xs font-bold text-slate-700">
                            Available: {format(availabilityDate, 'MMM d')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Table (Compact & Resizable) */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-800 border-collapse table-fixed border border-slate-900">
                    <thead>
                        <tr className="border-b border-black">
                            <ResizableHeader
                                label="Project"
                                sortKey="projectName"
                                widthKey="projectName"
                                width={columnWidths.projectName}
                                currentSortKey={sortConfig?.key}
                                sortDirection={sortConfig?.direction}
                                onSort={(k) => requestSort(k as SortKey)}
                                onResizeStart={startResizing}
                            />
                            <ResizableHeader
                                label="Type"
                                sortKey="projectType"
                                widthKey="projectType"
                                width={columnWidths.projectType}
                                currentSortKey={sortConfig?.key}
                                sortDirection={sortConfig?.direction}
                                onSort={(k) => requestSort(k as SortKey)}
                                onResizeStart={startResizing}
                            />
                            <ResizableHeader
                                label="Priority"
                                sortKey="priority"
                                widthKey="priority"
                                width={columnWidths.priority}
                                currentSortKey={sortConfig?.key}
                                sortDirection={sortConfig?.direction}
                                onSort={(k) => requestSort(k as SortKey)}
                                onResizeStart={startResizing}
                            />
                            <ResizableHeader label="Phase" sortKey="subPhase" widthKey="subPhase" width={columnWidths.subPhase} currentSortKey={sortConfig?.key} sortDirection={sortConfig?.direction} onSort={(k) => requestSort(k as SortKey)} onResizeStart={startResizing} />
                            <ResizableHeader label="PC" sortKey="pc" widthKey="pc" width={columnWidths.pc} currentSortKey={sortConfig?.key} sortDirection={sortConfig?.direction} onSort={(k) => requestSort(k as SortKey)} onResizeStart={startResizing} />
                            <ResizableHeader label="Status" sortKey="status" widthKey="status" width={columnWidths.status} currentSortKey={sortConfig?.key} sortDirection={sortConfig?.direction} onSort={(k) => requestSort(k as SortKey)} onResizeStart={startResizing} />
                            <ResizableHeader label="Start" sortKey="startDate" widthKey="startDate" width={columnWidths.startDate} currentSortKey={sortConfig?.key} sortDirection={sortConfig?.direction} onSort={(k) => requestSort(k as SortKey)} onResizeStart={startResizing} />
                            <ResizableHeader label="End" sortKey="endDate" widthKey="endDate" width={columnWidths.endDate} currentSortKey={sortConfig?.key} sortDirection={sortConfig?.direction} onSort={(k) => requestSort(k as SortKey)} onResizeStart={startResizing} />
                            <ResizableHeader label="Actual End" sortKey="actualCompletionDate" widthKey="actualCompletionDate" width={columnWidths.actualCompletionDate} currentSortKey={sortConfig?.key} sortDirection={sortConfig?.direction} onSort={(k) => requestSort(k as SortKey)} onResizeStart={startResizing} />
                            <ResizableHeader label="Comments" widthKey="comments" width={columnWidths.comments} isSortable={false} onResizeStart={startResizing} />
                            <ResizableHeader label="Deviation" sortKey="deviation" widthKey="deviation" width={columnWidths.deviation} currentSortKey={sortConfig?.key} sortDirection={sortConfig?.direction} onSort={(k) => requestSort(k as SortKey)} onResizeStart={startResizing} />
                            <ResizableHeader label="Sprint" widthKey="sprint" width={columnWidths.sprint} isSortable={false} onResizeStart={startResizing} />
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map(task => (
                            <tr
                                key={task.id}
                                onClick={() => onEditTask(task)}
                                className="border-b border-slate-900 hover:bg-slate-50 cursor-pointer transition-colors group"
                            >
                                <td className="px-2 py-2 truncate border-r border-slate-900 font-bold text-slate-900" title={task.projectName}>{task.projectName}</td>
                                <td className="px-2 py-2 truncate border-r border-slate-900">{task.projectType || '-'}</td>
                                <td className="px-2 py-2 truncate border-r border-slate-900">
                                    {task.priority && (
                                        <span className={`font-bold ${task.priority === 'High' ? 'text-orange-700' :
                                            task.priority === 'Urgent' ? 'text-red-800' :
                                                task.priority === 'Medium' ? 'text-amber-700' :
                                                    'text-green-700'
                                            }`}>
                                            {task.priority}
                                        </span>
                                    )}
                                </td>
                                <td className="px-2 py-2 truncate border-r border-slate-900">{task.subPhase || '-'}</td>
                                <td className="px-2 py-2 truncate border-r border-slate-900">{task.pc || '-'}</td>
                                <td className="px-2 py-2 border-r border-slate-900">
                                    <div className="flex items-center gap-2">
                                        {getStatusDisplay(task.status)}
                                        {isTaskOverdue(task) && (
                                            <span className="flex items-center gap-0.5 text-red-700 font-bold text-[10px]" title={`${getOverdueDays(task)} days overdue`}>
                                                <AlertCircle size={10} /> {getOverdueDays(task)}d
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Start Date - Inline Edit */}
                                <td
                                    className="px-2 py-2 truncate border-r border-slate-900 text-slate-700 hover:bg-slate-100 transition-colors"
                                    onClick={(e) => handleDateClick(e, task.id, 'start_date')}
                                >
                                    {editingCell?.taskId === task.id && editingCell?.field === 'start_date' ? (
                                        <input
                                            type="date"
                                            className="w-full text-xs p-1 border rounded"
                                            value={task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => handleDateChange(e, task.id, 'start_date')}
                                            onBlur={() => setEditingCell(null)}
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        task.startDate ? format(new Date(task.startDate), 'MMM d') : '-'
                                    )}
                                </td>

                                {/* End Date - Inline Edit */}
                                <td
                                    className="px-2 py-2 truncate border-r border-slate-900 text-slate-700 hover:bg-slate-100 transition-colors"
                                    onClick={(e) => handleDateClick(e, task.id, 'end_date')}
                                >
                                    {editingCell?.taskId === task.id && editingCell?.field === 'end_date' ? (
                                        <input
                                            type="date"
                                            className="w-full text-xs p-1 border rounded"
                                            value={task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => handleDateChange(e, task.id, 'end_date')}
                                            onBlur={() => setEditingCell(null)}
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        task.endDate ? format(new Date(task.endDate), 'MMM d') : '-'
                                    )}
                                </td>

                                <td className="px-2 py-2 truncate border-r border-slate-900 text-slate-700">{task.actualCompletionDate ? format(new Date(task.actualCompletionDate), 'MMM d') : '-'}</td>
                                <td className="px-2 py-2 truncate border-r border-slate-900 text-slate-700 max-w-[200px]" title={task.comments || ''}>{task.comments || '-'}</td>
                                <td className="px-2 py-2 truncate border-r border-slate-900 text-slate-700 max-w-[200px]" title={String(task.deviation || '')}>{task.deviation || '-'}</td>
                                <td className="px-2 py-2 truncate text-slate-700 text-center">
                                    {task.sprintLink ? (
                                        <a href={task.sprintLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
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
