'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task } from '@/lib/types';
import { Search, Plus, Download, CalendarClock, X, ArrowUp, ArrowDown, ArrowUpRight } from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import ProjectTaskTable from '@/components/ProjectTaskTable';
import { useGuestMode } from '@/contexts/GuestContext';
import { useToast } from '@/contexts/ToastContext';
import { toast } from 'sonner';
import useColumnResizing from '@/hooks/useColumnResizing';
import ResizableHeader from '@/components/ui/ResizableHeader';
import { getCurrentUserTeam } from '@/utils/userUtils';
import { DraggableTableWrapper } from '@/components/DraggableTableWrapper';

export default function BudgetAndActivityPage() {
    const { isGuest, selectedTeamId, selectedTeamName, isLoading: isGuestLoading, isPCMode } = useGuestMode();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const { success, error: toastError } = useToast();
    const [viewMode, setViewMode] = useState<'active' | 'forecast'>('active');
    const [isRowExpanded, setIsRowExpanded] = useState(false);
    const [pcFilter, setPcFilter] = useState('All');
    const [pcNames, setPcNames] = useState<string[]>([]);
    const [realtimeTick, setRealtimeTick] = useState(0);

    const [userProfile, setUserProfile] = useState<{ team_id: string | null } | null>(null);

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

    useEffect(() => {
        if (isGuestLoading) return;

        async function fetchUserProfile() {
            if (!isGuest) {
                const profile = await getCurrentUserTeam();
                if (profile) {
                    setUserProfile({ team_id: profile.team_id });
                }
            }
        }
        fetchUserProfile();

        async function fetchData() {
            setLoading(true);

            // Fetch Tasks
            let taskQuery = supabase
                .from('tasks')
                .select('*')
                .not('status', 'in', '("Completed","Rejected")')
                .order('start_date', { ascending: false });

            if (searchTerm) {
                taskQuery = taskQuery.or(`project_name.ilike.%${searchTerm}%,assigned_to.ilike.%${searchTerm}%,sub_phase.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%,priority.ilike.%${searchTerm}%,comments.ilike.%${searchTerm}%`);
            }

            // Manager/Guest Mode Filtering
            if (isGuest) {
                if (selectedTeamId) {
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

                filteredData = filteredData.filter(t => t.status !== 'Rejected' && t.status !== 'Completed');

                if (pcFilter !== 'All') {
                    filteredData = filteredData.filter(t => t.pc === pcFilter);
                }

                setTasks(filteredData.map(mapTaskFromDB));
            }
            setLoading(false);
        }
        fetchData();
    }, [searchTerm, pcFilter, isGuest, selectedTeamId, isGuestLoading, userProfile?.team_id, realtimeTick]);

    // Real-time subscriptions
    const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    useEffect(() => {
        if (isGuestLoading) return;

        let taskTimer: ReturnType<typeof setTimeout>;

        const channel = supabase
            .channel('budget-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                clearTimeout(taskTimer);
                taskTimer = setTimeout(() => {
                    setRealtimeTick(t => t + 1);
                }, 1500);
            })
            .subscribe();

        realtimeChannelRef.current = channel;

        return () => {
            clearTimeout(taskTimer);
            supabase.removeChannel(channel);
        };
    }, [isGuestLoading]);

    const handleAddTask = () => {
        setEditingTask(null);
        setIsTaskModalOpen(true);
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const saveTask = async (taskData: Partial<Task> | Partial<Task>[]) => {
        const formatPayload = (t: Partial<Task>) => ({
            project_name: t.projectName,
            project_type: t.projectType,
            sub_phase: t.subPhase,
            status: t.status,
            assigned_to: t.assignedTo,
            assigned_to2: t.assignedTo2,
            additional_assignees: t.additionalAssignees || [],
            pc: t.pc,
            priority: t.priority,
            start_date: t.startDate || null,
            end_date: t.endDate || null,
            actual_completion_date: t.actualCompletionDate ? new Date(t.actualCompletionDate).toISOString() : null,
            start_time: t.startTime || null,
            end_time: t.endTime || null,
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
            comments: t.comments,
            current_updates: t.currentUpdates,
            include_saturday: t.includeSaturday || false,
            include_sunday: t.includeSunday || false,
            team_id: isGuest ? selectedTeamId : t.teamId,
        });

        if (Array.isArray(taskData)) {
            const payloads = taskData.map(formatPayload);

            if (editingTask) {
                const [first, ...rest] = payloads;
                const { team_id, ...updatePayload } = first;
                const updateResponse = await fetch('/api/tasks/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false' },
                    credentials: 'include',
                    body: JSON.stringify({ id: editingTask.id, ...updatePayload })
                });

                if (!updateResponse.ok) throw new Error((await updateResponse.json()).error || 'Server error');

                if (rest.length > 0) {
                    const createResponse = await fetch('/api/tasks/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(rest)
                    });
                    if (!createResponse.ok) throw new Error(`Task updated, but failed to create split tasks: ${(await createResponse.json()).error || 'Server error'}`);
                }
            } else {
                const response = await fetch('/api/tasks/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloads)
                });
                if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            }
        } else {
            const dbPayload = formatPayload(taskData);

            if (editingTask) {
                const { team_id, ...updatePayload } = dbPayload;
                const response = await fetch('/api/tasks/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false' },
                    credentials: 'include',
                    body: JSON.stringify({ id: editingTask.id, ...updatePayload })
                });
                if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            } else {
                const response = await fetch('/api/tasks/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dbPayload)
                });
                if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            }
        }

        refreshTasks();
        setIsTaskModalOpen(false);
    };

    const handleDeleteTask = async (taskId: number) => {
        const response = await fetch(`/api/tasks/delete?id=${taskId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false' },
            credentials: 'include',
        });

        if (!response.ok) {
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

        if (isGuest) {
            if (selectedTeamId) {
                taskQuery = taskQuery.eq('team_id', selectedTeamId);
            } else {
                taskQuery = taskQuery.eq('id', '00000000-0000-0000-0000-000000000000');
            }
        }

        const { data } = await taskQuery;

        if (data) {
            const filtered = data.filter((t: any) => t.status !== 'Rejected' && t.status !== 'Completed');
            setTasks(filtered.map(mapTaskFromDB));
        }
    };

    const handleFieldUpdate = async (taskId: number, field: string, value: any) => {
        const response = await fetch('/api/tasks/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false' },
            credentials: 'include',
            body: JSON.stringify({ id: taskId, [field]: value })
        });

        if (!response.ok) {
            toastError('Failed to update task');
        } else {
            success('Task updated successfully');
            refreshTasks();
        }
    };

    // Filter by View Mode
    const processedTasks = tasks.filter((task: Task) => viewMode === 'forecast' ? task.status === 'Forecast' : true);

    // Group by Project
    const groupedTasks = processedTasks.reduce((acc, task) => {
        const projectName = task.projectName?.trim() || 'Untitled Project';
        if (!acc[projectName]) acc[projectName] = [];
        acc[projectName].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    // Sort projects alphabetically
    const sortedProjects = Object.keys(groupedTasks).sort((a, b) => a.localeCompare(b));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900/50 p-2 sm:p-4 lg:p-6 transition-colors">
            <div className="max-w-[1920px] mx-auto space-y-4">
                {/* Header & Controls */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">Project Budget</h1>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                        Track tasks organized by project
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {!isPCMode && (
                                    <button
                                        onClick={handleAddTask}
                                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all font-medium text-sm shadow-sm hover:shadow active:scale-95"
                                    >
                                        <Plus size={18} /> Add Task
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Search & Filters Row */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search projects, tasks, comments..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200 placeholder:text-slate-400 transition-shadow"
                                />
                            </div>

                            <div className="flex items-center gap-2 sm:w-auto w-full">
                                <select
                                    value={pcFilter}
                                    onChange={(e) => setPcFilter(e.target.value)}
                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer flex-1 sm:flex-none"
                                >
                                    <option value="All">All PCs</option>
                                    <option value="-">None (-)</option>
                                    <option value="G">G</option>
                                    <option value="J">J</option>
                                    {pcNames.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                            <button
                                onClick={() => setViewMode('active')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${viewMode === 'active'
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm'
                                    : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <div className={`w-2 h-2 rounded-full ${viewMode === 'active' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                Current Tracking
                            </button>
                            <button
                                onClick={() => setViewMode('forecast')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${viewMode === 'forecast'
                                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 shadow-sm'
                                    : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <div className={`w-2 h-2 rounded-full ${viewMode === 'forecast' ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                Forecast Items
                            </button>

                            <button
                                onClick={() => setIsRowExpanded(!isRowExpanded)}
                                className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-2 ${isRowExpanded
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {isRowExpanded ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                {isRowExpanded ? 'Collapse Rows' : 'Expand Rows'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="animate-spin w-8 h-8 justify-center rounded-full border-4 border-indigo-500 border-t-transparent" />
                        <span className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">Loading tracking data...</span>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="space-y-4 pt-4">
                            {sortedProjects.map(project => (
                                <ProjectTaskTable
                                    key={project}
                                    projectName={project}
                                    tasks={groupedTasks[project]}
                                    columnWidths={columnWidths}
                                    hideHeader={false}
                                    isRowExpanded={isRowExpanded}
                                    onEditTask={handleEditTask}
                                    onFieldUpdate={handleFieldUpdate}
                                    selectedTeamId={selectedTeamId}
                                    isReadOnly={isPCMode}
                                />
                            ))}

                            {sortedProjects.length === 0 && (
                                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="text-slate-400" size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">No tasks found</h3>
                                    <p className="text-slate-500 dark:text-slate-400">Try adjusting your filters or search term</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Float Button for mobile */}
            {!isPCMode && (
                <button
                    onClick={handleAddTask}
                    className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:shadow-xl transition-all active:scale-95 z-40"
                    aria-label="Add Task"
                >
                    <Plus size={24} />
                </button>
            )}

            {isTaskModalOpen && (
                <TaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    task={editingTask}
                    onSave={saveTask}
                    onDelete={handleDeleteTask}
                />
            )}
        </div>
    );
}
