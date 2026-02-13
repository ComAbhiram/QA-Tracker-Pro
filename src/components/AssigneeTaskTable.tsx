import { useState, useMemo, useEffect, useRef } from 'react';
import { Task, isTaskOverdue, getOverdueDays, Leave } from '@/lib/types';
import { format } from 'date-fns';
import {
    AlertCircle,
    CalendarClock,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    CheckCircle2,
    Circle,
    PauseCircle,
    Clock,
    Cloud,
    XCircle,
    Edit2
} from 'lucide-react';
import Loader from '@/components/ui/Loader';
import Pagination from '@/components/Pagination';
import { calculateAvailability } from '@/lib/availability';
import { DatePicker } from '@/components/DatePicker';
import { StatusBadge } from '@/components/ui/standard/StatusBadge';
import { PriorityBadge } from '@/components/ui/standard/PriorityBadge';

interface AssigneeTaskTableProps {
    assignee: string;
    tasks: Task[];
    leaves: Leave[];
    columnWidths: Record<string, number>;
    hideHeader?: boolean;
    isRowExpanded?: boolean;
    onEditTask: (task: Task) => void;
    onResizeStart?: (key: string, e: React.MouseEvent) => void;
    // Generalized update handler for inline edits
    onFieldUpdate: (taskId: number, field: string, value: any) => Promise<void>;
}

type SortKey = 'projectName' | 'projectType' | 'priority' | 'subPhase' | 'pc' | 'status' | 'startDate' | 'endDate' | 'actualCompletionDate' | 'deviation';

// Simple editable cell for inline text edits
const EditableCell = ({ value, onSave, className, type = 'text', options = [], isExpanded = false }: { value: string | number | null, onSave: (val: string) => void, className?: string, type?: 'text' | 'select' | 'textarea', options?: string[], isExpanded?: boolean }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value?.toString() || '');
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

    useEffect(() => {
        setTempValue(value?.toString() || '');
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        setIsEditing(false);
        if (tempValue !== (value?.toString() || '')) {
            onSave(tempValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent newline in textarea/input
            handleSave();
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
            setTempValue(value?.toString() || '');
        }
    };

    if (isEditing) {
        if (type === 'select') {
            return (
                <select
                    ref={inputRef as any}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full bg-white border border-indigo-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm ${className}`}
                >
                    {options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }
        if (type === 'textarea') {
            return (
                <textarea
                    ref={inputRef as any}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    rows={2} // slightly taller for multiline if needed, but keeping compact
                    className={`w-full bg-white border border-indigo-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm resize-none overflow-hidden ${className}`}
                    style={{ minHeight: '24px' }}
                />
            );
        }
        return (
            <input
                ref={inputRef as any}
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className={`w-full bg-white border border-indigo-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm ${className}`}
            />
        );
    }

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            className={`cursor-pointer hover:bg-slate-100 min-h-[20px] rounded px-1 py-0.5 transition-colors border border-transparent hover:border-slate-200 ${isExpanded ? 'whitespace-normal break-words' : 'truncate'} ${className}`}
            title={value?.toString() || 'Click to edit'}
        >
            {value || <span className="opacity-0 group-hover:opacity-30">-</span>}
        </div>
    );
};

// Status Select Cell (Specialized)
const StatusSelectCell = ({ status, onSave }: { status: string, onSave: (val: string) => void }) => {
    // Using a native select for simplicity and robustness in a table cell
    // Styling it to look like a badge when not focused is tricky with native select.
    // Instead, we switch between Badge and Select.
    const [isEditing, setIsEditing] = useState(false);
    const selectRef = useRef<HTMLSelectElement>(null);

    const statusOptions = [
        'Yet to Start', 'Being Developed', 'Ready for QA', 'Assigned to QA',
        'In Progress', 'On Hold', 'Completed', 'Forecast', 'Rejected'
    ];

    useEffect(() => {
        if (isEditing && selectRef.current) {
            selectRef.current.focus();
        }
    }, [isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onSave(e.target.value);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <select
                ref={selectRef}
                value={status}
                onChange={handleChange}
                onBlur={() => setIsEditing(false)}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-xs bg-white border border-indigo-300 rounded px-1 py-0.5 focus:outline-none shadow-sm"
            >
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        );
    }

    return (
        <div onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="cursor-pointer hover:opacity-80 transition-opacity">
            <StatusBadge status={status} />
        </div>
    );
};


export default function AssigneeTaskTable({ assignee, tasks, leaves, columnWidths, hideHeader = false, isRowExpanded = false, onEditTask, onFieldUpdate, onResizeStart }: AssigneeTaskTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
    const itemsPerPage = 10;

    // Sorting Logic
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
    // Client-side pagination for this table
    const paginatedTasks = sortedTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleDateChange = async (date: Date | undefined, taskId: number, field: 'start_date' | 'end_date') => {
        const newDateStr = date ? format(date, 'yyyy-MM-dd') : null; // Handle clear as null
        await onFieldUpdate(taskId, field, newDateStr);
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

    // Dynamic Class for Cells
    const cellClass = isRowExpanded ? "whitespace-normal break-words" : "truncate";

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-2">
            {/* Header Section (Compact) - Always visible per assignee table */}
            <div className={`px-3 py-1.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b ${headerColorClass}`}>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/60 backdrop-blur-sm border border-black/5 flex items-center justify-center font-bold text-xs shadow-sm">
                        {assignee.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-xs leading-tight opacity-90">{assignee}</h3>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                    <div className="flex items-center gap-2 bg-white/50 px-2 py-0.5 rounded-md border border-black/5">
                        <CalendarClock size={12} className="text-red-600" />
                        <span className="text-[10px] font-bold text-slate-700">
                            Available: {format(availabilityDate, 'MMM d')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-visible pb-0"> {/* Allow dropdowns to overflow if needed, but table-layout fixed handles most */}
                <table className="w-full text-xs text-slate-800 border-collapse table-fixed border border-slate-200">
                    <col style={{ width: columnWidths.projectName }} />
                    <col style={{ width: columnWidths.projectType }} />
                    <col style={{ width: columnWidths.priority }} />
                    <col style={{ width: columnWidths.subPhase }} />
                    <col style={{ width: columnWidths.pc }} />
                    <col style={{ width: columnWidths.status }} />
                    <col style={{ width: columnWidths.startDate }} />
                    <col style={{ width: columnWidths.endDate }} />
                    <col style={{ width: columnWidths.actualCompletionDate }} />
                    <col style={{ width: columnWidths.comments }} />
                    <col style={{ width: columnWidths.deviation }} />
                    <col style={{ width: columnWidths.sprint }} />

                    {!hideHeader && (
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-left font-semibold text-slate-600">
                                {/* Only render THs if hideHeader is false. But normally we hide this if sticky header exists. */}
                                {/* If we hide header, we rely on the sticky header above all tables. */}
                                {/* If we DO show header (e.g. standalone), we would render Resizable headers here. */}
                                {/* For now, assuming layout is controlled by parent, we might render empty here or just nothing. */}
                                {/* The design implies we want ONE sticky header for ALL tables. */}
                                {/* So if hideHeader is true, we render NOTHING here. */}
                            </tr>
                        </thead>
                    )}

                    <tbody className="divide-y divide-slate-100">
                        {paginatedTasks.map(task => (
                            <tr
                                key={task.id}
                                onClick={() => onEditTask(task)}
                                className="group hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                <td className={`px-2 py-1 border-r border-slate-200 font-medium text-slate-700 ${cellClass}`} title={task.projectName}>
                                    <div>{task.projectName}</div>
                                    {task.currentUpdates && (
                                        <div
                                            className="text-[10px] text-indigo-600 font-medium mt-0.5 cursor-help w-fit"
                                            title={task.currentUpdates}
                                        >
                                            Current updates
                                        </div>
                                    )}
                                </td>

                                <td className={`px-2 py-1 border-r border-slate-200 text-slate-500 ${cellClass}`}>{task.projectType || '-'}</td>

                                <td className="px-2 py-1 truncate border-r border-slate-200">
                                    <div className="transform scale-90 origin-left">
                                        <PriorityBadge priority={task.priority} />
                                    </div>
                                </td>

                                <td className={`px-2 py-1 border-r border-slate-200 text-slate-600 ${cellClass}`} title={task.subPhase || ''}>{task.subPhase || '-'}</td>
                                <td className={`px-2 py-1 border-r border-slate-200 text-slate-600 ${cellClass}`}>{task.pc || '-'}</td>

                                {/* Status - Editable Select */}
                                <td className="px-2 py-1 border-r border-slate-200" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5">
                                        <StatusSelectCell status={task.status} onSave={(val) => onFieldUpdate(task.id, 'status', val)} />
                                        {isTaskOverdue(task) && (
                                            <span className="flex-shrink-0 flex items-center gap-0.5 text-red-600 font-bold text-[10px]" title={`${getOverdueDays(task)} days overdue`}>
                                                <AlertCircle size={10} /> {getOverdueDays(task)}d
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Start Date - Inline Edit */}
                                <td className="px-1 py-0.5 truncate border-r border-slate-200" onClick={(e) => e.stopPropagation()}>
                                    <DatePicker
                                        date={task.startDate ? new Date(task.startDate) : undefined}
                                        setDate={(d) => handleDateChange(d, task.id, 'start_date')}
                                        className="w-full h-full border-none shadow-none bg-transparent hover:bg-slate-100 rounded px-1 text-[11px] font-normal min-h-[24px] py-0"
                                        placeholder="-"
                                    />
                                </td>

                                {/* End Date - Inline Edit */}
                                <td className={`px-1 py-0.5 truncate border-r border-slate-200 transition-colors ${isTaskOverdue(task) ? 'bg-red-50' : ''}`} onClick={(e) => e.stopPropagation()}>
                                    <DatePicker
                                        date={task.endDate ? new Date(task.endDate) : undefined}
                                        setDate={(d) => handleDateChange(d, task.id, 'end_date')}
                                        className={`w-full h-full border-none shadow-none bg-transparent rounded px-1 text-[11px] font-normal min-h-[24px] py-0 ${isTaskOverdue(task) ? 'text-red-700 font-semibold' : 'hover:bg-slate-100'}`}
                                        placeholder="-"
                                    />
                                </td>

                                <td className="px-2 py-1 truncate border-r border-slate-200 text-slate-600">
                                    {task.actualCompletionDate ? format(new Date(task.actualCompletionDate), 'MMM d') : '-'}
                                </td>

                                {/* Comments - Editable */}
                                <td className={`px-2 py-1 border-r border-slate-200 text-slate-600 ${cellClass}`} title={task.comments || ''} onClick={e => e.stopPropagation()}>
                                    <EditableCell
                                        value={task.comments}
                                        onSave={(val) => onFieldUpdate(task.id, 'comments', val)}
                                        className="w-full"
                                        isExpanded={isRowExpanded}
                                    />
                                </td>

                                {/* Deviation - Editable */}
                                <td className={`px-2 py-1 border-r border-slate-200 text-slate-600 ${cellClass}`} onClick={e => e.stopPropagation()}>
                                    <EditableCell
                                        value={task.deviation}
                                        onSave={(val) => onFieldUpdate(task.id, 'deviation', val)}
                                        className="w-full text-center"
                                        isExpanded={isRowExpanded}
                                    />
                                </td>


                                <td className="px-2 py-1 truncate text-center text-slate-600">
                                    {task.sprintLink ? (
                                        <a href={task.sprintLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>Link</a>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Per-Assignee Pagination */}
            {totalItems > itemsPerPage && (
                <div className="py-2 px-3 border-t border-slate-100">
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
