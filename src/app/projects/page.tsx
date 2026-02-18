'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Project, mapProjectFromDB } from '@/lib/types';
import { Plus, Search, Database, Globe, RefreshCw, Check } from 'lucide-react';
import { useGuestMode } from '@/contexts/GuestContext';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'import' | 'create'>('list');

    // Import State
    const [hubstaffSearch, setHubstaffSearch] = useState('');
    const [hubstaffProjects, setHubstaffProjects] = useState<any[]>([]);
    const [importing, setImporting] = useState<number | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Manual Create State
    const [newProjectName, setNewProjectName] = useState('');
    const [creating, setCreating] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    const { isGuest, selectedTeamId } = useGuestMode();
    const [userTeamId, setUserTeamId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('user_profiles').select('team_id').eq('id', user.id).single();
                if (data) setUserTeamId(data.team_id);
            }
        };
        init();
    }, []);

    const activeTeamId = isGuest ? selectedTeamId : userTeamId;

    useEffect(() => {
        if (activeTeamId) {
            fetchProjects();
        }
    }, [activeTeamId]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            let url = '/api/projects';
            if (activeTeamId) {
                url += `?team_id=${activeTeamId}`;
            }

            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'X-Manager-Mode': isGuest ? 'true' : 'false'
                }
            });
            const data = await response.json();

            if (data.projects) {
                setProjects(data.projects.map(mapProjectFromDB));
            } else if (data.error) {
                console.error('Error fetching projects:', data.error);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const [importingAll, setImportingAll] = useState(false);

    const searchHubstaff = async (fetchAll: boolean = false, forceRefresh: boolean = false) => {
        if (!fetchAll && !hubstaffSearch.trim()) return;
        setIsSearching(true);
        try {
            let url = '/api/hubstaff/projects';
            if (forceRefresh) {
                url += '?refresh=true';
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                let filtered = data.projects;

                if (!fetchAll && hubstaffSearch.trim()) {
                    filtered = filtered.filter((p: any) =>
                        p.name.toLowerCase().includes(hubstaffSearch.toLowerCase())
                    );
                }
                setHubstaffProjects(filtered);
            }
        } catch (error) {
            console.error('Error searching Hubstaff:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const importAllProjects = async () => {
        setLastError(null);
        if (!confirm(`Are you sure you want to import ${hubstaffProjects.length} projects? This might take a moment.`)) return;

        if (!activeTeamId) {
            setLastError('Error: Team ID is missing. Please refresh the page.');
            return;
        }

        setImportingAll(true);
        let importedCount = 0;
        let failedCount = 0;
        let lastErrorMsg = '';

        try {
            for (const hp of hubstaffProjects) {
                // Skip if already imported
                const exists = projects.find(p => p.hubstaffId === hp.id || p.name === hp.name);
                if (exists) continue;

                const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: hp.name,
                        hubstaff_id: hp.id,
                        status: 'active',
                        description: hp.description || '',
                        team_id: activeTeamId
                    })
                });

                const result = await response.json();

                if (!response.ok || result.error) {
                    const errorMsg = result.error || 'Unknown error';
                    console.error(`Failed to import ${hp.name}:`, errorMsg);
                    lastErrorMsg = errorMsg;
                    failedCount++;
                } else {
                    importedCount++;
                }
            }

            await fetchProjects();

            if (failedCount > 0) {
                const msg = `Bulk import finished with errors.\nImported: ${importedCount}\nFailed: ${failedCount}\nLast Error: ${lastErrorMsg}`;
                setLastError(msg);
            } else if (importedCount === 0) {
                const msg = `No projects imported. All ${hubstaffProjects.length} projects already exist or skipped.`;
                alert(msg);
            } else {
                const msg = `Bulk import complete! Imported: ${importedCount}`;
                alert(msg);
            }
        } catch (error: any) {
            console.error('Error during bulk import:', error);
            const msg = `CRITICAL Error: ${error.message || JSON.stringify(error)}`;
            setLastError(msg);
        } finally {
            setImportingAll(false);
        }
    };

    const importProject = async (hubstaffProject: any) => {
        setLastError(null);
        if (!activeTeamId) {
            setLastError('Error: Team ID is missing.');
            return;
        }
        setImporting(hubstaffProject.id);
        try {
            // Check if already exists
            const exists = projects.find(p => p.hubstaffId === hubstaffProject.id || p.name === hubstaffProject.name);
            if (exists) {
                setLastError('Project already exists in database.');
                return;
            }

            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: hubstaffProject.name,
                    hubstaff_id: hubstaffProject.id,
                    status: 'active',
                    description: hubstaffProject.description || '',
                    team_id: activeTeamId
                })
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'Failed to import project');
            }

            await fetchProjects();
            alert('Project imported successfully!'); // Success can still be an alert
        } catch (error: any) {
            console.error('Error importing project:', error);
            setLastError(`Failed to import project: ${error.message || JSON.stringify(error)}`);
        } finally {
            setImporting(null);
        }
    };

    const createManualProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setLastError(null);
        if (!newProjectName.trim()) return;

        if (!activeTeamId) {
            setLastError('Error: Team ID is missing.');
            window.alert('Error: Team ID is missing.');
            return;
        }

        setCreating(true);
        try {
            // Check if already exists by name
            const exists = projects.find(p => p.name.toLowerCase() === newProjectName.trim().toLowerCase());
            if (exists) {
                setLastError('Project name already exists.');
                window.alert('Project name already exists.');
                return;
            }

            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProjectName.trim(),
                    status: 'active',
                    description: 'Manually created',
                    team_id: activeTeamId
                })
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'Failed to create project');
            }

            setNewProjectName('');
            await fetchProjects();
            setActiveTab('list');
            alert('Project created successfully!');
        } catch (error: any) {
            console.error('Error creating project:', error);
            const msg = `Failed to create project: ${error.message || JSON.stringify(error)}`;
            setLastError(msg);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Project Management</h1>
                    <p className="text-sm text-slate-500">Manage your project list from Hubstaff or manual entry</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`btn flex items-center gap-2 text-sm px-3 py-2 ${activeTab === 'import' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
                    >
                        <Globe size={16} /> Import from Hubstaff
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`btn flex items-center gap-2 text-sm px-3 py-2 ${activeTab === 'create' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
                    >
                        <Plus size={16} /> Create Manual
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`btn flex items-center gap-2 text-sm px-3 py-2 ${activeTab === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
                    >
                        <Database size={16} /> View All
                    </button>
                </div>
            </header>

            {/* ERROR DISPLAY */}
            {lastError && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl mb-4 text-sm text-red-800 flex justify-between items-center">
                    <div>
                        <p><strong>Error Occurred:</strong></p>
                        <p className="font-mono mt-1">{lastError}</p>
                    </div>
                    <button onClick={() => setLastError(null)} className="text-red-600 hover:text-red-900 font-bold px-3">
                        Dismiss
                    </button>
                </div>
            )}

            {/* LIST VIEW */}
            {activeTab === 'list' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-slate-700">All Projects ({projects.length})</h3>
                        <button onClick={fetchProjects} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                            <RefreshCw size={14} className="text-slate-500" />
                        </button>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-slate-500 text-sm">Loading projects...</div>
                    ) : projects.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No projects found in database. Import or create one.</div>
                    ) : (
                        <div className="overflow-x-auto max-h-[60vh]">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">Name</th>
                                        <th className="px-4 py-2">Source</th>
                                        <th className="px-4 py-2">Status</th>
                                        <th className="px-4 py-2">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.map((project) => (
                                        <tr key={project.id} className="bg-white border-b hover:bg-slate-50">
                                            <td className="px-4 py-2.5 font-medium text-slate-900">{project.name}</td>
                                            <td className="px-4 py-2.5">
                                                {project.hubstaffId ? (
                                                    <span className="inline-flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs font-medium">
                                                        <Globe size={12} /> Hubstaff
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-medium">
                                                        <Database size={12} /> Manual
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500 text-xs">{project.status}</td>
                                            <td className="px-4 py-2.5 text-slate-400 text-xs">
                                                {project.createdAt && !isNaN(new Date(project.createdAt).getTime())
                                                    ? new Date(project.createdAt).toLocaleDateString()
                                                    : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* IMPORT VIEW */}
            {activeTab === 'import' && (
                <div className="max-w-2xl mx-auto space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <Globe className="text-indigo-600" size={20} /> Import from Hubstaff
                        </h2>
                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={hubstaffSearch}
                                    onChange={(e) => setHubstaffSearch(e.target.value)}
                                    placeholder="Search Hubstaff projects..."
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && searchHubstaff()}
                                />
                            </div>
                            <button
                                onClick={() => searchHubstaff(false)}
                                disabled={isSearching || !hubstaffSearch.trim()}
                                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {isSearching ? 'Searching...' : 'Search'}
                            </button>
                            <button
                                onClick={() => searchHubstaff(true, true)}
                                disabled={isSearching}
                                className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-50 whitespace-nowrap"
                                title="Bypass cache and fetch latest projects from Hubstaff"
                            >
                                {isSearching ? 'Fetching...' : 'Fetch All'}
                            </button>
                        </div>

                        {hubstaffProjects.length > 0 && (
                            <div className="flex justify-end mb-3">
                                <button
                                    onClick={importAllProjects}
                                    disabled={importingAll}
                                    className="px-3 py-1.5 text-sm bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {importingAll ? <RefreshCw className="animate-spin" size={14} /> : <Database size={14} />}
                                    Import All ({hubstaffProjects.length})
                                </button>
                            </div>
                        )}

                        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                            {hubstaffProjects.map((hp) => {
                                const isImported = projects.some(p =>
                                    (p.hubstaffId && p.hubstaffId === hp.id) ||
                                    p.name.trim().toLowerCase() === hp.name.trim().toLowerCase()
                                );
                                return (
                                    <div key={hp.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm">{hp.name}</h4>
                                            <p className="text-xs text-slate-500">{hp.status}</p>
                                        </div>
                                        {isImported ? (
                                            <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs">
                                                <Check size={14} /> Imported
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => importProject(hp)}
                                                disabled={importing === hp.id}
                                                className="px-3 py-1.5 text-xs bg-white border border-indigo-200 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                                            >
                                                {importing === hp.id ? 'Importing...' : 'Import'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            {hubstaffProjects.length === 0 && !isSearching && hubstaffSearch && (
                                <p className="text-center text-slate-500 py-3 text-sm">No results found.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE VIEW */}
            {activeTab === 'create' && (
                <div className="max-w-xl mx-auto">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Plus className="text-emerald-600" size={20} /> Create Manual Project
                        </h2>
                        <form onSubmit={createManualProject} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Project Name</label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                                    placeholder="Enter project name..."
                                    required
                                />
                            </div>
                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full py-2.5 text-sm bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {creating ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
