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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white/90 dark:bg-slate-950/75 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/60 dark:border-slate-800/60 transition-all duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40">
                    <div className="flex items-center gap-3">
                        {step !== 'SELECT_TEAM' && (
                            <button
                                onClick={() => setStep(step === 'RESULTS' ? 'SELECT_DATE' : 'SELECT_TEAM')}
                                className="p-1.5 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors hover:scale-105"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                            {step === 'SELECT_TEAM' && 'Select Team'}
                            {step === 'SELECT_DATE' && 'Check Availability'}
                            {step === 'RESULTS' && 'Available Resources'}
                        </h3>
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar bg-white/40 dark:bg-slate-900/10">

                    {/* STEP 1: SELECT TEAM */}
                    {step === 'SELECT_TEAM' && (
                        <div className="space-y-4">
                            {loadingTeams ? (
                                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                    <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                                    Loading teams...
                                </div>
                            ) : teams.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400">No teams found.</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {teams.map(team => (
                                        <button
                                            key={team.id}
                                            onClick={() => handleTeamSelect(team)}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-white/45 dark:bg-slate-900/30 backdrop-blur-md border border-slate-200/30 dark:border-slate-800/60 shadow-sm hover:scale-[1.02] hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-[0_10px_30px_rgba(245,158,11,0.08)] duration-200 transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-extrabold flex items-center justify-center shadow-md">
                                                    {team.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">{team.name}</span>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: SELECT DATE */}
                    {step === 'SELECT_DATE' && selectedTeam && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-6">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold text-amber-500 dark:text-amber-400 uppercase tracking-wider">Selected Team</p>
                                    <p className="font-extrabold text-slate-800 dark:text-slate-100">{selectedTeam.name}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Check availability for</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500" size={18} />
                                    <input
                                        type="date"
                                        value={checkDate}
                                        onChange={(e) => setCheckDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white/40 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 border border-slate-205/40 dark:border-slate-800 rounded-xl focus:outline-none glow-input transition-all shadow-sm focus:shadow-md"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCheckAvailability}
                                disabled={!checkDate || calculating}
                                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 dark:shadow-none hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 duration-205"
                            >
                                {calculating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Checking availability...
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
                        <div className="animate-in slide-in-from-bottom-4 duration-350">
                            <div className="flex items-center justify-between mb-5 bg-slate-50/50 dark:bg-slate-800/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                <div>
                                    <p className="text-xs text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">Available on</p>
                                    <p className="font-extrabold text-slate-800 dark:text-slate-200 text-base">{checkDate ? format(new Date(checkDate), 'MMM d, yyyy') : '-'}</p>
                                </div>
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold px-3 py-1.5 rounded-full border border-emerald-500/25 shadow-sm">
                                    {availableMembers.length} Available
                                </span>
                            </div>

                            {availableMembers.length > 0 ? (
                                <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                    {availableMembers.map(member => (
                                        <div key={member} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/40 dark:bg-slate-900/30 backdrop-blur-md border border-slate-200/30 dark:border-slate-800/60 shadow-sm hover:scale-[1.02] hover:-translate-y-0.5 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all duration-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                                                    {member.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{member}</span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Ready for assignment</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/10 px-2.5 py-1 rounded-lg">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                                                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Available</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/10 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-650">
                                        <User size={24} />
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 font-bold">No members available.</p>
                                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">All members are fully scheduled or on leave.</p>
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
                                <button
                                    onClick={() => setStep('SELECT_DATE')}
                                    className="w-full py-3.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-amber-500/20 dark:hover:border-amber-500/20 transition-all shadow-sm text-sm"
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
