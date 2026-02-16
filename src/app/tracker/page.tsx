'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task, Leave } from '@/lib/types';
import { Search, Plus, Download, CalendarClock, X, ArrowUp, ArrowDown, Users, ArrowUpRight } from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import AssigneeTaskTable from '@/components/AssigneeTaskTable';
import { useGuestMode } from '@/contexts/GuestContext';
import { calculateAvailability } from '@/lib/availability';
import { useToast } from '@/contexts/ToastContext';
import { DatePicker } from '@/components/DatePicker';
import useColumnResizing from '@/hooks/useColumnResizing';
import ResizableHeader from '@/components/ui/ResizableHeader';
import CloseButton from '@/components/ui/CloseButton';
import TeamSelectorPill from '@/components/ui/TeamSelectorPill';
import { useTeams } from '@/hooks/useTeams';

export default function Tracker() {
    const { isGuest, selectedTeamId, selectedTeamName, setGuestSession, isLoading: isGuestLoading } = useGuestMode();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Availability Check State
    const [isAvailabilityCheckOpen, setIsAvailabilityCheckOpen] = useState(false);
    const [checkDate, setCheckDate] = useState('');
    const [availableMembers, setAvailableMembers] = useState<string[]>([]);
    const [hasChecked, setHasChecked] = useState(false);

    const { success, error: toastError } = useToast();
    const [viewMode, setViewMode] = useState<'active' | 'forecast'>('active');
    const [isRowExpanded, setIsRowExpanded] = useState(false);

    // Team Selector State (Manager Mode)
    const { teams } = useTeams(isGuest);

    // Column Resizing (Lifted State)
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


    const handleTeamSelect = (teamId: string, teamName: string) => {
        let targetTeamId = teamId;

        // QA Team -> Super Admin mapping logic (Mirrors Sidebar logic)
        if (teamName.toLowerCase() === 'qa team') {
            const superAdminTeam = teams.find(t => t.name.toLowerCase() === 'super admin');
            if (superAdminTeam) {
                targetTeamId = superAdminTeam.id;
            }
        }

        setGuestSession(targetTeamId, teamName);
        // Force reload to ensure context updates propogate clean
        window.location.reload();
    };

    // Fetch ALL active tasks (no pagination in query)
    useEffect(() => {
        if (isGuestLoading) return; // Wait for guest session to initialize

        async function fetchData() {
            setLoading(true);

            // 1. Fetch Tasks
            let taskQuery = supabase
                .from('tasks')
                .select('*')
                .not('status', 'in', '("Completed","Rejected")') // Robust filtering
                .order('start_date', { ascending: false });

            if (searchTerm) {
                // Expanded search to include Priority, Status, Comments
                taskQuery = taskQuery.or(`project_name.ilike.%${searchTerm}%,assigned_to.ilike.%${searchTerm}%,sub_phase.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%,priority.ilike.%${searchTerm}%,comments.ilike.%${searchTerm}%`);
            }

            // Manager/Guest Mode Filtering
            if (isGuest) {
                const isQATeamGlobal = selectedTeamId === 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

                if (selectedTeamId) {
                    // Even for QA Team, we want to filter by their team_id to avoid mixed data
                    // unless some specific "Everything" view is requested
                    taskQuery = taskQuery.eq('team_id', selectedTeamId);
                } else if (!selectedTeamId) {
                    console.warn('Manager Mode: selectedTeamId is missing, blocking data fetch.');
                    taskQuery = taskQuery.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            }

            const { data: taskData, error: taskError } = await taskQuery;

            if (taskError) {
                console.error('Error fetching tasks:', taskError);
            } else {
                let filteredData = taskData || [];

                // Client-side fallback to ensure Rejected/Completed are hidden
                filteredData = filteredData.filter(t => t.status !== 'Rejected' && t.status !== 'Completed');

                if (dateFilter) {
                    const selectedDate = new Date(dateFilter);
                    selectedDate.setHours(0, 0, 0, 0);

                    filteredData = filteredData.filter(t => {
                        const start = t.start_date ? new Date(t.start_date) : null;
                        const end = t.end_date ? new Date(t.end_date) : null;
                        if (!start) return false;
                        start.setHours(0, 0, 0, 0);
                        if (end) end.setHours(0, 0, 0, 0);
                        return start <= selectedDate && (!end || end >= selectedDate);
                    });
                }

                setTasks(filteredData.map(mapTaskFromDB));
            }

            // 2. Fetch Leaves (Active team only)
            try {
                let url = '/api/leaves';
                if (isGuest && selectedTeamId) {
                    url += `?team_id=${selectedTeamId}`;
                }
                const leavesRes = await fetch(url);
                if (leavesRes.ok) {
                    const leavesData = await leavesRes.json();
                    setLeaves(leavesData.leaves || []);
                }
            } catch (error) {
                console.error('Error fetching leaves:', error);
            }

            setLoading(false);
        }
        fetchData();
    }, [searchTerm, dateFilter, isGuest, selectedTeamId, isGuestLoading]);

    const handleAddTask = () => {
        setEditingTask(null);
        setIsTaskModalOpen(true);
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const saveTask = async (taskData: Partial<Task>) => {
        const dbPayload: any = {
            project_name: taskData.projectName,
            sub_phase: taskData.subPhase,
            status: taskData.status,
            assigned_to: taskData.assignedTo,
            assigned_to2: taskData.assignedTo2,
            additional_assignees: taskData.additionalAssignees || [],
            pc: taskData.pc,
            start_date: taskData.startDate || null,
            end_date: taskData.endDate || null,
            actual_completion_date: taskData.actualCompletionDate ? new Date(taskData.actualCompletionDate).toISOString() : null,
            start_time: taskData.startTime || null,
            end_time: taskData.endTime || null,
            bug_count: taskData.bugCount,
            html_bugs: taskData.htmlBugs,
            functional_bugs: taskData.functionalBugs,
            deviation_reason: taskData.deviationReason,
            sprint_link: taskData.sprintLink,
            days_allotted: Number(taskData.daysAllotted) || 0,
            time_taken: taskData.timeTaken || '00:00:00',
            days_taken: Number(taskData.daysTaken) || 0,
            deviation: Number(taskData.deviation) || 0,
            activity_percentage: Number(taskData.activityPercentage) || 0,
            comments: taskData.comments,
            current_updates: taskData.currentUpdates, // Ensure this is saved
            include_saturday: taskData.includeSaturday || false,
            include_sunday: taskData.includeSunday || false,
            team_id: isGuest ? selectedTeamId : taskData.teamId,
        };

        if (editingTask) {
            const { team_id, ...updatePayload } = dbPayload;

            // Use API to bypass RLS for Super Admins in Manager Mode
            // Send manager mode indicator in header
            const response = await fetch('/api/tasks/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false',
                },
                credentials: 'include',
                body: JSON.stringify({ id: editingTask.id, ...updatePayload })
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('Error updating task:', err);
                toastError(`Failed to save task: ${err.error || 'Server error'}`);
                return;
            }
            success('Task updated successfully');
        } else {
            // For insert, use API to bypass RLS for Managers
            if (isGuest) {
                const response = await fetch('/api/tasks/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dbPayload)
                });

                if (!response.ok) {
                    const err = await response.json();
                    console.error('Error creating task via API:', err);
                    toastError(`Failed to create task: ${err.error || 'Server error'}`);
                    return;
                }
            } else {
                const { error } = await supabase
                    .from('tasks')
                    .insert([dbPayload]);

                if (error) {
                    console.error('Error creating task:', error);
                    toastError(`Failed to create task: ${error.message}`);
                    return;
                }
            }
            success('Task created successfully');
        }

        // Refresh tasks
        refreshTasks();
        setIsTaskModalOpen(false);
    };

    const handleDeleteTask = async (taskId: number) => {
        // Send manager mode indicator in header
        const response = await fetch(`/api/tasks/delete?id=${taskId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false',
            },
            credentials: 'include',
        });

        if (!response.ok) {
            console.error('Error deleting task');
            toastError('Failed to delete task');
        } else {
            success('Task deleted successfully');
            refreshTasks();
            setIsTaskModalOpen(false);
        }
    };

    const refreshTasks = async () => {
        let taskQuery = supabase
            .from('tasks')
            .select('*')
            .not('status', 'in', '("Completed","Rejected")')
            .order('start_date', { ascending: false });

        // Apply Manager Mode filtering
        if (isGuest) {
            if (selectedTeamId) {
                taskQuery = taskQuery.eq('team_id', selectedTeamId);
            } else {
                console.warn('Manager Mode: selectedTeamId is missing during refresh.');
                taskQuery = taskQuery.eq('id', '00000000-0000-0000-0000-000000000000');
            }
        }

        const { data } = await taskQuery;

        if (data) {
            // Client-side fallback
            const filtered = data.filter((t: any) => t.status !== 'Rejected' && t.status !== 'Completed');
            setTasks(filtered.map(mapTaskFromDB));
        }
    };

    // Generalized Field Update Handler for Inline Editing
    const handleFieldUpdate = async (taskId: number, field: string, value: any) => {
        console.log('[Field Update] Starting update:', { taskId, field, value });

        // Optimistic UI Update (optional but good for UX)
        // For now, we wait for server response to be safe, but we could update local state immediately.

        const response = await fetch('/api/tasks/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false',
            },
            credentials: 'include',
            body: JSON.stringify({
                id: taskId,
                [field]: value
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('[Field Update] Error:', err);
            toastError('Failed to update task');
        } else {
            success('Task updated successfully');
            refreshTasks();
        }
    };

    // Filter and Sort Tasks
    const processedTasks = tasks
        // 1. Filter by View Mode
        .filter((task: Task) => {
            if (viewMode === 'forecast') {
                return task.status === 'Forecast';
            } else {
                // 'active' mode shows all fetched (which are already filtered for non-completed/rejected in fetchData)
                // and now we also exclude 'Forecast' tasks from 'active' view
                return task.status !== 'Forecast';
            }
        })
        // 2. Sort by Custom Status Order
        .sort((a, b) => {
            const statusOrder: Record<string, number> = {
                'In Progress': 1,
                'Forecast': 2,
                'On Hold': 3,
                'Yet to Start': 4,
                'Being Developed': 5,
                'Ready for QA': 6,
                'Assigned to QA': 7,
                'Review': 8
            };

            const orderA = statusOrder[a.status] || 99;
            const orderB = statusOrder[b.status] || 99;

            if (orderA !== orderB) return orderA - orderB;

            // Secondary Sort: Start Date (Ascending, Nulls Last)
            const dateA = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
            const dateB = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
            return dateA - dateB;
        });


    // Group by assignee (include Primary, Secondary, and Additional Assignees)
    const groupedTasks = processedTasks.reduce((acc, task) => {
        const assignees = new Set<string>();

        if (task.assignedTo) assignees.add(task.assignedTo);
        if (task.assignedTo2) assignees.add(task.assignedTo2);
        if (task.additionalAssignees) {
            task.additionalAssignees.forEach(a => assignees.add(a));
        }

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

    const exportCSV = () => {
        const headers = ['Project Name', 'Type', 'Priority', 'Phase', 'Status', 'Start Date', 'End Date', 'Actual End', 'Assignees', 'Bug Count', 'HTML Bugs', 'Functional Bugs', 'Comments', 'Current Updates'];
        const csvContent = [
            headers.join(','),
            ...tasks.map(t => [
                `"${t.projectName}"`,
                `"${t.projectType || ''}"`,
                `"${t.priority || ''}"`,
                `"${t.subPhase || ''}"`,
                `"${t.status}"`,
                t.startDate || '',
                t.endDate || '',
                t.actualCompletionDate || '',
                `"${t.assignedTo || ''} ${t.assignedTo2 || ''} ${(t.additionalAssignees || []).join(' ')}"`.trim(),
                t.bugCount || 0,
                t.htmlBugs || 0,
                t.functionalBugs || 0,
                `"${t.comments || ''}"`,
                `"${t.currentUpdates || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tracker_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const isTaskOverdue = (task: Task) => {
        if (!task.endDate || task.status === 'Completed' || task.status === 'Rejected') return false;
        const deadline = new Date(task.endDate);
        deadline.setHours(18, 30, 0, 0);
        return new Date() > deadline;
    };

    const handleCheckAvailability = () => {
        if (!checkDate) return;

        const targetDate = new Date(checkDate);
        targetDate.setHours(0, 0, 0, 0);

        const available: string[] = [];

        // Iterate over all assignees in groupedTasks
        Object.keys(groupedTasks).forEach(assignee => {
            if (assignee === 'Unassigned') return; // Skip Unassigned
            const assigneeTasks = groupedTasks[assignee];
            const assigneeLeaves = leaves.filter(l => l.team_member_name === assignee);

            const availableFrom = calculateAvailability(assigneeTasks, assigneeLeaves);
            availableFrom.setHours(0, 0, 0, 0);

            if (availableFrom <= targetDate) {
                available.push(assignee);
            }
        });

        setAvailableMembers(available.sort());
        setHasChecked(true);
    };

    return (
        <div className="max-w-[1920px] mx-auto pb-20"> {/* Extended max-width for extra columns */}
            <header className="flex flex-col gap-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Task Tracker</h1>
                        <p className="text-slate-500 dark:text-slate-400">Track all active tasks</p>
                    </div>

                    {/* Manager Mode Team Selector - Aligned with Title */}
                    {isGuest && teams.length > 0 && (
                        <div className="flex-1 flex justify-end min-w-0 overflow-x-auto no-scrollbar ml-4">
                            <TeamSelectorPill
                                teams={teams}
                                selectedTeamName={selectedTeamName}
                                onSelect={handleTeamSelect}
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative group w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Filter tasks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-[200px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-500 pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 text-xs transition-all shadow-sm"
                            />
                        </div>

                        <div className="w-full sm:w-auto flex justify-between sm:justify-start items-center gap-2">
                            <DatePicker
                                date={dateFilter}
                                setDate={setDateFilter}
                                placeholder="Filter by date"
                                className="w-[140px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 min-h-0 py-2 px-3 text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md"
                            />

                            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => setViewMode('active')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'active' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setViewMode('forecast')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'forecast' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    Forecast
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setIsAvailabilityCheckOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-4 py-2 rounded-lg transition-all font-semibold border border-indigo-100 dark:border-indigo-800 text-sm"
                        >
                            <Users size={16} />
                            Check
                        </button>
                        <button
                            onClick={exportCSV}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-4 py-2 rounded-lg transition-all font-semibold border border-emerald-100 dark:border-emerald-800 text-sm"
                        >
                            <ArrowUpRight size={16} />
                            Export
                        </button>
                        <button
                            onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-indigo-300 transition-all font-bold text-sm"
                        >
                            <Plus size={18} />
                            New Task
                        </button>
                    </div>
                </div>
            </header>

            {/* Availability Check Modal */}
            {
                isAvailabilityCheckOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Check Availability</h3>
                                <CloseButton onClick={() => setIsAvailabilityCheckOpen(false)} />
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Date needed from</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={checkDate}
                                            onChange={(e) => setCheckDate(e.target.value)}
                                            className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        />
                                        <button
                                            onClick={handleCheckAvailability}
                                            disabled={!checkDate}
                                            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Check
                                        </button>
                                    </div>
                                </div>

                                {hasChecked && (
                                    <div className="animate-in slide-in-from-bottom-2 duration-300">
                                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                                            {availableMembers.length} Available Member{availableMembers.length !== 1 ? 's' : ''}
                                        </h4>

                                        {availableMembers.length > 0 ? (
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                                {availableMembers.map((member: string) => (
                                                    <div key={member} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-200 dark:bg-emerald-900 flex items-center justify-center text-emerald-800 dark:text-emerald-100 font-bold text-xs">
                                                            {member.charAt(0)}
                                                        </div>
                                                        <span className="font-semibold text-emerald-900 dark:text-emerald-100">{member}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 border-dashed">
                                                <p className="text-slate-500 dark:text-slate-400">No members available on this date.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }


            {/* STICKY HEADER for All Tables */}
            <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-md border-b border-slate-200 dark:border-slate-700 mb-2 rounded-t-lg overflow-hidden transition-colors">
                <table className="w-full text-xs text-slate-800 dark:text-slate-200 border-collapse table-fixed">
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

            {/* Grouped Tasks - No global pagination, but each assignee table is paginated */}
            <div className="space-y-1"> {/* Reduced gap from space-y-2 to space-y-1 */}
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading tasks...</div>
                ) : Object.keys(groupedTasks).length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="text-slate-400 dark:text-slate-500 mb-2 font-medium">No tasks found</div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    Object.keys(groupedTasks)
                        .sort((a, b) => {
                            if (a === 'Unassigned') return 1;
                            if (b === 'Unassigned') return -1;
                            return a.localeCompare(b);
                        })
                        .map(assignee => (
                            <AssigneeTaskTable
                                key={assignee}
                                assignee={assignee}
                                tasks={groupedTasks[assignee]}
                                leaves={leaves}
                                columnWidths={columnWidths}
                                hideHeader={true} // Hide individual headers since we have a sticky one
                                isRowExpanded={isRowExpanded} // Pass Expand State
                                onResizeStart={startResizing}
                                onEditTask={handleEditTask}
                                onFieldUpdate={handleFieldUpdate}
                            />
                        ))
                )}
            </div>

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                task={editingTask}
                onSave={saveTask}
                onDelete={handleDeleteTask}
            />
        </div >
    );
}
