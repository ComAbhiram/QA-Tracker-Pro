'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Users, Search, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Combobox from './ui/Combobox';
import { mapHubstaffNameToQA } from '@/lib/hubstaff-name-mapping';

interface ManageTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface TeamMember {
    id: number;
    team_id: string;
    name: string;
}

export default function ManageTeamModal({ isOpen, onClose }: ManageTeamModalProps) {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    // Add Member State
    const [hubstaffUsers, setHubstaffUsers] = useState<{ id: string; label: string }[]>([]);
    const [selectedHubstaffUser, setSelectedHubstaffUser] = useState<string | number | null>(null);
    const [customName, setCustomName] = useState('');
    const [activeTab, setActiveTab] = useState<'hubstaff' | 'manual'>('hubstaff');

    // Fetch team members
    const fetchMembers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .order('name');

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Hubstaff users for selection
    const fetchHubstaffUsers = async () => {
        try {
            const response = await fetch('/api/hubstaff/users');
            if (response.ok) {
                const data = await response.json();
                if (data.members) {
                    const formattedUsers = data.members.map((u: any) => ({
                        id: u.name,
                        label: u.name
                    }));
                    setHubstaffUsers(formattedUsers);
                }
            }
        } catch (error) {
            console.error('Error fetching Hubstaff users:', error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMembers();
            fetchHubstaffUsers();
        }
    }, [isOpen]);

    const handleAddMember = async () => {
        const nameToAdd = activeTab === 'hubstaff' ? String(selectedHubstaffUser) : customName;

        if (!nameToAdd || !nameToAdd.trim() || nameToAdd === 'null') {
            alert('Please select or enter a name.');
            return;
        }

        setAdding(true);
        try {
            const response = await fetch('/api/team-members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameToAdd })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add member');
            }

            // Refresh list
            await fetchMembers();

            // Reset inputs
            setSelectedHubstaffUser(null);
            setCustomName('');

        } catch (error: any) {
            alert(error.message);
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteMember = async (id: number) => {
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            const response = await fetch(`/api/team-members?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete');

            setMembers(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error(error);
            alert('Failed to remove member');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" /> Manage Team Members
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-6">

                    {/* Add Section */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                            <button
                                onClick={() => setActiveTab('hubstaff')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'hubstaff' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                From Hubstaff
                            </button>
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'manual' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Manual Entry
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1">
                                {activeTab === 'hubstaff' ? (
                                    <Combobox
                                        options={hubstaffUsers}
                                        value={selectedHubstaffUser || ''}
                                        onChange={setSelectedHubstaffUser}
                                        placeholder="Select Hubstaff User..."
                                        searchPlaceholder="Search Hubstaff..."
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={customName}
                                        onChange={(e) => setCustomName(e.target.value)}
                                        placeholder="Enter Name (e.g. John Doe)"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                                    />
                                )}
                            </div>
                            <button
                                onClick={handleAddMember}
                                disabled={adding}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                {adding ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* List Section */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Team Members ({members.length})</h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                            {loading ? (
                                <div className="text-center py-4 text-slate-400 text-sm">Loading members...</div>
                            ) : members.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Users size={24} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-sm text-slate-500">No members added yet.</p>
                                </div>
                            ) : (
                                members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{member.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMember(member.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Remove Member"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
