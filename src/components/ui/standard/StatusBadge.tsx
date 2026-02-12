import {
    Loader2,
    CheckCircle2,
    Circle,
    Cloud,
    PauseCircle,
    Clock,
    XCircle
} from 'lucide-react';

interface StatusBadgeProps {
    status: string;
    className?: string;
    size?: number;
}

export const StatusBadge = ({ status, className = "", size = 13 }: StatusBadgeProps) => {
    switch (status) {
        case 'In Progress':
        case 'Being Developed':
            return (
                <div className={`flex items-center gap-1.5 text-blue-700 font-medium ${className}`}>
                    <Loader2 size={size} className="animate-spin" /> {status}
                </div>
            );
        case 'Completed':
            return (
                <div className={`flex items-center gap-1.5 text-emerald-700 font-medium ${className}`}>
                    <CheckCircle2 size={size} /> {status}
                </div>
            );
        case 'Yet to Start':
            return (
                <div className={`flex items-center gap-1.5 text-slate-500 font-medium ${className}`}>
                    <Circle size={size} /> {status}
                </div>
            );
        case 'Forecast':
            return (
                <div className={`flex items-center gap-1.5 text-violet-600 font-medium ${className}`}>
                    <Cloud size={size} /> {status}
                </div>
            );
        case 'On Hold':
            return (
                <div className={`flex items-center gap-1.5 text-amber-600 font-medium ${className}`}>
                    <PauseCircle size={size} /> {status}
                </div>
            );
        case 'Ready for QA':
            return (
                <div className={`flex items-center gap-1.5 text-pink-600 font-medium ${className}`}>
                    <Clock size={size} /> {status}
                </div>
            );
        case 'Assigned to QA':
            return (
                <div className={`flex items-center gap-1.5 text-cyan-600 font-medium ${className}`}>
                    <Clock size={size} /> {status}
                </div>
            );
        case 'Rejected':
            return (
                <div className={`flex items-center gap-1.5 text-red-600 font-medium ${className}`}>
                    <XCircle size={size} /> {status}
                </div>
            );
        default:
            return <div className={`text-slate-600 ${className}`}>{status}</div>;
    }
};
