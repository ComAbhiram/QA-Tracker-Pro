'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, Tag } from 'lucide-react';

interface LeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (leaveData: LeaveFormData) => Promise<void>;
}

export interface LeaveFormData {
    team_member_id: string;
    team_member_name: string;
    leave_date: string;
    leave_type: string;
    reason: string;
}

const LEAVE_TYPES = [
    'Full Day Casual Leave',
    'Full Day Sick Leave',
    'Unplanned Leave',
    'Half Day Morning Session Casual Leave',
    'Half Day Morning Session Sick Leave',
    'Half Day Afternoon Session Casual Leave',
    'Half Day Afternoon Session Sick Leave'
];

export default function LeaveModal({ isOpen, onClose, onSave }: LeaveModalProps) {
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
    const [fetchingMembers, setFetchingMembers] = useState(false);

    const [formData, setFormData] = useState<LeaveFormData>({
        team_member_id: '',
        team_member_name: '',
        leave_date: '',
        leave_type: '',
        reason: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchMembers();
        }
    }, [isOpen]);

    const fetchMembers = async () => {
        setFetchingMembers(true);
        try {
            const response = await fetch('/api/hubstaff/members');
            const data = await response.json();
            if (data.members) {
                setMembers(data.members);
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setFetchingMembers(false);
        }
    };

    const handleMemberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const selectedMember = members.find(m => m.id === selectedId);
        setFormData({
            ...formData,
            team_member_id: selectedId,
            team_member_name: selectedMember?.name || ''
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.team_member_id || !formData.leave_date || !formData.leave_type) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await onSave(formData);
            // Reset form
            setFormData({
                team_member_id: '',
                team_member_name: '',
                leave_date: '',
                leave_type: '',
                reason: ''
            });
            onClose();
        } catch (error) {
            console.error('Error saving leave:', error);
            alert('Failed to save leave request');
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
                        <h2 className="text-2xl font-bold text-slate-800">Add Leave Request</h2>
                        <p className="text-sm text-slate-500 mt-1">Submit a new leave request for a team member</p>
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

                    {/* Team Member Selection */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                            <User size={16} className="text-indigo-600" />
                            Team Member <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.team_member_id}
                            onChange={handleMemberChange}
                            required
                            disabled={fetchingMembers}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white disabled:bg-slate-100"
                        >
                            <option value="">
                                {fetchingMembers ? 'Loading members...' : 'Select team member'}
                            </option>
                            {members.map(member => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Leave Date */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                            <Calendar size={16} className="text-indigo-600" />
                            Leave Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={formData.leave_date}
                            onChange={(e) => setFormData({ ...formData, leave_date: e.target.value })}
                            required
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    {/* Leave Type */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                            <Tag size={16} className="text-indigo-600" />
                            Leave Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.leave_type}
                            onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                            required
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                        >
                            <option value="">Select leave type</option>
                            {LEAVE_TYPES.map(type => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                            <FileText size={16} className="text-indigo-600" />
                            Reason
                        </label>
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            rows={4}
                            placeholder="Enter reason for leave (optional)"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                        />
                    </div>

                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-700 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200"
                    >
                        {loading ? 'Saving...' : 'Submit Leave Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}
