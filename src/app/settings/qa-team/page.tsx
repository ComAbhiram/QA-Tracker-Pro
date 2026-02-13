'use client';

import { useState, useEffect } from 'react';
import { Save, UserCog, Check } from 'lucide-react';
import Loader from '@/components/ui/Loader';

interface HubstaffUser {
    id: number;
    name: string;
}

interface QAMember {
    id?: number; // DB id
    name: string;
    hubstaffName: string;
    hubstaff_user_id?: number;
}

export default function QATeamSettings() {
    const [allHubstaffUsers, setAllHubstaffUsers] = useState<HubstaffUser[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<HubstaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all Hubstaff users
            const hubstaffRes = await fetch('/api/hubstaff/users');
            if (hubstaffRes.ok) {
                const data = await hubstaffRes.json();
                setAllHubstaffUsers(data.members || []);
            }

            // 2. Fetch currently saved QA members from DB
            const savedRes = await fetch('/api/settings/qa-members');
            if (savedRes.ok) {
                const data = await savedRes.json();
                // Map DB format to UI format
                // In DB we store `hubstaff_name` and `hubstaff_user_id`
                const saved = data.members.map((m: any) => ({
                    id: m.hubstaff_user_id || 0, // Fallback if old data
                    name: m.hubstaff_name // We use hubstaff name for matching
                }));
                setSelectedMembers(saved);
            }
        } catch (error) {
            console.error('Failed to load settings data', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMember = (user: HubstaffUser) => {
        setSelectedMembers(prev => {
            const exists = prev.find(m => m.name === user.name);
            if (exists) {
                return prev.filter(m => m.name !== user.name);
            }
            return [...prev, user];
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Prepare data for API
            // The API expects { name, hubstaffName, id }
            const payload = selectedMembers.map(m => ({
                name: m.name.split(' ')[0], // Simple first name derivation for display
                hubstaffName: m.name,
                id: m.id
            }));

            const response = await fetch('/api/settings/qa-members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ members: payload })
            });

            if (!response.ok) {
                throw new Error('Failed to save');
            }
            alert('QA Team selection saved successfully!');
        } catch (error) {
            alert('Error saving changes');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
                    <UserCog size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">QA Team Management</h1>
                    <p className="text-slate-500 font-medium">Select team members to include in QA reports</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Select Members</h2>
                        <p className="text-sm text-slate-500">Select the team members you want to appear in the report dropdown.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-indigo-50 text-indigo-600">
                            {selectedMembers.length} Selected
                        </span>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader size="xs" color="white" /> : <Save size={18} />}
                            Save Changes
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-slate-400">Loading Hubstaff users...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar p-1">
                        {allHubstaffUsers.map(user => {
                            const isSelected = selectedMembers.some(m => m.name === user.name);
                            return (
                                <button
                                    key={user.id}
                                    onClick={() => toggleMember(user)}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group text-left
                                        ${isSelected
                                            ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200'
                                            : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-md'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                            ${isSelected ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {user.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                            {user.name}
                                        </span>
                                    </div>
                                    {isSelected && <Check size={18} className="text-indigo-600" />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
