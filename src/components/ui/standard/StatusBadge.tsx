import {
    CheckCircle2,
    Circle,
    Cloud,
    PauseCircle,
    Clock,
    XCircle,
    PlayCircle,
    Code2
} from 'lucide-react';
import Loader from '@/components/ui/Loader';

interface StatusBadgeProps {
    status: string;
    className?: string;
    size?: number;
}

export const StatusBadge = ({ status, className = "", size = 13 }: StatusBadgeProps) => {
    const content = (icon: React.ReactNode, colorClass: string) => (
        <div className={`flex items-center gap-1.5 font-medium min-w-0 ${colorClass} ${className}`}>
            <span className="flex-shrink-0">{icon}</span>
            <span className="truncate">{status}</span>
        </div>
    );

    switch (status) {
        case 'In Progress':
            return content(<PlayCircle size={size} />, 'text-blue-700');
        case 'Being Developed':
            return content(<Code2 size={size} />, 'text-blue-700');
        case 'Completed':
            return content(<CheckCircle2 size={size} />, 'text-emerald-700');
        case 'Yet to Start':
            return content(<Circle size={size} />, 'text-slate-500');
        case 'Forecast':
            return content(<Cloud size={size} />, 'text-violet-600');
        case 'On Hold':
            return content(<PauseCircle size={size} />, 'text-amber-600');
        case 'Ready for QA':
            return content(<Clock size={size} />, 'text-pink-600');
        case 'Assigned to QA':
            return content(<Clock size={size} />, 'text-cyan-600');
        case 'Rejected':
            return content(<XCircle size={size} />, 'text-red-600');
        default:
            return <div className={`text-slate-600 truncate ${className}`}>{status}</div>;
    }
};
