'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task, Leave } from '@/lib/types';
import { Search, Download, Calendar, Filter, FileSpreadsheet, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import AssigneeTaskTable from '@/components/AssigneeTaskTable';
import { useGuestMode } from '@/contexts/GuestContext';
import { useToast } from '@/contexts/ToastContext';
import { DatePicker } from '@/components/DatePicker';
import useColumnResizing from '@/hooks/useColumnResizing';
import { useTeams } from '@/hooks/useTeams';
import { getCurrentUserTeam } from '@/utils/userUtils';
import Loader from '@/components/ui/Loader';
import { useRouter } from 'next/navigation';
import ResizableHeader from '@/components/ui/ResizableHeader';

interface ProjectStatusPageProps {
    pageTitle: string;
    statusFilter: string | string[]; // Single status or array of statuses
    showAvailability?: boolean; // Whether to show availability/leaves header
    hideHeader?: boolean; // Whether to hide the page title/header section
}

interface TeamMember {
    id: number;
    name: string;
    display_order: number;
}

export default function ProjectStatusPage({ pageTitle, statusFilter, showAvailability = true, hideHeader = false }: ProjectStatusPageProps) {
    const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [pcFilter, setPcFilter] = useState('All');
    const [pcNames, setPcNames] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: Date | undefined; end: Date | undefined }>({ start: undefined, end: undefined });

    // Modals
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const { success, error: toastError } = useToast();

    // Team Data
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    // Column Resizing
    const { columnWidths, startResizing } = useColumnResizing({
        projectName: 200,
        projectType: 60,
        priority: 65,
        subPhase: 100,
        pc: 50,
        status: 110,
        startDate: 90,
        endDate: 90,
        actualCompletionDate: 80,
        comments: 120,
        deviation: 60,
        sprint: 50
    });

    // Fetch PC Names
    useEffect(() => {
        async function fetchPCNames() {
            try {
                const res = await fetch('/api/pcs');
                if (res.ok) {
                    const data = await res.json();
                    const pcs = data.pcs || [];
                    setPcNames(pcs.map((r: any) => typeof r === 'string' ? r : r.name));
                }
            } catch (err) {
                console.error('Error fetching PC names:', err);
            }
        }
        fetchPCNames();
    }, []);

    // Main Data Fetch
    const fetchData = useCallback(async () => {
        if (isGuestLoading) return;
        setLoading(true);

        try {
            // 1. Fetch User Profile if not guest
            let effectiveTeamId = selectedTeamId;
            if (!isGuest) {
                const profile = await getCurrentUserTeam();
                if (profile) {
                    effectiveTeamId = profile.team_id;
                }
            }

            // 2. Fetch Tasks
            let taskQuery = supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply Status Filter
            if (statusFilter !== 'All') {
                if (Array.isArray(statusFilter)) {
                    taskQuery = taskQuery.in('status', statusFilter);
                } else {
                    taskQuery = taskQuery.eq('status', statusFilter);
                }
            } else {
                // For 'All', usually we want to exclude some if strictly 'Active', but 'All' usually implies 'Overview'
                // typically excludes 'Completed' / 'Rejected' in Tracker, 
                // but here 'All' might mean EVERYTHING including historical?
                // The 'Task Overview' usually mimics Tracker, so maybe exclude 'Rejected'?
                // The current standard Tracker view excludes Completed/Rejected.
                // However, for an Overview Report, often we want to see everything.
                // But sticking to "Tracker UI" implies Active tasks.
                // Let's stick strictly to "All" meaning ALL statuses for now, or match Tracker?
                // User said "shows no data". If I filter out completed, and they have only completed, that's bad.
                // I will NOT filter out anything if 'All'.
            }

            // Apply Team Filter
            if (isGuest) {
                if (selectedTeamId) {
                    taskQuery = taskQuery.eq('team_id', selectedTeamId);
                } else {
                    // Manager mode safety
                    taskQuery = taskQuery.eq('id', 0);
                }
            } else if (effectiveTeamId) {
                // Optional: relying on RLS is standard, but explicit filter mimics Tracker logic
                // taskQuery = taskQuery.eq('team_id', effectiveTeamId); 
            }

            const { data: taskData, error: taskError } = await taskQuery;

            if (taskError) throw taskError;

            let fetchedTasks = (taskData || []).map(mapTaskFromDB);

            // Client-Side Filtering

            // Search Filter
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                fetchedTasks = fetchedTasks.filter(t =>
                    t.projectName?.toLowerCase().includes(lowerTerm) ||
                    t.assignedTo?.toLowerCase().includes(lowerTerm) ||
                    t.subPhase?.toLowerCase().includes(lowerTerm) ||
                    t.comments?.toLowerCase().includes(lowerTerm) ||
                    t.pc?.toLowerCase().includes(lowerTerm) ||
                    t.status?.toLowerCase().includes(lowerTerm)
                );
            }

            // PC Filter
            if (pcFilter !== 'All') {
                fetchedTasks = fetchedTasks.filter(t => t.pc === pcFilter);
            }

            // Date Range Filter
            if (dateRange.start || dateRange.end) {
                fetchedTasks = fetchedTasks.filter(t => {
                    const taskStart = t.startDate ? new Date(t.startDate) : null;
                    const taskEnd = t.endDate ? new Date(t.endDate) : null;

                    // Standard overlap logic or simple range check?
                    // Let's use Tracker logic: Start <= SelectedDate <= End
                    // But here we have a Range.
                    // Let's check if the Task's range overlaps with the Filter's range.
                    // (TaskStart <= FilterEnd) and (TaskEnd >= FilterStart)

                    const filterStart = dateRange.start ? new Date(dateRange.start) : new Date(0);
                    const filterEnd = dateRange.end ? new Date(dateRange.end) : new Date(8640000000000000);

                    // Sanitize times
                    filterStart.setHours(0, 0, 0, 0);
                    filterEnd.setHours(23, 59, 59, 999);

                    // If task has no dates, decide policy. Usually exclude or include?
                    // If filter is set, usually expect dates.
                    if (!taskStart && !taskEnd) return false;

                    const tStart = taskStart || new Date(0);
                    const tEnd = taskEnd || new Date(8640000000000000);

                    return tStart <= filterEnd && tEnd >= filterStart;
                });
            }

            setTasks(fetchedTasks);

            // 3. Fetch Team Members (for sorting)
            if (effectiveTeamId) {
                const { data: membersData } = await supabase
                    .from('team_members')
                    .select('id, name, display_order')
                    .eq('team_id', effectiveTeamId)
                    .order('display_order', { ascending: true });

                if (membersData) setTeamMembers(membersData);
            }

            // 4. Fetch Leaves (for availability context in headers)
            if (showAvailability) {
                const today = new Date();
                const past = new Date(today); past.setDate(today.getDate() - 14);
                const future = new Date(today); future.setDate(today.getDate() + 45);

                let leavesUrl = `/api/leaves?start_date=${past.toISOString().split('T')[0]}&end_date=${future.toISOString().split('T')[0]}`;
                if (effectiveTeamId) leavesUrl += `&team_id=${effectiveTeamId}`;

                const leavesRes = await fetch(leavesUrl);
                if (leavesRes.ok) {
                    const lData = await leavesRes.json();
                    setLeaves(lData.leaves || []);
                }
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            toastError('Failed to load project data');
        } finally {
            setLoading(false);
        }
    }, [isGuestLoading, isGuest, selectedTeamId, statusFilter, searchTerm, pcFilter, dateRange, showAvailability, toastError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handlers
    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            // Use API to ensure proper logging/permission checks
            const response = await fetch(`/api/tasks/delete?id=${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false',
                },
            });

            if (!response.ok) throw new Error('Failed to delete task');

            success('Task deleted successfully');
            fetchData();
            setIsTaskModalOpen(false);
        } catch (error: any) {
            console.error('Error deleting task:', error);
            toastError(error.message || 'Failed to delete task');
        }
    };

    const saveTask = async (taskData: Partial<Task> | Partial<Task>[]) => {
        try {
            const method = editingTask ? 'PUT' : 'POST';
            const url = editingTask ? '/api/tasks/update' : '/api/tasks/create';

            // Base payload
            let body;
            if (Array.isArray(taskData)) {
                body = taskData;
            } else {
                body = { ...taskData };
                if (editingTask) body.id = editingTask.id;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to save');
            }

            success('Task saved successfully');
            fetchData();
            setIsTaskModalOpen(false);
            setEditingTask(null);
        } catch (err: any) {
            console.error('Error saving task:', err);
            toastError(err.message);
        }
    };

    const handleFieldUpdate = async (taskId: number, field: string, value: any) => {
        try {
            // Use API for consistency
            const response = await fetch('/api/tasks/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false',
                },
                body: JSON.stringify({ id: taskId, [field]: value })
            });

            if (!response.ok) throw new Error('Failed to update task');

            success('Task updated');
            fetchData();
        } catch (err) {
            console.error('Error updating field:', err);
            toastError('Failed to update field');
        }
    };

    // Export CSV
    const exportCSV = () => {
        const headers = ['Project Name', 'Type', 'Priority', 'Phase', 'Status', 'Start Date', 'End Date', 'Actual End', 'Assignees', 'Bug Count', 'HTML Bugs', 'Functional Bugs', 'Comments'];
        const csvContent = [
            headers.join(','),
            ...tasks.map(t => [
                `"${t.projectName}"`,
                `"${t.projectType || ''}"`,
                `"${t.priority || ''}"`,
                `"${t.subPhase || ''}"`,
                `"${t.status}"`,
                `"${t.startDate ? new Date(t.startDate).toLocaleDateString() : ''}"`,
                `"${t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}"`,
                `"${t.actualCompletionDate ? new Date(t.actualCompletionDate).toLocaleDateString() : ''}"`,
                `"${[t.assignedTo, t.assignedTo2].filter(Boolean).join(' & ')}"`,
                `"${t.bugCount || 0}"`,
                `"${t.htmlBugs || 0}"`,
                `"${t.functionalBugs || 0}"`,
                `"${t.comments || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${pageTitle.replace(' ', '_')}_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // Grouping Logic
    const groupedTasks = useMemo(() => {
        return tasks.reduce((acc, task) => {
            const assignees = new Set<string>();
            if (task.assignedTo) assignees.add(task.assignedTo);
            if (task.assignedTo2) assignees.add(task.assignedTo2);
            if (task.additionalAssignees) task.additionalAssignees.forEach(a => assignees.add(a));

            if (assignees.size === 0) {
                const unassigned = 'Unassigned';
                if (!acc[unassigned]) acc[unassigned] = [];
                acc[unassigned].push(task);
            } else {
                assignees.forEach(assignee => {
                    if (!acc[assignee]) acc[assignee] = [];
                    acc[assignee].push(task);
                });
            }
            return acc;
        }, {} as Record<string, Task[]>);
    }, [tasks]);

    const sortedAssignees = useMemo(() => {
        return Object.keys(groupedTasks).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            const memberA = teamMembers.find(m => m.name === a);
            const memberB = teamMembers.find(m => m.name === b);
            if (memberA && memberB) return (memberA.display_order ?? 0) - (memberB.display_order ?? 0);
            return a.localeCompare(b);
        });
    }, [groupedTasks, teamMembers]);


    // Render
    return (
        <div className="max-w-[1800px] mx-auto space-y-6 p-4 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            {!hideHeader && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{pageTitle}</h1>
                            <p className="text-slate-500 dark:text-slate-400">Manage and track {pageTitle.toLowerCase()}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-sm w-full md:w-auto justify-center"
                        >
                            <FileSpreadsheet size={16} /> Export CSV
                        </button>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">

                {/* Search */}
                <div className="relative flex-1 w-full md:w-auto">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search projects, assignees, comments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>

                {/* Filters Group */}
                <div className="flex flex-wrap items-center gap-3">

                    {/* PC Filter */}
                    <div className="relative w-full sm:w-auto">
                        <select
                            value={pcFilter}
                            onChange={(e) => setPcFilter(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer w-full sm:w-auto min-w-[140px]"
                        >
                            <option value="All">All PCs</option>
                            {pcNames.map(pc => <option key={pc} value={pc}>{pc}</option>)}
                        </select>
                        <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-2 px-2 border-r border-slate-200 dark:border-slate-700 flex-1 sm:flex-none justify-center">
                            <span className="text-xs font-semibold text-slate-500 uppercase hidden sm:inline">From</span>
                            <DatePicker
                                date={dateRange.start}
                                setDate={(d) => setDateRange(prev => ({ ...prev, start: d }))}
                                placeholder="Start Date"
                                className="border-none bg-transparent shadow-none text-sm p-0 w-24 flex justify-center"
                            />
                        </div>
                        <div className="flex items-center gap-2 px-2 flex-1 sm:flex-none justify-center">
                            <span className="text-xs font-semibold text-slate-500 uppercase hidden sm:inline">To</span>
                            <DatePicker
                                date={dateRange.end}
                                setDate={(d) => setDateRange(prev => ({ ...prev, end: d }))}
                                placeholder="End Date"
                                className="border-none bg-transparent shadow-none text-sm p-0 w-24 flex justify-center"
                            />
                        </div>
                        {(dateRange.start || dateRange.end) && (
                            <button
                                onClick={() => setDateRange({ start: undefined, end: undefined })}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full ml-1"
                                title="Clear Dates"
                            >
                                <Filter size={12} className="text-slate-500" />
                            </button>
                        )}
                    </div>

                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader size="lg" /></div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500">No {pageTitle.toLowerCase()} found matching your filters.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* STICKY HEADER for All Tables */}
                    <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-md border-b border-slate-200 dark:border-slate-700 mb-2 rounded-t-lg overflow-x-auto no-scrollbar transition-colors">
                        <table className="w-full text-xs text-slate-800 dark:text-slate-200 border-collapse table-fixed min-w-[800px]">
                            <colgroup>
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
                            </colgroup>
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider backdrop-blur-md">
                                <tr>
                                    <ResizableHeader label="Project" widthKey="projectName" width={columnWidths.projectName} onResizeStart={startResizing} />
                                    <ResizableHeader label="Type" widthKey="projectType" width={columnWidths.projectType} onResizeStart={startResizing} />
                                    <ResizableHeader label="Priority" widthKey="priority" width={columnWidths.priority} onResizeStart={startResizing} />
                                    <ResizableHeader label="Phase" widthKey="subPhase" width={columnWidths.subPhase} onResizeStart={startResizing} />
                                    <ResizableHeader label="PC" widthKey="pc" width={columnWidths.pc} onResizeStart={startResizing} />
                                    <ResizableHeader label="Status" widthKey="status" width={columnWidths.status} onResizeStart={startResizing} />
                                    <ResizableHeader label="Start" widthKey="startDate" width={columnWidths.startDate} onResizeStart={startResizing} />
                                    <ResizableHeader label="End" widthKey="endDate" width={columnWidths.endDate} onResizeStart={startResizing} />
                                    <ResizableHeader label="Actual End" widthKey="actualCompletionDate" width={columnWidths.actualCompletionDate} onResizeStart={startResizing} />
                                    <ResizableHeader label="Comments" widthKey="comments" width={columnWidths.comments} isSortable={false} onResizeStart={startResizing} />
                                    <ResizableHeader label="Deviation" widthKey="deviation" width={columnWidths.deviation} onResizeStart={startResizing} />
                                    <ResizableHeader label="Sprint" widthKey="sprint" width={columnWidths.sprint} isSortable={false} onResizeStart={startResizing} />
                                </tr>
                            </thead>
                        </table>
                    </div>

                    {sortedAssignees.map(assignee => (
                        <AssigneeTaskTable
                            key={assignee}
                            assignee={assignee}
                            tasks={groupedTasks[assignee]}
                            leaves={leaves}
                            columnWidths={columnWidths}
                            hideHeader={true}
                            onEditTask={handleEditTask}
                            onFieldUpdate={handleFieldUpdate}
                            onResizeStart={startResizing}
                            // onLeaveUpdate={...} // Optional
                            selectedTeamId={selectedTeamId}
                        />
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                task={editingTask}
                onSave={saveTask}
                onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
            />

        </div>
    );
}
