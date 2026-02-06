'use client';

import { useState, useEffect } from 'react';
import { LayoutGrid, List, Plus, RefreshCw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import ProjectTable from './components/ProjectTable';
import TaskOverviewTable from './components/TaskOverviewTable'; // Import new table
import ProjectDetailsModal from './components/ProjectDetailsModal';
import TaskModal from '@/components/TaskModal'; // Import TaskModal
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task } from '@/lib/types'; // Import types and mapper

interface ProjectOverview {
    id: string;
    project_name: string;
    team_id: string;
    location: string | null;
    pc: string | null;
    allotted_time_days: number | null;
    tl_confirmed_effort_days: number | null;
    blockers: string | null;
    task_count: number;
    resources: string | null;
    expected_effort_days: number | null;
    hubstaff_budget: string | null;
    committed_days: number | null;
    fixing_text: string | null;
    live_text: string | null;
    budget_text: string | null;
    started_date: string | null;
    project_type: string | null;
    category: string | null;
    created_at: string;
    updated_at: string;
    // Calculated/Optional fields
    activity_percentage?: number;
    hs_time_taken_days?: number;
    allotted_time_days_calc?: number;
    deviation_calc?: number;
    status?: string;
}

interface HubstaffData {
    hs_time_taken_days: number;
    activity_percentage: number;
    team_breakdown: {
        design_days: number;
        fe_dev_days: number;
        be_dev_days: number;
        testing_days: number;
    };
    member_activities: Array<{
        user_name: string;
        team: string;
        hours: number;
        activity_percentage: number;
    }>;
    total_work_days: number;
}

export default function ProjectOverviewPage() {
    const [activeTab, setActiveTab] = useState<'project' | 'task'>('project');
    const [projects, setProjects] = useState<ProjectOverview[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<ProjectOverview | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter State
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterQA, setFilterQA] = useState('');
    const [filterAssignedOnly, setFilterAssignedOnly] = useState(false);

    // Derived State: Unique QAs for Filter Dropdown
    const uniqueQAs = Array.from(new Set(
        tasks.flatMap(t => [t.assignedTo, t.assignedTo2, ...(t.additionalAssignees || [])].filter(Boolean) as string[])
    )).sort();

    // Filtering Logic
    const filteredProjects = projects.filter(p => {
        if (!p) return false;
        // Search
        const name = p.project_name || '';
        const resources = p.resources || '';
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resources.toLowerCase().includes(searchTerm.toLowerCase());

        // Date Range (using started_date or created_at)
        let matchesDate = true;
        const projectDate = p.started_date || p.created_at;
        if (filterStartDate) matchesDate = matchesDate && projectDate >= filterStartDate;
        if (filterEndDate) matchesDate = matchesDate && projectDate <= filterEndDate;

        // QA Filter (using resources string)
        let matchesQA = true;
        if (filterQA) {
            matchesQA = resources.includes(filterQA);
        }

        // Assigned Only Filter
        let matchesAssigned = true;
        if (filterAssignedOnly) {
            // Check if resources string is present and not empty/just whitespace
            matchesAssigned = !!(resources && resources.trim().length > 0 && resources !== '-');
        }

        return matchesSearch && matchesDate && matchesQA && matchesAssigned;
    });

    const filteredTasks = tasks.filter(t => {
        // Search
        const matchesSearch = t.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.assignedTo && t.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));

        // Date Range (using startDate and endDate overlap)
        let matchesDate = true;
        if (filterStartDate && filterEndDate) {
            // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
            const filterStart = new Date(filterStartDate);
            const filterEnd = new Date(filterEndDate);
            const taskStart = t.startDate ? new Date(t.startDate) : null;
            const taskEnd = t.endDate ? new Date(t.endDate) : null;

            if (taskStart && taskEnd) {
                matchesDate = taskStart <= filterEnd && taskEnd >= filterStart;
            }
        } else if (filterStartDate) {
            const taskEnd = t.endDate ? new Date(t.endDate) : null;
            matchesDate = taskEnd ? taskEnd >= new Date(filterStartDate) : true;
        } else if (filterEndDate) {
            const taskStart = t.startDate ? new Date(t.startDate) : null;
            matchesDate = taskStart ? taskStart <= new Date(filterEndDate) : true;
        }

        // QA Filter
        let matchesQA = true;
        if (filterQA) {
            const assignees = [t.assignedTo, t.assignedTo2, ...(t.additionalAssignees || [])];
            matchesQA = assignees.includes(filterQA);
        }

        return matchesSearch && matchesDate && matchesQA;
    });

    useEffect(() => {
        fetchData();
    }, []);

    const handleExport = () => {
        const timestamp = new Date().toISOString().split('T')[0];

        if (activeTab === 'project') {
            const dataToExport = filteredProjects.map(p => ({
                'Project Name': p.project_name,
                'Resources': p.resources,
                'Activity %': `${p.activity_percentage || 0}%`,
                'PC': p.pc,
                'HS Time (Days)': p.hs_time_taken_days?.toFixed(2) || '0.00',
                'Allotted Days': p.allotted_time_days_calc?.toFixed(2) || '0.00',
                'Deviation': p.deviation_calc?.toFixed(2) || '0.00',
                'TL Effort': p.tl_confirmed_effort_days || '',
                'Blockers': p.blockers || '',
                'Status': p.status || ''
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Projects");
            XLSX.writeFile(wb, `projects_overview_${timestamp}.xlsx`);
        } else {
            const dataToExport = filteredTasks.map(t => ({
                'ID': t.id,
                'Project': t.projectName,
                'Type': t.projectType,
                'Priority': t.priority,
                'Phase': t.subPhase,
                'PC': t.pc,
                'Assignee': t.assignedTo,
                'Secondary Assignee': t.assignedTo2,
                'Status': t.status,
                'Start Date': t.startDate,
                'End Date': t.endDate,
                'Actual End': t.actualCompletionDate,
                'Time Taken': t.timeTaken,
                'Activity %': t.activityPercentage,
                'Allotted Days': t.daysAllotted,
                'Total Bugs': t.bugCount,
                'HTML Bugs': t.htmlBugs,
                'Func Bugs': t.functionalBugs,
                'Comments': t.comments
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Tasks");
            XLSX.writeFile(wb, `tasks_overview_${timestamp}.xlsx`);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/project-overview');
            const data = await response.json();

            if (data.projects) {
                // Client-side deduplication
                const uniqueProjects: ProjectOverview[] = [];
                const seen = new Set<string>();

                data.projects.forEach((p: ProjectOverview) => {
                    // Aggressive deduplication: Ignore team_id, just ensure unique project names.
                    // This resolves issues where the same project exists in multiple teams (or null and valid team)
                    // and causes confusion.
                    const key = p.project_name.trim().toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueProjects.push(p);
                    }
                });

                setProjects(uniqueProjects);
            }
            if (data.tasks) {
                setTasks(data.tasks.map(mapTaskFromDB));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProject = async (projectData: Partial<ProjectOverview>) => {
        try {
            const method = selectedProject ? 'PUT' : 'POST';
            const body = selectedProject ? { ...projectData, id: selectedProject.id } : projectData;

            const response = await fetch('/api/project-overview', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                await fetchData();
                setIsModalOpen(false);
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(`Failed to save project: ${errorData.error} \nDetails: ${errorData.details || 'No details provided'}`);
            }
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Error saving project');
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            const response = await fetch(`/api/project-overview?id=${projectId}`, { method: 'DELETE' });
            if (response.ok) {
                await fetchData();
            } else {
                alert('Failed to delete project');
            }
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    const handleSaveTask = async (taskData: Partial<Task>) => {
        try {
            const dbPayload: any = {
                project_name: taskData.projectName,
                sub_phase: taskData.subPhase || null,
                status: taskData.status,
                assigned_to: taskData.assignedTo || null,
                assigned_to2: taskData.assignedTo2 || null,
                additional_assignees: taskData.additionalAssignees || [],
                pc: taskData.pc || null,
                start_date: taskData.startDate || null,
                end_date: taskData.endDate || null,
                actual_completion_date: taskData.actualCompletionDate ? new Date(taskData.actualCompletionDate).toISOString() : null,
                bug_count: taskData.bugCount ?? 0,
                html_bugs: taskData.htmlBugs ?? 0,
                functional_bugs: taskData.functionalBugs ?? 0,
                deviation_reason: taskData.deviationReason || null,
                sprint_link: taskData.sprintLink || null,
                days_allotted: taskData.daysAllotted ?? 0,
                time_taken: taskData.timeTaken || '00:00:00',
                days_taken: taskData.daysTaken ?? 0,
                deviation: taskData.deviation ?? 0,
                activity_percentage: taskData.activityPercentage ?? 0,
                comments: taskData.comments || null,
                team_id: taskData.teamId ?? null,
                start_time: taskData.startTime || null,
                end_time: taskData.endTime || null,
            };

            if (selectedTask) {
                const { error } = await supabase
                    .from('tasks')
                    .update(dbPayload)
                    .eq('id', selectedTask.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('tasks')
                    .insert([dbPayload]);
                if (error) throw error;
            }

            await fetchData();
            setIsTaskModalOpen(false);

        } catch (error: any) {
            console.error('Error saving task:', error);
            alert(`Failed to save task: ${error.message}`);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;
            await fetchData();
            setIsTaskModalOpen(false);
        } catch (error: any) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        }
    };



    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            <div className="max-w-[1920px] mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                            <h1 className="text-4xl font-bold text-slate-800 mb-2">
                                Project Overview
                            </h1>
                            <p className="text-slate-600">
                                Manage projects and track detailed task progress
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                <Download size={18} />
                                Export CSV
                            </button>
                            <button
                                onClick={fetchData}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <RefreshCw size={18} />
                                Refresh
                            </button>
                            {activeTab === 'project' && (
                                <button
                                    onClick={() => { setSelectedProject(null); setIsModalOpen(true); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <Plus size={18} />
                                    New Project
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-slate-700">From:</label>
                            <input
                                type="date"
                                value={filterStartDate}
                                onChange={(e) => setFilterStartDate(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-slate-700">To:</label>
                            <input
                                type="date"
                                value={filterEndDate}
                                onChange={(e) => setFilterEndDate(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-slate-700">Members:</label>
                            <select
                                value={filterQA}
                                onChange={(e) => setFilterQA(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[150px]"
                            >
                                <option value="">All Members</option>
                                {uniqueQAs.map(qa => (
                                    <option key={qa} value={qa}>{qa}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={filterAssignedOnly}
                                    onChange={(e) => setFilterAssignedOnly(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                Assigned Only
                            </label>
                        </div>

                        {(filterStartDate || filterEndDate || filterQA || filterAssignedOnly) && (
                            <button
                                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterQA(''); setFilterAssignedOnly(false); }}
                                className="text-sm text-red-600 hover:text-red-700 font-medium ml-auto"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-4 border-b border-slate-200 mb-6">
                        <button
                            onClick={() => setActiveTab('project')}
                            className={`px-4 py-2 font-semibold text-sm transition-colors relative ${activeTab === 'project'
                                ? 'text-indigo-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <LayoutGrid size={18} />
                                Project Overview
                            </div>
                            {activeTab === 'project' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('task')}
                            className={`px-4 py-2 font-semibold text-sm transition-colors relative ${activeTab === 'task'
                                ? 'text-indigo-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <List size={18} />
                                Task Overview
                            </div>
                            {activeTab === 'task' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />
                            )}
                        </button>
                    </div>

                    {/* Search (Optional, global) */}
                    <div className="mb-6 max-w-md">
                        <input
                            type="text"
                            placeholder={activeTab === 'project' ? "Search projects..." : "Search tasks..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
                    </div>
                ) : activeTab === 'project' ? (
                    <ProjectTable
                        projects={filteredProjects}
                        onEdit={(p) => { setSelectedProject(p); setIsModalOpen(true); }}
                        onDelete={handleDeleteProject}
                    />
                ) : (
                    <TaskOverviewTable
                        tasks={filteredTasks}
                        onEdit={(t) => { setSelectedTask(t); setIsTaskModalOpen(true); }}
                    />
                )}
            </div>

            {/* Project Modal */}
            <ProjectDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                project={selectedProject}
                onSave={handleSaveProject}
            />

            {/* Task Modal (Reuse existing TaskModal) */}
            {isTaskModalOpen && (
                <TaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    task={selectedTask}
                    onSave={handleSaveTask}
                    onDelete={handleDeleteTask}
                />
            )}
        </div>
    );
}
