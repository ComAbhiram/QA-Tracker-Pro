'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Users, Plus, Shield, Loader2, Building, Layers, User } from 'lucide-react';
import PCManagementModal from '@/components/PCManagementModal';

interface Team {
    id: string;
    name: string;
    created_at: string;
}

export default function AdminDashboard() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTeamName, setNewTeamName] = useState('');
    const [creating, setCreating] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();
    const [showPCModal, setShowPCModal] = useState(false);

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // Check if user is super_admin
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'super_admin') {
                router.push('/'); // Redirect non-admins
                return;
            }

            setIsAdmin(true);
            fetchTeams();
        } catch (error) {
            console.error('Admin check failed:', error);
            router.push('/');
        }
    };

    const fetchTeams = async () => {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setTeams(data);
        setLoading(false);
    };

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;

        setCreating(true);
        try {
            const { error } = await supabase
                .from('teams')
                .insert([{ name: newTeamName }]);

            if (error) throw error;

            setNewTeamName('');
            fetchTeams();
            alert('Team created successfully!');
        } catch (error: any) {
            console.error('Error creating team:', error);
            alert('Failed to create team: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Super Admin Dashboard</h1>
                        <p className="text-slate-500 font-medium">Manage teams and organizations</p>
                    </div>
                </div>
                <button
                    onClick={() => router.push('/admin/teams')}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                    <Layers size={20} />
                    Manage Teams & Sub-Phases
                </button>
                <button
                    onClick={() => setShowPCModal(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                    <User size={20} />
                    Manage PCs
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Create Team Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-indigo-600" /> Create New Team
                    </h2>
                    <form onSubmit={handleCreateTeam} className="space-y-4">
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1 block">Team Name</label>
                            <input
                                type="text"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                placeholder="e.g. Marketing Team"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creating}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create Team'}
                        </button>
                    </form>
                </div>

                {/* Team List */}
                <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Building size={20} className="text-indigo-600" /> Active Teams
                    </h2>

                    <div className="space-y-3">
                        {teams.map(team => (
                            <div key={team.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{team.name}</h3>
                                        <p className="text-xs text-slate-400 font-mono">{team.id}</p>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-500">
                                    {new Date(team.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}

                        {teams.length === 0 && (
                            <div className="text-center py-10 text-slate-400">
                                No teams found. Create one to get started.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="font-bold text-blue-800 mb-2">How to add users?</h3>
                <p className="text-blue-700 text-sm mb-4">
                    Since this is a client-side dashboard, you cannot create Auth Users directly here.
                    Please follow these steps to add a new admin for a team:
                </p>
                <ol className="list-decimal list-inside text-sm text-blue-700 space-y-2">
                    <li>Create the Team using the form above.</li>
                    <li>Copy the <strong>Team ID</strong> (UUID) from the list.</li>
                    <li>Create the user manually in your Supabase Auth Dashboard.</li>
                    <li>In Supabase SQL Editor, run: <br />
                        <code className="bg-blue-100 px-2 py-1 rounded mt-1 inline-block select-all">
                            INSERT INTO user_profiles (id, email, full_name, role, team_id) VALUES ('NEW_USER_AUTH_ID', 'email@example.com', 'Name', 'team_admin', 'PASTE_TEAM_ID_HERE');
                        </code>
                    </li>
                </ol>
            </div>

            {/* PC Management Modal */}
            <PCManagementModal
                isOpen={showPCModal}
                onClose={() => setShowPCModal(false)}
            />
        </div>
    );
}
