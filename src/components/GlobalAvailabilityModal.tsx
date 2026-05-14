'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, Leave, mapTaskFromDB } from '@/lib/types';
import { calculateAvailability } from '@/lib/availability';
import { X, Calendar, Search, ChevronRight, User, Users, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import CloseButton from './ui/CloseButton';

interface Team {
    id: string;
    name: string;
}

interface GlobalAvailabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'SELECT_TEAM' | 'SELECT_DATE' | 'RESULTS';

export default function GlobalAvailabilityModal({ isOpen, onClose }: GlobalAvailabilityModalProps) {
    const [step, setStep] = useState<Step>('SELECT_TEAM');
    const [teams, setTeams] = useState<Team[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(false);

    // Selection State
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [checkDate, setCheckDate] = useState('');

    // Results State
    const [calculating, setCalculating] = useState(false);
    const [availableMembers, setAvailableMembers] = useState<string[]>([]);
    const [unavailableMembers, setUnavailableMembers] = useState<string[]>([]); // Optional: show busy ones too? logic says just available

    useEffect(() => {
        if (isOpen) {
            fetchTeams();
            // Reset state on open
            setStep('SELECT_TEAM');
            setSelectedTeam(null);
            setCheckDate('');
            setAvailableMembers([]);
        }
    }, [isOpen]);

    const fetchTeams = async () => {
        setLoadingTeams(true);
        try {
            // We can reuse the API or just fetch from supabase if we have access
            // Using API for consistency with SuperAdmin page
            const res = await fetch('/api/teams');
            const data = await res.json();
            if (data.teams) setTeams(data.teams);
        } catch (e) {
            console.error("Failed to fetch teams", e);
        } finally {
            setLoadingTeams(false);
        }
    };

    const handleTeamSelect = (team: Team) => {
        setSelectedTeam(team);
        setStep('SELECT_DATE');
    };

    const handleCheckAvailability = async () => {
        if (!selectedTeam || !checkDate) return;

        setCalculating(true);
        try {
            const targetDate = new Date(checkDate);
            targetDate.setHours(0, 0, 0, 0);

            // Fetch data via API to avoid RLS issues when checking other teams
            const res = await fetch(`/api/availability/data?team_id=${selectedTeam.id}`);

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch availability data');
            }

            const { tasks: tasksData, leaves: leavesData } = await res.json();

            const tasks: Task[] = (tasksData || []).map(mapTaskFromDB);
            const leaves: Leave[] = leavesData || [];

            // 3. Group tasks by assignee to calculate individual availability
            const groupedTasks = tasks.reduce((acc, task) => {
                const assignee = task.assignedTo || 'Unassigned';
                if (!acc[assignee]) acc[assignee] = [];
                acc[assignee].push(task);
                return acc;
            }, {} as Record<string, Task[]>);

            // 4. Identify all unique members
            const allMembers = new Set<string>();
            Object.keys(groupedTasks).forEach(m => {
                if (m) allMembers.add(m);
            });
            leaves.forEach(l => {
                if (l.team_member_name) allMembers.add(l.team_member_name);
            });

            const available: string[] = [];

            allMembers.forEach(member => {
                if (!member || member === 'Unassigned') return;

                const memberTasks = groupedTasks[member] || [];
                const memberLeaves = leaves.filter(l => l.team_member_name === member);

                const availableFrom = calculateAvailability(memberTasks, memberLeaves);
                availableFrom.setHours(0, 0, 0, 0);

                if (availableFrom <= targetDate) {
                    available.push(member);
                }
            });

            setAvailableMembers(available.sort());
            setStep('RESULTS');

        } catch (error: any) {
            console.error("Error calculating availability:", error);
            alert(`Failed to check availability: ${error.message || 'Unknown error'}`);
        } finally {
            setCalculating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        {step !== 'SELECT_TEAM' && (
                            <button
                                onClick={() => setStep(step === 'RESULTS' ? 'SELECT_DATE' : 'SELECT_TEAM')}
                                className="p-1.5 -ml-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h3 className="text-xl font-bold text-slate-800">
                            {step === 'SELECT_TEAM' && 'Select Team'}
                            {step === 'SELECT_DATE' && 'Check Availability'}
                            {step === 'RESULTS' && 'Available Resources'}
                        </h3>
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">

                    {/* STEP 1: SELECT TEAM */}
                    {step === 'SELECT_TEAM' && (
                        <div className="space-y-3">
                            {loadingTeams ? (
                                <div className="text-center py-8 text-slate-500">Loading teams...</div>
                            ) : teams.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">No teams found.</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {teams.map(team => (
                                        <button
                                            key={team.id}
                                            onClick={() => handleTeamSelect(team)}
                                            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md transition-all group text-left"
                                        >
                                            <span className="font-semibold text-slate-700 group-hover:text-indigo-700">{team.name}</span>
                                            <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: SELECT DATE */}
                    {step === 'SELECT_DATE' && selectedTeam && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100 mb-6">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Selected Team</p>
                                    <p className="font-bold text-indigo-900">{selectedTeam.name}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Check availability for</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        value={checkDate}
                                        onChange={(e) => setCheckDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCheckAvailability}
                                disabled={!checkDate || calculating}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {calculating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <Search size={18} />
                                        Find Available Members
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* STEP 3: RESULTS */}
                    {step === 'RESULTS' && selectedTeam && (
                        <div className="animate-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-slate-500">Available on</p>
                                    <p className="font-bold text-slate-800">{checkDate ? format(new Date(checkDate), 'MMM d, yyyy') : '-'}</p>
                                </div>
                                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                                    {availableMembers.length} Available
                                </span>
                            </div>

                            {availableMembers.length > 0 ? (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                    {availableMembers.map(member => (
                                        <div key={member} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
                                                {member.charAt(0)}
                                            </div>
                                            <span className="font-semibold text-slate-700">{member}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                        <User size={24} />
                                    </div>
                                    <p className="text-slate-600 font-medium">No members available.</p>
                                    <p className="text-slate-400 text-sm mt-1">Try selecting a later date.</p>
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => setStep('SELECT_DATE')}
                                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Check Another Date
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
