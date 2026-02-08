
import { Task } from '@/lib/types';

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
            return end < now && t.status !== 'Completed';
        }).length
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div
                className={`stats-card cursor-pointer group ${activeFilter === 'All' ? 'ring-1 ring-sky-500 bg-slate-800/60' : ''} border-l-4 border-sky-500`}
                onClick={() => onFilterChange('All')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-400 font-medium group-hover:text-sky-400 transition-colors">
                        Total Projects
                    </div>
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-100">{stats.total}</div>
            </div>

            <div
                className={`stats-card cursor-pointer group ${activeFilter === 'active' ? 'ring-1 ring-amber-500 bg-slate-800/60' : ''} border-l-4 border-amber-500`}
                onClick={() => onFilterChange('active')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-400 font-medium group-hover:text-amber-400 transition-colors">
                        Active Tasks
                    </div>
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-100">{stats.active}</div>
            </div>

            <div
                className={`stats-card cursor-pointer group ${activeFilter === 'Completed' ? 'ring-1 ring-emerald-500 bg-slate-800/60' : ''} border-l-4 border-emerald-500`}
                onClick={() => onFilterChange('Completed')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-400 font-medium group-hover:text-emerald-400 transition-colors">
                        Completed
                    </div>
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-100">{stats.completed}</div>
            </div>

            <div
                className={`stats-card cursor-pointer group ${activeFilter === 'Overdue' ? 'ring-1 ring-red-500 bg-slate-800/60' : ''} border-l-4 border-red-500`}
                onClick={() => onFilterChange('Overdue')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-400 font-medium group-hover:text-red-400 transition-colors">
                        Overdue
                    </div>
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-100">{stats.overdue}</div>
            </div>
        </div>
    );
}
