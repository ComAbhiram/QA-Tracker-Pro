'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, User, Loader2 } from 'lucide-react';

interface PC {
    id: number;
    name: string;
    created_at: string;
}

interface PCManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PCManagementModal({ isOpen, onClose }: PCManagementModalProps) {
    const [pcs, setPcs] = useState<PC[]>([]);
    const [loading, setLoading] = useState(false);
    const [newPCName, setNewPCName] = useState('');
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchPCs();
        }
    }, [isOpen]);

    const fetchPCs = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/pcs');
            if (response.ok) {
                const data = await response.json();
                setPcs(data.pcs || []);
            } else {
                const data = await response.json();
                const errorMsg = data.error || 'Failed to load PCs';
                // Check if it's a database table error
                if (errorMsg.includes('relation') || errorMsg.includes('does not exist')) {
                    setError('Database table not found. Please run the create_global_pcs.sql migration script in Supabase.');
                } else {
                    setError(errorMsg);
                }
            }
        } catch (err) {
            console.error('Error fetching PCs:', err);
            setError('Failed to load PCs. The database table may not exist yet.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPC = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPCName.trim()) return;

        setAdding(true);
        setError('');
        try {
            const response = await fetch('/api/pcs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newPCName.trim() })
            });

            const data = await response.json();

            if (response.ok) {
                // Add the new PC directly to state instead of refetching
                if (data.pc) {
                    setPcs(prev => [...prev, data.pc].sort((a, b) => a.name.localeCompare(b.name)));
                }
                setNewPCName('');
            } else {
                setError(data.error || 'Failed to add PC');
            }
        } catch (err) {
            console.error('Error adding PC:', err);
            setError('Failed to add PC');
        } finally {
            setAdding(false);
        }
    };

    const handleDeletePC = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            return;
        }

        setDeleting(id);
        setError('');
        try {
            const response = await fetch(`/api/pcs?id=${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove PC directly from state instead of refetching
                setPcs(prev => prev.filter(pc => pc.id !== id));
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to delete PC');
            }
        } catch (err) {
            console.error('Error deleting PC:', err);
            setError('Failed to delete PC');
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
                        <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Manage Project Coordinators</h2>
                            <p className="text-sm text-slate-500 font-medium">Global PC list for all teams</p>
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

                    {/* Add PC Form */}
                    <form onSubmit={handleAddPC} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Add New PC</label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newPCName}
                                onChange={(e) => setNewPCName(e.target.value)}
                                placeholder="e.g., John Doe, Jane Smith..."
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
                            />
                            <button
                                type="submit"
                                disabled={adding || !newPCName.trim()}
                                className="px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {adding ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
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

                    {/* PCs List */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">
                            Project Coordinators ({pcs.length})
                        </h3>

                        {loading ? (
                            <div className="text-center py-8 text-slate-500">
                                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                                Loading PCs...
                            </div>
                        ) : pcs.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                                No PCs added yet. Add one above to get started.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {pcs.map((pc) => (
                                    <div
                                        key={pc.id}
                                        className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                                <User size={16} />
                                            </div>
                                            <span className="font-medium text-slate-800">{pc.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeletePC(pc.id, pc.name)}
                                            disabled={deleting === pc.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                        >
                                            {deleting === pc.id ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
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
