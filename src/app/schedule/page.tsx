
'use client';

import TaskDetailsModal from "@/components/TaskDetailsModal";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task, isTaskOverdue, getOverdueDays } from '@/lib/types';
import { getEffectiveStatus } from '@/utils/taskUtils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isWeekend, addMonths, subMonths, addDays, subDays } from 'date-fns';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, User, AlertCircle, Plus, Table2, LayoutGrid,
    CheckCircle2, Circle, PauseCircle, Cloud, XCircle, PlayCircle, Code2
} from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import Loader from '@/components/ui/Loader';

import { useGuestMode } from '@/contexts/GuestContext';
import { getCurrentUserTeam } from '@/utils/userUtils';
import { StatusBadge } from "@/components/ui/standard/StatusBadge";
import { PriorityBadge } from "@/components/ui/standard/PriorityBadge";
import { StandardTableStyles } from "@/components/ui/standard/TableStyles";

// Helper for Status Icons (consistent with AssigneeTaskTable)
const getStatusIcon = (status: string, size: number = 14) => {
    switch (status) {
        case 'In Progress': return <Loader size="xs" color="#2563eb" />;
        case 'Being Developed': return <Code2 size={size} className="text-purple-600" />;
        case 'Completed': return <CheckCircle2 size={size} className="text-emerald-600" />;
        case 'Yet to Start': return <Circle size={size} className="text-slate-500" />;
        case 'Forecast': return <Cloud size={size} className="text-violet-600" />;
        case 'On Hold': return <PauseCircle size={size} className="text-amber-600" />;
        case 'Ready for QA': return <Clock size={size} className="text-pink-600" />;
        case 'Assigned to QA': return <Clock size={size} className="text-cyan-600" />;
        case 'Rejected': return <XCircle size={size} className="text-red-600" />;
        default: return <Circle size={size} className="text-slate-400" />;
    }
};

const StatusLegend = () => (
    <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 mt-2 xl:mt-0 overflow-x-auto whitespace-nowrap max-w-full no-scrollbar shadow-sm">
        <span className="font-bold text-slate-750 dark:text-white uppercase tracking-wider text-[10px]">Status:</span>
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 dark:border-slate-700 last:border-0"><Circle size={10} className="text-amber-500 fill-amber-500/20" /> Yet to Start</div>
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 dark:border-slate-700 last:border-0"><Code2 size={10} className="text-purple-550 dark:text-purple-400" /> Developed</div>
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 dark:border-slate-700 last:border-0"><Clock size={10} className="text-pink-550 dark:text-pink-400" /> Ready for QA</div>
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 dark:border-slate-700 last:border-0"><Clock size={10} className="text-cyan-550 dark:text-cyan-400" /> Assigned to QA</div>
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 dark:border-slate-700 last:border-0"><Loader size="xs" color="#2563eb" /> In Progress</div>
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 dark:border-slate-700 last:border-0"><PauseCircle size={10} className="text-slate-500" /> On Hold</div>
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 dark:border-slate-700 last:border-0"><CheckCircle2 size={10} className="text-emerald-550 dark:text-emerald-400" /> Completed</div>
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-200 dark:border-slate-700 last:border-0"><Cloud size={10} className="text-violet-555 dark:text-violet-400" /> Forecast</div>
        <div className="flex items-center gap-1.5 px-2"><XCircle size={10} className="text-red-550 dark:text-red-400" /> Rejected</div>
    </div>
);

export default function Schedule() {
    const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'day'>('calendar');
    const [showTableView, setShowTableView] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); const [editingTask, setEditingTask] = useState<Task | null>(null);

    useEffect(() => {
        if (!isGuestLoading) {
            fetchTasks();
        }
    }, [currentDate, viewMode, isGuest, selectedTeamId, isGuestLoading]);

    async function fetchTasks() {
        setLoading(true);
        let start, end;

        if (viewMode === 'calendar') {
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
        } else {
            // Use month range for day view too, to allow easy switching
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
        }

        let query = supabase
            .from('tasks')
            .select('*')
            .lte('start_date', end.toISOString().split('T')[0])
            .gte('end_date', start.toISOString().split('T')[0]);

        // Manager/Guest Mode Filtering
        if (isGuest) {
            if (selectedTeamId) {
                query = query.eq('team_id', selectedTeamId);
            } else {
                // Prevent data leak if team ID is missing
                console.warn('Manager Mode: selectedTeamId is missing, blocking data fetch.');
                query = query.eq('id', 0);
            }
        } else {
            // Logged-in user (e.g. QA Team / super_admin) - restrict to their own team
            const profile = await getCurrentUserTeam();
            if (profile?.team_id) {
                query = query.eq('team_id', profile.team_id);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching tasks:', error);
        } else {
            setTasks((data || []).map(mapTaskFromDB));
        }
        setLoading(false);
    }

    const nextPeriod = () => {
        if (viewMode === 'calendar') {
            setCurrentDate(addMonths(currentDate, 1));
        } else {
            setCurrentDate(addDays(currentDate, 1));
        }
    };

    const prevPeriod = () => {
        if (viewMode === 'calendar') {
            setCurrentDate(subMonths(currentDate, 1));
        } else {
            setCurrentDate(subDays(currentDate, 1));
        }
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Calendar Grid Generation
    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });
    const startPadding = Array.from({ length: startOfMonth(currentDate).getDay() });

    // Helper to calculate status on a specific date
    const getStatusOnDate = (task: Task, date: Date) => {
        // Rejected tasks are never overdue
        if (task.status === 'Rejected') {
            return { status: 'Rejected', overdueDays: 0, baseStatus: 'Rejected' };
        }

        const start = task.startDate ? new Date(task.startDate) : null;
        const end = task.endDate ? new Date(task.endDate) : null;

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        const checkDate = new Date(date);
        checkDate.setHours(12, 0, 0, 0);

        // Check if completed by this date
        if (task.actualCompletionDate) {
            const completion = new Date(task.actualCompletionDate);
            // completion.setHours(0, 0, 0, 0); // Don't normalize here, we care about the exact time for cutoff

            // If completed ON or BEFORE this date (approx check)
            // If completion was <= checkDate (end of day), we show it.
            const checkEndOfDay = new Date(checkDate);
            checkEndOfDay.setHours(23, 59, 59, 999);

            if (completion <= checkEndOfDay) {
                if (end) {
                    // Completion Rule: If completed AFTER [Due Date + 1 day at 00:00:00], it is late.
                    // i.e., strict deadline is End Date @ 23:59:59.
                    const strictDeadline = new Date(end);
                    strictDeadline.setHours(23, 59, 59, 999);

                    if (completion > strictDeadline) {
                        // It is completed late. Calculate overdue days relative to deadline.
                        const diffTime = completion.getTime() - strictDeadline.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return { status: 'Completed (Overdue)', overdueDays: diffDays, baseStatus: 'Completed' };
                    }
                }
                return { status: 'Completed', overdueDays: 0, baseStatus: 'Completed' };
            }
        }

        // Not completed yet (or completed later than this checkDate)
        // Check if Overdue relative to this date
        if (end) {
            // Overdue Rule: Use 6:30 PM cutoff for FUTURE days.
            // If checkDate > EndDate, we only mark overdue if NOW > (EndDate + 6:30 PM).

            const now = new Date();
            const overdueCutoff = new Date(end);
            overdueCutoff.setHours(18, 30, 0, 0); // 6:30 PM on Due Date

            // If the date we are checking is AFTER the end date
            if (checkDate > end) {
                // Visibility logic: Is it ACTUALLY overdue right now?
                // If NOT overdue yet (before 6:30 PM on due date), show normal status (In Progress)
                if (now < overdueCutoff) {
                    return { status: getEffectiveStatus(task), overdueDays: 0, baseStatus: getEffectiveStatus(task) };
                }

                // If it IS overdue (after 6:30 PM), calculate how many days late relative to checkDate
                // Logic: checkDate - end
                // E.g. Due Feb 11. checkDate Feb 12. 
                // diff = 1 day.
                const diffTime = checkDate.getTime() - end.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { status: 'Overdue', overdueDays: diffDays, baseStatus: 'Overdue' };
            }
        }

        // Otherwise return current status or 'In Progress' if within range
        return { status: getEffectiveStatus(task), overdueDays: 0, baseStatus: getEffectiveStatus(task) };
    };

    // Day View Tasks
    const dayViewTasks = tasks.filter(task => {
        if (!task.startDate || !task.endDate) return false;
        const start = new Date(task.startDate);
        const end = new Date(task.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const target = new Date(currentDate);
        target.setHours(12, 0, 0, 0); // Use noon to avoid timezone edge cases

        // Define "Today" for comparison
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        // Normal range check
        if (target >= start && target <= end) return true;

        // Historical/Persistent Overdue Check
        if (target > end) {
            // New Logic: Don't show overdue tasks on future dates if they are > 1 day overdue
            // This prevents "Feb 6" overdue tasks from showing up on "Feb 12" view
            if (target > now) {
                // If viewing a future date (e.g. Next Week), don't show old overdue stuff
                // Allow "Tomorrow" (+1d) to show, but not beyond that
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(23, 59, 59, 999);

                if (target > tomorrow) return false;
            }

            const statusInfo = getStatusOnDate(task, target);
            if (statusInfo.baseStatus === 'Overdue') return true;
            // Also show if completed ON this target date (late)
            if (statusInfo.status.includes('Completed (Overdue)') && task.actualCompletionDate) {
                const completion = new Date(task.actualCompletionDate);
                if (isSameDay(completion, target)) return true;
            }
        }

        return false;
    });

    const getStatusColor = (task: Task) => {
        const statusInfo = getStatusOnDate(task, currentDate);
        const s = (statusInfo.baseStatus || '').toLowerCase();

        if (statusInfo.status.includes('Completed (Overdue)')) {
            return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md ring-2 ring-rose-500/50';
        }

        if (s === 'completed') return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md';
        if (s === 'in progress' || s === 'being developed') return 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md';
        if (s === 'rejected') return 'bg-gradient-to-r from-rose-600 to-red-650 text-white border-red-500 shadow-md';
        if (s === 'overdue') return 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-rose-505 shadow-md animate-pulse';
        if (s.includes('qa') || s === 'ready for qa' || s === 'assigned to qa') return 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-yellow-400 shadow-md';
        if (s === 'yet to start' || s === 'forecast') return 'bg-gradient-to-r from-amber-500 to-orange-550 text-white border-amber-450 shadow-md';
        if (s === 'on hold') return 'bg-gradient-to-r from-slate-650 to-slate-700 text-white border-slate-600 shadow-md';
        return 'bg-gradient-to-r from-sky-600 to-blue-500 text-white border-sky-500 shadow-md';
    };

    const getTaskBorderColor = (task: Task, date: Date = currentDate) => {
        const statusInfo = getStatusOnDate(task, date);
        const s = (statusInfo.baseStatus || '').toLowerCase();

        if (statusInfo.status.includes('Completed (Overdue)')) {
            return 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-350 border-emerald-500/25 dark:border-emerald-500/35 ring-1 ring-rose-500/30';
        }

        if (s === 'completed') return 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-350 border-emerald-500/20 dark:border-emerald-500/30';
        if (s === 'in progress' || s === 'being developed') return 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-350 border-blue-500/20 dark:border-blue-500/30';
        if (s === 'rejected') return 'bg-red-500/10 dark:bg-red-500/20 text-red-650 dark:text-red-350 border-red-500/20 dark:border-red-500/30';
        if (s === 'overdue') return 'bg-rose-500/15 dark:bg-rose-500/25 text-rose-700 dark:text-rose-350 border-rose-500/35 dark:border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.15)] animate-pulse';
        if (s.includes('qa') || s === 'ready for qa' || s === 'assigned to qa') return 'bg-pink-500/10 dark:bg-pink-500/20 text-pink-700 dark:text-pink-350 border-pink-500/20 dark:border-pink-500/30';
        if (s === 'yet to start' || s === 'forecast') return 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-350 border-amber-500/20 dark:border-amber-500/30';
        if (s === 'on hold') return 'bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-350 border-slate-500/20 dark:border-slate-500/30';
        return 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-350 border-sky-500/20 dark:border-sky-500/30';
    };

    const getStatusBadgeColor = (task: Task) => {
        const status = getEffectiveStatus(task);
        const s = (status || '').toLowerCase();

        // Check for Late Completion
        if (s === 'completed' && task.endDate && task.actualCompletionDate) {
            if (new Date(task.actualCompletionDate) > new Date(task.endDate)) {
                return 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white ring-2 ring-rose-450';
            }
        }

        if (s === 'completed') return 'bg-gradient-to-r from-emerald-500 to-teal-650 text-white';
        if (s === 'in progress' || s === 'being developed') return 'bg-gradient-to-r from-blue-500 to-indigo-650 text-white';
        if (s === 'rejected') return 'bg-gradient-to-r from-red-500 to-rose-650 text-white';
        if (s === 'overdue') return 'bg-gradient-to-r from-rose-500 to-red-650 text-white';
        if (s.includes('qa') || s === 'ready for qa' || s === 'assigned to qa') return 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white';
        if (s === 'yet to start' || s === 'forecast') return 'bg-gradient-to-r from-amber-500 to-orange-550 text-white';
        if (s === 'on hold') return 'bg-gradient-to-r from-slate-500 to-slate-650 text-white';
        return 'bg-gradient-to-r from-sky-500 to-blue-600 text-white';
    };


    const handleTaskClick = (task: Task) => {
        setEditingTask(task);
        setIsDetailModalOpen(true);
    };

    const handleEditTask = (task: Task) => {
        setIsDetailModalOpen(false);
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const handleAddTask = () => {
        setEditingTask(null);
        setIsTaskModalOpen(true);
    };

    const saveTask = async (taskData: Partial<Task> | Partial<Task>[]) => {
        // Helper to format payload
        const formatPayload = (t: Partial<Task>) => {
            const payloadACD = t.actualCompletionDate ? new Date(t.actualCompletionDate).toISOString() : null;
            return {
                project_name: t.projectName,
                project_type: t.projectType,
                sub_phase: t.subPhase,
                priority: t.priority,
                pc: t.pc,
                status: t.status,
                assigned_to: t.assignedTo,
                assigned_to2: t.assignedTo2,
                start_date: t.startDate || null,
                end_date: t.endDate || null,
                actual_completion_date: payloadACD,
                comments: t.comments,
                current_updates: t.currentUpdates,
                bug_count: t.bugCount,
                html_bugs: t.htmlBugs,
                functional_bugs: t.functionalBugs,
                deviation_reason: t.deviationReason,
                sprint_link: t.sprintLink,
                days_allotted: Number(t.daysAllotted) || 0,
                time_taken: t.timeTaken || '00:00:00',
                days_taken: Number(t.daysTaken) || 0,
                deviation: Number(t.deviation) || 0,
                activity_percentage: Number(t.activityPercentage) || 0,
                include_saturday: t.includeSaturday || false,
                include_sunday: t.includeSunday || false,
                team_id: t.teamId
            };
        };

        try {
            if (Array.isArray(taskData)) {
                // Bulk Operation
                const payloads = taskData.map(formatPayload);

                if (editingTask) {
                    // Update main + Create others
                    const [first, ...rest] = payloads;
                    if (first) {
                        const { team_id, ...updatePayload } = first;
                        const { error } = await supabase
                            .from('tasks')
                            .update(updatePayload)
                            .eq('id', editingTask.id);
                        if (error) throw error;
                    }
                    if (rest.length > 0) {
                        const { error } = await supabase
                            .from('tasks')
                            .insert(rest);
                        if (error) throw error;
                    }
                } else {
                    // Bulk Create
                    const { error } = await supabase
                        .from('tasks')
                        .insert(payloads);
                    if (error) throw error;
                }

            } else {
                // Single Operation
                const dbPayload = formatPayload(taskData);

                if (editingTask) {
                    // UPDATE existing task
                    const { team_id, ...updatePayload } = dbPayload;
                    const { error } = await supabase
                        .from('tasks')
                        .update(updatePayload)
                        .eq('id', editingTask.id);

                    if (error) {
                        console.error('Error updating task:', error);
                        alert(`Failed to save task: ${error.message}`);
                        return;
                    }
                } else {
                    // CREATE new task
                    const { error } = await supabase
                        .from('tasks')
                        .insert([dbPayload]);

                    if (error) {
                        console.error('Error creating task:', error);
                        alert(`Failed to create task: ${error.message}`);
                        return;
                    }
                }
            }

            await fetchTasks();
            setIsTaskModalOpen(false);
        } catch (error: any) {
            console.error('Error saving task:', error);
            alert(`Failed to save task: ${error.message}`);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        } else {
            await fetchTasks();
            setIsTaskModalOpen(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6">
            <header className="glass-card-premium p-6 rounded-2xl border border-white/20 dark:border-slate-800/80 space-y-6">

                {/* Vertical Stack: Title/Desc then Status Guide */}
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Work Schedule</h1>
                        <p className="text-slate-500 dark:text-slate-400">Manage project timelines and daily tasks</p>
                    </div>
                    <div className="overflow-x-auto max-w-full pb-2">
                        <StatusLegend />
                    </div>
                </div>

                {/* Row 2: Controls & Navigation */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">

                    {/* Left: View Toggles */}
                    <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => { setViewMode('calendar'); setShowTableView(false); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <CalendarIcon size={16} /> Monthly
                            </button>
                            <button
                                onClick={() => { setViewMode('day'); setShowTableView(false); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <List size={16} /> Daily
                            </button>
                        </div>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setShowTableView(false)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!showTableView ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <LayoutGrid size={16} /> Grid
                            </button>
                            <button
                                onClick={() => setShowTableView(true)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${showTableView ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <Table2 size={16} /> List
                            </button>
                        </div>
                    </div>

                    {/* Right: Navigation & Action */}
                    <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-between xl:justify-end">
                        <div className="flex items-center gap-2">
                            <button onClick={prevPeriod} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all">
                                <ChevronLeft size={20} />
                            </button>
                            <div className="min-w-[160px] text-center font-bold text-lg text-slate-800 dark:text-slate-100">
                                {viewMode === 'calendar' ? format(currentDate, 'MMMM yyyy') : format(currentDate, 'MMM d, yyyy')}
                            </div>
                            <button onClick={nextPeriod} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all">
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <button onClick={goToToday} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                            Today
                        </button>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                        <button
                            onClick={handleAddTask}
                            className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus size={18} /> New
                        </button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className={`glass-card-premium rounded-2xl border border-white/20 dark:border-slate-800/80 backdrop-blur-xl ${viewMode === 'calendar' && !showTableView ? 'h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar' : 'min-h-[600px]'}`}>

                {viewMode === 'calendar' && !showTableView && (
                    <div className="min-h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b border-slate-200/50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850/40 sticky top-0 z-10 shadow-sm backdrop-blur-md">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-transparent">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-[minmax(160px,1fr)] flex-1">
                            {startPadding.map((_, i) => (
                                <div key={`empty-${i}`} className="bg-slate-50/10 dark:bg-slate-900/10 border-r border-b border-slate-200/40 dark:border-slate-800/40"></div>
                            ))}
                            {days.map(day => {
                                const dayTasks = tasks.filter(task => {
                                    if (!task.startDate || !task.endDate) return false;
                                    const start = new Date(task.startDate);
                                    const end = new Date(task.endDate);
                                    start.setHours(0, 0, 0, 0);
                                    end.setHours(23, 59, 59, 999);

                                    // Define "Today" and "Tomorrow" for visibility window
                                    const now = new Date();
                                    now.setHours(23, 59, 59, 999);

                                    const tomorrow = new Date(now);
                                    tomorrow.setDate(tomorrow.getDate() + 1);

                                    // Check if weekend and excluded
                                    const isSat = day.getDay() === 6;
                                    const isSun = day.getDay() === 0;

                                    if (isSat && !task.includeSaturday) return false;
                                    if (isSun && !task.includeSunday) return false;

                                    // Normal range check
                                    if (day >= start && day <= end) return true;

                                    // Check status on this specific day (allow up to Tomorrow)
                                    if (day > end && day <= tomorrow) {
                                        // Logic update: Only show 'spilled' overdue tasks on future dates if they are ACTUALLY overdue right now.
                                        // This prevents a task due Today (Feb 10) from showing up on Tomorrow (Feb 11) 
                                        // if it's currently 10:00 AM (before the 6:30 PM cutoff).
                                        if (day > now && !isTaskOverdue(task)) {
                                            return false;
                                        }

                                        const statusInfo = getStatusOnDate(task, day);

                                        // Show overdue tasks on the next day if they haven't been completed
                                        // E.g., if today is Saturday 10 PM and task was due Saturday,
                                        // it should show as overdue on Sunday
                                        // BUT if it's Sunday and we don't work Sunday, maybe we shouldn't show it?
                                        // User said: "no need to show tasks in satrday and sunday as those days are holidays.. but... just show those tasks in sat and sunday"
                                        // This implies strict visibility control.
                                        // However, if a task is OVERDUE, it might be important to see it even on a weekend?
                                        // Let's stick to the rule: If not working on weekend, don't show on weekend.
                                        if (isSat && !task.includeSaturday) return false;
                                        if (isSun && !task.includeSunday) return false;

                                        if (statusInfo.baseStatus === 'Overdue') return true;

                                        // Also show if completed ON this day (late)
                                        if (statusInfo.status.includes('Completed (Overdue)') && task.actualCompletionDate) {
                                            if (isSameDay(new Date(task.actualCompletionDate), day)) return true;
                                        }
                                    }
                                    return false;
                                });

                                 return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                                        className={`border-r border-b border-slate-200/30 dark:border-slate-800/50 p-3 transition-all duration-300 ease-out cursor-pointer group relative flex flex-col min-h-[140px] backdrop-blur-md
                                            ${!isSameMonth(day, currentDate) ? 'bg-slate-50/5 dark:bg-slate-950/5 text-slate-400 dark:text-slate-600 opacity-45' : 'bg-white/40 dark:bg-slate-950/20'} 
                                            ${isToday(day) ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-2 border-indigo-500/50 dark:border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] rounded-xl z-10' : ''}
                                            ${isWeekend(day) ? 'bg-slate-50/5 dark:bg-slate-950/15' : ''}
                                            hover:scale-[1.03] hover:z-30 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-[0_15px_30px_rgba(245,158,11,0.12)] hover:rounded-2xl
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 ${isToday(day) ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-700 dark:text-slate-350 group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:shadow-sm'}`}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                            {dayTasks.slice(0, 3).map(task => {
                                                const statusInfo = getStatusOnDate(task, day);
                                                const borderClass = getTaskBorderColor(task, day);

                                                return (
                                                    <div key={task.id} className={`text-[10px] px-2.5 py-1.5 rounded-lg border truncate font-bold mb-1 transition-all hover:scale-[1.02] ${borderClass} flex items-center gap-1.5`}>
                                                        {/* Status Icon for Grid View */}
                                                        <span className="flex-shrink-0 opacity-90">
                                                            {statusInfo.status === 'In Progress' && <Loader size="xs" />}
                                                            {statusInfo.status === 'Completed' && <CheckCircle2 size={11} />}
                                                            {statusInfo.status === 'Forecast' && <Cloud size={11} />}
                                                            {statusInfo.status === 'Overdue' && <AlertCircle size={11} />}
                                                            {statusInfo.status.includes('QA') && <Clock size={11} />}
                                                            {(statusInfo.status === 'On Hold' || statusInfo.status === 'Yet to Start') && <Circle size={11} />}
                                                        </span>
                                                        <span className="truncate tracking-wide">{task.projectName}</span>
                                                        {statusInfo.overdueDays > 0 && <span className="opacity-95 text-[9px] bg-rose-500/10 dark:bg-rose-500/20 px-1 py-0.2 rounded border border-rose-500/20">+{statusInfo.overdueDays}d</span>}
                                                    </div>
                                                );
                                            })}
                                            {dayTasks.length > 3 && (
                                                <div className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider pl-1.5 mt-1">+{dayTasks.length - 3} more</div>
                                            )}
                                        </div>

                                        {/* Hover Popup - Shows ALL tasks for the day */}
                                        {dayTasks.length > 0 && (
                                            <div className={`absolute top-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 delay-150 transform translate-y-2 group-hover:translate-y-0 scale-95 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto ${day.getDay() >= 4 ? 'right-[104%] origin-top-right' : 'left-[104%] origin-top-left'} w-[150%] min-w-[290px]`}>
                                                <div className="bg-white/90 dark:bg-slate-950/80 backdrop-blur-2xl rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.4)] border border-slate-200/60 dark:border-slate-800/80 p-5 flex flex-col gap-3 max-h-[380px] overflow-y-auto custom-scrollbar">
                                                    <div className="sticky top-0 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md pb-3 border-b border-slate-100 dark:border-slate-800/60 mb-2 z-10 flex items-center justify-between">
                                                        <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                                            {format(day, 'EEE, MMM d')}
                                                        </h4>
                                                        <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/30 shadow-sm">{dayTasks.length} tasks</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {dayTasks.map(task => {
                                                            const statusInfo = getStatusOnDate(task, day);
                                                            const badgeColor = getStatusBadgeColor(task);
                                                            const isOverdue = statusInfo.baseStatus === 'Overdue' || statusInfo.status.includes('Completed (Overdue)');

                                                            return (
                                                                <div key={`popup-${task.id}`} className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/30 backdrop-blur-md border border-slate-200/30 dark:border-slate-800/60 hover:border-indigo-500/40 dark:hover:border-indigo-500/30 hover:bg-white dark:hover:bg-slate-900/80 hover:-translate-y-0.5 transition-all duration-200 group/task shadow-sm">
                                                                    <div className="flex items-start justify-between gap-2.5 mb-2">
                                                                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight group-hover/task:text-indigo-600 dark:group-hover/task:text-indigo-400 transition-colors">{task.projectName}</span>
                                                                        {isOverdue && (
                                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center border border-rose-100 dark:border-rose-900/30 animate-pulse">
                                                                                <AlertCircle size={11} className="text-rose-500" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center justify-between gap-2 border-t border-slate-100/50 dark:border-slate-800/40 pt-2.5 mt-2">
                                                                        <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg ${badgeColor} bg-opacity-95 shadow-sm border border-slate-200/20 dark:border-slate-700/20 uppercase tracking-wider`}>
                                                                            {statusInfo.status}
                                                                        </span>
                                                                        {task.assignedTo && (
                                                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-850/60 px-2 py-0.5 rounded-md" title={`Assigned to ${task.assignedTo}`}>
                                                                                <User size={9} className="opacity-70" />
                                                                                <span className="truncate max-w-[80px] font-bold">{task.assignedTo}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewMode === 'calendar' && showTableView && (
                    <div className="p-8 overflow-x-auto">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tasks for {format(currentDate, 'MMMM yyyy')}</h2>
                            <p className="text-slate-500 dark:text-slate-400">{tasks.length} total tasks</p>
                        </div>
                        <div className={StandardTableStyles.container}>
                            <table className="w-full">
                                <thead className={StandardTableStyles.header}>
                                    <tr>
                                        <th className={StandardTableStyles.headerCell}>Project Name</th>
                                        <th className={StandardTableStyles.headerCell}>Phase/Task</th>
                                        <th className={StandardTableStyles.headerCell}>Assignees</th>
                                        <th className={StandardTableStyles.headerCell}>Start Date</th>
                                        <th className={StandardTableStyles.headerCell}>End Date</th>
                                        <th className={StandardTableStyles.headerCell}>Priority</th>
                                        <th className={StandardTableStyles.headerCell}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-3xl">📅</div>
                                                    <p className="text-lg font-medium text-slate-600 dark:text-slate-400">No tasks for this month</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        tasks.map((task) => (
                                            <tr
                                                key={task.id}
                                                onClick={() => handleTaskClick(task)}
                                                className={StandardTableStyles.row}
                                            >
                                                <td className={`${StandardTableStyles.cell} font-bold`}>{task.projectName}</td>
                                                <td className={StandardTableStyles.cell}>{task.subPhase || '-'}</td>
                                                <td className={StandardTableStyles.cell}>
                                                    {task.assignedTo || 'Unassigned'}
                                                    {task.assignedTo2 && `, ${task.assignedTo2}`}
                                                </td>
                                                <td className={StandardTableStyles.cell}>
                                                    {task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : '-'}
                                                </td>
                                                <td className={StandardTableStyles.cell}>
                                                    {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : '-'}
                                                </td>
                                                <td className={StandardTableStyles.cell}>
                                                    <PriorityBadge priority={task.priority} />
                                                </td>
                                                <td className={StandardTableStyles.cell}>
                                                    <StatusBadge status={task.status} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {viewMode === 'day' && !showTableView && (
                    <div className="p-8">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tasks for {format(currentDate, 'MMMM d')}</h2>
                                <p className="text-slate-500 dark:text-slate-400">{dayViewTasks.length} tasks scheduled</p>
                            </div>
                            {/* Legend could go here if requested vertically, but horizontal is cleaner */}
                        </div>

                        {dayViewTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl">☕</div>
                                <p className="text-lg font-medium text-slate-600">No tasks scheduled for this day</p>
                                <p className="text-sm">Enjoy your free time!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {dayViewTasks.map(task => {
                                     const statusInfo = getStatusOnDate(task, currentDate);
                                     const isLateCompletion = statusInfo.status.includes('Completed (Overdue)');
                                     const isOverdue = statusInfo.baseStatus === 'Overdue';

                                     return (
                                         <div
                                             key={task.id}
                                             onClick={() => handleTaskClick(task)}
                                             className="rounded-3xl p-6 shadow-[0_8px_30_rgb(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgba(99,102,241,0.12)] hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative border border-slate-200/30 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md overflow-hidden pl-7"
                                         >
                                             {/* Color side indicator bar */}
                                             <div className={`absolute left-0 top-0 bottom-0 w-2.5 ${
                                                 isLateCompletion ? 'bg-gradient-to-b from-rose-500 to-red-650' :
                                                 statusInfo.baseStatus === 'Completed' ? 'bg-gradient-to-b from-emerald-500 to-teal-655' :
                                                 statusInfo.baseStatus === 'In Progress' || statusInfo.baseStatus === 'Being Developed' ? 'bg-gradient-to-b from-blue-500 to-indigo-600' :
                                                 statusInfo.baseStatus === 'Rejected' ? 'bg-gradient-to-b from-red-500 to-rose-600' :
                                                 statusInfo.baseStatus === 'Overdue' ? 'bg-gradient-to-b from-rose-500 to-red-600' :
                                                 statusInfo.baseStatus.includes('QA') ? 'bg-gradient-to-b from-pink-500 to-rose-500' :
                                                 statusInfo.baseStatus === 'Yet to Start' || statusInfo.baseStatus === 'Forecast' ? 'bg-gradient-to-b from-amber-500 to-orange-550' :
                                                 statusInfo.baseStatus === 'On Hold' ? 'bg-gradient-to-b from-slate-400 to-slate-600' :
                                                 'bg-gradient-to-b from-sky-500 to-blue-600'
                                             }`} />

                                             <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                                                        isLateCompletion ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 ring-1 ring-rose-500/30' :
                                                        statusInfo.baseStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                        statusInfo.baseStatus === 'In Progress' || statusInfo.baseStatus === 'Being Developed' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                                                        statusInfo.baseStatus === 'Rejected' ? 'bg-red-500/10 text-red-655 dark:text-red-400 border-red-500/20' :
                                                        statusInfo.baseStatus === 'Overdue' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/25 animate-pulse' :
                                                        statusInfo.baseStatus.includes('QA') ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' :
                                                        statusInfo.baseStatus === 'Yet to Start' || statusInfo.baseStatus === 'Forecast' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                                        statusInfo.baseStatus === 'On Hold' ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' :
                                                        'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                                                    } shadow-sm`}>
                                                        {isLateCompletion ? (
                                                            <>
                                                                <CheckCircle2 size={11} />
                                                                Completed (+{statusInfo.overdueDays}d late)
                                                            </>
                                                        ) : (
                                                            <>
                                                                {(statusInfo.status === 'In Progress' || statusInfo.status === 'Being Developed') && <PlayCircle size={11} />}
                                                                {statusInfo.status === 'Forecast' && <Cloud size={11} />}
                                                                {statusInfo.status === 'Completed' && <CheckCircle2 size={11} />}
                                                                {statusInfo.status.includes('QA') && <Clock size={11} />}
                                                                {statusInfo.status === 'Overdue' && <AlertCircle size={11} />}
                                                                {statusInfo.status}
                                                            </>
                                                        )}
                                                    </span>
                                                    {isOverdue && !isLateCompletion && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                            <AlertCircle size={11} />
                                                            {statusInfo.overdueDays}d overdue
                                                        </span>
                                                    )}
                                                </div>
                                             </div>

                                             <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{task.projectName}</h3>

                                             <p className="text-xs text-slate-550 dark:text-slate-400 mb-6 font-bold uppercase tracking-wider">{task.subPhase || 'No phase'}</p>

                                             <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                                                 <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-350">
                                                     <div className="p-1.5 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-455 rounded-full shadow-sm">
                                                         <User size={13} />
                                                     </div>
                                                     <span className="font-bold">{task.assignedTo || 'Unassigned'}{task.assignedTo2 ? `, ${task.assignedTo2}` : ''}</span>
                                                 </div>

                                                 <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-350">
                                                     <div className="p-1.5 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-455 rounded-full shadow-sm">
                                                         <Clock size={13} />
                                                     </div>
                                                     <span className="font-bold">
                                                         {task.startDate ? format(new Date(task.startDate), 'MMM d') : '?'} - {task.endDate ? format(new Date(task.endDate), 'MMM d') : '?'}
                                                     </span>
                                                 </div>
                                             </div>
                                         </div>
                                     );
                                 })}
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'day' && showTableView && (
                    <div className="p-8 overflow-x-auto">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tasks for {format(currentDate, 'MMMM d')}</h2>
                            <p className="text-slate-500 dark:text-slate-400">{dayViewTasks.length} tasks scheduled</p>
                        </div>
                        {dayViewTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-3xl">☕</div>
                                <p className="text-lg font-medium text-slate-600 dark:text-slate-400">No tasks scheduled for this day</p>
                                <p className="text-sm">Enjoy your free time!</p>
                            </div>
                        ) : (
                            <div className={StandardTableStyles.container}>
                                <table className="w-full">
                                    <thead className={StandardTableStyles.header}>
                                        <tr>
                                            <th className={StandardTableStyles.headerCell}>Project Name</th>
                                            <th className={StandardTableStyles.headerCell}>Phase/Task</th>
                                            <th className={StandardTableStyles.headerCell}>Assignees</th>
                                            <th className={StandardTableStyles.headerCell}>Start Date</th>
                                            <th className={StandardTableStyles.headerCell}>End Date</th>
                                            <th className={StandardTableStyles.headerCell}>Priority</th>
                                            <th className={StandardTableStyles.headerCell}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dayViewTasks.map((task) => (
                                            <tr
                                                key={task.id}
                                                onClick={() => handleTaskClick(task)}
                                                className={StandardTableStyles.row}
                                            >
                                                <td className={`${StandardTableStyles.cell} font-bold`}>{task.projectName}</td>
                                                <td className={StandardTableStyles.cell}>{task.subPhase || '-'}</td>
                                                <td className={StandardTableStyles.cell}>
                                                    {task.assignedTo || 'Unassigned'}
                                                    {task.assignedTo2 && `, ${task.assignedTo2}`}
                                                </td>
                                                <td className={StandardTableStyles.cell}>
                                                    {task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : '-'}
                                                </td>
                                                <td className={StandardTableStyles.cell}>
                                                    {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : '-'}
                                                </td>
                                                <td className={StandardTableStyles.cell}>
                                                    <PriorityBadge priority={task.priority} />
                                                </td>
                                                <td className={StandardTableStyles.cell}>
                                                    <StatusBadge status={task.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

            </div>

            <TaskDetailsModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                task={editingTask}
                onEdit={handleEditTask}
            />

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                task={editingTask}
                onSave={saveTask}
                onDelete={handleDeleteTask}
            />
        </div>
    );
}
