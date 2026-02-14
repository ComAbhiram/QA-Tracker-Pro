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
                '--accent-clr': '#3b82f6',  // Matte Blue
                '--dot-clr': '#bfdbfe'      // Blue-200
            }
        },
        {
            title: 'Active Tasks',
            value: stats.active,
            filter: 'Active',
            icon: <PlayCircle size={24} />,
            style: {
                '--primary-clr': '#14532d', // Green-900
                '--accent-clr': '#22c55e',  // Matte Green
                '--dot-clr': '#bbf7d0'      // Green-200
            }
        },
        {
            title: 'Forecast',
            value: tasks.filter(t => t.status === 'Forecast').length,
            filter: 'Forecast',
            icon: <Cloud size={24} />,
            style: {
                '--primary-clr': '#581c87', // Purple-900
                '--accent-clr': '#a855f7',  // Matte Purple
                '--dot-clr': '#e9d5ff'      // Purple-200
            }
        },
        {
            title: 'Completed',
            value: stats.completed,
            filter: 'Completed',
            icon: <CheckCircle2 size={24} />,
            style: {
                '--primary-clr': '#134e4a', // Teal-900
                '--accent-clr': '#14b8a6',  // Matte Teal
                '--dot-clr': '#ccfbf1'      // Teal-200
            }
        },
        {
            title: 'Overdue',
            value: stats.overdue,
            filter: 'Overdue',
            icon: <XCircle size={24} />,
            style: {
                '--primary-clr': '#7f1d1d', // Red-900
                '--accent-clr': '#ef4444',  // Matte Red
                '--dot-clr': '#fecaca'      // Red-200
            }
        }
    ];

    return (
        <div className="status-container mb-8 px-4 lg:px-0">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`status ${activeFilter === card.filter ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                    style={{ '--card-hover-color': card.style['--accent-clr'] } as React.CSSProperties}
                    onClick={() => onFilterChange(card.filter)}
                >
                    <div className="mac-header">
                    </div>
                    <span>{card.value}</span>
                    <p>{card.title}</p>
                </div>
            ))}
        </div>
    );
}
