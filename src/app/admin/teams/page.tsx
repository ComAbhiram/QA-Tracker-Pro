'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, AlertCircle } from 'lucide-react';

interface Team {
    id: number;
    name: string;
    created_at: string;
}

export default function TeamsManagement() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        teamName: '',
        adminEmail: '',
        adminPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchTeams();
    }, []);

    async function fetchTeams() {
        try {
            const response = await fetch('/api/teams');
            if (response.ok) {
                const data = await response.json();
                setTeams(data.teams || []);
            }
        } catch (err) {
            console.error('Error fetching teams:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateTeam(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create team');
            }

            setSuccess(data.message);
            setFormData({ teamName: '', adminEmail: '', adminPassword: '' });
            setShowCreateModal(false);
            fetchTeams();
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function handleDeleteTeam(teamId: number, teamName: string) {
        if (!confirm(`Are you sure you want to delete "${teamName}"? This will remove all associated users and data.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/teams?id=${teamId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete team');
            }

            setSuccess(data.message);
            fetchTeams();
        } catch (err: any) {
            setError(err.message);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-slate-500">Loading teams...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Team Management</h1>
                    <p className="text-slate-500 mt-1">Create and manage teams and their admin users</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    Create Team
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}

            {/* Teams Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600">Team Name</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600">Created</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                                        No teams found. Create your first team to get started.
                                    </td>
                                </tr>
                            ) : (
                                teams.map(team => (
                                    <tr key={team.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-2">
                                            <Users size={18} className="text-sky-500" />
                                            {team.name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(team.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleDeleteTeam(team.id, team.name)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Team Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Create New Team</h2>
                        <form onSubmit={handleCreateTeam} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Team Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.teamName}
                                    onChange={e => setFormData({ ...formData, teamName: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    placeholder="e.g., Frontend Developer"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Admin Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.adminEmail}
                                    onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    placeholder="admin@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Admin Password
                                </label>
                                <input
                                    type="password"
                                    value={formData.adminPassword}
                                    onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    placeholder="Minimum 6 characters"
                                    minLength={6}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setFormData({ teamName: '', adminEmail: '', adminPassword: '' });
                                        setError('');
                                    }}
                                    className="flex-1 px-4 py-2 border border-slate-400 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                                >
                                    Create Team
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
