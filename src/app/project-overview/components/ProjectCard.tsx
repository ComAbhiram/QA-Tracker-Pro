'use client';

import { MapPin, Users, Activity, Clock, AlertCircle, Edit, Trash2, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface ProjectCardProps {
    project: {
        id: string;
        project_name: string;
        location: string | null;
        pc: string | null;
        allotted_time_days: number | null;
        tl_confirmed_effort_days: number | null;
        blockers: string | null;
        task_count: number;
        resources: string | null;
    };
    hubstaffData?: {
        hs_time_taken_days: number;
        activity_percentage: number;
        team_breakdown: {
            design_days: number;
            fe_dev_days: number;
            be_dev_days: number;
            testing_days: number;
        };
        member_activities: Array<{
            user_name: string;
            team: string;
            hours: number;
            activity_percentage: number;
        }>;
    };
    onEdit: () => void;
    onDelete: () => void;
}

export default function ProjectCard({ project, hubstaffData, onEdit, onDelete }: ProjectCardProps) {
    const [showActivityBreakdown, setShowActivityBreakdown] = useState(false);
    const [showTeamBreakdown, setShowTeamBreakdown] = useState(false);

    const deviation = project.allotted_time_days && hubstaffData
        ? project.allotted_time_days - hubstaffData.hs_time_taken_days
        : null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                        {project.project_name}
                    </h3>
                    {project.location && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                            <MapPin size={14} />
                            {project.location}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onEdit}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Resources */}
                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Users size={14} />
                        Resources
                    </div>
                    <p className="text-sm font-semibold text-slate-700 truncate">
                        {project.resources || 'None'}
                    </p>
                </div>

                {/* Activity % */}
                <div
                    className="bg-slate-50 rounded-lg p-3 cursor-pointer hover:bg-slate-100 transition-colors relative"
                    onMouseEnter={() => setShowActivityBreakdown(true)}
                    onMouseLeave={() => setShowActivityBreakdown(false)}
                >
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Activity size={14} />
                        Activity %
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                        {hubstaffData?.activity_percentage != null ? `${hubstaffData.activity_percentage}%` : '-'}
                    </p>

                    {/* Activity Breakdown Tooltip */}
                    {showActivityBreakdown && hubstaffData && hubstaffData.member_activities && hubstaffData.member_activities.length > 0 && (
                        <div className="absolute z-10 top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl p-3 min-w-[200px]">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Team Members</p>
                            {hubstaffData.member_activities.map((member, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-slate-600">{member.user_name}</span>
                                    <span className="font-semibold text-indigo-600">{member.activity_percentage}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PC */}
                {project.pc && (
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">PC</div>
                        <p className="text-sm font-semibold text-slate-700">{project.pc}</p>
                    </div>
                )}

                {/* HS Time Taken with Team Breakdown */}
                <div
                    className="bg-slate-50 rounded-lg p-3 cursor-pointer hover:bg-slate-100 transition-colors relative"
                    onMouseEnter={() => setShowTeamBreakdown(true)}
                    onMouseLeave={() => setShowTeamBreakdown(false)}
                >
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Clock size={14} />
                        HS Time (Days)
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                        {hubstaffData?.hs_time_taken_days != null ? hubstaffData.hs_time_taken_days.toFixed(2) : '-'}
                    </p>

                    {/* Team Breakdown Tooltip */}
                    {showTeamBreakdown && hubstaffData?.team_breakdown && (
                        <div className="absolute z-10 top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl p-3 min-w-[200px]">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Team Breakdown</p>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-purple-600">Design:</span>
                                    <span className="font-semibold">{hubstaffData.team_breakdown.design_days.toFixed(2)} days</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-blue-600">FE Dev:</span>
                                    <span className="font-semibold">{hubstaffData.team_breakdown.fe_dev_days.toFixed(2)} days</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-green-600">BE Dev:</span>
                                    <span className="font-semibold">{hubstaffData.team_breakdown.be_dev_days.toFixed(2)} days</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-orange-600">Testing:</span>
                                    <span className="font-semibold">{hubstaffData.team_breakdown.testing_days.toFixed(2)} days</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Time & Deviation */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Allotted</p>
                    <p className="text-lg font-bold text-slate-700">
                        {project.allotted_time_days?.toFixed(1) || '-'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Deviation</p>
                    <p className={`text-lg font-bold flex items-center justify-center gap-1 ${deviation === null ? 'text-slate-400' :
                        deviation > 0 ? 'text-green-600' :
                            deviation < 0 ? 'text-red-600' :
                                'text-slate-700'
                        }`}>
                        {deviation !== null && deviation !== 0 && (
                            <TrendingUp
                                size={16}
                                className={deviation > 0 ? 'rotate-0' : 'rotate-180'}
                            />
                        )}
                        {deviation !== null ? deviation.toFixed(1) : '-'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">TL Effort</p>
                    <p className="text-lg font-bold text-slate-700">
                        {project.tl_confirmed_effort_days?.toFixed(1) || '-'}
                    </p>
                </div>
            </div>

            {/* Blockers */}
            {project.blockers && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-red-700 font-semibold mb-1">
                        <AlertCircle size={14} />
                        Blockers
                    </div>
                    <p className="text-sm text-red-600">{project.blockers}</p>
                </div>
            )}
        </div>
    );
}
