'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { TrendingUp, User, Activity, Calendar, Edit } from 'lucide-react';
import { format } from 'date-fns';
import TaskModal from '@/components/TaskModal';

export default function ForecastProjects() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchForecastTasks();
    }, []);

    const fetchForecastTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'Forecast')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setTasks(data.map(mapTaskFromDB));
            }
        } catch (error) {
            console.error('Error fetching forecast tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const handleSaveTask = async (updatedTask: Partial<Task>) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    project_name: updatedTask.projectName,
                    project_type: updatedTask.projectType,
                    sub_phase: updatedTask.subPhase,
                    priority: updatedTask.priority,
                    pc: updatedTask.pc,
                    assigned_to: updatedTask.assignedTo,
                    assigned_to2: updatedTask.assignedTo2,
                    status: updatedTask.status,
                    start_date: updatedTask.startDate,
                    end_date: updatedTask.endDate,
                    actual_completion_date: updatedTask.actualCompletionDate,
                    comments: updatedTask.comments,
                    current_updates: updatedTask.currentUpdates,
                    bug_count: updatedTask.bugCount,
                    html_bugs: updatedTask.htmlBugs,
                    functional_bugs: updatedTask.functionalBugs,
                    deviation_reason: updatedTask.deviationReason,
                })
                .eq('id', selectedTask?.id);

            if (!error) {
                setIsModalOpen(false);
                fetchForecastTasks(); // Refresh the list
            }
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-7xl mx-auto space-y-8 p-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Forecast Projects</h1>
                        <p className="text-slate-500 font-medium">Upcoming projects and future planning</p>
                    </div>
                </div>

                {tasks.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <TrendingUp className="text-slate-300" size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">No Forecast Projects</h3>
                        <p className="text-slate-500">Projects marked as "Forecast" will appear here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                onClick={() => handleTaskClick(task)}
                                className="bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer"
                            >
                                {/* Header */}
                                <div className="p-6 pb-4 border-b border-blue-50 bg-blue-50/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-2 py-1 rounded-full tracking-wide">
                                            Forecast
                                        </span>
                                        <button className="text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit size={16} />
                                        </button>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">
                                        {task.projectName}
                                    </h3>
                                    {task.subPhase && (
                                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                            <Activity size={14} className="text-slate-400" />
                                            {task.subPhase}
                                        </div>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-4">
                                    {task.projectType && (
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Project Type</div>
                                            <div className="text-sm font-medium text-slate-700">{task.projectType}</div>
                                        </div>
                                    )}

                                    {task.priority && (
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Priority</div>
                                            <div className="text-sm font-medium text-slate-700">{task.priority}</div>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <User size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-400 font-medium">Assignee</span>
                                                <span className="font-medium text-slate-700">{task.assignedTo || 'Unassigned'}</span>
                                            </div>
                                        </div>
                                        {task.startDate && (
                                            <span className="text-slate-400 text-xs flex items-center gap-1">
                                                <Calendar size={12} />
                                                {format(new Date(task.startDate), 'MMM d, yyyy')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Task Edit Modal */}
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTask(null);
                }}
                task={selectedTask}
                onSave={handleSaveTask}
            />
        </>
    );
}
