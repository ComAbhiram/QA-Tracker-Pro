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
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+5px)] hidden group-hover:block z-[60] w-max max-w-[200px]">
                <div className="bg-slate-800 text-white text-[10px] rounded px-2 py-1 shadow-xl whitespace-normal break-words text-center relative">
                    {content}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
            </div>
        </div>
    );
};

export default SimpleTooltip;
