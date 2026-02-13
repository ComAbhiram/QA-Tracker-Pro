'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Layers } from 'lucide-react';
import Loader from './ui/Loader';

interface SubPhase {
    id: number;
    team_id: string;
    name: string;
    created_at: string;
}

interface SubPhasesModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string;
    teamName: string;
}

export default function SubPhasesModal({ isOpen, onClose, teamId, teamName }: SubPhasesModalProps) {
    const [subPhases, setSubPhases] = useState<SubPhase[]>([]);
    const [loading, setLoading] = useState(false);
    const [newPhaseName, setNewPhaseName] = useState('');
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchSubPhases();
        }
    }, [isOpen, teamId]);

    const fetchSubPhases = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/subphases?team_id=${teamId}`);
            if (response.ok) {
                const data = await response.json();
                setSubPhases(data.subphases || []);
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to load sub-phases');
            }
        } catch (err) {
            console.error('Error fetching sub-phases:', err);
            setError('Failed to load sub-phases');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubPhase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPhaseName.trim()) return;

        setAdding(true);
        setError('');
        try {
            const response = await fetch('/api/subphases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_id: teamId,
                    name: newPhaseName.trim()
                })
            });

            const data = await response.json();

            if (response.ok) {
                setNewPhaseName('');
                await fetchSubPhases();
            } else {
                setError(data.error || 'Failed to add sub-phase');
            }
        } catch (err) {
            console.error('Error adding sub-phase:', err);
            setError('Failed to add sub-phase');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteSubPhase = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            return;
        }

        setDeleting(id);
        setError('');
        try {
            const response = await fetch(`/api/subphases?id=${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchSubPhases();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to delete sub-phase');
            }
        } catch (err) {
            console.error('Error deleting sub-phase:', err);
            setError('Failed to delete sub-phase');
        } finally {
            setDeleting(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
                            <Layers size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Manage Sub-Phases</h2>
                            <p className="text-sm text-slate-500 font-medium">Team: {teamName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2.5 rounded-full transition-all duration-200"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-120px)] custom-scrollbar">

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Add Sub-Phase Form */}
                    <form onSubmit={handleAddSubPhase} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Add New Sub-Phase</label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newPhaseName}
                                onChange={(e) => setNewPhaseName(e.target.value)}
                                placeholder="e.g., Smoke Test, Dev Test, Before Live..."
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
                            />
                            <button
                                type="submit"
                                disabled={adding || !newPhaseName.trim()}
                                className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {adding ? (
                                    <>
                                        <Loader size="xs" color="white" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={18} />
                                        Add
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Sub-Phases List */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">
                            Current Sub-Phases ({subPhases.length})
                        </h3>

                        {loading ? (
                            <div className="text-center py-8 text-slate-500">
                                <div className="flex justify-center mb-2"><Loader size="md" /></div>
                                Loading sub-phases...
                            </div>
                        ) : subPhases.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                                No sub-phases created yet. Add one above to get started.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {subPhases.map((phase) => (
                                    <div
                                        key={phase.id}
                                        className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                <Layers size={16} />
                                            </div>
                                            <span className="font-medium text-slate-800">{phase.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSubPhase(phase.id, phase.name)}
                                            disabled={deleting === phase.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                        >
                                            {deleting === phase.id ? (
                                                <>
                                                    <Loader size="xs" color="#dc2626" />
                                                    Deleting...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 size={16} />
                                                    Delete
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
