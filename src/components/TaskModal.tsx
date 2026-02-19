'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Save, Calendar, User, Briefcase, Activity, Layers, Plus, CheckCircle2 } from 'lucide-react';
import { Task, isValidProjectDate } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Combobox from './ui/Combobox';
import Checkbox from './ui/Checkbox';
import { getHubstaffNameFromQA } from '@/lib/hubstaff-name-mapping';
import { useGuestMode } from '@/contexts/GuestContext';
import { useToast } from '@/contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';
import { format } from 'date-fns';
import { DatePicker } from './DatePicker';
import { Button } from './ui/button';
import Loader from './ui/Loader';
import CloseButton from './ui/CloseButton';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: Task | null;
    onSave: (task: Partial<Task> | Partial<Task>[]) => Promise<void>;
    onDelete?: (taskId: number) => Promise<void>;
}

type AssigneeData = {
    name: string | null;
    startDate: string | null;
    endDate: string | null;
};

const initialState: Partial<Task> = {
    status: 'Yet to Start',
    includeSaturday: false,
    includeSunday: false,
    startDate: null,
    endDate: null,
    actualCompletionDate: null,
};

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
    const [showEndDateWarning, setShowEndDateWarning] = useState(false);
    const [formData, setFormData] = useState<Partial<Task>>(initialState);
    const [assignees, setAssignees] = useState<AssigneeData[]>([{ name: null, startDate: null, endDate: null }]);

    // Fetch Team ID
    useEffect(() => {
        const fetchTeam = async () => {
            const { getCurrentUserTeam } = await import('@/utils/userUtils');
            const team = await getCurrentUserTeam();
            if (team) setUserTeamId(team.team_id);
        };
        fetchTeam();
    }, []);

    const effectiveTeamId = isGuest ? selectedTeamId : userTeamId;

    // Fetch Projects
    useEffect(() => {
        const fetchProjects = async () => {
            setIsFetchingProjects(true);
            try {
                let url = '/api/projects';
                if (effectiveTeamId) {
                    url += `?team_id=${effectiveTeamId}`;
                }
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.projects) {
                        setProjects(data.projects.map((p: any) => ({ id: p.id, label: p.name })));
                    }
                }
            } catch (error) {
                console.error('[TaskModal] Error fetching projects:', error);
            } finally {
                setIsFetchingProjects(false);
            }
        };
        if (isOpen) fetchProjects();
    }, [isOpen, effectiveTeamId]);

    // Fetch Users
    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingHubstaffUsers(true);
            try {
                const response = await fetch('/api/hubstaff/users');
                if (response.ok) {
                    const data = await response.json();
                    const members = data.members?.map((u: any) => ({ id: u.name, label: u.name })) || [];
                    setHubstaffUsers(members);
                }
            } catch (error) {
                console.error('[TaskModal] Error fetching users:', error);
            } finally {
                setLoadingHubstaffUsers(false);
            }
        };
        if (isOpen) fetchUsers();
    }, [isOpen]);

    // Fetch PCs
    useEffect(() => {
        const fetchPCs = async () => {
            setLoadingPCs(true);
            try {
                const response = await fetch('/api/pcs');
                if (response.ok) {
                    const data = await response.json();
                    if (data.pcs) {
                        setGlobalPCs(data.pcs.map((pc: any) => ({ id: pc.name, label: pc.name })));
                    }
                }
            } catch (error) {
                console.error('[TaskModal] Error fetching PCs:', error);
            } finally {
                setLoadingPCs(false);
            }
        };
        if (isOpen) fetchPCs();
    }, [isOpen]);

    // Fetch Subphases
    useEffect(() => {
        const fetchSubPhases = async () => {
            if (!effectiveTeamId) return;
            setLoadingSubPhases(true);
            try {
                const response = await fetch(`/api/subphases?team_id=${effectiveTeamId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.subphases) {
                        setSubPhases(data.subphases.map((sp: any) => ({ id: sp.name, label: sp.name })));
                    }
                }
            } catch (error) {
                console.error('[TaskModal] Error fetching sub-phases:', error);
            } finally {
                setLoadingSubPhases(false);
            }
        };
        if (isOpen) fetchSubPhases();
    }, [isOpen, effectiveTeamId]);

    // Check Role
    useEffect(() => {
        const checkRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
                setIsQATeam(profile?.role === 'super_admin');
            }
        };
        if (isOpen) checkRole();
    }, [isOpen]);

    // Initialize Form Data
    useEffect(() => {
        if (isOpen && task) {
            setFormData({
                projectName: task.projectName,
                projectType: task.projectType,
                subPhase: task.subPhase,
                priority: task.priority,
                pc: task.pc,
                status: task.status,
                startDate: isValidProjectDate(task.startDate) ? new Date(task.startDate).toISOString().split('T')[0] : null,
                endDate: isValidProjectDate(task.endDate) ? new Date(task.endDate).toISOString().split('T')[0] : null,
                actualCompletionDate: isValidProjectDate(task.actualCompletionDate) ? new Date(task.actualCompletionDate).toISOString().split('T')[0] : null,
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
                includeSunday: task.includeSunday || false,
                teamId: task.teamId
            });

            const initialAssignees: AssigneeData[] = [
                { name: task.assignedTo, startDate: task.startDate || null, endDate: task.endDate || null },
                { name: task.assignedTo2, startDate: task.startDate || null, endDate: task.endDate || null },
                ...(task.additionalAssignees || []).map(a => ({ name: a, startDate: task.startDate || null, endDate: task.endDate || null }))
            ].filter(a => a.name).map(a => ({
                ...a,
                name: getHubstaffNameFromQA(a.name!) || a.name
            })) as AssigneeData[];

            if (initialAssignees.length === 0) setAssignees([{ name: null, startDate: null, endDate: null }]);
            else setAssignees(initialAssignees);

        } else if (isOpen && !task) {
            setFormData(initialState);
            setAssignees([{ name: null, startDate: null, endDate: null }]);
        }
    }, [isOpen, task]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (e.target.type === 'checkbox') {
                newData[name as keyof Task] = (e.target as HTMLInputElement).checked as any;
            }
            // Auto-calc logic
            if (name === 'timeTaken' || name === 'daysAllotted') {
                // ... calculations usually here, keeping simple for now or restoring full logic
                // Restore full logic:
                const timeStr = name === 'timeTaken' ? value : (newData.timeTaken || '00:00:00');
                const daysAllottedStr = name === 'daysAllotted' ? value : (newData.daysAllotted || 0);
                const [hours, minutes, seconds] = (timeStr as string).split(':').map(Number);
                const totalHours = (hours || 0) + (minutes || 0) / 60 + (seconds || 0) / 3600;
                const daysTakenVal = parseFloat((totalHours / 8).toFixed(2));
                const deviationVal = parseFloat((daysTakenVal - Number(daysAllottedStr)).toFixed(2));
                newData.daysTaken = daysTakenVal;
                newData.deviation = deviationVal;
            }
            if (name === 'status' && value === 'Completed' && !prev.actualCompletionDate) {
                const today = new Date().toISOString().split('T')[0];
                newData.actualCompletionDate = today;
                if (prev.endDate && today < prev.endDate) newData.endDate = today;
            }
            return newData;
        });
    };

    const handleDateChange = (field: 'startDate' | 'endDate' | 'actualCompletionDate', date?: Date) => {
        const dateStr = date && !isNaN(date.getTime()) ? format(date, 'yyyy-MM-dd') : null;
        setFormData(prev => ({ ...prev, [field]: dateStr }));
        if (field === 'startDate' || field === 'endDate') {
            setAssignees(prev => {
                const next = [...prev];
                if (next[0]) next[0] = { ...next[0], [field]: dateStr };
                return next;
            });
        }
    };

    const handleDynamicAssigneeChange = (index: number, field: keyof AssigneeData, value: string | null) => {
        const newAssignees = [...assignees];
        newAssignees[index] = { ...newAssignees[index], [field]: value };
        setAssignees(newAssignees);
        if (index === 0) {
            if (field === 'startDate') handleDateChange('startDate', value ? new Date(value) : undefined);
            if (field === 'endDate') handleDateChange('endDate', value ? new Date(value) : undefined);
        }
    };

    const addAssignee = () => {
        setAssignees([...assignees, { name: null, startDate: formData.startDate || null, endDate: formData.endDate || null }]);
    };

    const removeAssignee = (index: number) => {
        const newAssignees = assignees.filter((_, i) => i !== index);
        setAssignees(newAssignees.length ? newAssignees : [{ name: null, startDate: null, endDate: null }]);
    };

    const executeSave = async () => {
        setLoading(true);
        try {
            let teamId = task?.teamId || effectiveTeamId;
            if (!teamId) {
                const { getCurrentUserTeam } = await import('@/utils/userUtils');
                const userTeam = await getCurrentUserTeam();
                if (userTeam) teamId = userTeam.team_id;
            }
            if (!teamId) {
                toastError('Error: Could not determine Team ID.');
                setLoading(false);
                setShowEndDateWarning(false);
                return;
            }

            const validAssignees = assignees.filter(a => !!a.name);
            if (validAssignees.length === 0) {
                validAssignees.push({ name: null, startDate: formData.startDate || null, endDate: formData.endDate || null });
            }

            const sharedData = {
                ...formData,
                includeSaturday: formData.includeSaturday || false,
                includeSunday: formData.includeSunday || false,
                teamId
            };

            const payloads: any[] = [];
            if (task) {
                const first = validAssignees[0];
                const mainTaskPayload = {
                    ...sharedData,
                    assignedTo: first?.name || null,
                    assignedTo2: null,
                    additionalAssignees: [],
                    startDate: first?.startDate || sharedData.startDate,
                    endDate: first?.endDate || sharedData.endDate,
                };
                payloads.push(mainTaskPayload);
                for (let i = 1; i < validAssignees.length; i++) {
                    const assignee = validAssignees[i];
                    payloads.push({
                        ...sharedData,
                        id: undefined,
                        assignedTo: assignee.name,
                        assignedTo2: null,
                        additionalAssignees: [],
                        startDate: assignee.startDate || sharedData.startDate,
                        endDate: assignee.endDate || sharedData.endDate,
                    });
                }
            } else {
                validAssignees.forEach(assignee => {
                    payloads.push({
                        ...sharedData,
                        assignedTo: assignee.name,
                        assignedTo2: null,
                        additionalAssignees: [],
                        startDate: assignee.startDate || sharedData.startDate,
                        endDate: assignee.endDate || sharedData.endDate,
                    });
                });
            }

            await onSave(payloads as any);

            const isUpdate = !!task;
            toast.custom((t) => (
                <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l-4 border-emerald-500 rounded-lg shadow-lg p-4 flex items-start gap-4 animate-in slide-in-from-right-5 duration-300">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full flex-shrink-0">
                        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                            {isUpdate ? 'Task Updated Successfully' : (payloads.length > 1 ? `${payloads.length} Tasks Created` : 'Task Created Successfully')}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{formData.projectName}</p>
                    </div>
                    <button onClick={() => toast.dismiss(t)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>
            ), { duration: 4000 });

            if (!task) {
                setFormData(initialState);
                setAssignees([{ name: null, startDate: null, endDate: null }]);
            }
            setShowEndDateWarning(false);
        } catch (error) {
            console.error('Error saving task:', error);
            toastError('Failed to save task.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.startDate && !formData.endDate && !showEndDateWarning) {
            setShowEndDateWarning(true);
            return;
        }
        await executeSave();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <ConfirmationModal
                isOpen={showEndDateWarning}
                onClose={() => setShowEndDateWarning(false)}
                onConfirm={executeSave}
                title="End date missing"
                message="End date is not selected. Task won't appear on Schedule."
                confirmText="Continue Anyway"
                cancelText="Go Back"
                type="warning"
                isLoading={loading}
            />

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85dvh] overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10 flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${task ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'} shadow-sm`}>
                            {task ? <Activity size={24} /> : <Briefcase size={24} />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{task ? 'Edit Task' : 'New Project Task'}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{task ? 'Update task details' : 'Kickoff a new project'}</p>
                        </div>
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                <form onSubmit={handleSubmit} className="p-4 pb-10 md:p-6 space-y-8">
                    {/* Project & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Briefcase size={16} className="text-indigo-500" /> <span>Project Name</span> <span className="text-red-500">*</span>
                            </label>
                            <Combobox
                                options={projects}
                                value={projects.find(p => p.label === formData.projectName)?.id || formData.projectName}
                                onChange={(val) => {
                                    const selected = projects.find(p => p.id == val);
                                    setFormData(prev => ({ ...prev, projectName: selected ? selected.label : (val ? String(val) : null!) }));
                                }}
                                placeholder={isFetchingProjects ? "Loading..." : "Select Project..."}
                                searchPlaceholder="Search projects..."
                                allowCustomValue={true}
                                isLoading={isFetchingProjects}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Activity size={16} className="text-indigo-500" /> Project Type
                            </label>
                            <input type="text" name="projectType" value={formData.projectType || ''} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 rounded-xl outline-none" placeholder="e.g. Web Development" />
                        </div>
                    </div>

                    {/* Priority & PC */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Priority</label>
                            <Combobox
                                options={[{ id: 'Low', label: 'Low' }, { id: 'Medium', label: 'Medium' }, { id: 'High', label: 'High' }, { id: 'Urgent', label: 'Urgent' }]}
                                value={formData.priority || ''}
                                onChange={(val) => setFormData(prev => ({ ...prev, priority: val ? String(val) : null }))}
                                placeholder="Select priority..."
                                allowCustomValue={true}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><User size={16} className="text-indigo-500" /> PC</label>
                            <Combobox options={globalPCs} value={formData.pc || ''} onChange={(val) => setFormData(prev => ({ ...prev, pc: val ? String(val) : '' }))} placeholder="Select PC..." allowCustomValue={true} isLoading={loadingPCs} />
                        </div>
                    </div>

                    {/* Phase */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Layers size={16} className="text-indigo-500" /> Phase/Task</label>
                        <Combobox options={subPhases} value={formData.subPhase || ''} onChange={(val) => setFormData(prev => ({ ...prev, subPhase: val ? String(val) : '' }))} placeholder="Select phase..." allowCustomValue={true} isLoading={loadingSubPhases} />
                    </div>

                    {/* Dynamic Assignees */}
                    <div className="space-y-4">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <User size={16} className="text-indigo-500" /> <span>Assignees</span>
                        </label>
                        <div className="space-y-3">
                            {assignees.map((assignee, index) => (
                                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex-1 w-full sm:w-auto">
                                        <Combobox
                                            options={hubstaffUsers}
                                            value={assignee.name || ''}
                                            onChange={(val) => handleDynamicAssigneeChange(index, 'name', val ? String(val) : null)}
                                            placeholder={`Assignee ${index + 1}...`}
                                            searchPlaceholder="Search developers..."
                                            allowCustomValue={true}
                                            isLoading={loadingHubstaffUsers}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <DatePicker
                                            date={assignee.startDate ? new Date(assignee.startDate) : undefined}
                                            setDate={(date) => {
                                                const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
                                                handleDynamicAssigneeChange(index, 'startDate', dateStr);
                                            }}
                                            placeholder="Start"
                                            className="w-full sm:w-[130px]"
                                        />
                                        <span className="text-slate-400">to</span>
                                        <DatePicker
                                            date={assignee.endDate ? new Date(assignee.endDate) : undefined}
                                            setDate={(date) => {
                                                const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
                                                handleDynamicAssigneeChange(index, 'endDate', dateStr);
                                            }}
                                            placeholder="End"
                                            className="w-full sm:w-[130px]"
                                        />
                                    </div>
                                    {assignees.length > 1 && (
                                        <button type="button" onClick={() => removeAssignee(index)} className="p-2 text-slate-400 hover:text-red-500">
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addAssignee} className="text-sm font-semibold text-indigo-600 flex items-center gap-2 px-2 py-1 hover:bg-indigo-50 rounded-lg">
                            <Plus size={16} /> <span>Add Assignee</span>
                        </button>
                    </div>

                    {/* Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                            <Combobox
                                options={['Yet to Start', 'Being Developed', 'Ready for QA', 'Assigned to QA', 'In Progress', 'On Hold', 'Completed', 'Forecast', 'Rejected'].map(s => ({ id: s, label: s }))}
                                value={formData.status || ''}
                                onChange={(val) => setFormData(prev => ({ ...prev, status: val ? String(val) : undefined }))}
                                placeholder="Select status..."
                            />
                        </div>
                        {formData.status === 'Rejected' && (
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reason</label>
                                <textarea name="deviationReason" value={formData.deviationReason || ''} onChange={handleChange} className="w-full px-5 py-3 bg-red-50 border border-red-200 rounded-xl outline-none" />
                            </div>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300"><Calendar size={16} className="inline mr-2 text-indigo-500" /> Start Date</label>
                            <DatePicker date={formData.startDate ? new Date(formData.startDate) : undefined} setDate={(d) => handleDateChange('startDate', d)} placeholder="Start Date" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300"><Calendar size={16} className="inline mr-2 text-indigo-500" /> End Date</label>
                            <DatePicker date={formData.endDate ? new Date(formData.endDate) : undefined} setDate={(d) => handleDateChange('endDate', d)} placeholder="End Date" />
                        </div>
                    </div>

                    {/* Weekend & Actual Completion */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Weekend Schedule</label>
                            <div className="flex gap-4">
                                <Checkbox checked={formData.includeSaturday || false} onChange={c => setFormData(prev => ({ ...prev, includeSaturday: c }))} label="Sat" />
                                <Checkbox checked={formData.includeSunday || false} onChange={c => setFormData(prev => ({ ...prev, includeSunday: c }))} label="Sun" />
                            </div>
                        </div>
                        {formData.status !== 'Rejected' && (
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Actual Completion</label>
                                <DatePicker date={formData.actualCompletionDate ? new Date(formData.actualCompletionDate) : undefined} setDate={(d) => handleDateChange('actualCompletionDate', d)} placeholder="Completion Date" />
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Comments</label>
                        <textarea name="comments" value={formData.comments || ''} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 rounded-xl outline-none min-h-[100px]" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Updates</label>
                        <textarea name="currentUpdates" value={formData.currentUpdates || ''} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 rounded-xl outline-none min-h-[100px]" />
                    </div>

                    {/* Deviation & Sprint */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Deviation Reason</label>
                            <textarea name="deviationReason" value={formData.deviationReason || ''} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sprint Link</label>
                            <input type="text" name="sprintLink" value={formData.sprintLink || ''} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 rounded-xl outline-none" />
                        </div>
                    </div>

                    {/* Edit Mode Fields */}
                    {task && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Days Allotted</label>
                                <input type="number" name="daysAllotted" step="0.01" value={formData.daysAllotted || 0} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 rounded-xl outline-none" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Time Taken</label>
                                <input type="text" name="timeTaken" value={formData.timeTaken || '00:00:00'} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 rounded-xl outline-none" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activity %</label>
                                <input type="number" name="activityPercentage" min="0" max="100" value={formData.activityPercentage || 0} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 rounded-xl outline-none" />
                            </div>
                        </div>
                    )}

                    {/* QA Fields */}
                    {isQATeam && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-3"> <label className="text-sm">Total Bugs</label> <input type="number" name="bugCount" value={formData.bugCount || 0} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border-slate-200 rounded-xl outline-none" /> </div>
                            <div className="space-y-3"> <label className="text-sm">HTML Bugs</label> <input type="number" name="htmlBugs" value={formData.htmlBugs || 0} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border-slate-200 rounded-xl outline-none" /> </div>
                            <div className="space-y-3"> <label className="text-sm">Func. Bugs</label> <input type="number" name="functionalBugs" value={formData.functionalBugs || 0} onChange={handleChange} className="w-full px-5 py-3 bg-slate-50 border-slate-200 rounded-xl outline-none" /> </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-8">
                        <button type="button" onClick={onClose} className="btn btn-secondary px-6 py-3 rounded-xl text-sm h-auto">Cancel</button>
                        {task && onDelete && (
                            <Button type="button" variant="destructive" onClick={async () => { if (confirm('Delete?')) { setLoading(true); await onDelete(task.id); setLoading(false); } }} className="btn btn-danger px-6 py-3 rounded-xl shadow-none h-auto">Delete</Button>
                        )}
                        <button type="submit" disabled={loading} className="btn btn-primary px-8 py-3 w-auto h-auto rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 text-sm active:scale-95 duration-200">
                            <span className="flex items-center justify-center gap-2"> <Save size={18} /> <span>{loading ? 'Saving...' : 'Save Task'}</span> </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
