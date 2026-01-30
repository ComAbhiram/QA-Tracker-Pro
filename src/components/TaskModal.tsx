'use client';

import { useState, useEffect } from 'react';
import { X, Save, Calendar, User, Briefcase, Activity } from 'lucide-react';
import { Task } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import Combobox from './ui/Combobox';
import { mapHubstaffNameToQA } from '@/lib/hubstaff-name-mapping';

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
    const [hubstaffUsers, setHubstaffUsers] = useState<{ id: string; label: string }[]>([]);
    const [loadingHubstaffUsers, setLoadingHubstaffUsers] = useState(false);
    const [isQATeam, setIsQATeam] = useState(false);

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

    // Fetch Hubstaff users on mount
    useEffect(() => {
        const fetchHubstaffUsers = async () => {
            setLoadingHubstaffUsers(true);
            try {
                const response = await fetch('/api/hubstaff/users');
                if (response.ok) {
                    const data = await response.json();
                    if (data.members) {
                        const formattedUsers = data.members.map((u: any) => ({
                            id: mapHubstaffNameToQA(u.name), // Map full name to short QA name (e.g. Aswathi M Ashok -> Aswathi)
                            label: u.name
                        }));
                        setHubstaffUsers(formattedUsers);
                    }
                }
            } catch (error) {
                console.error('Error fetching Hubstaff users:', error);
            } finally {
                setLoadingHubstaffUsers(false);
            }
        };

        if (isOpen && hubstaffUsers.length === 0) {
            fetchHubstaffUsers();
        }
    }, [isOpen]);

    // Detect if user is super admin
    useEffect(() => {
        const checkRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                setIsQATeam(profile?.role === 'super_admin');
            }
        };

        if (isOpen) {
            checkRole();
        }
    }, [isOpen]);


    // Populate form data when task changes
    useEffect(() => {
        if (isOpen && task) {
            setFormData({
                projectName: task.projectName,
                projectType: task.projectType,
                subPhase: task.subPhase,
                priority: task.priority,
                pc: task.pc,
                status: task.status,
                startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
                endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
                actualCompletionDate: task.actualCompletionDate ? new Date(task.actualCompletionDate).toISOString().split('T')[0] : '',
                startTime: task.startTime,
                endTime: task.endTime,
                assignedTo: task.assignedTo,
                assignedTo2: task.assignedTo2,
                bugCount: task.bugCount,
                htmlBugs: task.htmlBugs,
                functionalBugs: task.functionalBugs,
                deviationReason: task.deviationReason,
                comments: task.comments,
                currentUpdates: task.currentUpdates
            });
        } else if (isOpen && !task) {
            setFormData(initialState);
        }
    }, [isOpen, task]);

    // ... existing handlers


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: ['bugCount', 'htmlBugs', 'functionalBugs'].includes(name) ? parseInt(value) || 0 : value
            };

            // Auto-fill actualCompletionDate when status changes to "Completed"
            if (name === 'status' && value === 'Completed' && !prev.actualCompletionDate) {
                newData.actualCompletionDate = new Date().toISOString().split('T')[0];
            }

            return newData;
        });
    };

    const [userTeamId, setUserTeamId] = useState<string | null>(null);

    // Fetch Team ID on mount
    useEffect(() => {
        const fetchTeam = async () => {
            const { getCurrentUserTeam } = await import('@/utils/userUtils');
            const team = await getCurrentUserTeam();
            if (team) setUserTeamId(team.team_id);
        };
        fetchTeam();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Use locally fetched teamId if not present in task
            let teamId = task?.teamId || userTeamId;

            if (!teamId) {
                // Fallback try one last time
                const { getCurrentUserTeam } = await import('@/utils/userUtils');
                const userTeam = await getCurrentUserTeam();
                if (userTeam) teamId = userTeam.team_id;
            }

            if (!teamId) {
                alert('Error: Could not determine your Team ID. Please refresh the page.');
                setLoading(false);
                return;
            }

            await onSave({ ...formData, teamId });
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

    const handleAssigneeChange = (field: 'assignedTo' | 'assignedTo2', value: string | number | null) => {
        setFormData(prev => ({
            ...prev,
            [field]: value ? String(value) : null
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

                    {/* 1. Project Name & 2. Project Type */}
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
                                <Activity size={16} className="text-indigo-500" /> Project Type
                            </label>
                            <input
                                type="text"
                                name="projectType"
                                value={formData.projectType || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
                                placeholder="e.g. Web Development, Mobile App"
                            />
                        </div>
                    </div>

                    {/* 3. Priority & 4. PC */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Priority</label>
                            <select
                                name="priority"
                                value={formData.priority || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 appearance-none cursor-pointer"
                            >
                                <option value="">Select Priority</option>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="space-y-3">
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
                    </div>

                    {/* 5. Assignee 1 & 6. Assignee 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <User size={16} className="text-indigo-500" /> Assignee 1
                            </label>
                            <Combobox
                                options={hubstaffUsers}
                                value={formData.assignedTo || ''}
                                onChange={(val) => handleAssigneeChange('assignedTo', val)}
                                placeholder="Select or type name..."
                                searchPlaceholder="Search developers..."
                                emptyMessage="No users found."
                                allowCustomValue={true}
                                isLoading={loadingHubstaffUsers}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <User size={16} className="text-indigo-500" /> Assignee 2
                            </label>
                            <Combobox
                                options={hubstaffUsers}
                                value={formData.assignedTo2 || ''}
                                onChange={(val) => handleAssigneeChange('assignedTo2', val)}
                                placeholder="Select or type name..."
                                searchPlaceholder="Search developers..."
                                emptyMessage="No users found."
                                allowCustomValue={true}
                                isLoading={loadingHubstaffUsers}
                            />
                        </div>
                    </div>

                    {/* 7. Status */}
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

                    {/* 8. Start Date & 9. End Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Calendar size={16} className="text-indigo-500" /> Start Date
                            </label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Calendar size={16} className="text-indigo-500" /> End Date
                            </label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                            />
                        </div>
                    </div>

                    {/* 10. Actual Completion Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Calendar size={16} className="text-emerald-500" /> Actual Completion Date
                                {formData.status === 'Completed' && <span className="text-xs text-emerald-600">(Auto-filled)</span>}
                            </label>
                            <input
                                type="date"
                                name="actualCompletionDate"
                                value={formData.actualCompletionDate || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-700"
                            />
                        </div>
                    </div>

                    {/* 11. Comments & 12. Current Updates */}
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Comments</label>
                            <textarea
                                name="comments"
                                value={formData.comments || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700 min-h-[100px]"
                                placeholder="General comments about the task..."
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Current Updates</label>
                            <textarea
                                name="currentUpdates"
                                value={formData.currentUpdates || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700 min-h-[100px]"
                                placeholder="Current status updates..."
                            />
                        </div>
                    </div>

                    {/* Bug Fields - QA Team Only */}
                    {isQATeam && (
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
                    )}

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
