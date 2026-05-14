interface PriorityBadgeProps {
    priority: string | null | undefined;
    className?: string;
}

export const PriorityBadge = ({ priority, className = "" }: PriorityBadgeProps) => {
    if (!priority) return null;

    const getColorClass = (p: string) => {
        switch (p) {
            case 'High': return 'text-orange-700 dark:text-orange-400';
            case 'Urgent': return 'text-red-800 dark:text-red-400';
            case 'Medium': return 'text-amber-700 dark:text-amber-400';
            case 'Low': return 'text-green-700 dark:text-green-400';
            default: return 'text-slate-700 dark:text-slate-400';
        }
    };

    return (
        <span className={`font-bold ${getColorClass(priority)} ${className}`}>
            {priority}
        </span>
    );
};
