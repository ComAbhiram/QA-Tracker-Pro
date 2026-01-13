
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { AlertCircle, User, Calendar, Briefcase, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function RejectedProjects() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRejectedTasks();
    }, []);

    const fetchRejectedTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'Rejected')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setTasks(data.map(mapTaskFromDB));
            }
        } catch (error) {
            console.error('Error fetching rejected tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl shadow-sm">
                    <AlertCircle size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Rejected Projects</h1>
                    <p className="text-slate-500 font-medium">History of cancelled or rejected tasks with reasons</p>
                </div>
            </div>

            {tasks.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">No Rejected Projects</h3>
                    <p className="text-slate-500">All projects are moving forward smoothly!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="bg-white rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
                        >
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-red-50 bg-red-50/30">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-2 py-1 rounded-full tracking-wide">
                                        Rejected
                                    </span>
                                    <span className="text-slate-400 text-xs flex items-center gap-1">
                                        {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : 'No date'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-red-700 transition-colors">
                                    {task.projectName}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                    <Activity size={14} className="text-slate-400" />
                                    {task.subPhase}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <AlertCircle size={12} />
                                        Reason for Rejection
                                    </label>
                                    <div className="bg-red-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed border border-red-100/50">
                                        {task.deviationReason || (
                                            <span className="italic text-slate-400">No reason provided</span>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                            <User size={14} />
                                        </div>
                                        <span className="font-medium">{task.assignedTo || 'Unassigned'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
