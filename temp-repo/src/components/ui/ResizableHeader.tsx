import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ResizableHeaderProps {
    label: string;
    width: number;
    widthKey: string;
    sortKey?: string;
    isSortable?: boolean;
    currentSortKey?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (key: string) => void;
    onResizeStart: (key: string, e: React.MouseEvent) => void;
    className?: string;
}

export default function ResizableHeader({
    label,
    width,
    widthKey,
    sortKey,
    isSortable = true,
    currentSortKey,
    sortDirection,
    onSort,
    onResizeStart,
    className = ""
}: ResizableHeaderProps) {

    const getSortIcon = () => {
        if (!isSortable || !sortKey) return null;

        if (currentSortKey !== sortKey) {
            return <ArrowUpDown size={12} className="ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
        }
        return sortDirection === 'asc' ?
            <ArrowUp size={12} className="ml-1 text-slate-600" /> :
            <ArrowDown size={12} className="ml-1 text-slate-600" />;
    };

    return (
        <th
            style={{ width }}
            className={`relative px-2 py-2 text-xs font-semibold text-left border-r border-slate-400 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 select-none group ${isSortable ? 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700' : ''} ${className}`}
            onClick={() => isSortable && sortKey && onSort?.(sortKey)}
        >
            <div className="flex items-center justify-between truncate">
                <div className="flex items-center gap-1 truncate">
                    {label}
                    {getSortIcon()}
                </div>
            </div>
            {/* Resize Handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10"
                onMouseDown={(e) => onResizeStart(widthKey, e)}
                onClick={(e) => e.stopPropagation()}
            />
        </th>
    );
}
