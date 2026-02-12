'use client';

import { useState, useEffect } from 'react';
import { X, Save, Calendar, User, Briefcase, Activity, Layers, Plus } from 'lucide-react';
import { Task } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import Combobox from './ui/Combobox';
import { getHubstaffNameFromQA } from '@/lib/hubstaff-name-mapping';
import { useGuestMode } from '@/contexts/GuestContext';
import { useToast } from '@/contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: Task | null;
    onSave: (task: Partial<Task>) => Promise<void>;
    onDelete?: (taskId: number) => Promise<void>;
}

export default function TaskModal({ isOpen, onClose, task, onSave, onDelete }: TaskModalProps) {
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<{ id: string | number; label: string }[]>([]);
    const [isFetchingProjects, setIsFetchingProjects] = useState(false);
    const [hubstaffUsers, setHubstaffUsers] = useState<{ id: string; label: string }[]>([]);
    const [loadingHubstaffUsers, setLoadingHubstaffUsers] = useState(false);
    const [isQATeam, setIsQATeam] = useState(false);
    const [subPhases, setSubPhases] = useState<{ id: string; label: string }[]>([]);
    const [loadingSubPhases, setLoadingSubPhases] = useState(false);
    const [globalPCs, setGlobalPCs] = useState<{ id: string; label: string }[]>([]);
    const [loadingPCs, setLoadingPCs] = useState(false);

    const { isGuest, selectedTeamId } = useGuestMode();
    const [userTeamId, setUserTeamId] = useState<string | null>(null);
    const { error: toastError } = useToast();

    // Confirmation Modal State
    const [showEndDateWarning, setShowEndDateWarning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initial state ...
    const initialState: Partial<Task> = {
        status: 'Yet to Start',
        includeSaturday: false,
        includeSunday: false
    };

    const [formData, setFormData] = useState<Partial<Task>>(initialState);

    // Fetch Team ID on mount
    useEffect(() => {
        const fetchTeam = async () => {
            const { getCurrentUserTeam } = await import('@/utils/userUtils');
            const team = await getCurrentUserTeam();
            if (team) setUserTeamId(team.team_id);
        };
        fetchTeam();
    }, []);

    const effectiveTeamId = isGuest ? selectedTeamId : userTeamId;

    // Fetch projects on mount or when team changes
    useEffect(() => {
        const fetchProjects = async () => {
            if (!effectiveTeamId) return;

            setIsFetchingProjects(true);
            try {
                // Fetch from Supabase instead of Hubstaff API
                let query = supabase
                    .from('projects')
                    .select('name')
                    .eq('status', 'active');

                // If NOT QA Team (Global), filter by team
                // QA Team ID: ba60298b-8635-4cca-bcd5-7e470fad60e6
                if (effectiveTeamId !== 'ba60298b-8635-4cca-bcd5-7e470fad60e6') {
                    query = query.eq('team_id', effectiveTeamId);
                }

                const { data, error } = await query.order('name', { ascending: true });

                if (!error && data && data.length > 0) {
                    setProjects(data.map((p: any) => ({
                        id: p.name,
                        label: p.name
                    })));
                } else {
                    console.warn('[TaskModal] No team projects found, fetching ALL active projects as fallback.');
                    // Fallback: Fetch ALL active projects
                    const { data: allProjects } = await supabase
                        .from('projects')
                        .select('name')
                        .eq('status', 'active')
                        .order('name', { ascending: true });

                    if (allProjects) {
                        setProjects(allProjects.map((p: any) => ({
                            id: p.name,
                            label: p.name
                        })));
                    }
                }
            } catch (error) {
                console.error('[TaskModal] Error fetching projects:', error);
            } finally {
                setIsFetchingProjects(false);
            }
        };

        if (isOpen) {
            fetchProjects();
        }
    }, [isOpen, effectiveTeamId]);

    // Fetch Hubstaff users OR Team Members on open
    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingHubstaffUsers(true);
            try {
                // Helper function to fetch from API
                const fetchFromAPI = async () => {
                    console.log('[TaskModal] Fetching Hubstaff Users via API (Fallback/Global)...');
                    const response = await fetch('/api/hubstaff/users');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.members) {
                            return data.members.map((u: any) => ({
                                id: u.name,
                                name: u.name
                            }));
                        }
                    }
                    return [];
                };

                const { getCurrentUserTeam } = await import('@/utils/userUtils');
                const userTeam = await getCurrentUserTeam();
                const isSuperAdmin = userTeam?.role === 'super_admin';
                const isQATeamGlobal = effectiveTeamId === 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

                // 1. Try fetching from Team Members DB first (unless Global/SuperAdmin)
                let users: any[] = [];

                if (!isSuperAdmin && !isGuest && !isQATeamGlobal && effectiveTeamId) {
                    const { data, error } = await supabase
                        .from('team_members')
                        .select('name')
                        .eq('team_id', effectiveTeamId)
                        .order('name');

                    if (data && data.length > 0) {
                        users = data;
                    }
                }

                // 2. Fallback or Global Logic
                if (users.length === 0) {
                    // If no DB members or we are Global/SuperAdmin, use API
                    users = await fetchFromAPI();
                }

                const formattedUsers = users.map((u: any) => ({
                    id: u.name,
                    label: u.name
                }));
                setHubstaffUsers(formattedUsers);

            } catch (error) {
                console.error('[TaskModal] Error fetching users:', error);
            } finally {
                setLoadingHubstaffUsers(false);
            }
        };

        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen, effectiveTeamId, isGuest]);

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

    // Fetch sub-phases for team
    useEffect(() => {
        const fetchSubPhases = async () => {
            if (!effectiveTeamId) return;

            setLoadingSubPhases(true);
            try {
                const response = await fetch(`/api/subphases?team_id=${effectiveTeamId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.subphases) {
                        const formattedPhases = data.subphases.map((sp: any) => ({
                            id: sp.name,
                            label: sp.name
                        }));
                        setSubPhases(formattedPhases);
                    }
                } else {
                    console.error('[TaskModal] Failed to fetch sub-phases');
                }
            } catch (error) {
                console.error('[TaskModal] Error fetching sub-phases:', error);
            } finally {
                setLoadingSubPhases(false);
            }
        };

        if (isOpen) {
            fetchSubPhases();
        }
    }, [isOpen, effectiveTeamId]);

    // Fetch global PCs with timeout protection
    useEffect(() => {
        const fetchGlobalPCs = async () => {
            setLoadingPCs(true);
            try {
                // Add timeout to prevent hanging requests
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

                const response = await fetch('/api/pcs', {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (data.pcs) {
                        const formattedPCs = data.pcs.map((pc: any) => ({
                            id: pc.name,
                            label: pc.name
                        }));
                        setGlobalPCs(formattedPCs);
                    }
                } else {
                    console.error('[TaskModal] Failed to fetch PCs');
                    setGlobalPCs([]); // Set empty array on error
                }
            } catch (error: any) {
                if (error.name === 'AbortError') {
                    console.error('[TaskModal] PC fetch timeout');
                } else {
                    console.error('[TaskModal] Error fetching PCs:', error);
                }
                setGlobalPCs([]); // Set empty array on error
            } finally {
                setLoadingPCs(false);
            }
        };

        if (isOpen) {
            fetchGlobalPCs();
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
                additionalAssignees: task.additionalAssignees || [],
                bugCount: task.bugCount,
                htmlBugs: task.htmlBugs,
                functionalBugs: task.functionalBugs,
                deviationReason: task.deviationReason,
                comments: task.comments,
                currentUpdates: task.currentUpdates,

                sprintLink: task.sprintLink,
                daysAllotted: task.daysAllotted || 0,
                timeTaken: task.timeTaken || '00:00:00',
                daysTaken: task.daysTaken || 0,
                deviation: task.deviation || 0,
                activityPercentage: task.activityPercentage || 0,
                includeSaturday: task.includeSaturday || false,
                includeSunday: task.includeSunday || false
            });

            // Initialize dynamic assignees list
            const initialAssignees = [
                task.assignedTo,
                task.assignedTo2,
                ...(task.additionalAssignees || [])
            ]
                .filter(Boolean)
                .map(shortName => getHubstaffNameFromQA(shortName!) || shortName) as string[];

            if (initialAssignees.length === 0) setAssignees([null]);
            else setAssignees(initialAssignees);

        } else if (isOpen && !task) {
            setFormData(initialState);
            setAssignees([null]); // Start with one empty slot
        }
    }, [isOpen, task]);

    const [assignees, setAssignees] = useState<(string | null)[]>([]);

    const handleDynamicAssigneeChange = (index: number, value: string | number | null) => {
        const newAssignees = [...assignees];
        newAssignees[index] = value ? String(value) : null;
        setAssignees(newAssignees);
    };

    const addAssignee = () => {
        setAssignees([...assignees, null]);
    };

    const removeAssignee = (index: number) => {
        const newAssignees = assignees.filter((_, i) => i !== index);
        setAssignees(newAssignees.length ? newAssignees : [null]);
    };

    // ... existing handlers


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: ['bugCount', 'htmlBugs', 'functionalBugs', 'activityPercentage'].includes(name)
                    ? parseInt(value) || 0
                    : ['daysAllotted'].includes(name)
                        ? parseFloat(value) || 0
                        : ['daysAllotted'].includes(name)
                            ? parseFloat(value) || 0
                            : value,
            };

            if (e.target.type === 'checkbox') {
                const { checked } = e.target as HTMLInputElement;
                newData[name as keyof Task] = checked as any;
            }

            // Auto-calculation logic for Time/Days/Deviation
            if (name === 'timeTaken' || name === 'daysAllotted') {
                const timeStr = name === 'timeTaken' ? value : (newData.timeTaken || '00:00:00');
                const daysAllottedStr = name === 'daysAllotted' ? value : (newData.daysAllotted || 0);

                // Parse time string "HH:MM:SS"
                const [hours, minutes, seconds] = (timeStr as string).split(':').map(Number);
                const totalHours = (hours || 0) + (minutes || 0) / 60 + (seconds || 0) / 3600;

                // Calculate Days Taken (8 hours per day)
                const daysTakenVal = parseFloat((totalHours / 8).toFixed(2));

                // Calculate Deviation
                const deviationVal = parseFloat((daysTakenVal - Number(daysAllottedStr)).toFixed(2));

                newData.daysTaken = daysTakenVal;
                newData.deviation = deviationVal;
            }

            // Auto-fill actualCompletionDate when status changes to "Completed"
            if (name === 'status' && value === 'Completed' && !prev.actualCompletionDate) {
                const today = new Date().toISOString().split('T')[0];
                newData.actualCompletionDate = today;

                // If completed before end date, update end date to match completion date
                if (prev.endDate && today < prev.endDate) {
                    newData.endDate = today;
                }
            }

            return newData;
        });
    };

    const executeSave = async () => {
        setLoading(true);
        try {
            // Use locally fetched teamId if not present in task
            let teamId = task?.teamId || effectiveTeamId;

            if (!teamId) {
                // Fallback try one last time
                const { getCurrentUserTeam } = await import('@/utils/userUtils');
                const userTeam = await getCurrentUserTeam();
                if (userTeam) teamId = userTeam.team_id;
            }

            if (!teamId) {
                toastError('Error: Could not determine your Team ID. Please refresh the page.');
                setLoading(false);
                setShowEndDateWarning(false);
                return;
            }

            // Map assignees array back to individual fields
            const validAssignees = assignees.filter((a): a is string => !!a);

            const finalData = {
                ...formData,
                assignedTo: validAssignees[0] || null,
                assignedTo2: validAssignees[1] || null,
                additionalAssignees: validAssignees.slice(2),
                includeSaturday: formData.includeSaturday || false,
                includeSunday: formData.includeSunday || false,
                teamId
            };

            await onSave(finalData);
            if (!task) {
                setFormData(initialState);
                setAssignees([null]);
            }
            setShowEndDateWarning(false);
        } catch (error) {
            console.error('Error saving task:', error);
            toastError('Failed to save task. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Warn if Start Date is present but End Date is missing
        if (formData.startDate && !formData.endDate) {
            setShowEndDateWarning(true);
            return;
        }

        await executeSave();
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            {/* End Date Warning Modal */}
            <ConfirmationModal
                isOpen={showEndDateWarning}
                onClose={() => setShowEndDateWarning(false)}
                onConfirm={executeSave}
                title="End date missing"
                message="End date is not selected. If you continue without selecting an end date, this task won't appear on the Schedule page, but can be found on the Project Overview and Dashboard pages."
                confirmText="Continue Anyway"
                cancelText="Go Back"
                type="warning"
                isLoading={loading}
            />

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
                            <Combobox
                                options={[
                                    { id: 'Low', label: 'Low' },
                                    { id: 'Medium', label: 'Medium' },
                                    { id: 'High', label: 'High' },
                                    { id: 'Urgent', label: 'Urgent' }
                                ]}
                                value={formData.priority || ''}
                                onChange={(val) => setFormData(prev => ({ ...prev, priority: val ? String(val) : null }))}
                                placeholder="Select or type priority..."
                                searchPlaceholder="Search or type custom priority..."
                                emptyMessage="No matching priority. Press Enter to use custom value."
                                allowCustomValue={true}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <User size={16} className="text-indigo-500" /> Project Coordinator (PC)
                            </label>
                            <Combobox
                                options={globalPCs}
                                value={formData.pc || ''}
                                onChange={(val) => setFormData(prev => ({ ...prev, pc: val ? String(val) : '' }))}
                                placeholder={loadingPCs ? "Loading PCs..." : "Select or type PC..."}
                                searchPlaceholder="Search or type PC name..."
                                emptyMessage="No matching PC. Press Enter to use custom value."
                                allowCustomValue={true}
                                isLoading={loadingPCs}
                            />
                        </div>
                    </div>

                    {/* 4.5. Phase/Task */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Layers size={16} className="text-indigo-500" /> Phase/Task
                        </label>
                        <Combobox
                            options={subPhases}
                            value={formData.subPhase || ''}
                            onChange={(val) => setFormData(prev => ({ ...prev, subPhase: val ? String(val) : '' }))}
                            placeholder={loadingSubPhases ? "Loading phases..." : "Select or type phase..."}
                            searchPlaceholder="Search or type custom phase..."
                            emptyMessage="No matching phase. Press Enter to use custom value."
                            allowCustomValue={true}
                            isLoading={loadingSubPhases}
                        />
                    </div>

                    {/* Dynamic Assignees */}
                    <div className="space-y-4">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <User size={16} className="text-indigo-500" /> Assignees
                        </label>
                        <div className="space-y-3">
                            {assignees.map((assignee, index) => (
                                <div key={index} className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex-1">
                                        <Combobox
                                            options={hubstaffUsers}
                                            value={assignee || ''}
                                            onChange={(val) => handleDynamicAssigneeChange(index, val)}
                                            placeholder={`Assignee ${index + 1}...`}
                                            searchPlaceholder="Search developers..."
                                            emptyMessage="No users found."
                                            allowCustomValue={true}
                                            isLoading={loadingHubstaffUsers}
                                        />
                                    </div>
                                    {assignees.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeAssignee(index)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Assignee"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addAssignee}
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-2 px-2 py-1 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                            <Plus size={16} /> Add Assignee
                        </button>
                    </div>

                    {/* 7. Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Status</label>
                            <select
                                name="status"
                                value={formData.status || 'Yet to Start'}
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

                    {/* Weekend Schedule & Actual Completion Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 block">Weekend Schedule</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors flex-1 justify-center">
                                    <input
                                        type="checkbox"
                                        name="includeSaturday"
                                        checked={formData.includeSaturday || false}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Work Saturday</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors flex-1 justify-center">
                                    <input
                                        type="checkbox"
                                        name="includeSunday"
                                        checked={formData.includeSunday || false}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Work Sunday</span>
                                </label>
                            </div>
                        </div>

                        {formData.status !== 'Rejected' && (
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
                        )}
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

                    {/* 13. Deviation Reason & 14. Sprint Link */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Deviation Reason</label>
                            <textarea
                                name="deviationReason"
                                // task.deviationReason hidden for image as requested
                                value={formData.deviationReason || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700 min-h-[100px]"
                                placeholder="Reason for any deviations..."
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700">Sprint Link</label>
                            <input
                                type="text"
                                name="sprintLink"
                                value={formData.sprintLink || ''}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
                                placeholder="Sprint or task tracking link..."
                            />
                        </div>
                    </div>

                    {/* EDIT MODE ONLY FIELDS: Days Allotted, Time Taken, etc. */}
                    {task && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100">
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700">Days Allotted</label>
                                <input
                                    type="number"
                                    name="daysAllotted"
                                    step="0.01"
                                    min="0"
                                    value={formData.daysAllotted || 0}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-slate-700 font-medium"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700">Time Taken (HH:MM:SS)</label>
                                <input
                                    type="text"
                                    name="timeTaken"
                                    value={formData.timeTaken || '00:00:00'}
                                    onChange={handleChange}
                                    placeholder="00:00:00"
                                    pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-slate-700 font-medium"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700">Days Taken (Auto)</label>
                                <input
                                    type="number"
                                    name="daysTaken"
                                    readOnly
                                    value={formData.daysTaken || 0}
                                    className="w-full px-5 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none font-mono text-slate-600 font-medium cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700">Deviation (Auto)</label>
                                <input
                                    type="number"
                                    name="deviation"
                                    readOnly
                                    value={formData.deviation || 0}
                                    className={`w-full px-5 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none font-mono font-medium cursor-not-allowed ${(formData.deviation || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                                        }`}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700">Activity %</label>
                                <input
                                    type="number"
                                    name="activityPercentage"
                                    min="0"
                                    max="100"
                                    value={formData.activityPercentage || 0}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-slate-700 font-medium"
                                />
                            </div>
                        </div>
                    )}

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
                        {task && onDelete && (
                            <button
                                type="button"
                                onClick={async () => {
                                    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
                                        setLoading(true);
                                        await onDelete(task.id);
                                        setLoading(false);
                                    }
                                }}
                                className="px-6 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors text-sm"
                            >
                                Delete
                            </button>
                        )}
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
