'use client';

import { useState, useEffect } from 'react';
import { X, Save, Calendar, User, Briefcase, Activity } from 'lucide-react';
import { Task } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import Combobox from './ui/Combobox';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: Task | null;
    onSave: (task: Partial<Task>) => Promise<void>;
}

export default function TaskModal({ isOpen, onClose, task, onSave }: TaskModalProps) {
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<{ id: string | number; label: string }[]>([]);
    const [isFetchingProjects, setIsFetchingProjects] = useState(false);

    // Initial state ...
    const initialState: Partial<Task> = {
        // ...
    };

    const [formData, setFormData] = useState<Partial<Task>>(initialState);

    // Fetch projects on mount
    useEffect(() => {
        const fetchProjects = async () => {
            setIsFetchingProjects(true);
            try {
                // Fetch from Supabase instead of Hubstaff API
                const { data, error } = await supabase
                    .from('projects')
                    .select('name')
                    .eq('status', 'active')
                    .order('name', { ascending: true });

                if (!error && data) {
                    setProjects(data.map((p: any) => ({
                        id: p.name,
                        label: p.name
                    })));
                } else {
                    console.error('Failed to fetch projects from DB:', error);
                }
            } catch (error) {
                console.error('Error fetching projects:', error);
            } finally {
                setIsFetchingProjects(false);
            }
        };

        if (isOpen && projects.length === 0) {
            fetchProjects();
        }
    }, [isOpen]);

    // Populate form data when task changes
    useEffect(() => {
        if (isOpen && task) {
            setFormData({
                projectName: task.projectName,
                subPhase: task.subPhase,
                pc: task.pc,
                status: task.status,
                startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
                endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
                startTime: task.startTime,
                endTime: task.endTime,
                assignedTo: task.assignedTo,
                assignedTo2: task.assignedTo2,
                bugCount: task.bugCount,
                htmlBugs: task.htmlBugs,
                functionalBugs: task.functionalBugs,
                deviationReason: task.deviationReason,
                comments: task.comments
            });
        } else if (isOpen && !task) {
            setFormData(initialState);
        }
    }, [isOpen, task]);

    // ... existing handlers


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['bugCount', 'htmlBugs', 'functionalBugs'].includes(name) ? parseInt(value) || 0 : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            if (!task) setFormData(initialState);
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Failed to save task. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleProjectChange = (value: string | number | null) => {
        setFormData(prev => ({
            ...prev,
            projectName: value ? String(value) : ''
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85dvh] overflow-y-auto animate-in zoom-in-95 duration-200 custom-scrollbar">

                {/* Header */}
                <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 flex items-center justify-between p-4 md:p-6 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${task ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'} shadow-sm`}>
                            {task ? <Activity size={24} /> : <Briefcase size={24} />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{task ? 'Edit Task' : 'New Project Task'}</h2>
                            <p className="text-sm text-slate-500 font-medium">{task ? 'Update task details below' : 'Kickoff a new project tracking item'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2.5 rounded-full transition-all duration-200"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-4 pb-10 md:p-6 space-y-8">

                    {/* Project & Phase */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Briefcase size={16} className="text-indigo-500" /> Project Name <span className="text-red-500">*</span>
                            </label>
                            <Combobox
                                options={projects}
                                value={formData.projectName}
                                onChange={handleProjectChange}
                                placeholder={isFetchingProjects ? "Loading projects..." : "Select Project..."}
                                searchPlaceholder="Search projects..."
                                emptyMessage="No projects found."
                                isLoading={isFetchingProjects}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Activity size={16} className="text-indigo-500" /> Phase (Sub-phase) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="subPhase"
                                required
                                value={formData.subPhase || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
                                placeholder="e.g. Discovery, Development"
                            />
                        </div>
                    </div>

                    {/* Status & Completion */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Status</label>
                            <select
                                name="status"
                                value={formData.status || 'In Progress'}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 appearance-none cursor-pointer"
                            >
                                <option value="Yet to Start">Yet to Start</option>
                                <option value="Being Developed">Being Developed</option>
                                <option value="Ready for QA">Ready for QA</option>
                                <option value="Assigned to QA">Assigned to QA</option>
                                <option value="In Progress">In Progress</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Completed">Completed</option>
                                <option value="Forecast">Forecast</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                        {formData.status === 'Rejected' && (
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    Reason for Rejection <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="deviationReason"
                                    required
                                    value={formData.deviationReason || ''}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-red-50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-red-300 font-medium text-slate-700 min-h-[100px]"
                                    placeholder="Please explain why this task was rejected..."
                                />
                            </div>
                        )}
                    </div>

                    {/* Dates & Times */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Calendar size={16} className="text-indigo-500" /> Start
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate || ''}
                                    onChange={handleChange}
                                    className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                                />
                                <input
                                    type="time"
                                    name="startTime"
                                    value={formData.startTime || ''}
                                    onChange={handleChange}
                                    className="w-32 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 text-center"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Calendar size={16} className="text-indigo-500" /> End
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="date"
                                    name="endDate"
                                    value={formData.endDate || ''}
                                    onChange={handleChange}
                                    className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                                />
                                <input
                                    type="time"
                                    name="endTime"
                                    value={formData.endTime || ''}
                                    onChange={handleChange}
                                    className="w-32 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 text-center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* People */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <User size={16} className="text-indigo-500" /> Project Coordinator (PC)
                            </label>
                            <input
                                type="text"
                                name="pc"
                                value={formData.pc || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
                                placeholder="Project Coordinator Name"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <User size={16} className="text-indigo-500" /> Assigned To
                            </label>
                            <input
                                type="text"
                                name="assignedTo"
                                value={formData.assignedTo || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
                                placeholder="Lead Developer"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <User size={16} className="text-indigo-500" /> Second Assignee
                            </label>
                            <input
                                type="text"
                                name="assignedTo2"
                                value={formData.assignedTo2 || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
                                placeholder="Co-Developer"
                            />
                        </div>
                    </div>

                    {/* Bugs - Optional */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Total Bugs</label>
                            <input
                                type="number"
                                name="bugCount"
                                min="0"
                                value={formData.bugCount || 0}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-slate-700 font-medium"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">HTML Bugs</label>
                            <input
                                type="number"
                                name="htmlBugs"
                                min="0"
                                value={formData.htmlBugs || 0}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-slate-700 font-medium"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Func. Bugs</label>
                            <input
                                type="number"
                                name="functionalBugs"
                                min="0"
                                value={formData.functionalBugs || 0}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-slate-700 font-medium"
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-6 flex items-center justify-end gap-3 border-t border-slate-100 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm transform active:scale-95 duration-200"
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Task'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
