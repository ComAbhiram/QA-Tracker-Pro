interface PriorityBadgeProps {
    priority: string | null | undefined;
    className?: string;
}

export const PriorityBadge = ({ priority, className = "" }: PriorityBadgeProps) => {
    if (!priority) return null;

    const getColorClass = (p: string) => {
        switch (p) {
            case 'High': return 'text-orange-700';
            case 'Urgent': return 'text-red-800';
            case 'Medium': return 'text-amber-700';
            case 'Low': return 'text-green-700';
            default: return 'text-slate-700';
        }
    };

    return (
        <span className={`font-bold ${getColorClass(priority)} ${className}`}>
            {priority}
        </span>
    );
};
