import { useState, useMemo, useEffect, useRef } from 'react';
import { Task, isTaskOverdue, getOverdueDays } from '@/lib/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    Edit2,
    Activity,
    GripVertical
} from 'lucide-react';
import Loader from '@/components/ui/Loader';
import Pagination from '@/components/Pagination';
import { DatePicker } from '@/components/DatePicker';
import { StatusBadge } from '@/components/ui/standard/StatusBadge';
import { PriorityBadge } from '@/components/ui/standard/PriorityBadge';
import Tooltip from '@/components/ui/Tooltip';
import SimpleTooltip from '@/components/ui/SimpleTooltip';

interface ProjectTaskTableProps {
    projectName: string;
    tasks: Task[];
    columnWidths: Record<string, number>;
    hideHeader?: boolean;
    isRowExpanded?: boolean;
    isReadOnly?: boolean;
    dateFilter?: Date | undefined;
    onEditTask: (task: Task) => void;
    onResizeStart?: (key: string, e: React.MouseEvent) => void;
    // Generalized update handler for inline edits
    onFieldUpdate: (taskId: number, field: string, value: any) => Promise<void>;
    selectedTeamId?: string | null;
    dragHandleProps?: any; // For @dnd-kit
}

type SortKey = 'projectName' | 'assignees' | 'daysAllotted' | 'timeTaken' | 'activityPercentage' | 'deviation';

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
                    className={`w-full bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100 shadow-sm ${className}`}
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
                    className={`w-full bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100 shadow-sm resize-none overflow-hidden ${className}`}
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
                className={`w-full bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100 shadow-sm ${className}`}
            />
        );
    }

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            className={`cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[20px] rounded px-1 py-0.5 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 ${isExpanded ? 'whitespace-normal break-words' : 'truncate'} ${className}`}
            title={value?.toString() || 'Click to edit'}
        >
            {value || <span className="opacity-0 group-hover:opacity-30">-</span>}
        </div>
    );
};

// Status Select Cell (Specialized)
const StatusSelectCell = ({ status, onSave }: { status: string, onSave: (val: string) => void }) => {
    const statusOptions = [
        'Yet to Start', 'Being Developed', 'Ready for QA', 'Assigned to QA',
        'In Progress', 'On Hold', 'Completed', 'Forecast', 'Rejected'
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="outline-none w-full text-left focus:ring-0">
                <div className="cursor-pointer hover:opacity-80 transition-opacity min-w-0 overflow-hidden">
                    <StatusBadge status={status} />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {statusOptions.map((s) => (
                    <DropdownMenuItem
                        key={s}
                        onClick={() => onSave(s)}
                        className="text-xs cursor-pointer py-1.5 focus:bg-slate-100 dark:focus:bg-slate-700 dark:text-slate-200"
                    >
                        {s}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default function ProjectTaskTable({
    projectName, tasks, columnWidths, hideHeader = false, isRowExpanded = false,
    dateFilter, onEditTask, onFieldUpdate, selectedTeamId, onResizeStart,
    dragHandleProps, isReadOnly = false
}: ProjectTaskTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
    const itemsPerPage = 10;

    // Sorting Logic
    const sortedTasks = useMemo(() => {
        let sortableTasks = [...tasks];
        if (sortConfig !== null) {
            sortableTasks.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Task];
                let bValue: any = b[sortConfig.key as keyof Task];
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

    const handleDateChange = async (date: Date | undefined, taskId: number, field: string) => {
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
            'bg-slate-800 border-slate-700 text-slate-100', // Dark variant 1
            'bg-indigo-900 border-indigo-800 text-indigo-100', // Dark variant 2
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };
    const headerColorClass = getHeaderColor(projectName);

    const sumDaysAllotted = tasks.reduce((sum, t) => sum + (Number(t.daysAllotted) || 0), 0).toFixed(2);

    const sumTimeTakenString = () => {
        let totalSeconds = 0;
        tasks.forEach(t => {
            if (!t.timeTaken) return;
            const parts = t.timeTaken.split(':').map(Number);
            if (parts.length === 3) {
                totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
        });
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const sumActivityPercentage = tasks.reduce((sum, t) => sum + (Number(t.activityPercentage) || 0), 0);

    // Dynamic Class for Cells
    const cellClass = isRowExpanded ? "whitespace-normal break-words" : "truncate";

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-2 transition-colors`}>
            {/* Header Section (Compact) - Always visible per project table */}
            <div className={`px-3 py-1.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b dark:border-slate-800/50 ${headerColorClass} transition-colors group`}>
                <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    {dragHandleProps && (
                        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/5 rounded transition-colors text-slate-400">
                            <GripVertical size={14} />
                        </div>
                    )}
                    <div className="w-6 h-6 rounded-full bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-black/5 flex items-center justify-center font-bold text-xs shadow-sm dark:text-slate-200">
                        {projectName.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xs leading-tight opacity-90">{projectName}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 ml-6 hidden sm:flex text-[11px] font-semibold opacity-90">
                        <span className="flex items-center gap-1" title="Days Allotted"><Clock size={12} /> {sumDaysAllotted}</span>
                        <span className="flex items-center gap-1" title="Time Taken"><CalendarClock size={12} /> {sumTimeTakenString()}</span>
                        <span className="flex items-center gap-1" title="Activity %"><Activity size={12} /> {sumActivityPercentage}%</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto no-scrollbar pb-0">
                <table className="w-full text-xs text-slate-800 dark:text-slate-200 border-collapse table-fixed border border-slate-200 dark:border-slate-800">
                    <col style={{ width: columnWidths.projectName }} />
                    <col style={{ width: columnWidths.assignees }} />
                    <col style={{ width: columnWidths.daysAllotted }} />
                    <col style={{ width: columnWidths.timeTaken }} />
                    <col style={{ width: columnWidths.activityPercentage }} />
                    <col style={{ width: columnWidths.deviation }} />
                    {/* Removed inner thead because we now use a single sticky header over all projects */}

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedTasks.map(task => {
                            // Calculate Deviation dynamically based on Time Taken vs Days Allotted
                            let calculatedDeviation = 0;
                            if (task.timeTaken && task.daysAllotted) {
                                const parts = task.timeTaken.split(':').map(Number);
                                if (parts.length === 3) {
                                    const fractionalDays = (parts[0] * 3600 + parts[1] * 60 + parts[2]) / 86400; // 24 hours in seconds
                                    calculatedDeviation = fractionalDays - Number(task.daysAllotted);
                                }
                            }

                            return (
                                <tr
                                    key={task.id}
                                    onClick={() => !isReadOnly && onEditTask(task)}
                                    className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                >
                                    <td className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-200">
                                        <div className={cellClass} title={task.projectName}>{task.projectName}</div>
                                        {task.currentUpdates && (
                                            <SimpleTooltip
                                                content={task.currentUpdates}
                                                className="mt-0.5 cursor-help"
                                            >
                                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
                                                    Updates
                                                </span>
                                            </SimpleTooltip>
                                        )}
                                    </td>

                                    <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${cellClass}`}>
                                        <div className="flex flex-col gap-0.5">
                                            {task.assignedTo && <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">{task.assignedTo}</span>}
                                            {task.assignedTo2 && <span className="text-[10px] text-slate-500 dark:text-slate-400">{task.assignedTo2}</span>}
                                            {task.additionalAssignees && task.additionalAssignees.map(a => (
                                                <span key={a} className="text-[10px] text-slate-500 dark:text-slate-400">{a}</span>
                                            ))}
                                        </div>
                                    </td>

                                    <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${cellClass}`} onClick={e => e.stopPropagation()}>
                                        {isReadOnly
                                            ? <span className="text-xs text-center block">{task.daysAllotted || '-'}</span>
                                            : <EditableCell
                                                value={task.daysAllotted}
                                                onSave={(val) => onFieldUpdate(task.id, 'days_allotted', val)}
                                                className="w-full text-center"
                                                isExpanded={isRowExpanded}
                                            />
                                        }
                                    </td>

                                    <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${cellClass}`} onClick={e => e.stopPropagation()}>
                                        {isReadOnly
                                            ? <span className="text-xs text-center block">{task.timeTaken || '-'}</span>
                                            : <EditableCell
                                                value={task.timeTaken}
                                                onSave={(val) => onFieldUpdate(task.id, 'time_taken', val)}
                                                className="w-full text-center"
                                                isExpanded={isRowExpanded}
                                            />
                                        }
                                    </td>

                                    <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${cellClass}`} onClick={e => e.stopPropagation()}>
                                        {isReadOnly
                                            ? <span className="text-xs text-center block">{task.activityPercentage || '-'}</span>
                                            : <EditableCell
                                                value={task.activityPercentage}
                                                onSave={(val) => onFieldUpdate(task.id, 'activity_percentage', val)}
                                                className="w-full text-center"
                                                isExpanded={isRowExpanded}
                                            />
                                        }
                                    </td>

                                    {/* Calculated Deviation (Read-Only) */}
                                    <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${cellClass}`} onClick={e => e.stopPropagation()}>
                                        <span className={`text-xs text-center block ${calculatedDeviation > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {calculatedDeviation !== 0 ? calculatedDeviation.toFixed(2) : '-'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Per-Project Pagination */}
            {totalItems > itemsPerPage && (
                <div className="py-2 px-3 border-t border-slate-100 dark:border-slate-800">
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
