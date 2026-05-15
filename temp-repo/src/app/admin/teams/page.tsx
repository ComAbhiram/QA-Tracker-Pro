'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Trash2, AlertCircle, Layers, Edit2, Shield, Mail } from 'lucide-react';
import SubPhasesModal from '@/components/SubPhasesModal';
import EditTeamModal from '@/components/EditTeamModal';
import { supabase } from '@/lib/supabase';

interface Team {
    id: string;
    name: string;
    created_at: string;
    adminEmail: string | null;
}

export default function TeamsManagement() {
    const router = useRouter();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        teamName: '',
        adminEmail: '',
        adminPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Sub-phases modal state
    const [showSubPhasesModal, setShowSubPhasesModal] = useState(false);
    const [selectedTeamForPhases, setSelectedTeamForPhases] = useState<Team | null>(null);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTeamForEdit, setSelectedTeamForEdit] = useState<Team | null>(null);

    useEffect(() => {
        checkAdmin();
    }, []);

    async function checkAdmin() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'super_admin') {
                router.push('/');
                return;
            }

            setIsAdmin(true);
            fetchTeams();
        } catch (err) {
            console.error('Admin check failed:', err);
            router.push('/');
        }
    }

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

    async function handleDeleteTeam(teamId: string, teamName: string) {
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
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6 sm:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Users className="text-indigo-600" size={32} />
                        Team Management
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Create and manage team accounts and sub-phases</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
                >
                    <Plus size={20} />
                    Create Team
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <span className="font-medium">{error}</span>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl font-medium animate-in slide-in-from-top-2">
                    {success}
                </div>
            )}

            {/* Teams Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">Team Name</th>
                                <th className="px-6 py-5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">Admin Email</th>
                                <th className="px-6 py-5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-5 text-center text-sm font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {teams.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={48} className="text-slate-200" />
                                            <p className="font-medium">No teams found. Create your first team to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                teams.map(team => (
                                    <tr key={team.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold shadow-sm">
                                                    {team.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-slate-800">{team.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                                                <Mail size={16} className="text-slate-400" />
                                                {team.adminEmail || <span className="text-slate-300 italic">Not set</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                                            {new Date(team.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedTeamForPhases(team);
                                                        setShowSubPhasesModal(true);
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all font-bold text-sm"
                                                    title="Manage Sub-Phases"
                                                >
                                                    <Layers size={16} />
                                                    Sub-Phases
                                                </button>
                                                <div className="w-px h-4 bg-slate-100 mx-1"></div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedTeamForEdit(team);
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Edit Team Account"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTeam(team.id, team.name)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete Team"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Plus size={24} className="text-indigo-600" /> Create Team
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Team Name</label>
                                <input
                                    type="text"
                                    value={formData.teamName}
                                    onChange={e => setFormData({ ...formData, teamName: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                                    placeholder="e.g. Frontend Team"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Admin Email</label>
                                <input
                                    type="email"
                                    value={formData.adminEmail}
                                    onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                                    placeholder="admin@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Admin Password</label>
                                <input
                                    type="password"
                                    value={formData.adminPassword}
                                    onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                                    placeholder="Min. 6 characters"
                                    minLength={6}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setFormData({ teamName: '', adminEmail: '', adminPassword: '' });
                                        setError('');
                                    }}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
                                >
                                    Create Team
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sub-Phases Modal */}
            {selectedTeamForPhases && (
                <SubPhasesModal
                    isOpen={showSubPhasesModal}
                    onClose={() => {
                        setShowSubPhasesModal(false);
                        setSelectedTeamForPhases(null);
                    }}
                    teamId={selectedTeamForPhases.id}
                    teamName={selectedTeamForPhases.name}
                />
            )}

            {/* Edit Team Modal */}
            <EditTeamModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedTeamForEdit(null);
                }}
                team={selectedTeamForEdit}
                onUpdate={fetchTeams}
            />
        </div>
    );
}
