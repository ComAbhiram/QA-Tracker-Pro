import { useState, useMemo, useEffect, useRef } from 'react';
import { Task, isTaskOverdue, getOverdueDays, Leave } from '@/lib/types';
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
    Edit2
} from 'lucide-react';
import Loader from '@/components/ui/Loader';
import Pagination from '@/components/Pagination';
import { calculateAvailability } from '@/lib/availability';
import { DatePicker } from '@/components/DatePicker';
import { StatusBadge } from '@/components/ui/standard/StatusBadge';
import { PriorityBadge } from '@/components/ui/standard/PriorityBadge';
import Tooltip from '@/components/ui/Tooltip';
import SimpleTooltip from '@/components/ui/SimpleTooltip';
import QuickLeaveActions from './QuickLeaveActions';
import { mapHubstaffNameToQA } from '@/lib/hubstaff-name-mapping';

interface AssigneeTaskTableProps {
    assignee: string;
    tasks: Task[];
    leaves: Leave[];
    columnWidths: Record<string, number>;
    hideHeader?: boolean;
    isRowExpanded?: boolean;
    dateFilter?: Date | undefined;
    onEditTask: (task: Task) => void;
    onResizeStart?: (key: string, e: React.MouseEvent) => void;
    // Generalized update handler for inline edits
    onFieldUpdate: (taskId: number, field: string, value: any) => Promise<void>;
    // New prop to trigger parent refresh
    onLeaveUpdate?: () => void;
    selectedTeamId?: string | null;
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


export default function AssigneeTaskTable({
    assignee, tasks, leaves, columnWidths, hideHeader = false, isRowExpanded = false,
    dateFilter, onEditTask, onFieldUpdate, onLeaveUpdate, selectedTeamId, onResizeStart
}: AssigneeTaskTableProps) {
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
            'bg-slate-800 border-slate-700 text-slate-100', // Dark variant 1
            'bg-indigo-900 border-indigo-800 text-indigo-100', // Dark variant 2
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };
    const headerColorClass = getHeaderColor(assignee);
    const availabilityDate = calculateAvailability(tasks, leaves);

    // Check if assignee has leave for the filtered date or today
    const getActiveLeave = () => {
        // Use filtered date if available, otherwise use today in IST
        const targetDate = dateFilter
            ? dateFilter.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
            : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        // Normalization helper
        const normalize = (s: string) => s?.toLowerCase().trim() || '';
        const normalizedAssignee = normalize(assignee);
        const mappedAssigneeName = mapHubstaffNameToQA(assignee);
        const normalizedMapped = normalize(mappedAssigneeName);

        // Check for leave on the target date (filtered or today)
        const targetDateLeave = leaves.find(l => {
            const lName = normalize(l.team_member_name);
            // Enhanced matching: Exact, Mapped, or Partial
            const matchesName = lName === normalizedAssignee || lName === normalizedMapped;
            const matchesPartial = lName.includes(normalizedAssignee) || normalizedAssignee.includes(lName) ||
                (normalizedMapped && (lName.includes(normalizedMapped) || normalizedMapped.includes(lName)));

            return (matchesName || matchesPartial) && l.leave_date === targetDate;
        });

        if (targetDateLeave) {
            return { date: targetDate, type: targetDateLeave.leave_type };
        }

        // Only check for upcoming leave if NO date filter is active (showing today's view)
        if (!dateFilter) {
            const today = targetDate; // Already calculated as today above
            const todayDateObj = new Date(today);
            const nextWeekDateObj = new Date(todayDateObj);
            nextWeekDateObj.setDate(todayDateObj.getDate() + 7);
            const nextWeek = nextWeekDateObj.toISOString().split('T')[0];

            const upcomingLeave = leaves.find(l => {
                const lName = normalize(l.team_member_name);
                const matchesName = lName === normalizedAssignee || lName === normalizedMapped;
                const matchesPartial = lName.includes(normalizedAssignee) || normalizedAssignee.includes(lName) ||
                    (normalizedMapped && (lName.includes(normalizedMapped) || normalizedMapped.includes(lName)));

                if (!matchesName && !matchesPartial) return false;

                // String comparison works for YYYY-MM-DD
                return l.leave_date > today && l.leave_date <= nextWeek;
            });

            if (upcomingLeave) {
                return { date: upcomingLeave.leave_date, type: upcomingLeave.leave_type };
            }
        }

        return null;
    };

    const activeLeave = getActiveLeave();

    // Determine row background color based on active leave type
    // FL: Red, HL: Yellow/Orange, WFH: Blue
    const getLeaveRowClass = () => {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const filterDateStr = dateFilter?.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const checkDate = filterDateStr || todayStr;

        if (!activeLeave || activeLeave.date !== checkDate) return '';
        const type = activeLeave.type.toLowerCase();
        if (type.includes('full day')) return 'bg-red-50/50 dark:bg-red-900/10 border-l-4 border-l-red-500';
        if (type.includes('half day')) return 'bg-amber-50/50 dark:bg-amber-900/10 border-l-4 border-l-amber-500';
        if (type.includes('wfh') || type === 'work from home') return 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500';
        return '';
    };

    // Also style the table container? Or just rows?
    // User: "till the day ends the row of the employee should be highlighted with that color"
    // Since we have multiple rows per assignee, maybe highlight the HEADER or the CONTAINER?
    // "row of the employee" - usually implies the container in this grouped view, or every task row?
    // Highlighting every task row might be noisy.
    // Highlighting the CONTAINER or HEADER seems cleaner. Let's do Container + Header.

    const containerHighlight = getLeaveRowClass();

    // Dynamic Class for Cells
    const cellClass = isRowExpanded ? "whitespace-normal break-words" : "truncate";

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-2 transition-colors ${containerHighlight}`}>
            {/* Header Section (Compact) - Always visible per assignee table */}
            <div className={`px-3 py-1.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b dark:border-slate-800/50 ${headerColorClass} transition-colors group`}>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-black/5 flex items-center justify-center font-bold text-xs shadow-sm dark:text-slate-200">
                        {assignee.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xs leading-tight opacity-90">{assignee}</h3>
                            <QuickLeaveActions
                                assigneeName={assignee}
                                teamId={selectedTeamId || undefined}
                                date={activeLeave?.date === (dateFilter?.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) ? activeLeave.date : (dateFilter?.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))}
                                currentLeave={activeLeave && activeLeave.date === (dateFilter?.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) ? { leave_type: activeLeave.type } as any : null}
                                onUpdate={() => onLeaveUpdate?.()}
                            />
                        </div>
                        {activeLeave && (
                            <p className="text-[10px] text-orange-700 dark:text-orange-400 font-semibold mt-0.5">
                                {activeLeave.type === 'WFH' ? 'On WFH:' : 'On Leave:'} {format(new Date(activeLeave.date), 'MMM d')} ({activeLeave.type})
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-md border border-black/5">
                        <CalendarClock size={12} className="text-red-600 dark:text-red-400" />
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                            Available: {format(availabilityDate, 'MMM d')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-visible pb-0"> {/* Allow dropdowns to overflow if needed, but table-layout fixed handles most */}
                <table className="w-full text-xs text-slate-800 dark:text-slate-200 border-collapse table-fixed border border-slate-200 dark:border-slate-800">
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

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedTasks.map(task => (
                            <tr
                                key={task.id}
                                onClick={() => onEditTask(task)}
                                className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
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

                                <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 ${cellClass}`}>{task.projectType || '-'}</td>

                                <td className="px-2 py-1 truncate border-r border-slate-200 dark:border-slate-800">
                                    <div className="transform scale-90 origin-left">
                                        <PriorityBadge priority={task.priority} />
                                    </div>
                                </td>

                                <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${cellClass}`} title={task.subPhase || ''}>{task.subPhase || '-'}</td>
                                <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${cellClass}`}>{task.pc || '-'}</td>

                                {/* Status - Editable Select */}
                                <td className="px-2 py-1 border-r border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5 w-full min-w-0">
                                        <div className="flex-1 min-w-0">
                                            <StatusSelectCell status={task.status} onSave={(val) => onFieldUpdate(task.id, 'status', val)} />
                                        </div>
                                        {isTaskOverdue(task) && (
                                            <span className="flex-shrink-0 flex items-center gap-0.5 text-red-600 dark:text-red-400 font-bold text-[10px]" title={`${getOverdueDays(task)} days overdue`}>
                                                <AlertCircle size={10} /> {getOverdueDays(task)}d
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Start Date - Inline Edit */}
                                <td className="px-1 py-0.5 truncate border-r border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                                    <DatePicker
                                        date={task.startDate ? new Date(task.startDate) : undefined}
                                        setDate={(d) => handleDateChange(d, task.id, 'start_date')}
                                        className="w-full h-full border-none shadow-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1 text-[11px] font-normal min-h-[24px] py-0 dark:text-slate-200"
                                        placeholder="-"
                                    />
                                </td>

                                {/* End Date - Inline Edit */}
                                <td className={`px-1 py-0.5 truncate border-r border-slate-200 dark:border-slate-800 transition-colors ${isTaskOverdue(task) ? 'bg-red-50 dark:bg-red-900/20' : ''}`} onClick={(e) => e.stopPropagation()}>
                                    <DatePicker
                                        date={task.endDate ? new Date(task.endDate) : undefined}
                                        setDate={(d) => handleDateChange(d, task.id, 'end_date')}
                                        className={`w-full h-full border-none shadow-none bg-transparent rounded px-1 text-[11px] font-normal min-h-[24px] py-0 ${isTaskOverdue(task) ? 'text-red-700 dark:text-red-400 font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-200'}`}
                                        placeholder="-"
                                    />
                                </td>

                                <td className="px-2 py-1 truncate border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                    {task.actualCompletionDate ? format(new Date(task.actualCompletionDate), 'MMM d') : '-'}
                                </td>

                                {/* Comments - Editable */}
                                <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${cellClass}`} title={task.comments || ''} onClick={e => e.stopPropagation()}>
                                    <EditableCell
                                        value={task.comments}
                                        onSave={(val) => onFieldUpdate(task.id, 'comments', val)}
                                        className="w-full"
                                        isExpanded={isRowExpanded}
                                    />
                                </td>

                                {/* Deviation - Editable */}
                                <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${cellClass}`} onClick={e => e.stopPropagation()}>
                                    <EditableCell
                                        value={task.deviation}
                                        onSave={(val) => onFieldUpdate(task.id, 'deviation', val)}
                                        className="w-full text-center"
                                        isExpanded={isRowExpanded}
                                    />
                                </td>


                                <td className="px-2 py-1 truncate text-center text-slate-600 dark:text-slate-400">
                                    {task.sprintLink ? (
                                        <a href={task.sprintLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline" onClick={e => e.stopPropagation()}>Link</a>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Per-Assignee Pagination */}
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
