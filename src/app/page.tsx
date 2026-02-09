'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task } from '@/lib/types';
import DashboardStats from '@/components/DashboardStats';
import DashboardCharts from '@/components/DashboardCharts';
import DailyReportsModal from '@/components/DailyReportsModal';
import TaskModal from '@/components/TaskModal';
import Pagination from '@/components/Pagination';
import { Plus, FileText, Layers, Edit2, Search } from 'lucide-react';
import { useGuestMode } from '@/contexts/GuestContext';

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
  const itemsPerPage = 10;

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { isGuest, selectedTeamId } = useGuestMode();

  // 1. Fetch Stats Data (Global logic for Charts & Stats Cards)
  // Fetches lightweight data for ALL tasks to populate charts/stats consistently
  const fetchStatsData = useCallback(async () => {
    setLoadingStats(true);
    console.log('fetchStatsData: isGuest=', isGuest, 'selectedTeamId=', selectedTeamId);
    let query = supabase
      .from('tasks')
      .select('id, status, end_date, assigned_to, project_name, sub_phase', { count: 'exact' });

    // Apply Team Filter if Guest
    if (isGuest && selectedTeamId) {
      query = query.eq('team_id', selectedTeamId);
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
        createdAt: '',
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
  }, [isGuest, selectedTeamId]);


  // 2. Fetch Table Data (Paginated & Filtered)
  const fetchTableData = useCallback(async (page: number, currentFilter: string, search: string) => {
    setLoadingTasks(true);
    console.log('fetchTableData: isGuest=', isGuest, 'selectedTeamId=', selectedTeamId);

    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' });

    // Apply Team Filter
    if (isGuest) {
      if (selectedTeamId) {
        query = query.eq('team_id', selectedTeamId);
      } else {
        // Critical Fix: If in Guest/Manager mode but no Team ID is present, DO NOT return all data.
        // Return an empty result instead to prevent data leakage.
        // We can achieve this by filtering on an impossible condition.
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

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching table tasks:', error);
      // If in guest mode, this might be RLS blocking access.
      if (isGuest) {
        console.error('Manager Mode Access Error: Possible RLS restriction on production DB.');
      }
    } else {
      setTasks((data || []).map(mapTaskFromDB));
      setTotalItems(count || 0);
    }
    setLoadingTasks(false);
  }, [isGuest, selectedTeamId, itemsPerPage]);


  // Effects

  // Initial Data Load (Stats + Table)
  useEffect(() => {
    fetchStatsData();
  }, [fetchStatsData]);

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
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-16 lg:pl-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Team Tracker</h1>
          <p className="text-slate-500">Overview of all active team projects</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <FileText size={18} /> Daily Reports
          </button>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Task List - Powered by Paginated Fetch */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Layers size={20} className="text-indigo-600" />
              Project Tasks
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 border border-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600 border border-slate-400">Project</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 border border-slate-400">Phase</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 border border-slate-400">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 border border-slate-400">Assignees</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 border border-slate-400">Timeline</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loadingTasks ? (
                  <tr><td colSpan={6} className="p-8 text-center">Loading tasks...</td></tr>
                ) : tasks.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No tasks found</td></tr>
                ) : (
                  tasks.map(task => (
                    <tr key={task.id} className="border-b border-slate-400 hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-800 border border-slate-400">
                        <div className="flex flex-col">
                          <span>{task.projectName}</span>
                          <span className="text-xs text-slate-500 font-normal">{task.projectType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border border-slate-400">{task.subPhase || '-'}</td>
                      <td className="px-6 py-4 border border-slate-400">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[task.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 border border-slate-400">
                        <div className="flex -space-x-2">
                          {task.assignedTo && <div className="w-8 h-8 rounded-full bg-sky-100 border-2 border-white flex items-center justify-center text-xs font-bold text-sky-600 shadow-sm" title={task.assignedTo}>{task.assignedTo.charAt(0)}</div>}
                          {task.assignedTo2 && <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm" title={task.assignedTo2}>{task.assignedTo2.charAt(0)}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 border border-slate-400">
                        {task.startDate ? (
                          <span>
                            {new Date(task.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {' - '}
                            {task.endDate ? new Date(task.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '...'}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">No timeline</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isGuest && (
                          <button
                            onClick={() => handleEditTask(task)}
                            className="text-slate-400 hover:text-sky-600 hover:bg-sky-50 p-2 rounded-lg transition-all"
                            title="Edit Task"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
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
        <div className="space-y-8">
          <DashboardCharts tasks={allStatsTasks} />
        </div>
      </div>

      <DailyReportsModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
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
