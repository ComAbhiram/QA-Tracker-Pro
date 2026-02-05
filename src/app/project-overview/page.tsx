'use client';

import { useState, useEffect } from 'react';
import { LayoutGrid, List, Plus, RefreshCw } from 'lucide-react';
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/project-overview');
            const data = await response.json();

            if (data.projects) {
                setProjects(data.projects);
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
                alert('Failed to save project');
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
                sub_phase: taskData.subPhase,
                status: taskData.status,
                assigned_to: taskData.assignedTo,
                assigned_to2: taskData.assignedTo2,
                additional_assignees: taskData.additionalAssignees || [],
                pc: taskData.pc,
                start_date: taskData.startDate || null,
                end_date: taskData.endDate || null,
                actual_completion_date: taskData.actualCompletionDate ? new Date(taskData.actualCompletionDate).toISOString() : null,
                bug_count: taskData.bugCount,
                html_bugs: taskData.htmlBugs,
                functional_bugs: taskData.functionalBugs,
                deviation_reason: taskData.deviationReason,
                sprint_link: taskData.sprintLink,
                days_allotted: taskData.daysAllotted,
                time_taken: taskData.timeTaken,
                days_taken: taskData.daysTaken,
                deviation: taskData.deviation,
                activity_percentage: taskData.activityPercentage,
                comments: taskData.comments,
                team_id: taskData.teamId,
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
                    <div className="flex items-center justify-between mb-6">
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
                                onClick={fetchData} // This matches the 'fetchData' I'll define below properly
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
                        projects={projects.filter(p =>
                            p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.resources && p.resources.toLowerCase().includes(searchTerm.toLowerCase()))
                        )}
                        onEdit={(p) => { setSelectedProject(p); setIsModalOpen(true); }}
                        onDelete={handleDeleteProject}
                    />
                ) : (
                    <TaskOverviewTable
                        tasks={tasks.filter(t =>
                            t.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.assignedTo && t.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()))
                        )}
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
