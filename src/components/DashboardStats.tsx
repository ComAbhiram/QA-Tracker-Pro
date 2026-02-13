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
            if (!t.endDate) return false;
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
            icon: <Layers size={24} />,
            style: {
                '--primary-clr': '#1e3a8a', // Blue-900
                '--accent-clr': '#3b82f6',  // Blue-500
                '--dot-clr': '#bfdbfe'      // Blue-200
            }
        },
        {
            title: 'Active Tasks',
            value: stats.active,
            filter: 'active',
            icon: <PlayCircle size={24} />,
            style: {
                '--primary-clr': '#78350f', // Amber-900
                '--accent-clr': '#f59e0b',  // Amber-500
                '--dot-clr': '#fde68a'      // Amber-200
            }
        },
        {
            title: 'Forecast',
            value: tasks.filter(t => t.status === 'Forecast').length,
            filter: 'Forecast',
            icon: <Cloud size={24} />,
            style: {
                '--primary-clr': '#4c1d95', // Violet-900
                '--accent-clr': '#8b5cf6',  // Violet-500
                '--dot-clr': '#ddd6fe'      // Violet-200
            }
        },
        {
            title: 'Completed',
            value: stats.completed,
            filter: 'Completed',
            icon: <CheckCircle2 size={24} />,
            style: {
                '--primary-clr': '#064e3b', // Emerald-900
                '--accent-clr': '#10b981',  // Emerald-500
                '--dot-clr': '#a7f3d0'      // Emerald-200
            }
        },
        {
            title: 'Overdue',
            value: stats.overdue,
            filter: 'Overdue',
            icon: <XCircle size={24} />,
            style: {
                '--primary-clr': '#7f1d1d', // Red-900
                '--accent-clr': '#ef4444',  // Red-500
                '--dot-clr': '#fecaca'      // Red-200
            }
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 px-4 lg:px-0">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`card-metric ${activeFilter === card.filter ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                    style={card.style as React.CSSProperties}
                    onClick={() => onFilterChange(card.filter)}
                >
                    <div className="img-section">
                        {card.icon}
                    </div>
                    <div className="card-metric-desc">
                        <div className="card-metric-header">
                            <div className="card-metric-title">{card.title}</div>
                            <div className="card-metric-menu">
                                <div className="dot"></div>
                                <div className="dot"></div>
                                <div className="dot"></div>
                            </div>
                        </div>
                        <div className="card-metric-time">{card.value}</div>
                        <p className="recent">Click to filter</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
