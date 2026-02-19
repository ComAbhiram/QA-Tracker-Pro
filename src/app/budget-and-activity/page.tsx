'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Download, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import BudgetTable from './components/BudgetTable';
import ProjectDetailsModal from '@/app/project-overview/components/ProjectDetailsModal'; // Reusing modal
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task } from '@/lib/types'; // Import types and mapper
import { useGuestMode } from '@/contexts/GuestContext';
import Checkbox from '@/components/ui/Checkbox';
import TaskMigration from '@/components/TaskMigration';

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

export default function BudgetAndActivityPage() {
    const [projects, setProjects] = useState<ProjectOverview[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<ProjectOverview | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { isGuest, selectedTeamId } = useGuestMode();


    // Filter State
    const [filterStartDate, setFilterStartDate] = useState(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    });
    const [filterEndDate, setFilterEndDate] = useState(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    });
    const [filterQA, setFilterQA] = useState('');
    const [filterAssignedOnly, setFilterAssignedOnly] = useState(false);

    // Derived State: Unique QAs for Filter Dropdown
    const uniqueQAs = Array.from(new Set(
        tasks.flatMap(t => [t.assignedTo, t.assignedTo2, ...(t.additionalAssignees || [])].filter(Boolean) as string[])
    )).sort();

    const filteredTasks = tasks.filter(t => {
        // Search
        const pName = t.projectName || '';
        const matchesSearch = pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.assignedTo && t.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));

        // Date Range (using startDate and endDate overlap)
        let matchesDate = true;
        if (filterStartDate && filterEndDate) {
            // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
            const filterStart = new Date(filterStartDate);
            const filterEnd = new Date(filterEndDate);
            // Set filterEnd to end of day
            filterEnd.setHours(23, 59, 59, 999);

            const taskStart = t.startDate ? new Date(t.startDate) : null;
            const taskEnd = t.endDate ? new Date(t.endDate) : null;

            if (taskStart && taskEnd) {
                matchesDate = taskStart <= filterEnd && taskEnd >= new Date(filterStartDate);
            }
        } else if (filterStartDate) {
            const taskEnd = t.endDate ? new Date(t.endDate) : null;
            matchesDate = taskEnd ? taskEnd >= new Date(filterStartDate) : true;
        } else if (filterEndDate) {
            const taskStart = t.startDate ? new Date(t.startDate) : null;
            const filterEnd = new Date(filterEndDate);
            filterEnd.setHours(23, 59, 59, 999);
            matchesDate = taskStart ? taskStart <= filterEnd : true;
        }

        // QA Filter
        let matchesQA = true;
        if (filterQA) {
            const assignees = [t.assignedTo, t.assignedTo2, ...(t.additionalAssignees || [])];
            matchesQA = assignees.includes(filterQA);
        }

        return matchesSearch && matchesDate && matchesQA;
    });

    const filteredProjects = projects.filter(p => {
        if (!p) return false;
        // Search
        const name = p.project_name || '';
        const resources = p.resources || '';
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resources.toLowerCase().includes(searchTerm.toLowerCase());

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

        // Date Range
        let matchesDate = true;
        if (filterStartDate || filterEndDate) {
            // Check 1: Project Created/Started in range
            const projectDateStr = p.started_date || p.created_at;
            let projectInRange = true;
            if (projectDateStr) {
                const projectDate = new Date(projectDateStr);

                if (filterStartDate) {
                    projectInRange = projectInRange && projectDate >= new Date(filterStartDate);
                }
                if (filterEndDate) {
                    const end = new Date(filterEndDate);
                    end.setHours(23, 59, 59, 999);
                    projectInRange = projectInRange && projectDate <= end;
                }
            } else {
                projectInRange = false;
            }

            // Check 2: Project has ACTIVE TASKS in range
            const hasTaskActivity = tasks.some(t => {
                if (t.projectName?.trim().toLowerCase() !== p.project_name?.trim().toLowerCase()) return false;

                // Check Date Overlap
                const tStart = t.startDate ? new Date(t.startDate) : null;
                const tEnd = t.endDate ? new Date(t.endDate) : null;

                if (!tStart && !tEnd) return false;

                const fStart = filterStartDate ? new Date(filterStartDate) : null;
                const fEnd = filterEndDate ? new Date(filterEndDate) : null;
                if (fEnd) fEnd.setHours(23, 59, 59, 999);

                let overlap = true;
                if (fStart && tEnd) overlap = overlap && (tEnd >= fStart);
                if (fEnd && tStart) overlap = overlap && (tStart <= fEnd);

                return overlap;
            });

            matchesDate = projectInRange || hasTaskActivity;
        }

        return matchesSearch && matchesDate && matchesQA && matchesAssigned;
    });

    useEffect(() => {
        fetchData();
    }, [isGuest, selectedTeamId]);

    const handleExport = () => {
        const timestamp = new Date().toISOString().split('T')[0];

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
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = '/api/project-overview';

            // If in Manager Mode (Guest), filter by team UNLESS it's QA Team (Global)
            // QA Team ID: ba60298b-8635-4cca-bcd5-7e470fad60e6
            if (isGuest && selectedTeamId && selectedTeamId !== 'ba60298b-8635-4cca-bcd5-7e470fad60e6') {
                url += `?teamId=${selectedTeamId}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.projects) {
                // Client-side deduplication
                const uniqueProjects: ProjectOverview[] = [];
                const seen = new Set<string>();

                data.projects.forEach((p: ProjectOverview) => {
                    // Aggressive deduplication: Ignore team_id, just ensure unique project names.
                    // This resolves issues where the same project exists in multiple teams (or null and valid team)
                    // and causes confusion.
                    const key = (p.project_name || '').trim().toLowerCase();
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
                let errorMessage = `Failed to save project: ${errorData.error}`;

                if (errorData.details && errorData.details.includes('project_overview_project_name_team_id_key')) {
                    errorMessage = 'A project with this name already exists. Please choose a different name.';
                } else if (errorData.details) {
                    errorMessage += `\nDetails: ${errorData.details}`;
                }

                alert(errorMessage);
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

    const handleUpdateProjectInline = async (id: string, data: any) => {
        try {
            const response = await fetch('/api/project-overview', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...data })
            });

            if (response.ok) {
                // Optimistic update
                setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
            } else {
                // Revert or alert
                console.error('Failed to update inline');
                fetchData(); // Refresh to ensure data consistency
            }
        } catch (e) {
            console.error('Error updating inline:', e);
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
                                Budget and Activity
                            </h1>
                            <p className="text-slate-600">
                                Track project budgets, activity, and team performance
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
                            <button
                                onClick={() => { setSelectedProject(null); setIsModalOpen(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={18} />
                                New Project
                            </button>
                            {/* Migration Tools */}
                            <div className="border-l border-slate-300 pl-3 ml-1">
                                <TaskMigration />
                            </div>
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
                                <Checkbox
                                    checked={filterAssignedOnly}
                                    onChange={(checked) => setFilterAssignedOnly(checked)}
                                    label="Assigned Only"
                                />
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
                        {/* Search */}
                        <div className="ml-auto w-full max-w-sm">
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <BudgetTable
                        projects={filteredProjects}
                        tasks={filteredTasks}
                        onEdit={(p) => { setSelectedProject(p); setIsModalOpen(true); }}
                        onDelete={handleDeleteProject}
                        onUpdateProject={handleUpdateProjectInline}
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
        </div>
    );
}
