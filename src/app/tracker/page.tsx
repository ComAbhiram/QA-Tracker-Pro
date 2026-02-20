'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task, Leave } from '@/lib/types';
import { Search, Plus, Download, CalendarClock, X, ArrowUp, ArrowDown, Users, ArrowUpRight } from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import LeaveModal, { LeaveFormData } from '@/components/LeaveModal';
import AssigneeTaskTable from '@/components/AssigneeTaskTable';
import { useGuestMode } from '@/contexts/GuestContext';
import { calculateAvailability } from '@/lib/availability';
import { useToast } from '@/contexts/ToastContext';
import { toast } from 'sonner';
import { DatePicker } from '@/components/DatePicker';
import Combobox from '@/components/ui/Combobox';
import useColumnResizing from '@/hooks/useColumnResizing';
import ResizableHeader from '@/components/ui/ResizableHeader';
import CloseButton from '@/components/ui/CloseButton';
import TeamSelectorPill from '@/components/ui/TeamSelectorPill';
import { useTeams } from '@/hooks/useTeams';
import { getCurrentUserTeam } from '@/utils/userUtils';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableTableWrapper } from '@/components/DraggableTableWrapper';

interface TeamMember {
    id: number;
    name: string;
    display_order: number;
}

export default function Tracker() {
    const { isGuest, selectedTeamId, selectedTeamName, setGuestSession, isLoading: isGuestLoading, isPCMode } = useGuestMode();
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
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [pcFilter, setPcFilter] = useState('All');
    const [pcNames, setPcNames] = useState<string[]>([]);
    const [realtimeTick, setRealtimeTick] = useState(0); // incremented by real-time subscription

    // Team Selector State (Manager Mode)
    const { teams } = useTeams(isGuest);
    const [userProfile, setUserProfile] = useState<{ team_id: string | null } | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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
        if (isGuestLoading) return; // Wait for guest session to initialize

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

                // Apply PC filter client-side
                if (pcFilter !== 'All') {
                    filteredData = filteredData.filter(t => t.pc === pcFilter);
                }

                setTasks(filteredData.map(mapTaskFromDB));
            }

            // 1.5 Fetch Team Members for Ordering
            const effectiveTeamId = isGuest ? selectedTeamId : (userProfile?.team_id || undefined);
            if (effectiveTeamId) {
                const { data: membersData, error: membersError } = await supabase
                    .from('team_members')
                    .select('id, name, display_order')
                    .eq('team_id', effectiveTeamId)
                    .order('display_order', { ascending: true });


                // Identify if display_order column exists based on error
                const isDisplayOrderMissing = membersError && (membersError.code === 'PGRST204' || membersError.message.includes('display_order'));

                let finalMembers = membersData;

                if (isDisplayOrderMissing) {
                    console.warn('[Tracker] display_order column missing, falling back.');
                    const { data: fallbackData } = await supabase
                        .from('team_members')
                        .select('id, name')
                        .eq('team_id', effectiveTeamId);

                    if (fallbackData) {
                        // Add dummy display_order for frontend sorting
                        finalMembers = fallbackData.map((m, i) => ({ ...m, display_order: i }));
                    }
                } else if (membersError) {
                    console.error('Error fetching team members:', membersError);
                }

                // Sync missing assignees to team_members
                // Use taskData (raw DB tasks) to find all assignees
                if (taskData && finalMembers) {
                    const existingNames = new Set(finalMembers.map(m => m.name));
                    const neededNames = new Set<string>();

                    taskData.forEach((t: any) => {
                        if (t.assigned_to && !existingNames.has(t.assigned_to)) neededNames.add(t.assigned_to);
                        if (t.assigned_to2 && !existingNames.has(t.assigned_to2)) neededNames.add(t.assigned_to2);
                        if (t.additional_assignees) {
                            t.additional_assignees.forEach((a: string) => {
                                if (!existingNames.has(a)) neededNames.add(a);
                            });
                        }
                    });

                    if (neededNames.size > 0) {
                        // Only include display_order in insert if column is known to exist
                        const newMembers = Array.from(neededNames).map(name => {
                            const m: any = { team_id: effectiveTeamId, name: name };
                            if (!isDisplayOrderMissing) m.display_order = 0;
                            return m;
                        });

                        // Insert missing members
                        const { error: insertError } = await supabase
                            .from('team_members')
                            .insert(newMembers);

                        if (!insertError && !isDisplayOrderMissing) {
                            // Refetch to get IDs and Order
                            const { data: refreshedMembers } = await supabase
                                .from('team_members')
                                .select('id, name, display_order')
                                .eq('team_id', effectiveTeamId)
                                .order('display_order', { ascending: true });

                            if (refreshedMembers) {
                                finalMembers = refreshedMembers;
                            }
                        } else if (!insertError && isDisplayOrderMissing) {
                            // If we inserted but can't sort by order, just fetch names
                            const { data: refreshedFallback } = await supabase
                                .from('team_members')
                                .select('id, name')
                                .eq('team_id', effectiveTeamId);

                            if (refreshedFallback) {
                                finalMembers = refreshedFallback.map((m, i) => ({ ...m, display_order: i }));
                            }
                        }
                    }
                }

                if (finalMembers) setTeamMembers(finalMembers);
            }

            // 2. Fetch Leaves (Active team only)
            try {
                // Fetch ALL leaves for valid date range (Past 7 days -> Future 30 days) relative to VIEWED date
                const baseDate = dateFilter || new Date();
                const pastWeek = new Date(baseDate);
                pastWeek.setDate(pastWeek.getDate() - 14); // Wider window for robustness
                const startDateStr = pastWeek.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

                const nextMonth = new Date(baseDate);
                nextMonth.setDate(nextMonth.getDate() + 45); // Wider window
                const endDateStr = nextMonth.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

                let url = `/api/leaves?start_date=${startDateStr}&end_date=${endDateStr}`;

                // Use selectedTeamId if available (even for guests) to ensure we see relevant leaves
                const effectiveLeaveTeamId = isGuest ? selectedTeamId : (userProfile?.team_id || undefined);
                if (effectiveLeaveTeamId) {
                    url += `&team_id=${effectiveLeaveTeamId}`;
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
    }, [searchTerm, dateFilter, pcFilter, isGuest, selectedTeamId, isGuestLoading, userProfile?.team_id, realtimeTick]);

    // Standalone leave fetcher — called by onLeaveUpdate after HL/FL/WFH actions
    const fetchLeaves = useCallback(async () => {
        try {
            const baseDate = dateFilter || new Date();
            const pastWeek = new Date(baseDate);
            pastWeek.setDate(pastWeek.getDate() - 14);
            const startDateStr = pastWeek.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const nextMonth = new Date(baseDate);
            nextMonth.setDate(nextMonth.getDate() + 45);
            const endDateStr = nextMonth.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

            let url = `/api/leaves?start_date=${startDateStr}&end_date=${endDateStr}`;
            const effectiveLeaveTeamId = isGuest ? selectedTeamId : (userProfile?.team_id || undefined);
            if (effectiveLeaveTeamId) url += `&team_id=${effectiveLeaveTeamId}`;

            const leavesRes = await fetch(url);
            if (leavesRes.ok) {
                const leavesData = await leavesRes.json();
                setLeaves(leavesData.leaves || []);
            }
        } catch (error) {
            console.error('Error refreshing leaves:', error);
        }
    }, [dateFilter, isGuest, selectedTeamId, userProfile?.team_id]);

    // Real-time subscriptions: auto-refresh tasks & leaves when data changes on any device
    const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    useEffect(() => {
        if (isGuestLoading) return;

        // Debounce rapid-fire events
        let taskTimer: ReturnType<typeof setTimeout>;
        let leaveTimer: ReturnType<typeof setTimeout>;

        const channel = supabase
            .channel('tracker-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                clearTimeout(taskTimer);
                taskTimer = setTimeout(() => {
                    // Re-trigger the main data fetch by toggling a refresh counter
                    setRealtimeTick(t => t + 1);
                }, 1500);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => {
                clearTimeout(leaveTimer);
                leaveTimer = setTimeout(() => {
                    fetchLeaves();
                }, 1000);
            })
            .subscribe();

        realtimeChannelRef.current = channel;

        return () => {
            clearTimeout(taskTimer);
            clearTimeout(leaveTimer);
            supabase.removeChannel(channel);
        };
    }, [isGuestLoading, fetchLeaves]);

    const handleAddTask = () => {
        setEditingTask(null);
        setIsTaskModalOpen(true);
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const saveTask = async (taskData: Partial<Task> | Partial<Task>[]) => {

        // Helper to formatting payload
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
            // Bulk Creation / Update Case
            // Note: Update usually comes as single object from inline edits, but from Modal "Edit" it might come as array if we split tasks.
            // If editingTask is set, the first element is the update, others are new.

            const payloads = taskData.map(formatPayload);

            // If we are editing, we might want to split the update and create logic?
            // The API /api/tasks/create handles array. 
            // The API /api/tasks/update handles single object usually? Let's check.
            // My update to /create route handles arrays.
            // If we are "Updating" a task and splitting it, the `TaskModal` sends an array.
            // The first item in array corresponds to the original task (if editing).

            if (editingTask) {
                // First item is the update
                const [first, ...rest] = payloads;

                // Update the main task
                const { team_id, ...updatePayload } = first;
                const updateResponse = await fetch('/api/tasks/update', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Manager-Mode': localStorage.getItem('qa_tracker_guest_session') ? 'true' : 'false',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ id: editingTask.id, ...updatePayload })
                });

                if (!updateResponse.ok) {
                    const err = await updateResponse.json();
                    console.error('Error updating task:', err);
                    throw new Error(err.error || 'Server error');
                }

                // Create the rest
                if (rest.length > 0) {
                    const createResponse = await fetch('/api/tasks/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(rest)
                    });

                    if (!createResponse.ok) {
                        const err = await createResponse.json();
                        console.error('Error creating split tasks:', err);
                        // Partial failure - we might want to warn but not throw completely if main update worked?
                        // But TaskModal expects full success. Let's throw.
                        throw new Error(`Task updated, but failed to create split tasks: ${err.error || 'Server error'}`);
                    }
                }
                // Success managed by TaskModal

            } else {
                // Bulk Create
                const response = await fetch('/api/tasks/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloads)
                });

                if (!response.ok) {
                    const err = await response.json();
                    console.error('Error creating tasks via API:', err);
                    throw new Error(err.error || 'Server error');
                }
                // Success managed by TaskModal
            }

        } else {
            // Legacy / Single Object Case
            const dbPayload = formatPayload(taskData);

            if (editingTask) {
                const { team_id, ...updatePayload } = dbPayload;
                // ... existing update logic ...
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
                    throw new Error(err.error || 'Server error');
                }
                // Success managed by TaskModal
            } else {
                // ... existing create logic ...
                const response = await fetch('/api/tasks/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dbPayload)
                });

                if (!response.ok) {
                    const err = await response.json();
                    console.error('Error creating task via API:', err);
                    throw new Error(err.error || 'Server error');
                }
                // Success managed by TaskModal
            }
        }

        // Refresh tasks
        refreshTasks();
        setIsTaskModalOpen(false);
    };

    const handleSaveLeave = async (leaveData: LeaveFormData) => {
        try {
            const response = await fetch('/api/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...leaveData,
                    team_id: isGuest ? selectedTeamId : (userProfile?.team_id || undefined)
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to save leave');
            }

            success('Leave marked successfully');
            // Refresh leaves and tasks
            refreshTasks();
            const effectiveLeaveTeamId = isGuest ? selectedTeamId : (userProfile?.team_id || null);
            const leavesRes = await fetch(effectiveLeaveTeamId ? `/api/leaves?team_id=${effectiveLeaveTeamId}` : '/api/leaves');
            if (leavesRes.ok) {
                const leavesData = await leavesRes.json();
                setLeaves(leavesData.leaves || []);
            }
        } catch (err: any) {
            console.error('Error saving leave:', err);
            toastError(err.message || 'Failed to save leave');
        }
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

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = sortedAssignees.indexOf(active.id as string);
            const newIndex = sortedAssignees.indexOf(over.id as string);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newAssigneeOrder = arrayMove(sortedAssignees, oldIndex, newIndex);

                setTeamMembers((prev) => {
                    const next = [...prev];
                    // Update display_order for all members we have based on the new visual order
                    newAssigneeOrder.forEach((name, index) => {
                        const member = next.find(m => m.name === name);
                        if (member) {
                            member.display_order = index;
                        }
                    });

                    // Filter to only those in the team_members table and with a valid ID for persistence
                    const updatedMembers = next
                        .filter(m => m.id > 0) // Only persist real DB members
                        .map(m => ({
                            id: m.id,
                            display_order: m.display_order
                        }));

                    if (updatedMembers.length > 0) {
                        try {
                            fetch('/api/team-members/reorder', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ members: updatedMembers })
                            }).then(async (res) => {
                                if (!res.ok) {
                                    const errData = await res.json();
                                    console.error('Reorder failed:', errData);
                                    toast.error('Failed to save order. Migration might be missing.');
                                }
                            });
                        } catch (err) {
                            console.error('Failed to call reorder API:', err);
                            toast.error('Network error saving order.');
                        }
                    } else {
                        console.warn('No valid members to reorder (IDs missing).');
                    }

                    return next;
                });
            }
        }
    };

    // Filter and Sort Tasks
    const processedTasks = tasks
        // 1. Filter by View Mode
        .filter((task: Task) => {
            if (viewMode === 'forecast') {
                // Forecast tab: only show Forecast tasks
                return task.status === 'Forecast';
            } else {
                // Active tab: show ALL tasks (already filtered for non-completed/rejected in fetchData)
                return true;
            }
        })
        // 2. Sort by Custom Status Order
        .sort((a, b) => {
            const statusOrder: Record<string, number> = {
                'In Progress': 1,
                'Yet to Start': 2,
                'Forecast': 3,
                'On Hold': 4,
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

    // Derive the final sorted list of assignees for rendering AND SortableContext
    const sortedAssignees = Object.keys(groupedTasks).sort((a, b) => {
        // 1. Unassigned always last
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;

        // 2. Check teamMembers order
        const memberA = teamMembers.find(m => m.name === a);
        const memberB = teamMembers.find(m => m.name === b);

        /* console.log('Sorting:', { a, b, foundA: !!memberA, foundB: !!memberB, orderA: memberA?.display_order, orderB: memberB?.display_order }); */

        if (memberA && memberB) {
            return (memberA.display_order ?? 0) - (memberB.display_order ?? 0);
        }

        // 3. Fallback for members not in team_members table
        if (memberA) return -1;
        if (memberB) return 1;

        return a.localeCompare(b);
    });


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

                        <div className="w-full sm:w-auto flex flex-wrap justify-between sm:justify-start items-center gap-2">
                            <DatePicker
                                date={dateFilter}
                                setDate={setDateFilter}
                                placeholder="Filter by date"
                                className="w-[140px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 min-h-0 py-2 px-3 text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md"
                            />

                            {/* PC Filter Dropdown */}
                            <div className="relative w-full sm:w-[220px] z-50">
                                <Combobox
                                    options={[
                                        { id: 'All', label: 'All PCs' },
                                        ...pcNames.map(name => ({ id: name, label: name }))
                                    ]}
                                    value={pcFilter}
                                    onChange={(val) => setPcFilter(val as string)}
                                    placeholder="All PCs"
                                    searchPlaceholder="Search PC..."
                                />
                            </div>

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
                        {!isPCMode && (
                            <button
                                onClick={() => setIsLeaveModalOpen(true)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 px-4 py-2 rounded-lg transition-all font-semibold border border-orange-100 dark:border-orange-800 text-sm"
                            >
                                <CalendarClock size={16} />
                                Add Leave
                            </button>
                        )}
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
                        {!isPCMode && (
                            <button
                                onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-indigo-300 transition-all font-bold text-sm"
                            >
                                <Plus size={18} />
                                New Task
                            </button>
                        )}
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
            <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-md border-b border-slate-200 dark:border-slate-700 mb-2 rounded-t-lg overflow-x-auto no-scrollbar transition-colors">
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
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sortedAssignees}
                            strategy={verticalListSortingStrategy}
                        >
                            {/* Render draggables in the determined order */}
                            {sortedAssignees.map(assignee => (
                                <DraggableTableWrapper key={assignee} id={assignee}>
                                    <AssigneeTaskTable
                                        assignee={assignee}
                                        tasks={groupedTasks[assignee]}
                                        leaves={leaves}
                                        columnWidths={columnWidths}
                                        hideHeader={true}
                                        isRowExpanded={isRowExpanded}
                                        isReadOnly={isPCMode}
                                        dateFilter={dateFilter}
                                        selectedTeamId={isGuest ? selectedTeamId : (userProfile?.team_id || null)}
                                        onResizeStart={startResizing}
                                        onEditTask={isPCMode ? () => { } : handleEditTask}
                                        onFieldUpdate={isPCMode ? async () => { } : handleFieldUpdate}
                                        onLeaveUpdate={fetchLeaves}
                                    />
                                </DraggableTableWrapper>
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                task={editingTask}
                onSave={saveTask}
                onDelete={handleDeleteTask}
            />

            <LeaveModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                onSave={handleSaveLeave}
            />
        </div >
    );
}
