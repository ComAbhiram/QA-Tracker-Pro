
'use client';

import TaskDetailsModal from "@/components/TaskDetailsModal";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task, isTaskOverdue, getOverdueDays } from '@/lib/types';
import { getEffectiveStatus } from '@/utils/taskUtils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isWeekend, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, User, AlertCircle, Plus, Table2, LayoutGrid } from 'lucide-react';
import TaskModal from '@/components/TaskModal';

import { useGuestMode } from '@/contexts/GuestContext';

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
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
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
            completion.setHours(0, 0, 0, 0); // normalize completion to start of day

            // If completed ON or BEFORE this date
            if (completion <= checkDate) {
                // Check if it was late (completion > end + 6:30 PM cutoff)
                if (end) {
                    const endWithCutoff = new Date(end);
                    endWithCutoff.setHours(18, 30, 0, 0);

                    if (completion > endWithCutoff) {
                        const diffTime = completion.getTime() - end.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return { status: 'Completed (Overdue)', overdueDays: diffDays, baseStatus: 'Completed' };
                    }
                }
                return { status: 'Completed', overdueDays: 0, baseStatus: 'Completed' };
            }
        }

        // Not completed yet (or completed in future relative to this date)
        // Check if Overdue relative to this date (with 6:30 PM cutoff)
        if (end) {
            const endWithCutoff = new Date(end);
            endWithCutoff.setHours(18, 30, 0, 0);

            if (checkDate > endWithCutoff) {
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
            return 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-rose-500/50';
        }

        if (s === 'completed') return 'bg-emerald-600 text-white border-emerald-700 shadow-sm';
        if (s === 'in progress' || s === 'being developed') return 'bg-blue-600 text-white border-blue-700 shadow-sm';
        if (s === 'rejected') return 'bg-red-600 text-white border-red-700 shadow-sm';
        if (s === 'overdue') return 'bg-rose-600 text-white border-rose-700 shadow-sm';
        if (s.includes('qa') || s === 'ready for qa' || s === 'assigned to qa') return 'bg-yellow-600 text-white border-yellow-700 shadow-sm';
        if (s === 'yet to start' || s === 'forecast') return 'bg-amber-500 text-white border-amber-600 shadow-sm';
        if (s === 'on hold') return 'bg-slate-600 text-white border-slate-700 shadow-sm';
        return 'bg-sky-600 text-white border-sky-700 shadow-sm';
    };

    const getTaskBorderColor = (task: Task, date: Date = currentDate) => {
        const statusInfo = getStatusOnDate(task, date);
        const s = (statusInfo.baseStatus || '').toLowerCase();

        if (statusInfo.status.includes('Completed (Overdue)')) {
            return 'border-emerald-600 bg-emerald-600 text-white ring-2 ring-rose-400';
        }

        if (s === 'completed') return 'border-emerald-600 bg-emerald-600 text-white';
        if (s === 'in progress' || s === 'being developed') return 'border-blue-600 bg-blue-600 text-white';
        if (s === 'rejected') return 'border-red-600 bg-red-600 text-white';
        if (s === 'overdue') return 'border-rose-600 bg-rose-600 text-white';
        if (s.includes('qa') || s === 'ready for qa' || s === 'assigned to qa') return 'border-yellow-600 bg-yellow-600 text-white';
        if (s === 'yet to start' || s === 'forecast') return 'border-amber-500 bg-amber-500 text-white';
        if (s === 'on hold') return 'border-slate-500 bg-slate-500 text-white';
        return 'border-sky-600 bg-sky-600 text-white';
    };

    const getStatusBadgeColor = (task: Task) => {
        const status = getEffectiveStatus(task);
        const s = (status || '').toLowerCase();

        // Check for Late Completion
        if (s === 'completed' && task.endDate && task.actualCompletionDate) {
            if (new Date(task.actualCompletionDate) > new Date(task.endDate)) {
                return 'bg-emerald-600 text-white ring-2 ring-rose-400';
            }
        }

        if (s === 'completed') return 'bg-emerald-600 text-white';
        if (s === 'in progress' || s === 'being developed') return 'bg-blue-600 text-white';
        if (s === 'rejected') return 'bg-red-600 text-white';
        if (s === 'overdue') return 'bg-rose-600 text-white';
        if (s.includes('qa') || s === 'ready for qa' || s === 'assigned to qa') return 'bg-yellow-600 text-white';
        if (s === 'yet to start' || s === 'forecast') return 'bg-amber-500 text-white';
        if (s === 'on hold') return 'bg-slate-600 text-white';
        return 'bg-sky-600 text-white';
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

    const saveTask = async (taskData: Partial<Task>) => {
        // if (!editingTask) return; // Removed to allow creation

        const payloadACD = taskData.actualCompletionDate ? new Date(taskData.actualCompletionDate).toISOString() : null;

        const dbPayload: any = {
            project_name: taskData.projectName,
            project_type: taskData.projectType,
            sub_phase: taskData.subPhase,
            priority: taskData.priority,
            pc: taskData.pc,
            status: taskData.status,
            assigned_to: taskData.assignedTo,
            assigned_to2: taskData.assignedTo2,
            start_date: taskData.startDate || null,
            end_date: taskData.endDate || null,
            actual_completion_date: payloadACD,
            comments: taskData.comments,
            current_updates: taskData.currentUpdates,
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
            include_saturday: taskData.includeSaturday || false,
            include_sunday: taskData.includeSunday || false,
            team_id: taskData.teamId
        };

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



        await fetchTasks();
        setIsTaskModalOpen(false);
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

            {/* Header Controls */}
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Work Schedule</h1>
                    <p className="text-slate-500">Manage project timelines and daily tasks</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">

                    <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => { setViewMode('calendar'); setShowTableView(false); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CalendarIcon size={16} /> Monthly
                        </button>
                        <button
                            onClick={() => { setViewMode('day'); setShowTableView(false); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List size={16} /> Daily
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* View Type Toggle (Grid vs Table) */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setShowTableView(false)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${!showTableView ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid size={16} /> Grid
                        </button>
                        <button
                            onClick={() => setShowTableView(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${showTableView ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Table2 size={16} /> List
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        <button onClick={prevPeriod} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 border border-slate-200 hover:border-indigo-300 transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="min-w-[160px] text-center font-bold text-lg text-slate-800">
                            {viewMode === 'calendar' ? format(currentDate, 'MMMM yyyy') : format(currentDate, 'MMM d, yyyy')}
                        </div>
                        <button onClick={nextPeriod} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 border border-slate-200 hover:border-indigo-300 transition-all">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <button onClick={goToToday} className="text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                        Today
                    </button>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    <button
                        onClick={handleAddTask}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} /> New
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className={`bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-white/20 backdrop-blur-xl ${viewMode === 'calendar' && !showTableView ? 'h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar' : 'min-h-[600px]'}`}>

                {viewMode === 'calendar' && !showTableView && (
                    <div className="min-h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b border-slate-400 bg-slate-50/80 sticky top-0 z-10 shadow-sm">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider backdrop-blur-md bg-slate-50/90">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-[minmax(160px,1fr)] flex-1">
                            {startPadding.map((_, i) => (
                                <div key={`empty-${i}`} className="bg-slate-50/30 border-r border-b border-slate-400"></div>
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
                                        className={`border-r border-b border-slate-400 p-2 transition-all hover:bg-indigo-50/50 cursor-pointer group relative flex flex-col
                                            ${!isSameMonth(day, currentDate) ? 'bg-slate-50/50 text-slate-400' : ''} 
                                            ${isToday(day) ? 'bg-blue-50/30' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isToday(day) ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-700 group-hover:bg-white group-hover:shadow-sm'}`}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                            {dayTasks.slice(0, 3).map(task => {
                                                const statusInfo = getStatusOnDate(task, day);
                                                const borderClass = getTaskBorderColor(task, day);

                                                return (
                                                    <div key={task.id} className={`text-[11px] px-2 py-1.5 rounded-md border text-slate-700 truncate font-semibold mb-1 transition-all hover:scale-[1.02] ${borderClass}`}>
                                                        {task.projectName} {statusInfo.overdueDays > 0 ? `(+${statusInfo.overdueDays}d)` : ''}
                                                    </div>
                                                );
                                            })}
                                            {dayTasks.length > 3 && (
                                                <div className="text-[10px] text-slate-400 font-medium pl-1">+{dayTasks.length - 3} more</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewMode === 'calendar' && showTableView && (
                    <div className="p-8 overflow-x-auto">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Tasks for {format(currentDate, 'MMMM yyyy')}</h2>
                            <p className="text-slate-500">{tasks.length} total tasks</p>
                        </div>
                        <div className="overflow-hidden border border-slate-200 rounded-xl">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Project Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Phase/Task</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Assignees</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Start Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">End Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tasks.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl">📅</div>
                                                    <p className="text-lg font-medium text-slate-600">No tasks for this month</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        tasks.map((task) => {
                                            const statusInfo = getStatusOnDate(task, currentDate);
                                            const badgeClass = getStatusBadgeColor(task);

                                            return (
                                                <tr
                                                    key={task.id}
                                                    onClick={() => handleTaskClick(task)}
                                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                                >
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{task.projectName}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{task.subPhase || '-'}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {task.assignedTo || 'Unassigned'}
                                                        {task.assignedTo2 && `, ${task.assignedTo2}`}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg ${badgeClass}`}>
                                                            {statusInfo.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
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
                                <h2 className="text-xl font-bold text-slate-800">Tasks for {format(currentDate, 'MMMM d')}</h2>
                                <p className="text-slate-500">{dayViewTasks.length} tasks scheduled</p>
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
                                            className={`rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group relative border ${getTaskBorderColor(task)}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-black/20 text-white ${isLateCompletion ? 'ring-2 ring-rose-400' : ''}`}>
                                                        {isLateCompletion ? `Completed (Overdue ${statusInfo.overdueDays}d)` : statusInfo.status}
                                                    </span>
                                                    {isOverdue && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                            <AlertCircle size={12} />
                                                            {statusInfo.overdueDays}d
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <h3 className="font-bold text-xl text-white mb-1">{task.projectName}</h3>

                                            <p className="text-sm text-white/80 mb-6 font-medium">{task.subPhase || 'No phase'}</p>

                                            <div className="space-y-3 pt-4 border-t border-white/20">
                                                <div className="flex items-center gap-3 text-sm text-white/90">
                                                    <div className="p-1.5 bg-white/20 rounded-full text-white shadow-sm">
                                                        <User size={14} />
                                                    </div>
                                                    <span className="font-medium">{task.assignedTo || 'Unassigned'}{task.assignedTo2 ? `, ${task.assignedTo2}` : ''}</span>
                                                </div>

                                                <div className="flex items-center gap-3 text-sm text-white/90">
                                                    <div className="p-1.5 bg-white/20 rounded-full text-white shadow-sm">
                                                        <Clock size={14} />
                                                    </div>
                                                    <span className="font-medium">
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
                            <h2 className="text-xl font-bold text-slate-800">Tasks for {format(currentDate, 'MMMM d')}</h2>
                            <p className="text-slate-500">{dayViewTasks.length} tasks scheduled</p>
                        </div>
                        {dayViewTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl">☕</div>
                                <p className="text-lg font-medium text-slate-600">No tasks scheduled for this day</p>
                                <p className="text-sm">Enjoy your free time!</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden border border-slate-200 rounded-xl">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Project Name</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Phase/Task</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Assignees</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Start Date</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">End Date</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {dayViewTasks.map((task) => {
                                            const statusInfo = getStatusOnDate(task, currentDate);
                                            const badgeClass = getStatusBadgeColor(task);

                                            return (
                                                <tr
                                                    key={task.id}
                                                    onClick={() => handleTaskClick(task)}
                                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                                >
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{task.projectName}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{task.subPhase || '-'}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {task.assignedTo || 'Unassigned'}
                                                        {task.assignedTo2 && `, ${task.assignedTo2}`}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg ${badgeClass}`}>
                                                            {statusInfo.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
