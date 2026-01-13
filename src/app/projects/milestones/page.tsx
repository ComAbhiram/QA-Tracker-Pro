
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, mapTaskFromDB } from '@/lib/types';
import { Target, Search, CheckCircle2, Calendar, User, Layout, ChevronRight, Hash } from 'lucide-react';
import { format } from 'date-fns';

export default function Milestones() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [projectNames, setProjectNames] = useState<string[]>([]); // Distinct project names from tasks
    const [milestones, setMilestones] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProjectNames();
    }, []);

    useEffect(() => {
        if (selectedProject) {
            fetchProjectMilestones(selectedProject);
        } else {
            setMilestones([]);
        }
    }, [selectedProject]);

    // Fetch unique project names from actual tasks to ensure we show projects that have data
    const fetchProjectNames = async () => {
        const { data } = await supabase
            .from('tasks')
            .select('project_name')
            .not('project_name', 'is', null);

        if (data) {
            // Get unique names
            const names = Array.from(new Set(data.map((item: any) => item.project_name))).sort();
            setProjectNames(names);
        }
    };

    const fetchProjectMilestones = async (projectName: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_name', projectName)
                .order('end_date', { ascending: true }); // Timeline order

            if (!error && data) {
                // Filter for completed items or significant phases
                // The user asked for "detailed previous phases completed", so we focus on all but maybe emphasize completed
                setMilestones(data.map(mapTaskFromDB));
            }
        } finally {
            setLoading(false);
        }
    };

    // Filter projects for search dropdown
    const filteredProjects = projectNames.filter(name =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-sm">
                    <Target size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Project Milestones</h1>
                    <p className="text-slate-500 font-medium">Track project progress and completed phases</p>
                </div>
            </div>

            {/* Search Section */}
            <div className="relative max-w-2xl">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search for a project..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            // If user clears search, reset selection or just let them search again
                            if (e.target.value === '') setSelectedProject(null);
                        }}
                        onFocus={() => setSelectedProject(null)} // Open dropdown on focus
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-slate-700 font-medium transition-all"
                    />
                </div>

                {/* Dropdown Results */}
                {searchTerm && !selectedProject && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-50 custom-scrollbar animate-in fade-in slide-in-from-top-2">
                        {filteredProjects.length > 0 ? (
                            filteredProjects.map(name => (
                                <button
                                    key={name}
                                    onClick={() => {
                                        setSearchTerm(name);
                                        setSelectedProject(name);
                                    }}
                                    className="w-full text-left px-6 py-3 hover:bg-slate-50 text-slate-700 font-medium transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between group"
                                >
                                    {name}
                                    <ChevronRight className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" size={16} />
                                </button>
                            ))
                        ) : (
                            <div className="px-6 py-4 text-slate-500 text-sm italic text-center">
                                No projects found matching "{searchTerm}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Timeline View */}
            {selectedProject && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-8">
                        <h2 className="text-2xl font-bold text-slate-800">{selectedProject}</h2>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold uppercase rounded-full tracking-wider">
                            Timeline
                        </span>
                    </div>

                    {loading ? (
                        <div className="py-12 text-center text-slate-500">Loading timeline...</div>
                    ) : milestones.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
                            No milestones found for this project.
                        </div>
                    ) : (
                        <div className="relative pl-8 space-y-12 before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                            {milestones.map((task, index) => {
                                const isCompleted = task.status === 'Completed';
                                const isRejected = task.status === 'Rejected';

                                return (
                                    <div key={task.id} className="relative group">
                                        {/* Status Dot */}
                                        <div className={`absolute -left-[39px] top-6 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 
                                            ${isCompleted ? 'bg-emerald-500' : isRejected ? 'bg-red-500' : 'bg-white border-slate-200 ring-2 ring-slate-100'}`}>
                                            {isCompleted ? <CheckCircle2 size={16} className="text-white" /> :
                                                isRejected ? <div className="w-2 h-2 bg-white rounded-full" /> :
                                                    <div className={`w-2 h-2 rounded-full ${index === milestones.length - 1 ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />}
                                        </div>

                                        {/* Content Card */}
                                        <div className={`bg-white rounded-2xl border p-6 transition-all duration-200
                                            ${isCompleted ? 'border-emerald-100 shadow-sm hover:shadow-md' :
                                                isRejected ? 'border-red-100 opacity-75' :
                                                    'border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1'}`}>

                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-50 pb-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full 
                                                            ${isCompleted ? 'bg-emerald-50 text-emerald-600' :
                                                                isRejected ? 'bg-red-50 text-red-600' :
                                                                    'bg-blue-50 text-blue-600'}`}>
                                                            {task.status}
                                                        </span>
                                                        <span className="text-slate-400 text-sm font-medium">
                                                            {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : 'No Date'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-slate-800">{task.subPhase}</h3>
                                                </div>

                                                <div className="flex items-center gap-6 text-sm text-slate-500">
                                                    <div className="flex items-center gap-2">
                                                        <User size={16} className="text-slate-400" />
                                                        <span className="font-medium">{task.assignedTo || 'Unassigned'}</span>
                                                    </div>
                                                    {isRejected && (
                                                        <div className="text-red-500 font-medium">
                                                            Rejected
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Details & Bugs */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="md:col-span-2 space-y-3">
                                                    {isRejected ? (
                                                        <div className="bg-red-50 p-3 rounded-lg text-red-700 text-sm border border-red-100">
                                                            <span className="font-bold block mb-1">Rejection Reason:</span>
                                                            {task.deviationReason || 'No reason provided.'}
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-600 text-sm leading-relaxed">
                                                            <p className="flex items-start gap-2">
                                                                <Hash size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                                                {task.comments || 'No specific comments or notes for this phase.'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Stats */}
                                                {(task.bugCount > 0 || task.htmlBugs > 0 || task.functionalBugs > 0) && (
                                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Bug Report</h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-600">Total Bugs</span>
                                                                <span className="font-bold text-slate-800">{task.bugCount}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">HTML</span>
                                                                <span className="font-mono text-slate-700">{task.htmlBugs}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">Functional</span>
                                                                <span className="font-mono text-slate-700">{task.functionalBugs}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
