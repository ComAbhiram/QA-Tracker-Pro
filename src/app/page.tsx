'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task } from '@/lib/types';
import DashboardStats from '@/components/DashboardStats';
import DashboardCharts from '@/components/DashboardCharts';
import DailyReportsModal from '@/components/DailyReportsModal';
import TaskModal from '@/components/TaskModal';
import Pagination from '@/components/Pagination';
import GlobalAvailabilityModal from '@/components/GlobalAvailabilityModal';
import { Plus, FileText, Layers, Edit2, Search, CalendarClock, CheckCircle2, Circle, Cloud, PauseCircle, Clock, XCircle, PlayCircle } from 'lucide-react';
import { useGuestMode } from '@/contexts/GuestContext';
import TaskMigration from '@/components/TaskMigration';
import ResizableHeader from '@/components/ui/ResizableHeader';
import useColumnResizing from '@/hooks/useColumnResizing';
import Loader from '@/components/ui/Loader';

export default function Home() {
  // Table Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Statistics Data State (Global)
  const [allStatsTasks, setAllStatsTasks] = useState<Task[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Filter & Search State
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 15;

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();

  // Column Resizing
  const { columnWidths, startResizing: handleResizeStart } = useColumnResizing({
    projectName: 250,
    phase: 150,
    status: 140,
    assignees: 100,
    timeline: 160
  });

  // 1. Fetch Stats Data (Global logic for Charts & Stats Cards)
  // Fetches lightweight data for ALL tasks to populate charts/stats consistently
  const fetchStatsData = useCallback(async () => {
    setLoadingStats(true);
    console.log('fetchStatsData: isGuest=', isGuest, 'selectedTeamId=', selectedTeamId);
    let query = supabase
      .from('tasks')
      .select('id, status, end_date, assigned_to, project_name, sub_phase, created_at', { count: 'exact' });

    // Apply Team Filter if Guest
    if (isGuest) {
      const isQATeamGlobal = selectedTeamId === 'ba60298b-8635-4cca-bcd5-7e470fad60e6';
      if (selectedTeamId && !isQATeamGlobal) {
        query = query.eq('team_id', selectedTeamId);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching stats data:', error);
    } else {
      // We map to a Partial Task structure sufficient for DashboardStats/Charts
      // Note: DashboardStats calculates 'active' based on status text, so 'status' is crucial.
      // 'Overdue' needs 'endDate'. Charts need 'assignedTo'.
      const mappedStatsTasks = (data || []).map((t: any) => ({
        ...t,
        status: t.status,
        endDate: t.end_date,
        assignedTo: t.assigned_to,
        // Fill other required Task fields with defaults to satisfy TS (though components only use specific fields)
        projectName: t.project_name || '',
        subPhase: t.sub_phase || '',
        createdAt: t.created_at || new Date().toISOString(), // Fallback for charts
        projectType: null,
        priority: null,
        pc: null,
        assignedTo2: null,
        additionalAssignees: [],
        startDate: null,
        actualCompletionDate: null,
        includeSaturday: false,
        actualStartDate: null,
        actualEndDate: null,
        startTime: null,
        endTime: null,
        completedAt: null,
        comments: null,
        currentUpdates: null,
        bugCount: 0,
        htmlBugs: 0,
        functionalBugs: 0,
        deviationReason: null,
        sprint: null,
        sprintLink: null,
        daysAllotted: 0,
        timeTaken: null,
        daysTaken: 0,
        deviation: 0,
        activityPercentage: 0,
      } as Task));

      setAllStatsTasks(mappedStatsTasks);
    }
    setLoadingStats(false);
  }, [isGuest, selectedTeamId, isGuestLoading]);


  // 2. Fetch Table Data (Paginated & Filtered)
  const fetchTableData = useCallback(async (page: number, currentFilter: string, search: string) => {
    setLoadingTasks(true);
    console.log('fetchTableData: isGuest=', isGuest, 'selectedTeamId=', selectedTeamId);

    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' });

    // Apply Team Filter
    if (isGuest) {
      const isQATeamGlobal = selectedTeamId === 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

      if (selectedTeamId && !isQATeamGlobal) {
        query = query.eq('team_id', selectedTeamId);
      } else if (!selectedTeamId) {
        // Critical Fix: If in Guest/Manager mode but no Team ID is present, DO NOT return all data.
        console.warn('Manager Mode: selectedTeamId is missing, blocking data fetch.');
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    // Apply Status Filter
    if (currentFilter !== 'All') {
      if (currentFilter === 'active') {
        const activeStatuses = ['In Progress', 'Being Developed', 'Ready for QA', 'Assigned to QA', 'Yet to Start', 'Forecast', 'On Hold'];
        query = query.in('status', activeStatuses);
      } else if (currentFilter === 'Overdue') {
        // Server-side overdue approximation: Active tasks where end_date < today
        // Note: Exact overdue logic involves IST time which is harder in basic SQL query without valid timezone support or RPC
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('end_date', today)
          .not('status', 'in', '("Completed","Rejected")');
      } else if (currentFilter === 'Forecast') {
        query = query.eq('status', 'Forecast');
      } else {
        query = query.eq('status', currentFilter);
      }
    }

    // Apply Search
    if (search) {
      const term = `%${search}%`;
      query = query.or(`project_name.ilike.${term},sub_phase.ilike.${term},assigned_to.ilike.${term},assigned_to2.ilike.${term},status.ilike.${term}`);
    }

    // Apply Pagination
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // Default sorting logic for fetching
    // If we are in 'active' or 'Forecast' view, we might want to fetch all and sort client side
    // BUT pagination makes this tricky.
    // For now, let's keep server side pagination and just order by created_at.
    // Ideally, we'd use a custom sort order in SQL but that requires a function or complex order string.
    // Given the request, user wants: In Progress > Forecast > On Hold > Yet to Start > Being Developed
    // Let's TRY to fetch all if 'active' to sort correctly, assuming reasonable task count (e.g. < 50-100 active tasks per team).
    // If 'active' or 'Forecast' filter is on, let's bypass pagination range for FETCHING, sort locally, then slice for pagination.

    const shouldCustomSort = currentFilter === 'active' || currentFilter === 'Forecast';

    if (!shouldCustomSort) {
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);
    } else {
      // Fetch ALL matching active tasks to sort them properly
      query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching table tasks:', error);
      // If in guest mode, this might be RLS blocking access.
      if (isGuest) {
        console.error('Manager Mode Access Error: Possible RLS restriction on production DB.');
      }
    } else {
      let finalTasks = (data || []).map(mapTaskFromDB);

      if (shouldCustomSort) {
        // Client-side Custom Sort
        const statusOrder: Record<string, number> = {
          'In Progress': 1,
          'Forecast': 2,
          'On Hold': 3,
          'Yet to Start': 4,
          'Being Developed': 5,
          'Ready for QA': 6,
          'Assigned to QA': 7
          // Others will be at the end
        };

        finalTasks.sort((a, b) => {
          const orderA = statusOrder[a.status] || 99;
          const orderB = statusOrder[b.status] || 99;
          return orderA - orderB;
        });

        // Re-apply Pagination logic client-side since we fetched all
        setTotalItems(finalTasks.length); // Count is total fetched
        const paginatedTasks = finalTasks.slice(from, to + 1); // slice end is exclusive
        setTasks(paginatedTasks);
      } else {
        setTasks(finalTasks);
        setTotalItems(count || 0);
      }
    }
    setLoadingTasks(false);
  }, [isGuest, selectedTeamId, itemsPerPage, isGuestLoading]);


  // Effects

  // Initial Data Load (Stats + Table)
  useEffect(() => {
    if (!isGuestLoading) {
      fetchStatsData();
    }
  }, [fetchStatsData, isGuestLoading]);

  // Debounced Search & Table Refresh
  useEffect(() => {
    const timer = setTimeout(() => {
      // If search query changed, we might want to reset to page 1.
      // But this effect also runs on page change (due to dependency on internal logic or if we separated effects).
      // Let's keep it simple: Call fetchTableData with current state.
      // BUT: If search query *just* changed, we want page 1.
      // If page *just* changed, we want that page.
      // Current implementation of simple debounce might clobber page navigation if typed fast.
      // Solution: Pass currentPage, but inside the component we need to coordinate resets.
      fetchTableData(currentPage, filter, searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, filter, currentPage, fetchTableData]);

  // Reset page when filter/search changes (This works by effect separation or logic)
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);


  // Handlers
  const handleAddTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    if (isGuest) {
      alert('You are in guest mode. Editing is not allowed.');
      return;
    }
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const saveTask = async (taskData: Partial<Task>) => {
    // Map frontend Task format back to DBTask format
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
      actual_completion_date: taskData.actualCompletionDate || null,
      start_time: taskData.startTime || null,
      end_time: taskData.endTime || null,
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
      const { team_id, ...updatePayload } = dbPayload;
      const { error } = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', editingTask.id);

      if (error) {
        console.error('Error updating task:', error);
        alert('Failed to update task: ' + error.message);
        return;
      }
    } else {
      const newId = Date.now();
      const { error } = await supabase
        .from('tasks')
        .insert([{ ...dbPayload, id: newId }]);

      if (error) {
        console.error('Error creating task:', error);
        alert('Failed to create task: ' + error.message);
        return;
      }
    }

    // Refresh data
    fetchTableData(currentPage, filter, searchQuery);
    fetchStatsData();
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = async (taskId: number) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task: ' + error.message);
    } else {
      fetchTableData(currentPage, filter, searchQuery);
      fetchStatsData();
      setIsTaskModalOpen(false);
    }
  };


  const statusColors: Record<string, string> = {
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
    'Pending': 'bg-orange-100 text-orange-700 border-orange-200',
    'On Hold': 'bg-red-100 text-red-700 border-red-200',
    'Review': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Ready for QA': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-24">

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Team Tracker</h1>
          <p className="text-slate-500">Overview of all active team projects</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <FileText size={18} /> Daily Reports
          </button>
          <button
            onClick={() => setIsAvailabilityModalOpen(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <CalendarClock size={18} /> Check Availability
          </button>

          {!isGuest && <TaskMigration />}
          {!isGuest && (
            <button
              onClick={handleAddTask}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={18} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Stats - Powered by lightweight fetch of ALL tasks (filtered by guest team) */}
      <DashboardStats
        tasks={allStatsTasks}
        onFilterChange={(f) => {
          setFilter(f);
          // Stats cards don't change charts, but they change the TABLE filter.
        }}
        activeFilter={filter}
      />

      <div className="flex flex-col gap-8">
        {/* Main Task List - Powered by Paginated Fetch */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Layers size={20} className="text-indigo-600" />
              All Tasks
            </h3>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md whitespace-nowrap">
                {totalItems} total results
              </span>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <ResizableHeader
                    label="Project"
                    width={columnWidths.projectName}
                    widthKey="projectName"
                    onResizeStart={handleResizeStart}
                    className="text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200"
                  />
                  <ResizableHeader
                    label="Phase"
                    width={columnWidths.phase}
                    widthKey="phase"
                    onResizeStart={handleResizeStart}
                    className="text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200"
                  />
                  <ResizableHeader
                    label="Status"
                    width={columnWidths.status}
                    widthKey="status"
                    onResizeStart={handleResizeStart}
                    className="text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200"
                  />
                  <ResizableHeader
                    label="Assignees"
                    width={columnWidths.assignees}
                    widthKey="assignees"
                    onResizeStart={handleResizeStart}
                    className="text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200"
                  />
                  <ResizableHeader
                    label="Timeline"
                    width={columnWidths.timeline}
                    widthKey="timeline"
                    onResizeStart={handleResizeStart}
                    className="text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200"
                  />
                  <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider text-left bg-slate-50 border-b border-slate-200">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingTasks ? (
                  <tr><td colSpan={6} className="p-12 text-center"><div className="flex justify-center"><Loader size="md" /></div></td></tr>
                ) : tasks.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-sm">No tasks found</td></tr>
                ) : (
                  tasks.map(task => (
                    <tr
                      key={task.id}
                      onClick={() => handleEditTask(task)}
                      className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-3 py-2 font-medium text-slate-800 border-r border-slate-100 truncate max-w-[200px]" title={task.projectName}>
                        <div className="flex flex-col truncate">
                          <span className="truncate text-xs font-semibold">{task.projectName}</span>
                          <span className="text-[10px] text-slate-400 font-normal truncate">{task.projectType}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100 text-xs truncate max-w-[150px]" title={task.subPhase || ''}>
                        {task.subPhase || '-'}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100">
                        {(() => {
                          switch (task.status) {
                            case 'In Progress': return <div className="flex items-center gap-1.5 text-blue-700 font-medium text-xs"><PlayCircle size={12} /> In Progress</div>;
                            case 'Completed': return <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-xs"><CheckCircle2 size={12} /> Completed</div>;
                            case 'Yet to Start': return <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs"><Circle size={12} /> Yet to Start</div>;
                            case 'Forecast': return <div className="flex items-center gap-1.5 text-violet-600 font-medium text-xs"><Cloud size={12} /> Forecast</div>;
                            case 'On Hold': return <div className="flex items-center gap-1.5 text-amber-600 font-medium text-xs"><PauseCircle size={12} /> On Hold</div>;
                            case 'Ready for QA': return <div className="flex items-center gap-1.5 text-pink-600 font-medium text-xs"><Clock size={12} /> Ready for QA</div>;
                            case 'Assigned to QA': return <div className="flex items-center gap-1.5 text-cyan-600 font-medium text-xs"><Clock size={12} /> Assigned to QA</div>;
                            case 'Rejected': return <div className="flex items-center gap-1.5 text-red-600 font-medium text-xs"><XCircle size={12} /> Rejected</div>;
                            default: return <div className="text-slate-600 text-xs">{task.status}</div>;
                          }
                        })()}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100">
                        <div className="flex flex-col gap-1">
                          {task.assignedTo && (
                            <span className="text-xs text-slate-700 font-medium truncate max-w-[120px]" title={task.assignedTo}>
                              {task.assignedTo}
                            </span>
                          )}
                          {task.assignedTo2 && (
                            <span className="text-xs text-slate-700 font-medium truncate max-w-[120px]" title={task.assignedTo2}>
                              {task.assignedTo2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100 text-xs">
                        {task.startDate ? (
                          <span className="truncate block max-w-[120px]" title={`${new Date(task.startDate).toLocaleDateString()} - ${task.endDate ? new Date(task.endDate).toLocaleDateString() : '...'}`}>
                            {new Date(task.startDate).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                            {' - '}
                            {task.endDate ? new Date(task.endDate).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }) : '...'}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-[10px]">No timeline</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-left border-r border-slate-100 text-xs truncate max-w-[200px]" title={task.comments || ''}>
                        {task.comments || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loadingTasks && totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        {/* Side Content: Charts - Powered by lightweight Global Stats Data */}
        <div className="w-full">
          <DashboardCharts tasks={allStatsTasks} />
        </div>
      </div>

      <DailyReportsModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      <GlobalAvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
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
