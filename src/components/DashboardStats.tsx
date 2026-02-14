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
                '--primary-clr': '#1e3a8a',
                '--accent-clr': '#3b82f6',  // Matte Blue
                '--dot-clr': '#60a5fa'      // Blue-400 (Vibrant BG)
            }
        },
        {
            title: 'Active Tasks',
            value: stats.active,
            filter: 'Active',
            icon: <PlayCircle size={24} />,
            style: {
                '--primary-clr': '#14532d',
                '--accent-clr': '#22c55e',  // Matte Green
                '--dot-clr': '#a3e635'      // Lime-400 (Vibrant BG - Matching Ref)
            }
        },
        {
            title: 'Forecast',
            value: tasks.filter(t => t.status === 'Forecast').length,
            filter: 'Forecast',
            icon: <Cloud size={24} />,
            style: {
                '--primary-clr': '#581c87',
                '--accent-clr': '#a855f7',  // Matte Purple
                '--dot-clr': '#c084fc'      // Purple-400 (Vibrant BG)
            }
        },
        {
            title: 'Completed',
            value: stats.completed,
            filter: 'Completed',
            icon: <CheckCircle2 size={24} />,
            style: {
                '--primary-clr': '#134e4a',
                '--accent-clr': '#14b8a6',  // Matte Teal
                '--dot-clr': '#2dd4bf'      // Teal-400 (Vibrant BG)
            }
        },
        {
            title: 'Overdue',
            value: stats.overdue,
            filter: 'Overdue',
            icon: <XCircle size={24} />,
            style: {
                '--primary-clr': '#7f1d1d',
                '--accent-clr': '#ef4444',  // Matte Red
                '--dot-clr': '#f87171'      // Red-400 (Vibrant BG)
            }
        }
    ];

    return (
        <div className="status-container mb-8 px-4 lg:px-0">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`status ${activeFilter === card.filter ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                    style={{
                        '--card-hover-color': card.style['--accent-clr'],
                        '--card-bg-color': card.style['--dot-clr']
                    } as React.CSSProperties}
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
