'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, ClipboardList, RefreshCw, ChevronDown, ChevronUp, Search } from 'lucide-react';
import Loader from '@/components/ui/Loader';

interface ChecklistItem {
    id: string;
    title: string;
}

interface SummaryRow {
    projectName: string;
    assignedChecklists: ChecklistItem[];
    passedCount: number;
    pendingCount: number;
    passed: ChecklistItem[];
    pending: ChecklistItem[];
}

export default function ChecklistStatusPage() {
    const [summary, setSummary] = useState<SummaryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/checklist-status/summary');
            const data = await res.json();
            setSummary(data.summary || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    const filtered = summary.filter(r =>
        r.projectName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="w-full p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <ClipboardList className="text-indigo-500" size={32} />
                        Checklist Status
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Track project checklist completion across all teams.
                    </p>
                </div>
                <button
                    onClick={fetchSummary}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Overview */}
            {!loading && summary.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Projects with Checklists</p>
                        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{summary.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Passed</p>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                            {summary.reduce((sum, r) => sum + r.passedCount, 0)}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Pending</p>
                        <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                            {summary.reduce((sum, r) => sum + r.pendingCount, 0)}
                        </p>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100 transition-all"
                />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <Loader size="lg" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 text-center text-slate-400">
                        <ClipboardList size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium">
                            {search ? 'No matching projects found.' : 'No checklists have been assigned to any project yet.'}
                        </p>
                        <p className="text-sm mt-1">Visit the Checklists page to assign checklists to projects.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Checklists Assigned</th>
                                <th className="px-6 py-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                    <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Passed</span>
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                    <span className="flex items-center gap-1.5"><Clock size={14} /> Pending</span>
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progress</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filtered.map(row => {
                                const total = row.assignedChecklists.length;
                                const pct = total > 0 ? Math.round((row.passedCount / total) * 100) : 0;
                                const isExpanded = expandedRow === row.projectName;

                                return (
                                    <>
                                        <tr
                                            key={row.projectName}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                                            onClick={() => setExpandedRow(isExpanded ? null : row.projectName)}
                                        >
                                            <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                                                {row.projectName}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full text-xs font-semibold">
                                                    {total} items
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full text-xs font-bold">
                                                    <CheckCircle2 size={12} />
                                                    {row.passedCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full text-xs font-bold">
                                                    <Clock size={12} />
                                                    {row.pendingCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 w-40">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-10 text-right">{pct}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </td>
                                        </tr>

                                        {/* Expanded Detail Row */}
                                        {isExpanded && (
                                            <tr key={`${row.projectName}-detail`} className="bg-slate-50/50 dark:bg-slate-800/20">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {row.passed.length > 0 && (
                                                            <div>
                                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">✅ Passed</p>
                                                                <ul className="space-y-1.5">
                                                                    {row.passed.map(c => (
                                                                        <li key={c.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                                            <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                                            {c.title}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {row.pending.length > 0 && (
                                                            <div>
                                                                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">⏳ Pending</p>
                                                                <ul className="space-y-1.5">
                                                                    {row.pending.map(c => (
                                                                        <li key={c.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                                            <Clock size={14} className="text-amber-500 flex-shrink-0" />
                                                                            {c.title}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
