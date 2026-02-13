import React, { ReactNode } from 'react';

interface SimpleTooltipProps {
    content: string | ReactNode;
    children: ReactNode;
    className?: string; // for trigger styling
}

export const SimpleTooltip = ({ content, children, className = '' }: SimpleTooltipProps) => {
    return (
        <div className={`relative group inline-flex ${className}`}>
            {children}
            {/* Tooltip Position: Aligned Left to prevent cut-off */}
            <div className="absolute left-0 bottom-[calc(100%+8px)] hidden group-hover:block z-[60] w-max max-w-[250px]">
                <div className="bg-slate-800 text-white text-[11px] font-medium rounded px-3 py-2 shadow-xl whitespace-normal break-words text-left relative">
                    {content}
                    {/* Arrow - aligned left */}
                    <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-800"></div>
                </div>
            </div>
        </div>
    );
};

export default SimpleTooltip;
