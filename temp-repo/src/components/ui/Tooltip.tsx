import React from 'react';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    hoverContent?: React.ReactNode;
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, hoverContent, className = '' }) => {
    return (
        <div className={`tooltip-container ${className}`}>
            <span className="tooltip">{content}</span>
            <span className="text">{children}</span>
            <span>{hoverContent || children}</span>
        </div>
    );
};

export default Tooltip;
