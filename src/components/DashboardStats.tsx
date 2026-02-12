
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
            return end < now && t.status !== 'Completed' && t.status !== 'Rejected';
        }).length
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div
                className={`stats-card cursor-pointer group transition-all duration-200 ${activeFilter === 'All' ? 'ring-2 ring-sky-500 shadow-lg scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]'} bg-gradient-to-br from-white to-sky-50 border-l-4 border-sky-500`}
                onClick={() => onFilterChange('All')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-500 font-medium group-hover:text-sky-600 transition-colors">
                        Total Projects
                    </div>
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-800">{stats.total}</div>
            </div>

            <div
                className={`stats-card cursor-pointer group transition-all duration-200 ${activeFilter === 'active' ? 'ring-2 ring-amber-500 shadow-lg scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]'} bg-gradient-to-br from-white to-amber-50 border-l-4 border-amber-500`}
                onClick={() => onFilterChange('active')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-500 font-medium group-hover:text-amber-600 transition-colors">
                        Active Tasks
                    </div>
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-800">{stats.active}</div>
            </div>

            <div
                className={`stats-card cursor-pointer group transition-all duration-200 ${activeFilter === 'Forecast' ? 'ring-2 ring-purple-500 shadow-lg scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]'} bg-gradient-to-br from-white to-purple-50 border-l-4 border-purple-500`}
                onClick={() => onFilterChange('Forecast')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-500 font-medium group-hover:text-purple-600 transition-colors">
                        Forecast
                    </div>
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-800">{tasks.filter(t => t.status === 'Forecast').length}</div>
            </div>

            <div
                className={`stats-card cursor-pointer group transition-all duration-200 ${activeFilter === 'Completed' ? 'ring-2 ring-emerald-500 shadow-lg scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]'} bg-gradient-to-br from-white to-emerald-50 border-l-4 border-emerald-500`}
                onClick={() => onFilterChange('Completed')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-500 font-medium group-hover:text-emerald-600 transition-colors">
                        Completed
                    </div>
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-800">{stats.completed}</div>
            </div>

            <div
                className={`stats-card cursor-pointer group transition-all duration-200 ${activeFilter === 'Overdue' ? 'ring-2 ring-red-500 shadow-lg scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]'} bg-gradient-to-br from-white to-red-50 border-l-4 border-red-500`}
                onClick={() => onFilterChange('Overdue')}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-500 font-medium group-hover:text-red-600 transition-colors">
                        Overdue
                    </div>
                </div>
                <div className="text-3xl font-bold mb-1 text-slate-800">{stats.overdue}</div>
            </div>
        </div>
    );
}
