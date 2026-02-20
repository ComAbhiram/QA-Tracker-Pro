'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Project, mapProjectFromDB } from '@/lib/types';
import { Plus, Search, Database, Globe, RefreshCw, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useGuestMode } from '@/contexts/GuestContext';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'import' | 'create'>('list');

    // List View State
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

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

    // Filtered Projects for List View
    const filteredProjects = useMemo(() => {
        return projects.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [projects, searchQuery]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    const paginatedProjects = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProjects.slice(start, start + itemsPerPage);
    }, [filteredProjects, currentPage]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const [importingAll, setImportingAll] = useState(false);

    const notImportedProjects = useMemo(() => {
        return hubstaffProjects.filter(hp =>
            !projects.some(p =>
                (p.hubstaffId && p.hubstaffId === hp.id) ||
                p.name.trim().toLowerCase() === hp.name.trim().toLowerCase()
            )
        );
    }, [hubstaffProjects, projects]);

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
        if (notImportedProjects.length === 0) return;

        if (!confirm(`Are you sure you want to import ${notImportedProjects.length} new projects? This might take a moment.`)) return;

        if (!activeTeamId) {
            setLastError('Error: Team ID is missing. Please refresh the page.');
            return;
        }

        setImportingAll(true);
        let importedCount = 0;
        let failedCount = 0;
        let lastErrorMsg = '';

        try {
            for (const hp of notImportedProjects) {
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
                const msg = `No new projects were imported.`;
                alert(msg);
            } else {
                const msg = `Bulk import complete! Imported: ${importedCount} new projects.`;
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
        <div className="w-full p-4 md:p-6 space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Project Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage your project list from Hubstaff or manual entry</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`btn btn-primary flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all ${activeTab === 'import' ? 'shadow-lg shadow-yellow-500/30' : 'opacity-80 hover:opacity-100'}`}
                    >
                        <Globe size={16} /> <span className="hidden sm:inline">Import from Hubstaff</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`btn btn-secondary flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all ${activeTab === 'create' ? 'shadow-lg border-indigo-500' : 'opacity-80 hover:opacity-100'}`}
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Create Manual</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`btn btn-info flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all ${activeTab === 'list' ? 'shadow-lg shadow-blue-500/30' : 'opacity-80 hover:opacity-100'}`}
                    >
                        <Database size={16} /> View All
                    </button>
                </div>
            </header>

            {/* ERROR DISPLAY */}
            {lastError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800 flex justify-between items-center shadow-sm">
                    <div>
                        <p className="font-bold">Error Occurred:</p>
                        <p className="font-mono mt-1">{lastError}</p>
                    </div>
                    <button onClick={() => setLastError(null)} className="text-red-600 hover:text-red-900 font-bold px-3 py-1 bg-red-100 rounded-md hover:bg-red-200 transition-colors">
                        Dismiss
                    </button>
                </div>
            )}

            {/* LIST VIEW */}
            {activeTab === 'list' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-full">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                All Projects ({filteredProjects.length})
                            </h3>
                            <button onClick={fetchProjects} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors" title="Refresh list">
                                <RefreshCw size={16} className={`text-slate-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white dark:bg-slate-900 dark:text-slate-200 transition-all"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="animate-spin text-indigo-500" size={32} />
                            <p>Loading projects...</p>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                            <Database size={48} className="text-slate-300 mb-2" />
                            <p className="text-lg font-medium text-slate-600">No projects found</p>
                            <p className="text-sm">{searchQuery ? 'Try adjusting your search terms' : 'Import or create a new project to get started'}</p>
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="mt-2 text-indigo-600 hover:underline">
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Name</th>
                                            <th className="px-6 py-4 font-semibold">Source</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                        {paginatedProjects.map((project) => (
                                            <tr key={project.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{project.name}</td>
                                                <td className="px-6 py-4">
                                                    {project.hubstaffId ? (
                                                        <span className="inline-flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-md text-xs font-medium border border-indigo-100 dark:border-indigo-800">
                                                            <Globe size={12} /> Hubstaff
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-md text-xs font-medium border border-emerald-100 dark:border-emerald-800">
                                                            <Database size={12} /> Manual
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${project.status === 'active'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                                                        }`}>
                                                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                                                    {project.createdAt && !isNaN(new Date(project.createdAt).getTime())
                                                        ? new Date(project.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                                        : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                        Showing <span className="font-medium text-slate-900 dark:text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, filteredProjects.length)}</span> of <span className="font-medium text-slate-900 dark:text-slate-200">{filteredProjects.length}</span> results
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-all text-slate-600 dark:text-slate-400"
                                            title="First Page"
                                        >
                                            <ChevronsLeft size={16} />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-all text-slate-600 dark:text-slate-400"
                                            title="Previous Page"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        <div className="flex items-center gap-1 px-2">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                // Simple logic to show a window of pages around current, 
                                                // but for now showing just first 5 or logic can be complex.
                                                // Let's use a simpler approach: Just show current / total
                                                return null;
                                            })}
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-all text-slate-600 dark:text-slate-400"
                                            title="Next Page"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-all text-slate-600 dark:text-slate-400"
                                            title="Last Page"
                                        >
                                            <ChevronsRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* IMPORT VIEW */}
            {activeTab === 'import' && (
                <div className="max-w-3xl mx-auto space-y-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <header className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <Globe className="text-indigo-600" size={24} /> Import from Hubstaff
                            </h2>
                            <button onClick={() => setActiveTab('list')} className="text-sm text-slate-500 hover:text-indigo-600">Back to List</button>
                        </header>

                        <div className="flex flex-col sm:flex-row gap-3 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={hubstaffSearch}
                                    onChange={(e) => setHubstaffSearch(e.target.value)}
                                    placeholder="Search Hubstaff projects..."
                                    className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none  dark:bg-slate-900 dark:text-slate-200"
                                    onKeyDown={(e) => e.key === 'Enter' && searchHubstaff()}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => searchHubstaff(false)}
                                    disabled={isSearching || !hubstaffSearch.trim()}
                                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
                                >
                                    {isSearching ? 'Searching...' : 'Search'}
                                </button>
                                <button
                                    onClick={() => searchHubstaff(true, true)}
                                    disabled={isSearching}
                                    className="px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 whitespace-nowrap text-sm"
                                    title="Bypass cache and fetch latest projects from Hubstaff"
                                >
                                    {isSearching ? 'Fetching...' : 'Fetch All'}
                                </button>
                            </div>
                        </div>

                        {notImportedProjects.length > 0 && (
                            <div className="flex justify-between items-center mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                                <span className="text-emerald-800 dark:text-emerald-300 font-medium text-sm">Found {notImportedProjects.length} new projects</span>
                                <button
                                    onClick={importAllProjects}
                                    disabled={importingAll}
                                    className="px-4 py-2 text-sm bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                >
                                    {importingAll ? <RefreshCw className="animate-spin" size={16} /> : <Database size={16} />}
                                    Import All
                                </button>
                            </div>
                        )}

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {hubstaffProjects.map((hp) => {
                                const isImported = projects.some(p =>
                                    (p.hubstaffId && p.hubstaffId === hp.id) ||
                                    p.name.trim().toLowerCase() === hp.name.trim().toLowerCase()
                                );
                                return (
                                    <div key={hp.id} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors bg-white dark:bg-slate-800/50">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{hp.name}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${hp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {hp.status}
                                                </span>
                                                {hp.description && <span className="text-xs text-slate-400 truncate max-w-[200px]">{hp.description}</span>}
                                            </div>
                                        </div>
                                        {isImported ? (
                                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg">
                                                <Check size={16} /> Imported
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => importProject(hp)}
                                                disabled={importing === hp.id}
                                                className="px-4 py-2 text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 shadow-sm"
                                            >
                                                {importing === hp.id ? 'Importing...' : 'Import'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            {hubstaffProjects.length === 0 && !isSearching && hubstaffSearch && (
                                <div className="text-center py-12 text-slate-400">
                                    <Globe size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>No projects matched your search.</p>
                                </div>
                            )}
                            {hubstaffProjects.length === 0 && !isSearching && !hubstaffSearch && (
                                <div className="text-center py-12 text-slate-400">
                                    <Search size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Search specifically or click "Fetch All" to see list.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE VIEW */}
            {activeTab === 'create' && (
                <div className="max-w-xl mx-auto">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
                        <header className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <Plus className="text-emerald-600" size={24} /> Create Manual Project
                            </h2>
                            <button onClick={() => setActiveTab('list')} className="text-sm text-slate-500 hover:text-indigo-600">Back to List</button>
                        </header>

                        <form onSubmit={createManualProject} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Project Name</label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm dark:bg-slate-900 dark:text-white transition-all"
                                    placeholder="Enter project name..."
                                    required
                                />
                                <p className="text-xs text-slate-400 mt-2">This project will be created locally and not linked to Hubstaff.</p>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full py-3 text-sm bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none transform active:scale-[0.99]"
                                >
                                    {creating ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
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
