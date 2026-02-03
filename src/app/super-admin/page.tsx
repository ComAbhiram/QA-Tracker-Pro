'use client';

import { useState, useEffect } from 'react';
import { Building2, MapPin, RefreshCw, ArrowRightLeft } from 'lucide-react';

interface ProjectWithLocation {
    id: string;
    project_name: string;
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
    total_work_days: number;
}

export default function SuperAdminPage() {
    const [activeTab, setActiveTab] = useState<'Dubai' | 'Cochin' | 'All'>('All');
    const [projects, setProjects] = useState<ProjectWithLocation[]>([]);
    const [hubstaffDataCache, setHubstaffDataCache] = useState<Record<string, HubstaffData>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllProjects();
    }, []);

    const fetchAllProjects = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/project-overview');
            const data = await response.json();
            if (data.projects) {
                setProjects(data.projects);
                // Fetch Hubstaff data for each project
                data.projects.forEach((project: ProjectWithLocation) => {
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

    const handleMoveProject = async (projectId: string, newLocation: 'Dubai' | 'Cochin') => {
        try {
            const response = await fetch('/api/project-overview', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: projectId, location: newLocation })
            });

            if (response.ok) {
                await fetchAllProjects();
            }
        } catch (error) {
            console.error('Error moving project:', error);
            alert('Failed to move project');
        }
    };

    const filteredProjects = projects.filter(project => {
        if (activeTab === 'All') return true;
        return project.location === activeTab;
    });

    const calculateTotals = (projectsList: ProjectWithLocation[]) => {
        let totalAllotted = 0;
        let totalHSTime = 0;
        let totalTLEffort = 0;
        let totalDesign = 0;
        let totalFEDev = 0;
        let totalBEDev = 0;
        let totalTesting = 0;

        projectsList.forEach(project => {
            totalAllotted += project.allotted_time_days || 0;
            totalTLEffort += project.tl_confirmed_effort_days || 0;

            const hsData = hubstaffDataCache[project.project_name];
            if (hsData) {
                totalHSTime += hsData.hs_time_taken_days;
                totalDesign += hsData.team_breakdown.design_days;
                totalFEDev += hsData.team_breakdown.fe_dev_days;
                totalBEDev += hsData.team_breakdown.be_dev_days;
                totalTesting += hsData.team_breakdown.testing_days;
            }
        });

        return {
            totalAllotted,
            totalHSTime,
            totalTLEffort,
            totalDesign,
            totalFEDev,
            totalBEDev,
            totalTesting,
            totalDeviation: totalAllotted - totalHSTime
        };
    };

    const totals = calculateTotals(filteredProjects);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-6">
            <div className="max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                                <Building2 size={36} className="text-indigo-600" />
                                Super Admin - Project Overview
                            </h1>
                            <p className="text-slate-600">
                                Combined view of all projects across locations
                            </p>
                        </div>
                        <button
                            onClick={fetchAllProjects}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            <RefreshCw size={18} />
                            Refresh
                        </button>
                    </div>

                    {/* Location Tabs */}
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 w-fit">
                        <button
                            onClick={() => setActiveTab('All')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors font-medium ${activeTab === 'All'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            All Projects
                        </button>
                        <button
                            onClick={() => setActiveTab('Dubai')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors font-medium ${activeTab === 'Dubai'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <MapPin size={18} />
                            Dubai
                        </button>
                        <button
                            onClick={() => setActiveTab('Cochin')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors font-medium ${activeTab === 'Cochin'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <MapPin size={18} />
                            Cochin
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Total Projects</p>
                        <p className="text-3xl font-bold text-slate-800">{filteredProjects.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Total Allotted Days</p>
                        <p className="text-3xl font-bold text-indigo-600">{totals.totalAllotted.toFixed(1)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Total HS Time</p>
                        <p className="text-3xl font-bold text-blue-600">{totals.totalHSTime.toFixed(1)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Total Deviation</p>
                        <p className={`text-3xl font-bold ${totals.totalDeviation > 0 ? 'text-green-600' :
                                totals.totalDeviation < 0 ? 'text-red-600' :
                                    'text-slate-600'
                            }`}>
                            {totals.totalDeviation.toFixed(1)}
                        </p>
                    </div>
                </div>

                {/* Team Breakdown */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Team Time Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-purple-50 rounded-lg p-4">
                            <p className="text-sm text-purple-700 font-semibold mb-1">Design</p>
                            <p className="text-2xl font-bold text-purple-900">{totals.totalDesign.toFixed(2)} days</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-sm text-blue-700 font-semibold mb-1">FE Dev</p>
                            <p className="text-2xl font-bold text-blue-900">{totals.totalFEDev.toFixed(2)} days</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-sm text-green-700 font-semibold mb-1">BE Dev</p>
                            <p className="text-2xl font-bold text-green-900">{totals.totalBEDev.toFixed(2)} days</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <p className="text-sm text-orange-700 font-semibold mb-1">Testing</p>
                            <p className="text-2xl font-bold text-orange-900">{totals.totalTesting.toFixed(2)} days</p>
                        </div>
                    </div>
                </div>

                {/* Projects Table */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Project Name</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">Location</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">PC</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">Resources</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">Design</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">FE Dev</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">BE Dev</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">Testing</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">HS Time</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">Allotted</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">Deviation</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">TL Effort</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProjects.map((project, index) => {
                                        const hsData = hubstaffDataCache[project.project_name];
                                        const deviation = project.allotted_time_days && hsData
                                            ? project.allotted_time_days - hsData.hs_time_taken_days
                                            : null;

                                        return (
                                            <tr
                                                key={project.id}
                                                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                                    }`}
                                            >
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                                                    {project.project_name}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${project.location === 'Dubai' ? 'bg-blue-100 text-blue-700' :
                                                            project.location === 'Cochin' ? 'bg-green-100 text-green-700' :
                                                                'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        <MapPin size={12} />
                                                        {project.location || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{project.pc || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 text-center">
                                                    {project.task_count || 0}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center font-semibold text-purple-700">
                                                    {hsData ? hsData.team_breakdown.design_days.toFixed(2) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center font-semibold text-blue-700">
                                                    {hsData ? hsData.team_breakdown.fe_dev_days.toFixed(2) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center font-semibold text-green-700">
                                                    {hsData ? hsData.team_breakdown.be_dev_days.toFixed(2) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center font-semibold text-orange-700">
                                                    {hsData ? hsData.team_breakdown.testing_days.toFixed(2) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center font-bold text-slate-700">
                                                    {hsData ? hsData.hs_time_taken_days.toFixed(2) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center font-semibold text-slate-700">
                                                    {project.allotted_time_days?.toFixed(1) || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center font-bold">
                                                    <span className={
                                                        deviation === null ? 'text-slate-400' :
                                                            deviation > 0 ? 'text-green-600' :
                                                                deviation < 0 ? 'text-red-600' :
                                                                    'text-slate-700'
                                                    }>
                                                        {deviation !== null ? deviation.toFixed(1) : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center font-semibold text-slate-700">
                                                    {project.tl_confirmed_effort_days?.toFixed(1) || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {project.location !== 'Dubai' && (
                                                            <button
                                                                onClick={() => handleMoveProject(project.id, 'Dubai')}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="Move to Dubai"
                                                            >
                                                                <ArrowRightLeft size={16} />
                                                            </button>
                                                        )}
                                                        {project.location !== 'Cochin' && (
                                                            <button
                                                                onClick={() => handleMoveProject(project.id, 'Cochin')}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                                title="Move to Cochin"
                                                            >
                                                                <ArrowRightLeft size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
