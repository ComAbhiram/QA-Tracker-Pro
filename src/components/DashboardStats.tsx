import { Task } from '@/lib/types';
import { Layers, PlayCircle, Cloud, CheckCircle2, XCircle } from 'lucide-react';
import React from 'react';

interface DashboardStatsProps {
    tasks: Task[];
    onFilterChange: (type: string) => void;
    activeFilter: string;
}

export default function DashboardStats({ tasks, onFilterChange, activeFilter }: DashboardStatsProps) {
    const stats = {
        total: tasks.length,
        active: tasks.filter(t => ['In Progress', 'Being Developed', 'Ready for QA', 'Assigned to QA', 'Yet to Start', 'Forecast'].includes(t.status)).length,
        completed: tasks.filter(t => t.status === 'Completed').length,
        overdue: tasks.filter(t => {
            if (!t.endDate || isNaN(new Date(t.endDate).getTime())) return false;
            const end = new Date(t.endDate);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            return end < now && t.status !== 'Completed' && t.status !== 'Rejected';
        }).length
    };

    const cards = [
        {
            title: 'Total Projects',
            value: stats.total,
            filter: 'All',
            icon: <Layers size={22} />,
            style: {
                '--primary-clr': '#1e3a8a',
                '--accent-clr': '#3b82f6',  // Matte Blue
                '--dot-clr': '#60a5fa'      // Blue-400
            }
        },
        {
            title: 'Active Tasks',
            value: stats.active,
            filter: 'active',
            icon: <PlayCircle size={22} />,
            style: {
                '--primary-clr': '#14532d',
                '--accent-clr': '#22c55e',  // Matte Green
                '--dot-clr': '#a3e635'      // Lime-400
            }
        },
        {
            title: 'Forecast',
            value: tasks.filter(t => t.status === 'Forecast').length,
            filter: 'Forecast',
            icon: <Cloud size={22} />,
            style: {
                '--primary-clr': '#581c87',
                '--accent-clr': '#a855f7',  // Matte Purple
                '--dot-clr': '#c084fc'      // Purple-400
            }
        },
        {
            title: 'Completed',
            value: stats.completed,
            filter: 'Completed',
            icon: <CheckCircle2 size={22} />,
            style: {
                '--primary-clr': '#134e4a',
                '--accent-clr': '#14b8a6',  // Matte Teal
                '--dot-clr': '#2dd4bf'      // Teal-400
            }
        },
        {
            title: 'Overdue',
            value: stats.overdue,
            filter: 'Overdue',
            icon: <XCircle size={22} />,
            style: {
                '--primary-clr': '#7f1d1d',
                '--accent-clr': '#ef4444',  // Matte Red
                '--dot-clr': '#f87171'      // Red-400
            }
        }
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 lg:gap-6 mb-8 px-4 lg:px-0">
            {cards.map((card, index) => {
                const isActive = activeFilter === card.filter;
                return (
                    <div
                        key={index}
                        className={`glass-card-premium cursor-pointer relative group overflow-hidden rounded-2xl p-5 transition-all duration-500 flex flex-col justify-between min-h-[140px] border ${
                            isActive
                                ? 'scale-[1.03] -translate-y-1 border-amber-500/50 bg-slate-900/60 dark:bg-slate-950/60 shadow-[0_0_25px_rgba(245,158,11,0.12)] z-10'
                                : 'border-slate-200/50 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/25 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-lg'
                        }`}
                        onClick={() => onFilterChange(card.filter)}
                    >
                        {/* Status bar/glow at the top */}
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                            card.filter === 'Overdue' ? 'from-red-500 to-rose-600' :
                            card.filter === 'active' ? 'from-emerald-500 to-green-600' :
                            card.filter === 'Forecast' ? 'from-purple-500 to-indigo-600' :
                            card.filter === 'Completed' ? 'from-teal-500 to-cyan-600' :
                            'from-amber-500 to-orange-600'
                        }`} />

                        <div className="flex justify-between items-start mb-3">
                            <div 
                                className={`p-2.5 rounded-xl transition-all duration-300 transform group-hover:scale-110
                                    ${isActive 
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm shadow-amber-500/5' 
                                        : 'bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/40'
                                    }`}
                                style={!isActive ? { color: card.style['--accent-clr'] } : undefined}
                            >
                                {card.icon}
                            </div>
                            
                            {/* Animated indicator dot */}
                            {isActive && (
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                            )}
                        </div>

                        <div className="mt-2">
                            <span className={`block text-3xl font-black tracking-tight transition-all duration-300 origin-left group-hover:scale-105
                                ${isActive ? 'text-amber-500' : 'text-slate-800 dark:text-slate-100'}`}
                            >
                                {card.value}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-450">{card.title}</p>
                                {card.filter === 'active' && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">LIVE</span>
                                )}
                                {card.filter === 'Overdue' && stats.overdue > 0 && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">ALERT</span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
