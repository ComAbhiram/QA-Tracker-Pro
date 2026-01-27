
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task } from '@/lib/types';
import { getEffectiveStatus } from '@/utils/taskUtils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isWeekend, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, User } from 'lucide-react';
import TaskModal from '@/components/TaskModal';

export default function Schedule() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'day'>('calendar');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    useEffect(() => {
        fetchTasks();
    }, [currentDate, viewMode]);

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

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .or(`start_date.lte.${end.toISOString()},end_date.gte.${start.toISOString()}`);

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

    // Day View Tasks
    const dayViewTasks = tasks.filter(task => {
        if (!task.startDate || !task.endDate) return false;
        const start = new Date(task.startDate);
        const end = new Date(task.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const target = new Date(currentDate);
        target.setHours(12, 0, 0, 0);
        return target >= start && target <= end;
    });

    const getStatusColor = (task: Task) => {
        const status = getEffectiveStatus(task);
        const s = (status || '').toLowerCase();
        if (s === 'completed') return 'bg-emerald-600 text-white border-emerald-700 shadow-sm';
        if (s === 'in progress' || s === 'being developed') return 'bg-blue-600 text-white border-blue-700 shadow-sm';
        if (s === 'rejected') return 'bg-red-600 text-white border-red-700 shadow-sm';
        if (s === 'overdue') return 'bg-rose-600 text-white border-rose-700 shadow-sm';
        if (s.includes('qa') || s === 'ready for qa' || s === 'assigned to qa') return 'bg-purple-600 text-white border-purple-700 shadow-sm';
        if (s === 'yet to start' || s === 'forecast') return 'bg-amber-500 text-white border-amber-600 shadow-sm';
        if (s === 'on hold') return 'bg-slate-600 text-white border-slate-700 shadow-sm';
        return 'bg-sky-600 text-white border-sky-700 shadow-sm';
    };

    const getTaskBorderColor = (task: Task) => {
        const status = getEffectiveStatus(task);
        const s = (status || '').toLowerCase();
        if (s === 'completed') return 'border-emerald-600 bg-emerald-600 text-white';
        if (s === 'in progress' || s === 'being developed') return 'border-blue-600 bg-blue-600 text-white';
        if (s === 'rejected') return 'border-red-600 bg-red-600 text-white';
        if (s === 'overdue') return 'border-rose-600 bg-rose-600 text-white';
        if (s.includes('qa') || s === 'ready for qa' || s === 'assigned to qa') return 'border-purple-600 bg-purple-600 text-white';
        if (s === 'yet to start' || s === 'forecast') return 'border-amber-500 bg-amber-500 text-white';
        if (s === 'on hold') return 'border-slate-500 bg-slate-500 text-white';
        return 'border-sky-600 bg-sky-600 text-white';
    };

    const getStatusBadgeColor = (task: Task) => {
        const status = getEffectiveStatus(task);
        const s = (status || '').toLowerCase();
        if (s === 'completed') return 'bg-emerald-600 text-white';
        if (s === 'in progress' || s === 'being developed') return 'bg-blue-600 text-white';
        if (s === 'rejected') return 'bg-red-600 text-white';
        if (s === 'overdue') return 'bg-rose-600 text-white';
        if (s.includes('qa') || s === 'ready for qa' || s === 'assigned to qa') return 'bg-purple-600 text-white';
        if (s === 'yet to start' || s === 'forecast') return 'bg-amber-500 text-white';
        if (s === 'on hold') return 'bg-slate-600 text-white';
        return 'bg-sky-600 text-white';
    };

    const handleTaskClick = (task: Task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const saveTask = async (taskData: Partial<Task>) => {
        if (!editingTask) return;

        const dbPayload: any = {
            project_name: taskData.projectName,
            sub_phase: taskData.subPhase,
            status: taskData.status,
            assigned_to: taskData.assignedTo,
            assigned_to2: taskData.assignedTo2,
            start_date: taskData.startDate || null,
            end_date: taskData.endDate || null,
            bug_count: taskData.bugCount,
            html_bugs: taskData.htmlBugs,
            functional_bugs: taskData.functionalBugs
        };

        const { error } = await supabase
            .from('tasks')
            .update(dbPayload)
            .eq('id', editingTask.id);

        if (error) console.error('Error updating task:', error);

        await fetchTasks();
        setIsTaskModalOpen(false);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6">

            {/* Header Controls */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Work Schedule</h1>
                    <p className="text-slate-500">Manage project timelines and daily tasks</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CalendarIcon size={16} /> Calendar
                        </button>
                        <button
                            onClick={() => setViewMode('day')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List size={16} /> Day View
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        <button onClick={prevPeriod} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 border border-slate-200 hover:border-indigo-300 transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="min-w-[180px] text-center font-bold text-lg text-slate-800">
                            {viewMode === 'calendar' ? format(currentDate, 'MMMM yyyy') : format(currentDate, 'EEEE, MMM d, yyyy')}
                        </div>
                        <button onClick={nextPeriod} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 border border-slate-200 hover:border-indigo-300 transition-all">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <button onClick={goToToday} className="text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                        Today
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className={`bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-white/20 backdrop-blur-xl ${viewMode === 'calendar' ? 'h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar' : 'min-h-[600px]'}`}>

                {viewMode === 'calendar' && (
                    <div className="min-h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10 shadow-sm">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider backdrop-blur-md bg-slate-50/90">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-[minmax(160px,1fr)] flex-1">
                            {startPadding.map((_, i) => (
                                <div key={`empty-${i}`} className="bg-slate-50/30 border-r border-b border-slate-100"></div>
                            ))}
                            {days.map(day => {
                                const dayTasks = tasks.filter(task => {
                                    if (!task.startDate || !task.endDate) return false;
                                    const start = new Date(task.startDate);
                                    const end = new Date(task.endDate);
                                    start.setHours(0, 0, 0, 0);
                                    end.setHours(23, 59, 59, 999);
                                    return day >= start && day <= end;
                                });

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                                        className={`border-r border-b border-slate-100 p-2 transition-all hover:bg-indigo-50/50 cursor-pointer group relative flex flex-col
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
                                            {dayTasks.slice(0, 3).map(task => (
                                                <div key={task.id} className={`text-[11px] px-2 py-1.5 rounded-md border text-slate-700 truncate font-semibold mb-1 transition-all hover:scale-[1.02] ${getTaskBorderColor(task)}`}>
                                                    {task.projectName}
                                                </div>
                                            ))}
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

                {viewMode === 'day' && (
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
                                {dayViewTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleTaskClick(task)}
                                        className={`rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group relative border ${getTaskBorderColor(task)}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-black/20 text-white`}>
                                                {getEffectiveStatus(task)}
                                            </span>
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
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                task={editingTask}
                onSave={saveTask}
            />
        </div>
    );
}
