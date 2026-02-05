'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, MapPin, RefreshCw, ArrowRightLeft, Users } from 'lucide-react';

interface ProjectWithLocation {
    id: string;
    project_name: string;
    team_id: string | null;
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
        other_days: number;
    };
    total_work_days: number;
}

export default function SuperAdminPage() {
    const [activeTab, setActiveTab] = useState<'Dubai' | 'Cochin' | 'All'>('All');
    const [projects, setProjects] = useState<ProjectWithLocation[]>([]);
    const [hubstaffDataCache, setHubstaffDataCache] = useState<Record<string, HubstaffData>>({});
    const [loading, setLoading] = useState(true);
    const [hsFetchProgress, setHsFetchProgress] = useState({ loaded: 0, total: 0 });
    const [teams, setTeams] = useState<any[]>([]);

    useEffect(() => {
        fetchAllProjects();
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const res = await fetch('/api/teams');
            const data = await res.json();
            if (data.teams) setTeams(data.teams);
        } catch (e) {
            console.error("Failed to fetch teams", e);
        }
    };

    const getTeamId = (name: string) => teams.find(t => t.name.toLowerCase() === name.toLowerCase())?.id;
    const getTeamName = (id: string | null) => {
        if (!id) return '';
        const t = teams.find(t => t.id === id);
        // Map any legacy names if needed, but primarily relying on Dubai/Cochin being created
        return t ? t.name : '';
    };

    const fetchAllProjects = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/project-overview');
            const data = await response.json();
            if (data.projects) {
                // Aggressive deduplication for Super Admin view
                const uniqueProjects: ProjectWithLocation[] = [];
                const seen = new Set<string>();

                data.projects.forEach((p: ProjectWithLocation) => {
                    // Normalize name: lowercase, trim, AND collapse multiple spaces
                    const key = p.project_name.toLowerCase().replace(/\s+/g, ' ').trim();
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueProjects.push(p);
                    }
                });

                setProjects(uniqueProjects);

                // Fetch Hubstaff data for Deduplicated projects
                // Note: We use the unique list now to avoid fetching for hidden duplicates
                const projectNames = uniqueProjects.map((p) => p.project_name);

                // Chunk project names into groups of 50 to avoid URL length limits
                const CHUNK_SIZE = 50;
                const chunks = [];
                for (let i = 0; i < projectNames.length; i += CHUNK_SIZE) {
                    chunks.push(projectNames.slice(i, i + CHUNK_SIZE));
                }

                setHsFetchProgress({ loaded: 0, total: chunks.length });

                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    try {
                        const bulkResponse = await fetch(
                            `/api/hubstaff/bulk-activity?project_names=${encodeURIComponent(chunk.join(','))}`
                        );
                        if (bulkResponse.ok) {
                            const bulkData = await bulkResponse.json();
                            if (bulkData.results) {
                                setHubstaffDataCache(prev => ({
                                    ...prev,
                                    ...bulkData.results
                                }));
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching bulk Hubstaff data:', err);
                    } finally {
                        setHsFetchProgress(prev => ({ ...prev, loaded: i + 1 }));
                    }
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
                console.log(`[SuperAdmin] Hubstaff data for ${projectName}:`, data);
                setHubstaffDataCache(prev => ({
                    ...prev,
                    [projectName]: data
                }));
            } catch (error) {
                console.error(`Error fetching Hubstaff data for ${projectName}:`, error);
            }
        };

        const handleUpdateField = async (projectId: string, field: string, value: any) => {
            try {
                const response = await fetch('/api/project-overview', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: projectId, [field]: value })
                });

                if (response.ok) {
                    // Optimistic update
                    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, [field]: value } : p));
                } else {
                    const errData = await response.json();
                    console.error('Update failed:', errData);
                    alert(`Failed to update ${field}: ${errData.details || errData.error}`);
                    // Refresh to revert
                    fetchAllProjects();
                }
            } catch (error) {
                console.error('Error updating project field:', error);
            }
        };

        const handleMoveProject = async (projectId: string, targetLocation: 'Dubai' | 'Cochin') => {
            const targetId = getTeamId(targetLocation);
            if (!targetId) {
                alert(`Team '${targetLocation}' not found. Please ensure it exists in Manage Teams.`);
                return;
            }
            await handleUpdateField(projectId, 'team_id', targetId);
        };

        const filteredProjects = projects.filter(project => {
            if (activeTab === 'All') return true;
            const tId = getTeamId(activeTab);
            return project.team_id === tId;
        });

        const calculateTotals = (projectsList: ProjectWithLocation[]) => {
            let totalAllotted = 0;
            let totalHSTime = 0;
            let totalTLEffort = 0;
            let totalDesign = 0;
            let totalFEDev = 0;
            let totalBEDev = 0;
            let totalTesting = 0;
            let totalOther = 0;

            projectsList.forEach(project => {
                totalAllotted += project.expected_effort_days || project.allotted_time_days || 0;
                totalTLEffort += project.tl_confirmed_effort_days || 0;

                const nameKey = (project.project_name || '').trim();
                const hsData = hubstaffDataCache[nameKey];
                if (hsData) {
                    totalHSTime += hsData.hs_time_taken_days || 0;
                    if (hsData.team_breakdown) {
                        totalDesign += hsData.team_breakdown.design_days || 0;
                        totalFEDev += hsData.team_breakdown.fe_dev_days || 0;
                        totalBEDev += hsData.team_breakdown.be_dev_days || 0;
                        totalTesting += hsData.team_breakdown.testing_days || 0;
                        totalOther += hsData.team_breakdown.other_days || 0;
                    }
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
                totalOther,
                totalDeviation: totalAllotted - totalHSTime
            };
        };

        const totals = calculateTotals(filteredProjects);

        const EditableCell = ({ value, onSave, type = 'text', className = "" }: { value: any, onSave: (val: any) => void, type?: 'text' | 'number' | 'date', className?: string }) => {
            const [isEditing, setIsEditing] = useState(false);
            const [tempValue, setTempValue] = useState(value);

            useEffect(() => {
                setTempValue(value);
            }, [value]);

            if (isEditing) {
                return (
                    <input
                        type={type}
                        value={tempValue || ''}
                        onChange={(e) => setTempValue(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                        onBlur={() => {
                            setIsEditing(false);
                            if (tempValue !== value) {
                                onSave(tempValue);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setIsEditing(false);
                                if (tempValue !== value) {
                                    onSave(tempValue);
                                }
                            }
                            if (e.key === 'Escape') {
                                setIsEditing(false);
                                setTempValue(value);
                            }
                        }}
                        autoFocus
                        className="w-full px-1 py-0.5 border border-indigo-300 rounded text-sm bg-white"
                    />
                );
            }

            return (
                <div
                    onClick={() => setIsEditing(true)}
                    className={`cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded transition-colors min-h-[1.5rem] flex items-center justify-center ${className}`}
                >
                    {value != null ? (type === 'number' ? Number(value).toFixed(2) : value) : '-'}
                </div>
            );
        };

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
                            <div className="flex items-center gap-3">
                                {hsFetchProgress.total > 0 && hsFetchProgress.loaded < hsFetchProgress.total && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 animate-pulse">
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span className="text-xs font-medium">
                                            Syncing Hubstaff: {hsFetchProgress.loaded}/{hsFetchProgress.total}
                                        </span>
                                    </div>
                                )}
                                <Link
                                    href="/admin"
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
                                >
                                    <Users size={18} />
                                    Manage Teams
                                </Link>
                                <button
                                    onClick={fetchAllProjects}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    <RefreshCw size={18} />
                                    Refresh
                                </button>
                            </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white rounded-xl p-6 border border-slate-200">
                            <p className="text-sm text-slate-500 mb-1">Total Projects</p>
                            <p className="text-3xl font-bold text-slate-800">{filteredProjects.length}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-slate-200">
                            <p className="text-sm text-slate-500 mb-1">Expected Effort</p>
                            <p className="text-3xl font-bold text-indigo-600">{totals.totalAllotted.toFixed(1)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-slate-200">
                            <p className="text-sm text-slate-500 mb-1">Total Work Days</p>
                            <p className="text-3xl font-bold text-slate-900">
                                {(totals.totalDesign + totals.totalFEDev + totals.totalBEDev + totals.totalTesting + totals.totalOther).toFixed(1)}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-slate-200">
                            <p className="text-sm text-slate-500 mb-1">Hubstaff Days</p>
                            <p className="text-3xl font-bold text-blue-600">{totals.totalHSTime.toFixed(1)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-slate-200">
                            <p className="text-sm text-slate-500 mb-1">Deviation</p>
                            <p className={`text-3xl font-bold ${totals.totalDeviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {totals.totalDeviation.toFixed(1)}
                            </p>
                        </div>
                    </div>

                    {/* Team Breakdown */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Team Time Breakdown (Days)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="bg-purple-50 rounded-lg p-4">
                                <p className="text-sm text-purple-700 font-semibold mb-1">Design</p>
                                <p className="text-2xl font-bold text-purple-900">{totals.totalDesign.toFixed(2)}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-sm text-blue-700 font-semibold mb-1">FE Dev</p>
                                <p className="text-2xl font-bold text-blue-900">{totals.totalFEDev.toFixed(2)}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                                <p className="text-sm text-green-700 font-semibold mb-1">BE Dev</p>
                                <p className="text-2xl font-bold text-green-900">{totals.totalBEDev.toFixed(2)}</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-4">
                                <p className="text-sm text-orange-700 font-semibold mb-1">Testing</p>
                                <p className="text-2xl font-bold text-orange-900">{totals.totalTesting.toFixed(2)}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-sm text-slate-600 font-semibold mb-1">Other/Unassigned</p>
                                <p className="text-2xl font-bold text-slate-800">{totals.totalOther.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Projects Table */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-800 text-white">
                                        <tr>
                                            <th className="px-2 py-3 text-left font-semibold uppercase tracking-wider">Project Name</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Started Date</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Type</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Category</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Design</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">FE Dev</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">BE Dev</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Testing</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Unassigned</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider bg-slate-700">Total Work Days</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Expected Effort</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">HS Budget</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Budget</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Committed</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Fixing</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Live</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider bg-slate-700">Deviation</th>
                                            <th className="px-2 py-3 text-center font-semibold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProjects.map((project, index) => {
                                            const nameKey = (project.project_name || '').trim();
                                            const hsData = hubstaffDataCache[nameKey];
                                            const totalWorkDays = hsData?.hs_time_taken_days || 0;
                                            const expectedEffort = project.expected_effort_days || 0;
                                            const deviation = expectedEffort - totalWorkDays;

                                            return (
                                                <tr
                                                    key={`${project.id}-${index}`}
                                                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                                >
                                                    <td className="px-2 py-3 font-semibold text-slate-800 border-r border-slate-100">
                                                        {project.project_name}
                                                    </td>
                                                    <td className="px-2 py-3 text-center border-r border-slate-100">
                                                        <EditableCell
                                                            type="date"
                                                            value={project.started_date}
                                                            onSave={(val) => handleUpdateField(project.id, 'started_date', val)}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 text-center border-r border-slate-100">
                                                        <EditableCell
                                                            value={project.project_type}
                                                            onSave={(val) => handleUpdateField(project.id, 'project_type', val)}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 text-center border-r border-slate-100">
                                                        <EditableCell
                                                            value={project.category}
                                                            onSave={(val) => handleUpdateField(project.id, 'category', val)}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 text-center font-medium text-purple-700 border-r border-slate-100">
                                                        {hsData?.team_breakdown?.design_days != null ? hsData.team_breakdown.design_days.toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="px-2 py-3 text-center font-medium text-blue-700 border-r border-slate-100">
                                                        {hsData?.team_breakdown?.fe_dev_days != null ? hsData.team_breakdown.fe_dev_days.toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="px-2 py-3 text-center font-medium text-green-700 border-r border-slate-100">
                                                        {hsData?.team_breakdown?.be_dev_days != null ? hsData.team_breakdown.be_dev_days.toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="px-2 py-3 text-center font-medium text-orange-700 border-r border-slate-100">
                                                        {hsData?.team_breakdown?.testing_days != null ? hsData.team_breakdown.testing_days.toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="px-2 py-3 text-center font-medium text-slate-500 border-r border-slate-100">
                                                        {hsData?.team_breakdown?.other_days != null ? hsData.team_breakdown.other_days.toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="px-2 py-3 text-center font-bold text-slate-900 bg-slate-50 border-r border-slate-100">
                                                        {totalWorkDays.toFixed(2)}
                                                    </td>
                                                    <td className="px-2 py-3 text-center border-r border-slate-100">
                                                        <EditableCell
                                                            type="number"
                                                            value={project.expected_effort_days}
                                                            onSave={(val) => handleUpdateField(project.id, 'expected_effort_days', val)}
                                                            className="font-bold text-blue-600"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 text-center border-r border-slate-100">
                                                        <EditableCell
                                                            value={project.hubstaff_budget}
                                                            onSave={(val) => handleUpdateField(project.id, 'hubstaff_budget', val)}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 text-center border-r border-slate-100">
                                                        <EditableCell
                                                            value={project.budget_text}
                                                            onSave={(val) => handleUpdateField(project.id, 'budget_text', val)}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 text-center border-r border-slate-100">
                                                        <EditableCell
                                                            type="number"
                                                            value={project.committed_days}
                                                            onSave={(val) => handleUpdateField(project.id, 'committed_days', val)}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 text-center border-r border-slate-100">
                                                        <EditableCell
                                                            value={project.fixing_text}
                                                            onSave={(val) => handleUpdateField(project.id, 'fixing_text', val)}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 text-center border-r border-slate-100">
                                                        <EditableCell
                                                            value={project.live_text}
                                                            onSave={(val) => handleUpdateField(project.id, 'live_text', val)}
                                                        />
                                                    </td>
                                                    <td className={`px-2 py-3 text-center font-bold bg-slate-50 border-r border-slate-100 ${deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {deviation.toFixed(2)}
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleMoveProject(project.id, 'Cochin')}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${getTeamName(project.team_id) === 'Cochin'
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 cursor-default'
                                                                    : 'bg-white text-slate-500 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 shadow-sm'
                                                                    }`}
                                                                title="Move to Cochin"
                                                                disabled={getTeamName(project.team_id) === 'Cochin'}
                                                            >
                                                                C
                                                            </button>
                                                            <button
                                                                onClick={() => handleMoveProject(project.id, 'Dubai')}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${getTeamName(project.team_id) === 'Dubai'
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 cursor-default'
                                                                    : 'bg-white text-slate-500 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 shadow-sm'
                                                                    }`}
                                                                title="Move to Dubai"
                                                                disabled={getTeamName(project.team_id) === 'Dubai'}
                                                            >
                                                                D
                                                            </button>
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
