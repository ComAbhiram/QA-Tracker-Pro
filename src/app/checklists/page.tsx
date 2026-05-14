'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    CheckSquare, Plus, Trash2, Search, ChevronDown, ChevronUp,
    Save, RefreshCw, ClipboardList, FolderOpen, Check, X
} from 'lucide-react';
import Loader from '@/components/ui/Loader';

interface Checklist {
    id: string;
    title: string;
    created_at: string;
}

interface Project {
    id: number;
    name: string;
}

interface Assignment {
    id: string;
    project_name: string;
    checklist_id: string;
    checklist?: { id: string; title: string };
}

export default function ChecklistsPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingRole, setCheckingRole] = useState(true);

    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [loadingChecklists, setLoadingChecklists] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [creating, setCreating] = useState(false);

    const [projects, setProjects] = useState<Project[]>([]);
    const [projectSearch, setProjectSearch] = useState('');
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const [projectAssignments, setProjectAssignments] = useState<Record<string, string[]>>({});
    const [savingProject, setSavingProject] = useState<string | null>(null);
    const [pendingSelections, setPendingSelections] = useState<Record<string, string[]>>({});

    // Check admin role
    useEffect(() => {
        const checkRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setCheckingRole(false); return; }
            const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
            setIsAdmin(data?.role === 'super_admin');
            setCheckingRole(false);
        };
        checkRole();
    }, []);

    const fetchChecklists = useCallback(async () => {
        setLoadingChecklists(true);
        try {
            const res = await fetch('/api/checklists');
            const data = await res.json();
            setChecklists(data.checklists || []);
        } finally {
            setLoadingChecklists(false);
        }
    }, []);

    const fetchProjects = useCallback(async () => {
        setLoadingProjects(true);
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            setProjects((data.projects || []).map((p: any) => ({ id: p.id, name: p.name })));
        } finally {
            setLoadingProjects(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetchChecklists();
            fetchProjects();
        }
    }, [isAdmin, fetchChecklists, fetchProjects]);

    const createChecklist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const res = await fetch('/api/checklists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle.trim() }),
            });
            if (res.ok) {
                setNewTitle('');
                await fetchChecklists();
            }
        } finally {
            setCreating(false);
        }
    };

    const deleteChecklist = async (id: string) => {
        if (!confirm('Delete this checklist? This will also remove all project assignments and status records.')) return;
        await fetch(`/api/checklists/${id}`, { method: 'DELETE' });
        await fetchChecklists();
    };

    const loadProjectAssignments = async (projectName: string) => {
        const res = await fetch(`/api/project-checklists?project_name=${encodeURIComponent(projectName)}`);
        const data = await res.json();
        const ids = (data.assignments || []).map((a: Assignment) => a.checklist_id);
        setProjectAssignments(prev => ({ ...prev, [projectName]: ids }));
        setPendingSelections(prev => ({ ...prev, [projectName]: ids }));
    };

    const toggleProject = async (projectName: string) => {
        if (expandedProject === projectName) {
            setExpandedProject(null);
        } else {
            setExpandedProject(projectName);
            await loadProjectAssignments(projectName);
        }
    };

    const toggleChecklistForProject = (projectName: string, checklistId: string) => {
        setPendingSelections(prev => {
            const current = prev[projectName] || [];
            const has = current.includes(checklistId);
            return {
                ...prev,
                [projectName]: has ? current.filter(id => id !== checklistId) : [...current, checklistId],
            };
        });
    };

    const saveAssignments = async (projectName: string) => {
        setSavingProject(projectName);
        try {
            await fetch('/api/project-checklists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: projectName,
                    checklist_ids: pendingSelections[projectName] || [],
                }),
            });
            setProjectAssignments(prev => ({
                ...prev,
                [projectName]: pendingSelections[projectName] || [],
            }));
        } finally {
            setSavingProject(null);
        }
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(projectSearch.toLowerCase())
    );

    if (checkingRole) {
        return <div className="flex items-center justify-center h-64"><Loader size="lg" /></div>;
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                    <X className="text-red-500" size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Access Restricted</h2>
                <p className="text-slate-500 dark:text-slate-400">This page is only accessible to Super Admins.</p>
            </div>
        );
    }

    return (
        <div className="w-full p-4 md:p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <ClipboardList className="text-indigo-500" size={32} />
                    Checklists
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Create checklist templates and assign them to projects.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* ── Panel 1: Manage Checklists ── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <CheckSquare className="text-indigo-500" size={20} />
                            Checklist Templates
                            <span className="ml-auto text-sm font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {checklists.length} items
                            </span>
                        </h2>

                        {/* Add Checklist Form */}
                        <form onSubmit={createChecklist} className="mt-4 flex gap-2">
                            <input
                                type="text"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="Enter checklist title..."
                                className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={creating || !newTitle.trim()}
                                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
                            >
                                {creating ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                                Add
                            </button>
                        </form>
                    </div>

                    {/* Checklist Items */}
                    <div className="flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
                        {loadingChecklists ? (
                            <div className="flex justify-center items-center py-16">
                                <Loader size="md" />
                            </div>
                        ) : checklists.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <CheckSquare size={40} className="mx-auto mb-3 opacity-30" />
                                <p>No checklists yet. Add one above.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                                {checklists.map(item => (
                                    <li key={item.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                                        <span className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                            <span className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
                                            {item.title}
                                        </span>
                                        <button
                                            onClick={() => deleteChecklist(item.id)}
                                            className="ml-4 p-1.5 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                            title="Delete"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* ── Panel 2: Assign to Projects ── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <FolderOpen className="text-emerald-500" size={20} />
                            Assign to Projects
                        </h2>

                        {/* Project Search */}
                        <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={projectSearch}
                                onChange={e => setProjectSearch(e.target.value)}
                                placeholder="Search projects..."
                                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-slate-100 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[500px] custom-scrollbar divide-y divide-slate-50 dark:divide-slate-800">
                        {loadingProjects ? (
                            <div className="flex justify-center items-center py-16">
                                <Loader size="md" />
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
                                <p>No projects found.</p>
                            </div>
                        ) : (
                            filteredProjects.map(project => {
                                const isExpanded = expandedProject === project.name;
                                const assignedIds = projectAssignments[project.name] || [];
                                const pending = pendingSelections[project.name] || [];
                                const hasChanges = JSON.stringify([...pending].sort()) !== JSON.stringify([...assignedIds].sort());

                                return (
                                    <div key={project.id}>
                                        <button
                                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
                                            onClick={() => toggleProject(project.name)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{project.name}</span>
                                                {assignedIds.length > 0 && (
                                                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                                                        {assignedIds.length} assigned
                                                    </span>
                                                )}
                                            </div>
                                            {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                        </button>

                                        {isExpanded && (
                                            <div className="px-6 pb-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                                                {checklists.length === 0 ? (
                                                    <p className="py-4 text-sm text-slate-400">No checklists available. Create some first.</p>
                                                ) : (
                                                    <>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 pt-4 pb-3 font-semibold uppercase tracking-wider">
                                                            Select checklists to assign:
                                                        </p>
                                                        <div className="space-y-2 mb-4">
                                                            {checklists.map(cl => {
                                                                const checked = pending.includes(cl.id);
                                                                return (
                                                                    <label
                                                                        key={cl.id}
                                                                        className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                                                    >
                                                                        <div
                                                                            className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked
                                                                                ? 'bg-indigo-600 border-indigo-600'
                                                                                : 'border-slate-300 dark:border-slate-600'}`}
                                                                            onClick={() => toggleChecklistForProject(project.name, cl.id)}
                                                                        >
                                                                            {checked && <Check size={12} className="text-white" strokeWidth={3} />}
                                                                        </div>
                                                                        <span className="text-sm text-slate-700 dark:text-slate-300">{cl.title}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                        <button
                                                            onClick={() => saveAssignments(project.name)}
                                                            disabled={savingProject === project.name || !hasChanges}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-sm"
                                                        >
                                                            {savingProject === project.name
                                                                ? <RefreshCw size={14} className="animate-spin" />
                                                                : <Save size={14} />}
                                                            {savingProject === project.name ? 'Saving...' : hasChanges ? 'Save Assignments' : 'Saved ✓'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
