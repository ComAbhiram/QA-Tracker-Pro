'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { mapTaskFromDB, Task, Leave } from '@/lib/types';
import { Search, Download, Calendar, Filter, FileSpreadsheet, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import AssigneeTaskTable from '@/components/AssigneeTaskTable';
import { useGuestMode } from '@/contexts/GuestContext';
import { useToast } from '@/contexts/ToastContext';
import { DatePicker } from '@/components/DatePicker';
import useColumnResizing from '@/hooks/useColumnResizing';
import { useTeams } from '@/hooks/useTeams';
import { getCurrentUserTeam } from '@/utils/userUtils';
import Loader from '@/components/ui/Loader';
import { useRouter } from 'next/navigation';
import ResizableHeader from '@/components/ui/ResizableHeader';

interface ProjectStatusPageProps {
    pageTitle: string;
    statusFilter: string | string[]; // Single status or array of statuses
    showAvailability?: boolean; // Whether to show availability/leaves header
    hideHeader?: boolean; // Whether to hide the page title/header section
}

interface TeamMember {
    id: number;
    name: string;
    display_order: number;
}

export default function ProjectStatusPage({ pageTitle, statusFilter, showAvailability = true, hideHeader = false }: ProjectStatusPageProps) {
    const { isGuest, selectedTeamId, isLoading: isGuestLoading } = useGuestMode();
    // ... (lines 32-342 remain unchanged)
    return (
        <div className="max-w-[1800px] mx-auto space-y-6 p-4 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            {!hideHeader && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{pageTitle}</h1>
                            <p className="text-slate-500 dark:text-slate-400">Manage and track {pageTitle.toLowerCase()}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-sm"
                        >
                            <FileSpreadsheet size={16} /> Export CSV
                        </button>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">

                {/* Search */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search projects, assignees, comments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>

                {/* Filters Group */}
                <div className="flex flex-wrap items-center gap-3">

                    {/* PC Filter */}
                    <div className="relative">
                        <select
                            value={pcFilter}
                            onChange={(e) => setPcFilter(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-w-[140px]"
                        >
                            <option value="All">All PCs</option>
                            {pcNames.map(pc => <option key={pc} value={pc}>{pc}</option>)}
                        </select>
                        <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                        <div className="flex items-center gap-2 px-2 border-r border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-semibold text-slate-500 uppercase">From</span>
                            <DatePicker
                                date={dateRange.start}
                                setDate={(d) => setDateRange(prev => ({ ...prev, start: d }))}
                                placeholder="Start Date"
                                className="border-none bg-transparent shadow-none text-sm p-0 w-24"
                            />
                        </div>
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase">To</span>
                            <DatePicker
                                date={dateRange.end}
                                setDate={(d) => setDateRange(prev => ({ ...prev, end: d }))}
                                placeholder="End Date"
                                className="border-none bg-transparent shadow-none text-sm p-0 w-24"
                            />
                        </div>
                        {(dateRange.start || dateRange.end) && (
                            <button
                                onClick={() => setDateRange({ start: undefined, end: undefined })}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full ml-1"
                                title="Clear Dates"
                            >
                                <Filter size={12} className="text-slate-500" />
                            </button>
                        )}
                    </div>

                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader size="lg" /></div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500">No {pageTitle.toLowerCase()} found matching your filters.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* STICKY HEADER for All Tables */}
                    <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-md border-b border-slate-200 dark:border-slate-700 mb-2 rounded-t-lg overflow-hidden transition-colors">
                        <table className="w-full text-xs text-slate-800 dark:text-slate-200 border-collapse table-fixed">
                            <colgroup>
                                <col style={{ width: columnWidths.projectName }} />
                                <col style={{ width: columnWidths.projectType }} />
                                <col style={{ width: columnWidths.priority }} />
                                <col style={{ width: columnWidths.subPhase }} />
                                <col style={{ width: columnWidths.pc }} />
                                <col style={{ width: columnWidths.status }} />
                                <col style={{ width: columnWidths.startDate }} />
                                <col style={{ width: columnWidths.endDate }} />
                                <col style={{ width: columnWidths.actualCompletionDate }} />
                                <col style={{ width: columnWidths.comments }} />
                                <col style={{ width: columnWidths.deviation }} />
                                <col style={{ width: columnWidths.sprint }} />
                            </colgroup>
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider backdrop-blur-md">
                                <tr>
                                    <ResizableHeader label="Project" widthKey="projectName" width={columnWidths.projectName} onResizeStart={startResizing} />
                                    <ResizableHeader label="Type" widthKey="projectType" width={columnWidths.projectType} onResizeStart={startResizing} />
                                    <ResizableHeader label="Priority" widthKey="priority" width={columnWidths.priority} onResizeStart={startResizing} />
                                    <ResizableHeader label="Phase" widthKey="subPhase" width={columnWidths.subPhase} onResizeStart={startResizing} />
                                    <ResizableHeader label="PC" widthKey="pc" width={columnWidths.pc} onResizeStart={startResizing} />
                                    <ResizableHeader label="Status" widthKey="status" width={columnWidths.status} onResizeStart={startResizing} />
                                    <ResizableHeader label="Start" widthKey="startDate" width={columnWidths.startDate} onResizeStart={startResizing} />
                                    <ResizableHeader label="End" widthKey="endDate" width={columnWidths.endDate} onResizeStart={startResizing} />
                                    <ResizableHeader label="Actual End" widthKey="actualCompletionDate" width={columnWidths.actualCompletionDate} onResizeStart={startResizing} />
                                    <ResizableHeader label="Comments" widthKey="comments" width={columnWidths.comments} isSortable={false} onResizeStart={startResizing} />
                                    <ResizableHeader label="Deviation" widthKey="deviation" width={columnWidths.deviation} onResizeStart={startResizing} />
                                    <ResizableHeader label="Sprint" widthKey="sprint" width={columnWidths.sprint} isSortable={false} onResizeStart={startResizing} />
                                </tr>
                            </thead>
                        </table>
                    </div>

                    {sortedAssignees.map(assignee => (
                        <AssigneeTaskTable
                            key={assignee}
                            assignee={assignee}
                            tasks={groupedTasks[assignee]}
                            leaves={leaves}
                            columnWidths={columnWidths}
                            hideHeader={true}
                            onEditTask={handleEditTask}
                            onFieldUpdate={handleFieldUpdate}
                            onResizeStart={startResizing}
                            // onLeaveUpdate={...} // Optional
                            selectedTeamId={selectedTeamId}
                        />
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                task={editingTask}
                onSave={saveTask}
                onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
            />

        </div>
    );
}

