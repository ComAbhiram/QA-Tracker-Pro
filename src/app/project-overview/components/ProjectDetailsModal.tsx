'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface ProjectDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: {
        id: string;
        project_name: string;
        location: string | null;
        pc: string | null;
        allotted_time_days: number | null;
        tl_confirmed_effort_days: number | null;
        blockers: string | null;
        expected_effort_days: number | null;
        hubstaff_budget: string | null;
        committed_days: number | null;
        fixing_text: string | null;
        live_text: string | null;
        budget_text: string | null;
        started_date: string | null;
        project_type: string | null;
        category: string | null;
    } | null;
    onSave: (projectData: any) => Promise<void>;
}

export default function ProjectDetailsModal({ isOpen, onClose, project, onSave }: ProjectDetailsModalProps) {
    const [formData, setFormData] = useState({
        project_name: '',
        location: '',
        pc: '',
        allotted_time_days: '',
        tl_confirmed_effort_days: '',
        blockers: '',
        expected_effort_days: '',
        hubstaff_budget: '',
        committed_days: '',
        fixing_text: '',
        live_text: '',
        budget_text: '',
        started_date: '',
        project_type: '',
        category: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (project) {
            setFormData({
                project_name: project.project_name || '',
                location: project.location || '',
                pc: project.pc || '',
                allotted_time_days: project.allotted_time_days?.toString() || '',
                tl_confirmed_effort_days: project.tl_confirmed_effort_days?.toString() || '',
                blockers: project.blockers || '',
                expected_effort_days: project.expected_effort_days?.toString() || '',
                hubstaff_budget: project.hubstaff_budget || '',
                committed_days: project.committed_days?.toString() || '',
                fixing_text: project.fixing_text || '',
                live_text: project.live_text || '',
                budget_text: project.budget_text || '',
                started_date: project.started_date || '',
                project_type: project.project_type || '',
                category: project.category || ''
            });
        } else {
            setFormData({
                project_name: '',
                location: '',
                pc: '',
                allotted_time_days: '',
                tl_confirmed_effort_days: '',
                blockers: '',
                expected_effort_days: '',
                hubstaff_budget: '',
                committed_days: '',
                fixing_text: '',
                live_text: '',
                budget_text: '',
                started_date: '',
                project_type: '',
                category: ''
            });
        }
    }, [project, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await onSave({
                project_name: formData.project_name,
                location: formData.location || null,
                pc: formData.pc || null,
                allotted_time_days: formData.allotted_time_days ? parseFloat(formData.allotted_time_days) : null,
                tl_confirmed_effort_days: formData.tl_confirmed_effort_days ? parseFloat(formData.tl_confirmed_effort_days) : null,
                blockers: formData.blockers || null,
                expected_effort_days: formData.expected_effort_days ? parseFloat(formData.expected_effort_days) : null,
                hubstaff_budget: formData.hubstaff_budget || null,
                committed_days: formData.committed_days ? parseFloat(formData.committed_days) : null,
                fixing_text: formData.fixing_text || null,
                live_text: formData.live_text || null,
                budget_text: formData.budget_text || null,
                started_date: formData.started_date || null,
                project_type: formData.project_type || null,
                category: formData.category || null
            });
        } catch (error) {
            console.error('Error saving project:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {project ? 'Edit Project' : 'New Project'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {project ? 'Update project details and metrics' : 'Add a new project to track'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/80 rounded-lg transition-colors text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Project Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.project_name}
                                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                required
                                disabled={!!project}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter project name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Started Date</label>
                            <input
                                type="date"
                                value={formData.started_date}
                                onChange={(e) => setFormData({ ...formData, started_date: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Project Type</label>
                            <input
                                type="text"
                                value={formData.project_type}
                                onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                            <select
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="">Select location</option>
                                <option value="Dubai">Dubai</option>
                                <option value="Cochin">Cochin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">PC</label>
                            <input
                                type="text"
                                value={formData.pc}
                                onChange={(e) => setFormData({ ...formData, pc: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Effort & Budget */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Expected Effort (Days)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.expected_effort_days}
                                onChange={(e) => setFormData({ ...formData, expected_effort_days: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Allotted Time (Days)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.allotted_time_days}
                                onChange={(e) => setFormData({ ...formData, allotted_time_days: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">HS Budget</label>
                            <input
                                type="text"
                                value={formData.hubstaff_budget}
                                onChange={(e) => setFormData({ ...formData, hubstaff_budget: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Budget</label>
                            <input
                                type="text"
                                value={formData.budget_text}
                                onChange={(e) => setFormData({ ...formData, budget_text: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Committed</label>
                            <input
                                type="number"
                                value={formData.committed_days}
                                onChange={(e) => setFormData({ ...formData, committed_days: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Fixing</label>
                            <input
                                type="text"
                                value={formData.fixing_text}
                                onChange={(e) => setFormData({ ...formData, fixing_text: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Live</label>
                            <input
                                type="text"
                                value={formData.live_text}
                                onChange={(e) => setFormData({ ...formData, live_text: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Blockers</label>
                        <textarea
                            value={formData.blockers}
                            onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
                            placeholder="Describe any blockers..."
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.project_name}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                    >
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Project'}
                    </button>
                </div>
            </div>
        </div>
    );
}
