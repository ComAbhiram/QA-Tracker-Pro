
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task } from '@/lib/types';
import DashboardStats from '@/components/DashboardStats';
import DashboardCharts from '@/components/DashboardCharts';
import DailyReportsModal from '@/components/DailyReportsModal';
import TaskModal from '@/components/TaskModal';
import Pagination from '@/components/Pagination';
import { Plus, FileText, Layers, Edit2 } from 'lucide-react';
import { useGuestMode } from '@/contexts/GuestContext';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { isGuest, selectedTeamId } = useGuestMode();

  useEffect(() => {
    fetchTasks();
  }, [selectedTeamId]);

  async function fetchTasks() {
    setLoading(true);

    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by team if in guest mode
    if (isGuest && selectedTeamId) {
      console.log('Guest mode: Filtering by team_id:', selectedTeamId);
      query = query.eq('team_id', selectedTeamId);
    } else {
      console.log('Not in guest mode or no team selected. isGuest:', isGuest, 'selectedTeamId:', selectedTeamId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      console.log('Fetched tasks:', data?.length || 0, 'tasks');
      setTasks((data || []).map(mapTaskFromDB));
    }
    setLoading(false);
  }

  const [searchQuery, setSearchQuery] = useState('');

  // ... (existing code)

  const filteredTasks = tasks.filter(task => {
    // 1. Filter by Status/Category
    if (filter !== 'All') {
      if (filter === 'active') {
        if (!['In Progress', 'Being Developed', 'Ready for QA', 'Assigned to QA', 'Yet to Start', 'Forecast', 'On Hold'].includes(task.status)) return false;
      } else if (filter === 'Overdue') {
        if (!task.endDate || task.status === 'Completed' || new Date(task.endDate) >= new Date()) return false;
      } else if (task.status !== filter) {
        return false;
      }
    }

    // 2. Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = task.projectName?.toLowerCase().includes(query);
      const matchPhase = task.subPhase?.toLowerCase().includes(query);
      const matchAssignee = task.assignedTo?.toLowerCase().includes(query) || task.assignedTo2?.toLowerCase().includes(query);
      const matchStatus = task.status?.toLowerCase().includes(query);

      return matchName || matchPhase || matchAssignee || matchStatus;
    }

    return true;
  });

  // ... (existing code methods)

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
                <Edit2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-0" /> 
                {/* We use a search icon here usually, let's just use text-indent or a lucide icon if available. 
                    I see Edit2 and others imported. I should check if Search is imported or just omit the icon for now 
                    or import it cleanly. Let's assume I can import Search. 
                */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md whitespace-nowrap">
                {filteredTasks.length} tasks
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
                  <th className="px-6 py-4 font-semibold text-slate-600 border border-slate-400">Due Date</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center">Loading tasks...</td></tr>
                ) : filteredTasks.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No tasks found</td></tr>
                ) : (
                  paginatedTasks.map(task => (
                    <tr key={task.id} className="border-b border-slate-400 hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-800 border border-slate-400">{task.projectName}</td>
                      <td className="px-6 py-4 border border-slate-400">{task.subPhase || '-'}</td>
                      <td className="px-6 py-4 border border-slate-400">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          task.status === 'In Progress' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                            task.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-100' :
                              'bg-slate-50 text-slate-600 border-slate-400'
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
                        {task.endDate ? new Date(task.endDate).toLocaleDateString() : '-'}
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

  {/* Pagination */ }
  <Pagination
    currentPage={currentPage}
    totalItems={totalItems}
    itemsPerPage={itemsPerPage}
    onPageChange={setCurrentPage}
  />
        </div >

    {/* Side Content */ }
    < div className = "space-y-8" >
      <DashboardCharts tasks={tasks} />
        </div >
      </div >

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

    </div >
  );
}
