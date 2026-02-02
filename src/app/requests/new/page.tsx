'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, PlusCircle, User, Tag, FileText, Trash2 } from 'lucide-react';
import LeaveModal, { LeaveFormData } from '@/components/LeaveModal';

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
    const [viewMode, setViewMode] = useState<'calendar' | 'day'>('calendar');
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        fetchCurrentUser();
        fetchLeaves();
    }, [currentDate, viewMode]);

    async function fetchCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
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

        try {
            const response = await fetch(
                `/api/leaves?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`
            );
            const data = await response.json();
            setLeaves(data.leaves || []);
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
                    created_by: currentUser?.id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save leave');
            }

            await fetchLeaves();
        } catch (error) {
            console.error('Error saving leave:', error);
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

    return (
        <div className="max-w-[1600px] mx-auto space-y-6">

            {/* Header Controls */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Leave Management</h1>
                    <p className="text-slate-500">Manage team member leave requests and view calendar</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Add Leave Button */}
                    <button
                        onClick={() => setIsLeaveModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        <PlusCircle size={18} />
                        Add Leave
                    </button>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CalendarIcon size={16} /> Calendar
                        </button>
                        <button
                            onClick={() => setViewMode('day')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List size={16} /> Day View
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        <button onClick={prevPeriod} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 border border-slate-200 hover:border-indigo-300 transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="min-w-[180px] text-center font-bold text-lg text-slate-800">
                            {viewMode === 'calendar' ? format(currentDate, 'MMMM yyyy') : format(currentDate, 'EEEE, MMM d, yyyy')}
                        </div>
                        <button onClick={nextPeriod} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 border border-slate-200 hover:border-indigo-300 transition-all">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <button onClick={goToToday} className="text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                        Today
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className={`bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-white/20 backdrop-blur-xl ${viewMode === 'calendar' ? 'h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar' : 'min-h-[600px]'}`}>

                {viewMode === 'calendar' && (
                    <div className="min-h-full flex flex-col">
                        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10 shadow-sm">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider backdrop-blur-md bg-slate-50/90">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-[minmax(160px,1fr)] flex-1">
                            {startPadding.map((_, i) => (
                                <div key={`empty-${i}`} className="bg-slate-50/30 border-r border-b border-slate-100"></div>
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
                                        className={`border-r border-b border-slate-100 p-2 transition-all hover:bg-indigo-50/50 cursor-pointer group relative flex flex-col
                                            ${!isSameMonth(day, currentDate) ? 'bg-slate-50/50 text-slate-400' : ''} 
                                            ${isToday(day) ? 'bg-blue-50/30' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isToday(day) ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-700 group-hover:bg-white group-hover:shadow-sm'}`}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                            {dayLeaves.slice(0, 3).map(leave => (
                                                <div key={leave.id} className={`text-[11px] px-2 py-1.5 rounded-md border truncate font-semibold mb-1 transition-all hover:scale-[1.02] ${getLeaveTypeColor(leave.leave_type)}`}>
                                                    {leave.team_member_name}
                                                </div>
                                            ))}
                                            {dayLeaves.length > 3 && (
                                                <div className="text-[10px] text-slate-400 font-medium pl-1">+{dayLeaves.length - 3} more</div>
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
                                <h2 className="text-xl font-bold text-slate-800">Leaves for {format(currentDate, 'MMMM d')}</h2>
                                <p className="text-slate-500">{dayViewLeaves.length} leave request(s)</p>
                            </div>
                        </div>

                        {dayViewLeaves.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl">📅</div>
                                <p className="text-lg font-medium text-slate-600">No leaves scheduled for this day</p>
                                <p className="text-sm">All team members are available</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {dayViewLeaves.map(leave => (
                                    <div
                                        key={leave.id}
                                        className={`rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative border ${getLeaveTypeColor(leave.leave_type)}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-black/20 text-white">
                                                {leave.leave_type}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteLeave(leave.id)}
                                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <h3 className="font-bold text-xl text-white mb-1">{leave.team_member_name}</h3>
                                        <p className="text-sm text-white/80 mb-4 font-medium">{format(new Date(leave.leave_date), 'EEEE, MMMM d, yyyy')}</p>

                                        {leave.reason && (
                                            <div className="pt-4 border-t border-white/20">
                                                <p className="text-xs font-semibold text-white/70 mb-1">Reason:</p>
                                                <p className="text-sm text-white/90">{leave.reason}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
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
