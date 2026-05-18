'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isValidProjectDate } from '@/lib/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, PlusCircle, User, Tag, FileText, Trash2 } from 'lucide-react';
import LeaveModal, { LeaveFormData } from '@/components/LeaveModal';
import { useGuestMode } from '@/contexts/GuestContext';
import TeamSelectorPill from '@/components/ui/TeamSelectorPill';
import { useTeams } from '@/hooks/useTeams';
import Loader from '@/components/ui/Loader';

interface Leave {
    id: number;
    team_member_id: string;
    team_member_name: string;
    leave_date: string;
    leave_type: string;
    reason: string | null;
    created_at: string;
}

export default function LeavePage() {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'day' | 'table'>('calendar');
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userTeamId, setUserTeamId] = useState<string | null>(null);
    const { isGuest, selectedTeamId, selectedTeamName, setGuestSession, isLoading: isGuestLoading, isPCMode, setPCModeSession } = useGuestMode();
    const { teams } = useTeams(isGuest);

    useEffect(() => {
        if (!isGuestLoading) {
            fetchCurrentUser();
        }
    }, [isGuestLoading]);

    // Separate effect to fetch leaves when team context is ready
    useEffect(() => {
        if (!isGuestLoading && (userTeamId || (isGuest && selectedTeamId))) {
            fetchLeaves();
        }
    }, [currentDate, viewMode, selectedTeamId, userTeamId, isGuestLoading]);

    async function fetchCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        console.log('[Leave] fetchCurrentUser - isGuest:', isGuest, 'user:', user?.id);

        // Fetch user's team_id for filtering
        if (user && !isGuest) {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('team_id')
                .eq('id', user.id)
                .single();
            console.log('[Leave] Fetched profile:', profile);
            if (profile) {
                setUserTeamId(profile.team_id);
                console.log('[Leave] Set userTeamId:', profile.team_id);
            }
        }
    }

    async function fetchLeaves() {
        setLoading(true);
        let start, end;

        if (viewMode === 'calendar') {
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
        } else {
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
        }

        console.log('[Leave] fetchLeaves - isGuest:', isGuest, 'selectedTeamId:', selectedTeamId, 'userTeamId:', userTeamId);

        try {
            let url = `/api/leaves?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`;

            // CRITICAL FIX: Always pass team_id to prevent cross-team data leakage
            if (isGuest && selectedTeamId) {
                url += `&team_id=${selectedTeamId}`;
                console.log('[Leave] Using selectedTeamId:', selectedTeamId);
            } else if (!isGuest && userTeamId) {
                url += `&team_id=${userTeamId}`;
                console.log('[Leave] Using userTeamId:', userTeamId);
            } else {
                console.error('[Leave] ⚠️ NO TEAM_ID! isGuest:', isGuest, 'selectedTeamId:', selectedTeamId, 'userTeamId:', userTeamId);
            }
            console.log('[Leave] Final URL:', url);

            const response = await fetch(url);
            const data = await response.json();

            // Filter out leaves with invalid dates to prevent crashes
            const validLeaves = (data.leaves || []).filter((l: any) => isValidProjectDate(l.leave_date));
            setLeaves(validLeaves);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveLeave = async (leaveData: LeaveFormData) => {
        try {
            const response = await fetch('/api/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...leaveData,
                    created_by: currentUser?.id,
                    team_id: isGuest ? selectedTeamId : undefined
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save leave');
            }

            await fetchLeaves();
        } catch (error: any) {
            console.error('Error saving leave:', error);
            alert(`Error: ${error.message}`);
            throw error;
        }
    };

    const handleDeleteLeave = async (leaveId: number) => {
        if (!confirm('Are you sure you want to delete this leave request?')) {
            return;
        }

        try {
            const response = await fetch(`/api/leaves?id=${leaveId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete leave');
            }

            await fetchLeaves();
        } catch (error) {
            console.error('Error deleting leave:', error);
            alert('Failed to delete leave request');
        }
    };

    const nextPeriod = () => {
        if (viewMode === 'calendar') {
            setCurrentDate(addMonths(currentDate, 1));
        } else {
            setCurrentDate(addDays(currentDate, 1));
        }
    };

    const prevPeriod = () => {
        if (viewMode === 'calendar') {
            setCurrentDate(subMonths(currentDate, 1));
        } else {
            setCurrentDate(subDays(currentDate, 1));
        }
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Calendar Grid Generation
    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });
    const startPadding = Array.from({ length: startOfMonth(currentDate).getDay() });

    // Day View Leaves
    const dayViewLeaves = leaves.filter(leave => {
        const leaveDate = new Date(leave.leave_date);
        const target = new Date(currentDate);
        leaveDate.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        return leaveDate.getTime() === target.getTime();
    });

    const getLeaveTypeColor = (type: string) => {
        const t = type.toLowerCase();
        // Unplanned leave - urgent red
        if (t.includes('unplanned')) return 'bg-rose-600 text-white border-rose-700';
        // Full day sick leave - red
        if (t.includes('full day sick')) return 'bg-red-600 text-white border-red-700';
        // Full day casual leave - blue
        if (t.includes('full day casual')) return 'bg-blue-600 text-white border-blue-700';
        // Half day sick leave - lighter red
        if (t.includes('half day') && t.includes('sick')) return 'bg-red-500 text-white border-red-600';
        // Half day casual leave - lighter blue
        if (t.includes('half day') && t.includes('casual')) return 'bg-blue-500 text-white border-blue-600';
        // Fallback
        return 'bg-slate-600 text-white border-slate-700';
    };

    const handleTeamSelect = (id: string, name: string) => {
        if (isPCMode) {
            setPCModeSession(id, name);
        } else {
            setGuestSession(id, name);
        }
        // Force reload to ensure context updates propogate clean - same as tracker/page.tsx
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    if (isGuestLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader size="lg" color="indigo" />
            </div>
        );
    }

    const getLeaveStyle = (type: string) => {
        const t = type.toLowerCase();
        // Unplanned / Full Day Sick -> Red
        if (t.includes('unplanned') || (t.includes('full day') && t.includes('sick'))) {
            return {
                badge: 'bg-rose-500/10 border-rose-500/30 text-rose-450 dark:text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
                card: 'border-l-4 border-l-rose-500 bg-rose-950/10 dark:bg-rose-950/5 hover:bg-rose-950/20 dark:hover:bg-rose-950/10 border-slate-200 dark:border-slate-800/80 shadow-[0_0_20px_rgba(244,63,94,0.03)]',
                node: 'bg-rose-500 ring-4 ring-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
            };
        }
        // Half Day Sick / Half Day Casual -> Amber
        if (t.includes('half day')) {
            return {
                badge: 'bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-450 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
                card: 'border-l-4 border-l-amber-500 bg-amber-950/10 dark:bg-amber-950/5 hover:bg-amber-950/20 dark:hover:bg-amber-950/10 border-slate-200 dark:border-slate-800/80 shadow-[0_0_20px_rgba(245,158,11,0.03)]',
                node: 'bg-amber-500 ring-4 ring-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
            };
        }
        // Full Day Casual / Fallback -> Blue
        return {
            badge: 'bg-blue-500/10 border-blue-500/30 text-blue-500 dark:text-blue-450 shadow-[0_0_10px_rgba(59,130,246,0.1)]',
            card: 'border-l-4 border-l-blue-500 bg-blue-950/10 dark:bg-blue-950/5 hover:bg-blue-950/20 dark:hover:bg-blue-950/10 border-slate-200 dark:border-slate-800/80 shadow-[0_0_20px_rgba(59,130,246,0.03)]',
            node: 'bg-blue-500 ring-4 ring-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
        };
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6">

            {/* Header Controls */}
            <header className="glass-card-premium p-6 rounded-2xl border border-white/20 dark:border-slate-800/80 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 tracking-tight">Leave Management</h1>
                        <p className="text-slate-400 mt-1 font-medium text-sm">Manage team member leave requests and view calendar</p>
                    </div>

                    {/* Manager Mode Team Selector */}
                    {isGuest && teams.length > 0 && (
                        <div className="flex-1 flex justify-start md:justify-end min-w-0 overflow-x-auto no-scrollbar md:ml-4">
                            <TeamSelectorPill
                                teams={teams}
                                selectedTeamName={selectedTeamName}
                                onSelect={handleTeamSelect}
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200/50 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        {/* Add Leave Button */}
                        <button
                            onClick={() => setIsLeaveModalOpen(true)}
                            className="glint-effect px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                            <PlusCircle size={18} />
                            Add Leave
                        </button>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                        {/* View Toggle */}
                        <div className="flex flex-wrap bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl transition-all w-full sm:w-auto border border-slate-200/30 dark:border-slate-800">
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-350 ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border-t border-white/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
                            >
                                <CalendarIcon size={16} /> Calendar
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-350 ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border-t border-white/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
                            >
                                <List size={16} /> Table
                            </button>
                            <button
                                onClick={() => setViewMode('day')}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-350 ${viewMode === 'day' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border-t border-white/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
                            >
                                <CalendarIcon size={16} /> Day View
                            </button>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <button onClick={prevPeriod} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-650 dark:text-slate-400 border border-slate-200 dark:border-slate-750 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all active:scale-90">
                                <ChevronLeft size={20} />
                            </button>
                            <div className="min-w-[180px] text-center font-extrabold text-lg text-slate-800 dark:text-slate-100 tracking-tight">
                                {viewMode === 'calendar' ? format(currentDate, 'MMMM yyyy') : format(currentDate, 'EEEE, MMM d, yyyy')}
                            </div>
                            <button onClick={nextPeriod} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-650 dark:text-slate-400 border border-slate-200 dark:border-slate-750 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all active:scale-90">
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <button onClick={goToToday} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-all duration-355">
                            Today
                        </button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className={`glass-card-premium rounded-2xl border border-white/20 dark:border-slate-800/80 backdrop-blur-xl transition-all ${viewMode === 'calendar' ? 'h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar' : 'min-h-[600px]'}`}>

                {viewMode === 'calendar' && (
                    <div className="min-h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b border-slate-200/50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850/40 sticky top-0 z-10 shadow-sm backdrop-blur-md">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-transparent">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-[minmax(160px,1fr)] flex-1">
                            {startPadding.map((_, i) => (
                                <div key={`empty-${i}`} className="bg-slate-50/10 dark:bg-slate-900/10 border-r border-b border-slate-200/40 dark:border-slate-800/40"></div>
                            ))}
                            {days.map(day => {
                                const dayLeaves = leaves.filter(leave => {
                                    const leaveDate = new Date(leave.leave_date);
                                    leaveDate.setHours(0, 0, 0, 0);
                                    const targetDay = new Date(day);
                                    targetDay.setHours(0, 0, 0, 0);
                                    return leaveDate.getTime() === targetDay.getTime();
                                });

                                return (
                                    <div
                                        key={day.toString()}
                                        onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                                        className={`border-r border-b border-slate-200/50 dark:border-slate-800/60 p-3 transition-all duration-250 ease-out hover:scale-105 hover:z-20 hover:shadow-[0_10px_35px_rgba(99,102,241,0.18)] hover:rounded-2xl cursor-pointer group relative flex flex-col min-h-[140px] backdrop-blur-md
                                            ${!isSameMonth(day, currentDate) ? 'bg-slate-50/10 dark:bg-slate-950/5 text-slate-400 dark:text-slate-650' : 'bg-white/10 dark:bg-slate-900/40'} 
                                            ${isToday(day) ? 'bg-indigo-50/10 dark:bg-indigo-950/15 border-2 border-indigo-500/50 dark:border-indigo-700/50 shadow-[inset_0_0_12px_rgba(99,102,241,0.12)]' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <span className={`text-xs font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isToday(day) ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-slate-700 dark:text-slate-350 group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:shadow-sm'}`}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar min-h-0">
                                            {dayLeaves.slice(0, 3).map(leave => {
                                                const style = getLeaveStyle(leave.leave_type);
                                                return (
                                                    <div key={leave.id} className={`group/item relative text-[10px] px-2 py-1.5 rounded-md border truncate font-bold mb-1 transition-all hover:scale-[1.02] ${getLeaveTypeColor(leave.leave_type)} cursor-help`}>
                                                        {leave.team_member_name}

                                                        {/* Hover Popup */}
                                                        <div className={`absolute top-1 z-50 opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-300 delay-150 transform scale-95 group-hover/item:scale-100 pointer-events-none group-hover/item:pointer-events-auto ${day.getDay() >= 4 ? 'right-[104%] origin-top-right' : 'left-[104%] origin-top-left'} w-64`}>
                                                            <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(99,102,241,0.15)] border border-slate-200/60 dark:border-slate-800/80 p-4 flex flex-col gap-2 text-left">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/20 flex items-center justify-center text-xs font-black text-indigo-550 dark:text-indigo-400">
                                                                        {leave.team_member_name.charAt(0)}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate leading-tight">{leave.team_member_name}</div>
                                                                        <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{format(new Date(leave.leave_date), 'EEE, MMM d, yyyy')}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="border-t border-slate-100/50 dark:border-slate-800/40 my-1"></div>
                                                                <span className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-[9px] font-bold border ${style.badge}`}>
                                                                    {leave.leave_type}
                                                                </span>
                                                                {leave.reason && (
                                                                    <div className="text-[10px] text-slate-650 dark:text-slate-400 italic bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60 mt-1">
                                                                        "{leave.reason}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {dayLeaves.length > 3 && (
                                                <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold pl-1">+{dayLeaves.length - 3} more</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewMode === 'day' && (
                    <div className="p-8">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h2 className="text-2xl font-extrabold text-slate-855 dark:text-slate-100 tracking-tight">Leaves for {format(currentDate, 'MMMM d')}</h2>
                                <p className="text-slate-400 mt-0.5 text-sm font-medium">{dayViewLeaves.length} leave request(s)</p>
                            </div>
                        </div>

                        {dayViewLeaves.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
                                <div className="w-16 h-16 bg-slate-100/10 dark:bg-slate-800/40 rounded-full flex items-center justify-center mb-4 text-3xl">📅</div>
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">No leaves scheduled for this day</p>
                                <p className="text-sm text-slate-500">All team members are available</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {dayViewLeaves.map(leave => {
                                    const style = getLeaveStyle(leave.leave_type);
                                    return (
                                        <div
                                            key={leave.id}
                                            className={`rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative border ${style.card} group`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${style.badge}`}>
                                                    {leave.leave_type}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteLeave(leave.id)}
                                                    className="p-1.5 bg-white/10 hover:bg-red-500/20 hover:text-red-500 dark:text-slate-450 dark:hover:text-red-400 rounded-lg transition-colors text-white"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <h3 className="font-extrabold text-xl text-slate-800 dark:text-slate-100 mb-1">{leave.team_member_name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-bold">{format(new Date(leave.leave_date), 'EEEE, MMMM d, yyyy')}</p>

                                            {leave.reason && (
                                                <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/80">
                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-500 mb-1">Reason:</p>
                                                    <p className="text-sm text-slate-650 dark:text-slate-300 italic font-medium">"{leave.reason}"</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'table' && (
                    <div className="space-y-10 p-6 md:p-8">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Loader size="lg" color="indigo" />
                            </div>
                        ) : leaves.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                                <div className="w-16 h-16 bg-slate-105/10 dark:bg-slate-800/40 rounded-full flex items-center justify-center mb-4 text-3xl">
                                    📅
                                </div>
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">No leaves found</p>
                                <p className="text-sm text-slate-500">Add a leave request to get started</p>
                            </div>
                        ) : (
                            // Group leaves by Month and Year
                            (Object.entries(
                                leaves
                                    .sort((a: Leave, b: Leave) => new Date(b.leave_date).getTime() - new Date(a.leave_date).getTime())
                                    .reduce((acc: Record<string, Leave[]>, leave: Leave) => {
                                        const date = new Date(leave.leave_date);
                                        const key = format(date, 'MMMM yyyy');
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(leave);
                                        return acc;
                                    }, {} as Record<string, Leave[]>)
                            ) as [string, Leave[]][]).map(([monthYear, monthLeaves]) => (
                                <div key={monthYear} className="space-y-6">
                                    {/* Month/Year section title */}
                                    <div className="flex items-center gap-4">
                                        <h3 className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 tracking-tight">{monthYear}</h3>
                                        <div className="flex-1 h-px bg-gradient-to-r from-slate-200/50 dark:from-slate-800/80 to-transparent"></div>
                                        <span className="text-xs font-bold text-indigo-455 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                                            {monthLeaves.length} {monthLeaves.length === 1 ? 'Leave' : 'Leaves'}
                                        </span>
                                    </div>

                                    {/* Beautiful vertical timeline container */}
                                    <div className="relative pl-8 md:pl-10 space-y-6">
                                        {/* Vertical Timeline Thread */}
                                        <div className="absolute left-[15px] md:left-[19px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-indigo-500/30 via-slate-200/40 dark:via-slate-800/40 to-slate-200/10 dark:to-slate-850/10"></div>

                                        {monthLeaves.map((leave) => {
                                            const style = getLeaveStyle(leave.leave_type);
                                            const leaveDate = new Date(leave.leave_date);
                                            
                                            return (
                                                <div key={leave.id} className="relative flex flex-col md:flex-row items-start gap-4 group">
                                                    {/* Node Point */}
                                                    <div className={`absolute left-[-21px] md:left-[-15px] top-3.5 w-3 h-3 rounded-full ${style.node} z-10 transition-transform duration-300 group-hover:scale-125`}></div>

                                                    {/* Compact Left Column: Date */}
                                                    <div className="flex flex-row md:flex-col items-center gap-1.5 min-w-[70px] pt-1.5">
                                                        <span className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                                                            {format(leaveDate, 'dd')}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                                                            {format(leaveDate, 'EEE')}
                                                        </span>
                                                    </div>

                                                    {/* Chronological Card */}
                                                    <div className={`flex-1 glass-card-premium rounded-2xl p-5 border ${style.card} transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 group/card`}>
                                                        <div className="flex items-center gap-4 flex-1">
                                                            {/* User Avatar Monogram */}
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border-2 border-white dark:border-slate-800 flex items-center justify-center text-sm font-extrabold text-indigo-450 dark:text-indigo-400 shadow-md">
                                                                {leave.team_member_name.charAt(0)}
                                                            </div>
                                                            <div className="space-y-1 min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-200 truncate">
                                                                        {leave.team_member_name}
                                                                    </h4>
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${style.badge}`}>
                                                                        {leave.leave_type}
                                                                    </span>
                                                                </div>
                                                                {leave.reason ? (
                                                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic max-w-xl">
                                                                        "{leave.reason}"
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-xs text-slate-400 dark:text-slate-600 italic">No reason provided</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions Column */}
                                                        <div className="flex items-center justify-end gap-2 shrink-0 self-end md:self-auto">
                                                            <button
                                                                onClick={() => handleDeleteLeave(leave.id)}
                                                                className="p-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-450 hover:text-red-550 dark:text-slate-400 dark:hover:text-red-400 rounded-xl border border-slate-200/50 dark:border-slate-800/80 hover:border-red-500/30 transition-all duration-300 active:scale-95"
                                                                title="Delete Leave Request"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>

            <LeaveModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                onSave={handleSaveLeave}
            />
        </div>
    );
}
