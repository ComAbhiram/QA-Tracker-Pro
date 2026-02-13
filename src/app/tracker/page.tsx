'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task, Leave } from '@/lib/types';
import { Search, Plus, Download, CalendarClock, X, ArrowUp, ArrowDown } from 'lucide-react';
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
    interface Team { id: string; name: string; }
    const [teams, setTeams] = useState<Team[]>([]);

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

    // Fetch Teams for Manager Mode
    useEffect(() => {
        if (isGuest) {
            const fetchTeams = async () => {
                try {
                    const { data, error } = await supabase.from('teams').select('id, name').order('name');
                    if (error) throw error;
                    if (data) {
                        const filteredTeams = data.filter(team =>
                            !['cochin', 'dubai'].includes(team.name.toLowerCase())
                        );
                        setTeams(filteredTeams);
                    }
                } catch (error) {
                    console.error('Error fetching teams:', error);
                }
            };
            fetchTeams();
        }
    }, [isGuest]);

    const handleTeamSelect = (newTeamName: string) => {
        const selectedTeam = teams.find(t => t.name === newTeamName);

        if (selectedTeam) {
            let targetTeamId = selectedTeam.id;

            // QA Team -> Super Admin mapping logic (Mirrors Sidebar logic)
            if (newTeamName.toLowerCase() === 'qa team') {
                const superAdminTeam = teams.find(t => t.name.toLowerCase() === 'super admin');
                if (superAdminTeam) {
                    targetTeamId = superAdminTeam.id;
                }
            }

            setGuestSession(targetTeamId, newTeamName);
            // Force reload to ensure context updates propogate clean
            window.location.reload();
        }
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
                if (selectedTeamId) {
                    taskQuery = taskQuery.eq('team_id', selectedTeamId);
                } else {
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
                const leavesRes = await fetch('/api/leaves');
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
            team_id: taskData.teamId,
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
            // For insert, usually RLS allows active team member to insert.
            const { error } = await supabase
                .from('tasks')
                .insert([dbPayload]);

            if (error) {
                console.error('Error creating task:', error);
                toastError(`Failed to create task: ${error.message}`);
                return;
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
        .filter(task => {
            if (viewMode === 'forecast') {
                return task.status === 'Forecast';
            }
            // 'active' mode shows all fetched (which are already filtered for non-completed/rejected in fetchData)
            return true;
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


    // Group by assignee (using processed tasks)
    const groupedTasks = processedTasks.reduce((acc, task) => {
        const assignee = task.assignedTo || 'Unassigned';
        if (!acc[assignee]) acc[assignee] = [];
        acc[assignee].push(task);
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
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Task Tracker</h1>
                    <p className="text-slate-500">Track all active tasks</p>
                </div>

                {/* Manager Mode Team Selector - Dedicated Row */}
                {isGuest && teams.length > 0 && (
                    <div className="w-full flex justify-center order-last xl:order-none min-w-0">
                        <TeamSelectorPill
                            teams={teams}
                            selectedTeamName={selectedTeamName}
                            onSelect={handleTeamSelect}
                        />
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {/* Search Box - Light Styling */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Filter tasks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-[200px] bg-white text-slate-700 placeholder:text-slate-500 pl-9 pr-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 text-xs transition-all shadow-sm"
                            />
                        </div>

                        {/* Date Filter - Custom DatePicker */}
                        <DatePicker
                            date={dateFilter}
                            setDate={setDateFilter}
                            className="w-[140px] bg-white text-slate-700 border border-slate-200 min-h-0 py-2 px-3 text-xs shadow-sm hover:bg-slate-50 rounded-md"
                            placeholder="Filter by date"
                        />

                        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                        {/* View Mode Toggle */}
                        <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200">
                            <button
                                onClick={() => setViewMode('active')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'active'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => setViewMode('forecast')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'forecast'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Forecast
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Row Expand Toggle */}
                        <button
                            onClick={() => setIsRowExpanded(!isRowExpanded)}
                            className={`p-2 rounded-md border text-slate-600 transition-all ${isRowExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                            title={isRowExpanded ? "Collapse Rows" : "Expand Rows"}
                        >
                            {isRowExpanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                        </button>

                        {/* Actions */}
                        <button
                            onClick={() => { setIsAvailabilityCheckOpen(true); setHasChecked(false); setCheckDate(''); setAvailableMembers([]); }}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <CalendarClock size={16} /> Check
                        </button>
                        <button
                            onClick={exportCSV}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <Download size={16} /> Export
                        </button>
                        <button
                            onClick={handleAddTask}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Plus size={16} /> New Task
                        </button>
                    </div>
                </div>
            </header>

            {/* Availability Check Modal */}
            {isAvailabilityCheckOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">Check Availability</h3>
                            <CloseButton onClick={() => setIsAvailabilityCheckOpen(false)} />
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Date needed from</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={checkDate}
                                        onChange={(e) => setCheckDate(e.target.value)}
                                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
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
                                            {availableMembers.map(member => (
                                                <div key={member} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xs">
                                                        {member.charAt(0)}
                                                    </div>
                                                    <span className="font-semibold">{member}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                                            <p className="text-slate-500">No members available on this date.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* STICKY HEADER for All Tables */}
            <div className="sticky top-0 z-40 bg-white shadow-md border-b border-slate-200 mb-2 rounded-t-lg overflow-hidden">
                <table className="w-full text-xs text-slate-800 border-collapse table-fixed">
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
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
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
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="text-slate-400 mb-2">No tasks found</div>
                        <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
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
        </div>
    );
}
