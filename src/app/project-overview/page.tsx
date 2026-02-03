'use client';

import { useState, useEffect } from 'react';
import { LayoutGrid, List, Plus, RefreshCw } from 'lucide-react';
import ProjectCard from './components/ProjectCard';
import ProjectTable from './components/ProjectTable';
import ProjectDetailsModal from './components/ProjectDetailsModal';

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
    const [view, setView] = useState<'card' | 'table'>('card');
    const [projects, setProjects] = useState<ProjectOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<ProjectOverview | null>(null);
    const [hubstaffDataCache, setHubstaffDataCache] = useState<Record<string, HubstaffData>>({});

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/project-overview');
            const data = await response.json();
            if (data.projects) {
                setProjects(data.projects);
                // Fetch Hubstaff data for each project
                data.projects.forEach((project: ProjectOverview) => {
                    fetchHubstaffData(project.project_name);
                });
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHubstaffData = async (projectName: string) => {
        try {
            const response = await fetch(
                `/api/hubstaff/project-activity?project_name=${encodeURIComponent(projectName)}`
            );
            const data = await response.json();
            setHubstaffDataCache(prev => ({
                ...prev,
                [projectName]: data
            }));
        } catch (error) {
            console.error(`Error fetching Hubstaff data for ${projectName}:`, error);
        }
    };

    const handleCreateProject = () => {
        setSelectedProject(null);
        setIsModalOpen(true);
    };

    const handleEditProject = (project: ProjectOverview) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    const handleSaveProject = async (projectData: Partial<ProjectOverview>) => {
        try {
            if (selectedProject) {
                // Update existing project
                const response = await fetch('/api/project-overview', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...projectData, id: selectedProject.id })
                });

                if (response.ok) {
                    await fetchProjects();
                    setIsModalOpen(false);
                }
            } else {
                // Create new project
                const response = await fetch('/api/project-overview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData)
                });

                if (response.ok) {
                    await fetchProjects();
                    setIsModalOpen(false);
                }
            }
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Failed to save project');
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            const response = await fetch(`/api/project-overview?id=${projectId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchProjects();
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-4xl font-bold text-slate-800 mb-2">
                                Project Overview
                            </h1>
                            <p className="text-slate-600">
                                Track project progress, resources, and Hubstaff metrics
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchProjects}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <RefreshCw size={18} />
                                Refresh
                            </button>
                            <button
                                onClick={handleCreateProject}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={18} />
                                New Project
                            </button>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 w-fit">
                        <button
                            onClick={() => setView('card')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${view === 'card'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <LayoutGrid size={18} />
                            Card View
                        </button>
                        <button
                            onClick={() => setView('table')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${view === 'table'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <List size={18} />
                            Table View
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
                    </div>
                ) : projects.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                        <p className="text-slate-500 text-lg mb-4">No projects found</p>
                        <button
                            onClick={handleCreateProject}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Create Your First Project
                        </button>
                    </div>
                ) : view === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                hubstaffData={hubstaffDataCache[project.project_name]}
                                onEdit={() => handleEditProject(project)}
                                onDelete={() => handleDeleteProject(project.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <ProjectTable
                        projects={projects}
                        hubstaffDataCache={hubstaffDataCache}
                        onEdit={handleEditProject}
                        onDelete={handleDeleteProject}
                    />
                )}
            </div>

            {/* Modal */}
            <ProjectDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                project={selectedProject}
                onSave={handleSaveProject}
            />
        </div>
    );
}
